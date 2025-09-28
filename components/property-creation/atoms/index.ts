/**
 * Property Creation Atoms - Index file for atomic components
 *
 * Exports all atomic components for easy importing in composed components
 * and pages. Maintains clean import statements and component organization.
 */

// Form field atoms
export { AddressInput } from "./form-fields/AddressInput"
export { PropertyNameInput } from "./form-fields/PropertyNameInput"

// Selector atoms
export { BuildingSelector } from "./selectors/BuildingSelector"
export { ManagerSelector } from "./selectors/ManagerSelector"

// Re-export types for convenience
export type {
  AddressInputProps,
  PropertyNameInputProps,
  BuildingSelectorProps,
  ManagerSelectorProps
} from "../types"