# 🚨 PROBLÈME CRITIQUE: Race Condition Login → Navigation

**Date**: 2025-10-01
**Statut**: NON RÉSOLU après multiples tentatives
**Priorité**: CRITIQUE - Bloque l'expérience utilisateur

---

## 📋 Description du Problème

Après un login réussi, l'utilisateur est redirigé vers son dashboard mais :
- ❌ Le header affiche "Chargement..." au lieu du nom d'utilisateur
- ❌ La page affiche "Vérification de votre accès..." indéfiniment
- ✅ Après un **refresh manuel** (F5), tout fonctionne parfaitement

**Pattern**: Fonctionne TOUJOURS après refresh, JAMAIS au premier chargement post-login.

---

## 🎯 Symptômes Observés

### 1. Navigation Initiale (❌ ÉCHEC)
```
1. User clique "Se connecter" sur /auth/login
2. Server Action loginAction() réussit
3. Navigation vers /gestionnaire/dashboard
4. Dashboard se charge MAIS:
   - Header: "Chargement..." (user = null, loading = true ou false?)
   - TeamCheckModal bloqué sur "Vérification de votre accès..."
   - Aucune donnée n'apparaît
```

### 2. Après Refresh (✅ SUCCÈS)
```
1. User fait F5 sur /gestionnaire/dashboard
2. Tout fonctionne immédiatement:
   - Header: "Arthur Umugisha" (user chargé)
   - Dashboard: Données affichées
   - Contacts: Liste chargée
```

---

## 📊 Logs Serveur vs Client

### Logs Serveur (SANS refresh) - ✅ TOUT FONCTIONNE
```javascript
// Login réussit
✅ [LOGIN-ACTION] User authenticated: arthur@seido-app.com
🔄 [LOGIN-ACTION] Determined role-specific dashboard: { role: 'gestionnaire', dashboard: '/gestionnaire/dashboard' }
🚀 [LOGIN-ACTION] Authentication successful, returning redirect path

// Dashboard se charge côté serveur (Server Components)
✅ [DAL] Valid session found for user: 751e8672-cd51-4ff1-968f-50b8708834ac
✅ [DAL] Complete user profile loaded: {
  id: 'd5f38423-efef-4d1a-8abf-2a3cd4fed572',
  email: 'arthur@seido-app.com',
  name: 'Arthur Umugisha',
  role: 'gestionnaire',
  team_id: '271ee351-19c7-42e5-afab-243de46b2166'
}
📦 [DASHBOARD] Teams result: { success: true, data: [...] }
✅ [DASHBOARD] Buildings loaded: 1
✅ [DASHBOARD] Users loaded: 5
```

**Observation**: Le serveur charge TOUT correctement (session, profil, données).

### Logs Client (SANS refresh) - ❌ MANQUANTS
```javascript
// Ce qui DEVRAIT apparaître mais N'APPARAÎT PAS:
🚀 [AUTH-PROVIDER-REFACTORED] Initializing auth system...
✅ [AUTH-PROVIDER] Found existing session on mount
✅ [AUTH-SERVICE-REFACTORED] User profile found: Arthur Umugisha

// Ce qui apparaît:
🧭 [NAV-REFRESH] Navigation detected to: /gestionnaire/dashboard
🏠 [NAV-REFRESH] Dashboard section - refreshing stats
🧪 [TEAM-STATUS] Development mode detected - auto-approving team access

// MAIS PAS DE:
// - [AUTH-PROVIDER] User loaded
// - [AUTH-STATE-CHANGE] Event: INITIAL_SESSION
```

**Observation**: `AuthProvider` ne se déclenche PAS correctement après navigation.

### Logs Client (AVEC refresh) - ✅ TOUT FONCTIONNE
```javascript
🌍 [ENV-CONFIG] Environment detected: DEVELOPMENT
🚀 [AUTH-PROVIDER-REFACTORED] Initializing auth system with official patterns...
🔍 [AUTH-PROVIDER] Checking initial session immediately...
✅ [AUTH-PROVIDER] Found existing session on mount, loading profile...
🔍 [AUTH-SERVICE-REFACTORED] Getting current user...
🔄 [AUTH-STATE-CHANGE] Event: INITIAL_SESSION Has session: true
✅ [AUTH-SERVICE-REFACTORED] User profile found: {
  id: "d5f38423-efef-4d1a-8abf-2a3cd4fed572",
  email: "arthur@seido-app.com",
  name: "Arthur Umugisha",
  role: "gestionnaire"
}
🧪 [TEAM-STATUS] Development mode detected - auto-approving team access
```

