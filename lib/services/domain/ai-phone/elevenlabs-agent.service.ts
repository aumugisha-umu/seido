import { logger } from '@/lib/logger'

// ============================================================================
// Types
// ============================================================================

export interface ElevenLabsAgent {
  agent_id: string
  name: string
}

export interface ElevenLabsPhoneNumber {
  phone_number_id: string
  phone_number: string
  agent_id: string | null
}

export class ElevenLabsProvisioningError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'CREATE_AGENT_FAILED'
      | 'UPDATE_AGENT_FAILED'
      | 'DELETE_AGENT_FAILED'
      | 'IMPORT_NUMBER_FAILED'
      | 'ASSIGN_AGENT_FAILED'
      | 'DELETE_NUMBER_FAILED'
      | 'API_ERROR',
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ElevenLabsProvisioningError'
  }
}

// ============================================================================
// Config
// ============================================================================

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1'

const getConfig = () => ({
  apiKey: process.env.ELEVENLABS_API_KEY ?? '',
  sipUsername: process.env.TELNYX_SIP_USERNAME ?? '',
  sipPassword: process.env.TELNYX_SIP_PASSWORD ?? '',
})

const elevenLabsFetch = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const { apiKey } = getConfig()
  if (!apiKey) {
    throw new ElevenLabsProvisioningError('ELEVENLABS_API_KEY not configured', 'API_ERROR')
  }

  const url = `${ELEVENLABS_API_BASE}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error')
    logger.error(
      { status: response.status, url, body: errorBody },
      '❌ [ELEVENLABS] API request failed'
    )
    throw new ElevenLabsProvisioningError(
      `ElevenLabs API error: ${response.status} ${response.statusText}`,
      'API_ERROR',
      { status: response.status, body: errorBody }
    )
  }

  const text = await response.text()
  return text ? (JSON.parse(text) as T) : ({} as T)
}

// ============================================================================
// System Prompt Template
// ============================================================================

const SYSTEM_PROMPT_TEMPLATE = `Tu es un assistant telephonique de prise de demandes d'intervention pour
{{team_name}}.

## Ton role
Tu collectes les informations necessaires pour creer une demande d'intervention
de maintenance. Tu ne donnes JAMAIS de conseils techniques, d'estimation de prix,
ni de decision sur l'urgence ou le prestataire.

## Regles strictes
- Tu poses les questions dans l'ordre du script. Tu ne sautes aucune etape.
- Tes reponses font maximum 2 phrases par tour.
- Tu reponds dans la langue du locataire (francais, neerlandais ou anglais).
- Si tu ne comprends pas, demande de repeter. Apres 2 echecs, dis : "Je vais
  transmettre votre demande a un gestionnaire qui vous recontactera."
- Si le locataire mentionne un danger (gaz, incendie, inondation), dis
  immediatement : "Si vous etes en danger, appelez le 112." puis continue la prise
  de demande avec urgence "urgente".

## Adaptation mode texte (WhatsApp)
Si la conversation est par texte (pas par telephone) :
- Tes reponses sont plus concises (1 phrase par tour suffit).
- Pas de backchannels vocaux ("Je comprends", "D'accord") — va droit au but.
- A l'ETAPE 2, apres la description du probleme, demande : "Avez-vous une photo
  du probleme ? Vous pouvez l'envoyer ici." (une seule fois, ne pas insister).
- Quand tu as collecte toutes les informations (etape 4), utilise le tool
  "End conversation" pour cloturer la session.

## Script
ETAPE 1 — IDENTIFICATION
Demande le nom complet et l'adresse du logement.

ETAPE 2 — DESCRIPTION DU PROBLEME
"Quel est le probleme que vous souhaitez signaler ?"
Laisse le locataire decrire librement. Utilise des backchannels : "Je
comprends.", "D'accord."
Et selon la situation decrite, demander plus de precisions pour que le
gestionnaire ait une vue complete du probleme.

