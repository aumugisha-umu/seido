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

/**
 * ═══════════════════════════════════════════════════════════
 * 🔧 TEMPLATES INTERVENTIONS
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Créneau horaire proposé pour l'intervention
 */
export interface EmailTimeSlot {
  /** Date du créneau */
  date: Date
  /** Heure de début (format "HH:mm") */
  startTime: string
  /** Heure de fin (format "HH:mm") */
  endTime: string
}

/**
 * Informations sur le devis demandé (pour prestataire uniquement)
 */
export interface EmailQuoteInfo {
  /** Devis obligatoire ou optionnel */
  isRequired: boolean
  /** Montant estimé (si fourni par le gestionnaire) */
  estimatedAmount?: number
  /** Date limite de soumission */
  deadline?: Date
}

/**
 * Pièce jointe d'une intervention pour l'email
 */
export interface EmailAttachment {
  /** Nom du fichier original */
  filename: string
  /** Type MIME (ex: "image/jpeg", "application/pdf") */
  mimeType: string
  /** Taille du fichier en octets */
  fileSize: number
  /** URL de téléchargement (signée ou publique) */
  downloadUrl: string
  /** Type de document (photo, facture, etc.) */
  documentType?: string
}

/**
 * Props communes pour tous les emails d'intervention
 */
export interface BaseInterventionEmailProps extends BaseEmailProps {
  /** Référence de l'intervention (ex: "INT-2024-001") */
  interventionRef: string
  /** Type d'intervention (ex: "Plomberie", "Électricité") */
  interventionType: string
  /** Description de l'intervention */
  description: string
  /** Adresse du bien concerné */
  propertyAddress: string
  /** Référence du lot (ex: "Apt 3B") */
  lotReference?: string
  /** URL pour voir les détails de l'intervention */
  interventionUrl: string
}

/**
 * Props pour le template "Nouvelle intervention créée"
 * Envoyé au gestionnaire quand un locataire crée une intervention
 */
export interface InterventionCreatedEmailProps extends BaseInterventionEmailProps {
  /** Nom du locataire qui a créé la demande */
  tenantName: string
  /** Niveau d'urgence */
  urgency: 'faible' | 'moyenne' | 'haute' | 'critique'
  /** Date de création */
  createdAt: Date
  /** Pièces jointes de l'intervention */
  attachments?: EmailAttachment[]
}

/**
 * Props pour le template "Intervention assignée au prestataire"
 * Envoyé au prestataire quand un gestionnaire l'assigne à une intervention
 */
export interface InterventionAssignedPrestataireEmailProps extends BaseInterventionEmailProps {
  /** Titre de l'intervention (affiché sous la référence) */
  title?: string
  /** Nom du gestionnaire qui a créé/assigné l'intervention */
  managerName: string
  /** Niveau d'urgence */
  urgency: 'faible' | 'moyenne' | 'haute' | 'critique'
  /** Date de création */
  createdAt: Date
  /** Créneaux proposés pour l'intervention */
  timeSlots?: EmailTimeSlot[]
  /** Informations sur le devis demandé (prestataire seulement) */
  quoteInfo?: EmailQuoteInfo
  /** Pièces jointes de l'intervention */
  attachments?: EmailAttachment[]
  /**
   * Créneaux avec boutons d'action (emails interactifs)
   * Si fourni, chaque créneau aura ses propres boutons Accepter/Refuser
   */
  slotActions?: EmailTimeSlotWithActions[]
  /** Si true, affiche les boutons d'action sur chaque créneau */
  enableInteractiveButtons?: boolean
}

/**
 * Props pour le template "Intervention assignée au locataire"
 * Envoyé au locataire quand une intervention est créée pour son logement
 */
export interface InterventionAssignedLocataireEmailProps extends BaseInterventionEmailProps {
  /** Titre de l'intervention (affiché sous la référence) */
  title?: string
  /** Nom du gestionnaire qui a créé l'intervention */
  managerName: string
  /** Niveau d'urgence */
  urgency: 'faible' | 'moyenne' | 'haute' | 'critique'
  /** Date de création */
  createdAt: Date
  /** Créneaux proposés pour l'intervention */
  timeSlots?: EmailTimeSlot[]
  /** Pièces jointes de l'intervention */
  attachments?: EmailAttachment[]
  // Note: Pas de quoteInfo pour le locataire (info prestataire uniquement)
  /**
   * Créneaux avec boutons d'action (emails interactifs)
   * Si fourni, chaque créneau aura ses propres boutons Accepter/Refuser
   */
  slotActions?: EmailTimeSlotWithActions[]
  /** Si true, affiche les boutons d'action sur chaque créneau */
  enableInteractiveButtons?: boolean
}

/**
 * Props pour le template "Intervention approuvée"
 * Envoyé au locataire quand le gestionnaire approuve
 */
export interface InterventionApprovedEmailProps extends BaseInterventionEmailProps {
  /** Nom du gestionnaire qui a approuvé */
  managerName: string
  /** Date d'approbation */
  approvedAt: Date
  /** Prochaines étapes */
  nextSteps?: string
}

/**
 * Props pour le template "Intervention rejetée"
 * Envoyé au locataire quand le gestionnaire rejette
 */
export interface InterventionRejectedEmailProps extends BaseInterventionEmailProps {
  /** Nom du gestionnaire qui a rejeté */
  managerName: string
  /** Raison du rejet */
  rejectionReason: string
  /** Date de rejet */
  rejectedAt: Date
}

/**
 * Props pour le template "Intervention planifiée"
 * Envoyé au locataire ET au prestataire quand un créneau est confirmé
 */
