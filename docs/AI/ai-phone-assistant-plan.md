# SEIDO AI Phone Assistant — Plan Complet

**Version** : 3.2 — Mars 2026 (Telnyx SIP trunk + Self-Service + Audit securite)
**Statut** : Plan valide, pret pour implementation
**Branche** : `feature/ai-phone-assistant`
**Design self-service** : [`ai-phone-self-service-design.md`](./ai-phone-self-service-design.md)

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
13. [Self-Service Multi-Tenant](#13--self-service-multi-tenant)

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

### Etape 3 : Compte Telnyx + SIP Trunk

> **Ref :** [SIP Trunking — ElevenLabs Documentation](https://elevenlabs.io/docs/eleven-agents/phone-numbers/sip-trunking)

**STATUT : ✅ DEJA FAIT** — Compte Telnyx cree, numero belge +32 4 260 08 08 achete, SIP Connection configuree.

#### 3A — Configuration SIP Connection Telnyx (cote Telnyx Mission Control)

**Connexion existante :** "Seido inbound SIP" — Connection ID: `2905402867672155412`

**Onglet "Configuration" :**

| Setting | Valeur | Statut |
|---------|--------|--------|
| Connection Name | Seido inbound SIP | ✅ |
| Type | FQDN Connection | ✅ |
| AnchorSite | Latency | ✅ |
| DTMF type | RFC 2833 | ✅ |
| Encode contact header | **Cocher** | ⚠️ A verifier |
| Webhook API Version | API v2 | ✅ |
| Generate comfort noise | Coche | ✅ |

**Onglet "Authentication and routing" :**

| Setting | Valeur | Statut |
|---------|--------|--------|
| FQDN | `sip.rtc.elevenlabs.io` port 5060 (DNS: A) | ✅ |
| Routing Method | Round-robin | ✅ |
| Auth Method (Outbound) | Credentials | ✅ |
| Username | `seido-elevenlabs` | ✅ |
| Password | (defini) | ✅ |

**Onglet "Inbound" :**

| Setting | Valeur | Statut |
|---------|--------|--------|
| Destination number format | E.164 | ✅ |
| SIP transport protocol | TCP | ✅ |
| SIP region | **Europe (Amsterdam)** | ⚠️ A selectionner |
| No answer timeout | **30 secondes** | ⚠️ A modifier (defaut 5s trop court) |
| Channel limit | **10** | ⚠️ A definir (protection couts) |
| Encrypted media | Disabled | ✅ |
| Codecs | G722 ✅, G711U ✅, G711A ✅ | ✅ |
| Codec G729 | **Decocher** | ⚠️ Non supporte par ElevenLabs |

**Onglet "Numbers" :**
- Numero +32 4 260 08 08 assigne a la connexion SIP ✅

#### 3B — Import du numero dans ElevenLabs (cote ElevenLabs)

**STATUT : ✅ DEJA FAIT** — Numero importe, SIP trunk configure.

**Phone Number ID ElevenLabs :** `phnum_0601kjmp9a5ae2d8qt149c1bmr7h`

**Inbound SIP Trunk Configuration (validee) :**

| Champ | Valeur | Statut |
|-------|--------|--------|
| SIP Server TCP | `sip:sip.rtc.elevenlabs.io:5060;transport=tcp` | ✅ Auto-genere |
| SIP Server TLS | `sip:sip.rtc.elevenlabs.io:5061;transport=tls` | ✅ Auto-genere |
| Media Encryption | Disabled | ✅ |
| Allowed Addresses | All addresses (`0.0.0.0/0`) | ✅ (restreindre en prod) |
| Allowed Numbers | All numbers | ✅ |
| Remote Domains | `sip.telnyx.com` | ✅ |
| Username | `seido11labs` | ✅ |
| Password | (defini) | ✅ |

**Outbound SIP Trunk Configuration :**

| Champ | Valeur | Statut |
|-------|--------|--------|
| Address | `sip.telnyx.com` | ✅ Corrige (etait `example.pstn.twilio.com`) |
| Transport Protocol | TLS (Secure) | ✅ |
| Media Encryption | Disabled | ✅ |
| Authentication | **A configurer** | ⚠️ Ajouter `seido-elevenlabs` + password Telnyx |

**Agent assignee au numero :**

| Champ | Valeur | Statut |
|-------|--------|--------|
| Agent | **A assigner** | ⚠️ Selectionner l'agent SEIDO dans le dropdown |

#### 3C — Test de validation

1. Assigner l'agent ElevenLabs au numero +32 4 260 08 08
2. Appeler le numero depuis un telephone
3. L'agent IA doit repondre et mener la conversation
4. Si pas de reponse : verifier les logs Telnyx (SIP Connection → Logs) et ElevenLabs (Conversations)

**Troubleshooting courant :**

| Probleme | Cause probable | Solution |
|----------|---------------|----------|
| Pas de reponse | Agent non assigne | Assigner l'agent au numero |
| Audio unidirectionnel | NAT/ALG reecrit les headers SDP | Cocher "Encode contact header" dans Telnyx Config |
| Appel raccroche apres 5s | No answer timeout trop court | Augmenter a 30s dans Telnyx Inbound |
| Codec mismatch | G729 active | Decocher G729, garder G722 + G711 |
| Call rejected | Plan ElevenLabs gratuit | Plan Pro requis ($99/mo) |

---

### Etape 4 : Dependances NPM

```bash
# Installer les nouvelles dependances
npm install ai @ai-sdk/anthropic @react-pdf/renderer elevenlabs telnyx
```

| Package | Version | Role |
|---------|---------|------|
| `ai` | ^6.x | Vercel AI SDK — orchestration LLM |
| `@ai-sdk/anthropic` | ^1.x | Provider Claude pour AI SDK |
| `@react-pdf/renderer` | ^4.x | Generation PDF server-side |
| `elevenlabs` | ^1.x | SDK ElevenLabs — webhook verification (`constructEvent()`) |
| `telnyx` | ^2.x | SDK Telnyx — provisioning numeros + webhook verification |

> **Note :** `@ai-sdk/openai` n'est PAS necessaire — on utilise Claude exclusivement.

---

### Etape 5 : Variables d'environnement — Recapitulatif

```bash
# === AI Phone Assistant ===

# Mode provisioning (manual = dev, auto = production)
AI_PHONE_PROVISIONING=manual                       # manual | auto

# Anthropic (Claude Haiku 4.5 — post-traitement transcript SEIDO)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx

# ElevenLabs (Conversational AI — pipeline vocal)
ELEVENLABS_API_KEY=sk_xxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxx   # HMAC shared secret (webhook verification)

# Telnyx (Telephonie — numeros belges via SIP trunk)
TELNYX_API_KEY=KEY_xxxxxxxxxxxxxxxxxxxxxxxxx
TELNYX_PUBLIC_KEY=xxxxxxxxxxxxxxxxxxxxxxxxx        # Pour verification webhooks Ed25519
TELNYX_SIP_CONNECTION_ID=2905402867672155412        # Connection ID existante
TELNYX_SIP_USERNAME=seido-elevenlabs               # Credentials SIP trunk
TELNYX_SIP_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxx
TELNYX_REQUIREMENT_GROUP_ID=rg_xxxxxxxxxxxxx       # Requirement group pre-approuve (numeros BE)

# Dev uniquement (mode manual)
DEV_PHONE_NUMBER=+3242600808                       # Numero existant
DEV_ELEVENLABS_AGENT_ID=xxxxxxxxxxxxxx             # Agent configure manuellement
DEV_ELEVENLABS_PHONE_ID=phnum_0601kjmp9a5ae2d8qt149c1bmr7h  # Phone ID ElevenLabs
```

**Ou les ajouter :**
- **Dev local :** `.env.local` (deja dans .gitignore)
- **Preview :** Vercel → Settings → Environment Variables → Preview
- **Production :** Vercel → Settings → Environment Variables → Production

---

### Etape 6 : Verification pre-implementation

Avant de commencer US-001, verifier que :

- [x] Compte Telnyx cree + numero belge achete (+32 4 260 08 08)
- [x] SIP Connection FQDN configuree vers `sip.rtc.elevenlabs.io`
- [x] Numero importe dans ElevenLabs (SIP trunk)
- [ ] Ajustements Telnyx Inbound (SIP region, timeout 30s, decocher G729)
- [ ] "Encode contact header" coche dans Telnyx Config
- [ ] Outbound auth configuree dans ElevenLabs (credentials Telnyx)
- [ ] Agent ElevenLabs assigne au numero
- [ ] **Test d'appel reussi** (appeler le numero → l'agent repond)
- [ ] Compte Anthropic cree + API key active
- [ ] Compte ElevenLabs Pro actif + API key active
- [ ] Les API keys ajoutees dans `.env.local`
- [ ] Les API keys ajoutees dans Vercel (preview + production)
- [ ] `npm install ai @ai-sdk/anthropic @react-pdf/renderer elevenlabs telnyx` execute
- [ ] `npm run lint` passe apres installation

**Temps total estime :** ~15 min de setup restant (ajustements + test d'appel)

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
Locataire appelle (+32 4 260 08 08)
         |
         v
  ┌──────────────────┐
  │  TELNYX            │  Telephonie (numero belge dedie par equipe)
  │  SIP Trunk (FQDN)  │  ~$1.00/mo par numero, ~$0.003/min inbound
  └────────┬─────────┘
           | SIP INVITE → sip.rtc.elevenlabs.io:5060 (TCP)
           | Auth: digest credentials (seido-elevenlabs)
           v
  ┌──────────────────────────────┐
  │  ELEVENLABS                   │  Conversational AI (tout-en-un)
  │  Conversational AI            │
  │  ┌─────────────────────────┐ │
  │  │ STT: Scribe v2          │ │  ~150ms latence, 90+ langues
  │  │ LLM: Claude Haiku 4.5   │ │  Natif ElevenLabs ($0.0075/min)
  │  │ TTS: Flash v2.5         │ │  75ms TTFB, 32 langues
  │  │ Turn-taking: natif      │ │  Fillers, barge-in, endpointing
  │  └─────────────────────────┘ │
  │  Detection auto FR/NL/EN     │  $0.08-$0.10/min tout compris
  └────────┬─────────────────────┘
           |
           | HTTP POST webhook (fin d'appel)
           | Types: post_call_transcription, post_call_audio, call_initiation_failure
           | Payload: transcript, analysis, metadata (format GET /conversations/{id})
           | Signature: HMAC via header ElevenLabs-Signature
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
| Telnyx (SIP trunk) | ~60% moins cher que Twilio ($1.00/mo vs $3.00/mo par numero, $0.003/min vs $0.01/min). Audio HD 16kHz via G.722 (vs 8kHz Twilio). Configuration SIP trunk un peu plus complexe mais deja faite. |
| Webhook post-appel | Decouple le pipeline vocal de SEIDO. ElevenLabs gere l'appel, SEIDO traite le resultat. Simple, robuste. |
| @react-pdf/renderer | Pas de Chromium, compatible Vercel serverless, genere en <200ms. |

### Pourquoi Telnyx au lieu de Twilio

| Critere | Twilio | Telnyx |
|---------|--------|--------|
| **Numero BE/mo** | $3.00 | **$1.00** |
| **Inbound/min** | $0.01 | **$0.003** |
| **Audio** | 8kHz PCM | **16kHz G.722 HD** |
| **Integration ElevenLabs** | Native (3 champs) | SIP trunk (config manuelle) |
| **Infra EU** | Frankfurt | **Amsterdam** (plus proche BE) |
| **Cout annuel/equipe** | ~$48 | **~$15** |
| **Setup** | 2 min | 15 min (deja fait) |

**Delta : ~$33/an/equipe d'economie.** A 50 equipes, c'est ~$1650/an. La complexite SIP est un one-time cost deja absorbe.

---

## 3 — Recherche et analyse des outils

### 3.1 Telephonie — Comparaison

| Provider | Numero BE/mo | Inbound/min | Infra EU | Audio | Integration ElevenLabs |
|----------|-------------|-------------|----------|-------|----------------------|
| **Telnyx** ✅ | **$1.00** | **$0.003** | **Amsterdam** | **16kHz G.722 HD** | **SIP trunk FQDN (configure)** |
| Twilio | $3.00 | $0.01 | Frankfurt | 8kHz PCM | Native (plug-and-play) |
| Vonage | $1.40-$3.00 | $0.014 | — | Standard | WebSocket |
| Plivo | $0.50 | $0.018 | — | Limited | Non |
| SignalWire | Contact | $0.007 | — | Native | Non |

**Choix : Telnyx** — Meilleur rapport qualite/prix. ~60% moins cher que Twilio par numero, audio HD 16kHz (meilleure qualite vocale pour l'IA), infra Amsterdam a 200km de Bruxelles (latence minimale). La configuration SIP trunk est plus complexe que l'integration native Twilio, mais c'est un one-time cost deja absorbe. Le SDK Node.js (v2.x) permet le provisioning programmatique des numeros via API.

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
  model: anthropic('claude-haiku-4-5'),
  system: `Tu es un assistant qui analyse des transcripts d'appels telephoniques
           de locataires signalant des problemes de maintenance. Extrais les
           informations structurees. La description doit TOUJOURS etre en francais.`,
  prompt: transcript,
  output: Output.object({
    schema: interventionSchema,
  }),
})

// result.output est type-safe (AI SDK 6.x — pas result.object)
// result.usage contient inputTokens, outputTokens, totalTokens pour le billing tracking
const extraction = result.output
```

```typescript
// Gestion d'erreur — NoObjectGeneratedError si le LLM echoue a generer du JSON valide
import { generateText, Output, NoObjectGeneratedError } from 'ai'

try {
  const result = await generateText({ ... })
} catch (error) {
  if (NoObjectGeneratedError.isInstance(error)) {
    // error.text = texte brut genere par le LLM (pas du JSON valide)
    // error.finishReason = 'length' si le LLM a manque de tokens
    // error.usage = tokens consommes meme en cas d'echec
    console.error('Extraction failed:', error.finishReason, error.text?.slice(0, 200))
    // Fallback : creer l'intervention avec le transcript brut
  }
}
```

> **Note API SDK 6.x :** `generateObject` est deprecie (retire dans une future version majeure). Utiliser `generateText` + `Output.object()`. Le resultat est dans `result.output` (pas `result.object`). Token tracking dans `result.usage` / `result.totalUsage`.

---

## 4 — Stack technique retenu

| Composant | Outil | Role | Cout |
|-----------|-------|------|------|
| **Telephonie** | Telnyx (SIP trunk FQDN) | Numeros belges, audio HD G.722 | ~$1.00/mo/numero + ~$0.003/min |
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
  "elevenlabs": "^1.x",            // SDK ElevenLabs (webhook verification)
  "telnyx": "^2.x"                 // SDK Telnyx (provisioning + webhook verification)
}
```

### Comptes externes a creer

> **Voir Section 0 (Pre-requis) pour le guide detaille etape par etape.**

| Service | A faire | Donnees necessaires |
|---------|---------|---------------------|
| Anthropic | Creer compte, API key (pour AI SDK post-traitement) | Carte bancaire |
| Telnyx | ✅ Fait — Compte cree, numero BE achete, SIP trunk configure | — |
| ElevenLabs | Creer compte Pro ($99/mo = 1100 min), configurer agent | System prompt, config LLM |

---

## 5 — Flux de conversation IA

### 5.1 Script de conversation (4 etapes)

L'agent ElevenLabs suit un script structure en 4 etapes. Ce script a ete simplifie
par rapport a la v3.0 (7 etapes) pour etre plus naturel et moins robotique.
L'urgence et la localisation sont maintenant deduites par le post-traitement AI SDK.

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

> **Variables du prompt :**
> - `{{team_name}}` : nom de l'equipe (ex: "Immo Dupont")
> - `{{custom_instructions}}` : instructions personnalisees du gestionnaire (max 500 chars, optionnel)
>
> Si `custom_instructions` est non-vide, il est injecte comme section `## Instructions specifiques de l'agence`.

### 5.2 Differences v3.0 (7 etapes) → v3.1 (4 etapes)

| Supprime | Raison |
|----------|--------|
| Accueil RGPD detaille | Integre dans le `first_message` de l'agent ElevenLabs |
| Localisation (piece) | Deduite par post-traitement AI SDK depuis la description libre |
| Urgence | Deduite par post-traitement AI SDK (sauf danger explicite → 112) |
| Disponibilites | Non necessaire pour la creation de demande |

**Avantages :** Appel plus court (~2 min vs ~4 min), plus naturel, moins de friction.

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
-- Un numero par equipe, lie a Telnyx + ElevenLabs
CREATE TABLE ai_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,                -- "+32..."
  telnyx_connection_id TEXT,                 -- ID connexion SIP Telnyx
  telnyx_phone_number_id TEXT,               -- ID numero Telnyx (pour API)
  elevenlabs_agent_id TEXT,                  -- ID agent ElevenLabs
  elevenlabs_phone_number_id TEXT,           -- ID phone number ElevenLabs (phnum_xxx)
  custom_instructions TEXT,                  -- Instructions personnalisees gestionnaire (max 500 chars)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id)                            -- 1 numero par equipe
);

