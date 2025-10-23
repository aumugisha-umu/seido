# Comptes de Test Standardisés - SEIDO

## Vue d'ensemble

Ce système de comptes de test standardisés utilise le format `arthur+XXX@seido.pm` avec le mot de passe `Wxcvbn123` pour tous les tests de l'application SEIDO.

## Format des comptes

- **Email** : `arthur+XXX@seido.pm` (XXX = numéro à 3 chiffres incrémental)
- **Mot de passe** : `Wxcvbn123` (standardisé pour tous les comptes)
- **Numérotation** : Commence à 000 et s'incrémente automatiquement

## Comptes par défaut

| Rôle | Email | Mot de passe | Suffixe |
|------|-------|--------------|---------|
| Gestionnaire | `arthur+000@seido.pm` | `Wxcvbn123` | 000 |
| Prestataire | `arthur+001@seido.pm` | `Wxcvbn123` | 001 |
| Locataire | `arthur+002@seido.pm` | `Wxcvbn123` | 002 |
| Admin | `arthur+003@seido.pm` | `Wxcvbn123` | 003 |

## Utilisation

### 1. Création des comptes de test

```bash
# Créer tous les comptes de test standardisés
node test/scripts/create-test-user.js
```

### 2. Utilisation dans les tests

#### Tests unitaires (Vitest)

```typescript
import { TestAccountsHelper } from '@/test/utils/test-accounts-helper'

describe('My Test', () => {
  it('should work with test accounts', () => {
    const testAccount = TestAccountsHelper.generateTestAccount('gestionnaire')
    expect(testAccount.email).toBe('arthur+000@seido.pm')
    expect(testAccount.password).toBe('Wxcvbn123')
  })
})
```

#### Tests E2E (Playwright)

```typescript
import { test, expect } from '@playwright/test'
import { TestAccountsHelper } from '../utils/test-accounts-helper'

test('login with test account', async ({ page }) => {
  const testAccounts = TestAccountsHelper.getE2ETestData()
  
  await page.goto('/auth/login')
  await page.fill('[name="email"]', testAccounts.gestionnaire.email)
  await page.fill('[name="password"]', testAccounts.gestionnaire.password)
  await page.click('button[type="submit"]')
  
  await expect(page.locator('text=Dashboard')).toBeVisible()
})
```

#### Tests d'API

```typescript
import { describe, it, expect } from 'vitest'
import { getTestAccountByRole } from '@/test/config/test-accounts.config'

describe('API Tests', () => {
  it('should authenticate with test account', async () => {
    const gestionnaireAccount = getTestAccountByRole('gestionnaire')
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: gestionnaireAccount.email,
        password: gestionnaireAccount.password
      })
    })
    
    expect(response.status).toBe(200)
  })
})
```

## Helpers disponibles

### TestAccountsHelper

```typescript
// Générer un compte de test
const account = TestAccountsHelper.generateTestAccount('gestionnaire')

// Générer un compte avec suffixe personnalisé
const customAccount = TestAccountsHelper.generateCustomAccount('prestataire', '999')

// Obtenir les comptes par défaut
const defaultAccounts = TestAccountsHelper.getDefaultTestAccounts()

// Obtenir les données E2E
const e2eData = TestAccountsHelper.getE2ETestData()

// Valider un email de test
const isValid = TestAccountsHelper.isValidTestEmail('arthur+123@seido.pm')

// Extraire le suffixe d'un email
const suffix = TestAccountsHelper.extractSuffixFromEmail('arthur+123@seido.pm')
```

### Configuration

```typescript
import { TEST_ACCOUNTS_CONFIG, getTestAccountByRole } from '@/test/config/test-accounts.config'

// Utiliser la configuration
const gestionnaireAccount = getTestAccountByRole('gestionnaire')
const allAccounts = TEST_ACCOUNTS_CONFIG.default
```

## Avantages

1. **Standardisation** : Format uniforme pour tous les tests
2. **Prévisibilité** : Comptes toujours disponibles avec les mêmes identifiants
3. **Sécurité** : Mot de passe fort et standardisé
4. **Organisation** : Numérotation claire et incrémentale
5. **Maintenance** : Facile à gérer et à mettre à jour

## Règles importantes

1. **Ne jamais créer de faux comptes** - Utiliser uniquement le format `arthur+XXX@seido.pm`
2. **Toujours utiliser le mot de passe standardisé** - `Wxcvbn123`
3. **Respecter la numérotation** - Commencer à 000 et incrémenter
4. **Nettoyer après les tests** - Supprimer les données de test créées
5. **Utiliser les helpers** - Ne pas hardcoder les emails dans les tests

## Exemples complets

Voir `test/examples/test-accounts-usage.example.ts` pour des exemples complets d'utilisation.

## Dépannage

### Compte de test non trouvé
- Vérifier que le script de création a été exécuté
- Vérifier que le format de l'email est correct
- Vérifier que le mot de passe est `Wxcvbn123`

### Erreur de validation
- Vérifier que l'email suit le format `arthur+XXX@seido.pm`
- Vérifier que XXX est un nombre à 3 chiffres
- Vérifier que le domaine est `@seido.pm`

### Problème de numérotation
- Utiliser `TestAccountsHelper.resetCounter()` pour réinitialiser
- Vérifier que les suffixes sont uniques
- Utiliser des suffixes personnalisés si nécessaire

