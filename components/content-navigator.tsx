"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, Filter, ChevronDown } from "lucide-react"

interface TabConfig {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  count?: number | string
  content: React.ReactNode
}

interface FilterConfig {
  id: string
  label: string
  options: { value: string; label: string }[]
  defaultValue?: string
}

interface ContentNavigatorProps {
  tabs: TabConfig[]
  defaultTab?: string
  activeTab?: string
  searchPlaceholder?: string
  filters?: FilterConfig[]
  onSearch?: (_value: string) => void
  onFilterChange?: (filterId: string, value: string) => void
  onResetFilters?: () => void
  className?: string
  filterValues?: { [key: string]: string }
  rightControls?: React.ReactNode
}

export default function ContentNavigator({
  tabs,
  defaultTab,
  activeTab: controlledActiveTab,
  searchPlaceholder = "Rechercher...",
  filters = [],
  onSearch,
  onFilterChange,
  onResetFilters,
  className = "",
  filterValues = {},
  rightControls,
}: ContentNavigatorProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [showSearchPopover, setShowSearchPopover] = useState(false)
  const [searchValue, setSearchValue] = useState("")

  // ✅ FIX 1: Initialize with controlled value OR defaultTab OR first tab (lazy initialization)
  const [internalActiveTab, setInternalActiveTab] = useState(() => {
    if (controlledActiveTab !== undefined) return controlledActiveTab
    if (defaultTab) return defaultTab
    return tabs[0]?.id || ''
  })

  // ✅ FIX 2: Memoize tabs structure to prevent unnecessary effects (only when tab IDs change)
  const stableTabIds = useMemo(() => tabs.map(t => t.id).join(','), [tabs.length, tabs[0]?.id, tabs[tabs.length - 1]?.id])

  // Use controlled activeTab if provided, otherwise use internal state
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab

  // ✅ FIX 3: Improved useEffect - only update when truly necessary
  useEffect(() => {
    // Case 1: Controlled mode - parent controls the active tab
    if (controlledActiveTab !== undefined) {
      if (tabs.some(tab => tab.id === controlledActiveTab)) {
        setInternalActiveTab(controlledActiveTab)
      }
      return // Exit early - don't apply defaultTab logic in controlled mode
    }

    // Case 2: Uncontrolled mode - only reset if current tab no longer exists in tabs array
    const currentTabExists = tabs.some(tab => tab.id === internalActiveTab)

    if (!currentTabExists) {
      // Current tab disappeared, fallback to defaultTab or first tab
      if (defaultTab && tabs.some(tab => tab.id === defaultTab)) {
        setInternalActiveTab(defaultTab)
      } else if (tabs[0]) {
        setInternalActiveTab(tabs[0].id)
      }
    }
    // ✅ CRITICAL: Don't reset if current tab still exists!
  }, [controlledActiveTab, stableTabIds, defaultTab])

  const handleSearchChange = (_value: string) => {
    setSearchValue(_value)
    onSearch?.(_value)
  }

  const handleFilterChange = (filterId: string, value: string) => {
    onFilterChange?.(filterId, value)
  }

  const handleTabChange = (_tabId: string) => {
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(_tabId)
    }
    // If controlledActiveTab is provided, parent controls it, so we don't update state
  }

  const activeTabData = tabs.find(tab => tab.id === activeTab) || tabs[0]

  // Fonction pour déterminer quels filtres afficher selon la logique dynamique
  const getVisibleFilters = () => {
    return filters.filter(filter => {
      // Le filtre "category" n'est visible que si role = "prestataire"
      if (filter.id === 'category') {
        return filterValues.role === 'prestataire'
      }

      // Le filtre "speciality" n'est visible que si category = "prestataire" (prestataire général)
      if (filter.id === 'speciality') {
        return filterValues.category === 'prestataire'
      }

      // Tous les autres filtres sont toujours visibles
      return true
    })
  }

  // Détecter si c'est un usage compact (dashboard) via className
  const isCompact = className.includes('flex-1') || className.includes('min-h-0')

  // Détecter si c'est le contexte dashboard (embedded sans bordure)
  const isDashboardEmbedded = className.includes('bg-transparent') || className.includes('border-0')

  // #region agent log (debug - runs only once on mount)
  // Note: Ce code de debug était la cause principale des re-renders (7374ms+)
  // car il n'avait pas de tableau de dépendances et s'exécutait à chaque render
  useEffect(() => {
    // Debug code désactivé en production - décommenter si besoin de diagnostiquer
    if (process.env.NODE_ENV !== 'development') return

    const outerDiv = document.querySelector('[data-content-navigator-outer]') as HTMLElement
    const paddingDiv = document.querySelector('[data-content-navigator-padding]') as HTMLElement
    const tabContentDiv = document.querySelector('[data-content-navigator-tab-content]') as HTMLElement

    if (outerDiv && paddingDiv && tabContentDiv) {
      const logData = {
        location: 'content-navigator.tsx:136',
        message: 'Height measurements',
        data: {
          outerHeight: outerDiv.offsetHeight,
          outerScrollHeight: outerDiv.scrollHeight,
          paddingHeight: paddingDiv.offsetHeight,
          paddingScrollHeight: paddingDiv.scrollHeight,
          tabContentHeight: tabContentDiv.offsetHeight,
          tabContentScrollHeight: tabContentDiv.scrollHeight,
          windowHeight: window.innerHeight
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A'
      }
      fetch('http://127.0.0.1:7242/ingest/6e12353c-b19d-479f-90dc-6917014c3318', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logData)
      }).catch(() => {})
    }
  }, []) // ✅ FIX CRITIQUE: Ajout du tableau de dépendances vide
  // #endregion
  return (
    <div data-content-navigator-outer className={`flex-1 min-h-0 flex flex-col ${!isDashboardEmbedded ? 'border border-slate-200 rounded-lg shadow-sm bg-white' : ''} ${className}`}>
      {/* Padding container - pas de padding sur dashboard embedded */}
      <div data-content-navigator-padding className={`${isDashboardEmbedded
          ? 'space-y-1 flex-1 flex flex-col min-h-0 overflow-hidden'
          : isCompact
            ? 'p-4 space-y-1 flex-1 flex flex-col min-h-0 overflow-hidden'
            : 'p-6 space-y-2 flex-1 flex flex-col min-h-0 overflow-hidden'
        }`}>
        {/* Navigation Controls */}
        <div className={`${isCompact ? 'space-y-1 flex-shrink-0' : 'space-y-2 flex-shrink-0'}`}>
          {/* Mobile Layout - Single Row */}
          <div className="block md:hidden">
            {/* Mobile: Selector + Search + Filters on same line */}
            <div className="flex gap-2 items-center">
              {/* Mobile Tab Dropdown - Auto width to fit content */}
              <div className="flex-shrink-0">
                <Select value={activeTab} onValueChange={handleTabChange}>
                  <SelectTrigger className={`${isCompact ? 'h-8' : 'h-10'} bg-slate-50 border-slate-200`}>
                    <SelectValue>
                      <div className="flex items-center">
                        {activeTabData && (
                          <>
                            {(() => {
                              const isAlertTab = activeTabData.id === "actions_en_attente"
                              const IconComponent = activeTabData.icon
                              return (
                                <>
                                  <IconComponent className={`h-4 w-4 mr-2 ${isAlertTab ? 'text-orange-600' : ''}`} />
                                  <span className={`mr-2 ${isAlertTab ? 'text-orange-700' : ''}`}>{activeTabData.label}</span>
                                  {activeTabData.count !== undefined && (
                                    <Badge variant="secondary" className={`text-xs ${isAlertTab
                                        ? 'bg-orange-100 text-orange-800 border-orange-200'
                                        : 'bg-slate-200 text-slate-700'
                                      }`}>
                                      {activeTabData.count}
                                    </Badge>
                                  )}
                                </>
                              )
                            })()}
                          </>
                        )}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tabs.map((tab) => {
                      const IconComponent = tab.icon
                      const isAlertTab = tab.id === "actions_en_attente"
                      return (
                        <SelectItem key={tab.id} value={tab.id}>
                          <div className="flex items-center w-full">
                            <IconComponent className={`h-4 w-4 mr-2 ${isAlertTab ? 'text-orange-600' : ''}`} />
                            <span className={`mr-2 ${isAlertTab ? 'text-orange-700' : ''}`}>{tab.label}</span>
                            {tab.count !== undefined && (
                              <Badge variant="secondary" className={`ml-auto text-xs ${isAlertTab
                                  ? 'bg-orange-100 text-orange-800 border-orange-200'
                                  : 'bg-slate-200 text-slate-700'
                                }`}>
                                {tab.count}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              {/* Search Icon with Popover */}
              <Popover open={showSearchPopover} onOpenChange={setShowSearchPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`${isCompact ? 'h-8' : 'h-10'} px-3 text-slate-600 hover:text-slate-900 border-slate-200`}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-3" align="start">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <Input
                      placeholder={searchPlaceholder}
                      className="pl-10 h-10"
                      value={searchValue}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      autoFocus
                    />
                  </div>
                </PopoverContent>
              </Popover>

              {/* Filters Button - Compact */}
              {filters.length > 0 && (
                <Popover open={showFilters} onOpenChange={setShowFilters}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`${isCompact ? 'h-8' : 'h-10'} px-3 text-slate-600 hover:text-slate-900 border-slate-200`}
                    >
                      <Filter className="h-4 w-4" />
                      <ChevronDown className={`h-4 w-4 ml-1 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 max-w-[calc(100vw-2rem)] p-4" align="end" sideOffset={8}>
                    <div className="space-y-4">
                      {getVisibleFilters().map((filter) => (
                        <div key={filter.id}>
                          <label className="text-sm font-medium text-slate-700 mb-2 block">
                            {filter.label}
                          </label>
                          <Select
                            value={filterValues[filter.id] || filter.defaultValue || filter.options[0]?.value}
                            onValueChange={(value) => handleFilterChange(filter.id, value)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {filter.options.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-500 hover:text-slate-700"
                        onClick={() => {
                          if (onResetFilters) {
                            onResetFilters()
                          } else {
                            filters.forEach(filter => {
                              handleFilterChange(filter.id, filter.defaultValue || filter.options[0]?.value)
                            })
                          }
                        }}
                      >
                        Réinitialiser
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFilters(false)}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        Fermer
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {/* Tablet & Desktop Layout - Single Row */}
          <div className={`hidden md:flex md:items-center ${isCompact ? 'gap-2' : 'gap-4'}`}>
            {/* Tablet & Desktop Tabs - Responsive Width */}
            <div className="flex-shrink-0">
              <div className={`inline-flex ${isCompact ? 'h-8' : 'h-10'} bg-slate-100 rounded-md p-1 overflow-x-auto`}>
                {tabs.map((tab) => {
                  const IconComponent = tab.icon
                  const isActive = activeTab === tab.id
                  const isAlertTab = tab.id === "actions_en_attente"
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`
                        inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
                        ${isActive
                          ? isAlertTab
                            ? 'bg-orange-50 text-orange-700 shadow-sm border border-orange-200'
                            : 'bg-white text-sky-600 shadow-sm'
                          : isAlertTab
                            ? 'text-orange-600 hover:bg-orange-50'
                            : 'text-slate-600 hover:bg-slate-200/60'
                        }
                      `}
                    >
                      <IconComponent className={`h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 ${isActive
                        ? isAlertTab ? 'text-orange-700' : 'text-sky-600'
                        : isAlertTab ? 'text-orange-600' : 'text-slate-600'
                        }`} />
                      {tab.label}
                      {tab.count !== undefined && (
                        <Badge variant="secondary" className={`ml-1 md:ml-2 text-xs ${isActive
                            ? isAlertTab
                              ? 'bg-orange-100 text-orange-800 border-orange-200'
                              : 'bg-sky-100 text-sky-800'
                            : isAlertTab
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-slate-200 text-slate-700'
                          }`}>
                          {tab.count}
                        </Badge>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Desktop Filters Button - Icon only, before search */}
            {filters.length > 0 && (
              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 w-10 p-0 text-slate-600 hover:text-slate-900 border-slate-200"
                    title="Filtres"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="start" sideOffset={8}>
                  <div className="space-y-4">
                    {getVisibleFilters().map((filter) => (
                      <div key={filter.id}>
                        <label className="text-sm font-medium text-slate-700 mb-2 block">
                          {filter.label}
                        </label>
                        <Select
                          value={filterValues[filter.id] || filter.defaultValue || filter.options[0]?.value}
                          onValueChange={(value) => handleFilterChange(filter.id, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {filter.options.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-500 hover:text-slate-700"
                      onClick={() => {
                        if (onResetFilters) {
                          onResetFilters()
                        } else {
                          filters.forEach(filter => {
                            handleFilterChange(filter.id, filter.defaultValue || filter.options[0]?.value)
                          })
                        }
                      }}
                    >
                      Réinitialiser
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFilters(false)}
                      className="text-slate-500 hover:text-slate-700"
                    >
                      Fermer
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Desktop Search Bar - Takes all available space */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder={searchPlaceholder}
                className="pl-10 h-10"
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            {/* Right Controls (e.g., view switcher) */}
            {rightControls && (
              <div className="flex-shrink-0">
                {rightControls}
              </div>
            )}
          </div>

        </div>

        {/* Tab Content */}
        <div data-content-navigator-tab-content className="mt-2 flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeTabData?.content}
        </div>
      </div>
    </div>
  )
}
