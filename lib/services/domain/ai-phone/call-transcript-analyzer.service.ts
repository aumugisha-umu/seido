import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { logger } from '@/lib/logger'

// ============================================================================
// Schema
// ============================================================================

export const interventionSummarySchema = z.object({
  caller_name: z.string().describe('Full name of the caller'),
  address: z.string().describe('Address of the property'),
  problem_description: z.string().describe(
    'Description of the problem, always translated to French regardless of the original language'
  ),
  urgency: z.enum(['basse', 'normale', 'haute', 'urgente']).describe(
    'Urgency level: basse (low), normale (normal), haute (high), urgente (emergency/danger)'
  ),
  category: z.string().optional().describe(
    'Intervention category if identifiable: plomberie, electricite, chauffage, serrurerie, etc.'
  ),
  additional_notes: z.string().optional().describe(
    'Any additional context or notes from the conversation'
  ),
})

export type InterventionSummary = z.infer<typeof interventionSummarySchema>

// ============================================================================
// Phone number normalization
// ============================================================================

/**
 * Normalizes a phone number to E.164 format (+XXXXXXXXXXX).
 * Handles common Belgian formats: 0498..., +32498..., 32498..., 04 98..., etc.
 */
export const normalizePhoneE164 = (raw: string): string => {
  // Strip all non-digit characters except leading +
  const hasPlus = raw.startsWith('+')
  const digits = raw.replace(/\D/g, '')

  // Already E.164 with country code
  if (hasPlus && digits.length >= 10) {
    return `+${digits}`
  }

  // Belgian number starting with 0 (local format)
  if (digits.startsWith('0') && digits.length >= 9) {
    return `+32${digits.slice(1)}`
  }

  // Already has country code without +
  if (digits.startsWith('32') && digits.length >= 11) {
    return `+${digits}`
  }

  // Fallback: return with + prefix if it looks valid
  if (digits.length >= 9) {
    return `+${digits}`
  }

  return raw
}

// ============================================================================
// Service
// ============================================================================

/**
 * Extracts structured intervention data from a call transcript using Claude Haiku 4.5.
 * Always translates problem_description to French.
 */
export const extractInterventionSummary = async (
  transcript: string,
  detectedLanguage?: string
): Promise<InterventionSummary> => {
  const languageHint = detectedLanguage
    ? `The conversation was in ${detectedLanguage === 'nl' ? 'Dutch' : detectedLanguage === 'en' ? 'English' : 'French'}.`
    : ''

  logger.info(
    { transcriptLength: transcript.length, detectedLanguage },
    '🧠 [AI] Extracting intervention summary from transcript'
  )

  const { object } = await generateObject({
    model: anthropic('claude-haiku-4-5-20251001'),
    schema: interventionSummarySchema,
    prompt: `You are analyzing a phone call transcript between a tenant and an AI assistant that collects maintenance intervention requests.

${languageHint}

Extract the structured information from this transcript. IMPORTANT:
- problem_description MUST be in French, even if the conversation was in Dutch or English. Translate accurately.
- urgency: use "urgente" only if there's immediate danger (gas leak, fire, flood). Use "haute" for serious issues (no heating in winter, major leak). Use "normale" for standard maintenance. Use "basse" for cosmetic/minor issues.
- category: try to identify the type of intervention (plomberie, electricite, chauffage, menuiserie, peinture, serrurerie, nettoyage, etc.)
- If information is missing or unclear, leave the field empty or use a reasonable default.

TRANSCRIPT:
${transcript}`,
  })

  logger.info(
    { callerName: object.caller_name, urgency: object.urgency, category: object.category },
    '✅ [AI] Extraction complete'
  )

  return object
}
