# 🔍 Investigation - User Metadata Not Populated

**Date**: 2025-10-03
**Status**: 🔍 Investigation en cours
**Problème**: Le nom utilisateur affiche "Utilisateur" au lieu du vrai nom

---

## 📋 Symptôme

Après signup et confirmation email:
- ✅ User créé dans `auth.users`
- ✅ Profile créé dans `public.users`
- ✅ Team créée et `team_members` rempli
- ❌ **Nom utilisateur = "Utilisateur"** (au lieu de "Arthur Test")

**Logs**:
```javascript
✅ [DAL] Complete user profile loaded: {
  id: '8fe621df-484c-47d0-bb68-a7f81694ed3b',
  email: 'arthur+test04@seido-app.com',
  name: 'Utilisateur',           // ← Problème
  display_name: 'Utilisateur',   // ← Problème
  role: 'gestionnaire',
  team_id: '38503c22-5e3f-49f7-8b41-1ce1cd44b2fb'
}
```

---

## 🔬 Analyse du Flow

### Étape 1: Signup Action (`app/actions/auth-actions.ts`)

**Ligne 211-224**: Transmission metadata à Supabase
```typescript
const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
  type: 'signup',
  email: validatedData.email,
  password: validatedData.password,
  options: {
    data: {
      first_name: validatedData.firstName,  // ✅ Transmis
      last_name: validatedData.lastName,    // ✅ Transmis
      phone: validatedData.phone,
      role: validatedData.role || 'gestionnaire',
      full_name: `${validatedData.firstName} ${validatedData.lastName}` // ✅ Transmis
    }
  }
})
```

**Résultat**: Les métadonnées sont **bien envoyées** à Supabase lors de `generateLink()`.

---

### Étape 2: Email Confirmation (`app/auth/confirm/route.ts`)

**Ligne 46-66**: Vérification OTP
```typescript
const { data, error } = await supabase.auth.verifyOtp({
  token_hash,
  type,
})
```

**Ligne 139-143**: Extraction metadata
```typescript
const firstName = user.raw_user_meta_data?.first_name || 'Utilisateur'
const lastName = user.raw_user_meta_data?.last_name || ''
const fullName = user.raw_user_meta_data?.full_name || `${firstName} ${lastName}`.trim()
```

**Question**: Pourquoi `user.raw_user_meta_data` est vide ou ne contient pas first_name/last_name?

---

## 🧪 Tests de Diagnostic

### Test 1: Vérifier Metadata après verifyOtp

**Ajout logs** (ligne 139-143):
```typescript
console.log('🔍 [AUTH-CONFIRM] User metadata:', {
  raw_user_meta_data: user.raw_user_meta_data,
  user_metadata: user.user_metadata,
  email: user.email
})
```

**Objectif**: Voir si les métadonnées sont présentes dans l'objet `user` retourné par `verifyOtp()`

**Attendu**:
- `user.raw_user_meta_data.first_name` = "Arthur"
- `user.raw_user_meta_data.last_name` = "Test"
- `user.raw_user_meta_data.full_name` = "Arthur Test"

**Si vide**: Les métadonnées ne sont pas stockées par Supabase lors de `generateLink()`

---

### Test 2: Vérifier Metadata dans Supabase Dashboard

**SQL Query**:
```sql
SELECT
  id,
  email,
  raw_user_meta_data,
  user_metadata,
  email_confirmed_at
FROM auth.users
WHERE email = 'arthur+test04@seido-app.com';
```

**Objectif**: Vérifier si les métadonnées sont stockées dans la table `auth.users`

**Colonnes à vérifier**:
- `raw_user_meta_data` (JSONB)
- `user_metadata` (JSONB)

**Attendu**:
```json
{
  "first_name": "Arthur",
  "last_name": "Test",
  "full_name": "Arthur Test",
  "phone": null,
  "role": "gestionnaire"
}
```

---

## 🔍 Hypothèses

### Hypothèse 1: Supabase admin.generateLink() ne stocke pas metadata

**Description**: La méthode `admin.generateLink()` pourrait ne stocker les métadonnées que **temporairement** dans le token, pas dans `auth.users.raw_user_meta_data`.

**Validation**:
- ✅ Vérifier SQL query ci-dessus
- ✅ Consulter docs Supabase: https://supabase.com/docs/reference/javascript/auth-admin-generatelink

**Si confirmé**: Utiliser `admin.createUser()` au lieu de `generateLink()` pour garantir stockage metadata

