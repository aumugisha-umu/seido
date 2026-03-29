import { AI_TIER_CONFIG, type AiTier } from '@/lib/stripe'

export interface PricingTier {
  id: AiTier
  name: string
  monthlyPrice: number
  annualPrice: number
  popular: boolean
}

export const PRICING_TIERS: PricingTier[] = [
  { id: 'solo', name: 'Solo', monthlyPrice: 49, annualPrice: 499, popular: false },
  { id: 'equipe', name: 'Equipe', monthlyPrice: 99, annualPrice: 999, popular: true },
  { id: 'agence', name: 'Agence', monthlyPrice: 199, annualPrice: 1999, popular: false },
]

// Top-up pack display prices derived from Stripe config (cents → EUR)
export const TOPUP_PRICES: Record<AiTier, number> = {
  solo: AI_TIER_CONFIG.solo.topupPrice / 100,
  equipe: AI_TIER_CONFIG.equipe.topupPrice / 100,
  agence: AI_TIER_CONFIG.agence.topupPrice / 100,
}

// Top-up pack composition (same for all tiers)
export const TOPUP_PACK = {
  minutes: AI_TIER_CONFIG.solo.topupMinutes,
  conversations: AI_TIER_CONFIG.solo.topupConversations,
} as const

export const MAX_INSTRUCTIONS_LENGTH = 500
