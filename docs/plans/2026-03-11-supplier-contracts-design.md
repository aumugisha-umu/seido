# Design: Contrats Fournisseurs (Supplier Contracts)

**Date:** 2026-03-11
**Status:** Validated
**Scope:** MVP immeuble + lot, extensible

---

## Overview

Ajouter la possibilite de creer des contrats fournisseurs lies a un immeuble ou un lot, avec rappels automatiques avant la date de preavis. Cas d'usage principal : coproprietes et syndics (ascenseur, nettoyage, assurance immeuble, chauffage collectif...).

## Navigation & Routing

### Menus d'ajout
- Header "+" et page contrats : deux entrees distinctes "Bail locatif" et "Contrat fournisseur"
- Bail locatif → `/gestionnaire/contrats/nouveau?type=bail`
- Contrat fournisseur → `/gestionnaire/contrats/nouveau?type=fournisseur`

### Branching dans le wizard
- Meme URL, meme `contract-form-container.tsx`
- Prop `contractMode: 'bail' | 'fournisseur'` conditionne les steps
- Step 1 identique : PropertySelector
  - Mode bail : `hideBuildingSelect={true}` (lots uniquement)
  - Mode fournisseur : `hideBuildingSelect={false}` (immeubles + lots)
- Steps 2+ divergent :
  - Bail : 5 etapes actuelles inchangees
  - Fournisseur : Bien → Contrats → Interventions → Confirmation (4 etapes)

## Database Schema

### Table `supplier_contracts`

```sql
CREATE TABLE supplier_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE RESTRICT,
  lot_id UUID REFERENCES lots(id) ON DELETE RESTRICT,
  supplier_id UUID REFERENCES users(id) ON DELETE SET NULL,

  reference TEXT NOT NULL,
  cost DECIMAL(10,2),
  cost_frequency TEXT,
  end_date DATE,
  notice_period TEXT,
  notice_date DATE,
  description TEXT,
  status TEXT DEFAULT 'actif',

  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- XOR constraint: building_id OR lot_id
ALTER TABLE supplier_contracts
  ADD CONSTRAINT xor_building_lot
  CHECK ((building_id IS NOT NULL AND lot_id IS NULL)
      OR (building_id IS NULL AND lot_id IS NOT NULL));
```

### Table `supplier_contract_documents`

```sql
CREATE TABLE supplier_contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_contract_id UUID NOT NULL REFERENCES supplier_contracts(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT CHECK (file_size > 0),
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'contract-documents',
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### RLS
- Same patterns as `contracts` table
- Based on `team_members` with `is_team_manager()` for writes
- Team membership for SELECT

### Indexes
- `idx_supplier_contracts_team_id`
- `idx_supplier_contracts_building_id`
- `idx_supplier_contracts_lot_id`
- `idx_supplier_contracts_status`
- `idx_supplier_contracts_notice_date` (for cron)

## UI Components

### Step 1 - Property Selection (reuse)
- PropertySelector with `onBuildingSelect(buildingId)` callback (new)
- Existing `onLotSelect(lotId)` for lots

### Step 2 - Repeatable Supplier Contract Form

New component: `components/contract/supplier-contracts-step.tsx`

Each contract card contains:
- **Reference** : auto `CF-{REF_BIEN}-{index}`, editable
- **Fournisseur** : ContactSelector filtered `type=prestataire`
- **Cout** : montant libre
- **Date debut / Date fin** : cote a cote sur meme ligne
- **Duree preavis** : texte libre
- **Pieces jointes** : file input multiple, staged until submission
- Delete button per card (minimum 1)
- "+ Ajouter un contrat fournisseur" button at bottom

### Step 3 - Interventions / Reminders
- Same pattern as `lease-interventions-step.tsx`
- For each contract with end_date + notice_period → propose reminder
- User enables/disables, configures date + assignation
- Intervention type: `rappel_preavis_fournisseur`

### Step 4 - Confirmation
- Summary of all contracts, suppliers, costs, dates, documents

## Submission & Reminders

### Server Action: `createSupplierContractsAction()`
1. Auth check via `getServerAuthContext('gestionnaire')`
2. Zod validation of contract array
3. Bulk insert into `supplier_contracts`
4. Upload attachments to `contract-documents/{team_id}/supplier/{supplier_contract_id}/`
5. Insert into `supplier_contract_documents`
6. If reminders enabled → create interventions (batch pattern)
7. Redirect to property page (building or lot)

### Reminder Interventions
- New intervention type: `rappel_preavis_fournisseur`
- `scheduled_date` = `notice_date` (end_date - notice_period)
- Linked to building_id or lot_id
- Assigned to gestionnaires chosen by user
- Existing cron (`/api/cron/intervention-reminders`) handles notifications (24h + 1h before)
- No cron modification needed

### New Intervention Type (migration)
```sql
INSERT INTO intervention_type_categories (name, slug)
  VALUES ('Contrats fournisseurs', 'contrats-fournisseurs');
INSERT INTO intervention_types (name, slug, category_id)
  VALUES ('Rappel preavis fournisseur', 'rappel-preavis-fournisseur', {category_id});
```

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `components/contract/supplier-contracts-step.tsx` |
| Create | `components/contract/supplier-confirmation-step.tsx` |
| Create | `lib/types/supplier-contract.types.ts` |
| Create | `lib/services/repositories/supplier-contract.repository.ts` |
| Create | `lib/services/domain/supplier-contract.service.ts` |
| Create | `supabase/migrations/XXXXX_supplier_contracts.sql` |
| Modify | `components/contract/contract-form-container.tsx` (branching) |
| Modify | `components/property-selector.tsx` (add onBuildingSelect) |
| Modify | `lib/step-configurations.ts` (supplier steps) |
| Modify | `app/actions/contract-actions.ts` (new action) |
| Modify | Header add menu + contracts page menu |
