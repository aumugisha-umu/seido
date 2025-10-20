# 🎯 Gestion Centralisée du Client Supabase - SEIDO

**Date**: 2025-10-12
**Status**: ✅ Production Ready
**Architecture**: Next.js 15 + React 19 + Supabase SSR

---

## 📚 Vue d'Ensemble

Ce document décrit le pattern officiel pour gérer les clients Supabase authentifiés dans SEIDO, basé sur les meilleures pratiques Next.js 15 et React 19.

### Problème Résolu

**Avant** :
```typescript
// ❌ Code dupliqué partout dans le codebase
const supabase = await createServerSupabaseClient()
const { data: { session } } = await supabase.auth.getSession()
if (!session) redirect('/auth/login')
const teamService = await createServerTeamService()
const teams = await teamService.getUserTeams(userId)
// ... répété dans chaque fichier
```

**Maintenant** :
```typescript
// ✅ Pattern centralisé et réutilisable
const { supabase, profile, team } = await getServerAuthContext('gestionnaire')
const { data } = await supabase.from('buildings').select('*')
```

---

## 🏗️ Architecture

### Trois Types de Clients Supabase

| Client | Contexte | Permissions | Utilisation |
|--------|----------|-------------|-------------|
| **Browser** | Client Components | Session persistée | Hooks, composants interactifs |
| **Server** | Server Components | READ-ONLY (cookies) | Pages, layouts, composants server |
| **Server Action** | Server Actions | READ-WRITE (cookies) | Mutations, création/suppression |

### Hiérarchie des Fichiers

```
lib/
├── services/
│   ├── core/
│   │   └── supabase-client.ts          # 🔧 Factory functions (niveau bas)
│   └── index.ts                        # 📦 Exports centralisés
└── server-context.ts                    # 🎯 Context helpers (niveau haut)
```

---

## 🚀 Utilisation

### 1. Server Components (READ-ONLY)

**Quand l'utiliser** : Pages, layouts, composants qui affichent des données

```typescript
// app/gestionnaire/biens/page.tsx
import { getServerAuthContext } from '@/lib/services'

export default async function BuildingsPage() {
  // ✅ Récupère user + team + client Supabase authentifié (READ-ONLY)
  const { supabase, profile, team } = await getServerAuthContext('gestionnaire')

  // ✅ Accès direct à la base de données avec RLS automatique
  const { data: buildings } = await supabase
    .from('buildings')
    .select('*')
    .eq('team_id', team.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1>Buildings de {team.name}</h1>
      <BuildingsList buildings={buildings} />
    </div>
  )
}
```

**Fonctionnalités** :
- ✅ Vérifie automatiquement l'authentification
- ✅ Vérifie le rôle (optionnel)
- ✅ Charge les équipes de l'utilisateur
- ✅ Redirige vers login si non authentifié
- ✅ Cache les résultats durant la requête (React 19 `cache()`)
- ⚠️ Client **READ-ONLY** : ne peut pas modifier les cookies

---

### 2. Server Actions (READ-WRITE)

**Quand l'utiliser** : Création, modification, suppression de données

```typescript
// app/actions/building-actions.ts
'use server'

import { getServerActionAuthContext } from '@/lib/services'
import { revalidatePath } from 'next/cache'

export async function createBuilding(data: BuildingFormData) {
  // ✅ Récupère user + team + client Supabase authentifié (READ-WRITE)
  const { supabase, profile, team } = await getServerActionAuthContext('gestionnaire')

  // ✅ Insertion avec auth.uid() disponible pour RLS
  const { data: building, error } = await supabase
    .from('buildings')
    .insert({
      ...data,
      team_id: team.id
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // ✅ Revalidation du cache Next.js
  revalidatePath('/gestionnaire/biens')

  return { success: true, data: building }
}
```

**Fonctionnalités** :
- ✅ Toutes les fonctionnalités de `getServerAuthContext()`
- ✅ Client **READ-WRITE** : peut modifier les cookies
- ✅ Peut rafraîchir la session automatiquement
- ⚠️ **PAS de cache** (car mutations possibles)

---

### 3. Client Components (Browser)

**Quand l'utiliser** : Hooks, composants interactifs, real-time subscriptions