**Observation**: Avec refresh, `AuthProvider` se déclenche normalement.

---

## 🏗️ Architecture Actuelle

### Flux d'Authentification

```
┌─────────────────────────────────────────────────────────────┐
│ 1. LOGIN (Server Action)                                     │
├─────────────────────────────────────────────────────────────┤
│ app/actions/auth-actions.ts: loginAction()                   │
│ ├─ Supabase signInWithPassword()                             │
│ ├─ Set cookies (server-side)                                 │
│ └─ Return { success: true, redirectTo: "/gestionnaire/..." } │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. NAVIGATION CLIENT (login-form.tsx)                        │
├─────────────────────────────────────────────────────────────┤
│ useEffect(() => {                                             │
│   if (state.success && state.data?.redirectTo) {             │
│     setTimeout(() => {                                        │
│       router.push(state.data.redirectTo)                     │
│       router.refresh()                                       │
│     }, 2500) // ⏱️ Délai pour propagation cookies            │
│   }                                                           │
│ }, [state, router])                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. AUTH PROVIDER (hooks/use-auth.tsx)                        │
├─────────────────────────────────────────────────────────────┤
│ useEffect(() => {                                             │
│   const supabase = createClient()                             │
│                                                               │
│   // Check immédiat (optimisation)                           │
│   checkInitialSession()                                       │
│                                                               │
│   // Pattern officiel Supabase                               │
│   supabase.auth.onAuthStateChange((event, session) => {      │
│     if (event === 'INITIAL_SESSION') {                       │
│       // Charger le profil utilisateur                       │
│       authService.getCurrentUser()                            │
│       setUser(user)                                           │
│       setLoading(false)                                       │
│     }                                                         │
│   })                                                          │
│ }, [])                                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. CLIENT COMPONENTS                                          │
├─────────────────────────────────────────────────────────────┤
│ ├─ DashboardHeader: const { user, loading } = useAuth()      │
│ │  └─ Affiche "Chargement..." si loading ou !user           │
│ │                                                             │
│ └─ TeamCheckModal: const { teamStatus } = useTeamStatus()    │
│    └─ useEffect(() => { if (user?.id) checkTeamStatus() })   │
│       └─ Bloqué à 'checking' si user jamais chargé          │
└─────────────────────────────────────────────────────────────┘
```

### Problème Identifié

**HYPOTHÈSE**: Entre l'étape 2 (navigation) et l'étape 3 (AuthProvider), il y a une **race condition** :

1. `router.push()` déclenche une navigation côté client
2. Les composants du dashboard se montent **AVANT** que `AuthProvider` ait fini de détecter/charger la session
3. `user = null` et `loading = true` (ou `false` après timeout)
4. `TeamCheckModal` détecte `user = null` et reste bloqué à `teamStatus = 'checking'`

**MAIS** : Pourquoi `onAuthStateChange` ne se déclenche-t-il pas après la navigation ?

---

## 🔍 Ce qui a été tenté (SANS SUCCÈS)

### Tentative 1: Délai fixe 1000ms
```typescript
// login-form.tsx
setTimeout(() => {
  router.push(state.data.redirectTo)
  router.refresh()
}, 1000)
```
**Résultat**: ❌ Même problème

### Tentative 2: Délai fixe 2500ms
```typescript
setTimeout(() => {
  router.push(state.data.redirectTo)
  router.refresh()
}, 2500)
```
**Résultat**: ❌ Même problème (temps plus long, mais toujours bloqué)

### Tentative 3: Attendre `loading=false` et `user` chargé
```typescript
const { user, loading } = useAuth()
useEffect(() => {
  if (state.success && state.data?.redirectTo) {
    if (!loading && user) {
      router.push(state.data.redirectTo)
      router.refresh()
      return
    }

    // Timeout de sécurité
    const timer = setTimeout(() => {
      router.push(state.data.redirectTo)
      router.refresh()
    }, 5000)

    return () => clearTimeout(timer)
  }
}, [state, loading, user, router])
```
**Résultat**: ❌ Le `useEffect` se redéclenche constamment, Fast Refresh Next.js casse le Server Action

