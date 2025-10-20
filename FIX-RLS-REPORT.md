# RAPPORT : Fix RLS Service Role Access

## PROBLÈME INITIAL
Le test E2E signup échouait car le service role key ne pouvait pas lire la table `public.users` pour vérifier la création du profil utilisateur.

## DIAGNOSTIC
1. **Symptôme** : `Retry 1/10: Profile not found yet...` répété jusqu'au timeout
2. **Cause identifiée** : Les policies RLS de la migration `20251002220000_fix_rls_final.sql` ne permettaient qu'aux utilisateurs authentifiés de lire leur propre profil via `auth_user_id = auth.uid()`
3. **Problème** : Le service role key n'a pas de `auth.uid()` donc la policy retourne NULL

## SOLUTION APPLIQUÉE

### Migration créée : `20251002230000_fix_service_role_access.sql`

```sql
-- Allow service_role to read all users (for testing and admin operations)
CREATE POLICY "users_select_service_role"
ON public.users
FOR SELECT
TO service_role
USING (true);

-- Allow postgres role to read all users
CREATE POLICY "users_select_postgres"
ON public.users
FOR SELECT
TO postgres
USING (true);
```

### Résultat
✅ **FIX RLS FONCTIONNEL** : Le service role peut maintenant accéder à la table `users`

## NOUVEAU PROBLÈME DÉCOUVERT

Après avoir résolu le problème RLS, un nouveau problème a été découvert :

**Le trigger `on_auth_user_confirmed` ne crée pas les profils dans `public.users`**

### Preuve
```
Found 17 test users in auth.users
  ⚠️ arthur+test-1759439145234-323@seido.pm → MISSING from public.users (trigger failed?)
  ⚠️ arthur+test-1759438958275-929@seido.pm → MISSING from public.users (trigger failed?)
  ...
```

Les utilisateurs sont bien créés et confirmés dans `auth.users` mais le trigger ne crée pas l'entrée correspondante dans `public.users`.

## SÉCURITÉ

La solution appliquée est **SÉCURISÉE** :
- Les policies `service_role` et `postgres` ne sont accessibles QUE via les clés admin
- Le service role key n'est JAMAIS exposé côté client
- Les utilisateurs authentifiés normaux restent limités à leur propre profil
- Aucune faille de sécurité n'est introduite

## ACTIONS REQUISES

1. ✅ **RLS Fix** : Complété et fonctionnel
2. ❌ **Trigger Fix** : À investiguer - pourquoi le trigger `on_auth_user_confirmed` ne se déclenche pas ?
3. 🔍 **Suggestion** : Vérifier les logs de trigger avec la requête SQL fournie dans les migrations précédentes

## FICHIERS MODIFIÉS
- `supabase/migrations/20251002230000_fix_service_role_access.sql` - Migration RLS
- `test/e2e/phase1-auth/signup-complete-autohealing.spec.ts` - Test modifié pour debug

## TESTS DE VALIDATION
- `test-rls-direct.js` - Script de test direct créé pour validation
- Confirmé que le service role peut maintenant lire 19 utilisateurs dans la base

## CONCLUSION

Le problème RLS est résolu. Le test E2E échoue maintenant pour une autre raison : le trigger de création automatique du profil utilisateur ne fonctionne pas. Cela nécessite une investigation séparée du système de triggers Supabase.