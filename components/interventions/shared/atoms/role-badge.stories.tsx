import type { Meta, StoryObj } from '@storybook/react'
import { RoleBadge } from './role-badge'

/**
 * `RoleBadge` affiche le rôle d'un utilisateur avec un code couleur distinctif.
 *
 * - **Manager** : Bleu - Gestionnaires responsables des interventions
 * - **Provider** : Violet - Prestataires qui exécutent les travaux
 * - **Tenant** : Vert - Locataires concernés par l'intervention
 */
const meta = {
  title: 'Interventions/Atoms/RoleBadge',
  component: RoleBadge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Badge indiquant le rôle d\'un utilisateur dans une intervention.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    role: {
      control: 'select',
      options: ['manager', 'provider', 'tenant'],
      description: 'Le rôle de l\'utilisateur'
    },
    showLabel: {
      control: 'boolean',
      description: 'Afficher le label textuel du rôle'
    }
  }
} satisfies Meta<typeof RoleBadge>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Badge par défaut pour un gestionnaire
 */
export const Manager: Story = {
  args: {
    role: 'manager',
    showLabel: true
  }
}

/**
 * Badge pour un prestataire
 */
export const Provider: Story = {
  args: {
    role: 'provider',
    showLabel: true
  }
}

/**
 * Badge pour un locataire
 */
export const Tenant: Story = {
  args: {
    role: 'tenant',
    showLabel: true
  }
}

/**
 * Badges sans label (icône seulement)
 */
export const IconOnly: Story = {
  args: {
    role: 'manager',
    showLabel: false
  }
}

/**
 * Tous les rôles côte à côte
 */
export const AllRoles: Story = {
  render: () => (
    <div className="flex gap-2">
      <RoleBadge role="manager" showLabel />
      <RoleBadge role="provider" showLabel />
      <RoleBadge role="tenant" showLabel />
    </div>
  )
}
