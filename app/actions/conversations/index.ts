/**
 * Conversation Actions — Re-export barrel
 *
 * All conversation server actions are re-exported here for backward compatibility.
 */

// CRUD: threads, messages, welcome messages
export {
  sendThreadWelcomeMessage,
  getThreadsByInterventionAction,
  createThreadAction,
  getThreadAction,
  getMessagesAction,
  sendMessageAction,
  deleteMessageAction,
  type ActionResult,
} from './conversation-crud-actions'

// Thread management: participants, read tracking, transparency
export {
  getThreadParticipantsAction,
  addParticipantAction,
  ensureInterventionConversationThreads,
  removeParticipantAction,
  markThreadAsReadAction,
  getUnreadCountAction,
  markAllThreadsAsReadAction,
  addProviderToGroupThreadAction,
  getManagerAccessibleThreadsAction,
} from './conversation-thread-actions'
