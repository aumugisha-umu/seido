/**
 * 📧 Template Email - Intervention Terminée (Interactif)
 *
 * Envoyé au locataire et gestionnaire quand le prestataire clôture l'intervention
 * Objectif: Confirmer la clôture et demander validation
 *
 * INTERACTIF (v2):
 * - Pour le locataire: boutons Valider et Signaler un problème
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
import { EmailActionButtons } from '@/emails/components/email-action-buttons'
import type { InterventionCompletedEmailProps } from '@/emails/utils/types'

export const InterventionCompletedEmail = ({
  firstName,
  interventionRef,
  interventionType,
  description,
  propertyAddress,
  lotReference,
  interventionUrl,
  providerName,
  completedAt,
  completionNotes,
  hasDocuments,
  recipientRole,
  validateUrl,
  contestUrl,
  enableInteractiveButtons = false,
}: InterventionCompletedEmailProps) => {
  // Show interactive buttons only for tenants with valid URLs
  const showInteractiveButtons = enableInteractiveButtons && recipientRole === 'locataire' && (validateUrl || contestUrl)
  const formattedDate = completedAt.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const isTenant = recipientRole === 'locataire'

  return (
    <EmailLayout preview={`✅ Intervention ${interventionRef} terminée`}>
      <EmailHeader subject="Intervention terminée" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          {isTenant ? (
            <>
              <strong>{providerName}</strong> a marqué votre intervention comme terminée.
            </>
          ) : (
            <>
              L'intervention réalisée par <strong>{providerName}</strong> vient d'être clôturée.
            </>
          )}
        </Text>

        {/* Encadré confirmation */}
        <div className="bg-green-50 border-l-4 border-green-500 p-5 rounded-lg mb-6">
          <Text className="text-green-900 font-bold text-lg m-0">
            ✅ Intervention terminée
          </Text>
          <Text className="text-green-700 text-sm mt-2 mb-0">
            Clôturée le {formattedDate}
          </Text>
        </div>

        {/* Rapport du prestataire */}
        {completionNotes && (
          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <Heading as="h2" className="text-blue-900 text-lg font-semibold mt-0 mb-3">
              📝 Rapport du prestataire
            </Heading>
            <Text className="text-blue-800 text-sm leading-relaxed bg-white p-4 rounded border border-blue-200 m-0">
              {completionNotes}
            </Text>
          </div>
        )}

        {/* Documents */}
        {hasDocuments && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-lg mb-6">
            <Text className="text-amber-900 font-semibold text-base mb-2 mt-0">
              📎 Documents disponibles
            </Text>
            <Text className="text-amber-800 text-sm m-0">
              Le prestataire a ajouté des documents (photos, factures, etc.). Vous pouvez les
              consulter sur la page de l'intervention.
            </Text>
          </div>
        )}

        {/* Détails */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <Heading as="h2" className="text-gray-900 text-lg font-semibold mt-0 mb-4">
            📋 Récapitulatif
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
                <td className="text-gray-600 py-2 pr-4 font-medium">Prestataire :</td>
                <td className="text-gray-900 py-2">{providerName}</td>
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
            Demande initiale :
          </Heading>
          <Text className="text-gray-700 text-sm leading-relaxed bg-white p-3 rounded border border-gray-200 m-0">
            {description}
          </Text>
        </div>

        {/* Action requise */}
        {isTenant ? (
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg mb-6">
            <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
              ⭐ Votre avis compte !
            </Text>
            <Text className="text-gray-700 text-sm leading-relaxed m-0">
              Merci de <strong>valider ou signaler un problème</strong> concernant cette
              intervention. Votre retour nous aide à améliorer la qualité du service.
            </Text>
            <ul className="text-gray-700 text-sm leading-relaxed pl-5 mt-3 mb-0">
              <li>✅ Valider si tout est conforme à votre demande</li>
              <li>⚠️ Signaler un problème si l'intervention n'est pas satisfaisante</li>
            </ul>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg mb-6">
            <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
              🔍 Action requise
            </Text>
            <Text className="text-gray-700 text-sm leading-relaxed m-0">
              Veuillez vérifier le rapport du prestataire et valider cette intervention pour
              finaliser le dossier.
            </Text>
          </div>
        )}

        {/* Boutons d'action */}
        {showInteractiveButtons ? (
          /* Mode interactif: 2 boutons côte à côte pour le locataire */
          <div className="mb-6">
            <EmailActionButtons
              actions={[
                ...(validateUrl ? [{ label: 'Valider les travaux', href: validateUrl, variant: 'success' as const, icon: '✅' }] : []),
                ...(contestUrl ? [{ label: 'Signaler un problème', href: contestUrl, variant: 'danger' as const, icon: '⚠️' }] : []),
              ]}
              layout="horizontal"
              size="medium"
            />
            <Text className="text-gray-500 text-xs text-center mt-3 mb-0">
              💡 Cliquez sur un bouton pour valider ou signaler directement.
            </Text>
          </div>
        ) : (
          /* Mode classique: un seul bouton CTA */
          <EmailButton href={interventionUrl}>
            {isTenant ? 'Valider l\'intervention' : 'Examiner le rapport'}
          </EmailButton>
        )}

        {/* Indication de réponse par email */}
        <EmailReplyHint />

        {/* Note */}
        <Text className="text-gray-500 text-xs leading-relaxed text-center mt-6 mb-0">
          {isTenant
            ? 'L\'intervention sera automatiquement validée après 7 jours sans retour de votre part.'
            : 'Le locataire a également reçu une notification pour valider l\'intervention.'}
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

// Props par défaut pour prévisualisation (locataire avec mode interactif)
InterventionCompletedEmail.PreviewProps = {
  firstName: 'Marie',
  interventionRef: 'INT-2024-042',
  interventionType: 'Plomberie',
  description:
    'Fuite d\'eau importante sous l\'évier de la cuisine. L\'eau coule en continu depuis ce matin.',
  propertyAddress: '15 Rue de la Paix, 75002 Paris',
  lotReference: 'Apt 3B',
  interventionUrl: 'https://seido-app.com/locataire/interventions/INT-2024-042',
  providerName: 'Pierre Dubois',
  completedAt: new Date(),
  completionNotes:
    'Fuite réparée avec succès. J\'ai remplacé le joint défectueux du siphon et vérifié toutes les connexions. Aucune autre fuite détectée. Le robinet fonctionne parfaitement.',
  hasDocuments: true,
  recipientRole: 'locataire',
  // Mode interactif avec boutons Valider/Signaler
  enableInteractiveButtons: true,
  validateUrl: 'https://seido-app.com/auth/email-callback?token_hash=xxx&action=validate_intervention&param_type=approve',
  contestUrl: 'https://seido-app.com/auth/email-callback?token_hash=yyy&action=validate_intervention&param_type=contest',
} as InterventionCompletedEmailProps

export default InterventionCompletedEmail