-- Table: ai_phone_calls
-- Log de chaque appel avec transcript et metadata
CREATE TABLE ai_phone_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  phone_number_id UUID REFERENCES ai_phone_numbers(id),
  caller_phone TEXT,                         -- Numero de l'appelant
  identified_user_id UUID REFERENCES users(id),  -- Locataire identifie (nullable)
  intervention_id UUID REFERENCES interventions(id),  -- Intervention creee (nullable)

  -- Contenu
  transcript TEXT,                           -- Transcript complet
  structured_summary JSONB,                  -- Resume structure (output AI SDK)
  language TEXT DEFAULT 'fr',                -- Langue detectee (fr/nl/en)

  -- Metadata appel
  duration_seconds INTEGER,
  elevenlabs_conversation_id TEXT NOT NULL,   -- ID conversation ElevenLabs
  call_status TEXT DEFAULT 'completed',      -- completed, failed, abandoned, transferred

  -- Documents generes
  pdf_document_path TEXT,                    -- Path dans Supabase Storage

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(elevenlabs_conversation_id)         -- Idempotence webhook (upsert)
);

-- Table: ai_phone_usage
-- Compteur de minutes par equipe par mois (pour billing)
CREATE TABLE ai_phone_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  month DATE NOT NULL,                       -- Premier jour du mois (2026-03-01)
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

