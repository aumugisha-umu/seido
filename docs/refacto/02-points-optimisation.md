# 02 - Points d'Optimisation Prioritaires SEIDO

## Matrice de Priorisation

| Priorité | Impact | Effort | ROI | Domaine |
|----------|--------|--------|-----|---------|
| P0 - Critique | Très Élevé | Moyen | 10x | Sécurité & Performance |
| P1 - Haute | Élevé | Moyen | 5x | Architecture & UX |
| P2 - Moyenne | Moyen | Faible | 3x | Qualité & Maintenance |

## P0 - Optimisations Critiques (Semaine 1-2)

### 1. Authentification et Sécurité
**Impact: 14s → <3s | Sécurité: Critique**

#### Problème actuel
```typescript
// ❌ Actuel: Vérification superficielle
const hasAuthCookie = cookies.some(cookie =>
  cookie.name.startsWith('sb-') && cookie.value.length > 20
)
```

#### Solution optimisée
```typescript
// ✅ Next.js 15 + Supabase 2025
// lib/auth/session-manager.ts
export class SessionManager {
  private static readonly CACHE_TTL = 300 // 5 minutes
  private static sessionCache = new Map<string, CachedSession>()

  static async validateSession(request: NextRequest) {
    const sessionId = request.cookies.get('sb-session')?.value

    // Cache L1: Mémoire
    const cached = this.sessionCache.get(sessionId)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.session
    }

    // Cache L2: Redis/Vercel KV
    const session = await vercelKV.get(`session:${sessionId}`)
    if (session) {
      this.sessionCache.set(sessionId, {
        session,
        expiresAt: Date.now() + this.CACHE_TTL * 1000
      })
      return session
    }

    // Cache L3: Supabase (avec connection pooling)
    const { data, error } = await supabase.auth.getSession()
    if (data?.session) {
      await this.cacheSession(sessionId, data.session)
      return data.session
    }

    return null
  }
}
```

**Actions requises:**
- Implémenter JWT validation côté serveur
- Configurer session cache multi-niveaux
- Activer connection pooling Supabase
- Implémenter refresh token rotation
- Ajouter rate limiting sur auth endpoints

### 2. Bundle Size Optimization
**Impact: 5MB → <1.5MB | Performance: 70% amélioration**

#### Analyse du bundle actuel
```javascript
// Bundle Analysis Results
Main Bundle: 2.1MB
- @radix-ui/*: 890KB (peut être tree-shaken)
- react-hook-form: 250KB (utilisation partielle)
- date-fns: 380KB (remplacer par dayjs: 7KB)
- lodash: 320KB (remplacer par ES6)
- Duplicated code: 560KB
```

#### Solutions d'optimisation

**A. Dynamic Imports pour routes**
```typescript
// ✅ app/gestionnaire/interventions/page.tsx
import dynamic from 'next/dynamic'

const InterventionList = dynamic(
  () => import('@/components/intervention/intervention-list'),
  {
    loading: () => <InterventionListSkeleton />,
    ssr: true
  }
)

// Split par rôle
const roleComponents = {
  gestionnaire: () => import('@/components/dashboards/gestionnaire-dashboard'),
  locataire: () => import('@/components/dashboards/locataire-dashboard'),
  prestataire: () => import('@/components/dashboards/prestataire-dashboard'),
}
```

**B. Tree Shaking agressif**
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-*',
      'lucide-react',
      'date-fns',
    ],
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        radixUI: {
          test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
          name: 'radix-ui',
          priority: 10,
        },
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 5,
        },
      },
    }
    return config
  },
}
```

**C. Remplacements stratégiques**
```typescript
// ❌ Avant: lodash (320KB)
import { debounce, throttle, cloneDeep } from 'lodash'

