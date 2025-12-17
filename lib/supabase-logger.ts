import { supabaseLogger, logSupabaseOperation } from './logger'
import type { SupabaseClient, ServerSupabaseClient } from './services/core/supabase-client'

// Type for auth session used in logging
interface AuthSession {
  user?: {
    id?: string
    email?: string
  }
}

// Wrapper pour les opérations Supabase avec logging automatique
export const createSupabaseLogger = (client: SupabaseClient | ServerSupabaseClient) => {
  return {
    // Log des requêtes de sélection
    async select(table: string, query?: string) {
      const startTime = Date.now()
      try {
        const { data, error } = await client.from(table).select(query)
        const duration = Date.now() - startTime
        
        if (error) {
          logSupabaseOperation('select', table, false, { error: error.message, query, duration })
          throw error
        }

        logSupabaseOperation('select', table, true, {
          rowCount: data?.length || 0,
          query,
          duration
        })

        return { data, error }
      } catch (err) {
        logSupabaseOperation('select', table, false, {
          error: err instanceof Error ? err.message : 'Unknown error',
          query,
          duration: Date.now() - startTime
        })
        throw err
      }
    },

    // Log des insertions
    async insert(table: string, values: Record<string, unknown> | Record<string, unknown>[]) {
      const startTime = Date.now()
      try {
        const { data, error } = await client.from(table).insert(values)
        const duration = Date.now() - startTime
        if (error) {
          logSupabaseOperation('insert', table, false, { error: error.message, values, duration })
          throw error
        }

        logSupabaseOperation('insert', table, true, {
          rowCount: data?.length || 0,
          values,
          duration
        })

        return { data, error }
      } catch (err) {
        logSupabaseOperation('insert', table, false, {
          error: err instanceof Error ? err.message : 'Unknown error',
          values,
          duration: Date.now() - startTime
        })
        throw err
      }
    },

    // Log des mises à jour
    async update(table: string, values: Record<string, unknown>, filter: Record<string, unknown>) {
      const startTime = Date.now()
      try {
        const { data, error } = await client.from(table).update(values).match(filter)
        const duration = Date.now() - startTime
        if (error) {
          logSupabaseOperation('update', table, false, { error: error.message, values, filter, duration })
          throw error
        }

        logSupabaseOperation('update', table, true, {
          rowCount: data?.length || 0,
          values,
          filter,
          duration
        })

        return { data, error }
      } catch (err) {
        logSupabaseOperation('update', table, false, {
          error: err instanceof Error ? err.message : 'Unknown error',
          values,
          filter,
          duration: Date.now() - startTime
        })
        throw err
      }
    },

    // Log des suppressions
    async delete(table: string, filter: Record<string, unknown>) {
      const startTime = Date.now()
      try {
        const { data, error } = await client.from(table).delete().match(filter)
        const duration = Date.now() - startTime
        if (error) {
          logSupabaseOperation('delete', table, false, { error: error.message, filter, duration })
          throw error
        }

        logSupabaseOperation('delete', table, true, {
          rowCount: data?.length || 0,
          filter,
          duration
        })

        return { data, error }
      } catch (err) {
        logSupabaseOperation('delete', table, false, {
          error: err instanceof Error ? err.message : 'Unknown error',
          filter,
          duration: Date.now() - startTime
        })
        throw err
      }
    },

    // Log des appels RPC
    async rpc(functionName: string, params?: Record<string, unknown>) {
      const startTime = Date.now()
      try {
        const { data, error } = await client.rpc(functionName, params)
        const duration = Date.now() - startTime
        if (error) {
          logSupabaseOperation('rpc', functionName, false, { error: error.message, params, duration })
          throw error
        }

        logSupabaseOperation('rpc', functionName, true, {
          resultCount: data?.length || 0,
          params,
          duration
        })

        return { data, error }
      } catch (err) {
        logSupabaseOperation('rpc', functionName, false, {
          error: err instanceof Error ? err.message : 'Unknown error',
          params,
          duration: Date.now() - startTime
        })
        throw err
      }
    }
  }
}

// Hook pour les changements d'état d'authentification
export const logAuthStateChange = (event: string, session: AuthSession | null) => {
  supabaseLogger.info({
    type: 'auth_state_change',
    event,
    userId: session?.user?.id,
    email: session?.user?.email,
    timestamp: new Date().toISOString()
  }, `🔐 Auth state change: ${event}`)
}

// Hook pour les erreurs d'authentification
export const logAuthError = (authError: Error, context?: string) => {
  logger.error({
    type: 'auth_error',
    context,
    error: {
      name: authError.name,
      message: authError.message,
      stack: authError.stack
    }
  }, `🔐 Auth error${context ? ` in ${context}` : ''}: ${authError?.message || 'Unknown error'}`)
}

export default createSupabaseLogger

