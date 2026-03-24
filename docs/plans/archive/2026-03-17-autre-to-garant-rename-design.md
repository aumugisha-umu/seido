# Design: Renommage "Autre" → "Garant" + Corrections Propriétaire

**Date:** 2026-03-17
**Status:** Validated
**Migration:** None required

## Context

The "autre" contact type in the creation wizard is being replaced by "garant" (guarantor). Garants cannot be invited to the app (same as proprietaire). When linked to a contract/bail, the `contract_contacts.role` should be `'garant'` (already exists in the DB enum `contract_contact_role`).

The "autre" type was mapped internally to `role: 'prestataire', provider_category: 'autre'`. The garant type keeps the same DB mapping — it's a UI-level rename with smarter contract linking.

Additionally, proprietaire role (recently added) is missing from some display constants.

## Strategy

- Add `'garant'` to Zod schemas (simplest approach)
- Add `'garant'` to the API mapping in `mapContactTypeToRoleAndCategory`
- Rename `'autre'` → `'garant'` throughout the creation wizard UI
- Smart contract linking: when contactType is garant, insert `contract_contacts.role = 'garant'` instead of `'autre'`
- Fix proprietaire gaps in display constants and edit form

## Changes (9 files)

### 1. `lib/validation/schemas.ts`
- Add `'garant'` to `inviteUserSchema.role` enum: `z.enum(['admin', 'gestionnaire', 'locataire', 'prestataire', 'proprietaire', 'garant'])`
- Add `'garant'` to `createContactSchema.role` enum: `z.enum(['gestionnaire', 'locataire', 'prestataire', 'proprietaire', 'garant'])`

### 2. `app/api/invite-user/route.ts`
- Add `'garant': { role: 'prestataire', provider_category: 'autre' }` to `mapContactTypeToRoleAndCategory`
- Contract linking (~line 694): change logic to check original contactType:
  ```
  const contractRole = validatedData.role === 'garant' ? 'garant'
                     : validUserRole === 'locataire' ? 'locataire'
                     : 'autre'
  ```

### 3. `app/gestionnaire/(no-navbar)/contacts/nouveau/contact-creation-client.tsx`
- Type union: replace `'autre'` with `'garant'`
- `mapContactType()`: `'other' → 'garant'`, `'autre' → 'garant'`, add `'guarantor' → 'garant'`
- `inviteToApp` forcing: already covers `'autre'`, rename to `'garant'`
- Remove `customRoleDescription` validation (`contactType === 'autre' && !customRoleDescription`)
- Remove `customRoleDescription` reset in `onContactTypeChange`

### 4. `app/gestionnaire/(no-navbar)/contacts/nouveau/steps/step-1-type.tsx`
- Type union: replace `'autre'` with `'garant'`
- SelectItem: "Autre" → "Garant"
- Replace `UserX` icon with `Shield` icon in info card
- Amber color scheme for garant info card (similar to proprietaire style)
- Message: "Les garants ne peuvent pas être invités dans l'application pour l'instant. Ce contact sera enregistré et pourra être lié à un bail en tant que garant."
- Remove the `customRoleDescription` text input field (was conditional on `contactType === 'autre'`)

### 5. `app/gestionnaire/(no-navbar)/contacts/nouveau/steps/step-3-contact.tsx`
- Replace `'autre'` card with `'garant'` amber card (non-invitable, similar message to proprietaire)
- Icon: Shield instead of UserX

### 6. `app/gestionnaire/(no-navbar)/contacts/nouveau/steps/step-4-confirmation.tsx`
- Type union: replace `'autre'` with `'garant'`
- Labels: `garant: 'Garant'`
- Colors: `garant: 'amber'`
- Confirmation section: replace "autre" card with "garant" amber card

### 7. `app/gestionnaire/(no-navbar)/contacts/modifier/[id]/edit-contact-client.tsx`
- Add `'proprietaire' | 'garant'` to `ContactFormData.contactType` union
- Add both to `validRoles` array
- Fix mapping: `'owner' → 'proprietaire'`, `'other' → 'garant'`
- Force `inviteToApp = false` for proprietaire and garant

### 8. `components/contact-details/constants.ts`
- Add to `USER_ROLES`: `{ value: "proprietaire", label: "Propriétaire", color: "bg-purple-100 text-purple-800" }`
- Add to `USER_ROLES`: `{ value: "garant", label: "Garant", color: "bg-amber-100 text-amber-800" }`
- Note: garant contacts have `provider_category: 'autre'` in DB, but their `custom_role_description` may say "Garant"

### 9. `app/gestionnaire/(no-navbar)/biens/lots/nouveau/lot-creation-form.tsx`
- Change fallback `role: contactType || 'autre'` → `role: contactType || 'prestataire'`

## What we do NOT change
- DB schema (no migration)
- Zod field `customRoleDescription` (kept for existing data)
- `ContactFormData.customRoleDescription` interface field (inoffensive, undefined for garant)
- The 4 UI files using `'autre'` as generic fallback (contacts-grid-preview, lot-contacts-grid-preview, lots-with-contacts-preview, contact-delete-confirm-modal) — these use it as "unknown type" fallback, not as a role
- `provider_category` enum in DB (stays as `'prestataire' | 'autre'`)
- `contact-selector.tsx` filter "Autre" (this filters prestataire specialities, not contact types)
