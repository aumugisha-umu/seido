# ✅ Test Final: Inscription Complète avec RLS Fix

**Date**: 2025-10-02 20:00
**Statut**: ✅ Migration déployée - Prêt à tester

---

## 🎯 Problèmes Résolus

### 1. ✅ Métadonnées `role` manquantes (CORRIGÉ)
- **Fichier**: `app/actions/auth-actions.ts:220`
- **Fix**: Ajout de `role: validatedData.role || 'gestionnaire'`

### 2. ✅ Récursion infinie RLS (CORRIGÉ)
- **Erreur**: `infinite recursion detected in policy for relation "users"`
- **Cause**: Politique sur `team_members` faisait une requête vers `public.users`, créant une boucle
- **Fix**: Migration `20251002200000_fix_trigger_rls_bypass.sql` déployée
  - Fonction helper `get_current_user_id()` qui bypass RLS
  - Politique `team_members_select_own_membership_safe` utilise cette fonction
  - Trigger `handle_new_user_confirmed()` utilise SECURITY DEFINER pour bypass RLS

---

## 🧪 Test Étape par Étape

### Étape 1: Se déconnecter du compte actuel

**Vous êtes actuellement connecté avec**: `arthur+24@seido-app.com`

**Options pour se déconnecter**:

#### Option A: Via l'interface
1. Allez sur `/auth/logout`
2. Vérifiez la redirection vers `/auth/login`

#### Option B: Navigation privée (RECOMMANDÉ)
1. Ouvrez une fenêtre de navigation privée (Ctrl+Shift+N)
2. Continuez le test dans cette fenêtre

---

### Étape 2: Créer un nouveau compte

1. **Aller sur**: `http://localhost:3000/auth/signup`

2. **Remplir le formulaire** avec un **NOUVEL email** (important !):
   ```
   Prénom: Test
   Nom: Final
   Email: test.final@example.com   ← NOUVEL EMAIL
   Role: gestionnaire
   Mot de passe: TestFinal123!
   ```

3. **Cliquer** sur "Créer mon compte"

4. **Vérifier redirection** vers `/auth/signup-success?email=test.final@example.com`

**✅ Log attendu** dans la console serveur:
```
✅ [SIGNUP-ACTION] User created in auth.users: {
  userId: 'xxx-xxx-xxx',
  email: 'test.final@example.com',
  ...
}
✅ [SIGNUP-ACTION] Confirmation email sent successfully via Resend: xxx
```

---

### Étape 3: Confirmer l'email

1. **Consulter les logs Resend** ou votre boîte email

2. **Copier le lien de confirmation** (commence par `http://localhost:3000/auth/confirm?token_hash=...`)

3. **Cliquer sur le lien** ou le coller dans le navigateur

4. **Vérifier les redirections**:
   - `/auth/confirm` → traite la confirmation
   - `/auth/login?confirmed=true` → page de login avec message de succès

**✅ Log attendu** dans la console serveur:
```
✅ [AUTH-CONFIRM] OTP verified for: test.final@example.com
📧 [AUTH-CONFIRM] Email confirmation (signup) for: test.final@example.com
✅ [AUTH-CONFIRM] Welcome email sent: xxx
```

**❌ PLUS de logs d'erreur** avec:
```
❌ Supabase error: {
  code: '42P17',
  message: 'infinite recursion detected in policy for relation "users"'
}
```

---

### Étape 4: Vérifier les logs du trigger dans Supabase

1. **Aller dans Supabase Dashboard** → SQL Editor

2. **Exécuter cette requête**:

```sql
SELECT
  created_at,
  step,
  status,
  message,
  metadata
FROM public.trigger_debug_logs
WHERE email = 'test.final@example.com'
ORDER BY created_at ASC;
```

**✅ Résultat attendu**: Environ 7-8 lignes avec toutes status = 'success':

| created_at | step | status | message |
|------------|------|--------|---------|
| 2025-10-02 20:05:00 | START | success | Trigger started for user confirmation |
| 2025-10-02 20:05:00 | CHECK_EXISTING | success | No existing profile found, proceeding... |
| 2025-10-02 20:05:00 | EXTRACT_METADATA | success | Metadata extracted (INCLUDING role='gestionnaire') |
| 2025-10-02 20:05:00 | VALIDATE_METADATA | success | Metadata validation passed |
| 2025-10-02 20:05:00 | CREATE_TEAM | success | New team created successfully |
| 2025-10-02 20:05:00 | CREATE_PROFILE | success | User profile created successfully (RLS bypassed) |
| 2025-10-02 20:05:00 | COMPLETE | success | Trigger completed successfully |

