/**
 * Property Creation Components - Main index file
 *
 * Provides a unified export interface for all property creation components,
 * hooks, and utilities. Enables clean imports and component discovery.
 */

// Core hooks and context
export { usePropertyCreation } from "@/hooks/use-property-creation"
export {
  PropertyCreationProvider,
  usePropertyCreationContext,
  usePropertyCreationContextOptional,
  withPropertyCreation
} from "./context"

// Types
export type * from "./types"

// Atomic components
export {
  AddressInput,
  PropertyNameInput,
  ManagerSelector
} from "./atoms"

// Composed components
export { PropertyInfoForm } from "./composed/forms/PropertyInfoForm"
export { NavigationControls } from "./composed/navigation/NavigationControls"
export { PropertyStepWrapper } from "./composed/steps/PropertyStepWrapper"

// Page-level components
export { BuildingCreationWizard } from "./pages/BuildingCreationWizard"
export { LotCreationWizard } from "./pages/LotCreationWizard"

// Utility functions and configurations
export { buildingSteps, lotSteps } from "@/lib/step-configurations"

// Re-export commonly used types from services for convenience
export type {
  User,
  Team,
  Contact,
  Building,
  Lot,
  LotCategory
} from "@/lib/services/core/service-types"