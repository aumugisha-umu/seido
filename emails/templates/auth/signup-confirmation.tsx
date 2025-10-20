/**
 * 📧 Template Email - Confirmation d'inscription
 *
 * Envoyé immédiatement après l'inscription pour confirmer l'email
 * Objectif: Valider l'adresse email avant la création du profil
 */

import * as React from 'react'
import { Section, Text, Heading, Link } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { SignupConfirmationEmailProps } from '@/emails/utils/types'

export const SignupConfirmationEmail = ({
  firstName,
  confirmationUrl,
  expiresIn = 60,
}: SignupConfirmationEmailProps) => {
  return (
    <EmailLayout preview="Confirmez votre adresse email pour activer votre compte SEIDO">
      {/* Header avec sujet */}
      <EmailHeader subject="Confirmation d'inscription" />

      {/* Contenu principal */}
      <Section className="bg-white px-8 py-8">
        {/* Message personnalisé */}
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Merci de vous être inscrit sur <strong>SEIDO</strong>! Pour activer votre compte et commencer à utiliser nos
          services, veuillez confirmer votre adresse email.
        </Text>


        {/* Bouton CTA */}
        <EmailButton href={confirmationUrl}>
          Confirmer mon adresse email
        </EmailButton>

        {/* Lien de secours */}
        <Text className="text-gray-600 text-sm leading-relaxed mb-6">
          Si le bouton ne fonctionne pas, vous pouvez copier et coller ce lien dans votre navigateur :
        </Text>

        <Text className="text-primary text-sm break-all mb-8">
          <Link href={confirmationUrl} className="text-primary no-underline">
            {confirmationUrl}
          </Link>
        </Text>

        {/* Alerte expiration */}
        <div className="bg-amber-50 border-l-4 border-warning p-4 rounded mb-6">
          <Text className="text-gray-700 text-sm leading-relaxed m-0">
            <strong>⏱️ Attention :</strong> Ce lien de confirmation est valide pendant{' '}
            <strong>{expiresIn} minutes</strong>. Après ce délai, vous devrez créer
            un nouveau compte.
          </Text>
        </div>

        {/* Section aide */}
        <div className="bg-gray-50 p-5 rounded-lg mb-6">
          <Text className="text-gray-900 font-semibold text-sm mb-2 mt-0">
            Besoin d'aide ?
          </Text>
          <Text className="text-gray-600 text-sm leading-relaxed m-0">
            Notre équipe support est disponible pour vous accompagner.
            Contactez-nous à{' '}
            <Link href="mailto:support@seido.app" className="text-primary no-underline">
              support@seido.app
            </Link>
          </Text>
        </div>

        {/* Note sécurité */}
        <Text className="text-gray-500 text-xs leading-relaxed m-0">
          Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email en toute sécurité.
          Aucun compte ne sera créé sans confirmation.
        </Text>
      </Section>

      {/* Footer */}
      <EmailFooter />
    </EmailLayout>
  )
}

// Props par défaut pour prévisualisation
SignupConfirmationEmail.PreviewProps = {
  firstName: 'Marie',
  confirmationUrl: 'https://seido.app/auth/confirm?token_hash=abc123&type=email',
  expiresIn: 60,
} as SignupConfirmationEmailProps

export default SignupConfirmationEmail
