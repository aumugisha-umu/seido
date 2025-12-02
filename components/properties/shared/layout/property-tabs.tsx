'use client'

import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LucideIcon } from 'lucide-react'

export interface TabConfig {
    value: string
    label: string
    icon: LucideIcon
}

export interface PropertyTabsProps {
    activeTab: string
    onTabChange: (tab: string) => void
    tabs: TabConfig[]
    children: React.ReactNode
    className?: string
}

export const PropertyTabs = ({
    activeTab,
    onTabChange,
    tabs,
    children,
    className
}: PropertyTabsProps) => {
    return (
        <Tabs
            value={activeTab}
            onValueChange={onTabChange}
            className={cn('flex flex-col h-full', className)}
        >
            <div className="px-4 sm:px-6 pt-4 sm:pt-6 flex-shrink-0">
                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        return (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="flex items-center gap-2"
                            >
                                <Icon className="h-4 w-4" aria-hidden="true" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </TabsTrigger>
                        )
                    })}
                </TabsList>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                {children}
            </div>
        </Tabs>
    )
}
