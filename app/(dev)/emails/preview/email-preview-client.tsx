'use client'

/**
 * 📧 Client Component - Prévisualisation Interactive des Emails
 *
 * Permet de :
 * - Naviguer entre les différents templates
 * - Changer les scénarios (rôle, mode interactif, etc.)
 * - Voir le rendu HTML et le code source
 */

import { useState, useMemo, useEffect } from 'react'
import { render } from '@react-email/render'

// ══════════════════════════════════════════════════════════════
// Imports des Templates
// ══════════════════════════════════════════════════════════════

// Auth
import { WelcomeEmail } from '@/emails/templates/auth/welcome'
import { SignupConfirmationEmail } from '@/emails/templates/auth/signup-confirmation'
import { PasswordResetEmail } from '@/emails/templates/auth/password-reset'
import { PasswordChangedEmail } from '@/emails/templates/auth/password-changed'
import { InvitationEmail } from '@/emails/templates/auth/invitation'

// Interventions
import { InterventionCreatedEmail } from '@/emails/templates/interventions/intervention-created'
import { InterventionApprovedEmail } from '@/emails/templates/interventions/intervention-approved'
import { InterventionRejectedEmail } from '@/emails/templates/interventions/intervention-rejected'
import { InterventionScheduledEmail } from '@/emails/templates/interventions/intervention-scheduled'
import { InterventionCompletedEmail } from '@/emails/templates/interventions/intervention-completed'
import { InterventionAssignedPrestataireEmail } from '@/emails/templates/interventions/intervention-assigned-prestataire'
import { InterventionAssignedLocataireEmail } from '@/emails/templates/interventions/intervention-assigned-locataire'
import { TimeSlotsProposedEmail } from '@/emails/templates/interventions/time-slots-proposed'

// Quotes
import { QuoteRequestEmail } from '@/emails/templates/quotes/quote-request'
import { QuoteSubmittedEmail } from '@/emails/templates/quotes/quote-submitted'
import { QuoteApprovedEmail } from '@/emails/templates/quotes/quote-approved'
import { QuoteRejectedEmail } from '@/emails/templates/quotes/quote-rejected'

// Notifications
import { EmailReplyReceivedEmail } from '@/emails/templates/notifications/email-reply-received'

// ══════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════

type EmailCategory = 'auth' | 'interventions' | 'quotes' | 'notifications'

interface EmailTemplate {
  id: string
  name: string
  category: EmailCategory
  description: string
  scenarios: EmailScenario[]
}

interface EmailScenario {
  id: string
  name: string
  description: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (props: Record<string, unknown>) => React.ReactElement
}

// ══════════════════════════════════════════════════════════════
// Données de Prévisualisation
// ══════════════════════════════════════════════════════════════

const baseInterventionData = {
  interventionRef: 'INT-2024-042',
  interventionType: 'Plomberie',
  description: "Fuite d'eau importante sous l'évier de la cuisine. L'eau coule en continu depuis ce matin.",
  propertyAddress: '15 Rue de la Paix, 75002 Paris',
  lotReference: 'Apt 3B',
  interventionUrl: 'https://seido.app/interventions/INT-2024-042',
}

// Date de base fixe pour éviter les erreurs d'hydratation (server/client)
// NOTE: Utiliser une date fixe au lieu de Date.now() car les valeurs
// diffèrent entre le rendu serveur et le rendu client, causant des mismatches
const BASE_PREVIEW_DATE = new Date('2026-01-27T10:00:00.000Z')
const futureDate = (days: number) => new Date(BASE_PREVIEW_DATE.getTime() + days * 24 * 60 * 60 * 1000)

const proposedSlots = [
  { date: futureDate(2), startTime: '09:00', endTime: '11:00' },
  { date: futureDate(3), startTime: '14:00', endTime: '16:00' },
  { date: futureDate(4), startTime: '10:00', endTime: '12:00' },
]

