/**
 * Template Email - Créneaux Proposés (Interactif)
 *
 * Envoyé au locataire ET au prestataire quand le gestionnaire propose des créneaux
 * Objectif: Informer les parties des créneaux disponibles et les inviter à choisir
 *
 * INTERACTIF (v2):
 * - Chaque créneau peut avoir ses propres boutons Accepter/Refuser
 * - Les boutons utilisent des magic links avec actions intégrées
 * - L'action est auto-exécutée après authentification
 *
 * @see /lib/services/domain/magic-link.service.ts - Génération des liens
 * @see /hooks/use-auto-execute-action.ts - Exécution client
 */

import * as React from 'react'
import { Section, Text, Heading, Hr } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import { EmailReplyHint } from '@/emails/components/email-reply-hint'
import { TimeSlotCard } from '@/emails/components/email-action-buttons'
import type { TimeSlotsProposedEmailProps } from '@/emails/utils/types'

export const TimeSlotsProposedEmail = ({
  firstName,
  interventionRef,
  interventionType,
  description,
  propertyAddress,
  lotReference,
  interventionUrl,
  managerName,
  planningType,
  proposedSlots,
  responseDeadline,
  recipientRole,
  slotActions,
  enableInteractiveButtons = false,
}: TimeSlotsProposedEmailProps) => {
  // Determine if we should show interactive buttons
  const showInteractiveButtons = enableInteractiveButtons && slotActions && slotActions.length > 0
  // Messages personnalisés selon le type de planification
  const planningMessages = {
    direct: 'Un rendez-vous a été proposé',
    propose: 'Des créneaux ont été proposés',
    organize: 'Une planification autonome a été activée'
  }

  const actionMessages = {
    direct: 'Veuillez confirmer votre disponibilité pour ce créneau.',
    propose: 'Veuillez indiquer vos préférences parmi les créneaux proposés.',
    organize: 'Vous pouvez proposer vos propres créneaux et vous organiser directement avec les autres parties.'
  }

  // Formatter les créneaux (adapté selon le mode de planification)
  const formatSlot = (slot: { date: Date; startTime: string; endTime: string }) => {
    const dateStr = slot.date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    })
    // Mode direct: heure fixe uniquement / Mode propose: plage horaire complète
    if (planningType === 'direct') {
      return `${dateStr} à ${slot.startTime}`
    }
    return `${dateStr} de ${slot.startTime} à ${slot.endTime}`
  }

  const isLocataire = recipientRole === 'locataire'

  return (
    <EmailLayout preview={`${planningMessages[planningType]} - ${interventionRef}`}>
      <EmailHeader subject={planningMessages[planningType]} />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          {planningMessages[planningType]} pour votre intervention par{' '}
          <strong>{managerName}</strong>.{' '}
          {actionMessages[planningType]}
        </Text>

        {/* Encadré principal */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white mb-6">
          <Text className="text-white text-center font-bold text-xl m-0">
            {planningType === 'organize' ? '🤝 Planification autonome' : '📅 Créneaux proposés'}
          </Text>
          {responseDeadline && (
            <Text className="text-blue-100 text-center text-sm mt-3 mb-0">
              Réponse attendue avant le{' '}
              {responseDeadline.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </Text>
          )}
        </div>

        {/* Liste des créneaux (sauf pour organize) */}
        {planningType !== 'organize' && proposedSlots.length > 0 && (
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
              {planningType === 'direct' ? '📌 Créneau fixé' : '📋 Créneaux disponibles'}
            </Heading>

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
                  💡 Cliquez sur un bouton pour accepter ou refuser directement ce créneau.
                </Text>
              </div>
            ) : (
              /* Mode classique: liste simple sans boutons */
              <ul className="text-gray-700 text-base leading-relaxed pl-0 m-0 list-none">
                {proposedSlots.map((slot, index) => (
                  <li
                    key={index}
                    className="py-3 px-4 mb-2 bg-white rounded border border-gray-200 flex items-center"
                  >
                    <span className="text-blue-600 font-semibold mr-3">#{index + 1}</span>
                    <span>{formatSlot(slot)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Mode organize - message spécial */}
        {planningType === 'organize' && (
          <div className="bg-amber-50 p-6 rounded-lg mb-6 border-l-4 border-amber-400">
            <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
              🤝 Comment ça fonctionne ?
            </Text>
            <ul className="text-gray-700 text-sm leading-relaxed pl-5 m-0">
              <li>Vous pouvez proposer vos propres créneaux depuis l'application</li>
              <li>Le prestataire et le locataire peuvent s'organiser directement</li>
              <li>Une fois un créneau validé, tout le monde sera notifié</li>
            </ul>
          </div>
        )}

        {/* Détails intervention */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
            🔧 Détails de l'intervention
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

        {/* Instructions selon le rôle */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg mb-6">
          <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
            {isLocataire ? '📌 Ce que vous devez faire' : '🛠️ Prochaines étapes'}
          </Text>
          {isLocataire ? (
            <ul className="text-gray-700 text-sm leading-relaxed pl-5 m-0">
              <li>Consultez les créneaux proposés</li>
              <li>Indiquez vos disponibilités dans l'application</li>
              <li>Vous serez notifié une fois le rendez-vous confirmé</li>
            </ul>
          ) : (
            <ul className="text-gray-700 text-sm leading-relaxed pl-5 m-0">
              <li>Vérifiez votre disponibilité pour les créneaux proposés</li>
              <li>Confirmez ou proposez des alternatives dans l'application</li>
              <li>Préparez le matériel nécessaire pour l'intervention</li>
            </ul>
          )}
        </div>

        {/* Bouton CTA */}
        <EmailButton href={interventionUrl}>
          {planningType === 'organize'
            ? 'Proposer mes disponibilités'
            : 'Choisir un créneau'}
        </EmailButton>

        {/* Indication de réponse par email */}
        <EmailReplyHint />

        {/* Note */}
        <Text className="text-gray-500 text-xs leading-relaxed text-center mt-6 mb-0">
          Ce message a été envoyé automatiquement. Cliquez sur le bouton ci-dessus pour répondre.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

// Props par défaut pour prévisualisation (mode interactif)
TimeSlotsProposedEmail.PreviewProps = {
  firstName: 'Marie',
  interventionRef: 'INT-2024-042',
  interventionType: 'Plomberie',
  description:
    'Fuite d\'eau importante sous l\'évier de la cuisine. L\'eau coule en continu depuis ce matin.',
  propertyAddress: '15 Rue de la Paix, 75002 Paris',
  lotReference: 'Apt 3B',
  interventionUrl: 'https://seido.app/locataire/interventions/INT-2024-042',
  managerName: 'Thomas Martin',
  planningType: 'propose',
  proposedSlots: [
    { date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), startTime: '09:00', endTime: '11:00' },
    { date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), startTime: '14:00', endTime: '16:00' },
    { date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), startTime: '10:00', endTime: '12:00' },
  ],
  responseDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  recipientRole: 'locataire',
  // Mode interactif avec boutons d'action
  enableInteractiveButtons: true,
  slotActions: [
    {
      slotId: 'slot-001',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      startTime: '09:00',
      endTime: '11:00',
      acceptUrl: 'https://seido.app/auth/email-callback?token_hash=xxx&action=confirm_slot&param_slotId=slot-001',
      refuseUrl: 'https://seido.app/auth/email-callback?token_hash=yyy&action=reject_slot&param_slotId=slot-001',
    },
    {
      slotId: 'slot-002',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      startTime: '14:00',
      endTime: '16:00',
      acceptUrl: 'https://seido.app/auth/email-callback?token_hash=xxx&action=confirm_slot&param_slotId=slot-002',
      refuseUrl: 'https://seido.app/auth/email-callback?token_hash=yyy&action=reject_slot&param_slotId=slot-002',
    },
    {
      slotId: 'slot-003',
      date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      startTime: '10:00',
      endTime: '12:00',
      acceptUrl: 'https://seido.app/auth/email-callback?token_hash=xxx&action=confirm_slot&param_slotId=slot-003',
      refuseUrl: 'https://seido.app/auth/email-callback?token_hash=yyy&action=reject_slot&param_slotId=slot-003',
    },
  ],
} as TimeSlotsProposedEmailProps

export default TimeSlotsProposedEmail
