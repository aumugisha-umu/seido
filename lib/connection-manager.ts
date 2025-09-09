"use client"

import React from 'react'
import { supabase } from './supabase'

/**
 * Gestionnaire de connexion pour Supabase
 * Surveille l'état de la connexion et gère les reconnexions automatiques
 */
class ConnectionManager {
  private isOnline: boolean = true
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectInterval: number = 2000
  private healthCheckInterval: NodeJS.Timeout | null = null
  private listeners: Set<(isOnline: boolean) => void> = new Set()
  private lastActivity: number = Date.now()
  private isNavigating: boolean = false
  private updateActivity = () => {
    this.lastActivity = Date.now()
  }
  private handleBeforeUnload = () => {
    this.isNavigating = true
  }

  constructor() {
    this.initializeConnectionMonitoring()
  }

  private initializeConnectionMonitoring() {
    // Écouter les événements de connectivité du navigateur
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this))
      window.addEventListener('offline', this.handleOffline.bind(this))
      
      // Surveiller l'état de la session Supabase
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔐 Auth state changed:', event, !!session)
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          this.handleConnectionRestored()
        }
      })

      // Écouter les événements de navigation pour éviter les health checks inutiles
      window.addEventListener('beforeunload', this.handleBeforeUnload)
      
      // Détecter l'activité utilisateur
      window.addEventListener('click', this.updateActivity)
      window.addEventListener('keydown', this.updateActivity)
      window.addEventListener('scroll', this.updateActivity)

      // Démarrer le health check périodique
      this.startHealthCheck()
    }
  }

  private handleOnline() {
    console.log('🌐 Browser went online')
    this.handleConnectionRestored()
  }

  private handleOffline() {
    console.log('🌐 Browser went offline')
    this.isOnline = false
    this.notifyListeners()
  }

  private handleConnectionRestored() {
    if (!this.isOnline) {
      console.log('✅ Connection restored')
      this.isOnline = true
      this.reconnectAttempts = 0
      this.notifyListeners()
    }
  }

  private startHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    // Vérifier la connexion toutes les 2 minutes pour éviter la surcharge
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, 120000)
  }

  private async performHealthCheck() {
    // Skip health check si on navigue ou si l'utilisateur est actif récemment
    const timeSinceActivity = Date.now() - this.lastActivity
    if (this.isNavigating || timeSinceActivity < 60000) { // 1 minute
      console.log('🔄 Skipping health check - user is active or navigating')
      return
    }

    try {
      // Utiliser une vérification simple de l'état de l'authentification
      // qui ne nécessite pas d'accès à des tables spécifiques
      const { data, error } = await supabase.auth.getSession()

      if (error && !this.isOnline) {
        console.log('❌ Health check failed:', error.message)
        this.attemptReconnection()
      } else if (!error && !this.isOnline) {
        console.log('✅ Health check passed - connection restored')
        this.handleConnectionRestored()
      }
    } catch (error) {
      console.log('❌ Health check exception:', error)
      if (this.isOnline) {
        this.isOnline = false
        this.notifyListeners()
        this.attemptReconnection()
      }
    }
  }

  private async attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)

    // Attendre avant de tenter la reconnexion
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1)
    await new Promise(resolve => setTimeout(resolve, delay))

    try {
      // Forcer le refresh du token d'authentification
      const { error } = await supabase.auth.refreshSession()
      
      if (!error) {
        console.log('✅ Session refreshed successfully')
        this.handleConnectionRestored()
      } else {
        console.log('❌ Session refresh failed:', error.message)
        // Programmer une nouvelle tentative
        setTimeout(() => this.attemptReconnection(), 5000)
      }
    } catch (error) {
      console.log('❌ Reconnection attempt failed:', error)
      // Programmer une nouvelle tentative
      setTimeout(() => this.attemptReconnection(), 5000)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.isOnline)
      } catch (error) {
        console.error('❌ Error in connection listener:', error)
      }
    })
  }

  // API publique
  public isConnected(): boolean {
    return this.isOnline
  }

  public onConnectionChange(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener)
    // Retourner une fonction pour désabonner
    return () => this.listeners.delete(listener)
  }

  public forceReconnection() {
    console.log('🔄 Forcing reconnection...')
    this.reconnectAttempts = 0
    this.attemptReconnection()
  }

  public destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this))
      window.removeEventListener('offline', this.handleOffline.bind(this))
      window.removeEventListener('beforeunload', this.handleBeforeUnload)
      
      // Nettoyer les événements d'activité utilisateur
      window.removeEventListener('click', this.updateActivity)
      window.removeEventListener('keydown', this.updateActivity)
      window.removeEventListener('scroll', this.updateActivity)
    }
    
    this.listeners.clear()
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager()

// Hook pour utiliser le gestionnaire de connexion dans les composants React
export function useConnectionStatus() {
  const [isOnline, setIsOnline] = React.useState(connectionManager.isConnected())

  React.useEffect(() => {
    const unsubscribe = connectionManager.onConnectionChange(setIsOnline)
    return unsubscribe
  }, [])

  return {
    isOnline,
    forceReconnection: () => connectionManager.forceReconnection()
  }
}