const slotActionsLocataire = [
  {
    slotId: 'slot-001',
    date: futureDate(2),
    startTime: '09:00',
    endTime: '11:00',
    acceptUrl: 'https://seido.app/auth/email-callback?token=xxx&action=confirm_slot&param_slotId=slot-001',
    refuseUrl: 'https://seido.app/auth/email-callback?token=yyy&action=reject_slot&param_slotId=slot-001',
  },
  {
    slotId: 'slot-002',
    date: futureDate(3),
    startTime: '14:00',
    endTime: '16:00',
    acceptUrl: 'https://seido.app/auth/email-callback?token=xxx&action=confirm_slot&param_slotId=slot-002',
    refuseUrl: 'https://seido.app/auth/email-callback?token=yyy&action=reject_slot&param_slotId=slot-002',
  },
  {
    slotId: 'slot-003',
    date: futureDate(4),
    startTime: '10:00',
    endTime: '12:00',
    acceptUrl: 'https://seido.app/auth/email-callback?token=xxx&action=confirm_slot&param_slotId=slot-003',
    refuseUrl: 'https://seido.app/auth/email-callback?token=yyy&action=reject_slot&param_slotId=slot-003',
  },
]

const slotActionsPrestataire = slotActionsLocataire.map(slot => ({
  ...slot,
  acceptUrl: slot.acceptUrl.replace('confirm_slot', 'accept_time_slot'),
}))

const quickEstimates = [
  { amount: 150, label: '150€', url: 'https://seido.app/auth/email-callback?action=submit_quick_estimate&param_amount=150' },
  { amount: 300, label: '300€', url: 'https://seido.app/auth/email-callback?action=submit_quick_estimate&param_amount=300' },
  { amount: 500, label: '500€', url: 'https://seido.app/auth/email-callback?action=submit_quick_estimate&param_amount=500' },
]

// ══════════════════════════════════════════════════════════════
// Définition des Templates
// ══════════════════════════════════════════════════════════════

