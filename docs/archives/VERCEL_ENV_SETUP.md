# 🚀 Configuration Variables d'Environnement sur Vercel

## ⚠️ Problème Résolu

**Symptôme** : Les emails d'authentification (signup, reset password, invitations) redirigent vers `localhost:3000` même en production.

**Cause** : Variable d'environnement `NEXT_PUBLIC_SITE_URL` non définie sur Vercel.

**Solution** : Configurer toutes les variables d'environnement nécessaires dans le dashboard Vercel.

---

## 📋 Variables Requises pour Production

### 1. Aller sur Vercel Dashboard

1. Connectez-vous à [Vercel](https://vercel.com)
2. Sélectionnez votre projet SEIDO
3. Allez dans **Settings** → **Environment Variables**

### 2. Ajouter les Variables Suivantes

#### 🗄️ Supabase (REQUIS)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ekjpuwryqhjarsdizskr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 🌍 URL de l'Application (CRITIQUE)

**⚠️ C'EST LA VARIABLE QUI MANQUAIT !**

```bash
NEXT_PUBLIC_SITE_URL=https://votre-app.vercel.app
```

**Important** :
- Pour la branche `optimization` : `https://seido-git-optimization-arthur-3234s-projects.vercel.app`
- Pour `main` (production) : Votre domaine principal
- Pour preview branches : Peut être automatique avec `VERCEL_URL` (voir ci-dessous)

#### 📧 Resend Email (REQUIS)

```bash
RESEND_API_KEY=re_7L8FJmFX_DSUTX5VraEr1VA1HtxtHLJne
RESEND_FROM_EMAIL="SEIDO <notifications@seido-app.com>"
```

#### 🔐 Authentication

```bash
NEXT_PUBLIC_USE_MOCK_AUTH=false
```

#### 📝 Logging (Optionnel)

```bash
LOG_LEVEL=info
SUPPORT_EMAIL=support@seido-app.com
```

---

## 🎯 Configuration par Environnement

Vercel permet de définir des variables pour différents environnements :

- **Production** : Branche `main`, domaine principal
- **Preview** : Toutes les autres branches (dont `optimization`)
- **Development** : Utilise `.env.local` (pas sur Vercel)

### Configuration Recommandée

| Variable | Production | Preview | Development |
|----------|-----------|---------|-------------|
| `NEXT_PUBLIC_SITE_URL` | `https://seido.com` | Automatique* | `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Même valeur | ✅ Même valeur | ✅ Même valeur |
| `RESEND_API_KEY` | ✅ Production key | ✅ Même clé** | ✅ Dev key |
| `LOG_LEVEL` | `info` | `debug` | `debug` |

\* **Astuce Preview** : Utilisez cette variable pour auto-détecter l'URL :
```bash
NEXT_PUBLIC_SITE_URL=${VERCEL_URL}
```

\*\* **Note Resend** : Vous pouvez utiliser la même clé ou créer une clé de test séparée.

---

## 🔧 Instructions Détaillées

### Étape 1 : Accéder aux Variables d'Environnement

1. Dashboard Vercel → Votre Projet → **Settings**
2. Sidebar gauche → **Environment Variables**

### Étape 2 : Ajouter une Variable

1. Cliquez sur **Add New**
2. Remplissez :
   - **Name** : Nom de la variable (ex: `NEXT_PUBLIC_SITE_URL`)
   - **Value** : Valeur (ex: `https://seido-git-optimization-arthur-3234s-projects.vercel.app`)
   - **Environments** : Cochez les environnements concernés
     - ✅ Production (si `main`)
     - ✅ Preview (pour les autres branches)
     - ❌ Development (utilise `.env.local`)

3. Cliquez sur **Save**

### Étape 3 : Redéployer

⚠️ **IMPORTANT** : Les changements de variables d'environnement **ne sont pas automatiques** !

Vous devez **redéployer** pour que les nouvelles variables soient prises en compte :

1. Allez dans l'onglet **Deployments**
2. Trouvez le dernier déploiement
3. Cliquez sur les **3 points** → **Redeploy**
4. Confirmez le redéploiement

---

## 🧪 Vérifier la Configuration

Après le redéploiement, vérifiez que tout fonctionne :

### Test 1 : Variables Publiques

Les variables `NEXT_PUBLIC_*` sont visibles côté client. Ouvrez la console du navigateur :

```javascript
console.log('NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL)
// Devrait afficher: https://votre-app.vercel.app
```

### Test 2 : Email de Signup

1. Créez un compte de test
2. Vérifiez l'email reçu
3. Le lien de confirmation doit pointer vers : `https://votre-app.vercel.app/auth/confirm?token_hash=...`
4. **PAS** vers `http://localhost:3000`

### Test 3 : Reset Password

1. Demandez une réinitialisation de mot de passe
2. Vérifiez l'email
3. Le lien doit pointer vers votre domaine Vercel

---

## 📚 Références

- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)

---

## 🔍 Troubleshooting

### Les emails pointent toujours vers localhost

- ✅ Vérifiez que `NEXT_PUBLIC_SITE_URL` est définie sur Vercel
- ✅ Vérifiez que vous avez **redéployé** après l'ajout de la variable
- ✅ Vérifiez l'environnement (Production vs Preview)
- ✅ Inspectez les logs de build sur Vercel pour voir si la variable est bien injectée

### Les variables ne s'affichent pas côté client

- Les variables `NEXT_PUBLIC_*` sont **injectées au build time**
- Si vous les modifiez, vous **DEVEZ** redéployer
- Vérifiez qu'elles sont bien préfixées par `NEXT_PUBLIC_`

### Erreur "NEXT_PUBLIC_SUPABASE_URL is required"

- La variable n'est pas définie sur Vercel
- Ajoutez-la dans Environment Variables
- Redéployez

---

**✅ Une fois configuré, tous vos emails d'authentification pointeront vers la bonne URL !**
