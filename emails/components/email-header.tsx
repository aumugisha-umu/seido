/**
 * 📧 Header Email - SEIDO
 *
 * En-tête unifié avec logo centré et sujet dynamique
 * Design : Logo au centre, nom SEIDO en dessous, sujet de l'email en bas
 */

import * as React from 'react'
import { Section, Text, Img } from '@react-email/components'
import { getLogoBase64 } from '@/emails/utils/assets'

interface EmailHeaderProps {
  /** Sujet de l'email (affiché sous le logo) */
  subject: string
}

export const EmailHeader = ({ subject }: EmailHeaderProps) => {
  // Logo encodé en base64 pour garantir l'affichage dans tous les clients email
  const logoUrl = getLogoBase64()

  return (
    <Section
      className="bg-primary rounded-t-lg px-8 py-6"
      style={{ backgroundColor: '#5b8def', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
    >
      {/* Layout 2 lignes : Logo centré en haut, Titre centré en dessous */}
      <table width="100%" cellPadding="0" cellSpacing="0" border={0}>
        {/* Ligne 1 : Logo centré */}
        <tr>
          <td style={{ textAlign: 'center' }}>
            <Img
              src={logoUrl}
              alt="SEIDO"
              width="200"
              style={{
                display: 'block',
                maxHeight: '50px',
                height: 'auto',
                width: 'auto',
                maxWidth: '100%',
                margin: '0 auto',
                objectFit: 'contain'
              }}
            />
          </td>
        </tr>

        {/* Ligne 2 : Titre centré */}
        <tr>
          <td style={{ paddingTop: '20px' }}>
            <Text
              style={{
                color: '#ffffff',
                fontSize: '32px',
                fontWeight: '600',
                margin: 0,
                lineHeight: 1.3,
                textAlign: 'center'
              }}
            >
              {subject}
            </Text>
          </td>
        </tr>
      </table>
    </Section>
  )
}
