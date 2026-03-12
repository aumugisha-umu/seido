import { ContactsPageClient } from './contacts-page-client'
import {
  createServerContactService,
  createServerSupabaseClient
} from '@/lib/services'
import { createServerCompanyRepository } from '@/lib/services/repositories/company.repository'
import { logger } from '@/lib/logger'
import { getServerAuthContext } from '@/lib/server-context'
import { buildInvitationStatusMap } from '@/lib/utils/invitation-status'

// ✅ Force dynamic rendering - cette page dépend toujours de la session
export const dynamic = 'force-dynamic'

export default async function ContactsPage() {
  try {
    // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
    logger.info("🔵 [CONTACTS-PAGE] Server-side fetch starting")
    const { user, profile, team, activeTeamIds, isConsolidatedView } = await getServerAuthContext('gestionnaire')

    // ✅ Defensive guard in case team is unexpectedly missing
    if (!team || !team.id) {
      logger.warn('⚠️ [CONTACTS-PAGE] Missing team in auth context, rendering empty state')
      return (
        <ContactsPageClient
          initialContacts={[]}
          initialInvitations={[]}
          initialCompanies={[]}
          initialContactsInvitationStatus={{}}
          pendingInvitationsCount={0}
          userTeam={{ id: '', name: '' }}
          user={{ id: user?.id ?? '', email: user?.email ?? '' }}
        />
      )
    }

    // ✅ Create services in parallel
    const [contactService, companyRepository, supabase] = await Promise.all([
      createServerContactService(),
      createServerCompanyRepository(),
      createServerSupabaseClient()
    ])

    // ✅ Parallel data fetching (Dashboard pattern)
    let contacts: any[] = []
    let allInvitations: any[] = []
    let companies: any[] = []

    // ✅ MULTI-ÉQUIPE: Vue consolidée = fetch de toutes les équipes actives
    if (isConsolidatedView && activeTeamIds.length > 1) {
      logger.info(`🔄 [CONTACTS-PAGE] Consolidated view - fetching from ${activeTeamIds.length} teams`)

      // Fetch data from all teams in parallel
      const [contactsResults, invitationsResults, companiesResults] = await Promise.all([
        Promise.all(
          activeTeamIds.map(teamId => contactService.getContactsByTeam(teamId, undefined, profile.id))
        ),
        Promise.all(
          activeTeamIds.map(teamId =>
            supabase
              .from('user_invitations')
              .select('*')
              .eq('team_id', teamId)
              .order('created_at', { ascending: false })
          )
        ),
        Promise.all(
          activeTeamIds.map(teamId => companyRepository.findByTeam(teamId))
        )
      ])

      // Merge contacts
      contacts = contactsResults
        .filter(r => r.success && r.data)
        .flatMap(r => r.data || [])

      // Merge invitations
      allInvitations = invitationsResults
        .filter(r => !r.error && r.data)
        .flatMap(r => r.data || [])

      // Merge companies
      companies = companiesResults
        .filter(r => r.success && r.data)
        .flatMap(r => r.data || [])

      logger.info(`✅ [CONTACTS-PAGE] Consolidated: ${contacts.length} contacts, ${allInvitations.length} invitations, ${companies.length} companies from ${activeTeamIds.length} teams`)
    } else {
      // ✅ Vue standard: une seule équipe
      const [contactsResult, invitationsResult, companiesResult] = await Promise.allSettled([
        contactService.getContactsByTeam(team.id, undefined, profile.id), // ✅ Exclude current user (using profile.id from users table)
        // ✅ Fetch ALL invitations (not just pending) for proper status mapping
        // This ensures expired invitations are correctly detected
        supabase
          .from('user_invitations')
          .select('*')
          .eq('team_id', team.id)
          .order('created_at', { ascending: false }),
        companyRepository.findByTeam(team.id)
      ])

      // Process contacts result
      if (contactsResult.status === 'fulfilled' && contactsResult.value.success && contactsResult.value.data) {
        contacts = contactsResult.value.data
        logger.info(`✅ [CONTACTS-PAGE] Loaded ${contacts.length} contacts`)
      } else {
        logger.error('❌ [CONTACTS-PAGE] Failed to load contacts:',
          contactsResult.status === 'rejected' ? contactsResult.reason : 'No data')
      }

      // Process invitations result
      if (invitationsResult.status === 'fulfilled' && !invitationsResult.value.error) {
        allInvitations = invitationsResult.value.data || []
        logger.info(`✅ [CONTACTS-PAGE] Loaded ${allInvitations.length} invitations (all statuses)`)
      } else {
        const errorDetail = invitationsResult.status === 'rejected'
          ? invitationsResult.reason
          : invitationsResult.value.error

        logger.error('❌ [CONTACTS-PAGE] Failed to load invitations:', {
          status: invitationsResult.status,
          error: errorDetail,
          message: errorDetail?.message || String(errorDetail),
          code: errorDetail?.code,
          details: errorDetail?.details
        })
      }

      // Process companies result
      if (companiesResult.status === 'fulfilled' && companiesResult.value.success && companiesResult.value.data) {
        companies = companiesResult.value.data
        logger.info(`✅ [CONTACTS-PAGE] Loaded ${companies.length} companies`)
      } else {
        logger.error('❌ [CONTACTS-PAGE] Failed to load companies:',
          companiesResult.status === 'rejected' ? companiesResult.reason : 'No data')
      }
    }

    // ✅ Build invitation status map using unified utility (checks expires_at)
    // Source of truth: user_invitations table only (no auth_user_id fallback)
    const contactsInvitationStatus = buildInvitationStatusMap(allInvitations)

    // ✅ Normalize invitations with effectiveStatus (accounts for expires_at)
    // An invitation with status='pending' but expires_at in the past is effectively 'expired'
    const now = new Date()
    const invitationsWithEffectiveStatus = allInvitations.map((inv: any) => {
      let effectiveStatus = inv.status
      if (inv.status === 'pending' && inv.expires_at && new Date(inv.expires_at) < now) {
        effectiveStatus = 'expired'
      }
      return { ...inv, effectiveStatus }
    })

    // ✅ Count pending invitations (not expired) for badge display
    const pendingInvitationsCount = invitationsWithEffectiveStatus.filter(
      (inv: any) => inv.effectiveStatus === 'pending'
    ).length

    logger.info(`📊 [CONTACTS-PAGE] Server data ready - Contacts: ${contacts.length}, All Invitations: ${allInvitations.length}, Pending: ${pendingInvitationsCount}, Companies: ${companies.length}`)

    // ✅ Pass data to Client Component
    // Now passing ALL invitations with effectiveStatus + pending count for badge
    return (
      <ContactsPageClient
        initialContacts={contacts}
        initialInvitations={invitationsWithEffectiveStatus}
        initialCompanies={companies}
        initialContactsInvitationStatus={contactsInvitationStatus}
        pendingInvitationsCount={pendingInvitationsCount}
        userTeam={{
          id: team.id,
          name: team.name
        }}
        user={{
          id: user.id,
          email: user.email
        }}
      />
    )
  } catch (error) {
    logger.error("❌ [CONTACTS-PAGE] Server error:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    })

    // Re-throw NEXT_REDIRECT errors
    if (error && typeof error === 'object' && 'digest' in error &&
        typeof error.digest === 'string' && error.digest.startsWith('NEXT_REDIRECT')) {
      throw error
    }

    // For other errors, render empty state
    return (
      <ContactsPageClient
        initialContacts={[]}
        initialInvitations={[]}
        initialCompanies={[]}
        initialContactsInvitationStatus={{}}
        pendingInvitationsCount={0}
        userTeam={{ id: '' }}
        user={{ id: '' }}
      />
    )
  }
}