```typescript
// hooks/use-buildings.ts
'use client'

import { createBrowserSupabaseClient } from '@/lib/services'
import { useEffect, useState } from 'react'

export function useBuildings(teamId: string) {
  const [buildings, setBuildings] = useState([])
  const supabase = createBrowserSupabaseClient()

  useEffect(() => {
    // ✅ Requête avec RLS automatique
    supabase
      .from('buildings')
      .select('*')
      .eq('team_id', teamId)
      .then(({ data }) => setBuildings(data))

    // ✅ Real-time subscription
    const channel = supabase
      .channel('buildings-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'buildings',
        filter: `team_id=eq.${teamId}`
      }, () => {
        // Refresh data
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId])

  return buildings
}
```

---

## 📊 Comparaison des Approches

### Ancien Pattern (décentralisé)

```typescript
// ❌ Répétition de code
const supabase = await createServerSupabaseClient()
const { data: { session } } = await supabase.auth.getSession()
if (!session) redirect('/auth/login')

const teamService = await createServerTeamService()
const result = await teamService.getUserTeams(userId)
if (!result.success) redirect('/auth/unauthorized')

const team = result.data[0]
```

**Problèmes** :
- 🔴 Code dupliqué dans chaque fichier
- 🔴 Gestion d'erreur incohérente
- 🔴 Pas de cache (appels multiples pour la même requête)
- 🔴 Risque d'oublier les vérifications

### Nouveau Pattern (centralisé)

```typescript
// ✅ Une seule ligne
const { supabase, profile, team } = await getServerAuthContext('gestionnaire')
```

**Avantages** :
- ✅ Une seule ligne de code
- ✅ Gestion d'erreur centralisée et cohérente
- ✅ Cache automatique (React 19)
- ✅ Type-safe (TypeScript)
- ✅ Client Supabase authentifié inclus

---

## 🎨 Exemples Avancés

### Server Component avec Données Parallèles

```typescript
// app/gestionnaire/dashboard/page.tsx
export default async function DashboardPage() {
  const { supabase, team } = await getServerAuthContext('gestionnaire')

  // ✅ Requêtes parallèles
  const [buildings, interventions, stats] = await Promise.all([
    supabase.from('buildings').select('*').eq('team_id', team.id),
    supabase.from('interventions').select('*').eq('team_id', team.id),
    supabase.rpc('get_dashboard_stats', { p_team_id: team.id })
  ])

  return (
    <Dashboard
      buildings={buildings.data}
      interventions={interventions.data}
      stats={stats.data}
    />
  )
}
```

### Server Action avec Validation

```typescript
// app/actions/building-actions.ts
'use server'

import { z } from 'zod'

const BuildingSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  postal_code: z.string().regex(/^\d{4,5}$/),
  country: z.enum(['belgique', 'france', 'allemagne'])
})

export async function createBuilding(formData: FormData) {
  // ✅ Contexte authentifié avec client READ-WRITE
  const { supabase, team } = await getServerActionAuthContext('gestionnaire')

  // ✅ Validation
  const parsed = BuildingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten() }
  }

  // ✅ Insertion
  const { data, error } = await supabase
    .from('buildings')
    .insert({ ...parsed.data, team_id: team.id })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/gestionnaire/biens')
  return { success: true, data }
}
```

### Vérification Légère (sans équipes)

```typescript
// app/api/health/route.ts
import { getServerUser } from '@/lib/services'

export async function GET() {
  // ✅ Vérification auth uniquement (pas de chargement d'équipes)
  const { user, profile } = await getServerUser()

  return Response.json({
    status: 'ok',
    user: {
      id: profile.id,
      email: profile.email,
      role: profile.role
    }
  })
}
```

---

## 🔒 Sécurité et RLS

### Pourquoi `TO authenticated` est Critique

```sql
-- ❌ MAUVAIS: Policy appliquée au rôle 'authenticator' (pas de session)
CREATE POLICY buildings_select ON buildings FOR SELECT
  USING (can_view_building(id));

-- ✅ BON: Policy appliquée au rôle 'authenticated' (a une session)
CREATE POLICY buildings_select ON buildings FOR SELECT
TO authenticated
  USING (can_view_building(id));
```

**Explication** :
- PostgreSQL a deux rôles : `authenticator` (service role, pas de session) et `authenticated` (user role, a une session)
- Sans `TO authenticated`, `auth.uid()` retourne **NULL** car pas de session
- Avec `TO authenticated`, `auth.uid()` retourne l'ID utilisateur correct

