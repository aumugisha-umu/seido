'use client'

/**
 * InterventionTabs - Système d'onglets pour la prévisualisation d'intervention
 *
 * @example
 * <InterventionTabs activeTab={tab} onTabChange={setTab} userRole="manager">
 *   <TabsContent value="general">...</TabsContent>
 *   <TabsContent value="conversations">...</TabsContent>
 *   <TabsContent value="planning">...</TabsContent>
 * </InterventionTabs>
 */

import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FileText, MessageSquare, Calendar } from 'lucide-react'
import { UserRole } from '../types'

export interface InterventionTabsProps {
  /** Onglet actif */
  activeTab: string
  /** Callback de changement d'onglet */
  onTabChange: (tab: string) => void
  /** Rôle de l'utilisateur courant */
  userRole: UserRole
  /** Contenu des onglets */
  children: React.ReactNode
  /** Classes CSS additionnelles */
  className?: string
}

/**
 * Configuration des onglets par rôle
 */
const getTabsConfig = (role: UserRole) => {
  const baseConfig = [
    {
      value: 'general',
      label: 'Général',
      icon: FileText
    }
  ]

  switch (role) {
    case 'manager':
      return [
        ...baseConfig,
        {
          value: 'conversations',
          label: 'Conversations',
          icon: MessageSquare
        },
        {
          value: 'planning',
          label: 'Planning',
          icon: Calendar
        }
      ]
    case 'provider':
      return [
        ...baseConfig,
        {
          value: 'conversations',
          label: 'Messagerie',
          icon: MessageSquare
        },
        {
          value: 'planning',
          label: 'Planification',
          icon: Calendar
        }
      ]
    case 'tenant':
      return [
        ...baseConfig,
        {
          value: 'conversations',
          label: 'Messagerie',
          icon: MessageSquare
        },
        {
          value: 'planning',
          label: 'Rendez-vous',
          icon: Calendar
        }
      ]
  }
}

/**
 * Composant d'onglets adapté au rôle
 */
export const InterventionTabs = ({
  activeTab,
  onTabChange,
  userRole,
  children,
  className
}: InterventionTabsProps) => {
  const tabsConfig = getTabsConfig(userRole)

  return (
    <Tabs
      value={activeTab}
      onValueChange={onTabChange}
      className={cn('flex flex-col h-full', className)}
    >
      {/* Navigation des onglets - avec padding pour espacement du bord */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 flex-shrink-0">
        <TabsList className="grid w-full grid-cols-3 mb-4">
        {tabsConfig.map((tab) => {
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

      {/* Contenu des onglets */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {children}
      </div>
    </Tabs>
  )
}

/**
 * Wrapper pour le contenu d'un onglet avec scroll
 */
export interface TabContentWrapperProps {
  value: string
  children: React.ReactNode
  className?: string
}

export const TabContentWrapper = ({
  value,
  children,
  className
}: TabContentWrapperProps) => {
  return (
    <TabsContent
      value={value}
      className={cn(
        'flex-1 overflow-y-auto h-full',
        'data-[state=active]:flex data-[state=active]:flex-col',
        className
      )}
    >
      <div className="space-y-4 pb-4">
        {children}
      </div>
    </TabsContent>
  )
}
