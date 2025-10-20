# 🔍 Guide de Diagnostic du Trigger de Création de Profil

## 📋 Contexte

**Problème**: Après confirmation de l'email, l'utilisateur est redirigé avec succès vers `/auth/login?confirmed=true`, mais aucun profil utilisateur ni équipe n'est créé dans la base de données.

**Objectif**: Identifier pourquoi le trigger `on_auth_user_confirmed` ne crée pas le profil et l'équipe.

---

## 🎯 Plan d'Action

### Phase 1: Diagnostic avec SQL (Supabase Dashboard)

1. **Aller dans Supabase Dashboard → SQL Editor**
2. **Copier le contenu du fichier** `supabase/migrations/diagnostic_trigger_issue.sql`
3. **Exécuter chaque requête une par une** (pas toutes ensemble)
4. **Noter les résultats** pour chaque étape

---

## 📊 Requêtes de Diagnostic (À exécuter dans l'ordre)

### 1️⃣ Vérifier que le trigger existe

```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing,
  action_orientation
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_confirmed';
```

**✅ Résultat attendu**: 1 ligne avec `trigger_name = 'on_auth_user_confirmed'`
**❌ Si vide**: Le trigger n'existe pas → besoin de le redéployer

---

### 2️⃣ Vérifier que la fonction existe

```sql
SELECT
  proname as function_name,
  prosecdef as is_security_definer,
  provolatile as volatility
FROM pg_proc
WHERE proname = 'handle_new_user_confirmed';
```

**✅ Résultat attendu**: 1 ligne avec `function_name = 'handle_new_user_confirmed'`
**❌ Si vide**: La fonction n'existe pas → besoin de la redéployer

---

### 3️⃣ Vérifier l'état de votre utilisateur test

**⚠️ IMPORTANT: Remplacez `'votre.email@example.com'` par l'email que vous avez utilisé pour le test**

```sql
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name,
  raw_user_meta_data->>'role' as role,
  raw_user_meta_data->>'team_id' as team_id
FROM auth.users
WHERE email = 'REMPLACER-PAR-VOTRE-EMAIL';
```

**Ce qu'on cherche**:
- ✅ `email_confirmed_at` IS NOT NULL → confirmation OK
- ✅ `first_name` et `last_name` existent → metadata OK
- ❌ Si `email_confirmed_at` IS NULL → confirmation n'a pas eu lieu
- ❌ Si `first_name` ou `last_name` sont NULL → metadata manquantes (trigger ne peut pas créer profil)

---

### 4️⃣ Vérifier si le profil existe

**⚠️ IMPORTANT: Remplacez `'UUID-DE-AUTH-USER'` par l'`id` obtenu à l'étape 3**

```sql
SELECT
  id,
  auth_user_id,
  email,
  name,
  role,
  team_id,
  created_at
FROM public.users
WHERE auth_user_id = 'REMPLACER-PAR-UUID-ETAPE-3';
```

**Ce qu'on cherche**:
- ✅ Si 1 ligne → profil créé avec succès (problème résolu!)
- ❌ Si vide → trigger a échoué ou n'a pas été exécuté

---

### 5️⃣ Voir les logs de debug du trigger

```sql
SELECT * FROM public.view_recent_trigger_logs();
```

**Ce que ça montre**:
- Toutes les étapes du trigger (START, CHECK_EXISTING, EXTRACT_METADATA, etc.)
- Le statut de chaque étape ('success', 'error', 'warning')
- Les messages d'erreur détaillés si le trigger échoue
- Les métadonnées à chaque étape

**🔍 Analyser les logs**:
- Trouvez les lignes avec `status = 'error'`
- Regardez le champ `message` pour comprendre l'erreur
- Vérifiez le champ `metadata` pour voir les valeurs au moment de l'erreur

---

## 🧪 Phase 2: Test avec un nouveau compte

### Étape A: Créer un nouveau compte test

1. **Aller sur** `http://localhost:3000/auth/signup`
2. **Utiliser un nouvel email** (pas celui déjà testé)
3. **Remplir le formulaire**:
   - Prénom: `Test`
   - Nom: `Debug`
   - Email: `test.debug@example.com`
   - Role: `gestionnaire`
   - Mot de passe: `TestDebug123!`
4. **Cliquer sur "Créer mon compte"**
5. **Vérifier la redirection** vers `/auth/signup-success`

### Étape B: Confirmer l'email

1. **Consulter votre boîte email** (ou les logs Resend si email de test)
2. **Cliquer sur le lien de confirmation** dans l'email
3. **Vérifier la redirection** vers `/auth/callback` puis `/auth/login?confirmed=true`

### Étape C: Vérifier les logs immédiatement

**Dans Supabase Dashboard → SQL Editor**, exécutez:

```sql
-- Voir les 20 derniers logs du trigger
SELECT
  created_at,
  email,
  step,
  status,
  message,
  metadata
FROM public.trigger_debug_logs
ORDER BY created_at DESC
LIMIT 20;
```

**Ce qu'on cherche**:
- Des lignes avec `email = 'test.debug@example.com'`
- Le statut de chaque étape du trigger
- Les erreurs éventuelles

---

## 📊 Interprétation des Résultats

