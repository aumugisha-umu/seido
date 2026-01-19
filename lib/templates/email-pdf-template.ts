/**
 * Template HTML pour la génération de PDF à partir d'un email
 *
 * Ce template est utilisé par Puppeteer pour générer un PDF professionnel
 * contenant les métadonnées de l'email, son contenu et la liste des pièces jointes.
 */

interface EmailPdfData {
  subject: string
  from_address: string
  from_name?: string
  to_addresses: string[]
  cc_addresses?: string[]
  received_at: string | null
  sent_at: string | null
  body_html: string | null
  body_text: string | null
  attachments?: Array<{
    filename: string
    size_bytes?: number
  }>
  direction: 'received' | 'sent'
}

/**
 * Échappe les caractères HTML dangereux pour prévenir les attaques XSS
 * CRITICAL SECURITY: Cette fonction DOIT être utilisée pour tout texte
 * provenant de sources externes (emails) avant insertion dans le HTML
 */
const escapeHtml = (text: string | null | undefined): string => {
  if (!text) return ''
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

/**
 * Formate une date en français
 */
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return 'Date inconnue'

  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Formate la taille d'un fichier en unités lisibles
 */
const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return ''
  const k = 1024
  const sizes = ['o', 'Ko', 'Mo', 'Go']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return ` (${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]})`
}

/**
 * Nettoie le HTML pour éviter les problèmes de rendu
 */
const sanitizeHtml = (html: string | null): string => {
  if (!html) return ''

  // Supprimer les scripts
  let cleaned = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')

  // Supprimer les styles inline dangereux
  cleaned = cleaned.replace(/on\w+="[^"]*"/gi, '')
  cleaned = cleaned.replace(/javascript:/gi, '')

  return cleaned
}

/**
 * Convertit le texte brut en HTML avec préservation des sauts de ligne
 */
const textToHtml = (text: string | null): string => {
  if (!text) return '<p style="color: #666; font-style: italic;">Aucun contenu</p>'

  return text
    .split('\n')
    .map(line => `<p style="margin: 0 0 8px 0;">${line || '&nbsp;'}</p>`)
    .join('')
}

/**
 * Génère le HTML complet pour le PDF de l'email
 */
export const renderEmailToPdfHtml = (email: EmailPdfData): string => {
  const date = email.direction === 'received' ? email.received_at : email.sent_at
  const directionLabel = email.direction === 'received' ? 'Reçu le' : 'Envoyé le'

  // Utiliser body_html si disponible, sinon convertir body_text
  const bodyContent = email.body_html
    ? sanitizeHtml(email.body_html)
    : textToHtml(email.body_text)

  const attachmentsList = email.attachments && email.attachments.length > 0
    ? `
      <div class="attachments-section">
        <h3>📎 Pièces jointes (${email.attachments.length})</h3>
        <ul>
          ${email.attachments.map(att => `
            <li>${escapeHtml(att.filename)}${formatFileSize(att.size_bytes)}</li>
          `).join('')}
        </ul>
      </div>
    `
    : ''

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email - ${escapeHtml(email.subject) || 'Sans objet'}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #333;
      background: #fff;
      padding: 40px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f97316;
    }

    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #f97316;
      letter-spacing: -0.5px;
    }

    .logo-subtitle {
      font-size: 10px;
      color: #666;
      font-weight: normal;
      margin-top: 2px;
    }

    .document-type {
      text-align: right;
      color: #666;
      font-size: 11px;
    }

    .document-type strong {
      display: block;
      font-size: 14px;
      color: #333;
    }

    .email-metadata {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }

    .metadata-row {
      display: flex;
      margin-bottom: 8px;
    }

    .metadata-row:last-child {
      margin-bottom: 0;
    }

    .metadata-label {
      font-weight: 600;
      color: #666;
      width: 80px;
      flex-shrink: 0;
    }

    .metadata-value {
      color: #333;
      word-break: break-word;
    }

    .subject {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 25px 0 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e5e5e5;
    }

    .email-body {
      min-height: 200px;
      padding: 15px 0;
      font-size: 13px;
      line-height: 1.6;
    }

    .email-body img {
      max-width: 100%;
      height: auto;
    }

    .email-body a {
      color: #f97316;
      text-decoration: none;
    }

    .email-body a:hover {
      text-decoration: underline;
    }

    .email-body table {
      border-collapse: collapse;
      max-width: 100%;
    }

    .email-body td, .email-body th {
      padding: 4px 8px;
    }

    .attachments-section {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
    }

    .attachments-section h3 {
      font-size: 14px;
      color: #333;
      margin-bottom: 12px;
    }

    .attachments-section ul {
      list-style: none;
      padding: 0;
    }

    .attachments-section li {
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 4px;
      margin-bottom: 6px;
      font-size: 12px;
      color: #555;
    }

    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 10px;
      color: #999;
      text-align: center;
    }

    @media print {
      body {
        padding: 20px;
      }

      .header {
        page-break-inside: avoid;
      }

      .email-body {
        page-break-inside: auto;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">SEIDO</div>
      <div class="logo-subtitle">Gestion Immobilière</div>
    </div>
    <div class="document-type">
      <strong>Archive Email</strong>
      Généré le ${formatDate(new Date().toISOString())}
    </div>
  </div>

  <div class="email-metadata">
    <div class="metadata-row">
      <span class="metadata-label">De :</span>
      <span class="metadata-value">${email.from_name ? `${escapeHtml(email.from_name)} &lt;${escapeHtml(email.from_address)}&gt;` : escapeHtml(email.from_address)}</span>
    </div>
    <div class="metadata-row">
      <span class="metadata-label">À :</span>
      <span class="metadata-value">${email.to_addresses?.map(a => escapeHtml(a)).join(', ') || 'Non spécifié'}</span>
    </div>
    ${email.cc_addresses && email.cc_addresses.length > 0 ? `
    <div class="metadata-row">
      <span class="metadata-label">Cc :</span>
      <span class="metadata-value">${email.cc_addresses.map(a => escapeHtml(a)).join(', ')}</span>
    </div>
    ` : ''}
    <div class="metadata-row">
      <span class="metadata-label">${directionLabel} :</span>
      <span class="metadata-value">${formatDate(date)}</span>
    </div>
  </div>

  <h1 class="subject">${escapeHtml(email.subject) || '(Sans objet)'}</h1>

  <div class="email-body">
    ${bodyContent}
  </div>

  ${attachmentsList}

  <div class="footer">
    Document généré automatiquement par SEIDO • Cet email a été archivé en tant que pièce justificative d'intervention
  </div>
</body>
</html>
  `.trim()
}

/**
 * Extrait le texte brut d'un contenu HTML
 * Utilisé pour générer la description de l'intervention
 */
export const extractTextFromHtml = (html: string | null): string => {
  if (!html) return ''

  // Supprimer les tags HTML
  let text = html.replace(/<[^>]+>/g, ' ')

  // Décoder les entités HTML courantes
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Nettoyer les espaces multiples
  text = text.replace(/\s+/g, ' ').trim()

  // Limiter à une longueur raisonnable pour la description
  if (text.length > 2000) {
    text = text.substring(0, 2000) + '...'
  }

  return text
}
