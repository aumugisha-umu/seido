"use client"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Building,
  Users,
  Home,
  Car,
  Store,
  MoreHorizontal,
  Check
} from "lucide-react"
import { LotCategory, getAllLotCategories} from "@/lib/lot-types"

interface LotCategorySelectorProps {
  value: LotCategory
  onChange: (category: LotCategory) => void
  label?: string
  description?: string
  required?: boolean
  displayMode?: "grid" | "list"
  className?: string
}

const iconComponents = {
  Building,
  Users,
  Home,
  Car,
  Store,
  MoreHorizontal
}

export function LotCategorySelector({
  value,
  onChange,
  label = "Catégorie du lot",
  required = false,
  displayMode = "grid",
  className = ""
}: LotCategorySelectorProps) {
  const categories = getAllLotCategories()

  const handleCategorySelect = (_categoryKey: string) => {
    onChange(_categoryKey as LotCategory)
  }

  if (displayMode === "list") {
    return (
      <div className={`space-y-3 ${className}`}>
        {label && (
          <div className="space-y-1">
            <Label className="text-sm font-medium text-slate-700 flex items-center gap-1">
              {label}
              {required && <span className="text-red-500">*</span>}
            </Label>
            {description && (
              <p className="text-xs text-slate-500">{description}</p>
            )}
          </div>
        )}
        
        <RadioGroup
          value={value}
          onValueChange={handleCategorySelect}
          className="space-y-2"
        >
          {categories.map((category) => {
            const IconComponent = iconComponents[category.icon as keyof typeof iconComponents]
            const isSelected = value === category.key
            
            return (
              <div
                key={category.key}
                className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm ${
                  isSelected 
                    ? "border-blue-500 bg-blue-50 shadow-sm" 
                    : "border-slate-200 bg-white"
                }`}
                onClick={() => handleCategorySelect(category.key)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleCategorySelect(category.key)
                  }
                }}
                role="radio"
                aria-checked={isSelected}
                aria-label={`Sélectionner ${category.label}`}
              >
                <RadioGroupItem value={category.key} className="mt-0.5" />
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isSelected ? "bg-blue-100" : "bg-slate-100"
                }`}>
                  <IconComponent className={`w-4 h-4 ${
                    isSelected ? "text-blue-600" : "text-slate-600"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-sm ${
                    isSelected ? "text-blue-900" : "text-slate-700"
                  }`}>
                    {category.key === 'local_commercial' ? 'Local commercial' : category.label}
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                )}
              </div>
            )
          })}
        </RadioGroup>
      </div>
    )
  }

  // Grid mode (default)
  return (
    <div className={`space-y-4 ${className}`}>
      {label && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700 flex items-center gap-1">
            {label}
            {required && <span className="text-red-500">*</span>}
          </Label>
          {description && (
            <p className="text-xs text-slate-500">{description}</p>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 lg:gap-3">
        {categories.map((category) => {
          const IconComponent = iconComponents[category.icon as keyof typeof iconComponents]
          const isSelected = value === category.key
          
          return (
            <Button
              key={category.key}
              type="button"
              variant="ghost"
              className={`relative h-auto p-3 lg:p-4 flex flex-col items-center space-y-1.5 lg:space-y-2 border-2 rounded-xl transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                isSelected 
                  ? "border-blue-500 bg-blue-50 shadow-sm" 
                  : "border-slate-200 bg-white"
              }`}
              onClick={() => handleCategorySelect(category.key)}
              aria-pressed={isSelected}
              aria-label={`Sélectionner ${category.label}`}
            >
              {/* Icon */}
              <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center transition-colors ${
                isSelected ? "bg-blue-100" : "bg-slate-100"
              }`}>
                <IconComponent className={`w-4 h-4 lg:w-5 lg:h-5 ${
                  isSelected ? "text-blue-600" : "text-slate-600"
                }`} />
              </div>
              
              {/* Label */}
              <div className={`font-medium text-xs lg:text-sm text-center leading-tight ${
                isSelected ? "text-blue-900" : "text-slate-700"
              } ${category.key === 'local_commercial' ? 'max-w-16 lg:max-w-20' : ''}`}>
                {category.key === 'local_commercial' ? (
                  <>
                    <div>Local</div>
                    <div>commercial</div>
                  </>
                ) : (
                  category.label
                )}
              </div>
              
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 lg:w-5 lg:h-5 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
                  <Check className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-white" />
                </div>
              )}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export default LotCategorySelector
