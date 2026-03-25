/**
 * Template Email - Trial ending (J-7, J-3, J-1)
 *
 * Envoye quand l'essai touche a sa fin. Le ton varie selon daysLeft.
 */

import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { TrialEndingEmailProps } from '@/emails/utils/types'

export const TrialEndingEmail = ({
  firstName,
  daysLeft,
  lotCount,
  annualPriceHT,
  monthlyPriceHT,
  annualSavings,
  billingUrl,
}: TrialEndingEmailProps) => {
  // Tone escalation based on urgency
  const isLastDay = daysLeft <= 1
  const isUrgent = daysLeft <= 3

  const subject = isLastDay
    ? 'Dernier jour de votre essai SEIDO'
    : isUrgent
      ? `Plus que ${daysLeft} jours d'essai`
      : `Votre essai SEIDO se termine dans ${daysLeft} jours`

  const preview = isLastDay
    ? 'Ne perdez pas l\'acces a vos donnees'
    : `Il vous reste ${daysLeft} jours pour choisir un plan`

  return (
    <EmailLayout preview={preview}>
      <EmailHeader subject={subject} />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        {isLastDay && (
          <div className="bg-red-50 border-l-4 border-danger p-4 rounded mb-6">
            <Text className="text-gray-900 font-semibold text-sm m-0">
              Dernier jour !
            </Text>
            <Text className="text-gray-700 text-sm leading-relaxed mt-2 mb-0">
              Votre essai expire demain. Sans abonnement, votre compte passera en
              mode lecture seule{lotCount > 2 ? '' : ' si vous depassez 2 lots'}.
              Vous ne pourrez plus creer d&apos;interventions ni modifier vos donnees.
            </Text>
          </div>
        )}

        {isUrgent && !isLastDay && (
          <div className="bg-amber-50 border-l-4 border-warning p-4 rounded mb-6">
            <Text className="text-gray-700 text-sm leading-relaxed m-0">
              Il ne vous reste que <strong>{daysLeft} jours</strong> d&apos;essai.
              Ne perdez pas l&apos;acces a vos {lotCount} lots et a toutes vos interventions.
            </Text>
          </div>
        )}

        {!isUrgent && (
          <Text className="text-gray-700 text-base leading-relaxed mb-5">
            Votre essai SEIDO se termine dans <strong>{daysLeft} jours</strong>.
            Pour continuer a gerer vos {lotCount} lots sans interruption, choisissez un plan.
          </Text>
        )}

        {/* Pricing box */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
            Votre tarif pour {lotCount} lots :
          </Text>

          {/* Annual (recommended) */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
            <table width="100%" cellPadding="0" cellSpacing="0" border={0}>
              <tr>
                <td>
                  <Text className="text-blue-700 font-semibold text-sm m-0">
                    Plan annuel (recommande)
                  </Text>
                  <Text className="text-blue-900 font-bold text-lg m-0 mt-1">
                    {annualPriceHT}EUR HT/an
                  </Text>
                  <Text className="text-blue-600 text-xs m-0">
                    Soit {(annualPriceHT / 12).toFixed(2)}EUR/mois
                  </Text>
                </td>
                <td style={{ textAlign: 'right', verticalAlign: 'top' }}>
                  <div className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded inline-block">
                    Economisez {annualSavings}EUR/an
                  </div>
                </td>
              </tr>
            </table>
          </div>

          {/* Monthly */}
          <div className="border border-gray-200 rounded-lg p-4">
            <Text className="text-gray-600 text-sm m-0">
              Plan mensuel : {monthlyPriceHT}EUR HT/mois
            </Text>
          </div>

          <Text className="text-gray-400 text-xs mt-3 mb-0">
            Prix HT. TVA applicable en sus.
          </Text>
        </div>

        <EmailButton href={billingUrl}>
          {isLastDay
            ? 'Activer maintenant \u2014 0 EUR aujourd\u2019hui'
            : isUrgent
              ? 'Continuer avec SEIDO \u2014 0 EUR aujourd\u2019hui'
              : 'Ajouter mon moyen de paiement \u2014 0 EUR aujourd\u2019hui'}
        </EmailButton>

        <Text className="text-gray-500 text-sm leading-relaxed text-center mt-4 mb-0">
          {isLastDay
            ? 'Vos donnees ne seront pas supprimees. Aucun debit avant la fin de l\u2019essai.'
            : 'Annulation en 1 clic - Sans engagement'}
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

TrialEndingEmail.PreviewProps = {
  firstName: 'Marie',
  teamName: 'Immo Bruxelles',
  daysLeft: 3,
  lotCount: 5,
  annualPriceHT: 250,
  monthlyPriceHT: 25,
  annualSavings: 50,
  billingUrl: 'https://seido-app.com/gestionnaire/settings/billing',
} as TrialEndingEmailProps

export default TrialEndingEmail
