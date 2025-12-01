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
 *   PreviewHybridLayout, InterventionTabs,
 *   // Sidebar
 *   InterventionSidebar,
 *   // Cards
 *   InterventionDetailsCard, QuotesCard, PlanningCard
 * } from '@/components/interventions/shared'
 * ```
 *
 * @example
 * // Exemple complet pour une vue Manager
 * import { PreviewHybridLayout, InterventionSidebar, InterventionTabs } from '@/components/interventions/shared'
 *
 * function ManagerView({ intervention, participants }) {
 *   return (
 *     <PreviewHybridLayout
 *       sidebar={<InterventionSidebar {...sidebarProps} />}
 *       content={<InterventionTabs userRole="manager">...</InterventionTabs>}
 *     />
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
// Composants de sidebar - Barre latérale d'intervention
// =============================================================================
export * from './sidebar'

// =============================================================================
// Composants de cartes - Cards d'information
// =============================================================================
export * from './cards'

// =============================================================================
// Composants de layout - Structure de page
// =============================================================================
export * from './layout'
