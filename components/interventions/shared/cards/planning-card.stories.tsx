import type { Meta, StoryObj } from '@storybook/react'
import { PlanningCard } from './planning-card'
import type { TimeSlot } from '../types'

/**
 * `PlanningCard` affiche la gestion des créneaux horaires pour une intervention.
 *
 * Ce composant adapte ses actions selon le rôle de l'utilisateur :
 * - **Manager** : Peut proposer, approuver et rejeter des créneaux
 * - **Provider** : Peut proposer des créneaux et répondre aux propositions
 * - **Tenant** : Peut sélectionner parmi les créneaux proposés
 */
const meta = {
  title: 'Interventions/Cards/PlanningCard',
  component: PlanningCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Carte de gestion des créneaux horaires avec actions contextuelles.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    userRole: {
      control: 'select',
      options: ['manager', 'provider', 'tenant'],
      description: 'Rôle de l\'utilisateur courant'
    }
  }
} satisfies Meta<typeof PlanningCard>

export default meta
type Story = StoryObj<typeof meta>

const mockTimeSlots: TimeSlot[] = [
  {
    id: '1',
    slot_date: '2025-01-20',
    start_time: '09:00',
    end_time: '11:00',
    status: 'pending',
    proposed_by: 'manager-1',
    proposed_by_user: {
      id: 'manager-1',
      name: 'Jean Dupont'
    },
    responses: []
  },
  {
    id: '2',
    slot_date: '2025-01-21',
    start_time: '14:00',
    end_time: '16:00',
    status: 'confirmed',
    proposed_by: 'provider-1',
    proposed_by_user: {
      id: 'provider-1',
      name: 'Pierre Martin'
    },
    responses: [
      { user_id: 'tenant-1', response: 'accepted' }
    ]
  },
  {
    id: '3',
    slot_date: '2025-01-22',
    start_time: '10:00',
    end_time: '12:00',
    status: 'proposed',
    proposed_by: 'provider-1',
    proposed_by_user: {
      id: 'provider-1',
      name: 'Pierre Martin'
    },
    responses: []
  }
]

/**
 * Vue gestionnaire avec tous les créneaux
 */
export const ManagerView: Story = {
  args: {
    timeSlots: mockTimeSlots,
    userRole: 'manager',
    currentUserId: 'manager-1',
    onAddSlot: () => console.log('Add slot'),
    onApproveSlot: (slotId) => console.log('Approve:', slotId),
    onRejectSlot: (slotId) => console.log('Reject:', slotId)
  }
}

/**
 * Vue prestataire
 */
export const ProviderView: Story = {
  args: {
    timeSlots: mockTimeSlots,
    userRole: 'provider',
    currentUserId: 'provider-1',
    onAddSlot: () => console.log('Propose slot')
  }
}

/**
 * Vue locataire avec sélection possible
 */
export const TenantView: Story = {
  args: {
    timeSlots: mockTimeSlots.filter(s => s.status === 'pending' || s.status === 'confirmed'),
    userRole: 'tenant',
    currentUserId: 'tenant-1',
    onSelectSlot: (slotId) => console.log('Select:', slotId)
  }
}

/**
 * Date planifiée confirmée
 */
export const WithScheduledDate: Story = {
  args: {
    timeSlots: mockTimeSlots.filter(s => s.status === 'confirmed'),
    scheduledDate: '2025-01-21',
    userRole: 'manager',
    currentUserId: 'manager-1'
  }
}

/**
 * Aucun créneau
 */
export const NoSlots: Story = {
  args: {
    timeSlots: [],
    userRole: 'manager',
    currentUserId: 'manager-1',
    onAddSlot: () => alert('Ajouter un créneau')
  }
}
