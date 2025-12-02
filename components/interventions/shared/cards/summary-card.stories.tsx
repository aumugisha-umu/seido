import type { Meta, StoryObj } from '@storybook/react'
import { SummaryCard } from './summary-card'

const meta = {
  title: 'Interventions/Cards/SummaryCard',
  component: SummaryCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Card de synthèse affichant le statut du planning et des devis pour une intervention.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    planningStatus: {
      control: 'select',
      options: ['pending', 'scheduled', 'completed']
    },
    quotesStatus: {
      control: 'select',
      options: ['pending', 'received', 'approved']
    }
  }
} satisfies Meta<typeof SummaryCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    planningStatus: 'pending',
    quotesStatus: 'pending'
  }
}

export const Scheduled: Story = {
  args: {
    scheduledDate: '2025-01-20',
    planningStatus: 'scheduled',
    quotesStatus: 'pending'
  }
}

export const WithQuotesReceived: Story = {
  args: {
    planningStatus: 'pending',
    quotesStatus: 'received',
    quotesCount: 3
  }
}

export const WithApprovedQuote: Story = {
  args: {
    scheduledDate: '2025-01-25',
    planningStatus: 'scheduled',
    quotesStatus: 'approved',
    quotesCount: 2,
    selectedQuoteAmount: 450
  }
}

export const Completed: Story = {
  args: {
    scheduledDate: '2025-01-15',
    planningStatus: 'completed',
    quotesStatus: 'approved',
    quotesCount: 1,
    selectedQuoteAmount: 180
  }
}

export const HighValueQuote: Story = {
  args: {
    scheduledDate: '2025-02-10',
    planningStatus: 'scheduled',
    quotesStatus: 'approved',
    quotesCount: 4,
    selectedQuoteAmount: 3500
  }
}

export const SingleQuote: Story = {
  args: {
    planningStatus: 'pending',
    quotesStatus: 'received',
    quotesCount: 1
  }
}

export const AllStatuses: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <SummaryCard
        planningStatus="pending"
        quotesStatus="pending"
      />
      <SummaryCard
        scheduledDate="2025-01-20"
        planningStatus="scheduled"
        quotesStatus="received"
        quotesCount={2}
      />
      <SummaryCard
        scheduledDate="2025-01-15"
        planningStatus="completed"
        quotesStatus="approved"
        quotesCount={1}
        selectedQuoteAmount={250}
      />
    </div>
  )
}
