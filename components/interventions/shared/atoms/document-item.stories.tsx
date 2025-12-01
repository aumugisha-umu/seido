import type { Meta, StoryObj } from '@storybook/react'
import { DocumentItem } from './document-item'
import type { InterventionDocument } from '../types'

const meta = {
  title: 'Interventions/Atoms/DocumentItem',
  component: DocumentItem,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Élément de liste pour un document avec actions de téléchargement et suppression.'
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
} satisfies Meta<typeof DocumentItem>

export default meta
type Story = StoryObj<typeof meta>

const pdfDocument: InterventionDocument = {
  id: '1',
  filename: 'devis_plomberie.pdf',
  original_filename: 'Devis Plomberie - Janvier 2025.pdf',
  mime_type: 'application/pdf',
  file_size: 245000,
  uploaded_at: '2025-01-15T10:00:00Z',
  uploaded_by: 'provider-1',
  uploaded_by_name: 'Pierre Martin'
}

const imageDocument: InterventionDocument = {
  id: '2',
  filename: 'photo_fuite.jpg',
  original_filename: 'Photo fuite salle de bain.jpg',
  mime_type: 'image/jpeg',
  file_size: 1250000,
  uploaded_at: '2025-01-14T15:30:00Z',
  uploaded_by: 'tenant-1',
  uploaded_by_name: 'Marie Durand'
}

const wordDocument: InterventionDocument = {
  id: '3',
  filename: 'rapport_intervention.docx',
  original_filename: 'Rapport intervention finale.docx',
  mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  file_size: 89000,
  uploaded_at: '2025-01-16T09:00:00Z',
  uploaded_by: 'manager-1',
  uploaded_by_name: 'Jean Dupont'
}

export const PDFDocument: Story = {
  args: {
    document: pdfDocument,
    userRole: 'manager',
    onView: (doc) => console.log('View:', doc.filename),
    onDownload: (doc) => console.log('Download:', doc.filename)
  }
}

export const ImageDocument: Story = {
  args: {
    document: imageDocument,
    userRole: 'manager',
    onView: (doc) => console.log('View:', doc.filename),
    onDownload: (doc) => console.log('Download:', doc.filename)
  }
}

export const WordDocument: Story = {
  args: {
    document: wordDocument,
    userRole: 'manager',
    onView: (doc) => console.log('View:', doc.filename),
    onDownload: (doc) => console.log('Download:', doc.filename)
  }
}

export const ManagerWithDelete: Story = {
  args: {
    document: pdfDocument,
    userRole: 'manager',
    onView: (doc) => console.log('View:', doc.filename),
    onDownload: (doc) => console.log('Download:', doc.filename),
    onDelete: (doc) => alert(`Supprimer ${doc.filename} ?`)
  }
}

export const TenantView: Story = {
  args: {
    document: pdfDocument,
    userRole: 'tenant',
    onView: (doc) => console.log('View:', doc.filename),
    onDownload: (doc) => console.log('Download:', doc.filename)
  }
}

export const DocumentList: Story = {
  render: () => (
    <div className="space-y-2 max-w-md">
      <DocumentItem
        document={pdfDocument}
        userRole="manager"
        onView={() => {}}
        onDownload={() => {}}
        onDelete={() => alert('Supprimer ?')}
      />
      <DocumentItem
        document={imageDocument}
        userRole="manager"
        onView={() => {}}
        onDownload={() => {}}
        onDelete={() => alert('Supprimer ?')}
      />
      <DocumentItem
        document={wordDocument}
        userRole="manager"
        onView={() => {}}
        onDownload={() => {}}
        onDelete={() => alert('Supprimer ?')}
      />
    </div>
  )
}
