"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
  searchPlaceholder?: string
  filters?: FilterConfig[]
  onSearch?: (_value: string) => void
  onFilterChange?: (filterId: string, value: string) => void
  onResetFilters?: () => void
  className?: string
  filterValues?: { [key: string]: string }
}

export default function ContentNavigator({
  tabs,
  defaultTab,
  searchPlaceholder = "Rechercher...",
  filters = [],
  onSearch,
  onFilterChange,
  onResetFilters,
  className = "",
  filterValues = {},
}: ContentNavigatorProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [showSearchPopover, setShowSearchPopover] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  const handleSearchChange = (_value: string) => {
    setSearchValue(_value)
    onSearch?.(_value)
  }

  const handleFilterChange = (filterId: string, value: string) => {
    onFilterChange?.(filterId, value)
  }

  const handleTabChange = (_tabId: string) => {
    setActiveTab(_tabId)
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

  return (
    <Card className={className}>
      <CardContent className="pt-0 space-y-2">
        {/* Navigation Controls */}
        <div className="space-y-2">
          {/* Mobile Layout - Single Row */}
          <div className="block md:hidden">
            {/* Mobile: Selector + Search + Filters on same line */}
            <div className="flex gap-2">
              {/* Mobile Tab Dropdown - Flex to fit content */}
              <div className="flex-1 min-w-0">
                <Select value={activeTab} onValueChange={handleTabChange}>
                  <SelectTrigger className="h-10 bg-slate-50 border-slate-200">
                    <SelectValue>
                      <div className="flex items-center">
                        {activeTabData && (
                          <>
                            <activeTabData.icon className="h-4 w-4 mr-2" />
                            <span className="mr-2">{activeTabData.label}</span>
                            {activeTabData.count !== undefined && (
                              <Badge variant="secondary" className="text-xs bg-slate-200 text-slate-700">
                                {activeTabData.count}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tabs.map((tab) => {
                      const IconComponent = tab.icon
                      return (
                        <SelectItem key={tab.id} value={tab.id}>
                          <div className="flex items-center w-full">
                            <IconComponent className="h-4 w-4 mr-2" />
                            <span className="mr-2">{tab.label}</span>
                            {tab.count !== undefined && (
                              <Badge variant="secondary" className="ml-auto text-xs bg-slate-200 text-slate-700">
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
                    className="h-10 px-3 text-slate-600 hover:text-slate-900 border-slate-200"
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
                <div className="relative flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="h-10 px-3 text-slate-600 hover:text-slate-900 border-slate-200"
                  >
                    <Filter className="h-4 w-4" />
                    <ChevronDown className={`h-4 w-4 ml-1 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                  </Button>

                  {/* Filters Dropdown Panel - Mobile */}
                  {showFilters && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 z-10 bg-black/20"
                        onClick={() => setShowFilters(false)}
                      />
                      
                      {/* Dropdown Panel */}
                      <div className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-lg shadow-xl z-20 p-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
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
                                // Fallback: Reset all filters to default one by one
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
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tablet & Desktop Layout - Single Row */}
          <div className="hidden md:flex md:items-center gap-4">
            {/* Tablet & Desktop Tabs - Responsive Width */}
            <div className="flex-shrink-0">
              <div className={`inline-flex h-10 bg-slate-100 rounded-md p-1 overflow-x-auto`}>
                {tabs.map((tab) => {
                  const IconComponent = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`
                        inline-flex items-center justify-center whitespace-nowrap rounded-sm px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
                        ${isActive 
                          ? 'bg-white text-sky-600 shadow-sm' 
                          : 'text-slate-600 hover:bg-slate-200/60'
                        }
                      `}
                    >
                      <IconComponent className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                      {tab.label}
                      {tab.count !== undefined && (
                        <Badge variant="secondary" className={`ml-1 md:ml-2 text-xs ${
                          isActive 
                            ? 'bg-sky-100 text-sky-800' 
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

            {/* Desktop Filters Button - Fixed to the right */}
            {filters.length > 0 && (
              <div className="relative flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-10 px-3 text-slate-600 hover:text-slate-900 border-slate-200"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  <span>Filtres</span>
                  <ChevronDown className={`h-4 w-4 ml-1 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                </Button>

                {/* Filters Dropdown Panel - Desktop */}
                {showFilters && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-10 bg-black/20 lg:bg-transparent"
                      onClick={() => setShowFilters(false)}
                    />
                    
                    {/* Dropdown Panel */}
                    <div className="absolute top-full right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-lg shadow-xl z-20 p-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
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
                              // Fallback: Reset all filters to default one by one
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
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Tab Content */}
        <div className="mt-2">
          {activeTabData?.content}
        </div>
      </CardContent>
    </Card>
  )
}
