'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { userService } from '@/lib/database-service'

interface DiagnosticResult {
  test: string
  status: 'pending' | 'success' | 'error'
  message: string
  details?: any
}

export default function DebugPage() {
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const updateResult = (testName: string, status: DiagnosticResult['status'], message: string, details?: any) => {
    setResults(prev => {
      const existing = prev.findIndex(r => r.test === testName)
      const newResult = { test: testName, status, message, details }
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = newResult
        return updated
      }
      return [...prev, newResult]
    })
  }

  const runDiagnostics = async () => {
    setIsRunning(true)
    setResults([])

    // Test 1: Connexion Supabase basique
    updateResult('Connection', 'pending', 'Test de connexion Supabase...')
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1)
      if (error) {
        updateResult('Connection', 'error', `Erreur de connexion: ${error.message}`, error)
      } else {
        updateResult('Connection', 'success', 'Connexion Supabase OK')
      }
    } catch (error) {
      updateResult('Connection', 'error', `Exception: ${error}`, error)
    }

    // Test 2: Vérification de l'auth
    updateResult('Auth Status', 'pending', 'Vérification du statut auth...')
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) {
        updateResult('Auth Status', 'error', `Erreur auth: ${authError.message}`, authError)
      } else {
        updateResult('Auth Status', 'success', `Auth: ${authData.user ? `User ${authData.user.id}` : 'Pas connecté'}`, {
          user: authData.user,
          emailConfirmed: !!authData.user?.email_confirmed_at
        })
      }
    } catch (error) {
      updateResult('Auth Status', 'error', `Exception auth: ${error}`, error)
    }

    // Test 3: Vérification des tables (sans RLS)
    updateResult('Tables Access', 'pending', 'Test d\'accès aux tables...')
    try {
      // Test avec une requête simple sur les tables
      const tables = ['users', 'teams', 'buildings', 'lots', 'contacts', 'interventions']
      const tableResults = {}
      
      for (const table of tables) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
          
          if (error) {
            tableResults[table] = { error: error.message, code: error.code }
          } else {
            tableResults[table] = { count, status: 'ok' }
          }
        } catch (e) {
          tableResults[table] = { exception: String(e) }
        }
      }
      
      updateResult('Tables Access', 'success', 'Test des tables terminé', tableResults)
    } catch (error) {
      updateResult('Tables Access', 'error', `Exception: ${error}`, error)
    }

    // Test 4: Test de RLS via une requête réelle
    updateResult('RLS Test', 'pending', 'Test des politiques RLS...')
    try {
      // Tenter de lire un utilisateur spécifique (devrait échouer si pas connecté)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1)
      
      if (error) {
        updateResult('RLS Test', 'error', `RLS bloque l'accès: ${error.message}`, {
          error,
          interpretation: 'Normal si pas connecté - RLS fonctionne'
        })
      } else {
        updateResult('RLS Test', 'success', `Accès autorisé, ${data.length} résultats`, data)
      }
    } catch (error) {
      updateResult('RLS Test', 'error', `Exception RLS: ${error}`, error)
    }

    // Test 5: Test du service userService
    updateResult('UserService', 'pending', 'Test du service utilisateur...')
    try {
      // Créer un ID factice pour tester
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const user = await userService.getById(fakeId)
      updateResult('UserService', 'success', 'Service fonctionne', user)
    } catch (error) {
      updateResult('UserService', 'error', `Service échoue: ${error}`, error)
    }

    // Test 6: Validation RLS avec la fonction diagnostic
    updateResult('RLS Validation', 'pending', 'Validation des politiques RLS...')
    try {
      const { data, error } = await supabase.rpc('validate_rls_setup')
      if (error) {
        updateResult('RLS Validation', 'error', `Erreur fonction RLS: ${error.message}`, error)
      } else {
        updateResult('RLS Validation', 'success', 'Fonction RLS exécutée', data)
      }
    } catch (error) {
      updateResult('RLS Validation', 'error', `Exception RLS validation: ${error}`, error)
    }

    setIsRunning(false)
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'pending': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'pending': return '⏳'
      default: return '❓'
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Diagnostic Base de Données</h1>
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
          >
            {isRunning ? 'En cours...' : 'Relancer les tests'}
          </button>
        </div>

        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className="border rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{getStatusIcon(result.status)}</span>
                <span className="font-semibold">{result.test}</span>
                <span className={`text-sm ${getStatusColor(result.status)}`}>
                  ({result.status})
                </span>
              </div>
              
              <p className="text-gray-700 mb-2">{result.message}</p>
              
              {result.details && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                    Voir les détails
                  </summary>
                  <pre className="bg-gray-100 p-3 mt-2 text-xs overflow-auto rounded">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>

        {results.length === 0 && !isRunning && (
          <div className="text-center py-8 text-gray-500">
            Aucun test exécuté. Cliquez sur "Relancer les tests" pour commencer.
          </div>
        )}
      </div>
    </div>
  )
}
