# Plan d'implementation du module acces bureau et terrain

Ce document cadre la mise en place du futur systeme d'acces pour `demat-bt-bdsn-next`, en s'appuyant sur l'existant :

- le referentiel techniciens deja present dans [src/app/admin/techniciens/page.tsx](C:/Users/Maison/Documents/GitHub/demat-bt-bdsn-next/src/app/admin/techniciens/page.tsx)
- l'authentification Supabase existante dans [src/lib/auth.ts](C:/Users/Maison/Documents/GitHub/demat-bt-bdsn-next/src/lib/auth.ts)
- les migrations SQL versionnees dans `supabase/migrations`

## Objectif

Separer clairement :

1. la fiche metier du technicien
2. le compte de connexion
3. les permissions applicatives

Le but est de couvrir des maintenant :

- les acces bureau des referents et managers
- la liaison optionnelle a un technicien
- la preparation de la future application terrain

## Schema retenu

### 1. Table `technicians`

Cette table existe deja et reste la source de verite metier pour les techniciens.

Elle porte aujourd'hui notamment :

- `id`
- `nni`
- `first_name`
- `last_name`
- `display_name`
- `manager_id`
- `site`
- `role`
- `color`
- `ptc`
- `ptd`
- `sort_order`
- `active`

### 2. Table `office_accounts`

Ajoutee dans la migration [20260515_office_access_foundation.sql](C:/Users/Maison/Documents/GitHub/demat-bt-bdsn-next/supabase/migrations/20260515_office_access_foundation.sql).

Role :

- representer un compte applicatif interne
- dire s'il donne acces au web bureau
- dire s'il donne acces a la future app terrain
- lier ou non ce compte a un technicien

Champs clefs :

- `auth_user_id`
- `email`
- `full_name`
- `technician_id`
- `account_status`
- `first_login`
- `password_changed`
- `can_access_office_app`
- `can_access_terrain_app`
- `office_role`
- `terrain_role`

### 3. Table `office_module_access`

Ajoutee dans la meme migration.

Role :

- stocker les permissions module par module
- eviter de surcharger le simple role global

Couple principal :

- `module_key`
- `permission_level`

Niveaux supportes :

- `none`
- `read`
- `write`

## Types et regles centralises

Le fichier [src/lib/office-access.ts](C:/Users/Maison/Documents/GitHub/demat-bt-bdsn-next/src/lib/office-access.ts) centralise :

- les roles bureau
- les roles terrain
- les modules bureau
- les niveaux de permission
- les presets de droits
- les helpers `canReadOfficeModule` et `canWriteOfficeModule`

Modules bureau retenus pour le MVP :

- `technicians`
- `planning`
- `interventions`
- `reports`
- `admin_access`

## Ecrans a creer

### Phase 1

- `src/app/admin/acces/page.tsx`
  Liste des comptes et raccourci de creation.

- `src/app/admin/acces/new/page.tsx`
  Formulaire de creation d'un acces bureau ou mixte.

- `src/app/admin/acces/[id]/page.tsx`
  Edition d'un acces existant.

### Phase 2

- `src/app/change-password/page.tsx`
  Changement de mot de passe impose a la premiere connexion.

- `src/app/admin/techniciens/[id]/access/page.tsx`
  Creation rapide d'un acces depuis une fiche technicien.

## Fichiers a ajouter

### Couche metier

- `src/lib/office-access.ts`
- `src/lib/admin-office-accounts.ts`
- `src/lib/temporary-password.ts`

### UI admin

- `src/app/admin/acces/page.tsx`
- `src/app/admin/acces/new/page.tsx`
- `src/app/admin/acces/[id]/page.tsx`
- `src/app/admin/acces/actions.ts`
- `src/app/admin/acces/access-form.tsx`

### Auth et session

- `src/app/change-password/page.tsx`
- `src/app/change-password/actions.ts`
- `src/lib/current-office-account.ts`

## Server actions / operations a implementer

### Comptes

- `createOfficeAccountAction`
- `updateOfficeAccountAction`
- `deactivateOfficeAccountAction`
- `resetOfficePasswordAction`

### Lecture

- `getOfficeAccounts`
- `getOfficeAccountById`
- `getTechniciansEligibleForOfficeAccess`
- `getCurrentOfficeAccount`

### Navigation / garde

- `canReadOfficeModule`
- `canWriteOfficeModule`
- `hasAnyOfficeModuleAccess`

## Regles metier a respecter

### 1. Un technicien peut exister sans acces

La fiche metier ne doit jamais dependre du compte.

### 2. Un acces peut etre externe

`office_accounts.technician_id` peut rester null pour un compte purement bureau.

### 3. Un technicien ne doit pas etre rattache a plusieurs acces bureau

Le MVP force cette regle via un index unique partiel sur `technician_id`.

### 4. Le role ne suffit pas

Le role sert de preset, mais les permissions reelles viennent de `office_module_access`.

### 5. La premiere connexion doit etre forcee

`first_login = true` et `password_changed = false` apres creation ou reset.

## Ordre de realisation recommande

### Commit 1 - socle donnees

- ajouter la migration `20260515_office_access_foundation.sql`
- ajouter `src/lib/office-access.ts`

### Commit 2 - lecture admin

- creer `src/lib/admin-office-accounts.ts`
- creer `src/app/admin/acces/page.tsx`
- afficher la liste des acces

### Commit 3 - creation / edition

- creer `src/app/admin/acces/actions.ts`
- creer `src/app/admin/acces/access-form.tsx`
- creer `new/page.tsx` et `[id]/page.tsx`

### Commit 4 - securite de connexion

- creer `src/app/change-password/page.tsx`
- creer `src/app/change-password/actions.ts`
- appliquer la redirection premiere connexion

### Commit 5 - integration navigation

- ajouter un lien `Acces` dans [src/components/app-shell-header.tsx](C:/Users/Maison/Documents/GitHub/demat-bt-bdsn-next/src/components/app-shell-header.tsx)
- brancher la garde de navigation selon les permissions

## Points d'attention pour ce repo

### 1. `user_roles` reste une couche transitoire

Aujourd'hui, [src/lib/auth.ts](C:/Users/Maison/Documents/GitHub/demat-bt-bdsn-next/src/lib/auth.ts) s'appuie sur `user_roles`.

Je conseille de :

- garder `user_roles` pour designer les super-admins du back-office
- faire vivre les permissions metier dans `office_accounts` + `office_module_access`

### 2. Le service role sera necessaire

La creation du vrai compte Supabase Auth devra passer par `createServerSupabaseAdminClient()` dans [src/lib/supabase/server.ts](C:/Users/Maison/Documents/GitHub/demat-bt-bdsn-next/src/lib/supabase/server.ts).

### 3. Le module techniciens existe deja

Le nouveau module acces ne doit pas dupliquer les informations de [src/lib/admin-technicians.ts](C:/Users/Maison/Documents/GitHub/demat-bt-bdsn-next/src/lib/admin-technicians.ts).

Il doit seulement :

- lister les techniciens eligibles
- permettre un rattachement
- afficher le lien compte <-> technicien

## Suite immediate recommandee

La prochaine etape naturelle est :

1. implementer la couche de lecture `admin-office-accounts`
2. ajouter l'ecran `/admin/acces`
3. brancher le lien de navigation dans le header admin

Une fois cela en place, on aura deja un premier module visible, coherent avec ton besoin referents / acces bureau, tout en restant compatible avec la future app terrain.
