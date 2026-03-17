'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { ComposeEmailModal } from '@/app/gestionnaire/(with-navbar)/mail/components/compose-email-modal'
import type { EmailConnection } from '@/app/gestionnaire/(with-navbar)/mail/components/mailbox-sidebar'

interface ComposeEmailContextValue {
  openCompose: () => void
  closeCompose: () => void
  hasActiveConnections: boolean
}

const ComposeEmailContext = createContext<ComposeEmailContextValue | null>(null)

interface ComposeEmailProviderProps {
  children: React.ReactNode
  emailConnections: EmailConnection[]
}

export function ComposeEmailProvider({ children, emailConnections }: ComposeEmailProviderProps) {
  const [isOpen, setIsOpen] = useState(false)

  // emailConnections is pre-filtered (is_active=true) by the SSR layout query
  const hasActiveConnections = emailConnections.length > 0

  const openCompose = useCallback(() => {
    if (hasActiveConnections) setIsOpen(true)
  }, [hasActiveConnections])

  const closeCompose = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <ComposeEmailContext.Provider value={{ openCompose, closeCompose, hasActiveConnections }}>
      {children}
      {hasActiveConnections && (
        <ComposeEmailModal
          open={isOpen}
          onOpenChange={setIsOpen}
          emailConnections={emailConnections}
        />
      )}
    </ComposeEmailContext.Provider>
  )
}

export function useComposeEmail() {
  const context = useContext(ComposeEmailContext)
  if (!context) {
    throw new Error('useComposeEmail must be used within a ComposeEmailProvider')
  }
  return context
}
