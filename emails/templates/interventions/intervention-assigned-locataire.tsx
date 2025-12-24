/**
 * Template Email - Intervention Assignee au Locataire
 *
 * Envoye au locataire quand une intervention est creee pour son logement
 * Objectif: Informer le locataire et lui permettre de suivre l'intervention
 */

import * as React from 'react'
import { Section, Text, Heading, Hr } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { InterventionAssignedLocataireEmailProps } from '@/emails/utils/types'

export const InterventionAssignedLocataireEmail = ({
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
}: InterventionAssignedLocataireEmailProps) => {
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
    <EmailLayout preview={`Intervention ${interventionRef} pour votre logement`}>
      <EmailHeader subject="Intervention prevue pour votre logement" />

      <Section className="bg-white px-8 py-8">
        {/* Salutation */}
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          Une intervention a ete programmee pour votre logement par <strong>{managerName}</strong>.
          Vous trouverez ci-dessous tous les details.
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
            {config.icon} Priorite : {config.label}
          </Text>
        </div>

        {/* Details de l'intervention */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
            🏠 Details de l&apos;intervention
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
                <td className="text-gray-600 py-2 pr-4 font-medium">Date de creation :</td>
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

        {/* Section Créneaux proposés (locataire - pas de section devis) */}
        {timeSlots && timeSlots.length > 0 && (
          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <Heading as="h3" className="text-gray-900 text-sm font-semibold mt-0 mb-3">
              📅 Creneaux d&apos;intervention proposes
            </Heading>
            <Text className="text-gray-600 text-sm mb-3 mt-0">
              Voici les creneaux proposes pour cette intervention :
            </Text>
            <ul className="text-gray-700 text-sm pl-4 m-0">
              {timeSlots.map((slot, index) => (
                <li key={index} className="py-1">
                  <strong>{formatSlotDate(slot.date)}</strong> de {slot.startTime} a {slot.endTime}
                </li>
              ))}
            </ul>
            <Text className="text-gray-500 text-xs mt-3 mb-0">
              Vous serez informe une fois le creneau confirme.
            </Text>
          </div>
        )}

        {/* Informations importantes */}
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg mb-6">
          <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
            ℹ️ Informations importantes
          </Text>
          <ul className="text-gray-700 text-sm leading-relaxed pl-5 mt-2 mb-0">
            <li>Vous serez informe des prochaines etapes par notification</li>
            <li>Un prestataire vous contactera pour convenir d&apos;un rendez-vous</li>
            <li>Suivez l&apos;avancement directement depuis votre espace</li>
          </ul>
        </div>

        {/* Bouton CTA */}
        <EmailButton href={interventionUrl}>Suivre l&apos;intervention</EmailButton>

        {/* Note de pied */}
        <Text className="text-gray-500 text-xs leading-relaxed text-center mt-6 mb-0">
          Vous recevez cet email car vous etes locataire du bien concerne.<br />
          Cette intervention a ete creee par votre gestionnaire {managerName}.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

// Props par defaut pour previsualisation
InterventionAssignedLocataireEmail.PreviewProps = {
  firstName: 'Emma',
  interventionRef: 'INT-2024-042',
  interventionType: 'Plomberie',
  description:
    'Intervention de reparation suite a une fuite d\'eau sous l\'evier de la cuisine. Un plombier interviendra prochainement.',
  propertyAddress: '15 Rue de la Paix, 75002 Paris',
  lotReference: 'Apt 3B',
  interventionUrl: 'https://seido.app/locataire/interventions/INT-2024-042',
  managerName: 'Jean Dupont',
  urgency: 'haute',
  createdAt: new Date(),
  timeSlots: [
    { date: new Date('2024-12-26'), startTime: '09:00', endTime: '12:00' },
    { date: new Date('2024-12-27'), startTime: '14:00', endTime: '17:00' },
  ],
  // Note: Pas de quoteInfo pour le locataire
} as InterventionAssignedLocataireEmailProps

export default InterventionAssignedLocataireEmail
