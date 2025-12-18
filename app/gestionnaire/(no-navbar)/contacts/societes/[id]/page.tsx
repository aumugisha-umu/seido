// ✅ Server Component (pas de "use client")
// Architecture Next.js 15 : Data Layer (Server) + UI Layer (Client)

import { getServerAuthContext } from '@/lib/server-context'
import { CompanyDetailsClient } from './company-details-client'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Server Component : Company Details Page
 *
 * Responsabilités :
 * - Fetch data côté serveur avec Supabase SSR auth
 * - Validation de l'accès utilisateur
 * - Gestion des erreurs 404
 * - Passage des données au Client Component via props
 */
export default async function CompanyDetailsPage({ params }: PageProps) {
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
  // ÉTAPE 3 : Fetch Associated Contacts
  // ============================================================================
  const { data: associatedContacts } = await supabase
    .from('users')
    .select('id, name, email, phone, role')
    .eq('company_id', company.id)
    .eq('team_id', team.id)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  // ============================================================================
  // ÉTAPE 4 : Render Client Component
  // ============================================================================
  return (
    <CompanyDetailsClient
      company={company}
      associatedContacts={associatedContacts || []}
      currentUserId={currentUser.id}
    />
  )
}
