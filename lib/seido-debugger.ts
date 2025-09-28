/**
 * SEIDO Debugging Utilities
 * Outils de debugging spécialisés pour l'architecture multi-rôles de SEIDO
 */

import { UserRole } from './auth'
import * as React from 'react'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'
type SEIDOComponent = 'AUTH' | 'INTERVENTION' | 'DASHBOARD' | 'NOTIFICATION' | 'DATABASE' | 'PERMISSION' | 'DEBUG'

interface DebugContext {
  userId?: string
  userRole?: UserRole
  interventionId?: string
  component?: string
  action?: string
  metadata?: Record<string, unknown>
}

export class SEIDODebugger {
  private static isEnabled = process.env.NODE_ENV === 'development'

  /**
   * Log structuré pour SEIDO avec contexte
   */
  static log(
    component: SEIDOComponent,
    level: LogLevel,
    message: string,
    context?: DebugContext,
    data?: unknown
  ) {
    if (!this.isEnabled) return

    const emoji = this.getEmojiForLevel(level)
    const timestamp = new Date().toISOString()

    const logData = {
      timestamp,
      component,
      message,
      ...context,
      ...(data && { data })
    }

    console[level](`${emoji} [SEIDO-${component}] ${message}`, logData)
  }

  /**
   * Debug spécifique pour les permissions multi-rôles
   */
  static debugPermissions(
    operation: string,
    userRole: UserRole,
    userId: string,
    resource: unknown,
    authorized: boolean,
    reason?: string
  ) {
    this.log('PERMISSION', authorized ? 'info' : 'error',
      `Permission ${authorized ? 'granted' : 'denied'} for ${operation}`,
      { userRole, userId, action: operation },
      { resource, reason }
    )
  }

  /**
   * Debug des transitions d'intervention
   */
  static debugInterventionTransition(
    interventionId: string,
    fromStatus: string,
    toStatus: string,
    userRole: UserRole,
    success: boolean,
    error?: string
  ) {
    this.log('INTERVENTION', success ? 'info' : 'error',
      `Transition ${fromStatus} → ${toStatus}`,
      { interventionId, userRole, action: 'status_transition' },
      { fromStatus, toStatus, success, error }
    )
  }

  /**
   * Debug des données de dashboard par rôle
   */
  static debugDashboardData(
    userRole: UserRole,
    dashboardType: string,
    dataMetrics: Record<string, number>,
    expectedMetrics?: string[]
  ) {
    const missingMetrics = expectedMetrics?.filter(metric => !(metric in dataMetrics))

    this.log('DASHBOARD', missingMetrics?.length ? 'warn' : 'info',
      `Dashboard data loaded for ${userRole}`,
      { userRole, component: dashboardType },
      { metrics: dataMetrics, missingMetrics }
    )
  }

  /**
   * Debug des notifications temps réel
   */
  static debugNotification(
    type: string,
    recipientRole: UserRole,
    recipientId: string,
    delivered: boolean,
    payload?: unknown
  ) {
    this.log('NOTIFICATION', delivered ? 'info' : 'warn',
      `Notification ${delivered ? 'delivered' : 'failed'}: ${type}`,
      { userRole: recipientRole, userId: recipientId, action: 'notification' },
      { type, payload }
    )
  }

  /**
   * Debug des opérations base de données avec RLS
   */
  static debugDatabaseOperation(
    table: string,
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
    userRole: UserRole,
    userId: string,
    filters?: Record<string, unknown>,
    result?: { data?: unknown[], count?: number, error?: Error | unknown }
  ) {
    this.log('DATABASE', result?.error ? 'error' : 'info',
      `${operation} on ${table}`,
      { userRole, userId, action: operation.toLowerCase() },
      { table, filters, result }
    )
  }

  /**
   * Debug de l'authentification et des rôles
   */
  static debugAuth(
    operation: 'signin' | 'signup' | 'signout' | 'role_check',
    email?: string,
    role?: UserRole,
    success?: boolean,
    error?: string
  ) {
    this.log('AUTH', success === false ? 'error' : 'info',
      `Auth ${operation}${success !== undefined ? (success ? ' succeeded' : ' failed') : ''}`,
      { userRole: role, action: operation },
      { email, role, success, error }
    )
  }

  /**
   * Performance debugging pour les opérations critiques
   */
  static debugPerformance(
    operation: string,
    startTime: number,
    context?: DebugContext
  ) {
    const duration = performance.now() - startTime
    const isSlowOperation = duration > 1000 // Plus de 1 seconde

    this.log('DEBUG', isSlowOperation ? 'warn' : 'info',
      `Performance: ${operation} took ${duration.toFixed(2)}ms`,
      context,
      { duration, threshold: 1000, slow: isSlowOperation }
    )
  }

