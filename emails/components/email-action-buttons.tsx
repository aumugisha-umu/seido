/**
 * 📧 Boutons d'Action Inline pour Emails Interactifs - SEIDO
 *
 * Composant pour afficher des boutons d'action côte à côte dans les emails.
 * Utilisé pour les créneaux horaires (Accepter/Refuser) et validations.
 *
 * @example
 * ```tsx
 * <EmailActionButtons
 *   actions={[
 *     { label: 'Accepter', href: acceptUrl, variant: 'success' },
 *     { label: 'Refuser', href: refuseUrl, variant: 'danger' }
 *   ]}
 * />
 * ```
 */

import * as React from 'react'
import { Button } from '@react-email/components'

export interface EmailActionButtonConfig {
  /** Texte du bouton */
  label: string
  /** URL de l'action (magic link) */
  href: string
  /** Style du bouton */
  variant: 'primary' | 'success' | 'danger' | 'secondary'
  /** Icône optionnelle (emoji) */
  icon?: string
}

interface EmailActionButtonsProps {
  /** Liste des actions à afficher */
  actions: EmailActionButtonConfig[]
  /** Orientation des boutons */
  layout?: 'horizontal' | 'vertical'
  /** Taille des boutons */
  size?: 'small' | 'medium'
}

// Styles par variante
const variantStyles: Record<EmailActionButtonConfig['variant'], {
  background: string
  backgroundColor: string
  borderColor: string
  textColor: string
}> = {
  primary: {
    background: 'linear-gradient(135deg, #5b8def 0%, #4a7ad9 100%)',
    backgroundColor: '#5b8def',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    textColor: '#ffffff',
  },
  success: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    backgroundColor: '#10b981',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    textColor: '#ffffff',
  },
  danger: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    backgroundColor: '#ef4444',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    textColor: '#ffffff',
  },
  secondary: {
    background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    textColor: '#475569',
  },
}

export const EmailActionButtons = ({
  actions,
  layout = 'horizontal',
  size = 'medium'
}: EmailActionButtonsProps) => {
  const padding = size === 'small' ? '10px 16px' : '12px 20px'
  const fontSize = size === 'small' ? '13px' : '14px'
  const gap = layout === 'horizontal' ? '12px' : '8px'

  return (
    <table
      cellPadding="0"
      cellSpacing="0"
      border={0}
      style={{
        width: '100%',
        margin: '12px 0',
      }}
    >
      <tbody>
        <tr>
          {layout === 'horizontal' ? (
            // Horizontal layout: buttons side by side
            actions.map((action, index) => {
              const style = variantStyles[action.variant]
              return (
                <React.Fragment key={index}>
                  {index > 0 && <td style={{ width: gap }} />}
                  <td style={{ width: `${100 / actions.length}%` }}>
                    <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
                      <tbody>
                        <tr>
                          <td
                            style={{
                              background: style.background,
                              backgroundColor: style.backgroundColor,
                              borderRadius: '6px',
                              border: `1px solid ${style.borderColor}`,
                              textAlign: 'center',
                            }}
                          >
                            <Button
                              href={action.href}
                              style={{
                                color: style.textColor,
                                fontSize: fontSize,
                                fontWeight: '600',
                                textDecoration: 'none',
                                display: 'block',
                                padding: padding,
                                lineHeight: '1.2',
                                margin: 0,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {action.icon && `${action.icon} `}{action.label}
                            </Button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </React.Fragment>
              )
            })
          ) : (
            // Vertical layout: buttons stacked
            <td>
              <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
                <tbody>
                  {actions.map((action, index) => {
                    const style = variantStyles[action.variant]
                    return (
                      <React.Fragment key={index}>
                        {index > 0 && <tr><td style={{ height: gap }} /></tr>}
                        <tr>
                          <td
                            style={{
                              background: style.background,
                              backgroundColor: style.backgroundColor,
                              borderRadius: '6px',
                              border: `1px solid ${style.borderColor}`,
                              textAlign: 'center',
                            }}
                          >
                            <Button
                              href={action.href}
                              style={{
                                color: style.textColor,
                                fontSize: fontSize,
                                fontWeight: '600',
                                textDecoration: 'none',
                                display: 'block',
                                padding: padding,
                                lineHeight: '1.2',
                                margin: 0,
                              }}
                            >
                              {action.icon && `${action.icon} `}{action.label}
                            </Button>
                          </td>
                        </tr>
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </td>
          )}
        </tr>
      </tbody>
    </table>
  )
}

/**
 * Composant pour une card de créneau horaire avec boutons d'action
 */
interface TimeSlotCardProps {
  /** Date du créneau formatée */
  dateFormatted: string
  /** Heure de début et fin formatée */
  timeRange: string
  /** Index du créneau (pour numérotation) */
  index: number
  /** URL pour accepter le créneau */
  acceptUrl?: string
  /** URL pour refuser le créneau */
  refuseUrl?: string
  /** Si les boutons doivent être affichés */
  showActions?: boolean
}

export const TimeSlotCard = ({
  dateFormatted,
  timeRange,
  index,
  acceptUrl,
  refuseUrl,
  showActions = true
}: TimeSlotCardProps) => {
  const hasActions = showActions && (acceptUrl || refuseUrl)

  return (
    <table
      cellPadding="0"
      cellSpacing="0"
      border={0}
      style={{
        width: '100%',
        marginBottom: '12px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
      }}
    >
      <tbody>
        <tr>
          <td style={{ padding: '16px' }}>
            {/* Header avec numéro et date */}
            <table cellPadding="0" cellSpacing="0" border={0} style={{ width: '100%' }}>
              <tbody>
                <tr>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      backgroundColor: '#5b8def',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      marginRight: '12px',
                    }}>
                      #{index + 1}
                    </span>
                    <span style={{
                      fontSize: '15px',
                      fontWeight: '600',
                      color: '#1e293b',
                    }}>
                      📅 {dateFormatted}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingTop: '8px' }}>
                    <span style={{
                      fontSize: '14px',
                      color: '#64748b',
                    }}>
                      🕐 {timeRange}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Boutons d'action si disponibles */}
            {hasActions && (
              <EmailActionButtons
                actions={[
                  ...(acceptUrl ? [{ label: 'Accepter', href: acceptUrl, variant: 'success' as const, icon: '✓' }] : []),
                  ...(refuseUrl ? [{ label: 'Refuser', href: refuseUrl, variant: 'danger' as const, icon: '✗' }] : []),
                ]}
                layout="horizontal"
                size="small"
              />
            )}
          </td>
        </tr>
      </tbody>
    </table>
  )
}
