/**
 * Page Détail Contact - Mode Démo
 * Affiche les informations détaillées d'un contact
 */

'use client'

import { use } from 'react'
import { notFound } from 'next/navigation'
import { useDemoContact, useDemoContactInterventions, useDemoContactProperties } from '@/hooks/demo/use-demo-contacts'
import { useDemoContext } from '@/lib/demo/demo-context'
import { ContactDetailsClient } from '@/app/gestionnaire/contacts/details/[id]/contact-details-client'

export default function ContactDetailPageDemo({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { getCurrentUser } = useDemoContext()
  const currentUser = getCurrentUser()

  const { contact } = useDemoContact(id)
  const { interventions } = useDemoContactInterventions(id)
  const { properties } = useDemoContactProperties(id)

  if (!contact) {
    notFound()
  }

  // Mock invitation status based on contact data
  const invitationStatus = contact.auth_user_id ? 'accepted' : null

  return (
    <ContactDetailsClient
      contactId={id}
      initialContact={contact}
      initialInterventions={interventions}
      initialProperties={properties}
      initialInvitationStatus={invitationStatus}
      currentUser={{
        id: currentUser?.id || '',
        email: currentUser?.email || '',
        role: currentUser?.role || 'gestionnaire',
        team_id: currentUser?.team_id || ''
      }}
    />
  )
}
