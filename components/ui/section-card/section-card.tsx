"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// ============================================================================
// SECTION CARD - Composant BEM Modulaire
// ============================================================================
// Block:    section-card
// Elements: section-card__header, section-card__title, section-card__actions, section-card__content
// Modifiers: compact (padding réduit), embedded (sans bordure)
// ============================================================================

export interface SectionCardProps {
  /** Titre affiché dans le header */
  title?: string
  /** Icône affichée à côté du titre */
  icon?: React.ComponentType<{ className?: string }>
  /** Boutons/actions affichés à droite du header */
  actions?: React.ReactNode
  /** Contenu principal (tabs, listes, etc.) */
  children: React.ReactNode
  /** Mode compact avec padding réduit (pour dashboard) */
  compact?: boolean
  /** Mode embedded sans bordure ni shadow (pour intégration dans parent) */
  embedded?: boolean
  /** Afficher ou non le header */
  showHeader?: boolean
  /** Classes additionnelles pour le block */
  className?: string
  /** Classes additionnelles pour le header */
  headerClassName?: string
  /** Classes additionnelles pour le content */
  contentClassName?: string
}

/**
 * SectionCard - Composant de carte de section réutilisable
 *
 * Encapsule un contenu dans une carte blanche avec :
 * - Header optionnel (titre + icône + actions)
 * - Contenu scrollable via min-h-0 overflow-hidden
 *
 * @example
 * // Avec header
 * <SectionCard title="Interventions" icon={Wrench} actions={<Button>Ajouter</Button>}>
 *   <ContentNavigator ... />
 * </SectionCard>
 *
 * @example
 * // Sans header (header de page séparé)
 * <SectionCard showHeader={false}>
 *   <ContentNavigator ... />
 * </SectionCard>
 *
 * @example
 * // Mode compact pour dashboard
 * <SectionCard title="Interventions" compact>
 *   <ContentNavigator ... />
 * </SectionCard>
 */
export function SectionCard({
  title,
  icon: Icon,
  actions,
  children,
  compact = false,
  embedded = false,
  showHeader = true,
  className,
  headerClassName,
  contentClassName,
}: SectionCardProps) {

  // ========================================
  // BEM: Block - section-card
  // ========================================
  const blockClass = cn(
    // Block name
    "section-card",
    // Base layout (critical for scroll)
    "flex-1 min-h-0 flex flex-col overflow-hidden",
    // Modifier: default (avec bordure)
    !embedded && "bg-white rounded-lg border border-slate-200 shadow-sm",
    // Modifier: embedded (sans bordure)
    embedded && "bg-transparent",
    // Custom classes
    className
  )

  // ========================================
  // BEM: Element - section-card__header
  // ========================================
  const headerClass = cn(
    "section-card__header",
    "flex items-center justify-between gap-2 flex-shrink-0",
    // Padding adapté au mode
    compact ? "px-2 py-1.5 sm:px-3 sm:py-2" : "px-4 py-3",
    headerClassName
  )

  // ========================================
  // BEM: Element - section-card__title
  // ========================================
  const titleClass = cn(
    "section-card__title",
    "flex items-center gap-2"
  )

  // ========================================
  // BEM: Element - section-card__title-icon
  // ========================================
  const iconClass = cn(
    "section-card__title-icon",
    compact ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-5 w-5",
    "text-slate-600"
  )

  // ========================================
  // BEM: Element - section-card__title-text
  // ========================================
  const titleTextClass = cn(
    "section-card__title-text",
    compact ? "text-xs sm:text-sm" : "text-base",
    "font-semibold text-slate-900 leading-tight"
  )

  // ========================================
  // BEM: Element - section-card__actions
  // ========================================
  const actionsClass = cn(
    "section-card__actions",
    "flex items-center gap-1 sm:gap-2 flex-shrink-0"
  )

  // ========================================
  // BEM: Element - section-card__content
  // ========================================
  const contentClass = cn(
    "section-card__content",
    // Layout critique pour le scroll interne
    "flex-1 flex flex-col min-h-0 overflow-hidden",
    // Padding adapté au mode
    compact ? "px-2 pb-1.5 sm:px-3 sm:pb-2" : "px-4 pb-4",
    contentClassName
  )

  // ========================================
  // Render
  // ========================================
  return (
    <div className={blockClass}>
      {/* Header (conditionnel) */}
      {showHeader && (title || actions) && (
        <div className={headerClass}>
          {/* Title avec icône */}
          {title && (
            <div className={titleClass}>
              {Icon && <Icon className={iconClass} />}
              <h2 className={titleTextClass}>{title}</h2>
            </div>
          )}

          {/* Actions (boutons) */}
          {actions && (
            <div className={actionsClass}>
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Content (scrollable via children) */}
      <div className={contentClass}>
        {children}
      </div>
    </div>
  )
}

export default SectionCard
