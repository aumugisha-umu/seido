# 🚨 DÉPLOIEMENT URGENT : Fix Signup Trigger

**Date** : 2025-10-21
**Priorité** : 🔴 CRITIQUE
**Impact** : Bloque 100% des nouveaux signups en production

---

## ⚡ Quick Start (5 minutes)

### Méthode rapide via Supabase Dashboard

1. **Ouvrir** [Supabase Dashboard](https://supabase.com/dashboard) → Projet SEIDO → SQL Editor

2. **Copier-coller** le contenu du fichier :
   ```
   supabase/migrations/20251021120000_fix_signup_trigger_rls_bypass.sql
   ```

3. **Cliquer** sur **Run** (bouton vert)

4. **Vérifier** les messages de succès :
   ```
   ✅ Trigger on_auth_user_confirmed exists
   ✅ All policies updated successfully
   ```

5. **Tester** immédiatement :
   - Créer un nouveau compte test
   - Confirmer l'email
   - Vérifier la redirection vers le dashboard

**C'est tout !** ✅

---

## 🔍 Que fait ce fix ?

**Problème** :
- Les utilisateurs créent un compte
- Confirment leur email
- **MAIS** leur profil n'est jamais créé dans la base de données
- Ils sont bloqués à l'écran de login

**Cause** :
- Dépendance circulaire entre les RLS policies et le trigger de création de profil
- Les policies bloquent les INSERT car l'utilisateur n'existe pas encore

**Solution** :
- Ajouter un bypass RLS temporaire dans le trigger de signup
- Permet au trigger de créer le profil initial sans être bloqué
- 100% sécurisé (bypass limité au contexte du trigger)

---

## ✅ Checklist post-déploiement

- [ ] Migration appliquée avec succès
- [ ] Messages de vérification affichés (✅ Trigger exists, ✅ Policies updated)
- [ ] Test signup complet effectué
- [ ] Profil créé dans `public.users`
- [ ] Équipe créée dans `public.teams`
- [ ] Appartenance créée dans `public.team_members`
- [ ] Redirection vers dashboard fonctionne
- [ ] Aucun WARNING dans les logs Postgres

---

## 🆘 Support

**Si problème** :
1. Vérifier les logs Postgres dans Supabase Dashboard
2. Consulter la documentation complète : `docs/fixes/signup-trigger-rls-fix.md`
3. Contacter l'équipe tech avec :
   - Logs de la migration
   - Logs Postgres
   - Email de test utilisé

---

## 📋 Logs attendus (succès)

```
✅ [AUTH-CONFIRM] OTP verified for: test@example.com
✅ [AUTH-CONFIRM] Welcome email sent
✅ [AUTH-CONFIRM] User authenticated (profile created by trigger)
✅ [MIDDLEWARE] User authenticated: {uuid}
✅ [MIDDLEWARE] Redirecting to: /gestionnaire/dashboard
```

**Avant** (erreur) :
```
⚠️ [MIDDLEWARE] Auth user exists but no profile in DB
```

**Après** (succès) :
```
✅ [MIDDLEWARE] User authenticated: {uuid}
```

---

**Prêt à déployer ? Let's go! 🚀**
