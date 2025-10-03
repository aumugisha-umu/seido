/**
 * 📧 Types TypeScript pour les templates email - SEIDO
 */

import type { Database } from '@/lib/database.types'

/**
 * Rôles utilisateurs SEIDO
 */
export type UserRole = Database['public']['Enums']['user_role']

/**
 * Props de base communes à tous les templates
 */
export interface BaseEmailProps {
  /** Prénom de l'utilisateur */
  firstName: string
  /** Prénom + Nom (optionnel, fallback sur firstName) */
  fullName?: string
}

/**
 * Props pour le template de confirmation d'inscription (signup)
 */
export interface SignupConfirmationEmailProps extends BaseEmailProps {
  /** URL de confirmation d'email */
  confirmationUrl: string
  /** Durée de validité du lien (en minutes) */
  expiresIn?: number
}

/**
 * Props pour le template de bienvenue (après confirmation email)
 */
export interface WelcomeEmailProps extends BaseEmailProps {
  /** URL du tableau de bord de l'utilisateur */
  dashboardUrl: string
  /** Rôle de l'utilisateur */
  role: UserRole
}

/**
 * Props pour le template de réinitialisation de mot de passe
 */
export interface PasswordResetEmailProps extends BaseEmailProps {
  /** URL de réinitialisation */
  resetUrl: string
  /** Durée de validité du lien (en minutes) */
  expiresIn?: number
}

/**
 * Props pour le template de confirmation de changement de mot de passe
 */
export interface PasswordChangedEmailProps extends BaseEmailProps {
  /** Date du changement */
  changeDate: Date
}

/**
 * Props pour le template d'invitation
 */
export interface InvitationEmailProps extends BaseEmailProps {
  /** Nom de la personne qui invite */
  inviterName: string
  /** Nom de l'équipe */
  teamName: string
  /** Rôle attribué */
  role: UserRole
  /** URL d'invitation avec token */
  invitationUrl: string
  /** Durée de validité (en jours) */
  expiresIn?: number
}

/**
 * Résultat de l'envoi d'un email
 */
export interface EmailSendResult {
  success: boolean
  emailId?: string
  error?: string
}

/**
 * Options d'envoi d'email
 */
export interface SendEmailOptions {
  /** Destinataire(s) */
  to: string | string[]
  /** Sujet de l'email */
  subject: string
  /** Corps HTML de l'email */
  html: string
  /** Texte brut (fallback) */
  text?: string
  /** Tags pour Resend analytics */
  tags?: Array<{ name: string; value: string }>
}
