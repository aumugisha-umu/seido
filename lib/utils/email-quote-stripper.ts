/**
 * Email Quote Stripper
 *
 * Extracts only the new reply content from email HTML, stripping quoted content
 * from various email clients (Gmail, Outlook, Apple Mail, etc.)
 *
 * This is done at DISPLAY time (not save time) to:
 * - Preserve original data for debugging
 * - Allow users to view full thread if needed
 * - Enable logic adjustments without data migration
 */

export interface QuoteStrippingResult {
  /** The clean HTML with quotes removed */
  cleanHtml: string
  /** Whether quoted content was found and removed */
  hasQuotedContent: boolean
  /** The original quoted HTML (for "Show original" feature) */
  quotedHtml?: string
}

/**
 * Patterns for detecting quote attribution lines in various languages
 * These typically appear before the quoted content
 */
const QUOTE_ATTRIBUTION_PATTERNS = [
  // English patterns
  /On .+ wrote:/i,
  /On .+ at .+ wrote:/i,
  /.+ wrote:/i,
  /From: .+/i,
  /Sent: .+/i,

  // French patterns
  /Le .+ a écrit\s*:/i,
  /Le .+ à .+ a écrit\s*:/i,
  /.+ a écrit\s*:/i,
  /De\s*:\s*.+/i,
  /Envoyé\s*:\s*.+/i,

  // German patterns
  /Am .+ schrieb .+:/i,
  /Von: .+/i,
  /Gesendet: .+/i,

  // Spanish patterns
  /El .+ escribió:/i,
  /De: .+/i,
  /Enviado: .+/i,
]

/**
 * CSS selectors for quote containers in various email clients
 */
const QUOTE_SELECTORS = [
  // Gmail
  'div.gmail_quote',
  'div.gmail_quote_container',
  'div.gmail_attr',
  'blockquote.gmail_quote',

  // Outlook
  'div.OutlookMessageHeader',
  'div#divRplyFwdMsg',
  'div[style*="border:none;border-top:solid"]',

  // Apple Mail
  'blockquote[type="cite"]',

  // Yahoo
  'div.yahoo_quoted',

  // Generic blockquotes that likely contain quoted content
  'blockquote',
]

/**
 * Check if a node contains quote attribution text
 */
function isQuoteAttribution(text: string): boolean {
  const trimmedText = text.trim()
  if (!trimmedText || trimmedText.length > 500) return false

  return QUOTE_ATTRIBUTION_PATTERNS.some(pattern => pattern.test(trimmedText))
}

/**
 * Strip email quotes from HTML content
 *
 * @param html - The raw HTML content from the email
 * @returns Object containing clean HTML, quoted HTML, and whether quotes were found
 */
