/**
 * Integration tests: Intervention creation
 *
 * Tests direct DB operations for creating interventions.
 * Uses service-role client (bypasses RLS) to verify:
 * - Gestionnaire can create with all fields
 * - Locataire-style request creates with status 'demande'
 * - Invalid inputs are rejected
 */

import { describe, it, expect, afterAll } from 'vitest'
import {
  createTestIntervention,
  getTestTeamId,
  getTestLotId,
  getTestBuildingId,
  getTestUserId,
  getTestIntervention,
  cleanupTestInterventions,
} from './helpers/test-data'

let teamId: string
let lotId: string
let gestUserId: string

describe('intervention creation', () => {
  // Fetch shared test data once
  beforeAll(async () => {
    teamId = await getTestTeamId()
    lotId = await getTestLotId(teamId)
    gestUserId = await getTestUserId('arthur@seido-app.com')
  })

  afterAll(async () => {
    await cleanupTestInterventions()
  })

  it('creates intervention with all required fields', async () => {
    const intervention = await createTestIntervention({
      teamId,
      lotId,
      createdBy: gestUserId,
      title: 'Integration: full fields',
      description: 'Test intervention with all required fields populated',
      type: 'plomberie',
      urgency: 'haute',
    })

    expect(intervention).toBeDefined()
    expect(intervention.id).toBeTruthy()
    expect(intervention.title).toBe('Integration: full fields')
    expect(intervention.team_id).toBe(teamId)
    expect(intervention.lot_id).toBe(lotId)
    expect(intervention.type).toBe('plomberie')
    expect(intervention.urgency).toBe('haute')
    expect(intervention.status).toBe('demande')
  })

  it('creates intervention with minimal fields (defaults applied)', async () => {
    const intervention = await createTestIntervention({
      teamId,
      lotId, // lot_id required by valid_intervention_location CHECK constraint
      title: 'Integration: minimal',
    })

    expect(intervention).toBeDefined()
    expect(intervention.status).toBe('demande')
    expect(intervention.urgency).toBe('normale')
    expect(intervention.type).toBe('plomberie')
    expect(intervention.lot_id).toBe(lotId)
  })

  it('locataire request creates with status "demande"', async () => {
    const locataireUserId = await getTestUserId('demo+noelle.montagne@seido-app.com').catch(() => null)

    const intervention = await createTestIntervention({
      teamId,
      lotId,
      createdBy: locataireUserId || undefined,
      status: 'demande',
      title: 'Locataire: fuite robinet',
      description: 'Le robinet de la cuisine fuit depuis hier matin',
    })

    expect(intervention.status).toBe('demande')
    expect(intervention.title).toBe('Locataire: fuite robinet')
  })

  it('intervention is retrievable after creation', async () => {
    const created = await createTestIntervention({
      teamId,
      lotId,
      title: 'Integration: retrieve test',
    })

    const retrieved = await getTestIntervention(created.id)
    expect(retrieved.id).toBe(created.id)
    expect(retrieved.title).toBe('Integration: retrieve test')
    expect(retrieved.reference).toBeTruthy()
    expect(retrieved.reference).toMatch(/^TEST-/)
  })

  it('generates unique references for each intervention', async () => {
    const int1 = await createTestIntervention({ teamId, lotId, title: 'Ref test 1' })
    const int2 = await createTestIntervention({ teamId, lotId, title: 'Ref test 2' })

    expect(int1.reference).not.toBe(int2.reference)
  })

  it('associates intervention with lot when lot_id provided', async () => {
    const intervention = await createTestIntervention({
      teamId,
      lotId,
      title: 'Integration: lot association',
    })

    expect(intervention.lot_id).toBe(lotId)
  })

  it('allows both lot_id and building_id to be NULL (AI phone calls)', async () => {
    // Since migration 20260309120000, both NULL is allowed for AI phone interventions
    const intervention = await createTestIntervention({
      teamId,
      title: 'Integration: no location',
    })
    expect(intervention.lot_id).toBeNull()
    expect(intervention.building_id).toBeNull()
  })

  it('rejects both lot_id and building_id set (valid_intervention_location CHECK)', async () => {
    // The constraint prevents BOTH being set simultaneously
    await expect(
      createTestIntervention({
        teamId,
        lotId,
        buildingId: await getTestBuildingId(teamId),
        title: 'Integration: both locations',
      })
    ).rejects.toThrow('valid_intervention_location')
  })
})
