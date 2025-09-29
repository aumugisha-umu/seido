import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { createBrowserUserService, createBrowserBuildingService, createBrowserLotService, createBrowserInterventionService } from '@/lib/services'
import type { User, Building, Lot, Intervention } from '@/lib/services/core/service-types'

// Create service instances
const userService = createBrowserUserService()
const _buildingService = createBrowserBuildingService()
const lotService = createBrowserLotService()
const interventionService = createBrowserInterventionService()

// Hook for user data
export function useUser(userId?: string) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!_userId) {
      setLoading(false)
      return
    }

    async function fetchUser() {
      try {
        setLoading(true)
        const userData = await userService.getById(_userId)
        setUser(userData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching user')
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [userId])

  return { user, loading, error, refetch: () => fetchUser() }
}

// Hook for users by role
export function useUsersByRole(role?: User['role']) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!role) {
      setLoading(false)
      return
    }

    async function fetchUsers() {
      try {
        setLoading(true)
        const userData = await userService.getByRole(role)
        setUsers(userData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching users')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [role])

  return { users, loading, error }
}

// Hook for buildings
export function useBuildings() {
  const [buildings, setBuildings] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBuildings() {
      try {
        setLoading(true)
        const buildingData = await buildingService.getAll()
        setBuildings(buildingData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching buildings')
      } finally {
        setLoading(false)
      }
    }

    fetchBuildings()
  }, [])

  const refetch = async () => {
    try {
      setLoading(true)
      const buildingData = await buildingService.getAll()
      setBuildings(buildingData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching buildings')
    } finally {
      setLoading(false)
    }
  }

  return { buildings, loading, error, refetch }
}

// Hook for interventions
export function useInterventions(filters?: {
  status?: Intervention['status']
  tenantId?: string
  providerId?: string
}) {
  const [interventions, setInterventions] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchInterventions() {
      try {
        setLoading(true)
        let data

        if (filters?.status) {
          data = await interventionService.getByStatus(filters.status)
        } else if (filters?._tenantId) {
          data = await interventionService.getByTenantId(filters._tenantId)
        } else if (filters?.providerId) {
          data = await interventionService.getByProviderId(filters.providerId)
        } else {
          data = await interventionService.getAll()
        }

        setInterventions(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching interventions')
      } finally {
        setLoading(false)
      }
    }

    fetchInterventions()
  }, [filters?.status, filters?._tenantId, filters?.providerId])

  const refetch = async () => {
    try {
      setLoading(true)
      let data

      if (filters?.status) {
        data = await interventionService.getByStatus(filters.status)
      } else if (filters?._tenantId) {
        data = await interventionService.getByTenantId(filters._tenantId)
      } else if (filters?.providerId) {
        data = await interventionService.getByProviderId(filters.providerId)
      } else {
        data = await interventionService.getAll()
      }

      setInterventions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching interventions')
    } finally {
      setLoading(false)
    }
  }

  return { interventions, loading, error, refetch }
}

// Hook for lots by building
export function useLotsByBuilding(buildingId?: string) {
  const [lots, setLots] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!_buildingId) {
      setLoading(false)
      return
    }

    async function fetchLots() {
      try {
        setLoading(true)
        const lotData = await lotService.getByBuildingId(_buildingId)
        setLots(lotData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching lots')
      } finally {
        setLoading(false)
      }
    }

    fetchLots()
  }, [buildingId])

  return { lots, loading, error }
}

// Hook for real-time subscriptions
export function useRealtimeSubscription<T>(
  table: string,
  callback: (_payload: unknown) => void
) {
  useEffect(() => {
    const subscription = supabase
      .channel(`public:${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        callback
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [table, callback])
}


