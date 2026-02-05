/**
 * 📧 Template Email - Nouveau Contrat Créé
 *
 * Envoyé aux locataires liés au contrat
 * Objectif: Informer de la création d'un contrat de bail
 */

import * as React from 'react'
import { Section, Text, Heading, Hr } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { ContractCreatedEmailProps } from '@/emails/utils/types'

export const ContractCreatedEmail = ({
  firstName,
  contractTitle,
  lotReference,
  propertyAddress,
  startDate,
  endDate,
  contractUrl,
}: ContractCreatedEmailProps) => {
  return (
    <EmailLayout preview={`Nouveau contrat de bail - ${contractTitle}`}>
      <EmailHeader subject="Nouveau contrat de bail" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          Un contrat de bail a été créé pour votre logement.
        </Text>

        {/* Encadré contrat */}
        <div className="bg-blue-50 border-l-4 border-primary p-6 rounded-lg mb-6">
          <Text className="text-blue-900 font-bold text-lg m-0">📜 {contractTitle}</Text>
          <Text className="text-blue-700 text-sm mt-2 mb-0">
            Lot : {lotReference}
          </Text>
        </div>

        {/* Détails */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
            📋 Détails du contrat
          </Heading>

          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Titre :</td>
                <td className="text-gray-900 py-2 font-semibold">{contractTitle}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Lot :</td>
                <td className="text-gray-900 py-2">{lotReference}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Adresse :</td>
                <td className="text-gray-900 py-2">{propertyAddress}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Date de début :</td>
                <td className="text-gray-900 py-2">{startDate}</td>
              </tr>
              {endDate && (
                <tr>
                  <td className="text-gray-600 py-2 pr-4 font-medium">Date de fin :</td>
                  <td className="text-gray-900 py-2">{endDate}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Hr className="my-6 border-gray-200" />

        <EmailButton href={contractUrl}>Voir le contrat</EmailButton>

        <Text className="text-gray-500 text-xs leading-relaxed text-center mt-6 mb-0">
          Contactez votre gestionnaire si vous avez des questions concernant ce contrat.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

ContractCreatedEmail.PreviewProps = {
  firstName: 'Marie',
  contractTitle: 'Bail d\'habitation - Apt 3B',
  lotReference: 'Apt 3B',
  propertyAddress: '15 Rue de la Paix, 75002 Paris',
  startDate: '01/03/2026',
  endDate: '28/02/2029',
  contractUrl: 'https://seido.app/locataire/contrats/abc-123',
} as ContractCreatedEmailProps

export default ContractCreatedEmail
