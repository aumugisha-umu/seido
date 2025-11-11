'use client'

/**
 * InterventionModalContent
 * Scrollable content area wrapper for intervention modals
 *
 * Features:
 * - Configurable background color
 * - Configurable padding
 * - Optional card wrapper (like programming modal)
 * - Auto-scrollable with proper flex layout
 */

import { cn } from '@/lib/utils'
import type { BackgroundColor, PaddingSize } from './types'

interface InterventionModalContentProps {
  children: React.ReactNode

  // Layout options
  backgroundColor?: BackgroundColor
  padding?: PaddingSize

  // Card wrapper (white card inside scrollable area)
  withCard?: boolean
  cardClassName?: string

  // Additional styling
  className?: string
}

// Background color mapping
const BG_MAP: Record<BackgroundColor, string> = {
  white: 'bg-white',
  slate: 'bg-slate-50',
  transparent: 'bg-transparent'
}

// Padding mapping
const PADDING_MAP: Record<PaddingSize, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6'
}

export function InterventionModalContent({
  children,
  backgroundColor = 'white',
  padding = 'lg',
  withCard = false,
  cardClassName,
  className
}: InterventionModalContentProps) {

  return (
    <div className={cn(
      // Flex + scroll
      'flex-1 overflow-y-auto',
      // Background
      BG_MAP[backgroundColor],
      // Padding
      PADDING_MAP[padding],
      // Custom
      className
    )}>
      {withCard ? (
        <div className={cn(
          'bg-white rounded-lg border border-slate-200 shadow-sm p-6',
          cardClassName
        )}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  )
}
