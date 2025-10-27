'use client'

import { useState } from 'react'
import { Bell, Send, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { useTeamStatus } from '@/hooks/use-team-status'

export function TestNotificationsPanel() {
  const { user } = useAuth()
  const { hasTeam } = useTeamStatus()
  const { toast } = useToast()
  const [loading, setLoading] = useState<string | null>(null)

  const sendTestNotification = async (type: string, title: string, message: string) => {
    // Récupérer team_id depuis user
    const teamId = (user as any)?.team_id

    if (!user?.id || !teamId) {
      console.error('❌ [TEST-NOTIF] Missing data:', { userId: user?.id, teamId })
      toast({
        title: "Erreur",
        description: `Utilisateur ou équipe non trouvé (user: ${user?.id ? 'OK' : 'KO'}, team: ${teamId ? 'OK' : 'KO'})`,
        variant: "destructive"
      })
      return
    }

    setLoading(type)
    console.log(`🧪 [TEST-NOTIF] Sending ${type} notification...`)

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          team_id: teamId,
          type,
          title,
          message,
          is_personal: true, // ⚠️ IMPORTANT: doit être true pour trigger push!
          metadata: { test: true },
          related_entity_id: '00000000-0000-0000-0000-000000000000' // Fake ID pour test
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send notification')
      }

      console.log(`✅ [TEST-NOTIF] ${type} notification sent successfully`)

      toast({
        title: "✅ Notification envoyée",
        description: `Test ${type} envoyé avec succès! Vérifiez votre appareil.`,
        variant: "default"
      })
    } catch (error) {
      console.error(`❌ [TEST-NOTIF] Error:`, error)
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'envoyer la notification",
        variant: "destructive"
      })
    } finally {
      setLoading(null)
    }
  }

  return (
    <Card className="border-dashed border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
          <Bell className="h-5 w-5" />
          🧪 Test des notifications push
        </CardTitle>
        <CardDescription>
          Testez les différents types de notifications pour vérifier que vous recevez bien les alertes sur cet appareil
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Intervention - Haute priorité */}
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => sendTestNotification(
              'intervention',
              '🚨 Intervention urgente',
              'Fuite d\'eau détectée à l\'appartement 302 - Intervention immédiate requise'
            )}
            disabled={loading !== null}
          >
            {loading === 'intervention' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm font-medium">Intervention</span>
            <span className="text-xs text-muted-foreground">Haute priorité</span>
          </Button>

          {/* Assignment */}
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => sendTestNotification(
              'assignment',
              '📋 Nouvelle affectation',
              'Vous avez été assigné à l\'intervention #12345 - Plomberie'
            )}
            disabled={loading !== null}
          >
            {loading === 'assignment' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5 text-blue-500" />
            )}
            <span className="text-sm font-medium">Assignment</span>
            <span className="text-xs text-muted-foreground">Affectation</span>
          </Button>

          {/* Document Upload */}
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => sendTestNotification(
              'document',
              '📄 Nouveau document',
              'Un document a été ajouté à l\'intervention #12345'
            )}
            disabled={loading !== null}
          >
            {loading === 'document' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="text-2xl">📄</span>
            )}
            <span className="text-sm font-medium">Document</span>
            <span className="text-xs text-muted-foreground">Upload document</span>
          </Button>

          {/* Status Change */}
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => sendTestNotification(
              'status_change',
              '🔄 Changement de statut',
              'L\'intervention #12345 est passée en statut "En cours"'
            )}
            disabled={loading !== null}
          >
            {loading === 'status_change' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="text-2xl">🔄</span>
            )}
            <span className="text-sm font-medium">Status Change</span>
            <span className="text-xs text-muted-foreground">Changement statut</span>
          </Button>
        </div>

        {/* Astuce */}
        <div className="rounded-lg border bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900 p-3">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <strong>💡 Astuce :</strong> Pour tester, activez d'abord les notifications push ci-dessus, puis cliquez sur un bouton. Vous devriez recevoir une notification native même si l'app est en arrière-plan ou fermée!
          </p>
        </div>

        {/* Info debug */}
        <div className="text-xs text-muted-foreground">
          <p>🔍 <strong>Debug:</strong> Ouvrez la console pour voir les logs détaillés</p>
        </div>
      </CardContent>
    </Card>
  )
}
