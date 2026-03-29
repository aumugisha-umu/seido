import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { AI_TIER_CONFIG, type AiTier } from '@/lib/stripe'
import { logger } from '@/lib/logger'

// =============================================================================
// Consumption Engine — Proportional minute/conversation tracking
// =============================================================================
// Ratio: 1 minute = 5/3 conversations (universal across all tiers)
// Voice calls deduct minutes + cross-deduct conversations
// Text conversations deduct conversations + cross-deduct minutes
// Auto-topup triggers Stripe charge when quota exhausted (if enabled)
// =============================================================================

export interface UsageResult {
  minutesRemaining: number
  conversationsRemaining: number
  quotaExhausted: boolean
}

interface TeamAiConfig {
  tier: AiTier
  autoTopup: boolean
}

/** ISO date string for the first day of the current month (YYYY-MM-01) */
function getCurrentMonthKey(): string {
  return new Date().toISOString().slice(0, 7) + '-01'
}

/**
 * Record voice call usage (called from ElevenLabs webhook).
 * Atomically increments minutes + cross-deducts conversations via SQL RPC.
 * Triggers auto-topup if quota exhausted and auto_topup enabled.
 */
export async function recordVoiceUsage(
  teamId: string,
  minutes: number,
): Promise<UsageResult> {
  return recordUsage('voice', teamId, minutes)
}

/**
 * Record conversation usage (called from WhatsApp/SMS session completion).
 * Atomically increments conversations + cross-deducts minutes via SQL RPC.
 */
export async function recordConversationUsage(
  teamId: string,
  count: number = 1,
): Promise<UsageResult> {
  return recordUsage('conversation', teamId, count)
}

// =============================================================================
// Internal helpers
// =============================================================================

type UsageType = 'voice' | 'conversation'

async function recordUsage(
  type: UsageType,
  teamId: string,
  amount: number,
): Promise<UsageResult> {
  const supabase = createServiceRoleSupabaseClient()
  const currentMonth = getCurrentMonthKey()

  const config = await getTeamAiConfig(supabase, teamId)
  const tierConfig = AI_TIER_CONFIG[config.tier]

  const rpcName = type === 'voice' ? 'record_voice_usage' : 'record_conversation_usage'
  const rpcParams = type === 'voice'
    ? { p_team_id: teamId, p_month: currentMonth, p_minutes: amount, p_minutes_included: tierConfig.minutes, p_conversations_included: tierConfig.conversations }
    : { p_team_id: teamId, p_month: currentMonth, p_conversations: amount, p_minutes_included: tierConfig.minutes, p_conversations_included: tierConfig.conversations }

  const { data, error } = await supabase.rpc(rpcName, rpcParams)

  if (error) {
    logger.error({ error, teamId, type, amount }, `[CONSUMPTION] ${rpcName} RPC failed`)
    return { minutesRemaining: 0, conversationsRemaining: 0, quotaExhausted: false }
  }

  const result = Array.isArray(data) ? data[0] : data
  const usageResult: UsageResult = {
    minutesRemaining: Number(result?.minutes_remaining ?? 0),
    conversationsRemaining: Number(result?.conversations_remaining ?? 0),
    quotaExhausted: result?.quota_exhausted ?? false,
  }

  logger.info(
    { teamId, type, amount, ...usageResult },
    `[CONSUMPTION] ${type === 'voice' ? 'Voice' : 'Conversation'} usage recorded`,
  )

  if (usageResult.quotaExhausted && config.autoTopup) {
    await chargeAutoTopup(supabase, teamId, currentMonth, config.tier)
  }

  return usageResult
}

/**
 * Single query to get tier + auto_topup — avoids redundant DB round-trips.
 */
async function getTeamAiConfig(
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  teamId: string,
): Promise<TeamAiConfig> {
  const { data } = await supabase
    .from('ai_phone_numbers')
    .select('ai_tier, auto_topup')
    .eq('team_id', teamId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  return {
    tier: (data?.ai_tier as AiTier) ?? 'solo',
    autoTopup: data?.auto_topup ?? false,
  }
}

/**
 * Charges Stripe for a topup pack and applies credits to the DB.
 */
async function chargeAutoTopup(
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  teamId: string,
  currentMonth: string,
  tier: AiTier,
): Promise<void> {
  const tierConfig = AI_TIER_CONFIG[tier]

  try {
    const { getStripe } = await import('@/lib/stripe')
    const stripe = getStripe()

    const { StripeCustomerRepository } = await import('@/lib/services/repositories/stripe-customer.repository')
    const custRepo = new StripeCustomerRepository(supabase)
    const { data: cust } = await custRepo.findByTeamId(teamId)

    if (!cust?.stripe_customer_id) {
      logger.warn({ teamId }, '[CONSUMPTION] Auto-topup failed — no Stripe customer')
      return
    }

    // Create one-off invoice item + pay immediately
    await stripe.invoiceItems.create({
      customer: cust.stripe_customer_id,
      amount: tierConfig.topupPrice,
      currency: 'eur',
      description: `Recharge automatique — ${tierConfig.topupMinutes} min + ${tierConfig.topupConversations} conv`,
    })

    const invoice = await stripe.invoices.create({
      customer: cust.stripe_customer_id,
      auto_advance: true,
    })
    await stripe.invoices.pay(invoice.id)

    // Apply credits in DB
    await supabase.rpc('apply_topup_credits', {
      p_team_id: teamId,
      p_month: currentMonth,
      p_minutes: tierConfig.topupMinutes,
      p_conversations: tierConfig.topupConversations,
    })

    logger.info(
      { teamId, tier, minutes: tierConfig.topupMinutes, conversations: tierConfig.topupConversations },
      '[CONSUMPTION] Auto-topup charged and credits applied',
    )
  } catch (err) {
    logger.error({ err, teamId }, '[CONSUMPTION] Auto-topup failed')
  }
}
