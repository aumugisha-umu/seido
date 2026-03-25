/**
 * Template Email - Payment failed
 *
 * Envoye quand un paiement Stripe echoue (invoice.payment_failed webhook)
 */

import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { PaymentFailedEmailProps } from '@/emails/utils/types'

export const PaymentFailedEmail = ({
  firstName,
  invoiceAmount,
  attemptCount,
  portalUrl,
}: PaymentFailedEmailProps) => {
  const isFirstAttempt = attemptCount <= 1
  const isLastWarning = attemptCount >= 3

  const subject = isLastWarning
    ? 'Action requise : paiement echoue'
    : 'Paiement echoue — mettez a jour votre moyen de paiement'

  return (
    <EmailLayout preview="Votre paiement SEIDO a echoue">
      <EmailHeader subject={subject} />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Nous n&apos;avons pas pu encaisser votre paiement
          de <strong>{invoiceAmount.toFixed(2)}EUR</strong> pour votre abonnement SEIDO.
        </Text>

        {isLastWarning && (
          <div className="bg-red-50 border-l-4 border-danger p-4 rounded mb-6">
            <Text className="text-gray-900 font-semibold text-sm m-0">
              Derniere tentative
            </Text>
            <Text className="text-gray-700 text-sm leading-relaxed mt-2 mb-0">
              C&apos;est la {attemptCount}e tentative echouee. Si le paiement n&apos;aboutit pas,
              votre abonnement sera suspendu et votre compte passera en lecture seule.
            </Text>
          </div>
        )}

        {isFirstAttempt && (
          <div className="bg-amber-50 border-l-4 border-warning p-4 rounded mb-6">
            <Text className="text-gray-700 text-sm leading-relaxed m-0">
              Pas d&apos;inquietude — cela arrive souvent avec les cartes bancaires.
              Stripe retentera automatiquement dans quelques jours. Vous pouvez aussi
              mettre a jour votre carte maintenant.
            </Text>
          </div>
        )}

        <EmailButton href={portalUrl} variant={isLastWarning ? 'danger' : 'primary'}>
          Mettre a jour mon moyen de paiement
        </EmailButton>

        <Text className="text-gray-500 text-sm leading-relaxed text-center mt-4 mb-0">
          Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, contactez-nous a support@seido-app.com
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

PaymentFailedEmail.PreviewProps = {
  firstName: 'Marie',
  teamName: 'Immo Bruxelles',
  invoiceAmount: 250.00,
  attemptCount: 1,
  billingUrl: 'https://seido-app.com/gestionnaire/settings/billing',
  portalUrl: 'https://billing.stripe.com/p/session/test_xxx',
} as PaymentFailedEmailProps

export default PaymentFailedEmail
