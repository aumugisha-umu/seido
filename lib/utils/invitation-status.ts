/**
 * Invitation Status Utility Functions
 *
 * Provides unified logic for determining effective invitation status
 * across the entire application (Contacts page, ContactSelector modal, etc.)
 *
 * Source of truth: user_invitations table only
 * Key rule: Check expires_at for pending invitations
 */

/**
 * Invitation data structure (minimal fields needed for status determination)
 */
export interface InvitationStatusInput {
  status: string | null
  expires_at?: string | null
}

/**
 * Determines the effective status of an invitation by checking expiration
 *
 * Business rules:
 * - If status='pending' AND expires_at < now → 'expired'
 * - Otherwise → status as-is (pending, accepted, expired, cancelled)
 * - If no invitation → null
 *
 * @param invitation - The invitation object with status and expires_at
 * @returns The effective status ('pending' | 'accepted' | 'expired' | 'cancelled' | null)
 */
export function getEffectiveInvitationStatus(
  invitation: InvitationStatusInput | null | undefined
): string | null {
  if (!invitation || !invitation.status) return null

  const status = invitation.status

  // Check expiration for pending invitations
  if (status === 'pending' && invitation.expires_at) {
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    if (now > expiresAt) {
      return 'expired'
    }
  }

  return status
}

/**
 * Invitation data with email for mapping
 */
export interface InvitationWithEmail extends InvitationStatusInput {
  email: string | null
}

/**
 * Builds a mapping of email → effective invitation status
 *
 * Handles multiple invitations per email by keeping the most relevant one:
 * - If any invitation is 'pending' (not expired), use that
 * - Otherwise use the first found status
 *
 * @param invitations - Array of invitations with email, status, and expires_at
 * @returns Record mapping lowercase emails to their effective status
 */
export function buildInvitationStatusMap(
  invitations: InvitationWithEmail[]
): Record<string, string> {
  const statusMap: Record<string, string> = {}

  for (const invitation of invitations) {
    if (!invitation.email) continue

    const emailLower = invitation.email.toLowerCase()
    const effectiveStatus = getEffectiveInvitationStatus(invitation)

    if (!effectiveStatus) continue

    // Priority logic for multiple invitations per email:
    // - Keep 'pending' (active invitation) over other statuses
    // - Don't overwrite if we already have a status (first one wins for non-pending)
    const existingStatus = statusMap[emailLower]

    if (!existingStatus) {
      // No existing status, set this one
      statusMap[emailLower] = effectiveStatus
    } else if (effectiveStatus === 'pending' && existingStatus !== 'pending') {
      // New pending invitation takes priority over expired/cancelled
      statusMap[emailLower] = effectiveStatus
    }
    // Otherwise keep existing status
  }

  return statusMap
}