> **Important :** ElevenLabs a UN seul webhook par workspace (pas par agent).
> Toutes les conversations de tous les agents arrivent sur le meme endpoint.
> L'equipe est identifiee via `agent_id` dans le payload → lookup `ai_phone_numbers`.

```typescript
// app/api/elevenlabs-webhook/route.ts
// Recoit le webhook de ElevenLabs a la fin de chaque appel
// UN endpoint pour TOUS les agents du workspace
//
// ⚠️ IMPORTANT:
// - Header correct: "ElevenLabs-Signature" (pas x-elevenlabs-signature)
// - ElevenLabs n'a PAS de retry — si ce handler echoue, l'appel est perdu
// - Repondre HTTP 200 rapidement, sinon auto-disable apres 10 echecs consecutifs

import { timingSafeEqual, createHmac } from 'crypto'

const MAX_PAYLOAD_SIZE = 1_000_000 // 1MB — protection DoS

export async function POST(req: Request) {
  // 0. Protection DoS — rejeter les payloads trop gros
  const contentLength = parseInt(req.headers.get('content-length') || '0', 10)
  if (contentLength > MAX_PAYLOAD_SIZE) {
    return Response.json({ error: 'Payload too large' }, { status: 413 })
  }

  // 1. Lire le body en TEXT (pas json) — necessaire pour verifier la signature
  const body = await req.text()

  // 2. Valider la signature HMAC-SHA256 du webhook
  // Header: "ElevenLabs-Signature" (format: "t=<timestamp>,v0=<signature>")
  const signatureHeader = req.headers.get('ElevenLabs-Signature')
  if (!signatureHeader) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Utiliser le SDK ElevenLabs qui gere:
  // - Verification signature HMAC-SHA256
  // - Validation timestamp (anti-replay)
  // - Parsing du payload
  const client = new ElevenLabs({ apiKey: process.env.ELEVENLABS_API_KEY })
  let event
  try {
    event = client.webhooks.constructEvent(
      body,
      signatureHeader,
      process.env.ELEVENLABS_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Ignorer les events non-transcription (audio, failures)
  if (event.type !== 'post_call_transcription') {
    return Response.json({ ok: true })
  }

  const payload = event.data
  // payload: agent_id, conversation_id, transcript[], metadata, analysis
  // Ref: https://elevenlabs.io/docs/eleven-agents/workflows/post-call-webhooks

  // 4. Idempotence — verifier si deja traite AVANT le traitement lourd
  const { data: existing } = await supabase
    .from('ai_phone_calls')
    .select('id')
    .eq('elevenlabs_conversation_id', payload.conversation_id)
    .limit(1)
    .maybeSingle()

  if (existing) {
    return Response.json({ ok: true, already_processed: true })
  }

  // 5. Identifier l'equipe via l'agent_id (reverse lookup multi-tenant)
  const { data: phoneNumber } = await supabase
    .from('ai_phone_numbers')
    .select('id, team_id')
    .eq('elevenlabs_agent_id', payload.agent_id)
    .limit(1)
    .single()

  if (!phoneNumber) {
    console.error(`Unknown agent_id: ${payload.agent_id}`)
    return Response.json({ error: 'Unknown agent' }, { status: 404 })
  }

  const teamId = phoneNumber.team_id

  // 6. Identifier le locataire via caller ID
  const callerPhone = payload.metadata?.phone_call?.body?.from_number
  const tenant = await identifyTenantByPhone(callerPhone, teamId)

  // 7. Extraire les infos structurees via AI SDK
  const transcriptText = payload.transcript
    .map((t: { role: string; message: string }) => `${t.role}: ${t.message}`)
    .join('\n')
  const summary = await extractInterventionSummary(transcriptText)

  // 8. Creer l'intervention
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

  // 9. Generer le PDF (upload vers Supabase Storage, retourner signed URL)
  // Note: @react-pdf/renderer a un memory leak connu — serverless cold starts
  // mitigent le probleme car chaque instance est ephemere
  const pdfPath = await generateCallReportPDF({
    intervention,
    transcript: transcriptText,
    summary,
    tenant,
    callDuration: payload.metadata.call_duration_secs,
    language: payload.metadata.main_language ?? 'fr',
  })

  // 10. Stocker le log d'appel (upsert — UNIQUE(elevenlabs_conversation_id))
  await storeCallLog({
    team_id: teamId,
    phone_number_id: phoneNumber.id,
    caller_phone: callerPhone,
    identified_user_id: tenant?.id,
    intervention_id: intervention.id,
    transcript: transcriptText,
    structured_summary: summary,
    duration_seconds: payload.metadata.call_duration_secs,
    elevenlabs_conversation_id: payload.conversation_id,
    pdf_document_path: pdfPath,
    language: payload.metadata.main_language ?? 'fr',
  })

  // 11. Mettre a jour le compteur de minutes (Stripe Billing Meters)
  await reportUsageToStripe(teamId, Math.ceil(payload.metadata.call_duration_secs / 60))

  // 12. Notifier le gestionnaire
  await createInterventionNotification(intervention.id)
  await sendCallReportEmail(teamId, intervention, summary, pdfPath)

  return Response.json({ success: true, intervention_id: intervention.id })
}
```

