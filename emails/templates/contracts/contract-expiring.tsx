/**
 * 📧 Template Email - Contrat Arrivant à Expiration
 *
 * Envoyé aux gestionnaires de l'équipe
 * Objectif: Alerter de l'expiration prochaine d'un contrat
 */

import * as React from 'react'
import { Section, Text, Heading } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { ContractExpiringEmailProps } from '@/emails/utils/types'

export const ContractExpiringEmail = ({
  firstName,
  contractTitle,
  lotReference,
  daysUntilExpiry,
  endDate,
  contractUrl,
}: ContractExpiringEmailProps) => {
  const isUrgent = daysUntilExpiry <= 7
  const badgeBg = isUrgent ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'
  const badgeTextColor = isUrgent ? 'text-red-900' : 'text-orange-900'
  const badgeSubColor = isUrgent ? 'text-red-700' : 'text-orange-700'
  const emoji = isUrgent ? '🔴' : '🟠'

  return (
    <EmailLayout preview={`${emoji} Contrat expire dans ${daysUntilExpiry}j - ${contractTitle}`}>
      <EmailHeader subject="Contrat arrivant à expiration" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          Un contrat de votre portefeuille arrive bientôt à expiration.
        </Text>

        {/* Badge urgence */}
        <div className={`${badgeBg} border-l-4 p-6 rounded-lg mb-6`}>
          <Text className={`${badgeTextColor} font-bold text-lg m-0`}>
            {emoji} Expire dans {daysUntilExpiry} jour{daysUntilExpiry > 1 ? 's' : ''}
          </Text>
          <Text className={`${badgeSubColor} text-sm mt-2 mb-0`}>
            Date de fin : {endDate}
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
                <td className="text-gray-600 py-2 pr-4 font-medium">Contrat :</td>
                <td className="text-gray-900 py-2 font-semibold">{contractTitle}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Lot :</td>
                <td className="text-gray-900 py-2">{lotReference}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Expiration :</td>
                <td className="text-gray-900 py-2 font-semibold">{endDate}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Jours restants :</td>
                <td className={`py-2 font-bold ${isUrgent ? 'text-red-600' : 'text-orange-600'}`}>
                  {daysUntilExpiry} jour{daysUntilExpiry > 1 ? 's' : ''}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Prochaines étapes */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg mb-6">
          <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
            🚀 Actions recommandées
          </Text>
          <ul className="text-gray-700 text-sm leading-relaxed pl-5 m-0">
            <li>Vérifiez les conditions de renouvellement du contrat</li>
            <li>Contactez le locataire pour discuter de la suite</li>
            <li>Préparez un nouveau contrat si nécessaire</li>
          </ul>
        </div>

        <EmailButton href={contractUrl}>Voir le contrat</EmailButton>

        <Text className="text-gray-500 text-xs leading-relaxed text-center mt-6 mb-0">
          Cette alerte est envoyée automatiquement pour les contrats arrivant à expiration.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

ContractExpiringEmail.PreviewProps = {
  firstName: 'Jean',
  contractTitle: 'Bail d\'habitation - Apt 3B',
  lotReference: 'Apt 3B',
  daysUntilExpiry: 7,
  endDate: '15/03/2026',
  contractUrl: 'https://seido-app.com/gestionnaire/contrats/abc-123',
} as ContractExpiringEmailProps

export default ContractExpiringEmail
