/**
 * Unit tests for intervention Zod validation schemas
 * @see lib/validation/schemas.ts
 *
 * Tests that API request schemas correctly validate and reject payloads.
 * Schemas are the first line of defense against malformed input.
 */

import { describe, it, expect } from 'vitest'
import {
  createInterventionSchema,
  createManagerInterventionSchema,
  interventionApproveSchema,
  interventionRejectSchema,
  interventionCancelSchema,
  interventionQuoteRequestSchema,
  interventionScheduleSchema,
} from '@/lib/validation/schemas'

// Valid UUIDs for testing
const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'
const VALID_UUID_2 = '660e8400-e29b-41d4-a716-446655440001'

// ==========================================================================
// createInterventionSchema (locataire request)
// ==========================================================================

describe('createInterventionSchema', () => {
  const validPayload = {
    lot_id: VALID_UUID,
    title: 'Fuite robinet cuisine',
    description: 'Le robinet de la cuisine fuit depuis hier matin',
    type: 'plomberie',
  }

  it('accepts valid payload', () => {
    const result = createInterventionSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('accepts payload with optional urgency', () => {
    const result = createInterventionSchema.safeParse({
      ...validPayload,
      urgency: 'haute',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing lot_id', () => {
    const { lot_id, ...payload } = validPayload
    const result = createInterventionSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('rejects invalid lot_id (not UUID)', () => {
    const result = createInterventionSchema.safeParse({
      ...validPayload,
      lot_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty title', () => {
    const result = createInterventionSchema.safeParse({
      ...validPayload,
      title: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects description shorter than 10 chars', () => {
    const result = createInterventionSchema.safeParse({
      ...validPayload,
      description: 'Court',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty type', () => {
    const result = createInterventionSchema.safeParse({
      ...validPayload,
      type: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid urgency enum value', () => {
    const result = createInterventionSchema.safeParse({
      ...validPayload,
      urgency: 'super_urgente',
    })
    expect(result.success).toBe(false)
  })

  it('trims whitespace from strings', () => {
    const result = createInterventionSchema.safeParse({
      ...validPayload,
      title: '  Fuite robinet  ',
      description: '  Le robinet de la cuisine fuit depuis hier matin  ',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Fuite robinet')
      expect(result.data.description).toBe('Le robinet de la cuisine fuit depuis hier matin')
    }
  })
})

// ==========================================================================
// createManagerInterventionSchema (gestionnaire creation)
// ==========================================================================

describe('createManagerInterventionSchema', () => {
  const validPayload = {
    title: 'Remplacement chaudière',
    type: 'chauffage',
    selectedLotId: VALID_UUID,
  }

  it('accepts minimal valid payload', () => {
    const result = createManagerInterventionSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('accepts payload with all scheduling types', () => {
    // Fixed scheduling
    const fixedResult = createManagerInterventionSchema.safeParse({
      ...validPayload,
      schedulingType: 'fixed',
      fixedDateTime: { date: '2026-03-15', time: '09:00' },
    })
    expect(fixedResult.success).toBe(true)

    // Slots scheduling
    const slotsResult = createManagerInterventionSchema.safeParse({
      ...validPayload,
      schedulingType: 'slots',
      timeSlots: [{ date: '2026-03-15', startTime: '09:00', endTime: '12:00' }],
    })
    expect(slotsResult.success).toBe(true)

    // Flexible scheduling
    const flexResult = createManagerInterventionSchema.safeParse({
      ...validPayload,
      schedulingType: 'flexible',
    })
    expect(flexResult.success).toBe(true)
  })

  it('accepts all assignment modes', () => {
    for (const mode of ['single', 'group']) {
      const result = createManagerInterventionSchema.safeParse({
        ...validPayload,
        assignmentMode: mode,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects removed "separate" assignment mode', () => {
    const result = createManagerInterventionSchema.safeParse({
      ...validPayload,
      assignmentMode: 'separate',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional description (empty or 10+ chars)', () => {
    // Empty description (optional)
    const emptyResult = createManagerInterventionSchema.safeParse({
      ...validPayload,
      description: '',
    })
    expect(emptyResult.success).toBe(true)

    // Description with 10+ chars
    const longResult = createManagerInterventionSchema.safeParse({
      ...validPayload,
      description: 'Description suffisamment longue pour validation',
    })
    expect(longResult.success).toBe(true)
  })

  it('rejects description between 1-9 chars', () => {
    const result = createManagerInterventionSchema.safeParse({
      ...validPayload,
      description: 'Court',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing title', () => {
    const { title, ...payload } = validPayload
    const result = createManagerInterventionSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('rejects fixed scheduling without date', () => {
    const result = createManagerInterventionSchema.safeParse({
      ...validPayload,
      schedulingType: 'fixed',
      fixedDateTime: { date: '', time: '09:00' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects slots scheduling without any slots', () => {
    const result = createManagerInterventionSchema.safeParse({
      ...validPayload,
      schedulingType: 'slots',
      timeSlots: [],
    })
    expect(result.success).toBe(false)
  })

  it('accepts provider IDs array', () => {
    const result = createManagerInterventionSchema.safeParse({
      ...validPayload,
      selectedProviderIds: [VALID_UUID, VALID_UUID_2],
    })
    expect(result.success).toBe(true)
  })

  it('accepts expectsQuote flag', () => {
    const result = createManagerInterventionSchema.safeParse({
      ...validPayload,
      expectsQuote: true,
    })
    expect(result.success).toBe(true)
  })
})

// ==========================================================================
// interventionApproveSchema
// ==========================================================================

describe('interventionApproveSchema', () => {
  it('accepts valid approval', () => {
    const result = interventionApproveSchema.safeParse({
      interventionId: VALID_UUID,
    })
    expect(result.success).toBe(true)
  })

  it('accepts approval with optional notes', () => {
    const result = interventionApproveSchema.safeParse({
      interventionId: VALID_UUID,
      notes: 'Approuvé avec priorité',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid UUID', () => {
    const result = interventionApproveSchema.safeParse({
      interventionId: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

// ==========================================================================
// interventionRejectSchema
// ==========================================================================

describe('interventionRejectSchema', () => {
  it('accepts valid rejection with reason', () => {
    const result = interventionRejectSchema.safeParse({
      interventionId: VALID_UUID,
      reason: 'Pas dans le périmètre du contrat',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing reason', () => {
    const result = interventionRejectSchema.safeParse({
      interventionId: VALID_UUID,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty reason', () => {
    const result = interventionRejectSchema.safeParse({
      interventionId: VALID_UUID,
      reason: '',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional internal comment', () => {
    const result = interventionRejectSchema.safeParse({
      interventionId: VALID_UUID,
      reason: 'Non pertinent',
      internalComment: 'Note interne pour le dossier',
    })
    expect(result.success).toBe(true)
  })
})

// ==========================================================================
// interventionCancelSchema
// ==========================================================================

describe('interventionCancelSchema', () => {
  it('accepts valid cancellation', () => {
    const result = interventionCancelSchema.safeParse({
      interventionId: VALID_UUID,
      cancellationReason: 'Problème résolu par le locataire',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing cancellation reason', () => {
    const result = interventionCancelSchema.safeParse({
      interventionId: VALID_UUID,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty cancellation reason', () => {
    const result = interventionCancelSchema.safeParse({
      interventionId: VALID_UUID,
      cancellationReason: '',
    })
    expect(result.success).toBe(false)
  })
})

// ==========================================================================
// interventionQuoteRequestSchema
// ==========================================================================

describe('interventionQuoteRequestSchema', () => {
  it('accepts valid quote request', () => {
    const result = interventionQuoteRequestSchema.safeParse({
      interventionId: VALID_UUID,
      providerIds: [VALID_UUID_2],
    })
    expect(result.success).toBe(true)
  })

  it('accepts quote request with optional fields', () => {
    const result = interventionQuoteRequestSchema.safeParse({
      interventionId: VALID_UUID,
      providerIds: [VALID_UUID, VALID_UUID_2],
      message: 'Merci de fournir un devis détaillé',
      deadline: '2026-04-01T00:00:00.000Z', // ISO 8601 datetime required
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty provider IDs array', () => {
    const result = interventionQuoteRequestSchema.safeParse({
      interventionId: VALID_UUID,
      providerIds: [],
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid provider UUID', () => {
    const result = interventionQuoteRequestSchema.safeParse({
      interventionId: VALID_UUID,
      providerIds: ['not-a-uuid'],
    })
    expect(result.success).toBe(false)
  })
})

// ==========================================================================
// interventionScheduleSchema
// ==========================================================================

describe('interventionScheduleSchema', () => {
  it('accepts direct scheduling', () => {
    const result = interventionScheduleSchema.safeParse({
      interventionId: VALID_UUID,
      planningType: 'direct',
      directSchedule: {
        date: '2026-03-20',
        startTime: '09:00',
      },
    })
    expect(result.success).toBe(true)
  })

  it('accepts proposed slots scheduling', () => {
    const result = interventionScheduleSchema.safeParse({
      interventionId: VALID_UUID,
      planningType: 'propose',
      proposedSlots: [
        { date: '2026-03-20', startTime: '09:00', endTime: '12:00' },
        { date: '2026-03-21', startTime: '14:00', endTime: '17:00' },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid planning type', () => {
    const result = interventionScheduleSchema.safeParse({
      interventionId: VALID_UUID,
      planningType: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})
