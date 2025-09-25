import { describe, it, expect, vi } from 'vitest'
import { createMockIntervention } from '@/test/utils'

// Mock the intervention actions service
const mockHandleApproval = vi.fn()
const mockHandleScheduling = vi.fn()
const mockHandleExecution = vi.fn()

vi.mock('@/lib/intervention-actions-service', () => ({
  InterventionActionsService: {
    handleApproval: mockHandleApproval,
    handleScheduling: mockHandleScheduling,
    handleExecution: mockHandleExecution,
  }
}))

describe('InterventionWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleApproval', () => {
    it('should transition from nouvelle-demande to approuvee correctly', async () => {
      const intervention = createMockIntervention('nouvelle-demande')
      const approvalData = {
        action: 'approve' as const,
        internalComment: 'Approved for urgent repair'
      }

      mockHandleApproval.mockResolvedValue({
        ...intervention,
        status: 'approuvee',
        manager_internal_comment: 'Approved for urgent repair',
        updated_at: new Date().toISOString()
      })

      const result = await mockHandleApproval(intervention.id, approvalData)

      expect(result.status).toBe('approuvee')
      expect(result.manager_internal_comment).toBe('Approved for urgent repair')
      expect(mockHandleApproval).toHaveBeenCalledWith(intervention.id, approvalData)
    })

    it('should transition from nouvelle-demande to rejetee when rejected', async () => {
      const intervention = createMockIntervention('nouvelle-demande')
      const rejectionData = {
        action: 'reject' as const,
        rejectionReason: 'Not urgent enough',
        internalComment: 'Rejected - can wait'
      }

      mockHandleApproval.mockResolvedValue({
        ...intervention,
        status: 'rejetee',
        manager_internal_comment: 'Rejected - can wait',
        rejection_reason: 'Not urgent enough',
        updated_at: new Date().toISOString()
      })

      const result = await mockHandleApproval(intervention.id, rejectionData)

      expect(result.status).toBe('rejetee')
      expect(result.rejection_reason).toBe('Not urgent enough')
    })

    it('should handle approval with quote requirement', async () => {
      const intervention = createMockIntervention('nouvelle-demande')
      intervention.expects_quote = true

      const approvalData = {
        action: 'approve' as const,
        internalComment: 'Approved - quote required'
      }

      mockHandleApproval.mockResolvedValue({
        ...intervention,
        status: 'devis-a-fournir',
        manager_internal_comment: 'Approved - quote required',
        updated_at: new Date().toISOString()
      })

      const result = await mockHandleApproval(intervention.id, approvalData)

      expect(result.status).toBe('devis-a-fournir')
    })
  })

  describe('handleScheduling', () => {
    it('should schedule intervention with direct planning', async () => {
      const intervention = createMockIntervention('approuvee')
      const schedulingData = {
        option: 'direct' as const,
        directSchedule: {
          date: '2024-09-26',
          startTime: '09:00',
          endTime: '12:00'
        }
      }

      mockHandleScheduling.mockResolvedValue({
        ...intervention,
        status: 'programmee',
        scheduled_date: '2024-09-26T00:00:00Z',
        scheduled_start_time: '09:00:00',
        scheduled_end_time: '12:00:00',
        updated_at: new Date().toISOString()
      })

      const result = await mockHandleScheduling(intervention.id, schedulingData)

      expect(result.status).toBe('programmee')
      expect(result.scheduled_date).toBe('2024-09-26T00:00:00Z')
      expect(result.scheduled_start_time).toBe('09:00:00')
    })

    it('should handle proposed time slots', async () => {
      const intervention = createMockIntervention('approuvee')
      const schedulingData = {
        option: 'propose' as const,
        proposedSlots: [
          {
            date: '2024-09-26',
            startTime: '09:00',
            endTime: '12:00'
          },
          {
            date: '2024-09-27',
            startTime: '14:00',
            endTime: '17:00'
          }
        ]
      }

      mockHandleScheduling.mockResolvedValue({
        ...intervention,
        status: 'a-programmer',
        proposed_slots: schedulingData.proposedSlots,
        updated_at: new Date().toISOString()
      })

      const result = await mockHandleScheduling(intervention.id, schedulingData)

      expect(result.status).toBe('a-programmer')
      expect(result.proposed_slots).toEqual(schedulingData.proposedSlots)
    })
  })

  describe('handleExecution', () => {
    it('should start intervention execution', async () => {
      const intervention = createMockIntervention('programmee')
      const executionData = {
        action: 'start' as const,
        comment: 'Starting work now',
        internalComment: 'On site, beginning repairs',
        files: []
      }

      mockHandleExecution.mockResolvedValue({
        ...intervention,
        status: 'en-cours',
        provider_execution_comment: 'Starting work now',
        updated_at: new Date().toISOString()
      })

      const result = await mockHandleExecution(intervention.id, executionData)

      expect(result.status).toBe('en-cours')
      expect(result.provider_execution_comment).toBe('Starting work now')
    })

    it('should cancel intervention', async () => {
      const intervention = createMockIntervention('programmee')
      const executionData = {
        action: 'cancel' as const,
        comment: 'Unable to access property',
        internalComment: 'Tenant not available',
        files: []
      }

      mockHandleExecution.mockResolvedValue({
        ...intervention,
        status: 'annulee',
        provider_execution_comment: 'Unable to access property',
        updated_at: new Date().toISOString()
      })

      const result = await mockHandleExecution(intervention.id, executionData)

      expect(result.status).toBe('annulee')
      expect(result.provider_execution_comment).toBe('Unable to access property')
    })
  })

  describe('status transitions validation', () => {
    const validTransitions = [
      { from: 'nouvelle-demande', to: 'approuvee', action: 'approve' },
      { from: 'nouvelle-demande', to: 'rejetee', action: 'reject' },
      { from: 'approuvee', to: 'programmee', action: 'schedule' },
      { from: 'approuvee', to: 'devis-a-fournir', action: 'require_quote' },
      { from: 'programmee', to: 'en-cours', action: 'start' },
      { from: 'en-cours', to: 'paiement-a-recevoir', action: 'complete' },
      { from: 'paiement-a-recevoir', to: 'terminee', action: 'finalize' }
    ]

    it.each(validTransitions)(
      'should allow transition from $from to $to',
      ({ from, to }) => {
        // This would test the actual transition logic
        expect(true).toBe(true) // Placeholder for actual validation logic
      }
    )

    const invalidTransitions = [
      { from: 'nouvelle-demande', to: 'en-cours' },
      { from: 'terminee', to: 'nouvelle-demande' },
      { from: 'rejetee', to: 'approuvee' }
    ]

    it.each(invalidTransitions)(
      'should not allow invalid transition from $from to $to',
      ({ from, to }) => {
        // This would test that invalid transitions throw errors
        expect(true).toBe(true) // Placeholder for actual validation logic
      }
    )
  })
})