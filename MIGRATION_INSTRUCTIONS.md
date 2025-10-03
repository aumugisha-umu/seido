# 📋 Instructions de Migration - Système d'Inscription Unifié avec Resend

## 🎯 Objectif
Implémenter le nouveau système d'inscription avec emails Resend personnalisés (templates React) et trigger database automatisé.

## 🆕 Nouveau depuis v2.0 (Octobre 2025)
- ✅ **TOUS les emails** sont envoyés via Resend (pas Supabase)
- ✅ Templates React professionnels avec branding SEIDO
- ✅ `admin.generateLink()` pour créer users sans emails automatiques
- ✅ Retry automatique et analytics Resend

---

## ✅ Étape 1: Appliquer la Migration SQL

### Option A: Via Supabase Dashboard (RECOMMANDÉ)

1. **Ouvrir le SQL Editor** dans votre Dashboard Supabase
2. **Copier-coller le contenu** du fichier :
   ```
   supabase/migrations/20251002000001_fix_profile_creation_timing.sql
   ```
3. **Exécuter** la query complète
4. **Vérifier** les messages de succès dans la console

### Option B: Via CLI (si configuré)

```bash
# Se connecter à Supabase
npx supabase login

# Appliquer la migration
npx supabase db push
```

---

## ✅ Étape 2: Configurer les Variables d'Environnement

### Ajouter dans `.env.local`

```bash
# Supabase (existant)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ✅ NOUVEAU: Service Role Key (pour admin.generateLink())
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Resend (existant)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000  # ou https://votre-domaine.com en production
```

### ⚠️ Sécurité SERVICE_ROLE_KEY
- **JAMAIS** exposer au client (pas de `NEXT_PUBLIC_`)
- **Utiliser UNIQUEMENT** côté serveur (Server Actions, API Routes)
- **Rotation recommandée** tous les 90 jours

### Obtenir la SERVICE_ROLE_KEY
1. Supabase Dashboard → Project Settings → API
2. Section "Project API keys"
3. Copier `service_role` (secret key)

---

## ✅ Étape 3: Désactiver les Emails Automatiques Supabase (OPTIONNEL)

### Option A: Désactiver complètement (RECOMMANDÉ)

**Avantage** : Évite les doublons si Resend échoue et Supabase prend le relais.

1. Supabase Dashboard → Authentication → Providers → Email
2. **Décocher** "Confirm Email"
3. Enregistrer

⚠️ **Avec cette config** : Seuls vos emails Resend seront envoyés.

### Option B: Garder les emails Supabase en backup

**Avantage** : Sécurité si Resend est down.

1. **Garder** "Confirm Email" activé
2. Modifier les templates Supabase pour uniformiser les URLs :

#### Template Signup (Supabase)
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
```

#### Template Invitation (Supabase)
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite
```

#### Template Reset Password (Supabase)
```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
```

⚠️ **Avec cette config** : Les users recevront 2 emails (Resend + Supabase). Pas idéal UX mais sécurisé.

---

## ✅ Étape 4: Vérifier la Configuration Supabase Auth

### Dans Supabase Dashboard → Authentication → Settings

1. **Site URL**: Vérifier qu'il correspond à votre `.env.local`
   ```
   Development: http://localhost:3000
   Production: https://votre-domaine.com
   ```

2. **Redirect URLs**: Ajouter les URLs autorisées
   ```
   http://localhost:3000/auth/confirm
   https://votre-domaine.com/auth/confirm
   ```

