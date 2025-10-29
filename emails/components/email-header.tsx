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
  // Logo attaché via CID (Content-ID)
  // Le logo est envoyé comme pièce jointe avec l'email (voir email-service.ts)
  // Référence: cid:logo@seido correspond à l'attachment avec cid='logo@seido'
  const logoSrc = 'cid:logo@seido'

  return (
    <Section
      className="bg-primary rounded-t-lg px-8 py-6"
      style={{ backgroundColor: '#5b8def', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
    >
      {/* Layout 2 lignes : Logo + Fallback centré en haut, Titre centré en dessous */}
      <table width="100%" cellPadding="0" cellSpacing="0" border={0}>
        {/* Ligne 1 : Logo avec fallback texte */}
        <tr>
          <td style={{ textAlign: 'center' }}>
            {/*
              Logo attaché via CID (Content-ID attachment)
              - Approche recommandée par Resend pour les emails transactionnels
              - Compatible tous clients email (Gmail, Outlook, Apple Mail, etc.)
              - Le fichier logo.png est attaché à l'email avec cid='logo@seido'
              - Fonctionne en dev et prod sans configuration URL
            */}
            <Img
              src={logoSrc}
              alt="SEIDO"
              width="150"
              border={0}
              style={{
                display: 'block',
                height: 'auto',
                width: 'auto',
                maxWidth: '150px',
                margin: '0 auto'
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
