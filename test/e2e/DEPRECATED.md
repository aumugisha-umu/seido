# ⚠️ DEPRECATED - Ce dossier n'est plus utilisé

**Date de dépréciation** : 2025-10-05

## 🚨 Utiliser `tests-new/` à la place

Ce dossier `test/e2e/` a été remplacé par **`tests-new/`** qui contient :
- Une architecture mieux structurée
- Des helpers modulaires et réutilisables
- Des tests auto-healing avec isolation
- Une meilleure organisation par feature

## 📁 Migration

| Ancien Chemin | Nouveau Chemin |
|--------------|----------------|
| `test/e2e/helpers/` | `tests-new/helpers/` |
| `test/e2e/fixtures/` | `tests-new/fixtures/` |
| `test/e2e/auth/` | `tests-new/auth/` |
| `test/e2e/phase2-auth/` | `tests-new/contacts/` |

## ⚙️ Configuration Playwright

La configuration Playwright a été mise à jour pour pointer vers `tests-new/` :

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './tests-new',  // ✅ Nouveau
  // testDir: './test/e2e', // ❌ Ancien (déprécié)
})
```

## 🗑️ Action Recommandée

Ce dossier peut être supprimé après vérification que tous les tests ont bien été migrés vers `tests-new/`.

---

**Pour toute question, voir** : `tests-new/README.md`
