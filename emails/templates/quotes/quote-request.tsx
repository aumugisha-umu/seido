/**
 * 📧 Template Email - Demande d'Estimation (Interactif)
 *
 * Envoyé au prestataire quand le gestionnaire demande une estimation
 * Objectif: Demander au prestataire de soumettre son estimation
 *
 * INTERACTIF (v2):
 * - Boutons d'estimation rapide avec montants prédéfinis (150€, 300€, 500€)
 * - Le prestataire peut cliquer pour soumettre directement une estimation
 * - Bouton "Estimation détaillée" toujours disponible pour une estimation complète
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
import { EmailActionButtons } from '@/emails/components/email-action-buttons'
import type { QuoteRequestEmailProps } from '@/emails/utils/types'

export const QuoteRequestEmail = ({
  firstName,
  quoteRef,
  interventionRef,
  interventionType,
  description,
  propertyAddress,
  quoteUrl,
  managerName,
  deadline,
  additionalInfo,
  quickEstimates,
  enableInteractiveButtons = false,
}: QuoteRequestEmailProps) => {
  // Show quick estimate buttons if enabled and estimates provided
  const showQuickEstimates = enableInteractiveButtons && quickEstimates && quickEstimates.length > 0

  // Format amount for display
  const formatAmount = (amount: number) => `${amount}€`
  const formattedDeadline = deadline
    ? deadline.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : undefined

  return (
    <EmailLayout preview={`Demande d'estimation ${quoteRef} - ${interventionType}`}>
      <EmailHeader subject="Nouvelle demande d'estimation" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          <strong>{managerName}</strong> vous demande de soumettre une estimation pour une intervention.
        </Text>

        {/* Encadré deadline si présent */}
        {deadline && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-lg mb-6">
            <Text className="text-amber-900 font-bold text-base m-0">
              ⏱️ À soumettre avant le {formattedDeadline}
            </Text>
          </div>
        )}

        {/* Détails */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
            📋 Détails de l'intervention
          </Heading>

          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Référence estimation :</td>
                <td className="text-gray-900 py-2 font-semibold">{quoteRef}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Intervention :</td>
                <td className="text-gray-900 py-2">{interventionRef}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Type :</td>
                <td className="text-gray-900 py-2">{interventionType}</td>
              </tr>
              <tr>
                <td className="text-gray-600 py-2 pr-4 font-medium">Adresse :</td>
                <td className="text-gray-900 py-2">{propertyAddress}</td>
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

          {additionalInfo && (
            <>
              <Hr className="my-4 border-gray-200" />
              <Heading as="h3" className="text-gray-900 text-sm font-semibold mt-4 mb-2">
                Informations complémentaires :
              </Heading>
              <Text className="text-gray-700 text-sm leading-relaxed bg-white p-3 rounded border border-gray-200 m-0">
                {additionalInfo}
              </Text>
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg mb-6">
          <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
            📝 Pour soumettre votre estimation
          </Text>
          <ul className="text-gray-700 text-sm leading-relaxed pl-5 m-0">
            <li>Indiquez le montant total HT et TTC</li>
            <li>Détaillez les travaux à réaliser</li>
            <li>Précisez la durée estimée de l'intervention</li>
            <li>Vous pouvez joindre un PDF de votre estimation détaillée</li>
          </ul>
        </div>

        {/* Boutons d'action */}
        {showQuickEstimates ? (
          /* Mode interactif: estimation rapide + estimation détaillée */
          <div className="mb-6">
            {/* Section estimation rapide */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg mb-4 border border-green-200">
              <Text className="text-green-900 font-semibold text-base mb-3 mt-0">
                ⚡ Estimation rapide
              </Text>
              <Text className="text-green-800 text-sm mb-4">
                Cliquez sur un montant pour soumettre directement une estimation :
              </Text>
              <EmailActionButtons
                actions={quickEstimates!.map(estimate => ({
                  label: estimate.label || formatAmount(estimate.amount),
                  href: estimate.url,
                  variant: 'success' as const,
                  icon: '💰'
                }))}
                layout="horizontal"
                size="medium"
              />
            </div>

            {/* Bouton estimation détaillée */}
            <Text className="text-gray-600 text-sm text-center mb-3">
              ou pour une estimation plus précise :
            </Text>
            <EmailButton href={quoteUrl}>Soumettre une estimation détaillée</EmailButton>
          </div>
        ) : (
          /* Mode classique: un seul bouton */
          <EmailButton href={quoteUrl}>Soumettre mon estimation</EmailButton>
        )}

        {/* Indication de réponse par email */}
        <EmailReplyHint />

        <Text className="text-gray-500 text-xs leading-relaxed text-center mt-6 mb-0">
          Cette demande a été créée par {managerName}.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

QuoteRequestEmail.PreviewProps = {
  firstName: 'Pierre',
  quoteRef: 'DEV-2024-015',
  interventionRef: 'INT-2024-042',
  interventionType: 'Plomberie',
  description: 'Fuite d\'eau importante sous l\'évier de la cuisine.',
  propertyAddress: '15 Rue de la Paix, 75002 Paris',
  quoteUrl: 'https://seido.app/prestataire/devis/DEV-2024-015',
  managerName: 'Jean Martin',
  deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  additionalInfo: 'Accès à l\'appartement possible en semaine entre 9h et 17h.',
  // Mode interactif avec estimations rapides
  enableInteractiveButtons: true,
  quickEstimates: [
    {
      amount: 150,
      label: '150€',
      url: 'https://seido.app/auth/email-callback?token_hash=xxx&action=submit_quick_estimate&param_amount=150&param_quoteId=DEV-2024-015',
    },
    {
      amount: 300,
      label: '300€',
      url: 'https://seido.app/auth/email-callback?token_hash=yyy&action=submit_quick_estimate&param_amount=300&param_quoteId=DEV-2024-015',
    },
    {
      amount: 500,
      label: '500€',
      url: 'https://seido.app/auth/email-callback?token_hash=zzz&action=submit_quick_estimate&param_amount=500&param_quoteId=DEV-2024-015',
    },
  ],
} as QuoteRequestEmailProps

export default QuoteRequestEmail
