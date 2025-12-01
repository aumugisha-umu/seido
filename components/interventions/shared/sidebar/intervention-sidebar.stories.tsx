import type { Meta, StoryObj } from '@storybook/react'
import { InterventionSidebar } from './intervention-sidebar'
import type { ParticipantsGroup } from '../types'

const meta = {
  title: 'Interventions/Sidebar/InterventionSidebar',
  component: InterventionSidebar,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Sidebar complète pour une intervention avec participants, timeline et actions.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    currentUserRole: {
      control: 'select',
      options: ['manager', 'provider', 'tenant']
    },
    currentStatus: {
      control: 'select',
      options: [
        'demande',
        'approuvee',
        'demande_de_devis',
        'planification',
        'planifiee',
        'en_cours',
        'cloturee_par_gestionnaire'
      ]
    }
  }
} satisfies Meta<typeof InterventionSidebar>

export default meta
type Story = StoryObj<typeof meta>

const mockParticipants: ParticipantsGroup = {
  managers: [
    { id: 'manager-1', name: 'Jean Dupont', email: 'jean.dupont@seido.fr', role: 'manager' }
  ],
  providers: [
    { id: 'provider-1', name: 'Pierre Plombier', email: 'pierre@plomberie.fr', role: 'provider' }
  ],
  tenants: [
    { id: 'tenant-1', name: 'Marie Durand', email: 'marie.durand@gmail.com', role: 'tenant' }
  ]
}

export const ManagerViewDemande: Story = {
  args: {
    participants: mockParticipants,
    currentUserRole: 'manager',
    currentStatus: 'demande',
    onStartConversation: (id) => console.log('Conversation:', id),
    onOpenGroupChat: () => console.log('Open group chat')
  }
}

export const ManagerViewPlanifiee: Story = {
  args: {
    participants: mockParticipants,
    currentUserRole: 'manager',
    currentStatus: 'planifiee',
    onStartConversation: (id) => console.log('Conversation:', id),
    onOpenGroupChat: () => console.log('Open group chat')
  }
}

export const ProviderView: Story = {
  args: {
    participants: mockParticipants,
    currentUserRole: 'provider',
    currentStatus: 'en_cours',
    onStartConversation: (id) => console.log('Conversation:', id),
    onOpenGroupChat: () => console.log('Open group chat')
  }
}

export const TenantView: Story = {
  args: {
    participants: mockParticipants,
    currentUserRole: 'tenant',
    currentStatus: 'planification',
    onStartConversation: (id) => console.log('Conversation:', id),
    onOpenGroupChat: () => console.log('Open group chat')
  }
}

export const Completed: Story = {
  args: {
    participants: mockParticipants,
    currentUserRole: 'manager',
    currentStatus: 'cloturee_par_gestionnaire',
    onStartConversation: (id) => console.log('Conversation:', id),
    onOpenGroupChat: () => console.log('Open group chat')
  }
}

export const WithManyParticipants: Story = {
  args: {
    participants: {
      managers: [
        { id: 'manager-1', name: 'Jean Dupont', email: 'jean@seido.fr', role: 'manager' },
        { id: 'manager-2', name: 'Sophie Martin', email: 'sophie@seido.fr', role: 'manager' }
      ],
      providers: [
        { id: 'provider-1', name: 'Pierre Plombier', email: 'pierre@plomberie.fr', role: 'provider' },
        { id: 'provider-2', name: 'Marc Électricien', email: 'marc@elec.fr', role: 'provider' },
        { id: 'provider-3', name: 'Julie Peintre', email: 'julie@peinture.fr', role: 'provider' }
      ],
      tenants: [
        { id: 'tenant-1', name: 'Marie Durand', email: 'marie@gmail.com', role: 'tenant' },
        { id: 'tenant-2', name: 'Paul Locataire', email: 'paul@mail.fr', role: 'tenant' }
      ]
    },
    currentUserRole: 'manager',
    currentStatus: 'planifiee',
    onStartConversation: (id) => alert(`Démarrer conversation avec ${id}`),
    onOpenGroupChat: () => alert('Ouvrir chat de groupe')
  }
}
