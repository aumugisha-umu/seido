# Guide Complet : Optimisation du Contexte Claude Code
## Memory Bank, Agents Spécialisés et Suivi JSON pour Applications Complexes

---

## Table des Matières

1. [Vue d'Ensemble : Le Problème et les Solutions](#1-vue-densemble)
2. [Architecture des Fichiers CLAUDE.md Distribués](#2-architecture-claude-md-distribués)
3. [Memory Bank : Documentation Hiérarchique Vivante](#3-memory-bank)
4. [PROJECT_INDEX.json : Carte Structurelle de l'Application](#4-project-index-json)
5. [MCP Memory Server : Knowledge Graph Persistant](#5-mcp-memory-server)
6. [Agents Spécialisés par Domaine](#6-agents-spécialisés)
7. [Workflows de Mise à Jour Automatique](#7-workflows-mise-à-jour)
8. [Implémentation Complète : Template Prêt à l'Emploi](#8-implémentation-complète)
9. [Références et Ressources](#9-références)

---

## 1. Vue d'Ensemble

### Le Problème Central

Claude Code est **stateless** : chaque nouvelle session repart de zéro. Pour une application complexe, cela signifie que :

- Claude peut **halluciner** des noms de tables, de fichiers, ou de fonctions qui n'existent pas
- Il peut proposer des structures qui **contredisent** l'architecture existante
- Les décisions prises dans une session sont **perdues** dans la suivante
- Le contexte se remplit vite et devient **pollué**

### Les 4 Piliers de la Solution

```
┌─────────────────────────────────────────────────────────────────┐
│                    OPTIMISATION DU CONTEXTE                      │
├─────────────────┬─────────────────┬─────────────────┬───────────┤
│ CLAUDE.md       │ Memory Bank     │ PROJECT_INDEX   │ Agents    │
│ Distribués      │ (Markdown)      │ (JSON)          │ Spécialisés│
├─────────────────┼─────────────────┼─────────────────┼───────────┤
│ Config par      │ Documentation   │ Carte technique │ Isolation │
│ dossier/domaine │ vivante du      │ parsable de     │ du contexte│
│                 │ projet          │ l'application   │ par tâche │
└─────────────────┴─────────────────┴─────────────────┴───────────┘
```

---

## 2. Architecture CLAUDE.md Distribués

### Principe : Un CLAUDE.md par Domaine

Au lieu d'un seul fichier monolithique, distribuez les instructions :

```
mon-app/
├── CLAUDE.md                      # Config globale (projet entier)
├── .claude/
│   ├── rules/                     # Règles conditionnelles
│   │   ├── api.md                 # Règles pour src/api/**
│   │   ├── database.md            # Règles pour src/db/**
│   │   └── frontend.md            # Règles pour src/components/**
│   └── CLAUDE.md                  # Config .claude (alternative)
├── src/
│   ├── api/
│   │   └── CLAUDE.md              # Spécifique aux APIs
│   ├── database/
│   │   └── CLAUDE.md              # Schéma DB, conventions SQL
│   ├── components/
│   │   └── CLAUDE.md              # Design system, conventions UI
│   └── services/
│       └── CLAUDE.md              # Logique métier, patterns
└── memory-bank/                   # Documentation vivante
    └── ...
```

### CLAUDE.md Root (Projet)

```markdown
# [Nom du Projet]

## Vue d'Ensemble
Application [type] pour [objectif].
Stack: Next.js 14, TypeScript, Prisma, PostgreSQL, TailwindCSS

## Structure du Projet
- `/src/api` - Routes API et handlers
- `/src/components` - Composants React UI
- `/src/database` - Schéma Prisma et migrations
- `/src/services` - Logique métier
- `/memory-bank` - Documentation vivante du projet

## Commandes Essentielles
- `pnpm dev` - Serveur de développement
- `pnpm build` - Build production
- `pnpm test` - Lancer les tests
- `pnpm db:migrate` - Appliquer les migrations
- `pnpm db:generate` - Générer le client Prisma

## Imports Obligatoires
@memory-bank/projectbrief.md
@memory-bank/systemPatterns.md
@memory-bank/activeContext.md

## Règle Critique
AVANT toute modification :
1. Lis le CLAUDE.md du dossier concerné
2. Consulte memory-bank/techContext.md pour le schéma DB
3. Vérifie la cohérence avec systemPatterns.md
4. METS À JOUR les fichiers memory-bank après chaque changement significatif
```

### CLAUDE.md pour le Dossier Database

```markdown
# Database - Instructions Spécifiques

## Schéma Actuel
@../memory-bank/techContext.md#database-schema

## Tables Principales
| Table | Description | Relations |
|-------|-------------|-----------|
| users | Utilisateurs | → profiles, orders |
| orders | Commandes | → users, order_items |
| products | Produits | → categories, order_items |

## Conventions Prisma
- Noms de tables: PascalCase singulier (User, Order)
- Noms de champs: camelCase (createdAt, userId)
- Relations: Toujours définir les deux côtés
- Soft delete: Utiliser `deletedAt` nullable

## Avant Toute Migration
1. Vérifier que le schéma dans memory-bank/techContext.md est à jour
2. Créer la migration : `pnpm db:migrate:create <nom>`
3. Appliquer : `pnpm db:migrate`
4. Mettre à jour memory-bank/techContext.md avec les changements

## ⚠️ NE JAMAIS
- Supprimer une colonne sans migration de données
- Changer un type sans vérifier les dépendances
- Modifier directement les migrations existantes
```

### Règles Conditionnelles (.claude/rules/)

Fichier `.claude/rules/api.md` :

```yaml
---
paths:
  - "src/api/**/*.ts"
  - "src/routes/**/*.ts"
---

# Règles API

## Structure d'un Endpoint
Chaque endpoint DOIT :
1. Valider les inputs avec Zod
2. Utiliser le format de réponse standard
3. Inclure la gestion d'erreurs
4. Avoir un commentaire OpenAPI

## Format de Réponse Standard
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

## Pattern de Validation
```typescript
const schema = z.object({
  // Définir le schéma
});

export async function handler(req: Request) {
  const result = schema.safeParse(await req.json());
  if (!result.success) {
    return Response.json({ 
      success: false, 
      error: { code: 'VALIDATION_ERROR', message: result.error.message }
    }, { status: 400 });
  }
  // Logique...
}
```
```

---

## 3. Memory Bank : Documentation Hiérarchique Vivante

### Concept

Le Memory Bank est un système de **6 fichiers Markdown interdépendants** qui forment la mémoire persistante du projet :

```
┌─────────────────────────────────────────────┐
│              projectbrief.md                │
│         (Vision et objectifs core)          │
└──────────┬──────────────┬───────────────────┘
           │              │
           ▼              ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ productContext.md│ │ systemPatterns.md│ │  techContext.md  │
│ (Fonctionnalités)│ │ (Architecture)   │ │ (Stack & Schema) │
└────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │ activeContext.md │
                    │ (Focus actuel)   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   progress.md    │
                    │ (Historique)     │
                    └──────────────────┘
```

### Structure des Fichiers Memory Bank

#### `memory-bank/projectbrief.md`

```markdown
# Project Brief: [Nom du Projet]

## Vision
[Description en 2-3 phrases de ce que fait le projet]

## Objectifs Principaux
1. [Objectif 1]
2. [Objectif 2]
3. [Objectif 3]

## Public Cible
- [Persona 1]
- [Persona 2]

## Contraintes
- Budget: [X]
- Timeline: [Y]
- Technique: [Z]

## Critères de Succès
- [ ] [Métrique 1]
- [ ] [Métrique 2]

---
*Dernière mise à jour: [Date]*
*Mis à jour par: [Claude/Humain]*
```

#### `memory-bank/productContext.md`

```markdown
# Product Context

## Fonctionnalités Implémentées

### Module Authentification ✅
- Login/Logout avec JWT
- OAuth Google/GitHub
- Récupération de mot de passe
- 2FA (en cours)

### Module Utilisateurs ✅
- CRUD profil utilisateur
- Upload d'avatar
- Préférences de notification

### Module [Autre] 🚧
- [Fonctionnalité en cours]

## Fonctionnalités Prévues
- [ ] [Feature 1] - Priorité: Haute
- [ ] [Feature 2] - Priorité: Moyenne

## Décisions Produit

### [Date] - [Décision]
**Contexte:** [Pourquoi cette décision]
**Décision:** [Ce qui a été décidé]
**Conséquences:** [Impact sur le code]

---
*Dernière mise à jour: [Date]*
```

#### `memory-bank/systemPatterns.md` ⭐ (Crucial)

```markdown
# System Patterns & Architecture

## Architecture Globale

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend   │────▶│  Database   │
│  (Next.js)  │     │ (API Routes)│     │ (PostgreSQL)│
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│    Redis    │     │   S3/R2     │
│   (Cache)   │     │  (Storage)  │
└─────────────┘     └─────────────┘
```

## Patterns de Code

### Pattern: Repository
```typescript
// Utiliser pour tout accès DB
class UserRepository {
  async findById(id: string): Promise<User | null>
  async create(data: CreateUserDTO): Promise<User>
  async update(id: string, data: UpdateUserDTO): Promise<User>
}
```

### Pattern: Service Layer
```typescript
// Logique métier dans les services
class AuthService {
  constructor(private userRepo: UserRepository) {}
  async login(email: string, password: string): Promise<AuthResult>
}
```

### Pattern: Error Handling
```typescript
// Erreurs custom avec codes
class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
  }
}
```

## Conventions de Nommage

| Élément | Convention | Exemple |
|---------|------------|---------|
| Composants | PascalCase | `UserProfile.tsx` |
| Hooks | camelCase + use | `useAuth.ts` |
| Utils | camelCase | `formatDate.ts` |
| Types | PascalCase | `User`, `OrderDTO` |
| API routes | kebab-case | `/api/user-profile` |

## Structure des Dossiers

```
src/
├── components/           # Composants UI réutilisables
│   ├── ui/              # Composants design system
│   └── features/        # Composants par feature
├── hooks/               # Custom React hooks
├── services/            # Logique métier
├── repositories/        # Accès données
├── types/               # Types TypeScript
├── utils/               # Fonctions utilitaires
└── api/                 # Routes API (Next.js)
```

---
*Dernière mise à jour: [Date]*
```

#### `memory-bank/techContext.md` ⭐⭐ (Très Crucial)

```markdown
# Technical Context

## Stack Technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Frontend | Next.js | 14.2.x |
| Language | TypeScript | 5.x |
| Styling | TailwindCSS | 3.4.x |
| Database | PostgreSQL | 16 |
| ORM | Prisma | 5.x |
| Auth | NextAuth.js | 5.x |
| State | Zustand | 4.x |
| Testing | Vitest | 1.x |

## Schéma de Base de Données

### Table: User
```sql
CREATE TABLE "User" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email"         VARCHAR(255) UNIQUE NOT NULL,
  "passwordHash"  VARCHAR(255),
  "name"          VARCHAR(100),
  "avatarUrl"     TEXT,
  "role"          VARCHAR(20) DEFAULT 'user',
  "emailVerified" TIMESTAMP,
  "createdAt"     TIMESTAMP DEFAULT NOW(),
  "updatedAt"     TIMESTAMP DEFAULT NOW(),
  "deletedAt"     TIMESTAMP
);
```

### Table: Order
```sql
CREATE TABLE "Order" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"     UUID REFERENCES "User"("id"),
  "status"     VARCHAR(20) DEFAULT 'pending',
  "total"      DECIMAL(10,2) NOT NULL,
  "createdAt"  TIMESTAMP DEFAULT NOW(),
  "updatedAt"  TIMESTAMP DEFAULT NOW()
);
```

### Relations
```
User 1──* Order (userId)
Order 1──* OrderItem (orderId)
Product 1──* OrderItem (productId)
Product *──1 Category (categoryId)
```

### Index
```sql
CREATE INDEX idx_user_email ON "User"("email");
CREATE INDEX idx_order_user ON "Order"("userId");
CREATE INDEX idx_order_status ON "Order"("status");
```

## Variables d'Environnement

| Variable | Description | Requis |
|----------|-------------|--------|
| DATABASE_URL | URL PostgreSQL | ✅ |
| NEXTAUTH_SECRET | Secret NextAuth | ✅ |
| NEXTAUTH_URL | URL de l'app | ✅ |
| GOOGLE_CLIENT_ID | OAuth Google | ❌ |
| S3_BUCKET | Bucket storage | ❌ |

## Dépendances Critiques

```json
{
  "dependencies": {
    "next": "14.2.x",
    "react": "18.x",
    "@prisma/client": "5.x",
    "next-auth": "5.x",
    "zod": "3.x"
  }
}
```

---
*Dernière mise à jour: [Date]*
*Hash du schéma Prisma: [abc123]*
```

#### `memory-bank/activeContext.md`

```markdown
# Active Context

## Focus Actuel
**Feature en cours:** [Nom de la feature]
**Branch:** `feature/xxx`
**Assigné à:** [Nom/Claude]

## Ce qui a été fait cette session
- [x] Créé le schéma pour XYZ
- [x] Implémenté le service ABC
- [ ] En cours: Tests unitaires

## Décisions prises
1. **[Décision]** - Raison: [Pourquoi]

## Fichiers modifiés
- `src/services/auth.service.ts` - Ajout de la logique 2FA
- `prisma/schema.prisma` - Nouvelle table TwoFactorAuth

## Problèmes rencontrés
- ⚠️ [Problème] - Solution: [Comment résolu]

## Prochaines étapes
1. [ ] [Tâche 1]
2. [ ] [Tâche 2]

## Notes pour la prochaine session
- Penser à [X]
- Vérifier [Y]

---
*Dernière mise à jour: [Date + Heure]*
```

#### `memory-bank/progress.md`

```markdown
# Progress Log

## Sprint/Semaine Actuel(le)

### [Date] - [Titre de la session]
**Durée:** ~2h
**Ce qui a été fait:**
- Implémenté feature X
- Corrigé bug Y
- Refactoré service Z

**Fichiers clés modifiés:**
- `src/services/auth.ts`
- `prisma/schema.prisma`

**Commits:**
- `abc1234` - feat: add 2FA support
- `def5678` - fix: resolve login race condition

---

### [Date précédente] - [Titre]
...

## Historique des Décisions Techniques

| Date | Décision | Raison | Impact |
|------|----------|--------|--------|
| 2024-01-15 | Prisma over TypeORM | Meilleur DX, types | Migration schema |
| 2024-01-20 | Zustand over Redux | Simplicité | Refacto state |

## Métriques

| Métrique | Valeur | Tendance |
|----------|--------|----------|
| Tests coverage | 78% | ↑ |
| Build time | 45s | ↓ |
| Bundle size | 125KB | → |

---
*Dernière mise à jour: [Date]*
```

---

## 4. PROJECT_INDEX.json : Carte Structurelle

### Concept

Un fichier JSON qui contient une **carte parsable** de l'application : fichiers, fonctions, classes, relations.

### Structure du PROJECT_INDEX.json

```json
{
  "version": "1.0.0",
  "generatedAt": "2024-01-22T10:30:00Z",
  "project": {
    "name": "mon-app",
    "rootPath": "/path/to/project",
    "language": "typescript",
    "framework": "nextjs"
  },
  "files": [
    {
      "path": "src/services/auth.service.ts",
      "type": "service",
      "exports": ["AuthService", "loginUser", "logoutUser"],
      "imports": ["@/repositories/user.repo", "@/lib/jwt"],
      "lastModified": "2024-01-20T15:00:00Z",
      "linesOfCode": 150,
      "complexity": "medium"
    },
    {
      "path": "src/repositories/user.repo.ts",
      "type": "repository",
      "exports": ["UserRepository"],
      "imports": ["@prisma/client"],
      "lastModified": "2024-01-18T10:00:00Z",
      "linesOfCode": 80
    }
  ],
  "functions": [
    {
      "name": "loginUser",
      "file": "src/services/auth.service.ts",
      "startLine": 25,
      "endLine": 60,
      "parameters": [
        {"name": "email", "type": "string"},
        {"name": "password", "type": "string"}
      ],
      "returnType": "Promise<AuthResult>",
      "description": "Authentifie un utilisateur avec email/password",
      "dependencies": ["UserRepository.findByEmail", "bcrypt.compare", "jwt.sign"]
    }
  ],
  "classes": [
    {
      "name": "AuthService",
      "file": "src/services/auth.service.ts",
      "methods": ["login", "logout", "refreshToken", "validateSession"],
      "dependencies": ["UserRepository", "TokenRepository"]
    }
  ],
  "database": {
    "orm": "prisma",
    "tables": [
      {
        "name": "User",
        "columns": [
          {"name": "id", "type": "uuid", "primaryKey": true},
          {"name": "email", "type": "string", "unique": true},
          {"name": "passwordHash", "type": "string", "nullable": true},
          {"name": "name", "type": "string", "nullable": true},
          {"name": "role", "type": "enum", "values": ["user", "admin"]}
        ],
        "relations": [
          {"type": "hasMany", "target": "Order", "foreignKey": "userId"}
        ]
      },
      {
        "name": "Order",
        "columns": [
          {"name": "id", "type": "uuid", "primaryKey": true},
          {"name": "userId", "type": "uuid", "foreignKey": "User.id"},
          {"name": "status", "type": "enum", "values": ["pending", "paid", "shipped"]},
          {"name": "total", "type": "decimal"}
        ]
      }
    ],
    "indexes": [
      {"table": "User", "columns": ["email"], "unique": true},
      {"table": "Order", "columns": ["userId", "status"]}
    ]
  },
  "api": {
    "routes": [
      {
        "path": "/api/auth/login",
        "method": "POST",
        "handler": "src/app/api/auth/login/route.ts",
        "requestSchema": "LoginRequestDTO",
        "responseSchema": "AuthResponseDTO"
      },
      {
        "path": "/api/users/[id]",
        "method": "GET",
        "handler": "src/app/api/users/[id]/route.ts",
        "auth": "required"
      }
    ]
  },
  "dependencies": {
    "graph": [
      {"from": "AuthService", "to": "UserRepository", "type": "uses"},
      {"from": "AuthService", "to": "TokenRepository", "type": "uses"},
      {"from": "UserController", "to": "AuthService", "type": "uses"}
    ]
  }
}
```

### Commande pour Générer/Mettre à Jour

Créez `.claude/commands/update-index.md` :

```markdown
# Update Project Index

Analyse le projet et mets à jour PROJECT_INDEX.json :

1. **Scanner les fichiers**
   - Parcours `src/` récursivement
   - Identifie les types (service, repository, component, util)
   - Extrait les exports et imports

2. **Analyser les fonctions**
   - Extrait les signatures
   - Identifie les dépendances
   - Calcule la complexité

3. **Parser le schéma DB**
   - Lis `prisma/schema.prisma`
   - Extrait tables, colonnes, relations
   - Identifie les index

4. **Mapper les routes API**
   - Parcours `src/app/api/`
   - Extrait les méthodes HTTP
   - Identifie les schémas de validation

5. **Construire le graphe de dépendances**
   - Analyse les imports
   - Construit les relations

6. **Écrire PROJECT_INDEX.json**
   - Met à jour le timestamp
   - Incrémente la version si changements majeurs

**Output:** PROJECT_INDEX.json mis à jour
```

### Référencer dans CLAUDE.md

```markdown
## Index du Projet
@PROJECT_INDEX.json

Avant de modifier un fichier, consulte PROJECT_INDEX.json pour :
- Comprendre les dépendances
- Vérifier le schéma DB actuel
- Identifier les routes API existantes
```

---

## 5. MCP Memory Server : Knowledge Graph Persistant

### Concept

Un serveur MCP qui maintient un **graphe de connaissances** dans un fichier JSON, persistant entre les sessions.

### Configuration

`.mcp.json` :

```json
{
  "mcpServers": {
    "memory": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {
        "MEMORY_FILE_PATH": "./.claude/memory.json"
      }
    }
  }
}
```

### Structure du memory.json

```json
{
  "entities": [
    {
      "name": "AuthService",
      "entityType": "service",
      "observations": [
        "Gère l'authentification JWT",
        "Supporte OAuth Google et GitHub",
        "Implémente le refresh token automatique",
        "Ajouté: 2FA support le 2024-01-20"
      ]
    },
    {
      "name": "UserTable",
      "entityType": "database_table",
      "observations": [
        "Table principale des utilisateurs",
        "Contient email unique, passwordHash nullable pour OAuth",
        "Soft delete via deletedAt",
        "Index sur email pour les lookups rapides"
      ]
    },
    {
      "name": "ProjectPreferences",
      "entityType": "preferences",
      "observations": [
        "Utiliser async/await plutôt que .then()",
        "Toujours valider avec Zod côté API",
        "Préférer les server components Next.js",
        "Tests avec Vitest, pas Jest"
      ]
    },
    {
      "name": "KnownIssues",
      "entityType": "issues",
      "observations": [
        "Bug: Race condition sur le refresh token en dev",
        "Workaround: Ajouter un délai de 100ms",
        "TODO: Implémenter le rate limiting sur /api/auth"
      ]
    }
  ],
  "relations": [
    {"from": "AuthService", "to": "UserTable", "relationType": "reads_from"},
    {"from": "AuthService", "to": "TokenTable", "relationType": "writes_to"},
    {"from": "OrderService", "to": "UserTable", "relationType": "references"}
  ]
}
```

### Utilisation

```
Toi: "Remember that the AuthService now supports 2FA with TOTP"
Claude: *ajoute l'observation à l'entité AuthService*

Toi: "Fix the login bug"
Claude: *recherche automatiquement dans memory.json*
"Based on my memory, AuthService handles JWT auth and there's a known race condition issue..."
```

---

## 6. Agents Spécialisés par Domaine

### Pourquoi des Agents Spécialisés ?

Chaque agent a :
- Son **propre context window** (ne pollue pas la conversation principale)
- Des **outils restreints** (sécurité)
- Un **system prompt focalisé** (meilleure performance)

### Agent: Database Analyzer

`.claude/agents/database-analyzer.md` :

```yaml
---
name: database-analyzer
description: Analyse le schéma de base de données et vérifie la cohérence. Utiliser avant toute modification de schéma.
tools:
  - Read
  - Grep
  - Glob
---

# Database Analyzer Agent

## Ta Mission
Tu es un expert en bases de données. Tu analyses les schémas et vérifies la cohérence.

## Avant Chaque Analyse
1. Lis `prisma/schema.prisma`
2. Lis `memory-bank/techContext.md#database`
3. Compare les deux pour détecter les incohérences

## Ce que tu dois vérifier
- [ ] Toutes les relations sont bidirectionnelles
- [ ] Les index couvrent les queries fréquentes
- [ ] Les contraintes d'intégrité sont en place
- [ ] Les types sont appropriés
- [ ] Pas de données sensibles non chiffrées

## Output
Retourne un rapport structuré :
```markdown
## Analyse du Schéma

### État actuel
- X tables
- Y relations
- Z index

### Problèmes détectés
1. [Problème] - Sévérité: [Haute/Moyenne/Basse]

### Recommandations
1. [Recommandation]

### Cohérence avec memory-bank
- ✅ Synchronisé / ⚠️ Désynchronisé
```
```

### Agent: Code Reviewer

`.claude/agents/code-reviewer.md` :

```yaml
---
name: code-reviewer
description: Review le code modifié pour qualité, patterns, et cohérence avec l'architecture.
tools:
  - Read
  - Grep
  - Bash(git diff:*)
---

# Code Reviewer Agent

## Ta Mission
Tu reviews le code pour assurer la qualité et la cohérence avec l'architecture.

## Checklist de Review

### TypeScript/Code Quality
- [ ] Types explicites (pas de `any`)
- [ ] Gestion d'erreurs appropriée
- [ ] Pas de code dupliqué
- [ ] Fonctions < 50 lignes

### Patterns du Projet
Lis `memory-bank/systemPatterns.md` et vérifie :
- [ ] Pattern Repository respecté pour l'accès DB
- [ ] Pattern Service pour la logique métier
- [ ] Format de réponse API standard
- [ ] Validation Zod sur les inputs

### Sécurité
- [ ] Pas de secrets hardcodés
- [ ] Inputs validés/sanitizés
- [ ] Authentification vérifiée sur les routes protégées

## Output
```markdown
## Code Review Report

### Fichiers reviewés
- `path/to/file.ts`

### Score: [A/B/C/D]

### Issues
| Sévérité | Fichier | Ligne | Issue |
|----------|---------|-------|-------|
| 🔴 High  | ... | ... | ... |

### Suggestions d'amélioration
1. [Suggestion]
```
```

### Agent: Memory Bank Synchronizer

`.claude/agents/memory-synchronizer.md` :

```yaml
---
name: memory-synchronizer
description: Synchronise la documentation memory-bank avec l'état réel du code.
tools:
  - Read
  - Write
  - Grep
  - Glob
---

# Memory Bank Synchronizer

## Ta Mission
Maintenir la synchronisation entre le code et la documentation memory-bank.

## Workflow

### 1. Audit
Compare chaque fichier memory-bank avec la réalité :
- `techContext.md` vs `prisma/schema.prisma`
- `systemPatterns.md` vs code dans `src/`
- `productContext.md` vs features implémentées

### 2. Détection des Drifts
Identifie les différences :
- Nouvelles tables/colonnes non documentées
- Patterns utilisés mais non documentés
- Features implémentées mais non listées

### 3. Mise à Jour
Pour chaque drift détecté :
1. Propose la correction
2. Après approbation, met à jour le fichier
3. Ajoute un timestamp de mise à jour

### 4. Rapport
```markdown
## Memory Bank Sync Report

### Fichiers analysés
- [x] techContext.md
- [x] systemPatterns.md

### Drifts détectés
| Fichier | Section | État actuel | Réalité |
|---------|---------|-------------|---------|
| ... | ... | ... | ... |

### Actions effectuées
- Updated techContext.md: added new table X
```
```

---

## 7. Workflows de Mise à Jour Automatique

### Commande: `/workflow:update-memory`

`.claude/commands/workflow/update-memory.md` :

```markdown
# Mise à Jour du Memory Bank

Après chaque session de travail significative, exécute ce workflow :

## Étape 1: Identifier les changements
```bash
git diff --name-only HEAD~5
```

## Étape 2: Catégoriser les changements

Pour chaque fichier modifié, détermine :
- Schema DB changé → Mettre à jour `techContext.md`
- Nouveau pattern → Mettre à jour `systemPatterns.md`
- Nouvelle feature → Mettre à jour `productContext.md`
- Travail en cours → Mettre à jour `activeContext.md`
- Session terminée → Mettre à jour `progress.md`

## Étape 3: Mettre à jour les fichiers

### techContext.md
Si schema Prisma modifié :
1. Régénère la section Database Schema
2. Met à jour les relations
3. Met à jour le hash du schéma

### systemPatterns.md
Si nouveau pattern détecté :
1. Documente le pattern avec exemple
2. Ajoute à la section appropriée

### activeContext.md
1. Liste les fichiers modifiés
2. Documente les décisions prises
3. Liste les prochaines étapes

### progress.md
1. Ajoute une entrée pour cette session
2. Liste les commits
3. Met à jour les métriques

## Étape 4: Validation
Vérifie que tous les fichiers memory-bank sont cohérents entre eux.

## Étape 5: Commit
```bash
git add memory-bank/
git commit -m "docs: update memory bank after [description]"
```
```

### Hook: Post-Edit Auto-Update

`.claude/settings.json` :

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/scripts/check-memory-drift.js \"$FILE\""
          }
        ]
      }
    ]
  }
}
```

Script `.claude/scripts/check-memory-drift.js` :

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const modifiedFile = process.argv[2];

// Vérifie si c'est un fichier critique
const criticalPatterns = [
  'prisma/schema.prisma',
  'src/services/',
  'src/repositories/',
  'src/app/api/'
];

const isCritical = criticalPatterns.some(p => modifiedFile.includes(p));

if (isCritical) {
  console.log(`⚠️ Fichier critique modifié: ${modifiedFile}`);
  console.log('💡 Pense à exécuter /workflow:update-memory');
}
```

---

## 8. Implémentation Complète : Template Prêt à l'Emploi

### Structure Finale

```
mon-projet/
├── CLAUDE.md
├── PROJECT_INDEX.json
├── .claude/
│   ├── settings.json
│   ├── memory.json
│   ├── rules/
│   │   ├── api.md
│   │   ├── database.md
│   │   └── components.md
│   ├── agents/
│   │   ├── database-analyzer.md
│   │   ├── code-reviewer.md
│   │   └── memory-synchronizer.md
│   ├── commands/
│   │   ├── update-index.md
│   │   └── workflow/
│   │       ├── understand.md
│   │       ├── plan.md
│   │       ├── execute.md
│   │       └── update-memory.md
│   └── scripts/
│       └── check-memory-drift.js
├── memory-bank/
│   ├── projectbrief.md
│   ├── productContext.md
│   ├── systemPatterns.md
│   ├── techContext.md
│   ├── activeContext.md
│   └── progress.md
├── .mcp.json
└── src/
    ├── api/
    │   └── CLAUDE.md
    ├── database/
    │   └── CLAUDE.md
    ├── components/
    │   └── CLAUDE.md
    └── services/
        └── CLAUDE.md
```

### CLAUDE.md Root Complet

```markdown
# [Nom du Projet]

## Vue d'Ensemble
[Description courte]

## Stack
- Frontend: Next.js 14, TypeScript, TailwindCSS
- Backend: API Routes Next.js
- Database: PostgreSQL + Prisma
- Auth: NextAuth.js

## Commandes
- `pnpm dev` - Développement
- `pnpm build` - Build
- `pnpm test` - Tests
- `pnpm db:migrate` - Migrations

## 📚 Documentation du Projet
@memory-bank/projectbrief.md
@memory-bank/systemPatterns.md
@memory-bank/techContext.md

## 🗂️ Index Technique
@PROJECT_INDEX.json

## ⚠️ Règles Critiques

### Avant TOUTE modification
1. Lis le CLAUDE.md du dossier concerné
2. Consulte `memory-bank/techContext.md` pour le schéma DB
3. Vérifie la cohérence avec `systemPatterns.md`

### Après TOUTE modification significative
1. Exécute `/workflow:update-memory`
2. Mets à jour `PROJECT_INDEX.json` si structure changée

### Pour les modifications DB
1. Utilise l'agent `database-analyzer` AVANT de modifier
2. Crée une migration Prisma
3. Mets à jour `memory-bank/techContext.md`

### Pour le code review
1. Utilise l'agent `code-reviewer` après implémentation
2. Corrige les issues détectées
3. Documente les patterns utilisés

## 🔄 Workflow Standard

```
/workflow:understand → Comprendre le contexte
/workflow:plan      → Planifier l'implémentation
/workflow:execute   → Implémenter
/workflow:update-memory → Mettre à jour la doc
```
```

### .mcp.json Complet

```json
{
  "mcpServers": {
    "memory": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {
        "MEMORY_FILE_PATH": "./.claude/memory.json"
      }
    },
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {
        "ALLOWED_DIRECTORIES": "./src,./memory-bank,./prisma"
      }
    }
  }
}
```

### settings.json Complet

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Write",
      "Edit",
      "Bash(pnpm:*)",
      "Bash(npx:*)",
      "Bash(git:*)"
    ],
    "deny": [
      "Bash(rm -rf:*)",
      "Write(*.env*)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/scripts/check-memory-drift.js \"$FILE\""
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Vérifie si memory-bank doit être mis à jour après cette session. Si oui, rappelle à l'utilisateur d'exécuter /workflow:update-memory"
          }
        ]
      }
    ]
  }
}
```

---

## 9. Références et Ressources

### Repositories Essentiels

| Repo | Description |
|------|-------------|
| [claude-code-memory-bank](https://github.com/hudrazine/claude-code-memory-bank) | Système Memory Bank original |
| [claude-code-project-index](https://github.com/ericbuess/claude-code-project-index) | PROJECT_INDEX.json automatisé |
| [claude-cognitive](https://github.com/GMaN1911/claude-cognitive) | Working memory multi-instance |
| [my-claude-code-setup](https://github.com/centminmod/my-claude-code-setup) | Template complet |
| [claude-code-riper-5](https://github.com/tony/claude-code-riper-5) | Workflow RIPER structuré |

### Documentation Officielle

- [Claude Code Memory Management](https://code.claude.com/docs/en/memory)
- [Claude Code Subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code Hooks](https://docs.claude.com/en/docs/claude-code/hooks)
- [Claude Code Skills](https://code.claude.com/docs/en/skills)

### Commandes pour Démarrer

```bash
# 1. Créer la structure
mkdir -p memory-bank .claude/{agents,commands/workflow,rules,scripts}

# 2. Initialiser les fichiers memory-bank
touch memory-bank/{projectbrief,productContext,systemPatterns,techContext,activeContext,progress}.md

# 3. Initialiser dans Claude Code
> /init-memory-bank   # Si tu as installé le workflow
# OU
> "Lis ce guide et aide-moi à créer les fichiers memory-bank pour mon projet"
```

---

## Checklist de Configuration

### Setup Initial
- [ ] Créer la structure de dossiers
- [ ] Créer CLAUDE.md root
- [ ] Créer les 6 fichiers memory-bank
- [ ] Configurer .mcp.json pour le memory server
- [ ] Configurer settings.json avec les hooks

### Configuration des Agents
- [ ] Créer database-analyzer.md
- [ ] Créer code-reviewer.md
- [ ] Créer memory-synchronizer.md

### Configuration des Workflows
- [ ] Créer /workflow:understand
- [ ] Créer /workflow:plan
- [ ] Créer /workflow:execute
- [ ] Créer /workflow:update-memory

### Fichiers CLAUDE.md Distribués
- [ ] CLAUDE.md pour /src/api
- [ ] CLAUDE.md pour /src/database
- [ ] CLAUDE.md pour /src/components
- [ ] CLAUDE.md pour /src/services

### Maintenance Continue
- [ ] Mettre à jour memory-bank après chaque session
- [ ] Régénérer PROJECT_INDEX.json après changements structurels
- [ ] Review périodique de la synchronisation

---

*Ce guide est basé sur les meilleures pratiques de la communauté Claude Code et les repositories open-source mentionnés. Adapte-le à ton projet spécifique.*