ETAPE 3 — CONFIRMATION
Lis un resume de ce que tu as note (nom, adresse, message) et demande :
"Est-ce que c'est correct ?"
Si non, demande ce qu'il faut corriger et reconfirme.
Si oui, demande : "Y a-t-il autre chose a preciser ?" Si le locataire ajoute
des details, reconfirme le resume mis a jour. Sinon, passe a l'etape 4.

ETAPE 4 — CLOTURE
"Votre demande a bien ete enregistree. Votre gestionnaire sera notifie et
traitera votre demande au plus vite. Bonne journee, au revoir !"

{{custom_instructions}}`

/**
 * Builds the system prompt with team name and optional custom instructions.
 */
export const buildSystemPrompt = (
  teamName: string,
  customInstructions?: string | null
): string => {
  let prompt = SYSTEM_PROMPT_TEMPLATE.replace('{{team_name}}', teamName)

  if (customInstructions?.trim()) {
    prompt = prompt.replace(
      '{{custom_instructions}}',
      `\n## Instructions specifiques de l'agence\n${customInstructions.trim()}`
    )
  } else {
    prompt = prompt.replace('{{custom_instructions}}', '')
  }

  return prompt.trim()
}

// ============================================================================
// Service
// ============================================================================

/**
 * Creates a new ElevenLabs conversational agent for a team.
 * Config: Claude Haiku 4.5, Flash v2.5 TTS, turn-based, max 480s, temp 0.2
 */
