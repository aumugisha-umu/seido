# AI Phone Assistant — Self-Service Design

**Date** : 2026-03-01
**Statut** : Design valide, pret pour implementation
**Ref** : `docs/AI/ai-phone-assistant-plan.md` (plan technique v3.5)
**Derniere review** : 2026-03-02 (audit technique complet — alignement plan v3.6)

---

## Contexte

Le plan technique v3.0 couvre la configuration manuelle (1 numero, 1 agent, 1 equipe).
Ce design etend le plan pour supporter le **self-service multi-tenant** :
un gestionnaire souscrit a l'add-on, recoit un numero auto-provisionne (telephone + WhatsApp),
peut personnaliser le prompt, et les transcriptions sont routees vers son compte.

---

## Table des matieres

1. [Architecture multi-tenant](#1--architecture-multi-tenant)
2. [Provisioning automatique](#2--provisioning-automatique)
3. [Mode Dev vs Production](#3--mode-dev-vs-production)
4. [Page Settings gestionnaire](#4--page-settings-gestionnaire)
5. [Webhook routing](#5--webhook-routing)
6. [System prompt](#6--system-prompt)
7. [Testing](#7--testing)

---

## 1 — Architecture multi-tenant

### Decision : Agent clone par equipe

Chaque equipe recoit **son propre agent ElevenLabs** (clone du template).

**Raisons :**
- Isolation totale des prompts — chaque gestionnaire customise son agent
- Pas de risque de collision entre equipes
- Les metriques ElevenLabs sont isolees par agent
- Le `first_message` et les `instructions` sont specifiques a chaque equipe

**Alternative rejetee :** Agent partage avec variables dynamiques.
ElevenLabs ne supporte pas de variables dynamiques resolues par numero appelant,
et un agent partage empeche la personnalisation du prompt par equipe.

### Decision : Numero unique par equipe

Chaque equipe recoit **son propre numero de telephone belge** (+32).

**Raisons :**
- Identification immediate de l'equipe via le numero appele
- Le gestionnaire communique SON numero a ses locataires
- Webhook ElevenLabs identifie l'equipe via `agent_id` (pas le numero)

### Decision : Reutiliser le requirement group Telnyx

Le requirement group existant (documents deja approuves pour numeros belges)
est **reutilisable** pour toutes les commandes de numeros futures.

```
TELNYX_REQUIREMENT_GROUP_ID=rg_xxx  (a recuperer via API)
```

Cela permet une activation **instantanee** (minutes, pas 72h d'attente).

---

## 2 — Provisioning automatique

### Flux complet

```
Gestionnaire souscrit add-on IA (Solo 49€ / Equipe 99€ / Agence 149€)
         │
         ▼
  Stripe webhook (checkout.session.completed)
         │
         ▼
  ┌─────────────────────────────────────────────┐
  │  PhoneProvisioningService.provision(teamId) │
  │                                             │
  │  1. Commander numero Telnyx (+32)           │
  │     POST /v2/number_orders                  │
  │     → phone_number, telnyx_phone_number_id  │
  │                                             │
  │  2. Cloner agent ElevenLabs                 │
  │     POST /v1/convai/agents/create           │
  │     body: template + team_name              │
  │     → elevenlabs_agent_id                   │
  │                                             │
  │  3. Importer numero dans ElevenLabs         │
  │     POST /v1/convai/phone-numbers           │
  │     body: { phone_number, label, provider } │
  │     → elevenlabs_phone_number_id            │
  │                                             │
  │  4. Assigner agent au numero                │
  │     PATCH /v1/convai/phone-numbers/{id}     │
  │     body: { agent_id }                      │
  │                                             │
  │  5. Enregistrer numero dans WABA Meta       │
  │     POST graph.facebook.com/.../phone_nums  │
  │     → whatsapp_phone_number_id              │
  │     (optional — rollback si echec)          │
  │                                             │
  │  6. Connecter WhatsApp a l'agent ElevenLabs │
  │     Via ElevenLabs Settings/API             │
  │                                             │
  │  7. Sauver en DB                            │
  │     INSERT INTO ai_phone_numbers (...)      │
  └─────────────────────────────────────────────┘
```

### Telnyx : Commander un numero

```typescript
// POST https://api.telnyx.com/v2/number_orders
// IMPORTANT: requirement_group_id va DANS chaque phone_number, PAS au top-level
// IMPORTANT: Utiliser REST direct (SDK Issue #289 — filtres ignores)
{
  "connection_id": process.env.TELNYX_SIP_CONNECTION_ID,
  "customer_reference": `seido-team-${teamId}`,
  "phone_numbers": [{
    "phone_number": "+32XXXXXXXX",
    "requirement_group_id": process.env.TELNYX_REQUIREMENT_GROUP_ID
  }]
}
```

**Avant la commande**, rechercher un numero disponible :
```typescript
// GET https://api.telnyx.com/v2/available_phone_numbers
// ?filter[country_code]=BE&filter[features][]=sip_trunking&filter[limit]=1
```

### ElevenLabs : Cloner l'agent

```typescript
// POST https://api.elevenlabs.io/v1/convai/agents/create
// ⚠️ EU residency (api.eu.residency.elevenlabs.io) = Enterprise plan uniquement
{
  "name": `SEIDO - ${teamName}`,
  "conversation_config": {
    "agent": {
      "prompt": {
        "prompt": buildSystemPrompt(teamName, customInstructions),
        "llm": "claude-haiku-4-5",
        "temperature": 0.2,
        "max_tokens": 150
      },
      "first_message": `Bonjour, vous avez contacté ${teamName}. Je suis l'assistant vocal pour les demandes d'intervention. Comment puis-je vous aider ?`,
      "language": "fr"
    },
    "tts": {
      "model_id": "eleven_flash_v2_5",
      "voice_id": "VOICE_ID_TEMPLATE"
    },
    "stt": {
      "provider": "elevenlabs"
    },
    "turn": {
      "mode": "turn_based"
    },
    "conversation": {
      "max_duration_seconds": 480
    }
  }
}
```

> **Notes API (verifiees mars 2026) :**
> - LLM identifier : `claude-haiku-4-5` (PAS `claude-haiku-4-5-20251001`)
> - Phone import : `POST /v1/convai/phone-numbers` (PAS `/create` — deprecie juillet 2025)
> - Config SIP : `inbound_trunk` + `outbound_trunk` (PAS `inbound_trunk_config`/`provider_config`)
> - Agent assign : PATCH separe obligatoire (le create n'accepte PAS `agent_id`)
> - EU residency : `api.eu.residency.elevenlabs.io` = **Enterprise only**. Pro plan → `api.elevenlabs.io`

### ElevenLabs : Importer et assigner le numero

```typescript
// Etape 1 : Importer le numero (endpoint actuel, pas /create)
// POST https://api.elevenlabs.io/v1/convai/phone-numbers
{
  "phone_number": "+32XXXXXXXX",
  "label": `SEIDO - ${teamName}`,
  "provider": "sip_trunk",
  "inbound_trunk": {
    "media_encryption": "disabled"
    // NE PAS faire d'IP allowlist — ElevenLabs utilise des IPs dynamiques
  },
  "outbound_trunk": {
    "address": "sip.telnyx.com",
    "transport": "tls",
    "media_encryption": "disabled",
    "credentials": {
      "username": process.env.TELNYX_SIP_USERNAME,
      "password": process.env.TELNYX_SIP_PASSWORD
    }
  }
}
// → { phone_number_id: "phnum_xxx" }

// Etape 2 : Assigner l'agent (PATCH separe obligatoire)
// PATCH https://api.elevenlabs.io/v1/convai/phone-numbers/{phone_number_id}
{
  "agent_id": "agent_xxx"
}
```

### Schema DB

```sql
CREATE TABLE ai_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,              -- meme numero pour SIP + WhatsApp
  telnyx_connection_id TEXT,
  telnyx_phone_number_id TEXT,
  elevenlabs_agent_id TEXT,                -- gere tel + WhatsApp
  elevenlabs_phone_number_id TEXT,
  whatsapp_phone_number_id TEXT,           -- ID numero Meta WhatsApp
  whatsapp_enabled BOOLEAN DEFAULT false,  -- canal WhatsApp active
  ai_tier TEXT DEFAULT 'solo',             -- 'solo' | 'equipe' | 'agence'
  auto_topup BOOLEAN DEFAULT false,        -- Recharge automatique a 100%
  custom_instructions TEXT,                -- max 500 chars
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id)
);

CREATE TABLE ai_phone_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  phone_number_id UUID REFERENCES ai_phone_numbers(id),
  elevenlabs_conversation_id TEXT NOT NULL,
  caller_phone TEXT,
  channel TEXT NOT NULL DEFAULT 'phone',  -- phone | whatsapp_text | whatsapp_voice | whatsapp_call
  duration_seconds INTEGER,               -- NULL pour whatsapp_text
  identified_user_id UUID REFERENCES users(id),  -- Locataire identifie (nullable)
  intervention_id UUID REFERENCES interventions(id),
  transcript TEXT,                         -- Transcript complet (plain text)
  structured_summary JSONB,                -- Resume structure (output AI SDK)
  language TEXT DEFAULT 'fr',              -- Langue detectee (fr/nl/en)
  call_status TEXT DEFAULT 'completed',    -- completed | failed | abandoned | transferred
  pdf_document_path TEXT,                  -- Path dans Supabase Storage
  media_urls JSONB DEFAULT '[]'::jsonb,   -- Media WhatsApp [{type, url, storage_path}]
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(elevenlabs_conversation_id)
);
```

### Rollback

Si une etape echoue, rollback les etapes precedentes :

| Etape echouee | Rollback |
|----------------|----------|
| Telnyx commande | Rien a rollback |
| ElevenLabs agent | Annuler commande Telnyx |
| ElevenLabs import numero | Supprimer agent ElevenLabs + annuler Telnyx |
| ElevenLabs assign | Supprimer phone number ElevenLabs + agent + annuler Telnyx |
| WhatsApp enregistrement | **Continuer sans WhatsApp** (`whatsapp_enabled = false`). Telephone fonctionne. |
| WhatsApp connexion agent | **Continuer sans WhatsApp** (`whatsapp_enabled = false`). Telephone fonctionne. |
| DB insert | Supprimer tout (WhatsApp + ElevenLabs + Telnyx) |

---

## 3 — Mode Dev vs Production

### Variable d'environnement

```bash
# .env.local (dev)
AI_PHONE_PROVISIONING=manual
DEV_PHONE_NUMBER=+3242600808
DEV_ELEVENLABS_AGENT_ID=ton_agent_id_dashboard
DEV_ELEVENLABS_PHONE_ID=phnum_0601kjmp9a5ae2d8qt149c1bmr7h

# Vercel (production)
AI_PHONE_PROVISIONING=auto
```

### Comportement par mode

| Action | `manual` | `auto` |
|--------|----------|--------|
| Souscription add-on | Cree entree DB avec valeurs DEV_* | Provisionne via Telnyx + ElevenLabs API |
| Desactivation | Met `is_active=false` | Supprime numero Telnyx + agent ElevenLabs |
| Modification prompt | Met a jour DB uniquement | Met a jour DB + PATCH agent ElevenLabs |
| Numero affiche | `DEV_PHONE_NUMBER` pour tous | Numero unique par equipe |

### PhoneProvisioningService

```typescript
class PhoneProvisioningService {
  async provision(teamId: string, teamName: string) {
    if (process.env.AI_PHONE_PROVISIONING === 'manual') {
      return this.provisionManual(teamId)
    }
    return this.provisionAuto(teamId, teamName)
  }

  private async provisionManual(teamId: string) {
    // Cree entree DB avec les valeurs DEV_* de .env
    // Pas d'appels API externes
    return db.insert('ai_phone_numbers', {
      team_id: teamId,
      phone_number: process.env.DEV_PHONE_NUMBER,
      elevenlabs_agent_id: process.env.DEV_ELEVENLABS_AGENT_ID,
      elevenlabs_phone_number_id: process.env.DEV_ELEVENLABS_PHONE_ID,
      is_active: true
    })
  }

  private async provisionAuto(teamId: string, teamName: string) {
    // Flux complet : Telnyx → ElevenLabs → DB
    // Avec rollback si une etape echoue
  }
}
```

### ElevenLabs Versioning (Production)

ElevenLabs supporte un systeme de versioning similaire a git :

- **Drafts** : Modifications non deployees (mode brouillon)
- **Versions** : Snapshots immutables (chaque deploy cree une version)
- **Branches** : Variantes independantes d'un agent
- **Merge** : Fusionner une branche vers `main`

**Utilisation SEIDO :**
- En dev : travailler sur un draft, tester via le widget dashboard
- En production : chaque PATCH cree automatiquement une nouvelle version
- Rollback possible en restaurant une version precedente

### ElevenLabs Experiments (Future)

Pour deployer des changements de prompt de maniere securisee :
- **A/B traffic splitting** : 90% version actuelle, 10% nouvelle version
- **Metriques** : Comparer taux de completion, duree, satisfaction
- **Promotion** : Si les metriques sont bonnes, promouvoir a 100%

> Ceci est une fonctionnalite post-MVP. Pour le MVP, les modifications
> de prompt sont appliquees directement.

---

## 4 — Page Settings gestionnaire

### Emplacement

`/gestionnaire/parametres/assistant-ia` (nouvel onglet dans les parametres)

### Etats possibles

**Etat 1 : Non souscrit**
```
┌──────────────────────────────────────────────┐
│  🤖 Assistant IA Multi-Canal                 │
│                                              │
│  Activez un assistant IA pour vos            │
│  locataires. Il prend les demandes           │
│  d'intervention par telephone et             │
│  WhatsApp 24h/24.                            │
│                                              │
│  • Numero belge (+32) dedie                  │
│  • Telephone + WhatsApp sur le meme numero   │
│  • Transcription automatique                 │
│  • Creation de demandes dans SEIDO           │
│                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │  Solo   │  │ Equipe  │  │ Agence  │     │
│  │ 49€/mo  │  │ 99€/mo  │  │ 149€/mo │     │
│  │ 100 min │  │ 250 min │  │ 500 min │     │
│  └─────────┘  └─────────┘  └─────────┘     │
│  WhatsApp inclus dans tous les packs        │
│                                              │
│  [ Choisir un pack ]                         │
└──────────────────────────────────────────────┘
```

**Etat 2 : Actif**
```
┌──────────────────────────────────────────────┐
│  🤖 Assistant IA Multi-Canal    ● Actif      │
│                                              │
│  Pack : Equipe (99 EUR/mois — 250 min)      │
│  [ Changer de pack ▼ ]                       │
│                                              │
│  Votre numero : +32 4 260 08 08             │
│  📞 Telephone : actif                        │
│  💬 WhatsApp : actif                         │
│                                              │
│  ── Usage ce mois ──                         │
│  ████████████░░░░░░░░  127/250 min (51%)    │
│  23 appels tel. (98 min) + 14 WhatsApp      │
│                                              │
│  [ Recharger 100 min — 40 EUR ]              │
│  ☐ Recharge automatique a 100%              │
│                                              │
│  ── Instructions personnalisees ──           │
│  ┌──────────────────────────────────────┐    │
│  │ Pour les urgences de plomberie,     │    │
│  │ preciser que le plombier de garde   │    │
│  │ est Jean Dupont au 04/123.45.67     │    │
│  └──────────────────────────────────────┘    │
│  327/500 caracteres                          │
│                                              │
│  [ Sauvegarder ]  [ Tester l'assistant ]     │
│                                              │
│  ── Derniers appels ──                       │
│  │ 28/02 14:32 │ 📞 │ +32 498 ... │ 3:42 │ │
│  │ 27/02 09:15 │ 💬 │ +32 474 ... │ txt  │ │
│                                              │
│  [ Gerer l'abonnement ] [ Desactiver ]       │
└──────────────────────────────────────────────┘
```

### Personnalisation du prompt

Le gestionnaire peut modifier **uniquement** les instructions personnalisees
(max 500 caracteres). Le prompt de base (script 4 etapes) est **verrouille**.

Les instructions personnalisees sont injectees dans le system prompt :

```
## Instructions specifiques de l'agence
{custom_instructions}
```

### Widget de test

Le bouton "Tester l'assistant" ouvre le widget ElevenLabs integre (iframe/SDK).
Cela permet de tester l'agent par ecrit (text-only) sans consommer de minutes telephoniques.

ElevenLabs facture le test via dashboard widget a **demi-tarif**.

---

## 5 — Webhook routing

### Architecture

ElevenLabs a **UN seul webhook par workspace** (pas par agent).
Toutes les conversations de tous les agents arrivent sur le meme endpoint.

```
ElevenLabs Webhook (workspace-level)
         │
         ▼
  POST /api/elevenlabs-webhook
         │
         ▼
  Extraire agent_id du payload
         │
         ▼
  SELECT team_id FROM ai_phone_numbers
  WHERE elevenlabs_agent_id = agent_id
         │
         ▼
  Router vers le bon team_id
```

### Endpoint webhook

```typescript
// app/api/elevenlabs-webhook/route.ts
// ⚠️ ElevenLabs webhook = ZERO retry. Si ce handler echoue, l'appel est perdu.
// ⚠️ Auto-disable apres 10 echecs consecutifs.

export async function POST(request: Request) {
  // 0. Protection DoS
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10)
  if (contentLength > 1_000_000) {
    return Response.json({ error: 'Payload too large' }, { status: 413 })
  }

  // 1. Lire body en TEXT (pas json) — necessaire pour signature HMAC
  const body = await request.text()

  // 2. Verifier signature HMAC-SHA256
  // Header correct: "ElevenLabs-Signature" (PAS x-elevenlabs-signature)
  // Format: "t=<timestamp>,v0=<signature>"
  const signatureHeader = request.headers.get('ElevenLabs-Signature')
  if (!signatureHeader) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const client = new ElevenLabs({ apiKey: process.env.ELEVENLABS_API_KEY })
  let event
  try {
    event = client.webhooks.constructEvent(body, signatureHeader, WEBHOOK_SECRET)
  } catch {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (event.type !== 'post_call_transcription') {
    return Response.json({ ok: true })
  }

  const { agent_id, conversation_id, transcript } = event.data

  // 3. Idempotence — skip si deja traite
  const { data: existing } = await db
    .from('ai_phone_calls')
    .select('id')
    .eq('elevenlabs_conversation_id', conversation_id)
    .maybeSingle()

  if (existing) return Response.json({ ok: true, already_processed: true })

  // 4. Trouver l'equipe
  const { data: phoneRecord } = await db
    .from('ai_phone_numbers')
    .select('id, team_id')
    .eq('elevenlabs_agent_id', agent_id)
    .limit(1)
    .single()

  if (!phoneRecord) {
    console.error(`Unknown agent_id: ${agent_id}`)
    return Response.json({ error: 'Unknown agent' }, { status: 404 })
  }

  // 5. Sauver l'appel + extraire + creer intervention
  await processCallTranscript(phoneRecord.team_id, phoneRecord.id, event.data)

  return Response.json({ success: true })
}
```

### Extraction structuree (Vercel AI SDK 6.x)

```typescript
import { generateText, Output, NoObjectGeneratedError } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

// SDK 6.x: output (PAS experimental_output), result.output (PAS result.object)
try {
  const result = await generateText({
    model: anthropic('claude-haiku-4-5'),
    system: `Analyse ce transcript d'appel de maintenance. Extrais les infos structurees. Description TOUJOURS en francais.`,
    prompt: transcriptText,
    output: Output.object({
      schema: z.object({
        caller_name: z.string(),
        address: z.string(),
        problem_description: z.string(),
        urgency: z.enum(['basse', 'normale', 'haute', 'urgente']),
        additional_notes: z.string().optional()
      })
    })
  })
  const extracted = result.output // type-safe
} catch (error) {
  if (NoObjectGeneratedError.isInstance(error)) {
    // Fallback: creer intervention avec transcript brut
  }
}
```

### Idempotence

La contrainte `UNIQUE(elevenlabs_conversation_id)` sur `ai_phone_calls` garantit
qu'un meme appel ne sera jamais traite deux fois (upsert avec `onConflict`).

---

## 6 — System prompt

### Prompt de base (verrouille)

```
Tu es un assistant telephonique de prise de demandes d'intervention pour
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

{{custom_instructions}}
```

### Variables du prompt

| Variable | Source | Exemple |
|----------|--------|---------|
| `{{team_name}}` | `teams.name` | "Immo Dupont" |
| `{{custom_instructions}}` | `ai_phone_numbers.custom_instructions` | "Pour les urgences plomberie..." |

### Injection des instructions personnalisees

Si `custom_instructions` est non-vide, il est injecte comme :

```
## Instructions specifiques de l'agence
{contenu des instructions personnalisees}
```

Si vide, cette section est omise du prompt.

---

## 7 — Testing

### ElevenLabs

| Methode | Usage | Cout |
|---------|-------|------|
| **Simulate Conversation API** | CI/CD, tests automatises | Text-only, pas de voix |
| **Dashboard Widget** | Test manuel via navigateur | Demi-tarif |
| **CLI `elevenlabs agents test`** | Tests locaux | Text-only |

### Telnyx

| Methode | Usage | Cout |
|---------|-------|------|
| **Web Dialer** | Test appel depuis navigateur | Appel reel |
| **SIP Debug** | Diagnostic problemes SIP | Gratuit |
| **$5 Trial Credit** | Tests initiaux | Credit offert |

### Strategie de test recommandee

1. **Dev** : Simulate Conversation API (gratuit, automatisable)
2. **Staging** : Dashboard Widget (semi-realiste, demi-tarif)
3. **Pre-prod** : Appel reel via Web Dialer ou telephone
4. **Monitoring** : Webhook logs + `ai_phone_calls.status`

---

## Decisions architecturales resumees

| Decision | Choix | Alternative rejetee |
|----------|-------|---------------------|
| Agent par equipe | Clone individuel | Agent partage (pas de customisation) |
| Numero par equipe | Numero unique (SIP + WhatsApp) | Numero partage (pas d'identification) |
| Dual-canal | Meme numero pour telephone + WhatsApp | 2 numeros separes (confus pour locataire) |
| WhatsApp multi-tenant | 1 WABA → N numeros (1/equipe) | 1 WABA par equipe (impossible a scale) |
| WhatsApp rollback | Optional (telephone continue si echec) | Bloquer tout si WhatsApp echoue (trop strict) |
| Requirement group | Reutiliser existant | Nouveau groupe (72h d'attente) |
| Webhook | 1 endpoint workspace (tel + WhatsApp) | N endpoints par agent (pas supporte) |
| Prompt customisation | Instructions appendees (500 chars) | Full prompt editable (trop risque) |
| Mode dev | Variables DEV_* | Sandbox Telnyx (n'existe pas) |
| EU data residency | `api.elevenlabs.io` (Pro), upgrade Enterprise pour EU residency | EU endpoint inaccessible sans Enterprise |
| Telnyx webhook | Pas de webhook Telnyx | Webhook Telnyx active le mode "programmable" (degrade audio) |
| Stripe billing | Billing Meters (`meterEvents.create`) | `createUsageRecord` (retire API 2025-03-31) |
| Telnyx SDK | REST direct pour search + webhook | SDK (Issue #289 filtres, #302 ESM crash) |

---

**Prochaine etape :** Implementation via `/ralph` (PRD → stories → TDD)

> **WhatsApp :** Le canal WhatsApp est integre au provisioning (etapes 5-6) et au webhook.
> Voir Section 14 du plan principal pour les details complets.