### Tentative 4: Timeout AuthProvider ajusté
```typescript
// use-auth.tsx
const loadingTimeout = setTimeout(() => {
  setLoading(false)
}, 3500)
```
**Résultat**: ❌ Aucun impact

---

## 📁 Fichiers Critiques

### 1. `app/actions/auth-actions.ts` (lignes 58-152)
Server Action qui gère le login. **Fonctionne correctement**.

### 2. `app/auth/login/login-form.tsx` (lignes 35-64)
Client Component qui soumet le formulaire et gère la navigation. **Point de synchronisation critique**.

### 3. `hooks/use-auth.tsx` (lignes 41-148)
AuthProvider qui maintient l'état d'authentification côté client. **Ne se déclenche PAS après navigation**.

### 4. `lib/auth-service.ts` (lignes 363-439)
Service qui charge le profil utilisateur depuis Supabase. **Fonctionne côté serveur**.

### 5. `hooks/use-team-status.tsx` (lignes 22-82)
Hook qui vérifie si l'utilisateur a une équipe. **Bloqué si `user = null`**.

### 6. `components/team-check-modal.tsx` (lignes 44-53)
Modal qui affiche "Vérification de votre accès...". **Bloqué à `teamStatus = 'checking'`**.

### 7. `components/dashboard-header.tsx` (lignes 73-95)
Header qui affiche le nom d'utilisateur. **Affiche "Chargement..." si `!user`**.

---

## 🔬 Analyse Technique

### Hypothèses de Cause Racine

#### Hypothèse A: Timing de Propagation des Cookies
**Description**: Les cookies Supabase ne se propagent pas assez vite au client après le Server Action.

**Preuves POUR**:
- Fonctionne après refresh (cookies déjà présents)
- Les Server Components voient les cookies (logs serveur OK)

**Preuves CONTRE**:
- Délai de 2500ms devrait être largement suffisant
- Tests E2E passent avec 2000ms

#### Hypothèse B: `onAuthStateChange` ne se déclenche pas après navigation
**Description**: Après `router.push()`, le client Supabase ne détecte pas la session existante.

**Preuves POUR**:
- Aucun log `[AUTH-STATE-CHANGE]` après navigation
- `checkInitialSession()` ne trouve pas de session

**Preuves CONTRE**:
- Le code `onAuthStateChange` est bien appelé (logs `Initializing auth system`)
- Devrait se déclencher automatiquement

#### Hypothèse C: Race Condition entre Navigation et Mount des Composants
**Description**: Les composants se montent avant que `AuthProvider` ait le temps de s'initialiser.

**Preuves POUR**:
- Logs montrent que `TeamStatusProvider` se déclenche AVANT les logs `AUTH-PROVIDER`
- Le `useEffect` de `useTeamStatus` dépend de `user?.id` qui est `null`

**Preuves CONTRE**:
- `AuthProvider` est au niveau `layout.tsx`, devrait se monter en premier
- Timeout de sécurité devrait forcer `loading=false` mais ça ne résout pas le problème

#### Hypothèse D: Bug Next.js 15 avec `router.refresh()`
**Description**: `router.refresh()` après `router.push()` interfère avec la détection de session côté client.

**Preuves POUR**:
- Fast Refresh errors dans les logs
- "Failed to find Server Action" error

**Preuves CONTRE**:
- Tests E2E utilisent le même pattern et passent

---

## 🧪 Instructions pour Reproduire

### Setup
```bash
# Cloner le repo
git clone <repo-url>
cd Seido-app

# Installer les dépendances
npm install

# Lancer le serveur
npm run dev
```

### Étapes de Reproduction

1. **Ouvrir le navigateur** : http://localhost:3000/auth/login
2. **Ouvrir les DevTools** : Console (pour voir les logs client)
3. **Ouvrir un terminal** : Voir les logs serveur
4. **Se connecter** :
   - Email: `arthur@seido-app.com`
   - Password: `Wxcvbn123`
5. **Cliquer sur "Se connecter"**
6. **Observer** :
   - Navigation vers `/gestionnaire/dashboard`
   - Header affiche "Chargement..."
   - Modal "Vérification de votre accès..." apparaît
7. **Faire F5 (refresh manuel)**
8. **Observer** :
   - Tout fonctionne instantanément
   - Header affiche "Arthur Umugisha"
   - Dashboard charge les données

### Logs Attendus vs Réels

