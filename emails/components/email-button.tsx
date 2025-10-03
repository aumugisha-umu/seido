/**
 * 📧 Bouton CTA Email - SEIDO
 *
 * Bouton responsive et accessible pour les appels à l'action
 * Taille minimum 44px pour touch-friendly sur mobile
 */

import * as React from 'react'
import { Button } from '@react-email/components'

interface EmailButtonProps {
  /** URL de destination */
  href: string
  /** Texte du bouton */
  children: React.ReactNode
  /** Variante de couleur */
  variant?: 'primary' | 'secondary' | 'danger'
}

export const EmailButton = ({ href, children, variant = 'primary' }: EmailButtonProps) => {
  // Couleurs selon variante (pas de hover car non supporté dans les emails)
  const colors = {
    primary: 'bg-[#3b82f6]',
    secondary: 'bg-[#64748b]',
    danger: 'bg-[#ef4444]',
  }

  return (
    <div className="text-center my-8">
      <Button
        href={href}
        className={`
          ${colors[variant]}
          text-white
          px-8 py-4
          rounded-lg
          text-base font-semibold
          no-underline
          inline-block
          min-h-[44px]
        `}
        style={{
          // Fallback styles pour clients email qui ne supportent pas Tailwind
          backgroundColor: variant === 'primary' ? '#3b82f6' : variant === 'danger' ? '#ef4444' : '#64748b',
          color: '#ffffff',
          padding: '16px 32px',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          textDecoration: 'none',
          display: 'inline-block',
          minHeight: '44px',
        }}
      >
        {children}
      </Button>
    </div>
  )
}
