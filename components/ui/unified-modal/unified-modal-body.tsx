"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import type { UnifiedModalBodyProps } from "./unified-modal.types"

/**
 * UnifiedModalBody - Scrollable content area
 */
export const UnifiedModalBody = ({
  children,
  noPadding = false,
  className,
}: UnifiedModalBodyProps) => {
  return (
    <div
      className={cn(
        "unified-modal__body",
        noPadding && "p-0",
        className
      )}
    >
      {children}
    </div>
  )
}

UnifiedModalBody.displayName = "UnifiedModalBody"
