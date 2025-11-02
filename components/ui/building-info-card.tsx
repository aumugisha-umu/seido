"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Building2, MapPin, Plus, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BuildingInfoCardProps {
  name: string
  address: string
  postalCode: string
  city: string
  country: string
  description?: string
  onAddLot: () => void
  className?: string
}

/**
 * Building Info Card - Version 1: Inline Compact
 *
 * Design Philosophy:
 * - Single-line horizontal layout for maximum compactness
 * - Information density optimized for desktop workflows
 * - Description hidden in tooltip to preserve height
 * - Target height: ~48-52px
 *
 * Best for:
 * - Desktop-first applications
 * - Users comfortable with tooltips
 * - Contexts where vertical space is premium
 *
 * Accessibility:
 * - Keyboard navigable
 * - Screen reader friendly with proper ARIA labels
 * - Focus indicators on interactive elements
 * - Tooltip accessible via hover and focus
 */
export function BuildingInfoCard({
  name,
  address,
  postalCode,
  city,
  country,
  description,
  onAddLot,
  className,
}: BuildingInfoCardProps) {
  const fullAddress = `${address}, ${postalCode} ${city}, ${country}`

  return (
    <Card
      className={cn(
        "bg-gradient-to-r from-blue-50/30 to-transparent py-5 ",
        className
      )}
    >
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          {/* Left Section: Icon + Info (Inline) */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-blue-600" aria-hidden="true" />
            </div>

            {/* Building Info - Single Line */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-gray-900 truncate">
                {name}
              </h3>
              <span className="text-gray-400 flex-shrink-0" aria-hidden="true">
                •
              </span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <MapPin
                  className="h-3.5 w-3.5 text-gray-400 flex-shrink-0"
                  aria-hidden="true"
                />
                <span className="text-sm text-gray-600 truncate" title={fullAddress}>
                  {fullAddress}
                </span>
              </div>

              {/* Description Tooltip */}
              {description && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="w-5 h-5 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors flex-shrink-0"
                        aria-label="Voir la description de l'immeuble"
                      >
                        <Info className="h-3 w-3 text-blue-600" aria-hidden="true" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-xs">{description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>

          {/* Right Section: Action Button */}
          <Button
            onClick={onAddLot}
            size="sm"
            className="bg-green-600 hover:bg-green-700 flex-shrink-0"
            aria-label="Ajouter un nouveau lot à cet immeuble"
          >
            <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
            <span className="hidden sm:inline">Ajouter un lot</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
