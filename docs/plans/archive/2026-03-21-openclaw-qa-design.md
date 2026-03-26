# OpenClaw QA Bot — Design Document

**Date:** 2026-03-21
**Status:** Implemented
**VPS:** Hostinger KVM 2 (2 vCPU, 8 Go RAM, 100 Go NVMe)

## Objectif

Mettre en place OpenClaw comme bot QA post-deploy qui navigue l'application SEIDO comme un vrai utilisateur, teste tous les scenarios possibles, prend des screenshots en cas d'anomalie, et mappe la decouverte sous forme d'arbre.

## Architecture

### Composants

| Composant | Fichier | Role |
|-----------|---------|------|
| Config OpenClaw | `openclaw/openclaw.json` | Agent sandbox, browser config |
| Skill QA | `openclaw/skills/seido-qa/SKILL.md` | Instructions de test pour l'agent |
| Discovery Tree (JSON) | `docs/qa/discovery-tree.json` | Source de verite des chemins testables |
| Discovery Tree (MD) | `docs/qa/discovery-tree.md` | Vue lisible auto-generee |
| Script lancement | `scripts/openclaw-qa.sh` | Declencheur CLI / webhook |
| Script generation MD | `scripts/generate-discovery-tree.ts` | JSON → Markdown |
| Reports | `docs/qa/reports/` | Rapports de chaque run |
| Screenshots | `docs/qa/screenshots/` | Captures d'anomalies |

### Declenchement

1. **Post-deploy automatique** — webhook Vercel `deployment.succeeded` → `scripts/openclaw-qa.sh`
2. **Manuel** — `./scripts/openclaw-qa.sh [url]`

### Isolation

- Agent `seido-qa` dans un sandbox (`mode: "all"`, `scope: "agent"`)
- Workspace read-write (besoin d'ecrire les rapports, screenshots, et auth state)
- Outils autorises : browser + read + write + exec (pour npm/playwright)
- Browser dans le sandbox (pas sur le host)

### Comptes de test

- Utilise les memes comptes E2E existants (env vars `E2E_*_EMAIL` / `E2E_*_PASSWORD`)
- Pour les invitations uniquement : `demo+invite-{timestamp}@seido-app.com`

## Discovery Tree

- **51 noeuds** : 39 gestionnaire, 7 locataire, 5 prestataire
- **3 modes** : discovery (navigation/lecture), creation (wizard/formulaire), destruction (suppression)
- **2 scenarios cross-role** : cycle intervention complet (8 phases) + annulation (3 phases)
- OpenClaw parcourt en depth-first, met a jour `lastTested` et `status`
- Les routes non-mappees decouvertes sont ajoutees avec `status: "discovered"`

## Rapport

Chaque run produit :
1. `reports/qa-report-{date}-{sha}.md` — toujours
2. Screenshots dans `exploration-report/screenshots/` — si anomalies
3. GitHub Issue (labels: `qa-bot`, `bug`, `auto-generated`) — si anomalies Critical/High
4. Email via Resend — toujours ("all clear" ou alerte anomalies)

## Auto-maintenance

Regle CLAUDE.md : toute modification de route, wizard, formulaire ou flow doit mettre a jour le discovery tree et les tests E2E dans le meme changement.

## Decisions

- **Pas de comptes dedies** : reutilise les comptes E2E existants pour eviter la duplication
- **JSON + MD** : le JSON est la source de verite, le MD est genere pour la lisibilite
- **Sandbox controle** : l'agent peut naviguer, lire, ecrire (rapports) et exec (npm/playwright), mais pas edit/apply_patch ni messaging
- **Preview only** : jamais lance sur la production
- **Actions destructives OK** : sur comptes de test uniquement
- **VPS Hostinger KVM 2** : guide de setup complet dans `docs/guides/openclaw-vps-setup.md`
- **Declenchement** : webhook Vercel (post-deploy preview) + cron horaire + manuel via SSH
