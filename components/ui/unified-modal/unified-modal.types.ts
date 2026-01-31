import { ReactNode } from 'react'

export type UnifiedModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'
export type UnifiedModalVariant = 'default' | 'success' | 'danger' | 'warning'
export type UnifiedModalFooterAlign = 'left' | 'center' | 'right' | 'between'

export interface UnifiedModalProps {
  /** Open state */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Modal size */
  size?: UnifiedModalSize
  /** Show close button in top-right corner */
  showCloseButton?: boolean
  /** Prevent closing when clicking outside */
  preventCloseOnOutsideClick?: boolean
  /** Prevent closing with Escape key */
  preventCloseOnEscape?: boolean
  /** Additional classes on content container */
  className?: string
  /** Modal content (sub-components) */
  children: ReactNode
}

export interface UnifiedModalHeaderProps {
  /** Main title */
  title: string
  /** Optional subtitle */
  subtitle?: string
  /** Optional icon (Lucide component) */
  icon?: ReactNode
  /** Color variant */
  variant?: UnifiedModalVariant
  /** Back button callback (for multi-step modals) */
  onBack?: () => void
  /** Additional classes */
  className?: string
}

export interface UnifiedModalBodyProps {
  /** Body content */
  children: ReactNode
  /** Disable default padding */
  noPadding?: boolean
  /** Additional classes */
  className?: string
}

export interface UnifiedModalFooterProps {
  /** Footer content (buttons) */
  children: ReactNode
  /** Button alignment */
  align?: UnifiedModalFooterAlign
  /** Additional classes */
  className?: string
}
