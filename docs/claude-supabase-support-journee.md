# DEMAT-BT Next — Brief Supabase pour le module Support Journee

## Contexte

Je reconstruis en Next.js une application interne appelee `DEMAT-BT`.

Pour l'instant, je ne veux pas reconstruire tout le site d'un coup.
Je veux me concentrer uniquement sur le module `Support Journee`.

Le but est de creer une base de donnees Supabase simple, propre et evolutive pour :

- gerer les techniciens
- gerer les activites de journee
- gerer les journees de support
- gerer les lignes quotidiennes par technicien
- conserver un historique exploitable

Je veux une structure qui me permette :

- d'afficher le tableau du support journee
- de modifier les activites par technicien
- de saisir brief / debrief
- de stocker les observations
- de filtrer et historiser les donnees
- d'evoluer ensuite vers les autres modules (`Referent`, `Brief`, `Import PDF`, etc.)

## Priorite

Ne pas sur-architecturer.

Je veux une V1 pragmatique et testable rapidement.
On privilegie :

- des tables simples
- des cles primaires en `uuid`
- des timestamps `created_at` / `updated_at`
- des contraintes utiles
- une structure lisible

## Perimetre de la V1

Le perimetre concerne uniquement `Support Journee`.

Je veux pouvoir representer :

1. Les techniciens
2. Les managers
3. Les activites parametrables
4. Une journee de support
5. Une ligne de journee par technicien
6. Eventuellement des snapshots / historique simples

## Donnees metier deja connues

Le referentiel techniciens actuel contient environ 50 techniciens VLG.

Chaque technicien possede au minimum :

- `nni`
- `nom`
- `prenom`
- `nom_affichage`
- `manager`
- `site`
- `role`
- `ptc`
- `ptd`
- eventuellement une `couleur`

Le module `Support Journee` manipule des activites comme :

- `CLIENTELE`
- `ASTREINTE`
- `TRAVAUX`
- `IS JOUR 1`
- `IS JOUR 2`
- `IS JOUR 3`
- `DEP 1`
- `DEP 2`
- `DEP 3`
- `CICM`
- `RSF`
- `RTT`
- `CP`
- `ABS`
- `A2T`

Chaque activite doit pouvoir stocker :

- un libelle
- une couleur
- un type ou statut metier
  - `present`
  - `absent`
  - `greve`
- un ordre d'affichage
- un flag `active`

## Structure fonctionnelle recommandee

### 1. `managers`

Table simple pour normaliser les responsables.

Champs recommandes :

- `id uuid primary key`
- `name text not null unique`
- `site text`
- `created_at`
- `updated_at`

### 2. `technicians`

Referentiel principal des agents.

Champs recommandes :

- `id uuid primary key`
- `nni text not null unique`
- `last_name text not null`
- `first_name text not null`
- `display_name text not null`
- `manager_id uuid references managers(id)`
- `site text not null default 'Villeneuve-la-Garenne'`
- `role text not null default 'Technicien Gaz'`
- `color text`
- `ptc boolean not null default false`
- `ptd boolean not null default false`
- `active boolean not null default true`
- `created_at`
- `updated_at`

### 3. `activity_definitions`

Parametrage des activites disponibles dans le support journee.

Champs recommandes :

- `id uuid primary key`
- `code text not null unique`
- `label text not null`
- `color text`
- `status text not null`
- `display_order integer not null default 0`
- `active boolean not null default true`
- `created_at`
- `updated_at`

Contraintes recommandees :

- `status in ('present', 'absent', 'greve')`

### 4. `support_days`

Une ligne par journee de support.

Cette table represente l'entite "journee".

Champs recommandes :

- `id uuid primary key`
- `day_date date not null unique`
- `week_label text`
- `status text not null default 'draft'`
- `weather_note text`
- `server_label text`
- `last_modified_by text`
- `last_modified_at timestamptz`
- `locked_by text`
- `locked_at timestamptz`
- `notes text`
- `created_at`
- `updated_at`

Contraintes recommandees :

- `status in ('draft', 'in_progress', 'locked', 'archived')`

### 5. `support_day_entries`

Table centrale du module.

Une ligne = une journee + un technicien.

Champs recommandes :

- `id uuid primary key`
- `support_day_id uuid not null references support_days(id) on delete cascade`
- `technician_id uuid not null references technicians(id)`
- `activity_id uuid references activity_definitions(id)`
- `work_mode text`
- `observation text`
- `brief_agency text`
- `brief_remote text`
- `debrief_agency text`
- `debrief_remote text`
- `gtv text`
- `display_order integer not null default 0`
- `created_at`
- `updated_at`

Contraintes recommandees :

- unicite sur `(support_day_id, technician_id)`
- `work_mode in ('PTC', 'PTD', 'PTC-PTD', 'NONE')` si tu veux une contrainte stricte

### 6. `support_day_entry_history` (optionnel V1 ou V1.1)

Si on veut un vrai historique des modifications sans attendre.

Champs recommandes :

- `id uuid primary key`
- `support_day_entry_id uuid not null references support_day_entries(id) on delete cascade`
- `changed_at timestamptz not null default now()`
- `changed_by text`
- `field_name text not null`
- `old_value text`
- `new_value text`

Si c'est trop lourd pour une V1, on peut le repousser.

## Ce que j'attends de Claude

Je veux que tu m'aides a produire :

1. Le schema SQL Supabase complet pour cette V1
2. Les contraintes utiles
3. Les index utiles
4. Les policies RLS les plus simples possibles
5. Un jeu de seed de depart

## RLS

Pour l'instant, je veux quelque chose de simple pour developper vite.

Option acceptable pour une premiere iteration :

- auth obligatoire
- utilisateurs connectes autorises en lecture/ecriture

Ne complique pas avec des roles metier avances tant que ce n'est pas necessaire.

## Index recommandes

Je veux au minimum des index sur :

- `technicians.nni`
- `technicians.manager_id`
- `activity_definitions.code`
- `support_days.day_date`
- `support_day_entries.support_day_id`
- `support_day_entries.technician_id`
- index composite si utile pour les filtres

## Seeds

Je veux des seeds pour :

- les managers
- les techniciens
- les activites
- au moins une journee de support
- des lignes de support associees

## Important

Je ne veux pas encore brancher les modules `Referent`, `Brief`, `Import PDF`.
La base doit juste rester suffisamment propre pour permettre de les ajouter plus tard.

## Ce que je veux comme livrables

Donne-moi :

1. une proposition de schema
2. le SQL de creation des tables
3. les index
4. les policies RLS
5. les seeds
6. un court resume des choix de modelisation
