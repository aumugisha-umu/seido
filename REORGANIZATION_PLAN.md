# 📂 Plan de Réorganisation - Structure Racine SEIDO

**Date:** 2025-10-20
**Objectif:** Passer de 110 items à ~40 items à la racine (-70 items, -64%)

---

## 📊 État Actuel

- **Total items racine**: 110
- **Fichiers logs/temp**: 22
- **Fichiers markdown (docs)**: 21
- **Scripts**: 7+ (ps1, sh, bat, js)
- **Dossiers**: ~25

---

## 🎯 Structure Cible

```
seido-app/
├── 📁 .logs/               # NOUVEAU - Logs archivés (gitignored)
├── 📁 scripts/             # NOUVEAU - Tous les scripts utilitaires
├── 📁 docs/                # EXISTANT - Toute la documentation
│   ├── guides/             # Fusionné depuis racine
│   ├── refacto/            # Existant
│   ├── design/             # Déplacé depuis DESIGN/
│   └── archive/            # NOUVEAU - Docs obsolètes
├── 📁 backups/             # EXISTANT - Tous les backups
├── 📁 tests-new/           # EXISTANT - Tests modernes
├── 📁 app/                 # Code Next.js
├── 📁 components/          # Composants React
├── 📁 hooks/               # Custom hooks
├── 📁 lib/                 # Services & utilities
├── 📁 public/              # Assets statiques
├── 📁 emails/              # Templates emails
├── 📁 contexts/            # React contexts
├── 📁 data/                # Données statiques
├── 📁 supabase/            # Migrations DB
├── .env.example
├── .env.local
├── .gitignore
├── package.json
├── README.md              # Documentation principale
├── CLAUDE.md              # Instructions Claude
├── middleware.ts
├── next.config.ts
├── tsconfig.json
├── playwright.config.ts
└── (configs essentiels)
```

---

## 🗑️ PHASE 1: Supprimer Fichiers Temporaires (22 fichiers)

### Logs de build (à supprimer - regénérés à chaque build)
```bash
❌ build-check.log
❌ build-errors.log
❌ build-output.log
❌ build-test.log
❌ dev-output.log
❌ final-production-test.log
❌ full-build.log
❌ lint-output.txt
❌ lint-warnings.txt
❌ production-server.log
❌ production-test.log
❌ push-output.log
❌ rebuild.log
❌ test-output.log
```

### Fichiers PID (process temporaires)
```bash
❌ final-server.pid
❌ production-server.pid
❌ server.pid
```

### Fichiers test/debug temporaires
```bash
❌ cookies_admin.txt
❌ dashboard.html
❌ test-modal-positioning.html
❌ C:UsersarthuDesktopCodingSeido-appcomponentsinterventionassignment-section-v2.tsx (nom corrompu)
```

### Fichiers SQL one-shot
```bash
❌ check_users_policies.sql (déjà exécuté)
```

**Total à supprimer**: ~22 fichiers

---

## 📝 PHASE 2: Déplacer Documentation (21 → docs/)

### Guides opérationnels (docs/guides/)
```bash
DEBUG_RESET_PASSWORD_GUIDE.md → docs/guides/
STAGING_AUTH_TIMEOUT_FIX.md → docs/guides/
SUPABASE_STAGING_SETUP.md → docs/guides/
TEAMS_SETUP_GUIDE.md → docs/guides/
VALIDATION_CHECKLIST.md → docs/guides/
```

### Rapports d'audit/fixes (docs/reports/)
```bash
AUTH_CONFLICTS_AUDIT_RESULTS.md → docs/reports/
FIX-RLS-REPORT.md → docs/reports/
SESSION_CLEANUP_FIX.md → docs/reports/
SOLUTION_DATA_LOADING_FIX.md → docs/reports/
```

### Documentation migration (docs/migrations/)
```bash
MIGRATION_INSTRUCTIONS.md → docs/migrations/
MIGRATION_LOG.md → docs/migrations/
migration-report.md → docs/migrations/
```

