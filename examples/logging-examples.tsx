// Exemples d'utilisation du système de logging dans Seido-app
// Ce fichier contient des exemples pratiques pour différents cas d'usage

import React, { useState, useEffect } from 'react'
import {
  logger,
  authLogger,
  interventionLogger,
  logUserAction,
  logError
} from '@/lib/logger'
import {
  useComponentLogger,
  useInteractionLogger,
  usePerformanceLogger
} from '@/lib/react-logger'
import { createSupabaseLogger } from '@/lib/supabase-logger'

// ========================================
// EXEMPLE 1: Composant avec logging complet
// ========================================
const InterventionCard: React.FC<{ intervention: unknown }> = ({ intervention }) => {
  const { logAction, logError, logStateChange } = useComponentLogger('InterventionCard')
  const { logClick, logHover } = useInteractionLogger('InterventionCard')
  usePerformanceLogger('InterventionCard')

  const [status, setStatus] = useState(intervention.status)

  useEffect(() => {
    logStateChange('status', status)
  }, [status])

  const handleStatusChange = async (_newStatus: string) => {
    try {
      logAction('status_change_started', { 
        interventionId: intervention.id, 
        fromStatus: status, 
        toStatus: newStatus 
      })

      // Simulation d'un appel API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setStatus(newStatus)
      
      interventionLogger.info('Statut d\'intervention modifié', {
        interventionId: intervention.id,
        fromStatus: status,
        toStatus: newStatus,
        userId: 'current-user-id'
      })

      logAction('status_change_success', { 
        interventionId: intervention.id, 
        newStatus 
      })

    } catch (error) {
      logError(error as Error, 'status_change')
    }
  }

  return (
    <div 
      className="intervention-card"
      onMouseEnter={() => logHover('intervention-card')}
      onClick={() => logClick('intervention-card', { 
        interventionId: intervention.id,
        status: status 
      })}
    >
      <h3>{intervention.title}</h3>
      <p>Statut: {status}</p>
      <button onClick={() => handleStatusChange('en_cours')}>
        Démarrer
      </button>
    </div>
  )
}

// ========================================
// EXEMPLE 2: Hook d'authentification avec logs
// ========================================
export const useAuthWithLogging = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authLogger.info('Initialisation de l\'authentification')
    
    // Simulation de la récupération de l'utilisateur
    const initAuth = async () => {
      try {
        // Votre logique d'auth ici
        const userData = await getUserData()
        
        if (userData) {
          setUser(userData)
          logUserAction('auth_initialized', userData.id, { 
            email: userData.email,
            role: userData.role 
          })
          authLogger.info('Utilisateur authentifié', { 
            userId: userData.id,
            role: userData.role 
          })
        } else {
          authLogger.info('Aucun utilisateur authentifié')
        }
      } catch (error) {
        logError(error as Error, 'auth_initialization')
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      authLogger.info('Tentative de connexion', { email })
      
      // Simulation de l'authentification
      const result = await authenticateUser(email, _password)
      
      setUser(result.user)
      logUserAction('sign_in', result.user.id, { email })
      authLogger.info('Connexion réussie', { 
        userId: result.user.id,
        email: result.user.email 
      })
      
      return result
    } catch (error) {
      authLogger.error('Échec de connexion', { 
        email, 
        error: error.message 
      })
      throw error
    }
  }

  const signOut = async () => {
    try {
      const userId = user?.id
      await signOutUser()
      setUser(null)
      
      logUserAction('sign_out', _userId)
      authLogger.info('Déconnexion réussie', { userId })
    } catch (error) {
      logError(error as Error, 'sign_out')
    }
  }

  return { user, loading, signIn, signOut }
}

// ========================================
// EXEMPLE 3: Service Supabase avec logging
// ========================================
export class InterventionService {
  private supabaseLogger: unknown

  constructor(_supabaseClient: unknown) {
    this.supabaseLogger = createSupabaseLogger(supabaseClient)
  }

