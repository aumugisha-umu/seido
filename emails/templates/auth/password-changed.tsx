/**
 * 📧 Template Email - Confirmation Changement Mot de Passe
 *
 * Envoyé après un changement réussi de mot de passe
 * Objectif: Confirmer le changement et alerter en cas d'activité suspecte
 */

import * as React from 'react'
import { Section, Text, Heading, Link } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import type { PasswordChangedEmailProps } from '@/emails/utils/types'

export const PasswordChangedEmail = ({
  firstName,
  changeDate,
}: PasswordChangedEmailProps) => {
  // Formatter la date en français
  const formattedDate = new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(changeDate)

  return (
    <EmailLayout preview="Votre mot de passe SEIDO a été modifié">
      {/* Header avec sujet */}
      <EmailHeader subject="Mot de passe modifié" />

      {/* Contenu principal */}
      <Section className="bg-white px-8 py-8">

        {/* Message principal */}
        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Nous vous confirmons que le mot de passe de votre compte SEIDO a été
          modifié avec succès.
        </Text>

        {/* Détails du changement */}
        <div className="bg-green-50 border-l-4 border-accent p-4 rounded mb-6">
          <Text className="text-gray-900 font-semibold text-sm mb-2 mt-0">
            ✓ Changement confirmé
          </Text>
          <Text className="text-gray-700 text-sm leading-relaxed m-0">
            <strong>Date et heure :</strong> {formattedDate}
            <br />
            <strong>Appareil :</strong> Navigateur web
          </Text>
        </div>

        {/* Message de sécurité */}
        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Votre nouveau mot de passe est maintenant actif. Vous pouvez l'utiliser
          pour vous connecter à votre compte SEIDO.
        </Text>

        {/* Conseils sécurité */}
        <div className="bg-gray-50 p-5 rounded-lg mb-6">
          <Text className="text-gray-900 font-semibold text-sm mb-2 mt-0">
            Conseils de sécurité
          </Text>
          <Text className="text-gray-600 text-sm leading-relaxed m-0">
            • Ne partagez jamais votre mot de passe avec quiconque
            <br />
            • SEIDO ne vous demandera jamais votre mot de passe par email
            <br />
            • Utilisez un gestionnaire de mots de passe pour plus de sécurité
            <br />
            • Changez régulièrement vos mots de passe
          </Text>
        </div>

        {/* Alerte sécurité */}
        <div className="bg-red-50 border-l-4 border-danger p-4 rounded mb-0">
          <Text className="text-gray-900 font-semibold text-sm mb-2 mt-0">
            ⚠️ Activité suspecte ?
          </Text>
          <Text className="text-gray-700 text-sm leading-relaxed m-0">
            Si vous n'êtes pas à l'origine de ce changement, votre compte pourrait
            être compromis. Contactez <strong>immédiatement</strong> notre support à{' '}
            <Link href="mailto:support@seido-app.com" className="text-danger no-underline font-semibold">
              support@seido-app.com
            </Link>
            {' '}et réinitialisez votre mot de passe.
          </Text>
        </div>
      </Section>

      {/* Footer */}
      <EmailFooter />
    </EmailLayout>
  )
}

// Props par défaut pour prévisualisation
PasswordChangedEmail.PreviewProps = {
  firstName: 'Sophie',
  changeDate: new Date(),
} as PasswordChangedEmailProps

export default PasswordChangedEmail
