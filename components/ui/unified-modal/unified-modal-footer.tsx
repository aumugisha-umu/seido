"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { UnifiedModalFooterProps } from "./unified-modal.types"

/**
 * UnifiedModalFooter - Footer with action buttons
 */
export const UnifiedModalFooter = ({
  children,
  align = 'right',
  className,
}: UnifiedModalFooterProps) => {
  return (
    <div
      className={cn(
        "unified-modal__footer",
        `unified-modal__footer--${align}`,
        className
      )}
    >
      {children}
    </div>
  )
}

UnifiedModalFooter.displayName = "UnifiedModalFooter"
