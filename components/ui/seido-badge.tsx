/**
 * SeidoBadge - Composant badge unifié pour SEIDO
 *
 * Remplace tous les badges existants (StatusBadge, RoleBadge, ContractStatusBadge, etc.)
 * avec une API cohérente et des styles conformes à Material Design.
 *
 * @example
 * // Status d'intervention
 * <SeidoBadge type="status" value="demande" />
 * <SeidoBadge type="status" value="planifiee" showIcon />
 *
 * // Urgence
 * <SeidoBadge type="urgency" value="haute" size="lg" showIcon />
 *
 * // Rôle utilisateur
 * <SeidoBadge type="role" value="manager" />
 *
 * // Custom
 * <SeidoBadge type="custom" color="purple" label="Beta" icon={Sparkles} />
 *
 * // Interactif (pour remplacer PendingActionsBadge)
 * <SeidoBadge type="status" value="demande" interactive onClick={() => {}} count={5} />
 */

import { forwardRef } from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  type BadgeType,
  type BadgeColor,
  type BadgeSize,
  type BadgeShape,
  BADGE_SIZES,
  BADGE_ICON_SIZES,
  getBadgeColorClasses,
  getBadgeShapeClasses,
  getBadgeConfig,
} from './seido-badge.config'

// ============================================================================
// Types
// ============================================================================

export interface SeidoBadgeProps {
  /**
   * Type sémantique du badge (détermine les couleurs disponibles)
   */
  type: BadgeType

  /**
   * Valeur spécifique au type (ex: 'demande', 'haute', 'manager')
   * Requis sauf pour type='custom'
   */
  value?: string

  /**
   * Couleur directe (pour type='custom' ou override)
   */
  color?: BadgeColor

  /**
   * Taille du badge (Material Design compliant)
   * @default 'md'
   */
  size?: BadgeSize

  /**
   * Afficher l'icône associée à la valeur
   * @default false
   */
  showIcon?: boolean

  /**
   * Icône personnalisée (override de l'icône par défaut)
   */
  icon?: LucideIcon

  /**
   * Label personnalisé (override du label par défaut)
   */
  label?: string

  /**
   * Forme du badge
   * @default 'rounded'
   */
  shape?: BadgeShape

  /**
   * Mode interactif (cliquable, comme PendingActionsBadge)
   * @default false
   */
  interactive?: boolean

  /**
   * Callback au clic (mode interactif)
   */
  onClick?: () => void

  /**
   * Désactivé (mode interactif)
   * @default false
   */
  disabled?: boolean

  /**
   * Compteur à afficher (mode interactif)
   */
  count?: number

