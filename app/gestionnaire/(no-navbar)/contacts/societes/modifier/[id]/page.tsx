// ✅ Server Component (pas de "use client")
// Architecture Next.js 15 : Data Layer (Server) + UI Layer (Client)

import { getServerAuthContext } from '@/lib/server-context'
import { CompanyEditClient } from './company-edit-client'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Server Component : Company Edit Page
 *
 * Responsabilités :
 * - Fetch data côté serveur avec Supabase SSR auth
 * - Validation de l'accès utilisateur
 * - Gestion des erreurs 404
 * - Passage des données au Client Component via props
 */
export default async function CompanyEditPage({ params }: PageProps) {
  const resolvedParams = await params

  // ============================================================================
  // ÉTAPE 1 : Authentication & User Context
  // ============================================================================
  const { profile: currentUser, supabase, team } = await getServerAuthContext('gestionnaire')

  // ============================================================================
  // ÉTAPE 2 : Fetch Company Data
  // ============================================================================
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', resolvedParams.id)
    .eq('team_id', team.id)
    .is('deleted_at', null)
    .single()

  if (companyError || !company) {
    console.error('❌ Error fetching company:', companyError)
    notFound()
  }

  // ============================================================================
  // ÉTAPE 3 : Render Client Component
  // ============================================================================
  return (
    <CompanyEditClient
      company={company}
      teamId={team.id}
    />
  )
}
