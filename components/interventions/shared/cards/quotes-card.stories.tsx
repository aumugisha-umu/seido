import type { Meta, StoryObj } from '@storybook/react'
import { QuotesCard } from './quotes-card'
import type { Quote } from '../types'

/**
 * `QuotesCard` affiche la liste des devis associés à une intervention.
 *
 * Ce composant adapte ses actions selon le rôle de l'utilisateur :
 * - **Manager** : Peut approuver/rejeter les devis (si `showActions=true`)
 * - **Provider** : Peut soumettre et voir ses propres devis
 * - **Tenant** : Peut uniquement consulter les devis validés
 *
 * **Design:**
 * - Bordure colorée à gauche selon le statut (vert validé, orange attente, rouge refusé)
 * - Sections groupées: "DEVIS VALIDÉ", "EN ATTENTE", "AUTRES"
 * - Boutons d'action conditionnels via `showActions` prop
 */
const meta = {
  title: 'Interventions/Cards/QuotesCard',
  component: QuotesCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Carte affichant les devis avec actions contextuelles selon le rôle et le statut.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    userRole: {
      control: 'select',
      options: ['manager', 'provider', 'tenant'],
      description: 'Rôle de l\'utilisateur courant'
    },
    showActions: {
      control: 'boolean',
      description: 'Afficher les boutons Valider/Refuser pour les devis en attente'
    }
  }
} satisfies Meta<typeof QuotesCard>

export default meta
type Story = StoryObj<typeof meta>

const mockQuotes: Quote[] = [
  {
    id: '1',
    provider_id: 'provider-1',
    status: 'pending',
    amount: 450,
    description: 'Réparation de la fuite dans la salle de bain',
    provider_name: 'Pierre Martin',
    created_at: '2025-01-15T10:00:00Z'
  },
  {
    id: '2',
    provider_id: 'provider-2',
    status: 'approved',
    amount: 380,
    description: 'Remplacement du joint et vérification de la tuyauterie',
    provider_name: 'Jean Plombier',
    created_at: '2025-01-14T14:30:00Z'
  },
  {
    id: '3',
    provider_id: 'provider-3',
    status: 'rejected',
    amount: 620,
    description: 'Intervention complète avec remplacement des pièces',
    provider_name: 'Expert Plomberie',
    created_at: '2025-01-13T09:15:00Z'
  }
]

/**
 * Vue gestionnaire avec tous les devis et actions
 */
export const ManagerViewWithActions: Story = {
  args: {
    quotes: mockQuotes,
    userRole: 'manager',
    showActions: true,
    onApproveQuote: (quoteId) => console.log('Approve:', quoteId),
    onRejectQuote: (quoteId) => console.log('Reject:', quoteId)
  }
}

/**
 * Vue gestionnaire lecture seule (showActions=false)
 */
export const ManagerViewReadOnly: Story = {
  args: {
    quotes: mockQuotes,
    userRole: 'manager',
    showActions: false
  }
}

/**
 * Vue prestataire (voit uniquement ses devis)
 */
export const ProviderView: Story = {
  args: {
    quotes: mockQuotes.filter(q => q.provider_id === 'provider-1'),
    userRole: 'provider',
    onAddQuote: () => console.log('Add quote')
  }
}

/**
 * Vue locataire (lecture seule)
 */
export const TenantView: Story = {
  args: {
    quotes: mockQuotes.filter(q => q.status === 'approved'),
    userRole: 'tenant'
  }
}

/**
 * Aucun devis
 */
export const NoQuotes: Story = {
  args: {
    quotes: [],
    userRole: 'manager',
    onAddQuote: () => console.log('Add quote')
  }
}

/**
 * Devis en attente avec actions
 */
export const PendingQuotesWithActions: Story = {
  args: {
    quotes: mockQuotes.filter(q => q.status === 'pending'),
    userRole: 'manager',
    showActions: true,
    onApproveQuote: (quoteId) => alert(`Devis ${quoteId} approuvé !`),
    onRejectQuote: (quoteId) => alert(`Devis ${quoteId} rejeté !`)
  }
}
