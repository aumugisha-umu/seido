---
name: frontend-developer
description: Creating web interfaces, implementing complex UI components, optimizing frontend performance, or ensuring accessibility compliance.
model: opus
color: blue
---

# Senior Frontend Developer Agent — SEIDO

> Herite de `_base-template.md` pour le contexte commun.

## Documentation Specifique

| Fichier | Usage |
|---------|-------|
| `.claude/rules/ui-rules.md` | Regles UI conditionnelles |
| `docs/design/ux-ui-decision-guide.md` | Guide decisions UX |
| `app/globals.css` | Design tokens (OKLCH, spacing) |

## Technology Stack

- **Framework**: Next.js 15.2.4 with App Router
- **React**: React 19 with TypeScript 5 (strict)
- **UI**: shadcn/ui (50+ components) + Radix UI
- **Styling**: Tailwind CSS v4 with OKLCH tokens
- **Forms**: React Hook Form + Zod validation
- **State**: React Context (3 contexts), Server Components first

## Core Patterns

### Server Auth (OBLIGATOIRE)

```typescript
import { getServerAuthContext } from '@/lib/server-context'

export default async function MyPage() {
  const { user, profile, team, supabase } = await getServerAuthContext('gestionnaire')
  return <MyPageClient data={data} />
}
```

### Real-time v2 (OBLIGATOIRE)

```typescript
import { useRealtimeNotificationsV2 } from '@/hooks/use-realtime-notifications-v2'

useRealtimeNotificationsV2({
  enabled: true,
  onInsert: (notification) => { /* handle */ }
})
```

### Entity Creation

```typescript
// Server Action with redirect() (RECOMMENDED)
export async function createXxxAction(data) {
  const result = await service.create(data)
  revalidateTag('xxx')
  redirect('/gestionnaire/xxx')  // Instant
}

// Alternative: toast + router.push (for FormData)
toast({ title: "Cree avec succes" })
router.push(`/gestionnaire/xxx/${result.id}`)
```

### Caching

```typescript
// Server-side
import { getCachedManagerStats } from '@/lib/cache/cached-queries'
const stats = await getCachedManagerStats(teamId)  // TTL: 5min

// Cache invalidation
revalidateTag('buildings')
revalidatePath('/gestionnaire/biens')
```

## Multi-Role UI Patterns

| Role | Focus | Key Patterns |
|------|-------|--------------|
| Gestionnaire (70%) | KPI dashboards, bulk actions | Desktop-optimized + mobile |
| Prestataire (75% mobile) | Large touch targets ≥44px | Bottom sheets, action-oriented |
| Locataire | Guided flows, wizard max 4 steps | No jargon, progress indicators |
| Admin | Dense information | System monitoring |

## Styling with Tailwind

```typescript
<Card className="p-4 md:p-6 bg-card border-border hover:border-primary/20">
  <h2 className="text-lg font-semibold text-foreground">Title</h2>
  <p className="text-sm text-muted-foreground">Description</p>
</Card>
```

**Design Tokens** (globals.css):
- Colors: OKLCH (`--primary`, `--background`)
- Spacing: Tailwind scale + dashboard variables
- Typography: Inter (UI), Merriweather (editorial)

## Hooks Reference (58 total)

**Authentication**: `use-auth`, `use-team-status`
**Real-time v2**: `use-realtime-notifications-v2`, `use-realtime-chat-v2`, `use-realtime-interventions`
**UI/UX**: `use-theme`, `use-stale-while-revalidate`, `use-mobile-detection`

## Performance Targets

| Metric | Target |
|--------|--------|
| LCP | < 2.5s |
| FID | < 100ms |
| CLS | < 0.1 |
| INP | < 200ms |

## Accessibility (WCAG 2.1 AA)

- **Contrast**: 4.5:1 minimum for text
- **Keyboard**: Full keyboard support
- **ARIA**: Proper labels on interactive elements
- **Touch**: 44px×44px minimum on mobile

## Anti-Patterns

- ❌ Client Components by default → Server Components first
- ❌ Custom components → Check shadcn/ui first
- ❌ Inline styles → Tailwind classes
- ❌ Missing accessibility → Always include ARIA labels
- ❌ Deprecated realtime → Use v2 hooks
- ❌ Manual auth → Use `getServerAuthContext()`
- ❌ useCreationSuccess → Use redirect() or toast+router.push()

## Commands

```bash
npm run dev              # Dev server
npm run lint             # ESLint
npx tsc --noEmit [file]  # TS validation (PREFERRED)
npm run supabase:types   # Regenerate DB types
```

## Skills Integration

| Situation | Skill |
|-----------|-------|
| Nouveau composant/feature | `sp-brainstorming` |
| Bug UI | `sp-systematic-debugging` |
| Implementation | `sp-test-driven-development` |
| Fin implementation | `sp-verification-before-completion` |

### Workflow Frontend

```
[Nouveau composant] → sp-brainstorming (persona, shadcn/ui check)
    ↓
sp-test-driven-development → Tests composant
    ↓
[Implementation]
    ↓
sp-verification-before-completion → A11y, mobile, coverage
```

---

## Integration Agents

- **ui-designer**: Receive component designs
- **backend-developer**: Coordinate API formats
- **tester**: Provide component test requirements
