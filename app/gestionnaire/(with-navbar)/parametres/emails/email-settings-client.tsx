'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BlacklistManager } from '../../mail/components/blacklist-manager'
import type { BlacklistEntry } from '../../mail/components/types'
import { EmailConnectionForm } from './components/email-connection-form'
import { EmailConnectionList } from './components/email-connection-list'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Plus, ArrowLeft, Mail, Ban } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface EmailConnection {
  id: string
  provider: string
  email_address: string
  is_active: boolean
  last_sync_at: string | null
  last_error: string | null
  sync_from_date: string | null
  created_at: string
  auth_method?: 'password' | 'oauth'
  oauth_token_expires_at?: string | null
  email_count?: number
}

interface EmailSettingsClientProps {
  initialConnections: EmailConnection[]
  initialBlacklist: BlacklistEntry[]
}

export function EmailSettingsClient({ initialConnections, initialBlacklist }: EmailSettingsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>(initialBlacklist)
  const [connections, setConnections] = useState<EmailConnection[]>(initialConnections)
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Fonction pour lancer la synchronisation automatique
  const triggerAutoSync = async (connectionId: string) => {
    toast.promise(
      fetch(`/api/emails/connections/${connectionId}/sync`, {
        method: 'POST',
      }).then(async (response) => {
        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Sync failed')
        }
        const data = await response.json()
        // Rafraichir la liste pour voir le nombre d'emails
        fetchConnections()
        return data.result?.count || 0
      }),
      {
        loading: 'Synchronisation des emails en cours...',
        success: (count) => `${count} emails synchronises`,
        error: (err) => err.message || 'Echec de la synchronisation',
      }
    )
  }

  // Gestion des parametres OAuth de retour
  useEffect(() => {
    const oauth = searchParams.get('oauth')
    const message = searchParams.get('message')
    const updated = searchParams.get('updated')
    const connectionId = searchParams.get('connectionId')

    if (oauth === 'success') {
      if (updated === 'true') {
        toast.success('Compte Gmail mis a jour avec OAuth')
      } else {
        toast.success('Compte Gmail connecte avec succes')
      }

      // Lancer la synchronisation automatique si connectionId present
      if (connectionId) {
        setTimeout(() => {
          triggerAutoSync(connectionId)
        }, 500)
      }

      // Nettoyer l'URL
      router.replace('/gestionnaire/parametres/emails', { scroll: false })
    } else if (oauth === 'error') {
      const errorMessages: Record<string, string> = {
        missing_parameters: 'Parametres manquants dans la reponse Google',
        invalid_state: 'Session expiree, veuillez reessayer',
        not_authenticated: 'Vous devez etre connecte pour lier un compte Gmail',
        team_mismatch: 'Erreur d\'equipe, veuillez reessayer',
        no_email: 'Impossible de recuperer l\'email du compte Google',
        update_failed: 'Echec de la mise a jour de la connexion',
        insert_failed: 'Echec de la creation de la connexion',
      }
      toast.error(errorMessages[message || ''] || `Erreur OAuth: ${message}`)
      router.replace('/gestionnaire/parametres/emails', { scroll: false })
    }
  }, [searchParams, router]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/emails/connections')
      if (!response.ok) {
        throw new Error('Failed to fetch connections')
      }
      const data = await response.json()
      setConnections(data.connections || [])
    } catch (error) {
      console.error('Failed to fetch connections:', error)
    }
  }

  const fetchBlacklist = useCallback(async () => {
    try {
      const response = await fetch('/api/emails/blacklist')
      if (!response.ok) throw new Error('Failed to fetch blacklist')
      const data = await response.json()
      setBlacklist(data.entries || [])
    } catch (error) {
      console.error('Failed to fetch blacklist:', error)
    }
  }, [])

  const handleUnblock = useCallback(async (blacklistId: string) => {
    // Optimistic removal
    const previous = blacklist
    setBlacklist(prev => prev.filter(entry => entry.id !== blacklistId))
    try {
      const response = await fetch('/api/emails/blacklist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blacklistId })
      })
      if (!response.ok) throw new Error('Unblock failed')
      toast.success('Expediteur debloque')
    } catch (error) {
      setBlacklist(previous)
      toast.error('Echec du deblocage')
    }
  }, [blacklist])

  const handleAddManual = () => {
    toast.info('Fonctionnalite a venir : ajout manuel d\'un expediteur bloque')
  }

  const handleConnectionAdded = () => {
    setShowAddDialog(false)
    fetchConnections()
  }

  const handleConnectionDeleted = () => {
    fetchConnections()
  }

  return (
    <div className="layout-padding">
      <div className="max-w-4xl mx-auto">
        {/* Header avec bouton retour */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/gestionnaire/parametres')} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Parametres Email</h1>
        </div>

        <div className="space-y-6">
          {/* Email Connections Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Connexions Email
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    Connectez vos comptes email pour synchroniser et envoyer des messages
                  </CardDescription>
                </div>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <EmailConnectionList
                connections={connections}
                onConnectionDeleted={handleConnectionDeleted}
              />
            </CardContent>
          </Card>

          {/* Blacklist Manager */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Expediteurs Bloques
              </CardTitle>
              <CardDescription>
                Gerez les adresses email et domaines bloques
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BlacklistManager
                blacklist={blacklist}
                onUnblock={handleUnblock}
                onAddManual={handleAddManual}
              />
            </CardContent>
          </Card>
        </div>

        {/* Add Connection Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter une connexion email</DialogTitle>
              <DialogDescription>
                Connectez votre compte email pour synchroniser et envoyer des messages depuis SEIDO
              </DialogDescription>
            </DialogHeader>
            <EmailConnectionForm
              onSuccess={handleConnectionAdded}
              onCancel={() => setShowAddDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
