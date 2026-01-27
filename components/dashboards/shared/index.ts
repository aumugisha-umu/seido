/**
 * Shared Dashboard Components
 *
 * Composants réutilisables pour les dashboards de tous les rôles
 * (gestionnaire, prestataire, locataire)
 */

// Stats & KPI Components
export { StatsCard, type StatsCardProps, type TrendData } from './stats-card'
export { DashboardStatsCards } from './dashboard-stats-cards'
export { ContractStatsCards } from './contract-stats-cards'
export { KPICarousel } from './kpi-carousel'
export { ProgressMini } from './progress-mini'

// Pending Actions Components (Multi-Role)
export { PendingActionsCard } from './pending-actions-card'
export { PendingActionsSection } from './pending-actions-section'

// Note: DashboardInterventionsSection a été remplacé par InterventionsNavigator
// Importer depuis: @/components/interventions/interventions-navigator
