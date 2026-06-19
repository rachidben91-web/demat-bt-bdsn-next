# Evolution multi-site Villeneuve / Sartrouville

Ce document sert de point de reprise pour mettre l'application `demat-bt-bdsn-next`
en multi-site. L'objectif est de conserver exactement les memes modules et
parcours, mais de permettre de travailler soit sur le site de
Villeneuve-la-Garenne, soit sur le site de Sartrouville.

## Contexte

Aujourd'hui l'application fonctionne principalement comme si le site actif etait
Villeneuve-la-Garenne. Plusieurs donnees portent deja une notion de site, mais
elle n'est pas encore appliquee de facon systematique.

Le fichier source transmis est :

- `J:/Mon Drive/CHATGPT/Liste TG ME VLG.xlsx`

Constat sur le fichier :

- Feuille : `MAIA VLG SAT + Tel`
- Colonne de distinction : `Site`
- Valeurs trouvees :
  - `Villeneuve-la-Garenne` : 74 lignes
  - `Sartrouville` : 27 lignes

Colonnes utiles reperees dans le fichier :

- `MAIA`
- `Salarie`
- `Poste`
- `Nom`
- `Prenom`
- `NNI`
- `NNI Simplifie`
- `GAIA2`
- `Site`
- `Manager`

## Objectif fonctionnel

Apres connexion bureau, l'utilisateur doit pouvoir choisir le site sur lequel il
travaille :

- Villeneuve-la-Garenne
- Sartrouville

Une fois le site choisi, tous les modules doivent garder le meme comportement,
mais avec les donnees du site actif :

- dashboard
- support journee
- referent
- brief
- import PDF
- messagerie
- administration techniciens
- acces bureau / terrain
- publication mobile

Le besoin n'est pas de dupliquer le code, mais d'ajouter un contexte `site` stable
et reutilise partout.

## Codes site proposes

Codes courts recommandes :

- `VLG` : Villeneuve-la-Garenne
- `SAT` : Sartrouville

`SAT` est propose pour Sartrouville afin d'eviter les libelles longs dans les
tables techniques. Le point important est de choisir un code et de le garder
partout.

## Etat actuel observe

### Deja favorable au multi-site

Certaines tables ou modules connaissent deja la notion de site :

- `technicians.site`
- `bt_import_days.site_code`
- `mobile_dispatch_items.site_code`
- `office_messages.target_site`
- `office_message_recipients.site_code`

La messagerie est deja assez proche du besoin : elle sait cibler un site, un
manager ou un technicien.

### Points encore mono-site ou implicites

Plusieurs endroits doivent etre contextualises :

- l'import PDF force encore `site_code = "VLG"`
- le support journee charge tous les techniciens actifs, sans filtre site
- la creation d'une journee support se fait par date seule, pas par date + site
- le referent combine support et BT sans passer un site actif
- la publication mobile retrouve la journee support par date seule
- l'admin techniciens laisse le site en champ texte libre avec defaut `VLG`

## Evolution Supabase a prevoir

### 1. Normaliser les sites

Option recommandee : creer une petite table de reference.

```sql
create table if not exists public.sites (
  code text primary key,
  label text not null,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Donnees initiales :

```sql
insert into public.sites (code, label, display_order)
values
  ('VLG', 'Villeneuve-la-Garenne', 10),
  ('SAT', 'Sartrouville', 20)
on conflict (code) do update
set
  label = excluded.label,
  display_order = excluded.display_order,
  active = true;
