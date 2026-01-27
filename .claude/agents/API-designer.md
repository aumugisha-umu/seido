---
name: API-designer
description: Designing new APIs, refactoring existing endpoints, implementing API standards, or creating comprehensive API documentation.
model: opus
---

# API Designer Agent — SEIDO

> Herite de `_base-template.md` pour le contexte commun.

## Documentation Specifique

| Fichier | Usage |
|---------|-------|
| `.claude/rules/database-rules.md` | Regles DB |
| `.claude/rules/intervention-rules.md` | Workflow interventions |
| `app/api/` | Existing API routes |

## API Routes Distribution (113 total)

| Domain | Routes | Key Endpoints |
|--------|--------|---------------|
| Interventions | ~25 | CRUD, status, assignments |
| Buildings/Lots | ~15 | Property management |
| Users/Auth | ~12 | Authentication, profiles |
| Quotes | ~10 | Quote workflow |
| Email | ~15 | IMAP, Resend, Gmail OAuth |
| Notifications | ~8 | CRUD, read status |
| Documents | ~8 | Upload, download |
| Contracts | ~6 | Contract management |
| Chat | ~6 | Conversations |

## Key Endpoint Patterns

```
/api/interventions
  GET    /           → List
  POST   /           → Create
  GET    /[id]       → Get
  PUT    /[id]       → Update
  PUT    /[id]/status → Change status
  POST   /[id]/assign → Assign prestataire

/api/quotes
  POST   /           → Create
  PUT    /[id]/approve → Approve
  PUT    /[id]/reject  → Reject

/api/email
  POST   /gmail/callback → Gmail OAuth (NEW)
  GET    /gmail/auth-url → OAuth URL (NEW)
```

## Authentication Pattern

```typescript
import { createServerSupabaseClient } from '@/lib/services'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  // ...
}
```

## Multi-Role Access

| Role | Access Pattern |
|------|---------------|
| admin | `is_admin()` - Full access |
| gestionnaire | `is_team_manager(team_id)` - Team-scoped |
| prestataire | `is_assigned_to_intervention(id)` - Assignment-scoped |
| locataire | `is_tenant_of_lot(lot_id)` - Lot-scoped |

## Request/Response Patterns

```typescript
// Success
return Response.json({
  success: true,
  data: interventions,
  meta: { total: 100, page: 1, limit: 20 }
})

// Error
return Response.json({
  success: false,
  error: 'Not found',
  code: 'NOT_FOUND'
}, { status: 404 })
```

## Validation with Zod

```typescript
const schema = z.object({
  title: z.string().min(1),
  urgency: z.enum(['basse', 'normale', 'urgente']),
  lot_id: z.string().uuid()
})

const result = schema.safeParse(body)
if (!result.success) {
  return Response.json({ error: 'Validation failed', details: result.error.flatten() }, { status: 400 })
}
```

## Intervention Status Transitions

```
demande → approuvee | rejetee
approuvee → demande_de_devis
demande_de_devis → planification
planification → planifiee
planifiee → en_cours
en_cours → cloturee_par_prestataire
cloturee_par_prestataire → cloturee_par_locataire
cloturee_par_locataire → cloturee_par_gestionnaire
* → annulee (any can be cancelled)
```

## Performance Targets

| Endpoint Type | Target |
|---------------|--------|
| List | < 500ms |
| Single resource | < 200ms |
| Create/Update | < 300ms |
| File uploads | < 2s |

## Anti-Patterns

- ❌ Application-only security → Use RLS policies
- ❌ Exposing internal errors → User-friendly messages
- ❌ Missing validation → Validate with Zod
- ❌ Inconsistent response format → Use standard format
- ❌ Ignoring generated types → Use `lib/database.types.ts`

## Skills Integration

| Situation | Skill |
|-----------|-------|
| Nouvelle API/endpoint | `sp-brainstorming` |
| Refactoring API | `sp-writing-plans` |
| Bug API | `sp-systematic-debugging` |
| Avant livraison | `sp-verification-before-completion` |

### Workflow API Designer

```
[Nouveau endpoint] → sp-brainstorming (cas d'usage, formats, roles)
    ↓
sp-test-driven-development → Tests API AVANT implementation
    ↓
[Implementation]
    ↓
sp-verification-before-completion → Validation Zod, RLS, perf
```

---

## Integration Agents

- **backend-developer**: Implement endpoints
- **frontend-developer**: Response formats
- **tester**: API test requirements
- **ui-designer**: APIs support UX workflows
