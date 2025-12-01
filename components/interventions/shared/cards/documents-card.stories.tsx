import type { Meta, StoryObj } from '@storybook/react'
import { DocumentsCard, DocumentsGrid } from './documents-card'
import type { InterventionDocument } from '../types'

const meta = {
  title: 'Interventions/Cards/DocumentsCard',
  component: DocumentsCard,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Card des documents et rapports attachés à une intervention.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    userRole: {
      control: 'select',
      options: ['manager', 'provider', 'tenant']
    }
  }
} satisfies Meta<typeof DocumentsCard>

export default meta
type Story = StoryObj<typeof meta>

const mockDocuments: InterventionDocument[] = [
  {
    id: '1',
    filename: 'devis_plomberie.pdf',
    original_filename: 'Devis Plomberie - Janvier 2025.pdf',
    mime_type: 'application/pdf',
    file_size: 245000,
    uploaded_at: '2025-01-15T10:00:00Z',
    uploaded_by: 'provider-1',
    uploaded_by_name: 'Pierre Martin'
  },
  {
    id: '2',
    filename: 'photo_fuite.jpg',
    original_filename: 'Photo fuite salle de bain.jpg',
    mime_type: 'image/jpeg',
    file_size: 1250000,
    uploaded_at: '2025-01-14T15:30:00Z',
    uploaded_by: 'tenant-1',
    uploaded_by_name: 'Marie Durand'
  },
  {
    id: '3',
    filename: 'rapport_intervention.docx',
    original_filename: 'Rapport intervention finale.docx',
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_size: 89000,
    uploaded_at: '2025-01-16T09:00:00Z',
    uploaded_by: 'manager-1',
    uploaded_by_name: 'Jean Dupont'
  }
]

export const ManagerView: Story = {
  args: {
    documents: mockDocuments,
    userRole: 'manager',
    onUpload: () => alert('Ouvrir le sélecteur de fichiers'),
    onView: (id) => console.log('View document:', id),
    onDownload: (id) => console.log('Download document:', id),
    onDelete: (id) => alert(`Supprimer le document ${id} ?`)
  }
}

export const ProviderView: Story = {
  args: {
    documents: mockDocuments,
    userRole: 'provider',
    onUpload: () => alert('Ajouter un document'),
    onView: (id) => console.log('View document:', id),
    onDownload: (id) => console.log('Download document:', id)
  }
}

export const TenantView: Story = {
  args: {
    documents: mockDocuments,
    userRole: 'tenant',
    onView: (id) => console.log('View document:', id),
    onDownload: (id) => console.log('Download document:', id)
  }
}

export const Empty: Story = {
  args: {
    documents: [],
    userRole: 'manager',
    onUpload: () => alert('Ajouter un document')
  }
}

export const EmptyTenantView: Story = {
  args: {
    documents: [],
    userRole: 'tenant'
  }
}

export const SingleDocument: Story = {
  args: {
    documents: [mockDocuments[0]],
    userRole: 'manager',
    onUpload: () => alert('Ajouter un document'),
    onView: (id) => console.log('View:', id),
    onDownload: (id) => console.log('Download:', id),
    onDelete: (id) => alert(`Supprimer ${id} ?`)
  }
}

export const ManyDocuments: Story = {
  args: {
    documents: [
      ...mockDocuments,
      {
        id: '4',
        filename: 'facture_finale.pdf',
        original_filename: 'Facture finale - Travaux plomberie.pdf',
        mime_type: 'application/pdf',
        file_size: 156000,
        uploaded_at: '2025-01-20T14:00:00Z',
        uploaded_by: 'provider-1',
        uploaded_by_name: 'Pierre Martin'
      },
      {
        id: '5',
        filename: 'photo_avant.jpg',
        original_filename: 'Photo avant intervention.jpg',
        mime_type: 'image/jpeg',
        file_size: 2100000,
        uploaded_at: '2025-01-14T08:00:00Z',
        uploaded_by: 'manager-1',
        uploaded_by_name: 'Jean Dupont'
      },
      {
        id: '6',
        filename: 'photo_apres.jpg',
        original_filename: 'Photo après intervention.jpg',
        mime_type: 'image/jpeg',
        file_size: 1980000,
        uploaded_at: '2025-01-18T16:30:00Z',
        uploaded_by: 'provider-1',
        uploaded_by_name: 'Pierre Martin'
      }
    ],
    userRole: 'manager',
    onUpload: () => alert('Ajouter'),
    onView: (id) => console.log('View:', id),
    onDownload: (id) => console.log('Download:', id),
    onDelete: (id) => alert(`Supprimer ${id} ?`)
  }
}

export const Loading: Story = {
  args: {
    documents: mockDocuments,
    userRole: 'manager',
    onUpload: () => {},
    isLoading: true
  }
}

// Stories pour DocumentsGrid
export const GridView: StoryObj<typeof DocumentsGrid> = {
  render: () => (
    <DocumentsGrid
      documents={mockDocuments}
      userRole="manager"
      onView={(id) => console.log('View:', id)}
      onDownload={(id) => console.log('Download:', id)}
      onDelete={(id) => alert(`Supprimer ${id} ?`)}
    />
  )
}

export const GridViewTenant: StoryObj<typeof DocumentsGrid> = {
  render: () => (
    <DocumentsGrid
      documents={mockDocuments}
      userRole="tenant"
      onView={(id) => console.log('View:', id)}
      onDownload={(id) => console.log('Download:', id)}
    />
  )
}
