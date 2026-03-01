/**
 * Lease Expiry Utilities — Client-safe pure functions
 *
 * Belgian lease law: notice periods and alert tiers.
 * These functions are imported by both server (contract.service.ts)
 * and client (contracts-navigator.tsx, contract-card.tsx) code.
 *
 * NO server-only dependencies (no pino, no supabase, no node modules).
 */

import type {
  LeaseCategory,
  AlertTier,
  ContractExpiryInfo,
  ExpiryDecision
} from '@/lib/types/contract.types'

// ============================================================================
// DATE HELPERS (duplicated from contract.service.ts to avoid server import)
// ============================================================================

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ============================================================================
// LEASE CATEGORY
// ============================================================================

/**
 * Détermine la catégorie légale du bail selon la durée.
 * Droit belge : courte durée ≤3 ans, 9 ans (standard), longue durée >9 ans.
 */
export function getLeaseCategory(durationMonths: number): LeaseCategory {
  if (durationMonths <= 36) return 'courte_duree'
  if (durationMonths <= 108) return 'neuf_ans'
  return 'longue_duree'
}

// ============================================================================
// NOTICE DEADLINES
// ============================================================================

/**
 * Retourne le délai de préavis légal (bailleur) en jours selon la catégorie.
 * - Courte durée : 3 mois (90 jours)
 * - 9 ans / longue durée : 6 mois (180 jours)
 */
export function getNoticeDeadlineDays(category: LeaseCategory): number {
  return category === 'courte_duree' ? 90 : 180
}

// ============================================================================
// ALERT TIERS
// ============================================================================

/**
 * Seuils d'alerte en jours avant end_date, selon la catégorie légale.
 *
 * | Palier    | Courte durée | 9 ans / Longue |
 * |-----------|--------------|----------------|
 * | critical  | 180j (6 mois)| 270j (9 mois)  |
 * | warning   | 120j (4 mois)| 210j (7 mois)  |
 * | deadline  |  90j (3 mois)| 180j (6 mois)  |
 */
function getAlertThresholds(category: LeaseCategory): { critical: number; warning: number; deadline: number } {
  if (category === 'courte_duree') {
    return { critical: 180, warning: 120, deadline: 90 }
  }
  return { critical: 270, warning: 210, deadline: 180 }
}

/**
 * Détermine le palier d'alerte actuel d'un contrat.
 * Retourne null si le contrat n'est pas dans la fenêtre d'alerte.
 */
export function getAlertTier(daysRemaining: number, category: LeaseCategory): AlertTier {
  if (daysRemaining <= 0) return null
  const thresholds = getAlertThresholds(category)
  if (daysRemaining <= thresholds.deadline) return 'deadline'
  if (daysRemaining <= thresholds.warning) return 'warning'
  if (daysRemaining <= thresholds.critical) return 'critical'
  return null
}

/**
 * Retourne la fenêtre d'alerte maximale en jours pour une catégorie.
 */
export function getMaxAlertWindow(category: LeaseCategory): number {
  return getAlertThresholds(category).critical
}

// ============================================================================
// TACIT RENEWAL RISK
// ============================================================================

function getTacitRenewalRisk(category: LeaseCategory): string {
  switch (category) {
    case 'courte_duree':
      return 'Sans préavis : converti automatiquement en bail de 9 ans'
    case 'neuf_ans':
      return 'Sans préavis : reconduit pour 3 ans aux mêmes conditions'
    case 'longue_duree':
      return 'Sans préavis : reconduit pour 3 ans aux mêmes conditions'
  }
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Calcule toutes les informations d'échéance d'un contrat.
 * Fonction pure — prend les données brutes, retourne un ContractExpiryInfo.
 */
export function getExpiryInfo(
  endDate: string,
  durationMonths: number,
  metadata: Record<string, unknown>
): ContractExpiryInfo {
  const category = getLeaseCategory(durationMonths)
  const noticeDays = getNoticeDeadlineDays(category)

  const end = parseLocalDate(endDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  const daysRemaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const deadlineDate = new Date(end)
  deadlineDate.setDate(deadlineDate.getDate() - noticeDays)
  const noticeDeadlineDate = formatLocalDate(deadlineDate)
  const noticeDeadlinePassed = today > deadlineDate

  const expiryDecision = metadata?.expiry_decision as { decision?: ExpiryDecision } | undefined
  const decision = expiryDecision?.decision ?? null

  return {
    leaseCategory: category,
    daysRemaining,
    alertTier: getAlertTier(daysRemaining, category),
    noticeDeadlineDays: noticeDays,
    noticeDeadlineDate,
    noticeDeadlinePassed,
    tacitRenewalRisk: getTacitRenewalRisk(category),
    decision
  }
}
