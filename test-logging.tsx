'use client'

import { useEffect, useState } from 'react'
import { 
  logger, 
  authLogger, 
  supabaseLogger, 
  logUserAction, 
  logError 
} from '@/lib/logger'
import { 
  useComponentLogger, 
  useInteractionLogger, 
  usePerformanceLogger 
} from '@/lib/react-logger'

export default function TestLogging() {
  const { logAction, logError, logRender } = useComponentLogger('TestLogging')
  const { logClick, logHover } = useInteractionLogger('TestLogging')
  usePerformanceLogger('TestLogging')

  const [count, setCount] = useState(0)

  useEffect(() => {
    logRender({ testMode: true })
    
    // Test des différents types de logs
    logger.info('🚀 Test du système de logging démarré')
    authLogger.info('🔐 Test des logs d\'authentification')
    supabaseLogger.info('🗄️ Test des logs de base de données')
  }, [])

  const handleClick = () => {
    setCount(prev => prev + 1)
    
    // Logs d'interaction
    logClick('test-button', { count: count + 1 })
    logUserAction('test_click', 'test-user', { count: count + 1 })
    
    // Test des différents niveaux
    logger.debug('🐛 Debug: Bouton cliqué')
    logger.info('ℹ️ Info: Compteur incrémenté')
    logger.warn('⚠️ Warning: Test d\'avertissement')
  }

  const testError = () => {
    try {
      throw new Error('Test d\'erreur pour le logging')
    } catch (error) {
      logError(error as Error, 'test_error')
    }
  }

  const testSupabaseLog = () => {
    // Simulation d'une opération Supabase
    supabaseLogger.info('Test d\'opération Supabase', {
      operation: 'select',
      table: 'test_table',
      duration: 45,
      rowCount: 10
    })
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Test du système de logging</h1>
      
      <div className="space-y-2">
        <p>Compteur: {count}</p>
        <button 
          onClick={handleClick}
          onMouseEnter={() => logHover('test-button')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Cliquer pour tester les logs
        </button>
      </div>

      <div className="space-y-2">
        <button 
          onClick={testError}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Tester les logs d'erreur
        </button>
      </div>

      <div className="space-y-2">
        <button 
          onClick={testSupabaseLog}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Tester les logs Supabase
        </button>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Types de logs testés :</h2>
        <ul className="space-y-1 text-sm">
          <li>✅ Logs de composants React</li>
          <li>✅ Logs d'interactions utilisateur</li>
          <li>✅ Logs de performance</li>
          <li>✅ Logs d'erreurs</li>
          <li>✅ Logs Supabase</li>
          <li>✅ Logs d'authentification</li>
          <li>✅ Logs généraux (debug, info, warn, error)</li>
        </ul>
      </div>
    </div>
  )
}



