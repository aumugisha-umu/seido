# Remove "Separate" Assignment Mode from Interventions

**Date:** 2026-03-19
**Status:** Validated
**Complexity:** Medium (13 files, single concern — feature removal)

## Context

The intervention creation wizard offers "Groupe" (shared) vs "Séparé" (isolated) assignment modes for multi-provider interventions. This adds complexity with minimal value — if a manager wants provider isolation, they simply create separate interventions.

## Decision

Remove the "Séparé" mode entirely. All multi-provider interventions behave as "group" (shared info). The DB column `assignment_mode` stays for backward compatibility but only accepts `'single'` (1 provider) or `'group'` (N providers).

## Changes

### DELETE (3 files)
- `components/intervention/assignment-mode-selector.tsx`
- `components/intervention/finalize-multi-provider-button.tsx`
- `components/intervention/provider-instructions-input.tsx`

### MODIFY (~10 files)
- Creation wizard: Remove assignmentMode/providerInstructions state, always set 'group'/'single'
- Edit form: Remove mode selection, remove per-provider instructions
- intervention-service.ts: Remove createChildInterventions(), simplify validation
- intervention-actions.ts: Remove createChildInterventionsAction(), hardcode mode
- Gestionnaire detail: Remove finalize button
- Prestataire detail: Remove per-provider instructions box
- Prestataire page: Remove provider_id filter on time slots
- Confirmation summary: Remove mode badge
- Validation schemas: Simplify

### NO CHANGE
- DB column (backward compat)
- RLS policies (already handle group mode via provider_id IS NULL)
- intervention_links table (reading old data)
- Chat interface
