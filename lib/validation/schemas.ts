/**
 * Centralized Zod Validation Schemas for API Routes
 *
 * All schemas follow security best practices:
 * - Strict type validation (prevents type confusion)
 * - Length limits (prevents DoS)
 * - Format validation (prevents injection)
 * - Required fields explicit (prevents undefined injection)
 */

import { z } from 'zod'

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

/**
 * UUID validation (Supabase IDs)
 */
export const uuidSchema = z.string().uuid({ message: 'Invalid UUID format' })

/**
 * Email validation (RFC 5322 compliant)
 */
export const emailSchema = z
  .string()
  .email({ message: 'Invalid email format' })
  .max(255, { message: 'Email too long' })
  .toLowerCase()
  .trim()

/**
 * Password validation (enforces strong passwords)
 */
export const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .max(72, { message: 'Password too long' }) // bcrypt max length
  .regex(/[a-z]/, { message: 'Password must contain lowercase letter' })
  .regex(/[A-Z]/, { message: 'Password must contain uppercase letter' })
  .regex(/[0-9]/, { message: 'Password must contain number' })

/**
 * Phone number validation (French format)
 */
export const phoneSchema = z
  .string()
  .regex(/^(\+33|0)[1-9](\d{2}){4}$/, { message: 'Invalid French phone number' })
  .optional()

/**
 * Date string validation (ISO 8601)
 */
export const dateStringSchema = z
  .string()
  .datetime({ message: 'Invalid ISO 8601 date format' })

/**
 * URL validation
 */
export const urlSchema = z
  .string()
  .url({ message: 'Invalid URL format' })
  .max(2048, { message: 'URL too long' })

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

/**
 * POST /api/change-password
 */
export const changePasswordSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema,
})

/**
 * POST /api/change-email
 */
export const changeEmailSchema = z.object({
  newEmail: emailSchema,
  password: passwordSchema, // Require password confirmation
})

/**
 * POST /api/reset-password
 */
export const resetPasswordSchema = z.object({
  email: emailSchema,
})

/**
 * POST /api/accept-invitation
 */
export const acceptInvitationSchema = z.object({
  token: z.string().min(10, { message: 'Invalid token' }),
  password: passwordSchema,
})

/**
 * POST /api/create-provider-account
 * Magic link flow for external providers
 */
export const createProviderAccountSchema = z.object({
  email: emailSchema,
  magicLinkToken: z.string().min(16, { message: 'Invalid magic link token' }),
  interventionId: uuidSchema,
})

// ============================================================================
// USER SCHEMAS
// ============================================================================

/**
 * PATCH /api/update-user-profile
 * Only updates password_set flag (not full profile update)
 */
export const updatePasswordSetSchema = z.object({
  password_set: z.boolean(),
})

/**
 * Future: Full profile update schema (not currently used)
 */
export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
  phone: phoneSchema,
  email: emailSchema.optional(),
})

/**
 * POST /api/invite-user
 * Creates contact + optionally sends invitation
 */
export const inviteUserSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  role: z.enum(['admin', 'gestionnaire', 'locataire', 'prestataire'], {
    errorMap: () => ({ message: 'Invalid role' })
  }),
  providerCategory: z.enum(['syndic', 'notaire', 'assurance', 'proprietaire', 'prestataire', 'autre']).optional().nullable(),
  teamId: uuidSchema,
  phone: phoneSchema.nullable(),
  notes: z.string().max(2000).trim().optional().nullable(),
  speciality: z.string().max(100).trim().optional().nullable(),
  shouldInviteToApp: z.boolean().optional().default(false),
})

// ============================================================================
// BUILDING / LOT SCHEMAS
// ============================================================================

/**
 * Lot category enum
 */
const lotCategoryEnum = z.enum([
  'appartement',
  'collocation',
  'maison',
  'garage',
  'local_commercial',
  'parking',
  'autre'
], { errorMap: () => ({ message: 'Invalid lot category' }) })

