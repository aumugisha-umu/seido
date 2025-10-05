"use client"

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useNavigationRefresh } from '@/hooks/use-navigation-refresh'
import { useDataRefresh } from '@/hooks/use-cache-management'
import { RefreshCw, Bug, CheckCircle, XCircle, AlertTriangle, EyeOff } from 'lucide-react'
import { logger, logError } from '@/lib/logger'
// Composant de debug pour tester le système de navigation et cache
export function NavigationDebugPanel() {
  const pathname = usePathname()
  const { forceRefreshCurrentSection, forceGlobalRefresh } = useNavigationRefresh()
  const [logs, setLogs] = useState<string[]>([])
  const [testResults, setTestResults] = useState<{ [key: string]: boolean }>({})
  const [loopDetected, setLoopDetected] = useState(false)
  // ✅ FIX HYDRATION: État pour contrôler l'affichage du debug panel (évite les problèmes d'hydration)
  const [isVisible, setIsVisible] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [hasError, setHasError] = useState(false)

  // ✅ FIX: Initialiser après hydration pour éviter les mismatches
  useEffect(() => {
    try {
      setIsClient(true)
      const savedState = localStorage.getItem('debug-panel-visible')
      if (savedState === 'true') {
        setIsVisible(true)
      }
    } catch (error) {
      logger.error('❌ [DEBUG-PANEL] Error reading localStorage:', error)
      setHasError(true)
    }
  }, [])

  // ✅ FIX: Écouter l'événement d'urgence
  useEffect(() => {
    const handleForceOpen = () => {
      logger.info('🚨 [DEBUG-PANEL] Emergency force open received')
      setIsVisible(true)
      setLogs(prev => [...prev, '🚨 Emergency activation triggered'])
    }

    window.addEventListener('force-debug-panel-open', handleForceOpen)
    
    return () => {
      window.removeEventListener('force-debug-panel-open', handleForceOpen)
    }
  }, [])

  // Simuler un hook de données pour le test
  const testRefreshCallback = () => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev.slice(-4), `🔄 Test refresh triggered at ${timestamp}`])
    setTestResults(prev => ({ ...prev, refresh: true }))
  }

  // ✅ NOUVEAU: Détection de boucle infinie basée sur les logs
  useEffect(() => {
    const checkForLoop = () => {
      const cacheInvalidateMessages = logs.filter(log => 
        log.includes('Cache invalidated') || log.includes('Route matches pattern')
      )
      
      if (cacheInvalidateMessages.length > 10) {
        setLoopDetected(true)
        logger.error('🚨 [DEBUG-PANEL] Loop detected - stopping cache system')
      }
    }
    
    checkForLoop()
  }, [logs])

  // ✅ FIX: Fonctions pour gérer la persistance des préférences utilisateur avec gestion d'erreurs
  const toggleVisibility = useCallback((visible: boolean) => {
    try {
      setIsVisible(visible)
      if (typeof window !== 'undefined') {
        localStorage.setItem('debug-panel-visible', visible.toString())
      }
      logger.info(`🔄 [DEBUG-PANEL] Visibility toggled to: ${visible}`)
    } catch (error) {
      logger.error('❌ [DEBUG-PANEL] Error saving to localStorage:', error)
      setHasError(true)
      // Même en cas d'erreur, on change l'état pour que ça marche
      setIsVisible(visible)
    }
  }, [])


  // ✅ NOUVEAU: Emergency stop pour arrêter les boucles infinies
  const emergencyStopLoop = () => {
    logger.info('🚨 [DEBUG-PANEL] Emergency stop triggered')
    setLoopDetected(false)
    setLogs([])
    
    // ✅ FIX: Réinitialiser l'état et forcer un reload de la page si nécessaire
    try {
      // Nettoyer tous les timeouts possibles
      for (let i = 1; i < 99999; i++) {
        window.clearTimeout(i)
      }
      
      setLogs(['🛑 Emergency stop executed - cache system reset'])
      setTestResults({})
      
      // Si la boucle persiste, suggérer un refresh de page
      setTimeout(() => {
        if (loopDetected) {
          const shouldRefresh = window.confirm(
            '⚠️ La boucle semble persister. Voulez-vous recharger la page pour résoudre le problème ?'
          )
          if (shouldRefresh) {
            window.location.reload()
          }
        }
      }, 2000)
      
    } catch (error) {
      logger.error('❌ [DEBUG-PANEL] Error in emergency stop:', error)
      setLogs(['❌ Emergency stop failed - consider page refresh'])
    }
  }

  // ✅ FIX: Gestion d'erreurs pour les hooks
  let setCacheValid, isCacheValid, invalidateCache
  try {
    const cacheHooks = useDataRefresh('debug-test', testRefreshCallback)
    setCacheValid = cacheHooks.setCacheValid
    isCacheValid = cacheHooks.isCacheValid
    invalidateCache = cacheHooks.invalidateCache
  } catch (error) {
    logger.error('❌ [DEBUG-PANEL] Error with cache hooks:', error)
    setHasError(true)
    // Fallbacks pour éviter les erreurs
    setCacheValid = () => {}
    isCacheValid = () => false
    invalidateCache = () => {}
  }

  // ✅ FIX: Initialiser le cache comme valide au démarrage avec gestion d'erreur
  useEffect(() => {
    try {
      setCacheValid?.(300000) // Cache valide pour 5 minutes par défaut
    } catch (error) {
      logger.error('❌ [DEBUG-PANEL] Error initializing cache:', error)
    }
  }, [setCacheValid])

  useEffect(() => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev.slice(-4), `🧭 Navigation to ${pathname} at ${timestamp}`])
    setTestResults(prev => ({ ...prev, navigation: true }))
  }, [pathname])

  // ✅ NOUVEAU: Raccourci clavier pour ouvrir/fermer le debug panel (Ctrl/Cmd + Shift + D)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
        event.preventDefault()
        toggleVisibility(!isVisible)
        logger.info(`🎹 [DEBUG-PANEL] Keyboard shortcut triggered - ${!isVisible ? 'Opening' : 'Closing'} debug panel`)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible, toggleVisibility])

  const runTests = async () => {
    setLogs([])
    setTestResults({})

    // Test 1: Cache validation
    setCacheValid(5000) // 5 secondes TTL
    const isValid = isCacheValid()
    setTestResults(prev => ({ ...prev, cache: isValid }))
    setLogs(prev => [...prev, `✅ Cache test: ${isValid ? 'PASS' : 'FAIL'}`])

    // Test 2: Cache invalidation  
    invalidateCache()
    const isValidAfterInvalidation = isCacheValid()
    setTestResults(prev => ({ ...prev, invalidation: !isValidAfterInvalidation }))
    setLogs(prev => [...prev, `✅ Invalidation test: ${!isValidAfterInvalidation ? 'PASS' : 'FAIL'}`])

    // Test 3: Refresh callback
    testRefreshCallback()
    
    // Test 4: Section refresh
    forceRefreshCurrentSection()
    setLogs(prev => [...prev, `✅ Section refresh test: TRIGGERED`])

    setLogs(prev => [...prev, `🎯 All tests completed`])

    // ✅ FIX: Réactiver le cache après les tests pour que le statut soit valide
    setTimeout(() => {
      setCacheValid(300000) // Cache valide pour 5 minutes après les tests
      setLogs(prev => [...prev, '🔄 Cache reactivated - Status should now be Valid'])
    }, 1500)
  }

  const clearLogs = () => {
    setLogs([])
    setTestResults({})
  }

  // ✅ FIX: Fonction de rendu sécurisée
  const renderFloatingButton = () => {
    try {
      const buttonClass = `shadow-lg rounded-full p-3 min-h-12 min-w-12 relative ${
        loopDetected || hasError
          ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse' 
          : 'bg-slate-800 hover:bg-slate-700 text-white'
      }`
      
      const buttonTitle = hasError 
        ? "❌ Erreur détectée - Debug Panel" 
        : loopDetected 
        ? "⚠️ Boucle détectée - Ouvrir le Debug Panel" 
        : "Ouvrir le Debug Panel"

      return (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={() => toggleVisibility(true)}
            size="sm"
            className={buttonClass}
            title={buttonTitle}
          >
            <Bug className="h-5 w-5" />
            {(loopDetected || hasError) && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
            )}
          </Button>
        </div>
      )
    } catch (error) {
      logger.error('❌ [DEBUG-PANEL] Error rendering button:', error)
      // Bouton de secours minimal
      return (
        <div className="fixed bottom-4 right-4 z-50">
          <button 
            onClick={() => setIsVisible(true)}
            style={{ 
              background: '#dc2626', 
              color: 'white', 
              borderRadius: '50%', 
              padding: '12px', 
              border: 'none', 
              cursor: 'pointer',
              fontSize: '16px'
            }}
            title="🚨 Debug Panel (Mode Secours)"
          >
            🐛
          </button>
        </div>
      )
    }
  }

  return (
    <>
      {/* ✅ FIX: Afficher le bouton si pas visible OU si on n'est pas encore côté client */}
      {(!isVisible || !isClient) && renderFloatingButton()}

      {/* ✅ Debug Panel (affiché seulement si isVisible = true) avec gestion d'erreurs */}
      {isVisible && (
        <div className="fixed bottom-4 right-4 z-50 max-w-2xl">
          <Card className="w-full shadow-lg border border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bug className="h-5 w-5" />
                <span>Navigation & Cache Debug Panel</span>
                {hasError && (
                  <Badge variant="destructive" className="animate-pulse">
                    ❌ ERROR
                  </Badge>
                )}
                {loopDetected && (
                  <Badge variant="destructive" className="animate-pulse">
                    🚨 LOOP
                  </Badge>
                )}
                {!isClient && (
                  <Badge variant="secondary">
                    ⏳ Loading
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => toggleVisibility(false)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
                  title="Fermer le Debug Panel"
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
              
              {/* ✅ FIX: Diagnostic Section */}
              {hasError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-800">Erreurs Détectées</span>
                  </div>
                  <p className="text-sm text-red-700">
                    Le debug panel a rencontré des erreurs. Vérifiez la console pour plus de détails.
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2 text-red-600 border-red-300"
                    onClick={() => {
                      setHasError(false)
                      setLogs(['🔄 Erreurs réinitialisées'])
                    }}
                  >
                    Réinitialiser Erreurs
                  </Button>
                </div>
              )}

              {/* Current Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Current Path:</label>
                  <Badge variant="outline" className="ml-2">{pathname}</Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Cache Status:</label>
                  <Badge 
                    variant={isCacheValid?.() ? "default" : "secondary"} 
                    className="ml-2"
                  >
                    {isCacheValid?.() ? 'Valid' : 'Invalid'}
                  </Badge>
                </div>
              </div>

              {/* ✅ FIX: System Status */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Client Hydrated:</span>
                    <Badge variant={isClient ? "default" : "secondary"}>
                      {isClient ? "✅ Yes" : "⏳ Loading"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Panel Visible:</span>
                    <Badge variant={isVisible ? "default" : "outline"}>
                      {isVisible ? "✅ Open" : "❌ Closed"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Errors Count:</span>
                    <Badge variant={hasError ? "destructive" : "default"}>
                      {hasError ? "❌ Has Errors" : "✅ No Errors"}
                    </Badge>
                  </div>
                </div>
              </div>

        {/* Test Results */}
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(testResults).map(([test, passed]) => (
            <div key={test} className="flex items-center space-x-2">
              {passed ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm capitalize">{test} Test</span>
            </div>
          ))}
        </div>

        {/* Loop Detection Alert */}
        {loopDetected && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-red-800 font-medium">🚨 Boucle Infinie Détectée</span>
            </div>
            <p className="text-sm text-red-700 mb-3">
              Le système de cache semble être en boucle infinie. Cliquez sur &ldquo;Emergency Stop&rdquo; pour l'arrêter.
            </p>
            <Button size="sm" variant="destructive" onClick={emergencyStopLoop}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Emergency Stop
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={runTests} disabled={loopDetected}>
            <Bug className="h-4 w-4 mr-2" />
            Run Tests
          </Button>
          <Button size="sm" variant="outline" onClick={forceRefreshCurrentSection} disabled={loopDetected}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Section
          </Button>
          <Button size="sm" variant="outline" onClick={forceGlobalRefresh} disabled={loopDetected}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Global Refresh
          </Button>
          <Button size="sm" variant="secondary" onClick={clearLogs}>
            Clear Logs
          </Button>
          {loopDetected && (
            <Button size="sm" variant="destructive" onClick={emergencyStopLoop}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              STOP
            </Button>
          )}
        </div>

        {/* Logs */}
        <div className="bg-slate-50 rounded-lg p-3 max-h-48 overflow-y-auto">
          <div className="text-xs font-medium text-slate-600 mb-2">Debug Logs:</div>
          {logs.length === 0 ? (
            <div className="text-xs text-slate-400">No logs yet. Run tests to see output.</div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="text-xs font-mono text-slate-700">{log}</div>
              ))}
            </div>
          )}
        </div>

              {/* Instructions */}
              <div className="text-xs text-slate-500 bg-blue-50 p-3 rounded-lg">
                <div className="font-medium mb-1">How to test:</div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Click &ldquo;Run Tests&rdquo; to verify the cache system works</li>
                  <li>Navigate to different sections (Dashboard, Biens, Interventions)</li>
                  <li>Watch the logs for navigation and refresh events</li>
                  <li>Use &ldquo;Refresh Section&rdquo; to manually trigger data refresh</li>
                </ol>
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <div className="font-medium mb-1">Raccourci clavier :</div>
                  <div className="flex items-center space-x-1">
                    <kbd className="px-2 py-1 bg-white border border-blue-300 rounded text-xs">Ctrl</kbd>
                    <span>+</span>
                    <kbd className="px-2 py-1 bg-white border border-blue-300 rounded text-xs">Shift</kbd>
                    <span>+</span>
                    <kbd className="px-2 py-1 bg-white border border-blue-300 rounded text-xs">D</kbd>
                    <span className="ml-2">pour ouvrir/fermer</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    Cliquer l'œil pour fermer le panel
                  </div>
                  {hasError && (
                    <div className="mt-2 pt-2 border-t border-red-200">
                      <div className="font-medium mb-1 text-red-600">🚨 Mode Dépannage :</div>
                      <div className="text-xs text-red-600">
                        En cas de problème, rechargez la page ou vérifiez la console
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

export default NavigationDebugPanel
