/**
 * 📧 Template Email - Bienvenue (Après Confirmation)
 *
 * Envoyé APRÈS la confirmation d'email
 * Objectif: Accueillir l'utilisateur et le diriger vers son dashboard
 */

import * as React from 'react'
import { Section, Text, Heading, Link } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import { EMAIL_CONFIG } from '@/lib/email/resend-client'
import type { WelcomeEmailProps } from '@/emails/utils/types'

export const WelcomeEmail = ({
  firstName,
  dashboardUrl,
  role,
}: WelcomeEmailProps) => {
  // Messages personnalisés selon le rôle
  const roleMessages = {
    admin: 'Vous avez accès à toutes les fonctionnalités d\'administration de la plateforme.',
    gestionnaire: 'Vous pouvez gérer vos biens, interventions et équipes en toute simplicité.',
    prestataire: 'Vous recevrez des demandes d\'intervention et pourrez soumettre vos estimations.',
    locataire: 'Vous pouvez soumettre des demandes d\'intervention pour votre logement.',
  }

  const roleLabels = {
    admin: 'Administrateur',
    gestionnaire: 'Gestionnaire',
    prestataire: 'Prestataire',
    locataire: 'Locataire',
  }

  return (
    <EmailLayout preview="Bienvenue sur SEIDO - Votre compte est activé !">
      {/* Header avec sujet */}
      <EmailHeader subject="Bienvenue sur SEIDO !" />

      {/* Contenu principal */}
      <Section className="bg-white px-8 py-8">
        {/* Message personnalisé */}
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Votre compte SEIDO est maintenant <strong>activé</strong> ! Vous pouvez dès à présent
          accéder à votre tableau de bord et commencer à utiliser toutes les fonctionnalités
          de la plateforme.
        </Text>

        {/* Message selon rôle */}
        <div className="bg-blue-50 border-l-4 border-primary p-4 rounded mb-6">
          <Text className="text-gray-700 text-sm leading-relaxed m-0">
            <strong>Votre rôle :</strong> {roleLabels[role]}
            <br />
            {roleMessages[role]}
          </Text>
        </div>

        {/* Bouton CTA */}
        <EmailButton href={dashboardUrl}>
          Accéder à mon tableau de bord
        </EmailButton>

        {/* Prochaines étapes */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg mb-6 mt-8">
          <Text className="text-gray-900 font-semibold text-base mb-3 mt-0">
            🚀 Prochaines étapes
          </Text>
          {role === 'gestionnaire' && (
            <ul className="text-gray-700 text-sm leading-relaxed pl-5 m-0">
              <li>Créez vos premiers biens immobiliers</li>
              <li>Ajoutez des locataires et prestataires</li>
              <li>Gérez vos interventions en temps réel</li>
              <li>Invitez des membres à rejoindre votre équipe</li>
            </ul>
          )}
          {role === 'prestataire' && (
            <ul className="text-gray-700 text-sm leading-relaxed pl-5 m-0">
              <li>Complétez votre profil professionnel</li>
              <li>Consultez vos demandes d'intervention</li>
              <li>Soumettez vos estimations rapidement</li>
              <li>Gérez vos disponibilités</li>
            </ul>
          )}
          {role === 'locataire' && (
            <ul className="text-gray-700 text-sm leading-relaxed pl-5 m-0">
              <li>Consultez les informations de votre logement</li>
              <li>Soumettez des demandes d'intervention</li>
              <li>Suivez l'état de vos demandes</li>
              <li>Communiquez avec votre gestionnaire</li>
            </ul>
          )}
          {role === 'admin' && (
            <ul className="text-gray-700 text-sm leading-relaxed pl-5 m-0">
              <li>Accédez au tableau de bord administrateur</li>
              <li>Gérez les utilisateurs et équipes</li>
              <li>Supervisez l'activité de la plateforme</li>
              <li>Configurez les paramètres système</li>
            </ul>
          )}
        </div>

        {/* Section aide */}
        <div className="bg-gray-50 p-5 rounded-lg mb-6">
          <Text className="text-gray-900 font-semibold text-sm mb-2 mt-0">
            Besoin d'aide ?
          </Text>
          <Text className="text-gray-600 text-sm leading-relaxed m-0">
            Notre équipe support est disponible pour vous accompagner dans vos premiers pas.
            Contactez-nous à{' '}
            <Link href={`mailto:${EMAIL_CONFIG.supportEmail}`} className="text-primary no-underline">
              {EMAIL_CONFIG.supportEmail}
            </Link>
          </Text>
        </div>

        {/* Message de bienvenue final */}
        <Text className="text-gray-600 text-sm leading-relaxed text-center m-0">
          Merci de faire confiance à SEIDO pour simplifier votre gestion immobilière ! 🏠
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
  dashboardUrl: 'https://seido-app.com/gestionnaire/dashboard',
  role: 'gestionnaire',
} as WelcomeEmailProps

export default WelcomeEmail
