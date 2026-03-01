# SEIDO AI Phone Assistant — Plan Complet

**Version** : 2.0 — Fevrier 2026 (Twilio au lieu de Telnyx + corrections factuelles)
**Statut** : Plan valide, pret pour implementation
**Branche** : `feature/ai-phone-assistant`

---

## Table des matieres

0. [Pre-requis — Comptes et cles API](#0--pre-requis--comptes-et-cles-api)
1. [Vision et objectif](#1--vision-et-objectif)
2. [Architecture technique](#2--architecture-technique)
3. [Recherche et analyse des outils](#3--recherche-et-analyse-des-outils)
4. [Stack technique retenu](#4--stack-technique-retenu)
5. [Flux de conversation IA](#5--flux-de-conversation-ia)
6. [Modele de donnees](#6--modele-de-donnees)
7. [Integration SEIDO](#7--integration-seido)
8. [Securite et RGPD](#8--securite-et-rgpd)
9. [Modele de pricing](#9--modele-de-pricing)
10. [User stories (MVP)](#10--user-stories-mvp)
11. [Estimation des couts](#11--estimation-des-couts)
12. [Roadmap post-MVP](#12--roadmap-post-mvp)

---

## 0 — Pre-requis — Comptes et cles API

**A faire AVANT de commencer l'implementation.** Chaque etape prend 5-15 min.

---

### Etape 1 : Compte Anthropic (Claude API)

1. Aller sur [console.anthropic.com](https://console.anthropic.com)
2. Creer un compte avec ton email pro
3. Ajouter une carte bancaire (Billing → Payment Methods)
4. Creer une API key : Settings → API Keys → Create Key
5. Nommer la cle `seido-ai-phone-assistant`
6. Copier la cle (elle ne sera plus visible)

```bash
# Ajouter dans Vercel (Settings → Environment Variables)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx

# Ajouter dans .env.local pour le dev
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
```

**Budget estime :** ~$5-15/mo pour 1000 appels (Claude Haiku 4.5 a $1.00/1M input, $5.00/1M output)

---

### Etape 2 : Compte ElevenLabs

1. Aller sur [elevenlabs.io](https://elevenlabs.io)
2. Creer un compte → choisir le plan **Pro** ($99/mo, 1100 min d'agent incluses)
3. Aller dans Settings → API Keys → creer une cle
4. Nommer la cle `seido-production`

```bash
# Ajouter dans Vercel + .env.local
ELEVENLABS_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxx
```

**Configuration de l'agent (a faire dans le dashboard ElevenLabs) :**
- Aller dans Agents → Create Agent
- Nom : `SEIDO - Intake Maintenance`
- LLM Provider : **Anthropic** → Model : **Claude Haiku 4.5** (~708ms, $0.0075/min)
- Temperature : **0.3**
- TTS Voice : choisir une voix feminine neutre (ex: "Rachel" ou "Sarah")
- TTS Model : **Flash v2.5** (basse latence)
- Max duration : **480 secondes** (8 min)
- Languages : French, Dutch, English (auto-detect active)
- Coller le system prompt (voir Section 5.1 et 5.2)
- **Noter l'Agent ID** — il sera stocke en DB

> **Note :** L'agent sera ensuite cree/mis a jour programmatiquement via l'API (US-003). Cette config manuelle sert uniquement pour les tests initiaux.

---

### Etape 3 : Compte Twilio

> **Ref :** [Twilio native integration — ElevenLabs Documentation](https://elevenlabs.io/docs/eleven-agents/phone-numbers/twilio-integration/native-integration)

1. Aller sur [twilio.com](https://www.twilio.com)
2. Creer un compte → verifier ton email et numero de telephone
3. Ajouter une carte bancaire (Billing → Payment Methods)
4. Acheter un numero belge : Phone Numbers → Buy a Number → Country: Belgium → Type: Local
5. Noter le **Account SID** et **Auth Token** (visibles sur le dashboard principal)

```bash
# Ajouter dans Vercel + .env.local
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Connecter le numero a ElevenLabs (integration native — ~2 min) :**

1. Dans le dashboard ElevenLabs : aller dans **Phone Numbers** (menu lateral)
2. Cliquer **+ Import number** → selectionner **From Twilio**
3. Remplir les 3 champs :
   - **Phone Number** : ton numero belge (+32 ...)
   - **Twilio SID** : ton Account SID
   - **Twilio Token** : ton Auth Token
4. ElevenLabs configure automatiquement les webhooks Twilio
5. Selectionner ton agent dans le dropdown **"Agent"**
6. **Terminee** — les appels entrants sont routes vers l'agent IA

> **Note :** ElevenLabs detecte automatiquement si le numero supporte inbound + outbound (numeros achetes) ou outbound uniquement (verified caller IDs). Les numeros achetes supportent les deux.

---

### Etape 4 : Dependances NPM

```bash
# Installer les nouvelles dependances
npm install ai @ai-sdk/anthropic @react-pdf/renderer elevenlabs
```

| Package | Version | Role |
|---------|---------|------|
| `ai` | ^6.x | Vercel AI SDK — orchestration LLM |
| `@ai-sdk/anthropic` | ^1.x | Provider Claude pour AI SDK |
| `@react-pdf/renderer` | ^4.x | Generation PDF server-side |
| `elevenlabs` | ^1.x | SDK ElevenLabs — webhook verification (`constructEvent()`) |

> **Note :** `@ai-sdk/openai` n'est PAS necessaire — on utilise Claude exclusivement.

---

### Etape 5 : Variables d'environnement — Recapitulatif

```bash
# === AI Phone Assistant ===

# Anthropic (Claude Haiku 4.5 — post-traitement transcript SEIDO)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx

# ElevenLabs (Conversational AI — pipeline vocal)
ELEVENLABS_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxx   # HMAC shared secret (webhook verification)

# Twilio (Telephonie — numeros belges)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Ou les ajouter :**
- **Dev local :** `.env.local` (deja dans .gitignore)
- **Preview :** Vercel → Settings → Environment Variables → Preview
- **Production :** Vercel → Settings → Environment Variables → Production

---

### Etape 6 : Verification pre-implementation

Avant de commencer US-001, verifier que :

- [ ] Compte Anthropic cree + API key active
- [ ] Compte ElevenLabs Pro actif + API key active
- [ ] Compte Twilio cree + numero belge achete
- [ ] Numero importe dans ElevenLabs (integration native Twilio)
- [ ] Agent ElevenLabs assigne au numero importe
- [ ] Test d'appel reussi (appeler le numero → l'agent repond)
- [ ] Les API keys ajoutees dans `.env.local`
- [ ] Les API keys ajoutees dans Vercel (preview + production)
- [ ] `npm install ai @ai-sdk/anthropic @react-pdf/renderer elevenlabs` execute
- [ ] `npm run lint` passe apres installation

**Temps total estime :** ~30 min de setup (pas d'attente verification)

---

## 1 — Vision et objectif

### Le probleme

Les locataires appellent le gestionnaire pour signaler des problemes. Ces appels :
- Interrompent le travail du gestionnaire (moyenne 12 appels/jour)
- Generent des informations orales non tracees
- Sont souvent hors heures ouvrables (le soir, le week-end)
- Manquent de structure (description vague, urgence non evaluee)

### La solution

Un **assistant IA telephonique** par equipe qui :
1. Repond 24/7 aux appels des locataires
2. Mene une conversation guidee pour collecter les informations necessaires
3. Cree automatiquement une demande d'intervention dans SEIDO
4. Genere un rapport PDF complet (transcript + resume)
5. Notifie le gestionnaire avec toutes les infos pretes a traiter

### Benefice cle

> Le locataire appelle, l'IA collecte, SEIDO cree le ticket. Le gestionnaire arrive le matin avec tout sur son tableau de bord — sans avoir decroche une seule fois.

---

## 2 — Architecture technique

### Vue d'ensemble

```
Locataire appelle (+32 xxx xxx xxx)
         |
         v
  ┌──────────────────┐
  │  TWILIO           │  Telephonie (numero belge dedie par equipe)
  │  Native integ.    │  ~$3.00/mo par numero, ~$0.01/min inbound
  └────────┬─────────┘
           | (Integration native ElevenLabs — auto-configure)
           v
  ┌──────────────────────────────┐
  │  ELEVENLABS                   │  Conversational AI (tout-en-un)
  │  Conversational AI            │
  │  ┌─────────────────────────┐ │
  │  │ STT: Scribe v2          │ │  ~150ms latence, 90+ langues
  │  │ LLM: Claude Haiku 4.5        │ │  Natif ElevenLabs ($0.0075/min)
  │  │ TTS: Flash v2.5         │ │  75ms TTFB, 32 langues
  │  │ Turn-taking: natif      │ │  Fillers, barge-in, endpointing
  │  └─────────────────────────┘ │
  │  Detection auto FR/NL/EN     │  $0.08-$0.10/min tout compris
  └────────┬─────────────────────┘
           |
           | HTTP POST webhook (fin d'appel)
           | Types: post_call_transcription, post_call_audio, call_initiation_failure
           | Payload: transcript, analysis, metadata (format GET /conversations/{id})
           v
  ┌──────────────────────────────┐
  │  SEIDO API (Next.js)          │
  │  POST /api/calls/inbound      │
  │  ┌─────────────────────────┐ │
  │  │ 1. Identifier locataire │ │  Caller ID → DB lookup
  │  │ 2. Creer intervention   │ │  Via intervention-service
  │  │ 3. Generer PDF          │ │  @react-pdf/renderer
  │  │ 4. Stocker transcript   │ │  Supabase Storage
  │  │ 5. Envoyer notification │ │  Push + Email (avec PDF)
  │  │ 6. Logger activite      │ │  activity_logs
  │  └─────────────────────────┘ │
  └──────────────────────────────┘
```

### Pourquoi cette architecture

| Decision | Raison |
|----------|--------|
| ElevenLabs tout-en-un | Pas de pipeline custom a maintenir. STT+LLM+TTS+turn-taking gere nativement. Time-to-market minimal. |
| Twilio (integration native) | Integration native ElevenLabs (3 champs, zero config SIP). Auto-configure les webhooks. ~$2/mo plus cher que Telnyx mais setup en 2 min au lieu de 30+. |
| Webhook post-appel | Decouple le pipeline vocal de SEIDO. ElevenLabs gere l'appel, SEIDO traite le resultat. Simple, robuste. |
| @react-pdf/renderer | Pas de Chromium, compatible Vercel serverless, genere en <200ms. |

---

## 3 — Recherche et analyse des outils

### 3.1 Telephonie — Comparaison

| Provider | Numero BE/mo | Inbound/min | Infra EU | Audio | Integration ElevenLabs |
|----------|-------------|-------------|----------|-------|----------------------|
| Telnyx | $1.15 | $0.003 | Paris PoP | 16kHz HD | SIP FQDN (config manuelle complexe) |
| **Twilio** ✅ | **$3.00** | **$0.01** | **Frankfurt** | **8kHz PCM** | **Native (plug-and-play, 3 champs)** |
| Vonage | $1.40-$3.00 | $0.014 | — | Standard | WebSocket |
| Plivo | $0.50 | $0.018 | — | Limited | Non |
| SignalWire | Contact | $0.007 | — | Native | Non |

**Choix : Twilio** — Integration native ElevenLabs (Account SID + Auth Token + numero = terminee). ~$2/mo plus cher que Telnyx par numero mais zero config SIP/FQDN. ElevenLabs auto-configure les webhooks Twilio. Setup en 2 minutes au lieu de 30+. Le delta de cout est negligeable a l'echelle ($24/an par equipe).

### 3.2 Plateforme vocale IA — Comparaison

| Platform | Prix effectif/min | Latence | FR/NL/EN | Appels entrants | Facilite |
|----------|-------------------|---------|----------|-----------------|----------|
| **ElevenLabs ConvAI** ✅ | **$0.08-$0.10** | **~225ms** | **Natif (90+ langues)** | **Oui (SIP)** | **Haute** |
| Vapi.ai | $0.07-$0.25 | ~600ms | 100+ (depends) | Oui | Moyenne |
| Retell AI | $0.13-$0.31 | ~600ms | 31+ | Oui | Haute (no-code) |
| Bland.ai | $299/mo + $0.09 | ~800ms | Partiel | Oui | Moyenne |
| OpenAI Realtime | ~$0.04 (cache) | <100ms | Bon | Via SIP/Vapi | Basse |
| DIY Stack | $0.03-$0.05 | Variable | Complet | Via Telnyx | Tres basse |

**Choix : ElevenLabs Conversational AI** — Meilleure qualite vocale, detection automatique FR/NL/EN dans le meme appel, STT maison (Scribe v2), latence competitive (~225ms total). Le LLM est configurable — on utilise **Claude Haiku 4.5** natif dans ElevenLabs (pendant l'appel, $0.0075/min). Claude Haiku 4.5 est aussi utilise cote SEIDO pour le post-traitement via AI SDK.

### 3.3 LLM pour le cerveau IA — Comparaison

> **Prix ElevenLabs (verifies sur le dashboard, fevrier 2026) :**

| Modele | Latence ElevenLabs | Cout ElevenLabs/min | FR/NL/EN | Natif ElevenLabs |
|--------|--------------------|---------------------|----------|------------------|
| GPT-4o Mini | ~692ms | $0.0001 | Tres bon | Oui |
| GPT-4 Turbo | ~1.42s | $0.0690 | Tres bon | Oui |
| GPT-3.5 Turbo | ~468ms | $0.0034 | Bon | Oui |
| Claude Sonnet 4.5 | ~1.27s | $0.0225 | Excellent | Oui (New) |
| Claude Sonnet 4 | ~1.09s | $0.0225 | Excellent | Oui |
| **Claude Haiku 4.5** ✅ | **~708ms** | **$0.0075** | **Tres bon** | **Oui** |
| Claude 3.7 Sonnet | ~1.18s | $0.0225 | Tres bon | Oui |
| Claude 3 Haiku | ~479ms | $0.0019 | Bon | Oui |

**Choix pendant l'appel : Claude Haiku 4.5** — Meilleur rapport qualite/prix pour un script guide en 7 etapes avec des phrases courtes. 708ms de latence est acceptable pour une conversation telephonique. 3x moins cher que les Sonnet ($0.0075 vs $0.0225/min). Sur 60 min/mois : $0.45 au lieu de $1.35. Le script est suffisamment simple (questions predefinies, reponses courtes) pour ne pas necessiter la puissance d'un Sonnet. Si le neerlandais ou les cas limites posent probleme en production, upgrade vers Claude Sonnet 4 en un clic dans le dashboard.

**Choix post-traitement (AI SDK cote SEIDO) : Claude Haiku 4.5** — Ideal pour l'extraction structuree du transcript apres l'appel. $1.00/$5.00 par 1M tokens via API Anthropic directe, ~$0.025/appel.

### 3.4 Generation PDF — Comparaison

| Librairie | Server-side | Vercel compatible | Vitesse | Qualite |
|-----------|-------------|-------------------|---------|---------|
| **@react-pdf/renderer** ✅ | **Natif** | **Oui** | **Rapide (~100ms)** | **Bonne** |
| jsPDF | Difficile | Oui | Rapide | Moyenne |
| Puppeteer | Oui | Non (Chromium 170MB) | Lent (1-5s) | Excellente |
| html-pdf-node | Oui | Oui | Moyen | Faible |

**Choix : @react-pdf/renderer** — Pure TypeScript/React, pas de binaire externe, compatible Vercel serverless, generation rapide. Parfait pour des rapports structures a partir de donnees JSON.

### 3.5 Vercel AI SDK — Role dans l'architecture

Le Vercel AI SDK (`ai` package) sera utilise **cote SEIDO** (pas dans le pipeline vocal) pour :

1. **Post-traitement du transcript** — Apres l'appel, le transcript brut est envoye au AI SDK pour :
   - Extraire un resume structure (titre, description, urgence, localisation)
   - Categoriser l'intervention (plomberie, electricite, etc.)
   - Generer la description en francais (meme si l'appel etait en NL/EN)

2. **Structured output via Zod** — Le AI SDK force le LLM a retourner un JSON valide conforme au schema Zod, directement utilisable pour creer l'intervention.

```typescript
import { generateText, Output } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

const interventionSchema = z.object({
  title: z.string().max(80),
  description: z.string(),
  urgency: z.enum(['basse', 'normale', 'haute', 'urgente']),
  locationInUnit: z.string().nullable(),
  categoryGuess: z.string().nullable(),
  requiresQuote: z.boolean(),
  tenantAvailability: z.string().nullable(),
})

const result = await generateText({
  model: anthropic('claude-haiku-4-5-20251001'),
  system: `Tu es un assistant qui analyse des transcripts d'appels telephoniques
           de locataires signalant des problemes de maintenance. Extrais les
           informations structurees. La description doit TOUJOURS etre en francais.`,
  prompt: transcript,
  output: Output.object({
    schema: interventionSchema,
  }),
})

// result.output est type-safe (AI SDK 6.x — pas result.object)
```

> **Note API SDK 6.x :** `generateObject` est deprecie. Utiliser `generateText` + `Output.object()`. Le resultat est dans `result.output` (pas `result.object`).

---

## 4 — Stack technique retenu

| Composant | Outil | Role | Cout |
|-----------|-------|------|------|
| **Telephonie** | Twilio (native ElevenLabs) | Numeros belges, integration auto | ~$3.00/mo/numero + ~$0.01/min |
| **Pipeline vocal** | ElevenLabs Conversational AI | STT + LLM + TTS + turn-taking | $0.08-$0.10/min |
| **LLM (pendant appel)** | Claude Haiku 4.5 (natif ElevenLabs) | Conversation guidee | $0.0075/min (inclus ElevenLabs) |
| **LLM (post-appel)** | Claude Haiku 4.5 (via AI SDK) | Extraction structuree du transcript | ~$0.025/appel |
| **AI SDK** | Vercel AI SDK 6.x | Structured output, Zod schemas | Gratuit (open-source) |
| **PDF** | @react-pdf/renderer | Rapport d'appel PDF | Gratuit (open-source) |
| **Email** | Resend (existant SEIDO) | Email recap avec PDF joint | Existant |
| **Notifications** | Push (existant SEIDO) | Alert gestionnaire | Existant |
| **Storage** | Supabase Storage (existant) | Transcripts + PDFs | Existant |
| **Billing** | Stripe (existant SEIDO) | Add-on facturation | Existant |

### Dependances NPM a ajouter

```json
{
  "ai": "^6.x",                    // Vercel AI SDK
  "@ai-sdk/anthropic": "^1.x",     // Provider Claude (Anthropic)
  "@react-pdf/renderer": "^4.x",   // Generation PDF
  "elevenlabs": "^1.x"             // SDK ElevenLabs (webhook verification)
}
```

### Comptes externes a creer

> **Voir Section 0 (Pre-requis) pour le guide detaille etape par etape.**

| Service | A faire | Donnees necessaires |
|---------|---------|---------------------|
| Anthropic | Creer compte, API key (pour AI SDK post-traitement) | Carte bancaire |
| Twilio | Creer compte, acheter numero BE, importer dans ElevenLabs | Carte bancaire |
| ElevenLabs | Creer compte Pro ($99/mo = 1100 min), configurer agent | System prompt, config LLM |

---

## 5 — Flux de conversation IA

### 5.1 Script de conversation (7 etapes)

L'agent ElevenLabs suit un script structure configure dans son system prompt :

```
ETAPE 1 — ACCUEIL + RGPD (obligatoire, <10 sec)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Bonjour, vous avez appele le service de gestion de [team_name].
Je suis un assistant automatique. Cet appel sera transcrit pour
creer votre demande d'intervention. Comment puis-je vous aider ?"

  → Si le locataire parle neerlandais, l'IA switch automatiquement.
  → Disclosure RGPD integree dans l'accueil.

ETAPE 2 — IDENTIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━
[Si caller ID matche dans la DB :]
"Je vois que vous appelez depuis le numero associe a
M./Mme [Nom], [adresse]. C'est bien vous ?"

[Si pas de match :]
"Puis-je avoir votre nom de famille et l'adresse
de votre logement ?"

ETAPE 3 — DESCRIPTION DU PROBLEME (question ouverte)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Quel est le probleme que vous souhaitez signaler ?"

  → Laisser le locataire decrire librement.
  → Backchannel : "Je comprends.", "D'accord."

ETAPE 4 — LOCALISATION (question fermee)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Dans quelle piece se trouve le probleme ?
Cuisine, salle de bain, salon, chambre, ou ailleurs ?"

ETAPE 5 — URGENCE
━━━━━━━━━━━━━━━━━
"Est-ce que ce probleme represente un danger ou rend
votre logement inhabitable ? Par exemple, une fuite active,
une panne de chauffage, ou un probleme electrique ?"

  → Si oui : urgency = "urgente" ou "haute"
  → Si non : urgency = "normale"
  → Si pas sur : urgency = "normale" + note "a evaluer"

ETAPE 6 — DISPONIBILITES
━━━━━━━━━━━━━━━━━━━━━━━━
"Quand seriez-vous disponible pour qu'un technicien passe ?
Plutot le matin ou l'apres-midi ? Cette semaine ou
la semaine prochaine ?"

ETAPE 7 — CONFIRMATION + CLOTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"Voici ce que j'ai note : [lecture du resume].
Est-ce que c'est correct ?"

[Si oui :]
"Parfait. Votre demande a bien ete enregistree sous le
numero [ref]. Votre gestionnaire sera notifie et vous
recontactera. Bonne journee !"

[Si non :]
"Qu'est-ce que je dois corriger ?"
→ Boucle de correction, puis re-confirmation.
```

### 5.2 Regles du system prompt

```
- Tu es un assistant de prise de demandes d'intervention pour [team_name].
- Tu ne donnes JAMAIS de conseils techniques ni d'estimation de prix.
- Tu ne prends JAMAIS de decision sur l'urgence ou le prestataire.
- Tu poses les questions dans l'ordre du script (etapes 1 a 7).
- Tu ne sautes aucune etape.
- Tes reponses font maximum 2 phrases par tour.
- Tu reponds dans la langue du locataire (FR, NL ou EN).
- Si tu ne comprends pas, demande de repeter. Apres 2 echecs,
  propose : "Je vais transmettre votre demande a un gestionnaire."
- Duree maximale : 8 minutes. Apres 6 min, commence la confirmation.
```

### 5.3 Gestion des cas limites

| Cas | Comportement IA |
|-----|-----------------|
| Locataire incomprehensible (2 echecs) | "Je vais transmettre votre appel a un gestionnaire." + creation intervention partielle |
| Urgence vitale (gaz, incendie) | "Si vous etes en danger, appelez le 112 immediatement." + intervention urgente creee |
| Hors sujet (pas maintenance) | "Je suis dedie aux demandes d'intervention. Pour toute autre question, contactez votre gestionnaire." |
| Appel > 8 minutes | Forcer la confirmation + cloture |
| Numero non reconnu + nom non trouve | Creer intervention avec source="phone_ai_unidentified", gestionnaire trie manuellement |

---

## 6 — Modele de donnees

### 6.1 Nouvelles tables

```sql
-- Table: ai_phone_numbers
-- Un numero par equipe, lie a Twilio + ElevenLabs
CREATE TABLE ai_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,          -- "+32..."
  twilio_phone_number_sid TEXT,        -- SID numero Twilio (PNxxx)
  twilio_account_sid TEXT,             -- SID compte Twilio (pour multi-team)
  elevenlabs_agent_id TEXT,            -- ID agent ElevenLabs
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id)                      -- 1 numero par equipe
);

-- Table: ai_phone_calls
-- Log de chaque appel avec transcript et metadata
CREATE TABLE ai_phone_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  phone_number_id UUID REFERENCES ai_phone_numbers(id),
  caller_phone TEXT,                   -- Numero de l'appelant
  identified_user_id UUID REFERENCES users(id),  -- Locataire identifie (nullable)
  intervention_id UUID REFERENCES interventions(id),  -- Intervention creee (nullable)

  -- Contenu
  transcript TEXT,                     -- Transcript complet
  structured_summary JSONB,            -- Resume structure (output AI SDK)
  language TEXT DEFAULT 'fr',          -- Langue detectee (fr/nl/en)

  -- Metadata appel
  duration_seconds INTEGER,
  elevenlabs_call_id TEXT,
  call_status TEXT DEFAULT 'completed', -- completed, failed, abandoned, transferred

  -- Documents generes
  pdf_document_path TEXT,              -- Path dans Supabase Storage

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: ai_phone_usage
-- Compteur de minutes par equipe par mois (pour billing)
CREATE TABLE ai_phone_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  month DATE NOT NULL,                 -- Premier jour du mois (2026-03-01)
  minutes_used NUMERIC(10,2) DEFAULT 0,
  calls_count INTEGER DEFAULT 0,
  overage_minutes NUMERIC(10,2) DEFAULT 0,
  UNIQUE(team_id, month)
);

-- Index pour lookup caller ID
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_ai_phone_calls_team ON ai_phone_calls(team_id, created_at DESC);
CREATE INDEX idx_ai_phone_usage_team_month ON ai_phone_usage(team_id, month);
```

### 6.2 Modifications tables existantes

```sql
-- Ajouter colonne phone a users (si pas deja present)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Ajouter source a interventions pour tracer l'origine
-- (verifier si la colonne existe deja)
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';
-- Valeurs possibles : 'web', 'phone_ai', 'email', 'manual'
```

### 6.3 RLS Policies

```sql
-- ai_phone_numbers: seul le gestionnaire/admin de l'equipe peut gerer
CREATE POLICY "team_managers_manage_phone_numbers"
ON ai_phone_numbers FOR ALL
USING (is_team_manager_or_admin(team_id));

-- ai_phone_calls: gestionnaire/admin de l'equipe peut voir les appels
CREATE POLICY "team_managers_view_calls"
ON ai_phone_calls FOR SELECT
USING (is_team_manager_or_admin(team_id));

-- ai_phone_usage: gestionnaire/admin peut voir l'usage
CREATE POLICY "team_managers_view_usage"
ON ai_phone_usage FOR SELECT
USING (is_team_manager_or_admin(team_id));
```

---

## 7 — Integration SEIDO

### 7.1 Webhook — Point d'entree principal

```typescript
// app/api/calls/inbound/route.ts
// Recoit le webhook de ElevenLabs a la fin de chaque appel

export async function POST(req: Request) {
  // 1. Valider la signature HMAC du webhook (securite)
  const signature = req.headers.get('ElevenLabs-Signature')
  const body = await req.text()
  // Utiliser le SDK ElevenLabs: client.webhooks.constructEvent(body, headers, secret)
  if (!signature) {
    return Response.json({ error: 'Missing signature' }, { status: 401 })
  }

  const payload = JSON.parse(body)
  // payload type: post_call_transcription | post_call_audio | call_initiation_failure
  // Format conforme a GET /conversations/{id} — inclut transcript, analysis, metadata

  // 2. Identifier l'equipe via le numero appele
  const phoneNumber = await getPhoneNumberByAgentId(payload.agent_id)
  const teamId = phoneNumber.team_id

  // 3. Identifier le locataire via caller ID
  const tenant = await identifyTenantByPhone(payload.caller_phone, teamId)

  // 4. Extraire les infos structurees via AI SDK
  const summary = await extractInterventionSummary(payload.transcript)

  // 5. Creer l'intervention
  const intervention = await interventionService.create({
    team_id: teamId,
    lot_id: tenant?.lot_id ?? null,
    title: summary.title,
    description: summary.description,
    urgency: summary.urgency,
    source: 'phone_ai',
    status: 'demande',
    requested_by: tenant?.id ?? null,
  })

  // 6. Generer le PDF
  const pdfPath = await generateCallReportPDF({
    intervention,
    transcript: payload.transcript,
    summary,
    tenant,
    callDuration: payload.duration,
  })

  // 7. Stocker le log d'appel
  await storeCallLog({
    team_id: teamId,
    phone_number_id: phoneNumber.id,
    caller_phone: payload.caller_phone,
    identified_user_id: tenant?.id,
    intervention_id: intervention.id,
    transcript: payload.transcript,
    structured_summary: summary,
    duration_seconds: payload.duration,
    elevenlabs_call_id: payload.call_id,
    pdf_document_path: pdfPath,
  })

  // 8. Mettre a jour le compteur de minutes
  await incrementUsage(teamId, payload.duration / 60)

  // 9. Notifier le gestionnaire
  await createInterventionNotification(intervention.id)
  await sendCallReportEmail(teamId, intervention, summary, pdfPath)

  return Response.json({ success: true, intervention_id: intervention.id })
}
```

### 7.2 Page Parametres — Activation du numero

```
/gestionnaire/parametres/telephone-ia

┌─────────────────────────────────────────────┐
│  Assistant telephonique IA                   │
│                                              │
│  [Toggle ON/OFF]                             │
│                                              │
│  Votre numero : +32 2 XXX XX XX             │
│  Statut : Actif ✓                           │
│                                              │
│  Ce mois-ci :                                │
│  ┌──────────────────────────────────────┐   │
│  │  23/60 minutes utilisees             │   │
│  │  ████████░░░░░░░░  38%               │   │
│  │  12 appels traites                   │   │
│  │  11 interventions creees             │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  Forfait : 15 EUR/mo (60 min incluses)      │
│  Depassement : 0.25 EUR/min                 │
│                                              │
│  [Voir l'historique des appels]              │
│  [Gerer l'abonnement]                       │
└─────────────────────────────────────────────┘
```

### 7.3 Historique des appels

```
/gestionnaire/parametres/telephone-ia/historique

┌─────────────────────────────────────────────────────┐
│  Historique des appels                               │
│                                                      │
│  27 fev 2026 — 14:32 (3 min 12s)                   │
│  📞 Jean Dupont — +32 475 XX XX XX                   │
│  "Fuite d'eau dans la salle de bain"                │
│  → Intervention #1247 creee ✓                       │
│  [Voir intervention] [Telecharger PDF]              │
│                                                      │
│  27 fev 2026 — 09:15 (1 min 45s)                   │
│  📞 Numero inconnu — +32 486 XX XX XX               │
│  "Probleme de chauffage"                            │
│  → Intervention #1246 creee (non identifie) ⚠       │
│  [Voir intervention] [Telecharger PDF]              │
│                                                      │
│  26 fev 2026 — 18:47 (2 min 30s)                   │
│  📞 Marie Janssens — +32 472 XX XX XX               │
│  "Volet roulant bloque"                             │
│  → Intervention #1245 creee ✓                       │
│  [Voir intervention] [Telecharger PDF]              │
└─────────────────────────────────────────────────────┘
```

### 7.4 Badge dans l'intervention

Les interventions creees par l'assistant IA affichent un badge special :

```
┌──────────────────────────────────────┐
│  🤖 Cree par assistant telephonique  │
│  Appel du 27/02/2026 a 14:32        │
│  Duree : 3 min 12s                  │
│  Langue : Francais                   │
│  [Voir le transcript]                │
│  [Telecharger le rapport PDF]        │
└──────────────────────────────────────┘
```

---

## 8 — Securite et RGPD

### 8.1 Base legale (Belgique)

| Aspect | Regle | Implementation |
|--------|-------|----------------|
| **Disclosure IA** | Informer le locataire que l'appel est gere par une IA | Etape 1 du script : "Je suis un assistant automatique" |
| **Consentement enregistrement** | Base legale : Art. 6(1)(b) RGPD — necessite contractuelle | Mention dans l'accueil : "Cet appel sera transcrit pour creer votre demande" |
| **Retention audio** | NE PAS stocker l'audio brut | ElevenLabs ne renvoie que le transcript texte |
| **Retention transcript** | Duree de l'intervention + 1 an | Cron job de nettoyage apres 1 an post-cloture |
| **Acces aux donnees** | Seul le gestionnaire de l'equipe | RLS policy sur ai_phone_calls |
| **Droit a l'effacement** | Le locataire peut demander suppression | Prevu dans le workflow RGPD existant |

### 8.2 Securite technique

| Mesure | Implementation |
|--------|----------------|
| Webhook ElevenLabs | Signature HMAC via header `ElevenLabs-Signature` — verification via SDK `constructEvent()` |
| Twilio auth | Account SID + Auth Token — pas de webhook Twilio a gerer (ElevenLabs configure tout nativement) |
| API key storage | Variables d'environnement Vercel (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, ELEVENLABS_API_KEY, ANTHROPIC_API_KEY) |
| Rate limiting | Upstash rate limiter sur /api/calls/inbound (existant) |
| Caller ID spoofing | Ne jamais accorder d'acces eleve basee uniquement sur le caller ID |
| Duree max appel | Cap a 8 minutes dans la config ElevenLabs |

### 8.3 EU AI Act

Le systeme est classe **risque minimal** car :
- Il ne prend aucune decision automatisee affectant les droits du locataire
- Il cree uniquement un ticket que le gestionnaire doit valider
- L'urgence suggeree est indicative, pas contraignante

---

## 9 — Modele de pricing

### 9.1 Grille tarifaire

| Element | Valeur |
|---------|--------|
| **Nom** | Assistant Telephonique IA |
| **Prix** | +15 EUR/mo (add-on au plan existant) |
| **Minutes incluses** | 60 min/mois (~20 appels de 3 min) |
| **Depassement** | 0.25 EUR/min supplementaire |
| **Numero** | 1 numero belge dedie par equipe |
| **Prerequis** | Plan payant actif (pas dispo sur free tier) |

### 9.2 Economie unitaire

| Poste | Cout reel | Revenue |
|-------|-----------|---------|
| Numero Twilio | ~$3.00/mo | — |
| 60 min ElevenLabs | ~$6.00 ($0.10/min) | — |
| 60 min Twilio inbound | ~$0.60 ($0.01/min) | — |
| AI SDK Claude Haiku (post-traitement) | ~$0.50 (20 appels x $0.025) | — |
| **Total cout** | **~$10.10/mo** | — |
| **Revenue** | — | **$15/mo** |
| **Marge** | — | **~33%** |

### 9.3 Depassement

| Poste cout | Cout reel/min | Prix facture/min | Marge |
|-----------|---------------|------------------|-------|
| ElevenLabs | $0.10 | — | — |
| Twilio | $0.01 | — | — |
| AI SDK | ~$0.0025 | — | — |
| **Total** | **~$0.1125** | **$0.25** | **~55%** |

### 9.4 Implementation Stripe

- Creer un nouveau `Price` metered dans Stripe pour l'add-on
- Le compteur de minutes (`ai_phone_usage`) alimente Stripe Usage Records via `stripe.subscriptionItems.createUsageRecord()`
- Depassement facture automatiquement via Stripe metered billing
- **Note :** Le pricing `metered` (usage-based) rejette le parametre `quantity` — utiliser `stripe.subscriptionItems.createUsageRecord()` et non `stripe.subscriptionItems.update({ quantity })`. Voir MEMORY.md : "Metered rejects quantity param"
- Page de gestion via le Stripe Customer Portal existant

---

## 10 — User stories (MVP)

### Vue d'ensemble

| # | ID | Titre | Taille | Priorite | Couche |
|---|-----|-------|--------|----------|--------|
| 1 | US-001 | Schema DB + migrations | S | 1 | Schema |
| 2 | US-002 | Provisioning Twilio + ElevenLabs (API) | M | 2 | Backend |
| 3 | US-003 | Configuration agent ElevenLabs | M | 2 | Backend |
| 4 | US-004 | Webhook inbound call | M | 2 | Backend |
| 5 | US-005 | Extraction structuree (AI SDK) | S | 2 | Backend |
| 6 | US-006 | Generation PDF rapport | S | 2 | Backend |
| 7 | US-007 | Email recap gestionnaire | S | 2 | Backend |
| 8 | US-008 | Page parametres telephone IA | M | 3 | UI |
| 9 | US-009 | Historique des appels | S | 3 | UI |
| 10 | US-010 | Badge AI dans intervention | XS | 3 | UI |
| 11 | US-011 | Compteur de minutes + usage | S | 3 | UI |
| 12 | US-012 | Stripe add-on billing | M | 4 | Backend |
| 13 | US-013 | Integration E2E test | M | 4 | Test |

### Detail des stories

---

#### US-001 — Schema DB + migrations

**En tant que** developpeur, **je veux** les tables `ai_phone_numbers`, `ai_phone_calls`, `ai_phone_usage` creees avec RLS **pour que** les donnees d'appels soient stockees de maniere securisee.

**Criteres d'acceptation :**
- Migration cree les 3 tables avec tous les index
- Colonne `phone` ajoutee a `users` (si absente)
- Colonne `source` ajoutee a `interventions` (si absente)
- RLS policies pour gestionnaire/admin
- `npm run supabase:types` regenere sans erreur
- Lint passe

**Taille :** S | **Depend de :** — | **Couche :** Schema

---

#### US-002 — Provisioning Twilio + ElevenLabs (API)

**En tant que** gestionnaire, **je veux** pouvoir activer un numero telephonique pour mon equipe **pour que** mes locataires puissent appeler l'assistant IA.

**Criteres d'acceptation :**
- Server action `provisionPhoneNumber(teamId)` qui :
  - Achete un numero belge via API Twilio
  - Importe le numero dans ElevenLabs via API (integration native Twilio)
  - Associe le numero a l'agent ElevenLabs de l'equipe
  - Stocke le numero + Twilio SID dans `ai_phone_numbers`
- Server action `deprovisionPhoneNumber(teamId)` pour liberation
- Gestion d'erreur : numero indisponible, quota atteint
- Lint passe

**Taille :** M | **Depend de :** US-001 | **Couche :** Backend

---

#### US-003 — Configuration agent ElevenLabs

**En tant que** developpeur, **je veux** un service qui cree/configure un agent ElevenLabs par equipe **pour que** chaque equipe ait son propre assistant avec son nom d'agence.

**Criteres d'acceptation :**
- Service `elevenlabs-agent.service.ts` avec :
  - `createAgent(teamId, teamName)` → cree un agent ElevenLabs avec le system prompt personnalise
  - `updateAgent(agentId, config)` → met a jour le prompt / la config
  - `deleteAgent(agentId)` → supprime l'agent
- System prompt template avec placeholder `[team_name]`
- Configuration LLM : Claude Haiku 4.5 (natif ElevenLabs, $0.0075/min), temperature 0.3
- Configuration TTS : Flash v2.5, voix feminine neutre
- Langues : FR, NL, EN (auto-detect)
- Max duration : 8 minutes
- Agent ID stocke dans `ai_phone_numbers.elevenlabs_agent_id`
- Lint passe

**Taille :** M | **Depend de :** US-001 | **Couche :** Backend

---

#### US-004 — Webhook inbound call

**En tant que** systeme, **je veux** un endpoint webhook qui recoit les resultats d'appel de ElevenLabs **pour que** chaque appel cree automatiquement une intervention.

**Criteres d'acceptation :**
- Route `POST /api/calls/inbound` qui :
  - Valide la signature du webhook
  - Identifie l'equipe via l'agent_id
  - Identifie le locataire via caller ID (phone lookup)
  - Appelle `extractInterventionSummary` (US-005)
  - Cree l'intervention via intervention-service
  - Genere le PDF (US-006)
  - Stocke le call log dans `ai_phone_calls`
  - Met a jour `ai_phone_usage`
  - Cree une notification push + email (US-007)
- Gestion d'erreur : locataire non identifie, transcript vide
- Rate limiting (existant Upstash)
- Tests unitaires pour le handler
- Lint passe

**Taille :** M | **Depend de :** US-001, US-005, US-006, US-007 | **Couche :** Backend

---

#### US-005 — Extraction structuree (AI SDK)

**En tant que** systeme, **je veux** extraire les informations structurees d'un transcript d'appel **pour que** l'intervention soit creee avec les bonnes donnees.

**Criteres d'acceptation :**
- Service `call-transcript-analyzer.service.ts` avec :
  - `extractInterventionSummary(transcript: string): Promise<InterventionSummary>`
  - Schema Zod : title, description (FR), urgency, locationInUnit, categoryGuess, requiresQuote, tenantAvailability
  - Description TOUJOURS generee en francais (meme si appel en NL/EN)
  - Utilise `generateText` du AI SDK avec `Output.object()` (syntaxe AI SDK 6.x)
  - Resultat dans `result.output` (pas `result.object`)
  - Model : Claude Haiku 4.5 (post-traitement — appel direct API Anthropic)
- Tests unitaires avec transcripts exemples (FR, NL, EN)
- Lint passe

**Taille :** S | **Depend de :** — | **Couche :** Backend

---

#### US-006 — Generation PDF rapport

**En tant que** gestionnaire, **je veux** un rapport PDF pour chaque appel **pour que** j'aie une trace documentaire complete.

**Criteres d'acceptation :**
- Composant `CallReportPDF` avec @react-pdf/renderer contenant :
  - En-tete : logo SEIDO, date, numero de reference
  - Resume structure : titre, description, urgence, localisation
  - Infos locataire : nom, telephone, adresse
  - Transcript integral
  - Metadata : duree, langue, heure d'appel
- Service `generateCallReportPDF(data): Promise<string>` qui :
  - Genere le PDF
  - Le stocke dans Supabase Storage (bucket `documents`)
  - Cree une entree `intervention_documents` liee a l'intervention
  - Retourne le path du document
- Tests unitaires pour la generation
- Lint passe

**Taille :** S | **Depend de :** — | **Couche :** Backend

---

#### US-007 — Email recap gestionnaire

**En tant que** gestionnaire, **je veux** recevoir un email avec le resume de l'appel et le PDF en piece jointe **pour que** je sois informe meme si je ne suis pas sur l'app.

**Criteres d'acceptation :**
- Template email React Email dans `emails/calls/`
- Contenu : resume structure, lien vers intervention, PDF joint
- Utilise le systeme d'email notification existant (Resend)
- Magic link vers l'intervention inclus
- Lint passe

**Taille :** S | **Depend de :** US-006 | **Couche :** Backend

---

#### US-008 — Page parametres telephone IA

**En tant que** gestionnaire, **je veux** une page dans mes parametres pour activer/desactiver le numero IA **pour que** je puisse gerer cette fonctionnalite.

**Criteres d'acceptation :**
- Page `/gestionnaire/parametres/telephone-ia`
- Toggle activation/desactivation
- Affichage du numero attribue
- Barre de progression des minutes (X/60 utilisees)
- Stats du mois : nombre d'appels, interventions creees
- Lien vers l'historique des appels
- Lien vers la gestion de l'abonnement (Stripe)
- Server Component avec `getServerAuthContext`
- Responsive mobile
- Lint passe

**Taille :** M | **Depend de :** US-001, US-002 | **Couche :** UI

---

#### US-009 — Historique des appels

**En tant que** gestionnaire, **je veux** voir l'historique de tous les appels recus par l'assistant **pour que** je puisse suivre l'activite et retrouver un appel specifique.

**Criteres d'acceptation :**
- Page `/gestionnaire/parametres/telephone-ia/historique`
- Liste des appels avec : date, heure, duree, nom locataire, resume, statut
- Lien vers l'intervention creee
- Bouton telecharger PDF
- Filtre par date
- Pagination
- Server Component avec `getServerAuthContext`
- Lint passe

**Taille :** S | **Depend de :** US-001, US-008 | **Couche :** UI

---

#### US-010 — Badge AI dans intervention

**En tant que** gestionnaire, **je veux** voir un indicateur visuel quand une intervention a ete creee par l'assistant telephonique **pour que** je sache l'origine de la demande.

**Criteres d'acceptation :**
- Badge "Cree par assistant telephonique" dans la vue detail intervention
- Visible quand `source === 'phone_ai'`
- Lien vers le transcript et le PDF
- Affichage de la duree et langue de l'appel
- Lint passe

**Taille :** XS | **Depend de :** US-001 | **Couche :** UI

---

#### US-011 — Compteur de minutes + usage

**En tant que** gestionnaire, **je veux** voir mon usage de minutes en temps reel **pour que** je puisse anticiper les depassements.

**Criteres d'acceptation :**
- Composant `PhoneUsageCounter` reutilisable
- Affiche : minutes utilisees / 60, nombre d'appels, cout depassement
- Alerte visuelle a 80% d'utilisation
- Alerte email a 90% d'utilisation (via cron)
- Integration dans la page parametres (US-008)
- Lint passe

**Taille :** S | **Depend de :** US-001, US-008 | **Couche :** UI

---

#### US-012 — Stripe add-on billing

**En tant que** gestionnaire, **je veux** que le forfait telephone IA soit facture via Stripe **pour que** la facturation soit automatisee.

**Criteres d'acceptation :**
- Nouveau Stripe Price (metered) pour l'add-on telephone IA
- Checkout flow pour activer l'add-on
- Usage records envoyes a Stripe en fin de mois
- Depassement facture automatiquement
- Annulation de l'add-on desactive le numero
- Integration avec le Customer Portal existant
- Lint passe

**Taille :** M | **Depend de :** US-002, US-011 | **Couche :** Backend

---

#### US-013 — Integration E2E test

**En tant que** developpeur, **je veux** des tests d'integration qui valident le flux complet **pour que** le systeme soit fiable en production.

**Criteres d'acceptation :**
- Test : webhook inbound → creation intervention → PDF genere
- Test : caller ID match → locataire identifie
- Test : caller ID inconnu → intervention creee avec flag
- Test : extraction structuree avec transcript FR, NL, EN
- Test : compteur de minutes incremente
- Tous les tests passent
- Lint passe

**Taille :** M | **Depend de :** US-004 | **Couche :** Test

---

## 11 — Estimation des couts

### 11.1 Cout de developpement

| Phase | Stories | Estimation |
|-------|---------|------------|
| Schema + Backend | US-001 a US-007 | ~3 semaines |
| UI | US-008 a US-011 | ~1.5 semaines |
| Billing + Tests | US-012 a US-013 | ~1 semaine |
| **Total** | **13 stories** | **~5-6 semaines** |

### 11.2 Cout operationnel mensuel (par equipe)

| Scenario | Appels/mois | Minutes | Cout SEIDO | Revenue |
|----------|-------------|---------|------------|---------|
| Faible | 10 | 30 min | ~$4 | $15 |
| Moyen | 20 | 60 min | ~$7.50 | $15 |
| Eleve | 40 | 120 min | ~$15 | $15 + $15 overage = $30 |

### 11.3 Couts fixes mensuels

| Service | Cout | Note |
|---------|------|------|
| ElevenLabs Pro | $99/mo | 1100 min incluses (suffisant pour ~50 equipes) |
| Twilio | $0/mo (hors numeros) | Pas d'abonnement plateforme, pay-as-you-go |
| Anthropic API | Pay-as-you-go | ~$15-20/mo pour 1000 appels |
| **Total fixe** | **~$115/mo** | Rentable a partir de 8 equipes |

### 11.4 Break-even

- **Cout fixe :** ~$115/mo
- **Revenue par equipe :** $15/mo
- **Break-even :** **8 equipes** avec l'add-on actif

---

## 12 — Roadmap post-MVP

### V2 (Q3 2026)

| Feature | Description |
|---------|-------------|
| Tool calling live | L'IA lookup le locataire dans Supabase PENDANT l'appel (pas en post-traitement) |
| SMS confirmation | Envoyer un SMS au locataire avec le numero de reference apres l'appel |
| Config voix custom | Choix de la voix (homme/femme, ton) dans les parametres |
| Dashboard analytics | Stats detaillees : appels/jour, duree moyenne, taux d'identification, categories |

### V3 (Q4 2026)

| Feature | Description |
|---------|-------------|
| Appels sortants | L'IA rappelle le locataire pour confirmer un creneau ou demander des infos |
| Multi-numero | Plusieurs numeros par equipe (un par immeuble) |
| Voicemail | Si l'IA ne peut pas traiter, option de laisser un message vocal |
| Transcription email | Appliquer le meme traitement aux messages vocaux recus par email |

### V4 (2027)

| Feature | Description |
|---------|-------------|
| WhatsApp integration | Meme assistant IA accessible via WhatsApp (pas que telephone) |
| Video | Le locataire peut envoyer une video du probleme pendant l'appel |
| Prestataire IA | L'IA appelle le prestataire pour planifier le creneau |

---

*Document genere le 27 fevrier 2026 — v2.0 le 28 fevrier 2026 (Twilio au lieu de Telnyx)*
*Basee sur : brainstorming session + recherche 4 agents specialises + verification docs officielles + test dashboard reel*
*Stack : Twilio (native ElevenLabs) + ElevenLabs Conversational AI (Claude Haiku 4.5) + Vercel AI SDK 6.x (Claude Haiku 4.5) + @react-pdf/renderer*
