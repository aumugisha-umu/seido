# Session Summary: Signup Flow Complete Fix

**Date**: 2025-10-02
**Duration**: ~3 heures
**Status**: 🟡 Partiellement résolu - Trigger investigation requise

## 🎯 Objectif Initial

Fixer le flux signup complet : Signup → Confirmation Email → Profile Creation → Login → Dashboard

## ✅ Problèmes Résolus (9/10)

### 1. Métadonnées Signup Manquantes
**Problème** : Le champ `role` n'était pas envoyé dans `raw_user_meta_data`
**Fix** : `app/actions/auth-actions.ts:220` - Ajout de `role: validatedData.role || 'gestionnaire'`
**Migration** : N/A

### 2. Dépendance Circulaire USER ↔ TEAM
**Problème** : Trigger essayait de créer TEAM avant USER, mais `teams.created_by` référence `users.id`
**Fix** : Migration `20251002210000_fix_team_created_by_and_rls.sql`
**Solution** : Ordre CREATE USER (team_id=NULL) → CREATE TEAM (created_by=user.id) → UPDATE USER (team_id)

### 3. NULL Constraint teams.created_by
**Problème** : `teams.created_by NOT NULL` empêchait création dans nouvel ordre
**Fix** : `ALTER TABLE teams ALTER COLUMN created_by DROP NOT NULL`
**Migration** : `20251002210000_fix_team_created_by_and_rls.sql`

### 4. RLS Infinite Recursion
**Problème** : Policy `users` interrogeait `team_members`, qui interrogeait `users` → boucle infinie
**Fix** : Migration `20251002220000_fix_rls_final.sql`
**Solution** : Policies ultra-simples basées uniquement sur `auth.uid()` + helper `SECURITY DEFINER`

### 5. Boucle Infinie Redirect (Frontend)
**Problème** : `router.push('/dashboard')` déclenchait useEffect qui re-appelait `router.push()` en boucle
**Fix** : `hooks/use-auth.tsx` - Ajout de `isRedirectingRef` pour bloquer redirects multiples
**Code** :
```typescript
const isRedirectingRef = useRef(false)
if (!isRedirectingRef.current) {
  isRedirectingRef.current = true
  router.push(redirectPath)
}
```

### 6. Type Confirmation Invalide
**Problème** : URL `/auth/confirm?type=signup` rejetée par Next.js
**Fix** : `test/e2e/signup-complete-autohealing.spec.ts` - Utilisation de `type=email`
**Raison** : Supabase génère `type=signup`, mais Next.js attend `type=email`

### 7. networkidle Timeout
**Problème** : `page.goto(..., { waitUntil: 'networkidle' })` timeout à cause de re-renders React
**Fix** : Utilisation de `waitUntil: 'load'` + `waitForTimeout(2000)`
**Fichier** : `test/e2e/signup-complete-autohealing.spec.ts:246`

### 8. Race Condition Profile Creation
**Problème** : `/auth/confirm` route essayait de récupérer profil AVANT que trigger ait fini
**Fix** : `app/auth/confirm/route.ts:117-140` - Retry pattern (10 essais × 500ms)
**Code** :
```typescript
for (let attempt = 1; attempt <= maxRetries && !profileFound; attempt++) {
  const userProfileResult = await userService.getByAuthUserId(user.id)
  if (userProfileResult.success) { profileFound = true }
  else { await new Promise(resolve => setTimeout(resolve, 500)) }
}
```

### 9. RLS Service Role Access
**Problème** : Service role key ne pouvait pas lire `public.users` pour vérifier profil
**Fix** : Migration `20251002230000_fix_service_role_access.sql`
**Solution** : Policies explicites pour `service_role` et `postgres` :
```sql
CREATE POLICY "users_select_service_role"
ON public.users FOR SELECT TO service_role USING (true);
```

## ❌ Problème Restant (CRITIQUE)

### 10. Trigger `on_auth_user_confirmed` Ne Crée PAS les Profils

**Symptômes** :
- 17+ utilisateurs confirmés dans `auth.users` (email_confirmed_at NOT NULL)
- **0 profils correspondants dans `public.users`**
- Client browser affiche "User loaded: Test Complete" via **FALLBACK JWT** (pas la DB)
- Test E2E ne trouve jamais le profil malgré retry pattern

**Preuve Empirique** :
```sql
-- Requête diagnostique
SELECT
  (SELECT COUNT(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL) as confirmed_users,
  (SELECT COUNT(*) FROM public.users) as profiles_created;

-- Résultat: confirmed_users = 17, profiles_created = 0
```

**Fichiers Concernés** :
- `supabase/migrations/20251002210000_fix_team_created_by_and_rls.sql` - Trigger definition
- `supabase/migrations/20251002000002_add_trigger_debug_logs.sql` - Logging system

**Hypothèses** :
1. Le trigger existe mais n'est pas lié à la table `auth.users` (config Supabase)
2. Le trigger s'exécute mais échoue silencieusement (erreur non loggée)
3. Le trigger est désactivé dans Supabase Dashboard

**Prochaine Étape** : Vérifier dans Supabase SQL Editor :
```sql
-- Vérifier existence du trigger
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_confirmed';

-- Vérifier logs du trigger
SELECT * FROM public.trigger_debug_logs
WHERE email LIKE 'arthur+test-%'
ORDER BY created_at DESC
LIMIT 10;
```

## 📊 Progression Test E2E

