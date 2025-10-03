/**
 * 📧 Template Email - Bienvenue & Confirmation Email
 *
 * Envoyé lors de l'inscription d'un nouvel utilisateur
 * Objectif: Confirmer l'email et activer le compte
 */

import * as React from 'react'
import { Section, Text, Heading, Link } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { WelcomeEmailProps } from '@/emails/utils/types'

export const WelcomeEmail = ({
  firstName,
  confirmationUrl,
  role,
}: WelcomeEmailProps) => {
  // Messages personnalisés selon le rôle
  const roleMessages = {
    admin: 'Vous avez accès à toutes les fonctionnalités d\'administration de la plateforme.',
    gestionnaire: 'Vous pouvez gérer vos biens, interventions et équipes en toute simplicité.',
    prestataire: 'Vous recevrez des demandes d\'intervention et pourrez soumettre vos devis.',
    locataire: 'Vous pouvez soumettre des demandes d\'intervention pour votre logement.',
  }

  return (
    <EmailLayout preview="Bienvenue sur SEIDO - Confirmez votre email">
      {/* Header */}
      <EmailHeader title="Gestion immobilière simplifiée" />

      {/* Contenu principal */}
      <Section className="bg-white px-8 py-8">
        {/* Titre */}
        <Heading className="text-gray-900 text-3xl font-bold mb-6 mt-0">
          Bienvenue sur SEIDO ! 🎉
        </Heading>

        {/* Message personnalisé */}
        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Merci de vous être inscrit sur SEIDO ! Pour finaliser votre inscription et
          accéder à votre compte, veuillez confirmer votre adresse email en cliquant
          sur le bouton ci-dessous.
        </Text>

        {/* Message selon rôle */}
        <div className="bg-blue-50 border-l-4 border-primary p-4 rounded mb-6">
          <Text className="text-gray-700 text-sm leading-relaxed m-0">
            <strong>Votre rôle :</strong> {role === 'admin' ? 'Administrateur' : role === 'gestionnaire' ? 'Gestionnaire' : role === 'prestataire' ? 'Prestataire' : 'Locataire'}
            <br />
            {roleMessages[role]}
          </Text>
        </div>

        {/* Bouton CTA */}
        <EmailButton href={confirmationUrl}>
          Confirmer mon email
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
        </Text>
      </Section>

      {/* Footer */}
      <EmailFooter />
    </EmailLayout>
  )
}

// Props par défaut pour prévisualisation
WelcomeEmail.PreviewProps = {
  firstName: 'Marie',
  confirmationUrl: 'https://seido.app/auth/confirm?token=abc123',
  role: 'gestionnaire',
} as WelcomeEmailProps

export default WelcomeEmail
