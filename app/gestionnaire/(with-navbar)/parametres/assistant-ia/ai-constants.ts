import { AI_TIER_CONFIG, type AiTier } from '@/lib/stripe'

export interface PricingTier {
  id: AiTier
  name: string
  monthlyPrice: number
  annualPrice: number
  popular: boolean
}

export const PRICING_TIERS: PricingTier[] = [
  { id: 'solo', name: 'Solo', monthlyPrice: 49, annualPrice: 490, popular: false },
  { id: 'equipe', name: 'Equipe', monthlyPrice: 99, annualPrice: 990, popular: true },
  { id: 'agence', name: 'Agence', monthlyPrice: 199, annualPrice: 1990, popular: false },
]

// Top-up display prices derived from Stripe config (cents → EUR)
export const TOPUP_PRICES: Record<AiTier, number> = {
  solo: AI_TIER_CONFIG.solo.topupPrice / 100,
  equipe: AI_TIER_CONFIG.equipe.topupPrice / 100,
  agence: AI_TIER_CONFIG.agence.topupPrice / 100,
}

export const MAX_INSTRUCTIONS_LENGTH = 500