> **Zero-retry mitigation :** ElevenLabs n'a PAS de retry webhook. Si le handler
> echoue, l'appel est perdu. Pour se proteger :
> 1. **Sauver le payload brut en DB** des la verification de signature (avant tout traitement)
> 2. **Cron job de rattrapage** : `GET /v1/convai/conversations` pour lister les conversations
>    des dernieres 24h et detecter les appels non traites
> 3. **Monitoring** : Alerter si le nombre d'appels ElevenLabs (via API) diverge du nombre
>    d'entrees dans `ai_phone_calls`

### 7.2 Service Telnyx — Provisioning numeros

```typescript
// lib/services/domain/telnyx-phone.service.ts
// Gere l'achat et la configuration des numeros via API Telnyx

import Telnyx from 'telnyx'

const telnyx = new Telnyx({ apiKey: process.env.TELNYX_API_KEY! })

export const telnyxPhoneService = {
  /**
   * Rechercher des numeros belges disponibles
   */
  async searchAvailableNumbers(locality?: string) {
    const response = await fetch(
      `https://api.telnyx.com/v2/available_phone_numbers?` +
      `filter[country_code][]=BE&filter[phone_number_type]=local&` +
      `filter[features][]=voice&filter[limit]=10` +
      (locality ? `&filter[locality]=${locality}` : ''),
      {
        headers: {
          'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )
    return response.json()
  },

  /**
   * Acheter un numero et l'assigner a la SIP connection
   *
   * IMPORTANT: requirement_group_id va DANS chaque objet phone_number, PAS au top-level
   * IMPORTANT: Telnyx SDK number search (Issue #289) ignore les filtres → utiliser REST direct
   */
  async purchaseNumber(phoneNumber: string) {
    // Utiliser REST direct (SDK a des bugs connus avec les filtres)
    const response = await fetch('https://api.telnyx.com/v2/number_orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connection_id: process.env.TELNYX_SIP_CONNECTION_ID!,
        phone_numbers: [{
          phone_number: phoneNumber,
          requirement_group_id: process.env.TELNYX_REQUIREMENT_GROUP_ID!,
        }],
      }),
    })
    return response.json()
  },

  /**
   * Liberer un numero
   *
   * IMPORTANT: C'est DELETE (pas POST /actions/delete)
   * Le numero passe en hold period (2 semaines) puis aging (2 semaines)
   * Verifier qu'aucun appel n'est en cours avant suppression
   */
  async releaseNumber(phoneNumberId: string) {
    await fetch(
      `https://api.telnyx.com/v2/phone_numbers/${phoneNumberId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
        },
      }
    )
  },
}
```

### 7.3 Service ElevenLabs — Gestion agents

```typescript
// lib/services/domain/elevenlabs-agent.service.ts
// Gere la creation et configuration des agents ElevenLabs via API

// ⚠️ EU data residency (api.eu.residency.elevenlabs.io) = Enterprise plan uniquement
// Sur plan Pro, utiliser l'endpoint standard : api.elevenlabs.io
// Upgrader vers Enterprise quand le volume justifie le cout
const ELEVENLABS_API_URL = process.env.ELEVENLABS_EU_RESIDENCY === 'true'
  ? 'https://api.eu.residency.elevenlabs.io/v1/convai'
  : 'https://api.elevenlabs.io/v1/convai'

export const elevenlabsAgentService = {
  /**
   * Creer un agent ElevenLabs pour une equipe
   */
  async createAgent(teamName: string, systemPrompt: string) {
    const response = await fetch(`${ELEVENLABS_API_URL}/agents/create`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `SEIDO - ${teamName}`,
        conversation_config: {
          agent: {
            first_message: `Bonjour, vous avez contacte ${teamName}. Je suis l'assistant vocal pour les demandes d'intervention. Comment puis-je vous aider ?`,
            language: 'fr',
            prompt: {
              prompt: systemPrompt,
              llm: 'claude-haiku-4-5',
            },
          },
          tts: {
            voice_id: 'JBFqnCBsd6RMkjVDRZzb', // A configurer
          },
        },
      }),
    })
    const data = await response.json()
    return data // contient agent_id
  },

  /**
   * Importer un numero dans ElevenLabs via SIP trunk
   *
   * IMPORTANT (juillet 2025 migration) :
   * - Endpoint: POST /v1/convai/phone-numbers (PAS /create — deprecie)
   * - Config: inbound_trunk + outbound_trunk (PAS inbound_trunk_config/provider_config)
   * - agent_id: doit etre assigne via un PATCH separe (pas dans le create)
   */
  async importPhoneNumber(phoneNumber: string, agentId: string) {
    // Etape 1 : Importer le numero
    const response = await fetch(`${ELEVENLABS_API_URL}/phone-numbers`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        label: `SEIDO ${phoneNumber}`,
        provider: 'sip_trunk',
        inbound_trunk: {
          // Ne PAS restreindre par IP — ElevenLabs utilise des IPs dynamiques pour RTP
          media_encryption: 'disabled',
        },
        outbound_trunk: {
          address: 'sip.telnyx.com',
          transport: 'tls',
          media_encryption: 'disabled',
          credentials: {
            username: process.env.TELNYX_SIP_USERNAME!,
            password: process.env.TELNYX_SIP_PASSWORD!,
          },
        },
      }),
    })
    const data = await response.json()
    // data.phone_number_id = "phnum_xxx"

    // Etape 2 : Assigner l'agent au numero (PATCH separe obligatoire)
    await fetch(`${ELEVENLABS_API_URL}/phone-numbers/${data.phone_number_id}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agent_id: agentId }),
    })

    return data.phone_number_id
  },

  /**
   * Supprimer un numero d'ElevenLabs
   */
  async deletePhoneNumber(phoneNumberId: string) {
    await fetch(`${ELEVENLABS_API_URL}/phone-numbers/${phoneNumberId}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY! },
    })
  },

  /**
   * Mettre a jour un agent
   */
  async updateAgent(agentId: string, config: Record<string, unknown>) {
    await fetch(`${ELEVENLABS_API_URL}/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    })
  },
}
```

### 7.4 Page Parametres — Activation du numero

> **Design complet :** voir [`ai-phone-self-service-design.md`](./ai-phone-self-service-design.md) Section 4.

```
/gestionnaire/parametres/telephone-ia

