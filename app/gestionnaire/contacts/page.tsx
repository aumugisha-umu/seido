import { ContactsPageClient } from './contacts-page-client'
import {
  createServerContactService,
  createServerSupabaseClient
} from '@/lib/services'
import { logger } from '@/lib/logger'
import { getServerAuthContext } from '@/lib/server-context'

// ✅ Force dynamic rendering - cette page dépend toujours de la session
export const dynamic = 'force-dynamic'

export default async function ContactsPage() {
  try {
    // ✅ AUTH + TEAM en 1 ligne (cached via React.cache())
    logger.info("🔵 [CONTACTS-PAGE] Server-side fetch starting")
    const { user, team } = await getServerAuthContext('gestionnaire')

    // ✅ Create services
    const contactService = await createServerContactService()

    // ✅ Parallel data fetching (Dashboard pattern)
    let contacts: any[] = []
    let pendingInvitations: any[] = []

    const supabase = await createServerSupabaseClient()

    const [contactsResult, invitationsResult] = await Promise.allSettled([
      contactService.getContactsByTeam(team.id),
      supabase
        .from('user_invitations')
        .select('*')
        .eq('team_id', team.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
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
      pendingInvitations = invitationsResult.value.data || []
      logger.info(`✅ [CONTACTS-PAGE] Loaded ${pendingInvitations.length} invitations`)
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

    // ✅ Build invitation status map
    const contactsInvitationStatus: Record<string, string> = {}

    // Map all invitations by email
    for (const invitation of pendingInvitations) {
      if (invitation.email) {
        contactsInvitationStatus[invitation.email.toLowerCase()] = invitation.status || 'pending'
      }
    }

    // Also check contacts with user_id (they have accounts)
    for (const contact of contacts) {
      if (contact.email && contact.user_id) {
        // Contact has an active account
        contactsInvitationStatus[contact.email.toLowerCase()] = 'accepted'
      }
    }

    logger.info(`📊 [CONTACTS-PAGE] Server data ready - Contacts: ${contacts.length}, Invitations: ${pendingInvitations.length}`)

    // ✅ Pass data to Client Component
    return (
      <ContactsPageClient
        initialContacts={contacts}
        initialInvitations={pendingInvitations}
        initialContactsInvitationStatus={contactsInvitationStatus}
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
        initialContactsInvitationStatus={{}}
        userTeam={{ id: '' }}
        user={{ id: '' }}
      />
    )
  }
}
