# Test Plan - Signup Flow Fix

**Date**: 2025-10-03
**Fixes Applied**: Route dashboard + team_members insertion

---

## ✅ Modifications Effectuées

### 1. Route Dashboard Corrigée
**Avant**: `/dashboard/gestionnaire` (404)
**Après**: `/gestionnaire/dashboard` (200 OK)

**Fichier**: `app/auth/confirm/route.ts` ligne 274

### 2. Insertion team_members Ajoutée
**Code ajouté** (lignes 227-241):
```typescript
// 4. Ajouter l'utilisateur comme admin de son équipe dans team_members
const { error: memberError } = await supabaseAdmin
  .from('team_members')
  .insert({
    team_id: teamId,
    user_id: userProfileId,
    role: 'admin',
    joined_at: new Date().toISOString()
  })
```

### 3. URL Email Dashboard Corrigée
**Avant**: `${EMAIL_CONFIG.appUrl}/dashboard/${userRole}`
**Après**: `${EMAIL_CONFIG.appUrl}/${userRole}/dashboard`

**Fichier**: `app/auth/confirm/route.ts` ligne 255

---

## 🧪 Plan de Test

### Test 1: Nouveau Signup
1. Aller sur `/auth/signup`
2. Remplir formulaire:
   - Email: `arthur+test04@seido.pm`
   - Password: `TestComplete2025!`
   - First Name: `Arthur`
   - Last Name: `Test`
   - Accept terms
3. Soumettre → redirection vers `/auth/signup-success`

### Test 2: Email Confirmation
1. Copier le `token_hash` des logs server
2. Visiter `/auth/confirm?token_hash=XXX&type=email`
3. **Vérifier logs**:
   - `✅ [AUTH-CONFIRM] Profile created`
   - `✅ [AUTH-CONFIRM] Team created`
   - `✅ [AUTH-CONFIRM] Profile updated with team_id`
   - `✅ [AUTH-CONFIRM] User added to team_members as admin` ← **NOUVEAU**
   - `✅ [AUTH-CONFIRM] User authenticated and profile created, redirecting to: /gestionnaire/dashboard` ← **CORRIGÉ**
4. **Vérifier redirection**: Doit aller vers `/gestionnaire/dashboard` (200 OK, pas 404)

### Test 3: Vérification Base de Données

#### Requête SQL à exécuter:
```sql
-- 1. Vérifier profil utilisateur
SELECT id, email, name, role, team_id
FROM users
WHERE email = 'arthur+test04@seido.pm';

-- 2. Vérifier team créée
SELECT t.id, t.name, t.created_by, u.email as creator_email
FROM teams t
JOIN users u ON t.created_by = u.id
WHERE u.email = 'arthur+test04@seido.pm';

-- 3. Vérifier team_members (CRITIQUE - doit avoir 1 row)
SELECT tm.id, tm.team_id, tm.user_id, tm.role, tm.joined_at,
       u.email as user_email, t.name as team_name
FROM team_members tm
JOIN users u ON tm.user_id = u.id
JOIN teams t ON tm.team_id = t.id
WHERE u.email = 'arthur+test04@seido.pm';
```

**Résultat attendu**:
- Query 1: 1 row (user avec team_id non NULL)
- Query 2: 1 row (team "Équipe de Arthur")
- Query 3: **1 row** (team_member avec role='admin') ← **NOUVEAU FIX**

### Test 4: Dashboard Fonctionnel
1. Sur `/gestionnaire/dashboard`, vérifier:
   - ✅ Page charge sans erreur (200 OK)
   - ✅ Logs affichent: `📦 [DASHBOARD] Teams count: 1` (au lieu de 0)
   - ✅ Nom d'équipe affiché
   - ✅ Stats visibles (même si à zéro car pas de data encore)
   - ✅ Pas de message "ℹ️ User is not member of any team"

### Test 5: Email de Bienvenue
1. Vérifier email reçu via Resend
2. Vérifier lien CTA contient: `http://localhost:3000/gestionnaire/dashboard` (pas `/dashboard/gestionnaire`)
3. Cliquer sur lien → doit rediriger vers dashboard (200 OK)

---

## 📊 Checklist de Validation

**Avant fix**:
- ❌ Redirection 404 vers `/dashboard/gestionnaire`
- ❌ `team_members` vide
- ❌ Dashboard affiche "User is not member of any team"
- ❌ Stats à zéro

**Après fix (attendu)**:
- ✅ Redirection 200 OK vers `/gestionnaire/dashboard`
- ✅ `team_members` contient 1 row (user_id, team_id, role='admin')
- ✅ Dashboard affiche nom équipe
- ✅ Logs: `Teams count: 1`

---

## 🐛 Problèmes Potentiels

### Si team_members toujours vide:
1. Vérifier logs: `⚠️ [AUTH-CONFIRM] Failed to add user to team_members`
2. Cause possible: Contrainte UNIQUE(team_id, user_id) déjà violée
3. Solution: Nettoyer DB avant test

### Si redirection toujours 404:
1. Vérifier cache navigateur
2. Hard refresh (Ctrl+Shift+R)
3. Vérifier logs middleware: doit afficher accès à `/gestionnaire/dashboard`

---

## 🎯 Critères de Succès

Test considéré **réussi** si:
1. ✅ Redirection directe `/gestionnaire/dashboard` (pas 404)
2. ✅ 1 row dans `team_members`
3. ✅ Dashboard affiche équipe (pas "no team")
4. ✅ Logs confirmant 4 étapes (profile + team + update + team_member)