export interface InterventionScheduledEmailProps extends BaseInterventionEmailProps {
  /** Nom du prestataire assigné */
  providerName: string
  /** Entreprise du prestataire */
  providerCompany?: string
  /** Téléphone du prestataire */
  providerPhone?: string
  /** Date et heure du rendez-vous */
  scheduledDate: Date
  /** Durée estimée (en minutes) */
  estimatedDuration?: number
  /** Nom du destinataire (locataire ou prestataire) */
  recipientRole: 'locataire' | 'prestataire'
}

/**
 * Créneau avec URLs d'action pour emails interactifs
 */
export interface EmailTimeSlotWithActions extends EmailTimeSlot {
  /** ID du créneau (pour identification) */
  slotId: string
  /** URL magic link pour accepter ce créneau spécifique */
  acceptUrl?: string
  /** URL magic link pour refuser ce créneau spécifique */
  refuseUrl?: string
}

/**
 * Props pour le template "Créneaux proposés"
 * Envoyé au locataire ET au prestataire quand le gestionnaire propose des créneaux
 */
export interface TimeSlotsProposedEmailProps extends BaseInterventionEmailProps {
  /** Nom du gestionnaire qui propose les créneaux */
  managerName: string
  /** Type de planification */
  planningType: 'direct' | 'propose' | 'organize'
  /** Créneaux proposés */
  proposedSlots: EmailTimeSlot[]
  /** Date limite pour répondre (optionnel) */
  responseDeadline?: Date
  /** Rôle du destinataire */
  recipientRole: 'locataire' | 'prestataire'
  /**
   * Créneaux avec boutons d'action (emails interactifs)
   * Si fourni, chaque créneau aura ses propres boutons Accepter/Refuser
   */
  slotActions?: EmailTimeSlotWithActions[]
  /** Si true, affiche les boutons d'action sur chaque créneau */
  enableInteractiveButtons?: boolean
}

/**
 * Props pour le template "Intervention terminée"
 * Envoyé au locataire et gestionnaire quand le prestataire clôture
 */
export interface InterventionCompletedEmailProps extends BaseInterventionEmailProps {
  /** Nom du prestataire */
  providerName: string
  /** Date de clôture */
  completedAt: Date
  /** Commentaire de clôture */
  completionNotes?: string
  /** Si des documents ont été ajoutés (photos, facture) */
  hasDocuments: boolean
  /** Nom du destinataire */
  recipientRole: 'locataire' | 'gestionnaire'
  /**
   * URL magic link pour valider l'intervention (locataire uniquement)
   * Action: validate_intervention avec type=approve
   */
  validateUrl?: string
  /**
   * URL magic link pour signaler un problème (locataire uniquement)
   * Action: validate_intervention avec type=contest
   */
  contestUrl?: string
  /** Si true, affiche les boutons Valider/Signaler pour le locataire */
  enableInteractiveButtons?: boolean
}

/**
 * ═══════════════════════════════════════════════════════════
 * 💰 TEMPLATES DEVIS
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Props communes pour tous les emails de devis
 */
export interface BaseQuoteEmailProps extends BaseEmailProps {
  /** Référence du devis (ex: "DEV-2024-001") */
  quoteRef: string
  /** Référence de l'intervention associée */
  interventionRef: string
  /** Type d'intervention */
  interventionType: string
  /** Description de l'intervention */
  description: string
  /** Adresse du bien */
  propertyAddress: string
  /** URL pour voir le devis */
  quoteUrl: string
}

/**
 * Configuration des boutons d'estimation rapide
 */
export interface QuickEstimateConfig {
  /** Montant en euros */
  amount: number
  /** Label du bouton (optionnel, déduit du montant sinon) */
  label?: string
  /** URL magic link pour soumettre cette estimation */
  url: string
}

/**
 * Props pour "Demande de devis envoyée"
 * Envoyé au prestataire quand le gestionnaire demande un devis
 */
export interface QuoteRequestEmailProps extends BaseQuoteEmailProps {
  /** Nom du gestionnaire qui demande */
  managerName: string
  /** Date limite de soumission */
  deadline?: Date
  /** Informations complémentaires */
  additionalInfo?: string
  /**
   * Boutons d'estimation rapide (emails interactifs)
   * Si fourni, affiche des boutons avec montants prédéfinis
   */
  quickEstimates?: QuickEstimateConfig[]
  /** Si true, affiche les boutons d'estimation rapide */
  enableInteractiveButtons?: boolean
}

/**
 * Props pour "Devis soumis"
 * Envoyé au gestionnaire quand le prestataire soumet son devis
 */
export interface QuoteSubmittedEmailProps extends BaseQuoteEmailProps {
  /** Nom du prestataire */
  providerName: string
  /** Entreprise du prestataire */
  providerCompany?: string
  /** Montant total HT */
  totalHT: number
  /** Montant total TTC */
  totalTTC: number
  /** Date de soumission */
  submittedAt: Date
  /** Si un PDF est attaché */
  hasPdfAttachment: boolean
}

/**
 * Props pour "Devis approuvé"
 * Envoyé au prestataire quand le gestionnaire approuve
 */
export interface QuoteApprovedEmailProps extends BaseQuoteEmailProps {
  /** Nom du gestionnaire qui approuve */
  managerName: string
  /** Montant approuvé TTC */
  approvedAmount: number
  /** Date d'approbation */
  approvedAt: Date
  /** Instructions pour la suite */
  nextSteps?: string
}

/**
 * Props pour "Devis rejeté"
 * Envoyé au prestataire quand le gestionnaire rejette
 */
export interface QuoteRejectedEmailProps extends BaseQuoteEmailProps {
  /** Nom du gestionnaire qui rejette */
  managerName: string
  /** Raison du rejet */
  rejectionReason: string
  /** Date de rejet */
  rejectedAt: Date
  /** Si le prestataire peut soumettre un nouveau devis */
  canResubmit: boolean
}
