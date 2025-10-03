# ✅ Test Final V2: Inscription Complète (Ordre de Création Corrigé)

**Date**: 2025-10-02 21:00
**Statut**: ✅ Migration déployée - Prêt à tester

---

## 🎯 Problèmes Résolus dans Cette Version

### 1. ✅ Métadonnées `role` manquantes
- **Fichier**: `app/actions/auth-actions.ts:220`
- **Fix**: Ajout de `role: validatedData.role || 'gestionnaire'`

### 2. ✅ Ordre de création incorrect (USER vs TEAM)
- **Erreur précédente**: `null value in column "created_by" of relation "teams" violates not-null constraint`
- **Cause**: Le trigger créait la TEAM avant le USER, mais `teams.created_by` référence `users.id` (NOT NULL)
- **Fix**: Migration `20251002210000_fix_team_created_by_and_rls.sql`
  - Rendu `teams.created_by` NULLABLE
  - Changé l'ordre: **USER** → **TEAM** → **UPDATE USER**
  - 1) Créer user avec `team_id = NULL`
  - 2) Créer team avec `created_by = user.id`
  - 3) Mettre à jour user avec `team_id`

### 3. ✅ Récursion infinie RLS
- **Erreur précédente**: `infinite recursion detected in policy for relation "users"`
- **Cause**: Politique sur `users` référençait `team_members`, qui référençait `users` (boucle)
- **Fix**: Simplification des politiques RLS
  - Policy `users_can_read_own_profile`: Simple check `auth_user_id = auth.uid()`
  - Policy `team_members_read_own`: Temporairement permissive (`true`) pour éviter récursion

---

## 🧪 Test Manuel Complet

### ⚠️ Prérequis: Se Déconnecter

**Vous êtes connecté avec**: `arthur+24@seido.pm` (ou arthur+30 ou arthur+31)

**Options**:

#### Option A: Déconnexion via l'interface
```
http://localhost:3000/auth/logout
```

#### Option B: Navigation privée (RECOMMANDÉ)
- Ouvrir une fenêtre de navigation privée (Ctrl+Shift+N)
- Tous les tests dans cette fenêtre

---

### Étape 1: Créer un Nouveau Compte

1. **URL**: `http://localhost:3000/auth/signup`

2. **Formulaire** (utiliser un **NOUVEL email**):
   ```
   Prénom: Arthur
   Nom: Test32
   Email: arthur+32@seido.pm   ← NOUVEL EMAIL
   Role: gestionnaire
   Mot de passe: Password123!
   ```

3. **Accepter les conditions** (cocher la checkbox)

4. **Cliquer** sur "Créer mon compte"

5. **Résultat attendu**:
   - ✅ Redirection vers `/auth/signup-success?email=arthur%2B32%40seido.pm`
   - ✅ Message: "Un email de confirmation a été envoyé"

**Logs serveur attendus**:
```
✅ [SIGNUP-ACTION] User created in auth.users: {
  userId: 'xxx-xxx',
  email: 'arthur+32@seido.pm',
  hasActionLink: true
}
✅ [SIGNUP-ACTION] Confirmation email sent successfully via Resend: xxx
```

---

### Étape 2: Confirmer l'Email

1. **Consulter l'email** ou les logs Resend Dashboard

