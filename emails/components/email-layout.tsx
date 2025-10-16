/**
 * 📧 Layout Email de base - SEIDO
 *
 * Structure HTML responsive pour tous les emails SEIDO
 * Compatible avec Gmail, Outlook, Apple Mail, etc.
 */

import * as React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Tailwind,
  Preview,
} from '@react-email/components'

interface EmailLayoutProps {
  children: React.ReactNode
  /** Preview text (affiché dans la liste des emails) */
  preview?: string
}

export const EmailLayout = ({ children, preview }: EmailLayoutProps) => {
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      {preview && <Preview>{preview}</Preview>}
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                // Couleurs SEIDO (à adapter selon votre charte graphique)
                primary: '#3b82f6', // blue-600
                'primary-dark': '#2563eb', // blue-700
                secondary: '#64748b', // slate-500
                accent: '#10b981', // emerald-500
                danger: '#ef4444', // red-500
                warning: '#f59e0b', // amber-500
              },
            },
          },
        }}
      >
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto py-10 px-4 max-w-[600px]">
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
