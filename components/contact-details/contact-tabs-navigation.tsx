'use client'

import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import type { LucideIcon } from 'lucide-react'

interface TabConfig {
  id: string
  label: string
  icon: LucideIcon
  count: number | null
}

interface ContactTabsNavigationProps {
  tabs: TabConfig[]
}

/**
 * Tabs navigation for contact details page
 */
export function ContactTabsNavigation({ tabs }: ContactTabsNavigationProps) {
  return (
    <TabsList className="grid w-full grid-cols-4 bg-muted">
      {tabs.map((tab) => {
        const Icon = tab.icon
        return (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className="flex items-center space-x-2 text-muted-foreground data-[state=active]:text-primary data-[state=active]:bg-card"
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            {tab.count !== null && (
              <Badge
                variant="secondary"
                className="ml-1 text-xs bg-muted text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
              >
                {tab.count}
              </Badge>
            )}
          </TabsTrigger>
        )
      })}
    </TabsList>
  )
}
