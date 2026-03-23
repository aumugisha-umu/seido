/**
 * NotificationService Tests — Full Intervention Lifecycle
 *
 * Captures all in-app notifications (repository.create calls) and verifies:
 * - Correct recipients per role (gestionnaire, prestataire, locataire)
 * - Role-adapted message content (French, context-aware)
 * - Proper metadata (intervention_id, status, reason, role)
 * - Exclusion of the acting user
 * - Personal vs team notification distinction
 *
 * Lifecycle flow tested:
 *   1. Created → gestionnaire + prestataire + locataire + team members
 *   2. Approved (demande → approuvee) → locataire sees "Votre demande...approuvée"
 *   3. Rejected (demande → rejetee) → locataire sees rejection reason
 *   4. Planning (approuvee → planification) → prestataire sees "en planification"
 *   5. Scheduled (planification → planifiee) → all parties
 *   6. Completed by provider (planifiee → cloturee_par_prestataire) → tenant: "valider"
 *   7. Validated by tenant (→ cloturee_par_locataire) → managers
 *   8. Finalized by manager (→ cloturee_par_gestionnaire) → all
 *   9. Cancelled (any → annulee) → all with reason
 */

vi.mock('@/lib/services/core/supabase-client', () => ({
  createServiceRoleSupabaseClient: vi.fn(() => ({})),
  createServerSupabaseClient: vi.fn(() => ({})),
  supabaseUrl: 'https://test.supabase.co',
  supabaseAnonKey: 'test-key',
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationService } from '../notification.service'
import type { NotificationRepository } from '@/lib/services/repositories/notification-repository'

// ══════════════════════════════════════════════════════════════
// Test Fixtures — A realistic intervention scenario
// ══════════════════════════════════════════════════════════════

const TEAM_ID = 'team-1'
const INTERVENTION_ID = 'int-1'

const USERS = {
  managerPrimary: { id: 'manager-1', role: 'gestionnaire', name: 'Jean Martin' },
  managerSecondary: { id: 'manager-2', role: 'gestionnaire', name: 'Alice Dupont' },
  provider: { id: 'provider-1', role: 'prestataire', name: 'Pierre Plombier' },
  tenant: { id: 'tenant-1', role: 'locataire', name: 'Marie Locataire' },
  teamMember: { id: 'team-member-1', role: 'gestionnaire', name: 'Bob Team' },
}

/**
 * Builds the intervention fixture returned by getInterventionWithManagers.
 * Default: 1 primary manager, 1 provider, 1 tenant assigned, plus team members.
 */
function buildIntervention(overrides: Record<string, unknown> = {}) {
  return {
    id: INTERVENTION_ID,
    title: 'Fuite robinet cuisine',
    reference: 'INT-2026-042',
    lot_id: 'lot-1',
    team_id: TEAM_ID,
    created_by: USERS.managerPrimary.id,
    assigned_to: USERS.managerPrimary.id,
    manager_id: USERS.managerPrimary.id,
    interventionAssignedManagers: [USERS.managerPrimary.id],
    interventionAssignedProviders: [USERS.provider.id],
    interventionAssignedTenants: [USERS.tenant.id],
    buildingManagers: [],
    lotManagers: [],
    teamMembers: [
      USERS.managerPrimary,
      USERS.managerSecondary,
      USERS.provider,
      USERS.tenant,
      USERS.teamMember,
    ],
    lot: { reference: 'Apt 3B', building: { name: 'Résidence du Parc' } },
    ...overrides,
  }
}

/**
 * Builds an assignment map as returned by getAssignedUsersWithRoles.
 * Maps user IDs to { role, is_primary }.
 */
function buildAssignmentMap(
  assignments: Array<{ userId: string; role: string; isPrimary?: boolean }>
): Map<string, { role: string; is_primary: boolean }> {
  const map = new Map<string, { role: string; is_primary: boolean }>()
  assignments.forEach(a => map.set(a.userId, { role: a.role, is_primary: a.isPrimary ?? true }))
  return map
}

/** Standard assignment map: manager + provider + tenant */
const STANDARD_ASSIGNMENTS = buildAssignmentMap([
  { userId: USERS.managerPrimary.id, role: 'gestionnaire' },
  { userId: USERS.provider.id, role: 'prestataire' },
  { userId: USERS.tenant.id, role: 'locataire' },
])

// ══════════════════════════════════════════════════════════════
// Mock Repository — captures every notification
// ══════════════════════════════════════════════════════════════

interface CapturedNotification {
  user_id: string
  team_id: string
  created_by: string
  type: string
  title: string
  message: string
  is_personal: boolean
  metadata?: Record<string, unknown>
  related_entity_type?: string
  related_entity_id?: string
}

function createMockRepository() {
  const captured: CapturedNotification[] = []

  const repository = {
    create: vi.fn(async (data: CapturedNotification) => {
      captured.push(data)
      return { data: { id: `notif-${captured.length}`, ...data }, error: null }
    }),
    getInterventionWithManagers: vi.fn(),
    getBuildingWithManagers: vi.fn(),
    getLotWithManagers: vi.fn(),
    getContactWithManagers: vi.fn(),
    findByUserId: vi.fn(),
    update: vi.fn(),
    // supabase is accessed by getAssignedUsersWithRoles — we'll spy on that method instead
    supabase: {},
  } as unknown as NotificationRepository

  return { repository, captured }
}

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

function notificationsFor(notifications: CapturedNotification[], userId: string) {
  return notifications.filter(n => n.user_id === userId)
}

// ══════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════

describe('NotificationService — Intervention Lifecycle', () => {
  let mockRepo: ReturnType<typeof createMockRepository>
  let service: NotificationService

  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo = createMockRepository()
    service = new NotificationService(mockRepo.repository)

    // Spy on the private getAssignedUsersWithRoles to inject assignment data
    // This avoids fragile supabase chain mocking
    vi.spyOn(service as any, 'getAssignedUsersWithRoles')
      .mockResolvedValue(STANDARD_ASSIGNMENTS)
  })

  // ────────────────────────────────────────────────────────────
  // 1. INTERVENTION CREATED
  // ────────────────────────────────────────────────────────────

  describe('1. Intervention Created', () => {
    it('should notify all assigned users and team members, excluding the creator', async () => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())

      await service.notifyInterventionCreated({
        interventionId: INTERVENTION_ID,
        teamId: TEAM_ID,
        createdBy: USERS.managerPrimary.id,
      })

      const notifications = mockRepo.captured

      // Creator (managerPrimary) excluded
      expect(notificationsFor(notifications, USERS.managerPrimary.id)).toHaveLength(0)

      // Provider gets personal notification with role-adapted message
      const providerNotifs = notificationsFor(notifications, USERS.provider.id)
      expect(providerNotifs).toHaveLength(1)
      expect(providerNotifs[0].message).toContain('prestataire')
      expect(providerNotifs[0].type).toBe('intervention')
      expect(providerNotifs[0].metadata?.assigned_role).toBe('prestataire')

      // Tenant gets personal notification with "logement" message
      const tenantNotifs = notificationsFor(notifications, USERS.tenant.id)
      expect(tenantNotifs).toHaveLength(1)
      expect(tenantNotifs[0].message).toContain('logement')
      expect(tenantNotifs[0].metadata?.assigned_role).toBe('locataire')

      // Title includes building context
      notifications.forEach(n => {
        expect(n.title).toContain('Résidence du Parc')
      })

      // All notifications have correct entity reference
      notifications.forEach(n => {
        expect(n.metadata?.intervention_id).toBe(INTERVENTION_ID)
        expect(n.related_entity_type).toBe('intervention')
        expect(n.related_entity_id).toBe(INTERVENTION_ID)
      })
    })

    it('should set non-assigned team members as team (non-personal) notifications', async () => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())

      await service.notifyInterventionCreated({
        interventionId: INTERVENTION_ID,
        teamId: TEAM_ID,
        createdBy: USERS.managerPrimary.id,
      })

      // managerSecondary & teamMember are gestionnaire team members, not directly assigned
      const secondaryNotifs = notificationsFor(mockRepo.captured, USERS.managerSecondary.id)
      const teamNotifs = notificationsFor(mockRepo.captured, USERS.teamMember.id)

      // Both should have is_assigned: false in metadata
      ;[...secondaryNotifs, ...teamNotifs].forEach(n => {
        expect(n.metadata?.is_assigned).toBe(false)
        expect(n.message).toContain('créée dans votre équipe')
      })
    })
  })

  // ────────────────────────────────────────────────────────────
  // 2. APPROVED (demande → approuvee)
  // ────────────────────────────────────────────────────────────

  describe('2. Approved (demande → approuvee)', () => {
    it('should send role-adapted approval messages', async () => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())

      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'demande',
        newStatus: 'approuvee',
        teamId: TEAM_ID,
        changedBy: USERS.managerPrimary.id,
      })

      const notifications = mockRepo.captured

      // Approving manager excluded
      expect(notificationsFor(notifications, USERS.managerPrimary.id)).toHaveLength(0)

      // Locataire gets "Votre demande...approuvée"
      const tenantNotifs = notificationsFor(notifications, USERS.tenant.id)
      expect(tenantNotifs).toHaveLength(1)
      expect(tenantNotifs[0].message).toMatch(/Votre demande.*approuvée/)
      expect(tenantNotifs[0].type).toBe('status_change')
      expect(tenantNotifs[0].metadata?.old_status).toBe('demande')
      expect(tenantNotifs[0].metadata?.new_status).toBe('approuvee')

      // Prestataire gets generic approval message (specific is for approuvee→planification)
      const providerNotifs = notificationsFor(notifications, USERS.provider.id)
      expect(providerNotifs).toHaveLength(1)
      expect(providerNotifs[0].message).toContain('Approuvée')
      expect(providerNotifs[0].type).toBe('status_change')

      // All notifications have correct title
      notifications.forEach(n => {
        expect(n.title).toContain('approuvée')
      })
    })
  })

  // ────────────────────────────────────────────────────────────
  // 3. REJECTED (demande → rejetee)
  // ────────────────────────────────────────────────────────────

  describe('3. Rejected (demande → rejetee)', () => {
    it('should include rejection reason in tenant notification', async () => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())

      const reason = 'Hors périmètre du bail'

      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'demande',
        newStatus: 'rejetee',
        teamId: TEAM_ID,
        changedBy: USERS.managerPrimary.id,
        reason,
      })

      const tenantNotifs = notificationsFor(mockRepo.captured, USERS.tenant.id)
      expect(tenantNotifs).toHaveLength(1)
      expect(tenantNotifs[0].message).toMatch(/Votre demande.*rejetée/)
      expect(tenantNotifs[0].message).toContain(reason)
      expect(tenantNotifs[0].metadata?.reason).toBe(reason)
      expect(tenantNotifs[0].metadata?.new_status).toBe('rejetee')
    })

    it('should notify provider with generic rejection message', async () => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())

      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'demande',
        newStatus: 'rejetee',
        teamId: TEAM_ID,
        changedBy: USERS.managerPrimary.id,
        reason: 'Non urgent',
      })

      const providerNotifs = notificationsFor(mockRepo.captured, USERS.provider.id)
      expect(providerNotifs).toHaveLength(1)
      expect(providerNotifs[0].message).toContain('Rejetée')
      expect(providerNotifs[0].metadata?.reason).toBe('Non urgent')
    })
  })

  // ────────────────────────────────────────────────────────────
  // 4. PLANNING (approuvee → planification)
  // ────────────────────────────────────────────────────────────

  describe('4. Planning (approuvee → planification)', () => {
    it('should notify provider with specific planning message', async () => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())

      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'approuvee',
        newStatus: 'planification',
        teamId: TEAM_ID,
        changedBy: USERS.managerPrimary.id,
      })

      const providerNotifs = notificationsFor(mockRepo.captured, USERS.provider.id)
      expect(providerNotifs).toHaveLength(1)
      expect(providerNotifs[0].message).toContain('planification')
      expect(providerNotifs[0].metadata?.new_status).toBe('planification')
    })

    it('should notify tenant with generic status change', async () => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())

      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'approuvee',
        newStatus: 'planification',
        teamId: TEAM_ID,
        changedBy: USERS.managerPrimary.id,
      })

      const tenantNotifs = notificationsFor(mockRepo.captured, USERS.tenant.id)
      expect(tenantNotifs).toHaveLength(1)
      expect(tenantNotifs[0].message).toContain('logement')
      expect(tenantNotifs[0].message).toContain('Planification')
    })
  })

  // ────────────────────────────────────────────────────────────
  // 5. SCHEDULED (planification → planifiee)
  // ────────────────────────────────────────────────────────────

  describe('5. Scheduled (planification → planifiee)', () => {
    it('should notify all parties except the confirming user', async () => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())

      // Tenant confirms the slot
      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'planification',
        newStatus: 'planifiee',
        teamId: TEAM_ID,
        changedBy: USERS.tenant.id,
      })

      const notifications = mockRepo.captured

      // Tenant who confirmed is excluded
      expect(notificationsFor(notifications, USERS.tenant.id)).toHaveLength(0)

      // Manager and provider notified
      expect(notificationsFor(notifications, USERS.managerPrimary.id).length).toBeGreaterThanOrEqual(1)
      expect(notificationsFor(notifications, USERS.provider.id).length).toBeGreaterThanOrEqual(1)

      notifications.forEach(n => {
        expect(n.title).toContain('planifiée')
        expect(n.metadata?.new_status).toBe('planifiee')
      })
    })
  })

  // ────────────────────────────────────────────────────────────
  // 6. COMPLETED BY PROVIDER (planifiee → cloturee_par_prestataire)
  // ────────────────────────────────────────────────────────────

  describe('6. Completed by provider (planifiee → cloturee_par_prestataire)', () => {
    it('should ask tenant to validate and inform managers', async () => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())

      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'planifiee',
        newStatus: 'cloturee_par_prestataire',
        teamId: TEAM_ID,
        changedBy: USERS.provider.id,
      })

      const notifications = mockRepo.captured

      // Provider who completed is excluded
      expect(notificationsFor(notifications, USERS.provider.id)).toHaveLength(0)

      // Tenant sees completion + validation request
      const tenantNotifs = notificationsFor(notifications, USERS.tenant.id)
      expect(tenantNotifs).toHaveLength(1)
      expect(tenantNotifs[0].message).toContain('terminé')
      expect(tenantNotifs[0].message).toContain('valider')

      // Manager gets status change notification
      const managerNotifs = notificationsFor(notifications, USERS.managerPrimary.id)
      expect(managerNotifs).toHaveLength(1)
      expect(managerNotifs[0].metadata?.new_status).toBe('cloturee_par_prestataire')
      expect(managerNotifs[0].message).toContain('gérez')
    })
  })

  // ────────────────────────────────────────────────────────────
  // 7. VALIDATED BY TENANT (→ cloturee_par_locataire)
  // ────────────────────────────────────────────────────────────

  describe('7. Validated by tenant (→ cloturee_par_locataire)', () => {
    it('should notify managers that tenant validated', async () => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())

      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'cloturee_par_prestataire',
        newStatus: 'cloturee_par_locataire',
        teamId: TEAM_ID,
        changedBy: USERS.tenant.id,
      })

      const notifications = mockRepo.captured

      // Tenant excluded
      expect(notificationsFor(notifications, USERS.tenant.id)).toHaveLength(0)

      // Manager notified
      const managerNotifs = notificationsFor(notifications, USERS.managerPrimary.id)
      expect(managerNotifs.length).toBeGreaterThanOrEqual(1)
      expect(managerNotifs[0].metadata?.new_status).toBe('cloturee_par_locataire')

      // Provider also notified
      const providerNotifs = notificationsFor(notifications, USERS.provider.id)
      expect(providerNotifs.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ────────────────────────────────────────────────────────────
  // 8. FINALIZED BY MANAGER (→ cloturee_par_gestionnaire)
  // ────────────────────────────────────────────────────────────

  describe('8. Finalized by manager (→ cloturee_par_gestionnaire)', () => {
    it('should notify all other parties of final closure', async () => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())

      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'cloturee_par_locataire',
        newStatus: 'cloturee_par_gestionnaire',
        teamId: TEAM_ID,
        changedBy: USERS.managerPrimary.id,
      })

      const notifications = mockRepo.captured

      // Finalizing manager excluded
      expect(notificationsFor(notifications, USERS.managerPrimary.id)).toHaveLength(0)

      // Provider and tenant notified
      expect(notificationsFor(notifications, USERS.provider.id).length).toBeGreaterThanOrEqual(1)
      expect(notificationsFor(notifications, USERS.tenant.id).length).toBeGreaterThanOrEqual(1)

      notifications.forEach(n => {
        expect(n.metadata?.new_status).toBe('cloturee_par_gestionnaire')
      })
    })
  })

  // ────────────────────────────────────────────────────────────
  // 9. CANCELLED (any → annulee)
  // ────────────────────────────────────────────────────────────

  describe('9. Cancelled (any → annulee)', () => {
    it('should notify all except canceller with reason', async () => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())

      const reason = 'Intervention en double'

      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'approuvee',
        newStatus: 'annulee',
        teamId: TEAM_ID,
        changedBy: USERS.managerPrimary.id,
        reason,
      })

      const notifications = mockRepo.captured

      // Canceller excluded
      expect(notificationsFor(notifications, USERS.managerPrimary.id)).toHaveLength(0)

      // All others notified with reason
      expect(notifications.length).toBeGreaterThanOrEqual(2) // provider + tenant + team members

      notifications.forEach(n => {
        expect(n.title).toContain('annulée')
        expect(n.metadata?.new_status).toBe('annulee')
        expect(n.metadata?.reason).toBe(reason)
      })
    })

    it('should include reason text in all notification messages', async () => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())

      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'planifiee',
        newStatus: 'annulee',
        teamId: TEAM_ID,
        changedBy: USERS.managerPrimary.id,
        reason: 'Locataire parti',
      })

      mockRepo.captured.forEach(n => {
        expect(n.message).toContain('Locataire parti')
      })
    })
  })

  // ────────────────────────────────────────────────────────────
  // CROSS-CUTTING CONCERNS
  // ────────────────────────────────────────────────────────────

  describe('Cross-cutting: structural invariants', () => {
    it('should always include intervention title in messages', async () => {
      const intervention = buildIntervention({ title: 'Chaudière en panne' })
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(intervention)

      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'demande',
        newStatus: 'approuvee',
        teamId: TEAM_ID,
        changedBy: USERS.managerPrimary.id,
      })

      mockRepo.captured.forEach(n => {
        expect(n.message).toContain('Chaudière en panne')
      })
    })

    it('should use type "intervention" for creates and "status_change" for transitions', async () => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())

      // Create
      await service.notifyInterventionCreated({
        interventionId: INTERVENTION_ID,
        teamId: TEAM_ID,
        createdBy: USERS.managerPrimary.id,
      })

      const createNotifs = [...mockRepo.captured]
      createNotifs.forEach(n => expect(n.type).toBe('intervention'))

      // Clear
      mockRepo.captured.length = 0

      // Status change
      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'demande',
        newStatus: 'approuvee',
        teamId: TEAM_ID,
        changedBy: USERS.managerPrimary.id,
      })

      mockRepo.captured.forEach(n => expect(n.type).toBe('status_change'))
    })

    it('should always include team_id and created_by', async () => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())

      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'planifiee',
        newStatus: 'cloturee_par_prestataire',
        teamId: TEAM_ID,
        changedBy: USERS.provider.id,
      })

      mockRepo.captured.forEach(n => {
        expect(n.team_id).toBe(TEAM_ID)
        expect(n.created_by).toBe(USERS.provider.id)
      })
    })

    it('should always reference the intervention in metadata and entity link', async () => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())

      await service.notifyInterventionCreated({
        interventionId: INTERVENTION_ID,
        teamId: TEAM_ID,
        createdBy: USERS.managerPrimary.id,
      })

      mockRepo.captured.forEach(n => {
        expect(n.metadata?.intervention_id).toBe(INTERVENTION_ID)
        expect(n.related_entity_type).toBe('intervention')
        expect(n.related_entity_id).toBe(INTERVENTION_ID)
      })
    })
  })

  // ────────────────────────────────────────────────────────────
  // ROLE-ADAPTED MESSAGES — detailed content checks
  // ────────────────────────────────────────────────────────────

  describe('Role-adapted message content', () => {
    beforeEach(() => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())
    })

    it('locataire: "Votre demande...approuvée" on approval', async () => {
      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'demande',
        newStatus: 'approuvee',
        teamId: TEAM_ID,
        changedBy: USERS.managerPrimary.id,
      })

      const tenantMsg = notificationsFor(mockRepo.captured, USERS.tenant.id)[0]?.message || ''
      expect(tenantMsg).toMatch(/Votre demande.*approuvée/)
    })

    it('locataire: "rejetée + Motif" on rejection', async () => {
      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'demande',
        newStatus: 'rejetee',
        teamId: TEAM_ID,
        changedBy: USERS.managerPrimary.id,
        reason: 'Travaux à charge du locataire',
      })

      const tenantMsg = notificationsFor(mockRepo.captured, USERS.tenant.id)[0]?.message || ''
      expect(tenantMsg).toMatch(/Votre demande.*rejetée/)
      expect(tenantMsg).toContain('Travaux à charge du locataire')
    })

    it('locataire: "terminé...valider" on provider completion', async () => {
      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'planifiee',
        newStatus: 'cloturee_par_prestataire',
        teamId: TEAM_ID,
        changedBy: USERS.provider.id,
      })

      const tenantMsg = notificationsFor(mockRepo.captured, USERS.tenant.id)[0]?.message || ''
      expect(tenantMsg).toContain('terminé')
      expect(tenantMsg).toContain('valider')
    })

    it('prestataire: "en planification" on planning start', async () => {
      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'approuvee',
        newStatus: 'planification',
        teamId: TEAM_ID,
        changedBy: USERS.managerPrimary.id,
      })

      const providerMsg = notificationsFor(mockRepo.captured, USERS.provider.id)[0]?.message || ''
      expect(providerMsg).toContain('planification')
    })

    it('gestionnaire: "que vous gérez" on status changes', async () => {
      // managerSecondary is a gestionnaire in assignment map — add them
      vi.spyOn(service as any, 'getAssignedUsersWithRoles').mockResolvedValue(
        buildAssignmentMap([
          { userId: USERS.managerPrimary.id, role: 'gestionnaire' },
          { userId: USERS.managerSecondary.id, role: 'gestionnaire' },
          { userId: USERS.provider.id, role: 'prestataire' },
          { userId: USERS.tenant.id, role: 'locataire' },
        ])
      )

      await service.notifyInterventionStatusChange({
        interventionId: INTERVENTION_ID,
        oldStatus: 'planifiee',
        newStatus: 'cloturee_par_prestataire',
        teamId: TEAM_ID,
        changedBy: USERS.provider.id,
      })

      // managerPrimary should get a gestionnaire-specific message
      const managerMsg = notificationsFor(mockRepo.captured, USERS.managerPrimary.id)[0]?.message || ''
      expect(managerMsg).toContain('gérez')
    })
  })

  // ────────────────────────────────────────────────────────────
  // FULL LIFECYCLE SEQUENCE
  // ────────────────────────────────────────────────────────────

  describe('Full lifecycle notification count', () => {
    it('should generate notifications at each step with the acting user always excluded', async () => {
      vi.mocked(mockRepo.repository.getInterventionWithManagers)
        .mockResolvedValue(buildIntervention())

      const lifecycle = [
        { action: 'create', changedBy: USERS.managerPrimary.id },
        { oldStatus: 'demande', newStatus: 'approuvee', changedBy: USERS.managerPrimary.id },
        { oldStatus: 'approuvee', newStatus: 'planification', changedBy: USERS.managerPrimary.id },
        { oldStatus: 'planification', newStatus: 'planifiee', changedBy: USERS.tenant.id },
        { oldStatus: 'planifiee', newStatus: 'cloturee_par_prestataire', changedBy: USERS.provider.id },
        { oldStatus: 'cloturee_par_prestataire', newStatus: 'cloturee_par_locataire', changedBy: USERS.tenant.id },
        { oldStatus: 'cloturee_par_locataire', newStatus: 'cloturee_par_gestionnaire', changedBy: USERS.managerPrimary.id },
      ]

      for (const step of lifecycle) {
        mockRepo.captured.length = 0

        if ('action' in step && step.action === 'create') {
          await service.notifyInterventionCreated({
            interventionId: INTERVENTION_ID,
            teamId: TEAM_ID,
            createdBy: step.changedBy,
          })
        } else if ('oldStatus' in step) {
          await service.notifyInterventionStatusChange({
            interventionId: INTERVENTION_ID,
            oldStatus: step.oldStatus!,
            newStatus: step.newStatus!,
            teamId: TEAM_ID,
            changedBy: step.changedBy,
          })
        }

        // At every step: at least 1 notification created
        expect(mockRepo.captured.length).toBeGreaterThanOrEqual(1)

        // The actor is NEVER in the recipients
        const actorNotifs = notificationsFor(mockRepo.captured, step.changedBy)
        expect(actorNotifs).toHaveLength(0)
      }
    })
  })
})