┌──────────────────────────────────────────────┐
│  Assistant Vocal IA               ● Actif    │
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

Le gestionnaire peut modifier **uniquement** les instructions personnalisees
(max 500 caracteres). Le prompt de base (script 4 etapes) est **verrouille**.
Le bouton "Tester l'assistant" ouvre le widget ElevenLabs (text-only, demi-tarif).

### 7.5 Historique des appels

```
/gestionnaire/parametres/telephone-ia/historique

┌─────────────────────────────────────────────────────┐
│  Historique des appels                               │
│                                                      │
│  27 fev 2026 — 14:32 (3 min 12s)                   │
│  Jean Dupont — +32 475 XX XX XX                     │
│  "Fuite d'eau dans la salle de bain"                │
│  → Intervention #1247 creee                         │
│  [Voir intervention] [Telecharger PDF]              │
│                                                      │
│  27 fev 2026 — 09:15 (1 min 45s)                   │
│  Numero inconnu — +32 486 XX XX XX                  │
│  "Probleme de chauffage"                            │
│  → Intervention #1246 creee (non identifie)         │
│  [Voir intervention] [Telecharger PDF]              │
│                                                      │
│  26 fev 2026 — 18:47 (2 min 30s)                   │
│  Marie Janssens — +32 472 XX XX XX                  │
│  "Volet roulant bloque"                             │
│  → Intervention #1245 creee                         │
│  [Voir intervention] [Telecharger PDF]              │
└─────────────────────────────────────────────────────┘
```

