import type { Meta, StoryObj } from '@storybook/react'
import { CommentsCard } from './comments-card'
import type { Comment } from '../types'

const meta = {
  title: 'Interventions/Cards/CommentsCard',
  component: CommentsCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Card des commentaires internes visible uniquement par les gestionnaires.'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof CommentsCard>

export default meta
type Story = StoryObj<typeof meta>

const mockComments: Comment[] = [
  {
    id: '1',
    author: 'Jean Dupont',
    content: 'J\'ai contacté le prestataire ce matin, il confirme sa disponibilité pour la semaine prochaine.',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 heures ago
  },
  {
    id: '2',
    author: 'Sophie Martin',
    content: 'Le locataire a signalé que le problème s\'est aggravé. À traiter en priorité.',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 jour ago
  },
  {
    id: '3',
    author: 'Pierre Durand',
    content: 'Devis reçu et validé par la direction. On peut lancer l\'intervention.',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 jours ago
  }
]

export const Default: Story = {
  args: {
    comments: mockComments,
    onAddComment: async (content) => {
      console.log('Nouveau commentaire:', content)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
}

export const Empty: Story = {
  args: {
    comments: [],
    onAddComment: async (content) => {
      console.log('Nouveau commentaire:', content)
    }
  }
}

export const ReadOnly: Story = {
  args: {
    comments: mockComments
  }
}

export const SingleComment: Story = {
  args: {
    comments: [mockComments[0]],
    onAddComment: async (content) => {
      console.log('Nouveau commentaire:', content)
    }
  }
}

export const ManyComments: Story = {
  args: {
    comments: [
      ...mockComments,
      {
        id: '4',
        author: 'Marie Leroy',
        content: 'J\'ai envoyé un rappel au prestataire pour qu\'il envoie sa facture.',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '5',
        author: 'Jean Dupont',
        content: 'Intervention terminée avec succès. Le locataire est satisfait.',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '6',
        author: 'Sophie Martin',
        content: 'Facture reçue et transmise à la comptabilité pour règlement.',
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    onAddComment: async (content) => {
      console.log('Nouveau commentaire:', content)
    }
  }
}

export const Loading: Story = {
  args: {
    comments: mockComments,
    onAddComment: async (content) => {
      console.log('Nouveau commentaire:', content)
    },
    isLoading: true
  }
}

export const LongComment: Story = {
  args: {
    comments: [
      {
        id: '1',
        author: 'Jean Dupont',
        content: 'Suite à ma visite sur place ce matin, j\'ai pu constater l\'étendue des dégâts. La fuite provient bien du joint du siphon comme suspecté. Cependant, j\'ai également remarqué des traces d\'humidité sur le mur adjacent qui pourraient indiquer un problème plus important au niveau de la canalisation encastrée. Je recommande de faire intervenir un plombier qualifié rapidement pour éviter toute aggravation. Le locataire a été informé et est disponible tous les après-midis de cette semaine.',
        date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      }
    ],
    onAddComment: async (content) => {
      console.log('Nouveau commentaire:', content)
    }
  }
}
