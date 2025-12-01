import type { Meta, StoryObj } from '@storybook/react'
import { ParticipantAvatar } from './participant-avatar'
import type { Participant } from '../types'

/**
 * `ParticipantAvatar` affiche un avatar circulaire pour un participant
 * avec ses initiales et une bordure colorée selon son rôle.
 */
const meta = {
  title: 'Interventions/Atoms/ParticipantAvatar',
  component: ParticipantAvatar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Avatar d\'un participant avec initiales et indicateur de rôle.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Taille de l\'avatar'
    },
    showBadge: {
      control: 'boolean',
      description: 'Afficher le badge de rôle'
    }
  }
} satisfies Meta<typeof ParticipantAvatar>

export default meta
type Story = StoryObj<typeof meta>

const mockManager: Participant = {
  id: '1',
  name: 'Jean Dupont',
  email: 'jean.dupont@example.com',
  role: 'manager'
}

const mockProvider: Participant = {
  id: '2',
  name: 'Pierre Martin',
  email: 'pierre.martin@example.com',
  role: 'provider'
}

const mockTenant: Participant = {
  id: '3',
  name: 'Marie Durand',
  email: 'marie.durand@example.com',
  role: 'tenant'
}

/**
 * Avatar d'un gestionnaire (taille moyenne)
 */
export const Manager: Story = {
  args: {
    participant: mockManager,
    size: 'md',
    showBadge: true
  }
}

/**
 * Avatar d'un prestataire
 */
export const Provider: Story = {
  args: {
    participant: mockProvider,
    size: 'md',
    showBadge: true
  }
}

/**
 * Avatar d'un locataire
 */
export const Tenant: Story = {
  args: {
    participant: mockTenant,
    size: 'md',
    showBadge: true
  }
}

/**
 * Petite taille
 */
export const SmallSize: Story = {
  args: {
    participant: mockManager,
    size: 'sm',
    showBadge: false
  }
}

/**
 * Grande taille
 */
export const LargeSize: Story = {
  args: {
    participant: mockProvider,
    size: 'lg',
    showBadge: true
  }
}

/**
 * Groupe d'avatars
 */
export const AvatarGroup: Story = {
  render: () => (
    <div className="flex -space-x-2">
      <ParticipantAvatar participant={mockManager} size="md" />
      <ParticipantAvatar participant={mockProvider} size="md" />
      <ParticipantAvatar participant={mockTenant} size="md" />
    </div>
  )
}

/**
 * Toutes les tailles
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ParticipantAvatar participant={mockManager} size="sm" showBadge />
      <ParticipantAvatar participant={mockManager} size="md" showBadge />
      <ParticipantAvatar participant={mockManager} size="lg" showBadge />
    </div>
  )
}
