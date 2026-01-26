/**
 * Template Email - Intervention Assignee au Prestataire
 *
 * Envoye au prestataire quand un gestionnaire l'assigne a une intervention
 * Objectif: Informer le prestataire et l'inciter a consulter les details
 */

import * as React from 'react'
import { Section, Text, Heading, Hr } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import { EmailAttachments } from '@/emails/components/email-attachments'
import { EmailReplyHint } from '@/emails/components/email-reply-hint'
import { TimeSlotCard } from '@/emails/components/email-action-buttons'
import type { InterventionAssignedPrestataireEmailProps } from '@/emails/utils/types'

export const InterventionAssignedPrestataireEmail = ({
  firstName,
  interventionRef,
  title,
  interventionType,
  description,
  propertyAddress,
  lotReference,
  interventionUrl,
  managerName,
  urgency,
  createdAt,
  timeSlots,
  planningType,
  quoteInfo,
  attachments,
  slotActions,
  enableInteractiveButtons = false,
}: InterventionAssignedPrestataireEmailProps) => {
  // Determine if we should show interactive buttons
  const showInteractiveButtons = enableInteractiveButtons && slotActions && slotActions.length > 0
  // Couleurs et icones selon l'urgence
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

  // Helper pour formater les dates des créneaux
  const formatSlotDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <EmailLayout preview={`Nouvelle mission ${interventionRef} - ${interventionType}`}>
      <EmailHeader subject="Nouvelle intervention assignee" />

      <Section className="bg-white px-8 py-8">
        {/* Salutation */}
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          <strong>{managerName}</strong> vous a assigne a une nouvelle intervention.
          Consultez les details ci-dessous.
        </Text>

        {/* Encadre urgence */}
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

        {/* Details de l'intervention */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
            🔧 Details de l&apos;intervention
          </Heading>

          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Reference :</td>
                <td className="text-gray-900 py-2 font-semibold">{interventionRef}</td>
              </tr>
              {title && (
                <tr>
                  <td className="text-gray-600 py-2 pr-4 font-medium">Titre :</td>
                  <td className="text-gray-900 py-2">{title}</td>
                </tr>
              )}
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Type :</td>
                <td className="text-gray-900 py-2">{interventionType}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Gestionnaire :</td>
                <td className="text-gray-900 py-2">{managerName}</td>
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

        {/* Pièces jointes */}
        {attachments && attachments.length > 0 && (
          <EmailAttachments attachments={attachments} />
        )}

        {/* Section Créneaux proposés */}
        {timeSlots && timeSlots.length > 0 && (
          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <Heading as="h3" className="text-gray-900 text-sm font-semibold mt-0 mb-3">
              📅 Creneaux proposes
            </Heading>
            <Text className="text-gray-600 text-sm mb-3 mt-0">
              Le gestionnaire propose les creneaux suivants pour cette intervention :
            </Text>

            {/* Mode interactif: cartes avec boutons d'action */}
            {showInteractiveButtons ? (
              <div>
                {slotActions!.map((slot, index) => {
                  const dateStr = slot.date.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  })
                  // Mode direct: heure fixe uniquement / Mode propose: plage horaire
                  const timeRange = planningType === 'direct'
                    ? `à ${slot.startTime}`
                    : `${slot.startTime} - ${slot.endTime}`

                  return (
                    <TimeSlotCard
                      key={slot.slotId || index}
                      dateFormatted={dateStr}
                      timeRange={timeRange}
                      index={index}
                      acceptUrl={slot.acceptUrl}
                      refuseUrl={slot.refuseUrl}
                      showActions={true}
                    />
                  )
                })}
                <Text className="text-gray-500 text-xs mt-4 mb-0">
                  💡 Cliquez sur un bouton pour accepter ou refuser directement ce creneau.
                </Text>
              </div>
            ) : (
              /* Mode classique: liste simple sans boutons */
              <ul className="text-gray-700 text-sm pl-4 m-0">
                {timeSlots.map((slot, index) => (
                  <li key={index} className="py-1">
                    {planningType === 'direct' ? (
                      <><strong>{formatSlotDate(slot.date)}</strong> à {slot.startTime}</>
                    ) : (
                      <><strong>{formatSlotDate(slot.date)}</strong> de {slot.startTime} à {slot.endTime}</>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Section Estimation (prestataire uniquement) */}
        {quoteInfo && (
          <div
            className="bg-amber-50 p-6 rounded-lg mb-6"
            style={{ borderLeft: '4px solid #F59E0B' }}
          >
            <Heading as="h3" className="text-gray-900 text-sm font-semibold mt-0 mb-3">
              💰 Estimation {quoteInfo.isRequired ? 'requise' : 'optionnelle'}
            </Heading>
            <Text className="text-gray-700 text-sm m-0">
              {quoteInfo.isRequired
                ? 'Une estimation est requise avant de commencer cette intervention.'
                : 'Vous pouvez soumettre une estimation si necessaire.'}
            </Text>
            {quoteInfo.estimatedAmount && (
              <Text className="text-gray-600 text-sm mt-2 mb-0">
                Budget estime : {quoteInfo.estimatedAmount.toLocaleString('fr-FR')} €
              </Text>
            )}
            {quoteInfo.deadline && (
              <Text className="text-gray-600 text-sm mt-1 mb-0">
                Date limite : {formatSlotDate(quoteInfo.deadline)}
              </Text>
            )}
          </div>
        )}

        {/* Prochaines etapes */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg mb-6">
          <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
            📋 Prochaines etapes
          </Text>
          <ul className="text-gray-700 text-sm leading-relaxed pl-5 mt-2 mb-0">
            <li>Consultez les details complets de l&apos;intervention</li>
            <li>Proposez vos disponibilites ou une estimation si demandee</li>
            <li>Contactez le gestionnaire si vous avez des questions</li>
          </ul>
        </div>

        {/* Bouton CTA */}
        <EmailButton href={interventionUrl}>Voir l&apos;intervention</EmailButton>

        {/* Indication de réponse par email */}
        <EmailReplyHint />

        {/* Note de pied */}
        <Text className="text-gray-500 text-xs leading-relaxed text-center mt-6 mb-0">
          Vous recevez cet email car vous etes prestataire sur la plateforme SEIDO.<br />
          Cette intervention vous a ete assignee par {managerName}.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

// Date de base fixe pour éviter les erreurs d'hydratation (server/client)
const BASE_PREVIEW_DATE = new Date('2026-01-27T10:00:00.000Z')
const previewFutureDate = (days: number) => new Date(BASE_PREVIEW_DATE.getTime() + days * 24 * 60 * 60 * 1000)

// Props par defaut pour previsualisation (mode interactif)
InterventionAssignedPrestataireEmail.PreviewProps = {
  firstName: 'Marc',
  interventionRef: 'INT-2024-042',
  title: 'Fuite importante cuisine',
  interventionType: 'Plomberie',
  description:
    'Fuite d\'eau importante sous l\'evier de la cuisine. L\'eau coule en continu depuis ce matin. J\'ai coupe l\'arrivee d\'eau en attendant.',
  propertyAddress: '15 Rue de la Paix, 75002 Paris',
  lotReference: 'Apt 3B',
  interventionUrl: 'https://seido.app/prestataire/interventions/INT-2024-042',
  managerName: 'Jean Dupont',
  urgency: 'haute',
  createdAt: BASE_PREVIEW_DATE,
  planningType: 'propose',
  timeSlots: [
    { date: previewFutureDate(2), startTime: '09:00', endTime: '12:00' },
    { date: previewFutureDate(3), startTime: '14:00', endTime: '17:00' },
  ],
  quoteInfo: {
    isRequired: true,
    estimatedAmount: 350,
    deadline: previewFutureDate(1),
  },
  // Mode interactif avec boutons d'action
  enableInteractiveButtons: true,
  slotActions: [
    {
      slotId: 'slot-001',
      date: previewFutureDate(2),
      startTime: '09:00',
      endTime: '12:00',
      acceptUrl: 'https://seido.app/auth/email-callback?token_hash=xxx&action=accept_time_slot&param_slotId=slot-001',
      refuseUrl: 'https://seido.app/auth/email-callback?token_hash=yyy&action=reject_slot&param_slotId=slot-001',
    },
    {
      slotId: 'slot-002',
      date: previewFutureDate(3),
      startTime: '14:00',
      endTime: '17:00',
      acceptUrl: 'https://seido.app/auth/email-callback?token_hash=xxx&action=accept_time_slot&param_slotId=slot-002',
      refuseUrl: 'https://seido.app/auth/email-callback?token_hash=yyy&action=reject_slot&param_slotId=slot-002',
    },
  ],
} as InterventionAssignedPrestataireEmailProps

export default InterventionAssignedPrestataireEmail
