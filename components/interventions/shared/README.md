# Composants Partagés - Intervention Preview

Système de composants modulaires pour la prévisualisation d'interventions dans SEIDO.

## Architecture

```
shared/
├── types/              # Interfaces TypeScript
├── utils/              # Helpers et permissions
├── atoms/              # Composants atomiques
├── sidebar/            # Barre latérale
├── cards/              # Cartes d'information
└── layout/             # Structure de page
```

## Utilisation rapide

```tsx
import {
  // Types
  UserRole, Participant, Quote, TimeSlot,

  // Permissions
  permissions,

  // Composants
  PreviewHybridLayout,
  InterventionSidebar,
  InterventionTabs,
  QuotesCard,
  PlanningCard
} from '@/components/interventions/shared'
```

## Système de permissions

Le système de permissions centralisé contrôle les actions selon le rôle utilisateur :

```tsx
import { permissions } from '@/components/interventions/shared'

// Exemples
permissions.canManageQuotes('manager')     // true
permissions.canManageQuotes('provider')    // false

permissions.canSubmitQuote('provider')     // true
permissions.canSelectTimeSlot('tenant')    // true

// Vérification multiple
import { hasAnyPermission } from '@/components/interventions/shared'
hasAnyPermission('manager', [permissions.canEditPlanning, permissions.canManageQuotes])
```

### Matrice des permissions

| Permission | Manager | Provider | Tenant |
|------------|---------|----------|--------|
| `canManageQuotes` | ✅ | ❌ | ❌ |
| `canSubmitQuote` | ❌ | ✅ | ❌ |
| `canViewQuotes` | ✅ | ✅ | ❌ |
| `canEditPlanning` | ✅ | ❌ | ❌ |
| `canProposeTimeSlot` | ✅ | ✅ | ❌ |
| `canSelectTimeSlot` | ❌ | ❌ | ✅ |
| `canApproveTimeSlot` | ✅ | ❌ | ❌ |
| `canAddDocuments` | ✅ | ✅ | ❌ |
| `canViewInternalComments` | ✅ | ❌ | ❌ |
| `canEditParticipants` | ✅ | ❌ | ❌ |

## Composants principaux

### PreviewHybridLayout

Layout principal avec sidebar + contenu :

```tsx
<PreviewHybridLayout
  sidebar={<InterventionSidebar {...sidebarProps} />}
  content={<InterventionTabs userRole="manager">...</InterventionTabs>}
/>
```

### InterventionSidebar

Barre latérale avec participants, timeline et actions :

```tsx
<InterventionSidebar
  participants={{
    managers: [...],
    providers: [...],
    tenants: [...]
  }}
  currentUserRole="manager"
  currentStatus="planifiee"
  onStartConversation={(participantId) => {...}}
/>
```

### InterventionTabs

Système d'onglets adapté au rôle :

```tsx
<InterventionTabs
  activeTab={activeTab}
  onTabChange={setActiveTab}
  userRole="manager"  // Affiche tous les onglets
>
  {/* Contenu des onglets */}
</InterventionTabs>
```

### QuotesCard

Gestion des devis avec actions contextuelles :

```tsx
<QuotesCard
  quotes={quotes}
  userRole="manager"
  currentUserId={userId}
  onApprove={(quoteId) => {...}}
  onReject={(quoteId) => {...}}
/>
```

### PlanningCard

Gestion des créneaux horaires :

```tsx
<PlanningCard
  timeSlots={timeSlots}
  scheduledDate={scheduledDate}
  userRole="tenant"
  currentUserId={userId}
  onSelectSlot={(slotId) => {...}}
/>
```

## Storybook

Les composants ont des stories Storybook pour la documentation interactive :

```bash
npm run storybook
```

Stories disponibles :
- `Interventions/Atoms/RoleBadge`
- `Interventions/Atoms/StatusBadge`
- `Interventions/Atoms/ParticipantAvatar`
- `Interventions/Cards/QuotesCard`
- `Interventions/Cards/PlanningCard`

## Test visuel

Page de test avec basculement legacy/refactored :

```
/gestionnaire/test-preview
```

## Migration vers production

Pour migrer les pages de production (`intervention-detail-client.tsx`) :

1. **Phase 1** : Importer les composants atomiques (badges, avatars)
2. **Phase 2** : Remplacer les cards existantes par les cards partagées
3. **Phase 3** : Adopter le layout et le système d'onglets

Exemple de migration progressive :

```tsx
// Avant
<Badge className="bg-blue-100">Gestionnaire</Badge>

// Après
import { RoleBadge } from '@/components/interventions/shared'
<RoleBadge role="manager" showLabel />
```

## Conventions

- **Fichiers** : kebab-case (`role-badge.tsx`)
- **Exports** : Named exports (pas de default)
- **Props** : Interface avec suffixe `Props`
- **Stories** : Fichier `.stories.tsx` adjacent au composant
