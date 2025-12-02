import type { Meta, StoryObj } from '@storybook/react'
import { TimeSlotCard } from './time-slot-card'
import type { TimeSlot } from '../types'

const meta = {
  title: 'Interventions/Atoms/TimeSlotCard',
  component: TimeSlotCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Carte affichant un créneau horaire avec actions contextuelles selon le rôle.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    userRole: {
      control: 'select',
      options: ['manager', 'provider', 'tenant']
    },
    variant: {
      control: 'select',
      options: ['default', 'compact']
    }
  }
} satisfies Meta<typeof TimeSlotCard>

export default meta
type Story = StoryObj<typeof meta>

const pendingSlot: TimeSlot = {
  id: '1',
  slot_date: '2025-01-20',
  start_time: '09:00',
  end_time: '11:00',
  status: 'pending',
  proposed_by: 'manager-1',
  proposed_by_user: { id: 'manager-1', name: 'Jean Dupont' },
  responses: []
}

const confirmedSlot: TimeSlot = {
  id: '2',
  slot_date: '2025-01-21',
  start_time: '14:00',
  end_time: '16:00',
  status: 'confirmed',
  proposed_by: 'provider-1',
  proposed_by_user: { id: 'provider-1', name: 'Pierre Martin' },
  responses: [
    { user_id: 'tenant-1', response: 'accepted' },
    { user_id: 'manager-1', response: 'accepted' }
  ]
}

const slotWithResponses: TimeSlot = {
  id: '3',
  slot_date: '2025-01-22',
  start_time: '10:00',
  end_time: '12:00',
  status: 'proposed',
  proposed_by: 'provider-1',
  proposed_by_user: { id: 'provider-1', name: 'Pierre Martin' },
  responses: [
    { user_id: 'tenant-1', response: 'accepted' },
    { user_id: 'manager-1', response: 'pending' }
  ]
}

export const PendingSlot: Story = {
  args: {
    slot: pendingSlot,
    userRole: 'manager',
    currentUserId: 'manager-1'
  }
}

export const ConfirmedSlot: Story = {
  args: {
    slot: confirmedSlot,
    userRole: 'manager',
    currentUserId: 'manager-1'
  }
}

export const WithResponses: Story = {
  args: {
    slot: slotWithResponses,
    userRole: 'manager',
    currentUserId: 'manager-1'
  }
}

export const TenantView: Story = {
  args: {
    slot: pendingSlot,
    userRole: 'tenant',
    currentUserId: 'tenant-1',
    onSelect: (id) => console.log('Select:', id)
  }
}

export const ManagerWithActions: Story = {
  args: {
    slot: slotWithResponses,
    userRole: 'manager',
    currentUserId: 'manager-1',
    onApprove: (id) => alert(`Approuver créneau ${id}`),
    onReject: (id) => alert(`Rejeter créneau ${id}`)
  }
}

export const CompactVariant: Story = {
  args: {
    slot: confirmedSlot,
    userRole: 'manager',
    currentUserId: 'manager-1',
    variant: 'compact'
  }
}

export const AllStatuses: Story = {
  render: () => (
    <div className="space-y-3 max-w-md">
      <TimeSlotCard slot={pendingSlot} userRole="manager" currentUserId="manager-1" />
      <TimeSlotCard slot={confirmedSlot} userRole="manager" currentUserId="manager-1" />
      <TimeSlotCard slot={{ ...pendingSlot, id: '4', status: 'cancelled' }} userRole="manager" currentUserId="manager-1" />
    </div>
  )
}
