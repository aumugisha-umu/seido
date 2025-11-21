/**
 * Programming Modal - Main Entry Point
 *
 * This file now exports the FINAL version of the programming modal.
 *
 * Migration History:
 * - Original: Basic programming modal with ContactSelector dropdown
 * - V2/V3/V4: Attempted redesigns (all had wrong component)
 * - FINAL: Correct implementation with ContactSection cards
 *
 * Date: 2025-11-10
 * Changes:
 * - Replaced with programming-modal-FINAL.tsx
 * - Fixed ContactSection vs ContactSelector issue
 * - Fixed Dialog width constraint (1100px now applies correctly)
 * - All imports updated automatically via re-export
 *
 * @see components/intervention/modals/programming-modal-FINAL.tsx
 * @see docs/programming-modal-FINAL-explanation.md
 * @see docs/programming-modal-FINAL-checklist.md
 */

// Export FINAL version as default
export { default as ProgrammingModal } from './programming-modal-FINAL'
export { default as ProgrammingModalEnhanced } from './programming-modal-FINAL'
export { default } from './programming-modal-FINAL'

// Re-export types from FINAL version
export type {
  ProgrammingModalProps,
  ProgrammingOption,
  TimeSlot,
  Provider,
  Manager,
  Contact
} from './programming-modal-FINAL'