  async createIntervention(_data: unknown) {
    try {
      interventionLogger.info('Création d\'intervention', { 
        type: data.type,
        urgency: data.urgency,
        userId: data.userId 
      })

      const result = await this.supabaseLogger.insert('interventions', data)
      
      interventionLogger.info('Intervention créée avec succès', {
        interventionId: result.data[0]?.id,
        type: data.type,
        urgency: data.urgency
      })

      return result
    } catch (error) {
      interventionLogger.error('Échec de création d\'intervention', {
        error: error.message,
        data: { type: data.type, urgency: data.urgency }
      })
      throw error
    }
  }

  async getInterventions(filters: unknown = {}) {
    try {
      interventionLogger.info('Récupération des interventions', { filters })
      
      const result = await this.supabaseLogger.select('interventions', '*', filters)
      
      interventionLogger.info('Interventions récupérées', {
        count: result.data?.length || 0,
        filters
      })

      return result
    } catch (error) {
      interventionLogger.error('Échec de récupération des interventions', {
        error: error.message,
        filters
      })
      throw error
    }
  }

  async updateIntervention(id: string, updates: unknown) {
    try {
      interventionLogger.info('Mise à jour d\'intervention', { 
        interventionId: id,
        updates: Object.keys(updates)
      })

      const result = await this.supabaseLogger.update('interventions', updates, { id })
      
      interventionLogger.info('Intervention mise à jour', {
        interventionId: id,
        updatedFields: Object.keys(updates)
      })

      return result
    } catch (error) {
      interventionLogger.error('Échec de mise à jour d\'intervention', {
        interventionId: id,
        error: error.message,
        updates: Object.keys(updates)
      })
      throw error
    }
  }
}

// ========================================
// EXEMPLE 4: Dashboard avec monitoring
// ========================================
const Dashboard: React.FC = () => {
  const { logAction, logError } = useComponentLogger('Dashboard')
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        logAction('dashboard_load_started')
        
        const startTime = performance.now()
        
        // Simulation du chargement des données
        const _data = await loadDashboardStats()
        
        const loadTime = performance.now() - startTime
        
        setStats(data)
        
        logger.info('Dashboard chargé', {
          loadTime: Math.round(loadTime),
          statsCount: Object.keys(data).length
        })
        
        logAction('dashboard_load_success', { 
          loadTime: Math.round(loadTime),
          statsCount: Object.keys(data).length 
        })
        
      } catch (error) {
        logError(error as Error, 'dashboard_load')
      }
    }

    loadDashboardData()
  }, [])

  const handleRefresh = async () => {
    try {
      logAction('dashboard_refresh_started')
      
      const data = await loadDashboardStats()
      setStats(data)
      
      logAction('dashboard_refresh_success')
      
    } catch (error) {
      logError(error as Error, 'dashboard_refresh')
    }
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={handleRefresh}>Actualiser</button>
      {stats && (
        <div>
          {/* Affichage des statistiques */}
        </div>
      )}
    </div>
  )
}

// ========================================
// EXEMPLE 5: Gestion d'erreurs globale
// ========================================
export const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logError(new Error(event.message), 'global_error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      })
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError(new Error(event.reason), 'unhandled_promise_rejection', {
        reason: event.reason
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  if (hasError) {
    return <div>Une erreur s'est produite. Vérifiez les logs.</div>
  }

  return <>{children}</>
}

// ========================================
// EXEMPLE 6: Tests avec logging
// ========================================
export const testWithLogging = () => {
  // Dans vos tests, vous pouvez utiliser le testLogger
  const { testLogger } = require('@/lib/logger')
  
  testLogger.info('Test démarré', { testName: 'intervention-creation' })
  
  // Votre logique de test
  
  testLogger.info('Test terminé', { 
    testName: 'intervention-creation',
    result: 'success' 
  })
}

// ========================================
// FONCTIONS UTILITAIRES (simulation)
// ========================================
const getUserData = async () => {
  // Simulation
  return { id: '123', email: 'test@example.com', role: 'gestionnaire' }
}

const authenticateUser = async (email: string, password: string) => {
  // Simulation
  return { user: { id: '123', email } }
}

const signOutUser = async () => {
  // Simulation
}

const loadDashboardStats = async () => {
  // Simulation
  return { interventions: 10, completed: 5, pending: 3 }
}

export default {
  InterventionCard,
  useAuthWithLogging,
  InterventionService,
  Dashboard,
  ErrorBoundary,
  testWithLogging
}