### Scénario 1: Le trigger n'existe pas (étape 1 ou 2 vide)

**Solution**:
```bash
npx supabase db push --include-all
```

---

### Scénario 2: Les métadonnées sont vides (étape 3)

**Symptôme**: `first_name` et `last_name` sont NULL dans `auth.users.raw_user_meta_data`

**Cause probable**: Le formulaire de signup ne passe pas les métadonnées à Supabase

**Solution**: Vérifier dans `app/actions/auth-actions.ts` la fonction `signupAction`:

```typescript
const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
  type: 'signup',
  email: validatedData.email,
  password: validatedData.password,
  options: {
    data: {
      first_name: validatedData.firstName,  // ← Vérifier que ces lignes existent
      last_name: validatedData.lastName,
      role: validatedData.role || 'gestionnaire'
    }
  }
})
```

---

### Scénario 3: Le trigger échoue avec une erreur (logs montrent 'error')

**Regarder le champ `message` dans les logs**:

#### Erreur: "Missing required metadata: first_name or last_name is empty"
→ Les métadonnées ne sont pas passées correctement (voir Scénario 2)

#### Erreur: "Foreign key violation (invalid team_id?)"
→ Le `team_id` dans les métadonnées pointe vers une équipe qui n'existe pas
→ Solution: Vérifier la logique de création d'équipe

#### Erreur: "Unique constraint violation (duplicate profile)"
→ Un profil existe déjà pour cet `auth_user_id`
→ Solution: Nettoyer les doublons ou modifier le trigger pour gérer les duplicata

#### Erreur: "NOT NULL constraint violation"
→ Une colonne obligatoire est NULL
→ Regarder `metadata.column_name` dans les logs pour savoir quelle colonne
→ Solution: Ajouter une valeur par défaut ou modifier le schéma

---

### Scénario 4: Pas de logs du tout pour le nouvel utilisateur

**Symptôme**: `SELECT * FROM view_recent_trigger_logs()` ne montre aucune ligne avec `email = 'test.debug@example.com'`

**Causes possibles**:
1. Le trigger ne s'est pas exécuté du tout
2. L'email n'a pas été confirmé (vérifier `email_confirmed_at` à l'étape 3)
3. Le trigger existe mais est désactivé

**Solution**:
```sql
-- Vérifier le statut du trigger
SELECT * FROM pg_trigger
WHERE tgname = 'on_auth_user_confirmed';
```

Si `tgenabled = 'D'` → trigger désactivé, réactiver avec:
```sql
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_confirmed;
```

---

## 🛠️ Solutions Rapides

### Si le profil n'est pas créé mais l'utilisateur existe dans auth.users

**Créer le profil manuellement** (temporaire):

```sql
DO $$
DECLARE
  v_auth_user_id uuid := 'UUID-DE-AUTH-USER'; -- REMPLACER
  v_email text := 'votre.email@example.com';
  v_first_name text := 'Prénom';
  v_last_name text := 'Nom';
  v_role text := 'gestionnaire';
  v_team_id uuid;
BEGIN
  -- Créer l'équipe
  INSERT INTO public.teams (name)
  VALUES (v_first_name || ' ' || v_last_name || '''s Team')
  RETURNING id INTO v_team_id;

  -- Créer le profil
  INSERT INTO public.users (
    auth_user_id,
    email,
    name,
    role,
    team_id
  ) VALUES (
    v_auth_user_id,
    v_email,
    v_first_name || ' ' || v_last_name,
    v_role,
    v_team_id
  );

  RAISE NOTICE 'Profil créé avec succès: team_id = %', v_team_id;
END $$;
```

---

## 📞 Prochaines Étapes

1. **Exécutez les requêtes de diagnostic** (étapes 1-5)
2. **Notez les résultats** de chaque étape
3. **Créez un nouveau compte test** (Phase 2)
4. **Consultez les logs immédiatement** après confirmation
5. **Envoyez-moi les résultats** pour que je puisse identifier la cause exacte

---

## 🔗 Fichiers Importants

- **Trigger instrumenté**: `supabase/migrations/20251002000002_add_trigger_debug_logs.sql`
- **Requêtes de diagnostic**: `supabase/migrations/diagnostic_trigger_issue.sql`
- **Fonction signup**: `app/actions/auth-actions.ts` (ligne ~230)
- **Page callback**: `app/auth/callback/page.tsx` (ligne ~103)

---

## ✅ Checklist de Validation

- [ ] Trigger `on_auth_user_confirmed` existe (étape 1)
- [ ] Fonction `handle_new_user_confirmed` existe (étape 2)
- [ ] Utilisateur test a `email_confirmed_at` NOT NULL (étape 3)
- [ ] Utilisateur test a `first_name` et `last_name` dans metadata (étape 3)
- [ ] Logs de trigger montrent des étapes pour l'utilisateur test (étape 5)
- [ ] Si erreur dans logs → identifier le message d'erreur exact
- [ ] Profil existe dans `public.users` (étape 4)
- [ ] Équipe existe dans `public.teams` (visible via logs ou étape 4)

---

**Date de création**: 2025-10-02
**Statut**: Migration de debug déployée, prêt pour les tests
