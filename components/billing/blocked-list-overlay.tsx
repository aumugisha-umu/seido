'use client'

import { cn } from '@/lib/utils'

interface BlockedListOverlayProps {
  isBlocked: boolean
  children: React.ReactNode
  className?: string
}

/**
 * Wraps a list/grid and applies blocked-mode visual treatment.
 * When blocked: pointer events disabled, opacity reduced, not-allowed cursor.
 * Content renders normally but is non-interactive.
 */
export function BlockedListOverlay({ isBlocked, children, className }: BlockedListOverlayProps) {
  if (!isBlocked) return <>{children}</>

  return (
    <div className={cn('relative', className)}>
      <div className="opacity-60 pointer-events-none select-none">
        {children}
      </div>
      {/* Invisible overlay to show not-allowed cursor */}
      <div className="absolute inset-0 cursor-not-allowed z-10" />
    </div>
  )
}
