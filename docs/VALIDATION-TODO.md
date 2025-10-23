# Validation Zod - Routes Restantes (47/55)

## ✅ Routes Déjà Validées (8)

- `/api/change-password` → changePasswordSchema
- `/api/change-email` → changeEmailSchema
- `/api/reset-password` → resetPasswordSchema
- `/api/buildings` POST → createBuildingSchema
- `/api/lots` POST → createLotSchema
- `/api/create-intervention` → createInterventionSchema
- `/api/create-manager-intervention` → createManagerInterventionSchema
- `/api/intervention-approve` → interventionApproveSchema

---

## 🔴 PRIORITY 1 - Intervention Workflow (17 routes)

### Fichier → Schéma

| Route | Schéma | Champs clés |
|-------|--------|-------------|
| `intervention-reject/route.ts` | `interventionRejectSchema` | interventionId, reason |
| `intervention-cancel/route.ts` | `interventionCancelSchema` | interventionId, cancellationReason |
| `intervention-start/route.ts` | `interventionStartSchema` | interventionId, startedAt? |
| `intervention-complete/route.ts` | `interventionCompleteSchema` | interventionId, completionNotes?, completedAt? |
| `intervention-finalize/route.ts` | `interventionFinalizeSchema` | interventionId, finalizationNotes?, finalizedAt? |
| `intervention-schedule/route.ts` | `interventionScheduleSchema` | interventionId, scheduledDate, estimatedDuration, notes? |
| `intervention-validate-tenant/route.ts` | `interventionValidateTenantSchema` | interventionId, validationNotes? |
| `intervention-quote-request/route.ts` | `interventionQuoteRequestSchema` | interventionId, providerIds[], message?, deadline? |
| `intervention-quote-submit/route.ts` | `submitQuoteSchema` | interventionId, providerId, amount, description |
| `intervention-quote-validate/route.ts` | `validateQuoteSchema` | quoteId, notes? |
| `intervention/[id]/availability-response/route.ts` | `availabilityResponseSchema` | available, availabilitySlots?, reason? |
| `intervention/[id]/manager-finalization/route.ts` | `managerFinalizationSchema` | status, notes?, finalCost? |
| `intervention/[id]/match-availabilities/route.ts` | `matchAvailabilitiesSchema` | proposedSlots[] |
| `intervention/[id]/select-slot/route.ts` | `selectSlotSchema` | slotStart, slotEnd |
| `intervention/[id]/simple-work-completion/route.ts` | `workCompletionSchema` | completionNotes?, workQuality?, completedAt? |
| `intervention/[id]/work-completion/route.ts` | `workCompletionSchema` | completionNotes?, workQuality?, completedAt? |
| `intervention/[id]/tenant-availability/route.ts` | `userAvailabilitySchema` | slots[] |
| `intervention/[id]/tenant-validation/route.ts` | `tenantValidationSchema` | approved, feedback?, rating? |
| `intervention/[id]/user-availability/route.ts` | `userAvailabilitySchema` | slots[] |

---

## 🟡 PRIORITY 2 - Quotes (4 routes)

| Route | Schéma | Champs clés |
|-------|--------|-------------|
| `quote-requests/[id]/route.ts` | `quoteRequestUpdateSchema` | status, response? |
| `quotes/[id]/approve/route.ts` | `quoteApproveSchema` | notes? |
| `quotes/[id]/reject/route.ts` | `quoteRejectSchema` | reason |
| `quotes/[id]/cancel/route.ts` | `quoteCancelSchema` | reason |

---

## 🟡 PRIORITY 2 - Invitations (9 routes)

| Route | Schéma | Champs clés |
|-------|--------|-------------|
| `accept-invitation/route.ts` | `acceptInvitationSchema` | token, password |
| `auth/accept-invitation/route.ts` | `acceptInvitationSchema` | token, password |
| `cancel-invitation/route.ts` | `cancelInvitationSchema` | invitationId, reason? |
| `resend-invitation/route.ts` | `resendInvitationSchema` | invitationId |
| `revoke-invitation/route.ts` | `revokeInvitationSchema` | invitationId, reason? |
| `mark-invitation-accepted/route.ts` | `markInvitationAcceptedSchema` | invitationId, acceptedAt? |
| `invite-user/route.ts` | `inviteUserSchema` | email, role, teamId? |
| `create-contact/route.ts` | `createContactSchema` | email, firstName, lastName, role, teamId |
| `send-existing-contact-invitation/route.ts` | `sendContactInvitationSchema` | contactId, teamId |
| `create-provider-account/route.ts` | `createProviderAccountSchema` | email, firstName, lastName, companyName, teamId |

