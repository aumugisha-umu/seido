"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

interface User {
  id: string
  name: string
  role: string
}

interface UserAvailability {
  id: string
  intervention_id: string
  user_id: string
  date: string
  start_time: string
  end_time: string
  user?: User
}

interface Intervention {
  id: string
  title: string
  status: string
  [key: string]: unknown
}

interface DebugResults {
  intervention?: Intervention
  availabilities?: UserAvailability[]
  availabilitiesCount: number
  providerAvails: UserAvailability[]
  providers?: User[]
  providersCount: number
  errors: {
    availError?: unknown
    intError?: unknown
    provError?: unknown
  }
  error?: unknown
}

export default function DebugAvailabilitiesPage() {
  const [results, setResults] = useState<DebugResults | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function debugAvailabilities() {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const interventionId = 'd9c86275-7817-4160-a348-c4ba63ea74bb'

      console.log('🔍 Debugging user_availabilities pour intervention:', interventionId)

      try {
        // 1. Vérifier toutes les availabilities pour cette intervention
        const { data: allAvails, error: availError } = await supabase
          .from('user_availabilities')
          .select(`
            *,
            user:user_id(id, name, role)
          `)
          .eq('intervention_id', interventionId)

        console.log('📊 Query result:', { allAvails, availError })

        if (availError) {
          console.error('❌ Erreur récupération availabilities:', availError)
          setResults({ error: availError })
          setLoading(false)
          return
        }

        // 2. Vérifier l'intervention elle-même
        const { data: intervention, error: intError } = await supabase
          .from('interventions')
          .select('*')
          .eq('id', interventionId)
          .single()

        // 3. Vérifier tous les users avec role prestataire
        const { data: providers, error: provError } = await supabase
          .from('users')
          .select('id, name, role')
          .eq('role', 'prestataire')
          .eq('is_active', true)

        const debugResults = {
          intervention,
          availabilities: allAvails,
          availabilitiesCount: allAvails?.length || 0,
          providerAvails: allAvails?.filter(a => a.user?.role === 'prestataire') || [],
          providers,
          providersCount: providers?.length || 0,
          errors: {
            availError,
            intError,
            provError
          }
        }

        console.log('🔍 Debug results:', debugResults)
        setResults(debugResults)
      } catch (error) {
        console.error('❌ Erreur dans debug:', error)
        setResults({ error })
      } finally {
        setLoading(false)
      }
    }

    debugAvailabilities()
  }, [])

  if (loading) {
    return <div className="p-4">Chargement debug...</div>
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug User Availabilities</h1>

      {results?.error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Erreur:</strong> {JSON.stringify(results.error, null, 2)}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2">📊 Résumé</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Availabilities totales: {results?.availabilitiesCount || 0}</li>
              <li>Availabilities prestataire: {results?.providerAvails?.length || 0}</li>
              <li>Prestataires actifs en base: {results?.providersCount || 0}</li>
            </ul>
          </div>

          <div className="bg-white border rounded p-4">
            <h2 className="text-lg font-semibold mb-2">📋 Intervention</h2>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(results?.intervention, null, 2)}
            </pre>
          </div>

          <div className="bg-white border rounded p-4">
            <h2 className="text-lg font-semibold mb-2">📅 Availabilities</h2>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(results?.availabilities, null, 2)}
            </pre>
          </div>

          <div className="bg-white border rounded p-4">
            <h2 className="text-lg font-semibold mb-2">👷 Prestataires Actifs</h2>
            <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
              {JSON.stringify(results?.providers, null, 2)}
            </pre>
          </div>

          {(results?.errors?.availError || results?.errors?.intError || results?.errors?.provError) && (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <h2 className="text-lg font-semibold mb-2 text-red-800">❌ Erreurs</h2>
              <pre className="bg-red-100 p-3 rounded text-sm overflow-auto">
                {JSON.stringify(results.errors, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
