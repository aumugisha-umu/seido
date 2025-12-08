"use client"

import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * StatCard - Composant réutilisable pour afficher des KPIs
 *
 * Design basé sur les guidelines UX SEIDO:
 * - Icône à gauche pour reconnaissance rapide
 * - Bordure gauche colorée selon variant (accent visuel)
 * - Hover effect avec transition
 * - Typography: valeur 24px bold, label 14px muted
 *
 * @example
 * ```tsx
 * <StatCard
 *   label="Contrats actifs"
 *   value={12}
 *   icon={FileCheck}
 *   variant="success"
 * />
 * ```
 */

export interface StatCardProps {
  /** Label descriptif de la statistique */
  label: string
  /** Valeur à afficher (nombre ou chaîne formatée) */
  value: string | number
  /** Icône Lucide React */
  icon: LucideIcon
  /** Variante de couleur sémantique (nouveau) */
  variant?: 'success' | 'warning' | 'info' | 'neutral'
  /**
   * @deprecated Utiliser `variant` à la place
   * Mapping: blue→info, green→success, orange→warning, gray/purple/red→neutral
   */
  iconColor?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray'
  /** Indicateur de tendance optionnel */
  trend?: {
    value: number
    label: string
  }
  /** Action au clic (rend la card cliquable) */
  onClick?: () => void
  /** Classes CSS additionnelles */
  className?: string
}

/**
 * Mapping des variants vers les classes Tailwind
 * Couleurs sémantiques selon le design system SEIDO:
 * - success: emerald (vert) - états positifs, complétés
 * - warning: amber (orange) - attention, expiration proche
 * - info: blue - informations générales
 * - neutral: gray - valeurs neutres, moyennes
 */
const VARIANTS = {
  success: {
    border: 'border-l-emerald-500',
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-600',
    value: 'text-emerald-700'
  },
  warning: {
    border: 'border-l-amber-500',
    iconBg: 'bg-amber-50',
    iconText: 'text-amber-600',
    value: 'text-amber-700'
  },
  info: {
    border: 'border-l-blue-500',
    iconBg: 'bg-blue-50',
    iconText: 'text-blue-600',
    value: 'text-blue-700'
  },
  neutral: {
    border: 'border-l-gray-400',
    iconBg: 'bg-gray-100',
    iconText: 'text-gray-600',
    value: 'text-gray-700'
  }
} as const

// Mapping des anciennes couleurs vers les nouveaux variants
const ICON_COLOR_TO_VARIANT: Record<NonNullable<StatCardProps['iconColor']>, keyof typeof VARIANTS> = {
  blue: 'info',
  green: 'success',
  orange: 'warning',
  purple: 'neutral',
  red: 'warning',
  gray: 'neutral'
}

export function StatCard({
  label,
  value,
  icon: Icon,
  variant,
  iconColor,
  trend,
  onClick,
  className
}: StatCardProps) {
  // Résoudre le variant: priorité à `variant`, fallback sur `iconColor`, default 'neutral'
  const resolvedVariant = variant ?? (iconColor ? ICON_COLOR_TO_VARIANT[iconColor] : 'neutral')
  const styles = VARIANTS[resolvedVariant]

  return (
    <div
      className={cn(
        // Base styles
        "bg-card rounded-lg p-4 border border-border shadow-sm",
        // Left border accent
        "border-l-4",
        styles.border,
        // Hover & transitions
        "transition-all duration-200",
        "hover:shadow-md hover:scale-[1.02]",
        // Interactive state
        onClick && "cursor-pointer active:scale-[0.98]",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      } : undefined}
    >
      <div className="flex items-start gap-3">
        {/* Icon container */}
        <div
          className={cn(
            "p-2 rounded-lg flex-shrink-0",
            styles.iconBg,
            styles.iconText
          )}
        >
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Value - prominent display */}
          <div className={cn("text-2xl font-bold leading-tight", styles.value)}>
            {value}
          </div>

          {/* Label - muted secondary text */}
          <div className="text-sm text-muted-foreground mt-0.5">
            {label}
          </div>

          {/* Trend indicator (optional) */}
          {trend && (
            <div
              className={cn(
                "text-xs mt-1.5 flex items-center gap-1",
                trend.value >= 0 ? "text-emerald-600" : "text-red-600"
              )}
            >
              <span aria-hidden="true">{trend.value >= 0 ? '↑' : '↓'}</span>
              <span>
                {Math.abs(trend.value)}% {trend.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
