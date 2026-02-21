/**
 * Unit tests for intervention participant permissions
 * @see lib/utils/intervention-permissions.ts
 *
 * Tests the permission matrix based on:
 * - Confirmation status (pending/confirmed/rejected/not_required)
 * - Creator vs assigned participant
 * - Intervention requires_participant_confirmation flag
 */

import { describe, it, expect } from 'vitest'
import {
  getParticipantPermissions,
  needsConfirmation,
  hasConfirmed,
  hasRejected,
  type InterventionConfirmationInfo,
  type AssignmentConfirmationInfo,
} from '@/lib/utils/intervention-permissions'

// ==========================================================================
// getParticipantPermissions
// ==========================================================================

describe('getParticipantPermissions', () => {
  const confirmableIntervention: InterventionConfirmationInfo = {
    requires_participant_confirmation: true,
  }

  const nonConfirmableIntervention: InterventionConfirmationInfo = {
    requires_participant_confirmation: false,
  }

  describe('creator permissions', () => {
    it('creator always has full access regardless of intervention settings', () => {
      const perms = getParticipantPermissions(confirmableIntervention, null, true)
      expect(perms.canInteract).toBe(true)
      expect(perms.canEditSchedule).toBe(true)
      expect(perms.canChat).toBe(true)
      expect(perms.canUploadDocuments).toBe(true)
      expect(perms.canManageQuotes).toBe(true)
      expect(perms.canConfirm).toBe(false) // Creator doesn't need to confirm
      expect(perms.reason).toBeUndefined()
    })

    it('creator has full access even with null intervention', () => {
      const perms = getParticipantPermissions(null, null, true)
      expect(perms.canInteract).toBe(true)
    })
  })

  describe('null intervention', () => {
    it('returns all-false permissions with reason', () => {
      const perms = getParticipantPermissions(null, null, false)
      expect(perms.canInteract).toBe(false)
      expect(perms.canConfirm).toBe(false)
      expect(perms.canEditSchedule).toBe(false)
      expect(perms.canChat).toBe(false)
      expect(perms.canUploadDocuments).toBe(false)
      expect(perms.canManageQuotes).toBe(false)
      expect(perms.reason).toBe('Intervention introuvable')
    })
  })

  describe('no confirmation required (intervention-level)', () => {
    it('grants full access when intervention does not require confirmation', () => {
      const perms = getParticipantPermissions(nonConfirmableIntervention, null, false)
      expect(perms.canInteract).toBe(true)
      expect(perms.canEditSchedule).toBe(true)
      expect(perms.canChat).toBe(true)
      expect(perms.canUploadDocuments).toBe(true)
      expect(perms.canManageQuotes).toBe(true)
      expect(perms.canConfirm).toBe(false)
    })
  })

  describe('no assignment (participant not assigned)', () => {
    it('returns restricted permissions when confirmation required but no assignment', () => {
      const perms = getParticipantPermissions(confirmableIntervention, null, false)
      expect(perms.canInteract).toBe(false)
      expect(perms.reason).toBe('Non assigné à cette intervention')
    })
  })

  describe('assignment does not require confirmation', () => {
    const noConfirmAssignment: AssignmentConfirmationInfo = {
      requires_confirmation: false,
      confirmation_status: 'not_required',
    }

    it('grants full access', () => {
      const perms = getParticipantPermissions(confirmableIntervention, noConfirmAssignment, false)
      expect(perms.canInteract).toBe(true)
      expect(perms.canEditSchedule).toBe(true)
      expect(perms.canConfirm).toBe(false)
    })
  })

  describe('assignment with confirmation_status = not_required', () => {
    const notRequiredAssignment: AssignmentConfirmationInfo = {
      requires_confirmation: true,
      confirmation_status: 'not_required',
    }

    it('grants full access even if requires_confirmation is true', () => {
      const perms = getParticipantPermissions(confirmableIntervention, notRequiredAssignment, false)
      expect(perms.canInteract).toBe(true)
      expect(perms.canEditSchedule).toBe(true)
    })
  })

  describe('pending confirmation', () => {
    const pendingAssignment: AssignmentConfirmationInfo = {
      requires_confirmation: true,
      confirmation_status: 'pending',
    }

    it('allows interaction and chat but restricts editing', () => {
      const perms = getParticipantPermissions(confirmableIntervention, pendingAssignment, false)
      expect(perms.canInteract).toBe(true)
      expect(perms.canConfirm).toBe(true)
      expect(perms.canChat).toBe(true)
      expect(perms.canEditSchedule).toBe(false)
      expect(perms.canUploadDocuments).toBe(false)
      expect(perms.canManageQuotes).toBe(false)
      expect(perms.reason).toBe('Confirmation de disponibilité requise')
    })
  })

  describe('confirmed participation', () => {
    const confirmedAssignment: AssignmentConfirmationInfo = {
      requires_confirmation: true,
      confirmation_status: 'confirmed',
    }

    it('grants full access after confirmation', () => {
      const perms = getParticipantPermissions(confirmableIntervention, confirmedAssignment, false)
      expect(perms.canInteract).toBe(true)
      expect(perms.canConfirm).toBe(false) // Already confirmed
      expect(perms.canEditSchedule).toBe(true)
      expect(perms.canChat).toBe(true)
      expect(perms.canUploadDocuments).toBe(true)
      expect(perms.canManageQuotes).toBe(true)
    })
  })

  describe('rejected participation', () => {
    const rejectedAssignment: AssignmentConfirmationInfo = {
      requires_confirmation: true,
      confirmation_status: 'rejected',
    }

    it('heavily restricts access but still allows chat', () => {
      const perms = getParticipantPermissions(confirmableIntervention, rejectedAssignment, false)
      expect(perms.canInteract).toBe(false)
      expect(perms.canConfirm).toBe(false) // Cannot change mind
      expect(perms.canChat).toBe(true) // For explanation
      expect(perms.canEditSchedule).toBe(false)
      expect(perms.canUploadDocuments).toBe(false)
      expect(perms.canManageQuotes).toBe(false)
      expect(perms.reason).toBe('Vous avez décliné cette intervention')
    })
  })
})

