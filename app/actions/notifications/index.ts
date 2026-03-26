/**
 * Notification Actions — Re-export barrel
 *
 * All notification server actions are re-exported here for backward compatibility.
 * Import from '@/app/actions/notifications' or from individual files.
 */

// CRUD & property entity notifications
export {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createCustomNotification,
  notifyDocumentUploaded,
  createBuildingNotification,
  notifyBuildingUpdated,
  notifyBuildingDeleted,
  createLotNotification,
  notifyLotUpdated,
  notifyLotDeleted,
  createContactNotification,
} from './notification-crud-actions'

// Intervention notifications
export {
  createInterventionNotification,
  notifyInterventionStatusChange,
} from './notification-intervention-actions'

// Contract notifications
export {
  notifyContractExpiring,
  checkExpiringContracts,
  createContractNotification,
} from './notification-contract-actions'

// Quote notifications
export {
  notifyQuoteRequested,
  notifyQuoteApproved,
  notifyQuoteRejected,
  notifyQuoteSubmittedWithPush,
} from './notification-quote-actions'
