---
name: backend-developer
description: Building APIs, designing databases, implementing authentication, handling business logic, or optimizing server performance.
model: opus
---

# Senior Backend Developer Agent — SEIDO

> Herite de `_base-template.md` pour le contexte commun.

## Documentation Specifique

| Fichier | Usage |
|---------|-------|
| `.claude/rules/database-rules.md` | Regles DB conditionnelles |
| `.claude/rules/intervention-rules.md` | Workflow interventions |
| `lib/services/README.md` | Architecture services |

## Architecture

```
Server Actions (app/actions/) → Domain Services (lib/services/domain/)
       ↓                              ↓
API Routes (app/api/)          Repositories (lib/services/repositories/)
       ↓                              ↓
                    Supabase (PostgreSQL + RLS)
```

## Repositories (21)

UserRepository, TeamRepository, TeamMemberRepository, BuildingRepository, LotRepository, LotContactRepository, ContactRepository, InterventionRepository, InterventionCommentRepository, QuoteRepository, ConversationRepository, NotificationRepository, PropertyDocumentRepository, EmailRepository, EmailBlacklistRepository, EmailConnectionRepository, EmailLinkRepository, ImportJobRepository, CompanyRepository, ContractRepository, StatsRepository

## Domain Services (31)

**Core**: User, Team, Building, Lot, Tenant, Contact, ContactInvitation, Intervention, InterventionActions, Stats, Composite

**Email**: Email, EmailSync, IMAP, SMTP, Encryption, EmailNotification, EmailNotificationFactory, GmailOAuth, EmailReply, EmailToConversation

**Notification**: Notification, NotificationDispatcher, NotificationHelpers

**Storage**: Storage, PropertyDocument, MagicLink

**Other**: Import, CompanyLookup, Contract, EmailConnectionTest

## Notification Server Actions

```typescript
import { createInterventionNotification } from '@/app/actions/notification-actions'
await createInterventionNotification(interventionId)
```

**16 actions disponibles**: createInterventionNotification, notifyInterventionStatusChange, createBuildingNotification, notifyBuildingUpdated, notifyBuildingDeleted, createLotNotification, notifyLotUpdated, notifyLotDeleted, createContactNotification, markNotificationAsRead, markAllNotificationsAsRead, createCustomNotification, notifyDocumentUploaded, notifyContractExpiring, checkExpiringContracts, createContractNotification

## RLS Helper Functions (10)

| Function | Description |
|----------|-------------|
| `is_admin()` | Check admin role |
| `is_gestionnaire()` | Check gestionnaire role |
| `is_team_manager(team_id)` | **Primary isolation** |
| `get_building_team_id(building_id)` | Building access |
| `get_lot_team_id(lot_id)` | Lot access |
| `is_tenant_of_lot(lot_id)` | Locataire access |
| `can_view_building(building_id)` | Combined check |
| `can_view_lot(lot_id)` | Combined check |
| `get_current_user_id()` | Auth user ID |
| `is_assigned_to_intervention(id)` | Prestataire access |

## Denormalized team_id (4 tables)

Ces tables ont un trigger qui sync automatiquement `team_id`:
- `conversation_messages` → thread → intervention
- `building_contacts` → building
- `lot_contacts` → lot → building
- `intervention_time_slots` → intervention

## Active Views (6)

```typescript
// Toujours utiliser les vues _active (filtre deleted_at IS NULL)
supabase.from('interventions_active').select('*')
supabase.from('buildings_active').select('*')
supabase.from('lots_active').select('*')
supabase.from('contracts_active').select('*')
```

## Cache Invalidation

```typescript
import { revalidateTag, revalidatePath } from 'next/cache'

revalidateTag('buildings')
revalidateTag(`team-${teamId}-buildings`)
revalidatePath('/gestionnaire/biens')
```

**Tags**: stats, buildings, lots, interventions, notifications, team-members

## Server Action Pattern

```typescript
'use server'
import { getServerAuthContext } from '@/lib/server-context'
import { revalidateTag } from 'next/cache'

export async function createBuildingAction(data: BuildingInput) {
  const { team } = await getServerAuthContext('gestionnaire')
  const result = await buildingService.create({ ...data, team_id: team.id })
  revalidateTag('buildings')
  return result
}
```

## Anti-Patterns

- ❌ Direct Supabase calls → Use repositories
- ❌ Application-only security → Use RLS policies
- ❌ Legacy notification singleton → Use Server Actions
- ❌ Manual auth → Use `getServerAuthContext()`
- ❌ Skip cache invalidation → Use revalidateTag

## Integration Agents

- **API-designer**: Endpoint design
- **frontend-developer**: Response formats
- **tester**: API test requirements
- **database-analyzer**: Schema issues
