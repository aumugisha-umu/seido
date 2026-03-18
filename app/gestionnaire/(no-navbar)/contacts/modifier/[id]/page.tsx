import { getServerAuthContext } from '@/lib/server-context'
import { createServerContactService } from '@/lib/services'
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

    // Phase 0: Auth + params in parallel
    const [{ user, team }, { id }] = await Promise.all([
      getServerAuthContext('gestionnaire'),
      params
    ])

    if (!team || !team.id) {
      logger.warn('⚠️ [EDIT-CONTACT-PAGE] Missing team in auth context')
      redirect('/auth/login')
    }

    logger.info(`🔍 [EDIT-CONTACT-PAGE] Fetching contact with ID: ${id} for team: ${team.id}`)

    // Phase 1: Create services in parallel
    const [contactService, companyRepository] = await Promise.all([
      createServerContactService(),
      createServerCompanyRepository()
    ])

    // Phase 2: Fetch contact + companies in parallel (companies only needs team.id)
    const [contactResult, companiesResult] = await Promise.all([
      contactService.findContactInTeam(team.id, id),
      companyRepository.findActiveByTeam(team.id)
    ])

    logger.info(`🔍 [EDIT-CONTACT-PAGE] Service result: success=${contactResult.success}, data=${contactResult.data ? 'found' : 'null'}`)

    if (!contactResult.success || !contactResult.data) {
      logger.warn(`⚠️ [EDIT-CONTACT-PAGE] Contact not found: ${id}`)
      notFound()
    }

    const contact = contactResult.data

    if (contact.team_id !== team.id) {
      logger.warn(`⚠️ [EDIT-CONTACT-PAGE] Unauthorized access attempt to contact ${id} by team ${team.id}`)
      notFound()
    }

    const companies = companiesResult.success && companiesResult.data
      ? companiesResult.data
      : []

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
