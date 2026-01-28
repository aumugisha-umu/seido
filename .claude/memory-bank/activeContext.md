# SEIDO Active Context

## Focus Actuel
**Objectif:** Fix Multi-Equipe Conversations + Centralisation Adresses
**Branch:** `preview`
**Sprint:** Multi-Team Support + Google Maps Integration (Jan 2026)

---

## ✅ COMPLETE: Fix PostgREST Relations RLS (2026-01-29)

### Probleme Initial
La page `/gestionnaire/contacts/modifier/[id]` retournait 404 avec erreur Supabase silencieuse.

### Root Cause
Les **relations PostgREST** (`company:company_id(id, name, address_record:address_id(*))`) echouaient silencieusement quand les politiques RLS des tables liees (`companies`, `teams`, `addresses`) ne permettaient pas les jointures automatiques.

### Solution Appliquee
Refactoring complet de `contact.repository.ts` pour utiliser des **requetes separees** au lieu des relations PostgREST :

```typescript
// AVANT (echouait silencieusement)
.select(`*, company:company_id(id, name, address_record:address_id(*))`)

// APRES (robuste avec RLS)
const user = await this.supabase.from('users').select('*').eq('id', id)
const company = await this.fetchCompanyWithAddress(user.company_id)
const team = await this.fetchTeam(user.team_id)
return { ...user, company, team }
```

### Pattern Helpers DRY
```typescript
private async fetchCompanyWithAddress(companyId: string) { ... }
private async fetchTeam(teamId: string) { ... }
```

### Methodes Mises a Jour
- `findByIdWithRelations()` - Promise.all pour company + team
- `findByUser()` - Promise.all
- `findByRole()` - Promise.all dans map
- `findByTeam()` - **Batch queries** (1 query pour toutes les companies, 1 pour toutes les addresses)
- `findContactInTeam()` - Promise.all

---

## ✅ COMPLETE: Fix Conversation Threads Multi-Profil (2026-01-29)

### Probleme Initial
Les threads de conversation étaient créés mais :
1. Le gestionnaire n'apparaissait pas dans les participants
2. Les prestataires/locataires n'étaient pas ajoutés
3. Erreur CONFLICT sur participant insert

### Root Causes Identifies

| Probleme | Cause | Solution |
|----------|-------|----------|
| **Threads non créés** | `createInitialConversationThreads` jamais appelé | Ajouté dans API route |
| **CONFLICT error** | Trigger ajoute manager, puis code essaie aussi | Changé insert → upsert avec `ignoreDuplicates` |
| **Participants manquants** | Threads créés APRÈS assignments | Déplacé création AVANT assignments |
| **Ordre migrations** | Timestamps avant migrations existantes | Renommé avec timestamps séquentiels |

### Migrations Appliquees (dans l'ordre)

| Migration | Description |
|-----------|-------------|
| `20260129200003_fix_multi_profile_conversation_access.sql` | `can_view_conversation()` supporte multi-profil |
| `20260129200004_fix_missing_conversation_participants.sql` | Fix participants manquants |
| `20260129200005_add_managers_to_conversation_participants.sql` | Trigger `thread_add_managers` + ajout gestionnaires |
| `20260129200006_conversation_email_notifications.sql` | Notifications email conversations |

### Fichiers Modifies

| Fichier | Modification |
|---------|--------------|
| `app/api/create-manager-intervention/route.ts` | Thread creation AVANT assignments, utilise Service Role |
| `lib/services/repositories/conversation-repository.ts` | `upsert` avec `ignoreDuplicates` au lieu de plain insert |

### Pattern Final: Ordre Creation Intervention

```typescript
// 1. Create intervention
const intervention = await createIntervention(...)

// 2. ✅ CREATE CONVERSATION THREADS (AVANT assignments!)
const serviceClient = createServiceRoleSupabaseClient()
const conversationRepo = new ConversationRepository(serviceClient)
await conversationRepo.createThread({ intervention_id, thread_type: 'group', ... })
await conversationRepo.createThread({ intervention_id, thread_type: 'tenant_to_managers', ... })
await conversationRepo.createThread({ intervention_id, thread_type: 'provider_to_managers', ... })

// 3. Create assignments (triggers add participants to existing threads)
await createAssignments(intervention.id, assignments)

// 4. Create time slots
await createTimeSlots(...)
```

---

## ✅ COMPLETE: Centralisation Adresses + Google Maps (2026-01-28/29)

### Nouvelle Architecture Adresses

