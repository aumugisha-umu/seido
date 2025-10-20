# 04 - Guide des Bonnes Pratiques - Next.js 15 & Supabase 2025

## Architecture Moderne Next.js 15

### 1. Server Components First

#### Principe Fondamental
```typescript
// ✅ BONNE PRATIQUE: Server Component par défaut
// app/dashboard/page.tsx
export default async function Dashboard() {
  const data = await fetchData() // Fetch côté serveur
  return <DashboardView data={data} />
}

// ❌ MAUVAISE PRATIQUE: Client Component inutile
'use client'
export default function Dashboard() {
  const [data, setData] = useState(null)
  useEffect(() => {
    fetchData().then(setData) // Fetch côté client
  }, [])
  return <DashboardView data={data} />
}
```

#### Règles de Décision

**Utiliser Server Components quand:**
- Fetch de données
- Accès aux ressources backend
- Garder des informations sensibles côté serveur
- Grandes dépendances qui impactent le bundle

**Utiliser Client Components quand:**
- Interactivité (onClick, onChange)
- Utilisation de hooks (useState, useEffect)
- Browser APIs (window, document)
- Animations et transitions

### 2. Data Fetching Patterns

#### Pattern 1: Parallel Data Loading
```typescript
// ✅ BONNE PRATIQUE: Chargement parallèle
export default async function PageWithData() {
  // Toutes les requêtes démarrent en même temps
  const [users, posts, comments] = await Promise.all([
    getUsers(),
    getPosts(),
    getComments()
  ])

  return (
    <>
      <UserList users={users} />
      <PostList posts={posts} />
      <CommentList comments={comments} />
    </>
  )
}

// ❌ MAUVAISE PRATIQUE: Waterfall requests
export default async function PageWithData() {
  const users = await getUsers()     // 100ms
  const posts = await getPosts()     // 100ms
  const comments = await getComments() // 100ms
  // Total: 300ms au lieu de 100ms
}
```

#### Pattern 2: Streaming avec Suspense
```typescript
// ✅ BONNE PRATIQUE: Progressive rendering
import { Suspense } from 'react'

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Affichage immédiat */}
      <Header />

      {/* Chargement progressif */}
      <Suspense fallback={<StatsSkeleton />}>
        <Stats />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <Charts />
      </Suspense>
    </div>
  )
}

async function Stats() {
  const data = await getStats() // 500ms
  return <StatsView data={data} />
}

async function Charts() {
  const data = await getCharts() // 1000ms
  return <ChartView data={data} />
}
```

#### Pattern 3: Optimistic Updates
```typescript
// ✅ BONNE PRATIQUE: Mise à jour optimiste
'use client'

export function TodoList({ todos }) {
  const [optimisticTodos, setOptimisticTodos] = useState(todos)
  const [isPending, startTransition] = useTransition()

  const addTodo = async (text: string) => {
    const newTodo = { id: uuid(), text, completed: false }

    // Mise à jour optimiste immédiate
    startTransition(() => {
      setOptimisticTodos([...optimisticTodos, newTodo])
    })

    try {
      // Appel API en arrière-plan
      await createTodo(newTodo)
    } catch (error) {
      // Rollback en cas d'erreur
      setOptimisticTodos(todos)
      toast.error('Erreur lors de l\'ajout')
    }
  }

  return (
    <div>
      {optimisticTodos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </div>
  )
}
```

### 3. Caching Strategy

#### Cache Layers Architecture
```typescript
// lib/cache/strategy.ts

// Layer 1: React Cache (Request Memoization)
import { cache } from 'react'

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } })
})

// Layer 2: Data Cache (Cross-request)
import { unstable_cache } from 'next/cache'

export const getCachedPosts = unstable_cache(
  async () => db.post.findMany(),
  ['posts'],
  {
    revalidate: 60, // Revalidate every 60 seconds
    tags: ['posts']
  }
)

// Layer 3: Full Route Cache
export const revalidate = 3600 // Revalidate page every hour

// Layer 4: CDN Cache
export async function GET() {
  return new Response(data, {
    headers: {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
    }
  })
}
```

#### Cache Invalidation Patterns
```typescript
// ✅ BONNE PRATIQUE: Invalidation ciblée
import { revalidateTag, revalidatePath } from 'next/cache'

// Server Action avec revalidation
export async function updatePost(id: string, data: PostData) {
  await db.post.update({ where: { id }, data })

  // Revalidation spécifique
  revalidateTag(`post-${id}`)
  revalidateTag('posts')
  revalidatePath(`/posts/${id}`)
}

// ❌ MAUVAISE PRATIQUE: Invalidation globale
export async function updatePost(id: string, data: PostData) {
  await db.post.update({ where: { id }, data })

  // Invalide TOUT le cache
  revalidatePath('/', 'layout')
}
```

