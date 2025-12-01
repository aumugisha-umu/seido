import type { Meta, StoryObj } from '@storybook/react'
import { StatusBadge } from './status-badge'

/**
 * `StatusBadge` affiche le statut d'un élément (devis, créneau, intervention)
 * avec une couleur distinctive selon l'état.
 */
const meta = {
  title: 'Interventions/Atoms/StatusBadge',
  component: StatusBadge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Badge indiquant le statut d\'un devis, créneau horaire ou document.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['pending', 'sent', 'approved', 'rejected', 'cancelled', 'confirmed', 'proposed', 'selected'],
      description: 'Le statut de l\'élément'
    },
    type: {
      control: 'select',
      options: ['quote', 'timeSlot', 'document'],
      description: 'Le type d\'élément concerné'
    }
  }
} satisfies Meta<typeof StatusBadge>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Statut en attente (défaut)
 */
export const Pending: Story = {
  args: {
    status: 'pending',
    type: 'quote'
  }
}

/**
 * Devis approuvé
 */
export const QuoteApproved: Story = {
  args: {
    status: 'approved',
    type: 'quote'
  }
}

/**
 * Devis rejeté
 */
export const QuoteRejected: Story = {
  args: {
    status: 'rejected',
    type: 'quote'
  }
}

/**
 * Créneau confirmé
 */
export const TimeSlotConfirmed: Story = {
  args: {
    status: 'confirmed',
    type: 'timeSlot'
  }
}

/**
 * Créneau proposé
 */
export const TimeSlotProposed: Story = {
  args: {
    status: 'proposed',
    type: 'timeSlot'
  }
}

/**
 * Tous les statuts de devis
 */
export const AllQuoteStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="pending" type="quote" />
      <StatusBadge status="sent" type="quote" />
      <StatusBadge status="approved" type="quote" />
      <StatusBadge status="rejected" type="quote" />
      <StatusBadge status="cancelled" type="quote" />
    </div>
  )
}

/**
 * Tous les statuts de créneaux
 */
export const AllTimeSlotStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusBadge status="pending" type="timeSlot" />
      <StatusBadge status="proposed" type="timeSlot" />
      <StatusBadge status="selected" type="timeSlot" />
      <StatusBadge status="confirmed" type="timeSlot" />
      <StatusBadge status="rejected" type="timeSlot" />
      <StatusBadge status="cancelled" type="timeSlot" />
    </div>
  )
}
