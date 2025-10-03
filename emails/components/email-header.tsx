/**
 * 📧 Header Email - SEIDO
 *
 * En-tête unifié avec logo centré et sujet dynamique
 * Design : Logo au centre, nom SEIDO en dessous, sujet de l'email en bas
 */

import * as React from 'react'
import { Section, Text } from '@react-email/components'

interface EmailHeaderProps {
  /** Sujet de l'email (affiché sous le logo) */
  subject: string
}

export const EmailHeader = ({ subject }: EmailHeaderProps) => {
  return (
    <Section
      className="bg-primary rounded-t-lg px-8 py-8"
      style={{ backgroundColor: '#5b8def', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}
    >
      {/* Logo SEIDO - Centré */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px'
          }}
        >
          <Text
            style={{
              color: '#5b8def',
              fontWeight: 'bold',
              fontSize: '28px',
              margin: 0,
              lineHeight: 1
            }}
          >
            S
          </Text>
        </div>

        {/* Nom SEIDO */}
        <Text
          style={{
            color: '#ffffff',
            fontWeight: '600',
            fontSize: '24px',
            margin: 0,
            lineHeight: 1,
            marginTop: '8px'
          }}
        >
          SEIDO
        </Text>
      </div>

      {/* Sujet de l'email - Centré */}
      <Text
        style={{
          color: '#1f2937',  // Gris foncé pour meilleure lisibilité
          fontSize: '15px',
          fontWeight: '500',
          margin: 0,
          marginTop: '16px',
          textAlign: 'center',
          lineHeight: 1.4
        }}
      >
        {subject}
      </Text>
    </Section>
  )
}