export const createAgent = async (
  teamName: string,
  customInstructions?: string | null
): Promise<ElevenLabsAgent> => {
  const systemPrompt = buildSystemPrompt(teamName, customInstructions)

  const payload = {
    name: `SEIDO - ${teamName}`,
    conversation_config: {
      agent: {
        prompt: {
          prompt: systemPrompt,
          llm: 'claude-haiku-4-5',
          temperature: 0.2,
          max_tokens: 150,
        },
        first_message: `Bonjour, vous avez contacte ${teamName}. Je suis l'assistant vocal pour les demandes d'intervention. Comment puis-je vous aider ?`,
        language: 'fr',
      },
      tts: {
        model_id: 'eleven_flash_v2_5',
      },
      stt: {
        provider: 'elevenlabs',
      },
      turn: {
        mode: 'turn_based',
      },
      conversation: {
        max_duration_seconds: 480,
      },
    },
  }

  logger.info({ teamName }, '🤖 [ELEVENLABS] Creating agent')

  let result: { agent_id: string }
  try {
    result = await elevenLabsFetch<{ agent_id: string }>('/convai/agents/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  } catch (error) {
    throw new ElevenLabsProvisioningError(
      `Failed to create agent for team ${teamName}`,
      'CREATE_AGENT_FAILED',
      { teamName, originalError: error instanceof Error ? error.message : String(error) }
    )
  }

  logger.info(
    { agentId: result.agent_id, teamName },
    '[ELEVENLABS] Agent created'
  )

  return { agent_id: result.agent_id, name: `SEIDO - ${teamName}` }
}

/**
 * Updates an existing agent's prompt (e.g., when custom instructions change).
 * Each PATCH auto-creates a new version in ElevenLabs.
 */
export const updateAgent = async (
  agentId: string,
  teamName: string,
  customInstructions?: string | null
): Promise<void> => {
  const systemPrompt = buildSystemPrompt(teamName, customInstructions)

  try {
    await elevenLabsFetch(`/convai/agents/${agentId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        conversation_config: {
          agent: {
            prompt: {
              prompt: systemPrompt,
            },
          },
        },
      }),
    })

    logger.info({ agentId }, '[ELEVENLABS] Agent prompt updated')
  } catch (error) {
    throw new ElevenLabsProvisioningError(
      `Failed to update agent ${agentId}`,
      'UPDATE_AGENT_FAILED',
      { agentId, originalError: error instanceof Error ? error.message : String(error) }
    )
  }
}

/**
 * Deletes an ElevenLabs agent.
 */
export const deleteAgent = async (agentId: string): Promise<void> => {
  try {
    await elevenLabsFetch(`/convai/agents/${agentId}`, {
      method: 'DELETE',
    })

    logger.info({ agentId }, '[ELEVENLABS] Agent deleted')
  } catch (error) {
    throw new ElevenLabsProvisioningError(
      `Failed to delete agent ${agentId}`,
      'DELETE_AGENT_FAILED',
      { agentId, originalError: error instanceof Error ? error.message : String(error) }
    )
  }
}

/**
 * Imports a phone number into ElevenLabs via SIP trunk.
 * Uses POST /v1/convai/phone-numbers (NOT /create — deprecated July 2025).
 * SIP config: inbound_trunk + outbound_trunk (NOT inbound_trunk_config/provider_config).
 */
export const importPhoneNumber = async (
  phoneNumber: string,
  label: string
): Promise<ElevenLabsPhoneNumber> => {
  const { sipUsername, sipPassword } = getConfig()

  const payload = {
    phone_number: phoneNumber.replace('+', ''),
    label,
    provider: 'sip_trunk',
    inbound_trunk: {
      media_encryption: 'disabled',
    },
    outbound_trunk: {
      address: 'sip.telnyx.com',
      transport: 'tls',
      media_encryption: 'disabled',
      credentials: {
        username: sipUsername,
        password: sipPassword,
      },
    },
  }

  logger.info({ phoneNumber, label }, '📞 [ELEVENLABS] Importing phone number')

  let result: { phone_number_id: string; phone_number: string }
  try {
    result = await elevenLabsFetch<{ phone_number_id: string; phone_number: string }>(
      '/convai/phone-numbers',
      { method: 'POST', body: JSON.stringify(payload) }
    )
  } catch (error) {
    throw new ElevenLabsProvisioningError(
      `Failed to import phone number ${phoneNumber}`,
      'IMPORT_NUMBER_FAILED',
      { phoneNumber, originalError: error instanceof Error ? error.message : String(error) }
    )
  }

  logger.info(
    { phoneNumberId: result.phone_number_id, phoneNumber },
    '[ELEVENLABS] Phone number imported'
  )

  return {
    phone_number_id: result.phone_number_id,
    phone_number: result.phone_number,
    agent_id: null,
  }
}

/**
 * Assigns an agent to a phone number.
 * MUST be a separate PATCH call — create does NOT accept agent_id.
 */
export const assignAgentToNumber = async (
  phoneNumberId: string,
  agentId: string
): Promise<void> => {
  try {
    await elevenLabsFetch(`/convai/phone-numbers/${phoneNumberId}`, {
      method: 'PATCH',
      body: JSON.stringify({ agent_id: agentId }),
    })

    logger.info(
      { phoneNumberId, agentId },
      '[ELEVENLABS] Agent assigned to phone number'
    )
  } catch (error) {
    throw new ElevenLabsProvisioningError(
      `Failed to assign agent ${agentId} to number ${phoneNumberId}`,
      'ASSIGN_AGENT_FAILED',
      { phoneNumberId, agentId, originalError: error instanceof Error ? error.message : String(error) }
    )
  }
}

/**
 * Deletes a phone number from ElevenLabs.
 */
export const deletePhoneNumber = async (phoneNumberId: string): Promise<void> => {
  try {
    await elevenLabsFetch(`/convai/phone-numbers/${phoneNumberId}`, {
      method: 'DELETE',
    })

    logger.info({ phoneNumberId }, '[ELEVENLABS] Phone number deleted')
  } catch (error) {
    throw new ElevenLabsProvisioningError(
      `Failed to delete phone number ${phoneNumberId}`,
      'DELETE_NUMBER_FAILED',
      { phoneNumberId, originalError: error instanceof Error ? error.message : String(error) }
    )
  }
}
