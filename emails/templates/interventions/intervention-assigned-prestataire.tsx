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
import type { InterventionAssignedPrestataireEmailProps } from '@/emails/utils/types'

export const InterventionAssignedPrestataireEmail = ({
  firstName,
  interventionRef,
  interventionType,
  description,
  propertyAddress,
  lotReference,
  interventionUrl,
  managerName,
  urgency,
  createdAt,
  timeSlots,
  quoteInfo,
}: InterventionAssignedPrestataireEmailProps) => {
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

        {/* Section Créneaux proposés */}
        {timeSlots && timeSlots.length > 0 && (
          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <Heading as="h3" className="text-gray-900 text-sm font-semibold mt-0 mb-3">
              📅 Creneaux proposes
            </Heading>
            <Text className="text-gray-600 text-sm mb-3 mt-0">
              Le gestionnaire propose les creneaux suivants pour cette intervention :
            </Text>
            <ul className="text-gray-700 text-sm pl-4 m-0">
              {timeSlots.map((slot, index) => (
                <li key={index} className="py-1">
                  <strong>{formatSlotDate(slot.date)}</strong> de {slot.startTime} a {slot.endTime}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Section Devis (prestataire uniquement) */}
        {quoteInfo && (
          <div
            className="bg-amber-50 p-6 rounded-lg mb-6"
            style={{ borderLeft: '4px solid #F59E0B' }}
          >
            <Heading as="h3" className="text-gray-900 text-sm font-semibold mt-0 mb-3">
              💰 Devis {quoteInfo.isRequired ? 'requis' : 'optionnel'}
            </Heading>
            <Text className="text-gray-700 text-sm m-0">
              {quoteInfo.isRequired
                ? 'Un devis est requis avant de commencer cette intervention.'
                : 'Vous pouvez soumettre un devis si necessaire.'}
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
            <li>Proposez vos disponibilites ou un devis si demande</li>
            <li>Contactez le gestionnaire si vous avez des questions</li>
          </ul>
        </div>

        {/* Bouton CTA */}
        <EmailButton href={interventionUrl}>Voir l&apos;intervention</EmailButton>

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

// Props par defaut pour previsualisation
InterventionAssignedPrestataireEmail.PreviewProps = {
  firstName: 'Marc',
  interventionRef: 'INT-2024-042',
  interventionType: 'Plomberie',
  description:
    'Fuite d\'eau importante sous l\'evier de la cuisine. L\'eau coule en continu depuis ce matin. J\'ai coupe l\'arrivee d\'eau en attendant.',
  propertyAddress: '15 Rue de la Paix, 75002 Paris',
  lotReference: 'Apt 3B',
  interventionUrl: 'https://seido.app/prestataire/interventions/INT-2024-042',
  managerName: 'Jean Dupont',
  urgency: 'haute',
  createdAt: new Date(),
  timeSlots: [
    { date: new Date('2024-12-26'), startTime: '09:00', endTime: '12:00' },
    { date: new Date('2024-12-27'), startTime: '14:00', endTime: '17:00' },
  ],
  quoteInfo: {
    isRequired: true,
    estimatedAmount: 350,
    deadline: new Date('2024-12-25'),
  },
} as InterventionAssignedPrestataireEmailProps

export default InterventionAssignedPrestataireEmail