**❌ Si vous voyez status = 'error'**: Regardez le champ `message` pour identifier le problème.

---

### Étape 5: Vérifier que le profil existe dans la base de données

**Exécuter cette requête** dans Supabase SQL Editor:

```sql
SELECT
  u.id,
  u.auth_user_id,
  u.email,
  u.name,
  u.role,
  u.team_id,
  t.name as team_name
FROM public.users u
LEFT JOIN public.teams t ON u.team_id = t.id
WHERE u.email = 'test.final@example.com';
```

**✅ Résultat attendu**: 1 ligne avec:
- `name` = `Test Final`
- `role` = `gestionnaire`
- `team_id` = UUID valide
- `team_name` = `Test Final's Team`

**❌ Si vide**: Le trigger a échoué, consultez les logs du trigger (Étape 4).

---

### Étape 6: Se connecter avec le nouveau compte

1. **Aller sur**: `http://localhost:3000/auth/login`

2. **Remplir le formulaire**:
   ```
   Email: test.final@example.com
   Mot de passe: TestFinal123!
   ```

3. **Cliquer** sur "Se connecter"

4. **Vérifier redirection** vers `/dashboard/gestionnaire`

**✅ Succès**: Vous voyez le dashboard avec le nom "Test Final" dans l'en-tête.

**❌ Erreur**: Si vous voyez une erreur de connexion, vérifiez:
- Le profil existe dans `public.users` (Étape 5)
- Les logs du trigger (Étape 4)
- Les logs de la console serveur

---

## 📊 Checklist de Validation Finale

- [ ] ✅ Compte créé dans `auth.users`
- [ ] ✅ Email de confirmation reçu et lien cliqué
- [ ] ✅ Email de bienvenue reçu
- [ ] ✅ **Aucune erreur de récursion RLS** dans les logs
- [ ] ✅ Trigger logs montrent toutes étapes en 'success'
- [ ] ✅ Profil créé dans `public.users` avec role='gestionnaire'
- [ ] ✅ Équipe créée dans `public.teams`
- [ ] ✅ Login réussi avec le nouveau compte
- [ ] ✅ Redirection vers `/dashboard/gestionnaire`

---

## 🔍 Si le Test Échoue Encore

### Logs à consulter:

1. **Console serveur Next.js** (terminal où tourne `npm run dev`)
2. **Logs du trigger** (requête SQL ci-dessus)
3. **Logs Resend** (Resend Dashboard → Logs)
4. **Logs Supabase** (Supabase Dashboard → Database → Logs)

### Requêtes de diagnostic rapide:

```sql
-- Vérifier que le helper existe
SELECT proname FROM pg_proc WHERE proname = 'get_current_user_id';

-- Vérifier que la politique existe
SELECT policyname FROM pg_policies
WHERE tablename = 'team_members'
  AND policyname = 'team_members_select_own_membership_safe';

-- Vérifier que le trigger existe
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_confirmed';
```

---

## ✶ Insight: Architecture de Sécurité RLS

**SECURITY DEFINER** permet à une fonction PostgreSQL d'exécuter des requêtes avec les privilèges du **propriétaire de la fonction** plutôt que de l'utilisateur appelant.

**Problème**: Même avec SECURITY DEFINER, les politiques RLS s'appliquent si elles référencent d'autres tables avec RLS, créant une **récursion**.

**Solution appliquée**:
1. **Fonction helper `get_current_user_id()`**: SECURITY DEFINER + accès direct à `public.users` sans déclencher de politique
2. **Politique `team_members_select_own_membership_safe`**: Utilise le helper au lieu d'une sous-requête directe
3. **Trigger `handle_new_user_confirmed()`**: SECURITY DEFINER pour bypass RLS lors de l'INSERT

**Résultat**: Le trigger peut insérer dans `public.users` sans déclencher la récursion, et les utilisateurs peuvent toujours lire leurs propres données via les politiques.

---

**Auteur**: Claude
**Date**: 2025-10-02
**Migration**: `20251002200000_fix_trigger_rls_bypass.sql` (déployée ✅)