**Logs Client ATTENDUS (après navigation)** :
```javascript
🚀 [AUTH-PROVIDER-REFACTORED] Initializing auth system...
🔍 [AUTH-PROVIDER] Checking initial session immediately...
✅ [AUTH-PROVIDER] Found existing session on mount
🔍 [AUTH-SERVICE-REFACTORED] Getting current user...
🔄 [AUTH-STATE-CHANGE] Event: INITIAL_SESSION Has session: true
✅ [AUTH-SERVICE-REFACTORED] User profile found: Arthur Umugisha
🧪 [TEAM-STATUS] Development mode detected - auto-approving team access
```

**Logs Client RÉELS (après navigation)** :
```javascript
🚀 [AUTH-PROVIDER-REFACTORED] Initializing auth system... // ✅ Apparaît
// ❌ Aucun log de session trouvée
// ❌ Aucun log de profil chargé
// ❌ Aucun event INITIAL_SESSION
🧭 [NAV-REFRESH] Navigation detected to: /gestionnaire/dashboard
🧪 [TEAM-STATUS] Development mode detected... // ✅ Mais après timeout
```

---

## 🎯 Questions Clés pour le Debugging

1. **Pourquoi `onAuthStateChange` ne se déclenche-t-il pas après `router.push()` ?**
   - Est-ce un problème de timing ?
   - Est-ce un problème de client Supabase réinitialisé ?

2. **Pourquoi `checkInitialSession()` ne trouve-t-il pas la session ?**
   - Les cookies sont-ils présents dans `document.cookie` à ce moment ?
   - Le client Supabase browser a-t-il accès aux cookies ?

3. **Pourquoi ça fonctionne après refresh mais pas après navigation ?**
   - Quelle est la différence entre un refresh et une navigation côté client ?
   - Est-ce lié au cycle de vie des composants React ?

4. **Est-ce que `router.refresh()` interfère ?**
   - Devrait-on retirer `router.refresh()` ?
   - Devrait-on utiliser `window.location.href` au lieu de `router.push()` ?

---

## 🔧 Pistes de Solution à Explorer

### Piste 1: Utiliser `window.location.href` au lieu de `router.push()`
```typescript
// login-form.tsx
setTimeout(() => {
  window.location.href = state.data.redirectTo
}, 2500)
```
**Rationale**: Force un vrai refresh de page, garantit que les composants se montent avec les cookies présents.

### Piste 2: Vérifier la présence des cookies avant navigation
```typescript
// login-form.tsx
const waitForCookies = async () => {
  for (let i = 0; i < 50; i++) { // Max 5s (50 * 100ms)
    const cookies = document.cookie
    if (cookies.includes('sb-')) { // Supabase cookie prefix
      return true
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  return false
}

setTimeout(async () => {
  await waitForCookies()
  router.push(state.data.redirectTo)
}, 100)
```
**Rationale**: Attendre activement que les cookies soient présents avant de naviguer.

### Piste 3: Forcer `AuthProvider` à re-check la session après navigation
```typescript
// use-auth.tsx
useEffect(() => {
  if (pathname && !loading && !user) {
    console.log('🔄 [AUTH-PROVIDER] Route changed, rechecking session...')
    getCurrentUser()
  }
}, [pathname])
```
**Rationale**: Si `user = null` après une navigation, forcer un nouveau check.

### Piste 4: Utiliser un état global pour coordonner Login → Navigation
```typescript
// Créer un context LoginStateProvider
const [isNavigatingAfterLogin, setIsNavigatingAfterLogin] = useState(false)

// Dans login-form.tsx
setIsNavigatingAfterLogin(true)
router.push(state.data.redirectTo)

// Dans use-auth.tsx
useEffect(() => {
  if (isNavigatingAfterLogin && !user) {
    // Forcer un check immédiat avec retry
    const interval = setInterval(() => {
      getCurrentUser()
      if (user) {
        setIsNavigatingAfterLogin(false)
        clearInterval(interval)
      }
    }, 200)
  }
}, [isNavigatingAfterLogin, user])
```
**Rationale**: Coordonner explicitement le cycle login → navigation → chargement profil.

### Piste 5: Déboguer `createClient()` dans le browser
```typescript
// utils/supabase/client.ts
export const createClient = () => {
  const supabase = createBrowserClient(/* ... */)

  // DEBUG: Vérifier si le client a accès aux cookies
  supabase.auth.getSession().then(({ data, error }) => {
    console.log('🔍 [SUPABASE-CLIENT] Browser client session:', {
      hasSession: !!data.session,
      error,
      cookies: document.cookie.split(';').filter(c => c.includes('sb-'))
    })
  })

  return supabase
}
```
**Rationale**: Vérifier si le problème vient du client Supabase browser qui ne voit pas les cookies.

