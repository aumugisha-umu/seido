import type { Meta, StoryObj } from '@storybook/react'
import { ParticipantsList } from './participants-list'
import type { ParticipantsGroup } from '../types'

const meta = {
  title: 'Interventions/Sidebar/ParticipantsList',
  component: ParticipantsList,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Liste des participants groupés par rôle avec boutons de conversation.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    currentUserRole: {
      control: 'select',
      options: ['manager', 'provider', 'tenant']
    }
  }
} satisfies Meta<typeof ParticipantsList>

export default meta
type Story = StoryObj<typeof meta>

const mockParticipants: ParticipantsGroup = {
  managers: [
    { id: 'manager-1', name: 'Jean Dupont', email: 'jean.dupont@seido.fr', role: 'manager' },
    { id: 'manager-2', name: 'Sophie Martin', email: 'sophie.martin@seido.fr', role: 'manager' }
  ],
  providers: [
    { id: 'provider-1', name: 'Pierre Plombier', email: 'pierre@plomberie.fr', role: 'provider' },
    { id: 'provider-2', name: 'Marc Électricien', email: 'marc@elec.fr', role: 'provider' }
  ],
  tenants: [
    { id: 'tenant-1', name: 'Marie Durand', email: 'marie.durand@gmail.com', role: 'tenant' }
  ]
}

export const ManagerView: Story = {
  args: {
    participants: mockParticipants,
    currentUserRole: 'manager',
    onStartConversation: (participantId) => alert(`Démarrer conversation avec ${participantId}`)
  }
}

export const ProviderView: Story = {
  args: {
    participants: mockParticipants,
    currentUserRole: 'provider',
    onStartConversation: (participantId) => alert(`Démarrer conversation avec ${participantId}`)
  }
}

export const TenantView: Story = {
  args: {
    participants: mockParticipants,
    currentUserRole: 'tenant',
    onStartConversation: (participantId) => alert(`Démarrer conversation avec ${participantId}`)
  }
}

export const SingleManager: Story = {
  args: {
    participants: {
      managers: [mockParticipants.managers[0]],
      providers: [],
      tenants: []
    },
    currentUserRole: 'tenant'
  }
}

export const FullTeam: Story = {
  args: {
    participants: {
      managers: mockParticipants.managers,
      providers: [...mockParticipants.providers, { id: 'provider-3', name: 'Julie Peintre', email: 'julie@peinture.fr', role: 'provider' }],
      tenants: [...mockParticipants.tenants, { id: 'tenant-2', name: 'Paul Locataire', email: 'paul@mail.fr', role: 'tenant' }]
    },
    currentUserRole: 'manager',
    onStartConversation: (participantId) => console.log('Conversation with:', participantId)
  }
}