---

### Hypothèse 2: Metadata transmise via différent champ

**Description**: Supabase pourrait stocker metadata dans `user_metadata` au lieu de `raw_user_meta_data`.

**Validation**:
- ✅ Vérifier logs debug ajoutés
- ✅ Tester extraction depuis `user.user_metadata`

**Fix appliqué** (ligne 146-150):
```typescript
const firstName = user.raw_user_meta_data?.first_name || user.user_metadata?.first_name || 'Utilisateur'
const lastName = user.raw_user_meta_data?.last_name || user.user_metadata?.last_name || ''
```

---

### Hypothèse 3: verifyOtp() ne retourne pas metadata complètes

**Description**: L'objet `user` retourné par `verifyOtp()` pourrait ne pas inclure toutes les métadonnées.

**Validation**:
- ✅ Vérifier logs debug
- ✅ Comparer avec `supabase.auth.getUser()` après confirmation

**Workaround possible**:
```typescript
// Après verifyOtp, recharger user complet
const { data: { user: fullUser } } = await supabase.auth.getUser()
const firstName = fullUser.raw_user_meta_data?.first_name || 'Utilisateur'
```

---

## 🎯 Solutions Possibles

### Solution 1: Utiliser admin.createUser() au lieu de generateLink()

**Avantage**: Garantit stockage metadata dans `auth.users`

**Code** (dans `signup-action.ts`):
```typescript
// ANCIEN (generateLink)
const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({...})

// NOUVEAU (createUser)
const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
  email: validatedData.email,
  password: validatedData.password,
  email_confirm: false, // Important: user doit confirmer email
  user_metadata: {
    first_name: validatedData.firstName,
    last_name: validatedData.lastName,
    phone: validatedData.phone,
    role: validatedData.role || 'gestionnaire',
    full_name: `${validatedData.firstName} ${validatedData.lastName}`
  }
})

// Ensuite générer lien confirmation séparément
const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
  type: 'signup',
  email: validatedData.email
})
```

**Inconvénient**: 2 appels API au lieu d'1

---

### Solution 2: Mettre à jour metadata après verifyOtp

**Code** (dans `confirm/route.ts` après ligne 98):
```typescript
const user = data.user

// Mettre à jour metadata si manquantes
if (!user.raw_user_meta_data?.first_name) {
  console.warn('⚠️ [AUTH-CONFIRM] Metadata missing, updating user...')

  const { data: updatedUser } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      user_metadata: {
        first_name: 'Nom par défaut', // TODO: récupérer depuis form
        last_name: '',
        role: 'gestionnaire'
      }
    }
  )

  if (updatedUser) {
    user.raw_user_meta_data = updatedUser.user.raw_user_meta_data
  }
}
```

**Inconvénient**: Nécessite stocker metadata temporairement (cookie/session)

---

### Solution 3: Permettre update nom post-signup

**Description**: Accepter que le nom soit "Utilisateur" initialement, et permettre à l'utilisateur de le mettre à jour dans son profil.

**Avantages**:
- ✅ Simple à implémenter
- ✅ Donne contrôle à l'utilisateur
- ✅ Pas de complexité technique

**Code** (page profil):
```typescript
<form onSubmit={updateProfileAction}>
  <Input name="display_name" defaultValue={user.display_name} />
  <Button type="submit">Mettre à jour mon profil</Button>
</form>
```

---

## 📊 Prochaines Étapes

1. **Immédiat**:
   - [ ] Effectuer nouveau signup
   - [ ] Vérifier logs debug metadata
   - [ ] Vérifier SQL auth.users.raw_user_meta_data

2. **Selon résultats**:
   - [ ] Si metadata vide → Implémenter Solution 1 (createUser)
   - [ ] Si metadata présente mais mal extraite → Fixer extraction
   - [ ] Si problème Supabase → Ouvrir issue/consulter docs

3. **Court terme**:
   - [ ] Implémenter page update profil (Solution 3)
   - [ ] Documenter comportement metadata Supabase

---

## 🔗 Références

- **Supabase Docs**: https://supabase.com/docs/reference/javascript/auth-admin-generatelink
- **Supabase Auth Metadata**: https://supabase.com/docs/guides/auth/managing-user-data
- **Code modifié**: `app/auth/confirm/route.ts` lignes 139-158

---

**Auteur**: Claude Code
**Next Action**: Tester signup avec logs debug, analyser résultats