export function stripEmailQuotes(html: string): QuoteStrippingResult {
  if (!html || typeof html !== 'string' || html.trim() === '') {
    return {
      cleanHtml: '',
      hasQuotedContent: false
    }
  }

  // Use DOMParser-like approach with regex for server/client compatibility
  // We'll work with the HTML string directly since we need SSR compatibility

  let cleanHtml = html
  let quotedParts: string[] = []
  let hasQuotedContent = false

  // Step 1: Remove Gmail quote containers
  // Gmail structure: <div dir="ltr">REPLY</div><br><div class="gmail_quote...">QUOTED</div>
  // Strategy: Find the start of gmail_quote and remove everything from there
  // This is more robust than regex matching nested </div> tags
  const gmailQuoteStartRegex = /<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>/i
  const gmailQuoteMatch = gmailQuoteStartRegex.exec(cleanHtml)

  if (gmailQuoteMatch) {
    // Extract everything BEFORE the gmail_quote div
    const beforeQuote = cleanHtml.substring(0, gmailQuoteMatch.index)
    const afterQuote = cleanHtml.substring(gmailQuoteMatch.index)

    quotedParts.push(afterQuote)
    cleanHtml = beforeQuote
    hasQuotedContent = true
  }

  // Step 2: Remove Outlook quote headers
  const outlookHeaderRegex = /<div[^>]*(?:class="[^"]*OutlookMessageHeader[^"]*"|id="divRplyFwdMsg")[^>]*>[\s\S]*?<\/div>/gi
  const outlookMatches = cleanHtml.match(outlookHeaderRegex)
  if (outlookMatches) {
    outlookMatches.forEach(match => {
      quotedParts.push(match)
      cleanHtml = cleanHtml.replace(match, '')
    })
    hasQuotedContent = true
  }

  // Step 3: Remove Apple Mail blockquotes
  const appleCiteRegex = /<blockquote[^>]*type="cite"[^>]*>[\s\S]*?<\/blockquote>/gi
  const appleMatches = cleanHtml.match(appleCiteRegex)
  if (appleMatches) {
    appleMatches.forEach(match => {
      quotedParts.push(match)
      cleanHtml = cleanHtml.replace(match, '')
    })
    hasQuotedContent = true
  }

  // Step 4: Remove generic blockquotes that start with attribution patterns
  // Match blockquotes that likely contain quoted replies
  const blockquoteRegex = /<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi
  const blockquoteMatches = cleanHtml.match(blockquoteRegex)
  if (blockquoteMatches) {
    blockquoteMatches.forEach(match => {
      // Check if this blockquote contains reply attribution
      const textContent = match.replace(/<[^>]*>/g, ' ').trim()
      if (isQuoteAttribution(textContent.substring(0, 200))) {
        quotedParts.push(match)
        cleanHtml = cleanHtml.replace(match, '')
        hasQuotedContent = true
      }
    })
  }

  // Step 5: Handle text-based quote markers
  // Some clients insert visible text markers like "-------- Message original --------"
  const textMarkers = [
    /[-_=]{3,}\s*(?:Original Message|Message original|Forwarded message|Message transféré)\s*[-_=]{3,}/gi,
    /[-_=]{3,}\s*(?:Reply|Réponse)\s*[-_=]{3,}/gi,
  ]

  textMarkers.forEach(marker => {
    const markerMatch = cleanHtml.match(marker)
    if (markerMatch) {
      // Remove everything from the marker to the end
      const markerIndex = cleanHtml.search(marker)
      if (markerIndex !== -1) {
        const remainingContent = cleanHtml.substring(markerIndex)
        quotedParts.push(remainingContent)
        cleanHtml = cleanHtml.substring(0, markerIndex)
        hasQuotedContent = true
      }
    }
  })

  // Step 6: Clean up empty elements and excessive whitespace
  cleanHtml = cleanHtml
    // Remove empty paragraphs and divs
    .replace(/<(p|div)[^>]*>\s*<\/\1>/gi, '')
    // Remove multiple consecutive <br> tags
    .replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>')
    // Trim whitespace
    .trim()

  // Build quoted HTML if we found any
  const quotedHtml = quotedParts.length > 0 ? quotedParts.join('\n') : undefined

  return {
    cleanHtml,
    hasQuotedContent,
    quotedHtml
  }
}

/**
 * Strip quotes from plain text email content
 *
 * @param text - The plain text content from the email
 * @returns Object containing clean text, quoted text, and whether quotes were found
 */
export function stripTextEmailQuotes(text: string): QuoteStrippingResult {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return {
      cleanHtml: '',
      hasQuotedContent: false
    }
  }

  const lines = text.split('\n')
  const cleanLines: string[] = []
  const quotedLines: string[] = []
  let inQuotedSection = false
  let hasQuotedContent = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check for quote start markers
    if (!inQuotedSection) {
      // Line-based quote indicator (> prefix)
      if (line.trim().startsWith('>')) {
        inQuotedSection = true
        hasQuotedContent = true
        quotedLines.push(line)
        continue
      }

      // Attribution line check
      if (isQuoteAttribution(line)) {
        inQuotedSection = true
        hasQuotedContent = true
        quotedLines.push(line)
        continue
      }

      // Text markers
      if (/[-_=]{3,}\s*(?:Original Message|Message original)/i.test(line)) {
        inQuotedSection = true
        hasQuotedContent = true
        quotedLines.push(line)
        continue
      }

      cleanLines.push(line)
    } else {
      quotedLines.push(line)
    }
  }

  return {
    cleanHtml: cleanLines.join('\n').trim(),
    hasQuotedContent,
    quotedHtml: quotedLines.length > 0 ? quotedLines.join('\n') : undefined
  }
}

/**
 * Determine if content should be stripped (heuristic check)
 * Returns false for emails that don't appear to be replies
 */
export function shouldStripQuotes(html: string): boolean {
  if (!html) return false

  // Quick checks for quote indicators
  const hasGmailQuote = /class="[^"]*gmail_quote/i.test(html)
  const hasOutlookQuote = /OutlookMessageHeader|divRplyFwdMsg/i.test(html)
  const hasBlockquote = /<blockquote/i.test(html)
  const hasAttribution = QUOTE_ATTRIBUTION_PATTERNS.some(p => p.test(html))

  return hasGmailQuote || hasOutlookQuote || hasBlockquote || hasAttribution
}