### 4. Route Organization

#### Structure Recommandée
```
app/
├── (auth)/               # Groupe de routes auth
│   ├── login/
│   ├── register/
│   └── layout.tsx       # Layout partagé auth
│
├── (dashboard)/         # Groupe dashboard
│   ├── [role]/         # Dynamic segment
│   │   ├── page.tsx
│   │   └── loading.tsx
│   ├── layout.tsx      # Layout dashboard
│   └── template.tsx    # Re-render à chaque navigation
│
├── api/                # API routes
│   └── [route]/
│       └── route.ts
│
├── error.tsx          # Error boundary
├── not-found.tsx      # 404 page
└── layout.tsx         # Root layout
```

#### Parallel et Intercepting Routes
```typescript
// app/(dashboard)/@modal/(.)interventions/[id]/page.tsx
// Modal qui intercepte la navigation
export default function InterventionModal({ params }) {
  return (
    <Modal>
      <InterventionDetails id={params.id} />
    </Modal>
  )
}

// app/(dashboard)/layout.tsx
export default function Layout({ children, modal }) {
  return (
    <>
      {children}
      {modal} {/* Affiche le modal si présent */}
    </>
  )
}
```

## Supabase 2025 Best Practices

### 1. Connection Management

#### Singleton Pattern avec Pooling
```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

class SupabaseClientManager {
  private static instance: SupabaseClientManager
  private clients: Map<string, SupabaseClient> = new Map()
  private pool: SupabaseClient[] = []
  private maxPoolSize = 10

  static getInstance() {
    if (!this.instance) {
      this.instance = new SupabaseClientManager()
    }
    return this.instance
  }

  getClient(options?: ClientOptions): SupabaseClient {
    const key = this.generateKey(options)

    if (!this.clients.has(key)) {
      const client = this.createPooledClient(options)
      this.clients.set(key, client)
    }

    return this.clients.get(key)!
  }

  private createPooledClient(options?: ClientOptions) {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }

    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: true,
        },
        db: {
          schema: options?.schema || 'public'
        },
        global: {
          fetch: customFetch, // Custom fetch avec retry
        }
      }
    )
  }
}

export const supabase = SupabaseClientManager.getInstance()
```

### 2. Row Level Security (RLS)

#### Patterns RLS Optimisés
```sql
-- ✅ BONNE PRATIQUE: Politique avec index
CREATE INDEX idx_interventions_team_user
ON interventions(team_id, created_by);

CREATE POLICY "team_members_read" ON interventions
FOR SELECT USING (
  team_id IN (
    SELECT team_id
    FROM team_members
    WHERE user_id = auth.uid()
  )
);

-- ✅ BONNE PRATIQUE: Fonction helper pour performances
CREATE FUNCTION user_teams()
RETURNS SETOF uuid AS $$
  SELECT team_id
  FROM team_members
  WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE POLICY "optimized_team_read" ON interventions
FOR SELECT USING (team_id IN (SELECT user_teams()));

-- ❌ MAUVAISE PRATIQUE: Join complexe sans index
CREATE POLICY "complex_read" ON interventions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN team_members tm ON tm.user_id = u.id
    JOIN teams t ON t.id = tm.team_id
    WHERE u.id = auth.uid()
    AND t.id = interventions.team_id
    AND t.active = true
  )
);
```

### 3. Query Optimization

#### Utilisation des Vues et Functions
```sql
-- Vue matérialisée pour dashboard
CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT
  team_id,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'in_progress') as progress_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  AVG(EXTRACT(epoch FROM (completed_at - created_at))/3600)::int as avg_hours
FROM interventions
WHERE deleted_at IS NULL
GROUP BY team_id;

-- Index pour refresh rapide
CREATE UNIQUE INDEX idx_dashboard_stats_team
ON dashboard_stats(team_id);

-- Refresh automatique
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS trigger AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_stats
AFTER INSERT OR UPDATE OR DELETE ON interventions
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_dashboard_stats();
```

#### Batch Operations
```typescript
// ✅ BONNE PRATIQUE: Batch insert
const { data, error } = await supabase
  .from('interventions')
  .insert(interventions) // Array of objects
  .select()

// ✅ BONNE PRATIQUE: Upsert pour éviter conflits
const { data, error } = await supabase
  .from('users')
  .upsert(users, {
    onConflict: 'email',
    ignoreDuplicates: false
  })

// ❌ MAUVAISE PRATIQUE: Boucle d'insertions
for (const intervention of interventions) {
  await supabase
    .from('interventions')
    .insert(intervention)
}
```

### 4. Real-time Subscriptions

