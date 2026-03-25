/**
 * Template Email - Subscription activated
 *
 * Envoye apres le premier paiement reussi (checkout.session.completed)
 */

import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { SubscriptionActivatedEmailProps } from '@/emails/utils/types'

export const SubscriptionActivatedEmail = ({
  firstName,
  plan,
  lotCount,
  amountHT,
  nextRenewalDate,
  dashboardUrl,
}: SubscriptionActivatedEmailProps) => {
  const planLabel = plan === 'annual' ? 'Annuel' : 'Mensuel'

  return (
    <EmailLayout preview="Votre abonnement SEIDO est actif !">
      <EmailHeader subject="Abonnement active !" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Merci pour votre confiance ! Votre abonnement SEIDO est desormais actif.
          Vous beneficiez d&apos;un acces complet a toutes les fonctionnalites.
        </Text>

        {/* Subscription details */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <Text className="text-green-800 font-semibold text-base mb-3 mt-0">
            Recapitulatif
          </Text>
          <table width="100%" cellPadding="0" cellSpacing="0" border={0}>
            <tr>
              <td style={{ padding: '4px 0' }}>
                <Text className="text-gray-600 text-sm m-0">Plan</Text>
              </td>
              <td style={{ padding: '4px 0', textAlign: 'right' }}>
                <Text className="text-gray-900 text-sm font-semibold m-0">{planLabel}</Text>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}>
                <Text className="text-gray-600 text-sm m-0">Lots couverts</Text>
              </td>
              <td style={{ padding: '4px 0', textAlign: 'right' }}>
                <Text className="text-gray-900 text-sm font-semibold m-0">{lotCount}</Text>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}>
                <Text className="text-gray-600 text-sm m-0">Montant HT</Text>
              </td>
              <td style={{ padding: '4px 0', textAlign: 'right' }}>
                <Text className="text-gray-900 text-sm font-semibold m-0">
                  {amountHT.toFixed(2)}EUR/{plan === 'annual' ? 'an' : 'mois'}
                </Text>
              </td>
            </tr>
            <tr>
              <td style={{ padding: '4px 0' }}>
                <Text className="text-gray-600 text-sm m-0">Prochain renouvellement</Text>
              </td>
              <td style={{ padding: '4px 0', textAlign: 'right' }}>
                <Text className="text-gray-900 text-sm font-semibold m-0">{nextRenewalDate}</Text>
              </td>
            </tr>
          </table>
          <Text className="text-gray-400 text-xs mt-3 mb-0">
            TVA applicable en sus.
          </Text>
        </div>

        <EmailButton href={dashboardUrl}>
          Acceder a mon tableau de bord
        </EmailButton>

        <Text className="text-gray-500 text-sm leading-relaxed text-center mt-4 mb-0">
          Gerez votre abonnement et vos factures depuis la page Abonnement dans vos parametres.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

SubscriptionActivatedEmail.PreviewProps = {
  firstName: 'Marie',
  teamName: 'Immo Bruxelles',
  plan: 'annual',
  lotCount: 5,
  amountHT: 250.00,
  nextRenewalDate: '21 fevrier 2027',
  billingUrl: 'https://seido-app.com/gestionnaire/settings/billing',
  dashboardUrl: 'https://seido-app.com/gestionnaire/dashboard',
} as SubscriptionActivatedEmailProps

export default SubscriptionActivatedEmail
