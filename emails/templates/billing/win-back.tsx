/**
 * Template Email - Win-back (J+3 post-expiry)
 *
 * Envoye 3 jours apres l'expiration pour tenter de recuperer l'utilisateur
 * Envoye UNIQUEMENT aux comptes read_only (pas free_tier)
 */

import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { WinBackEmailProps } from '@/emails/utils/types'

export const WinBackEmail = ({
  firstName,
  lotCount,
  interventionCount,
  promoCode,
  promoDiscount,
  billingUrl,
}: WinBackEmailProps) => {
  const hasPromo = promoCode && promoDiscount

  return (
    <EmailLayout preview={`${firstName}, vos ${lotCount} lots vous attendent sur SEIDO`}>
      <EmailHeader subject="Vos donnees vous attendent" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Votre essai SEIDO est termine depuis quelques jours, mais
          vos <strong>{lotCount} lots</strong> et
          vos <strong>{interventionCount} intervention{interventionCount > 1 ? 's' : ''}</strong> sont
          toujours la, en attente.
        </Text>

        <div className="bg-amber-50 border-l-4 border-warning p-4 rounded mb-6">
          <Text className="text-gray-700 text-sm leading-relaxed m-0">
            Votre compte est en lecture seule. Vous ne pouvez plus creer d&apos;interventions
            ni modifier vos biens. Reactivez votre compte en quelques clics.
          </Text>
        </div>

        {hasPromo && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 text-center">
            <Text className="text-green-800 font-bold text-lg m-0">
              -{promoDiscount}% avec le code {promoCode}
            </Text>
            <Text className="text-green-600 text-sm mt-1 mb-0">
              Offre speciale pour votre retour
            </Text>
          </div>
        )}

        <EmailButton href={billingUrl}>
          Reactiver mon compte
        </EmailButton>

        <Text className="text-gray-500 text-sm leading-relaxed text-center mt-4 mb-0">
          Pas pret ? Vos donnees restent accessibles en lecture seule sans limite de temps.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

WinBackEmail.PreviewProps = {
  firstName: 'Marie',
  teamName: 'Immo Bruxelles',
  lotCount: 5,
  interventionCount: 12,
  promoCode: 'SEIDOBETA26',
  promoDiscount: 25,
  billingUrl: 'https://seido-app.com/gestionnaire/settings/billing',
} as WinBackEmailProps

export default WinBackEmail