  /**
   * Classes CSS additionnelles
   */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * Composant badge unifié pour SEIDO
 *
 * Features:
 * - API sémantique par type (status, urgency, role, etc.)
 * - Tailles Material Design compliant
 * - Icônes intégrées
 * - Mode interactif (cliquable avec compteur)
 * - Forme rounded ou pill
 * - Personnalisation via label/icon/color overrides
 */
export const SeidoBadge = forwardRef<HTMLDivElement, SeidoBadgeProps>(
  (
    {
      type,
      value,
      color: colorOverride,
      size = 'md',
      showIcon = false,
      icon: iconOverride,
      label: labelOverride,
      shape = 'rounded',
      interactive = false,
      onClick,
      disabled = false,
      count,
      className,
    },
    ref
  ) => {
    // Récupère la configuration pour ce type/value
    const config = value ? getBadgeConfig(type, value) : undefined

    // Résout les valeurs finales (avec overrides)
    const finalColor = colorOverride || config?.color || 'gray'
    const finalLabel = labelOverride || config?.label || value || ''
    const FinalIcon = iconOverride || config?.icon

    // Génère les classes
    const colorClasses = getBadgeColorClasses(finalColor)
    const sizeClasses = BADGE_SIZES[size]
    const shapeClasses = getBadgeShapeClasses(shape)
    const iconSizeClasses = BADGE_ICON_SIZES[size]

    // Contenu du badge
    const content = (
      <>
        {showIcon && FinalIcon && (
          <FinalIcon className={cn(iconSizeClasses, 'flex-shrink-0')} aria-hidden="true" />
        )}
        <span className="truncate">{finalLabel}</span>
        {count !== undefined && count > 0 && (
          <span
            className={cn(
              'ml-1 inline-flex items-center justify-center rounded-full',
              'bg-white/80 text-current font-semibold',
              size === 'sm' && 'h-4 min-w-[1rem] px-1 text-[10px]',
              size === 'md' && 'h-5 min-w-[1.25rem] px-1 text-xs',
              size === 'lg' && 'h-5 min-w-[1.25rem] px-1.5 text-xs'
            )}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </>
    )

    // Mode interactif : utilise un button
    if (interactive) {
      return (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            // Base styles
            'inline-flex items-center border font-medium',
            // Size & shape
            sizeClasses,
            shapeClasses,
            // Colors
            colorClasses,
            // Interactive states
            'transition-all duration-150',
            !disabled && 'hover:brightness-95 active:scale-[0.98] cursor-pointer',
            disabled && 'opacity-50 cursor-not-allowed',
            // Focus ring
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            `focus-visible:ring-badge-${finalColor}`,
            className
          )}
          aria-disabled={disabled}
        >
          {content}
        </button>
      )
    }

    // Mode statique : utilise Badge de shadcn
    return (
      <Badge
        ref={ref}
        variant="outline"
        className={cn(
          // Reset shadcn Badge defaults
          'border',
          // Size & shape
          sizeClasses,
          shapeClasses,
          // Colors from Tailwind tokens
          colorClasses,
          // Layout
          'inline-flex items-center font-medium',
          className
        )}
      >
        {content}
      </Badge>
    )
  }
)

SeidoBadge.displayName = 'SeidoBadge'

// ============================================================================
// Convenience Components
// ============================================================================

/**
 * Badge de statut d'intervention
 */
export const StatusBadge = forwardRef<
  HTMLDivElement,
  Omit<SeidoBadgeProps, 'type'> & { value: string }
>((props, ref) => <SeidoBadge ref={ref} type="status" {...props} />)
StatusBadge.displayName = 'StatusBadge'

/**
 * Badge d'urgence
 */
export const UrgencyBadge = forwardRef<
  HTMLDivElement,
  Omit<SeidoBadgeProps, 'type'> & { value: string }
>((props, ref) => <SeidoBadge ref={ref} type="urgency" showIcon {...props} />)
UrgencyBadge.displayName = 'UrgencyBadge'

/**
 * Badge de rôle utilisateur
 */
export const RoleBadge = forwardRef<
  HTMLDivElement,
  Omit<SeidoBadgeProps, 'type'> & { value: string }
>((props, ref) => <SeidoBadge ref={ref} type="role" {...props} />)
RoleBadge.displayName = 'RoleBadge'

/**
 * Badge de statut de contrat
 */
export const ContractBadge = forwardRef<
  HTMLDivElement,
  Omit<SeidoBadgeProps, 'type'> & { value: string }
>((props, ref) => <SeidoBadge ref={ref} type="contract" {...props} />)
ContractBadge.displayName = 'ContractBadge'

/**
 * Badge de mode d'assignation
 */
export const ModeBadge = forwardRef<
  HTMLDivElement,
  Omit<SeidoBadgeProps, 'type'> & { value: string }
>((props, ref) => <SeidoBadge ref={ref} type="mode" showIcon {...props} />)
ModeBadge.displayName = 'ModeBadge'

// ============================================================================
// Re-exports
// ============================================================================

export type {
  BadgeType,
  BadgeColor,
  BadgeSize,
  BadgeShape,
} from './seido-badge.config'

export {
  BADGE_CONFIG,
  getBadgeConfig,
  getBadgeValues,
} from './seido-badge.config'
