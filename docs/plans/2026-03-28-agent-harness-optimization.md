# Agent Harness Optimization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use sp-executing-plans to implement this plan task-by-task.

**Goal:** Optimize SEIDO's agent configuration based on GitHub's "Lessons from 2,500+ repos" study — close 4 gaps (boundaries, structure, examples, bootstrap).
**Architecture:** Pure documentation refactoring (CLAUDE.md, agent .md files, session hook). Zero code changes, zero risk to production.
**Tech Stack:** Markdown, JavaScript (hook script)

**Source:** User-provided analysis of [GitHub Blog study](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)

---

## Acceptance Criteria

- [ ] CLAUDE.md has a 3-tier Boundaries section replacing INTERDICTIONS
- [ ] CLAUDE.md has a condensed Project Structure section (no stale counts)
- [ ] 4 agent files (frontend, backend, database-analyzer, tester) have Example Output sections
- [ ] Tester agent has correct Playwright references (not Puppeteer)
- [ ] Session startup hook checks node_modules, .env.local, and stale context
- [ ] `npm run lint` passes after all changes

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| CLAUDE.md grows too long | Medium | Medium | Keep boundaries concise, use bullet points |
| Agent examples drift from real patterns | Low | Medium | Copy from actual codebase files |
| Hook adds latency to session start | Low | Low | All checks are fs.existsSync (< 5ms each) |

---

## Task 1: Three-Tier Boundaries in CLAUDE.md

**Files:**
- Modify: `.claude/CLAUDE.md` (lines 1-8)

**Step 1: Replace INTERDICTIONS with Boundaries**

Replace the current section:
```markdown
## INTERDICTIONS (Never violate)

1. **No git without `git*`:** ...
2. **No build without ask:** ...
3. **No direct Supabase:** ...
4. **No `any` / `console.log`:** ...
```

With:
```markdown
## Boundaries

### Auto-Apply (no confirmation needed)
- Repository Pattern for ALL Supabase queries — never direct calls in components
- `getServerAuthContext(role)` in Server Components, `getServerActionAuthContextOrNull()` in Server Actions
- Grep codebase for existing utils/components before creating new ones
- Docs First: context7 → official docs → never code from memory
- Update `discovery-tree.json` when adding/modifying/removing routes
- Use `demo+invite-{timestamp}@seido-app.com` for test email addresses
- Use `after()` from `next/server` for post-response side-effects (emails, notifications, logs)
- Add `data-testid` on interactive elements for E2E resilience

### Ask First (before implementation)
- New DB migration or schema change
- New server action with business logic
- Modifying auth/RLS/middleware/security
- Cross-cutting changes touching 3+ domains (DB+API+UI)
- Adding new npm dependency
- Modifying billing/subscription/payment flow
- Deleting or renaming files used across multiple modules
- Changing intervention status flow or quote statuts
- Deleting DB data or dropping columns

### Never Do
- `git add`/`commit`/`push` without user typing `git*`
- `npm run build` without explicit ask (exception: `git*` FULL gate)
- `npm run dev` without explicit ask
- Leave `any` types or `console.log` in production code
- Direct Supabase calls in components (Repository Pattern only)
- Commit `.env`, credentials, or secrets
- Force-push to `main`/`preview` branches
- Use `users.team_id` for access control (use `team_members`)
- Use `.single()` for multi-team queries (use `.limit(1)`)
- Create new files when editing existing ones achieves the goal
- Skip `sp-systematic-debugging` when encountering non-trivial bugs
```

**Step 2: Verify**
- Visually confirm all 4 original INTERDICTIONS are covered in "Never Do"
- Confirm `npm run dev` prohibition (from global CLAUDE.md) is included
- Confirm no duplication with Commit Workflow section

---

## Task 2: Project Structure Map in CLAUDE.md

**Files:**
- Modify: `.claude/CLAUDE.md` (insert after Boundaries, before Commit Workflow)

**Step 1: Add Project Structure section**

Insert between the Boundaries and Commit Workflow sections:

```markdown
## Project Structure

```
app/                    → Next.js App Router
  [role]/(with-navbar)/ → Role-scoped pages (admin, gestionnaire, prestataire, locataire)
  actions/              → Server actions (21 files)
  api/                  → API routes (REST + cron/ + webhooks)
components/             → Reusable UI components (grouped by domain)
  ui/                   → shadcn/ui primitives