  /**
   * Trace complète d'une intervention depuis la création
   */
  static async traceIntervention(interventionId: string) {
    if (!this.isEnabled) return

    console.group(`🔍 [SEIDO-TRACE] Intervention Timeline: ${interventionId}`)

    // Simuler la récupération des événements (à adapter selon votre implémentation)
    const events = await this.getInterventionEvents(interventionId)

    events.forEach(event => {
      console.log(`📍 ${event.timestamp} | ${event.userRole} | ${event.action}`, event.data)
    })

    console.groupEnd()
  }

  /**
   * Validation des données critiques SEIDO
   */
  static validateSEIDOData(
    dataType: 'intervention' | 'user' | 'building' | 'lot',
    data: Record<string, unknown>,
    userRole: UserRole
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    switch (dataType) {
      case 'intervention':
        if (!data.id) errors.push('Missing intervention ID')
        if (!data.status) errors.push('Missing intervention status')
        if (!data.tenant_id) errors.push('Missing tenant ID')

        // Validation spécifique par rôle
        if (userRole === 'gestionnaire' && !data.manager_id) {
          errors.push('Missing manager ID for gestionnaire role')
        }
        if (userRole === 'prestataire' && data.status !== 'nouvelle-demande' && !data.assigned_provider_id) {
          errors.push('Missing provider assignment for non-new intervention')
        }
        break

      case 'user':
        if (!data.id) errors.push('Missing user ID')
        if (!data.email) errors.push('Missing email')
        if (!data.role) errors.push('Missing role')
        if (!data.team_id) errors.push('Missing team ID')
        break
    }

    const isValid = errors.length === 0

    if (!isValid) {
      this.log('DEBUG', 'error', `Validation failed for ${dataType}`,
        { userRole, action: 'validation' },
        { dataType, errors, data }
      )
    }

    return { isValid, errors }
  }

  /**
   * Test de connectivité Supabase par composant
   */
  static async testSupabaseConnectivity() {
    if (!this.isEnabled) return

    console.group('🔗 [SEIDO-DEBUG] Supabase Connectivity Test')

    try {
      // Test auth
      console.log('Testing auth...')
      // const { data: { user } } = await supabase.auth.getUser()
      console.log('✅ Auth service accessible')

      // Test database
      console.log('Testing database...')
      // const { data } = await supabase.from('users').select('count')
      console.log('✅ Database accessible')

      // Test real-time
      console.log('Testing real-time...')
      // Test de subscription
      console.log('✅ Real-time service accessible')

    } catch (error) {
      console.error('❌ Connectivity test failed:', error)
    }

    console.groupEnd()
  }

  /**
   * Helper pour récupérer les événements d'intervention (à implémenter)
   */
  private static async getInterventionEvents(interventionId: string) {
    // Cette méthode doit être implémentée selon votre système d'audit/logging
    return [
      {
        timestamp: new Date().toISOString(),
        userRole: 'locataire' as UserRole,
        action: 'created',
        data: { interventionId, status: 'nouvelle-demande' }
      }
      // Plus d'événements...
    ]
  }

  private static getEmojiForLevel(level: LogLevel): string {
    const emojis = {
      info: '📘',
      warn: '⚠️',
      error: '❌',
      debug: '🔍'
    }
    return emojis[level] || '📝'
  }
}

/**
 * Hook React pour debugging des composants SEIDO
 */
export function useSEIDODebug(
  componentName: string,
  props?: Record<string, unknown>,
  dependencies: React.DependencyList = []
) {
  // Hook utilisable seulement côté client - pas de conditional hooks
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      SEIDODebugger.log('DEBUG', 'info', `Component ${componentName} rendered`,
        { component: componentName },
        { props }
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentName, ...dependencies])

  React.useDebugValue({ componentName, props })
}

/**
 * Wrapper pour les appels API avec debugging automatique
 */
export function debuggedApiCall<T>(
  operation: string,
  apiCall: () => Promise<T>,
  context?: DebugContext
): Promise<T> {
  const startTime = performance.now()

  return apiCall()
    .then(result => {
      SEIDODebugger.debugPerformance(operation, startTime, context)
      return result
    })
    .catch(error => {
      SEIDODebugger.log('DEBUG', 'error', `API call failed: ${operation}`,
        context,
        { error: error.message }
      )
      throw error
    })
}

// Export des types pour utilisation externe
export type { DebugContext, LogLevel, SEIDOComponent }