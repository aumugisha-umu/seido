/**
 * Template Email - Rappel RDV Intervention
 *
 * Envoyé au locataire, prestataire et gestionnaire 24h et 1h avant le RDV
 * Objectif: Rappeler le rendez-vous avec toutes les infos pratiques
 */

import * as React from 'react'
import { Section, Text, Heading, Hr } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { InterventionReminderEmailProps } from '@/emails/utils/types'

export const InterventionReminderEmail = ({
  firstName,
  interventionRef,
  interventionType,
  description,
  propertyAddress,
  lotReference,
  interventionUrl,
  providerName,
  providerCompany,
  providerPhone,
  scheduledDate,
  startTime,
  endTime,
  estimatedDuration,
  recipientRole,
  reminderType,
  tenantName,
}: InterventionReminderEmailProps) => {
  const formattedDate = scheduledDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const baseTime = scheduledDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  // Si on a un créneau avec start+end, afficher la plage horaire
  const formattedTime = (startTime && endTime)
    ? `${startTime} - ${endTime}`
    : baseTime

  const durationText = estimatedDuration
    ? estimatedDuration >= 60
      ? `${Math.floor(estimatedDuration / 60)}h${estimatedDuration % 60 > 0 ? estimatedDuration % 60 : ''}`
      : `${estimatedDuration} min`
    : null

  const is24h = reminderType === '24h'
  const timeLabel = is24h ? '24 heures' : '1 heure'

  // Badge urgency colors
  const badgeBg = is24h ? '#f97316' : '#ef4444' // orange-500 / red-500
  const badgeLabel = is24h ? 'Rappel 24h' : 'Rappel 1h'

  // Role-specific intro message
  const getIntroMessage = () => {
    switch (recipientRole) {
      case 'locataire':
        return (
          <>
            Votre rendez-vous d'intervention est pr&eacute;vu dans <strong>{timeLabel}</strong> avec{' '}
            <strong>{providerName}</strong>
            {providerCompany && <> de {providerCompany}</>}.
          </>
        )
      case 'prestataire':
        return (
          <>
            Rappel : votre intervention{tenantName ? <> chez <strong>{tenantName}</strong></> : null} est
            pr&eacute;vue dans <strong>{timeLabel}</strong>.
          </>
        )
      case 'gestionnaire':
        return (
          <>
            Rappel : une intervention est planifi&eacute;e dans <strong>{timeLabel}</strong>.
            {providerName && <> Prestataire : <strong>{providerName}</strong>.</>}
            {tenantName && <> Locataire : <strong>{tenantName}</strong>.</>}
          </>
        )
    }
  }

  return (
    <EmailLayout preview={`${badgeLabel} - RDV le ${formattedDate} - ${interventionRef}`}>
      <EmailHeader subject="Rappel de rendez-vous" />

      <Section className="bg-white px-8 py-8">
        {/* Badge urgence */}
        <div className="text-center mb-4">
          <span
            style={{
              backgroundColor: badgeBg,
              color: 'white',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 'bold',
              display: 'inline-block',
            }}
          >
            {is24h ? '🔔' : '🚨'} {badgeLabel}
          </span>
        </div>

        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          {getIntroMessage()}
        </Text>

        {/* Date/time box */}
        <div
          style={{
            background: is24h
              ? 'linear-gradient(to right, #f97316, #ea580c)'
              : 'linear-gradient(to right, #ef4444, #dc2626)',
            padding: '24px',
            borderRadius: '8px',
            color: 'white',
            marginBottom: '24px',
          }}
        >
          <Text className="text-white text-center font-bold text-2xl m-0">
            {is24h ? '📅' : '⏰'} {formattedDate}
          </Text>
          <Text className="text-white text-center font-bold text-3xl mt-2 mb-0">
            🕐 {formattedTime}
          </Text>
          {durationText && (
            <Text className="text-center text-sm mt-3 mb-0" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Dur&eacute;e estim&eacute;e : {durationText}
            </Text>
          )}
        </div>

        {/* Role-specific content */}
        {recipientRole === 'locataire' && (
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
              👤 Prestataire
            </Heading>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="text-gray-600 py-2 pr-4 font-medium">Nom :</td>
                  <td className="text-gray-900 py-2 font-semibold">{providerName}</td>
                </tr>
                {providerCompany && (
                  <tr>
                    <td className="text-gray-600 py-2 pr-4 font-medium">Entreprise :</td>
                    <td className="text-gray-900 py-2">{providerCompany}</td>
                  </tr>
                )}
                {providerPhone && (
                  <tr>
                    <td className="text-gray-600 py-2 pr-4 font-medium">T&eacute;l&eacute;phone :</td>
                    <td className="text-gray-900 py-2">
                      <a href={`tel:${providerPhone}`} className="text-blue-600 no-underline">
                        {providerPhone}
                      </a>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {recipientRole === 'prestataire' && (
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
              📍 Adresse d'intervention
            </Heading>
            <Text className="text-gray-900 text-base font-semibold m-0">{propertyAddress}</Text>
            {lotReference && (
              <Text className="text-gray-600 text-sm mt-1 mb-0">Lot : {lotReference}</Text>
            )}
          </div>
        )}

        {recipientRole === 'gestionnaire' && (
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
              📋 R&eacute;sum&eacute;
            </Heading>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="text-gray-600 py-2 pr-4 font-medium">Prestataire :</td>
                  <td className="text-gray-900 py-2 font-semibold">{providerName}</td>
                </tr>
                {tenantName && (
                  <tr>
                    <td className="text-gray-600 py-2 pr-4 font-medium">Locataire :</td>
                    <td className="text-gray-900 py-2">{tenantName}</td>
                  </tr>
                )}
                <tr>
                  <td className="text-gray-600 py-2 pr-4 font-medium">Adresse :</td>
                  <td className="text-gray-900 py-2">{propertyAddress}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Intervention details */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
            🔧 D&eacute;tails de l'intervention
          </Heading>
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">R&eacute;f&eacute;rence :</td>
                <td className="text-gray-900 py-2 font-semibold">{interventionRef}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Type :</td>
                <td className="text-gray-900 py-2">{interventionType}</td>
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

        {/* CTA */}
        <EmailButton href={interventionUrl}>Voir les d&eacute;tails</EmailButton>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

// Preview props
InterventionReminderEmail.PreviewProps = {
  firstName: 'Marie',
  interventionRef: 'INT-2024-042',
  interventionType: 'Plomberie',
  description:
    'Fuite d\'eau importante sous l\'&eacute;vier de la cuisine.',
  propertyAddress: '15 Rue de la Paix, 75002 Paris',
  lotReference: 'Apt 3B',
  interventionUrl: 'https://seido.app/locataire/interventions/INT-2024-042',
  providerName: 'Pierre Dubois',
  providerCompany: 'Plomberie Express SARL',
  providerPhone: '+33 6 12 34 56 78',
  scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  estimatedDuration: 90,
  recipientRole: 'locataire',
  reminderType: '24h',
  tenantName: 'Marie Dupont',
} as InterventionReminderEmailProps

export default InterventionReminderEmail
