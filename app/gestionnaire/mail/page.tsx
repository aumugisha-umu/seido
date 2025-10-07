import { requireRole } from "@/lib/auth-dal"
import { EmailPreviewClient } from "./email-preview-client"
import { renderEmail } from "@/emails/utils/render"
import SignupConfirmationEmail from "@/emails/templates/auth/signup-confirmation"
import WelcomeEmail from "@/emails/templates/auth/welcome"
import PasswordResetEmail from "@/emails/templates/auth/password-reset"
import PasswordChangedEmail from "@/emails/templates/auth/password-changed"
import InvitationEmail from "@/emails/templates/auth/invitation"

/**
 * 📧 PAGE DE PREVIEW EMAIL TEMPLATES
 *
 * Permet de visualiser tous les templates email sans refaire le flow complet
 * Route: /gestionnaire/mail
 */
export default async function EmailPreviewPage() {
  // ✅ Vérifier que l'utilisateur est bien gestionnaire
  const { user, profile } = await requireRole(['gestionnaire'])

  // Données de démo basées sur l'utilisateur connecté
  const userEmail = user.email || 'test@seido.pm'
  const userFirstName = profile.name?.split(' ')[0] || userEmail.split('@')[0]
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // ✅ 1. Template: Signup Confirmation
  const signupConfirmationHtml = await renderEmail(
    SignupConfirmationEmail({
      firstName: userFirstName,
      confirmationUrl: `${appUrl}/auth/confirm?token_hash=demo123&type=email`,
      expiresIn: 60,
    })
  )

  // ✅ 2. Template: Welcome
  const welcomeHtml = await renderEmail(
    WelcomeEmail({
      firstName: userFirstName,
      dashboardUrl: `${appUrl}/gestionnaire/dashboard`,
      role: 'gestionnaire',
    })
  )

  // ✅ 3. Template: Password Reset
  const passwordResetHtml = await renderEmail(
    PasswordResetEmail({
      firstName: userFirstName,
      resetUrl: `${appUrl}/auth/reset-password?token=demo123`,
      expiresIn: 60,
    })
  )

  // ✅ 4. Template: Password Changed
  const passwordChangedHtml = await renderEmail(
    PasswordChangedEmail({
      firstName: userFirstName,
      changeDate: new Date(),
    })
  )

  // ✅ 5. Template: Invitation
  const invitationHtml = await renderEmail(
    InvitationEmail({
      firstName: userFirstName,
      inviterName: "Jean Dupont",
      teamName: "Équipe SEIDO Demo",
      role: 'prestataire',
      invitationUrl: `${appUrl}/auth/signup?invitation=demo123`,
      expiresIn: 7,
    })
  )

  // Préparer les templates avec leurs métadonnées
  const emailTemplates = [
    {
      id: 'signup-confirmation',
      name: 'Confirmation d\'inscription',
      description: 'Envoyé après le signup pour valider l\'email',
      html: signupConfirmationHtml.html,
    },
    {
      id: 'welcome',
      name: 'Bienvenue',
      description: 'Envoyé après la confirmation pour accueillir l\'utilisateur',
      html: welcomeHtml.html,
    },
    {
      id: 'password-reset',
      name: 'Réinitialisation mot de passe',
      description: 'Envoyé quand l\'utilisateur demande à réinitialiser son mot de passe',
      html: passwordResetHtml.html,
    },
    {
      id: 'password-changed',
      name: 'Mot de passe modifié',
      description: 'Confirmation après changement de mot de passe',
      html: passwordChangedHtml.html,
    },
    {
      id: 'invitation',
      name: 'Invitation équipe',
      description: 'Invitation à rejoindre une équipe SEIDO',
      html: invitationHtml.html,
    },
  ]

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">📧 Preview Templates Email</h1>
        <p className="text-gray-600">
          Visualisez tous les templates email utilisés dans SEIDO
          <br />
          <span className="text-sm text-gray-500">
            Email de test : <strong>{userEmail}</strong>
          </span>
        </p>
      </div>

      <EmailPreviewClient templates={emailTemplates} userEmail={userEmail} />
    </div>
  )
}
