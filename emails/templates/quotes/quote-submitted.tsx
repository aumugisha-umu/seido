/**
 * 📧 Template Email - Devis Soumis
 *
 * Envoyé au gestionnaire quand le prestataire soumet son devis
 * Objectif: Alerter le gestionnaire pour qu'il examine le devis
 */

import * as React from 'react'
import { Section, Text, Heading, Hr } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import { EmailReplyHint } from '@/emails/components/email-reply-hint'
import type { QuoteSubmittedEmailProps } from '@/emails/utils/types'

export const QuoteSubmittedEmail = ({
  firstName,
  quoteRef,
  interventionRef,
  interventionType,
  description,
  propertyAddress,
  quoteUrl,
  providerName,
  providerCompany,
  totalHT,
  totalTTC,
  submittedAt,
  hasPdfAttachment,
}: QuoteSubmittedEmailProps) => {
  const formattedDate = submittedAt.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const formatEuro = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)

  return (
    <EmailLayout preview={`Devis ${quoteRef} reçu - ${formatEuro(totalTTC)}`}>
      <EmailHeader subject="Nouveau devis reçu" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          <strong>{providerName}</strong>
          {providerCompany && <> de {providerCompany}</>} vient de soumettre un devis qui nécessite
          votre validation.
        </Text>

        {/* Montant principal */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white text-center mb-6">
          <Text className="text-blue-100 text-sm font-medium m-0">Montant total TTC</Text>
          <Text className="text-white font-bold text-4xl my-2">{formatEuro(totalTTC)}</Text>
          <Text className="text-blue-100 text-xs m-0">HT : {formatEuro(totalHT)}</Text>
        </div>

        {hasPdfAttachment && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg mb-6">
            <Text className="text-green-800 text-sm font-medium m-0">
              📎 Un devis détaillé en PDF est disponible
            </Text>
          </div>
        )}

        {/* Détails */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
            📋 Détails
          </Heading>

          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Référence :</td>
                <td className="text-gray-900 py-2 font-semibold">{quoteRef}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Intervention :</td>
                <td className="text-gray-900 py-2">{interventionRef}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Prestataire :</td>
                <td className="text-gray-900 py-2">
                  {providerName}
                  {providerCompany && ` (${providerCompany})`}
                </td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Type :</td>
                <td className="text-gray-900 py-2">{interventionType}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Adresse :</td>
                <td className="text-gray-900 py-2">{propertyAddress}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Soumis le :</td>
                <td className="text-gray-900 py-2">{formattedDate}</td>
              </tr>
            </tbody>
          </table>

          <Hr className="my-4 border-gray-200" />

          <Heading as="h3" className="text-gray-900 text-sm font-semibold mt-4 mb-2">
            Demande initiale :
          </Heading>
          <Text className="text-gray-700 text-sm leading-relaxed bg-white p-3 rounded border border-gray-200 m-0">
            {description}
          </Text>
        </div>

        {/* Action requise */}
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-6 rounded-lg mb-6">
          <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
            ⚡ Décision requise
          </Text>
          <Text className="text-gray-700 text-sm leading-relaxed m-0">
            Veuillez examiner ce devis et prendre une décision :
          </Text>
          <ul className="text-gray-700 text-sm leading-relaxed pl-5 mt-2 mb-0">
            <li>
              <strong>Approuver</strong> pour autoriser les travaux
            </li>
            <li>
              <strong>Rejeter</strong> si le devis ne convient pas
            </li>
          </ul>
        </div>

        <EmailButton href={quoteUrl}>Examiner le devis</EmailButton>

        {/* Indication de réponse par email */}
        <EmailReplyHint />

        <Text className="text-gray-500 text-xs leading-relaxed text-center mt-6 mb-0">
          Le prestataire sera notifié de votre décision.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

QuoteSubmittedEmail.PreviewProps = {
  firstName: 'Jean',
  quoteRef: 'DEV-2024-015',
  interventionRef: 'INT-2024-042',
  interventionType: 'Plomberie',
  description: 'Fuite d\'eau importante sous l\'évier de la cuisine.',
  propertyAddress: '15 Rue de la Paix, 75002 Paris',
  quoteUrl: 'https://seido.app/gestionnaire/devis/DEV-2024-015',
  providerName: 'Pierre Dubois',
  providerCompany: 'Plomberie Express SARL',
  totalHT: 250,
  totalTTC: 300,
  submittedAt: new Date(),
  hasPdfAttachment: true,
} as QuoteSubmittedEmailProps

export default QuoteSubmittedEmail
