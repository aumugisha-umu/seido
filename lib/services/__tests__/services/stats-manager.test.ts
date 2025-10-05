/**
 * Stats Service - Manager Stats Tests
 * Tests for getManagerStats() method with intervention fetching
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StatsService } from '../../domain/stats.service'
import { StatsRepository } from '../../repositories/stats.repository'
import { UserService } from '../../domain/user.service'
import { InterventionRepository } from '../../repositories/intervention.repository'
import { UserTestDataFactory, BuildingTestDataFactory, InterventionTestDataFactory } from '../helpers/test-data'

describe('StatsService - getManagerStats()', () => {
  let statsService: StatsService
  let mockStatsRepository: StatsRepository
  let mockUserService: UserService
  let mockInterventionRepository: InterventionRepository

  const mockUser = UserTestDataFactory.create({
    id: 'user-123',
    team_id: 'team-456',
    role: 'gestionnaire'
  })

  const mockBuilding = BuildingTestDataFactory.create({
    id: 'building-1',
    team_id: 'team-456',
    name: 'Test Building'
  })

  const mockInterventions = [
    InterventionTestDataFactory.create({
      id: 'intervention-1',
      status: 'demande',
      building: mockBuilding,
      created_at: new Date('2025-01-01').toISOString()
    }),
    InterventionTestDataFactory.create({
      id: 'intervention-2',
      status: 'demande_de_devis',
      building: mockBuilding,
      created_at: new Date('2025-01-02').toISOString()
    }),
    InterventionTestDataFactory.create({
      id: 'intervention-3',
      status: 'terminee', // Should be filtered out
      building: mockBuilding,
      created_at: new Date('2025-01-03').toISOString()
    }),
    InterventionTestDataFactory.create({
      id: 'intervention-4',
      status: 'en_cours',
      building: { ...mockBuilding, team_id: 'other-team' }, // Different team, should be filtered out
      created_at: new Date('2025-01-04').toISOString()
    })
  ]

  beforeEach(() => {
    // Mock repositories and services
    mockStatsRepository = {
      getTeamStats: vi.fn().mockResolvedValue({
        success: true,
        data: {
          buildingCount: 5,
          lotCount: 20,
          occupiedLots: 15,
          occupancyRate: 75,
          contactCount: 10,
          interventionCount: 8
        }
      })
    } as any

    mockUserService = {
      getById: vi.fn().mockResolvedValue({
        success: true,
        data: mockUser
      })
    } as any

    mockInterventionRepository = {
      findAllWithRelations: vi.fn().mockResolvedValue({
        success: true,
        data: mockInterventions
      })
    } as any

    statsService = new StatsService(mockStatsRepository, mockUserService, mockInterventionRepository)
  })

  it('should return manager stats with recent interventions', async () => {
    const result = await statsService.getManagerStats('user-123')

    expect(result).toBeDefined()
    expect(result.stats).toMatchObject({
      buildingsCount: 5,
      lotsCount: 20,
      occupiedLotsCount: 15,
      occupancyRate: 75,
      contactsCount: 10,
      interventionsCount: 8
    })

    // Should have recentInterventions array
    expect(result.recentInterventions).toBeDefined()
    expect(Array.isArray(result.recentInterventions)).toBe(true)
  })

  it('should filter interventions by team and status', async () => {
    const result = await statsService.getManagerStats('user-123')

    // Should only include interventions from the same team and with pending statuses
    expect(result.recentInterventions).toHaveLength(2)

    const interventionIds = result.recentInterventions.map((i: any) => i.id)
    expect(interventionIds).toContain('intervention-1') // demande, same team
    expect(interventionIds).toContain('intervention-2') // demande_de_devis, same team
    expect(interventionIds).not.toContain('intervention-3') // terminee (filtered out)
    expect(interventionIds).not.toContain('intervention-4') // different team (filtered out)
  })

  it('should sort interventions by created_at descending', async () => {
    const result = await statsService.getManagerStats('user-123')

    // First intervention should be the most recent (intervention-2)
    expect(result.recentInterventions[0].id).toBe('intervention-2')
    expect(result.recentInterventions[1].id).toBe('intervention-1')
  })

  it('should limit interventions to 10 most recent', async () => {
    // Create 15 interventions
    const manyInterventions = Array.from({ length: 15 }, (_, i) =>
      InterventionTestDataFactory.create({
        id: `intervention-${i}`,
        status: 'demande',
        building: mockBuilding,
        created_at: new Date(`2025-01-${String(i + 1).padStart(2, '0')}`).toISOString()
      })
    )

    mockInterventionRepository.findAllWithRelations = vi.fn().mockResolvedValue({
      success: true,
      data: manyInterventions
    })

    const result = await statsService.getManagerStats('user-123')

    // Should limit to 10
    expect(result.recentInterventions).toHaveLength(10)
  })

  it('should return empty stats when user has no team', async () => {
    mockUserService.getById = vi.fn().mockResolvedValue({
      success: true,
      data: { ...mockUser, team_id: null }
    })

    const result = await statsService.getManagerStats('user-123')

    expect(result.stats).toMatchObject({
      buildingsCount: 0,
      lotsCount: 0,
      occupiedLotsCount: 0,
      occupancyRate: 0,
      contactsCount: 0,
      interventionsCount: 0
    })
    expect(result.recentInterventions).toEqual([])
  })

  it('should handle intervention fetch errors gracefully', async () => {
    mockInterventionRepository.findAllWithRelations = vi.fn().mockRejectedValue(
      new Error('Database connection failed')
    )

    const result = await statsService.getManagerStats('user-123')

    // Should still return stats, but with empty interventions array
    expect(result.stats).toBeDefined()
    expect(result.recentInterventions).toEqual([])
  })

  it('should handle missing intervention repository', async () => {
    // Create service without intervention repository
    const serviceWithoutIntervention = new StatsService(
      mockStatsRepository,
      mockUserService,
      undefined // No intervention repository
    )

    const result = await serviceWithoutIntervention.getManagerStats('user-123')

    // Should return stats with empty interventions
    expect(result.stats).toBeDefined()
    expect(result.recentInterventions).toEqual([])
  })
})