### 7.6 Badge dans l'intervention

Les interventions creees par l'assistant IA affichent un badge special :

```
┌──────────────────────────────────────┐
│  Cree par assistant telephonique     │
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
| **Disclosure IA** | EU AI Act Art. 50 : informer que l'appel est gere par une IA **au debut de chaque appel** | `first_message` de l'agent : "Je suis l'assistant vocal..." |
| **Consentement enregistrement** | Art. 314bis Code penal belge : consentement **explicite** requis. Le silence n'est PAS un consentement valide. | Le `first_message` mentionne la transcription. **Si le locataire refuse, proposer : "Vous pouvez envoyer votre demande par email a [email]."** |
| **Alternative non-enregistree** | Loi belge des telecoms : offrir une alternative si refus | Rediriger vers email ou formulaire web |
| **Retention audio** | NE PAS stocker l'audio brut | Ne pas ecouter le webhook `post_call_audio`. ElevenLabs renvoie uniquement le transcript texte. |
| **Retention transcript** | 6-12 mois proportionnel a la finalite (pas de duree fixe en RGPD) | Cron job de nettoyage apres 12 mois post-cloture intervention |
| **Acces aux donnees** | Seul le gestionnaire de l'equipe | RLS policy sur ai_phone_calls |
| **Droit a l'effacement** | RGPD Art. 17 : le locataire peut demander suppression du transcript | Prevu dans le workflow RGPD existant |
| **Classification EU AI Act** | **Risque limite** (pas de decision automatisee, pas de biometrie) | Obligation de transparence uniquement (disclosure IA) |

### 8.2 Securite technique

| Mesure | Implementation |
|--------|----------------|
| **Webhook ElevenLabs** | Header: **`ElevenLabs-Signature`** (majuscules). HMAC-SHA256. Format: `t=<timestamp>,v0=<signature>`. Verification via SDK `constructEvent()` qui gere signature + timestamp + parsing. **Zero retry** — un seul envoi. |
| **Anti-replay** | Le SDK ElevenLabs valide le timestamp dans la signature. Completer par une verification manuelle: rejeter si age > 5 min. |
| **Timing-safe comparison** | Le SDK utilise `timingSafeEqual` internement. Si verification manuelle, TOUJOURS utiliser `crypto.timingSafeEqual`. |
| **Idempotence** | Verifier `UNIQUE(elevenlabs_conversation_id)` AVANT traitement. Upsert avec `onConflict`. |
| **DoS protection** | Valider `Content-Length < 1MB` avant lecture du body. Rate limit Upstash sur `/api/elevenlabs-webhook`. |
| **Telnyx webhook** | **NE PAS configurer** de webhook URL sur la SIP Connection — cela active le mode "programmable" qui degrade la qualite audio. Les post-call data viennent d'ElevenLabs. |
| **Telnyx SIP auth** | Credentials digest (`seido-elevenlabs` + password) pour l'outbound. **NE PAS** faire d'IP allowlisting — ElevenLabs utilise des IPs dynamiques pour RTP. |
| **API key storage** | Variables d'environnement Vercel (TELNYX_API_KEY, ELEVENLABS_API_KEY, ANTHROPIC_API_KEY, TELNYX_SIP_PASSWORD) |
| **Rate limiting** | Upstash sliding window (100 req/min) sur `/api/elevenlabs-webhook` |
| **Caller ID spoofing** | Ne jamais accorder d'acces eleve basee uniquement sur le caller ID |
| **Duree max appel** | Cap a 8 minutes dans la config ElevenLabs (`max_duration_seconds: 480`) |
| **Channel limit** | 10 appels simultanes max dans Telnyx. **Attention :** ElevenLabs Pro = 20 concurrent calls pour TOUS les agents du workspace. |
| **Error leakage** | Reponses generiques (`{ error: 'Unauthorized' }`) — jamais de stack traces ou details internes |
| **Payload injection** | Tous les champs du webhook sont valides avec Zod AVANT insertion en DB |

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
| Numero Telnyx | ~$1.00/mo | — |
| 60 min ElevenLabs | ~$6.00 ($0.10/min) | — |
| 60 min Telnyx inbound | ~$0.18 ($0.003/min) | — |
| AI SDK Claude Haiku (post-traitement) | ~$0.50 (20 appels x $0.025) | — |
| **Total cout** | **~$7.68/mo** | — |
| **Revenue** | — | **$15/mo** |
| **Marge** | — | **~49%** |

> **Vs Twilio :** Le cout total etait ~$10.10/mo avec Twilio (marge 33%). Avec Telnyx, on economise ~$2.42/mo par equipe et la marge passe de 33% a 49%.

### 9.3 Depassement

| Poste cout | Cout reel/min | Prix facture/min | Marge |
|-----------|---------------|------------------|-------|
| ElevenLabs | $0.10 | — | — |
| Telnyx | $0.003 | — | — |
| AI SDK | ~$0.0025 | — | — |
| **Total** | **~$0.1055** | **$0.25** | **~58%** |

### 9.4 Implementation Stripe

- Creer un **Billing Meter** dans Stripe (`ai_voice_minutes`) + un Price associe
- Reporter l'usage via **`stripe.billing.meterEvents.create()`** (PAS `createUsageRecord` — retire depuis API 2025-03-31)
- Depassement facture automatiquement via Stripe Billing Meters
- **Note :** Les meter events sont **asynchrones** — pas immediatement refletes sur la facture
- **Constraints :** Valeurs entieres uniquement, timestamp dans les 35 derniers jours
- Ecouter les erreurs : `v1.billing.meter.error_report_triggered` webhook
- Page de gestion via le Stripe Customer Portal existant

```typescript
// Reporter l'usage apres chaque appel
await stripe.billing.meterEvents.create({
  event_name: 'ai_voice_minutes',
  payload: {
    value: Math.ceil(durationSeconds / 60), // Arrondi au-dessus, entiers uniquement
    stripe_customer_id: team.stripe_customer_id,
  },
})
```

---

## 10 — User stories (MVP)

### Vue d'ensemble

| # | ID | Titre | Taille | Priorite | Couche |
|---|-----|-------|--------|----------|--------|
| 1 | US-001 | Schema DB + migrations | S | 1 | Schema |
| 2 | US-002 | Provisioning Telnyx + ElevenLabs (API) | M | 2 | Backend |
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
- Colonnes Telnyx : `telnyx_connection_id`, `telnyx_phone_number_id` (au lieu de `twilio_phone_number_sid`, `twilio_account_sid`)
- Colonne ElevenLabs : `elevenlabs_phone_number_id` (en plus de `elevenlabs_agent_id`)
- Colonne `phone` ajoutee a `users` (si absente)
- Colonne `source` ajoutee a `interventions` (si absente)
- RLS policies pour gestionnaire/admin
- `npm run supabase:types` regenere sans erreur
- Lint passe

**Taille :** S | **Depend de :** — | **Couche :** Schema

---

#### US-002 — Provisioning Telnyx + ElevenLabs (API)

**En tant que** gestionnaire, **je veux** pouvoir activer un numero telephonique pour mon equipe **pour que** mes locataires puissent appeler l'assistant IA.

**Criteres d'acceptation :**
- Server action `provisionPhoneNumber(teamId)` qui :
  - Recherche un numero belge disponible via API Telnyx (`GET /v2/available_phone_numbers`)
  - Achete le numero via API Telnyx (`POST /v2/number_orders`)
  - Assigne le numero a la SIP Connection existante (`PATCH /v2/phone_numbers/{id}`)
  - Importe le numero dans ElevenLabs via API SIP trunk (`POST /v1/convai/phone-numbers`)
  - Configure les credentials SIP (digest auth) sur le numero ElevenLabs
  - Associe l'agent ElevenLabs de l'equipe au numero
  - Stocke le numero + IDs Telnyx/ElevenLabs dans `ai_phone_numbers`
- Server action `deprovisionPhoneNumber(teamId)` pour liberation
  - Supprime le numero d'ElevenLabs (`DELETE /v1/convai/phone-numbers/{id}`)
  - Libere le numero Telnyx (`DELETE /v2/phone_numbers/{id}`) — PAS POST /actions/delete
  - Desactive l'entree dans `ai_phone_numbers`
- Gestion d'erreur : numero indisponible, quota atteint, regulatory requirements pending
- **Note Belgique :** Les numeros belges necessitent une `requirement_group_id` (adresse + justificatif). Pour le MVP, on utilise le requirement group deja valide.
- Lint passe

**Taille :** M | **Depend de :** US-001, US-003 | **Couche :** Backend

---

#### US-003 — Configuration agent ElevenLabs

**En tant que** developpeur, **je veux** un service qui cree/configure un agent ElevenLabs par equipe **pour que** chaque equipe ait son propre assistant avec son nom d'agence.

**Criteres d'acceptation :**
- Service `elevenlabs-agent.service.ts` avec :
  - `createAgent(teamId, teamName)` → cree un agent ElevenLabs via `POST /v1/convai/agents/create` avec le system prompt personnalise
  - `updateAgent(agentId, config)` → met a jour le prompt / la config via `PATCH /v1/convai/agents/{id}`
  - `deleteAgent(agentId)` → supprime l'agent via `DELETE /v1/convai/agents/{id}`
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
- Route `POST /api/elevenlabs-webhook` qui :
  - Valide `Content-Length < 1MB` (protection DoS)
  - Valide la signature HMAC-SHA256 via header **`ElevenLabs-Signature`** (SDK `constructEvent()`)
  - Verifie l'idempotence via `elevenlabs_conversation_id` AVANT traitement
  - Filtre sur `event.type === 'post_call_transcription'` (ignore audio et failures)
  - Identifie l'equipe via l'agent_id du payload
  - Identifie le locataire via caller phone (`metadata.phone_call.body.from_number`)
  - Appelle `extractInterventionSummary` (US-005)
  - Cree l'intervention via intervention-service
  - Genere le PDF (US-006)
  - Stocke le call log dans `ai_phone_calls` (avec `elevenlabs_conversation_id`)
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
- Nouveau Stripe **Billing Meter** (`ai_voice_minutes`) + Price associe
- Checkout flow pour activer l'add-on
- Usage reporte via `stripe.billing.meterEvents.create()` (PAS `createUsageRecord` — retire)
  - Valeurs entieres (arrondi au-dessus), timestamp dans les 35 derniers jours
  - Ecouter `v1.billing.meter.error_report_triggered` pour les erreurs
- Depassement facture automatiquement
- Annulation immediate : `invoice_now: true, prorate: true` pour facturer l'usage en cours
- Annulation en fin de periode : usage inclus dans la facture finale
- Integration avec le Customer Portal existant
- Lint passe

**Taille :** M | **Depend de :** US-002, US-011 | **Couche :** Backend

---

#### US-013 — Integration E2E test

**En tant que** developpeur, **je veux** des tests d'integration qui valident le flux complet **pour que** le systeme soit fiable en production.

**Criteres d'acceptation :**
- Test : webhook inbound (mock ElevenLabs payload) → creation intervention → PDF genere
- Test : caller ID match → locataire identifie
- Test : caller ID inconnu → intervention creee avec flag
- Test : extraction structuree avec transcript FR, NL, EN
- Test : compteur de minutes incremente
- Test : verification signature HMAC ElevenLabs
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
| Faible | 10 | 30 min | ~$3.50 | $15 |
| Moyen | 20 | 60 min | ~$7.68 | $15 |
| Eleve | 40 | 120 min | ~$14.50 | $15 + $15 overage = $30 |

### 11.3 Couts fixes mensuels

| Service | Cout | Note |
|---------|------|------|
| ElevenLabs Pro | $99/mo | 1100 min incluses (suffisant pour ~50 equipes) |
| Telnyx | $0/mo (hors numeros) | Pas d'abonnement plateforme, pay-as-you-go |
| Anthropic API | Pay-as-you-go | ~$15-20/mo pour 1000 appels |
| **Total fixe** | **~$115/mo** | Rentable a partir de 8 equipes |

### 11.4 Break-even

- **Cout fixe :** ~$115/mo
- **Revenue par equipe :** $15/mo
- **Break-even :** **8 equipes** avec l'add-on actif

### 11.5 Comparaison Twilio vs Telnyx (par equipe/mois)

| Poste | Twilio | Telnyx | Economie |
|-------|--------|--------|----------|
| Numero | $3.00 | $1.00 | -$2.00 |
| 60 min inbound | $0.60 | $0.18 | -$0.42 |
| **Total telephonie** | **$3.60** | **$1.18** | **-$2.42 (-67%)** |
| Marge sur $15 | 33% | 49% | +16 points |

---

## 12 — Roadmap post-MVP

### V2 (Q3 2026)

| Feature | Description |
|---------|-------------|
| Tool calling live | L'IA lookup le locataire dans Supabase PENDANT l'appel (pas en post-traitement) |
| SMS confirmation | Envoyer un SMS au locataire avec le numero de reference apres l'appel (via Telnyx Messaging API) |
| Config voix custom | Choix de la voix (homme/femme, ton) dans les parametres |
| Dashboard analytics | Stats detaillees : appels/jour, duree moyenne, taux d'identification, categories |

### V3 (Q4 2026)

| Feature | Description |
|---------|-------------|
| Appels sortants | L'IA rappelle le locataire via `POST /v1/convai/sip-trunk/outbound-call` (API ElevenLabs deja documentee) |
| Multi-numero | Plusieurs numeros par equipe (un par immeuble) |
| Voicemail | Si l'IA ne peut pas traiter, option de laisser un message vocal |
| Transcription email | Appliquer le meme traitement aux messages vocaux recus par email |

### V4 (2027)

| Feature | Description |
|---------|-------------|
| WhatsApp integration | Meme assistant IA accessible via WhatsApp (pas que telephone) |
| Video | Le locataire peut envoyer une video du probleme pendant l'appel |
| Prestataire IA | L'IA appelle le prestataire pour planifier le creneau |
| TLS upgrade | Migrer SIP transport de TCP vers TLS + SRTP pour encryption bout-en-bout |

---

## 13 — Self-Service Multi-Tenant

> **Design complet :** [`ai-phone-self-service-design.md`](./ai-phone-self-service-design.md)

Cette section resume les decisions architecturales pour le self-service multi-tenant.
Le design detaille (provisioning, dev/prod, settings, webhook routing, system prompt,
testing) est dans le document lie ci-dessus.

### Decisions cles

| Decision | Choix | Alternative rejetee |
|----------|-------|---------------------|
| Agent par equipe | Clone individuel | Agent partage (pas de customisation) |
| Numero par equipe | Numero unique | Numero partage (pas d'identification) |
| Requirement group | Reutiliser existant | Nouveau groupe (72h d'attente) |
| Webhook | 1 endpoint workspace | N endpoints par agent (pas supporte) |
| Prompt customisation | Instructions appendees (500 chars) | Full prompt editable (trop risque) |
| Mode dev | Variables `DEV_*` | Sandbox Telnyx (n'existe pas) |
| EU data residency | `api.eu.residency.elevenlabs.io` | US endpoint (RGPD non-conforme) |

### Mode Dev vs Production

```bash
# Dev : reutilise la config manuelle existante (pas d'appels API)
AI_PHONE_PROVISIONING=manual

