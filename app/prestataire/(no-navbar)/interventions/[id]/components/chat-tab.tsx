/**
 * Chat Tab Component - Prestataire
 * Wrapper around the shared InterventionChatTab component
 */

import { InterventionChatTab, type InterventionChatTabProps } from '@/components/interventions/intervention-chat-tab'

// Export the shared component with prestataire role pre-configured
export function ChatTab(props: InterventionChatTabProps) {
  return <InterventionChatTab {...props} />
}