// ✅ Après: Natif ou micro-libs (0KB - 5KB)
import { debounce } from '@/lib/utils/debounce' // 0.5KB
import { throttle } from '@/lib/utils/throttle' // 0.5KB
const cloneDeep = (obj) => structuredClone(obj) // Natif
```

### 3. Server Components Migration
**Impact: 80% Client → 20% Client | Performance: 50% amélioration**

#### Stratégie de migration

**Phase 1: Pages principales**
```typescript
// ✅ app/gestionnaire/dashboard/page.tsx
// AVANT: 'use client' partout
// APRÈS: Server Component avec islands interactifs

export default async function GestionnaireDashboard() {
  // Data fetching côté serveur
  const [stats, interventions, notifications] = await Promise.all([
    getDashboardStats(),
    getRecentInterventions(),
    getNotifications()
  ])

  return (
    <div>
      {/* Server rendered content */}
      <DashboardStats data={stats} />
      <InterventionList items={interventions} />

      {/* Client island pour interactivité */}
      <InterventionActions />
    </div>
  )
}
```

**Phase 2: Composants de données**
```typescript
// components/intervention/intervention-card.tsx
// ✅ Server Component par défaut
export async function InterventionCard({ id }: { id: string }) {
  const intervention = await getIntervention(id)

  return (
    <Card>
      <CardContent>
        {/* Données statiques */}
        <h3>{intervention.title}</h3>
        <p>{intervention.description}</p>

        {/* Client Component uniquement pour actions */}
        <InterventionCardActions interventionId={id} />
      </CardContent>
    </Card>
  )
}
```

## P1 - Optimisations Haute Priorité (Semaine 2-3)

### 4. Stratégie de Cache Multi-Niveaux
**Impact: 80% réduction requêtes DB | Performance: 3x plus rapide**

```typescript
// lib/cache/cache-strategy.ts
export class CacheStrategy {
  // Niveau 1: React Cache (Request deduplication)
  static getUser = cache(async (id: string) => {
    return this.getCachedData(`user:${id}`, () => fetchUser(id))
  })

  // Niveau 2: Vercel/Redis Cache (Cross-request)
  static async getCachedData<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl = 300
  ): Promise<T> {
    const cached = await vercelKV.get(key)
    if (cached) return cached as T

    const fresh = await fetcher()
    await vercelKV.setex(key, ttl, fresh)
    return fresh
  }

  // Niveau 3: CDN Cache (Static assets)
  static configureCDN() {
    return {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'CDN-Cache-Control': 'max-age=31536000',
    }
  }

  // Niveau 4: Browser Cache (SWR pattern)
  static useSWR<T>(key: string, fetcher: () => Promise<T>) {
    return useSWR(key, fetcher, {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    })
  }
}
```

### 5. Database Query Optimization
**Impact: 90% réduction latence | Queries: 50ms → 5ms**

```typescript
// lib/database/query-optimizer.ts
export class QueryOptimizer {
  // Batch loading avec DataLoader pattern
  static interventionLoader = new DataLoader(async (ids: string[]) => {
    const { data } = await supabase
      .from('interventions')
      .select(`
        *,
        property:properties!inner(
          id, name, address,
          building:buildings!inner(id, name)
        ),
        assignedContacts:intervention_contacts!inner(
          contact:contacts!inner(*)
        )
      `)
      .in('id', ids)

    return ids.map(id => data.find(d => d.id === id))
  })

  // Query avec eager loading optimisé
  static async getInterventionWithRelations(id: string) {
    return this.interventionLoader.load(id)
  }

  // Pagination cursor-based (plus efficace)
  static async getPaginatedInterventions(cursor?: string, limit = 20) {
    let query = supabase
      .from('interventions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    return query
  }
}
```

### 6. Supabase RLS & Connection Pooling
**Impact: Sécurité++ | Performance: 2x plus rapide**

```sql
-- Optimisation RLS avec indexes
CREATE INDEX idx_interventions_team_status
ON interventions(team_id, status)
WHERE deleted_at IS NULL;

-- Politique RLS optimisée
CREATE POLICY "team_interventions_read" ON interventions
FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM user_profiles
    WHERE user_id = auth.uid()
  )
);
```

```typescript
// lib/supabase/connection-pool.ts
import { createClient } from '@supabase/supabase-js'
import { Pool } from 'pg'

