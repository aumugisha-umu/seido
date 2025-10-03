/**
 * 📧 Template Email - Réinitialisation Mot de Passe
 *
 * Envoyé lorsqu'un utilisateur demande à réinitialiser son mot de passe
 * Objectif: Permettre la réinitialisation sécurisée avec lien temporaire
 */

import * as React from 'react'
import { Section, Text, Heading, Link } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { PasswordResetEmailProps } from '@/emails/utils/types'

export const PasswordResetEmail = ({
  firstName,
  resetUrl,
  expiresIn = 60,
}: PasswordResetEmailProps) => {
  return (
    <EmailLayout preview="Réinitialisez votre mot de passe SEIDO">
      {/* Header */}
      <EmailHeader title="Sécurité du compte" />

      {/* Contenu principal */}
      <Section className="bg-white px-8 py-8">
        {/* Titre */}
        <Heading className="text-gray-900 text-3xl font-bold mb-6 mt-0">
          Réinitialisation de mot de passe 🔐
        </Heading>

        {/* Message principal */}
        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Nous avons reçu une demande de réinitialisation de mot de passe pour votre
          compte SEIDO. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
        </Text>

        {/* Alerte expiration */}
        <div className="bg-amber-50 border-l-4 border-warning p-4 rounded mb-6">
          <Text className="text-gray-700 text-sm leading-relaxed m-0">
            <strong>⏱️ Important :</strong> Ce lien est valide pendant{' '}
            <strong>{expiresIn} minutes</strong>. Après ce délai, vous devrez faire
            une nouvelle demande.
          </Text>
        </div>

        {/* Bouton CTA */}
        <EmailButton href={resetUrl}>
          Réinitialiser mon mot de passe
        </EmailButton>

        {/* Lien de secours */}
        <Text className="text-gray-600 text-sm leading-relaxed mb-6">
          Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
        </Text>

        <Text className="text-primary text-sm break-all mb-8">
          <Link href={resetUrl} className="text-primary no-underline">
            {resetUrl}
          </Link>
        </Text>

        {/* Conseils sécurité */}
        <div className="bg-gray-50 p-5 rounded-lg mb-6">
          <Text className="text-gray-900 font-semibold text-sm mb-2 mt-0">
            Conseils de sécurité
          </Text>
          <Text className="text-gray-600 text-sm leading-relaxed m-0">
            • Choisissez un mot de passe fort et unique
            <br />
            • Ne partagez jamais votre mot de passe
            <br />
            • Activez l'authentification à deux facteurs si disponible
          </Text>
        </div>

        {/* Alerte sécurité */}
        <div className="bg-red-50 border-l-4 border-danger p-4 rounded mb-6">
          <Text className="text-gray-900 font-semibold text-sm mb-2 mt-0">
            ⚠️ Vous n'avez pas demandé cette réinitialisation ?
          </Text>
          <Text className="text-gray-700 text-sm leading-relaxed m-0">
            Si vous n'êtes pas à l'origine de cette demande, ignorez cet email et
            contactez immédiatement notre support à{' '}
            <Link href="mailto:support@seido.app" className="text-danger no-underline">
              support@seido.app
            </Link>
            . Votre mot de passe actuel reste inchangé.
          </Text>
        </div>

        {/* Note sécurité */}
        <Text className="text-gray-500 text-xs leading-relaxed m-0">
          Pour votre sécurité, ne transférez jamais cet email et supprimez-le après utilisation du lien.
        </Text>
      </Section>

      {/* Footer */}
      <EmailFooter />
    </EmailLayout>
  )
}

// Props par défaut pour prévisualisation
PasswordResetEmail.PreviewProps = {
  firstName: 'Pierre',
  resetUrl: 'https://seido.app/auth/update-password?token=xyz789',
  expiresIn: 60,
} as PasswordResetEmailProps

export default PasswordResetEmail
