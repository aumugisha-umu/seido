import { NextResponse } from 'next/server'
import { getApiAuthContext } from '@/lib/api-auth-helper'
import { logger } from '@/lib/logger'

/**
 * GET /api/bank/rent-calls/[id]/receipt
 *
 * Generates a printable rent receipt (quittance de loyer) as HTML.
 * Compliant with French law (Loi du 6 juillet 1989).
 *
 * Requirements:
 * - Authenticated gestionnaire
 * - rent_call must be 'paid' or 'partial'
 * - Returns print-optimized HTML with Content-Disposition header
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
  if (!authResult.success) return authResult.error
  const { supabase, userProfile } = authResult.data

  const teamId = userProfile?.team_id
  if (!teamId) {
    return NextResponse.json(
      { success: false, error: 'Equipe introuvable' },
      { status: 400 }
    )
  }

  try {
    // 1. Fetch rent call with team validation (RLS + explicit team_id check)
    const { data: rentCall, error: rentCallError } = await supabase
      .from('rent_calls' as 'contracts')
      .select('*')
      .eq('id', id)
      .eq('team_id', teamId)
      .single()

    if (rentCallError || !rentCall) {
      logger.warn({ id, teamId, error: rentCallError }, '[RECEIPT] Rent call not found')
      return NextResponse.json(
        { success: false, error: 'Echeance introuvable' },
        { status: 404 }
      )
    }

    // Type assertion for the rent_call fields (table not yet in generated types)
    const rc = rentCall as unknown as {
      id: string
      team_id: string
      contract_id: string
      lot_id: string
      building_id: string | null
      due_date: string
      period_start: string
      period_end: string
      rent_amount: number
      charges_amount: number
      total_expected: number
      total_received: number
      status: string
    }

    // 2. Only allow receipt generation for paid or partial status
    if (rc.status !== 'paid' && rc.status !== 'partial') {
      return NextResponse.json(
        { success: false, error: 'La quittance ne peut etre generee que pour une echeance payee ou partiellement payee' },
        { status: 400 }
      )
    }

    // 3. Fetch related data in parallel
    const [contractResult, lotResult, teamResult] = await Promise.all([
      // Contract + tenant via contract_contacts
      supabase
        .from('contract_contacts')
        .select('user:users(name, email)')
        .eq('contract_id', rc.contract_id)
        .eq('role', 'locataire')
        .eq('is_primary', true)
        .limit(1),

      // Lot + building + address
      supabase
        .from('lots_active')
        .select('name, building:buildings(name, address:addresses(street, city, postal_code))')
        .eq('id', rc.lot_id)
        .single(),

      // Team info
      supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .single(),
    ])

    // Extract tenant name (fallback to 'Locataire' if not found)
    const tenantContact = contractResult.data?.[0] as { user: { name: string | null; email: string | null } } | undefined
    const tenantName = tenantContact?.user?.name || 'Locataire'

    // Extract lot and building info
    const lot = lotResult.data as unknown as {
      name: string
      building: {
        name: string
        address: { street: string; city: string; postal_code: string } | null
      } | null
    } | null

    const lotName = lot?.name || 'Lot'
    const buildingName = lot?.building?.name || ''
    const street = lot?.building?.address?.street || ''
    const city = lot?.building?.address?.city || ''
    const postalCode = lot?.building?.address?.postal_code || ''
    const fullAddress = [street, `${postalCode} ${city}`.trim()].filter(Boolean).join(', ')

    // Team name
    const teamName = teamResult.data?.name || 'Agence'

    // 4. Format dates in French locale
    const formatDate = (dateStr: string): string => {
      const date = new Date(dateStr)
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    }

    const periodStart = formatDate(rc.period_start)
    const periodEnd = formatDate(rc.period_end)
    const generationDate = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    // Format currency
    const formatCurrency = (amount: number): string => {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount)
    }

    // Period label for filename (YYYY-MM)
    const periodLabel = rc.period_start.substring(0, 7)

    // 5. Generate HTML receipt
    const html = generateReceiptHtml({
      teamName,
      tenantName,
      lotName,
      buildingName,
      fullAddress,
      periodStart,
      periodEnd,
      rentAmount: formatCurrency(rc.rent_amount),
      chargesAmount: formatCurrency(rc.charges_amount),
      totalExpected: formatCurrency(rc.total_expected),
      totalReceived: formatCurrency(rc.total_received),
      generationDate,
      isPartial: rc.status === 'partial',
    })

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="quittance-${periodLabel}.html"`,
      },
    })
  } catch (error) {
    logger.error({ error, id }, '[RECEIPT] Unexpected error generating receipt')
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la generation de la quittance' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// HTML Template
// ---------------------------------------------------------------------------

interface ReceiptData {
  teamName: string
  tenantName: string
  lotName: string
  buildingName: string
  fullAddress: string
  periodStart: string
  periodEnd: string
  rentAmount: string
  chargesAmount: string
  totalExpected: string
  totalReceived: string
  generationDate: string
  isPartial: boolean
}

function generateReceiptHtml(data: ReceiptData): string {
  const partialNotice = data.isPartial
    ? `<p class="partial-notice">Note : Le montant recu (${escapeHtml(data.totalReceived)}) est inferieur au montant total du (${escapeHtml(data.totalExpected)}). Ce document constitue un recu de paiement partiel et non une quittance de loyer au sens de la loi.</p>`
    : ''

  const documentTitle = data.isPartial ? 'RECU DE PAIEMENT PARTIEL' : 'QUITTANCE DE LOYER'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentTitle} - ${data.periodStart} au ${data.periodEnd}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      color: #1a1a1a;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20mm;
      background: #fff;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #1a1a1a;
    }

    .header h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 2px;
      margin-bottom: 4px;
    }

    .parties {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      gap: 40px;
    }

    .party {
      flex: 1;
    }

    .party-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666;
      margin-bottom: 8px;
    }

    .party-name {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .party-detail {
      font-size: 13px;
      color: #444;
    }

    .section {
      margin-bottom: 30px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #666;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #ddd;
    }

    .period {
      font-size: 16px;
      font-weight: 500;
    }

    .financial-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }

    .financial-table td {
      padding: 10px 0;
      font-size: 14px;
    }

    .financial-table td:last-child {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .financial-table .separator {
      border-top: 1px solid #ddd;
    }

    .financial-table .total-row td {
      padding-top: 14px;
      font-size: 16px;
      font-weight: 700;
      border-top: 2px solid #1a1a1a;
    }

    .financial-table .received-row td {
      font-size: 15px;
      font-weight: 600;
      color: #166534;
    }

    .partial-notice {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 4px;
      padding: 12px 16px;
      font-size: 13px;
      color: #92400e;
      margin-top: 16px;
    }

    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
    }

    .footer-text {
      font-size: 12px;
      color: #666;
      font-style: italic;
      margin-bottom: 30px;
    }

    .signature-section {
      display: flex;
      justify-content: flex-end;
      margin-top: 40px;
    }

    .signature-block {
      text-align: center;
    }

    .signature-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 60px;
    }

    .signature-line {
      width: 200px;
      border-top: 1px solid #1a1a1a;
      padding-top: 8px;
      font-size: 13px;
    }

    .generation-date {
      font-size: 12px;
      color: #666;
      text-align: right;
      margin-top: 20px;
    }

    @media print {
      body {
        padding: 0;
        max-width: none;
      }

      .partial-notice {
        border: 1px solid #999;
        background: #f5f5f5;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${documentTitle}</h1>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-label">Bailleur / Gestionnaire</div>
      <div class="party-name">${escapeHtml(data.teamName)}</div>
    </div>
    <div class="party">
      <div class="party-label">Locataire</div>
      <div class="party-name">${escapeHtml(data.tenantName)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Bien concerne</div>
    <p class="party-name">${escapeHtml(data.lotName)}${data.buildingName ? ` - ${escapeHtml(data.buildingName)}` : ''}</p>
    <p class="party-detail">${escapeHtml(data.fullAddress)}</p>
  </div>

  <div class="section">
    <div class="section-title">Periode</div>
    <p class="period">Du ${escapeHtml(data.periodStart)} au ${escapeHtml(data.periodEnd)}</p>
  </div>

  <div class="section">
    <div class="section-title">Detail des sommes</div>
    <table class="financial-table">
      <tr>
        <td>Loyer</td>
        <td>${escapeHtml(data.rentAmount)}</td>
      </tr>
      <tr>
        <td>Charges</td>
        <td>${escapeHtml(data.chargesAmount)}</td>
      </tr>
      <tr class="total-row">
        <td>Total</td>
        <td>${escapeHtml(data.totalExpected)}</td>
      </tr>
      <tr class="received-row">
        <td>Montant recu</td>
        <td>${escapeHtml(data.totalReceived)}</td>
      </tr>
    </table>
    ${partialNotice}
  </div>

  <div class="footer">
    <p class="footer-text">
      Cette quittance annule tous les recus qui auraient pu etre etablis precedemment.
      Elle ne libere pas le locataire des loyers et charges restant eventuellement dus.
    </p>

    <div class="signature-section">
      <div class="signature-block">
        <div class="signature-label">Le bailleur / gestionnaire</div>
        <div class="signature-line">${escapeHtml(data.teamName)}</div>
      </div>
    </div>

    <p class="generation-date">Document genere le ${escapeHtml(data.generationDate)}</p>
  </div>
</body>
</html>`
}

/**
 * Escape HTML special characters to prevent XSS in generated HTML.
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}