/**
 * POST /api/buildings
 */
export const createBuildingSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  address: z.string().min(1).max(500).trim(),
  city: z.string().min(1).max(100).trim(),
  postal_code: z.string().regex(/^\d{5}$/, { message: 'Invalid French postal code' }),
  country: z.enum(['France', 'Belgique', 'Suisse', 'Luxembourg'], {
    errorMap: () => ({ message: 'Invalid country' })
  }).optional(),
  description: z.string().max(5000).trim().optional().nullable(),
  team_id: uuidSchema,
  gestionnaire_id: uuidSchema, // Primary manager for the building
})

/**
 * PUT /api/buildings/[id]
 */
export const updateBuildingSchema = createBuildingSchema.partial().extend({
  id: uuidSchema,
})

/**
 * POST /api/lots
 * Note: Uses 'reference' field (not lot_number) per database schema
 */
export const createLotSchema = z.object({
  reference: z.string().min(1).max(100).trim(),
  team_id: uuidSchema,
  building_id: uuidSchema.optional().nullable(),
  category: lotCategoryEnum.optional(),
  apartment_number: z.string().max(50).trim().optional().nullable(),
  floor: z.number().int().min(-10).max(200).optional().nullable(),
  street: z.string().max(500).trim().optional().nullable(),
  city: z.string().max(100).trim().optional().nullable(),
  postal_code: z.string().regex(/^\d{5}$/, { message: 'Invalid French postal code' }).optional().nullable(),
  country: z.enum(['France', 'Belgique', 'Suisse', 'Luxembourg'], {
    errorMap: () => ({ message: 'Invalid country' })
  }).optional().nullable(),
  description: z.string().max(5000).trim().optional().nullable(),
})

/**
 * PUT /api/lots/[id]
 */
export const updateLotSchema = createLotSchema.partial().extend({
  id: uuidSchema,
})

// ============================================================================
// CONTACT SCHEMAS
// ============================================================================

/**
 * POST /api/create-contact
 * Uses snake_case to match database field names
 */
export const createContactSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  first_name: z.string().max(100).trim().optional().nullable(),
  last_name: z.string().max(100).trim().optional().nullable(),
  email: emailSchema,
  phone: z.string().max(50).trim().optional().nullable(),
  address: z.string().max(500).trim().optional().nullable(),
  notes: z.string().max(2000).trim().optional().nullable(),
  role: z.enum(['gestionnaire', 'locataire', 'prestataire'], {
    errorMap: () => ({ message: 'Invalid contact role' })
  }),
  provider_category: z.enum(['proprietaire', 'prestataire', 'autre']).optional().nullable(),
  speciality: z.string().max(100).trim().optional().nullable(),
  team_id: uuidSchema,
  is_active: z.boolean().optional().default(true),
})

/**
 * POST /api/send-existing-contact-invitation
 */
export const sendContactInvitationSchema = z.object({
  contactId: uuidSchema,
  teamId: uuidSchema,
})

// ============================================================================
// INTERVENTION SCHEMAS
// ============================================================================

/**
 * Intervention status enum
 */
const interventionStatusEnum = z.enum([
  'demande',
  'rejetee',
  'approuvee',
  'demande_de_devis',
  'planification',
  'planifiee',
  'en_cours',
  'cloturee_par_prestataire',
  'cloturee_par_locataire',
  'cloturee_par_gestionnaire',
  'annulee'
], { errorMap: () => ({ message: 'Invalid intervention status' }) })

/**
 * Intervention urgency enum
 * Must match database enum: intervention_urgency
 */
const urgencyEnum = z.enum(['basse', 'normale', 'haute', 'urgente'], {
  errorMap: () => ({ message: 'Invalid urgency level' })
})

/**
 * POST /api/create-intervention
 * Note: Uses snake_case (lot_id) per existing API contract
 */
