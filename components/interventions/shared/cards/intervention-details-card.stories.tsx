import type { Meta, StoryObj } from '@storybook/react'
import { InterventionDetailsCard, CompactDetailsCard } from './intervention-details-card'

const meta = {
  title: 'Interventions/Cards/InterventionDetailsCard',
  component: InterventionDetailsCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Card affichant les détails d\'une intervention: description, instructions et localisation.'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof InterventionDetailsCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: "Détails de l'intervention",
    description: "Fuite d'eau importante sous l'évier de la cuisine. L'eau s'écoule depuis le raccord du siphon et a commencé à endommager le meuble.",
    instructions: "Merci de prévoir des joints de rechange. Le locataire sera présent entre 9h et 12h.",
    location: "Appartement 3A, 15 rue de la Paix, 75001 Paris"
  }
}

export const DescriptionOnly: Story = {
  args: {
    description: "Panne de chauffage dans le salon. Le radiateur ne chauffe plus depuis hier soir malgré la purge effectuée."
  }
}

export const WithInstructions: Story = {
  args: {
    description: "Installation d'un nouveau chauffe-eau électrique 200L.",
    instructions: "Prévoir un chariot pour le transport. L'ancien chauffe-eau doit être évacué. Accès par l'escalier de service."
  }
}

export const WithLocation: Story = {
  args: {
    description: "Réparation de la serrure de la porte d'entrée.",
    location: "Bâtiment B, 3ème étage, porte gauche"
  }
}

export const FullDetails: Story = {
  args: {
    title: "Intervention urgente - Plomberie",
    description: "Fuite d'eau au niveau du ballon d'eau chaude. Risque d'inondation du local technique. Intervention prioritaire demandée par le syndic.",
    instructions: "1. Couper l'arrivée d'eau générale\n2. Vérifier l'état du groupe de sécurité\n3. Remplacer si nécessaire\n4. Tester l'étanchéité avant de partir",
    location: "Local technique sous-sol, accès par le parking -1, badge nécessaire"
  }
}

export const CustomTitle: Story = {
  args: {
    title: "Travaux de peinture - Chambre principale",
    description: "Remise en peinture complète de la chambre principale suite dégât des eaux. Plafond et murs à traiter.",
    instructions: "Couleur: Blanc mat RAL 9010. Prévoir 2 couches minimum."
  }
}

export const NoContent: Story = {
  args: {}
}

// Stories pour CompactDetailsCard
export const CompactDefault: StoryObj<typeof CompactDetailsCard> = {
  render: () => (
    <CompactDetailsCard
      description="Fuite d'eau sous l'évier de la cuisine nécessitant une intervention rapide."
      location="Appartement 3A, 15 rue de la Paix"
    />
  )
}

export const CompactDescriptionOnly: StoryObj<typeof CompactDetailsCard> = {
  render: () => (
    <CompactDetailsCard
      description="Installation d'un nouveau thermostat connecté pour le système de chauffage central."
    />
  )
}

export const CompactLocationOnly: StoryObj<typeof CompactDetailsCard> = {
  render: () => (
    <CompactDetailsCard
      location="Bâtiment C, Local technique, RDC"
    />
  )
}

export const CompactLongDescription: StoryObj<typeof CompactDetailsCard> = {
  render: () => (
    <CompactDetailsCard
      description="Rénovation complète de la salle de bain incluant le remplacement de la baignoire par une douche à l'italienne, installation d'un nouveau lavabo suspendu, changement de la robinetterie, pose d'un nouveau carrelage mural et au sol, et mise aux normes de l'installation électrique."
      location="Appartement 5B, 2ème étage"
    />
  )
}
