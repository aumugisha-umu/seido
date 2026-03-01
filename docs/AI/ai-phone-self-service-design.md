# AI Phone Assistant — Self-Service Design

**Date** : 2026-03-01
**Statut** : Design valide, pret pour implementation
**Ref** : `docs/AI/ai-phone-assistant-plan.md` (plan technique v3.0)

---

## Contexte

Le plan technique v3.0 couvre la configuration manuelle (1 numero, 1 agent, 1 equipe).
Ce design etend le plan pour supporter le **self-service multi-tenant** :
un gestionnaire souscrit a l'add-on, recoit un numero auto-provisionne,
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
Gestionnaire souscrit add-on ($15/mo)
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
  │     POST /v1/convai/phone-numbers/create    │
  │     body: { phone_number, label }           │
  │     → elevenlabs_phone_number_id            │
  │                                             │
  │  4. Assigner agent au numero                │
  │     PATCH /v1/convai/phone-numbers/{id}     │
  │     body: { agent_id }                      │
  │                                             │
  │  5. Sauver en DB                            │
  │     INSERT INTO ai_phone_numbers (...)      │
  └─────────────────────────────────────────────┘
```

### Telnyx : Commander un numero

```typescript
// POST https://api.telnyx.com/v2/number_orders
{
  "phone_numbers": [{ "phone_number": "+32XXXXXXXX" }],
  "connection_id": process.env.TELNYX_SIP_CONNECTION_ID,
  "customer_reference": `seido-team-${teamId}`,
  "regulatory_requirements": [{
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
// POST https://api.eu.residency.elevenlabs.io/v1/convai/agents/create
{
  "name": `SEIDO - ${teamName}`,
  "conversation_config": {
    "agent": {
      "prompt": {
        "prompt": buildSystemPrompt(teamName, customInstructions),
        "llm": "claude-haiku-4-5",
        "temperature": 0.3
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

> **Note API :** Le LLM identifier est `claude-haiku-4-5` (PAS `claude-haiku-4-5-20251001`).
> L'import du numero (`POST /v1/convai/phone-numbers`) n'accepte PAS `agent_id` —
> il faut un PATCH separe pour assigner l'agent.

### ElevenLabs : Importer et assigner le numero

```typescript
// Etape 1 : Importer le numero
// POST https://api.eu.residency.elevenlabs.io/v1/convai/phone-numbers/create
{
  "phone_number": "+32XXXXXXXX",
  "label": `SEIDO - ${teamName}`,
  "provider": "sip_trunk"
}
// → { phone_number_id: "phnum_xxx" }

// Etape 2 : Assigner l'agent
// PATCH https://api.eu.residency.elevenlabs.io/v1/convai/phone-numbers/{phone_number_id}
{
  "agent_id": "agent_xxx"
}
```

### Schema DB

```sql
CREATE TABLE ai_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  telnyx_connection_id TEXT,
  telnyx_phone_number_id TEXT,
  elevenlabs_agent_id TEXT,
  elevenlabs_phone_number_id TEXT,
  custom_instructions TEXT,        -- max 500 chars
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
  duration_seconds INTEGER,
  transcript JSONB,                -- structured transcript
  extracted_data JSONB,            -- nom, adresse, probleme, urgence
  intervention_id UUID REFERENCES interventions(id),
  status TEXT DEFAULT 'pending',   -- pending | processed | failed
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
| DB insert | Supprimer tout ElevenLabs + annuler Telnyx |

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

`/gestionnaire/parametres/assistant-vocal` (nouvel onglet dans les parametres)

### Etats possibles

**Etat 1 : Non souscrit**
```
┌──────────────────────────────────────────────┐
│  🤖 Assistant Vocal IA                       │
│                                              │
│  Activez un assistant telephonique IA pour   │
│  vos locataires. Il prend les demandes       │
│  d'intervention par telephone 24h/24.        │
│                                              │
│  • Numero belge (+32) dedie                  │
│  • Transcription automatique                 │
│  • Creation de demandes dans SEIDO           │
│                                              │
│  15 EUR/mois + 0,25 EUR/min apres 60 min    │
│                                              │
│  [ Activer l'assistant vocal ]               │
└──────────────────────────────────────────────┘
```

**Etat 2 : Actif**
```
┌──────────────────────────────────────────────┐
│  🤖 Assistant Vocal IA          ● Actif      │
│                                              │
│  Votre numero : +32 4 260 08 08             │
│  Appels ce mois : 12 (47 min)               │
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
│  │ 28/02 14:32 │ +32 498 12 34 56 │ 3:42 │ │
│  │ 27/02 09:15 │ +32 474 98 76 54 │ 2:18 │ │
│                                              │
│  [ Desactiver l'assistant ]                  │
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
export async function POST(request: Request) {
  // 1. Verifier signature webhook
  const signature = request.headers.get('x-elevenlabs-signature')
  if (!verifyWebhookSignature(signature, body)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // 2. Extraire donnees
  const { agent_id, conversation_id, transcript, ... } = body

  // 3. Trouver l'equipe
  const phoneRecord = await db
    .from('ai_phone_numbers')
    .select('team_id')
    .eq('elevenlabs_agent_id', agent_id)
    .limit(1)
    .single()

  if (!phoneRecord) {
    console.error(`Unknown agent_id: ${agent_id}`)
    return Response.json({ error: 'Unknown agent' }, { status: 404 })
  }

  // 4. Sauver l'appel
  await db.from('ai_phone_calls').upsert({
    team_id: phoneRecord.team_id,
    phone_number_id: phoneRecord.id,
    elevenlabs_conversation_id: conversation_id,
    transcript,
    status: 'pending'
  }, { onConflict: 'elevenlabs_conversation_id' })

  // 5. Extraire donnees structurees + creer intervention
  await processCallTranscript(phoneRecord.team_id, conversation_id)

  return Response.json({ success: true })
}
```

### Extraction structuree (Vercel AI SDK)

```typescript
import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { Output } from 'ai'

const extractedData = await generateText({
  model: anthropic('claude-haiku-4-5'),
  prompt: `Extract from this transcript: ${transcript}`,
  experimental_output: Output.object({
    schema: z.object({
      caller_name: z.string(),
      address: z.string(),
      problem_description: z.string(),
      urgency: z.enum(['normale', 'urgente']),
      additional_notes: z.string().optional()
    })
  })
})
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
| Numero par equipe | Numero unique | Numero partage (pas d'identification) |
| Requirement group | Reutiliser existant | Nouveau groupe (72h d'attente) |
| Webhook | 1 endpoint workspace | N endpoints par agent (pas supporte) |
| Prompt customisation | Instructions appendees (500 chars) | Full prompt editable (trop risque) |
| Mode dev | Variables DEV_* | Sandbox Telnyx (n'existe pas) |
| EU data residency | `api.eu.residency.elevenlabs.io` | US endpoint (RGPD non-conforme) |

---

**Prochaine etape :** Implementation via `/ralph` (PRD → stories → TDD)
