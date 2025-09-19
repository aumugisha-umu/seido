# 🔍 DEBUG GUIDE - Reset Password Issues

## 📋 Checklist de Diagnostic

### **1. Variables d'environnement**

Si vous voyez : `hasServiceRoleKey: false`
```bash
# ❌ PROBLÈME: SUPABASE_SERVICE_ROLE_KEY manquant
# ✅ SOLUTION: Ajoutez dans .env.local
SUPABASE_SERVICE_ROLE_KEY=eyJ[your-service-role-key]...
```

**Pour récupérer votre Service Role Key :**
1. Dashboard Supabase → Settings → API
2. Project API Keys → `service_role` (⚠️ secret, ne pas exposer)

### **2. Utilisateur non trouvé**

Si vous voyez : `userFound: false`
```json
🔧 [RESET-PASSWORD-API] Available users in system: [
  { "email": "other@email.com", "id": "123", "confirmed": "2024-01-01" }
]
```

**Causes possibles :**
- Email pas encore inscrit dans le système
- Faute de frappe dans l'email
- Utilisateur créé mais pas confirmé

### **3. Erreur d'envoi d'email**

Si vous voyez : `Reset email failed`
```json
🔧 [RESET-PASSWORD-API] Reset email attempt result: {
  "hasError": true,
  "errorMessage": "Rate limit exceeded"
}
```

**Messages d'erreur courants :**
- `Rate limit exceeded` → Trop d'essais, attendre quelques minutes
- `User not found` → Email n'existe pas dans auth.users
- `Email not confirmed` → Compte pas encore activé
- `Invalid credentials` → Service Role Key incorrect

### **4. Configuration Supabase**

Vérifiez votre configuration email dans Supabase :
1. Dashboard → Settings → Auth
2. Email Templates → Reset Password
3. SMTP Settings (si configuré)

### **5. Environnement de développement vs production**

**Local :**
```env
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ[service-role-key]...
```

**Production (Vercel) :**
- Vérifiez que les variables d'environnement sont bien définies
- Service Role Key doit être dans les variables d'environnement Vercel

## 🚀 Actions selon les logs

### **Si hasServiceRoleKey: false**
```bash
# Ajoutez dans .env.local
SUPABASE_SERVICE_ROLE_KEY=eyJ[your-service-role-key-from-dashboard]
# Redémarrez le serveur
npm run dev
```

### **Si userFound: false**
1. Vérifiez que l'email est correct
2. Inscrivez-vous d'abord si pas encore fait
3. Confirmez votre email d'inscription

### **Si reset email failed**
1. Vérifiez la configuration email Supabase
2. Attendez quelques minutes si rate limit
3. Vérifiez que l'utilisateur a confirmé son email

### **Si API call failed**
1. Vérifiez la console Network (F12 → Network)
2. Status code de la requête POST `/api/reset-password`
3. Réponse complète de l'API

## 📞 Debug Info Affiché

En mode développement, vous verrez une section "🔍 Debug Info" qui contient :
- Informations d'environnement
- Détails utilisateur
- Configuration Supabase
- Messages d'erreur détaillés

## 🎯 Solutions Rapides

**Problème #1 : Service Role Key manquant**
```bash
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Problème #2 : Email non confirmé**
- Vérifiez votre boîte email d'inscription
- Cliquez sur le lien de confirmation

**Problème #3 : Rate limiting**
- Attendez 5-10 minutes
- Utilisez un autre email temporairement

**Problème #4 : Configuration SMTP**
- Dashboard Supabase → Settings → Auth
- Vérifiez Email Templates
