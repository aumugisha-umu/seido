/**
 * 📧 Template Email - Ajout à une nouvelle équipe (utilisateur existant)
 *
 * Envoyé lorsqu'un utilisateur EXISTANT est ajouté à une nouvelle équipe
 * Différent de l'invitation : pas de création de compte, juste un login
 *
 * ✅ MULTI-ÉQUIPE (Jan 2026): Nouvel email pour les utilisateurs déjà inscrits
 */

import * as React from 'react'
import { Section, Text, Link } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import { EMAIL_CONFIG } from '@/lib/email/resend-client'
import type { TeamAdditionEmailProps } from '@/emails/utils/types'

export const TeamAdditionEmail = ({
  firstName,
  inviterName,
  teamName,
  role,
  magicLinkUrl,
}: TeamAdditionEmailProps) => {
  // Messages personnalisés selon le rôle
  const roleDescriptions: Record<string, { title: string; description: string }> = {
    admin: {
      title: 'Administrateur',
      description: 'Vous aurez accès à toutes les fonctionnalités d\'administration de cette équipe.',
    },
    gestionnaire: {
      title: 'Gestionnaire',
      description: 'Vous pourrez gérer les biens, interventions et équipes de cette organisation.',
    },
    prestataire: {
      title: 'Prestataire',
      description: 'Vous recevrez des demandes d\'intervention de cette équipe et pourrez en faire le suivi.',
    },
    locataire: {
      title: 'Locataire',
      description: 'Vous pourrez soumettre des demandes d\'intervention et suivre leur progression.',
    },
    proprietaire: {
      title: 'Propriétaire',
      description: 'Vous pourrez consulter vos biens et suivre les interventions associées.',
    },
  }

  const roleInfo = roleDescriptions[role] || { title: role, description: '' }

  return (
    <EmailLayout preview={`${inviterName} vous a ajouté à l'équipe ${teamName}`}>
      {/* Header avec sujet */}
      <EmailHeader subject={`Bienvenue dans l'équipe ${teamName}`} />

      {/* Contenu principal */}
      <Section className="bg-white px-8 py-8">
        {/* Message principal */}
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Bonne nouvelle ! <strong>{inviterName}</strong> vous a ajouté à l'équipe <strong>{teamName}</strong> sur SEIDO.
        </Text>

        {/* Informations sur le rôle */}
        <div className="bg-blue-50 border-l-4 border-primary p-4 rounded mb-6">
          <Text className="text-gray-900 font-semibold text-sm mb-2 mt-0">
            Votre rôle dans cette équipe : {roleInfo.title}
          </Text>
          <Text className="text-gray-700 text-sm leading-relaxed m-0">
            {roleInfo.description}
          </Text>
        </div>

        {/* Note multi-équipe */}
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
          <Text className="text-gray-700 text-sm leading-relaxed m-0">
            <strong>💡 Vous faites maintenant partie de plusieurs équipes !</strong>{' '}
            Une fois connecté, vous pourrez basculer entre vos différentes équipes
            grâce au sélecteur en haut de votre tableau de bord.
          </Text>
        </div>

        {/* Bouton CTA - Magic link (connexion auto + acceptation invitation) */}
        <EmailButton href={magicLinkUrl}>
          Accéder à l'équipe
        </EmailButton>

        {/* Lien de secours */}
        <Text className="text-gray-600 text-sm leading-relaxed mb-6">
          Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
        </Text>

        <Text className="text-primary text-sm break-all mb-8">
          <Link href={magicLinkUrl} className="text-primary no-underline">
            {magicLinkUrl}
          </Link>
        </Text>

        {/* Note sécurité */}
        <Text className="text-gray-500 text-xs leading-relaxed m-0">
          Si vous n'attendiez pas cet ajout ou si vous ne connaissez pas {inviterName},
          veuillez nous contacter à {EMAIL_CONFIG.supportEmail}.
        </Text>
      </Section>

      {/* Footer */}
      <EmailFooter />
    </EmailLayout>
  )
}

// Props par défaut pour prévisualisation
TeamAdditionEmail.PreviewProps = {
  firstName: 'Thomas',
  inviterName: 'Marie Dupont',
  teamName: 'Résidence Les Jardins',
  role: 'gestionnaire',
  magicLinkUrl: 'https://seido-app.com/auth/confirm?token_hash=xxx&type=invite&team_id=yyy',
} as TeamAdditionEmailProps

export default TeamAdditionEmail
