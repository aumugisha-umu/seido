/**
 * 📧 Template Email - Intervention Planifiée
 *
 * Envoyé au locataire ET au prestataire quand un créneau est confirmé
 * Objectif: Confirmer le RDV et donner toutes les infos pratiques
 */

import * as React from 'react'
import { Section, Text, Heading, Hr } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import { EmailReplyHint } from '@/emails/components/email-reply-hint'
import type { InterventionScheduledEmailProps } from '@/emails/utils/types'

export const InterventionScheduledEmail = ({
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
  estimatedDuration,
  recipientRole,
}: InterventionScheduledEmailProps) => {
  const formattedDate = scheduledDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const formattedTime = scheduledDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const durationText = estimatedDuration
    ? estimatedDuration >= 60
      ? `${Math.floor(estimatedDuration / 60)}h${estimatedDuration % 60 > 0 ? estimatedDuration % 60 : ''}`
      : `${estimatedDuration} min`
    : 'à déterminer'

  // Messages personnalisés selon le destinataire
  const isT = recipientRole === 'locataire'

  return (
    <EmailLayout preview={`📅 RDV confirmé le ${formattedDate} - ${interventionRef}`}>
      <EmailHeader subject="Rendez-vous d'intervention confirmé" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          {isT ? (
            <>
              Le rendez-vous pour votre intervention a été confirmé avec{' '}
              <strong>{providerName}</strong>
              {providerCompany && <> de {providerCompany}</>}.
            </>
          ) : (
            <>
              Votre intervention chez le locataire a été planifiée. Merci de vous présenter à
              l'heure convenue.
            </>
          )}
        </Text>

        {/* Encadré date/heure */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white mb-6">
          <Text className="text-white text-center font-bold text-2xl m-0">📅 {formattedDate}</Text>
          <Text className="text-white text-center font-bold text-3xl mt-2 mb-0">
            🕐 {formattedTime}
          </Text>
          {estimatedDuration && (
            <Text className="text-blue-100 text-center text-sm mt-3 mb-0">
              Durée estimée : {durationText}
            </Text>
          )}
        </div>

        {/* Informations selon le rôle */}
        {isT ? (
          <>
            {/* Pour le locataire */}
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
                👤 Prestataire assigné
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
                      <td className="text-gray-600 py-2 pr-4 font-medium">Téléphone :</td>
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
          </>
        ) : (
          <>
            {/* Pour le prestataire */}
            <div className="bg-gray-50 p-6 rounded-lg mb-6">
              <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
                📍 Adresse d'intervention
              </Heading>
              <Text className="text-gray-900 text-base font-semibold m-0">{propertyAddress}</Text>
              {lotReference && (
                <Text className="text-gray-600 text-sm mt-1 mb-0">Lot : {lotReference}</Text>
              )}
            </div>
          </>
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
              {!isT && (
                <tr>
                  <td className="text-gray-600 py-2 pr-4 font-medium">Adresse :</td>
                  <td className="text-gray-900 py-2">{propertyAddress}</td>
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

        {/* Conseils */}
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-6 rounded-lg mb-6">
          <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
            {isT ? '📌 Points importants' : '🛠️ Avant l\'intervention'}
          </Text>
          {isT ? (
            <ul className="text-gray-700 text-sm leading-relaxed pl-5 m-0">
              <li>Assurez-vous d'être présent·e à l'heure convenue</li>
              <li>Préparez un accès facile à la zone concernée</li>
              <li>Le prestataire vous contactera si un empêchement survient</li>
              <li>
                En cas d'imprévu de votre côté, contactez le prestataire au{' '}
                {providerPhone || 'numéro indiqué'}
              </li>
            </ul>
          ) : (
            <ul className="text-gray-700 text-sm leading-relaxed pl-5 m-0">
              <li>Vérifiez que vous disposez du matériel nécessaire</li>
              <li>Contactez le locataire en cas d'empêchement</li>
              <li>Pensez à prendre des photos avant/après l'intervention</li>
              <li>N'oubliez pas de faire signer le bon d'intervention</li>
            </ul>
          )}
        </div>

        {/* Bouton CTA */}
        <EmailButton href={interventionUrl}>Voir tous les détails</EmailButton>

        {/* Indication de réponse par email */}
        <EmailReplyHint />

        {/* Note */}
        <Text className="text-gray-500 text-xs leading-relaxed text-center mt-6 mb-0">
          {isT
            ? 'Un rappel vous sera envoyé 24h avant le rendez-vous.'
            : 'Pensez à clôturer l\'intervention une fois terminée.'}
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

// Props par défaut pour prévisualisation (locataire)
InterventionScheduledEmail.PreviewProps = {
  firstName: 'Marie',
  interventionRef: 'INT-2024-042',
  interventionType: 'Plomberie',
  description:
    'Fuite d\'eau importante sous l\'évier de la cuisine. L\'eau coule en continu depuis ce matin.',
  propertyAddress: '15 Rue de la Paix, 75002 Paris',
  lotReference: 'Apt 3B',
  interventionUrl: 'https://seido.app/locataire/interventions/INT-2024-042',
  providerName: 'Pierre Dubois',
  providerCompany: 'Plomberie Express SARL',
  providerPhone: '+33 6 12 34 56 78',
  scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Dans 2 jours
  estimatedDuration: 90,
  recipientRole: 'locataire',
} as InterventionScheduledEmailProps

export default InterventionScheduledEmail