export const createInterventionSchema = z.object({
  lot_id: uuidSchema,
  title: z.string().min(1).max(200).trim(),
  description: z.string().min(1).max(5000).trim(),
  urgency: urgencyEnum.optional(), // Optional - defaults applied in service layer
  type: z.string().min(1).max(100).trim().optional(),
})

/**
 * POST /api/create-manager-intervention
 * Note: Complex schema with multi-manager support, scheduling, quotes
 */
export const createManagerInterventionSchema = z.object({
  // Basic intervention data
  title: z.string().min(1).max(200).trim(),
  description: z.string().min(1).max(5000).trim(),
  type: z.string().min(1).max(100).trim().optional(),
  urgency: urgencyEnum.optional().default('normale'),
  location: z.string().max(500).trim().optional(),

  // Housing selection (must have either building or lot)
  selectedBuildingId: uuidSchema.optional().nullable(),
  selectedLotId: uuidSchema.optional().nullable(),

  // Contact assignments (arrays)
  selectedManagerIds: z.array(uuidSchema).optional(),
  selectedProviderIds: z.array(uuidSchema).optional(),

  // Scheduling
  schedulingType: z.enum(['none', 'fixed', 'flexible']).optional(),
  fixedDateTime: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  }).optional().nullable(),
  timeSlots: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be HH:MM'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be HH:MM'),
  })).optional(),

  // Options
  expectsQuote: z.boolean().optional(),

  // Messages
  messageType: z.enum(['none', 'global', 'individual']).optional(),
  globalMessage: z.string().max(5000).trim().optional(),
})

/**
 * POST /api/intervention-approve
 */
export const interventionApproveSchema = z.object({
  interventionId: uuidSchema,
  notes: z.string().max(2000).trim().optional(),
})

/**
 * POST /api/intervention-reject
 */
export const interventionRejectSchema = z.object({
  interventionId: uuidSchema,
  reason: z.string().min(1).max(2000).trim(),
})

/**
 * POST /api/intervention-schedule
 */
export const interventionScheduleSchema = z.object({
  interventionId: uuidSchema,
  planningType: z.enum(['direct', 'propose', 'organize'], {
    errorMap: () => ({ message: 'Invalid planning type' })
  }),
  directSchedule: z.object({
    date: z.string().min(1),
    startTime: z.string().min(1),
    endTime: z.string().optional(),
  }).optional(),
  proposedSlots: z.array(z.object({
    date: z.string().min(1),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
  })).optional(),
  internalComment: z.string().max(2000).trim().optional(),
})

/**
 * POST /api/intervention-start
 */
export const interventionStartSchema = z.object({
  interventionId: uuidSchema,
  startedAt: dateStringSchema.optional(),
})

/**
 * POST /api/intervention-complete
 */
export const interventionCompleteSchema = z.object({
  interventionId: uuidSchema,
  completionNotes: z.string().max(5000).trim().optional(),
  completedAt: dateStringSchema.optional(),
})

/**
 * POST /api/intervention-cancel
 */
export const interventionCancelSchema = z.object({
  interventionId: uuidSchema,
  cancellationReason: z.string().min(1).max(2000).trim(),
})

// ============================================================================
// QUOTE SCHEMAS
// ============================================================================

/**
 * POST /api/intervention-quote-submit
 */
export const submitQuoteSchema = z.object({
  interventionId: uuidSchema,
  providerId: uuidSchema,
  amount: z.number().positive().max(1000000), // max 1M EUR
  description: z.string().min(1).max(5000).trim(),
  validUntil: dateStringSchema.optional(),
  estimatedDuration: z.number().int().min(1).max(480).optional(), // minutes
})

/**
 * POST /api/intervention-quote-validate
 */
export const validateQuoteSchema = z.object({
  quoteId: uuidSchema,
  notes: z.string().max(2000).trim().optional(),
})

// ============================================================================
// DOCUMENT UPLOAD SCHEMAS
// ============================================================================

