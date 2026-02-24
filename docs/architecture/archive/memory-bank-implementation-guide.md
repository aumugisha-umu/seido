# Guide d'Implémentation Memory Bank - SEIDO

> **Pour qui ?** Ce guide est destiné aux développeurs de tous niveaux souhaitant comprendre et implémenter un système de mémoire persistante pour Claude Code.
>
> **Objectif** : Optimiser le contexte Claude Code pour une large codebase via un système de Memory Bank structuré avec mise à jour automatique.

---

## Table des Matières

1. [Concepts Fondamentaux](#1-concepts-fondamentaux)
2. [Analyse de l'Existant SEIDO](#2-analyse-de-lexistant-seido)
3. [Architecture Cible](#3-architecture-cible)
4. [Plan d'Implémentation Détaillé](#4-plan-dimplémentation-détaillé)
5. [Checklist de Suivi](#5-checklist-de-suivi)
6. [Maintenance et Bonnes Pratiques](#6-maintenance-et-bonnes-pratiques)
7. [Sources et Références](#7-sources-et-références)

---

## 1. Concepts Fondamentaux

### 1.1 Pourquoi un Memory Bank ?

**Le problème** : Claude Code est **stateless** (sans état). Chaque nouvelle session repart de zéro, ce qui signifie :
- Claude peut "halluciner" des noms de tables, fichiers ou fonctions qui n'existent pas
- Il peut proposer des structures qui contredisent l'architecture existante
- Les décisions prises dans une session sont perdues dans la suivante
- Le contexte se remplit vite et devient "pollué"

**La solution** : Un Memory Bank est un ensemble de **fichiers markdown structurés** qui servent de "mémoire" persistante pour Claude Code, lui permettant de :
- Connaître l'architecture du projet dès le début de session
- Respecter les patterns établis
- Suivre les décisions passées
- Maintenir la cohérence du code

> 📚 **Source** : Ce concept est inspiré du projet [claude-code-memory-bank](https://github.com/hudrazine/claude-code-memory-bank) et des bonnes pratiques de la communauté Claude Code.

---

### 1.2 Comment Claude Code Gère la Mémoire

Claude Code charge automatiquement les fichiers de mémoire dans son contexte au lancement. Il existe **4 niveaux de priorité** (du plus prioritaire au moins prioritaire) :

| Priorité | Type | Emplacement | Usage |
|----------|------|-------------|-------|
| 1 (Haute) | **Managed policy** | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS) | Règles organisationnelles (IT/DevOps) |
| 2 | **Project memory** | `./CLAUDE.md` ou `./.claude/CLAUDE.md` | Instructions partagées par l'équipe |
| 3 | **Project rules** | `./.claude/rules/*.md` | Règles modulaires par sujet |
| 4 (Basse) | **User memory** | `~/.claude/CLAUDE.md` | Préférences personnelles |
| Spécial | **Local memory** | `./CLAUDE.local.md` | Préférences personnelles (gitignored) |

> 📚 **Source** : [Claude Code Memory Documentation](https://code.claude.com/docs/en/memory)

**Comment ça marche** :
1. Claude Code **démarre** dans le répertoire courant
2. Il **remonte** les dossiers parents jusqu'à la racine
3. Il **charge** tous les fichiers `CLAUDE.md` et `CLAUDE.local.md` trouvés
4. Les fichiers de **priorité haute** sont lus en premier et ont le dernier mot

---

### 1.3 Les Imports avec @path

Les fichiers CLAUDE.md peuvent **importer** d'autres fichiers avec la syntaxe `@chemin/vers/fichier` :

```markdown
# Mon CLAUDE.md

Voir @README.md pour la vue d'ensemble du projet.
Consulter @docs/architecture.md pour l'architecture.

# Instructions supplémentaires
- Suivre le workflow git : @docs/git-workflow.md
```

**Règles importantes** :
- ✅ Chemins relatifs : `@docs/guidelines.md`
- ✅ Chemins absolus : `@/chemin/absolu/fichier.md`
- ✅ Home directory : `@~/.claude/mes-preferences.md`
- ❌ Pas évalué dans les blocs de code (``` ```)
- ⚠️ Maximum **5 niveaux** d'imports récursifs

> 📚 **Source** : [Claude Code Memory - Import Syntax](https://code.claude.com/docs/en/memory#import-syntax)

---

### 1.4 Les Hooks Claude Code

Les **hooks** sont des commandes qui s'exécutent automatiquement à des moments précis du cycle de vie de Claude Code. C'est comme des "déclencheurs" qui réagissent aux événements.

#### Événements disponibles (officiels)

| Événement | Quand il se déclenche | Cas d'usage |
|-----------|----------------------|-------------|
| **SessionStart** | Début/reprise de session | Charger du contexte, définir des variables |
| **UserPromptSubmit** | L'utilisateur envoie un message | Valider le prompt, ajouter du contexte |
| **PreToolUse** | **Avant** l'exécution d'un outil | Autoriser/bloquer/modifier l'appel |
| **PostToolUse** | **Après** l'exécution réussie d'un outil | Valider les résultats, donner du feedback |
| **PermissionRequest** | Dialogue de permission affiché | Auto-autoriser/refuser des permissions |
| **Notification** | Claude envoie une notification | Gérer les alertes |
| **Stop** | Claude finit de répondre | Décider si Claude doit continuer |
| **SubagentStop** | Un sous-agent finit | Évaluer la complétion du sous-agent |
| **PreCompact** | Avant la compaction du contexte | Nettoyage avant réduction |
| **Setup** | Flags `--init` ou `--maintenance` | Opérations uniques, installation |
| **SessionEnd** | Fin de session | Nettoyage, logging |

> 📚 **Source** : [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks)

#### Configuration des hooks

Les hooks se configurent dans :
- `~/.claude/settings.json` - Niveau utilisateur (tous les projets)
- `.claude/settings.json` - Niveau projet (versionné)
- `.claude/settings.local.json` - Niveau local (gitignored)

**Structure de base** :

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "votre-script.js",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

**⚠️ Important** : Pour les événements **sans matcher** (comme `Stop`, `SessionStart`), on omet simplement le champ `matcher` :

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "votre-script.js"
          }
        ]
      }
    ]
  }
}
```

#### Syntaxe des matchers

| Syntaxe | Signification |
|---------|---------------|
| `Write` | Correspond uniquement à l'outil Write |
| `Edit\|Write` | Correspond à Edit OU Write (regex) |
| `Notebook.*` | Tous les outils commençant par Notebook |
| `*` | Tous les outils |
| (omis) | Pour les événements sans matcher |

#### Codes de sortie (exit codes)

Les scripts hook communiquent leur résultat via le **code de sortie** :

| Exit Code | Signification | Comportement |
|-----------|---------------|--------------|
| **0** | Succès | L'action continue normalement |
| **2** | Erreur bloquante | L'action est bloquée, stderr affiché |
| **Autre** | Erreur non-bloquante | stderr affiché en mode verbose, continue |

> 📚 **Source** : [Claude Code Hooks - Exit Codes](https://code.claude.com/docs/en/hooks#exit-codes)

---

### 1.5 Les Règles Conditionnelles (.claude/rules/)

Les règles conditionnelles permettent d'appliquer des instructions **uniquement pour certains fichiers**. Elles utilisent un **frontmatter YAML** avec des patterns glob :

```markdown
---
paths:
  - "src/api/**/*.ts"
  - "app/api/**/*.ts"
---

# Règles pour les fichiers API

Ces règles ne s'appliquent QUE quand tu travailles sur des fichiers
correspondant aux patterns ci-dessus.

- Toujours valider les inputs avec Zod
- Utiliser le format de réponse standard
- Inclure la gestion d'erreurs
```

**Patterns glob supportés** :

| Pattern | Correspond à |
|---------|--------------|
| `**/*.ts` | Tous les fichiers `.ts` dans n'importe quel dossier |
| `src/**/*` | Tous les fichiers sous `src/` |
| `*.md` | Fichiers markdown à la racine |
| `src/**/*.{ts,tsx}` | Fichiers `.ts` et `.tsx` sous `src/` |
| `{src,lib}/**/*.ts` | Fichiers `.ts` dans `src/` ou `lib/` |

> 📚 **Source** : [Claude Code Memory - Path-Specific Rules](https://code.claude.com/docs/en/memory#path-specific-rules)

---

## 2. Analyse de l'Existant SEIDO

### 2.1 Ce qui existe déjà

| Élément | Détails | Statut |
|---------|---------|--------|
| **CLAUDE.md principal** | `.claude/CLAUDE.md` - 1029 lignes | ✅ Existant mais trop dense |
| **8 Agents spécialisés** | frontend, backend, debugger, researcher, ui-designer, API-designer, refactoring, tester | ✅ OK |
| **settings.local.json** | 30 permissions configurées, aucun hook | ⚠️ À enrichir |
| **Design System** | 31 fichiers dans `docs/design/` | ✅ OK - référencer |
| **Services Architecture** | 20 repositories, 27 domain services | ✅ OK - documenter |
| **Types Database** | `lib/database.types.ts` généré | ✅ OK - référencer |

### 2.2 Ce qui manque

| Élément | Impact | Priorité |
|---------|--------|----------|
| **Memory Bank structuré** | Sans lui, Claude "oublie" entre sessions | **CRITIQUE** |
| **Hooks automatiques** | Sans eux, la doc devient obsolète | **CRITIQUE** |
| **PROJECT_INDEX.json** | Sans lui, Claude cherche à l'aveugle | HAUTE |
| **Règles conditionnelles** | Sans elles, trop de contexte chargé | MOYENNE |

---

## 3. Architecture Cible

### 3.1 Structure des Fichiers

```
.claude/
├── CLAUDE.md                          # Réduit (~300 lignes, avec références)
├── PROJECT_INDEX.json                 # Carte structurelle du projet
├── settings.local.json                # Permissions + HOOKS
│
├── memory-bank/                       # 📚 Documentation vivante
│   ├── projectbrief.md               # Vision et objectifs
│   ├── productContext.md             # Problèmes résolus, personas
│   ├── systemPatterns.md             # Patterns architecturaux
│   ├── techContext.md                # Stack technique, commandes
│   ├── activeContext.md              # Focus session actuelle ← AUTO-UPDATED
│   └── progress.md                   # Historique et milestones
│
├── auto-memory/                       # 🔄 Système de mise à jour auto
│   ├── dirty-files                   # Queue des fichiers modifiés
│   └── last-sync                     # Timestamp dernière sync
│
├── scripts/                           # 🛠️ Scripts d'automatisation
│   ├── track-changes.js              # Hook PostToolUse
│   ├── update-active-context.js      # Hook Stop
│   └── check-memory-drift.js         # Détection désynchronisation
│
├── rules/                             # 📋 Règles conditionnelles
│   ├── intervention-rules.md         # Quand on touche aux interventions
│   ├── database-rules.md             # Quand on touche à la DB
│   └── ui-rules.md                   # Quand on crée des composants
│
├── commands/workflow/                 # ⚡ Commandes personnalisées
│   ├── sync-memory.md                # Synchronisation rapide
│   └── update-memory.md              # Mise à jour complète
│
└── agents/                            # 🤖 Agents existants + nouveaux
    ├── memory-synchronizer.md        # NOUVEAU
    ├── database-analyzer.md          # NOUVEAU
    └── [8 agents existants].md       # À enrichir
```

### 3.2 Hiérarchie du Memory Bank

```
                    projectbrief.md
                 (Vision et objectifs)
                         │
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
    productContext   systemPatterns  techContext
    (Frustrations    (Architecture   (Stack &
     résolues)       Repository+SL)   Schema)
           │             │             │
           └─────────────┼─────────────┘
                         ▼
                  activeContext.md    ← MIS À JOUR AUTOMATIQUEMENT
                  (Focus actuel)
                         │
                         ▼
                    progress.md       ← MIS À JOUR HEBDOMADAIRE
                   (Historique)
```

### 3.3 Flux de Mise à Jour Automatique

Voici comment fonctionne la mise à jour automatique :

```
┌──────────────────────────────────────────────────────────────────┐
│                    WORKFLOW AUTOMATIQUE                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. Tu édites un fichier avec Claude                             │
│          │                                                        │
│          ▼                                                        │
│  ┌─────────────────────────────────────────┐                     │
│  │ PostToolUse Hook se déclenche           │                     │
│  │ (après chaque Edit ou Write)            │                     │
│  └─────────────────────────────────────────┘                     │
│          │                                                        │
│          ▼                                                        │
│  ┌─────────────────────────────────────────┐                     │
│  │ track-changes.js s'exécute              │                     │
│  │ • Lit le fichier modifié                │                     │
│  │ • L'ajoute à dirty-files queue          │                     │
│  │ • Coût : 0 tokens, ~10ms                │                     │
│  └─────────────────────────────────────────┘                     │
│                                                                   │
│  2. Claude finit sa réponse                                      │
│          │                                                        │
│          ▼                                                        │
│  ┌─────────────────────────────────────────┐                     │
│  │ Stop Hook se déclenche                  │                     │
│  │ (quand Claude finit de répondre)        │                     │
│  └─────────────────────────────────────────┘                     │
│          │                                                        │
│          ▼                                                        │
│  ┌─────────────────────────────────────────┐                     │
│  │ update-active-context.js s'exécute      │                     │
│  │ • Lit la queue dirty-files              │                     │
│  │ • Met à jour activeContext.md           │                     │
│  │ • Vide la queue                         │                     │
│  │ • Affiche feedback si fichiers critiques│                     │
│  └─────────────────────────────────────────┘                     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Avantages de cette approche** :
- ✅ **0 tokens consommés** - Les scripts tournent en dehors du contexte Claude
- ✅ **Silencieux** - Ne pollue pas la conversation
- ✅ **Temps réel** - Chaque modification est trackée
- ✅ **Feedback intelligent** - Alerte uniquement si fichiers critiques

---

## 4. Plan d'Implémentation Détaillé

### Phase 1 : Infrastructure Auto-Update (CRITIQUE - 1h30)

**Objectif** : Mettre en place le tracking automatique AVANT le contenu.

> 💡 **Pourquoi commencer par là ?** Parce qu'une documentation qui n'est pas maintenue devient rapidement obsolète et inutile. Il vaut mieux avoir un système de mise à jour automatique dès le début.

#### 1.1 Créer les dossiers

```bash
# Créer les dossiers nécessaires
mkdir -p .claude/auto-memory
mkdir -p .claude/scripts
mkdir -p .claude/rules
mkdir -p .claude/memory-bank
mkdir -p .claude/commands/workflow

# Créer les fichiers de queue
touch .claude/auto-memory/dirty-files
touch .claude/auto-memory/last-sync
```

#### 1.2 Script track-changes.js

**Rôle** : S'exécute après chaque Edit/Write pour tracker les fichiers modifiés.

**Fichier** : `.claude/scripts/track-changes.js`

```javascript
#!/usr/bin/env node
/**
 * PostToolUse Hook : Track les fichiers modifiés silencieusement
 *
 * QUAND : Après chaque utilisation des outils Edit ou Write
 * INPUT : JSON depuis stdin contenant tool_input.file_path
 * OUTPUT : Ajoute une entrée dans dirty-files (coût: 0 tokens)
 *
 * Source: Inspiré de claude-code-auto-memory
 * https://deepwiki.com/severity1/claude-code-auto-memory
 */
const fs = require('fs');
const path = require('path');

// Chemin vers la queue des fichiers modifiés
const DIRTY_FILES_PATH = path.join(__dirname, '..', 'auto-memory', 'dirty-files');

// Patterns des fichiers "critiques" qui nécessitent attention
// Ces fichiers sont importants pour l'architecture et devraient
// déclencher une mise à jour du memory bank
const CRITICAL_PATTERNS = [
  'lib/services/',           // Services et repositories
  'supabase/migrations/',    // Migrations DB
  'app/api/',                // Routes API
  'components/',             // Composants UI
  'hooks/',                  // Hooks React
  'lib/database.types.ts',   // Types Supabase générés
  'app/globals.css'          // Design tokens
];

// Lecture du JSON depuis stdin (format Claude Code)
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    // Parse le JSON envoyé par Claude Code
    // Format: { tool_input: { file_path: "..." } }
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path;

    // Si pas de chemin de fichier, on sort silencieusement
    if (!filePath) {
      process.exit(0);  // Exit code 0 = succès
    }

    // Vérifie si le fichier est "critique"
    const isCritical = CRITICAL_PATTERNS.some(pattern =>
      filePath.includes(pattern)
    );

    // Crée l'entrée avec timestamp et sévérité
    const timestamp = new Date().toISOString();
    const severity = isCritical ? 'CRITICAL' : 'NORMAL';
    const entry = `${timestamp}|${severity}|${filePath}\n`;

    // Ajoute à la queue (append, pas overwrite)
    fs.appendFileSync(DIRTY_FILES_PATH, entry);

    // Exit code 0 = succès, l'action continue
    process.exit(0);

  } catch (error) {
    // En cas d'erreur, on échoue silencieusement
    // (on ne veut pas bloquer le workflow de l'utilisateur)
    process.exit(0);
  }
});
```

**Explications pédagogiques** :
- `process.stdin` : Claude Code envoie les données en JSON via l'entrée standard
- `fs.appendFileSync` : Ajoute à la fin du fichier sans écraser
- Exit code 0 : Signifie "succès" pour Claude Code, l'action continue
- Les patterns critiques : Fichiers qui affectent l'architecture

#### 1.3 Script update-active-context.js

**Rôle** : S'exécute quand Claude finit de répondre pour mettre à jour activeContext.md.

**Fichier** : `.claude/scripts/update-active-context.js`

```javascript
#!/usr/bin/env node
/**
 * Stop Hook : Met à jour activeContext.md avec les changements de session
 *
 * QUAND : Quand Claude finit de répondre (événement Stop)
 * INPUT : Lit la queue dirty-files
 * OUTPUT : Met à jour activeContext.md, feedback si fichiers critiques
 *
 * Source: Basé sur les bonnes pratiques Claude Code hooks
 * https://code.claude.com/docs/en/hooks
 */
const fs = require('fs');
const path = require('path');

// Chemins vers les fichiers
const DIRTY_FILES_PATH = path.join(__dirname, '..', 'auto-memory', 'dirty-files');
const ACTIVE_CONTEXT_PATH = path.join(__dirname, '..', 'memory-bank', 'activeContext.md');
const LAST_SYNC_PATH = path.join(__dirname, '..', 'auto-memory', 'last-sync');

function main() {
  // Si le fichier dirty-files n'existe pas, on sort
  if (!fs.existsSync(DIRTY_FILES_PATH)) {
    process.exit(0);
  }

  // Lire le contenu de la queue
  const dirtyContent = fs.readFileSync(DIRTY_FILES_PATH, 'utf-8');
  const lines = dirtyContent.trim().split('\n').filter(Boolean);

  // Si pas de fichiers modifiés, on sort
  if (lines.length === 0) {
    process.exit(0);
  }

  // Parse et déduplique les fichiers
  // Format de chaque ligne: timestamp|severity|filePath
  const files = new Map();
  lines.forEach(line => {
    const [timestamp, severity, filePath] = line.split('|');
    if (filePath && !files.has(filePath)) {
      files.set(filePath, { timestamp, severity });
    }
  });

  // Compte les fichiers critiques
  const criticalCount = [...files.values()]
    .filter(f => f.severity === 'CRITICAL')
    .length;

  // Lire ou créer activeContext.md
  let content = fs.existsSync(ACTIVE_CONTEXT_PATH)
    ? fs.readFileSync(ACTIVE_CONTEXT_PATH, 'utf-8')
    : '# SEIDO Active Context\n\n## Files Recently Modified\n';

  // Préparer la nouvelle section
  const today = new Date().toISOString().split('T')[0];
  const filesList = [...files.keys()]
    .slice(0, 20)  // Limite à 20 fichiers
    .map(f => `- \`${f}\``)
    .join('\n');

  const newSection = `\n### ${today} (Auto-updated)\n${filesList}\n`;

  // Mettre à jour la section "Files Recently Modified"
  const marker = '## Files Recently Modified';
  if (content.includes(marker)) {
    const idx = content.indexOf(marker);
    const nextSection = content.indexOf('\n## ', idx + marker.length);
    const insertPoint = nextSection > 0 ? nextSection : content.length;
    content = content.slice(0, idx + marker.length) + newSection + content.slice(insertPoint);
  } else {
    content += `\n${marker}${newSection}`;
  }

  // Écrire le fichier mis à jour
  fs.writeFileSync(ACTIVE_CONTEXT_PATH, content);

  // Vider la queue et mettre à jour last-sync
  fs.writeFileSync(DIRTY_FILES_PATH, '');
  fs.writeFileSync(LAST_SYNC_PATH, new Date().toISOString());

  // Si des fichiers critiques ont été modifiés, donner du feedback
  // Le feedback est envoyé via stdout en JSON
  if (criticalCount > 0) {
    // Format de feedback officiel Claude Code
    // Source: https://code.claude.com/docs/en/hooks#hook-output
    console.log(JSON.stringify({
      continue: true,  // Continue normalement
      systemMessage: `Memory Bank: ${files.size} fichiers trackés (${criticalCount} critiques). activeContext.md mis à jour.`
    }));
  }

  process.exit(0);
}

main();
```

**Explications pédagogiques** :
- `Map()` : Structure de données pour dédupliquer (une clé ne peut exister qu'une fois)
- `console.log(JSON.stringify(...))` : Format officiel pour communiquer avec Claude Code
- `continue: true` : Indique que l'action peut continuer (non bloquant)
- `systemMessage` : Message affiché à l'utilisateur

#### 1.4 Script check-memory-drift.js

**Rôle** : Vérifie si le memory bank est désynchronisé avec le code.

**Fichier** : `.claude/scripts/check-memory-drift.js`

```javascript
#!/usr/bin/env node
/**
 * Vérifie si le memory bank a besoin de synchronisation
 *
 * USAGE : node check-memory-drift.js
 * OUTPUT : Liste des drifts détectés
 *
 * Utilisé par l'agent memory-synchronizer
 */
const fs = require('fs');
const path = require('path');

const MEMORY_BANK_PATH = path.join(__dirname, '..', 'memory-bank');
const LAST_SYNC_PATH = path.join(__dirname, '..', 'auto-memory', 'last-sync');

// Configuration des vérifications
const checks = {
  techContext: {
    file: path.join(MEMORY_BANK_PATH, 'techContext.md'),
    sources: ['lib/database.types.ts', 'package.json'],
    description: 'Schema DB ou dépendances ont changé'
  },
  systemPatterns: {
    file: path.join(MEMORY_BANK_PATH, 'systemPatterns.md'),
    sources: ['lib/services/domain/', 'lib/services/repositories/'],
    description: 'Patterns de services ou repositories ont changé'
  },
  productContext: {
    file: path.join(MEMORY_BANK_PATH, 'productContext.md'),
    sources: ['app/', 'components/'],
    description: 'Features ou UI ont changé'
  }
};

function checkDrift() {
  const results = [];

  for (const [key, check] of Object.entries(checks)) {
    // Vérifier si le fichier existe
    if (!fs.existsSync(check.file)) {
      results.push({
        key,
        status: 'MISSING',
        description: `${key}.md n'existe pas`
      });
      continue;
    }

    // Comparer les dates de modification
    const memoryMtime = fs.statSync(check.file).mtime;
    const lastSync = fs.existsSync(LAST_SYNC_PATH)
      ? new Date(fs.readFileSync(LAST_SYNC_PATH, 'utf-8').trim())
      : new Date(0);

    if (memoryMtime < lastSync) {
      results.push({
        key,
        status: 'STALE',
        description: check.description
      });
    }
  }

  return results;
}

// Exécution
const drifts = checkDrift();

if (drifts.length > 0) {
  console.log('## Memory Bank Drift Détecté\n');
  drifts.forEach(d => {
    console.log(`- **${d.key}**: ${d.status} - ${d.description}`);
  });
  console.log('\nExécuter `/sync-memory` pour synchroniser.');
} else {
  console.log('✅ Memory Bank synchronisé avec le code.');
}
```

#### 1.5 Configuration des Hooks dans settings.local.json

**Fichier** : `.claude/settings.local.json`

```json
{
  "permissions": {
    "allow": [
      "Bash(npx tsc:*)",
      "Bash(npm run lint)",
      "WebSearch",
      "WebFetch(domain:supabase.com)",
      "WebFetch(domain:github.com)",
      "Bash(npm install:*)",
      "Bash(node -e:*)",
      "Bash(npm run build:*)"
    ],
    "deny": [],
    "ask": []
  },
  "outputStyle": "Explanatory",
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/scripts/track-changes.js",
            "timeout": 10
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/scripts/update-active-context.js",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

**⚠️ Points importants** :
- `PostToolUse` a un `matcher: "Edit|Write"` car il ne doit s'exécuter que pour ces outils
- `Stop` n'a **pas de matcher** (événement global)
- `timeout` en secondes (10s pour track, 30s pour update)

> 📚 **Source** : Configuration basée sur [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks)

---

### Phase 2 : Memory Bank Core (HAUTE - 2h)

Créer les 6 fichiers markdown qui constituent le "cerveau" du projet.

#### 2.1 projectbrief.md

**Rôle** : Vue d'ensemble rapide du projet pour orienter Claude dès le début.

**Fichier** : `.claude/memory-bank/projectbrief.md`

```markdown
# SEIDO Project Brief

## Vision
SEIDO est une plateforme de gestion immobilière multi-rôles qui unifie
la communication entre gestionnaires, prestataires et locataires pour
réduire le "mode pompier" de 70% à 30%.

## Objectifs Principaux
1. Réduire la charge gestionnaire (60h/semaine → 40h/semaine)
2. Éliminer le "phone ring hell" (50 appels/jour → 15/jour)
3. Visibilité end-to-end sur les interventions
4. Portails self-service pour tous les rôles

## Public Cible

| Rôle | % Users | Device | Besoin Principal |
|------|---------|--------|------------------|
| Gestionnaire | 70% | 80% mobile | Efficacité, vue d'ensemble |
| Prestataire | 20% | 75% mobile | Infos terrain, actions rapides |
| Locataire | 10% | Mobile-first | Suivi simple |
| Admin | <1% | Desktop | Gestion système |

## Contraintes Techniques
- Stack: Next.js 15, React 19, Supabase, TypeScript strict
- Multi-tenant avec RLS policies
- SSR-first avec @supabase/ssr

## Critères de Succès
- [ ] Création intervention < 30 sec (gestionnaire)
- [ ] Acceptation mission < 3 taps (prestataire)
- [ ] Soumission demande < 2 min (locataire)

---
*Dernière mise à jour: 2026-01-22*
*Source: docs/design/persona-*.md*
```

#### 2.2 productContext.md

**Rôle** : Explique pourquoi le projet existe et quels problèmes il résout.

**Fichier** : `.claude/memory-bank/productContext.md`

```markdown
# SEIDO Product Context

## Problème Résolu

Les gestionnaires immobiliers passent 70-80% de leur temps en mode "pompier" :
- 2h/jour à chercher des informations dispersées
- 50 appels téléphoniques/jour pour des mises à jour de statut
- Aucune visibilité sur le travail des prestataires
- Chaos multi-canal (WhatsApp, email, SMS, téléphone)

## Solution SEIDO

1. **Plateforme unifiée** - Toutes les communications en un lieu
2. **Suivi temps réel** - Statut intervention visible par tous les acteurs
3. **Portails self-service** - Réduction 70% du volume d'appels
4. **Automatisation** - Templates, actions bulk, notifications intelligentes

## Frustrations par Persona

### Gestionnaire (Thomas - 70% users)

| Frustration | Solution SEIDO |
|-------------|----------------|
| "2h/jour à chercher les infos" | ContextPanel toujours visible, recherche globale |
| "50 appels/jour pour des statuts" | Portails self-service, statut temps réel |
| "Le prestataire est un trou noir" | Timeline end-to-end, timers SLA |

### Prestataire (Marc - 20% users)

| Frustration | Solution SEIDO |
|-------------|----------------|
| "Infos manquantes sur site" | Indicateur complétude, toutes infos avant déplacement |
| "Délais devis 2 semaines" | Notifications temps réel, suivi deadlines |
| "Annulations dernière minute" | Confirmation J-1, pénalités |

### Locataire (Emma - 10% users)

| Frustration | Solution SEIDO |
|-------------|----------------|
| "Ne sais pas où en est ma demande" | Timeline 8 étapes style Deliveroo |
| "Délais vagues" | Créneaux précis, rappel J-1 |
| "Documents perdus" | Espace documents centralisé |

## Modules Implémentés

### Phase 1-4 ✅ Complétées
- Authentification (JWT + OAuth Google)
- Gestion utilisateurs, équipes, entreprises
- Biens immobiliers (immeubles, lots)
- Interventions (workflow 11 statuts)
- Chat/Conversations temps réel
- Notifications multi-canal
- Email (IMAP/SMTP sync)
- Contrats et documents

### Phase 5 🚧 En cours
- Types d'intervention dynamiques
- Confirmation participants
- Système avatars
- Onboarding modal

---
*Dernière mise à jour: 2026-01-22*
*Références: docs/design/persona-gestionnaire-unifie.md, persona-prestataire.md, persona-locataire.md*
```

#### 2.3 systemPatterns.md

**Rôle** : Documente l'architecture et les patterns de code à suivre.

**Fichier** : `.claude/memory-bank/systemPatterns.md`

```markdown
# SEIDO System Patterns & Architecture

## Architecture Globale

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js 15 App Router                    │
├─────────────────────────────────────────────────────────────┤
│  Server Components (default)  │  Client Components (minimal) │
│  - Page data loading          │  - Interactive forms         │
│  - Auth via getServerAuth()   │  - Real-time updates         │
├─────────────────────────────────────────────────────────────┤
│                    Domain Services (27)                      │
│  intervention, notification, email, team, building, etc.    │
├─────────────────────────────────────────────────────────────┤
│                    Repositories (20)                         │
│  intervention, notification, user, building, lot, etc.      │
├─────────────────────────────────────────────────────────────┤
│                    Supabase (PostgreSQL + RLS)               │
│  37 tables | 59 RLS policies | 209 indexes | 47 triggers    │
└─────────────────────────────────────────────────────────────┘
```

## Patterns Critiques à Respecter

### 1. Server Authentication (OBLIGATOIRE)

Toutes les pages Server Components DOIVENT utiliser `getServerAuthContext()` :

```typescript
// ✅ CORRECT - Pattern centralisé
import { getServerAuthContext } from '@/lib/server-context'

export default async function Page() {
  const { user, profile, team, supabase } = await getServerAuthContext('gestionnaire')
  // team.id est TOUJOURS disponible ici
}

// ❌ INTERDIT - Auth manuelle
const supabase = await createServerSupabaseClient()
const { data: { user } } = await supabase.auth.getUser()
// ... 10+ lignes de code dupliqué
```

> 📚 Source: lib/server-context.ts - 21 pages migrées vers ce pattern

### 2. Repository Pattern (OBLIGATOIRE)

JAMAIS d'appels Supabase directs dans les composants ou services :

```typescript
// ✅ CORRECT - Via Repository
const repository = new InterventionRepository(supabase)
const interventions = await repository.findAll()

// ❌ INTERDIT - Appel direct Supabase
const { data } = await supabase.from('interventions').select('*')
```

> 📚 Source: lib/services/README.md - 20 repositories implémentés

### 3. Notification Architecture

Flux obligatoire pour les notifications :

```
Server Action → Domain Service → Repository

// Exemple d'utilisation
import { createInterventionNotification } from '@/app/actions/notification-actions'
await createInterventionNotification(interventionId)
```

> 📚 Source: app/actions/notification-actions.ts

### 4. Real-time (Single Channel)

Un seul canal WebSocket par utilisateur via RealtimeProvider :

```typescript
// ✅ CORRECT - Hooks v2 via RealtimeProvider
import { useRealtimeNotificationsV2 } from '@/hooks/use-realtime-notifications-v2'

// Tables écoutées: notifications, conversation_messages,
// interventions, intervention_quotes, intervention_time_slots, emails
```

> 📚 Source: contexts/realtime-context.tsx

### 5. Intervention Status Flow

```
demande → approuvee/rejetee → demande_de_devis → planification →
planifiee → en_cours → cloturee_par_prestataire →
cloturee_par_locataire → cloturee_par_gestionnaire
```

## Anti-Patterns (NE JAMAIS FAIRE)

| ❌ Anti-Pattern | ✅ Alternative |
|-----------------|----------------|
| Appels Supabase directs | Passer par Repository |
| Client Components par défaut | Server Components par défaut |
| Auth manuelle | `getServerAuthContext()` |
| Channels realtime multiples | RealtimeProvider unique |
| `npm run build` automatique | Demander à l'utilisateur |

## Conventions de Nommage

| Élément | Convention | Exemple |
|---------|------------|---------|
| Components | kebab-case | `intervention-card.tsx` |
| Hooks | camelCase + use | `useAuth.ts` |
| Services | kebab-case + .service | `notification.service.ts` |
| Repositories | kebab-case + .repository | `user.repository.ts` |
| API Routes | kebab-case | `/api/intervention-quotes` |

---
*Dernière mise à jour: 2026-01-22*
*Références: lib/services/README.md, lib/server-context.ts*
```

#### 2.4 techContext.md

**Rôle** : Stack technique, commandes, et structure des fichiers.

**Fichier** : `.claude/memory-bank/techContext.md`

```markdown
# SEIDO Technical Context

## Stack Technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Framework | Next.js | 15.2.4 |
| React | React | 19 |
| Language | TypeScript | 5 (strict) |
| Styling | Tailwind CSS | v4 |
| Components | shadcn/ui | 50+ composants |
| Icons | Lucide React | - |
| Backend | Supabase | PostgreSQL + RLS |
| Auth | @supabase/ssr | SSR cookies |
| Forms | React Hook Form + Zod | - |
| State | React Context | 3 contexts |
| Caching | Redis + LRU | - |
| Testing | Vitest + Playwright | - |
| Email | Resend + React Email | 18 templates |

## Fichiers Clés

| Usage | Chemin |
|-------|--------|
| Types DB (source de vérité) | `lib/database.types.ts` |
| Index des services | `lib/services/index.ts` |
| Contexte auth server | `lib/server-context.ts` |
| Variables CSS | `app/globals.css` |
| Clients Supabase | `lib/services/core/supabase-client.ts` |
| Repository de base | `lib/services/core/base-repository.ts` |

## Commandes

```bash
# Développement
npm run dev              # Serveur de dev

# Validation (UTILISER EN PRIORITÉ)
npm run lint             # ESLint
npx tsc --noEmit [file]  # Validation TypeScript ciblée

# ⚠️ INTERDIT sans demande explicite
npm run build            # Build production

# Testing
npm test                 # Tous les tests
npx playwright test      # Tests E2E

# Database
npm run supabase:types   # Régénérer lib/database.types.ts
npm run supabase:migrate # Créer nouvelle migration
```

## Structure des Dossiers

```
app/[role]/          # Routes par rôle (admin, gestionnaire, prestataire, locataire)
components/          # 270+ composants
hooks/               # 60 custom hooks
lib/services/        # Architecture Repository Pattern
  core/              # Clients Supabase, base repository, error handler
  repositories/      # 20 repositories (accès données)
  domain/            # 27 services (logique métier)
tests/               # Infrastructure E2E
docs/                # 226 fichiers markdown
supabase/migrations/ # 131 migrations SQL
```

## Base de Données

### Tables Principales (37 total)

| Phase | Tables |
|-------|--------|
| 1 | users, teams, team_members, companies, user_invitations |
| 2 | buildings, lots, building_contacts, lot_contacts, property_documents |
| 3 | interventions, intervention_*, conversation_*, notifications |
| 4 | contracts, contract_contacts, contract_documents, import_jobs |
| 5 | intervention_types, intervention_type_categories |

### Fonctions RLS Helpers

```sql
-- Vérification de rôle
is_admin()
is_gestionnaire()

-- Vérification d'appartenance équipe
is_team_manager(team_id)

-- Récupération team_id par relation
get_building_team_id(building_id)
get_lot_team_id(lot_id)

-- Vérification tenant
is_tenant_of_lot(lot_id)

-- Vérification accès ressource
can_view_building(building_id)
can_view_lot(lot_id)

-- Utilisateur courant
get_current_user_id()

-- Intervention
is_assigned_to_intervention(intervention_id)
```

### Vues _active (Soft Delete)

Toujours utiliser les vues pour filtrer automatiquement `deleted_at` :

```typescript
// ✅ CORRECT - Vue filtre automatiquement
supabase.from('interventions_active').select('*')
supabase.from('buildings_active').select('*')
supabase.from('lots_active').select('*')
supabase.from('contracts_active').select('*')
```

---
*Dernière mise à jour: 2026-01-22*
*Régénérer types: npm run supabase:types*
```

#### 2.5 activeContext.md

**Rôle** : Focus de la session actuelle (mis à jour automatiquement par les hooks).

**Fichier** : `.claude/memory-bank/activeContext.md`

```markdown
# SEIDO Active Context

## Focus Actuel
**Feature en cours:** Implémentation Memory Bank
**Branch:** `preview`
**Sprint:** UX Improvements (Jan 2026)

## Ce qui a été fait récemment
- [x] Email quote stripping improvements
- [x] Message bubble layout simplification
- [x] Email reply sync to conversation threads
- [ ] En cours: Memory Bank implementation

## Décisions prises cette session
1. **Emplacement Memory Bank** - `.claude/memory-bank/` pour garder le projet propre
2. **Auto-update via hooks** - PostToolUse + Stop pour mise à jour silencieuse

## Files Recently Modified
<!-- Section auto-updated par les hooks -->

## Problèmes rencontrés
- (Aucun actuellement)

## Prochaines étapes
1. [ ] Finaliser scripts d'auto-update
2. [ ] Tester les hooks
3. [ ] Créer agents supplémentaires
4. [ ] Intégrer avec agents existants

## Notes pour la prochaine session
- Vérifier que les hooks s'exécutent correctement
- Tester le workflow complet de mise à jour

---
*Dernière mise à jour: 2026-01-22*
*Auto-sync: Activé*
```

#### 2.6 progress.md

**Rôle** : Historique du projet et milestones.

**Fichier** : `.claude/memory-bank/progress.md`

```markdown
# SEIDO Progress Log

## Milestones Complétés

### Phase 1: Core Architecture ✅
- Users, Teams, Companies, Invitations
- Repository Pattern implementation
- 20 repositories créés

### Phase 2: Property Management ✅
- Buildings, Lots, Property Documents
- RLS policies multi-tenant

### Phase 3: Interventions ✅
- Workflow 11 statuts
- Chat/Conversation system
- Notifications infrastructure
- Email system (IMAP/SMTP)

### Phase 4: Contracts ✅
- Contract management
- Document handling
- Import jobs

### Phase 5: UX Improvements 🚧 (En cours)
- [x] Google OAuth integration
- [x] Onboarding modal (5 slides)
- [x] Avatar system
- [ ] Intervention types refactoring
- [ ] Participant confirmation
- [ ] Memory Bank implementation

## Sprint Actuel (Jan 2026)
- Memory Bank implementation
- Context optimization for Claude Code

## Dette Technique Connue
- 15 fichiers utilisent encore le singleton notification legacy
- Certains composants pourraient migrer vers Server Components
- PROJECT_INDEX.json à générer

## Métriques Projet

| Métrique | Valeur |
|----------|--------|
| Repositories | 20 |
| Domain Services | 27 |
| API Routes | 97 |
| Hooks | 60 |
| Components | 270+ |
| DB Tables | 37 |
| Migrations | 131 |

---
*Dernière mise à jour: 2026-01-22*
```

---

### Phase 3 : PROJECT_INDEX.json (HAUTE - 1h)

**Rôle** : Carte structurelle permettant à Claude de naviguer rapidement dans le projet.

**Fichier** : `.claude/PROJECT_INDEX.json`

```json
{
  "version": "1.0.0",
  "lastUpdated": "2026-01-22",
  "project": {
    "name": "SEIDO",
    "description": "Plateforme de gestion immobilière multi-rôles",
    "framework": "nextjs",
    "language": "typescript"
  },
  "entryPoints": {
    "memoryBank": ".claude/memory-bank/",
    "agents": ".claude/agents/",
    "rules": ".claude/rules/",
    "scripts": ".claude/scripts/"
  },
  "domains": {
    "intervention": {
      "description": "Gestion workflow interventions (11 statuts)",
      "services": ["lib/services/domain/intervention-service.ts"],
      "repositories": ["lib/services/repositories/intervention.repository.ts"],
      "components": ["components/intervention/"],
      "api": ["app/api/intervention*/"],
      "hooks": ["hooks/use-interventions.ts", "hooks/use-realtime-interventions.ts"],
      "docs": ["docs/guides/cycle-complet-intervention.md"]
    },
    "notification": {
      "description": "Système de notifications cross-role",
      "services": [
        "lib/services/domain/notification.service.ts",
        "lib/services/domain/email-notification.service.ts"
      ],
      "repositories": ["lib/services/repositories/notification-repository.ts"],
      "actions": ["app/actions/notification-actions.ts"],
      "hooks": ["hooks/use-realtime-notifications-v2.ts"]
    },
    "building": {
      "description": "Gestion des biens immobiliers",
      "services": ["lib/services/domain/building.service.ts"],
      "repositories": ["lib/services/repositories/building.repository.ts"],
      "components": ["components/biens/"]
    },
    "auth": {
      "description": "Authentification et autorisation",
      "core": ["lib/server-context.ts"],
      "supabase": ["lib/services/core/supabase-client.ts"],
      "hooks": ["hooks/use-auth.ts"],
      "routes": ["app/auth/"]
    },
    "email": {
      "description": "Synchronisation et envoi d'emails",
      "services": [
        "lib/services/domain/email.service.ts",
        "lib/services/domain/imap.service.ts",
        "lib/services/domain/smtp.service.ts"
      ],
      "hooks": ["hooks/use-realtime-emails-v2.ts"]
    },
    "design": {
      "description": "Design system UX/UI",
      "index": "docs/design/ux-ui-decision-guide.md",
      "personas": ["docs/design/persona-*.md"],
      "tokens": "app/globals.css",
      "components": "components/ui/"
    }
  },
  "keyPatterns": {
    "serverAuth": "lib/server-context.ts:getServerAuthContext()",
    "repository": "lib/services/repositories/*.repository.ts",
    "domainService": "lib/services/domain/*.service.ts",
    "serverAction": "app/actions/*.ts"
  },
  "database": {
    "types": "lib/database.types.ts",
    "migrations": "supabase/migrations/",
    "tablesCount": 37,
    "rlsFunctions": [
      "is_admin()",
      "is_gestionnaire()",
      "is_team_manager(team_id)",
      "get_building_team_id(building_id)",
      "get_lot_team_id(lot_id)"
    ]
  }
}
```

---

### Phase 4 : Agents Supplémentaires (HAUTE - 1h)

#### 4.1 Agent memory-synchronizer

**Fichier** : `.claude/agents/memory-synchronizer.md`

```markdown
---
name: memory-synchronizer
description: Synchronise la documentation memory-bank avec l'état réel du code SEIDO.
tools:
  - Read
  - Write
  - Grep
  - Glob
---

# Memory Bank Synchronizer - SEIDO

## Ta Mission
Maintenir la synchronisation entre le code SEIDO et la documentation memory-bank.

## Avant Chaque Synchronisation
1. Lis `.claude/auto-memory/dirty-files` pour les fichiers modifiés
2. Exécute `node .claude/scripts/check-memory-drift.js`
3. Compare memory-bank avec la réalité du code

## Workflow de Synchronisation

### 1. Audit techContext.md
Compare avec:
- `lib/database.types.ts` - Nouvelles tables/colonnes?
- `package.json` - Nouvelles dépendances?
- `supabase/migrations/` - Nouvelles migrations?

### 2. Audit systemPatterns.md
Compare avec:
- `lib/services/domain/*.service.ts` - Nouveaux patterns?
- `lib/services/repositories/*.repository.ts` - Nouveaux repos?
- `lib/server-context.ts` - Changements auth?

### 3. Audit productContext.md
Compare avec:
- `app/` - Nouvelles routes/pages?
- `components/` - Nouveaux composants majeurs?

### 4. Mise à Jour
Pour chaque drift détecté:
1. Propose la correction
2. Après approbation, met à jour le fichier
3. Ajoute timestamp de mise à jour

## Output Attendu
```markdown
## Memory Bank Sync Report

### Fichiers analysés
- [x] techContext.md
- [x] systemPatterns.md
- [x] productContext.md

### Drifts détectés
| Fichier | Section | État doc | Réalité code |
|---------|---------|----------|--------------|

### Actions effectuées
- Updated techContext.md: ...
```
```

#### 4.2 Agent database-analyzer

**Fichier** : `.claude/agents/database-analyzer.md`

```markdown
---
name: database-analyzer
description: Analyse le schéma Supabase et vérifie la cohérence. Utiliser AVANT toute modification de schéma.
tools:
  - Read
  - Grep
  - Glob
---

# Database Analyzer - SEIDO

## Ta Mission
Analyser le schéma Supabase PostgreSQL et vérifier la cohérence avec la documentation.

## Sources de Vérité (par ordre de priorité)
1. `lib/database.types.ts` - Types générés (source primaire)
2. `supabase/migrations/*.sql` - Historique des migrations
3. `.claude/memory-bank/techContext.md` - Documentation

## Checklist d'Analyse

### Structure
- [ ] Toutes les tables ont des RLS policies
- [ ] Les foreign keys sont correctement définies
- [ ] Les index couvrent les queries fréquentes
- [ ] Soft delete via `deleted_at` sur tables principales

### RLS Policies
- [ ] `is_admin()` pour accès admin
- [ ] `is_team_manager(team_id)` pour isolation équipe
- [ ] Vues `*_active` pour filtrage soft delete

### Conventions SEIDO
- [ ] UUIDs pour toutes les primary keys
- [ ] `created_at`, `updated_at` sur chaque table
- [ ] Enums PostgreSQL pour statuts fixes
- [ ] team_id dénormalisé sur tables enfants (triggers)

## Output Attendu
```markdown
## Database Analysis Report

### État actuel
- X tables
- Y RLS policies
- Z indexes

### Problèmes détectés
| Table | Issue | Sévérité |
|-------|-------|----------|

### Recommandations
1. ...

### Cohérence avec memory-bank
- ✅ Synchronisé / ⚠️ Désynchronisé
```
```

---

### Phase 5 : Règles Conditionnelles (MOYENNE - 45min)

#### 5.1 intervention-rules.md

**Fichier** : `.claude/rules/intervention-rules.md`

```markdown
---
paths:
  - "lib/services/domain/intervention*"
  - "lib/services/repositories/intervention*"
  - "app/api/intervention*"
  - "components/intervention/**"
---

# Règles Intervention - SEIDO

> Ces règles s'appliquent UNIQUEMENT quand tu travailles sur des fichiers
> correspondant aux patterns ci-dessus.

## Transitions de Statut Valides

```
demande → approuvee (gestionnaire uniquement)
demande → rejetee (gestionnaire uniquement)
approuvee → demande_de_devis (gestionnaire)
demande_de_devis → planification (après devis approuvé)
planification → planifiee (après time slot confirmé)
planifiee → en_cours (début intervention)
en_cours → cloturee_par_prestataire
cloturee_par_prestataire → cloturee_par_locataire
cloturee_par_locataire → cloturee_par_gestionnaire
```

## Avant Toute Modification
1. Lire `lib/services/domain/intervention-service.ts`
2. Vérifier les RLS policies dans les migrations
3. Utiliser notification server actions pour changements de statut

## Fichiers de Référence
- Service: `lib/services/domain/intervention-service.ts`
- Repository: `lib/services/repositories/intervention.repository.ts`
- Actions: `app/actions/notification-actions.ts`
- Guide: `docs/guides/cycle-complet-intervention.md`
```

#### 5.2 database-rules.md

**Fichier** : `.claude/rules/database-rules.md`

```markdown
---
paths:
  - "supabase/migrations/**"
  - "lib/database.types.ts"
  - "lib/services/repositories/**"
---

# Règles Database - SEIDO

> Ces règles s'appliquent quand tu modifies le schéma ou les repositories.

## Avant Toute Migration

1. **Vérifier** le schéma actuel dans `lib/database.types.ts`
2. **Nommer** la migration : `YYYYMMDDHHMMSS_description.sql`
3. **Toujours** ajouter RLS policies pour nouvelles tables
4. **Régénérer** les types après : `npm run supabase:types`

## Fonctions RLS Disponibles

| Fonction | Usage |
|----------|-------|
| `is_admin()` | Check rôle admin |
| `is_gestionnaire()` | Check rôle gestionnaire |
| `is_team_manager(team_id)` | Check membre équipe |
| `get_building_team_id(building_id)` | Récupère team_id via building |
| `get_lot_team_id(lot_id)` | Récupère team_id via lot |

## Isolation Multi-Tenant

⚠️ **TOUTES** les queries multi-tenant DOIVENT filtrer par `team_id`.

## Tables avec team_id Dénormalisé

Ces 4 tables ont un trigger qui synchronise automatiquement `team_id`.
Ne PAS fournir manuellement :
- `conversation_messages`
- `building_contacts`
- `lot_contacts`
- `intervention_time_slots`
```

#### 5.3 ui-rules.md

**Fichier** : `.claude/rules/ui-rules.md`

```markdown
---
paths:
  - "components/**"
  - "app/**/page.tsx"
---

# Règles UI - SEIDO

> Ces règles s'appliquent quand tu crées ou modifies des composants.

## Avant de Créer un Composant

1. **Vérifier shadcn/ui** : https://ui.shadcn.com/docs/components
2. **Chercher l'existant** : `components/ui/` et `components/`
3. **Lire le persona** concerné : `docs/design/persona-[role].md`

## Design Tokens (app/globals.css)

```css
/* Couleurs OKLCH */
--primary, --background, --foreground, --muted

/* Spacing dashboard */
--dashboard-padding-sm, --dashboard-padding-md, --dashboard-padding-lg

/* Border radius */
--radius
```

## Contraintes Mobile-First

- Touch targets : minimum 44px
- Bottom sheets > dropdowns sur mobile
- Responsive : `sm:` `md:` `lg:` `xl:`

## Accessibilité (WCAG 2.1 AA)

- `aria-label` sur éléments interactifs
- `tabindex` pour navigation clavier
- Contraste couleurs suffisant

## Server vs Client Components

| Utiliser Server Component | Utiliser Client Component |
|---------------------------|---------------------------|
| Chargement de données | Forms interactifs |
| Pages statiques | Mises à jour temps réel |
| SEO important | State local complexe |
```

---

### Phase 6 : Commandes Workflow (MOYENNE - 30min)

#### 6.1 sync-memory.md

**Fichier** : `.claude/commands/workflow/sync-memory.md`

```markdown
---
name: sync-memory
description: Synchronisation rapide du memory bank avec le code
---

# Sync Memory Bank

## Étapes
1. Exécuter `node .claude/scripts/check-memory-drift.js`
2. Lire les drifts détectés
3. Pour chaque drift, proposer la correction
4. Mettre à jour les fichiers memory-bank concernés
5. Mettre à jour `.claude/auto-memory/last-sync`

## Fichiers à Vérifier
- `techContext.md` vs `lib/database.types.ts`
- `systemPatterns.md` vs `lib/services/`
- `activeContext.md` vs git status

## Après Synchronisation
```bash
git add .claude/memory-bank/
git commit -m "docs: sync memory bank"
```
```

---

### Phase 7 : Intégration Agents Existants (MOYENNE - 30min)

Ajouter cette section à CHAQUE agent dans `.claude/agents/` :

```markdown
## Memory Bank Context

Avant de commencer:
1. Lire `.claude/memory-bank/activeContext.md` - Focus actuel
2. Consulter `.claude/memory-bank/systemPatterns.md` - Architecture
3. Vérifier `.claude/PROJECT_INDEX.json` - Localisation fichiers
4. Respecter les règles dans `.claude/rules/` si applicable

Après modifications significatives:
- Les hooks mettront à jour automatiquement `activeContext.md`
- Pour sync complète : exécuter `/sync-memory`
```

---

### Phase 8 : Réduction CLAUDE.md (BASSE - 1h)

**Objectif** : Réduire le CLAUDE.md principal de 1029 lignes à ~300 lignes en utilisant des références vers le memory bank.

---

## 5. Checklist de Suivi

### Phase 1 : Infrastructure Auto-Update (CRITIQUE)
- [ ] Créer `.claude/auto-memory/` directory
- [ ] Créer `dirty-files` et `last-sync`
- [ ] Créer `scripts/track-changes.js`
- [ ] Créer `scripts/update-active-context.js`
- [ ] Créer `scripts/check-memory-drift.js`
- [ ] Modifier `settings.local.json` avec hooks
- [ ] Tester les hooks (créer un fichier test)

### Phase 2 : Memory Bank Core (HAUTE)
- [ ] Créer `.claude/memory-bank/` directory
- [ ] Créer `projectbrief.md`
- [ ] Créer `productContext.md`
- [ ] Créer `systemPatterns.md`
- [ ] Créer `techContext.md`
- [ ] Créer `activeContext.md`
- [ ] Créer `progress.md`

### Phase 3 : PROJECT_INDEX.json (HAUTE)
- [ ] Créer `.claude/PROJECT_INDEX.json`
- [ ] Mapper tous les domaines (6)
- [ ] Documenter keyPatterns
- [ ] Documenter database structure

### Phase 4 : Agents Supplémentaires (HAUTE)
- [ ] Créer `agents/memory-synchronizer.md`
- [ ] Créer `agents/database-analyzer.md`

### Phase 5 : Règles Conditionnelles (MOYENNE)
- [ ] Créer `.claude/rules/` directory
- [ ] Créer `intervention-rules.md`
- [ ] Créer `database-rules.md`
- [ ] Créer `ui-rules.md`

### Phase 6 : Commandes Workflow (MOYENNE)
- [ ] Créer `.claude/commands/workflow/` directory
- [ ] Créer `sync-memory.md`

### Phase 7 : Intégration Agents (MOYENNE)
- [ ] Mettre à jour les 8 agents existants

### Phase 8 : CLAUDE.md Modulaire (BASSE)
- [ ] Réduire CLAUDE.md principal
- [ ] Ajouter références vers memory-bank

---

## 6. Maintenance et Bonnes Pratiques

### Automatique (via hooks)
- `activeContext.md` est mis à jour automatiquement à chaque fin de réponse
- Les fichiers modifiés sont trackés silencieusement

### Quotidien (début de session)
- Lire `activeContext.md` pour le contexte
- Vérifier `progress.md` pour le sprint actuel

### Hebdomadaire
- Exécuter `/sync-memory` pour synchronisation complète
- Nettoyer `activeContext.md` (archiver vers progress.md)
- Mettre à jour `PROJECT_INDEX.json` si nouveaux domaines

### Mensuel
- Review complet avec agent `memory-synchronizer`
- Mise à jour `projectbrief.md` et `productContext.md`
- Archivage sessions dans `progress.md`

---

## 7. Sources et Références

### Documentation Officielle Claude Code
- [Hooks Reference](https://code.claude.com/docs/en/hooks) - Configuration et événements
- [Memory Management](https://code.claude.com/docs/en/memory) - CLAUDE.md et règles

### Projets Communautaires
- [claude-code-memory-bank](https://github.com/hudrazine/claude-code-memory-bank) - Système Memory Bank original
- [claude-code-auto-memory](https://deepwiki.com/severity1/claude-code-auto-memory) - Auto-update avec hooks

### Articles et Guides
- [Complete Guide to Hooks in Claude Code](https://www.eesel.ai/blog/hooks-in-claude-code) - Guide détaillé
- [Settings.json Guide](https://www.eesel.ai/blog/settings-json-claude-code) - Configuration

---

## Estimation Totale

| Phase | Priorité | Effort |
|-------|----------|--------|
| Phase 1 : Infrastructure Auto-Update | **CRITIQUE** | 1h30 |
| Phase 2 : Memory Bank Core | HAUTE | 2h |
| Phase 3 : PROJECT_INDEX.json | HAUTE | 1h |
| Phase 4 : Agents Supplémentaires | HAUTE | 1h |
| Phase 5 : Règles Conditionnelles | MOYENNE | 45min |
| Phase 6 : Commandes Workflow | MOYENNE | 30min |
| Phase 7 : Intégration Agents | MOYENNE | 30min |
| Phase 8 : CLAUDE.md Modulaire | BASSE | 1h |
| **TOTAL** | - | **~8h30** |

---

*Document créé le 2026-01-22*
*Vérifié avec la documentation officielle Claude Code*
