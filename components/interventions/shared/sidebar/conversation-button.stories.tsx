import type { Meta, StoryObj } from '@storybook/react'
import { ConversationButton } from './conversation-button'

const meta = {
  title: 'Interventions/Sidebar/ConversationButton',
  component: ConversationButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Bouton pour accéder aux conversations avec indicateur de messages non lus.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'ghost']
    }
  }
} satisfies Meta<typeof ConversationButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onClick: () => alert('Ouvrir les conversations'),
    variant: 'default'
  }
}

export const WithUnreadCount: Story = {
  args: {
    onClick: () => alert('Ouvrir les conversations'),
    unreadCount: 3,
    variant: 'default'
  }
}

export const ManyUnread: Story = {
  args: {
    onClick: () => alert('Ouvrir les conversations'),
    unreadCount: 99,
    variant: 'default'
  }
}

export const OutlineVariant: Story = {
  args: {
    onClick: () => alert('Ouvrir les conversations'),
    unreadCount: 5,
    variant: 'outline'
  }
}

export const GhostVariant: Story = {
  args: {
    onClick: () => alert('Ouvrir les conversations'),
    variant: 'ghost'
  }
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <ConversationButton onClick={() => {}} variant="default" />
      <ConversationButton onClick={() => {}} variant="outline" unreadCount={3} />
      <ConversationButton onClick={() => {}} variant="ghost" unreadCount={12} />
    </div>
  )
}
