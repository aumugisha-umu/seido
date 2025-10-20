# Inventaire du Nettoyage Codebase SEIDO
**Date:** 2025-10-20
**Objectif:** Suppression de 200+ fichiers non utilisés

---

## 📊 Résumé

| Catégorie | Fichiers | Statut |
|-----------|----------|--------|
| Routes test/debug (sécurité) | 9 | ✅ Sauvegardé |
| Fichiers .backup | 27 | ✅ Sauvegardé |
| Services deprecated | 4 | ✅ Sauvegardé |
| Configs playwright | 4 | ✅ Sauvegardé |
| Scripts legacy | 35+ | ✅ Sauvegardé |
| Directories tests old | 2 | ✅ Sauvegardé |
| Documentation duplicate | 1 | ✅ Sauvegardé |
| **Total estimé** | **~200** | - |

---

## 🗑️ Fichiers à Supprimer

### 1. ROUTES TEST/DEBUG (Sécurité - CRITIQUE)

**app/api/test/**
- `app/api/test/check-contact/route.ts`
- `app/api/test/cleanup-user/route.ts`
- `app/api/test/get-confirmation-link/route.ts`
- `app/api/test/get-last-invitation-link/route.ts`
- `app/api/test/get-reset-link/route.ts`

**app/api/debug-***
- `app/api/debug-interventions/route.ts`
- `app/api/debug-teams/route.ts`

**Pages de test**
- `app/test-finalization-mobile/page.tsx`
- `app/test-logging/page.tsx`

**Raison:** Exposent des endpoints sensibles en production (liens de réinitialisation, données internes).

---

### 2. FICHIERS .BACKUP (27 fichiers)

**backups/optimization-20251017/** (24 fichiers)
- `intervention-actions-service.ts.backup`
- `approval-modal.tsx.backup`
- `approve-confirmation-modal.tsx.backup`
- `assigned-contacts-card.tsx.backup`
- `availability-filtering-utils.ts.backup`
- `cancel-confirmation-modal.tsx.backup`
- `chats-card.tsx.backup`
- `files-card.tsx.backup`
- `intervention-action-panel.tsx.backup`
- `intervention-cancel-button.tsx.backup`
- `intervention-cancellation-manager.tsx.backup`
- `intervention-detail-header.tsx.backup`
- `intervention-detail-tabs.tsx.backup`
- `intervention-details-card.tsx.backup`
- `intervention-logement-card.tsx.backup`
- `logement-card.tsx.backup`
- `planning-card.tsx.backup`
- `quote-state-utils.ts.backup`
- `reject-confirmation-modal.tsx.backup`
- `use-intervention-approval.ts.backup`
- `use-intervention-cancellation.ts.backup`
- `use-intervention-planning.ts.backup`
- (+ autres backups)

**Racine et autres**
- `hooks/use-auth.backup.tsx`
- `middleware.backup.ts`
- `lib/auth-actions.ts.backup_obsolete`

**Raison:** Fichiers backup de l'optimisation d'octobre - versions actuelles fonctionnelles.

---

### 3. SERVICES DEPRECATED (4 fichiers)

- `lib/intervention-actions-service-fusionné.ts` (nom français = version de fusion obsolète)
- `lib/intervention-service-temp-fix.ts` (fix temporaire, plus nécessaire)
- `lib/database-service-compat.ts` (couche de compatibilité, plus utilisée)

**Raison:** Services remplacés par architecture Repository Pattern actuelle.

---

### 4. CONFIGS PLAYWRIGHT DUPLIQUÉS (4 fichiers)

**À supprimer:**
- `playwright.config.auto-healing.ts` (non référencé dans package.json)
- `playwright.config.seido.ts` (non référencé)
- `playwright.config.simple.ts` (non référencé)
- `playwright.config.performance.ts` (référencé mais fichier manquant)

**À garder:**
- `playwright.config.ts` (config principale)
- `playwright.config.auth.ts` (utilisé par npm scripts)

**Raison:** Multiples configs créées pour tests, seules 2 sont utilisées.

---

### 5. SCRIPTS LEGACY (35+ fichiers)

**scripts/** (migrations one-time, fixes terminés)
- `analyze-bundle.js`
- `check-pino-encoding.ts`
- `check-team-data.js`
- `cleanup-lint-issues.js`
- `cleanup-ports.js`
- `comprehensive-eslint-fix.js`
- `ensure-port.js`
- `eslint-autofix.js`
- `fix-all-imports.ts`
- `fix-build.js`
- `fix-critical-entities.js`
- `fix-eslint-warnings.js`
- `fix-html-entities.js`
- `fix-import-placement.ts`
- `fix-import-syntax.ts`
- `fix-jsx-entities.js`
- `fix-more-entities.js`
- `fix-remaining-entities.js`
- `fix-remaining-warnings.js`
- `fix-unescaped-entities.js`
- `fix-unicode-comments.js`
- `force-cleanup-ports.js`
- `migrate-api-routes.js`
- `migrate-to-ssr.js`
- `monitor-cache-performance.js`
- `phase2-validation-report.js`
- `quick-lint-fix.js`
- `remove-all-unused-imports.js`
- `run-tests-unified.js`
- `supabase-create-missing-accounts.js`
- `test-cache-integration.js`
- `test-imports.js`
- `test-new-architecture.js`
- `validate-phase2-complete.js`
- `validate-phase2-server-components.js`
- (+ autres scripts one-time)

**Scripts à garder:**
- Scripts référencés dans `package.json` (supabase types, etc.)

**Raison:** Scripts de migration/fix one-time déjà exécutés. Archivés pour référence historique.

---

### 6. DIRECTORIES TESTS OBSOLÈTES (2 directories)

**À migrer puis supprimer:**
- `test/` (42 spec files - ancienne structure)
- `docs/refacto/Tests/` (11 spec files - référence/documentation)

**Destination:**
- Tout migré vers `tests-new/` (structure moderne)

**Raison:** Consolidation en une seule structure de tests.

---

### 7. DOCUMENTATION DUPLICATE (1 fichier)

**À supprimer:**
- `test/reports/rapport-audit-complet-seido.md` (1,531 lignes - copie)

**À garder:**
- `docs/rapport-audit-complet-seido.md` (3,984 lignes - version complète)

**Raison:** Doublon - version de docs/ est la référence principale.

---

### 8. GENERATED REPORTS (100+ fichiers)

**Directories de reports générés:**
- `playwright-report/`
- `playwright-report-auth/`
- `test/reports/` (sauf audit principal)
- `docs/refacto/Tests/reports/`

**Action:** Ajouter à `.gitignore` pour éviter commit futurs

**Raison:** Artifacts générés à chaque test run - pas de versioning nécessaire.

---

## 📁 Structure du Backup

```
backup-cleanup-2025-10-20/
├── files/
│   ├── api-routes/          # Routes test/debug
│   ├── backup-files/        # Fichiers .backup
│   ├── services/            # Services deprecated
│   ├── configs/             # Playwright configs
│   └── docs/                # Docs dupliqués
├── scripts/                 # Scripts legacy archivés
├── test-old/
│   ├── test/                # Ancienne structure /test
│   └── docs-refacto-tests/  # /docs/refacto/Tests
└── inventory.md             # Ce fichier

```

---

## 🔄 Migration & Consolidation

### Tests
- **Source 1:** `test/*.spec.ts` → **Destination:** `tests-new/legacy/`
- **Source 2:** `docs/refacto/Tests/*.spec.ts` → **Destination:** `tests-new/reference/`

### Documentation
- **Garder:** `docs/rapport-audit-complet-seido.md`
- **Supprimer:** `test/reports/rapport-audit-complet-seido.md`

---

## ✅ Checkpoints de Validation

1. **Checkpoint 1** (après routes test/debug) : `npm run build` + test auth flow
2. **Checkpoint 2** (après .backup) : `npm run build`
3. **Checkpoint 3** (après services) : `npm run build` + test interventions
4. **Checkpoint 4** (après configs) : `npm test`
5. **Checkpoint 5** (après scripts) : `npm run supabase:types`
6. **Checkpoint 6** (après migration tests) : `npx playwright test`
7. **Checkpoint 7** (après docs) : Vérification documentation
8. **Checkpoint 8** (après code mort) : `npm run build` par catégorie
9. **Checkpoint 9** (après dependencies) : `npm install` + `npm run build`

---

## 🎯 Résultat Attendu

**Avant nettoyage:**
- ~1200 fichiers
- 77 routes API
- 6 configs playwright
- 40+ scripts
- 3 directories de tests
- 27 fichiers backup

**Après nettoyage:**
- ~1000 fichiers (**-200**)
- 70 routes API (**-7** sécurité)
- 2 configs playwright (**-4**)
- ~5 scripts (**-35+**)
- 1 directory de tests (**-2**)
- 0 fichiers backup (**-27**)

---

**Généré le:** 2025-10-20
**Par:** Claude Code (Cleanup Agent)