// ==========================================================================
// needsConfirmation
// ==========================================================================

describe('needsConfirmation', () => {
  it('returns false for null assignment', () => {
    expect(needsConfirmation(null)).toBe(false)
  })

  it('returns true when requires_confirmation is true and status is pending', () => {
    expect(needsConfirmation({
      requires_confirmation: true,
      confirmation_status: 'pending',
    })).toBe(true)
  })

  it('returns false when requires_confirmation is false', () => {
    expect(needsConfirmation({
      requires_confirmation: false,
      confirmation_status: 'pending',
    })).toBe(false)
  })

  it('returns false when already confirmed', () => {
    expect(needsConfirmation({
      requires_confirmation: true,
      confirmation_status: 'confirmed',
    })).toBe(false)
  })
})

// ==========================================================================
// hasConfirmed
// ==========================================================================

describe('hasConfirmed', () => {
  it('returns false for null assignment', () => {
    expect(hasConfirmed(null)).toBe(false)
  })

  it('returns true when status is confirmed', () => {
    expect(hasConfirmed({
      requires_confirmation: true,
      confirmation_status: 'confirmed',
    })).toBe(true)
  })

  it('returns false when status is pending', () => {
    expect(hasConfirmed({
      requires_confirmation: true,
      confirmation_status: 'pending',
    })).toBe(false)
  })
})

// ==========================================================================
// hasRejected
// ==========================================================================

describe('hasRejected', () => {
  it('returns false for null assignment', () => {
    expect(hasRejected(null)).toBe(false)
  })

  it('returns true when status is rejected', () => {
    expect(hasRejected({
      requires_confirmation: true,
      confirmation_status: 'rejected',
    })).toBe(true)
  })

  it('returns false when status is confirmed', () => {
    expect(hasRejected({
      requires_confirmation: true,
      confirmation_status: 'confirmed',
    })).toBe(false)
  })
})
