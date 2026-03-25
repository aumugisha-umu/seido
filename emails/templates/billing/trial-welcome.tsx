/**
 * Template Email - Bienvenue essai (J+1)
 *
 * Envoye le lendemain de l'inscription pour accueillir et orienter
 */

import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { TrialWelcomeEmailProps } from '@/emails/utils/types'

export const TrialWelcomeEmail = ({
  firstName,
  teamName,
  daysLeft,
  dashboardUrl,
}: TrialWelcomeEmailProps) => {
  return (
    <EmailLayout preview={`Bienvenue ${firstName} ! Votre essai de ${daysLeft} jours commence.`}>
      <EmailHeader subject="Bienvenue sur SEIDO !" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Votre essai gratuit de <strong>{daysLeft} jours</strong> pour
          l&apos;equipe <strong>{teamName}</strong> vient de commencer.
          Toutes les fonctionnalites sont deverrouillees pendant cette periode.
        </Text>

        <div className="bg-blue-50 border-l-4 border-primary p-4 rounded mb-6">
          <Text className="text-gray-700 text-sm leading-relaxed m-0">
            <strong>Commencez par :</strong>
          </Text>
          <ul className="text-gray-700 text-sm leading-relaxed pl-5 mt-2 mb-0">
            <li>Ajoutez vos immeubles et lots</li>
            <li>Invitez vos prestataires et locataires</li>
            <li>Creez votre premiere intervention</li>
          </ul>
        </div>

        <EmailButton href={dashboardUrl}>
          Acceder a mon tableau de bord
        </EmailButton>

        <Text className="text-gray-500 text-sm leading-relaxed text-center m-0">
          Vous avez {daysLeft} jours pour explorer SEIDO sans engagement.
          Aucune carte bancaire requise.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

TrialWelcomeEmail.PreviewProps = {
  firstName: 'Marie',
  teamName: 'Immo Bruxelles',
  daysLeft: 30,
  billingUrl: 'https://seido-app.com/gestionnaire/settings/billing',
  dashboardUrl: 'https://seido-app.com/gestionnaire/dashboard',
} as TrialWelcomeEmailProps

export default TrialWelcomeEmail
