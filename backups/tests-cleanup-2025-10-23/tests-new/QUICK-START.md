# 🚀 Quick Start - Tests E2E Auto-Healing

Guide de démarrage rapide pour lancer votre premier test.

## ⚡ Démarrage en 3 minutes

### 1. Vérifier les prérequis

```bash
# Node.js installé ?
node --version

# Playwright installé ?
npx playwright --version

# Si non :
npx playwright install
```

### 2. Démarrer le serveur de dev

```bash
# Terminal 1 : Démarrer le serveur
npm run dev

# Attendre que le serveur soit prêt :
# ✓ Ready in 2.3s
```

### 3. Lancer le test signup

```bash
# Terminal 2 : Lancer le test
npm run test:new:signup
```

**Le test va vous demander** :

```
🎭 Mode de navigateur pour les tests

1. Headed (navigateur visible) - Recommandé pour debug
2. Headless (navigateur caché) - Plus rapide

Votre choix (1 ou 2) [défaut: 2]:
```

Choisissez `1` pour voir le navigateur en action ! 🎬

## 📊 Résultats

Après le test, vous trouverez :

```
tests-new/logs/Complete-signup-flow-with-email-confirmation/
├── report.md              ← 📄 Rapport principal (LISEZ-MOI EN PREMIER)
├── console.log            ← 🖥️ Logs console browser
├── server.log             ← ⚙️ Logs serveur Next.js
├── supabase.log           ← 🗄️ Logs Supabase
├── pino.log               ← 📝 Logs structurés Pino
├── network.log            ← 🌐 Requêtes HTTP
├── screenshots/           ← 📸 Screenshots (si échec)
└── emails/                ← 📧 Emails capturés (HTML)
```

## ✅ Test Réussi ?

Si vous voyez :

```
✅ ✅ ✅ SIGNUP TEST PASSED ✅ ✅ ✅
```

**Bravo ! 🎉** Votre infrastructure de tests fonctionne parfaitement.

## ❌ Test Échoué ?

### 1. Consultez le rapport

```bash
# Ouvrir le rapport Markdown
notepad tests-new\logs\Complete-signup-flow-with-email-confirmation\report.md
```

Le rapport contient :
- ✅ Statut et durée
- ❌ Erreurs avec stack traces
- 🌐 Erreurs réseau (4xx/5xx)
- 📄 Liens vers logs détaillés

### 2. Consultez les logs

```bash
# Logs console
type tests-new\logs\Complete-signup-flow-with-email-confirmation\console.log

# Logs serveur
type tests-new\logs\Complete-signup-flow-with-email-confirmation\server.log

# Logs réseau
type tests-new\logs\Complete-signup-flow-with-email-confirmation\network.log
```

### 3. Auto-Healing activé ?

Si l'auto-healing est activé, le test va **automatiquement** :

1. Détecter l'erreur
2. Enregistrer le bug
3. Vérifier si c'est une boucle infinie (même bug 5x ?)
4. Appeler l'agent coordinateur (à venir)
5. Corriger le code
6. Relancer le test

**Max 5 tentatives** avant d'arrêter et de demander votre aide.

### 4. Boucle infinie détectée ?

Si vous voyez :

```
🔄 INFINITE LOOP DETECTED!
Bug BUG-ABC123 occurred 5 times
```

Consultez le rapport de boucle infinie :

```bash
notepad tests-new\logs\Complete-signup-flow-with-email-confirmation\infinite-loop.md
```

Ce rapport contient :
- 🆔 Bug ID
- 📊 Occurrences
- 💡 **Recommandations pour débloquer**

## 🎯 Prochaines Étapes

### Lancer d'autres tests (à venir)

```bash
# Login
npm run test:new:login

# Logout
npm run test:new:logout

# Reset password
npm run test:new:reset-password

# Tous les tests auth
npm run test:new:auth

# Tous les tests
npm run test:new
```

### Modes d'exécution

```bash
# Mode headed (navigateur visible)
npm run test:new:headed

# Mode headless (navigateur caché)
npm run test:new:headless

# Mode debug (avec logs Playwright)
DEBUG=pw:api npm run test:new:signup
```

### Désactiver l'auto-healing

```bash
# Windows PowerShell
$env:DISABLE_AUTO_HEALING = "true"
npm run test:new:signup

# Windows CMD
set DISABLE_AUTO_HEALING=true
npm run test:new:signup
```

## 🔧 Problèmes Courants

### Port 3000 déjà utilisé

```bash
# Trouver le processus
netstat -ano | findstr :3000

# Tuer le processus
taskkill /PID [PID] /F

# Redémarrer
npm run dev
```

### "Playwright not installed"

```bash
npx playwright install
npx playwright install-deps
```

### "Email not received"

1. Vérifiez `.env.local` :
   ```
   RESEND_API_KEY=re_...
   ```

2. Vérifiez que l'interception est active :
   ```typescript
   const emailCapture = createEmailCapture('signup-test')
   await emailCapture.setupInterception(page)
   ```

3. Consultez `network.log` pour voir les requêtes Resend

### Tests timeout

1. Augmentez les timeouts dans `tests-new/config/test-config.ts` :
   ```typescript
   timeout: {
     test: 60000,      // 60s au lieu de 30s
     action: 10000,    // 10s au lieu de 5s
     navigation: 20000, // 20s au lieu de 10s
   }
   ```

2. Lancez en mode headed pour observer

3. Vérifiez que le serveur est démarré

## 📚 Documentation Complète

Pour plus de détails :

- **README complet** : [README.md](./README.md)
- **Architecture** : Voir section "Architecture" du README
- **Configuration** : [config/test-config.ts](./config/test-config.ts)
- **Helpers** : [helpers/](./helpers/)

## 💡 Conseils

### 1. Toujours en mode headed pour la première fois

Voir le navigateur en action aide à comprendre ce qui se passe.

### 2. Consultez les logs

Les logs sont votre meilleur ami pour comprendre les échecs.

### 3. Screenshots automatiques

En cas d'échec, un screenshot est automatiquement pris et sauvegardé.

### 4. Emails capturés

Tous les emails envoyés sont sauvegardés en HTML dans `emails/`.

### 5. Rapports Markdown

Le rapport Markdown est le point d'entrée principal pour analyser un test.

## 🎓 Apprendre Plus

### Écrire votre premier test

Voir l'exemple dans [auth/signup.spec.ts](./auth/signup.spec.ts)

### Utiliser les helpers

Voir [helpers/auth-helpers.ts](./helpers/auth-helpers.ts) pour les helpers d'authentification.

### Capturer les emails

Voir [helpers/email-helpers.ts](./helpers/email-helpers.ts) pour l'interception d'emails.

## 🆘 Besoin d'Aide ?

1. **Consultez le README** : [README.md](./README.md)
2. **Consultez les logs** : `tests-new/logs/`
3. **Consultez Playwright Docs** : https://playwright.dev/

---

**Prêt à tester ?** 🚀

```bash
npm run test:new:signup
```

Bon tests ! 🧪