---

## 📚 Références

### Documentation Officielle
- [Supabase SSR with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js useActionState](https://nextjs.org/docs/app/api-reference/functions/use-action-state)
- [Next.js router.push vs redirect](https://nextjs.org/docs/app/building-your-application/routing/linking-and-navigating)

### Issues GitHub Pertinentes
- [Next.js #72842: redirect() in Server Action doesn't work with useActionState](https://github.com/vercel/next.js/issues/72842)
- [Supabase SSR: Cookie persistence in browser](https://github.com/supabase/auth-helpers/issues)

### Tests E2E Qui Passent
- `test/e2e/gestionnaire-dashboard-data.spec.ts` : Utilise `page.waitForTimeout(2000)` après login et **ça fonctionne**

---

## 💡 Notes Supplémentaires

### Différence Tests E2E vs Utilisation Réelle

**Tests E2E** (Playwright) :
```typescript
await page.fill('input[type="email"]', 'arthur+gest@seido-app.com')
await page.fill('input[type="password"]', 'Wxcvbn123')
await page.click('button[type="submit"]')
await page.waitForTimeout(2000)
await expect(page).toHaveURL(/\/gestionnaire\/dashboard/)
// ✅ Fonctionne
```

**Utilisation Réelle** (Navigateur) :
```typescript
// User clique "Se connecter"
// setTimeout 2500ms
// router.push('/gestionnaire/dashboard')
// ❌ Ne fonctionne PAS
```

**Question**: Pourquoi Playwright réussit mais pas l'utilisateur réel ?

### Configuration Supabase

```typescript
// utils/supabase/client.ts
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// utils/supabase/server.ts
export const createClient = async () => {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore in server components
          }
        },
      },
    }
  )
}
```

**Configuration correcte selon la doc officielle**.

---

## ✅ Checklist de Validation

Quand le fix sera trouvé, valider :

- [ ] Login → Navigation sans délai visible (< 1s)
- [ ] Header affiche le nom immédiatement (pas "Chargement...")
- [ ] Dashboard charge les données sans refresh
- [ ] Page contacts charge la liste sans refresh
- [ ] Tests E2E continuent de passer
- [ ] Fonctionne sur tous les navigateurs (Chrome, Firefox, Safari)
- [ ] Fonctionne avec tous les rôles (gestionnaire, prestataire, locataire)

---

## 🆘 Aide Demandée

**Cher développeur** qui lit ce document,

J'ai passé plusieurs heures à déboguer ce problème et j'ai l'impression de tourner en rond. Les symptômes sont clairs (fonctionne après refresh, pas après navigation), mais la cause racine m'échappe.

**Ce dont j'ai besoin** :
1. Un regard neuf sur le problème
2. Des idées de debugging que je n'ai pas essayées
3. Une explication de POURQUOI `onAuthStateChange` ne se déclenche pas après `router.push()`
4. Une solution qui fonctionne de manière fiable, sans délai visible pour l'utilisateur

Merci d'avance pour ton aide ! 🙏

---

---

## 🧪 TENTATIVE EN COURS: Piste 1 - window.location.href

**Date**: 2025-10-01 à 19:10
**Status**: EN TEST

### Modification Appliquée

```typescript
// login-form.tsx - AVANT
setTimeout(() => {
  router.push(state.data.redirectTo)
  router.refresh()
}, 2500)

// login-form.tsx - APRÈS
setTimeout(() => {
  window.location.href = state.data.redirectTo
}, 1000)
```

### Rationale

- `window.location.href` force un **vrai refresh de page** (comme F5)
- Tous les composants se montent avec les cookies déjà présents
- Pas besoin d'attendre `AuthProvider.onAuthStateChange`
- Délai réduit à 1000ms car pas besoin de synchronisation côté client

### Résultat Attendu

✅ Header affiche le nom immédiatement
✅ Dashboard charge sans "Vérification de votre accès..."
✅ Pas de refresh manuel nécessaire

**Test en attente de validation utilisateur.**

---

**Dernière mise à jour** : 2025-10-01 à 19:10 (Piste 1 en test)
