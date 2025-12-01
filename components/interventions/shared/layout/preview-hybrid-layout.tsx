'use client'

/**
 * PreviewHybridLayout - Layout principal pour la prévisualisation d'intervention
 * Structure: Sidebar (gauche) + Contenu principal (droite)
 *
 * @example
 * <PreviewHybridLayout
 *   sidebar={<InterventionSidebar ... />}
 *   content={<InterventionTabs ... />}
 * />
 */

import { cn } from '@/lib/utils'

export interface PreviewHybridLayoutProps {
  /** Contenu de la sidebar */
  sidebar: React.ReactNode
  /** Contenu principal */
  content: React.ReactNode
  /** Hauteur du layout (optionnel - utiliser className="flex-1" pour remplir le conteneur) */
  height?: string | number
  /** Afficher la sidebar sur mobile */
  showSidebarOnMobile?: boolean
  /** Classes CSS additionnelles */
  className?: string
}

/**
 * Layout principal avec sidebar et contenu
 */
export const PreviewHybridLayout = ({
  sidebar,
  content,
  height,
  showSidebarOnMobile = false,
  className
}: PreviewHybridLayoutProps) => {
  // Only apply height style if explicitly provided (not when using flex-1)
  const heightStyle = height
    ? (typeof height === 'number' ? `${height}px` : height)
    : undefined

  return (
    <div
      className={cn(
        'flex rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm',
        className
      )}
      style={heightStyle ? { height: heightStyle } : undefined}
    >
      {/* Sidebar */}
      <div
        className={cn(
          'w-80 flex-shrink-0 border-r border-slate-200 h-full overflow-hidden',
          !showSidebarOnMobile && 'hidden lg:block'
        )}
      >
        {sidebar}
      </div>

      {/* Contenu principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {content}
      </main>
    </div>
  )
}

/**
 * Wrapper pour le contenu principal avec padding
 */
export interface ContentWrapperProps {
  children: React.ReactNode
  className?: string
  /** Padding du contenu */
  padding?: 'sm' | 'md' | 'lg'
}

export const ContentWrapper = ({
  children,
  className,
  padding = 'md'
}: ContentWrapperProps) => {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  }

  return (
    <div className={cn('flex-1 flex flex-col min-h-0', paddingClasses[padding], className)}>
      {children}
    </div>
  )
}

/**
 * En-tête du contenu principal (optionnel)
 */
export interface ContentHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export const ContentHeader = ({
  title,
  subtitle,
  actions,
  className
}: ContentHeaderProps) => {
  return (
    <div
      className={cn(
        'flex items-center justify-between pb-4 mb-4 border-b border-slate-200',
        className
      )}
    >
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}

/**
 * Layout responsive pour mobile (sidebar en bas en accordion)
 */
export interface MobileLayoutProps {
  sidebar: React.ReactNode
  content: React.ReactNode
  sidebarTitle?: string
  className?: string
}

export const MobileLayout = ({
  sidebar,
  content,
  sidebarTitle = 'Participants',
  className
}: MobileLayoutProps) => {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Contenu principal */}
      <div className="flex-1 overflow-y-auto p-4">
        {content}
      </div>

      {/* Sidebar en accordion sur mobile */}
      <details className="border-t border-slate-200 bg-slate-50">
        <summary className="p-4 cursor-pointer font-medium text-sm">
          {sidebarTitle}
        </summary>
        <div className="p-4 pt-0">
          {sidebar}
        </div>
      </details>
    </div>
  )
}
