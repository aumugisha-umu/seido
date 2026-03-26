/**
 * Template Email - Trial prolonge (notification au gestionnaire)
 *
 * Envoye quand l'admin SEIDO prolonge l'essai gratuit d'une equipe
 */

import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { TrialExtendedEmailProps } from '@/emails/utils/types'

export const TrialExtendedEmail = ({
  firstName,
  teamName,
  newTrialEnd,
  daysAdded,
  dashboardUrl,
}: TrialExtendedEmailProps) => {
  const formattedDate = new Date(newTrialEnd).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <EmailLayout preview={`Votre essai SEIDO a ete prolonge de ${daysAdded} jours`}>
      <EmailHeader subject="Bonne nouvelle !" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          L'essai gratuit de votre equipe <strong>{teamName}</strong> a ete prolonge.
        </Text>

        {/* Key info highlight */}
        <div style={{ marginBottom: '24px', padding: '16px 20px', backgroundColor: '#f0fdf4', borderRadius: '8px', borderLeft: '4px solid #22c55e' }}>
          <Text style={{ fontSize: '14px', color: '#15803d', fontWeight: 600, marginTop: 0, marginBottom: '8px' }}>
            +{daysAdded} jours supplementaires
          </Text>
          <Text style={{ fontSize: '15px', color: '#111827', margin: 0 }}>
            Nouvelle date de fin : <strong>{formattedDate}</strong>
          </Text>
        </div>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Profitez de ce temps supplementaire pour explorer toutes les fonctionnalites de SEIDO
          et decouvrir comment simplifier la gestion de votre patrimoine immobilier.
        </Text>

        <EmailButton href={dashboardUrl}>
          Acceder a mon espace
        </EmailButton>

        {/* Help section */}
        <div className="bg-gray-50 p-5 rounded-lg mb-6">
          <Text className="text-gray-600 text-sm leading-relaxed m-0">
            Des questions ? Notre equipe est disponible pour vous accompagner
            dans votre prise en main de SEIDO.
          </Text>
        </div>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

TrialExtendedEmail.PreviewProps = {
  firstName: 'Marie',
  teamName: 'Immo Bruxelles SA',
  newTrialEnd: new Date('2026-05-01'),
  daysAdded: 14,
  dashboardUrl: 'https://seido-app.com/gestionnaire/dashboard',
} as TrialExtendedEmailProps

export default TrialExtendedEmail
