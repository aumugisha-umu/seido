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
 */
export const createProviderAccountSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  companyName: z.string().min(1).max(200).trim(),
  phone: phoneSchema,
  teamId: uuidSchema,
})

// ============================================================================
// USER SCHEMAS
// ============================================================================

/**
 * POST /api/update-user-profile
 */
export const updateUserProfileSchema = z.object({
  firstName: z.string().min(1).max(100).trim().optional(),
  lastName: z.string().min(1).max(100).trim().optional(),
  phone: phoneSchema,
  email: emailSchema.optional(),
})

/**
 * POST /api/invite-user
 */
export const inviteUserSchema = z.object({
  email: emailSchema,
  role: z.enum(['admin', 'gestionnaire', 'locataire', 'prestataire'], {
    errorMap: () => ({ message: 'Invalid role' })
  }),
  teamId: uuidSchema.optional(),
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
  country: z.string().min(1).max(100).trim().default('France'),
  team_id: uuidSchema,
  total_floors: z.number().int().min(0).max(200).optional(),
  total_units: z.number().int().min(0).max(10000).optional(),
  construction_year: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  notes: z.string().max(5000).trim().optional(),
})

/**
 * PUT /api/buildings/[id]
 */
export const updateBuildingSchema = createBuildingSchema.partial().extend({
  id: uuidSchema,
})

/**
 * POST /api/lots
 */
export const createLotSchema = z.object({
  building_id: uuidSchema,
  lot_number: z.string().min(1).max(50).trim(),
  category: lotCategoryEnum,
  floor: z.number().int().min(-10).max(200).optional(),
  area_sqm: z.number().positive().max(100000).optional(),
  rooms: z.number().int().min(0).max(100).optional(),
  monthly_rent: z.number().nonnegative().max(1000000).optional(),
  notes: z.string().max(5000).trim().optional(),
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
 */
export const createContactSchema = z.object({
  email: emailSchema,
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  phone: phoneSchema,
  role: z.enum(['gestionnaire', 'locataire', 'prestataire'], {
    errorMap: () => ({ message: 'Invalid contact role' })
  }),
  teamId: uuidSchema,
  companyName: z.string().max(200).trim().optional(),
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
 */
const urgencyEnum = z.enum(['faible', 'moyenne', 'haute', 'urgente'], {
  errorMap: () => ({ message: 'Invalid urgency level' })
})

/**
 * POST /api/create-intervention
 */
export const createInterventionSchema = z.object({
  lotId: uuidSchema,
  title: z.string().min(1).max(200).trim(),
  description: z.string().min(1).max(5000).trim(),
  urgency: urgencyEnum,
  requestedBy: uuidSchema,
  category: z.string().min(1).max(100).trim().optional(),
})

/**
 * POST /api/create-manager-intervention
 */
export const createManagerInterventionSchema = z.object({
  lotId: uuidSchema,
  title: z.string().min(1).max(200).trim(),
  description: z.string().min(1).max(5000).trim(),
  urgency: urgencyEnum,
  category: z.string().min(1).max(100).trim().optional(),
  assignedTo: uuidSchema.optional(),
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
  scheduledDate: dateStringSchema,
  estimatedDuration: z.number().int().min(1).max(480), // max 8 hours in minutes
  notes: z.string().max(2000).trim().optional(),
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
 */
export const uploadInterventionDocumentSchema = z.object({
  interventionId: uuidSchema,
  fileName: z.string().min(1).max(255).trim(),
  fileSize: z.number().int().positive().max(100 * 1024 * 1024), // max 100MB
  fileType: z.string().min(1).max(100).trim(),
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
