import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { InterventionTabs, TabContentWrapper } from './intervention-tabs'

const meta = {
  title: 'Interventions/Layout/InterventionTabs',
  component: InterventionTabs,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Système d\'onglets pour la prévisualisation d\'intervention, adapté selon le rôle utilisateur.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    userRole: {
      control: 'select',
      options: ['manager', 'provider', 'tenant']
    },
    activeTab: {
      control: 'select',
      options: ['general', 'conversations', 'planning']
    }
  }
} satisfies Meta<typeof InterventionTabs>

export default meta
type Story = StoryObj<typeof meta>

// Composant wrapper pour gérer l'état
const InteractiveTabsWrapper = ({
  userRole,
  defaultTab = 'general'
}: {
  userRole: 'manager' | 'provider' | 'tenant'
  defaultTab?: string
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab)

  return (
    <div className="h-[400px] border rounded-lg overflow-hidden">
      <InterventionTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userRole={userRole}
      >
        <TabContentWrapper value="general">
          <div className="p-4 bg-slate-50 rounded-lg">
            <h3 className="font-medium mb-2">Onglet Général</h3>
            <p className="text-sm text-muted-foreground">
              Contenu de l'onglet général avec les détails de l'intervention.
            </p>
          </div>
        </TabContentWrapper>

        <TabContentWrapper value="conversations">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium mb-2">
              {userRole === 'manager' ? 'Conversations' : 'Messagerie'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Zone de messagerie avec les participants.
            </p>
          </div>
        </TabContentWrapper>

        <TabContentWrapper value="planning">
          <div className="p-4 bg-purple-50 rounded-lg">
            <h3 className="font-medium mb-2">
              {userRole === 'manager'
                ? 'Planning'
                : userRole === 'provider'
                  ? 'Planification'
                  : 'Rendez-vous'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Gestion des créneaux horaires et planification.
            </p>
          </div>
        </TabContentWrapper>
      </InterventionTabs>
    </div>
  )
}

export const ManagerView: Story = {
  render: () => <InteractiveTabsWrapper userRole="manager" />
}

export const ProviderView: Story = {
  render: () => <InteractiveTabsWrapper userRole="provider" />
}

export const TenantView: Story = {
  render: () => <InteractiveTabsWrapper userRole="tenant" />
}

export const ConversationsTab: Story = {
  render: () => <InteractiveTabsWrapper userRole="manager" defaultTab="conversations" />
}

export const PlanningTab: Story = {
  render: () => <InteractiveTabsWrapper userRole="manager" defaultTab="planning" />
}

export const AllRolesComparison: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-2">Vue Gestionnaire</h3>
        <InteractiveTabsWrapper userRole="manager" />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Vue Prestataire</h3>
        <InteractiveTabsWrapper userRole="provider" />
      </div>
      <div>
        <h3 className="text-sm font-medium mb-2">Vue Locataire</h3>
        <InteractiveTabsWrapper userRole="tenant" />
      </div>
    </div>
  )
}

export const WithRichContent: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState('general')

    return (
      <div className="h-[500px] border rounded-lg overflow-hidden">
        <InterventionTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userRole="manager"
        >
          <TabContentWrapper value="general">
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium mb-2">Détails de l'intervention</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Fuite d'eau importante sous l'évier de la cuisine.
                </p>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded">
                    En attente
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    Plomberie
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium mb-2">Localisation</h3>
                <p className="text-sm text-muted-foreground">
                  Appartement 3A, 15 rue de la Paix, 75001 Paris
                </p>
              </div>
            </div>
          </TabContentWrapper>

          <TabContentWrapper value="conversations">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium mb-2">Conversation de groupe</h3>
                <div className="space-y-2">
                  <div className="p-2 bg-white rounded shadow-sm">
                    <p className="text-xs text-muted-foreground">Jean Dupont - 10:30</p>
                    <p className="text-sm">Intervention créée pour la fuite signalée.</p>
                  </div>
                  <div className="p-2 bg-white rounded shadow-sm">
                    <p className="text-xs text-muted-foreground">Marie Durand - 11:00</p>
                    <p className="text-sm">Merci, la fuite s'est aggravée.</p>
                  </div>
                </div>
              </div>
            </div>
          </TabContentWrapper>

          <TabContentWrapper value="planning">
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="font-medium mb-2">Créneaux proposés</h3>
              <div className="space-y-2">
                <div className="p-2 bg-white rounded border">
                  <p className="text-sm font-medium">Lundi 20 janvier</p>
                  <p className="text-xs text-muted-foreground">9h00 - 11h00</p>
                </div>
                <div className="p-2 bg-white rounded border">
                  <p className="text-sm font-medium">Mardi 21 janvier</p>
                  <p className="text-xs text-muted-foreground">14h00 - 16h00</p>
                </div>
              </div>
            </div>
          </TabContentWrapper>
        </InterventionTabs>
      </div>
    )
  }
}