---

## 🟢 PRIORITY 3 - Documents (5 routes)

| Route | Schéma | Champs clés |
|-------|--------|-------------|
| `property-documents/route.ts` POST | `createPropertyDocumentSchema` | buildingId/lotId, title, visibility |
| `property-documents/[id]/route.ts` PUT | `updatePropertyDocumentSchema` | title?, description?, visibility? |
| `property-documents/upload/route.ts` | `uploadPropertyDocumentSchema` | buildingId/lotId, fileName, fileSize, fileType, visibility |
| `upload-intervention-document/route.ts` | `uploadInterventionDocumentSchema` | interventionId, fileName, fileSize, fileType |
| `upload-avatar/route.ts` | `uploadAvatarSchema` | fileName, fileSize, fileType |

---

## 🟢 PRIORITY 3 - Buildings/Lots UPDATE (2 routes)

| Route | Schéma | Champs clés |
|-------|--------|-------------|
| `buildings/[id]/route.ts` PUT | `updateBuildingSchema` | id, name?, address?, city?, etc. |
| `lots/[id]/route.ts` PUT | `updateLotSchema` | id, reference?, building_id?, etc. |

---

## 🟢 PRIORITY 3 - Users (2 routes)

| Route | Schéma | Champs clés |
|-------|--------|-------------|
| `update-user-profile/route.ts` | `updateUserProfileSchema` | firstName?, lastName?, phone?, email? |
| `send-welcome-email/route.ts` | `sendWelcomeEmailSchema` | userId, email, firstName |

---

## 🟢 PRIORITY 3 - Autres (6 routes)

| Route | Schéma | Champs clés |
|-------|--------|-------------|
| `check-email-team/route.ts` | `checkEmailTeamSchema` | email |
| `notifications/route.ts` PATCH | `notificationUpdateSchema` | notificationIds[], read |
| `generate-intervention-magic-links/route.ts` | `generateMagicLinksSchema` | interventionId, recipientTypes[], expiresIn? |
| `get-user-profile/route.ts` | PAS DE VALIDATION (GET) | - |
| `check-active-users/route.ts` | PAS DE VALIDATION (GET) | - |
| `activity-logs/route.ts` | PAS DE VALIDATION (GET probablement) | - |

---

## Pattern d'Application Standard

### Étape 1: Ajouter l'import

```typescript
import { SCHEMA_NAME, validateRequest, formatZodErrors } from '@/lib/validation/schemas'
```

### Étape 2: Valider après parsing body

```typescript
// Parse request body
const body = await request.json()

// ✅ ZOD VALIDATION
const validation = validateRequest(SCHEMA_NAME, body)
if (!validation.success) {
  logger.warn({ errors: formatZodErrors(validation.errors) }, '⚠️ [ROUTE-NAME] Validation failed')
  return NextResponse.json({
    success: false,
    error: 'Données invalides',
    details: formatZodErrors(validation.errors)
  }, { status: 400 })
}

const validatedData = validation.data
```

### Étape 3: Utiliser validatedData

```typescript
// Remplacer destructuring direct par:
const { field1, field2 } = validatedData

// Ou passer directement:
await someService.create(validatedData)
```

---

## ⚡ Script Batch Rapide (Optionnel)

Pour appliquer à toutes les routes intervention en une fois:

```bash
cd app/api

# Batch intervention workflow
for route in intervention-reject intervention-cancel intervention-start intervention-complete intervention-finalize intervention-schedule intervention-validate-tenant intervention-quote-request intervention-quote-submit intervention-quote-validate; do
  echo "Processing $route..."
  # Ajouter import + validation manuellement ou avec sed/awk
done
```

---

## ✅ Checklist Finalisation

- [ ] **Intervention workflow** (17 routes) - 40%
- [ ] **Quotes** (4 routes) - 9%
- [ ] **Invitations/Contacts** (10 routes) - 23%
- [ ] **Documents** (5 routes) - 11%
- [ ] **Buildings/Lots PUT** (2 routes) - 5%
- [ ] **Users** (2 routes) - 5%
- [ ] **Autres** (7 routes) - 16%
- [ ] **Build test** (`npm run build`)
- [ ] **Commit final** (55/55 routes validées)

---

## 🎯 Estimation

- **Temps par route**: ~2-3 minutes (import + validation + test)
- **Total 47 routes**: ~1.5-2 heures
- **Avec script optimisé**: ~45 minutes

**Approche recommandée**: Commencer par Priority 1 (interventions) qui représente 40% et sont les plus critiques business logic.
