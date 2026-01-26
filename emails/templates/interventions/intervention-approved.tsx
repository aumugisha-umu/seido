/**
 * 📧 Template Email - Intervention Approuvée
 *
 * Envoyé au locataire quand le gestionnaire approuve sa demande
 * Objectif: Rassurer le locataire et l'informer des prochaines étapes
 */

import * as React from 'react'
import { Section, Text, Heading, Hr } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import { EmailReplyHint } from '@/emails/components/email-reply-hint'
import type { InterventionApprovedEmailProps } from '@/emails/utils/types'

export const InterventionApprovedEmail = ({
  firstName,
  interventionRef,
  interventionType,
  description,
  propertyAddress,
  lotReference,
  interventionUrl,
  managerName,
  approvedAt,
  nextSteps,
}: InterventionApprovedEmailProps) => {
  const formattedDate = approvedAt.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <EmailLayout preview={`✅ Votre intervention ${interventionRef} a été approuvée`}>
      <EmailHeader subject="Votre intervention a été approuvée" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          Bonne nouvelle ! <strong>{managerName}</strong> a approuvé votre demande d'intervention.
        </Text>

        {/* Encadré confirmation */}
        <div className="bg-green-50 border-l-4 border-green-500 p-5 rounded-lg mb-6">
          <Text className="text-green-900 font-bold text-lg m-0">
            ✅ Intervention approuvée
          </Text>
          <Text className="text-green-700 text-sm mt-2 mb-0">
            Approuvée le {formattedDate}
          </Text>
        </div>

        {/* Détails */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
            📋 Récapitulatif
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

        {/* Prochaines étapes */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg mb-6">
          <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
            🚀 Prochaines étapes
          </Text>
          {nextSteps ? (
            <Text className="text-gray-700 text-sm leading-relaxed m-0">{nextSteps}</Text>
          ) : (
            <ul className="text-gray-700 text-sm leading-relaxed pl-5 m-0">
              <li>Un prestataire va être contacté pour réaliser l'intervention</li>
              <li>Vous serez informé·e dès qu'un rendez-vous sera planifié</li>
              <li>Vous recevrez les coordonnées du prestataire avant son passage</li>
              <li>Vous pourrez suivre l'avancement en temps réel sur votre tableau de bord</li>
            </ul>
          )}
        </div>

        {/* Bouton CTA */}
        <EmailButton href={interventionUrl}>Suivre mon intervention</EmailButton>

        {/* Indication de réponse par email */}
        <EmailReplyHint />

        {/* Note */}
        <Text className="text-gray-500 text-xs leading-relaxed text-center mt-6 mb-0">
          Vous recevrez un nouvel email dès qu'un rendez-vous sera confirmé.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

// Props par défaut pour prévisualisation
InterventionApprovedEmail.PreviewProps = {
  firstName: 'Marie',
  interventionRef: 'INT-2024-042',
  interventionType: 'Plomberie',
  description:
    'Fuite d\'eau importante sous l\'évier de la cuisine. L\'eau coule en continu depuis ce matin.',
  propertyAddress: '15 Rue de la Paix, 75002 Paris',
  lotReference: 'Apt 3B',
  interventionUrl: 'https://seido.app/locataire/interventions/INT-2024-042',
  managerName: 'Jean Martin',
  approvedAt: new Date(),
  nextSteps: undefined,
} as InterventionApprovedEmailProps

export default InterventionApprovedEmail
