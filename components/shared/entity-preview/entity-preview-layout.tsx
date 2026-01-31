'use client'

/**
 * EntityPreviewLayout - Unified layout container for entity preview pages
 *
 * Provides consistent styling matching the intervention preview:
 * - Rounded white card with border and shadow
 * - Flex container for tabs + content
 * - Overflow handling for scrollable content
 *
 * @example
 * <EntityPreviewLayout>
 *   <EntityTabs activeTab={tab} onTabChange={setTab} tabs={buildingTabs}>
 *     <TabsContent value="overview">...</TabsContent>
 *   </EntityTabs>
 * </EntityPreviewLayout>
 */

import { cn } from '@/lib/utils'
import type { EntityPreviewLayoutProps } from './types'

/**
 * Main container for entity preview pages
 * Matches intervention preview styling
 */
export function EntityPreviewLayout({
  children,
  className
}: EntityPreviewLayoutProps) {
  return (
    <div className={cn('entity-preview', 'flex-1 flex flex-col min-h-0 overflow-hidden', className)}>
      <div className="entity-preview__container flex-1 flex flex-col min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {children}
      </div>
    </div>
  )
}

/**
 * Wrapper for tab panel content with consistent padding and scroll
 */
export function TabPanelWrapper({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      'entity-preview__tab-panel',
      'flex-1 p-4 sm:p-6 overflow-y-auto',
      className
    )}>
      {children}
    </div>
  )
}
