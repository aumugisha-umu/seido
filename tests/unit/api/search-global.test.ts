import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
const mockRpc = vi.fn()
const mockSupabase = { rpc: mockRpc }
const mockUserProfile = { team_id: 'test-team-id' }

vi.mock('@/lib/api-auth-helper', () => ({
  getApiAuthContext: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn() },
}))

import { GET } from '@/app/api/search/global/route'
import { getApiAuthContext } from '@/lib/api-auth-helper'

// Helper to create NextRequest
function createRequest(queryString: string): NextRequest {
  return new NextRequest(
    new URL(`http://localhost/api/search/global${queryString}`)
  )
}

describe('/api/search/global', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getApiAuthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { supabase: mockSupabase, userProfile: mockUserProfile },
    })
  })

  // 1. Validation: too short
  it('returns 400 for query shorter than 2 characters', async () => {
    const res = await GET(createRequest('?q=a'))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error).toContain('2 caracteres')
  })

  // 2. Validation: missing q param
  it('returns 400 for missing query parameter', async () => {
    const res = await GET(createRequest(''))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  // 3. Validation: too long
  it('returns 400 for query longer than 100 characters', async () => {
    const longQuery = 'a'.repeat(101)
    const res = await GET(createRequest(`?q=${longQuery}`))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
  })

  // 4. Auth: unauthorized
  it('returns auth error when not authenticated', async () => {
    const errorResponse = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    ;(getApiAuthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: errorResponse,
    })
    const res = await GET(createRequest('?q=test'))
    expect(res.status).toBe(401)
  })

  // 5. Auth: no team
  it('returns 400 when user has no team', async () => {
    ;(getApiAuthContext as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: { supabase: mockSupabase, userProfile: { team_id: null } },
    })
    const res = await GET(createRequest('?q=test'))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('Equipe introuvable')
  })

  // 6. Success: returns results
  it('returns search results on success', async () => {
    const mockResults = [
      { entity_type: 'contact', entity_id: '123', title: 'Test', subtitle: '', url: '/test', rank: 0.8 },
    ]
    mockRpc.mockResolvedValue({ data: mockResults, error: null })
    const res = await GET(createRequest('?q=test'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.results).toEqual(mockResults)
  })

  // 7. RPC passes correct params
  it('passes correct parameters to RPC', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    await GET(createRequest('?q=hello'))
    expect(mockRpc).toHaveBeenCalledWith('search_global', {
      p_query: 'hello',
      p_team_id: 'test-team-id',
    })
  })

  // 8. RPC error returns 500
  it('returns 500 when RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const res = await GET(createRequest('?q=test'))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.success).toBe(false)
    expect(body.error).toBe('Erreur de recherche')
  })

  // 9. Empty results returns empty array
  it('returns empty array when no matches', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })
    const res = await GET(createRequest('?q=zzzzzzz'))
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.results).toEqual([])
  })

  // 10. Null data returns empty array
  it('returns empty array when data is null', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    const res = await GET(createRequest('?q=test'))
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.results).toEqual([])
  })
})