# Production : provisioning automatique via Telnyx + ElevenLabs API
AI_PHONE_PROVISIONING=auto
```

### Flux provisioning (mode auto)

```
Stripe checkout.session.completed
  → Commander numero Telnyx (+32)
  → Cloner agent ElevenLabs (template + team_name)
  → Importer numero dans ElevenLabs (2 etapes : create + PATCH agent)
  → INSERT ai_phone_numbers
  (rollback si une etape echoue)
```

### Webhook routing multi-tenant

```
POST /api/elevenlabs-webhook (workspace-level, 1 pour tous les agents)
  → agent_id du payload
  → SELECT team_id FROM ai_phone_numbers WHERE elevenlabs_agent_id = agent_id
  → Traitement pour cette equipe
  → Upsert ai_phone_calls (idempotent via UNIQUE(elevenlabs_conversation_id))
```

---

*Document genere le 27 fevrier 2026 — v2.0 le 28 fevrier 2026 (Twilio) — v3.0 le 1 mars 2026 (retour Telnyx SIP trunk) — v3.1 le 1 mars 2026 (self-service multi-tenant + script 4 etapes) — v3.2 le 1 mars 2026 (audit documentation + securite : 8 bloqueurs corriges)*
*Basee sur : brainstorming session + recherche 4 agents specialises + verification docs officielles + test dashboard reel + configuration Telnyx/ElevenLabs validee*
*Stack : Telnyx SIP trunk (FQDN) + ElevenLabs Conversational AI (Claude Haiku 4.5) + Vercel AI SDK 6.x (Claude Haiku 4.5) + @react-pdf/renderer*
