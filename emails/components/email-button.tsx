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
  // Configuration des styles selon la variante
  const variantStyles = {
    primary: {
      background: 'linear-gradient(135deg, #5b8def 0%, #4a7ad9 100%)',
      backgroundColor: '#5b8def', // Fallback
      boxShadow: '0 4px 14px rgba(91, 141, 239, 0.4)',
    },
    secondary: {
      background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
      backgroundColor: '#64748b',
      boxShadow: '0 4px 14px rgba(100, 116, 139, 0.3)',
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      backgroundColor: '#ef4444',
      boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
    },
  }

  const style = variantStyles[variant]

  return (
    <div style={{ textAlign: 'center', margin: '32px 0' }}>
      {/* Table approach pour contrôle total (standard email) */}
      <table cellPadding="0" cellSpacing="0" border={0} style={{ display: 'inline-block', margin: '0 auto' }}>
        <tr>
          <td
            style={{
              background: style.background,
              backgroundColor: style.backgroundColor,
              borderRadius: '8px',
              boxShadow: style.boxShadow,
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <Button
              href={href}
              style={{
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'block',
                padding: '14px 28px',
                lineHeight: '1',
                letterSpacing: '0.2px',
                margin: 0,
              }}
            >
              {children}
            </Button>
          </td>
        </tr>
      </table>
    </div>
  )
}
