// Composants de gestion des disponibilités
export { AvailabilityManager } from './availability-manager'
export { AvailabilityMatcher } from './availability-matcher'
export { IntegratedAvailabilityCard } from './integrated-availability-card'

// Hook de gestion
export { useAvailabilityManagement } from '../../hooks/use-availability-management'
export type {
  UserAvailability,
  ParticipantAvailability,
  MatchedSlot,
  PartialMatch,
  MatchingResult,
  AvailabilityData
} from '../../hooks/use-availability-management'
