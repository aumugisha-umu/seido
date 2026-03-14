---
name: sp-orchestration
description: Skill routing guide — trigger matrix, orchestration chains, and compound methodology. Loaded when Claude needs to decide which skill to invoke.
---

# Orchestration — Skill Routing Guide

## Skills Auto-Invocation

**Philosophie**: "If a skill exists and 1% chance applies, invoke it."
**Priorite**: Process Skills > Implementation Skills

### Matrice de Declenchement

| Skill | Red Flags | Priorite |
|-------|-----------|----------|
| `sp-brainstorming` | "Je vais creer...", "Nouvelle feature...", "Modifier comportement..." | **CRITIQUE** |
| `sp-systematic-debugging` | "Bug...", "Erreur...", "Test echoue...", "Ca ne marche pas..." | **CRITIQUE** |
| `sp-test-driven-development` | "Je vais implementer...", "Je vais coder..." | **HAUTE** |
| `sp-verification-before-completion` | "C'est fait...", "Pret a commiter...", "Fix applique..." | **CRITIQUE** |
| `sp-writing-plans` | "Tache complexe...", "> 3 fichiers a modifier..." | **HAUTE** |
| `sp-requesting-code-review` | Implementation terminee, avant merge/PR | **HAUTE** |
| `sp-ralph` | "ralph", "nouvelle feature", "let's build", "implement this" | **CRITIQUE** |
| `sp-prd` | "create a prd", "specifier", "plan this feature" (standalone) | **HAUTE** |
| `sp-quality-gate` | "git*", "before commit", "quality check", "review my code" | **CRITIQUE** |
| `sp-compound` | "feature done", "ready to merge", "compound", "retrospective" | **HAUTE** |

### Declencheurs Specifiques SEIDO

| Contexte | Skills a Invoquer |
|----------|-------------------|
| Nouvelle feature a implementer | **`sp-ralph`** (orchestrateur complet, appelle sp-prd si besoin) |
| PRD seul sans implementation | `sp-prd` (standalone) |
| Modification workflow intervention | `sp-brainstorming` + `sp-test-driven-development` |
| Nouvelle migration DB | `sp-verification-before-completion` |
| Bug RLS/permissions | `sp-systematic-debugging` |
| Nouveau composant UI | `sp-brainstorming` |
| Feature multi-domaines | `sp-writing-plans` + `sp-dispatching-parallel-agents` |
| Avant commit / "git*" | `sp-quality-gate` (AVANT le git add/commit) |
| Feature completee / mergee | `sp-compound` (capitaliser les learnings) |
| **Redaction texte site/app** | **`seo-strategist`** (brief) → **`seo-copywriter`** (redaction) → **`seo-reviewer`** (quality gate) |
| **Nouveau contenu marketing** | `seo-strategist` (analyse concurrence + brief SEO) → `seo-copywriter` |
| **Microcopy/notifications/emails** | `seo-copywriter` (redaction) → `seo-reviewer` (persona-fit check) |
| **Audit SEO page existante** | `seo-strategist` (audit technique + E-E-A-T) |
| **Review contenu avant publication** | `seo-reviewer` (Seven Sweeps + score 0-100) |

### Patterns d'Orchestration

**Chain: New Feature (via Ralph — recommended)**
```
sp-ralph (orchestrateur complet, zero commit) :
  → appelle sp-prd si besoin (brainstorm + PRD)
  → decompose en stories (prd.json)
  → implemente story par story (TDD)
  → quality gate finale
  → rapport — user fait git* quand valide
  → sp-compound apres commit
```

**Chain: Bug Fix**
```
sp-systematic-debugging → sp-tdd (failing test) → [fix] →
sp-quality-gate → sp-verification-before-completion → sp-compound
```

**Chain: Multi-Domain**
```
sp-ralph (PRD + stories) →
sp-dispatching-parallel-agents → [agents use sp-tdd] →
sp-quality-gate → sp-verification-before-completion → sp-compound
```

**Chain: SEO Content (site + app)**
```
seo-strategist (analyse concurrence + brief SEO) →
seo-copywriter (redaction FR/EN/NL, persona-adapted) →
seo-reviewer (Seven Sweeps + persona-fit + score 0-100) →
[score >= 75] → Publication | [score < 75] → Retour copywriter
```

---

## Compound Engineering + Ralph Methodology

**SEIDO utilise le cycle Compound Engineering + Ralph pour maximiser qualite et productivite.**

### Le Cycle Complet (via Ralph)

```
/ralph → sp-prd (brainstorm + PRD) → prd.json (stories) →
Implementation story-by-story (TDD) → Quality Gate →
Rapport final (zero commit) → git* quand valide →
/compound → AGENTS.md + progress.txt enrichis
```

### Skills par Phase

| Phase | Skills | Fichiers |
|-------|--------|----------|
| **Spec + Plan** | `sp-ralph` (appelle `sp-prd`) | `tasks/prd-*.md` + `tasks/prd.json` |
| **Work** | `sp-ralph` (TDD interne) | Code + tests |
| **Review** | `sp-ralph` (quality gate interne) | Quality report |
| **Commit** | User tape `git*` → `sp-quality-gate` | Commit + push |
| **Compound** | `sp-compound` | `AGENTS.md` + `tasks/progress.txt` + `docs/learnings/*.md` |

### Declencheurs Supplementaires

| Contexte | Skills a Invoquer |
|----------|-------------------|
| Nouvelle feature a implementer | **`sp-ralph`** (point d'entree unique) |
| PRD seul (sans implementation) | `sp-prd` (standalone) |
| Avant commit / "git*" | `sp-quality-gate` (OBLIGATOIRE) |
| Feature completee | `sp-compound` (OBLIGATOIRE) |
| Toutes stories passes:true | `sp-compound` + `/update-memory` |

### Knowledge Base Files

| Fichier | Purpose | Quand lire |
|---------|---------|------------|
| `AGENTS.md` | Learnings codebase (pitfalls, patterns) | **AVANT implementation** |
| `tasks/progress.txt` | Log learnings feature en cours | Pendant implementation |
| `tasks/prd.json` | User stories + acceptance criteria | Pour choisir prochaine story |

### Distinction progress.txt vs progress.md

| Fichier | Scope | Format | Mis a jour par |
|---------|-------|--------|----------------|
| `.claude/memory-bank/progress.md` | Milestones projet (Phases 1-5+) | Markdown structure | `/update-memory` |
| `tasks/progress.txt` | Log learnings feature EN COURS | Append-only, date/story | `sp-compound` apres chaque story |
