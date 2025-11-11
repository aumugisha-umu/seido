/**
 * Common types for intervention modal components
 */

import type { LucideIcon } from 'lucide-react'
import type { Database } from '@/lib/database.types'

// Base intervention type with optional relations
export type InterventionData = Database['public']['Tables']['interventions']['Row'] & {
  building?: Database['public']['Tables']['buildings']['Row']
  lot?: Database['public']['Tables']['lots']['Row']
  creator?: {
    id: string
    name: string
    email: string
    role: string
  }
}

// Badge configuration
export interface ModalBadge {
  type: 'status' | 'priority' | 'custom'
  label: string
  color?: string
  icon?: LucideIcon
}

// Context info item (location, creator, date, etc.)
export interface ContextInfoItem {
  icon: LucideIcon
  label: string
  value: string
}

// Modal size presets
export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

// Summary banner variants
export type SummaryVariant = 'default' | 'gradient' | 'minimal'

// Background color options
export type BackgroundColor = 'white' | 'slate' | 'transparent'

// Padding options
export type PaddingSize = 'none' | 'sm' | 'md' | 'lg'

// Footer button justification
export type FooterJustify = 'start' | 'end' | 'between'

// Secondary action button config
export interface SecondaryAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'outline' | 'destructive'
  icon?: LucideIcon
  disabled?: boolean
}