hooks/                  → Custom React hooks
lib/
  services/
    core/               → Supabase clients, BaseRepository, error handler
    repositories/       → Data access layer (one per entity)
    domain/             → Business logic services
  email/                → Resend client, EMAIL_CONFIG
  types/                → Shared TypeScript types
  validation/           → Zod schemas
  utils/                → Utility functions
contexts/               → React contexts (auth, realtime, subscription)
supabase/migrations/    → SQL migrations (chronological)
tests/                  → E2E (Playwright) + unit (Vitest) + integration
  shared/pages/         → Shared Page Object Models
docs/                   → Design docs, plans, learnings, QA
.claude/                → Agent configs, skills, rules, memory bank, hooks
blog/articles/          → Markdown blog posts with YAML frontmatter
middleware.ts           → Auth routing + role redirect (root file)
```

> Exact counts evolve — use `Glob` to count. Structural map above is stable.
```

**Step 2: Verify** no stale numbers in the map.

---

## Task 3: Example Outputs for 4 Priority Agents

**Files:**
- Modify: `.claude/agents/frontend-developer.md`
- Modify: `.claude/agents/backend-developer.md`
- Modify: `.claude/agents/database-analyzer.md`
- Modify: `.claude/agents/tester.md`

### Task 3a: frontend-developer.md — Add Example Output

Append before the `## Integration Agents` section:

```markdown
## Example Output

### When asked to create a new page (Server Component + Client):

**page.tsx** (Server Component):
```typescript
import { getServerAuthContext } from '@/lib/server-context'
import { BuildingRepository } from '@/lib/services/repositories/building.repository'
import { MyFeatureClient } from './my-feature-client'

export const dynamic = 'force-dynamic'

export default async function MyFeaturePage() {
  const { team, supabase } = await getServerAuthContext('gestionnaire')
  const repository = new BuildingRepository(supabase)
  const buildings = await repository.findByTeamId(team.id)
  return <MyFeatureClient initialData={buildings} />
}
```

**my-feature-client.tsx** (Client Component):
```typescript
'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Props = { initialData: Building[] }

export const MyFeatureClient = ({ initialData }: Props) => {
  const handleAction = async (id: string) => {
    await myServerAction(id)
  }

  return (
    <div className="space-y-4">
      {initialData.map((item) => (
        <Card key={item.id} className="p-4" data-testid={`item-${item.id}`}>
          <Button onClick={() => handleAction(item.id)}>Action</Button>
        </Card>
      ))}
    </div>
  )
}
```

### What NOT to produce:
- Auth with raw `createServerSupabaseClient()` + `supabase.auth.getUser()`
- Client Component with `useEffect` for initial data fetching
- Direct `supabase.from('table')` calls in component files
- Inline styles or CSS modules (Tailwind only)
- Missing `data-testid` on interactive elements
- Missing `export const dynamic = 'force-dynamic'` on authenticated pages
```

### Task 3b: backend-developer.md — Add Example Output

Append before `## Integration Agents`:

```markdown
## Example Output

### When asked to create a new server action:

```typescript
'use server'

import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { BuildingRepository } from '@/lib/services/repositories/building.repository'
import { after } from 'next/server'
import { logger } from '@/lib/logger'

export async function updateBuildingAction(buildingId: string, data: BuildingUpdateInput) {
  const ctx = await getServerActionAuthContextOrNull('gestionnaire')
  if (!ctx) return { error: 'Non autorise' }

  const repository = new BuildingRepository(ctx.supabase)
  const result = await repository.update(buildingId, { ...data, team_id: ctx.team.id })

  // Deferred side-effects (non-blocking)
  after(async () => {
    await createBuildingNotification(buildingId)
    logger.info('Building updated', { buildingId, teamId: ctx.team.id })
  })

  return result
}
```

### When asked to create a new repository method:

```typescript
async findByTeamWithStats(teamId: string) {
  const { data, error } = await this.supabase
    .from('buildings_active')       // Always use _active views
    .select('*, lots_active(count)') // Nested count
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}
```

### What NOT to produce:
- `getServerAuthContext()` in server actions (use `getServerActionAuthContextOrNull()`)
- Missing `after()` for emails/notifications (blocks response)
- Raw SQL or direct Supabase calls outside repositories
- `any` return types or untyped error handling
- Missing Zod validation on POST/PUT request bodies in API routes
- `console.log` instead of `logger` from `@/lib/logger`
```

### Task 3c: database-analyzer.md — Add Example Output

The file already has an `Output Attendu` section (line 163). Enhance it with a concrete migration example. Replace the existing `## Output Attendu` with:

