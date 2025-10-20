// ✅ Server Component (pas de "use client")
// Architecture Next.js 15 : Data Layer (Server) + UI Layer (Client)

import {
  createServerContactService,
  createServerBuildingService,
  createServerLotService,
  createServerInterventionService,
  createServerSupabaseClient,
  getServerSession,
  type Contact as ContactType,
  type Intervention as InterventionType,
  type Lot as LotType,
  type Building as BuildingType,
  type User as UserType
} from '@/lib/services'
import { ContactDetailsClient } from './contact-details-client'
import { notFound, redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Server Component : Contact Details Page
 *
 * Responsabilités :
 * - Fetch data côté serveur avec Server Services (SSR auth)
 * - Validation de l'accès utilisateur
 * - Gestion des erreurs 404
 * - Passage des données au Client Component via props
 *
 * Avantages :
 * - Performance : 0KB JavaScript client pour data fetching
 * - SEO : Données rendues côté serveur
 * - Sécurité : Auth SSR avec cookies()
 */
export default async function ContactDetailsPage({ params }: PageProps) {
  const resolvedParams = await params

  // ============================================================================
  // ÉTAPE 1 : Authentication & User Context
  // ============================================================================
  const session = await getServerSession()

  if (!session?.user) {
    redirect('/auth/login')
  }

  // Fetch user profile from database
  const supabase = await createServerSupabaseClient()
  const { data: currentUser, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', session.user.id)
    .single()

  if (userError || !currentUser) {
    console.error('❌ Error fetching user profile:', userError)
    redirect('/auth/login')
  }

  // ============================================================================
  // ÉTAPE 2 : Fetch Contact Data (Server-side avec SSR auth)
  // ============================================================================
  const { data: contact, error: contactError } = await supabase
    .from('users')
    .select('*')
    .eq('id', resolvedParams.id)
    .single()

  if (contactError || !contact) {
    console.error('❌ Error fetching contact:', contactError)
    notFound()
  }

  // ============================================================================
  // ÉTAPE 2.5 : Fetch Invitation Status (Same pattern as contacts list)
  // ============================================================================
  let invitationStatus: string | null = null

  if (contact.email && contact.team_id) {
    const { data: invitation } = await supabase
      .from('user_invitations')
      .select('status, expires_at')
      .eq('email', contact.email)
      .eq('team_id', contact.team_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()  // Use maybeSingle() to avoid error if not found

    if (invitation) {
      // Check if invitation has expired
      if (invitation.status === 'pending' && invitation.expires_at) {
        const now = new Date()
        const expiresAt = new Date(invitation.expires_at)
        invitationStatus = now > expiresAt ? 'expired' : invitation.status
      } else {
        invitationStatus = invitation.status
      }
    } else if (contact.auth_user_id) {
      // Contact has an account (linked to auth.users)
      invitationStatus = 'accepted'
    }
  }

  // ============================================================================
  // ÉTAPE 3 : Fetch Related Data (Parallel pour performance)
  // ============================================================================
  const [interventionsResult, buildingsResult, lotsResult] = await Promise.all([
    supabase.from('interventions').select('*, lot(*, building(*))'),
    supabase.from('buildings').select('*'),
    supabase.from('lots').select('*, building(*), lot_contacts(*, user(*))')
  ])

  const allInterventions = interventionsResult.data || []
  const allBuildings = buildingsResult.data || []
  const allLots = lotsResult.data || []

  // ============================================================================
  // ÉTAPE 4 : Filter Data by Contact Role (Business Logic Server-side)
  // ============================================================================

  // Filtrer les interventions selon le rôle du contact
  let interventions: InterventionType[] = []
  if (contact.role === 'prestataire') {
    // Prestataire : interventions assignées
    interventions = allInterventions.filter(i =>
      i.assigned_contact_id === contact.id &&
      i.lot?.building?.team_id === currentUser.team_id
    )
  } else if (contact.role === 'locataire') {
    // Locataire : interventions des lots où il habite
    const tenantLots = allLots.filter(lot =>
      lot.lot_contacts?.some(lc =>
        lc.user.id === contact.id &&
        (lc.user.role === 'locataire' || lc.assignment_type === 'tenant')
      )
    )
    const tenantLotIds = tenantLots.map(lot => lot.id)
    interventions = allInterventions.filter(i => tenantLotIds.includes(i.lot_id))
  } else if (contact.role === 'gestionnaire') {
    // Gestionnaire : toutes les interventions de l'équipe
    interventions = allInterventions.filter(i =>
      i.lot?.building?.team_id === currentUser.team_id
    )
  }

  // Filtrer les biens selon le rôle du contact
  let properties: Array<(LotType & { type: 'lot' }) | (BuildingType & { type: 'building' })> = []

  if (contact.role === 'locataire') {
    // Locataire : lots où il habite
    const tenantLots = allLots.filter(lot =>
      lot.lot_contacts?.some(lc =>
        lc.user.id === contact.id &&
        (lc.user.role === 'locataire' || lc.assignment_type === 'tenant')
      )
    )
    properties = tenantLots.map(lot => ({ ...lot, type: 'lot' as const }))
  } else if (contact.role === 'prestataire') {
    // Prestataire : lots où il intervient
    const providerInterventions = allInterventions.filter(i =>
      i.assigned_contact_id === contact.id &&
      i.lot?.building?.team_id === currentUser.team_id
    )
    const uniqueLotIds = [...new Set(providerInterventions.map(i => i.lot_id).filter(Boolean))]
    const relatedLots = allLots.filter(lot =>
      uniqueLotIds.includes(lot.id) &&
      lot.building?.team_id === currentUser.team_id
    )
    properties = relatedLots.map(lot => ({ ...lot, type: 'lot' as const }))
  } else if (contact.role === 'gestionnaire') {
    // Gestionnaire : tous les biens de l'équipe
    const teamBuildings = allBuildings.filter(building =>
      building.team_id === currentUser.team_id
    )
    const teamLots = allLots.filter(lot =>
      lot.building?.team_id === currentUser.team_id
    )

    properties = [
      ...teamBuildings.map(building => ({ ...building, type: 'building' as const })),
      ...teamLots.map(lot => ({ ...lot, type: 'lot' as const }))
    ]
  }

  // ============================================================================
  // ÉTAPE 5 : Render Client Component avec Initial Data
  // ============================================================================
  return (
    <ContactDetailsClient
      contactId={resolvedParams.id}
      initialContact={contact}
      initialInterventions={interventions}
      initialProperties={properties}
      initialInvitationStatus={invitationStatus}
      currentUser={{
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
        team_id: currentUser.team_id
      }}
    />
  )
}
