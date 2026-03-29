import { logger } from '@/lib/logger'

// ============================================================================
// Types
// ============================================================================

export interface ElevenLabsAgent {
  agent_id: string
  name: string
}

export class ElevenLabsProvisioningError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'CREATE_AGENT_FAILED'
      | 'UPDATE_AGENT_FAILED'
      | 'DELETE_AGENT_FAILED'
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
})

async function elevenLabsRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
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

  return response
}

/** Fetch ElevenLabs API and parse JSON response. */
const elevenLabsFetch = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await elevenLabsRequest(path, options)
  const text = await response.text()
  return text ? (JSON.parse(text) as T) : ({} as T)
}

/** Fetch ElevenLabs API and return raw text (for TwiML responses). */
const elevenLabsFetchRaw = async (
  path: string,
  options: RequestInit = {}
): Promise<string> => {
  const response = await elevenLabsRequest(path, options)
  return response.text()
}

// ============================================================================
// System Prompt Template
// ============================================================================

// Dynamic variables injected at call registration time by the voice webhook:
// {{team_name}}             — agency name (always set, fallback: "Votre gestionnaire")
// {{caller_name}}           — caller's name if known (empty string if unknown)
// {{caller_address}}        — caller's address if known (empty string if unknown)
// {{conversation_history}}  — summary of previous conversations (empty string if none)
// {{custom_instructions}}   — team-specific instructions (empty string if none)

const SYSTEM_PROMPT_TEMPLATE = `Tu es un assistant telephonique de prise de demandes d'intervention pour {{team_name}}.

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
- Si le locataire demande le suivi d'une demande existante, dis : "Pour suivre
  vos demandes et communiquer avec votre gestionnaire, rendez-vous sur votre
  compte sur seido-app.com." Ne cree PAS de nouvelle intervention.

## Script
ETAPE 1 — IDENTIFICATION
Si le nom "{{caller_name}}" et l'adresse "{{caller_address}}" sont deja connus,
salue l'utilisateur par son prenom et passe DIRECTEMENT a l'etape 2.
Si seul le nom "{{caller_name}}" est connu, demande UNIQUEMENT l'adresse.
Si seule l'adresse "{{caller_address}}" est connue, demande UNIQUEMENT le nom.
Si rien n'est connu, demande le nom complet et l'adresse du logement.

ETAPE 2 — DESCRIPTION DU PROBLEME
"Quel est le probleme que vous souhaitez signaler ?"
Laisse le locataire decrire librement. Utilise des backchannels : "Je
comprends.", "D'accord."
Et selon la situation decrite, demander plus de precisions pour que le
gestionnaire ait une vue complete du probleme.

ETAPE 3 — CONFIRMATION
Lis un resume de ce que tu as note (nom, adresse, probleme) et demande :
"Est-ce que c'est correct ?"
Si non, demande ce qu'il faut corriger et reconfirme.
Si oui, demande : "Y a-t-il autre chose a preciser ?" Si le locataire ajoute
des details, reconfirme le resume mis a jour. Sinon, passe a l'etape 4.

ETAPE 4 — CLOTURE
"Votre demande a bien ete enregistree. Votre gestionnaire sera notifie et
traitera votre demande au plus vite. Bonne journee, au revoir !"

{{conversation_history}}
{{custom_instructions}}`

/**
 * Builds the system prompt for agent creation.
 *
 * Dynamic variables ({{team_name}}, {{caller_name}}, {{caller_address}},
 * {{conversation_history}}) are LEFT as placeholders — ElevenLabs resolves
 * them at call registration time via `dynamic_variables`.
 *
 * Only {{custom_instructions}} is replaced here because it's baked into
 * the agent config at creation/update time.
 */
export const buildSystemPrompt = (
  customInstructions?: string | null
): string => {
  let prompt = SYSTEM_PROMPT_TEMPLATE

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
  const systemPrompt = buildSystemPrompt(customInstructions)

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
        first_message: 'Bonjour, vous avez contacte {{team_name}}. Je suis l\'assistant vocal pour les demandes d\'intervention. Comment puis-je vous aider ?',
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
  customInstructions?: string | null
): Promise<void> => {
  const systemPrompt = buildSystemPrompt(customInstructions)

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

/**
 * Registers an inbound Twilio call with ElevenLabs and returns TwiML.
 * The returned XML is passed directly to Twilio as the webhook response.
 * Dynamic variables are resolved by ElevenLabs against the agent's prompt template.
 */
export const registerTwilioCall = async (
  agentId: string,
  fromNumber: string,
  toNumber: string,
  dynamicVariables: Record<string, string>
): Promise<string> => {
  return elevenLabsFetchRaw('/convai/twilio/register-call', {
    method: 'POST',
    body: JSON.stringify({
      agent_id: agentId,
      from_number: fromNumber,
      to_number: toNumber,
      direction: 'inbound',
      conversation_initiation_client_data: {
        dynamic_variables: dynamicVariables,
      },
    }),
  })
}
