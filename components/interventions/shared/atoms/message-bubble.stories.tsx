import type { Meta, StoryObj } from '@storybook/react'
import { MessageBubble } from './message-bubble'
import type { Message } from '../types'

const meta = {
  title: 'Interventions/Atoms/MessageBubble',
  component: MessageBubble,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Bulle de message pour les conversations avec style adapté au rôle.'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof MessageBubble>

export default meta
type Story = StoryObj<typeof meta>

const mockManagerMessage: Message = {
  id: '1',
  content: 'Bonjour, pouvez-vous me donner une estimation pour cette intervention ?',
  created_at: '2025-01-15T10:30:00Z',
  user_id: 'manager-1',
  user_name: 'Jean Dupont',
  user_role: 'manager'
}

const mockProviderMessage: Message = {
  id: '2',
  content: 'Bien sûr, après examen des photos, je pense pouvoir intervenir rapidement. Le coût estimé serait autour de 350€.',
  created_at: '2025-01-15T11:00:00Z',
  user_id: 'provider-1',
  user_name: 'Pierre Martin',
  user_role: 'provider'
}

const mockTenantMessage: Message = {
  id: '3',
  content: 'Merci pour votre réactivité ! Je suis disponible tous les matins cette semaine.',
  created_at: '2025-01-15T11:30:00Z',
  user_id: 'tenant-1',
  user_name: 'Marie Durand',
  user_role: 'tenant'
}

export const ManagerMessage: Story = {
  args: {
    message: mockManagerMessage,
    isCurrentUser: false
  }
}

export const ProviderMessage: Story = {
  args: {
    message: mockProviderMessage,
    isCurrentUser: false
  }
}

export const TenantMessage: Story = {
  args: {
    message: mockTenantMessage,
    isCurrentUser: false
  }
}

export const CurrentUserMessage: Story = {
  args: {
    message: mockManagerMessage,
    isCurrentUser: true
  }
}

export const Conversation: Story = {
  render: () => (
    <div className="space-y-3 max-w-md">
      <MessageBubble message={mockManagerMessage} isCurrentUser={true} />
      <MessageBubble message={mockProviderMessage} isCurrentUser={false} />
      <MessageBubble message={mockTenantMessage} isCurrentUser={false} />
    </div>
  )
}