const emailTemplates: EmailTemplate[] = [
  // ─────────────────────────────────────────────────────────────
  // AUTH
  // ─────────────────────────────────────────────────────────────
  {
    id: 'welcome',
    name: 'Bienvenue',
    category: 'auth',
    description: 'Email de bienvenue après inscription',
    scenarios: [
      {
        id: 'default',
        name: 'Standard',
        description: 'Nouvel utilisateur',
        props: {
          firstName: 'Marie',
          loginUrl: 'https://seido.app/auth/login',
        },
        render: (props) => <WelcomeEmail {...props} />,
      },
    ],
  },
  {
    id: 'signup-confirmation',
    name: 'Confirmation Inscription',
    category: 'auth',
    description: "Email de confirmation d'adresse email",
    scenarios: [
      {
        id: 'default',
        name: 'Standard',
        description: 'Confirmation email',
        props: {
          firstName: 'Jean',
          confirmationUrl: 'https://seido.app/auth/confirm?token=xxx',
        },
        render: (props) => <SignupConfirmationEmail {...props} />,
      },
    ],
  },
  {
    id: 'password-reset',
    name: 'Réinitialisation Mot de Passe',
    category: 'auth',
    description: 'Email avec lien de réinitialisation',
    scenarios: [
      {
        id: 'default',
        name: 'Standard',
        description: 'Demande de réinitialisation',
        props: {
          firstName: 'Pierre',
          resetUrl: 'https://seido.app/auth/reset-password?token=xxx',
          expiresIn: '24 heures',
        },
        render: (props) => <PasswordResetEmail {...props} />,
      },
    ],
  },
  {
    id: 'password-changed',
    name: 'Mot de Passe Changé',
    category: 'auth',
    description: 'Confirmation de changement de mot de passe',
    scenarios: [
      {
        id: 'default',
        name: 'Standard',
        description: 'Mot de passe modifié avec succès',
        props: {
          firstName: 'Sophie',
          changedAt: BASE_PREVIEW_DATE,
          supportUrl: 'https://seido.app/support',
        },
        render: (props) => <PasswordChangedEmail {...props} />,
      },
    ],
  },
  {
    id: 'invitation',
    name: 'Invitation Équipe',
    category: 'auth',
    description: "Invitation à rejoindre une équipe",
    scenarios: [
      {
        id: 'gestionnaire',
        name: 'Gestionnaire',
        description: 'Invitation par un gestionnaire',
        props: {
          firstName: 'Jean',
          inviterName: 'Thomas Martin',
          teamName: 'Immobilière ABC',
          role: 'gestionnaire',
          invitationUrl: 'https://seido.app/auth/accept-invitation?token=xxx',
          expiresIn: 7,
        },
        render: (props) => <InvitationEmail {...props} />,
      },
      {
        id: 'prestataire',
        name: 'Prestataire',
        description: 'Invitation prestataire',
        props: {
          firstName: 'Marc',
          inviterName: 'Thomas Martin',
          teamName: 'Immobilière ABC',
          role: 'prestataire',
          invitationUrl: 'https://seido.app/auth/accept-invitation?token=xxx',
          expiresIn: 7,
        },
        render: (props) => <InvitationEmail {...props} />,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // INTERVENTIONS
  // ─────────────────────────────────────────────────────────────
  {
    id: 'intervention-created',
    name: 'Intervention Créée',
    category: 'interventions',
    description: 'Notification de nouvelle intervention',
    scenarios: [
      {
        id: 'gestionnaire',
        name: 'Pour Gestionnaire',
        description: 'Notification au gestionnaire',
        props: {
          firstName: 'Thomas',
          ...baseInterventionData,
          tenantName: 'Marie Dupont',
          urgency: 'haute',
          createdAt: BASE_PREVIEW_DATE,
        },
        render: (props) => <InterventionCreatedEmail {...props} />,
      },
      {
        id: 'locataire',
        name: 'Pour Locataire',
        description: 'Confirmation au locataire',
        props: {
          firstName: 'Marie',
          ...baseInterventionData,
          tenantName: 'Marie Dupont',
          urgency: 'haute',
          createdAt: BASE_PREVIEW_DATE,
        },
        render: (props) => <InterventionCreatedEmail {...props} />,
      },
    ],
  },
  {
    id: 'intervention-approved',
    name: 'Intervention Approuvée',
    category: 'interventions',
    description: "L'intervention a été validée par le gestionnaire",
    scenarios: [
      {
        id: 'locataire',
        name: 'Pour Locataire',
        description: 'Notification au locataire',
        props: {
          firstName: 'Marie',
          ...baseInterventionData,
          managerName: 'Thomas Martin',
          approvedAt: BASE_PREVIEW_DATE,
        },
        render: (props) => <InterventionApprovedEmail {...props} />,
      },
    ],
  },
  {
    id: 'intervention-rejected',
    name: 'Intervention Rejetée',
    category: 'interventions',
    description: "L'intervention a été refusée",
    scenarios: [
      {
        id: 'locataire',
        name: 'Pour Locataire',
        description: 'Avec motif de refus',
        props: {
          firstName: 'Marie',
          ...baseInterventionData,
          managerName: 'Thomas Martin',
          rejectionReason: "Cette demande ne relève pas de la responsabilité du propriétaire. Il s'agit d'un problème d'entretien courant à la charge du locataire.",
          rejectedAt: BASE_PREVIEW_DATE,
        },
        render: (props) => <InterventionRejectedEmail {...props} />,
      },
    ],
  },
  {
    id: 'intervention-assigned-prestataire',
    name: 'Assignation Prestataire',
    category: 'interventions',
    description: 'Notification au prestataire assigné',
    scenarios: [
      {
        id: 'standard',
        name: 'Standard',
        description: 'Assignation simple sans créneaux',
        props: {
          firstName: 'Marc',
          ...baseInterventionData,
          title: 'Fuite importante cuisine',
          managerName: 'Thomas Martin',
          urgency: 'haute',
          createdAt: BASE_PREVIEW_DATE,
        },
        render: (props) => <InterventionAssignedPrestataireEmail {...props} />,
      },
      {
        id: 'with-slots-interactive',
        name: '🎯 Avec Créneaux (INTERACTIF)',
        description: 'Assignation avec créneaux proposés et boutons',
        props: {
          firstName: 'Marc',
          ...baseInterventionData,
          title: 'Fuite importante cuisine',
          managerName: 'Thomas Martin',
          urgency: 'haute',
          createdAt: BASE_PREVIEW_DATE,
          timeSlots: proposedSlots,
          enableInteractiveButtons: true,
          slotActions: slotActionsPrestataire,
        },
        render: (props) => <InterventionAssignedPrestataireEmail {...props} />,
      },
      {
        id: 'with-quote',
        name: 'Avec Devis Requis',
        description: 'Assignation avec demande de devis',
        props: {
          firstName: 'Marc',
          ...baseInterventionData,
          title: 'Rénovation complète salle de bain',
          managerName: 'Thomas Martin',
          urgency: 'moyenne',
          createdAt: BASE_PREVIEW_DATE,
          quoteInfo: {
            isRequired: true,
            estimatedAmount: 500,
            deadline: futureDate(5),
          },
        },
        render: (props) => <InterventionAssignedPrestataireEmail {...props} />,
      },
    ],
  },
  {
    id: 'intervention-assigned-locataire',
    name: 'Assignation Notifiée au Locataire',
    category: 'interventions',
    description: 'Locataire informé de l\'intervention planifiée',
    scenarios: [
      {
        id: 'standard',
        name: 'Standard',
        description: 'Notification simple au locataire',
        props: {
          firstName: 'Marie',
          ...baseInterventionData,
          title: 'Fuite importante cuisine',
          managerName: 'Thomas Martin',
          urgency: 'haute',
          createdAt: BASE_PREVIEW_DATE,
        },
        render: (props) => <InterventionAssignedLocataireEmail {...props} />,
      },
      {
        id: 'with-slots-interactive',
        name: '🎯 Avec Créneaux (INTERACTIF)',
        description: 'Avec créneaux proposés et boutons accepter/refuser',
        props: {
          firstName: 'Marie',
          ...baseInterventionData,
          title: 'Fuite importante cuisine',
          managerName: 'Thomas Martin',
          urgency: 'haute',
          createdAt: BASE_PREVIEW_DATE,
          timeSlots: proposedSlots,
          enableInteractiveButtons: true,
          slotActions: slotActionsLocataire,
        },
        render: (props) => <InterventionAssignedLocataireEmail {...props} />,
      },
    ],
  },
  {
    id: 'time-slots-proposed',
    name: '📅 Créneaux Proposés',
    category: 'interventions',
    description: 'Proposition de créneaux avec boutons interactifs',
    scenarios: [
      // ═══════════════════════════════════════════════════════════
      // LOCATAIRE
      // ═══════════════════════════════════════════════════════════
      {
        id: 'locataire-propose-interactive',
        name: '🎯 Locataire - Choix Multiple (INTERACTIF)',
        description: 'Plusieurs créneaux avec boutons Accepter/Refuser',
        props: {
          firstName: 'Marie',
          ...baseInterventionData,
          managerName: 'Thomas Martin',
          planningType: 'propose',
          proposedSlots,
          recipientRole: 'locataire',
          enableInteractiveButtons: true,
          slotActions: slotActionsLocataire,
          responseDeadline: futureDate(7),
        },
        render: (props) => <TimeSlotsProposedEmail {...props} />,
      },
      {
        id: 'locataire-propose-classic',
        name: 'Locataire - Choix Multiple (classique)',
        description: 'Plusieurs créneaux sans boutons (liste simple)',
        props: {
          firstName: 'Marie',
          ...baseInterventionData,
          managerName: 'Thomas Martin',
          planningType: 'propose',
          proposedSlots,
          recipientRole: 'locataire',
          enableInteractiveButtons: false,
        },
        render: (props) => <TimeSlotsProposedEmail {...props} />,
      },
      {
        id: 'locataire-direct-interactive',
        name: '🎯 Locataire - RDV Fixé (INTERACTIF)',
        description: 'Un seul créneau fixé avec boutons',
        props: {
          firstName: 'Marie',
          ...baseInterventionData,
          managerName: 'Thomas Martin',
          planningType: 'direct',
          proposedSlots: [proposedSlots[0]],
          recipientRole: 'locataire',
          enableInteractiveButtons: true,
          slotActions: [slotActionsLocataire[0]],
        },
        render: (props) => <TimeSlotsProposedEmail {...props} />,
      },
      {
        id: 'locataire-organize',
        name: 'Locataire - Planification Autonome',
        description: 'Mode organisation libre',
        props: {
          firstName: 'Marie',
          ...baseInterventionData,
          managerName: 'Thomas Martin',
          planningType: 'organize',
          proposedSlots: [],
          recipientRole: 'locataire',
        },
        render: (props) => <TimeSlotsProposedEmail {...props} />,
      },
      // ═══════════════════════════════════════════════════════════
      // PRESTATAIRE
      // ═══════════════════════════════════════════════════════════
      {
        id: 'prestataire-propose-interactive',
        name: '🎯 Prestataire - Choix Multiple (INTERACTIF)',
        description: 'Plusieurs créneaux avec boutons Accepter/Refuser',
        props: {
          firstName: 'Marc',
          ...baseInterventionData,
          managerName: 'Thomas Martin',
          planningType: 'propose',
          proposedSlots,
          recipientRole: 'prestataire',
          enableInteractiveButtons: true,
          slotActions: slotActionsPrestataire,
          responseDeadline: futureDate(7),
        },
        render: (props) => <TimeSlotsProposedEmail {...props} />,
      },
      {
        id: 'prestataire-direct-interactive',
        name: '🎯 Prestataire - RDV Fixé (INTERACTIF)',
        description: 'Un seul créneau fixé avec boutons',
        props: {
          firstName: 'Marc',
          ...baseInterventionData,
          managerName: 'Thomas Martin',
          planningType: 'direct',
          proposedSlots: [proposedSlots[0]],
          recipientRole: 'prestataire',
          enableInteractiveButtons: true,
          slotActions: [slotActionsPrestataire[0]],
        },
        render: (props) => <TimeSlotsProposedEmail {...props} />,
      },
    ],
  },
  {
    id: 'intervention-scheduled',
    name: 'Intervention Planifiée',
    category: 'interventions',
    description: 'Créneau confirmé',
    scenarios: [
      {
        id: 'locataire',
        name: 'Pour Locataire',
        description: 'Confirmation du RDV avec infos prestataire',
        props: {
          firstName: 'Marie',
          ...baseInterventionData,
          scheduledDate: new Date(BASE_PREVIEW_DATE.getTime() + 3 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
          providerName: 'Pierre Dubois',
          providerCompany: 'Plomberie Express',
          providerPhone: '06 12 34 56 78',
          estimatedDuration: 120,
          recipientRole: 'locataire',
        },
        render: (props) => <InterventionScheduledEmail {...props} />,
      },
      {
        id: 'prestataire',
        name: 'Pour Prestataire',
        description: 'Confirmation du RDV avec adresse',
        props: {
          firstName: 'Marc',
          ...baseInterventionData,
          scheduledDate: new Date(BASE_PREVIEW_DATE.getTime() + 3 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000),
          providerName: 'Marc Durand',
          estimatedDuration: 120,
          recipientRole: 'prestataire',
        },
        render: (props) => <InterventionScheduledEmail {...props} />,
      },
    ],
  },
  {
    id: 'intervention-completed',
    name: '✅ Intervention Terminée',
    category: 'interventions',
    description: 'Travaux terminés avec boutons de validation',
    scenarios: [
      {
        id: 'locataire-interactive',
        name: '🎯 Locataire (INTERACTIF)',
        description: 'Avec boutons Valider/Contester',
        props: {
          firstName: 'Marie',
          ...baseInterventionData,
          completedAt: BASE_PREVIEW_DATE,
          providerName: 'Plomberie Express',
          completionNotes: 'Remplacement du joint et resserrage des raccords. Fuite réparée.',
          recipientRole: 'locataire',
          enableInteractiveButtons: true,
          validateUrl: 'https://seido.app/auth/email-callback?action=validate_intervention&param_type=approve',
          contestUrl: 'https://seido.app/auth/email-callback?action=validate_intervention&param_type=contest',
        },
        render: (props) => <InterventionCompletedEmail {...props} />,
      },
      {
        id: 'locataire-classic',
        name: 'Locataire (classique)',
        description: 'Sans boutons interactifs',
        props: {
          firstName: 'Marie',
          ...baseInterventionData,
          completedAt: BASE_PREVIEW_DATE,
          providerName: 'Plomberie Express',
          completionNotes: 'Remplacement du joint et resserrage des raccords. Fuite réparée.',
          recipientRole: 'locataire',
          enableInteractiveButtons: false,
        },
        render: (props) => <InterventionCompletedEmail {...props} />,
      },
      {
        id: 'gestionnaire',
        name: 'Pour Gestionnaire',
        description: 'Notification de fin de travaux',
        props: {
          firstName: 'Thomas',
          ...baseInterventionData,
          completedAt: BASE_PREVIEW_DATE,
          providerName: 'Plomberie Express',
          completionNotes: 'Remplacement du joint et resserrage des raccords. Fuite réparée.',
          recipientRole: 'gestionnaire',
        },
        render: (props) => <InterventionCompletedEmail {...props} />,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // QUOTES
  // ─────────────────────────────────────────────────────────────
  {
    id: 'quote-request',
    name: '💰 Demande de Devis',
    category: 'quotes',
    description: 'Demande de devis avec estimation rapide',
    scenarios: [
      {
        id: 'prestataire-interactive',
        name: '🎯 Prestataire (INTERACTIF)',
        description: 'Avec boutons estimation rapide (150€/300€/500€)',
        props: {
          firstName: 'Marc',
          ...baseInterventionData,
          requestedBy: 'Thomas Martin',
          deadline: futureDate(5),
          enableInteractiveButtons: true,
          quickEstimates,
        },
        render: (props) => <QuoteRequestEmail {...props} />,
      },
      {
        id: 'prestataire-classic',
        name: 'Prestataire (classique)',
        description: 'Sans estimation rapide',
        props: {
          firstName: 'Marc',
          ...baseInterventionData,
          requestedBy: 'Thomas Martin',
          deadline: futureDate(5),
          enableInteractiveButtons: false,
        },
        render: (props) => <QuoteRequestEmail {...props} />,
      },
    ],
  },
  {
    id: 'quote-submitted',
    name: 'Devis Soumis',
    category: 'quotes',
    description: 'Confirmation de soumission de devis',
    scenarios: [
      {
        id: 'prestataire',
        name: 'Pour Prestataire',
        description: 'Confirmation de soumission',
        props: {
          firstName: 'Marc',
          ...baseInterventionData,
          quoteAmount: '350,00 €',
          quoteRef: 'DEV-2024-018',
          submittedAt: BASE_PREVIEW_DATE,
        },
        render: (props) => <QuoteSubmittedEmail {...props} />,
      },
      {
        id: 'gestionnaire',
        name: 'Pour Gestionnaire',
        description: 'Nouveau devis à valider',
        props: {
          firstName: 'Thomas',
          ...baseInterventionData,
          quoteAmount: '350,00 €',
          quoteRef: 'DEV-2024-018',
          providerName: 'Plomberie Express',
          submittedAt: BASE_PREVIEW_DATE,
        },
        render: (props) => <QuoteSubmittedEmail {...props} />,
      },
    ],
  },
  {
    id: 'quote-approved',
    name: 'Devis Approuvé',
    category: 'quotes',
    description: 'Le devis a été accepté',
    scenarios: [
      {
        id: 'prestataire',
        name: 'Pour Prestataire',
        description: 'Notification approbation',
        props: {
          firstName: 'Marc',
          ...baseInterventionData,
          quoteAmount: '350,00 €',
          quoteRef: 'DEV-2024-018',
          approvedBy: 'Thomas Martin',
          approvedAt: BASE_PREVIEW_DATE,
        },
        render: (props) => <QuoteApprovedEmail {...props} />,
      },
    ],
  },
  {
    id: 'quote-rejected',
    name: 'Devis Refusé',
    category: 'quotes',
    description: 'Le devis a été refusé',
    scenarios: [
      {
        id: 'prestataire',
        name: 'Pour Prestataire',
        description: 'Avec motif de refus',
        props: {
          firstName: 'Marc',
          ...baseInterventionData,
          quoteAmount: '850,00 €',
          quoteRef: 'DEV-2024-019',
          rejectedBy: 'Thomas Martin',
          rejectionReason: 'Le montant proposé dépasse le budget alloué pour ce type de réparation. Merci de revoir votre estimation.',
        },
        render: (props) => <QuoteRejectedEmail {...props} />,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────
  {
    id: 'email-reply-received',
    name: 'Réponse Email Reçue',
    category: 'notifications',
    description: 'Notification de réponse par email',
    scenarios: [
      {
        id: 'default',
        name: 'Standard',
        description: 'Nouvelle réponse dans conversation',
        props: {
          firstName: 'Thomas',
          senderName: 'Marie Dupont',
          ...baseInterventionData,
          messagePreview: "Bonjour, je serai disponible mardi après-midi pour le rendez-vous. Merci de confirmer l'heure exacte.",
          receivedAt: BASE_PREVIEW_DATE,
        },
        render: (props) => <EmailReplyReceivedEmail {...props} />,
      },
    ],
  },
]

// ══════════════════════════════════════════════════════════════
// Composant Principal
// ══════════════════════════════════════════════════════════════

export default function EmailPreviewClient() {
  const [selectedCategory, setSelectedCategory] = useState<EmailCategory | 'all'>('all')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('time-slots-proposed')
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('locataire-propose-interactive')
  const [viewMode, setViewMode] = useState<'preview' | 'html'>('preview')

  // Filtrer les templates par catégorie
  const filteredTemplates = useMemo(() => {
    if (selectedCategory === 'all') return emailTemplates
    return emailTemplates.filter(t => t.category === selectedCategory)
  }, [selectedCategory])

  // Trouver le template et scénario sélectionnés
  const selectedTemplate = emailTemplates.find(t => t.id === selectedTemplateId)
  const selectedScenario = selectedTemplate?.scenarios.find(s => s.id === selectedScenarioId)

  // État pour le HTML rendu (async car render() retourne une Promise)
  const [emailHtml, setEmailHtml] = useState<string>('')
  const [isRendering, setIsRendering] = useState(false)

  // Générer le HTML de manière asynchrone
  useEffect(() => {
    if (!selectedScenario) {
      setEmailHtml('')
      return
    }

    setIsRendering(true)

    const renderEmail = async () => {
      try {
        const element = selectedScenario.render(selectedScenario.props)
        const html = await render(element, { pretty: true })
        setEmailHtml(html)
      } catch (error) {
        console.error('Error rendering email:', error)
        setEmailHtml(`<!-- Error: ${error instanceof Error ? error.message : 'Unknown error'} -->`)
      } finally {
        setIsRendering(false)
      }
    }

    renderEmail()
  }, [selectedScenario])

  // Catégories avec comptage
  const categories = [
    { id: 'all', name: 'Tous', count: emailTemplates.length, icon: '📧' },
    { id: 'auth', name: 'Authentification', count: emailTemplates.filter(t => t.category === 'auth').length, icon: '🔐' },
    { id: 'interventions', name: 'Interventions', count: emailTemplates.filter(t => t.category === 'interventions').length, icon: '🔧' },
    { id: 'quotes', name: 'Devis', count: emailTemplates.filter(t => t.category === 'quotes').length, icon: '💰' },
    { id: 'notifications', name: 'Notifications', count: emailTemplates.filter(t => t.category === 'notifications').length, icon: '🔔' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                📧 Email Preview
                <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  SEIDO Dev
                </span>
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {emailTemplates.length} templates • {emailTemplates.reduce((acc, t) => acc + t.scenarios.length, 0)} scénarios
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'preview'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  👁️ Aperçu
                </button>
                <button
                  onClick={() => setViewMode('html')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'html'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {'</>'} HTML
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto p-4 flex gap-4">
        {/* Sidebar */}
        <aside className="w-80 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm sticky top-24">
            {/* Categories */}
            <div className="p-4 border-b">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Catégories
              </h2>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.id as EmailCategory | 'all')
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.icon} {cat.name} ({cat.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Templates List */}
            <div className="p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Templates
              </h2>
              <div className="space-y-2">
                {filteredTemplates.map(template => (
                  <div key={template.id}>
                    <button
                      onClick={() => {
                        setSelectedTemplateId(template.id)
                        setSelectedScenarioId(template.scenarios[0].id)
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedTemplateId === template.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{template.name}</div>
                      <div className="text-xs text-gray-500">{template.description}</div>
                    </button>

                    {/* Scenarios (expanded when selected) */}
                    {selectedTemplateId === template.id && template.scenarios.length > 1 && (
                      <div className="ml-4 mt-2 space-y-1 border-l-2 border-gray-200 pl-3">
                        {template.scenarios.map(scenario => (
                          <button
                            key={scenario.id}
                            onClick={() => setSelectedScenarioId(scenario.id)}
                            className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                              selectedScenarioId === scenario.id
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {scenario.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {selectedTemplate && selectedScenario ? (
            <div className="bg-white rounded-lg shadow-sm">
              {/* Scenario Header */}
              <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedTemplate.name}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedScenario.name} — {selectedScenario.description}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedScenario.name.includes('INTERACTIF')
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedScenario.name.includes('INTERACTIF') ? '✨ Interactif' : 'Classique'}
                  </span>
                </div>
              </div>

              {/* Email Preview */}
              <div className="p-4">
                {viewMode === 'preview' ? (
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    {/* Email Header Mock */}
                    <div className="bg-white border-b px-4 py-3">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-500">De:</span>
                        <span className="font-medium">SEIDO &lt;noreply@seido-app.com&gt;</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm mt-1">
                        <span className="text-gray-500">À:</span>
                        <span className="font-medium">{selectedScenario.props.firstName} &lt;user@example.com&gt;</span>
                      </div>
                    </div>
                    {/* Email Body */}
                    {isRendering ? (
                      <div className="flex items-center justify-center h-[800px] bg-white">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <span className="text-gray-500 text-sm">Chargement du rendu...</span>
                        </div>
                      </div>
                    ) : (
                      <iframe
                        srcDoc={emailHtml}
                        className="w-full h-[800px] border-0 bg-white"
                        title="Email Preview"
                      />
                    )}
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    {isRendering ? (
                      <div className="flex items-center justify-center h-[400px] bg-gray-900">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
                          <span className="text-gray-400 text-sm">Génération du HTML...</span>
                        </div>
                      </div>
                    ) : (
                      <pre className="p-4 bg-gray-900 text-gray-100 overflow-x-auto text-sm max-h-[800px]">
                        <code>{emailHtml}</code>
                      </pre>
                    )}
                  </div>
                )}
              </div>

              {/* Props Debug */}
              <details className="border-t">
                <summary className="px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50">
                  🔧 Props du scénario
                </summary>
                <div className="px-4 pb-4">
                  <pre className="p-4 bg-gray-100 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedScenario.props, (key, value) => {
                      if (value instanceof Date) return value.toISOString()
                      return value
                    }, 2)}
                  </pre>
                </div>
              </details>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <p className="text-gray-500">Sélectionnez un template pour prévisualiser</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
