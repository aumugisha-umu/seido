/**
 * Composants de layout pour les prévisualisations d'intervention
 *
 * NOTE: InterventionTabs a été unifié avec EntityTabs
 * Utilisez maintenant: import { EntityTabs, getInterventionTabsConfig } from '@/components/shared/entity-preview'
 */

export {
  PreviewHybridLayout,
  ContentWrapper,
  ContentHeader,
  MobileLayout,
  type PreviewHybridLayoutProps,
  type ContentWrapperProps,
  type ContentHeaderProps,
  type MobileLayoutProps
} from './preview-hybrid-layout'

export { ParticipantsRow } from './participants-row'

export { ConversationSelector } from './conversation-selector'
