/**
 * Template Email - Value report (J+14)
 *
 * Envoye 14 jours apres inscription avec les metriques de valeur
 */

import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { ValueReportEmailProps } from '@/emails/utils/types'

export const ValueReportEmail = ({
  firstName,
  completedInterventions,
  hoursSaved,
  moneySaved,
  lotCount,
  daysLeft,
  billingUrl,
}: ValueReportEmailProps) => {
  return (
    <EmailLayout preview={`${firstName}, vous avez economise ${Math.round(moneySaved)}EUR avec SEIDO`}>
      <EmailHeader subject="Votre rapport de valeur SEIDO" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Apres 2 semaines d&apos;utilisation, voici la valeur que SEIDO vous a apportee :
        </Text>

        {/* Value metrics */}
        <table width="100%" cellPadding="0" cellSpacing="0" border={0} className="mb-6">
          <tr>
            <td style={{ width: '33%', padding: '8px', textAlign: 'center' }}>
              <div className="bg-blue-50 rounded-lg p-4">
                <Text className="text-2xl font-bold text-blue-600 m-0">{completedInterventions}</Text>
                <Text className="text-xs text-gray-500 m-0">interventions cloturees</Text>
              </div>
            </td>
            <td style={{ width: '33%', padding: '8px', textAlign: 'center' }}>
              <div className="bg-green-50 rounded-lg p-4">
                <Text className="text-2xl font-bold text-green-600 m-0">{hoursSaved.toFixed(1)}h</Text>
                <Text className="text-xs text-gray-500 m-0">economisees</Text>
              </div>
            </td>
            <td style={{ width: '33%', padding: '8px', textAlign: 'center' }}>
              <div className="bg-purple-50 rounded-lg p-4">
                <Text className="text-2xl font-bold text-purple-600 m-0">{Math.round(moneySaved)}EUR</Text>
                <Text className="text-xs text-gray-500 m-0">equivalent</Text>
              </div>
            </td>
          </tr>
        </table>

        <Text className="text-gray-500 text-xs text-center mb-5">
          Calcul : 30 min/intervention x 45EUR/h
        </Text>

        <div className="bg-blue-50 border-l-4 border-primary p-4 rounded mb-6">
          <Text className="text-gray-700 text-sm leading-relaxed m-0">
            Vous gerez <strong>{lotCount} lots</strong>. Il vous reste <strong>{daysLeft} jours</strong> d&apos;essai.
            Choisissez un plan pour continuer a beneficier de SEIDO.
          </Text>
        </div>

        <EmailButton href={billingUrl}>
          Choisir le plan annuel
        </EmailButton>

        <Text className="text-gray-500 text-xs leading-relaxed text-center m-0">
          Prix HT. TVA applicable en sus.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

ValueReportEmail.PreviewProps = {
  firstName: 'Marie',
  teamName: 'Immo Bruxelles',
  completedInterventions: 8,
  hoursSaved: 4.0,
  moneySaved: 180,
  lotCount: 5,
  daysLeft: 16,
  billingUrl: 'https://seido-app.com/gestionnaire/settings/billing',
} as ValueReportEmailProps

export default ValueReportEmail
