'use server'

/**
 * Intervention Actions — Barrel Export
 * Re-exports all intervention actions for backward compatibility.
 * Import from '@/app/actions/intervention' instead of individual files.
 */

// Shared types, schemas, and helpers
export {
  type InterventionUrgency,
  type InterventionType,
  type InterventionStatus,
  type Intervention,
  type UserRole,
  type ActionResult,
  type DashboardStats,
  InterventionCreateSchema,
  InterventionUpdateSchema,
  TimeSlotSchema,
  InterventionFiltersSchema,
  checkLotLockedBySubscription,
  checkInterventionLotLocked,
  sendParticipantAddedSystemMessage,
} from './intervention-shared'

// CRUD actions
export {
  createInterventionAction,
  createBatchRentRemindersAction,
  getInterventionAction,
  updateInterventionAction,
  getInterventionsAction,
  getDashboardStatsAction,
  getMyInterventionsAction,
  getInterventionCountByPropertyAction,
  loadInterventionsPaginatedAction,
} from './intervention-crud-actions'

// Workflow actions (status transitions)
export {
  approveInterventionAction,
  rejectInterventionAction,
  startPlanningAction,
  confirmScheduleAction,
  startInterventionAction,
  completeByProviderAction,
  validateByTenantAction,
  finalizeByManagerAction,
  cancelInterventionAction,
  programInterventionAction,
  updateProviderGuidelinesAction,
} from './intervention-workflow-actions'

// Assignment actions
export {
  assignUserAction,
  unassignUserAction,
  assignMultipleProvidersAction,
  getLinkedInterventionsAction,
  updateProviderInstructionsAction,
  getAssignmentModeAction,
} from './intervention-assignment-actions'

// Time slot actions
export {
  proposeTimeSlotsAction,
  selectTimeSlotAction,
  cancelTimeSlotAction,
  acceptTimeSlotAction,
  rejectTimeSlotAction,
  withdrawResponseAction,
  chooseTimeSlotAsManagerAction,
} from './intervention-timeslot-actions'