/**
 * Document visibility enum
 */
const documentVisibilityEnum = z.enum(['equipe', 'locataire'], {
  errorMap: () => ({ message: 'Invalid visibility level' })
})

/**
 * POST /api/property-documents/upload
 */
export const uploadPropertyDocumentSchema = z.object({
  buildingId: uuidSchema.optional(),
  lotId: uuidSchema.optional(),
  fileName: z.string().min(1).max(255).trim(),
  fileSize: z.number().int().positive().max(100 * 1024 * 1024), // max 100MB
  fileType: z.string().min(1).max(100).trim(),
  visibility: documentVisibilityEnum,
  description: z.string().max(2000).trim().optional(),
}).refine(data => data.buildingId || data.lotId, {
  message: 'Either buildingId or lotId must be provided'
})

/**
 * POST /api/upload-intervention-document
 *
 * ✅ SECURITY FIX (Oct 23, 2025 - Issue #11): Strict MIME type whitelist
 * Only allows safe document and image formats to prevent malicious file uploads
 */
export const uploadInterventionDocumentSchema = z.object({
  interventionId: uuidSchema,
  fileName: z.string().min(1).max(255).trim(),
  fileSize: z.number().int().positive().max(100 * 1024 * 1024), // max 100MB
  fileType: z.enum([
    // ✅ Documents (safe formats only)
    'application/pdf',
    'application/msword',  // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  // .docx
    'application/vnd.ms-excel',  // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  // .xlsx
    // ✅ Images
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ], {
    errorMap: () => ({ message: 'Format de fichier invalide. Seuls PDF, DOC, DOCX, XLS, XLSX, JPEG, PNG, WEBP, GIF sont autorisés' })
  }),
  description: z.string().max(2000).trim().optional(),
})

/**
 * POST /api/upload-avatar
 */
export const uploadAvatarSchema = z.object({
  fileName: z.string().min(1).max(255).trim(),
  fileSize: z.number().int().positive().max(5 * 1024 * 1024), // max 5MB for avatar
  fileType: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    errorMap: () => ({ message: 'Invalid image format. Only JPEG, PNG, WEBP allowed' })
  }),
})

// ============================================================================
// AVAILABILITY / SCHEDULING SCHEMAS
// ============================================================================

/**
 * POST /api/intervention/[id]/user-availability
 */
export const userAvailabilitySchema = z.object({
  slots: z.array(z.object({
    start: dateStringSchema,
    end: dateStringSchema,
  })).min(1).max(50), // reasonable limit
})

/**
 * POST /api/intervention/[id]/select-slot
 */
export const selectSlotSchema = z.object({
  slotStart: dateStringSchema,
  slotEnd: dateStringSchema,
})

/**
 * POST /api/intervention-finalize
 */
export const interventionFinalizeSchema = z.object({
  interventionId: uuidSchema,
  finalizationComment: z.string().max(5000).trim().optional(),
  paymentStatus: z.enum(['pending', 'approved', 'paid', 'disputed'], {
    errorMap: () => ({ message: 'Invalid payment status' })
  }).optional(),
  finalAmount: z.number().positive().max(1000000).optional(), // max 1M EUR
  paymentMethod: z.string().max(100).trim().optional(),
  adminNotes: z.string().max(2000).trim().optional(),
  finalizedAt: dateStringSchema.optional(),
})

/**
 * POST /api/intervention-quote-request
 */
export const interventionQuoteRequestSchema = z.object({
  interventionId: uuidSchema,
  providerIds: z.array(uuidSchema).min(1).max(50),
  message: z.string().max(2000).trim().optional(),
  deadline: dateStringSchema.optional(),
})

/**
 * POST /api/intervention-validate-tenant
 */
export const interventionValidateTenantSchema = z.object({
  interventionId: uuidSchema,
  validationNotes: z.string().max(2000).trim().optional(),
})

