"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Label component with optional icon and required indicator
 *
 * @example
 * // Standard label with icon and required marker
 * <Label icon={MapPin} required>Adresse</Label>
 *
 * // Compact label for dense UIs (lot cards, etc.)
 * <Label icon={Hash} size="sm">Référence</Label>
 *
 * // Simple label without icon
 * <Label required>Nom</Label>
 */

interface LabelProps extends React.ComponentProps<typeof LabelPrimitive.Root> {
  /** Optional Lucide icon to display before the label text */
  icon?: LucideIcon
  /** Show red asterisk (*) to indicate required field */
  required?: boolean
  /** Size variant: "default" (text-sm, icon h-4) or "sm" (text-xs, icon h-3) */
  size?: "default" | "sm"
}

function Label({
  className,
  icon: Icon,
  required,
  size = "default",
  children,
  ...props
}: LabelProps) {
  const isCompact = size === "sm"

  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 leading-none font-medium select-none",
        "group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        isCompact ? "text-xs gap-1" : "text-sm",
        className
      )}
      {...props}
    >
      {Icon && (
        <Icon
          className={cn(
            "text-muted-foreground flex-shrink-0",
            isCompact ? "h-3 w-3" : "h-4 w-4"
          )}
          aria-hidden="true"
        />
      )}
      {children}
      {required && (
        <span className="text-destructive" aria-hidden="true">*</span>
      )}
    </LabelPrimitive.Root>
  )
}

export { Label, type LabelProps }
