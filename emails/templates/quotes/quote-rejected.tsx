/**
 * 📧 Template Email - Devis Rejeté
 *
 * Envoyé au prestataire quand le gestionnaire rejette le devis
 * Objectif: Expliquer le rejet et indiquer si une nouvelle soumission est possible
 */

import * as React from 'react'
import { Section, Text, Heading, Hr } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { QuoteRejectedEmailProps } from '@/emails/utils/types'

export const QuoteRejectedEmail = ({
  firstName,
  quoteRef,
  interventionRef,
  interventionType,
  description,
  propertyAddress,
  quoteUrl,
  managerName,
  rejectionReason,
  rejectedAt,
  canResubmit,
}: QuoteRejectedEmailProps) => {
  const formattedDate = rejectedAt.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <EmailLayout preview={`Devis ${quoteRef} non retenu`}>
      <EmailHeader subject="Devis non retenu" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          <strong>{managerName}</strong> a examiné votre devis et a décidé de ne pas le retenir.
        </Text>

        {/* Encadré rejet */}
        <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-lg mb-6">
          <Text className="text-orange-900 font-bold text-xl m-0">❌ Devis non retenu</Text>
          <Text className="text-orange-700 text-sm mt-2 mb-0">Décision prise le {formattedDate}</Text>
        </div>

        {/* Raison du rejet */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-3">
            📝 Motif du rejet
          </Heading>
          <Text className="text-gray-700 text-sm leading-relaxed bg-white p-4 rounded border border-gray-300 m-0">
            {rejectionReason}
          </Text>
        </div>

        {/* Détails */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
            📋 Détails
          </Heading>

          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Référence devis :</td>
                <td className="text-gray-900 py-2 font-semibold">{quoteRef}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Intervention :</td>
                <td className="text-gray-900 py-2">{interventionRef}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Type :</td>
                <td className="text-gray-900 py-2">{interventionType}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Adresse :</td>
                <td className="text-gray-900 py-2">{propertyAddress}</td>
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

        {/* Possibilité de resoumettre */}
        {canResubmit ? (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg mb-6">
            <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
              🔄 Nouvelle soumission possible
            </Text>
            <Text className="text-gray-700 text-sm leading-relaxed mb-3">
              Le gestionnaire vous autorise à soumettre un nouveau devis en tenant compte de ses
              remarques.
            </Text>
            <ul className="text-gray-700 text-sm leading-relaxed pl-5 m-0">
              <li>Ajustez votre proposition selon le motif du rejet</li>
              <li>Soumettez un nouveau devis via la plateforme</li>
              <li>Le gestionnaire en sera immédiatement notifié</li>
            </ul>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-lg mb-6">
            <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
              ℹ️ Fin de la procédure
            </Text>
            <Text className="text-gray-700 text-sm leading-relaxed m-0">
              Le gestionnaire a décidé de ne pas donner suite à cette intervention. Vous ne pouvez
              pas soumettre de nouveau devis pour cette demande.
            </Text>
          </div>
        )}

        {canResubmit && <EmailButton href={quoteUrl}>Soumettre un nouveau devis</EmailButton>}

        <Text className="text-gray-500 text-xs leading-relaxed text-center mt-6 mb-0">
          {canResubmit
            ? 'Vous pouvez consulter les détails de l\'intervention et soumettre une nouvelle proposition.'
            : 'Merci de votre compréhension.'}
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

QuoteRejectedEmail.PreviewProps = {
  firstName: 'Pierre',
  quoteRef: 'DEV-2024-015',
  interventionRef: 'INT-2024-042',
  interventionType: 'Plomberie',
  description: 'Fuite d\'eau importante sous l\'évier de la cuisine.',
  propertyAddress: '15 Rue de la Paix, 75002 Paris',
  quoteUrl: 'https://seido.app/prestataire/devis/DEV-2024-015',
  managerName: 'Jean Martin',
  rejectionReason:
    'Le montant proposé (300€) dépasse notre budget pour ce type d\'intervention. Nous recherchons une solution plus économique, idéalement autour de 200€.',
  rejectedAt: new Date(),
  canResubmit: true,
} as QuoteRejectedEmailProps

export default QuoteRejectedEmail
