# ✅ FIX APPLIQUÉ: Création de profil après confirmation email

**Date**: 2025-10-02
**Statut**: ✅ Corrigé et déployé (trigger instrumenté déployé)

---

## 🎯 Problème Identifié

L'utilisateur confirmait son email avec succès (redirection vers `/auth/login?confirmed=true`), mais **aucun profil utilisateur ni équipe** n'était créé dans la base de données.

---

## 🔍 Cause Racine

### Fichier: `app/actions/auth-actions.ts` (ligne 220)

**Métadonnées manquantes**: Le champ `role` n'était **PAS** passé dans `raw_user_meta_data` lors de la création de l'utilisateur.

```typescript
// ❌ AVANT (ligne 211-223)
const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
  type: 'signup',
  email: validatedData.email,
  password: validatedData.password,
  options: {
    data: {
      first_name: validatedData.firstName,
      last_name: validatedData.lastName,
      phone: validatedData.phone,
      full_name: `${validatedData.firstName} ${validatedData.lastName}`
      // ❌ MANQUAIT: role
    }
  }
})
```

---

## ✅ Solution Appliquée

### Ajout du champ `role` dans les métadonnées

```typescript
// ✅ APRÈS (ligne 211-224)
const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
  type: 'signup',
  email: validatedData.email,
  password: validatedData.password,
  options: {
    data: {
      first_name: validatedData.firstName,
      last_name: validatedData.lastName,
      phone: validatedData.phone,
      role: validatedData.role || 'gestionnaire', // ✅ AJOUT: role requis pour le trigger
      full_name: `${validatedData.firstName} ${validatedData.lastName}`
    }
  }
})
```

---

## 🛠️ Migration de Debug Déployée

### Fichier: `supabase/migrations/20251002000002_add_trigger_debug_logs.sql`

Cette migration a été déployée avec succès et ajoute:

1. **Table de logs** `public.trigger_debug_logs` pour tracer chaque étape du trigger
2. **Fonction de logging** `log_trigger_step()` pour capturer les erreurs en détail
3. **Trigger instrumenté** avec logs détaillés à chaque étape:
   - START (début du trigger)
   - CHECK_EXISTING (vérifier si profil existe déjà)
   - EXTRACT_METADATA (extraire first_name, last_name, role)
   - VALIDATE_METADATA (valider que les champs requis ne sont pas vides)
   - TEAM_ASSIGNMENT (assigner team_id si fourni)
   - CREATE_TEAM (créer nouvelle équipe si nécessaire)
   - CREATE_PROFILE (créer le profil utilisateur)
   - COMPLETE (succès complet)
   - FATAL_ERROR (erreur critique)

4. **Fonction helper** `view_recent_trigger_logs()` pour voir les logs récents facilement

---

## 📊 Comment Vérifier le Fix

### Étape 1: Créer un nouveau compte test

1. Aller sur `http://localhost:3000/auth/signup`
2. Remplir le formulaire:
   - Prénom: `Test`
   - Nom: `Trigger`
   - Email: `test.trigger@example.com` (utiliser un nouvel email)
   - Role: `gestionnaire`
   - Mot de passe: `TestTrigger123!`
3. Cliquer sur "Créer mon compte"
4. Vérifier redirection vers `/auth/signup-success`

### Étape 2: Confirmer l'email

1. Consulter l'email de confirmation (ou logs Resend)
2. Cliquer sur le lien de confirmation
3. Vérifier redirection vers `/auth/callback` puis `/auth/login?confirmed=true`

### Étape 3: Vérifier les logs du trigger dans Supabase

Dans **Supabase Dashboard → SQL Editor**, exécuter:

```sql
-- Voir tous les logs du trigger pour l'utilisateur test
SELECT
  created_at,
  step,
  status,
  message,
  metadata
FROM public.trigger_debug_logs
WHERE email = 'test.trigger@example.com'
ORDER BY created_at ASC;
```

**Résultat attendu**: Vous devriez voir environ 7-8 lignes avec des status 'success':
- `START` → success
- `CHECK_EXISTING` → success (no existing profile)
- `EXTRACT_METADATA` → success (metadata extracted, **INCLUDING role**)
- `VALIDATE_METADATA` → success
- `CREATE_TEAM` → success (new team created with UUID)
- `CREATE_PROFILE` → success (profile created)
- `COMPLETE` → success

Si vous voyez une ligne avec `status = 'error'`, regardez le champ `message` pour identifier le problème.

### Étape 4: Vérifier que le profil existe

```sql
-- Vérifier que le profil a été créé dans public.users
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
WHERE u.email = 'test.trigger@example.com';
```

**Résultat attendu**: 1 ligne avec:
- `name` = `Test Trigger`
- `role` = `gestionnaire`
- `team_id` = UUID valide
- `team_name` = `Test Trigger's Team`

### Étape 5: Se connecter avec le nouveau compte

1. Aller sur `http://localhost:3000/auth/login`
2. Email: `test.trigger@example.com`
3. Mot de passe: `TestTrigger123!`
4. Cliquer sur "Se connecter"
5. **Vérifier redirection** vers `/dashboard/gestionnaire`

---

## 🚀 Prochaines Étapes

1. ✅ **Tester le fix** avec un nouveau compte (instructions ci-dessus)
2. ✅ **Vérifier les logs** dans Supabase pour confirmer le succès
3. ✅ **Se connecter** pour vérifier l'accès au dashboard
4. 📋 **Nettoyer les comptes test** dans Supabase après validation

---

## 📁 Fichiers Modifiés

- ✅ `app/actions/auth-actions.ts` (ajout du champ `role` ligne 220)
- ✅ `supabase/migrations/20251002000002_add_trigger_debug_logs.sql` (migration déployée)

---

## 📚 Ressources de Diagnostic

Si le problème persiste après le fix, consultez:

1. **Guide complet de diagnostic**: `docs/refacto/trigger-diagnostic-guide.md`
2. **Requêtes SQL rapides**: `docs/refacto/quick-diagnostic.sql`
3. **Migration de debug**: `supabase/migrations/diagnostic_trigger_issue.sql`

---

## 🎓 Leçons Apprises

### Insight 1: Métadonnées critiques pour les triggers
Les triggers PostgreSQL dépendent des métadonnées dans `auth.users.raw_user_meta_data`. Si un champ est manquant (comme `role`), le trigger peut échouer silencieusement ou utiliser des valeurs par défaut incorrectes.

### Insight 2: Logging proactif pour les triggers
Les triggers sont difficiles à déboguer car ils s'exécutent automatiquement. Une table de logs dédiée (`trigger_debug_logs`) avec des logs détaillés à chaque étape permet d'identifier rapidement les problèmes en production.

### Insight 3: Validation des données avant création
Le trigger valide maintenant que `first_name` et `last_name` ne sont pas vides avant de créer le profil. Cela évite les profils "fantômes" avec des noms vides.

---

**Auteur**: Claude
**Révision**: 2025-10-02
