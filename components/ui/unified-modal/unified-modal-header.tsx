"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UnifiedModalHeaderProps } from "./unified-modal.types"

/**
 * UnifiedModalHeader - Header with icon, title, subtitle and optional back button
 * Uses DialogPrimitive.Title for accessibility (Radix requirement)
 */
export const UnifiedModalHeader = ({
  title,
  subtitle,
  icon,
  variant = 'default',
  onBack,
  className,
}: UnifiedModalHeaderProps) => {
  const variantClass = variant !== 'default' ? `unified-modal__header--${variant}` : ''

  return (
    <div className={cn("unified-modal__header", variantClass, className)}>
      {/* Back button (for multi-step modals) */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors"
          aria-label="Retour"
        >
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>
      )}

      {/* Icon */}
      {icon && (
        <div className="unified-modal__header-icon">
          {icon}
        </div>
      )}

      {/* Title and subtitle */}
      <div className="flex-1 min-w-0">
        <DialogPrimitive.Title className="unified-modal__header-title">
          {title}
        </DialogPrimitive.Title>
        {subtitle && (
          <DialogPrimitive.Description className="unified-modal__header-subtitle">
            {subtitle}
          </DialogPrimitive.Description>
        )}
      </div>
    </div>
  )
}

UnifiedModalHeader.displayName = "UnifiedModalHeader"