/**
 * POST /api/intervention/[id]/availability-response
 */
export const availabilityResponseSchema = z.object({
  available: z.boolean(),
  availabilitySlots: z.array(z.object({
    start: dateStringSchema,
    end: dateStringSchema,
  })).optional(),
  reason: z.string().max(1000).trim().optional(),
})

/**
 * POST /api/intervention/[id]/manager-finalization
 */
export const managerFinalizationSchema = z.object({
  status: z.enum(['approved', 'rejected', 'requires_changes']),
  notes: z.string().max(5000).trim().optional(),
  finalCost: z.number().positive().max(1000000).optional(),
})

/**
 * POST /api/intervention/[id]/match-availabilities
 */
export const matchAvailabilitiesSchema = z.object({
  proposedSlots: z.array(z.object({
    start: dateStringSchema,
    end: dateStringSchema,
  })).min(1).max(10),
})

/**
 * POST /api/intervention/[id]/work-completion
 * POST /api/intervention/[id]/simple-work-completion
 */
export const workCompletionSchema = z.object({
  completionNotes: z.string().max(5000).trim().optional(),
  workQuality: z.enum(['excellent', 'good', 'acceptable', 'poor']).optional(),
  completedAt: dateStringSchema.optional(),
})

/**
 * POST /api/intervention/[id]/tenant-validation
 */
export const tenantValidationSchema = z.object({
  approved: z.boolean(),
  feedback: z.string().max(2000).trim().optional(),
  rating: z.number().int().min(1).max(5).optional(),
})

// ============================================================================
// QUOTE REQUEST SCHEMAS
// ============================================================================

/**
 * PUT /api/quote-requests/[id]
 */
export const quoteRequestUpdateSchema = z.object({
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled']),
  response: z.string().max(2000).trim().optional(),
})

/**
 * POST /api/quotes/[id]/approve
 */
export const quoteApproveSchema = z.object({
  notes: z.string().max(2000).trim().optional(),
})

/**
 * POST /api/quotes/[id]/reject
 */
export const quoteRejectSchema = z.object({
  reason: z.string().min(1).max(2000).trim(),
})

/**
 * POST /api/quotes/[id]/cancel
 */
export const quoteCancelSchema = z.object({
  reason: z.string().min(1).max(2000).trim(),
})

// ============================================================================
// PROPERTY DOCUMENT SCHEMAS
// ============================================================================

/**
 * POST /api/property-documents
 */
export const createPropertyDocumentSchema = z.object({
  buildingId: uuidSchema.optional().nullable(),
  lotId: uuidSchema.optional().nullable(),
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  visibility: documentVisibilityEnum,
  documentType: z.string().max(100).trim().optional(),
}).refine(data => data.buildingId || data.lotId, {
  message: 'Either buildingId or lotId must be provided'
})

/**
 * PUT /api/property-documents/[id]
 */
export const updatePropertyDocumentSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(2000).trim().optional(),
  visibility: documentVisibilityEnum.optional(),
})

/**
 * POST /api/property-documents (actual DTO used by upload service)
 * Uses snake_case to match CreatePropertyDocumentDTO interface
 */
export const createPropertyDocumentDTOSchema = z.object({
  filename: z.string().min(1).max(255).trim(),
  original_filename: z.string().min(1).max(255).trim(),
  file_size: z.number().int().min(1).max(100000000), // 100MB max
  mime_type: z.string().min(1).max(100).trim(),
  storage_path: z.string().min(1).max(500).trim(),
  document_type: z.string().min(1).max(100).trim(),
  team_id: uuidSchema,
  building_id: uuidSchema.optional().nullable(),
  lot_id: uuidSchema.optional().nullable(),
  description: z.string().max(2000).trim().optional().nullable(),
}).refine(data => data.building_id || data.lot_id, {
  message: 'Either building_id or lot_id must be provided'
})

// ============================================================================
// INVITATION SCHEMAS
// ============================================================================