#### Gestion Optimisée des Subscriptions
```typescript
// lib/supabase/realtime.ts
class RealtimeManager {
  private subscriptions = new Map<string, RealtimeChannel>()

  subscribe(
    table: string,
    filter?: string,
    callback?: (payload: any) => void
  ): RealtimeChannel {
    const key = `${table}:${filter || 'all'}`

    if (!this.subscriptions.has(key)) {
      const channel = supabase
        .channel(key)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter
          },
          (payload) => {
            console.log('Change received:', payload)
            callback?.(payload)
          }
        )
        .subscribe()

      this.subscriptions.set(key, channel)
    }

    return this.subscriptions.get(key)!
  }

  unsubscribe(table: string, filter?: string) {
    const key = `${table}:${filter || 'all'}`
    const channel = this.subscriptions.get(key)

    if (channel) {
      channel.unsubscribe()
      this.subscriptions.delete(key)
    }
  }

  unsubscribeAll() {
    this.subscriptions.forEach(channel => {
      channel.unsubscribe()
    })
    this.subscriptions.clear()
  }
}

// Hook React pour realtime
export function useRealtimeSubscription(
  table: string,
  filter?: string
) {
  const [data, setData] = useState([])
  const manager = useRef(new RealtimeManager())

  useEffect(() => {
    const channel = manager.current.subscribe(
      table,
      filter,
      (payload) => {
        if (payload.eventType === 'INSERT') {
          setData(prev => [...prev, payload.new])
        } else if (payload.eventType === 'UPDATE') {
          setData(prev =>
            prev.map(item =>
              item.id === payload.new.id ? payload.new : item
            )
          )
        } else if (payload.eventType === 'DELETE') {
          setData(prev =>
            prev.filter(item => item.id !== payload.old.id)
          )
        }
      }
    )

    return () => {
      manager.current.unsubscribe(table, filter)
    }
  }, [table, filter])

  return data
}
```

## Security Best Practices

### 1. Authentication Flow

#### Secure Session Management
```typescript
// lib/auth/session.ts
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY!
)

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .setIssuedAt()
    .setNotBefore(new Date())
    .sign(secret)

  cookies().set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  })
}

export async function verifySession() {
  const sessionCookie = cookies().get('session')

  if (!sessionCookie) {
    return null
  }

  try {
    const { payload } = await jwtVerify(sessionCookie.value, secret)
    return payload
  } catch (error) {
    return null
  }
}
```

### 2. Input Validation

#### Zod Schemas
```typescript
// lib/validation/schemas.ts
import { z } from 'zod'

// ✅ BONNE PRATIQUE: Validation stricte
export const InterventionSchema = z.object({
  title: z.string()
    .min(3, 'Titre trop court')
    .max(100, 'Titre trop long')
    .regex(/^[a-zA-Z0-9\s\-éèêëàâäôöûüç]+$/, 'Caractères non autorisés'),

  description: z.string()
    .min(10, 'Description trop courte')
    .max(1000, 'Description trop longue'),

  priority: z.enum(['low', 'medium', 'high', 'urgent']),

  scheduledDate: z.date()
    .min(new Date(), 'Date doit être dans le futur')
    .optional(),

  assignedTo: z.array(z.string().uuid()).optional(),

  files: z.array(
    z.object({
      name: z.string(),
      size: z.number().max(10 * 1024 * 1024, 'Fichier trop volumineux'),
      type: z.enum(['image/jpeg', 'image/png', 'application/pdf'])
    })
  ).optional()
})

// Utilisation dans Server Action
export async function createIntervention(formData: FormData) {
  const rawData = Object.fromEntries(formData)

  // Validation
  const validatedData = InterventionSchema.parse(rawData)

  // Sanitization supplémentaire
  const sanitized = {
    ...validatedData,
    title: DOMPurify.sanitize(validatedData.title),
    description: DOMPurify.sanitize(validatedData.description)
  }

  // Création sécurisée
  return await db.intervention.create({
    data: sanitized
  })
}
```

### 3. CSRF Protection

```typescript
// middleware.ts
import { createHash } from 'crypto'

export async function middleware(request: NextRequest) {
  // CSRF token pour les mutations
  if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    const token = request.headers.get('x-csrf-token')
    const sessionToken = request.cookies.get('csrf-token')

    if (!token || !sessionToken || token !== sessionToken.value) {
      return new Response('Invalid CSRF token', { status: 403 })
    }
  }

  // Générer token pour les GET
  if (request.method === 'GET') {
    const token = createHash('sha256')
      .update(Math.random().toString())
      .digest('hex')

    const response = NextResponse.next()
    response.cookies.set('csrf-token', token, {
      httpOnly: true,
      sameSite: 'strict'
    })

    return response
  }

  return NextResponse.next()
}
```

## Performance Optimization

### 1. Bundle Size Optimization

