/**
 * 📧 Header Email - SEIDO
 *
 * En-tête unifié avec logo centré et sujet dynamique
 * Design : Logo au centre, nom SEIDO en dessous, sujet de l'email en bas
 */

import * as React from 'react'
import { Section, Text, Img } from '@react-email/components'
import { getLogoWebPBase64, getLogoBase64 } from '@/emails/utils/assets'

interface EmailHeaderProps {
  /** Sujet de l'email (affiché sous le logo) */
  subject: string
}

export const EmailHeader = ({ subject }: EmailHeaderProps) => {
  // Logo WebP encodé en base64 (10KB, optimisé pour emails)
  const logoUrl = getLogoWebPBase64()
  // Fallback PNG si WebP non supporté (21KB)
  const logoPngUrl = getLogoBase64()

  return (
    <Section
      className="bg-primary rounded-t-lg px-8 py-6"
      style={{ backgroundColor: '#5b8def', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
    >
      {/* Layout 2 lignes : Logo + Fallback centré en haut, Titre centré en dessous */}
      <table width="100%" cellPadding="0" cellSpacing="0" border={0}>
        {/* Ligne 1 : Logo WebP avec fallback texte visible */}
        <tr>
          <td style={{ textAlign: 'center' }}>
            {/* Logo WebP optimisé (10KB) */}
            <Img
              src={logoUrl}
              alt="SEIDO"
              width="200"
              height="50"
              border={0}
              style={{
                display: 'block',
                maxHeight: '50px',
                height: 'auto',
                width: 'auto',
                maxWidth: '200px',
                margin: '0 auto'
              }}
            />
            {/* Fallback texte visible si image bloquée/non chargée */}
            <Text
              style={{
                color: '#ffffff',
                fontSize: '28px',
                fontWeight: 'bold',
                margin: '8px 0 0 0',
                lineHeight: 1,
                textAlign: 'center',
                display: 'block'
              }}
            >
              SEIDO
            </Text>
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
