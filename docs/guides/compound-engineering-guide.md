# Compound Engineering + Ralph — Guide Complet SEIDO

> **Version:** 1.0
> **Date:** 2026-02-04
> **Sources:** [Ryan Carson Tweet](https://x.com/ryancarson/status/2016520542723924279) | [snarktank/ralph](https://github.com/snarktank/ralph) | [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin) | [Will Larson Analysis](https://lethain.com/everyinc-compound-engineering/)

---

## Table des Matieres

1. [La Methodologie](#1-la-methodologie)
2. [Step 0: Spec (PRD + Ralph)](#2-step-0-spec)
3. [Step 1: Plan](#3-step-1-plan)
4. [Step 2: Work](#4-step-2-work)
5. [Step 3: Review (Quality Gate)](#5-step-3-review)
6. [Step 4: Compound](#6-step-4-compound)
7. [Workflow Chains](#7-workflow-chains)
8. [Story Sizing Guide](#8-story-sizing-guide)
9. [Mode Supervise](#9-mode-supervise)
10. [Mesurer le Succes](#10-mesurer-le-succes)
11. [Tips — Do's and Don'ts](#11-tips)
12. [Exemple Complet](#12-exemple-complet)
13. [Glossaire](#13-glossaire)
14. [FAQ](#14-faq)

---

## 1. La Methodologie

### Pourquoi

Le developpement logiciel classique perd des connaissances a chaque feature :
- Les decisions architecturales restent dans la tete du developpeur
- Les pieges decouverts ne sont pas documentes
- Chaque nouvelle feature recommence de zero

**Compound Engineering** resout cela avec un cycle en 5 phases :

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  SPEC (80%)    PLAN (80%)    WORK (20%)    REVIEW (80%)        │
│  ┌─────┐      ┌─────┐      ┌─────┐       ┌─────────┐         │
│  │ PRD │ ──→  │Plan │ ──→  │Code │ ──→   │Quality  │         │
│  │Ralph│      │ TDD │      │Tests│       │Gate     │         │
│  └─────┘      └─────┘      └─────┘       └────┬────┘         │
│                                                 │              │
│                                                 ▼              │
│                                          ┌──────────┐          │
│                     COMPOUND (100%)      │Compound  │          │
│                     ┌──────────────┐     │Learnings │          │
│                     │ AGENTS.md    │ ◄───│          │          │
│                     │ progress.txt │     └──────────┘          │
│                     │ retrospective│                           │
│                     └──────┬───────┘                           │
│                            │                                   │
│                            ▼                                   │
│                   Next feature is FASTER                       │
│                   because knowledge compounds                  │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Les 3 Composantes

| Composante | Source | Ce qu'elle apporte |
|-----------|--------|-------------------|
| **Ralph** | snarktank/ralph | PRD → prd.json → story-by-story execution → progress.txt |
| **Compound Engineering** | Every/Kieran Klaassen | Cycle Plan/Work/Review/Compound avec ratios 80/20/80/100% |
| **Knowledge Compounding** | Ryan Carson synthesis | Chaque session enrichit AGENTS.md + progress.txt |

### Les ratios 80/20/80/100

- **80% Spec + Plan** : Investir massivement en amont (PRD, user stories, sizing, plan TDD)
- **20% Work** : L'implementation est rapide quand le plan est bon
- **80% Review** : Quality Gate rigoureuse (4 lenses, typecheck, lint, tests)
- **100% Compound** : TOUJOURS capitaliser les learnings — c'est le ROI du systeme

---

## 2. Step 0: Spec

### Le point d'entree : Ralph

Pour toute feature non-triviale, la commande unique est :

```
/ralph
```

Ralph orchestre TOUT — de l'idee initiale jusqu'au code teste. Zero commit.

### Ce qui se passe

1. Ralph demande : "PRD existant ou besoin d'aide pour le creer ?"
2. Si besoin, **Ralph appelle sp-prd** qui pose des questions une par une (brainstorm)
3. sp-prd genere le PRD structure avec :
   - User stories format `US-001`
   - Acceptance criteria verifiables
   - Story sizing (XS/S/M)
   - Dependency ordering (Schema → Backend → UI → Dashboard)
4. PRD sauvegarde dans `tasks/prd-[feature-name].md`

### Conversion automatique

Ralph convertit automatiquement le PRD en taches executables (`prd.json`). Pas de commande separee.

### Fichiers crees par Ralph

```
tasks/
├── prd-[feature-name].md   ← PRD humain (spec complete)
├── prd.json                 ← Taches machine (stories ordonnees)
└── progress.txt             ← Log (initialise vide)
```

### PRD standalone (sans implementation)

Si vous voulez juste creer un PRD sans lancer l'implementation :
```
/prd
```
sp-prd fonctionne aussi en standalone, independamment de Ralph.

---

## 3. Step 1: Plan

### Quand utiliser

Apres avoir le prd.json, avant de coder.

### Commandes

```
/brainstorming    # Explorer les approches possibles
/write-plans      # Ecrire le plan d'implementation detaille
```

### Ce qui se passe

1. **Brainstorming** : Explorer 2-3 approches, choisir la meilleure
2. **Writing Plans** : Plan detaille avec :
   - Fichiers exacts a toucher
   - Code complet (pas "add validation")
   - Tests a ecrire (TDD)
   - Acceptance criteria du PRD integres
   - Risk assessment
   - Story sizing verifie

### PRD-Enhanced Planning

Les plans integrent maintenant les sections du PRD :
- Acceptance criteria verifiables
- Risk assessment avec mitigation
- Story sizing avec la regle Ralph ("2-3 phrases max")
- Dependencies techniques et ordering

### Execution du plan

Deux options :
1. **Dans cette session** : `sp-subagent-driven-development`
2. **Session separee** : `sp-executing-plans`

---

## 4. Step 2: Work

### Principe

Ralph implemente **une story a la fois**, en TDD. Tout est local, zero commit :

```
1. Ralph choisit la premiere story passes: false (sans deps non-resolues)
2. Lit AGENTS.md pour verifier les learnings existants
3. Ecrit le test qui echoue (TDD)
4. Implemente le minimum pour passer le test
5. Verifie les acceptance criteria de la story
6. Marque passes: true dans prd.json
7. Logue dans progress.txt
8. Demande validation avant la story suivante
```

### Regles importantes

- **UNE story a la fois** — pas de multi-tasking
- **TDD d'abord** — test avant implementation
- **ZERO COMMIT** — tout reste local jusqu'a validation finale
- **Consulter AGENTS.md** — avant chaque implementation
- **Sizing respecte** — si trop gros, splitter pendant l'implementation

### Mise a jour prd.json

Apres chaque story completee :

```json
{
  "id": "US-001",
  "passes": true,
  "notes": "Implemented. RLS policy added for team isolation."
}
```

---

## 5. Step 3: Review

### Quand utiliser

Avant CHAQUE commit. Obligatoire.

### Commande

```
/quality-gate
```

Ou automatiquement quand vous tapez `git*`.

### Les 4 Lenses

| Lens | Focus | Veto Power |
|------|-------|-----------|
| **Security** | Auth, RLS, secrets, input validation | OUI |
| **Performance** | N+1, pagination, bundle size | NON (warning) |
| **Patterns** | Repository, Server Components, conventions | OUI (critique) |
| **Tests** | Coverage, edge cases, user archetypes | OUI (critical paths) |

### Checks automatises

```bash
npx tsc --noEmit    # TypeScript — TOUJOURS
npm run lint         # ESLint — TOUJOURS
npm test             # Tests — si logique modifiee
```

### Output

Le quality gate genere un rapport avec :
- 🔴 **BLOCKERS** : A fixer avant commit
- 🟡 **WARNINGS** : Devrait etre fixe
- 🟢 **APPROVED** : Conforme

### Decision

Si blockers : fixer → re-run quality gate → commit
Si warnings only : commit (votre decision)
Si clean : commit directement

---

## 6. Step 4: Compound

### Quand utiliser

- Apres merge/PR d'une feature branch
- Apres fix d'un bug complexe (> 1h debug)
- Quand toutes les stories de prd.json sont `passes: true`
- Quand `sp-finishing-a-development-branch` termine (trigger naturel)

### Commande

```
/compound
```

Ou dire : "feature done", "capitalize learnings", "retrospective"

### Les 4 Phases

#### Phase 1 : Reflection

5 questions sur ce qui a marche/echoue/surpris.

#### Phase 2 : Knowledge Extraction

Review du git diff pour identifier :
- Patterns reusables (utilises 2+ fois)
- Anti-patterns rencontres
- Edge cases decouverts
- Decisions architecturales

#### Phase 3 : Mise a jour Knowledge Base

3 fichiers mis a jour :

| Fichier | Contenu ajoute | Format |
|---------|---------------|--------|
| `AGENTS.md` | Nouveaux learnings codebase | Learning #XXX |
| `tasks/progress.txt` | Log feature completee | Append-only |
| `systemPatterns.md` | Nouveau pattern architectural (si applicable) | Section Markdown |

#### Phase 4 : Retrospective

Cree `docs/learnings/YYYY-MM-DD-[feature]-retrospective.md` avec :
- Ce qui a marche
- Ce qui pourrait etre ameliore
- Nouveaux learnings ajoutes
- Recommandations pour travail similaire

### Output

```
## Compound Report
- AGENTS.md: +3 learnings (total: 12)
- progress.txt: +5 entries
- Retrospective: docs/learnings/2026-02-04-google-maps-retrospective.md
```

---

## 7. Workflow Chains

### Chain 1 : New Feature (via Ralph — recommended)

Ralph orchestre tout, zero commit :

```
/ralph (orchestrateur complet) :
  → demande si PRD existe
  → appelle sp-prd si besoin (brainstorm + generation)
  → decompose en stories (prd.json)
  → implemente story par story (TDD)
  → quality gate finale
  → rapport — tout local, zero commit
  → user tape git* quand valide
  → /compound pour capitaliser
```

**Quand l'utiliser :** Toute feature non-triviale (> 2 fichiers, decision architecturale).

### Chain 2 : Bug Fix

Cycle accelere pour corriger un bug :

```
sp-systematic-debugging             # Diagnostiquer
  → sp-tdd (failing test)          # Ecrire test qui reproduit
    → [fix]                        # Implementer le fix
      → sp-quality-gate            # Verifier avant commit
        → sp-verification          # Confirmer la correction
          → sp-compound            # Capitaliser si bug complexe
```

**Quand l'utiliser :** Tout bug. Le compound est optionnel pour bugs triviaux.

### Chain 3 : Multi-Domain

Pour les features touchant DB + API + UI + Dashboard :

```
/ralph (PRD + stories)
  → sp-dispatching-parallel    # Agents paralleles par domaine
    → [agents use sp-tdd]     # Chaque agent fait TDD
      → sp-quality-gate       # Revue unifiee
        → sp-verification     # Verification complete
          → sp-compound       # Capitaliser multi-domaine
```

**Quand l'utiliser :** Feature touchant 3+ domaines (ex: nouveau workflow intervention).

---

## 8. Story Sizing Guide

### La Regle Ralph

> **"Si tu ne peux pas decrire le changement en 2-3 phrases, c'est trop gros. Splitte."**

### Tailles valides

| Taille | Scope | Fichiers | Lignes | Exemple SEIDO |
|--------|-------|----------|--------|---------------|
| **XS** | Modification unique | 1 | < 50 | Ajouter une colonne migration |
| **S** | Modification ciblee | 2-3 | < 150 | Repository + test pour nouvelle query |
| **M** | Feature atomique | 4-6 | < 300 | Server action + composant UI + test |

### > M = TROP GROS — A splitter

### Exemples bonne taille (SEIDO)

| Story | Taille | Description |
|-------|--------|-------------|
| "Ajouter colonne `address_id` a `properties`" | XS | 1 migration, 1 type regen |
| "Repository method `getByTeamId` pour addresses" | S | 1 repo + 1 test |
| "Composant `AddressInput` avec autocomplete" | S | 1 composant + 1 hook |
| "Server action `updatePropertyAddress`" | M | 1 action + 1 repo method + 1 test |
| "Page gestionnaire avec formulaire adresse" | M | 1 page + 1 composant form + integration |

### Exemples trop gros (a splitter)

| Mauvais | Splitter en |
|---------|------------|
| "Construire le dashboard complet" | Schema, queries, UI shell, filtres, cards |
| "Ajouter Google Maps" | Schema adresses, autocomplete input, map display, geocoding service |
| "Implementer workflow devis" | Statuts DB, formulaire soumission, review gestionnaire, notifications |
| "Systeme de notifications complet" | Templates email, push config, in-app, preferences |

### Ordering des dependances

```
Priority 1: Schema/Database (migrations, RLS, types)
Priority 2: Backend (repositories, services, server actions)
Priority 3: UI (composants, pages, formulaires)
Priority 4: Dashboard/Summary (aggregations, stats, rapports)
```

Les stories de priorite N ne peuvent commencer que si toutes celles de priorite N-1 sont `passes: true`.

---

## 9. Mode Supervise

SEIDO utilise le mode **supervise** — l'utilisateur valide chaque etape.

### Points de decision

| Etape | L'utilisateur valide |
|-------|---------------------|
| PRD | Questions clarifiantes → reponses |
| prd.json | Stories + ordering + sizing → OK ? |
| Plan | Approche technique → approuve ? |
| Chaque story | Acceptance criteria → passes ? |
| Quality Gate | Blockers → fixer / override / cancel ? |
| Commit | Message de commit → OK ? |
| Compound | Learnings extraits → pertinents ? |

### Ce qui est automatique

- Checks TypeScript + lint + tests
- Detection des 4 lenses
- Mise a jour prd.json (passes: true/false)
- Append dans progress.txt

### Ce qui demande validation

- Toute decision architecturale
- Tout BLOCKER dans le quality gate
- Le choix merge/PR/keep/discard (sp-finishing)
- Les learnings ajoutes a AGENTS.md

---

## 10. Mesurer le Succes

### Metriques quantitatives

| Metrique | Comment mesurer | Objectif |
|----------|----------------|----------|
| **Cycle time** | Debut story → passes: true | Diminue au fil du temps |
| **Quality gate catches** | Nombre de BLOCKERS catches pre-commit | > 0 (mieux pre que post) |
| **Learnings/feature** | Nouveaux learnings dans AGENTS.md par feature | 1-3 par feature |
| **Story accuracy** | Stories completees sans re-sizing | > 80% |
| **Compound rate** | Features avec /compound execute | 100% (non-triviales) |

### Metriques qualitatives

| Metrique | Indicateur |
|----------|-----------|
| **Reutilisation** | Learnings references dans des features suivantes |
| **Prevention** | Bugs evites grace aux learnings AGENTS.md |
| **Velocite** | Features similaires implementees plus vite |
| **Confiance** | Moins de bugs en production |

### Comment tracker

- `AGENTS.md` header → "Total Learnings" count
- `tasks/progress.txt` → entries par feature
- `docs/learnings/*.md` → retrospectives accumulees
- `.claude/memory-bank/progress.md` → milestones projet

---

## 11. Tips

### DO's ✅

1. **Lire AGENTS.md AVANT de coder** — les erreurs des autres sont vos raccourcis
2. **Splitter agressivement** — une story XS terminee vaut mieux qu'une M bloquee
3. **Commiter apres chaque story** — pas de mega-commits
4. **Toujours /quality-gate avant commit** — les 5 minutes investies evitent 5 heures de debug
5. **Toujours /compound apres feature** — c'est le ROI du systeme entier
6. **Ecrire pour le prochain agent** — il n'etait pas la pendant votre session
7. **Utiliser les acceptance criteria** — si c'est pas verifiable, c'est pas fini
8. **Respecter l'ordering** — Schema → Backend → UI → Dashboard
9. **Archiver entre features** — prd.json + progress.txt dans tasks/archive/

### DON'Ts ❌

1. **Ne pas skipper le compound** — c'est le seul moment ou les learnings sont frais
2. **Ne pas ignorer les BLOCKERS** — ils existent pour une raison
3. **Ne pas merger sans quality gate** — les regressions coutent cher
4. **Ne pas ecrire de stories vagues** — "works correctly" n'est pas un critere
5. **Ne pas faire de stories > M** — splitter, toujours splitter
6. **Ne pas dupliquer les learnings** — verifier AGENTS.md avant d'ajouter
7. **Ne pas confondre progress.txt et progress.md** — tactique vs strategique
8. **Ne pas multi-tasker les stories** — une a la fois, en TDD
9. **Ne pas oublier les 3 user archetypes** — account, no-account, multi-team

---

## 12. Exemple Complet

### Scenario : Ajouter l'autocomplete d'adresse Google Maps

#### Step 0: Spec

```
User: "create a prd for adding Google Maps address autocomplete to properties"
```

Claude pose 5 questions → user repond → PRD genere :

```
tasks/prd-address-autocomplete.md
```

Contient :
- US-001: Add address table with migration (XS)
- US-002: Create address repository + service (S)
- US-003: Add Google Maps autocomplete component (S)
- US-004: Integrate in property form (M)
- US-005: Display on property detail page (S)

```
User: "convert to prd.json"
```

→ `tasks/prd.json` cree avec 5 stories ordonnees

#### Step 1: Plan

```
User: "plan the implementation"
```

→ Plan detaille dans `docs/plans/2026-02-04-address-autocomplete.md`

#### Step 2: Work

Story US-001 :
1. Ecrire migration → `npx tsc --noEmit` → ✅
2. Regenerer types → `npm run supabase:types` → ✅
3. prd.json : US-001 passes: true

Story US-002 :
1. Test repo → `npm test` → FAIL (TDD)
2. Implementer repo → `npm test` → PASS
3. prd.json : US-002 passes: true

... (meme pattern pour US-003, US-004, US-005)

#### Step 3: Review

```
User: git*
```

Quality Gate :
- Security: getServerAuthContext present ✅
- Performance: pas de N+1 ✅
- Patterns: Repository pattern ✅
- Tests: 3 archetypes ✅

→ APPROVED ✅ → git add . && git commit && git push

#### Step 4: Compound

```
User: /compound
```

Resultat :
- AGENTS.md: +2 learnings
  - #010: Google Maps autocomplete debounce 300ms optimal
  - #011: @vis.gl/react-google-maps plus performant que @react-google-maps/api
- progress.txt: 5 entries (une par story)
- Retrospective: `docs/learnings/2026-02-04-address-autocomplete-retrospective.md`

---

## 13. Glossaire

| Terme | Definition |
|-------|-----------|
| **PRD** | Product Requirements Document — specification structuree d'une feature |
| **prd.json** | Version machine du PRD — stories ordonnees avec acceptance criteria |
| **User Story** | Unite de valeur utilisateur : "En tant que [role], je veux [feature] pour [benefice]" |
| **Acceptance Criteria** | Conditions verifiables pour considerer une story terminee |
| **progress.txt** | Log append-only des learnings de la feature EN COURS (tactique) |
| **progress.md** | Suivi des milestones du projet (strategique) |
| **AGENTS.md** | Base de connaissances cumulatives du codebase, lue par tous les agents |
| **Quality Gate** | Revue pre-commit a 4 perspectives (Security, Perf, Patterns, Tests) |
| **Compound** | Etape de capitalisation des learnings apres completion d'une feature |
| **Retrospective** | Document de retrospective cree par sp-compound |
| **Story Sizing** | XS (1 fichier, < 50L), S (2-3 fichiers, < 150L), M (4-6 fichiers, < 300L) |
| **Ralph Rule** | "2-3 phrases max. Sinon, splitter." |
| **Dependency Ordering** | Schema → Backend → UI → Dashboard |
| **BLOCKER** | Finding quality gate qui doit etre fixe avant commit |
| **WARNING** | Finding quality gate qui devrait etre fixe (decision utilisateur) |
| **4 Lenses** | Security, Performance, Patterns, Tests — les 4 perspectives du quality gate |

---

## 14. FAQ

### Q: Quand utiliser /ralph vs /prd vs /brainstorming ?

| Command | Quand | Output |
|---------|-------|--------|
| **`/ralph`** | **Implementer une feature complete** | PRD + prd.json + code + tests |
| `/prd` | Creer un PRD sans implementer | PRD Markdown seul |
| `/brainstorming` | Explorer une idee/approche sans engager | Decision d'approche |
| `/write-plans` | Plan d'implementation detaille | Plan TDD avec code |

**Pour une feature complete :** `/ralph` suffit — il appelle `/prd` automatiquement si besoin.

### Q: Faut-il toujours passer par /ralph ?

Non. `/ralph` est pour les features non-triviales (> 2 fichiers). Pour un fix simple, utiliser `/brainstorming` ou coder directement. Pour un PRD sans implementation, utiliser `/prd` standalone.

### Q: Que se passe-t-il si une story est trop grosse ?

Splitter. Modifier le prd.json pour diviser la story en sous-stories (US-001a, US-001b). Mettre a jour les dependances.

### Q: Faut-il toujours /quality-gate avant chaque commit ?

Oui pour les commits de code. Non pour les commits de documentation ou de config triviale.

### Q: Que faire si le quality gate trouve un BLOCKER que je ne peux pas fixer maintenant ?

Option "Override" avec raison documentee. Le blocker sera note dans le commit message. Ce n'est PAS recommande mais parfois necessaire (hotfix, deadline).

### Q: Combien de learnings par feature est normal ?

1-3 par feature est normal. 0 veut dire qu'on n'a pas assez reflechi. > 5 veut dire que la feature etait tres complexe (ou qu'on a mal decouvert les patterns existants avant).

### Q: progress.txt vs progress.md — je m'y perds ?

- `tasks/progress.txt` = journal de bord de la feature en cours. Reset entre features.
- `.claude/memory-bank/progress.md` = timeline du projet entier. Jamais reset.

### Q: L'archivage entre features, ca fonctionne comment ?

Quand sp-ralph detecte un nouveau `branchName` different de celui dans prd.json :
1. Copie `tasks/prd.json` et `tasks/progress.txt` dans `tasks/archive/YYYY-MM-DD-[feature]/`
2. Cree un nouveau prd.json + progress.txt pour la nouvelle feature

### Q: Est-ce que /compound est vraiment necessaire ?

OUI. C'est le seul moment ou les learnings sont frais dans votre memoire (et dans le contexte de Claude). Reporter = oublier. Le ROI de tout le systeme vient du compound.

### Q: Je debute sur SEIDO, par ou commencer ?

1. Lire `AGENTS.md` (5 min) — comprendre les pieges connus
2. Lire `.claude/memory-bank/activeContext.md` — comprendre le focus actuel
3. Utiliser `/prd` pour votre premiere feature — le processus vous guide

---

*Derniere mise a jour: 2026-02-04*
