/**
 * 📧 Template Email - Nouveau Document Uploadé
 *
 * Envoyé à l'utilisateur assigné au document
 * Objectif: Notifier qu'un document a été ajouté
 */

import * as React from 'react'
import { Section, Text } from '@react-email/components'
import { EmailLayout } from '@/emails/components/email-layout'
import { EmailHeader } from '@/emails/components/email-header'
import { EmailFooter } from '@/emails/components/email-footer'
import { EmailButton } from '@/emails/components/email-button'
import type { DocumentUploadedEmailProps } from '@/emails/utils/types'

export const DocumentUploadedEmail = ({
  firstName,
  documentName,
  uploadedByName,
  entityUrl,
}: DocumentUploadedEmailProps) => {
  return (
    <EmailLayout preview={`Nouveau document - ${documentName}`}>
      <EmailHeader subject="Nouveau document disponible" />

      <Section className="bg-white px-8 py-8">
        <Text className="text-gray-700 text-base leading-relaxed mb-5 mt-0">
          Bonjour {firstName},
        </Text>

        <Text className="text-gray-700 text-base leading-relaxed mb-6">
          Un nouveau document a été ajouté par <strong>{uploadedByName}</strong>.
        </Text>

        {/* Encadré document */}
        <div className="bg-blue-50 border-l-4 border-primary p-6 rounded-lg mb-6">
          <Text className="text-blue-900 font-bold text-lg m-0">📄 {documentName}</Text>
          <Text className="text-blue-700 text-sm mt-2 mb-0">
            Ajouté par {uploadedByName}
          </Text>
        </div>

        <EmailButton href={entityUrl}>Voir le document</EmailButton>

        <Text className="text-gray-500 text-xs leading-relaxed text-center mt-6 mb-0">
          Vous recevez cet email car un document vous a été assigné.
        </Text>
      </Section>

      <EmailFooter />
    </EmailLayout>
  )
}

DocumentUploadedEmail.PreviewProps = {
  firstName: 'Marie',
  documentName: 'État des lieux - Entrée',
  uploadedByName: 'Jean Martin',
  entityUrl: 'https://seido-app.com/gestionnaire/documents/abc-123',
} as DocumentUploadedEmailProps

export default DocumentUploadedEmail
