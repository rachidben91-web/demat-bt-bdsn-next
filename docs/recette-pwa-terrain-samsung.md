# Recette PWA Terrain Samsung

Date de preparation : 2026-06-20

## Pre-requis

- L'application est deployee en HTTPS.
- La migration `supabase/migrations/20260620_terrain_push_subscriptions.sql` est appliquee sur l'environnement cible.
- Les variables d'environnement push sont renseignees sur l'environnement de deploiement :
  - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  - `VAPID_PRIVATE_KEY`
  - `VAPID_SUBJECT`
- Le technicien de test dispose d'un compte terrain actif avec acces a l'application terrain.
- La tablette Samsung utilise un navigateur compatible PWA/push Android :
  - Chrome Android
  - ou Samsung Internet recent

## Parcours d'installation

1. Ouvrir l'URL de production de l'application terrain sur la tablette Samsung.
2. Se connecter avec un compte terrain de test.
3. Verifier que la carte d'installation PWA apparait.
4. Installer l'application sur l'ecran d'accueil.
5. Lancer ensuite l'application depuis l'icone installee et non depuis un onglet navigateur.

Resultat attendu :
- l'application s'ouvre en plein ecran ou en mode "application"
- la navigation basse terrain fonctionne
- aucun ecran blanc au lancement

## Parcours notifications

1. Depuis l'ecran `Infos`, activer les notifications push.
2. Accepter la demande d'autorisation Android.
3. Verifier que l'etat passe a `Actives`.

Resultat attendu :
- aucun message d'erreur
- une ligne est creee dans `terrain_push_subscriptions` pour le technicien de test

## Cas 1 - Publication d'une mission

1. Depuis le back-office, publier une mission mobile pour le technicien de test.
2. Attendre la notification sur la tablette.
3. Toucher la notification.

Resultat attendu :
- notification recue avec un titre proche de `Nouvelle mission terrain`
- ouverture de l'application sur `/terrain/journee`
- la mission du jour apparait
- le compteur BT et les points a lire sont coherents

## Cas 2 - Message bureau simple

1. Depuis la messagerie bureau, envoyer un message sans piece jointe au technicien de test.
2. Attendre la notification sur la tablette.
3. Ouvrir la notification.

Resultat attendu :
- notification recue avec un titre proche de `Nouveau message du bureau`
- ouverture de l'application sur `/terrain/messages`
- le message apparait dans la liste
- a l'ouverture, le message passe en lu

## Cas 3 - Message bureau avec document

1. Depuis la messagerie bureau, envoyer un message avec une piece jointe PDF ou image.
2. Attendre la notification sur la tablette.
3. Ouvrir la notification.
4. Aller ensuite dans `Infos`.

Resultat attendu :
- notification recue avec un titre proche de `Nouveau document terrain`
- ouverture possible sur l'application terrain
- le message est visible dans `Messages`
- le document remonte aussi dans le bloc `Derniers documents du bureau` dans `Infos`
- le clic sur le document ouvre bien le fichier

## Cas 4 - Hors ligne apres synchronisation

1. Sur la tablette, visiter successivement :
   - `/terrain`
   - `/terrain/journee`
   - `/terrain/messages`
   - `/terrain/infos`
2. Ouvrir au moins un PDF BT.
3. Ouvrir au moins une piece jointe bureau.
4. Couper le Wi-Fi et la 4G/5G.
5. Relancer l'application depuis l'icone de l'ecran d'accueil.

Resultat attendu :
- l'application demarre encore
- un bandeau `Mode hors ligne` apparait
- les ecrans deja visites restent consultables
- le PDF BT deja ouvert reste reconsultable
- la piece jointe deja ouverte reste reconsultable

## Cas 5 - Changement de compte

1. Se deconnecter du compte terrain de test.
2. Se reconnecter avec un autre compte terrain.
3. Couper le reseau et revisiter les ecrans.

Resultat attendu :
- les donnees mises en cache du premier technicien ne reapparaissent pas pour le second
- l'application recharge le bon contexte de compte

## Points de controle Supabase

- `terrain_push_subscriptions.technician_id` est renseigne
- `terrain_push_subscriptions.office_account_id` peut etre renseigne
- la RLS empeche un technicien d'acceder aux abonnements d'un autre technicien
- les envois push suppriment bien les endpoints invalides `404/410`

## Limites connues

- Les notifications sont declenchees sur :
  - publication de mission mobile
  - message bureau simple
  - message bureau avec piece jointe
- Un message programme pour plus tard n'emette pas encore automatiquement de push a l'heure planifiee sans scheduler/cron dedie.
