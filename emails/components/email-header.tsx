/**
 * 📧 Header Email - SEIDO
 *
 * En-tête avec logo et titre pour les emails
 */

import * as React from 'react'
import { Section, Text } from '@react-email/components'

interface EmailHeaderProps {
  /** Titre principal (optionnel) */
  title?: string
}

export const EmailHeader = ({ title }: EmailHeaderProps) => {
  return (
    <Section className="bg-primary rounded-t-lg px-8 py-6">
      {/* Logo SEIDO */}
      <div className="flex items-center mb-2">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-4">
          <Text className="text-primary font-bold text-xl m-0 leading-none">
            S
          </Text>
        </div>
        <Text className="text-white font-semibold text-2xl m-0 leading-none">
          SEIDO
        </Text>
      </div>

      {/* Titre optionnel */}
      {title && (
        <Text className="text-white/90 text-sm font-medium m-0 mt-2">
          {title}
        </Text>
      )}
    </Section>
  )
}
