'use client'

/**
 * EntityTabs - Material Design 3 responsive tabs for entity preview pages
 *
 * Responsive behavior:
 * - Mobile (<768px): Dropdown selector
 * - Desktop (≥768px): Horizontal tabs with underline indicator
 *
 * Based on intervention-tabs.tsx, generalized for all entity types.
 *
 * @example
 * <EntityTabs activeTab={tab} onTabChange={setTab} tabs={buildingTabs}>
 *   <TabsContent value="overview">...</TabsContent>
 *   <TabsContent value="activity">...</TabsContent>
 * </EntityTabs>
 */

import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { EntityTabsProps, TabContentWrapperProps } from './types'

/**
 * Responsive tabs component (MD3 style)
 */
export function EntityTabs({
  activeTab,
  onTabChange,
  tabs,
  children,
  className
}: EntityTabsProps) {
  const activeTabLabel = tabs.find(t => t.value === activeTab)?.label || tabs[0]?.label || ''

  return (
    <Tabs
      value={activeTab}
      onValueChange={onTabChange}
      className={cn('flex flex-col h-full', className)}
    >
      {/* Navigation */}
      <div className="entity-preview__tabs flex-shrink-0 border-b border-slate-200">
        {/* Mobile: Dropdown selector (<768px) */}
        <div className="md:hidden px-4 py-3">
          <Select value={activeTab} onValueChange={onTabChange}>
            <SelectTrigger
              className="w-full h-11"
              aria-label="Sélectionner une section"
            >
              <SelectValue placeholder={activeTabLabel} />
            </SelectTrigger>
            <SelectContent>
              {tabs.map((tab) => (
                <SelectItem
                  key={tab.value}
                  value={tab.value}
                  className="h-11 text-sm"
                >
                  <span className="flex items-center gap-2">
                    {tab.label}
                    {/* Red dot indicator for unread items */}
                    {tab.hasUnread && (
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" aria-label="Messages non lus" />
                    )}
                    {tab.count !== undefined && tab.count > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {tab.count}
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Horizontal tabs (≥768px) */}
        <div className="hidden md:block">
          <TabsList
            className={cn(
              "flex h-12 w-full items-center justify-center gap-1",
              "bg-transparent p-0 px-6"
            )}
            role="tablist"
            aria-label="Sections"
          >
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  // Base styles - Material Design touch target (48px min)
                  "relative h-12 min-w-[80px] px-4",
                  "text-sm font-medium whitespace-nowrap",
                  // Colors and states
                  "text-muted-foreground",
                  "data-[state=active]:text-primary",
                  // Focus ring for accessibility (WCAG 2.1)
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  // Hover state
                  "hover:text-foreground hover:bg-muted/50",
                  // Active indicator (Material Design underline)
                  "rounded-none border-b-2 border-transparent",
                  "data-[state=active]:border-primary",
                  // Transition
                  "transition-all duration-200"
                )}
                role="tab"
                aria-selected={activeTab === tab.value}
              >
                <span className="flex items-center gap-2">
                  {tab.label}
                  {/* Red dot indicator for unread items */}
                  {tab.hasUnread && (
                    <span
                      className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse"
                      aria-label="Messages non lus"
                    />
                  )}
                  {tab.count !== undefined && tab.count > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-xs ml-1 bg-muted text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                    >
                      {tab.count}
                    </Badge>
                  )}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>

      {/* Tab content */}
      <div className="entity-preview__content flex-1 overflow-hidden flex flex-col">
        {children}
      </div>
    </Tabs>
  )
}

/**
 * Wrapper for tab content with scroll support
 */
export function TabContentWrapper({
  value,
  children,
  className
}: TabContentWrapperProps) {
  return (
    <TabsContent
      value={value}
      className={cn(
        'flex-1 overflow-y-auto h-full mt-0',
        'data-[state=active]:flex data-[state=active]:flex-col',
        className
      )}
    >
      <div className="entity-preview__tab-panel p-4 sm:p-6 space-y-4">
        {children}
      </div>
    </TabsContent>
  )
}
