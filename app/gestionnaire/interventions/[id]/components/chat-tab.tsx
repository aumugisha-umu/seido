/**
 * Chat Tab Component - Gestionnaire
 * Wrapper around the shared InterventionChatTab component
 */

import { InterventionChatTab, type InterventionChatTabProps } from '@/components/interventions/intervention-chat-tab'

// Export the shared component with gestionnaire role pre-configured
export function ChatTab(props: InterventionChatTabProps) {
  return <InterventionChatTab {...props} />
}