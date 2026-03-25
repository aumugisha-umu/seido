/**
 * 📧 Template Email - Invitation à rejoindre une équipe
 *
 * Envoyé lorsqu'un gestionnaire invite un contact à rejoindre SEIDO
 * Objectif: Inviter à créer un compte avec rôle pré-attribué
 */

import * as React from 'react'
import { Section, Text, Heading, Link } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { InvitationEmailProps } from '@/emails/utils/types'

export const InvitationEmail = ({
  firstName,
  inviterName,
  teamName,
  role,
  invitationUrl,
  expiresIn = 7,
}: InvitationEmailProps) => {
  // Messages personnalisés selon le rôle
  const roleDescriptions = {
    admin: {
      title: 'Administrateur',
      description: 'Vous aurez accès à toutes les fonctionnalités d\'administration de la plateforme.',
    },
    gestionnaire: {
      title: 'Gestionnaire',
      description: 'Vous pourrez gérer les biens, interventions et équipes.',
    },
    prestataire: {
      title: 'Prestataire',
      description: 'Vous recevrez des demandes d\'intervention et pourrez en faire le suivi complet.',
    },
    locataire: {
      title: 'Locataire',
      description: 'Vous pourrez soumettre des demandes d\'intervention pour votre logement et suivre leur progression.',
    },
    proprietaire: {
      title: 'Propriétaire',
      description: 'Vous pourrez consulter vos biens et suivre les interventions associées.',
    },
  }

  const roleInfo = roleDescriptions[role]

  return (
    <EmailLayout preview={`${inviterName} vous invite à le rejoindre sur SEIDO`}>
      {/* Header avec sujet */}
      <EmailHeader subject={`Invitation de ${inviterName}`} />

      {/* Contenu principal */}
      <Section className="bg-white px-8 py-8">
        {/* Message principal */}
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          <strong>{inviterName}</strong> vous invite sur SEIDO, la plateforme de gestion immobilière collaborative.
        </Text>

        {/* Informations sur le rôle */}
        <div className="bg-blue-50 border-l-4 border-primary p-4 rounded mb-6">
          <Text className="text-gray-900 font-semibold text-sm mb-2 mt-0">
            Votre rôle : {roleInfo.title}
          </Text>
          <Text className="text-gray-700 text-sm leading-relaxed m-0">
            {roleInfo.description}
          </Text>
        </div>


        {/* Bouton CTA */}
        <EmailButton href={invitationUrl}>
          Accepter l'invitation
        </EmailButton>

        {/* Lien de secours */}
        <Text className="text-gray-600 text-sm leading-relaxed mb-6">
          Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
        </Text>

        <Text className="text-primary text-sm break-all mb-8">
          <Link href={invitationUrl} className="text-primary no-underline">
            {invitationUrl}
          </Link>
        </Text>

        {/* Alerte expiration */}
        <div className="bg-amber-50 border-l-4 border-warning p-4 rounded mb-6">
          <Text className="text-gray-700 text-sm leading-relaxed m-0">
            <strong>⏱️ Important :</strong> Cette invitation est valide pendant{' '}
            <strong>{expiresIn} jours</strong>. Après ce délai, vous devrez demander
            une nouvelle invitation.
          </Text>
        </div>

        {/* Note sécurité */}
        <Text className="text-gray-500 text-xs leading-relaxed m-0">
          Si vous n'attendiez pas cette invitation ou si vous ne connaissez pas {inviterName},
          vous pouvez ignorer cet email en toute sécurité.
        </Text>
      </Section>

      {/* Footer */}
      <EmailFooter />
    </EmailLayout>
  )
}

// Props par défaut pour prévisualisation
InvitationEmail.PreviewProps = {
  firstName: 'Thomas',
  inviterName: 'Marie Dupont',
  teamName: 'Résidence Les Jardins',
  role: 'prestataire',
  invitationUrl: 'https://seido-app.com/auth/signup?invitation=abc123',
  expiresIn: 7,
} as InvitationEmailProps

export default InvitationEmail
