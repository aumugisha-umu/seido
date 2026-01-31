/**
 * 📧 Template Email - Nouveau Message dans une Conversation
 *
 * Envoyé aux participants d'une conversation quand un nouveau message est posté.
 * Permet de répondre directement par email (la réponse sera ajoutée au thread).
 *
 * Features:
 * - Aperçu du message (100 chars)
 * - Informations intervention (référence, adresse)
 * - Magic link pour accéder à la conversation
 * - Reply-to pour répondre directement par email
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

export interface NewMessageEmailProps {
  /** Prénom du destinataire */
  firstName: string
  /** Informations sur l'expéditeur du message */
  sender: {
    name: string
    role?: 'locataire' | 'prestataire' | 'gestionnaire'
  }
  /** Contenu du message (sera tronqué à 150 chars) */
  messagePreview: string
  /** Informations sur l'intervention */
  intervention: {
    id: string
    reference?: string | null
    title: string
    propertyAddress?: string
  }
  /** Type de thread (pour contexte) */
  threadType: 'group' | 'tenant_to_managers' | 'provider_to_managers'
  /** URL magic link pour voir la conversation */
  conversationUrl: string
  /** Date d'envoi du message */
  sentAt?: Date
}

// ══════════════════════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════════════════════

export const NewMessageEmail = ({
  firstName,
  sender,
  messagePreview,
  intervention,
  threadType,
  conversationUrl,
  sentAt = new Date(),
}: NewMessageEmailProps) => {
  // Format date
  const formattedDate = sentAt.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Tronquer le message si nécessaire
  const truncatedMessage = messagePreview.length > 150
    ? messagePreview.substring(0, 147) + '...'
    : messagePreview

  // Label du rôle en français
  const roleLabel = sender.role === 'locataire'
    ? 'Locataire'
    : sender.role === 'prestataire'
      ? 'Prestataire'
      : sender.role === 'gestionnaire'
        ? 'Gestionnaire'
        : ''

  // Label du type de thread
  const threadLabel = threadType === 'group'
    ? 'Conversation générale'
    : threadType === 'tenant_to_managers'
      ? 'Échange privé locataire'
      : 'Échange privé prestataire'

  return (
    <EmailLayout preview={`💬 ${sender.name} : "${truncatedMessage.substring(0, 50)}..."`}>
      <EmailHeader subject="Nouveau message" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          <strong>{sender.name}</strong>
          {roleLabel && <span className="text-gray-500"> ({roleLabel})</span>}
          {' '}vous a envoyé un message :
        </Text>

        {/* Encadré message */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            borderLeft: '4px solid #5b8def',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '24px',
          }}
        >
          <Text
            style={{
              color: '#334155',
              fontSize: '15px',
              lineHeight: '1.6',
              margin: 0,
              fontStyle: 'italic',
            }}
          >
            "{truncatedMessage}"
          </Text>
          <Text
            style={{
              color: '#94a3b8',
              fontSize: '12px',
              marginTop: '12px',
              marginBottom: 0,
            }}
          >
            {formattedDate}
          </Text>
        </div>

        <Hr className="border-gray-200 my-6" />

        {/* Contexte intervention */}
        <div
          style={{
            backgroundColor: '#f1f5f9',
            padding: '16px 20px',
            borderRadius: '8px',
            marginBottom: '24px',
          }}
        >
          <Heading
            as="h3"
            style={{
              color: '#475569',
              fontSize: '13px',
              fontWeight: '600',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.5px',
              marginTop: 0,
              marginBottom: '12px',
            }}
          >
            Intervention concernée
          </Heading>

          <table width="100%" cellPadding="0" cellSpacing="0" style={{ borderCollapse: 'collapse' }}>
            <tbody>
              {intervention.reference && (
                <tr>
                  <td style={{ padding: '4px 0', color: '#64748b', fontSize: '13px', width: '100px' }}>
                    Référence :
                  </td>
                  <td style={{ padding: '4px 0', color: '#1e293b', fontSize: '13px', fontWeight: '500' }}>
                    {intervention.reference}
                  </td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '4px 0', color: '#64748b', fontSize: '13px', width: '100px' }}>
                  Titre :
                </td>
                <td style={{ padding: '4px 0', color: '#1e293b', fontSize: '13px', fontWeight: '500' }}>
                  {intervention.title}
                </td>
              </tr>
              {intervention.propertyAddress && (
                <tr>
                  <td style={{ padding: '4px 0', color: '#64748b', fontSize: '13px', width: '100px' }}>
                    Adresse :
                  </td>
                  <td style={{ padding: '4px 0', color: '#1e293b', fontSize: '13px' }}>
                    {intervention.propertyAddress}
                  </td>
                </tr>
              )}
              <tr>
                <td style={{ padding: '4px 0', color: '#64748b', fontSize: '13px', width: '100px' }}>
                  Canal :
                </td>
                <td style={{ padding: '4px 0', color: '#64748b', fontSize: '13px' }}>
                  {threadLabel}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bouton CTA */}
        <EmailButton href={conversationUrl}>
          Voir la conversation
        </EmailButton>

        {/* Indication de réponse par email */}
        <EmailReplyHint message="Répondez directement à cet email pour envoyer un message dans cette conversation." />

        {/* Note */}
        <Text className="text-gray-500 text-xs leading-relaxed text-center mt-6 mb-0">
          Vous recevez cet email car vous participez à cette conversation.
          Les réponses par email sont automatiquement ajoutées à la conversation.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

// Props par défaut pour prévisualisation
NewMessageEmail.PreviewProps = {
  firstName: 'Thomas',
  sender: {
    name: 'Marie Dupont',
    role: 'locataire',
  },
  messagePreview: 'Bonjour, je voulais vous informer que le problème de fuite persiste malgré la première intervention. Pouvez-vous envoyer quelqu\'un rapidement ?',
  intervention: {
    id: 'abc-123-def',
    reference: 'INT-2024-042',
    title: 'Fuite d\'eau - Salle de bain',
    propertyAddress: '15 Rue de la Paix, 75002 Paris',
  },
  threadType: 'group',
  conversationUrl: 'https://seido.app/gestionnaire/interventions/abc-123-def?tab=conversations',
  sentAt: new Date(),
} as NewMessageEmailProps

export default NewMessageEmail
