/**
 * Property Creation Types - Common interfaces for modular property creation
 *
 * Centralizes all TypeScript interfaces used across the property creation flow
 * to ensure type safety and consistency between building and lot creation.
 */

import type { LotCategory } from "@/lib/lot-types"
import type { User, Team, Contact, Building, Lot } from "@/lib/services/core/service-types"

// Base property modes
export type PropertyMode = 'building' | 'lot' | 'independent'
export type BuildingAssociation = 'existing' | 'new' | 'independent'

// Form validation states
export interface ValidationState {
  isValid: boolean
  errors: Record<string, string>
  warnings: Record<string, string>
}

export interface StepValidation {
  [stepIndex: number]: ValidationState
}

// Address information interface
export interface AddressInfo {
  address: string
  postalCode: string
  city: string
  country: string
}

// Building information interface (shared between building and lot creation)
export interface BuildingInfo extends AddressInfo {
  name: string
  description: string
}

// Lot-specific information
export interface LotInfo {
  id?: string
  reference: string
  floor: string
  doorNumber: string
  description: string
  category: LotCategory
  buildingId?: string
}

// Combined property data for independent lots
export interface IndependentPropertyInfo extends BuildingInfo {
  // Lot-specific fields for independent properties
  floor?: string
  doorNumber?: string
  category?: LotCategory
}

// Team management interfaces
export interface TeamManager {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  role: string
}

export interface TeamData {
  userTeam: Team | null
  teamManagers: TeamManager[]
  selectedManagerId: string
  categoryCountsByTeam: Record<string, number>
  isLoading: boolean
}

// Contact assignment interfaces
export interface ContactAssignments {
  tenant: Contact[]
  provider: Contact[]
  notary: Contact[]
  insurance: Contact[]
  other: Contact[]
}

export interface LotContactAssignments {
  [lotId: string]: ContactAssignments
}

export interface ManagerAssignments {
  [lotId: string]: TeamManager[]
}

// Form data interfaces
export interface BuildingFormData {
  mode: 'building'
  currentStep: number
  buildingInfo: BuildingInfo
  lots: LotInfo[]
  selectedManagerId: string
  buildingContacts: ContactAssignments
  lotContactAssignments: LotContactAssignments
  managerAssignments: ManagerAssignments
}

export interface LotFormData {
  mode: 'lot' | 'independent'
  currentStep: number
  buildingAssociation: BuildingAssociation
  selectedBuilding?: string
  newBuilding?: BuildingInfo
  independentProperty?: IndependentPropertyInfo
  lotInfo: LotInfo
  selectedManagerId: string
  contactAssignments: ContactAssignments
  managerAssignments: TeamManager[]
}

export type PropertyFormData = BuildingFormData | LotFormData

// Navigation and step management
export interface NavigationState {
  currentStep: number
  totalSteps: number
  canGoNext: boolean
  canGoPrevious: boolean
  isLoading: boolean
  isCreating: boolean
}

// Action interfaces
export interface PropertyCreationActions {
  // Navigation
  goToStep: (step: number) => void
  goNext: () => void
  goPrevious: () => void

  // Building management
  updateBuildingInfo: (info: Partial<BuildingInfo>) => void

  // Lot management
  addLot: () => void
  updateLot: (id: string, updates: Partial<LotInfo>) => void
  removeLot: (_id: string) => void
  duplicateLot: (_id: string) => void

  // Contact management
  addContact: (contact: Contact, type: string, context?: { lotId?: string }) => void
  removeContact: (contactId: string, type: string, context?: { lotId?: string }) => void

  // Manager management
  selectManager: (_managerId: string) => void
  addLotManager: (lotId: string, manager: TeamManager) => void
  removeLotManager: (lotId: string, managerId: string) => void

  // Form submission
  submit: () => Promise<void>

  // Validation
  validateStep: (step: number) => ValidationState
  validateForm: () => boolean
}

// Component prop interfaces
export interface PropertyFormProps {
  data: PropertyFormData
  actions: PropertyCreationActions
  navigation: NavigationState
  teamData: TeamData
  validation: StepValidation
}

export interface StepComponentProps extends PropertyFormProps {
  stepIndex: number
}

// Atomic component prop interfaces
export interface AddressInputProps {
  value: AddressInfo
  onChange: (address: AddressInfo) => void
  validation?: ValidationState
  disabled?: boolean
  required?: boolean
  showCountrySelector?: boolean
}

export interface PropertyNameInputProps {
  value: string
  onChange: (_name: string) => void
  placeholder?: string
  validation?: ValidationState
  disabled?: boolean
  required?: boolean
  buildingsCount?: number
  entityType?: 'building' | 'lot'
}

export interface ManagerSelectorProps {
  selectedManagerId: string
  teamManagers: TeamManager[]
  onManagerSelect: (_managerId: string) => void
  onCreateManager?: () => void
  userTeam: Team | null
  isLoading?: boolean
  disabled?: boolean
  required?: boolean
}

export interface BuildingSelectorProps {
  buildings: Building[]
  selectedBuildingId?: string
  onBuildingSelect: (buildingId: string) => void
  searchQuery: string
  onSearchChange: (_query: string) => void
  isLoading?: boolean
  disabled?: boolean
  emptyStateAction?: () => void
}

// Creation result interfaces
export interface PropertyCreationResult {
  building?: Building
  lots?: Lot[]
  contacts?: Contact[]
  success: boolean
  message: string
}

// Hook return interfaces
export interface UsePropertyCreationReturn {
  // State
  formData: PropertyFormData
  navigation: NavigationState
  teamData: TeamData
  validation: StepValidation

  // Actions
  actions: PropertyCreationActions

  // Status
  isLoading: boolean
  error: string | null

  // Utils
  canProceedToNextStep: () => boolean
  getStepValidation: (step: number) => ValidationState
  resetForm: () => void
}

// Context interfaces
export interface PropertyCreationContextValue extends UsePropertyCreationReturn {
  // Additional context-specific utilities
  registerStepValidation: (step: number, validation: ValidationState) => void
  updateFormData: (updates: Partial<PropertyFormData>) => void
}

// Configuration interfaces
export interface PropertyCreationConfig {
  mode: PropertyMode
  initialData?: Partial<PropertyFormData>
  onSuccess?: (result: PropertyCreationResult) => void
  onError?: (error: Error) => void
  enableAutoSave?: boolean
  enableValidationOnChange?: boolean
}

// Export all for easy importing
export type {
  // Re-export from lib for convenience
  LotCategory,
  User,
  Team,
  Contact,
  Building,
  Lot
}