3. **Email Confirmation** (selon votre choix à l'Étape 3):
   - **Option A**: DÉSACTIVÉ (Resend uniquement)
   - **Option B**: ACTIVÉ (Resend + Supabase backup)

---

## 🧪 Étape 5: Tester le Flow Complet

### Test 1: Signup Public (NOUVEAU FLUX RESEND)

1. **S'inscrire** sur `/auth/signup` avec email valide
2. **Vérifier** la console server pour :
   ```
   ✅ [SIGNUP-ACTION] User created in auth.users
   ✅ [SIGNUP-ACTION] Confirmation email sent successfully via Resend
   ```
3. **Vérifier** l'email de confirmation **RESEND** (template React personnalisé)
   - Subject: "Confirmez votre adresse email - SEIDO"
   - Design: Template React avec branding SEIDO
   - Bouton CTA: "Confirmer mon adresse email"
   - Expiration: 60 minutes
4. **Cliquer** sur le lien → Redirige vers `/auth/confirm?token_hash=...&type=email`
5. **Vérifier** dans la console server :
   ```
   ✅ [AUTH-CONFIRM] OTP verified for: user@example.com
   ✅ [AUTH-CONFIRM] User profile found (trigger created it)
   ✅ [AUTH-CONFIRM] Welcome email sent via Resend
   ```
6. **Vérifier** l'email de bienvenue **RESEND** (2e email)
   - Subject: "Bienvenue sur SEIDO - Votre compte est activé"
   - Design: Template React avec rôle personnalisé
   - Bouton CTA: "Se connecter"
7. **Vérifier** la redirection vers `/auth/login?confirmed=true`
8. **Vérifier** en database :
   - ✅ Profil créé dans `users` (par le trigger)
   - ✅ Équipe créée dans `teams` (nom unique avec UUID)
   - ✅ `email_confirmed_at` rempli
9. **Se connecter** avec les identifiants

### Test 2: Invitation

1. **Inviter** un utilisateur depuis le dashboard gestionnaire
2. **Vérifier** l'email d'invitation (Resend template)
3. **Cliquer** sur le lien → Redirige vers `/auth/confirm?token_hash=...&type=invite`
4. **Vérifier** :
   - ✅ Profil créé dans `users` avec `team_id` existant
   - ✅ PAS de nouvelle équipe (utilise celle fournie)
   - ✅ Redirection vers `/auth/set-password`
5. **Définir** le mot de passe
6. **Se connecter**

### Test 3: Reset Password

1. **Demander** reset password sur `/auth/reset-password`
2. **Vérifier** l'email de réinitialisation
3. **Cliquer** sur le lien → Redirige vers `/auth/confirm?token_hash=...&type=recovery`
4. **Vérifier** :
   - ✅ Redirection vers `/auth/update-password`
5. **Changer** le mot de passe
6. **Se connecter**

---

## 🔍 Vérification Database

### Vérifier que le Trigger est actif

```sql
-- Voir les triggers sur auth.users
SELECT
  tgname as trigger_name,
  proname as function_name,
  tgenabled as is_enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'auth.users'::regclass
AND tgname = 'on_auth_user_confirmed';
```

Résultat attendu :
```
trigger_name: on_auth_user_confirmed
function_name: handle_new_user_confirmed
is_enabled: O (enabled)
```

### Vérifier la création de profil après confirmation

```sql
-- Simuler une confirmation email (pour test uniquement)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'test@example.com'
AND email_confirmed_at IS NULL;

-- Vérifier que le profil est créé
SELECT * FROM users WHERE email = 'test@example.com';

-- Vérifier que l'équipe est créée
SELECT t.* FROM teams t
JOIN users u ON t.created_by = u.id
WHERE u.email = 'test@example.com';
```

---

## 🐛 Troubleshooting

### Problème: Le profil n'est pas créé

**Cause**: Le trigger ne se déclenche pas

**Solution**:
1. Vérifier que le trigger existe (query ci-dessus)
2. Vérifier les logs Supabase pour les erreurs
3. Vérifier que `email_confirmed_at` passe bien de NULL → timestamp

### Problème: Erreur "Team name already exists"

**Cause**: Ancien trigger toujours actif créant des équipes avec même nom

**Solution**:
```sql
-- Désactiver l'ancien trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

### Problème: Email de confirmation non reçu (Resend)

**Cause 1**: RESEND_API_KEY non configuré

**Solution**:
1. Vérifier `.env.local` contient `RESEND_API_KEY`
2. Redémarrer le serveur Next.js : `npm run dev`
3. Vérifier les logs server pour `[RESEND]` warnings

**Cause 2**: SUPABASE_SERVICE_ROLE_KEY manquant

**Solution**:
1. Vérifier `.env.local` contient `SUPABASE_SERVICE_ROLE_KEY`
2. Copier depuis Supabase Dashboard → Project Settings → API
3. Redémarrer le serveur Next.js
4. Vérifier les logs : `❌ [SIGNUP-ACTION] Admin service not configured`

**Cause 3**: Email bloqué par Resend (spam/bounce)

**Solution**:
1. Resend Dashboard → Logs → Trouver l'email
2. Vérifier le statut (delivered, bounced, spam)
3. Si bounced : utiliser un autre email de test

### Problème: Redirect URL non autorisée

**Cause**: `/auth/confirm` pas dans les URLs autorisées

**Solution**:
1. Dashboard → Authentication → URL Configuration
2. Ajouter `http://localhost:3000/auth/confirm` (dev)
3. Ajouter `https://votre-domaine.com/auth/confirm` (prod)

---

## 📊 Résultat Attendu

### Flow Unifié avec Resend ✅

```
┌─────────────────┐
│  SIGNUP FORM    │
│ (User submits)  │
└─────────────────┘
         │
         ▼
┌────────────────────────────┐
│ signupAction()             │
│ - admin.generateLink()     │  ◄── NOUVEAU: Pas d'email Supabase automatique
│ - Crée user dans auth.users│
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ emailService.send          │
│ SignupConfirmationEmail()  │  ◄── ✅ RESEND Template React
│ (email 1: Confirmation)    │
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ User clique lien email     │
│ → /auth/confirm?token=...  │
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ verifyOtp()                │
│ - Confirme email           │
│ - email_confirmed_at ✓     │
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ DATABASE TRIGGER           │  ◄── Déclenché par UPDATE email_confirmed_at
│ - Crée profil (users)      │
│ - Crée équipe (teams)      │
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ emailService.send          │
│ WelcomeEmail()             │  ◄── ✅ RESEND Template React
│ (email 2: Bienvenue)       │      (avec rôle personnalisé)
└────────────────────────────┘
         │
         ▼
┌────────────────────────────┐
│ Redirect /auth/login       │
│ ?confirmed=true            │
└────────────────────────────┘
```

### Avantages

- ✅ **Emails 100% Resend**: Design professionnel, retry automatique, analytics
- ✅ **Templates React personnalisés**: Branding SEIDO unifié, responsive
- ✅ **Un seul point d'entrée**: `/auth/confirm` pour signup/invite/recovery
- ✅ **Profils créés UNIQUEMENT après confirmation**: Pas de données orphelines
- ✅ **Équipes uniques**: Nom basé sur UUID
- ✅ **Pas de duplication code**: Le trigger gère tout
- ✅ **Emails au bon moment**: Confirmation immédiate, bienvenue après confirmation
- ✅ **Support invitations**: Metadata intelligente avec `team_id`
- ✅ **Contrôle total**: Pas d'emails automatiques Supabase non désirés
- ✅ **Type-safe**: TypeScript strict sur tous les templates email

---

## 📝 Checklist de Déploiement

### Infrastructure
- [ ] Migration SQL appliquée (`20251002000001_fix_profile_creation_timing.sql`)
- [ ] Ancien trigger `on_auth_user_created` supprimé
- [ ] Nouveau trigger `on_auth_user_confirmed` actif

### Configuration
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ajouté dans `.env.local` ✅ NOUVEAU
- [ ] `RESEND_API_KEY` configuré dans `.env.local`
- [ ] `NEXT_PUBLIC_APP_URL` défini (dev + prod)
- [ ] Site URL configuré dans Supabase Dashboard
- [ ] Redirect URLs autorisées (`/auth/confirm`)
- [ ] Email confirmation Supabase : Choix Option A (désactivé) ou B (backup)

### Email Templates (Resend)
- [ ] Template signup-confirmation créé ✅ NOUVEAU
- [ ] Template welcome mis à jour (rôle personnalisé)
- [ ] Template invitation existant (déjà configuré)
- [ ] Template password-reset existant (déjà configuré)
- [ ] Template password-changed existant (déjà configuré)

### Tests
- [ ] Test signup complet réussi (2 emails Resend reçus) ✅ NOUVEAU
- [ ] Test invitation complet réussi
- [ ] Test reset password complet réussi
- [ ] Vérification Resend Dashboard (analytics emails)

### Code
- [ ] `supabase-admin.ts` créé ✅ NOUVEAU
- [ ] `signupAction()` modifié (admin.generateLink) ✅ NOUVEAU
- [ ] `/auth/confirm` adapté (welcome email après confirmation) ✅ NOUVEAU
- [ ] Build Next.js sans erreurs TypeScript
- [ ] Logs server affichent bien `[RESEND]` success messages

---

**Date**: 2 octobre 2025
**Version**: 2.0.0 - Migration Resend Complete
**Status**: ✅ Prêt pour déploiement
