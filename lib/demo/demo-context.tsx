/**
 * Demo Context - Gestion de l'état global du mode démo
 * Inclut l'impersonation (se connecter en tant qu'utilisateur spécifique)
 */

'use client'

import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react'
import { getDemoDataStore, type DemoDataStore } from './store/demo-data-store'
import { generateDemoData } from './seed'

type UserRole = 'gestionnaire' | 'locataire' | 'prestataire' | 'admin'

export interface DemoContextValue {
  store: DemoDataStore
  currentRole: UserRole
  setCurrentRole: (role: UserRole) => void
  impersonatedUsers: Record<UserRole, string | null>
  setImpersonatedUser: (role: UserRole, userId: string | null) => void
  getCurrentUser: () => any | null
  resetData: () => void
  isFirstVisit: boolean
  markVisited: () => void
  isDataReady: boolean
}

const DemoContext = createContext<DemoContextValue | null>(null)

export interface DemoProviderProps {
  children: ReactNode
  initialRole?: UserRole
}

export function DemoProvider({ children, initialRole = 'gestionnaire' }: DemoProviderProps) {
  const [store] = useState(() => getDemoDataStore())
  const [currentRole, setCurrentRole] = useState<UserRole>(initialRole)
  const [impersonatedUsers, setImpersonatedUsersState] = useState<Record<UserRole, string | null>>({
    gestionnaire: null,
    locataire: null,
    prestataire: null,
    admin: null
  })
  const [isFirstVisit, setIsFirstVisit] = useState(true)
  const [isDataReady, setIsDataReady] = useState(false)

  // Initialiser les données démo au montage
  useEffect(() => {
    const usersCount = store.count('users')

    if (usersCount === 0) {
      console.log('🌱 Initializing demo data...')
      try {
        generateDemoData(store)
        console.log('✅ Demo data initialized and ready')
        setIsDataReady(true)
      } catch (error) {
        console.error('❌ Failed to initialize demo data:', error)
        setIsDataReady(true) // Set to true anyway to show error state
      }
    } else {
      console.log('✅ Demo data already loaded')
      setIsDataReady(true)
    }
  }, [store])

  // Charger l'état depuis localStorage au montage
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Charger les utilisateurs impersonés
    const savedImpersonation = localStorage.getItem('demo_impersonated_users')
    if (savedImpersonation) {
      try {
        const parsed = JSON.parse(savedImpersonation)
        setImpersonatedUsersState(parsed)
      } catch (error) {
        console.error('Error parsing impersonated users:', error)
      }
    }

    // Vérifier si première visite
    const visited = localStorage.getItem('seido_demo_visited')
    setIsFirstVisit(!visited)
  }, [])

  // Sauvegarder l'impersonation dans localStorage à chaque changement
  useEffect(() => {
    if (typeof window === 'undefined') return

    localStorage.setItem('demo_impersonated_users', JSON.stringify(impersonatedUsers))
  }, [impersonatedUsers])

  /**
   * Définir l'utilisateur impersoné pour un rôle donné
   */
  const setImpersonatedUser = (role: UserRole, userId: string | null) => {
    setImpersonatedUsersState(prev => ({
      ...prev,
      [role]: userId
    }))
  }

  /**
   * Obtenir l'utilisateur actuellement actif (impersoné ou par défaut)
   */
  const getCurrentUser = useMemo(() => {
    return () => {
      const userId = impersonatedUsers[currentRole]

      if (userId) {
        // Utilisateur impersoné
        return store.get('users', userId)
      }

      // Fallback : retourner le premier utilisateur du rôle actuel
      const users = store.query('users', { filters: { role: currentRole } })
      return users[0] || null
    }
  }, [store, currentRole, impersonatedUsers])

  /**
   * Réinitialiser toutes les données
   */
  const resetData = () => {
    store.reset()

    // Réinitialiser l'impersonation
    setImpersonatedUsersState({
      gestionnaire: null,
      locataire: null,
      prestataire: null,
      admin: null
    })

    // Nettoyer localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('demo_impersonated_users')
      localStorage.removeItem('seido_demo_visited')
    }

    setIsFirstVisit(true)
  }

  /**
   * Marquer la démo comme visitée
   */
  const markVisited = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('seido_demo_visited', 'true')
    }
    setIsFirstVisit(false)
  }

  const value: DemoContextValue = {
    store,
    currentRole,
    setCurrentRole,
    impersonatedUsers,
    setImpersonatedUser,
    getCurrentUser,
    resetData,
    isFirstVisit,
    markVisited,
    isDataReady
  }

  // Show loading state while data is being initialized
  if (!isDataReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Initialisation du mode démo...</p>
          <p className="text-gray-400 text-sm mt-2">Chargement des données de démonstration</p>
        </div>
      </div>
    )
  }

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  )
}

/**
 * Hook pour accéder au contexte démo
 */
export function useDemoContext(): DemoContextValue {
  const context = useContext(DemoContext)

  if (!context) {
    throw new Error('useDemoContext must be used within a DemoProvider')
  }

  return context
}

/**
 * Hook pour obtenir le store démo
 */
export function useDemoStore() {
  const { store } = useDemoContext()
  return store
}

/**
 * Hook pour obtenir/définir le rôle actuel
 */
export function useDemoRole() {
  const { currentRole, setCurrentRole } = useDemoContext()
  return [currentRole, setCurrentRole] as const
}

/**
 * Hook pour obtenir l'utilisateur actuel
 */
export function useCurrentDemoUser() {
  const { getCurrentUser } = useDemoContext()
  return getCurrentUser()
}
