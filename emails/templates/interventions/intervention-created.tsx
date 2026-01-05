/**
 * 📧 Template Email - Nouvelle Intervention Créée
 *
 * Envoyé au gestionnaire quand un locataire crée une demande d'intervention
 * Objectif: Alerter le gestionnaire pour qu'il approuve/rejette rapidement
 */

import * as React from 'react'
import { Section, Text, Heading, Hr } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import { EmailAttachments } from '@/emails/components/email-attachments'
import type { InterventionCreatedEmailProps } from '@/emails/utils/types'

export const InterventionCreatedEmail = ({
  firstName,
  interventionRef,
  interventionType,
  description,
  propertyAddress,
  lotReference,
  interventionUrl,
  tenantName,
  urgency,
  createdAt,
  attachments,
}: InterventionCreatedEmailProps) => {
  // Couleurs et icônes selon l'urgence
  const urgencyConfig = {
    critique: { color: '#EF4444', icon: '🚨', label: 'Critique', bg: '#FEE2E2' },
    haute: { color: '#F97316', icon: '⚡', label: 'Haute', bg: '#FFEDD5' },
    moyenne: { color: '#F59E0B', icon: '⚠️', label: 'Moyenne', bg: '#FEF3C7' },
    faible: { color: '#10B981', icon: '📋', label: 'Faible', bg: '#D1FAE5' },
  }

  const config = urgencyConfig[urgency]
  const formattedDate = createdAt.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <EmailLayout preview={`Nouvelle intervention ${interventionRef} - ${interventionType}`}>
      <EmailHeader subject="Nouvelle demande d'intervention" />

      <Section className="bg-white px-8 py-8">
        {/* Salutation */}
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          <strong>{tenantName}</strong> vient de créer une nouvelle demande d'intervention
          qui nécessite votre attention.
        </Text>

        {/* Encadré urgence */}
        <div
          className="p-4 rounded-lg mb-6"
          style={{
            backgroundColor: config.bg,
            borderLeft: `4px solid ${config.color}`,
          }}
        >
          <Text className="text-gray-900 font-bold text-lg m-0">
            {config.icon} Urgence : {config.label}
          </Text>
        </div>

        {/* Détails de l'intervention */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
            📋 Détails de l'intervention
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
                <td className="text-gray-600 py-2 pr-4 font-medium">Demandeur :</td>
                <td className="text-gray-900 py-2">{tenantName}</td>
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
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Date :</td>
                <td className="text-gray-900 py-2">{formattedDate}</td>
              </tr>
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

        {/* Pièces jointes */}
        {attachments && attachments.length > 0 && (
          <EmailAttachments attachments={attachments} />
        )}

        {/* Actions requises */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg mb-6">
          <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
            ⚡ Actions requises
          </Text>
          <Text className="text-gray-700 text-sm leading-relaxed m-0">
            Veuillez examiner cette demande et prendre une décision :
          </Text>
          <ul className="text-gray-700 text-sm leading-relaxed pl-5 mt-2 mb-0">
            <li>
              <strong>Approuver</strong> la demande pour permettre au locataire de contacter un
              prestataire
            </li>
            <li>
              <strong>Rejeter</strong> la demande en indiquant la raison (ex: déjà en cours,
              responsabilité locataire)
            </li>
          </ul>
        </div>

        {/* Bouton CTA */}
        <EmailButton href={interventionUrl}>Voir la demande et décider</EmailButton>

        {/* Note de pied */}
        <Text className="text-gray-500 text-xs leading-relaxed text-center mt-6 mb-0">
          Cette demande a été créée automatiquement par {tenantName}.<br />
          Vous recevez cet email car vous êtes gestionnaire du bien concerné.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

// Props par défaut pour prévisualisation
InterventionCreatedEmail.PreviewProps = {
  firstName: 'Jean',
  interventionRef: 'INT-2024-042',
  interventionType: 'Plomberie',
  description:
    'Fuite d\'eau importante sous l\'évier de la cuisine. L\'eau coule en continu depuis ce matin. J\'ai coupé l\'arrivée d\'eau en attendant.',
  propertyAddress: '15 Rue de la Paix, 75002 Paris',
  lotReference: 'Apt 3B',
  interventionUrl: 'https://seido.app/gestionnaire/interventions/INT-2024-042',
  tenantName: 'Marie Dupont',
  urgency: 'haute',
  createdAt: new Date(),
  attachments: [
    {
      filename: 'photo_fuite_evier.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1536000,
      downloadUrl: 'https://seido.app/api/download-intervention-document/abc123',
      documentType: 'Photo'
    },
    {
      filename: 'plan_installation.pdf',
      mimeType: 'application/pdf',
      fileSize: 245760,
      downloadUrl: 'https://seido.app/api/download-intervention-document/def456',
      documentType: 'Document'
    }
  ]
} as InterventionCreatedEmailProps

export default InterventionCreatedEmail
