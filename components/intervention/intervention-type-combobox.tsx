"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useInterventionTypes, type InterventionType, type InterventionTypesData } from "@/hooks/use-intervention-types"
import { getTypeIcon } from "@/components/interventions/intervention-type-icon"

// ============================================================================
// Category Colors (accessible with white icons)
// ============================================================================

const CATEGORY_COLORS: Record<string, string> = {
  bien: 'bg-blue-500',
  bail: 'bg-emerald-500',
  locataire: 'bg-orange-500',
}

const CATEGORY_TEXT_COLORS: Record<string, string> = {
  bien: 'text-blue-600',
  bail: 'text-emerald-600',
  locataire: 'text-orange-600',
}

// ============================================================================
// Types
// ============================================================================

type CategoryCode = 'bien' | 'bail' | 'locataire'

interface InterventionTypeComboboxProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /**
   * Filter by category code ('bien', 'bail', 'locataire')
   * Accepts a single category or an array of categories.
   * If null/undefined, shows all categories.
   *
   * @example
   * categoryFilter="bien" // Single category
   * categoryFilter={["bien", "locataire"]} // Multiple categories
   */
  categoryFilter?: CategoryCode | CategoryCode[] | null
  /**
   * Error state from form validation
   */
  error?: boolean
  /**
   * Initial data from server-side prefetch (avoids loading spinner)
   */
  initialData?: InterventionTypesData | null
}

// ============================================================================
// Component
// ============================================================================

/**
 * Combobox for selecting intervention types with search and category grouping
 *
 * Features:
 * - Search bar to filter types
 * - Grouped by category (Bien, Bail, Locataire)
 * - Icons and colors for each type
 * - Description preview on hover
 * - Keyboard navigation support
 *
 * @example
 * ```tsx
 * <InterventionTypeCombobox
 *   value={formData.type}
 *   onValueChange={(type) => setFormData(prev => ({ ...prev, type }))}
 *   placeholder="Sélectionnez un type"
 * />
 * ```
 */
