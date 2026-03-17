/**
 * Admin Email HTML Builder
 *
 * Generates inline HTML emails for admin notifications.
 * Minimal dashboard-style design: no logo, no marketing footer.
 * Single template parameterized by event type, badge color, and data rows.
 */

// =============================================================================
// Types
// =============================================================================

export type AdminEventType = 'signup' | 'subscription_upgrade' | 'subscription_downgrade' | 'subscription_cancelled' | 'trial_expired'

interface DataRow {
  label: string
  value: string
  bold?: boolean
  separator?: boolean
}

interface AdminEmailParams {
  eventType: AdminEventType
  title: string
  rows: DataRow[]
}

// =============================================================================
// Badge config per event type
// =============================================================================

const BADGE_CONFIG: Record<AdminEventType, { color: string; bg: string; emoji: string; label: string }> = {
  signup:                  { color: '#16a34a', bg: '#f0fdf4', emoji: '🟢', label: 'Inscription' },
  subscription_upgrade:    { color: '#2563eb', bg: '#eff6ff', emoji: '🔵', label: 'Upgrade' },
  subscription_downgrade:  { color: '#ea580c', bg: '#fff7ed', emoji: '🟠', label: 'Downgrade' },
  subscription_cancelled:  { color: '#dc2626', bg: '#fef2f2', emoji: '🔴', label: 'Churn' },
  trial_expired:           { color: '#6b7280', bg: '#f9fafb', emoji: '⚪', label: 'Trial expiré' },
}

// =============================================================================
// Builder
// =============================================================================

export function buildAdminEmailHtml({ eventType, title, rows }: AdminEmailParams): string {
  const badge = BADGE_CONFIG[eventType]

  const dataRows = rows.map(row => {
    if (row.separator) {
      return `<tr><td colspan="2" style="border-bottom:1px solid #e5e7eb;padding:4px 0;"></td></tr>`
    }
    const valueStyle = row.bold
      ? 'font-weight:700;font-size:15px;'
      : ''
    return `
      <tr>
        <td style="padding:6px 12px;color:#6b7280;font-size:13px;white-space:nowrap;">${row.label}</td>
        <td style="padding:6px 12px;color:#111827;font-size:13px;text-align:right;${valueStyle}">${row.value}</td>
      </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:520px;margin:24px auto;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
    <!-- Badge -->
    <div style="background:${badge.bg};padding:14px 20px;border-bottom:1px solid #e5e7eb;">
      <span style="color:${badge.color};font-weight:700;font-size:14px;">
        ${badge.emoji} ${badge.label}
      </span>
    </div>

    <!-- Title -->
    <div style="padding:16px 20px 8px;">
      <h2 style="margin:0;font-size:16px;color:#111827;font-weight:600;">${title}</h2>
    </div>

    <!-- Data table -->
    <div style="padding:4px 8px 20px;">
      <table style="width:100%;border-collapse:collapse;">
        ${dataRows}
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:12px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <span style="color:#9ca3af;font-size:11px;">SEIDO Admin Alert &mdash; ${new Date().toLocaleDateString('fr-FR')}</span>
    </div>
  </div>
</body>
</html>`
}

/** Helper to build a separator row */
export function separator(): DataRow {
  return { label: '', value: '', separator: true }
}