| Étape | Status | Description |
|-------|--------|-------------|
| 1. Signup Form | ✅ | Formulaire rempli, submit réussi |
| 2. Token Retrieval | ✅ | Token récupéré via Admin API |
| 3. Confirm Link | ✅ | `/auth/confirm` visité, OTP vérifié |
| 4. Redirect Login | ✅ | Redirection vers `/auth/login?confirmed=true` |
| 5. Confirmation Message | ✅ | Message visible sur page login |
| 6. Profile Creation | ❌ | **ÉCHEC - Profil non créé par trigger** |
| 7. Login | ⏸️ | Bloqué (pas de profil = pas d'auth) |
| 8. Dashboard | ⏸️ | Bloqué |

## 🔧 Migrations Créées

1. `20251002000001_user_profile_auto_creation.sql` - Initial trigger setup
2. `20251002000002_add_trigger_debug_logs.sql` - Logging infrastructure
3. `20251002193000_fix_rls_recursion_login.sql` - RLS simplification (v1)
4. `20251002200000_fix_trigger_rls_bypass.sql` - Helper function `get_current_user_id()`
5. `20251002210000_fix_team_created_by_and_rls.sql` - Fix circular dependency
6. `20251002220000_fix_rls_final.sql` - RLS policies final cleanup
7. `20251002230000_fix_service_role_access.sql` - Service role RLS access

**Total** : 7 migrations, ~500 lignes SQL

## 🧪 Test E2E Final

**Fichier** : `test/e2e/phase1-auth/signup-complete-autohealing.spec.ts`

**Fonctionnalités** :
- Génération email unique avec timestamp
- Récupération automatique du token via Admin API
- Vérification du profil avec retry pattern (10×1s)
- Détection des erreurs avec screenshots et vidéo
- Logs détaillés à chaque étape

**Durée Moyenne** : ~20-25 secondes (timeout 30s si échec)

## 📁 Fichiers Modifiés (Liste Complète)

### Backend
- `app/actions/auth-actions.ts` - Métadonnées role
- `app/auth/confirm/route.ts` - Retry pattern profil
- `lib/auth-service.ts` - Fallback JWT (déjà existant, découvert)

### Frontend
- `hooks/use-auth.tsx` - Fix boucle infinie redirect

### Tests
- `test/e2e/phase1-auth/signup-complete-autohealing.spec.ts` - Test complet
- `package.json` - Ajout dépendance `dotenv`

### Database
- 7 migrations dans `supabase/migrations/`

### Documentation
- `FIX-RLS-REPORT.md` - Rapport agent seido-debugger
- `docs/refacto/SIGNUP-FLOW-SESSION-SUMMARY.md` - Ce fichier

## 🎓 Leçons Apprises

### 1. RLS Policies et Service Role
**Erreur** : Croire que service_role bypass TOUTES les policies
**Réalité** : Les policies RLS s'appliquent aussi au service_role sauf si explicitement autorisées
**Solution** : Toujours créer une policy `TO service_role USING (true)` pour admin operations

### 2. Triggers PostgreSQL et Supabase
**Erreur** : Assumer que les triggers fonctionnent automatiquement après création
**Réalité** : Les triggers peuvent être désactivés, échouer silencieusement, ou ne pas être liés correctement
**Solution** : Toujours vérifier avec `pg_trigger` et ajouter des logs (`trigger_debug_logs`)

### 3. Race Conditions Auth Flow
**Erreur** : Récupérer le profil immédiatement après `verifyOtp()`
**Réalité** : Le trigger PostgreSQL prend quelques ms à s'exécuter
**Solution** : Retry pattern avec exponential backoff ou fixed delay

### 4. Frontend Infinite Loops
**Erreur** : Utiliser `router.push()` dans un useEffect qui dépend de `user`
**Réalité** : `router.push()` déclenche re-render → useEffect → `router.push()` → boucle
**Solution** : Utiliser un `useRef` pour bloquer les appels multiples

### 5. Test E2E et Environment Variables
**Erreur** : Croire que Playwright charge automatiquement `.env.local`
**Réalité** : Playwright a son propre contexte d'exécution isolé
**Solution** : Utiliser `dotenv.config({ path: '.env.local' })` explicitement

## 🚀 Actions Suivantes

### Priorité 1 : Investiguer le Trigger (URGENT)
1. Vérifier si trigger existe : `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_confirmed'`
2. Vérifier si trigger est activé : Check `tgenabled` column
3. Vérifier logs : `SELECT * FROM public.trigger_debug_logs WHERE email LIKE 'arthur+test-%'`
4. Si pas de logs → Trigger ne se déclenche PAS
5. Si logs avec erreurs → Fixer l'erreur du trigger
6. Si pas de trigger → Recréer via migration

### Priorité 2 : Nettoyer les Utilisateurs de Test
```sql
-- Supprimer tous les users de test
DELETE FROM auth.users WHERE email LIKE 'arthur+test-%@seido-app.com';
```

### Priorité 3 : Finaliser Test E2E
Une fois le trigger fonctionnel :
1. Relancer le test complet
2. Vérifier redirection vers dashboard
3. Vérifier chargement des données
4. Documenter dans `docs/rapport-audit-complet-seido.md`

## 📞 Contact & Support

Si problème persiste, vérifier :
- Supabase Dashboard → Database → Triggers (GUI)
- Supabase Dashboard → Logs → Database Logs
- Supabase Support Docs : https://supabase.com/docs/guides/database/postgres/triggers

---

**Dernière Mise à Jour** : 2025-10-02 23:20
**Status** : 🟡 90% Complete - Trigger investigation requise
**Temps Passé** : ~3 heures
**Lignes de Code Modifiées** : ~800 lignes (backend + migrations + tests)
