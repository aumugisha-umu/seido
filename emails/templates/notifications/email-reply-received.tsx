/**
 * 📧 Template Email - Réponse par Email Reçue
 *
 * Envoyé aux gestionnaires quand un locataire ou prestataire répond
 * par email à une notification d'intervention.
 *
 * Objectif: Informer le gestionnaire qu'une réponse a été reçue
 * et l'inciter à consulter l'email dans l'application.
 */

import * as React from 'react'
import { Section, Text, Heading, Hr } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import { EmailReplyHint } from '@/emails/components/email-reply-hint'

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

export interface EmailReplyReceivedEmailProps {
  /** Prénom du gestionnaire destinataire */
  firstName: string
  /** Informations sur l'intervention */
  intervention: {
    id: string
    title: string
    reference?: string | null
  }
  /** Informations sur l'expéditeur de la réponse */
  sender: {
    name: string
    email: string
    role?: 'locataire' | 'prestataire' | 'externe'
  }
  /** Objet de l'email de réponse */
  subject: string
  /** Extrait du corps de l'email (premiers 200 caractères) */
  snippet: string
  /** URL pour voir l'email dans l'application */
  viewUrl: string
  /** Date de réception */
  receivedAt?: Date
}

// ══════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════

export const EmailReplyReceivedEmail = ({
  firstName,
  intervention,
  sender,
  subject,
  snippet,
  viewUrl,
  receivedAt = new Date(),
}: EmailReplyReceivedEmailProps) => {
  const formattedDate = receivedAt.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Déterminer le label du rôle
  const roleLabel = sender.role === 'locataire'
    ? 'locataire'
    : sender.role === 'prestataire'
      ? 'prestataire'
      : 'utilisateur'

  // Tronquer le snippet si nécessaire
  const truncatedSnippet = snippet.length > 200
    ? snippet.substring(0, 200) + '...'
    : snippet

  return (
    <EmailLayout preview={`📧 Réponse de ${sender.name} - ${intervention.reference || intervention.title}`}>
      <EmailHeader subject="Nouvelle réponse par email" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          <strong>{sender.name}</strong> ({roleLabel}) a répondu par email à l'intervention suivante :
        </Text>

        {/* Encadré intervention */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-lg mb-6">
          <Text className="text-blue-900 font-bold text-lg m-0">
            {intervention.title}
          </Text>
          {intervention.reference && (
            <Text className="text-blue-600 text-sm mt-2 mb-0">
              Réf: {intervention.reference}
            </Text>
          )}
        </div>

        {/* Objet de l'email */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-3">
            📧 Email reçu
          </Heading>

          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">De :</td>
                <td className="text-gray-900 py-2">
                  <strong>{sender.name}</strong> &lt;{sender.email}&gt;
                </td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Objet :</td>
                <td className="text-gray-900 py-2">{subject}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Reçu le :</td>
                <td className="text-gray-900 py-2">{formattedDate}</td>
              </tr>
            </tbody>
          </table>

          <Hr className="my-4 border-gray-200" />

          {/* Aperçu du message */}
          <Heading as="h3" className="text-gray-900 text-sm font-semibold mt-4 mb-2">
            Aperçu du message :
          </Heading>
          <div className="bg-white p-4 rounded border-l-4 border-gray-300">
            <Text className="text-gray-700 text-sm leading-relaxed m-0 italic">
              "{truncatedSnippet}"
            </Text>
          </div>
        </div>

        {/* Info pièces jointes */}
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg mb-6">
          <Text className="text-amber-800 text-sm m-0">
            💡 Les pièces jointes éventuelles sont consultables dans l'onglet "Emails liés" de l'intervention.
          </Text>
        </div>

        {/* Bouton CTA */}
        <EmailButton href={viewUrl}>
          Voir l'email complet
        </EmailButton>

        {/* Indication de réponse par email */}
        <EmailReplyHint />

        {/* Note */}
        <Text className="text-gray-500 text-xs leading-relaxed text-center mt-6 mb-0">
          Cet email a été automatiquement lié à l'intervention grâce au système de réponse directe.
          Vous pouvez répondre directement depuis l'application.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

// Props par défaut pour prévisualisation
EmailReplyReceivedEmail.PreviewProps = {
  firstName: 'Thomas',
  intervention: {
    id: 'abc-123',
    title: 'Fuite d\'eau - Appartement 3B',
    reference: 'INT-2024-042',
  },
  sender: {
    name: 'Marie Dupont',
    email: 'marie.dupont@email.com',
    role: 'locataire',
  },
  subject: 'Re: [INT-2024-042] Intervention planifiée',
  snippet: 'Bonjour, merci pour la planification. Je serai bien présente jeudi matin. Est-il possible de prévoir un créneau plutôt vers 9h ? Cordialement, Marie',
  viewUrl: 'https://seido.app/gestionnaire/interventions/abc-123?tab=emails',
  receivedAt: new Date(),
} as EmailReplyReceivedEmailProps

export default EmailReplyReceivedEmail
