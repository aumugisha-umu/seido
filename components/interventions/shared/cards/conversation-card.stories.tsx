import type { Meta, StoryObj } from '@storybook/react'
import { ConversationCard, ConversationPreview } from './conversation-card'
import type { Message } from '../types'

const meta = {
  title: 'Interventions/Cards/ConversationCard',
  component: ConversationCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Card de conversation avec messages et zone de saisie.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    currentUserRole: {
      control: 'select',
      options: ['manager', 'provider', 'tenant']
    },
    conversationType: {
      control: 'select',
      options: ['group', 'direct']
    }
  }
} satisfies Meta<typeof ConversationCard>

export default meta
type Story = StoryObj<typeof meta>

const mockMessages: Message[] = [
  {
    id: '1',
    content: 'Bonjour, je viens de créer l\'intervention pour la fuite d\'eau signalée.',
    author: 'manager-1',
    authorName: 'Jean Dupont',
    authorRole: 'manager',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    isMe: false
  },
  {
    id: '2',
    content: 'Merci pour la prise en charge rapide ! La fuite s\'est légèrement aggravée depuis ce matin.',
    author: 'tenant-1',
    authorName: 'Marie Durand',
    authorRole: 'tenant',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isMe: false
  },
  {
    id: '3',
    content: 'Je peux passer demain matin entre 9h et 11h. Est-ce que ça vous convient ?',
    author: 'provider-1',
    authorName: 'Pierre Martin',
    authorRole: 'provider',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    isMe: false
  },
  {
    id: '4',
    content: 'Parfait pour moi, je serai présente.',
    author: 'tenant-1',
    authorName: 'Marie Durand',
    authorRole: 'tenant',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    isMe: false
  }
]

export const GroupConversationManager: Story = {
  args: {
    messages: mockMessages,
    currentUserId: 'manager-1',
    currentUserRole: 'manager',
    conversationType: 'group',
    onSendMessage: async (content) => {
      console.log('Message envoyé:', content)
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }
}

export const GroupConversationProvider: Story = {
  args: {
    messages: mockMessages,
    currentUserId: 'provider-1',
    currentUserRole: 'provider',
    conversationType: 'group',
    onSendMessage: async (content) => {
      console.log('Message envoyé:', content)
    }
  }
}

export const GroupConversationTenant: Story = {
  args: {
    messages: mockMessages,
    currentUserId: 'tenant-1',
    currentUserRole: 'tenant',
    conversationType: 'group',
    onSendMessage: async (content) => {
      console.log('Message envoyé:', content)
    }
  }
}

export const DirectConversation: Story = {
  args: {
    messages: [
      {
        id: '1',
        content: 'Bonjour, j\'ai une question concernant le devis.',
        author: 'manager-1',
        authorName: 'Jean Dupont',
        authorRole: 'manager',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        isMe: true
      },
      {
        id: '2',
        content: 'Oui bien sûr, je vous écoute.',
        author: 'provider-1',
        authorName: 'Pierre Martin',
        authorRole: 'provider',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        isMe: false
      }
    ],
    currentUserId: 'manager-1',
    currentUserRole: 'manager',
    conversationType: 'direct',
    participantName: 'Pierre Martin',
    onSendMessage: async (content) => {
      console.log('Message envoyé:', content)
    }
  }
}

export const EmptyConversation: Story = {
  args: {
    messages: [],
    currentUserId: 'manager-1',
    currentUserRole: 'manager',
    conversationType: 'group',
    onSendMessage: async (content) => {
      console.log('Message envoyé:', content)
    }
  }
}

export const ReadOnly: Story = {
  args: {
    messages: mockMessages,
    currentUserId: 'manager-1',
    currentUserRole: 'manager',
    conversationType: 'group'
  }
}

export const Loading: Story = {
  args: {
    messages: mockMessages,
    currentUserId: 'manager-1',
    currentUserRole: 'manager',
    conversationType: 'group',
    onSendMessage: async (content) => {
      console.log('Message envoyé:', content)
    },
    isLoading: true
  }
}

export const LongMessages: Story = {
  args: {
    messages: [
      {
        id: '1',
        content: 'Suite à notre conversation téléphonique de ce matin, je vous confirme que nous pouvons intervenir la semaine prochaine. Nous avons vérifié nos stocks et nous disposons de toutes les pièces nécessaires pour effectuer la réparation. Le délai estimé pour l\'intervention est d\'environ 2 heures.',
        author: 'provider-1',
        authorName: 'Pierre Martin',
        authorRole: 'provider',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isMe: false
      },
      {
        id: '2',
        content: 'Merci pour ces précisions. Pourriez-vous me confirmer si le locataire doit prendre des précautions particulières avant votre venue ? Par exemple, vider les placards sous l\'évier ou couper l\'eau ?',
        author: 'manager-1',
        authorName: 'Jean Dupont',
        authorRole: 'manager',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        isMe: true
      }
    ],
    currentUserId: 'manager-1',
    currentUserRole: 'manager',
    conversationType: 'direct',
    participantName: 'Pierre Martin',
    onSendMessage: async (content) => {
      console.log('Message envoyé:', content)
    }
  }
}

// Stories pour ConversationPreview
export const PreviewDefault: StoryObj<typeof ConversationPreview> = {
  render: () => (
    <div className="max-w-md">
      <ConversationPreview
        messages={mockMessages}
        currentUserId="manager-1"
        maxMessages={3}
        onViewAll={() => alert('Voir tous les messages')}
      />
    </div>
  )
}

export const PreviewEmpty: StoryObj<typeof ConversationPreview> = {
  render: () => (
    <div className="max-w-md">
      <ConversationPreview
        messages={[]}
        currentUserId="manager-1"
      />
    </div>
  )
}

export const PreviewFewMessages: StoryObj<typeof ConversationPreview> = {
  render: () => (
    <div className="max-w-md">
      <ConversationPreview
        messages={mockMessages.slice(0, 2)}
        currentUserId="manager-1"
        maxMessages={3}
      />
    </div>
  )
}
