# Entity Preview Layout - Design Document

**Date:** 2026-01-30
**Status:** Approved
**Author:** Claude + Arthur

## Objectif

Unifier le layout des pages de preview (immeubles, lots, contrats, contacts) sur le modèle de la preview intervention, et ajouter un onglet "Activité" à chaque entité.

## Problème Actuel

Les pages de preview ont des layouts inconsistants :
- **Intervention** : Card arrondie + Tabs MD3 + Content scrollable ✅
- **Building/Lot** : Tabs avec icônes + Card séparée + Layout dispersé ❌
- **Contract** : Layout 2 colonnes (main + sidebar) ❌
- **Contact** : Layout standard avec tabs ❌

## Solution

### 1. Composants Réutilisables

Créer `components/shared/entity-preview/` :

```
entity-preview/
├── index.ts                      # Barrel exports
├── entity-preview-layout.tsx     # Container principal (card arrondie)
├── entity-tabs.tsx               # Tabs MD3 (dropdown mobile, horizontal desktop)
├── entity-activity-log.tsx       # Historique d'activité unifié
└── types.ts                      # Types partagés
```

### 2. EntityPreviewLayout

Container principal qui encapsule les tabs et le contenu.

```typescript
interface EntityPreviewLayoutProps {
  children: React.ReactNode
  className?: string
}
```

Structure CSS (BEM) :
```css
.entity-preview {
  @apply flex-1 flex flex-col min-h-0 overflow-hidden;
}

.entity-preview__container {
  @apply flex-1 flex flex-col min-h-0 overflow-hidden;
  @apply rounded-xl border border-slate-200 bg-white shadow-sm;
}

.entity-preview__tabs {
  @apply flex-shrink-0 border-b border-slate-200;
}

.entity-preview__content {
  @apply flex-1 flex flex-col min-h-0 overflow-hidden;
}

.entity-preview__tab-panel {
  @apply flex-1 p-4 sm:p-6 overflow-y-auto;
}
```

### 3. EntityTabs

Généralisation de `InterventionTabs` avec configuration dynamique.

```typescript
interface TabConfig {
  value: string
  label: string
  count?: number
}

interface EntityTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
  tabs: TabConfig[]
  children: React.ReactNode
  className?: string
}
```

Comportement responsive :
- **Mobile (<768px)** : Dropdown `<Select>` full-width
- **Desktop (≥768px)** : Tabs horizontaux avec underline MD3

### 4. EntityActivityLog

Composant unifié pour l'historique d'activité.

```typescript
interface EntityActivityLogProps {
  // Mode 1: Données passées directement
  activityLogs?: ActivityLog[]

  // Mode 2: Chargement client-side
  entityType?: 'building' | 'lot' | 'contract' | 'contact' | 'intervention'
  entityId?: string
  teamId?: string
  includeRelated?: boolean  // Inclure entités liées

  // Options
  showEntityLinks?: boolean
  showMetadata?: boolean
  maxHeight?: string
  emptyMessage?: string
  className?: string
}
```

### 5. Hiérarchie des Activity Logs

Les logs affichés incluent l'entité + ses relations :

| Entité | Logs Inclus |
|--------|-------------|
| Building | building + lots + contracts + contacts + interventions |
| Lot | lot + contracts + contacts + interventions (du lot) |
| Contract | contract + contract_contacts |
| Contact | contact + interventions assignées |

### 6. Optimisation DB

#### Migration 1: Ajouter "contract" à l'enum (CRITIQUE)

```sql
-- Migration: add_contract_to_activity_entity_type.sql
ALTER TYPE activity_entity_type ADD VALUE IF NOT EXISTS 'contract';
```

#### Migration 2: Index pour les subqueries

```sql
-- Vérifier/créer les index nécessaires pour la performance
CREATE INDEX IF NOT EXISTS idx_lots_building_id ON lots(building_id);
CREATE INDEX IF NOT EXISTS idx_contracts_lot_id ON contracts(lot_id);
CREATE INDEX IF NOT EXISTS idx_interventions_building_id ON interventions(building_id);
CREATE INDEX IF NOT EXISTS idx_interventions_lot_id ON interventions(lot_id);
CREATE INDEX IF NOT EXISTS idx_intervention_assignments_user_id ON intervention_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(team_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(team_id, created_at DESC);
```

#### Migration 3: RPC Function (CORRIGÉE)

