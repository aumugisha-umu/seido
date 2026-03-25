/**
 * Contract Actions — Re-export barrel
 *
 * All contract server actions are re-exported here for backward compatibility.
 */

// CRUD, contacts, documents, stats, expiry decision
export {
  createContract,
  updateContract,
  deleteContract,
  getContract,
  getTeamContracts,
  addContractContact,
  addContractContactsBatch,
  updateContractContact,
  removeContractContact,
  addContractDocument,
  deleteContractDocument,
  getContractStats,
  getExpiringContracts,
  setExpiryDecision,
  type BuildingTenant,
  type BuildingTenantsResult,
} from './contract-crud-actions'

// Workflow: status changes, overlap, tenant queries
export {
  activateContract,
  terminateContract,
  renewContract,
  getOverlappingContracts,
  checkContractOverlapWithDetails,
  transitionContractStatuses,
  getActiveTenantsByLotAction,
  getActiveTenantsByBuildingAction,
  type OverlappingContractInfo,
  type OverlapCheckResult,
  type OverlapCheckDetailedResult,
  type StatusTransitionResult,
  type ActiveTenant,
  type ActiveTenantsResult,
} from './contract-workflow-actions'
