'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { UserRole } from '@/lib/auth'
import { SEIDODebugger } from '@/lib/seido-debugger'

interface DebugLog {
  id: string
  timestamp: string
  component: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  context?: any
  data?: any
}

interface DebugPanelProps {
  userRole?: UserRole
  userId?: string
  isVisible?: boolean
}

export function SEIDODebugPanel({ userRole, userId, isVisible = false }: DebugPanelProps) {
  const [logs, setLogs] = useState<DebugLog[]>([])
  const [isExpanded, setIsExpanded] = useState(isVisible)
  const [activeTab, setActiveTab] = useState('logs')

  // Simuler la collecte de logs (en production, ceci viendrait d'un service de logging)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    // Intercepter les console.log pour capturer les logs SEIDO
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info
    }

    const captureLog = (level: DebugLog['level']) => (...args: any[]) => {
      // Appeler la méthode console originale
      originalConsole[level](...args)

      // Capturer les logs SEIDO
      const message = args[0]
      if (typeof message === 'string' && message.includes('[SEIDO-')) {
        const newLog: DebugLog = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          component: extractComponent(message),
          level,
          message: extractMessage(message),
          context: args[1],
          data: args[2]
        }
        setLogs(prev => [...prev.slice(-99), newLog]) // Garder les 100 derniers logs
      }
    }

    console.log = captureLog('info')
    console.warn = captureLog('warn')
    console.error = captureLog('error')

    return () => {
      // Restaurer les méthodes console originales
      console.log = originalConsole.log
      console.warn = originalConsole.warn
      console.error = originalConsole.error
      console.info = originalConsole.info
    }
  }, [])

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const extractComponent = (message: string): string => {
    const match = message.match(/\[SEIDO-(\w+)\]/)
    return match ? match[1] : 'UNKNOWN'
  }

  const extractMessage = (message: string): string => {
    return message.replace(/^.*\[SEIDO-\w+\]\s*/, '')
  }

  const getLevelColor = (level: DebugLog['level']) => {
    const colors = {
      info: 'bg-blue-100 text-blue-800',
      warn: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      debug: 'bg-gray-100 text-gray-800'
    }
    return colors[level]
  }

  const clearLogs = () => {
    setLogs([])
  }

  const testDebugFeatures = () => {
    // Tests de démonstration des fonctionnalités de debug
    SEIDODebugger.debugAuth('signin', 'test@example.com', 'gestionnaire', true)
    SEIDODebugger.debugPermissions('view_intervention', 'gestionnaire', userId || 'test-user', { id: 'int-123' }, true)
    SEIDODebugger.debugInterventionTransition('int-123', 'nouvelle-demande', 'approuvee', 'gestionnaire', true)
    SEIDODebugger.debugDashboardData('gestionnaire', 'main', { buildings: 12, lots: 48, occupancy: 85 })
    SEIDODebugger.debugNotification('intervention_approved', 'locataire', 'tenant-123', true)
  }

  const componentCounts = logs.reduce((acc, log) => {
    acc[log.component] = (acc[log.component] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const levelCounts = logs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsExpanded(true)}
          variant="outline"
          size="sm"
          className="bg-white shadow-lg"
        >
          🔍 Debug ({logs.length})
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96">
      <Card className="bg-white shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">SEIDO Debugger</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {userRole}
              </Badge>
              <Button
                onClick={() => setIsExpanded(false)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                ✕
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="logs" className="text-xs">
                Logs ({logs.length})
              </TabsTrigger>
              <TabsTrigger value="stats" className="text-xs">
                Stats
              </TabsTrigger>
              <TabsTrigger value="tools" className="text-xs">
                Tools
              </TabsTrigger>
            </TabsList>

            <TabsContent value="logs" className="mt-0">
              <div className="p-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-500">Real-time logs</span>
                  <Button onClick={clearLogs} variant="ghost" size="sm" className="h-6 text-xs">
                    Clear
                  </Button>
                </div>
                <ScrollArea className="h-64">
                  <div className="space-y-1">
                    {logs.slice(-50).reverse().map((log) => (
                      <div key={log.id} className="text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-xs px-1 py-0 ${getLevelColor(log.level)}`}>
                            {log.component}
                          </Badge>
                          <span className="text-gray-400">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-gray-700 mb-1">{log.message}</div>
                        {(log.context || log.data) && (
                          <details className="text-xs text-gray-500 ml-2">
                            <summary className="cursor-pointer">Details</summary>
                            <pre className="mt-1 bg-gray-50 p-1 rounded text-xs overflow-auto">
                              {JSON.stringify({ context: log.context, data: log.data }, null, 2)}
                            </pre>
                          </details>
                        )}
                        <Separator className="mt-1" />
                      </div>
                    ))}
                    {logs.length === 0 && (
                      <div className="text-center text-gray-400 text-xs py-8">
                        No logs captured yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="mt-0">
              <div className="p-2 space-y-2">
                <div>
                  <h4 className="text-xs font-medium mb-2">Components</h4>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(componentCounts).map(([component, count]) => (
                      <div key={component} className="flex justify-between text-xs">
                        <span>{component}</span>
                        <Badge variant="secondary" className="text-xs px-1">
                          {count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="text-xs font-medium mb-2">Log Levels</h4>
                  <div className="space-y-1">
                    {Object.entries(levelCounts).map(([level, count]) => (
                      <div key={level} className="flex justify-between text-xs">
                        <Badge className={`text-xs px-1 ${getLevelColor(level as DebugLog['level'])}`}>
                          {level}
                        </Badge>
                        <span>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="text-xs text-gray-500">
                  <div>User: {userId || 'Unknown'}</div>
                  <div>Role: {userRole || 'Unknown'}</div>
                  <div>Session: {new Date().toLocaleString()}</div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tools" className="mt-0">
              <div className="p-2 space-y-2">
                <Button
                  onClick={testDebugFeatures}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                >
                  Test Debug Features
                </Button>
                <Button
                  onClick={() => SEIDODebugger.testSupabaseConnectivity()}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                >
                  Test Supabase
                </Button>
                <Button
                  onClick={() => {
                    const interventionId = prompt('Enter intervention ID:')
                    if (interventionId) {
                      SEIDODebugger.traceIntervention(interventionId)
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                >
                  Trace Intervention
                </Button>
                <Separator />
                <div className="text-xs text-gray-500 space-y-1">
                  <div>• Check browser console for detailed logs</div>
                  <div>• Use React DevTools for component debugging</div>
                  <div>• Network tab for API debugging</div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Provider pour injecter automatiquement le debug panel
 */
export function SEIDODebugProvider({ children }: { children: React.ReactNode }) {
  const [debugInfo, setDebugInfo] = useState<{ userRole?: UserRole; userId?: string }>({})

  useEffect(() => {
    // Récupérer les informations de debug depuis le contexte d'auth
    // (à adapter selon votre implémentation d'auth)
    const getUserDebugInfo = () => {
      // Simulation - remplacez par votre logique d'auth
      return {
        userRole: 'gestionnaire' as UserRole,
        userId: 'debug-user-123'
      }
    }

    setDebugInfo(getUserDebugInfo())
  }, [])

  return (
    <>
      {children}
      <SEIDODebugPanel
        userRole={debugInfo.userRole}
        userId={debugInfo.userId}
        isVisible={false}
      />
    </>
  )
}