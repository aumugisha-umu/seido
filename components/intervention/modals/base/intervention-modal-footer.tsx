'use client'

/**
 * InterventionModalFooter
 * Standard footer for intervention modals with action buttons
 *
 * Features:
 * - Primary action button (confirm/submit)
 * - Cancel button
 * - Optional secondary actions
 * - Loading states
 * - Flexible button layout
 * - Sticky positioning
 */

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SecondaryAction, FooterJustify } from './types'
import type { LucideIcon } from 'lucide-react'

interface InterventionModalFooterProps {
  // Cancel action
  onCancel: () => void
  cancelLabel?: string

  // Primary action
  onConfirm?: () => void
  confirmLabel?: string
  confirmIcon?: LucideIcon
  confirmDisabled?: boolean
  confirmVariant?: 'default' | 'destructive'

  // Loading state
  isLoading?: boolean
  loadingText?: string

  // Secondary actions (optional, shown on left)
  secondaryActions?: SecondaryAction[]

  // Layout
  justifyContent?: FooterJustify
  sticky?: boolean

  // Styling
  className?: string
}

export function InterventionModalFooter({
  onCancel,
  cancelLabel = 'Annuler',
  onConfirm,
  confirmLabel = 'Confirmer',
  confirmIcon: ConfirmIcon,
  confirmDisabled = false,
  confirmVariant = 'default',
  isLoading = false,
  loadingText = 'Chargement...',
  secondaryActions,
  justifyContent = 'end',
  sticky = true,
  className
}: InterventionModalFooterProps) {

  // Determine layout class
  const layoutClass = justifyContent === 'start'
    ? 'justify-start'
    : justifyContent === 'between'
      ? 'justify-between'
      : 'justify-end'

  return (
    <div className={cn(
      'flex-shrink-0 bg-white border-t border-slate-200 p-6',
      sticky && 'sticky bottom-0 z-10',
      className
    )}>
      <div className={cn(
        'flex items-center gap-3',
        layoutClass
      )}>
        {/* Secondary actions on left */}
        {secondaryActions && secondaryActions.length > 0 && (
          <div className="flex gap-2">
            {secondaryActions.map((action, index) => {
              const ActionIcon = action.icon
              return (
                <Button
                  key={index}
                  variant={action.variant || 'outline'}
                  onClick={action.onClick}
                  disabled={action.disabled || isLoading}
                >
                  {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                  {action.label}
                </Button>
              )
            })}
          </div>
        )}

        {/* Primary actions on right */}
        <div className="flex gap-3 ml-auto">
          {/* Cancel button */}
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>

          {/* Confirm button (optional) */}
          {onConfirm && (
            <Button
              variant={confirmVariant}
              onClick={onConfirm}
              disabled={confirmDisabled || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {loadingText}
                </>
              ) : (
                <>
                  {ConfirmIcon && <ConfirmIcon className="h-4 w-4 mr-2" />}
                  {confirmLabel}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