**Table centralisee:** `addresses`
- Champs: `street`, `postal_code`, `city`, `country`
- Geocoding: `latitude`, `longitude`, `place_id`, `formatted_address`
- Multi-tenant: `team_id` obligatoire
- Soft delete: `deleted_at`, `deleted_by`

**Relations:**
- `buildings.address_id` → `addresses.id`
- `lots.address_id` → `addresses.id`
- `companies.address_id` → `addresses.id`

### Migrations Appliquees

| Migration | Description |
|-----------|-------------|
| `20260129200000_create_addresses_table.sql` | Table + RLS + FK sur buildings/lots/companies |
| `20260129200001_migrate_addresses_to_centralized_table.sql` | Migration données existantes |
| `20260129200002_drop_legacy_address_columns.sql` | Suppression anciennes colonnes |

### Nouveaux Services

| Fichier | Role |
|---------|------|
| `lib/services/domain/address.service.ts` | Service domain adresses |
| `lib/services/repositories/address.repository.ts` | Repository CRUD |

### Google Maps Integration (Planifie)

Plans disponibles dans `docs/plans/`:
- `2026-01-28-google-maps-integration-design.md`
- `2026-01-28-google-maps-implementation-plan.md`
- `2026-01-28-unified-address-system-design.md`

**Status:** Phase 1 (table addresses) complete, Phase 2+ a implementer.

---

## Flow des Interventions - Vue Complete (Mis a jour 2026-01-29)

### Statuts (9 actifs)

```
demande -> rejetee (terminal)
        -> approuvee -> planification -> planifiee
                                              |
                                    cloturee_par_prestataire
                                              |
                                    cloturee_par_locataire
                                              |
                                    cloturee_par_gestionnaire (terminal)
        -> annulee (terminal - possible a chaque etape)
```

### Creation Intervention avec Conversations

**Ordre critique:**
1. Creer intervention
2. **Creer threads conversation** (AVANT assignments!)
3. Creer assignments (trigger ajoute participants aux threads)
4. Creer time slots

**Pourquoi cet ordre:**
- Le trigger `add_assignment_to_conversation_participants` s'execute sur INSERT dans `intervention_assignments`
- Si les threads n'existent pas encore, le trigger ne peut pas ajouter les participants
- Le trigger `thread_add_managers` s'execute sur INSERT dans `conversation_threads` pour ajouter les gestionnaires

---

## Multi-Equipe - Etat Actuel

### Corrections Appliquees (Phase 7+)

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 5 | API routes: `.single()` → `.limit(1)` | ✅ |
| Phase 6 | Browser side: auth-service.ts multi-profil | ✅ |
| Phase 7 | RLS: `get_my_profile_ids()` | ✅ |
| Phase 8 | Conversations: `can_view_conversation()` multi-profil | ✅ |
| Phase 9 | Participants: Trigger `thread_add_managers` | ✅ |

### Fonctions RLS Multi-Profil

```sql
-- Fonction centrale (source de verite)
get_my_profile_ids() RETURNS TABLE(profile_id UUID)

-- Usage dans les policies
WHERE user_id IN (SELECT get_my_profile_ids())

-- Conversations
can_view_conversation(thread_id) -- Supporte multi-profil
```

---

## Prochaines Etapes

### Multi-Equipe - A Valider
- [ ] Tester login utilisateur mono-profil (comportement identique)
- [ ] Tester login utilisateur multi-profil (pas d'erreur PGRST116)
- [ ] Tester changement d'equipe (selecteur + cookie)
- [ ] Verifier conversations multi-participants
- [ ] Verifier interventions prestataire multi-equipe

### Google Maps Integration
- [ ] Phase 2: Composant AddressInput avec Places API
- [ ] Phase 3: Geocoding service
- [ ] Phase 4: Map display component

---

## Metriques Systeme (Mise a jour 2026-01-29)

| Composant | Valeur |
|-----------|--------|
| Tables DB | **41** (+1 addresses) |
| Migrations | **140+** |
| Statuts intervention | 9 |
| API Routes intervention | ~15 |
| Hooks intervention | 8 |
| Triggers conversation | 2 (thread_add_managers, add_assignment_to_conversation_participants) |

---
*Derniere mise a jour: 2026-01-29 21:30*
*Focus: Fix PostgREST Relations RLS + Centralisation Adresses*

## Files Recently Modified
### 2026-01-28 21:31:40 (Auto-updated)
- `C:/Users/arthu/Desktop/Coding/Seido-app/lib/services/repositories/contact.repository.ts`
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/activeContext.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/progress.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/systemPatterns.md`
