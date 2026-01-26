"use client"

import { useState, useMemo, useEffect } from "react"
import { ListTodo, AlertTriangle, Settings, Archive, Clock, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import ContentNavigator from "@/components/content-navigator"
import { InterventionsViewContainer } from "@/components/interventions/interventions-view-container"
import { ViewModeSwitcherV1 } from "@/components/interventions/view-mode-switcher-v1"
import { useViewMode } from "@/hooks/use-view-mode"
import { filterPendingActions } from "@/lib/intervention-alert-utils"
import type { InterventionWithRelations } from "@/lib/services"

// ============================================================================
// INTERVENTIONS NAVIGATOR - Composant BEM Unifié
// ============================================================================
// Block:    interventions-section
// Elements: interventions-section__header, __title, __actions, __content
// Modifiers: interventions-section--compact, interventions-section--embedded
// ============================================================================

interface EmptyStateConfig {
  title: string
  description: string
  showCreateButton?: boolean
  createButtonText?: string
  createButtonAction?: () => void
}

interface HeaderConfig {
  title: string
  icon?: LucideIcon
  actions?: React.ReactNode
}

interface InterventionsNavigatorProps {
  interventions: InterventionWithRelations[]
  loading?: boolean
  userContext?: 'gestionnaire' | 'prestataire' | 'locataire'
  className?: string

  // Header configuration (dashboard mode)
  showHeader?: boolean
  headerConfig?: HeaderConfig

  // Tabs preset: 'full' for page, 'dashboard' for dashboard widget, 'prestataire' for provider dashboard
  tabsPreset?: 'full' | 'dashboard' | 'prestataire'

  // Compact mode (smaller padding, for dashboard)
  compact?: boolean

  // Empty state
  emptyStateConfig?: EmptyStateConfig

  // Callbacks
  onActiveTabChange?: (tabId: string) => void
  initialActiveTab?: string

  // Action hooks (for status actions)
  actionHooks?: {
    approvalHook?: any
    quotingHook?: any
    planningHook?: any
    executionHook?: any
    finalizationHook?: any
  }
}

/**
 * InterventionsNavigator - Composant unifié pour afficher les interventions
 *
 * Utilisable sur :
 * - Dashboard : avec showHeader=true, tabsPreset="dashboard", compact=true
 * - Page Interventions : avec showHeader=false, tabsPreset="full"
 *
 * @example Dashboard
 * ```tsx
 * <InterventionsNavigator
 *   interventions={interventions}
 *   showHeader={true}
 *   headerConfig={{ title: "Interventions", icon: Wrench, actions: <Button>...</Button> }}
 *   tabsPreset="dashboard"
 *   compact={true}
 * />
 * ```
 *
 * @example Page Interventions
 * ```tsx
 * <InterventionsNavigator
 *   interventions={interventions}
 *   tabsPreset="full"
 *   className="bg-transparent border-0 shadow-none"
 * />
 * ```
 */
export function InterventionsNavigator({
  interventions = [],
  loading = false,
  userContext = 'gestionnaire',
  className = "",
  showHeader = false,
  headerConfig,
  tabsPreset = 'full',
  compact = false,
  emptyStateConfig,
  onActiveTabChange,
  initialActiveTab,
  actionHooks
}: InterventionsNavigatorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<string | undefined>(initialActiveTab)

  // View mode state (cards, list, calendar)
  const { viewMode, setViewMode, mounted } = useViewMode({
    defaultMode: 'cards',
    syncWithUrl: false
  })

  // Sync with initialActiveTab changes
  useEffect(() => {
    if (initialActiveTab !== undefined) {
      setActiveTab(initialActiveTab)
    }
  }, [initialActiveTab])

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    onActiveTabChange?.(tabId)
  }

  // Expose handleTabChange for external calls (e.g., from badge in header)
  useEffect(() => {
    if (typeof window !== 'undefined' && tabsPreset === 'dashboard') {
      (window as any).__handleInterventionsTabChange = handleTabChange
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__handleInterventionsTabChange
      }
    }
  }, [handleTabChange, tabsPreset])

  // Transform interventions
  const transformedInterventions = useMemo(() => {
    return interventions.map((intervention) => ({
      ...intervention,
      reference: intervention.reference || `INT-${intervention.id.slice(0, 8)}`,
      urgency: intervention.urgency || (intervention as any).priority || 'normale',
      type: intervention.type || (intervention as any).intervention_type || 'autre'
    }))
  }, [interventions])

  // Filter by search term
  const filteredInterventions = useMemo(() => {
    if (!searchTerm.trim()) return transformedInterventions

    const term = searchTerm.toLowerCase()
    return transformedInterventions.filter(i =>
      i.title?.toLowerCase().includes(term) ||
      i.description?.toLowerCase().includes(term) ||
      i.reference?.toLowerCase().includes(term) ||
      i.lot?.reference?.toLowerCase().includes(term) ||
      i.lot?.building?.name?.toLowerCase().includes(term)
    )
  }, [transformedInterventions, searchTerm])

  // Filter functions
  const filterFunctions = {
    // Full preset filters
    toutes: () => filteredInterventions,
    demandes_group: () => filteredInterventions.filter(i => ["demande", "approuvee"].includes(i.status)),
    en_cours_group: () => filteredInterventions.filter(i => [
      "demande_de_devis", "planification", "planifiee", "cloturee_par_prestataire"
    ].includes(i.status)),
    cloturees_group: () => filteredInterventions.filter(i => [
      "cloturee_par_locataire", "cloturee_par_gestionnaire", "annulee", "rejetee"
    ].includes(i.status)),

    // Dashboard preset filters
    actions_en_attente: () => filterPendingActions(filteredInterventions, userContext),
    en_cours: () => filteredInterventions.filter(i => [
      "demande", "approuvee", "demande_de_devis", "planification", "planifiee"
    ].includes(i.status)),
    terminees: () => filteredInterventions.filter(i => [
      "cloturee_par_prestataire", "cloturee_par_locataire", "cloturee_par_gestionnaire", "annulee"
    ].includes(i.status)),

    // Prestataire preset filters (specific order: en_cours, terminees, toutes)
    prestataire_en_cours: () => filteredInterventions.filter(i => [
      "demande_de_devis", "planification", "planifiee", "approuvee"
    ].includes(i.status)),
    prestataire_terminees: () => filteredInterventions.filter(i => [
      "cloturee_par_prestataire", "cloturee_par_locataire", "cloturee_par_gestionnaire"
    ].includes(i.status)),
    prestataire_toutes: () => filteredInterventions
  }

  // Get filtered data for a tab
  const getFilteredByTab = (tabId: string) => {
    const filterFn = filterFunctions[tabId as keyof typeof filterFunctions]
    return filterFn ? filterFn() : filteredInterventions
  }

  // Get empty state config for a tab
  const getEmptyStateForTab = (tabId: string) => {
    if (emptyStateConfig) return emptyStateConfig

    const configs: Record<string, EmptyStateConfig> = {
      toutes: { title: "Aucune intervention", description: "Les interventions apparaîtront ici" },
      demandes_group: { title: "Aucune demande", description: "Les demandes en attente apparaîtront ici" },
      en_cours_group: { title: "Aucune intervention en cours", description: "Les interventions actives apparaîtront ici" },
      cloturees_group: { title: "Aucune intervention clôturée", description: "Les interventions terminées apparaîtront ici" },
      actions_en_attente: { title: "Aucune action en attente", description: "Toutes vos interventions sont à jour" },
      en_cours: { title: "Aucune intervention en cours", description: "Les interventions actives apparaîtront ici" },
      terminees: { title: "Aucune intervention terminée", description: "Les interventions terminées apparaîtront ici" },
      // Prestataire presets
      prestataire_en_cours: { title: "Aucune intervention en cours", description: "Les interventions actives apparaîtront ici" },
      prestataire_terminees: { title: "Aucune intervention terminée", description: "Les interventions terminées apparaîtront ici" },
      prestataire_toutes: { title: "Aucune intervention", description: "Les interventions apparaîtront ici" }
    }
    return configs[tabId] || { title: "Aucune donnée", description: "" }
  }

  // Render content for each tab
  const renderTabContent = (tabId: string) => {
    const tabData = getFilteredByTab(tabId)

    if (!mounted) {
      return (
        <div className="animate-pulse space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg" />
          ))}
        </div>
      )
    }

    return (
      <InterventionsViewContainer
        interventions={tabData}
        userContext={userContext}
        loading={loading}
        emptyStateConfig={getEmptyStateForTab(tabId)}
        showStatusActions={true}
        viewMode={viewMode}
        setViewMode={setViewMode}
        hideViewSwitcher={true}
      />
    )
  }

  // Pending actions count (for dashboard conditional tab)
  const pendingActionsCount = filterFunctions.actions_en_attente().length

  // Build tabs based on preset
  const tabs = useMemo(() => {
    if (tabsPreset === 'dashboard') {
      // Dashboard tabs: conditionally show "Actions en attente" first
      return [
        ...(pendingActionsCount > 0 ? [{
          id: "actions_en_attente",
          label: "En attente",
          icon: AlertTriangle,
          count: pendingActionsCount,
          content: renderTabContent("actions_en_attente")
        }] : []),
        {
          id: "en_cours",
          label: "En cours",
          icon: Clock,
          count: getFilteredByTab("en_cours").length,
          content: renderTabContent("en_cours")
        },
        {
          id: "terminees",
          label: "Terminées",
          icon: Archive,
          count: getFilteredByTab("terminees").length,
          content: renderTabContent("terminees")
        }
      ]
    }

    if (tabsPreset === 'prestataire') {
      // Prestataire tabs: En cours (default), Terminées, Toutes
      return [
        {
          id: "prestataire_en_cours",
          label: "En cours",
          icon: Clock,
          count: getFilteredByTab("prestataire_en_cours").length,
          content: renderTabContent("prestataire_en_cours")
        },
        {
          id: "prestataire_terminees",
          label: "Terminées",
          icon: Archive,
          count: getFilteredByTab("prestataire_terminees").length,
          content: renderTabContent("prestataire_terminees")
        },
        {
          id: "prestataire_toutes",
          label: "Toutes",
          icon: ListTodo,
          count: filteredInterventions.length,
          content: renderTabContent("prestataire_toutes")
        }
      ]
    }

    // Full tabs (page interventions)
    return [
      {
        id: "toutes",
        label: "Toutes",
        icon: ListTodo,
        count: filteredInterventions.length,
        content: renderTabContent("toutes")
      },
      {
        id: "demandes_group",
        label: "Demandes",
        icon: AlertTriangle,
        count: getFilteredByTab("demandes_group").length,
        content: renderTabContent("demandes_group")
      },
      {
        id: "en_cours_group",
        label: "En cours",
        icon: Settings,
        count: getFilteredByTab("en_cours_group").length,
        content: renderTabContent("en_cours_group")
      },
      {
        id: "cloturees_group",
        label: "Clôturées",
        icon: Archive,
        count: getFilteredByTab("cloturees_group").length,
        content: renderTabContent("cloturees_group")
      }
    ]
  }, [tabsPreset, filteredInterventions, pendingActionsCount, mounted, viewMode])

  // Default tab
  const defaultTab = tabsPreset === 'dashboard'
    ? (pendingActionsCount > 0 ? "actions_en_attente" : "en_cours")
    : tabsPreset === 'prestataire'
    ? "prestataire_en_cours"
    : "toutes"

  // View switcher
  const viewSwitcher = mounted ? (
    <ViewModeSwitcherV1
      value={viewMode}
      onChange={setViewMode}
    />
  ) : null

  // ========================================
  // BEM Classes
  // ========================================
  const blockClass = cn(
    "interventions-section",
    "flex-1 flex flex-col min-h-0",
    compact && "interventions-section--compact"
  )

  const headerClass = cn(
    "interventions-section__header",
    "flex items-center justify-between gap-2 flex-shrink-0",
    compact ? "px-2 py-1.5 sm:px-3 sm:py-2" : "px-4 py-3"
  )

  const titleClass = cn(
    "interventions-section__title",
    "flex items-center gap-1.5"
  )

  const actionsClass = cn(
    "interventions-section__actions",
    "flex items-center gap-1 flex-shrink-0"
  )

  const contentClass = cn(
    "interventions-section__content",
    "flex-1 flex flex-col min-h-0",
    compact ? "px-2 pb-1.5 sm:px-3 sm:pb-2" : ""
  )

  // ========================================
  // Render
  // ========================================

  // Without header (page mode)
  if (!showHeader) {
    return (
      <ContentNavigator
        tabs={tabs}
        defaultTab={defaultTab}
        activeTab={activeTab}
        searchPlaceholder="Rechercher par titre, description, ou lot..."
        onSearch={setSearchTerm}
        rightControls={viewSwitcher}
        className={className}
      />
    )
  }

  // With header (dashboard mode)
  const HeaderIcon = headerConfig?.icon
  return (
    <div className={blockClass}>
      {/* Card wrapper for dashboard mode */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <div className={headerClass}>
          <div className={titleClass}>
            {HeaderIcon && (
              <HeaderIcon className={cn(
                "text-gray-600",
                compact ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-5 w-5"
              )} />
            )}
            <h2 className={cn(
              "font-semibold text-gray-900 leading-tight",
              compact ? "text-xs sm:text-sm" : "text-base"
            )}>
              {headerConfig?.title}
            </h2>
          </div>
          {headerConfig?.actions && (
            <div className={actionsClass}>
              {headerConfig.actions}
            </div>
          )}
        </div>

        {/* Content */}
        <div className={contentClass}>
          <ContentNavigator
            tabs={tabs}
            defaultTab={defaultTab}
            activeTab={activeTab}
            searchPlaceholder="Rechercher par titre, description, ou référence..."
            onSearch={setSearchTerm}
            rightControls={viewSwitcher}
            className="shadow-none border-0 bg-transparent flex-1 flex flex-col min-h-0"
          />
        </div>
      </div>
    </div>
  )
}
