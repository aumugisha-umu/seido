'use client'

/**
 * InterventionModalBase
 * Base modal wrapper with consistent layout for intervention-related modals
 *
 * Features:
 * - Predefined size presets (sm/md/lg/xl/full)
 * - Custom width/height support
 * - Sticky header + scrollable content + sticky footer layout
 * - Dismissible backdrop control
 */

import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ModalSize } from './types'

interface InterventionModalBaseProps {
  // Modal control
  open: boolean
  onOpenChange: (open: boolean) => void

  // Layout configuration
  size?: ModalSize
  customWidth?: string
  customHeight?: string

  // Content
  children: React.ReactNode

  // Behavior
  dismissible?: boolean

  // Additional styling
  className?: string
}

// Size presets mapping
const SIZE_MAP: Record<ModalSize, string> = {
  sm: 'max-w-md',      // 448px
  md: 'max-w-lg',      // 512px
  lg: 'max-w-2xl',     // 672px
  xl: 'max-w-4xl',     // 896px
  full: 'max-w-[95vw]' // 95% viewport width
}

export function InterventionModalBase({
  open,
  onOpenChange,
  size = 'lg',
  customWidth,
  customHeight,
  children,
  dismissible = true,
  className
}: InterventionModalBaseProps) {

  const handleOpenChange = (newOpen: boolean) => {
    // Only allow closing if dismissible
    if (!newOpen && !dismissible) {
      return
    }
    onOpenChange(newOpen)
  }

  // Build width classes
  const widthClass = customWidth
    ? `w-[${customWidth}]`
    : `w-full ${SIZE_MAP[size]}`

  // Build height style
  const heightStyle = customHeight
    ? { height: customHeight }
    : { maxHeight: '90vh' }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          // Base layout
          'p-0 flex flex-col overflow-hidden',
          // Width
          widthClass,
          // Custom class
          className
        )}
        style={heightStyle}
        onPointerDownOutside={(e) => {
          if (!dismissible) {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e) => {
          if (!dismissible) {
            e.preventDefault()
          }
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}
