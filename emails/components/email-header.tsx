/**
 * 📧 Header Email - SEIDO
 *
 * En-tête unifié avec logo centré et sujet dynamique
 * Design : Logo au centre, nom SEIDO en dessous, sujet de l'email en bas
 */

import * as React from 'react'
import { Section, Text, Img } from '@react-email/components'

interface EmailHeaderProps {
  /** Sujet de l'email (affiché sous le logo) */
  subject: string
}

export const EmailHeader = ({ subject }: EmailHeaderProps) => {
  // URL de base de l'application (utilise variable d'environnement)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const logoUrl = `${baseUrl}/images/Logo/Logo_Seido_White.png`

  return (
    <Section
      className="bg-primary rounded-t-lg px-8 py-6"
      style={{ backgroundColor: '#5b8def', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
    >
      {/* Layout 2 lignes : Logo en haut à gauche, Titre centré en dessous */}
      <table width="100%" cellPadding="0" cellSpacing="0" border={0}>
        {/* Ligne 1 : Logo en haut à gauche */}
        <tr>
          <td>
            <Img
              src={logoUrl}
              alt="SEIDO"
              width="100"
              height="32"
              style={{
                display: 'block',
                maxWidth: '100%',
                height: 'auto'
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
