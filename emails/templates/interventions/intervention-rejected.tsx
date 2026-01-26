/**
 * 📧 Template Email - Intervention Rejetée
 *
 * Envoyé au locataire quand le gestionnaire rejette sa demande
 * Objectif: Expliquer clairement le rejet et proposer une alternative
 */

import * as React from 'react'
import { Section, Text, Heading, Hr, Link } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import { EmailReplyHint } from '@/emails/components/email-reply-hint'
import type { InterventionRejectedEmailProps } from '@/emails/utils/types'

export const InterventionRejectedEmail = ({
  firstName,
  interventionRef,
  interventionType,
  description,
  propertyAddress,
  lotReference,
  interventionUrl,
  managerName,
  rejectionReason,
  rejectedAt,
}: InterventionRejectedEmailProps) => {
  const formattedDate = rejectedAt.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <EmailLayout preview={`Votre intervention ${interventionRef} a été refusée`}>
      <EmailHeader subject="Réponse à votre demande d'intervention" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          <strong>{managerName}</strong> a examiné votre demande d'intervention et a décidé de ne
          pas donner suite pour le moment.
        </Text>

        {/* Encadré rejet */}
        <div className="bg-orange-50 border-l-4 border-orange-500 p-5 rounded-lg mb-6">
          <Text className="text-orange-900 font-bold text-lg m-0">
            ⚠️ Demande non approuvée
          </Text>
          <Text className="text-orange-700 text-sm mt-2 mb-0">Décision prise le {formattedDate}</Text>
        </div>

        {/* Raison du rejet */}
        <div className="bg-red-50 p-6 rounded-lg mb-6">
          <Heading as="h2" className="text-red-900 text-lg font-semibold mt-0 mb-3">
            📝 Raison du refus
          </Heading>
          <Text className="text-red-800 text-base leading-relaxed bg-white p-4 rounded border border-red-200 m-0">
            {rejectionReason}
          </Text>
        </div>

        {/* Détails de la demande */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
            📋 Votre demande initiale
          </Heading>

          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Référence :</td>
                <td className="text-gray-900 py-2 font-semibold">{interventionRef}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Type :</td>
                <td className="text-gray-900 py-2">{interventionType}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Adresse :</td>
                <td className="text-gray-900 py-2">{propertyAddress}</td>
              </tr>
              {lotReference && (
                <tr>
                  <td className="text-gray-600 py-2 pr-4 font-medium">Lot :</td>
                  <td className="text-gray-900 py-2">{lotReference}</td>
                </tr>
              )}
            </tbody>
          </table>

          <Hr className="my-4 border-gray-200" />

          <Heading as="h3" className="text-gray-900 text-sm font-semibold mt-4 mb-2">
            Description :
          </Heading>
          <Text className="text-gray-700 text-sm leading-relaxed bg-white p-3 rounded border border-gray-200 m-0">
            {description}
          </Text>
        </div>

        {/* Que faire maintenant */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg mb-6">
          <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
            💡 Que faire maintenant ?
          </Text>
          <ul className="text-gray-700 text-sm leading-relaxed pl-5 m-0">
            <li>Si vous pensez qu'il y a eu une erreur, contactez directement {managerName}</li>
            <li>Si le problème persiste ou s'aggrave, créez une nouvelle demande</li>
            <li>
              Pour certains problèmes (ex: ampoule grillée), la réparation peut être à votre charge
            </li>
            <li>Consultez votre contrat de location pour connaître vos responsabilités</li>
          </ul>
        </div>

        {/* Boutons d'action */}
        <div className="text-center mb-6">
          <EmailButton href={interventionUrl}>Voir les détails</EmailButton>
        </div>

        {/* Indication de réponse par email */}
        <EmailReplyHint />

        {/* Contact */}
        <div className="bg-gray-50 p-5 rounded-lg">
          <Text className="text-gray-900 font-semibold text-sm mb-2 mt-0">
            Besoin de clarifications ?
          </Text>
          <Text className="text-gray-600 text-sm leading-relaxed m-0">
            N'hésitez pas à contacter votre gestionnaire <strong>{managerName}</strong> pour
            discuter de cette décision ou obtenir plus d'informations.
          </Text>
        </div>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

// Props par défaut pour prévisualisation
InterventionRejectedEmail.PreviewProps = {
  firstName: 'Marie',
  interventionRef: 'INT-2024-042',
  interventionType: 'Électricité',
  description: 'L\'ampoule du salon est grillée et ne fonctionne plus.',
  propertyAddress: '15 Rue de la Paix, 75002 Paris',
  lotReference: 'Apt 3B',
  interventionUrl: 'https://seido.app/locataire/interventions/INT-2024-042',
  managerName: 'Jean Martin',
  rejectionReason:
    'Le remplacement des ampoules est à la charge du locataire selon l\'article 7 de votre contrat de location. Vous pouvez acheter une ampoule LED compatible dans n\'importe quel magasin de bricolage.',
  rejectedAt: new Date(),
} as InterventionRejectedEmailProps

export default InterventionRejectedEmail