export function InterventionTypeCombobox({
  value,
  onValueChange,
  placeholder = "Sélectionnez un type...",
  disabled = false,
  className,
  categoryFilter = null,
  error = false,
  initialData,
}: InterventionTypeComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [expandedCategories, setExpandedCategories] = React.useState<Set<string>>(new Set(['bien', 'bail', 'locataire']))
  // ✅ Pass initialData to avoid loading delay when server-prefetched
  const { types, categories, isLoading, getTypeByCode, normalizeLegacyCode } = useInterventionTypes({
    initialData: initialData ?? undefined
  })

  // When searching, show all items (ignore collapsed state)
  const isSearching = searchQuery.length > 0

  // Toggle category expansion
  const toggleCategory = (categoryCode: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(categoryCode)) {
        next.delete(categoryCode)
      } else {
        next.add(categoryCode)
      }
      return next
    })
  }

  // Normalize legacy value if needed
  const normalizedValue = value ? normalizeLegacyCode(value) : value

  // Filter types by category if specified (supports single value or array)
  const filteredTypes = React.useMemo(() => {
    if (!categoryFilter) return types
    if (Array.isArray(categoryFilter)) {
      return types.filter(t => categoryFilter.includes(t.category_code as CategoryCode))
    }
    return types.filter(t => t.category_code === categoryFilter)
  }, [types, categoryFilter])

  // Group types by category for display
  const groupedTypes = React.useMemo(() => {
    const groups: Map<string, { label: string; types: InterventionType[] }> = new Map()

    // Initialize groups in category order (supports single value or array)
    const relevantCategories = categoryFilter
      ? Array.isArray(categoryFilter)
        ? categories.filter(c => categoryFilter.includes(c.code as CategoryCode))
        : categories.filter(c => c.code === categoryFilter)
      : categories

    for (const cat of relevantCategories) {
      groups.set(cat.code, { label: cat.label_fr, types: [] })
    }

    // Populate groups
    for (const type of filteredTypes) {
      const group = groups.get(type.category_code)
      if (group) {
        group.types.push(type)
      }
    }

    return Array.from(groups.entries())
      .filter(([, group]) => group.types.length > 0)
      .map(([code, group]) => ({ code, ...group }))
  }, [filteredTypes, categories, categoryFilter])

  // Get selected type info
  const selectedType = normalizedValue ? getTypeByCode(normalizedValue) : undefined

  // Reset search when popover closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearchQuery("")
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Sélectionner une catégorie d'intervention"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !normalizedValue && "text-muted-foreground",
            error && "border-destructive focus:ring-destructive",
            className
          )}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="truncate">Chargement...</span>
            </div>
          ) : selectedType ? (
            (() => {
              const SelectedIcon = getTypeIcon(selectedType.code)
              const selectedCategoryBgColor = CATEGORY_COLORS[selectedType.category_code] || 'bg-gray-500'
              return (
                <div className="flex items-center gap-2 truncate">
                  <div className={cn(
                    "w-5 h-5 rounded flex items-center justify-center shrink-0",
                    selectedCategoryBgColor
                  )}>
                    <SelectedIcon className="h-3 w-3 text-white" />
                  </div>
                  <span className="truncate">{selectedType.label_fr}</span>
                </div>
              )
            })()
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder="Rechercher un type..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Chargement des types...
              </div>
            ) : groupedTypes.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Aucun type disponible
              </div>
            ) : null}
            <CommandEmpty>Aucun type trouvé.</CommandEmpty>
            {groupedTypes.map(({ code: categoryCode, label: categoryLabel, types: categoryTypes }) => {
              const isExpanded = expandedCategories.has(categoryCode)
              const categoryBgColor = CATEGORY_COLORS[categoryCode] || 'bg-gray-500'
              const categoryTextColor = CATEGORY_TEXT_COLORS[categoryCode] || 'text-gray-600'

              return (
                <CommandGroup
                  key={categoryCode}
                  heading={
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggleCategory(categoryCode)
                      }}
                      className={cn(
                        "flex items-center gap-2 w-full text-left cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-1 rounded",
                        categoryTextColor
                      )}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="text-xs font-semibold uppercase tracking-wider">
                        {categoryLabel}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {categoryTypes.length}
                      </span>
                    </button>
                  }
                >
                  {/* Show items if category is expanded OR if user is searching */}
                  {(isSearching || isExpanded) && categoryTypes.map((type) => {
                    const Icon = getTypeIcon(type.code)
                    return (
                      <CommandItem
                        key={type.code}
                        value={`${type.label_fr} ${type.description_fr || ''}`}
                        onSelect={() => {
                          onValueChange(type.code)
                          setOpen(false)
                        }}
                        className="flex items-center gap-3 py-2 pl-4"
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                          categoryBgColor
                        )}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {type.label_fr}
                          </p>
                          {type.description_fr && (
                            <p className="text-xs text-muted-foreground truncate">
                              {type.description_fr}
                            </p>
                          )}
                        </div>
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            normalizedValue === type.code ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ============================================================================
// FormField Wrapper
// ============================================================================

interface InterventionTypeFieldProps extends Omit<InterventionTypeComboboxProps, 'error'> {
  label?: string
  required?: boolean
  errorMessage?: string
}

/**
 * Form field wrapper for InterventionTypeCombobox with label and error handling
 *
 * @example
 * ```tsx
 * <InterventionTypeField
 *   label="Type d'intervention"
 *   value={formData.type}
 *   onValueChange={(type) => setFormData(prev => ({ ...prev, type }))}
 *   errorMessage={errors.type?.message}
 *   required
 * />
 * ```
 */
export function InterventionTypeField({
  label = "Type d'intervention",
  required = false,
  errorMessage,
  ...comboboxProps
}: InterventionTypeFieldProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <InterventionTypeCombobox
        {...comboboxProps}
        error={!!errorMessage}
      />
      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
    </div>
  )
}
