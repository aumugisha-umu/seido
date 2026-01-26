# 🧪 Test Plan : Correction Métadonnées Signup

**Date** : 2025-10-03
**Objectif** : Valider la récupération des métadonnées via `getUserById()` et les fallbacks sur email

---

## ✅ Modifications Implémentées

### Fichier : `app/auth/confirm/route.ts`

#### 1. **Ajout `getUserById()` pour récupérer métadonnées complètes** (lignes 152-163)
```typescript
// 🔍 ÉTAPE 1: Récupérer le profil complet avec métadonnées depuis Supabase Auth
const { data: fullUserData, error: userFetchError } = await supabaseAdmin.auth.admin.getUserById(user.id)
const userWithMetadata = fullUserData?.user || user
```

**Raison** : `verifyOtp()` ne retourne pas les métadonnées, mais `getUserById()` les récupère depuis `auth.users`.

---

#### 2. **Extraction métadonnées avec fallback intelligent** (lignes 165-195)
```typescript
const emailUsername = userWithMetadata.email?.split('@')[0] || 'Utilisateur'

const firstName = userWithMetadata.raw_user_meta_data?.first_name ||
                  userWithMetadata.user_metadata?.first_name ||
                  emailUsername  // ← Fallback sur email au lieu de 'Utilisateur'

const fullName = userWithMetadata.raw_user_meta_data?.full_name ||
                 userWithMetadata.user_metadata?.full_name ||
                 `${firstName} ${lastName}`.trim() ||
                 userWithMetadata.email  // ← Fallback final sur email complet
```

**Raison** : Éviter "Utilisateur" générique, utiliser email si métadonnées absentes.

---

#### 3. **Ajout colonnes `first_name` et `last_name` dans profil** (lignes 205-206)
```typescript
.insert({
  auth_user_id: user.id,
  email: user.email!,
  name: fullName || user.email!,
  first_name: firstName !== emailUsername ? firstName : null,  // Ne stocker que si vrai prénom
  last_name: lastName || null,
  role: userRole,
  // ...
})
```

**Raison** : Stocker les métadonnées dans la table `users` pour utilisation ultérieure.

---

#### 4. **Nom d'équipe intelligent** (lignes 234-236)
```typescript
const teamName = firstName !== emailUsername
  ? `Équipe de ${firstName}`  // Si vrai prénom → "Équipe de Arthur"
  : `Équipe de ${emailUsername}`  // Sinon → "Équipe de arthur+test04"
```

**Raison** : Jamais "Équipe de Utilisateur", toujours un nom significatif.

---

## 🧪 Test Scenario 1 : Métadonnées Présentes (Cas Normal)

### Input
```bash
# Signup avec métadonnées complètes
Email: arthur+test05@seido-app.com
First Name: Jean
Last Name: Dupont
Role: gestionnaire
```

