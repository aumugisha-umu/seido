/**
 * Template Email - Trial expired (J+0)
 *
 * Envoye le jour de l'expiration de l'essai
 */

import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { TrialExpiredEmailProps } from '@/emails/utils/types'

export const TrialExpiredEmail = ({
  firstName,
  lotCount,
  isReadOnly,
  billingUrl,
}: TrialExpiredEmailProps) => {
  return (
    <EmailLayout preview="Votre essai SEIDO est termine">
      <EmailHeader subject="Votre essai est termine" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Votre essai gratuit de 30 jours est arrive a son terme.
        </Text>

        {isReadOnly ? (
          <div className="bg-red-50 border-l-4 border-danger p-4 rounded mb-6">
            <Text className="text-gray-900 font-semibold text-sm m-0">
              Vos biens sont bloques
            </Text>
            <Text className="text-gray-700 text-sm leading-relaxed mt-2 mb-0">
              Vous gerez {lotCount} lots (plus de 2). Vos biens sont bloques et vous
              ne recevez plus aucune notification de vos locataires. Pour retrouver
              l&apos;acces complet, activez votre abonnement.
            </Text>
          </div>
        ) : (
          <div className="bg-green-50 border-l-4 border-accent p-4 rounded mb-6">
            <Text className="text-gray-700 text-sm leading-relaxed m-0">
              Vous gerez {lotCount} lot{lotCount > 1 ? 's' : ''} (2 ou moins).
              Votre compte reste actif gratuitement dans le plan Free. Vous pouvez
              continuer a utiliser SEIDO sans restriction pour jusqu&apos;a 2 lots.
            </Text>
          </div>
        )}

        {isReadOnly && (
          <>
            <Text className="text-gray-700 text-base leading-relaxed mb-5">
              Pour retrouver un acces complet, souscrivez a un abonnement.
              Vos donnees sont intactes et vous attendent.
            </Text>

            <EmailButton href={billingUrl}>
              Reactiver mon compte
            </EmailButton>
          </>
        )}

        <Text className="text-gray-500 text-sm leading-relaxed text-center mt-4 mb-0">
          Annulation en 1 clic - Sans engagement - Donnees preservees
        </Text>

        <Text className="text-gray-400 text-xs leading-relaxed text-center mt-3 mb-0">
          Vous ne souhaitez pas continuer ? Contactez-nous a support@seido.be
          pour demander un export de vos donnees.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

TrialExpiredEmail.PreviewProps = {
  firstName: 'Marie',
  teamName: 'Immo Bruxelles',
  lotCount: 5,
  isReadOnly: true,
  billingUrl: 'https://seido-app.com/gestionnaire/settings/billing',
} as TrialExpiredEmailProps

export default TrialExpiredEmail