```markdown
## Example Output

### Analysis report format:

```markdown
## Database Analysis Report — 2026-03-28

### Metrics
- Tables: 56 | Enums: 12 | Migrations: 202 | RLS functions: 10

### RLS Audit
| Table | INSERT | SELECT | UPDATE | DELETE | Issue |
|-------|--------|--------|--------|--------|-------|
| buildings | is_team_manager | can_view_building | is_team_manager | is_team_manager | OK |
| lots | is_team_manager | can_view_lot | is_team_manager | - | Missing DELETE policy |

### Denormalization Triggers
| Table | Trigger | Source | Status |
|-------|---------|--------|--------|
| conversation_messages | tr_conversation_messages_team_id | thread → intervention | OK |

### Drifts
| Item | Issue | Severity |
|------|-------|----------|
| `lots` DELETE policy | Missing — soft delete only via app | Medium |
```

### When asked to write a migration:

```sql
-- Migration: 20260328120000_add_feature_table.sql

-- 1. Create table
CREATE TABLE IF NOT EXISTS feature_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 2. Indexes (always on FK + team_id)
CREATE INDEX idx_feature_items_team_id ON feature_items(team_id);

-- 3. Active view
CREATE OR REPLACE VIEW feature_items_active AS
  SELECT * FROM feature_items WHERE deleted_at IS NULL;

-- 4. RLS
ALTER TABLE feature_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_isolation" ON feature_items
  FOR ALL TO authenticated
  USING (is_team_manager(team_id))
  WITH CHECK (is_team_manager(team_id));

CREATE POLICY "admin_bypass" ON feature_items
  FOR ALL TO authenticated
  USING (is_admin());

-- 5. Updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON feature_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### What NOT to produce:
- Table without RLS policies
- Missing index on `team_id` or foreign keys
- Missing `_active` view for soft-deletable tables
- Using `users.team_id` in RLS (use `team_members` via `is_team_manager()`)
- `FOR ALL` policy when different actions need different checks
- Missing `updated_at` trigger
```

### Task 3d: tester.md — Fix Puppeteer references + Add Example Output

**Bug fix:** Lines 22, 137 reference Puppeteer — should be Playwright (migrated 2026-03-23 per memory bank).

Replace:
```
- **E2E**: Puppeteer 24.x + Vitest (NOT Playwright)
```
With:
```
- **E2E**: Playwright Test (migrated from Puppeteer 2026-03-23)
```

Replace:
```
- ❌ Using Playwright → Use Puppeteer + Vitest (SEIDO standard)
```
With:
```
- ❌ Using Puppeteer → Use Playwright Test (migrated 2026-03-23)
```

Then append before `## Integration Agents`:

```markdown
## Example Output

### When asked to write a unit test (Vitest):

```typescript
import { describe, it, expect, vi } from 'vitest'
import { BuildingService } from '@/lib/services/domain/building.service'

describe('BuildingService', () => {
  const mockRepository = {
    findByTeamId: vi.fn(),
    create: vi.fn(),
  }

  it('should return buildings for team', async () => {
    const buildings = [{ id: '1', name: 'Building A', team_id: 'team-1' }]
    mockRepository.findByTeamId.mockResolvedValue(buildings)

    const service = new BuildingService(mockRepository as any)
    const result = await service.getByTeam('team-1')

    expect(result).toEqual(buildings)
    expect(mockRepository.findByTeamId).toHaveBeenCalledWith('team-1')
  })
})
```

### When asked to write an E2E test (Playwright):

```typescript
import { test, expect } from '@playwright/test'
import { DashboardPage } from '@/tests/shared/pages/dashboard.page'

test.describe('Building creation', () => {
  let dashboard: DashboardPage

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page)
    await dashboard.navigateTo()
    await dashboard.dismissBanners()
  })

  test('gestionnaire can create a building', async ({ page }) => {
    await page.getByRole('link', { name: /patrimoine/i }).click()
    await page.getByRole('button', { name: /nouvel immeuble/i }).click()

    // Fill wizard step 1
    await page.getByLabel('Nom').fill('Immeuble Test')
    await page.getByRole('button', { name: /suivant/i }).click()

    // Verify creation
    await expect(page.getByText('Immeuble Test')).toBeVisible()
  })
})
```

### What NOT to produce:
- CSS class selectors (`page.locator('.btn-primary')`) — use semantic selectors
- Missing `dismissBanners()` after navigation (cookie + PWA banners reappear)
- Shared mutable state between tests (Pattern 5 violation)
- Hard-coded timeouts (`page.waitForTimeout(3000)`) — use proper waitFor conditions
- Missing `test.slow()` for Vercel preview cold starts
- Puppeteer syntax (migrated to Playwright 2026-03-23)
```

