import type { Meta, StoryObj } from '@storybook/react'
import {
  PreviewHybridLayout,
  ContentWrapper,
  ContentHeader,
  MobileLayout
} from './preview-hybrid-layout'

const meta = {
  title: 'Interventions/Layout/PreviewHybridLayout',
  component: PreviewHybridLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Layout principal pour la prévisualisation d\'intervention avec sidebar et contenu principal.'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof PreviewHybridLayout>

export default meta
type Story = StoryObj<typeof meta>

// Composants mock pour les stories
const MockSidebar = () => (
  <div className="p-4 space-y-4 h-full overflow-y-auto">
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Participants</h3>
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs">
            JD
          </div>
          <div>
            <p className="text-sm font-medium">Jean Dupont</p>
            <p className="text-xs text-muted-foreground">Gestionnaire</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
            PM
          </div>
          <div>
            <p className="text-sm font-medium">Pierre Martin</p>
            <p className="text-xs text-muted-foreground">Prestataire</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs">
            MD
          </div>
          <div>
            <p className="text-sm font-medium">Marie Durand</p>
            <p className="text-xs text-muted-foreground">Locataire</p>
          </div>
        </div>
      </div>
    </div>

    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Progression</h3>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm">Demande créée</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm">Approuvée</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-sm font-medium">Planification</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-300" />
          <span className="text-sm text-muted-foreground">En cours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-300" />
          <span className="text-sm text-muted-foreground">Terminée</span>
        </div>
      </div>
    </div>
  </div>
)

const MockContent = () => (
  <ContentWrapper>
    <ContentHeader
      title="Fuite d'eau - Cuisine"
      subtitle="Intervention #INT-2025-001"
      actions={
        <button className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
          Actions
        </button>
      }
    />

    <div className="space-y-4">
      <div className="p-4 bg-slate-50 rounded-lg">
        <h3 className="font-medium mb-2">Description</h3>
        <p className="text-sm text-muted-foreground">
          Fuite d&apos;eau importante sous l&apos;évier de la cuisine. L&apos;eau s&apos;écoule depuis le raccord du siphon
          et a commencé à endommager le meuble.
        </p>
      </div>

      <div className="p-4 bg-slate-50 rounded-lg">
        <h3 className="font-medium mb-2">Instructions</h3>
        <p className="text-sm text-muted-foreground">
          Merci de prévoir des joints de rechange. Le locataire sera présent entre 9h et 12h.
        </p>
      </div>

      <div className="p-4 bg-slate-50 rounded-lg">
        <h3 className="font-medium mb-2">Localisation</h3>
        <p className="text-sm text-muted-foreground">
          Appartement 3A, 15 rue de la Paix, 75001 Paris
        </p>
      </div>
    </div>
  </ContentWrapper>
)

export const Default: Story = {
  args: {
    sidebar: <MockSidebar />,
    content: <MockContent />,
    height: 600
  }
}

export const TallLayout: Story = {
  args: {
    sidebar: <MockSidebar />,
    content: <MockContent />,
    height: 800
  }
}

export const CompactLayout: Story = {
  args: {
    sidebar: <MockSidebar />,
    content: <MockContent />,
    height: 400
  }
}

export const SidebarVisibleOnMobile: Story = {
  args: {
    sidebar: <MockSidebar />,
    content: <MockContent />,
    height: 600,
    showSidebarOnMobile: true
  }
}

export const CustomHeight: Story = {
  args: {
    sidebar: <MockSidebar />,
    content: <MockContent />,
    height: '70vh'
  }
}

// Stories pour ContentWrapper avec différents paddings
export const ContentWrapperSmallPadding: StoryObj<typeof ContentWrapper> = {
  render: () => (
    <div className="h-[300px] border rounded-lg overflow-hidden">
      <ContentWrapper padding="sm">
        <div className="p-4 bg-slate-100 rounded">
          <p className="text-sm">Contenu avec padding small (p-3)</p>
        </div>
      </ContentWrapper>
    </div>
  )
}

export const ContentWrapperMediumPadding: StoryObj<typeof ContentWrapper> = {
  render: () => (
    <div className="h-[300px] border rounded-lg overflow-hidden">
      <ContentWrapper padding="md">
        <div className="p-4 bg-slate-100 rounded">
          <p className="text-sm">Contenu avec padding medium (p-4 sm:p-6)</p>
        </div>
      </ContentWrapper>
    </div>
  )
}

export const ContentWrapperLargePadding: StoryObj<typeof ContentWrapper> = {
  render: () => (
    <div className="h-[300px] border rounded-lg overflow-hidden">
      <ContentWrapper padding="lg">
        <div className="p-4 bg-slate-100 rounded">
          <p className="text-sm">Contenu avec padding large (p-6 sm:p-8)</p>
        </div>
      </ContentWrapper>
    </div>
  )
}

// Stories pour ContentHeader
export const HeaderWithActions: StoryObj<typeof ContentHeader> = {
  render: () => (
    <div className="p-4 border rounded-lg">
      <ContentHeader
        title="Intervention #INT-2025-001"
        subtitle="Fuite d'eau - Cuisine"
        actions={
          <div className="flex gap-2">
            <button className="px-3 py-1.5 border text-sm rounded hover:bg-slate-50">
              Annuler
            </button>
            <button className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
              Valider
            </button>
          </div>
        }
      />
      <p className="text-sm text-muted-foreground">Contenu après le header...</p>
    </div>
  )
}

export const HeaderSimple: StoryObj<typeof ContentHeader> = {
  render: () => (
    <div className="p-4 border rounded-lg">
      <ContentHeader title="Détails de l'intervention" />
      <p className="text-sm text-muted-foreground">Contenu après le header...</p>
    </div>
  )
}

// Stories pour MobileLayout
export const MobileLayoutDefault: StoryObj<typeof MobileLayout> = {
  render: () => (
    <div className="max-w-md mx-auto h-[500px] border rounded-lg overflow-hidden">
      <MobileLayout
        sidebar={<MockSidebar />}
        content={<MockContent />}
        sidebarTitle="Participants & Progression"
      />
    </div>
  )
}

export const FullExample: Story = {
  render: () => (
    <div className="space-y-8 p-4">
      <div>
        <h2 className="text-lg font-semibold mb-4">Desktop Layout</h2>
        <PreviewHybridLayout
          sidebar={<MockSidebar />}
          content={<MockContent />}
          height={500}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Mobile Layout (max-w-md)</h2>
        <div className="max-w-md mx-auto h-[400px] border rounded-lg overflow-hidden">
          <MobileLayout
            sidebar={<MockSidebar />}
            content={<MockContent />}
          />
        </div>
      </div>
    </div>
  )
}
