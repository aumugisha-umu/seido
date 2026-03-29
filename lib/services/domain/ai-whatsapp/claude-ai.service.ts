import { generateText, Output } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import type {
  MessageChannel,
  SessionExtractedData,
  ConversationMessage,
  ClaudeResponse,
} from './types'

// ============================================================================
// Claude response schema (AI SDK 6.x — Output.object)
// ============================================================================

const claudeResponseSchema = z.object({
  text: z.string().describe('The message to send to the tenant'),
  conversation_complete: z.boolean().describe('true when step 4 (closure) is done'),
  extracted_data: z.object({
    caller_name: z.string().optional(),
    address: z.string().optional(),
    problem_description: z.string().optional(),
    urgency: z.enum(['basse', 'normale', 'haute', 'urgente']).optional(),
    additional_notes: z.string().optional(),
  }).optional().describe('Data extracted from this message'),
})

// ============================================================================
// Claude AI call
// ============================================================================

export interface CallClaudeOptions {
  messages: ConversationMessage[]
  teamName: string
  customInstructions: string | null
  extractedData: SessionExtractedData
  image?: { base64: string; contentType: string }
  channel?: MessageChannel
}

export const callClaude = async (opts: CallClaudeOptions): Promise<ClaudeResponse> => {
  const systemPrompt = buildSystemPrompt(opts.teamName, opts.customInstructions, opts.extractedData, opts.channel ?? 'whatsapp')

  // Build AI SDK messages from conversation history
  const aiMessages = opts.messages.map((m) => {
    if (m.role === 'user' && opts.image && m === opts.messages[opts.messages.length - 1] && m.media_type === 'image') {
      // Last message with image → multimodal
      return {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: m.content || 'Le locataire a envoye cette photo.' },
          {
            type: 'image' as const,
            image: opts.image.base64,
            mimeType: opts.image.contentType,
          },
        ],
      }
    }
    return { role: m.role, content: m.content }
  })

  const result = await generateText({
    model: anthropic('claude-haiku-4-5'),
    system: systemPrompt,
    messages: aiMessages,
    output: Output.object({ schema: claudeResponseSchema }),
    temperature: 0.2,
    maxTokens: 400,
  })

  if (!result.output) {
    // Fallback: if structured output fails, use raw text
    logger.warn('[WA-ENGINE] Claude structured output failed — using fallback')
    return {
      text: result.text || 'Desole, je rencontre un probleme technique. Veuillez reessayer.',
      conversation_complete: false,
    }
  }

  return result.output
}

// ============================================================================
// System prompt
// ============================================================================

const buildSystemPrompt = (
  teamName: string,
  customInstructions: string | null,
  extractedData: SessionExtractedData,
  channel: MessageChannel = 'whatsapp'
): string => {
  const channelName = channel === 'sms' ? 'SMS' : 'WhatsApp'
  const lengthRule = channel === 'sms'
    ? '- Tes reponses font maximum 1-2 phrases courtes. SMS = 160 caracteres par segment, sois tres concis.'
    : '- Tes reponses font maximum 2-3 phrases. WhatsApp = messages courts.'

  let prompt = `Tu es un assistant ${channelName} de prise de demandes d'intervention pour ${teamName}.

## Ton role
Tu collectes les informations necessaires pour creer une demande d'intervention de maintenance. Tu ne donnes JAMAIS de conseils techniques, d'estimation de prix, ni de decision sur l'urgence ou le prestataire.

## Regles strictes
${lengthRule}
- Tu reponds dans la langue du locataire (francais, neerlandais ou anglais).
- Si tu ne comprends pas, demande de reformuler.
- Propose d'envoyer une photo quand c'est pertinent (fuite, degat, casse).
- Si le locataire mentionne un danger (gaz, incendie, inondation), dis immediatement : "Si vous etes en danger, appelez le 112." puis continue avec urgence "urgente".
- Si le locataire parle d'un sujet hors-intervention, redirige poliment.
- Si le locataire envoie une note vocale, reponds : "Je ne peux pas ecouter les messages vocaux pour le moment. Pourriez-vous decrire votre probleme par ecrit ? Merci !"

## Script (4 etapes)
ETAPE 1 — IDENTIFICATION : Demande le nom complet et l'adresse du logement.
ETAPE 2 — DESCRIPTION : "Quel est le probleme ?" + propose une photo.
ETAPE 3 — CONFIRMATION : Resume (nom, adresse, probleme) et demande confirmation.
ETAPE 4 — CLOTURE : Confirme l'enregistrement, remercie. Met conversation_complete a true.

## Format de reponse
TOUJOURS repondre avec un objet JSON :
- text: le message a envoyer
- conversation_complete: true uniquement apres confirmation a l'etape 3
- extracted_data: donnees extraites de ce message (cumulatif)`

  if (extractedData.caller_name || extractedData.address || extractedData.problem_description) {
    prompt += `\n\n## Donnees deja collectees\n`
    if (extractedData.caller_name) prompt += `- Nom: ${extractedData.caller_name}\n`
    if (extractedData.address) prompt += `- Adresse: ${extractedData.address}\n`
    if (extractedData.problem_description) prompt += `- Probleme: ${extractedData.problem_description}\n`
    if (extractedData.urgency) prompt += `- Urgence: ${extractedData.urgency}\n`
  }

  if (customInstructions) {
    prompt += `\n\n## Instructions specifiques de l'equipe\n${customInstructions}`
  }

  return prompt
}

// ============================================================================
// Helpers
// ============================================================================

export const getTeamName = async (
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  teamId: string | null
): Promise<string> => {
  if (!teamId) return 'Votre gestionnaire'
  const { data } = await supabase
    .from('teams')
    .select('name')
    .eq('id', teamId)
    .single()
  return data?.name ?? 'Votre gestionnaire'
}

export const detectLanguage = (text: string): 'fr' | 'nl' | 'en' => {
  const lower = text.toLowerCase()
  const nlWords = ['hallo', 'goedendag', 'probleem', 'lekkage', 'verwarming', 'dank', 'huis']
  const enWords = ['hello', 'hi', 'problem', 'leak', 'heating', 'thanks', 'house']
  if (nlWords.some(w => lower.includes(w))) return 'nl'
  if (enWords.some(w => lower.includes(w))) return 'en'
  return 'fr'
}