#### Configuration Webpack Avancée
```javascript
// next.config.js
module.exports = {
  webpack: (config, { dev, isServer }) => {
    // Tree shaking agressif
    config.optimization.usedExports = true
    config.optimization.sideEffects = false

    // Split chunks optimization
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,

          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            priority: 40,
            enforce: true,
          },

          lib: {
            test(module) {
              return module.size() > 160000 &&
                /node_modules/.test(module.identifier())
            },
            name(module) {
              const hash = crypto.createHash('sha1')
              hash.update(module.identifier())
              return hash.digest('hex').substring(0, 8)
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },

          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },

          shared: {
            name(module, chunks) {
              return crypto
                .createHash('sha1')
                .update(chunks.reduce((acc, chunk) => acc + chunk.name, ''))
                .digest('hex')
                .substring(0, 8)
            },
            priority: 10,
            minChunks: 2,
            reuseExistingChunk: true,
          },
        },

        maxAsyncRequests: 30,
        maxInitialRequests: 30,
      }
    }

    // Minification avancée
    if (!dev) {
      config.optimization.minimizer.push(
        new TerserPlugin({
          terserOptions: {
            parse: { ecma: 8 },
            compress: {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2,
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ['console.log'],
            },
            mangle: { safari10: true },
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true,
            },
          },
        })
      )
    }

    return config
  },
}
```

### 2. Image Optimization

```typescript
// components/ui/responsive-image.tsx
import Image from 'next/image'
import { useState } from 'react'

export function ResponsiveImage({
  src,
  alt,
  priority = false,
  className = ''
}) {
  const [isLoading, setLoading] = useState(true)

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw,
               (max-width: 1024px) 50vw,
               33vw"
        priority={priority}
        quality={85}
        className={`
          object-cover duration-700 ease-in-out
          ${isLoading ? 'scale-110 blur-2xl grayscale' : 'scale-100 blur-0 grayscale-0'}
        `}
        onLoadingComplete={() => setLoading(false)}
      />
    </div>
  )
}
```

## Testing Strategy

### 1. Unit Testing

```typescript
// __tests__/auth.test.ts
import { describe, it, expect, vi } from 'vitest'
import { createSession, verifySession } from '@/lib/auth/session'

describe('Authentication', () => {
  it('creates valid session token', async () => {
    const userId = 'user123'
    await createSession(userId)

    const session = await verifySession()
    expect(session.userId).toBe(userId)
  })

  it('rejects expired tokens', async () => {
    vi.setSystemTime(new Date('2025-01-01'))
    await createSession('user123')

    vi.setSystemTime(new Date('2025-01-03'))
    const session = await verifySession()
    expect(session).toBeNull()
  })
})
```

### 2. Integration Testing

```typescript
// __tests__/integration/intervention-flow.test.ts
import { test, expect } from '@playwright/test'

test.describe('Intervention Workflow', () => {
  test('complete intervention lifecycle', async ({ page }) => {
    // 1. Login as gestionnaire
    await loginAs(page, 'gestionnaire@test.com')

    // 2. Create intervention
    const interventionId = await createIntervention(page, {
      title: 'Test Intervention',
      priority: 'high'
    })

    // 3. Assign to prestataire
    await assignIntervention(page, interventionId, 'prestataire@test.com')

    // 4. Switch to prestataire
    await loginAs(page, 'prestataire@test.com')

    // 5. Accept and complete
    await acceptIntervention(page, interventionId)
    await completeIntervention(page, interventionId)

    // 6. Verify completion
    const status = await page.locator(`[data-intervention="${interventionId}"]`)
      .getAttribute('data-status')
    expect(status).toBe('completed')
  })
})
```

## Monitoring & Observability

### 1. Performance Monitoring

```typescript
// lib/monitoring/vitals.ts
export function reportWebVitals(metric: NextWebVitalsMetric) {
  const body = JSON.stringify({
    name: metric.name,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    url: window.location.href,
    userAgent: navigator.userAgent,
  })

  // Send to analytics endpoint
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/vitals', body)
  } else {
    fetch('/api/vitals', {
      body,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    })
  }
}
```

### 2. Error Tracking

```typescript
// app/error.tsx
'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Une erreur est survenue</h2>
        <p className="text-gray-600 mb-8">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
}
```

## Conclusion

Ces bonnes pratiques représentent l'état de l'art pour le développement Next.js 15 et Supabase en 2025. Leur application permettra:

- **Performance**: Applications ultra-rapides (<1s FCP)
- **Sécurité**: Protection contre les vulnérabilités communes
- **Scalabilité**: Architecture supportant la croissance
- **Maintenabilité**: Code propre et testable
- **DX**: Expérience développeur optimale

L'adoption progressive de ces pratiques garantira la qualité et la pérennité de l'application SEIDO.