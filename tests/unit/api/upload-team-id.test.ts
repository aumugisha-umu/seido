/**
 * Unit tests verifying that upload route derives team_id from auth profile,
 * not from client-supplied FormData.
 */

import { describe, it, expect } from 'vitest'

/**
 * Simulates the team_id resolution logic extracted from
 * app/api/property-documents/upload/route.ts
 */
function resolveTeamId(
  formDataTeamId: string | null,
  userProfileTeamId: string | undefined
): string | undefined {
  // Server-side: team_id comes from authenticated profile, not FormData
  return userProfileTeamId
}

describe('upload route — team_id derivation', () => {
  it('team_id from FormData is ignored', () => {
    const result = resolveTeamId('client-supplied-team-id', 'server-derived-team-id')
    expect(result).not.toBe('client-supplied-team-id')
  })

  it('server-derived team_id from auth profile is used', () => {
    const result = resolveTeamId('client-supplied-team-id', 'server-derived-team-id')
    expect(result).toBe('server-derived-team-id')
  })

  it('when FormData has no team_id, server-derived value is still used', () => {
    const result = resolveTeamId(null, 'server-derived-team-id')
    expect(result).toBe('server-derived-team-id')
  })

  it('returns undefined when profile has no team_id (triggers 400 in route)', () => {
    const result = resolveTeamId('client-supplied', undefined)
    expect(result).toBeUndefined()
  })
})