### Résolution auth_user_id vs Database ID

```sql
-- ✅ Pattern correct pour RLS helpers
CREATE OR REPLACE FUNCTION is_team_manager(check_team_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON tm.user_id = u.id
    WHERE u.auth_user_id = auth.uid()  -- ✅ Résolution via users.auth_user_id
      AND tm.team_id = check_team_id
      AND u.role = 'gestionnaire'
      AND tm.left_at IS NULL
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

**Système Double-ID** :
- `users.auth_user_id` : UUID de Supabase Auth (correspond à `auth.uid()`)
- `users.id` : UUID de la table users (clé primaire database)
- **RLS policies** : Utiliser `auth_user_id = auth.uid()`
- **Foreign keys** : Utiliser `users.id`

---

## 📋 Checklist Migration

Pour migrer du code existant vers le nouveau pattern :

### Server Components
- [ ] Remplacer `createServerSupabaseClient()` par `getServerAuthContext()`
- [ ] Supprimer vérifications manuelles d'authentification
- [ ] Supprimer chargement manuel des équipes
- [ ] Utiliser `supabase` du contexte au lieu de créer un nouveau client
- [ ] Vérifier que les redirections sont gérées automatiquement

### Server Actions
- [ ] Remplacer `createServerActionSupabaseClient()` par `getServerActionAuthContext()`
- [ ] Supprimer vérifications manuelles d'authentification
- [ ] Utiliser `supabase` du contexte (READ-WRITE)
- [ ] Ajouter `revalidatePath()` après mutations
- [ ] Vérifier gestion d'erreur cohérente

### RLS Policies
- [ ] Ajouter `TO authenticated` à TOUTES les policies Phase 2
- [ ] Vérifier résolution `auth_user_id` dans helper functions
- [ ] Tester isolation multi-tenant

---

## 🧪 Tests

### Test Server Context

```typescript
// tests/lib/server-context.test.ts
import { getServerAuthContext } from '@/lib/services'

describe('getServerAuthContext', () => {
  it('should return authenticated context for valid user', async () => {
    // Mock auth session
    const context = await getServerAuthContext('gestionnaire')

    expect(context.user).toBeDefined()
    expect(context.profile.role).toBe('gestionnaire')
    expect(context.team).toBeDefined()
    expect(context.supabase).toBeDefined()
  })

  it('should redirect if user not authenticated', async () => {
    // Mock no session
    await expect(getServerAuthContext()).rejects.toThrow('NEXT_REDIRECT')
  })
})
```

---

## 📚 Références

### Documentation Officielle
- [Supabase SSR with Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js 15 App Router](https://nextjs.org/docs/app)
- [React 19 cache()](https://react.dev/reference/react/cache)

### Fichiers du Projet
- `lib/services/core/supabase-client.ts` - Factory functions de base
- `lib/server-context.ts` - Context helpers (ce pattern)
- `lib/services/index.ts` - Exports centralisés
- `supabase/migrations/20251010000002_phase2_buildings_lots_documents.sql` - RLS policies Phase 2

---

## ✅ Résumé des Correctifs (2025-10-12)

### 1. RLS Policies Phase 2 (20 policies corrigées)
- ✅ Ajout de `TO authenticated` à TOUTES les policies (buildings, lots, contacts, documents)
- ✅ Suppression de `buildings_insert_debug` (policy temporaire)
- ✅ Résolution `auth_user_id` dans 6 helper functions RLS
- ✅ Fix `property_documents_update` policy (uploaded_by resolution)

### 2. Centralisation Client Supabase
- ✅ Extension de `server-context.ts` pour inclure client authentifié
- ✅ Ajout de `getServerActionAuthContext()` pour Server Actions (READ-WRITE)
- ✅ Export depuis `lib/services/index.ts`
- ✅ Documentation complète (ce fichier)

### 3. Server Actions
- ✅ Fix import `createServerActionSupabaseClient` dans building-actions.ts
- ✅ Résolution auth_user_id → database ID pour team_members check
- ✅ Logs de debug améliorés

---

**Dernière mise à jour** : 2025-10-12
**Prochaine étape** : Reset DB + Tests E2E Phase 2
