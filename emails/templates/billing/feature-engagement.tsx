/**
 * Template Email - Feature engagement (J+7)
 *
 * Envoye 7 jours apres inscription pour montrer les features utilisees
 */

import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { FeatureEngagementEmailProps } from '@/emails/utils/types'

export const FeatureEngagementEmail = ({
  firstName,
  interventionCount,
  lotCount,
  daysLeft,
  billingUrl,
}: FeatureEngagementEmailProps) => {
  return (
    <EmailLayout preview={`${firstName}, decouvrez ce que SEIDO peut faire pour vous`}>
      <EmailHeader subject="Votre premiere semaine avec SEIDO" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Cela fait une semaine que vous utilisez SEIDO. Voici un apercu de votre activite :
        </Text>

        {/* Stats grid */}
        <table width="100%" cellPadding="0" cellSpacing="0" border={0} className="mb-6">
          <tr>
            <td style={{ width: '50%', padding: '12px', textAlign: 'center' }}>
              <div className="bg-blue-50 rounded-lg p-4">
                <Text className="text-2xl font-bold text-blue-600 m-0">{lotCount}</Text>
                <Text className="text-xs text-gray-500 m-0">lots geres</Text>
              </div>
            </td>
            <td style={{ width: '50%', padding: '12px', textAlign: 'center' }}>
              <div className="bg-green-50 rounded-lg p-4">
                <Text className="text-2xl font-bold text-green-600 m-0">{interventionCount}</Text>
                <Text className="text-xs text-gray-500 m-0">interventions creees</Text>
              </div>
            </td>
          </tr>
        </table>

        {interventionCount === 0 && (
          <div className="bg-amber-50 border-l-4 border-warning p-4 rounded mb-6">
            <Text className="text-gray-700 text-sm leading-relaxed m-0">
              Vous n&apos;avez pas encore cree d&apos;intervention. Essayez de creer votre premiere
              demande pour decouvrir le workflow complet !
            </Text>
          </div>
        )}

        {interventionCount > 0 && (
          <div className="bg-green-50 border-l-4 border-accent p-4 rounded mb-6">
            <Text className="text-gray-700 text-sm leading-relaxed m-0">
              Vous avez deja cree {interventionCount} intervention{interventionCount > 1 ? 's' : ''}.
              Continuez sur cette lancee !
            </Text>
          </div>
        )}

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Il vous reste <strong>{daysLeft} jours</strong> d&apos;essai gratuit.
          Explorez toutes les fonctionnalites sans restriction.
        </Text>

        <EmailButton href={billingUrl}>
          Choisir un plan annuel
        </EmailButton>

        <Text className="text-gray-500 text-xs leading-relaxed text-center m-0">
          Prix HT. TVA applicable en sus.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

FeatureEngagementEmail.PreviewProps = {
  firstName: 'Marie',
  teamName: 'Immo Bruxelles',
  interventionCount: 3,
  lotCount: 5,
  daysLeft: 23,
  billingUrl: 'https://seido.app/gestionnaire/settings/billing',
} as FeatureEngagementEmailProps

export default FeatureEngagementEmail
