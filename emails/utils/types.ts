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
 * Props pour le template d'invitation admin (gestionnaire invité par l'admin)
 * Email avec quick start steps pour guider le gestionnaire
 */
export interface AdminInvitationEmailProps extends BaseEmailProps {
  /** Nom de l'organisation (sera le nom de la team) */
  organization: string
  /** URL d'invitation avec magic link */
  invitationUrl: string
  /** Durée de validité (en jours) */
  expiresIn?: number
}

/**
 * Props pour le template d'invitation (NOUVEL utilisateur)
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
 * Props pour le template d'ajout à une équipe (utilisateur EXISTANT)
 * ✅ MULTI-ÉQUIPE (Jan 2026): Email différent de l'invitation
 * - Pas de création de compte nécessaire
 * - Magic link pour connexion automatique + acceptation invitation
 * - Message adapté (bienvenue dans nouvelle équipe)
 */
export interface TeamAdditionEmailProps extends BaseEmailProps {
  /** Nom de la personne qui ajoute */
  inviterName: string
  /** Nom de l'équipe */
  teamName: string
  /** Rôle attribué dans cette équipe */
  role: UserRole
  /** Magic link pour connexion auto + acceptation invitation */
  magicLinkUrl: string
}

/**
 * ═══════════════════════════════════════════════════════════
 * 🔔 TEMPLATES ADMIN NOTIFICATIONS
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Props pour le template "Demande de démo"
 * Envoyé aux admins quand un prospect soumet le formulaire de démo
 */
export interface DemoRequestEmailProps {
  /** Nom du prospect */
  name: string
  /** Email du prospect */
  email: string
  /** Téléphone (optionnel) */
  phone?: string
  /** Société (optionnel) */
  company?: string
  /** Nombre de lots gérés */
  lotsCount: string
  /** Message du prospect */
  message: string
}

/**
 * Props pour le template "Demande d'accès bêta"
 * Envoyé aux admins quand un professionnel demande l'accès
 */
