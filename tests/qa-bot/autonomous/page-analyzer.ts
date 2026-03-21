/**
 * QA Bot — Page Analyzer (Claude API integration)
 *
 * Captures the Playwright accessibility tree and sends it to Claude API
 * to determine which interactive elements to test on each page.
 *
 * Uses page.accessibility.snapshot() (2-5 KB) instead of screenshots
 * for 20-50x token savings.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { Page } from 'playwright'
import type { BudgetLimiter } from './budget-limiter'

// ── Types ──

export interface SuggestedAction {
  type: 'click' | 'fill' | 'select'
  target: string
  value?: string
  reason: string
}

interface AnalysisResult {
  actions: SuggestedAction[]
  inputTokens: number
  outputTokens: number
}

// ── Constants ──

const MODEL = 'claude-sonnet-4-20250514'
const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 1000

const SYSTEM_PROMPT = `You are a QA tester for SEIDO, a French real estate management application (gestion immobiliere). The app is used by property managers (gestionnaires), tenants (locataires), and service providers (prestataires).

Your job is to analyze the accessibility tree of a page and suggest interactive elements to test, prioritizing those most likely to reveal bugs.

Rules:
- Prioritize: form submissions, status-changing buttons, navigation links, modal triggers, dropdowns, tab switches
- Skip: logout/deconnexion buttons, delete account, external links (mailto:, tel:, http:// to other domains), language toggles
- For forms: suggest filling inputs with realistic French data (names, addresses, phone numbers)
- For dropdowns/selects: suggest selecting the first non-default option
- Limit to max 10 actions per page — focus on the most impactful
- Return ONLY valid JSON, no markdown formatting`

// ── Client ──

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

// ── Main function ──

/**
 * Analyze a page's accessibility tree and return suggested actions.
 * Handles rate limiting with exponential backoff.
 */
export async function analyzePage(
  page: Page,
  budget: BudgetLimiter,
): Promise<SuggestedAction[]> {
  const url = page.url()

  // Capture accessibility tree
  const snapshot = await page.accessibility.snapshot()
  if (!snapshot) {
    console.log(`[analyzer] No accessibility tree for ${url}`)
    return []
  }

  const accessibilityTree = formatAccessibilityTree(snapshot)
  if (accessibilityTree.length < 50) {
    console.log(`[analyzer] Accessibility tree too small for ${url} (${accessibilityTree.length} chars)`)
    return []
  }

  const userPrompt = `You are a QA tester for a French real estate management app (SEIDO).
Here is the accessibility tree of the current page at URL: ${url}

${accessibilityTree}

List all interactive elements (buttons, links, inputs, dropdowns) and suggest which ones to click/interact with to test functionality.
Return a JSON array of actions:
[{ "type": "click"|"fill"|"select", "target": "accessible name or role", "value": "for fill/select", "reason": "why test this" }]

Prioritize: form submissions, status-changing buttons, navigation links, modal triggers.
Skip: logout, delete account, external links.`

  // Call Claude API with retry/backoff
  const result = await callClaudeWithRetry(userPrompt, budget)
  if (!result) return []

  return result.actions
}

async function callClaudeWithRetry(
  prompt: string,
  budget: BudgetLimiter,
): Promise<AnalysisResult | null> {
  let backoffMs = INITIAL_BACKOFF_MS

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const anthropic = getClient()

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      })

      // Extract token usage
      const inputTokens = response.usage.input_tokens
      const outputTokens = response.usage.output_tokens
      budget.recordApiCall(inputTokens, outputTokens)

      // Parse response
      const textBlock = response.content.find(block => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        console.log('[analyzer] No text response from Claude')
        return null
      }

      const actions = parseActions(textBlock.text)
      return { actions, inputTokens, outputTokens }

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)

      // Rate limit — retry with backoff
      if (message.includes('rate_limit') || message.includes('429')) {
        console.log(`[analyzer] Rate limited (attempt ${attempt}/${MAX_RETRIES}), waiting ${backoffMs}ms...`)
        await sleep(backoffMs)
        backoffMs *= 2
        continue
      }

      // Overloaded — retry with backoff
      if (message.includes('overloaded') || message.includes('529')) {
        console.log(`[analyzer] API overloaded (attempt ${attempt}/${MAX_RETRIES}), waiting ${backoffMs}ms...`)
        await sleep(backoffMs)
        backoffMs *= 2
        continue
      }

      // Other error — log and return empty
      console.log(`[analyzer] Claude API error: ${message}`)
      return null
    }
  }

  console.log('[analyzer] All retry attempts exhausted')
  return null
}

// ── Helpers ──

/**
 * Format the accessibility tree into a compact string representation.
 * Filters out non-interactive and invisible elements to reduce token count.
 */
function formatAccessibilityTree(node: AccessibilityNode, depth = 0): string {
  const indent = '  '.repeat(depth)
  const parts: string[] = []

  const role = node.role || ''
  const name = node.name || ''
  const value = node.value || ''

  // Skip generic/structural roles that don't add value
  const skipRoles = ['generic', 'none', 'presentation', 'group', 'paragraph']
  const isSkippable = skipRoles.includes(role) && !name

  if (!isSkippable) {
    let line = `${indent}[${role}]`
    if (name) line += ` "${name}"`
    if (value) line += ` value="${value}"`
    if (node.disabled) line += ' (disabled)'
    if (node.checked !== undefined) line += ` checked=${node.checked}`
    if (node.pressed !== undefined) line += ` pressed=${node.pressed}`
    if (node.expanded !== undefined) line += ` expanded=${node.expanded}`
    if (node.selected !== undefined) line += ` selected=${node.selected}`

    parts.push(line)
  }

  // Recurse into children
  if (node.children) {
    for (const child of node.children) {
      const childTree = formatAccessibilityTree(child, isSkippable ? depth : depth + 1)
      if (childTree) parts.push(childTree)
    }
  }

  return parts.join('\n')
}

/**
 * Parse Claude's JSON response into typed actions.
 * Handles edge cases: markdown code blocks, trailing commas, etc.
 */
function parseActions(text: string): SuggestedAction[] {
  // Strip markdown code blocks if present
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  // Remove trailing commas before ] (common LLM output issue)
  cleaned = cleaned.replace(/,\s*]/g, ']')

  try {
    const parsed = JSON.parse(cleaned)

    if (!Array.isArray(parsed)) {
      console.log('[analyzer] Response is not a JSON array')
      return []
    }

    // Validate and filter actions
    return parsed.filter((action: Record<string, unknown>) => {
      if (!action || typeof action !== 'object') return false
      if (!['click', 'fill', 'select'].includes(action.type as string)) return false
      if (!action.target || typeof action.target !== 'string') return false
      return true
    }).map((action: Record<string, unknown>) => ({
      type: action.type as SuggestedAction['type'],
      target: action.target as string,
      value: action.value as string | undefined,
      reason: (action.reason as string) || '',
    }))
  } catch {
    console.log(`[analyzer] Failed to parse Claude response as JSON: ${cleaned.slice(0, 200)}`)
    return []
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Playwright accessibility snapshot node type
interface AccessibilityNode {
  role?: string
  name?: string
  value?: string
  disabled?: boolean
  checked?: boolean | 'mixed'
  pressed?: boolean | 'mixed'
  expanded?: boolean
  selected?: boolean
  children?: AccessibilityNode[]
}
