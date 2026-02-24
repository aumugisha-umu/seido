# Pattern de Migration: Client Hooks vers Server Components

Ce guide documente le pattern pour migrer des pages utilisant des hooks client vers une architecture hybride Server/Client Components pour des performances optimales.

## Probleme

Les pages utilisant `"use client"` avec des hooks de data fetching souffrent de:
- **Chargement lent**: Le JS doit charger, s'executer, puis faire des requetes API
- **Flash de loading**: L'utilisateur voit "Chargement..." pendant 1-3s
- **Waterfall requests**: Plusieurs requetes sequentielles

## Solution: Architecture Hybride

```
┌─────────────────────────────────────────────────────────────┐
│                    page.tsx (Server)                         │
│  - getServerAuthContext() pour auth                         │
│  - Fetch data directement de Supabase                       │
│  - Passe les donnees au Client Component                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 *-client.tsx (Client)                        │
│  - Recoit initialData via props                              │
│  - Gere interactivite (mutations, realtime)                 │
│  - Hooks avec option initialData pour skip fetch initial    │
└─────────────────────────────────────────────────────────────┘
```

## Etape 1: Modifier le Hook pour Supporter SSR

Ajouter les options `initialData` et `initialUnreadCount` (ou equivalent):

```typescript
interface UseDataOptions {
  // ... existing options

  // SSR Support
  initialData?: DataType[]
  initialCount?: number
}

export const useData = (options: UseDataOptions = {}) => {
  const { initialData, initialCount } = options

  // Use initial data if provided
  const hasInitialData = initialData !== undefined
  const [data, setData] = useState<DataType[]>(initialData || [])
  const [loading, setLoading] = useState(!hasInitialData)

  // Skip initial fetch if SSR data provided
  useEffect(() => {
    if (hasInitialData && data.length > 0) {
      return
    }
    fetchData()
  }, [/* dependencies */])

  // ...
}
```

## Etape 2: Creer le Server Component (page.tsx)

```typescript
// app/[role]/[feature]/page.tsx
import { getServerAuthContext } from '@/lib/server-context'
import { FeatureClient } from './feature-client'

async function fetchData(supabase: any, teamId: string) {
  const { data, error } = await supabase
    .from('table')
    .select('*, related:related_table(*)')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching data:', error)
    return []
  }

  return data || []
}

export default async function FeaturePage() {
  const { profile, team, supabase } = await getServerAuthContext('gestionnaire')

  // Fetch data server-side (parallel if multiple)
  const [dataA, dataB] = await Promise.all([
    fetchDataA(supabase, team.id),
    fetchDataB(supabase, team.id)
  ])

  return (
    <FeatureClient
      userId={profile.id}
      teamId={team.id}
      initialDataA={dataA}
      initialDataB={dataB}
    />
  )
}
```

## Etape 3: Creer le Client Component

```typescript
// app/[role]/[feature]/feature-client.tsx
"use client"

import { useState, useCallback } from 'react'
import { useData } from '@/hooks/use-data'
import { useRealtimeUpdates } from '@/hooks/use-realtime'

interface FeatureClientProps {
  userId: string
  teamId: string
  initialDataA: DataType[]
  initialDataB: DataType[]
}

export function FeatureClient({
  userId,
  teamId,
  initialDataA,
  initialDataB
}: FeatureClientProps) {
  // Hooks with SSR data
  const { data, refetch } = useData({
    teamId,
    initialData: initialDataA
  })

  // Realtime updates
  useRealtimeUpdates({
    enabled: !!userId,
    onUpdate: refetch
  })

  // Memoized handlers
  const handleAction = useCallback(async () => {
    // mutation logic
    await refetch()
  }, [refetch])

  return (
    // UI with data pre-populated
  )
}
```

## Checklist de Migration

- [ ] Hook modifie pour accepter `initialData`
- [ ] Hook skip le fetch initial si `initialData` fourni
- [ ] Server Component cree avec `getServerAuthContext`
- [ ] Fetch server-side utilise `.select()` avec les memes champs
- [ ] Client Component recoit les props typees
- [ ] Realtime/mutations restent cote client
- [ ] Pas de `"use client"` dans page.tsx
- [ ] TypeScript compile sans erreur

## Exemple Concret: Page Notifications

### Avant (792 lignes client)
```typescript
"use client"

export default function NotificationsPage() {
  const { user } = useAuth()
  const [userTeam, setUserTeam] = useState(null)

  // Multiple useEffects for data fetching
  useEffect(() => { fetchUserTeam() }, [user])
  useEffect(() => { fetchNotifications() }, [userTeam])

  // Loading state visible to user
  if (loading) return <Loader />

  return <UI />
}
```

### Apres (75 + 700 lignes)

**page.tsx (Server - 75 lignes)**
```typescript
import { getServerAuthContext } from '@/lib/server-context'
import { NotificationsClient } from './notifications-client'

export default async function NotificationsPage() {
  const { profile, team, supabase } = await getServerAuthContext('gestionnaire')

  const [teamNotifs, personalNotifs] = await Promise.all([
    getNotifications(supabase, profile.id, team.id, 'team'),
    getNotifications(supabase, profile.id, team.id, 'personal')
  ])

  return (
    <NotificationsClient
      userId={profile.id}
      teamId={team.id}
      initialTeamNotifications={teamNotifs.notifications}
      initialPersonalNotifications={personalNotifs.notifications}
      initialUnreadCount={teamNotifs.unreadCount}
      initialPersonalUnreadCount={personalNotifs.unreadCount}
    />
  )
}
```

**notifications-client.tsx (Client - 700 lignes)**
- Recoit donnees pre-remplies
- Gere tabs, mark read, archive
- Realtime updates via WebSocket

## Gains de Performance

| Metrique | Avant | Apres |
|----------|-------|-------|
| Time to First Byte | ~200ms | ~200ms |
| Time to Meaningful Paint | ~2-3s | ~400ms |
| Requetes client au load | 3-4 | 0 |
| Flash "Chargement..." | Oui | Non |
| JS Bundle initial | 100% | ~30% |

## Anti-Patterns a Eviter

1. **Ne pas mixer fetch server et client pour les memes donnees**
   - Le client refetch doit etre pour refresh/mutations, pas pour load initial

2. **Ne pas oublier les types**
   - Les props du Client Component doivent etre typees

3. **Ne pas mettre `"use client"` dans page.tsx**
   - Sinon toute la page devient client

4. **Ne pas oublier error handling server-side**
   - Les erreurs Supabase doivent etre catch et loggees

---

**Derniere mise a jour**: 2026-02-08
**Applique a**: Notifications page (US-014)
