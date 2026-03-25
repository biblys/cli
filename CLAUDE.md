# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commandes

```bash
# Compiler le TypeScript
npm run build

# Mode développement (recompilation automatique)
npm run dev

# Installer globalement
npm install -g .
```

Il n'y a pas de tests automatisés ni de linter configurés.

## Architecture

CLI TypeScript utilisant Yargs pour parser les commandes. Les commandes ciblent des sites Biblys (PHP) via SSH.

**Flux de données :**
```
app.ts (Yargs) → commands/ → CommandExecutor → services/ (SSH/SCP) → site distant
```

**CommandExecutor** (`src/services/CommandExecutor.ts`) gère trois modes d'exécution :
- Site unique : `"paronymie"` → exécute pour ce site
- Sites multiples : `"site1,site2"` → exécute séquentiellement
- Tous les sites : `"all"` → exécute pour tous les sites de la config

**Commandes disponibles** (`src/commands/`) : `deploy`, `version`, `config`, `theme`

**Services** (`src/services/`) :
- `CliConfigService.ts` — lit `~/.biblys/config.json` (définitions des sites)
- `CommandExecutor.ts` — dispatch des commandes vers un ou plusieurs sites
- `ssh.ts` — wrapper SSH/SCP via `execa`
- `config.ts` — gestion de la config YAML distante (download via SCP, modification, upload)

## Configuration locale

Les sites sont définis dans `~/.biblys/config.json` :
```json
[
  { "name": "monsite", "server": "user@host", "path": "/var/www/monsite" }
]
```

Le type `Site` est défini dans `src/types.ts` et possède un champ optionnel `ignoreMigrations`.

## Pattern des commandes

Chaque commande suit ce pattern :
1. Fonction exportée par défaut, prend un `target` (string) en paramètre
2. Crée un `CommandExecutor` avec un handler `(site: Site) => Promise<void>`
3. Appelle `executeForTarget(target)`

Les commandes distantes s'exécutent toujours avec `cd {site.path}` comme contexte.
