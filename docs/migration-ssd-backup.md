# Sauvegarde avant remplacement du SSD

Ce projet contient un script PowerShell pour preparer une sauvegarde de migration Windows et, si besoin, l'envoyer sur un serveur perso via `ssh` et `scp`.

## Ce que le script sauvegarde par defaut

- le depot courant
- `C:\Users\Maison\.codex` en version ciblee
- `C:\Users\Maison\.gitconfig`
- `C:\Users\Maison\.ssh`
- `.env.local` du projet s'il existe
- `docs/` du projet s'il existe

Par defaut, la partie Codex est limitee aux fichiers utiles a la reprise :

- `config.toml`
- `auth.json`
- `.codex-global-state.json`
- `memories/`
- `sessions/`
- `skills/`
- `rules/`
- `state_5.sqlite*`
- `logs_2.sqlite*`
- `transcription-history.jsonl`

## Emplacement du script

[scripts/backup-to-server.ps1](C:/Users/Maison/Documents/GitHub/demat-bt-bdsn-next/scripts/backup-to-server.ps1)

## Exemple simple

Creation d'une archive locale uniquement :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-to-server.ps1 -SkipUpload
```

L'archive sera creee par defaut sur le Bureau dans `pc-backup`.

## Exemple avec upload vers le serveur

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-to-server.ps1 `
  -ServerHost 192.168.1.114 `
  -ServerUser maison `
  -RemoteDir /srv/backups/pc-maison `
  -ServerPort 22
```

Le script :

1. collecte les chemins importants
2. exporte le depot courant sans les fichiers ignores par Git (`node_modules`, `.next`, etc.)
3. cree un staging temporaire
4. genere un zip horodate
5. cree le dossier distant si necessaire
6. envoie l'archive avec `scp`

## Options utiles

- `-SkipUpload` : ne cree que l'archive locale
- `-IncludeFullCodex` : sauvegarde tout `C:\Users\Maison\.codex`
- `-IncludeGitHubRoot` : sauvegarde tout `C:\Users\Maison\Documents\GitHub`
- `-AdditionalPaths` : ajoute d'autres chemins

Exemple :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-to-server.ps1 `
  -SkipUpload `
  -AdditionalPaths "C:\Users\Maison\Documents", "D:\Exports"
```

## Recommandation pratique

Avant de remplacer le SSD :

1. lancer une sauvegarde locale avec `-SkipUpload`
2. verifier que le zip s'ouvre bien
3. refaire une sauvegarde avec upload vers le serveur
4. verifier sur le serveur que l'archive est bien presente
5. pousser sur GitHub les depots qui doivent l'etre

## Ce que je te conseille de sauvegarder en plus

- les dossiers personnels non versionnes
- exports navigateur et gestionnaire de mots de passe
- bases locales, Docker, WSL si tu les utilises
- licences, cles API, fichiers `.env` hors de ce depot
- captures ou notes de configuration reseau et serveur