```sql
-- RPC Function optimisée avec gestion include_related et compatibilité view
CREATE OR REPLACE FUNCTION get_entity_activity_logs(
  p_team_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_include_related BOOLEAN DEFAULT TRUE,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  -- Colonnes compatibles avec activity_logs_with_user view
  id UUID,
  team_id UUID,
  user_id UUID,
  action_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  description TEXT,
  status TEXT,
  metadata JSONB,
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ,
  -- User info (from join)
  user_name TEXT,
  user_email TEXT,
  user_avatar_url TEXT,
  user_role TEXT,
  -- Source entity info (pour affichage contexte)
  source_entity_type TEXT,
  source_entity_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER  -- Respecte RLS
AS $$
BEGIN
  -- Mode simple: juste l'entité elle-même
  IF NOT p_include_related THEN
    RETURN QUERY
    SELECT
      al.id, al.team_id, al.user_id,
      al.action_type::TEXT, al.entity_type::TEXT, al.entity_id,
      al.entity_name, al.description, al.status::TEXT, al.metadata,
      al.error_message, al.ip_address, al.user_agent, al.created_at,
      u.name, u.email, u.avatar_url, u.role::TEXT,
      p_entity_type, al.entity_name
    FROM activity_logs al
    LEFT JOIN users u ON u.id = al.user_id
    WHERE al.team_id = p_team_id
      AND al.entity_type::TEXT = p_entity_type
      AND al.entity_id = p_entity_id
    ORDER BY al.created_at DESC
    LIMIT p_limit;
    RETURN;
  END IF;

  -- Mode avec entités liées
  RETURN QUERY
  WITH related_entities AS (
    -- === BUILDING ===
    -- Building itself
    SELECT 'building'::TEXT as rel_type, p_entity_id as rel_id, NULL::TEXT as rel_name
    WHERE p_entity_type = 'building'

    UNION ALL
    -- Lots of building
    SELECT 'lot', l.id, l.reference FROM lots l
    WHERE p_entity_type = 'building' AND l.building_id = p_entity_id

    UNION ALL
    -- Contracts on building's lots
    SELECT 'contract', c.id, c.title FROM contracts c
    WHERE p_entity_type = 'building'
      AND c.lot_id IN (SELECT id FROM lots WHERE building_id = p_entity_id)

    UNION ALL
    -- Interventions on building or its lots
    SELECT 'intervention', i.id, i.reference FROM interventions i
    WHERE p_entity_type = 'building'
      AND (i.building_id = p_entity_id
           OR i.lot_id IN (SELECT id FROM lots WHERE building_id = p_entity_id))

    -- === LOT ===
    UNION ALL
    SELECT 'lot', p_entity_id, NULL WHERE p_entity_type = 'lot'

    UNION ALL
    SELECT 'contract', c.id, c.title FROM contracts c
    WHERE p_entity_type = 'lot' AND c.lot_id = p_entity_id

    UNION ALL
    SELECT 'intervention', i.id, i.reference FROM interventions i
    WHERE p_entity_type = 'lot' AND i.lot_id = p_entity_id

    -- === CONTRACT ===
    UNION ALL
    SELECT 'contract', p_entity_id, NULL WHERE p_entity_type = 'contract'

    -- === CONTACT ===
    UNION ALL
    SELECT 'contact', p_entity_id, NULL WHERE p_entity_type = 'contact'

    UNION ALL
    -- Interventions where contact is assigned
    SELECT 'intervention', ia.intervention_id, i.reference
    FROM intervention_assignments ia
    JOIN interventions i ON i.id = ia.intervention_id
    WHERE p_entity_type = 'contact' AND ia.user_id = p_entity_id

    -- === INTERVENTION (self only for this function) ===
    UNION ALL
    SELECT 'intervention', p_entity_id, NULL WHERE p_entity_type = 'intervention'
  )
  SELECT
    al.id, al.team_id, al.user_id,
    al.action_type::TEXT, al.entity_type::TEXT, al.entity_id,
    al.entity_name, al.description, al.status::TEXT, al.metadata,
    al.error_message, al.ip_address, al.user_agent, al.created_at,
    u.name, u.email, u.avatar_url, u.role::TEXT,
    re.rel_type, COALESCE(re.rel_name, al.entity_name)
  FROM activity_logs al
  JOIN related_entities re
    ON re.rel_type = al.entity_type::TEXT
    AND re.rel_id = al.entity_id
  LEFT JOIN users u ON u.id = al.user_id
  WHERE al.team_id = p_team_id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Commentaire de documentation
COMMENT ON FUNCTION get_entity_activity_logs IS
'Récupère les activity logs pour une entité et ses entités liées (hiérarchie).
Utilisé par EntityActivityLog component pour Building/Lot/Contract/Contact.
Respecte RLS via SECURITY INVOKER.';
```

#### Index Recommandés

```sql
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity
  ON activity_logs(team_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created
  ON activity_logs(team_id, created_at DESC);
```

### 7. Configuration Tabs par Entité

