/**
 * 📧 Template Email - Devis Approuvé
 *
 * Envoyé au prestataire quand le gestionnaire approuve le devis
 * Objectif: Confirmer l'approbation et indiquer les prochaines étapes
 */

import * as React from 'react'
import { Section, Text, Heading, Hr } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { QuoteApprovedEmailProps } from '@/emails/utils/types'

export const QuoteApprovedEmail = ({
  firstName,
  quoteRef,
  interventionRef,
  interventionType,
  description,
  propertyAddress,
  quoteUrl,
  managerName,
  approvedAmount,
  approvedAt,
  nextSteps,
}: QuoteApprovedEmailProps) => {
  const formattedDate = approvedAt.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const formatEuro = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)

  return (
    <EmailLayout preview={`✅ Devis ${quoteRef} approuvé - ${formatEuro(approvedAmount)}`}>
      <EmailHeader subject="Devis approuvé" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          Bonne nouvelle ! <strong>{managerName}</strong> a approuvé votre devis.
        </Text>

        {/* Encadré confirmation */}
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg mb-6">
          <Text className="text-green-900 font-bold text-2xl m-0">✅ Devis approuvé</Text>
          <Text className="text-green-700 text-sm mt-2 mb-0">Approuvé le {formattedDate}</Text>
        </div>

        {/* Montant approuvé */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white text-center mb-6">
          <Text className="text-green-100 text-sm font-medium m-0">Montant approuvé</Text>
          <Text className="text-white font-bold text-4xl my-2">{formatEuro(approvedAmount)}</Text>
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
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Approuvé par :</td>
                <td className="text-gray-900 py-2">{managerName}</td>
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

        {/* Prochaines étapes */}
        {nextSteps ? (
          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <Heading as="h2" className="text-blue-900 text-lg font-semibold mt-0 mb-3">
              🚀 Prochaines étapes
            </Heading>
            <Text className="text-blue-800 text-sm leading-relaxed bg-white p-4 rounded border border-blue-200 m-0">
              {nextSteps}
            </Text>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg mb-6">
            <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
              🚀 Prochaines étapes
            </Text>
            <ul className="text-gray-700 text-sm leading-relaxed pl-5 m-0">
              <li>Vous pouvez maintenant planifier l'intervention avec le locataire</li>
              <li>Consultez la page de l'intervention pour coordonner le rendez-vous</li>
              <li>Une fois les travaux terminés, vous pourrez clôturer l'intervention</li>
            </ul>
          </div>
        )}

        <EmailButton href={quoteUrl}>Voir l'intervention</EmailButton>

        <Text className="text-gray-500 text-xs leading-relaxed text-center mt-6 mb-0">
          Vous recevrez une notification lors de la planification de l'intervention.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

QuoteApprovedEmail.PreviewProps = {
  firstName: 'Pierre',
  quoteRef: 'DEV-2024-015',
  interventionRef: 'INT-2024-042',
  interventionType: 'Plomberie',
  description: 'Fuite d\'eau importante sous l\'évier de la cuisine.',
  propertyAddress: '15 Rue de la Paix, 75002 Paris',
  quoteUrl: 'https://seido.app/prestataire/interventions/INT-2024-042',
  managerName: 'Jean Martin',
  approvedAmount: 300,
  approvedAt: new Date(),
  nextSteps:
    'Merci de contacter Mme Dupont au 06 12 34 56 78 pour planifier l\'intervention dans les 5 prochains jours.',
} as QuoteApprovedEmailProps

export default QuoteApprovedEmail