/**
 * POST /api/cancel-invitation
 */
export const cancelInvitationSchema = z.object({
  invitationId: uuidSchema,
  reason: z.string().max(500).trim().optional(),
})

/**
 * POST /api/resend-invitation
 */
export const resendInvitationSchema = z.object({
  invitationId: uuidSchema,
})

/**
 * POST /api/revoke-invitation
 * Revokes contact access (soft delete pattern)
 */
export const revokeInvitationSchema = z.object({
  contactId: uuidSchema,
  teamId: uuidSchema,
})

/**
 * POST /api/mark-invitation-accepted
 * Marks invitation as accepted using email or invitation code
 */
export const markInvitationAcceptedSchema = z.object({
  email: emailSchema.optional(),
  invitationCode: z.string().min(10).max(255).trim().optional(),
}).refine(data => data.email || data.invitationCode, {
  message: 'Either email or invitationCode must be provided'
})

// ============================================================================
// OTHER SCHEMAS
// ============================================================================

/**
 * POST /api/send-welcome-email
 */
export const sendWelcomeEmailSchema = z.object({
  userId: uuidSchema,
  email: emailSchema,
  firstName: z.string().min(1).max(100).trim(),
})

/**
 * POST /api/check-email-team
 */
export const checkEmailTeamSchema = z.object({
  email: emailSchema,
  teamId: uuidSchema,
})

/**
 * POST /api/check-active-users
 */
export const checkActiveUsersSchema = z.object({
  emails: z.array(emailSchema).min(1).max(100),
  teamId: uuidSchema,
})

/**
 * POST /api/activity-logs
 */
export const createActivityLogSchema = z.object({
  teamId: uuidSchema,
  userId: uuidSchema,
  actionType: z.string().min(1).max(100).trim(),
  entityType: z.string().min(1).max(100).trim(),
  entityId: uuidSchema.optional().nullable(),
  entityName: z.string().max(200).trim().optional().nullable(),
  description: z.string().min(1).max(1000).trim(),
  status: z.enum(['success', 'error', 'warning', 'info']).default('success'),
  metadata: z.record(z.unknown()).optional(),
  errorMessage: z.string().max(2000).trim().optional().nullable(),
  ipAddress: z.string().max(45).trim().optional().nullable(), // IPv6 max length
  userAgent: z.string().max(500).trim().optional().nullable(),
})

/**
 * PATCH /api/notifications (future batch update)
 */
export const notificationUpdateSchema = z.object({
  notificationIds: z.array(uuidSchema).min(1).max(100),
  read: z.boolean(),
})

/**
 * PATCH /api/notifications (current single update with action)
 */
export const notificationActionSchema = z.object({
  action: z.enum(['mark_read', 'mark_unread', 'archive', 'unarchive'], {
    errorMap: () => ({ message: 'Invalid action' })
  }),
})

/**
 * POST /api/generate-intervention-magic-links
 * Generates magic links for external providers
 */
export const generateMagicLinksSchema = z.object({
  interventionId: uuidSchema,
  providerEmails: z.array(emailSchema).min(1).max(20, { message: 'Maximum 20 providers per request' }),
  deadline: dateStringSchema.optional().nullable(),
  additionalNotes: z.string().max(2000).trim().optional().nullable(),
  individualMessages: z.record(z.string().max(2000).trim()).optional(),
})

// ============================================================================
// HELPER FUNCTION
// ============================================================================

/**
 * Validate request body against a Zod schema
 * Returns { success: true, data } or { success: false, errors }
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown):
  | { success: true; data: T }
  | { success: false; errors: z.ZodError }
{
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, errors: result.error }
  }
}

/**
 * Format Zod errors for API response
 */
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {}

  for (const issue of error.errors) {
    const path = issue.path.join('.')
    if (!formatted[path]) {
      formatted[path] = []
    }
    formatted[path].push(issue.message)
  }

  return formatted
}