```typescript
// Building
const buildingTabs: TabConfig[] = [
  { value: 'overview', label: 'Vue d\'ensemble' },
  { value: 'interventions', label: 'Interventions' },
  { value: 'documents', label: 'Documents' },
  { value: 'emails', label: 'Emails' },
  { value: 'activity', label: 'Activité' }
]

// Lot
const lotTabs: TabConfig[] = [
  { value: 'overview', label: 'Vue d\'ensemble' },
  { value: 'contracts', label: 'Contrats' },
  { value: 'interventions', label: 'Interventions' },
  { value: 'documents', label: 'Documents' },
  { value: 'emails', label: 'Emails' },
  { value: 'activity', label: 'Activité' }
]

// Contract
const contractTabs: TabConfig[] = [
  { value: 'overview', label: 'Aperçu' },
  { value: 'contacts', label: 'Contacts' },
  { value: 'documents', label: 'Documents' },
  { value: 'emails', label: 'Emails' },
  { value: 'tasks', label: 'Tâches' },
  { value: 'activity', label: 'Activité' }
]

// Contact
const contactTabs: TabConfig[] = [
  { value: 'overview', label: 'Aperçu' },
  { value: 'properties', label: 'Biens' },
  { value: 'interventions', label: 'Interventions' },
  { value: 'emails', label: 'Emails' },
  { value: 'activity', label: 'Activité' }
]
```

## Plan d'Implémentation (RÉVISÉ après review)

### Phase 0: Corrections Préalables (CRITIQUE)

0.1. **Migration DB - Ajouter "contract" à l'enum `activity_entity_type`**
0.2. **Vérifier/créer les index nécessaires** (lots.building_id, contracts.lot_id, interventions.building_id)

### Phase 1: Infrastructure

1.1. Migration DB - RPC function `get_entity_activity_logs()`
1.2. Créer `components/shared/entity-preview/*` (4 fichiers)
1.3. Ajouter classes BEM dans `globals.css`
1.4. Modifier `hooks/use-activity-logs.ts` - ajouter `includeRelated`
1.5. Modifier `app/api/activity-logs/route.ts` - support RPC function

### Phase 2: Migration Entités (ordre de complexité croissante)

2.1. **Contract** → EntityPreviewLayout + tab Activité (le plus simple, déjà TabsContent)
2.2. **Contact** → EntityPreviewLayout + tab Activité (a déjà ContactTabsNavigation)
2.3. **Building** → EntityPreviewLayout + tab Activité
2.4. **Lot** → EntityPreviewLayout + tab Activité (⚠️ nécessite refacto vers TabsContent)

### Phase 3: Harmonisation Intervention

3.1. Extraire `InterventionTabs` → `EntityTabs` (généraliser)
3.2. Intervention utilise `EntityTabs` au lieu de `InterventionTabs`
3.3. `ActivityTab` utilise `EntityActivityLog` + garde `StatusTimeline` (spécifique intervention)

### Phase 4: Cleanup

4.1. Supprimer `intervention-tabs.tsx` (remplacé par entity-tabs)
4.2. Supprimer anciens composants Activity non utilisés
4.3. Mettre à jour les exports dans index.ts

## Fichiers Impactés

### À Créer
- `components/shared/entity-preview/index.ts`
- `components/shared/entity-preview/entity-preview-layout.tsx`
- `components/shared/entity-preview/entity-tabs.tsx`
- `components/shared/entity-preview/entity-activity-log.tsx`
- `components/shared/entity-preview/types.ts`
- `supabase/migrations/YYYYMMDD_add_entity_activity_logs_function.sql`

### À Modifier
- `app/gestionnaire/(no-navbar)/biens/immeubles/[id]/building-details-client.tsx`
- `app/gestionnaire/(no-navbar)/biens/lots/[id]/lot-details-client.tsx`
- `app/gestionnaire/(no-navbar)/contrats/[id]/contract-details-client.tsx`
- `app/gestionnaire/(no-navbar)/contacts/details/[id]/contact-details-client.tsx`
- `hooks/use-activity-logs.ts`
- `app/api/activity-logs/route.ts`
- `app/globals.css`

### À Supprimer (après migration)
- `components/interventions/shared/layout/intervention-tabs.tsx` (remplacé par entity-tabs)

## Critères de Succès

- [ ] Tous les previews utilisent le même layout (card arrondie + tabs MD3)
- [ ] Tab "Activité" présent sur toutes les entités
- [ ] Activity logs incluent les entités liées (hiérarchie)
- [ ] Requêtes DB < 100ms pour les activity logs
- [ ] Responsive: dropdown mobile, tabs desktop
- [ ] Composants intervention refactorisés pour utiliser entity-tabs