---

## Task 4: Session Bootstrap Health Checks

**Files:**
- Modify: `.claude/scripts/session-startup.js`

**Step 1: Add environment checks after existing context gathering (line 87)**

Insert between the context gathering and the summary building:

```javascript
// ── Environment Health Checks ──
const warnings = []

// Check node_modules
if (!fs.existsSync(path.resolve(ROOT, 'node_modules'))) {
  warnings.push('node_modules missing — run: npm install')
}

// Check .env.local
if (!fs.existsSync(path.resolve(ROOT, '.env.local'))) {
  warnings.push('.env.local missing — copy from .env.example')
}

// Check stale activeContext (compare vs latest commit on current branch)
try {
  const activeCtxStat = fs.statSync(path.resolve(ROOT, '.claude/memory-bank/activeContext.md'))
  const lastCommitDate = execSafe('git log -1 --format=%ci', '')
  if (lastCommitDate) {
    const ctxAge = Date.now() - activeCtxStat.mtimeMs
    const commitDate = new Date(lastCommitDate)
    const commitAge = Date.now() - commitDate.getTime()
    // Warn if activeContext is older than latest commit by 5+ days
    if (ctxAge - commitAge > 5 * 24 * 60 * 60 * 1000) {
      warnings.push('activeContext.md is stale — consider /sync-memory')
    }
  }
} catch { /* ignore */ }

// Check database.types.ts vs latest migration
try {
  const typesFile = path.resolve(ROOT, 'lib/database.types.ts')
  const migrationsDir = path.resolve(ROOT, 'supabase/migrations')
  if (fs.existsSync(typesFile) && fs.existsSync(migrationsDir)) {
    const typesStat = fs.statSync(typesFile)
    const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
    if (migrations.length > 0) {
      const latestMigration = fs.statSync(path.resolve(migrationsDir, migrations[migrations.length - 1]))
      if (latestMigration.mtimeMs > typesStat.mtimeMs) {
        warnings.push('database.types.ts may be stale — run: npm run supabase:types')
      }
    }
  }
} catch { /* ignore */ }
```

**Step 2: Add warnings to output (before the closing bar)**

Insert before `lines.push('━━━━━━━━━━━━')`:

```javascript
if (warnings.length > 0) {
  lines.push('')
  lines.push('Warnings:')
  warnings.forEach(w => lines.push(`  ! ${w}`))
}
```

**Step 3: Verify** — Hook timeout is 10s. All checks are `fs.existsSync` + `fs.statSync` (< 5ms each). No risk of timeout.

---

## Task 5: Fix stale _base-template.md metrics

**Files:**
- Modify: `.claude/agents/_base-template.md` (line 25-38)

The metrics table says "2026-01-23" with outdated numbers. Replace with a note pointing to activeContext.md (which has up-to-date metrics):

Replace:
```markdown
## Metriques SEIDO (2026-01-23)

| Categorie | Count |
|-----------|-------|
| Composants | 369 |
| ... |
```

With:
```markdown
## Metriques SEIDO

> Exact counts in `.claude/memory-bank/activeContext.md` § Metriques Systeme.
> Key: 56 tables, 202 migrations, 4 roles, 9 intervention statuts, 7 quote statuts.
```

---

## Recap

| Task | Files | Size | Description |
|------|-------|------|-------------|
| 1 | CLAUDE.md | S | Three-tier Boundaries replacing INTERDICTIONS |
| 2 | CLAUDE.md | XS | Project Structure map (no stale counts) |
| 3a | frontend-developer.md | S | Example Output section |
| 3b | backend-developer.md | S | Example Output section |
| 3c | database-analyzer.md | S | Enhanced Example Output |
| 3d | tester.md | S | Fix Puppeteer refs + Example Output |
| 4 | session-startup.js | S | Environment health checks |
| 5 | _base-template.md | XS | Fix stale metrics |

**Dependencies:** None between tasks — all parallelizable.
**Validation:** `npm run lint` after all changes (docs don't affect lint, but session-startup.js might).

---

**Plan complete. Two execution options:**
1. **Subagent-Driven (this session)** — Use sp-subagent-driven-development
2. **Parallel Session (separate)** — Use sp-executing-plans

**Which approach?**
