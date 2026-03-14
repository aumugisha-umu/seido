---
description: SEIDO quick reference — status values, roles, DB clients, notifications. Auto-loaded when working with interventions, roles, or DB.
globs:
  - "lib/services/**"
  - "app/actions/**"
  - "supabase/migrations/**"
---

## Quick Reference

### Intervention Status Values (9 statuts - mis a jour 2026-01-26)

```typescript
// NOTE: demande_de_devis et en_cours ont ete SUPPRIMES
// Les devis sont geres via requires_quote + intervention_quotes
type InterventionStatus =
  | 'demande' | 'rejetee' | 'approuvee'
  | 'planification' | 'planifiee'
  | 'cloturee_par_prestataire' | 'cloturee_par_locataire'
  | 'cloturee_par_gestionnaire' | 'annulee'
```

### User Roles

- **Admin** : Administration systeme
- **Gestionnaire** : Gestion biens + interventions (70% users)
- **Prestataire** : Execution services + devis (75% mobile)
- **Locataire** : Demandes intervention + suivi

### Database Clients

```typescript
// Browser Client (Client Components)
import { createBrowserSupabaseClient } from '@/lib/services'

// Server Client (Server Components/Actions)
import { createServerSupabaseClient } from '@/lib/services'
```

### Notifications (Server Actions)

```typescript
import { createInterventionNotification } from '@/app/actions/notification-actions'
await createInterventionNotification(interventionId)
```

> 20 actions disponibles - voir `systemPatterns.md` section "Notification Architecture"