### Étapes
1. Créer compte via [http://localhost:3000/auth/signup](http://localhost:3000/auth/signup)
2. Vérifier email (cliquer lien confirmation)
3. Redirection vers `/gestionnaire/dashboard`

### Vérifications Attendues

#### ✅ Logs Serveur (console)
```javascript
🔍 [AUTH-CONFIRM] Fetching full user profile with metadata...
🔍 [AUTH-CONFIRM] Full user metadata: {
  raw_user_meta_data: {
    first_name: 'Jean',
    last_name: 'Dupont',
    full_name: 'Jean Dupont',
    role: 'gestionnaire'
  },
  email: 'arthur+test05@seido-app.com'
}

📝 [AUTH-CONFIRM] Extracted metadata: {
  firstName: 'Jean',
  lastName: 'Dupont',
  fullName: 'Jean Dupont',
  userRole: 'gestionnaire',
  source: 'metadata'  // ← Confirme que métadonnées utilisées
}

✅ [AUTH-CONFIRM] Team created: {
  teamId: 'xxx',
  teamName: 'Équipe de Jean',  // ← Vrai prénom utilisé
  source: 'first_name'  // ← Confirme source
}
```

#### ✅ Base de Données

**Table `auth.users`** :
```sql
SELECT
  email,
  raw_user_meta_data->>'first_name' as metadata_firstname,
  raw_user_meta_data->>'last_name' as metadata_lastname
FROM auth.users
WHERE email = 'arthur+test05@seido-app.com';

-- Attendu:
-- email: arthur+test05@seido-app.com
-- metadata_firstname: Jean
-- metadata_lastname: Dupont
```

**Table `users` (profil custom)** :
```sql
SELECT id, email, name, first_name, last_name, role, team_id
FROM users
WHERE email = 'arthur+test05@seido-app.com';

-- Attendu:
-- name: "Jean Dupont"
-- first_name: "Jean"
-- last_name: "Dupont"
-- role: "gestionnaire"
-- team_id: <UUID valide>
```

**Table `teams`** :
```sql
SELECT t.name, t.created_by, u.email as creator_email
FROM teams t
JOIN users u ON t.created_by = u.id
WHERE u.email = 'arthur+test05@seido-app.com';

-- Attendu:
-- name: "Équipe de Jean"
```

**Table `team_members`** :
```sql
SELECT tm.role, tm.team_id, u.email, t.name as team_name
FROM team_members tm
JOIN users u ON tm.user_id = u.id
JOIN teams t ON tm.team_id = t.id
WHERE u.email = 'arthur+test05@seido-app.com';

-- Attendu:
-- role: "admin"
-- team_name: "Équipe de Jean"
```

#### ✅ Interface Utilisateur

**Dashboard** (`/gestionnaire/dashboard`) :
- Header affiche : `"Jean Dupont"` (pas "Utilisateur")
- Nom d'équipe : `"Équipe de Jean"`
- Aucune erreur hydration React

---

## 🧪 Test Scenario 2 : Métadonnées Absentes (Edge Case)

### Input
```bash
# Signup avec métadonnées manquantes (simulation edge case)
Email: test-fallback@seido-app.com
# Métadonnées non transmises (edge case technique)
```

### Vérifications Attendues

#### ✅ Logs Serveur
```javascript
🔍 [AUTH-CONFIRM] Full user metadata: {
  raw_user_meta_data: null,  // ← Métadonnées absentes
  user_metadata: null,
  email: 'test-fallback@seido-app.com'
}

📝 [AUTH-CONFIRM] Extracted metadata: {
  firstName: 'test-fallback',  // ← Fallback sur email
  lastName: '',
  fullName: 'test-fallback@seido-app.com',
  source: 'email_fallback'  // ← Confirme fallback
}

✅ [AUTH-CONFIRM] Team created: {
  teamName: 'Équipe de test-fallback',  // ← Email utilisé
  source: 'email_fallback'
}
```

#### ✅ Base de Données

**Table `users`** :
```sql
-- Attendu:
-- name: "test-fallback@seido-app.com"
-- first_name: NULL  (car firstName === emailUsername)
-- last_name: NULL
```

**Table `teams`** :
```sql
-- Attendu:
-- name: "Équipe de test-fallback"
```

**Jamais** :
- ❌ `name: "Utilisateur"`
- ❌ `team.name: "Équipe de Utilisateur"`

---

## 📊 Checklist de Validation

Après chaque test, vérifier :

### Logs
- [ ] `🔍 [AUTH-CONFIRM] Fetching full user profile with metadata...` présent
- [ ] `raw_user_meta_data` affiché dans les logs
- [ ] `source: 'metadata'` si métadonnées présentes
- [ ] `source: 'email_fallback'` si métadonnées absentes

### Base de Données
- [ ] Table `users` : colonnes `first_name`, `last_name` remplies
- [ ] Table `users` : `name` ≠ "Utilisateur"
- [ ] Table `teams` : `name` ≠ "Équipe de Utilisateur"
- [ ] Table `team_members` : entrée créée avec `role: 'admin'`

### Interface
- [ ] Dashboard affiche vrai nom utilisateur (pas "Utilisateur")
- [ ] Pas d'erreur hydration React
- [ ] Redirection vers `/{role}/dashboard` (pas `/dashboard/{role}`)

### Performance
- [ ] Temps de signup < 2s (1 requête `getUserById()` supplémentaire acceptable)

---

## 🔧 Commandes SQL Utiles

### Vérification complète d'un utilisateur
```sql
-- 1. Profil utilisateur
SELECT
  u.id,
  u.email,
  u.name,
  u.first_name,
  u.last_name,
  u.role,
  u.team_id,
  t.name as team_name
FROM users u
LEFT JOIN teams t ON u.team_id = t.id
WHERE u.email = 'arthur+test05@seido-app.com';

-- 2. Métadonnées Supabase Auth
SELECT
  email,
  raw_user_meta_data,
  user_metadata,
  created_at
FROM auth.users
WHERE email = 'arthur+test05@seido-app.com';

-- 3. Membership team
SELECT
  tm.role,
  t.name as team_name,
  tm.joined_at
FROM team_members tm
JOIN users u ON tm.user_id = u.id
JOIN teams t ON tm.team_id = t.id
WHERE u.email = 'arthur+test05@seido-app.com';
```

### Nettoyage entre tests
```sql
-- Supprimer utilisateur de test (CASCADE sur team_members et teams)
DELETE FROM auth.users WHERE email LIKE 'arthur+test%@seido-app.com';
DELETE FROM users WHERE email LIKE 'arthur+test%@seido-app.com';
```

---

## 🎯 Critères de Succès

Le fix est validé si :

1. ✅ **Métadonnées récupérées** : Logs montrent `raw_user_meta_data` non vide
2. ✅ **Profil créé correctement** : Table `users` avec `first_name`, `last_name`, `name` corrects
3. ✅ **Équipe nommée intelligemment** : Jamais "Équipe de Utilisateur"
4. ✅ **Fallback robuste** : Si métadonnées absentes → email utilisé (lisible)
5. ✅ **Dashboard fonctionnel** : Affiche vrai nom utilisateur
6. ✅ **Pas de régression** : Tests E2E existants passent toujours

---

## 📝 Notes de Debugging

Si le test échoue :

### Métadonnées toujours vides après `getUserById()`
```typescript
// Vérifier que admin.generateLink() envoie bien les métadonnées
// Dans signup-action.ts, ajouter log:
console.log('Sending metadata to Supabase:', {
  first_name, last_name, full_name, role
})
```

### `first_name` et `last_name` NULL en DB
```sql
-- Vérifier que les colonnes existent
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('first_name', 'last_name');

-- Si absentes, créer migration:
ALTER TABLE users ADD COLUMN first_name VARCHAR(255);
ALTER TABLE users ADD COLUMN last_name VARCHAR(255);
```

### Dashboard affiche toujours "Utilisateur"
- Vider cache navigateur
- Vérifier composant `UserMenu` ou dashboard utilise bien `user.name` de la DB
- Vérifier logs serveur pour confirmer profil chargé correctement

---

**Statut** : ✅ Prêt pour test
**Auteur** : Claude Code
**Date** : 2025-10-03
