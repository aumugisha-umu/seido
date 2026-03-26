/**
 * Template Email - Invitation gestionnaire par l'admin
 *
 * Envoye lorsque l'admin invite un gestionnaire a rejoindre SEIDO
 * Inclut les etapes de demarrage rapide pour guider l'activation
 */

import * as React from 'react'
import { Section, Text, Link } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { AdminInvitationEmailProps } from '@/emails/utils/types'

export const AdminInvitationEmail = ({
  firstName,
  organization,
  invitationUrl,
  expiresIn = 7,
}: AdminInvitationEmailProps) => {
  const quickStartSteps = [
    {
      number: '1',
      title: 'Ajoutez votre premier bien',
      description: 'Creez un immeuble ou un lot pour structurer votre patrimoine.',
    },
    {
      number: '2',
      title: 'Invitez vos contacts',
      description: 'Ajoutez vos collaborateurs, locataires, prestataires et proprietaires.',
    },
    {
      number: '3',
      title: 'Creez votre premiere intervention',
      description: 'Soumettez une demande de maintenance et suivez-la en temps reel.',
    },
    {
      number: '4',
      title: 'Connectez votre email pro',
      description: 'Centralisez vos echanges directement dans SEIDO.',
    },
  ]

  return (
    <EmailLayout preview={`Votre espace de gestion pour ${organization} est pret`}>
      <EmailHeader subject="Bienvenue sur SEIDO" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-5">
          Vous etes invite(e) a rejoindre <strong>SEIDO</strong>, la plateforme de gestion
          immobiliere collaborative. Votre espace pour <strong>{organization}</strong> est
          pret — il ne vous reste qu'a definir votre mot de passe.
        </Text>

        <EmailButton href={invitationUrl}>
          Definir mon mot de passe et commencer
        </EmailButton>

        {/* Quick Start Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
          <Text className="text-gray-900 font-semibold text-sm mb-4 mt-0">
            Demarrage rapide — 4 etapes :
          </Text>

          {quickStartSteps.map((step) => (
            <table key={step.number} cellPadding="0" cellSpacing="0" style={{ marginBottom: '12px', width: '100%' }}>
              <tbody>
                <tr>
                  <td style={{ width: '28px', verticalAlign: 'top' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: '#5b8def',
                        color: '#ffffff',
                        fontSize: '14px',
                        fontWeight: '700',
                        textAlign: 'center',
                        lineHeight: '28px',
                      }}
                    >
                      {step.number}
                    </div>
                  </td>
                  <td style={{ paddingLeft: '12px', verticalAlign: 'top' }}>
                    <Text className="text-gray-900 font-semibold text-sm m-0">
                      {step.title}
                    </Text>
                    <Text className="text-gray-600 text-sm m-0 leading-relaxed">
                      {step.description}
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          ))}
        </div>

        {/* Fallback link */}
        <Text className="text-gray-600 text-sm leading-relaxed mb-6">
          Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
        </Text>

        <Text className="text-primary text-sm break-all mb-8">
          <Link href={invitationUrl} className="text-primary no-underline">
            {invitationUrl}
          </Link>
        </Text>

        {/* Expiration warning */}
        <div className="bg-amber-50 border-l-4 border-warning p-4 rounded mb-6">
          <Text className="text-gray-700 text-sm leading-relaxed m-0">
            <strong>Important :</strong> Ce lien est valide pendant{' '}
            <strong>{expiresIn} jours</strong>. Apres ce delai, contactez votre administrateur
            pour recevoir un nouveau lien.
          </Text>
        </div>

        <Text className="text-gray-500 text-xs leading-relaxed m-0">
          Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email en toute securite.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

// Props par defaut pour previsualisation
AdminInvitationEmail.PreviewProps = {
  firstName: 'Thomas',
  organization: 'SCI Les Jardins',
  invitationUrl: 'https://seido-app.com/auth/confirm?token_hash=abc123&type=invite',
  expiresIn: 7,
} as AdminInvitationEmailProps

export default AdminInvitationEmail