### Summaries refactoring (docs/refacto/)
```bash
finalization-modal-refactor-summary.md → docs/refacto/
fix-database-queries.md → docs/refacto/
modal-positioning-fix-summary.md → docs/refacto/
REFACTORING_SUMMARY.md → docs/refacto/
SESSION_SIMPLIFICATION_PLAN.md → docs/refacto/
```

### Docs de test (docs/testing/)
```bash
test-auth-flow.md → docs/testing/
test-signup-fix.md → docs/testing/
```

### À GARDER à la racine
```bash
✅ README.md (documentation principale)
✅ CLAUDE.md (instructions Claude Code)
```

**Total déplacé**: 19 fichiers markdown

---

## ⚙️ PHASE 3: Déplacer Scripts (7 → scripts/)

### Scripts PowerShell/Batch
```bash
fix-contact-invitation-service.ps1 → scripts/fixes/
fix-invite-user-api.ps1 → scripts/fixes/
fix-invite-user-final.ps1 → scripts/fixes/
restart.bat → scripts/dev/
restart-dev.ps1 → scripts/dev/
run-test-headed.ps1 → scripts/testing/
dev-pretty.sh → scripts/dev/
```

### Scripts JS (utilitaires one-time)
```bash
examine-line.js → scripts/utils/
fix-logger-syntax.js → scripts/fixes/
```

**Total déplacé**: 9 fichiers scripts

---

## 📁 PHASE 4: Réorganiser Dossiers

### Dossiers à fusionner/déplacer
```bash
📁 DESIGN/ → docs/design/
📁 guides/ → docs/guides/ (fusionner)
📁 examples/ → docs/examples/
```

### Dossiers backups
```bash
📁 backup-cleanup-2025-10-20/ → backups/cleanup-2025-10-20/
📁 lint-cleanup-backup/ → backups/lint-cleanup/ (ou supprimer si obsolète)
```

### Rapports Playwright (temporaires - à gitignore)
```bash
📁 playwright-report/ → .gitignore
📁 playwright-report-auth/ → .gitignore
```

### Dossiers à GARDER tels quels
```bash
✅ .git/
✅ .github/
✅ .claude/
✅ .cursor/
✅ app/
✅ components/
✅ hooks/
✅ lib/
✅ public/
✅ emails/
✅ contexts/
✅ data/
✅ supabase/
✅ tests-new/
✅ tools/
✅ utils/
```

---

## 📋 PHASE 5: Mettre à jour .gitignore

Ajouter :
```gitignore
# Logs
*.log
*.pid
.logs/

# Test outputs
playwright-report/
playwright-report-auth/
test-results/

# Temporary files
*.tmp
*.temp
cookies_*.txt
*-output.log
*-server.pid
```

---

## 📊 Résumé des Actions

| Action | Fichiers | Destination |
|--------|----------|-------------|
| **Supprimer** | 22 | - (logs, pid, temp) |
| **Déplacer docs** | 19 | docs/ |
| **Déplacer scripts** | 9 | scripts/ |
| **Réorganiser dossiers** | 5 | docs/, backups/ |
| **Total nettoyé** | **55** | - |

---

## ✅ Résultat Final

### Avant
- **110 items** à la racine
- Difficile à naviguer
- Logs/scripts mélangés avec code

### Après
- **~40 items** à la racine (-64%)
- Structure claire et logique
- Séparation config / code / docs / scripts

---

## 🚀 Exécution

**Ordre recommandé** :
1. ✅ Créer structure dossiers (scripts/, docs/guides/, etc.)
2. ✅ Déplacer documentation (19 fichiers)
3. ✅ Déplacer scripts (9 fichiers)
4. ✅ Réorganiser dossiers (5 mouvements)
5. ✅ Supprimer temporaires (22 fichiers)
6. ✅ Mettre à jour .gitignore
7. ✅ Build + validation
8. ✅ Git commit

**Validation** :
- `npm run build` (doit passer)
- `npm run lint` (doit passer)
- Vérifier imports relatifs dans scripts déplacés

---

**Prêt à exécuter ?** 🚀