```

### 2. Techniciens

La table `technicians` a deja un champ `site`, mais il contient plutot un libelle
ou une valeur libre. Deux options existent :

- garder `site` comme champ existant et le normaliser en `VLG` / `SAT`
- ajouter `site_code`, le remplir, puis migrer progressivement l'app dessus

Option recommandee : ajouter `site_code`, garder `site` temporairement pour
compatibilite.

Actions :

- ajouter `site_code text`
- backfill Villeneuve en `VLG`
- importer les lignes Sartrouville en `SAT`
- ajouter un index sur `site_code`
- a terme, remplacer les usages de `site` par `site_code`

### 3. Managers

La table `managers` doit porter le site, sinon les listes de managers seront
melangees entre Villeneuve et Sartrouville.

Actions :

- ajouter `site_code text`
- backfill managers existants en `VLG`
- creer / mettre a jour les managers Sartrouville depuis l'Excel
- filtrer `getManagerOptions()` par site actif

### 4. Support journee

Le support journee est le point le plus sensible.

Aujourd'hui, les journees support sont liees a une date. En multi-site, il faut
une journee par couple date + site.

Actions :

- ajouter `support_days.site_code`
- backfill existant en `VLG`
- remplacer l'unicite date seule par une unicite `(day_date, site_code)`
- filtrer les `support_days` par site actif
- lors de la creation d'une journee, creer seulement les lignes des techniciens
  du site actif
- dans les historiques et metriques, ne compter que le site actif

### 5. Import PDF / Brief / Referent

`bt_import_days` a deja `site_code` et une contrainte unique `(day_date,
site_code)`, mais le code force encore `VLG`.

Actions :

- passer le site actif a l'action d'import PDF
- remplacer `site_code: "VLG"` par le site actif
- filtrer `getBtImportDayOverview()` par site actif
- afficher uniquement les jours et BT du site actif
- le module referent doit appeler support + BT avec le meme site actif

### 6. Publication mobile

Les items mobiles portent deja `site_code`, mais la publication doit etre
completee.

Actions :

- passer le site actif a la publication
- retrouver le `support_day` par `(mission_date, site_code)`
- eviter les collisions entre sites lors des upserts
- verifier la contrainte d'unicite sur `mobile_dispatch_items`

Point d'attention : si deux sites publient le meme jour pour deux techniciens
differents, aucun souci. Si un meme technicien ne peut appartenir qu'a un site,
la contrainte actuelle peut rester simple. Sinon, il faudra inclure `site_code`
dans le conflit.

### 7. Comptes et droits

Pour le MVP, les droits peuvent rester par module. Le site actif est choisi dans
l'interface.

Evolution possible plus tard :

- ajouter des droits par site dans `office_accounts` ou une table
  `office_account_sites`
- limiter certains managers / referents a un seul site
- autoriser les administrateurs a basculer entre tous les sites

## Evolution code a prevoir

### 1. Ajouter un helper sites

Creer un module du type :

- `src/lib/sites.ts`

Il centraliserait :

- les codes sites
- les labels
- la validation du site actif
- le site par defaut
- la lecture / ecriture du cookie de site actif

### 2. Ajouter le choix de site apres connexion

Parcours propose :

1. L'utilisateur se connecte.
2. Si c'est un acces bureau et qu'aucun site n'est choisi, redirection vers une
   page de selection.
3. L'utilisateur choisit Villeneuve ou Sartrouville.
4. Le choix est stocke en cookie.
5. L'application redirige vers le dashboard ou le premier module autorise.

Page possible :

- `src/app/choix-site/page.tsx`

Action possible :

- `src/app/choix-site/actions.ts`

### 3. Ajouter un selecteur dans le header

Le site doit pouvoir etre change sans se deconnecter.

Emplacement logique :

- header bureau / app shell

Comportement :

- afficher le site actif
- proposer Villeneuve / Sartrouville
- recharger la page courante avec le nouveau site

### 4. Passer le site actif aux pages serveur

Pages prioritaires :

- `src/app/page.tsx`
- `src/app/support/page.tsx`
- `src/app/referent/page.tsx`
- `src/app/brief/page.tsx`
- `src/app/import-pdf/page.tsx`
- `src/app/messagerie/page.tsx`
- `src/app/admin/techniciens/page.tsx`

Fonctions a adapter :

- `getSupportJourneeData(selectedDate, siteCode)`
- `getSupportTechnicians(siteCode)`
- `getBriefAssignmentOptions(siteCode)`
- `getBtImportDayOverview(selectedDate, siteCode)`
- `getMobileDispatchStatusesForMissionDate(missionDate, technicianIds, siteCode)`
- `getMessagingTechnicianTargets(siteCode?)`
- `getTechnicianAdminRows(search, siteCode?)`
- `getManagerOptions(siteCode?)`

### 5. Adapter les server actions

Actions prioritaires :

- `saveBtImportDayAction`
- `takeSupportDayControl`
- `saveSupportDayAssignments`
- `publishMobileDispatchAction`
- actions admin techniciens

Elles devront recevoir ou relire le site actif cote serveur pour eviter de faire
confiance uniquement au client.

## Donnees Sartrouville a importer

Depuis l'Excel :

- creer les managers Sartrouville absents
- creer les techniciens Sartrouville absents
- renseigner :
  - NNI
  - nom
  - prenom
  - display_name
  - manager
  - poste / role
  - site_code `SAT`
  - actif

Points a clarifier avant import :

- mapping exact des postes Excel vers les roles applicatifs
- couleurs par technicien ou couleur par defaut
- PTC / PTD si l'information n'est pas dans ce fichier
- referents Sartrouville : viennent-ils du poste, des comptes bureau, ou d'une
  liste separee ?

## Migrations SQL recommandees

Ordre prudent :

1. `sites`
2. ajout `site_code` sur `technicians`, `managers`, `support_days`
3. backfill existant en `VLG`
4. contrainte unique support journee `(day_date, site_code)`
5. index de filtrage par site
6. import Sartrouville
7. ajustement des policies si les droits par site deviennent necessaires

Important : faire les migrations Supabase en SQL, puis seulement ensuite brancher
le code. Cela evite de melanger evolution schema et logique applicative.

## Fichiers code identifies comme sensibles

- `src/lib/support-journee.ts`
- `src/app/actions/support-journee.ts`
- `src/app/actions/bt-import.ts`
- `src/lib/bt-import-days.ts`
- `src/app/referent/page.tsx`
- `src/app/actions/mobile-dispatch.ts`
- `src/lib/mobile-dispatch.ts`
- `src/lib/admin-technicians.ts`
- `src/app/admin/techniciens/actions.ts`
- `src/app/admin/techniciens/technician-form.tsx`
- `src/lib/messaging.ts`
- `src/lib/auth.ts`
- `src/app/login/actions.ts`
- `src/components/app-shell-header.tsx`

## Tests a faire avant validation

### Villeneuve

- connexion bureau
- choix Villeneuve
- dashboard OK
- support journee affiche seulement les techniciens Villeneuve
- creation / prise en main / sauvegarde d'une journee Villeneuve
- import PDF Villeneuve
- referent Villeneuve
- publication mobile Villeneuve
- messagerie vers site Villeneuve

### Sartrouville

- choix Sartrouville
- dashboard OK
- support journee affiche seulement les techniciens Sartrouville
- creation d'une journee Sartrouville independante de Villeneuve
- import PDF Sartrouville
- referent Sartrouville
- publication mobile Sartrouville
- messagerie vers site Sartrouville

### Non-regression importante

- une journee Villeneuve et une journee Sartrouville peuvent exister le meme jour
- importer un PDF Sartrouville ne remplace pas un PDF Villeneuve du meme jour
- la publication mobile d'un site ne pollue pas l'autre
- les managers affiches sont ceux du site actif
- les techniciens admin peuvent etre filtres ou distingues par site

## Decisions a confirmer

- Code definitif pour Sartrouville : `SAT` recommande.
- Est-ce que tous les comptes bureau peuvent voir les deux sites au depart ?
- Est-ce que les managers doivent etre limites a leur site ?
- Est-ce que les referents Sartrouville sont deduits du fichier Excel ou saisis
  via l'admin acces ?
- Est-ce que l'import PDF Sartrouville aura le meme format que Villeneuve ?

## Strategie recommandee

Ne pas dupliquer les modules.

Faire une vraie evolution multi-site :

1. schema Supabase multi-site
2. contexte site dans l'interface
3. filtrage des lectures
4. securisation des ecritures
5. import des effectifs Sartrouville
6. verification Villeneuve puis Sartrouville

Cette approche garde Villeneuve intact, ajoute Sartrouville proprement et permet
d'ajouter un troisieme site plus tard sans refaire tout le chantier.
