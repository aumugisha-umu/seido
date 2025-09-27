# 🧪 Tests E2E Authentification - SEIDO

## 📁 Scripts de Test Disponibles

### 1. **validate-phase1.js**
Test complet de validation PHASE 1 pour les 3 rôles principaux.
```bash
npm run test:phase1
# ou
node test/e2e/auth/validate-phase1.js
```

### 2. **auth-validation-phase1.test.ts**
Suite de tests Vitest complète avec métriques de performance.
```bash
npm run test:phase1:full
# ou
vitest run test/e2e/auth/auth-validation-phase1.test.ts
```

### 3. **manual-auth-test.js**
Test manuel interactif pour observer le flow d'authentification.
```bash
node test/e2e/auth/manual-auth-test.js
```

### 4. **debug-auth-flow.js**
Diagnostic détaillé du flow avec logs complets.
```bash
node test/e2e/auth/debug-auth-flow.js
```

### 5. **test-simple.js**
Test basique pour vérifier la connexion et prendre des captures.
```bash
node test/e2e/auth/test-simple.js
```

## 🔑 Credentials de Test

```javascript
const testAccounts = [
  { email: 'arthur@umumentum.com', password: 'Wxcvbn123', role: 'gestionnaire' },
  { email: 'arthur+prest@seido.pm', password: 'Wxcvbn123', role: 'prestataire' },
  { email: 'arthur+loc@seido.pm', password: 'Wxcvbn123', role: 'locataire' }
]
```

## 🚀 Configuration Requise

### Prérequis
- Node.js 18+
- Puppeteer installé (`npm install puppeteer`)
- Serveur Next.js en cours d'exécution

### Démarrage du Serveur
```bash
# Production (recommandé pour les tests)
npm run build
npm run start

# Ou développement
npm run dev
```

### Ports Utilisés
- Port 3000: Serveur principal (dev)
- Port 3001: Alternative si 3000 occupé
- Port 3002: Tests E2E (production)

## 📊 Métriques Cibles PHASE 1

| Métrique | Objectif | Statut Actuel |
|----------|----------|---------------|
| Temps d'auth | < 3s | ✅ 1.4s |
| Success Rate | > 95% | ❌ 0% |
| Rôles fonctionnels | 3/3 | ❌ 0/3 |
| DOM Stable | 100% | ✅ 100% |

## 🐛 Problèmes Connus

### 1. Conflit Middleware/Client
- Le middleware redirige vers /auth/login même avec un cookie valide
- Solution en cours: Synchronisation du middleware avec l'état JWT

### 2. Erreurs Supabase en Mode Mock
- Erreurs 400 sur les requêtes team_members
- Solution: Isolation complète du mode mock

### 3. Redirections Non Fonctionnelles
- router.push() exécuté mais sans effet
- Le middleware intercepte et redirige vers login

## 📝 Notes de Développement

### Variables d'Environnement pour Tests
```bash
export NEXT_PUBLIC_APP_ENV=test
export JWT_SECRET=seido-secret-key-phase1-test
```

### Debugging
Pour activer les logs détaillés dans le navigateur Puppeteer:
```javascript
page.on('console', msg => console.log('Browser:', msg.text()));
```

### Captures d'Écran
Les tests génèrent automatiquement des captures:
- `test-login-page.png`: Page de connexion
- `test-after-submit.png`: Après soumission
- `test-manual-auth-result.png`: Résultat final
- `test-results-[role]-error.png`: En cas d'erreur

## 🔄 Workflow de Test Recommandé

1. **Build l'application**
   ```bash
   npm run build
   ```

2. **Démarrer le serveur de production**
   ```bash
   PORT=3002 npm run start
   ```

3. **Lancer les tests de validation**
   ```bash
   npm run test:phase1
   ```

4. **En cas d'échec, debugger**
   ```bash
   node test/e2e/auth/debug-auth-flow.js
   ```

## 📈 Progression PHASE 1

```
Authentification API     [██████████] 100% ✅
Performance              [██████████] 100% ✅
Stabilité DOM            [██████████] 100% ✅
Cookie JWT               [██████████] 100% ✅
Redirections             [░░░░░░░░░░]   0% ❌
Tests E2E                [░░░░░░░░░░]   0% ❌

GLOBAL PHASE 1           [██████░░░░]  60% 🟡
```

## 🚧 Prochaines Étapes

1. **Corriger le middleware** pour accepter le cookie JWT
2. **Isoler le mode mock** de Supabase
3. **Synchroniser** l'état client/serveur
4. **Valider** les redirections par rôle
5. **Passer à PHASE 2** après 100% de succès

---

*Dernière mise à jour: 27 septembre 2025 - 03:48 CET*