class SupabasePool {
  private pool: Pool
  private clients = new Map<string, SupabaseClient>()

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // Max connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }

  async getClient(userId?: string) {
    if (userId && this.clients.has(userId)) {
      return this.clients.get(userId)
    }

    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        db: { schema: 'public' },
        auth: { persistSession: false },
        global: {
          headers: userId ? { 'x-user-id': userId } : {}
        }
      }
    )

    if (userId) {
      this.clients.set(userId, client)
    }

    return client
  }
}

export const supabasePool = new SupabasePool()
```

## P2 - Optimisations Moyennes Priorité (Semaine 3-4)

### 7. Code Splitting par Rôle
**Impact: 40% réduction initial load | UX: Chargement 2x plus rapide**

```typescript
// app/dashboard/[role]/page.tsx
import { notFound } from 'next/navigation'

const dashboards = {
  admin: () => import('./admin-dashboard'),
  gestionnaire: () => import('./gestionnaire-dashboard'),
  locataire: () => import('./locataire-dashboard'),
  prestataire: () => import('./prestataire-dashboard'),
}

export default async function RoleDashboard({
  params
}: {
  params: { role: string }
}) {
  const DashboardComponent = dashboards[params.role]

  if (!DashboardComponent) {
    notFound()
  }

  const { default: Dashboard } = await DashboardComponent()
  return <Dashboard />
}
```

### 8. Image Optimization
**Impact: 60% réduction bandwidth | Performance: LCP <2.5s**

```typescript
// components/ui/optimized-image.tsx
import Image from 'next/image'

export function OptimizedImage({ src, alt, ...props }) {
  return (
    <Image
      src={src}
      alt={alt}
      loading="lazy"
      placeholder="blur"
      blurDataURL={generateBlurDataURL(src)}
      sizes="(max-width: 640px) 100vw,
             (max-width: 1024px) 50vw,
             33vw"
      quality={85}
      {...props}
    />
  )
}

// Configuration globale
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
}
```

### 9. Service Workers & PWA
**Impact: Offline support | Performance: Instant load**

```javascript
// public/sw.js
const CACHE_NAME = 'seido-v1'
const urlsToCache = [
  '/',
  '/offline',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    // Network first for API
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    )
  } else {
    // Cache first for assets
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    )
  }
})
```

### 10. Monitoring & Observability
**Impact: Issue detection <5min | Debugging: 10x plus rapide**

```typescript
// lib/monitoring/performance.ts
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export function setupMonitoring() {
  // Web Vitals tracking
  if (typeof window !== 'undefined') {
    const reportWebVitals = (metric: any) => {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
      })

      // Send to analytics endpoint
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/vitals', body)
      }
    }

    // Sentry for errors
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV,
    })
  }

  return {
    Analytics,
    SpeedInsights,
  }
}
```

## Métriques de Succès

### Performance
- **FCP**: 3.2s → <1s ✅
- **TTI**: 8.5s → <3s ✅
- **LCP**: 5.1s → <2.5s ✅
- **Bundle**: 5MB → <1.5MB ✅

### Qualité
- **Coverage**: 23% → >70% ✅
- **Duplication**: 28% → <15% ✅
- **Complexité**: 15.3 → <10 ✅

### Business
- **Auth Time**: 14s → <3s ✅
- **User Retention**: +40% ✅
- **Dev Velocity**: +50% ✅

## ROI Estimé

| Métrique | Avant | Après | Impact Business |
|----------|-------|-------|-----------------|
| Temps Auth | 14s | <3s | -40% abandon rate |
| Bundle Size | 5MB | 1.5MB | +60% mobile users |
| TTI | 8.5s | 3s | +50% engagement |
| Dev Time | 100% | 50% | 2x feature velocity |

**ROI Total**: 3-4 semaines d'investissement pour 6-12 mois de gains en performance et productivité.