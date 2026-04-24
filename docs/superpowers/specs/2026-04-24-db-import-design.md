# Design : commande `db:import`

## Objectif

Ajouter une commande `biblys db:import <site>` qui importe la base de données de production d'un site Biblys dans une base de données MySQL locale nommée `biblys-{site_name}`.

## Interface utilisateur

```
biblys db:import <site>
```

- `site` : argument positionnel **requis** (nom du site tel que défini dans `~/.biblys/config.json`)
- Aucune option supplémentaire

### Messages affichés

```
⇢ Récupération des credentials pour monsite…
⇢ Création de la base biblys-monsite…
⇢ [1/2] Dump de monsite_db…  127 Mo
✓ [1/2] Dump terminé (245 Mo)
⇢ [2/2] Import dans biblys-monsite… [████████░░] 52%
✓ [2/2] Import terminé
✓ Base biblys-monsite importée avec succès
```

En cas d'erreur : message `✗` en rouge + `process.exit(1)`.

## Architecture

### Fichiers modifiés

- **`src/commands/dbImport.ts`** (nouveau) : logique complète de la commande
- **`app.ts`** : enregistrement de la commande `db:import [site]`

### Services réutilisés

- `getCliConfigForSite(siteName)` — résolution du site depuis `~/.biblys/config.json`
- `fetchCredentials(site)` — récupération des credentials DB distants (avec cache SQLite)
- `execa` — exécution des processus SSH, mysqldump, mysql

Aucun nouveau service n'est nécessaire.

## Flux d'exécution

1. **Résoudre le site** via `getCliConfigForSite(siteName)` — quitter si introuvable
2. **Récupérer les credentials** via `fetchCredentials(site)`
3. **Créer/écraser la BDD locale** :
   ```
   mysql -u root -e "DROP DATABASE IF EXISTS `biblys-{site}`; CREATE DATABASE `biblys-{site}`"
   ```
4. **Étape 1 — Dump** : lancer `mysqldump` via SSH, écrire le flux dans `/tmp/biblys-{site}.sql`, afficher les Mo reçus en temps réel (taille inconnue à l'avance)
5. **Étape 2 — Import** : lire `/tmp/biblys-{site}.sql`, le piper vers `mysql -u root biblys-{site}`, afficher la progression en pourcentage (taille du fichier connue)
6. **Nettoyage** : supprimer le fichier temporaire
7. **Message de succès**

## Détails techniques

### Nom de la base locale

`biblys-${site.name}` (avec tiret).

### BDD locale

Accès via `mysql -u root` sans mot de passe (socket Unix local).

### Dump distant

```
mysqldump -h {host} -P {port} -u {user} [-p'{pass}'] {base}
```

Exécuté via SSH (`ssh {site.server} "mysqldump ..."`), capturé en streaming via `execa`.

### Progression étape 1 (dump)

Intercepter les chunks du stream SSH pour compter les octets reçus, mettre à jour la ligne de terminal avec `process.stdout.write('\r...')`.

### Progression étape 2 (import)

Lire la taille du fichier temp avec `fs.statSync`, piper via un `Transform` stream qui compte les octets lus, mettre à jour la barre de progression ASCII (`[████░░░░] XX%`) avec `process.stdout.write('\r...')`.

### Fichier temporaire

`/tmp/biblys-{site.name}.sql` — supprimé après l'import (dans un bloc `finally` pour garantir le nettoyage même en cas d'erreur).

## Contexte

Les deux plus grosses BDD (charybde et scylla) font ~400 Mo. L'approche par fichier temporaire a été choisie pour permettre deux étapes séquentielles avec progression réelle, plutôt qu'un pipe direct en streaming qui ne permettrait pas de distinguer les deux phases visuellement.
