"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Filter, ChevronDown } from "lucide-react"

interface TabConfig {
  id: string
  label: string
  icon: React.ComponentType<any>
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
  onSearch?: (value: string) => void
  onFilterChange?: (filterId: string, value: string) => void
  className?: string
}

export default function ContentNavigator({
  tabs,
  defaultTab,
  searchPlaceholder = "Rechercher...",
  filters = [],
  onSearch,
  onFilterChange,
  className = "",
}: ContentNavigatorProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [searchValue, setSearchValue] = useState("")

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    onSearch?.(value)
  }

  const handleFilterChange = (filterId: string, value: string) => {
    onFilterChange?.(filterId, value)
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6 space-y-4">
        <Tabs defaultValue={defaultTab || tabs[0]?.id} className="space-y-4">
          {/* Navigation, Search & Filters Row */}
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Tabs - Fixed Width */}
            <TabsList className={`grid h-9 bg-slate-100 w-full md:w-auto md:flex-shrink-0`} 
                     style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
              {tabs.map((tab) => {
                const IconComponent = tab.icon
                return (
                  <TabsTrigger 
                    key={tab.id}
                    value={tab.id} 
                    className="text-sm text-slate-600 data-[state=active]:text-sky-600 data-[state=active]:bg-white"
                  >
                    <IconComponent className="h-4 w-4 mr-2" />
                    {tab.label}
                    {tab.count !== undefined && (
                      <Badge variant="secondary" className="ml-2 text-xs bg-slate-200 text-slate-700 data-[state=active]:bg-sky-100 data-[state=active]:text-sky-800">
                        {tab.count}
                      </Badge>
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {/* Search Bar - Takes all available space */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input 
                placeholder={searchPlaceholder}
                className="pl-10 h-9 w-full"
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            {/* Filters Button - Fixed to the right */}
            {filters.length > 0 && (
              <div className="relative md:flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-9 px-3 text-slate-600 hover:text-slate-900 border-slate-200 w-full md:w-auto"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  <span>Filtres</span>
                  <ChevronDown className={`h-4 w-4 ml-1 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                </Button>

                {/* Filters Dropdown Panel */}
                {showFilters && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-10 bg-black/20 sm:bg-transparent"
                      onClick={() => setShowFilters(false)}
                    />
                    
                    {/* Dropdown Panel */}
                    <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-20 p-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                      <div className="space-y-4">
                        {filters.map((filter) => (
                          <div key={filter.id}>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                              {filter.label}
                            </label>
                            <Select 
                              defaultValue={filter.defaultValue || filter.options[0]?.value}
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
                            // Reset all filters to default
                            filters.forEach(filter => {
                              handleFilterChange(filter.id, filter.defaultValue || filter.options[0]?.value)
                            })
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

          {/* Tab Contents */}
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-6">
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
