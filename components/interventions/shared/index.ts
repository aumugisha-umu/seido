/**
 * @module interventions/shared
 * @description
 * Système de composants modulaires pour la prévisualisation d'interventions.
 *
 * Ces composants sont conçus pour être réutilisables entre les différentes vues
 * (Manager, Provider, Tenant) tout en permettant des comportements spécifiques
 * selon le rôle de l'utilisateur.
 *
 * ## Architecture
 *
 * ```
 * shared/
 * ├── types/           # Types TypeScript partagés
 * ├── utils/           # Helpers et système de permissions
 * ├── atoms/           # Composants atomiques (Badge, Avatar, etc.)
 * ├── sidebar/         # Composants de la barre latérale
 * ├── cards/           # Composants de type carte
 * └── layout/          # Composants de mise en page
 * ```
 *
 * ## Système de permissions
 *
 * Le système de permissions centralisé permet de contrôler les actions
 * selon le rôle de l'utilisateur :
 *
 * ```tsx
 * import { permissions } from '@/components/interventions/shared'
 *
 * // Vérifier si l'utilisateur peut gérer les devis
 * if (permissions.canManageQuotes(userRole)) {
 *   // Afficher les boutons approuver/rejeter
 * }
 * ```
 *
 * ## Utilisation
 *
 * ```tsx
 * import {
 *   // Types
 *   UserRole, Participant, Quote, TimeSlot,
 *   // Permissions
 *   permissions,
 *   // Atoms
 *   RoleBadge, StatusBadge, ParticipantAvatar,
 *   // Layout
 *   PreviewHybridLayout,
 *   // Cards
 *   InterventionDetailsCard, QuotesCard, PlanningCard
 * } from '@/components/interventions/shared'
 *
 * // Pour les tabs, utilisez EntityTabs avec getInterventionTabsConfig
 * import { EntityTabs, getInterventionTabsConfig } from '@/components/shared/entity-preview'
 * ```
 *
 * @example
 * // Exemple complet pour une vue intervention (layout pleine largeur)
 * import { ContentWrapper, InterventionDetailsCard } from '@/components/interventions/shared'
 * import { EntityTabs, getInterventionTabsConfig } from '@/components/shared/entity-preview'
 *
 * function InterventionView({ intervention, participants }) {
 *   const tabs = useMemo(() => getInterventionTabsConfig('manager'), [])
 *   return (
 *     <EntityTabs tabs={tabs}>
 *       <TabsContent value="general">...</TabsContent>
 *     </EntityTabs>
 *   )
 * }
 *
 * @see {@link ./types/intervention-preview.types.ts} pour les interfaces
 * @see {@link ./utils/permissions.ts} pour le système de permissions
 */

// =============================================================================
// Types - Interfaces et types partagés
// =============================================================================
export * from './types'

// =============================================================================
// Utilitaires - Helpers et permissions
// =============================================================================
export * from './utils'

// =============================================================================
// Composants atomiques - Building blocks réutilisables
// =============================================================================
export * from './atoms'

// =============================================================================
// Composants de sidebar - Supprimés (layout pleine largeur pour locataire/prestataire)
// =============================================================================

// =============================================================================
// Composants de cartes - Cards d'information
// =============================================================================
export * from './cards'

// =============================================================================
// Composants de layout - Structure de page
// =============================================================================
export * from './layout'
