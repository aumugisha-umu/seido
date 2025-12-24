/**
 * 📧 Composant Email - Liste des pièces jointes
 *
 * Affiche les pièces jointes d'une intervention avec liens de téléchargement
 * Compatible avec tous les clients email (utilise tables pour le layout)
 */

import * as React from 'react'
import { Section, Text, Link, Heading } from '@react-email/components'
import type { EmailAttachment } from '@/emails/utils/types'

interface EmailAttachmentsProps {
  /** Liste des pièces jointes */
  attachments: EmailAttachment[]
  /** Titre de la section (optionnel) */
  title?: string
}

/**
 * Formatte la taille du fichier en unité lisible
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

/**
 * Retourne l'icône appropriée selon le type MIME
 */
const getFileIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊'
  if (mimeType.startsWith('video/')) return '🎬'
  return '📎'
}

export const EmailAttachments = ({
  attachments,
  title = 'Pièces jointes'
}: EmailAttachmentsProps) => {
  if (!attachments || attachments.length === 0) {
    return null
  }

  return (
    <Section style={{ marginTop: '24px', marginBottom: '24px' }}>
      <div
        style={{
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #e2e8f0'
        }}
      >
        <Heading
          as="h3"
          style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            margin: '0 0 16px 0'
          }}
        >
          📎 {title} ({attachments.length})
        </Heading>

        <table
          cellPadding="0"
          cellSpacing="0"
          border={0}
          style={{ width: '100%' }}
        >
          <tbody>
            {attachments.map((attachment, index) => (
              <tr key={index}>
                <td
                  style={{
                    padding: '10px 0',
                    borderBottom: index < attachments.length - 1 ? '1px solid #e2e8f0' : 'none'
                  }}
                >
                  <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
                    <tbody>
                      <tr>
                        {/* Icône */}
                        <td style={{ width: '32px', verticalAlign: 'top' }}>
                          <Text style={{ fontSize: '20px', margin: 0, lineHeight: '1' }}>
                            {getFileIcon(attachment.mimeType)}
                          </Text>
                        </td>

                        {/* Infos fichier */}
                        <td style={{ verticalAlign: 'top', paddingLeft: '12px' }}>
                          <Link
                            href={attachment.downloadUrl}
                            style={{
                              color: '#2563eb',
                              textDecoration: 'none',
                              fontWeight: '500',
                              fontSize: '14px',
                              lineHeight: '1.4'
                            }}
                          >
                            {attachment.filename}
                          </Link>
                          <Text
                            style={{
                              fontSize: '12px',
                              color: '#6b7280',
                              margin: '4px 0 0 0',
                              lineHeight: '1.4'
                            }}
                          >
                            {formatFileSize(attachment.fileSize)}
                            {attachment.documentType && ` • ${attachment.documentType}`}
                          </Text>
                        </td>

                        {/* Bouton télécharger */}
                        <td style={{ width: '100px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <Link
                            href={attachment.downloadUrl}
                            style={{
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '500',
                              textDecoration: 'none',
                              display: 'inline-block'
                            }}
                          >
                            Télécharger
                          </Link>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}

export default EmailAttachments
