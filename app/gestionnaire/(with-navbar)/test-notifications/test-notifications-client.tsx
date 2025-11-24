'use client'

/**
 * Client Component pour tester les notifications multi-canal
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Send, Database, Mail, Bell, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { createTestInterventionAndNotify } from '@/app/actions/test-notification-actions'

interface TestNotificationsClientProps {
  userId: string
  userEmail: string
  teamId: string
}

type TestResult = {
  success: boolean
  message: string
  data?: any
  timing?: number
}

export function TestNotificationsClient({ userId, userEmail, teamId }: TestNotificationsClientProps) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Record<string, TestResult>>({})

  /**
   * Test notification avec intervention existante
   */
  const testInterventionCreated = async () => {
    setLoading(true)
    const startTime = Date.now()

    try {
      // Utiliser intervention existante + dispatcher notifications
      const result = await createTestInterventionAndNotify()

      const timing = Date.now() - startTime

      if (result.success && result.dispatchResult) {
        setResults((prev) => ({
          ...prev,
          interventionCreated: {
            success: true,
            message: `✅ Notifications envoyées pour l'intervention ${result.interventionId} en ${timing}ms`,
            data: {
              interventionId: result.interventionId,
              overallSuccess: result.dispatchResult.overallSuccess,
              channels: result.dispatchResult.results?.map((r: any) => ({
                channel: r.channel,
                success: r.success,
                count: r.metadata?.count || 0,
                timing: r.metadata?.timing || 0,
              })),
              failedChannels: result.dispatchResult.failedChannels,
              timings: result.dispatchResult.timings,
            },
            timing,
          },
        }))
      } else {
        setResults((prev) => ({
          ...prev,
          interventionCreated: {
            success: false,
            message: `❌ Erreur: ${result.error || 'Unknown error'}`,
            timing,
          },
        }))
      }
    } catch (error) {
      const timing = Date.now() - startTime
      setResults((prev) => ({
        ...prev,
        interventionCreated: {
          success: false,
          message: `❌ Exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timing,
        },
      }))
    } finally {
      setLoading(false)
    }
  }

  /**
   * Test email direct (sans intervention)
   */
  const testDirectEmail = async () => {
    setLoading(true)
    const startTime = Date.now()

    try {
      // TODO: Créer une action pour tester email direct
      setResults((prev) => ({
        ...prev,
        directEmail: {
          success: false,
          message: '⚠️ Test email direct pas encore implémenté (Phase 2.5)',
          timing: Date.now() - startTime,
        },
      }))
    } catch (error) {
      const timing = Date.now() - startTime
      setResults((prev) => ({
        ...prev,
        directEmail: {
          success: false,
          message: `❌ Exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timing,
        },
      }))
    } finally {
      setLoading(false)
    }
  }

  /**
   * Render résultat d'un test
   */
  const renderTestResult = (key: string, result: TestResult) => {
    if (!result) return null

    const icon = result.success ? (
      <CheckCircle2 className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    )

    return (
      <Alert key={key} className="mt-4">
        <div className="flex items-start gap-3">
          {icon}
          <div className="flex-1">
            <AlertDescription className="text-sm">
              <div className="font-medium mb-2">{result.message}</div>

              {result.data && (
                <div className="mt-3 space-y-2">
                  {/* Overall Status */}
                  <div className="flex items-center gap-2">
                    <Badge variant={result.data.overallSuccess ? 'default' : 'destructive'}>
                      {result.data.overallSuccess ? 'Tous les canaux OK' : 'Certains canaux échoués'}
                    </Badge>
                    {result.timing && (
                      <span className="text-xs text-gray-500">Total: {result.timing}ms</span>
                    )}
                  </div>

                  {/* Failed Channels */}
                  {result.data.failedChannels && result.data.failedChannels.length > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <span className="text-xs text-orange-600">
                        Canaux échoués: {result.data.failedChannels.join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Channel Results */}
                  {result.data.channels && (
                    <div className="space-y-1 mt-3">
                      <div className="text-xs font-medium text-gray-700 mb-1">
                        Détails par canal:
                      </div>
                      {result.data.channels.map((channel: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded"
                        >
                          <div className="flex items-center gap-2">
                            {channel.channel === 'database' && <Database className="h-3 w-3" />}
                            {channel.channel === 'email' && <Mail className="h-3 w-3" />}
                            {channel.channel === 'push' && <Bell className="h-3 w-3" />}
                            <span className="font-medium capitalize">{channel.channel}</span>
                            {channel.success ? (
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-gray-600">
                            {channel.count > 0 && <span>{channel.count} notif(s)</span>}
                            {channel.timing >= 0 && <span>{channel.timing}ms</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Timings */}
                  {result.data.timings && (
                    <div className="text-xs text-gray-500 mt-2">
                      <details>
                        <summary className="cursor-pointer hover:text-gray-700">
                          Voir timings détaillés
                        </summary>
                        <pre className="mt-2 bg-gray-100 p-2 rounded text-xs overflow-auto">
                          {JSON.stringify(result.data.timings, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              )}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Informations de Test
          </CardTitle>
          <CardDescription>Environnement de test actuel</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">User ID:</span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{userId}</code>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{userEmail}</code>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Team ID:</span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{teamId}</code>
          </div>
        </CardContent>
      </Card>

      {/* Phase 1 & 2: Dispatcher Tests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Phase 1 & 2: NotificationDispatcher + Email
          </CardTitle>
          <CardDescription>
            Teste le dispatcher multi-canal avec Database + Email (Resend) en utilisant une intervention existante
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={testInterventionCreated}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Tester Notifications (Intervention Existante)
              </>
            )}
          </Button>

          {results.interventionCreated && renderTestResult('interventionCreated', results.interventionCreated)}
        </CardContent>
      </Card>

      {/* Phase 2.5: Direct Email Test (optional) */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Phase 2.5: Test Email Direct
          </CardTitle>
          <CardDescription>
            Teste l'envoi d'email direct sans créer d'intervention (optionnel)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={testDirectEmail}
            disabled={loading}
            variant="outline"
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Tester Email Direct
              </>
            )}
          </Button>

          {results.directEmail && renderTestResult('directEmail', results.directEmail)}
        </CardContent>
      </Card>

      {/* Phase 3: Push Test (à venir) */}
      <Card className="border-dashed opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Phase 3: Push Notifications
          </CardTitle>
          <CardDescription>
            ⏳ Sera disponible après Phase 3 (Web Push)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button disabled className="w-full" size="lg" variant="secondary">
            <Bell className="mr-2 h-4 w-4" />
            Tester Push Notification (à venir)
          </Button>
        </CardContent>
      </Card>

      {/* Debug Info */}
      {Object.keys(results).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">🔍 Debug: Résultats Complets</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
