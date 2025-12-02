import type { Meta, StoryObj } from '@storybook/react'
import { ProgressionTimeline } from './progression-timeline'

const meta = {
  title: 'Interventions/Sidebar/ProgressionTimeline',
  component: ProgressionTimeline,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Timeline de progression d\'une intervention affichant les étapes passées, actuelle et futures.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    currentStatus: {
      control: 'select',
      options: [
        'demande',
        'approuvee',
        'demande_de_devis',
        'planification',
        'planifiee',
        'en_cours',
        'cloturee_par_prestataire',
        'cloturee_par_locataire',
        'cloturee_par_gestionnaire',
        'annulee',
        'rejetee'
      ]
    },
    variant: {
      control: 'select',
      options: ['default', 'compact']
    }
  }
} satisfies Meta<typeof ProgressionTimeline>

export default meta
type Story = StoryObj<typeof meta>

export const Demande: Story = {
  args: {
    currentStatus: 'demande',
    variant: 'default'
  }
}

export const Approuvee: Story = {
  args: {
    currentStatus: 'approuvee',
    variant: 'default'
  }
}

export const DemandeDeDevis: Story = {
  args: {
    currentStatus: 'demande_de_devis',
    variant: 'default'
  }
}

export const Planification: Story = {
  args: {
    currentStatus: 'planification',
    variant: 'default'
  }
}

export const Planifiee: Story = {
  args: {
    currentStatus: 'planifiee',
    variant: 'default'
  }
}

export const EnCours: Story = {
  args: {
    currentStatus: 'en_cours',
    variant: 'default'
  }
}

export const ClotureParPrestataire: Story = {
  args: {
    currentStatus: 'cloturee_par_prestataire',
    variant: 'default'
  }
}

export const ClotureParGestionnaire: Story = {
  args: {
    currentStatus: 'cloturee_par_gestionnaire',
    variant: 'default'
  }
}

export const Annulee: Story = {
  args: {
    currentStatus: 'annulee',
    variant: 'default'
  }
}

export const Rejetee: Story = {
  args: {
    currentStatus: 'rejetee',
    variant: 'default'
  }
}

export const CompactVariant: Story = {
  args: {
    currentStatus: 'planifiee',
    variant: 'compact'
  }
}

export const AllStatusesCompact: Story = {
  render: () => (
    <div className="space-y-6">
      <ProgressionTimeline currentStatus="demande" variant="compact" />
      <ProgressionTimeline currentStatus="approuvee" variant="compact" />
      <ProgressionTimeline currentStatus="planifiee" variant="compact" />
      <ProgressionTimeline currentStatus="cloturee_par_gestionnaire" variant="compact" />
      <ProgressionTimeline currentStatus="annulee" variant="compact" />
    </div>
  )
}