export interface BetaAccessRequestEmailProps {
  /** Prénom */
  firstName: string
  /** Nom */
  lastName: string
  /** Email */
  email: string
  /** Téléphone */
  phone: string
  /** Description de l'activité */
  message: string
  /** Adresse IP de la demande */
  ip: string
  /** Date/heure de la demande */
  requestedAt: Date
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
  /** Type de planification (direct = heure fixe, propose = plage horaire) */
  planningType?: 'direct' | 'propose' | 'organize'
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

/**
 * ═══════════════════════════════════════════════════════════
 * 📜 TEMPLATES CONTRATS
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Props pour le template "Nouveau contrat créé"
 * Envoyé aux locataires liés au contrat
 */
export interface ContractCreatedEmailProps extends BaseEmailProps {
  /** Titre du contrat */
  contractTitle: string
  /** Référence du lot (ex: "Apt 3B") */
  lotReference: string
  /** Adresse du bien */
  propertyAddress: string
  /** Date de début du contrat */
  startDate: string
  /** Date de fin du contrat (optionnel si indéterminé) */
  endDate?: string
  /** URL pour voir le contrat */
  contractUrl: string
}

/**
 * Props pour le template "Contrat arrivant à expiration"
 * Envoyé aux gestionnaires de l'équipe
 */
export interface ContractExpiringEmailProps extends BaseEmailProps {
  /** Titre du contrat */
  contractTitle: string
  /** Référence du lot (ex: "Apt 3B") */
  lotReference: string
  /** Nombre de jours avant expiration */
  daysUntilExpiry: number
  /** Date de fin du contrat */
  endDate: string
  /** URL pour voir le contrat */
  contractUrl: string
}

/**
 * ═══════════════════════════════════════════════════════════
 * 📄 TEMPLATES DOCUMENTS
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Props pour le template "Rappel RDV intervention"
 * Envoyé au locataire, prestataire et gestionnaire 24h et 1h avant le RDV
 */
export interface InterventionReminderEmailProps extends BaseInterventionEmailProps {
  /** Nom du prestataire assigné */
  providerName: string
  /** Entreprise du prestataire */
  providerCompany?: string
  /** Téléphone du prestataire */
  providerPhone?: string
  /** Date et heure du rendez-vous */
  scheduledDate: Date
  /** Heure de début du créneau (format HH:MM) */
  startTime?: string
  /** Heure de fin du créneau (format HH:MM) */
  endTime?: string
  /** Durée estimée (en minutes) */
  estimatedDuration?: number
  /** Rôle du destinataire */
  recipientRole: 'locataire' | 'prestataire' | 'gestionnaire'
  /** Type de rappel */
  reminderType: '24h' | '1h'
  /** Nom du locataire (pour prestataire et gestionnaire) */
  tenantName?: string
}

/**
 * Props pour le template "Nouveau document uploadé"
 * Envoyé à l'utilisateur assigné
 */
export interface DocumentUploadedEmailProps extends BaseEmailProps {
  /** Nom du document */
  documentName: string
  /** Nom de la personne qui a uploadé */
  uploadedByName: string
  /** URL vers l'entité liée (bien, lot, contrat...) */
  entityUrl: string
}

/**
 * ═══════════════════════════════════════════════════════════
 * 💳 TEMPLATES BILLING / SUBSCRIPTION
 * ═══════════════════════════════════════════════════════════
 */

/**
 * Props communes pour les emails billing
 */
export interface BaseBillingEmailProps extends BaseEmailProps {
  /** Nom de l'équipe */
  teamName: string
  /** URL de la page billing */
  billingUrl: string
}

/**
 * Props pour "Bienvenue dans l'essai" (J+1)
 */
export interface TrialWelcomeEmailProps extends BaseBillingEmailProps {
  /** Nombre de jours restants dans l'essai */
  daysLeft: number
  /** URL du dashboard */
  dashboardUrl: string
}

/**
 * Props pour "Feature engagement" (J+7)
 */
export interface FeatureEngagementEmailProps extends BaseBillingEmailProps {
  /** Nombre d'interventions créées pendant la trial */
  interventionCount: number
  /** Nombre de lots gérés */
  lotCount: number
  /** Nombre de jours restants dans l'essai */
  daysLeft: number
}

/**
 * Props pour "Value report" (J+14)
 */
export interface ValueReportEmailProps extends BaseBillingEmailProps {
  /** Nombre d'interventions clôturées */
  completedInterventions: number
  /** Heures estimées économisées */
  hoursSaved: number
  /** Équivalent argent économisé en EUR */
  moneySaved: number
  /** Nombre de lots gérés */
  lotCount: number
  /** Nombre de jours restants */
  daysLeft: number
}

/**
 * Props pour "Trial ending" (J-7, J-3, J-1)
 */
export interface TrialEndingEmailProps extends BaseBillingEmailProps {
  /** Nombre de jours restants (7, 3, ou 1) */
  daysLeft: number
  /** Nombre de lots gérés */
  lotCount: number
  /** Prix annuel HT en EUR (calculé pour ce nombre de lots) */
  annualPriceHT: number
  /** Prix mensuel HT en EUR */
  monthlyPriceHT: number
  /** Économies annuelles en EUR (annuel vs mensuel) */
  annualSavings: number
}

/**
 * Props pour "Trial expired" (J+0)
 */
export interface TrialExpiredEmailProps extends BaseBillingEmailProps {
  /** Nombre de lots gérés */
  lotCount: number
  /** Si le compte passe en read-only (>2 lots) ou free_tier (<=2) */
  isReadOnly: boolean
}

/**
 * Props pour "Win-back" (J+3 post-expiry)
 */
export interface WinBackEmailProps extends BaseBillingEmailProps {
  /** Nombre de lots gérés */
  lotCount: number
  /** Nombre d'interventions créées */
  interventionCount: number
  /** Code promo si applicable */
  promoCode?: string
  /** Réduction en % si promo */
  promoDiscount?: number
}

/**
 * Props pour "Payment failed"
 */
export interface PaymentFailedEmailProps extends BaseBillingEmailProps {
  /** Montant de la facture en EUR */
  invoiceAmount: number
  /** Nombre de tentatives échouées */
  attemptCount: number
  /** URL du portail Stripe pour mettre à jour la carte */
  portalUrl: string
}

/**
 * Props pour "Subscription activated" (après premier paiement réussi)
 */
export interface SubscriptionActivatedEmailProps extends BaseBillingEmailProps {
  /** Plan choisi */
  plan: 'annual' | 'monthly'
  /** Nombre de lots couverts */
  lotCount: number
  /** Montant HT en EUR */
  amountHT: number
  /** Date du prochain renouvellement */
  nextRenewalDate: string
  /** URL du dashboard */
  dashboardUrl: string
}
