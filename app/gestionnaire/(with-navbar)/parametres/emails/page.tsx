'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BlacklistManager } from '../../mail/components/blacklist-manager'
import { EmailConnectionForm } from './components/email-connection-form'
import { EmailConnectionList } from './components/email-connection-list'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Plus, Loader2, ArrowLeft, Mail, Ban } from 'lucide-react'
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

interface EmailConnection {
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

export default function EmailSettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [blacklist, setBlacklist] = useState([])
  const [connections, setConnections] = useState<EmailConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
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
        // Rafraîchir la liste pour voir le nombre d'emails
        fetchConnections()
        return data.result?.count || 0
      }),
      {
        loading: 'Synchronisation des emails en cours...',
        success: (count) => `${count} emails synchronisés`,
        error: (err) => err.message || 'Échec de la synchronisation',
      }
    )
  }

  // Gestion des paramètres OAuth de retour
  useEffect(() => {
    const oauth = searchParams.get('oauth')
    const message = searchParams.get('message')
    const updated = searchParams.get('updated')
    const connectionId = searchParams.get('connectionId')

    if (oauth === 'success') {
      if (updated === 'true') {
        toast.success('Compte Gmail mis à jour avec OAuth')
      } else {
        toast.success('Compte Gmail connecté avec succès')
      }

      // Lancer la synchronisation automatique si connectionId présent
      if (connectionId) {
        // Petit délai pour que le toast de succès s'affiche d'abord
        setTimeout(() => {
          triggerAutoSync(connectionId)
        }, 500)
      }

      // Nettoyer l'URL
      router.replace('/gestionnaire/parametres/emails', { scroll: false })
    } else if (oauth === 'error') {
      const errorMessages: Record<string, string> = {
        missing_parameters: 'Paramètres manquants dans la réponse Google',
        invalid_state: 'Session expirée, veuillez réessayer',
        not_authenticated: 'Vous devez être connecté pour lier un compte Gmail',
        team_mismatch: 'Erreur d\'équipe, veuillez réessayer',
        no_email: 'Impossible de récupérer l\'email du compte Google',
        update_failed: 'Échec de la mise à jour de la connexion',
        insert_failed: 'Échec de la création de la connexion',
      }
      toast.error(errorMessages[message || ''] || `Erreur OAuth: ${message}`)
      router.replace('/gestionnaire/parametres/emails', { scroll: false })
    }
  }, [searchParams, router])

  const fetchConnections = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/emails/connections')
      if (!response.ok) {
        throw new Error('Failed to fetch connections')
      }
      const data = await response.json()
      setConnections(data.connections || [])
    } catch (error) {
      console.error('Failed to fetch connections:', error)
      // If fetch fails, we assume no connections or temporary error
      // Don't show toast on initial load to avoid user confusion if it's just empty
      setConnections([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchConnections()
  }, [])

  const handleUnblock = (blacklistId: string) => {
    // Dummy implementation
    setBlacklist(prev => prev.filter(entry => entry.id !== blacklistId))
    console.log('Unblocked blacklist entry:', blacklistId)
  }

  const handleAddManual = () => {
    toast.info('Manual blacklist entry modal would open here (dummy action)')
    console.log('Add manual blacklist entry')
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
          <h1 className="text-2xl font-bold">Paramètres Email</h1>
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
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <EmailConnectionList
                  connections={connections}
                  onConnectionDeleted={handleConnectionDeleted}
                />
              )}
            </CardContent>
          </Card>

          {/* Blacklist Manager */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Expéditeurs Bloqués
              </CardTitle>
              <CardDescription>
                Gérez les adresses email et domaines bloqués
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