2. **Cliquer sur le lien** de confirmation (ou copier-coller l'URL)
   ```
   http://localhost:3000/auth/confirm?token_hash=...&type=email
   ```

3. **Redirections attendues**:
   - `/auth/confirm` → traite la confirmation
   - `/auth/login?confirmed=true` → page de login

**Logs serveur attendus**:
```
✅ [AUTH-CONFIRM] OTP verified for: arthur+32@seido.pm
📧 [AUTH-CONFIRM] Email confirmation (signup) for: arthur+32@seido.pm
✅ [AUTH-CONFIRM] Welcome email sent: xxx
```

**❌ PLUS d'erreurs** du type:
```
❌ Supabase error: { code: '42P17', message: 'infinite recursion...' }
❌ Error creating user profile: null value in column "created_by"...
```

---

### Étape 3: Vérifier les Logs du Trigger (CRUCIAL)

**Aller dans Supabase Dashboard → SQL Editor**

**Exécuter cette requête**:

```sql
SELECT
  created_at,
  step,
  status,
  message,
  metadata
FROM public.trigger_debug_logs
WHERE email = 'arthur+32@seido.pm'
ORDER BY created_at ASC;
```

**✅ Résultat attendu**: Environ 9-10 lignes avec toutes `status = 'success'`

| created_at | step | status | message | metadata (clés importantes) |
|------------|------|--------|---------|------------------------------|
| 2025-10-02 21:05 | START | success | Trigger started | email_confirmed_at, raw_user_meta_data |
| 2025-10-02 21:05 | CHECK_EXISTING | success | No existing profile found | - |
| 2025-10-02 21:05 | EXTRACT_METADATA | success | Metadata extracted | first_name='Arthur', last_name='Test32', **role='gestionnaire'** |
| 2025-10-02 21:05 | VALIDATE_METADATA | success | Metadata validation passed | - |
| 2025-10-02 21:05 | CREATE_PROFILE_TEMP | success | User profile created temporarily | user_id (UUID), user_name='Arthur Test32' |
| 2025-10-02 21:05 | CREATE_TEAM | success | New team created successfully | team_id (UUID), team_name="Arthur Test32's Team", **created_by (UUID)** |
| 2025-10-02 21:05 | UPDATE_PROFILE_TEAM | success | User profile updated with team_id | user_id, team_id |
| 2025-10-02 21:05 | COMPLETE | success | Trigger completed successfully | profile_created=true, team_id |

**Points clés à vérifier**:
- ✅ `EXTRACT_METADATA` montre `role='gestionnaire'` dans metadata
- ✅ `CREATE_PROFILE_TEMP` réussit (user créé avec team_id=NULL)
- ✅ `CREATE_TEAM` réussit avec `created_by` (UUID du user)
- ✅ `UPDATE_PROFILE_TEAM` réussit (user mis à jour avec team_id)
- ✅ `COMPLETE` avec succès

**❌ Si vous voyez status='error'**:
- Regardez le champ `message` pour identifier le problème exact
- Copiez les logs et envoyez-les moi

---

### Étape 4: Vérifier le Profil et l'Équipe dans la Base

**Requête 1: Vérifier le profil utilisateur**

```sql
SELECT
  u.id,
  u.auth_user_id,
  u.email,
  u.name,
  u.role,
  u.team_id,
  u.created_at
FROM public.users u
WHERE u.email = 'arthur+32@seido.pm';
```

**✅ Résultat attendu**: 1 ligne avec
- `name` = `Arthur Test32`
- `role` = `gestionnaire`
- `team_id` = UUID valide (NOT NULL)

**Requête 2: Vérifier l'équipe créée**

```sql
SELECT
  t.id,
  t.name,
  t.created_by,
  t.created_at,
  u.name as created_by_name
FROM public.teams t
LEFT JOIN public.users u ON t.created_by = u.id
WHERE t.id = (
  SELECT team_id FROM public.users WHERE email = 'arthur+32@seido.pm'
);
```

**✅ Résultat attendu**: 1 ligne avec
- `name` = `Arthur Test32's Team`
- `created_by` = UUID du user (NOT NULL maintenant!)
- `created_by_name` = `Arthur Test32`

**Requête 3: Vérifier la cohérence complète**

```sql
SELECT
  u.email,
  u.name as user_name,
  u.role,
  t.name as team_name,
  t.created_by,
  (u.id = t.created_by) as user_is_team_creator
FROM public.users u
LEFT JOIN public.teams t ON u.team_id = t.id
WHERE u.email = 'arthur+32@seido.pm';
```

**✅ Résultat attendu**:
- `user_is_team_creator` = `true` (l'utilisateur a créé sa propre équipe)

---

### Étape 5: Se Connecter avec le Nouveau Compte

1. **URL**: `http://localhost:3000/auth/login`

2. **Formulaire**:
   ```
   Email: arthur+32@seido.pm
   Mot de passe: Password123!
   ```

3. **Cliquer** sur "Se connecter"

4. **Résultat attendu**:
   - ✅ Redirection vers `/dashboard/gestionnaire`
   - ✅ Nom affiché dans l'en-tête: "Arthur Test32"
   - ✅ Dashboard accessible sans erreur

**Logs serveur attendus**:
```
✅ [LOGIN-ACTION] User authenticated successfully
✅ [LOGIN-ACTION] Redirecting to: /dashboard/gestionnaire
```

**❌ Si erreur de connexion**:
- Vérifier que le profil existe (Étape 4, Requête 1)
- Vérifier les logs du trigger (Étape 3)
- Consulter les logs serveur Next.js

---

## 📊 Checklist de Validation Complète

- [ ] ✅ Compte créé dans `auth.users` avec `email_confirmed_at` NOT NULL
- [ ] ✅ Email de confirmation reçu avec lien correct
- [ ] ✅ Lien de confirmation fonctionne (redirection vers `/auth/login?confirmed=true`)
- [ ] ✅ Email de bienvenue reçu
- [ ] ✅ **Logs du trigger** montrent toutes étapes en 'success'
- [ ] ✅ **Logs du trigger** montrent `role='gestionnaire'` extrait
- [ ] ✅ **Logs du trigger** montrent ordre correct: CREATE_PROFILE_TEMP → CREATE_TEAM → UPDATE_PROFILE_TEAM
- [ ] ✅ **AUCUNE erreur** "infinite recursion" dans les logs Supabase
- [ ] ✅ **AUCUNE erreur** "null value in column created_by" dans les logs Supabase
- [ ] ✅ Profil créé dans `public.users` avec `role='gestionnaire'` et `team_id` NOT NULL
- [ ] ✅ Équipe créée dans `public.teams` avec `created_by` NOT NULL
- [ ] ✅ Cohérence: `users.id = teams.created_by` (utilisateur a créé sa propre équipe)
- [ ] ✅ Login réussi avec le nouveau compte
- [ ] ✅ Dashboard `/dashboard/gestionnaire` accessible

---

## 🔍 Si le Test Échoue ENCORE

### Logs à Consulter (par ordre de priorité)

1. **Logs du trigger** (Étape 3) - Le plus important!
   - Identifier l'étape qui échoue (`status='error'`)
   - Lire le `message` et `metadata` de cette étape

2. **Logs Supabase Database** (Dashboard → Database → Logs)
   - Filtrer par niveau: ERROR, WARNING
   - Rechercher: `arthur+32@seido.pm`

3. **Console serveur Next.js** (terminal où `npm run dev` tourne)
   - Rechercher: `[SIGNUP-ACTION]`, `[AUTH-CONFIRM]`

4. **Logs Resend** (Resend Dashboard → Logs)
   - Vérifier que les 2 emails ont été envoyés (confirmation + bienvenue)

### Requêtes de Diagnostic Supplémentaires

```sql
-- Vérifier que les nouvelles politiques existent
SELECT policyname, tablename
FROM pg_policies
WHERE policyname IN (
  'users_can_read_own_profile',
  'team_members_read_own'
);

-- Vérifier que teams.created_by est NULLABLE maintenant
SELECT
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'teams'
  AND column_name = 'created_by';
-- Résultat attendu: is_nullable = 'YES'

-- Vérifier que le trigger existe et pointe vers la bonne fonction
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_confirmed';
```

---

## ✶ Insight: Architecture de Création USER ↔ TEAM

**Problème classique "Chicken and Egg"**:
- `users.team_id` référence `teams.id`
- `teams.created_by` référence `users.id`
- **Impossible de créer l'un sans l'autre** si les deux sont NOT NULL!

**Solution implémentée**:

1. **Rendre `teams.created_by` NULLABLE** (contrainte relâchée temporairement)
2. **Ordre de création en 3 étapes**:
   ```
   1. INSERT INTO users (..., team_id = NULL)  → Retourne user.id
   2. INSERT INTO teams (..., created_by = user.id)  → Retourne team.id
   3. UPDATE users SET team_id = team.id WHERE id = user.id
   ```
3. **Résultat**: User et Team existent tous les deux avec références complètes

**Pourquoi c'est sûr**:
- Le trigger s'exécute dans une **transaction PostgreSQL** (ATOMIC)
- Si une étape échoue, **toute la transaction est annulée** (ROLLBACK)
- Soit les 3 étapes réussissent, soit aucune n'est commitée
- Pas de données incohérentes possibles

---

## 📁 Fichiers de Cette Migration

### Migration Déployée
- ✅ [supabase/migrations/20251002210000_fix_team_created_by_and_rls.sql](supabase/migrations/20251002210000_fix_team_created_by_and_rls.sql)

### Migrations Précédentes (toujours actives)
- ✅ [supabase/migrations/20251002000002_add_trigger_debug_logs.sql](supabase/migrations/20251002000002_add_trigger_debug_logs.sql) - Système de logging
- ✅ [app/actions/auth-actions.ts:220](app/actions/auth-actions.ts#L220) - Ajout du champ `role`

---

**Auteur**: Claude
**Date**: 2025-10-02 21:00
**Migration**: `20251002210000_fix_team_created_by_and_rls.sql` ✅
**Statut**: Prêt à tester - Ordre de création corrigé
