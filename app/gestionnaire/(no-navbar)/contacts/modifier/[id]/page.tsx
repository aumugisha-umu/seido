import { getServerAuthContext } from '@/lib/server-context'
import { createServerContactService, createServerSupabaseClient } from '@/lib/services'
import { createServerCompanyRepository } from '@/lib/services/repositories/company.repository'
import { logger } from '@/lib/logger'
import { EditContactClient } from './edit-contact-client'
import { notFound, redirect } from 'next/navigation'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function EditContactPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  try {
    logger.info("🔵 [EDIT-CONTACT-PAGE] Server-side fetch starting")

    // 1. Auth & Team context
    const { user, team } = await getServerAuthContext('gestionnaire')

    if (!team || !team.id) {
      logger.warn('⚠️ [EDIT-CONTACT-PAGE] Missing team in auth context')
      redirect('/auth/login')
    }

    const { id } = await params
    logger.info(`🔍 [EDIT-CONTACT-PAGE] Fetching contact with ID: ${id} for team: ${team.id}`)

    // 2. Fetch Contact Data (via team_members to respect RLS)
    const contactService = await createServerContactService()
    const contactResult = await contactService.findContactInTeam(team.id, id)

    logger.info(`🔍 [EDIT-CONTACT-PAGE] Service result: success=${contactResult.success}, data=${contactResult.data ? 'found' : 'null'}`)

    if (!contactResult.success || !contactResult.data) {
      logger.warn(`⚠️ [EDIT-CONTACT-PAGE] Contact not found: ${id}`)
      notFound()
    }

    const contact = contactResult.data

    // Verify team ownership
    if (contact.team_id !== team.id) {
      logger.warn(`⚠️ [EDIT-CONTACT-PAGE] Unauthorized access attempt to contact ${id} by team ${team.id}`)
      notFound()
    }

    // 3. Fetch Companies (for the company selector)
    const companyRepository = await createServerCompanyRepository()
    let companies: any[] = []
    const companiesResult = await companyRepository.findActiveByTeam(team.id)

    if (companiesResult.success && companiesResult.data) {
      companies = companiesResult.data
    }

    logger.info(`✅ [EDIT-CONTACT-PAGE] Data loaded for contact: ${contact.id}`)

    // 4. Render Client Component
    return (
      <EditContactClient
        contactId={contact.id}
        initialData={contact}
        initialCompanies={companies}
        teamId={team.id}
      />
    )

  } catch (error) {
    logger.error("❌ [EDIT-CONTACT-PAGE] Server error:", error)

    // Handle redirects specifically
    if (error && typeof error === 'object' && 'digest' in error &&
      (error as any).digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }

    throw error
  }
}
