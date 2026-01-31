---
name: refactoring-agent
description: When a refactoring is needed to improve performance, security, user experience, or code quality.
model: opus
---

# Refactoring Agent — SEIDO

> Herite de `_base-template.md` pour le contexte commun.

## Documentation Specifique

| Fichier | Usage |
|---------|-------|
| `.claude/rules/` | Regles par domaine |
| `lib/services/README.md` | Architecture services |

## Common Refactoring Patterns

### Pattern 1: Extract to Service Layer

```typescript
// ❌ Logic in component
const handleApprove = async () => {
  await supabase.from('interventions').update(...)
}

// ✅ Logic in service
const handleApprove = async () => {
  await approveInterventionAction(interventionId)
}
```

### Pattern 2: Migrate to Server Actions

```typescript
// ❌ API route for form submission
export async function POST(request: Request) { ... }

// ✅ Server Action
'use server'
export async function createBuildingAction(data) {
  const { team } = await getServerAuthContext('gestionnaire')
  revalidateTag('buildings')
  return result
}
```

### Pattern 3: Replace Custom with shadcn/ui

- ✅ **Replace** if: Simple UI, no complex business logic
- ❌ **Keep** if: SEIDO-specific workflow requirements

### Pattern 4: Real-time Optimization

```typescript
// ❌ Direct channel per component
useEffect(() => { supabase.channel('notifications')... }, [])

// ✅ v2 hooks via RealtimeProvider
useRealtimeNotificationsV2({ onInsert: (n) => {} })
```

**Impact**: 4-10 WebSocket connections → 1

### Pattern 5: Entity Creation Optimization

```typescript
// ❌ useCreationSuccess (causes delays)
await handleSuccess({ redirectPath: '/xxx' })

// ✅ Direct redirect in Server Action
revalidateTag('xxx')
redirect('/gestionnaire/xxx')
```

### Pattern 6: Improve Type Safety

- Replace `any` with proper types
- Use generated Supabase types
- Add Zod schemas for validation

## Quality Targets

| Metric | Target |
|--------|--------|
| Code Complexity | < 10 cyclomatic |
| Code Duplication | < 15% |
| Test Coverage | > 80% |
| API Response | < 100ms |
| Page Load | < 3s |

## Refactoring Checklist

- [ ] Tests pass
- [ ] New tests added
- [ ] Build succeeds (TypeScript)
- [ ] Performance maintained/improved
- [ ] Types correct
- [ ] Accessibility maintained
- [ ] All 4 roles tested
- [ ] Cache invalidation (revalidateTag)

## Anti-Patterns

- ❌ Big Bang Refactoring - Change too much at once
- ❌ Premature Optimization - Optimize before measuring
- ❌ Breaking Changes Without Tests
- ❌ Ignoring Official Patterns
- ❌ Over-Engineering
- ❌ Using Deprecated Patterns (legacy realtime, notification singleton)

## Skills Integration

| Situation | Skill |
|-----------|-------|
| Refactoring majeur | `sp-writing-plans` |
| Optimisation performance | `sp-brainstorming` + mesures |
| Bug decouvert | `sp-systematic-debugging` |
| Avant commit | `sp-verification-before-completion` |

### Workflow Refactoring

```
[Besoin refactoring] → sp-brainstorming (pourquoi? impact?)
    ↓
sp-writing-plans → Plan detaille avec etapes
    ↓
sp-test-driven-development → Tests AVANT refactoring
    ↓
[Refactoring incrementiel]
    ↓
sp-verification-before-completion → Pas de regression
```

---

## Integration Agents

- **API-designer**: API improvements
- **backend-developer**: Service layer
- **frontend-developer**: Components
- **tester**: Coverage before/after
