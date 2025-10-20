/**
 * Helper function to create intervention quote requests
 *
 * Crée des demandes de devis pour les prestataires sélectionnés
 * Status: 'pending' = demande envoyée par manager, en attente de soumission
 * Quote type: 'estimation' = devis initial avant travaux
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'
import { logger } from '@/lib/logger'

interface CreateQuoteRequestsParams {
  interventionId: string
  teamId: string
  providerIds: string[]
  createdBy: string
  messageType?: 'global' | 'individual'
  globalMessage?: string
  individualMessages?: Record<string, string>
  supabase: SupabaseClient<Database>
}

interface QuoteRequestResult {
  success: boolean
  successCount: number
  failedCount: number
  results: Array<{
    providerId: string
    success: boolean
    quoteId?: string
    error?: any
  }>
}

export async function createQuoteRequestsForProviders(
  params: CreateQuoteRequestsParams
): Promise<QuoteRequestResult> {
  const {
    interventionId,
    teamId,
    providerIds,
    createdBy,
    messageType = 'global',
    globalMessage,
    individualMessages = {},
    supabase
  } = params

  logger.info(
    {
      interventionId,
      providerCount: providerIds.length
    },
    "💰 Creating quote requests for providers"
  )

  // Créer les quotes en parallèle
  const quotePromises = providerIds.map(async (providerId) => {
    try {
      // Déterminer le message pour ce prestataire
      const message = messageType === 'individual'
        ? individualMessages[providerId]
        : globalMessage

      // Préparer les données du quote
      const quoteData = {
        intervention_id: interventionId,
        provider_id: providerId,
        team_id: teamId,
        status: 'pending' as const,           // Demande envoyée, en attente
        quote_type: 'estimation' as const,    // ✅ CORRECTION: 'estimation' pas 'estimate'
        currency: 'EUR' as const,
        amount: 0,                             // Montant initial, sera rempli par prestataire
        description: message || null,
        valid_until: null,                     // Peut être défini plus tard
        created_by: createdBy,
        line_items: null                       // Sera rempli par prestataire
      }

      logger.info(
        {
          providerId,
          hasMessage: !!message
        },
        "📝 Creating quote request"
      )

      // INSERT dans la base
      const { data: quote, error: quoteError } = await supabase
        .from('intervention_quotes')
        .insert(quoteData)
        .select()
        .single()

      if (quoteError) {
        logger.error(
          {
            error: quoteError,
            providerId,
            code: quoteError.code,
            message: quoteError.message,
            details: quoteError.details
          },
          "❌ Failed to create quote request"
        )

        return {
          providerId,
          success: false,
          error: quoteError
        }
      }

      logger.info(
        {
          quoteId: quote.id,
          providerId
        },
        "✅ Quote request created successfully"
      )

      return {
        providerId,
        success: true,
        quoteId: quote.id
      }

    } catch (error) {
      logger.error(
        {
          error,
          providerId
        },
        "❌ Unexpected error creating quote request"
      )

      return {
        providerId,
        success: false,
        error
      }
    }
  })

  // Attendre tous les résultats
  const results = await Promise.all(quotePromises)

  // Calculer les statistiques
  const successCount = results.filter(r => r.success).length
  const failedCount = results.filter(r => !r.success).length

  logger.info(
    {
      total: providerIds.length,
      success: successCount,
      failed: failedCount
    },
    "📊 Quote requests creation summary"
  )

  return {
    success: failedCount === 0,
    successCount,
    failedCount,
    results
  }
}
