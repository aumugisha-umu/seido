/**
 * Intervention Action Styles
 * Centralized styling system based on Material Design 3 principles
 *
 * Material Design 3 Button Hierarchy:
 * - Filled (Primary): High emphasis, main call-to-action
 * - Filled Tonal (Secondary): Moderate emphasis, important secondary actions
 * - Outlined: Medium emphasis, alternative actions
 * - Text: Low emphasis, tertiary actions
 * - Destructive: Error color for destructive actions (filled or outlined based on severity)
 */

// ============================================
// Material Design 3 → shadcn/ui Variant Mapping
// ============================================

export const MD3_VARIANTS = {
  filled: 'default',              // Primary action (filled with primary color)
  tonal: 'secondary',             // Secondary action (tonal fill)
  outlined: 'outline',            // Alternative action (outlined)
  text: 'ghost',                  // Low priority action (text only)
  danger_filled: 'destructive',   // High-impact destructive (filled with error color)
  danger_outlined: 'outlined-danger' // Medium-impact destructive (outlined with error color)
} as const

// ============================================
// Role-based Color Classes (Tailwind)
// ============================================

export const ROLE_COLORS = {
  gestionnaire: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    primaryOutline: 'border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
    tonal: 'bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300'
  },
  locataire: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    primaryOutline: 'border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
    tonal: 'bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300'
  },
  prestataire: {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    primaryOutline: 'border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
    tonal: 'bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300'
  }
}

// ============================================
// Action → Material Design 3 Type Mapping
// ============================================

export const ACTION_STYLES = {
  // === FILLED (Primary) ===
  // Critical main actions that deserve highest visual prominence
  filled: [
    'approve',              // Gestionnaire approves intervention request
    'submit_quote',         // Prestataire submits quote
    'propose_slots',        // Gestionnaire proposes time slots (Planifier)
    'start_work',           // Prestataire starts intervention
    'complete_work',        // Prestataire marks work as complete
    'validate_work',        // Locataire/Gestionnaire validates completed work
    'finalize',             // Gestionnaire finalizes intervention
    'confirm_slot',         // Locataire confirms a time slot
    'request_quotes',       // Gestionnaire requests quotes from providers
    'start_planning',       // Gestionnaire starts planning process (same level as request_quotes)
    'add_availabilities'    // Prestataire/Locataire adds availability slots
  ],

  // === TONAL (Secondary) ===
  // Important secondary actions, less prominent than primary but still significant
  tonal: [
    'reschedule',           // Any role reschedules intervention
    'modify_schedule',      // Locataire modifies schedule
    'edit_quote'            // Prestataire edits their quote
  ],

  // === OUTLINED ===
  // Alternative or optional actions
  outlined: [
    'view_quote',           // View quote details
    'manage_quotes',        // Navigate to quotes management
    'pause_work'            // Pause ongoing work (if exists)
  ],

  // === TEXT (Ghost) ===
  // Low priority, informational actions
  text: [
    'view',                 // View details
    'consult',              // Consult information
    'check'                 // Check status
  ],

  // === DANGER FILLED ===
  // Severe destructive actions with high visual weight
  danger_filled: [
    'cancel',               // Cancel intervention (severe)
    'delete',               // Delete entity (severe)
    'contest_work'          // Contest completed work (conflict)
  ],

  // === DANGER OUTLINED ===
  // Moderate destructive actions with less visual weight
  danger_outlined: [
    'reject',               // Gestionnaire rejects request
    'reject_schedule',      // Reject proposed schedule
    'cancel_quote',         // Prestataire cancels their quote
    'reject_quote_request'  // Prestataire rejects quote request
  ]
} as const

// ============================================
// Helper Function: Get Action MD3 Type
// ============================================

export function getActionMD3Type(actionKey: string): keyof typeof MD3_VARIANTS {
  for (const [type, actions] of Object.entries(ACTION_STYLES)) {
    if (actions.includes(actionKey)) {
      return type as keyof typeof MD3_VARIANTS
    }
  }

  // Default to tonal for unknown actions (safer than neutral gray)
  return 'tonal'
}

// ============================================
// Helper Function: Get Action Styling
// ============================================

export interface ActionStyling {
  variant: 'default' | 'destructive' | 'outline' | 'outlined-danger' | 'secondary' | 'ghost'
  className: string
}

export function getActionStyling(actionKey: string, userRole: 'gestionnaire' | 'locataire' | 'prestataire'): ActionStyling {
  const md3Type = getActionMD3Type(actionKey)
  const variant = MD3_VARIANTS[md3Type]

  // Apply role-specific colors only for filled, tonal, and outlined (not for danger or text)
  let className = ''

  if (md3Type === 'filled' && ROLE_COLORS[userRole]) {
    className = ROLE_COLORS[userRole].primary
  } else if (md3Type === 'tonal' && ROLE_COLORS[userRole]) {
    className = ROLE_COLORS[userRole].tonal
  } else if (md3Type === 'outlined' && ROLE_COLORS[userRole]) {
    className = ROLE_COLORS[userRole].primaryOutline
  }
  // danger_filled and danger_outlined use component's built-in destructive styling
  // text uses component's built-in ghost styling

  return { variant, className }
}

// ============================================
// Type Exports
// ============================================

export type ActionMD3Type = keyof typeof MD3_VARIANTS
export type UserRole = 'gestionnaire' | 'locataire' | 'prestataire'
