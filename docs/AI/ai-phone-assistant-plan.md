# SEIDO AI Phone Assistant — Plan Complet

**Version** : 3.6 — Mars 2026 (Telnyx SIP trunk + Self-Service + Audit securite + WhatsApp + Pricing 3-tier + Landing Page + Dashboard Admin & KPIs + Audit technique mars 2026)
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
14. [Canal WhatsApp](#14--canal-whatsapp)
15. [Landing Page AI Enhancement](#15--landing-page-ai-enhancement)
16. [Dashboard Admin & KPIs](#16--dashboard-admin--kpis)

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
- TTS Voice : choisir une voix native par langue (FR/NL/EN — voix anglaises = accent bleed sur NL)
- TTS Model : **Flash v2.5** (basse latence)
- Max duration : **480 secondes** (8 min pour vocal, 1800 sec pour WhatsApp texte)
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

### Etape 4 : Compte Meta Business + WhatsApp Business API

> **Ref :** [WhatsApp Business API — Meta](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
> **Ref :** [WhatsApp — ElevenLabs](https://elevenlabs.io/docs/eleven-agents/whatsapp)

1. Creer un **Meta Business Manager** sur [business.facebook.com](https://business.facebook.com)
2. Verifier l'entreprise (documents requis : registre commerce + preuve d'adresse < 3 mois) — **1-2 jours ouvrables**
3. Creer une **WhatsApp Business App** dans le Meta Developer Portal
4. Obtenir un **System User Access Token** (permanent, pas de refresh)
5. Creer un **WhatsApp Business Account (WABA)** — 1 seul suffit pour toutes les equipes
6. Ajouter le premier numero (+32 4 260 08 08) au WABA
7. Connecter le WABA a ElevenLabs (Settings → Integrations → WhatsApp)

```bash
# Ajouter dans Vercel + .env.local
META_WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx    # System User permanent token
META_WHATSAPP_BUSINESS_ID=123456789012345        # WABA ID
META_WHATSAPP_PHONE_NUMBER_ID=987654321098765    # Phone Number ID (premier numero)
```

**Architecture multi-tenant WhatsApp :**
- **1 Meta Business Manager** (SEIDO)
- **1 WABA** (WhatsApp Business Account)
- **N numeros** sous ce WABA (1 par equipe)
- Chaque numero a son propre `display_name` et son agent ElevenLabs assigne

**Pricing Meta (Belgique = "Rest of Western Europe") :**

| Type de message | Cout | Scenario |
|-----------------|------|----------|
| **Service** (customer-initiated, reponse < 24h) | **GRATUIT** | Locataire ecrit en premier → GRATUIT |
| **Utility** (business-initiated, template) | ~$0.017/msg | Confirmation envoyee par SEIDO |
| **Marketing** (business-initiated) | ~$0.059/msg | Non utilise |

> **Pour le MVP, 100% des conversations sont service messages (customer-initiated) = GRATUIT.**

---

### Etape 5 : Dependances NPM

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

### Etape 6 : Variables d'environnement — Recapitulatif

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

# Meta WhatsApp Business API (canal WhatsApp)
META_WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx      # System User permanent token
META_WHATSAPP_BUSINESS_ID=123456789012345          # WABA ID (1 pour toutes les equipes)
META_WHATSAPP_PHONE_NUMBER_ID=987654321098765      # Phone Number ID dev (premier numero)

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

### Etape 7 : Verification pre-implementation

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
- [ ] Meta Business Manager cree + entreprise verifiee
- [ ] WABA cree + numero ajoute
- [ ] WABA connecte a ElevenLabs (Settings → Integrations → WhatsApp)
- [ ] **Test WhatsApp reussi** (envoyer un message → l'agent repond)

**Temps total estime :** ~15 min de setup restant (ajustements + test d'appel) + 1-2 jours pour verification Meta Business

---

## 1 — Vision et objectif

### Le probleme

Les locataires appellent le gestionnaire pour signaler des problemes. Ces appels :
- Interrompent le travail du gestionnaire (moyenne 12 appels/jour)
- Generent des informations orales non tracees
- Sont souvent hors heures ouvrables (le soir, le week-end)
- Manquent de structure (description vague, urgence non evaluee)

### La solution

Un **assistant IA multi-canal** par equipe qui :
1. Repond 24/7 aux appels **et messages WhatsApp** des locataires
2. Mene une conversation guidee pour collecter les informations necessaires
3. Cree automatiquement une demande d'intervention dans SEIDO
4. Genere un rapport PDF complet (transcript + resume)
5. Notifie le gestionnaire avec toutes les infos pretes a traiter

### Canaux supportes

| Canal | Mode | Fonctionnement |
|-------|------|----------------|
| **Telephone** | Appel vocal | Locataire appelle → Telnyx SIP → ElevenLabs → conversation vocale |
| **WhatsApp** | Texte, notes vocales, appels | Locataire ecrit/parle sur WhatsApp → Meta Cloud API → ElevenLabs → conversation |

> **Meme numero, meme agent** : le numero belge (+32) sert a la fois pour les appels telephoniques (via Telnyx SIP) et pour WhatsApp (via Meta Cloud API). Le meme agent ElevenLabs gere les deux canaux.

### Benefice cle

> Le locataire appelle ou envoie un WhatsApp, l'IA collecte, SEIDO cree le ticket. Le gestionnaire arrive le matin avec tout sur son tableau de bord — sans avoir decroche une seule fois.

---

## 2 — Architecture technique

### Vue d'ensemble — Architecture dual-canal

```
                    Locataire
                   /         \
        Appel vocal          WhatsApp (texte / vocal / appel)
                |                      |
                v                      v
  ┌──────────────────┐    ┌──────────────────────┐
  │  TELNYX            │    │  META CLOUD API        │
  │  SIP Trunk (FQDN)  │    │  WhatsApp Business     │
  │  ~$1.00/mo/numero  │    │  1 WABA → N numeros    │
  └────────┬─────────┘    │  Service msg = GRATUIT  │
           |               └──────────┬─────────────┘
           | SIP INVITE               | WhatsApp API
           | → sip.rtc.elevenlabs.io  | → ElevenLabs native
           v                          v
  ┌────────────────────────────────────────────┐
  │  ELEVENLABS Conversational AI               │
  │  (meme agent gere les 2 canaux)            │
  │  ┌──────────────────────────────────────┐  │
  │  │ STT: Scribe v2       (~150ms)       │  │
  │  │ LLM: Claude Haiku 4.5 ($0.0075/min) │  │
  │  │ TTS: Flash v2.5      (75ms TTFB)    │  │
  │  │ Turn-taking: natif   (barge-in)     │  │
  │  └──────────────────────────────────────┘  │
  │  Detection auto FR/NL/EN                    │
  │  $0.08-$0.10/min (appel vocal)             │
  │  WhatsApp text: facturation par message    │
  └────────────────┬───────────────────────────┘
                   |
                   | HTTP POST webhook (fin de conversation)
                   | Types: post_call_transcription (appel/WhatsApp)
                   | Signature: HMAC via header ElevenLabs-Signature
                   v
  ┌──────────────────────────────┐
  │  SEIDO API (Next.js)          │
  │  POST /api/elevenlabs-webhook │
  │  ┌─────────────────────────┐ │
  │  │ 1. Identifier equipe    │ │  agent_id → team_id lookup
  │  │ 2. Identifier locataire │ │  Caller ID / WhatsApp number
  │  │ 3. Creer intervention   │ │  Via intervention-service
  │  │ 4. Generer PDF          │ │  @react-pdf/renderer
  │  │ 5. Stocker transcript   │ │  Supabase Storage
  │  │ 6. Envoyer notification │ │  Push + Email (avec PDF)
  │  │ 7. Logger activite      │ │  activity_logs
  │  └─────────────────────────┘ │
  └──────────────────────────────┘
```

### Pourquoi cette architecture

| Decision | Raison |
|----------|--------|
| ElevenLabs tout-en-un | Pas de pipeline custom a maintenir. STT+LLM+TTS+turn-taking gere nativement. Time-to-market minimal. |
| Telnyx (SIP trunk) | ~60% moins cher que Twilio ($1.00/mo vs $3.00/mo par numero, $0.003/min vs $0.01/min). Audio HD 16kHz via G.722 (vs 8kHz Twilio). Configuration SIP trunk un peu plus complexe mais deja faite. |
| WhatsApp via ElevenLabs natif | Integration native depuis dec 2025. Meme agent gere les 2 canaux (tel + WhatsApp). Pas de code supplementaire cote SEIDO — ElevenLabs route automatiquement. |
| Meta Cloud API (direct) | Pas de BSP (Business Solution Provider) intermediaire. 1 WABA pour toutes les equipes. Messages service (customer-initiated) = GRATUIT. |
| Meme numero dual-canal | Le numero belge sert pour SIP (appels) ET WhatsApp (messages). Chemins independants, pas de bridging. |
| Webhook post-appel | Decouple le pipeline vocal de SEIDO. ElevenLabs gere l'appel/chat, SEIDO traite le resultat. Simple, robuste. |
| @react-pdf/renderer | Pas de Chromium, compatible Vercel serverless, genere en <200ms. |

### Pourquoi Telnyx au lieu de Twilio

| Critere | Twilio | Telnyx |
|---------|--------|--------|
| **Numero BE/mo** | $3.00 | **$1.00** |
| **Inbound/min** | $0.01 | **~$0.005** |
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
| **Telnyx** ✅ | **$1.00** | **~$0.005** | **Amsterdam** | **16kHz G.722 HD** | **SIP trunk FQDN (configure)** |
| Twilio | $3.00 | $0.01 | Frankfurt | 8kHz PCM | Native (plug-and-play) |
| Vonage | $1.40-$3.00 | $0.014 | — | Standard | WebSocket |
| Plivo | $0.50 | $0.018 | — | Limited | Non |
| SignalWire | Contact | $0.007 | — | Native | Non |

**Choix : Telnyx** — Meilleur rapport qualite/prix. ~50% moins cher que Twilio par numero, audio HD 16kHz (meilleure qualite vocale pour l'IA), infra Amsterdam a 200km de Bruxelles (latence minimale). La configuration SIP trunk est plus complexe que l'integration native Twilio, mais c'est un one-time cost deja absorbe. Le SDK Node.js (v2.x) permet le provisioning programmatique des numeros via API.

> **Risques documentes (mars 2026)** : Telnyx a un taux d'incidents eleve (44 incidents en 90 jours, dont 16 majeurs). Souscrire aux alertes status.telnyx.com. Les webhooks Telnyx ont un timeout de 2 secondes — repondre 200 immediatement et traiter en async. Belgian +32 numbers requierent une preuve d'adresse belge (<3 mois) et ~72h d'activation.

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

**Choix post-traitement (AI SDK cote SEIDO) : Claude Haiku 4.5** — Ideal pour l'extraction structuree du transcript apres l'appel. $1.00/$5.00 par 1M tokens via API Anthropic directe, ~$0.003/appel (~500 tokens input + ~200 tokens output).

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
| **WhatsApp** | Meta Cloud API (direct) | Canal WhatsApp via 1 WABA | Service msgs = GRATUIT |
| **Pipeline vocal + chat** | ElevenLabs Conversational AI | STT + LLM + TTS + turn-taking + WhatsApp natif | $0.08-$0.10/min (vocal) |
| **LLM (pendant appel)** | Claude Haiku 4.5 (natif ElevenLabs) | Conversation guidee (tel + WhatsApp) | $0.0075/min (inclus ElevenLabs) |
| **LLM (post-appel)** | Claude Haiku 4.5 (via AI SDK) | Extraction structuree du transcript | ~$0.003/appel |
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
| ElevenLabs | Creer compte Pro ($99/mo = 1100 min agent), configurer agent | System prompt, config LLM |
| Meta Business | Creer Meta Business Manager + WABA + connecter a ElevenLabs | Registre commerce, preuve adresse |

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

{{custom_instructions}}
```

> **Variables du prompt :**
> - `{{team_name}}` : nom de l'equipe (ex: "Immo Dupont")
> - `{{custom_instructions}}` : instructions personnalisees du gestionnaire (max 500 chars, optionnel)
>
> Si `custom_instructions` est non-vide, il est injecte comme section `## Instructions specifiques de l'agence`.

### 5.2 Flux texte WhatsApp — Differences avec le vocal

| Aspect | Appel vocal (telephone) | Message texte (WhatsApp) |
|--------|------------------------|--------------------------|
| **Rythme** | Synchrone (2-4 min) | Asynchrone (5-30 min, le locataire repond a son rythme) |
| **Declencheur fin** | Hangup → webhook immediat | Tool "End conversation" OU timeout 30 min → webhook |
| **Transcript** | STT Scribe v2 (qualite variable) | Messages texte bruts (**meilleure qualite**) |
| **`duration_seconds`** | Duree reelle de l'appel | `NULL` (non pertinent) |
| **`channel`** | `phone` | `whatsapp_text` |
| **Media** | Non supporte | Photos, documents, notes vocales |
| **Facturation ElevenLabs** | ~$0.09/min | $0.003/message agent |
| **Facturation SEIDO** | 1 conversation = 1 min equivalente | 1 conversation = 1 min equivalente (meme decompte) |
| **Config ElevenLabs** | `max_duration_seconds: 480` (8 min) | `max_duration_seconds: 1800` (30 min, filet de securite) |

**Flux post-conversation identique :** Quel que soit le canal, le webhook `post_call_transcription` declenche le meme pipeline SEIDO (identifier equipe → identifier locataire → extraire summary AI SDK → creer intervention → PDF → notification). Seule difference : pour `whatsapp_text`, on extrait aussi les URLs media (photos, documents) des metadata du webhook.

### 5.3 Differences v3.0 (7 etapes) → v3.1+ (4 etapes)

| Supprime | Raison |
|----------|--------|
| Accueil RGPD detaille | Integre dans le `first_message` de l'agent ElevenLabs |
| Localisation (piece) | Deduite par post-traitement AI SDK depuis la description libre |
| Urgence | Deduite par post-traitement AI SDK (sauf danger explicite → 112) |
| Disponibilites | Non necessaire pour la creation de demande |

**Avantages :** Appel plus court (~2 min vs ~4 min), plus naturel, moins de friction.

### 5.4 Gestion des cas limites

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
-- Un numero par equipe, lie a Telnyx + ElevenLabs + WhatsApp
CREATE TABLE ai_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,                -- "+32..." (meme numero pour SIP + WhatsApp)
  telnyx_connection_id TEXT,                 -- ID connexion SIP Telnyx
  telnyx_phone_number_id TEXT,               -- ID numero Telnyx (pour API)
  elevenlabs_agent_id TEXT,                  -- ID agent ElevenLabs (gere tel + WhatsApp)
  elevenlabs_phone_number_id TEXT,           -- ID phone number ElevenLabs (phnum_xxx)
  whatsapp_phone_number_id TEXT,             -- ID numero Meta WhatsApp (pour API)
  whatsapp_enabled BOOLEAN DEFAULT false,    -- Canal WhatsApp active
  ai_tier TEXT DEFAULT 'solo',               -- 'solo' | 'equipe' | 'agence'
  auto_topup BOOLEAN DEFAULT false,          -- Recharge automatique a 100%
  custom_instructions TEXT,                  -- Instructions personnalisees gestionnaire (max 500 chars)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id)                            -- 1 numero par equipe
);

-- Table: ai_phone_calls
-- Log de chaque conversation (appel telephonique OU WhatsApp)
CREATE TABLE ai_phone_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  phone_number_id UUID REFERENCES ai_phone_numbers(id),
  caller_phone TEXT,                         -- Numero de l'appelant/WhatsApp
  identified_user_id UUID REFERENCES users(id),  -- Locataire identifie (nullable)
  intervention_id UUID REFERENCES interventions(id),  -- Intervention creee (nullable)

  -- Canal
  channel TEXT NOT NULL DEFAULT 'phone',     -- 'phone' | 'whatsapp_text' | 'whatsapp_voice' | 'whatsapp_call'

  -- Contenu
  transcript TEXT,                           -- Transcript complet
  structured_summary JSONB,                  -- Resume structure (output AI SDK)
  language TEXT DEFAULT 'fr',                -- Langue detectee (fr/nl/en)

  -- Metadata appel
  duration_seconds INTEGER,                  -- NULL pour WhatsApp text
  elevenlabs_conversation_id TEXT NOT NULL,   -- ID conversation ElevenLabs
  call_status TEXT DEFAULT 'completed',      -- completed, failed, abandoned, transferred

  -- Documents generes
  pdf_document_path TEXT,                    -- Path dans Supabase Storage
  media_urls JSONB DEFAULT '[]'::jsonb,     -- Media WhatsApp [{type, url, storage_path}]

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
-- ai_phone_numbers: gestionnaire/admin peut voir, writes via service role (provisioning)
CREATE POLICY "team_managers_view_phone_numbers"
ON ai_phone_numbers FOR SELECT
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

  // 6. Detecter le canal (telephone ou WhatsApp)
  const channel = detectConversationChannel(payload.metadata)
  // 'phone' | 'whatsapp_text' | 'whatsapp_voice' | 'whatsapp_call'

  // 7. Identifier le locataire via caller ID / WhatsApp number
  const callerPhone = payload.metadata?.phone_call?.body?.from_number
    ?? payload.metadata?.whatsapp?.from  // Numero WhatsApp si canal WhatsApp
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
    channel,                                             // 'phone' | 'whatsapp_*'
    identified_user_id: tenant?.id,
    intervention_id: intervention.id,
    transcript: transcriptText,
    structured_summary: summary,
    duration_seconds: channel === 'whatsapp_text' ? null : payload.metadata.call_duration_secs,
    elevenlabs_conversation_id: payload.conversation_id,
    pdf_document_path: pdfPath,
    language: payload.metadata.main_language ?? 'fr',
  })

  // 11. Extraire et stocker les media WhatsApp (photos, documents)
  if (channel === 'whatsapp_text' || channel === 'whatsapp_voice') {
    const mediaUrls = await extractAndStoreWhatsAppMedia(
      payload.metadata?.whatsapp?.media ?? [],  // [{type, media_id, mime_type}]
      phoneNumber.whatsapp_phone_number_id,
      intervention.id,
      teamId,
    )
    // mediaUrls: [{type: 'image', url: 'https://...', storage_path: 'interventions/xxx/photo.jpg'}]
    if (mediaUrls.length > 0) {
      await supabase
        .from('ai_phone_calls')
        .update({ media_urls: mediaUrls })
        .eq('elevenlabs_conversation_id', payload.conversation_id)
    }
  }

  // 12. Mettre a jour le compteur d'unites (Stripe Billing Meters)
  // 1 conversation = 1 unite, quel que soit le canal (voix ou texte)
  const usageUnits = channel === 'whatsapp_text'
    ? 1  // 1 conversation texte = 1 unite equivalente
    : Math.ceil(payload.metadata.call_duration_secs / 60)  // arrondi a la minute
  await reportUsageToStripe(teamId, usageUnits)

  // 13. Notifier le gestionnaire
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

#### Extraction media WhatsApp (etape 11)

```typescript
// lib/services/domain/whatsapp-media.service.ts

async function extractAndStoreWhatsAppMedia(
  mediaItems: Array<{ type: string; media_id: string; mime_type: string }>,
  waPhoneNumberId: string,
  interventionId: string,
  teamId: string,
): Promise<Array<{ type: string; url: string; storage_path: string }>> {
  if (!mediaItems.length) return []

  const results = await Promise.allSettled(
    mediaItems.map(async (item) => {
      // 1. Recuperer l'URL du media via Meta Cloud API
      const mediaUrl = await getMediaUrl(item.media_id)

      // 2. Telecharger le fichier
      const buffer = await downloadMedia(mediaUrl)

      // 3. Stocker dans Supabase Storage
      const ext = mimeToExt(item.mime_type) // image/jpeg → jpg
      const storagePath = `ai-media/${teamId}/${interventionId}/${item.media_id}.${ext}`
      await supabase.storage
        .from('intervention-documents')
        .upload(storagePath, buffer, { contentType: item.mime_type })

      return { type: item.type, url: mediaUrl, storage_path: storagePath }
    })
  )

  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<any>).value)
}

// Meta Cloud API : GET /{media_id} → {url} → GET url avec Bearer token
async function getMediaUrl(mediaId: string): Promise<string> {
  const res = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.META_WHATSAPP_ACCESS_TOKEN}` },
  })
  const { url } = await res.json()
  return url
}
```

> **Note :** Les URLs media Meta expirent apres ~5 minutes. Le download doit etre fait
> immediatement dans le webhook handler. Le stockage Supabase est permanent.

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
              temperature: 0.2,    // Bas pour un assistant professionnel
              max_tokens: 150,     // Reponses courtes (1-3 phrases max)
            },
          },
          tts: {
            model_id: 'eleven_flash_v2_5',  // Basse latence TTS
            voice_id: 'JBFqnCBsd6RMkjVDRZzb', // TODO: 3 voix par langue (FR/NL/EN natives)
          },
          stt: {
            provider: 'elevenlabs', // Scribe v2 — ~150ms latence
          },
          turn: {
            mode: 'turn_based',     // Pas de mode interruption
          },
          conversation: {
            max_duration_seconds: 480, // 8 min vocal (WhatsApp texte: 1800 = 30 min)
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
/gestionnaire/parametres/assistant-ia

┌──────────────────────────────────────────────┐
│  Assistant IA Multi-Canal         ● Actif    │
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
│  🔔 Alerte a 80% (200 min)                  │
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

Le gestionnaire peut :
- **Changer de pack** (Solo/Equipe/Agence) — prorata automatique Stripe
- **Recharger** 100 min manuellement ou activer la recharge automatique
- Modifier **uniquement** les instructions personnalisees (max 500 caracteres)
- Le prompt de base (script 4 etapes) est **verrouille**
- Le bouton "Tester l'assistant" ouvre le widget ElevenLabs (text-only, demi-tarif)

### 7.5 Historique des appels

```
/gestionnaire/parametres/assistant-ia/historique

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
| **WhatsApp — CGU Meta** | Utilisation IA autorisee pour business messaging. Pas d'interdiction d'agent IA. | Respecter les policies Meta Business (pas de spam, opt-in pour messages marketing) |
| **WhatsApp — Consentement** | Le locataire initie la conversation (service message) = consentement implicite | Premiere reponse inclut disclosure IA ("Je suis un assistant IA...") |
| **WhatsApp — Retention** | Meme politique que telephone (6-12 mois) | Messages texte stockes dans `ai_phone_calls.transcript` |

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
| **Duree max session** | Vocal: 8 min (`max_duration_seconds: 480`). Texte WhatsApp: 30 min (`1800`). |
| **Channel limit** | 10 appels simultanes max dans Telnyx. **Attention :** ElevenLabs Pro = 20 concurrent calls pour TOUS les agents du workspace. |
| **Error leakage** | Reponses generiques (`{ error: 'Unauthorized' }`) — jamais de stack traces ou details internes |
| **Payload injection** | Tous les champs du webhook sont valides avec Zod AVANT insertion en DB |

### 8.3 EU AI Act

Le systeme est classe **risque minimal** car :
- Il ne prend aucune decision automatisee affectant les droits du locataire
- Il cree uniquement un ticket que le gestionnaire doit valider
- L'urgence suggeree est indicative, pas contraignante

### 8.4 Risques operationnels et mitigations

> **Source :** Audit mars 2026 — recherche GitHub issues, Stack Overflow, docs officielles, status pages.

#### Mode degrade (fallback voicemail)

Si ElevenLabs est indisponible (7+ heures de downtime documentees en janvier 2026), Telnyx joue un message pre-enregistre :
- "Bonjour, nous prenons votre message. Veuillez laisser votre nom, adresse et description du probleme apres le bip."
- Telnyx enregistre l'audio brut → stocke dans Supabase Storage
- Un cron job re-traite les enregistrements quand ElevenLabs revient
- Le gestionnaire est notifie en push : "Assistant temporairement indisponible — mode boite vocale actif"

#### Monitoring transcription

ElevenLabs STT echoue silencieusement dans ~10-20% des appels (GitHub #493). Les transcripts contiennent "..." ou "!!" au lieu de mots reels.
- **Alerte** : si >15% des transcripts des dernieres 24h ont une longueur <50 caracteres → notification admin
- **Action** : intervention manuelle ou redirection temporaire vers voicemail

#### Reconnexion WebSocket

ElevenLabs ne reconnecte PAS automatiquement un WebSocket tombe mid-call.
- Timeout d'inactivite par defaut : 20s (configurer a **180s** max)
- Le code client DOIT gerer la reconnexion manuellement (try/catch + retry loop)
- Envoyer `flush: true` sur le dernier chunk TTS pour eviter le buffering

#### Latence realiste

| Scenario | Latence estimee | Detail |
|----------|----------------|--------|
| Reponse directe (sans tool call) | ~0.7-1.0s | TTFT Haiku (0.49s) + TTS TTFA (0.15s) + overhead |
| Avec 1 tool call (identification locataire) | ~1.5-2.0s | 2 round-trips LLM + tool execution |
| Avec 2 tool calls (identification + creation) | ~2.5-3.5s | 3 round-trips LLM |

La cible initiale de <500ms n'est atteignable que sans tool calls. Le **streaming est obligatoire** pour que le TTS demarre des le premier token. Sans streaming, l'utilisateur attend 3+ secondes de silence.

#### Optimisations Claude API (obligatoires)

| Optimisation | Detail |
|-------------|--------|
| **Streaming** | Connecter le stream Claude directement au pipeline TTS. Ne jamais attendre la reponse complete. |
| **`max_tokens: 80-150`** | Reponses vocales = 1-3 phrases max. Reduire `max_tokens` reduit aussi le temps de generation. |
| **`temperature: 0.2`** | Assistant professionnel, pas creatif. Reponses plus focalisees et courtes. |
| **Prompt caching** | `cache_control: {"type": "ephemeral"}` sur le system prompt. Cache read = $0.10/MTok vs $1.00 input = -90% cout. TTL 5 min = parfait pour un appel. |
| **Prefill assistant** | Demarrer chaque tour avec `"Bonjour,"` ou `"D'accord,"` pour forcer le format et reduire la latence du premier token. |
| **Tool definitions caching** | Les schemas tools consomment 500-1000 tokens a chaque tour. Cacher avec `cache_control` pour eviter de les re-tokeniser. |

#### Stripe Belgique — conformite

| Obligation | Implementation |
|-----------|----------------|
| **TVA 21%** | Activer Stripe Tax pour automatiser. Reverse charge pour EU intra-communautaire. |
| **SCA / 3DS** | Geree automatiquement par Stripe Checkout (premier paiement on-session, recurrences MIT). |
| **Factures conformes** | Numero sequentiel, TVA BE, adresses, montant HT/TVA/TTC — Stripe Billing genere tout automatiquement si Business Details renseignees dans le Dashboard. |

#### Risques tarifaires ElevenLabs

| Risque | Detail | Mitigation |
|--------|--------|------------|
| **Concurrence limit** | Pro plan = 20 appels concurrents max (hard limit). Au-dela → appels rejetes. Scale (30) si besoin de plus. Minutes additionnelles : ~$0.110/min. | Monitoring concurrence + alerte a 15/20 slots. Prevoir upgrade Scale a 25+ equipes actives. |
| **LLM cost pass-through** | ElevenLabs absorbe les couts LLM actuellement mais annonce que ca changera. +30-50% sur le cout/min a prevoir. | Inclure dans les projections de marge comme risque. Marges actuelles (64-77%) absorbent un +50% sans passer en negatif. |
| **Dutch accent bleed** | Voix anglaises produisent un accent anglais en neerlandais (GitHub big-AGI #649). | Utiliser 3 voix natives (FR/NL/EN). Cloner une voix a partir d'un locuteur natif neerlandais si necessaire. |

#### Notes pour l'implementation Stripe existante

> **Bugs identifies dans `stripe-webhook.handler.ts` :**
> 1. **Race condition idempotence** (ligne 36-39) : L'event est enregistre AVANT la logique metier. Si la logique plante → Stripe retente → l'idempotence bloque → event perdu. **Fix** : enregistrer l'event APRES le succes de la logique metier, ou utiliser une colonne `status` (processing → completed/failed).
> 2. **`invoice.paid` ne distingue pas les top-ups** (ligne 297-337) : Quand on ajoutera les top-ups IA, router via `invoice.metadata.type === 'ai_topup'` pour crediter les minutes. Mettre le metadata sur la Checkout Session a la creation du top-up.

---

## 9 — Modele de pricing

### 9.1 Packs tarifaires

| Pack | Prix/mois | Minutes incluses | Top-up (par 100 min) | Tarif/min effectif | Cible |
|------|-----------|-----------------|----------------------|--------------------|-------|
| **Solo** | 49 EUR | 100 min (~33 appels) | 0,50 EUR/min = 50 EUR | 0,49 EUR/min | Gestionnaire independant |
| **Equipe** | 99 EUR | 250 min (~83 appels) | 0,40 EUR/min = 40 EUR | 0,40 EUR/min | Petite agence (2-5 pers.) |
| **Agence** | 149 EUR | 500 min (~167 appels) | 0,30 EUR/min = 30 EUR | 0,30 EUR/min | Agence structuree (5+) |

| Element | Valeur |
|---------|--------|
| **Nom produit** | Assistant IA Multi-Canal |
| **Renouvellement** | Mensuel automatique, annulation a tout moment |
| **WhatsApp** | Inclus dans tous les packs (service messages = gratuits Meta) |
| **Numero** | 1 numero belge dedie par equipe (telephone + WhatsApp) |
| **Prerequis** | Plan SEIDO payant actif (pas dispo sur free tier) |
| **Top-up** | Recharge par blocs de 100 min au tarif du pack (manuel ou auto a 100%) |
| **Changement de pack** | Possible a tout moment (prorata automatique Stripe) |

### 9.2 Cout variable par minute vocale

| Poste | Cout/min | Source |
|-------|----------|--------|
| ElevenLabs Conversational AI | $0.10 | [elevenlabs.io/pricing](https://elevenlabs.io/pricing) |
| ElevenLabs LLM pass-through (Haiku 4.5) | $0.0075 | Pipeline integre |
| Telnyx inbound (Belgique) | ~$0.005 | [telnyx.com/pricing/voice-api](https://telnyx.com/pricing) |
| Anthropic Haiku 4.5 (post-traitement) | ~$0.0015 | ~500 tokens/appel × $1-5/MTok |
| WhatsApp service messages (Meta) | $0.00 | Customer-initiated = gratuit |
| **Total cout variable (vocal)** | **~$0.114/min** | **≈ €0.104/min** |

**Cout variable conversation texte WhatsApp :**

| Poste | Cout/conversation | Source |
|-------|-------------------|--------|
| ElevenLabs messages agent (~7 msgs) | ~$0.021 | $0.003/message × ~7 |
| Anthropic Haiku 4.5 (post-traitement) | ~$0.0015 | ~500 tokens/appel |
| **Total cout variable (texte)** | **~$0.023** | **≈ €0.021/conversation** |

> **Le texte est ~5x moins cher que le vocal** ($0.023 vs $0.114/min). Facturation SEIDO : 1 conversation texte = 1 unite equivalente (meme decompte que 1 min vocale). La marge sur les conversations texte est donc superieure (~22% d'economie sur le cout variable).

Cout fixe mensuel : Numero Telnyx = $1.00/mo/equipe.

### 9.3 Economie unitaire par pack

| Pack | Revenue | Cout variable (minutes incluses) | Cout fixe (numero) | **Cout total** | **Marge brute** |
|------|---------|----------------------------------|---------------------|----------------|-----------------|
| **Solo** (100 min) | €49/mo | €10.40 | €0.92 | **€11.32** | **€37.68 (77%)** |
| **Equipe** (250 min) | €99/mo | €26.00 | €0.92 | **€26.92** | **€72.08 (73%)** |
| **Agence** (500 min) | €149/mo | €52.00 | €0.92 | **€52.92** | **€96.08 (64%)** |

| Top-up | Prix facture/min | Cout reel/min | Marge top-up |
|--------|------------------|---------------|--------------|
| Solo top-up | 0,50 EUR | ~0,104 EUR | **79%** |
| Equipe top-up | 0,40 EUR | ~0,104 EUR | **74%** |
| Agence top-up | 0,30 EUR | ~0,104 EUR | **65%** |

### 9.4 Tarifs plancher (break-even par equipe)

| Scenario | Formule | Plancher 100 min | Plancher 250 min | Plancher 500 min |
|----------|---------|------------------|------------------|------------------|
| **Marginal** (cout variable seul) | minutes × €0.104 + €0.92 | **€11.32** | **€26.92** | **€52.92** |
| **Avec ElevenLabs Pro** (amortis/10 equipes) | + $99/10 = €9.10/equipe | **€20.42** | **€36.02** | **€62.02** |
| **Avec ElevenLabs Pro** (amortis/5 equipes) | + $99/5 = €18.20/equipe | **€29.52** | **€45.12** | **€71.12** |

> **Conclusion :** Avec 5+ equipes, les marges sont confortables (40-60%). Avec 10+ equipes, les marges depassent 55-70%. Le pack Solo a 49€ est rentable des la premiere equipe (marge marginale 77%).

### 9.5 Alertes et seuils

| Seuil | Action | Implementation |
|-------|--------|----------------|
| **80%** des minutes | Notification in-app + email au gestionnaire | Stripe Billing Alert `billing.alert.triggered` |
| **100%** des minutes | Proposition top-up (popup in-app + email) | Stripe Alert + modal custom dans SEIDO |
| **Auto-top-up** (optionnel) | Recharge auto a 100% au tarif du pack | Parametre `auto_topup` dans `ai_phone_numbers` |

### 9.6 Implementation Stripe

**Architecture : 1 Product + 3 Prices + Billing Meter**

```
Stripe Product : "Assistant IA Multi-Canal"
  ├── Price "Solo"    : 4900 cents/mo (recurring, flat)
  ├── Price "Equipe"  : 9900 cents/mo (recurring, flat)
  └── Price "Agence"  : 14900 cents/mo (recurring, flat)

Billing Meter : "ai_voice_minutes"
  └── Usage reporte pour tracking (alertes + top-up), PAS pour facturation metered

Top-up : One-time invoice items (100 min blocks)
  ├── Solo top-up    : 5000 cents (100 min × 0.50€)
  ├── Equipe top-up  : 4000 cents (100 min × 0.40€)
  └── Agence top-up  : 3000 cents (100 min × 0.30€)
```

**Pourquoi flat-rate + billing meter (pas metered pricing) :**
- Metered pricing facture l'usage reel → pas de packs fixes
- Flat-rate = packs previsibles pour le client (49/99/149€)
- Billing Meter sert **uniquement** pour les alertes (80%/100%) et le tracking
- Le depassement est gere par des **one-time invoices** (top-up) et non par du metered billing

**Implementation technique :**

```typescript
// 1. Ajouter l'add-on IA au subscription existant
const subscription = await stripe.subscriptions.update(team.stripe_subscription_id, {
  items: [
    ...existingItems,
    { price: AI_PRICES[selectedTier] }, // 'solo' | 'equipe' | 'agence'
  ],
  proration_behavior: 'create_prorations',
})

// 2. Reporter l'usage apres chaque appel (tracking uniquement)
await stripe.billing.meterEvents.create({
  event_name: 'ai_voice_minutes',
  payload: {
    value: Math.ceil(durationSeconds / 60),
    stripe_customer_id: team.stripe_customer_id,
  },
})

// 3. Creer des alertes sur le meter
await stripe.billing.alerts.create({
  alert_type: 'usage_threshold',
  title: 'AI Minutes 80%',
  filter: { customer: team.stripe_customer_id, meter: AI_METER_ID },
  usage_threshold: { gte: Math.floor(tierMinutes * 0.8), recurrence: 'one_time' },
})

// 4. Top-up : facture one-time quand le seuil est atteint
const topupPrice = TOPUP_PRICES[currentTier] // 5000 | 4000 | 3000 cents
await stripe.invoiceItems.create({
  customer: team.stripe_customer_id,
  amount: topupPrice,
  currency: 'eur',
  description: `Top-up 100 min Assistant IA (pack ${currentTier})`,
})
await stripe.invoices.create({
  customer: team.stripe_customer_id,
  auto_advance: true,
  collection_method: 'charge_automatically',
})

// 5. Changement de pack (upgrade/downgrade)
await stripe.subscriptions.update(subscriptionId, {
  items: [{ id: aiItemId, price: AI_PRICES[newTier] }],
  proration_behavior: 'create_prorations',
})
```

**Webhooks a ecouter :**
- `billing.alert.triggered` → notification 80%/100% + proposition top-up
- `invoice.payment_succeeded` → confirmer top-up, incrementer `minutes_balance`
- `customer.subscription.updated` → detecter changement de tier
- `customer.subscription.deleted` → deprovisionner le numero
- `v1.billing.meter.error_report_triggered` → alerte erreur meter

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
| 12 | US-012 | Stripe add-on billing (3 tiers) | L | 4 | Backend |
| 13 | US-013 | Integration E2E test | M | 4 | Test |
| 14 | US-014 | WhatsApp provisioning + integration ElevenLabs | M | 2 | Backend |
| 15 | US-015 | WhatsApp canal dans page parametres | S | 3 | UI |
| 16 | US-016 | Landing page AI enhancement (micro-modifs + section IA) | M | 5 | UI + SEO |
| 17 | US-017 | Schema DB admin metrics (4 tables) | S | 5 | Schema |
| 18 | US-018 | Webhook MRR tracking + subscription events | M | 5 | Backend |
| 19 | US-019 | CRON jobs pre-agregation (nightly + weekly) | M | 5 | Backend |
| 20 | US-020 | Service layer admin metrics (5 services) | M | 5 | Backend |
| 21 | US-021 | Dashboard overview L0 (8 KPI + MRR trend) | L | 6 | UI |
| 22 | US-022 | Dashboard Revenue L1 (MRR movements, NRR) | M | 6 | UI |
| 23 | US-023 | Dashboard AI L1 (minutes, cout, categories) | M | 6 | UI |
| 24 | US-024 | Dashboard Customers L1 (cohortes, health) | M | 7 | UI |
| 25 | US-025 | Dashboard Usage + Operations L1 | M | 7 | UI |
| 26 | US-026 | Alertes admin (at-risk, churn, anomalies) | S | 7 | Backend |

### Detail des stories

---

#### US-001 — Schema DB + migrations

**En tant que** developpeur, **je veux** les tables `ai_phone_numbers`, `ai_phone_calls`, `ai_phone_usage` creees avec RLS **pour que** les donnees d'appels soient stockees de maniere securisee.

**Criteres d'acceptation :**
- Migration cree les 3 tables avec tous les index
- Colonnes Telnyx : `telnyx_connection_id`, `telnyx_phone_number_id` (au lieu de `twilio_phone_number_sid`, `twilio_account_sid`)
- Colonne ElevenLabs : `elevenlabs_phone_number_id` (en plus de `elevenlabs_agent_id`)
- Colonnes WhatsApp : `whatsapp_phone_number_id`, `whatsapp_enabled` dans `ai_phone_numbers`
- Colonne `channel` dans `ai_phone_calls` (`phone` | `whatsapp_text` | `whatsapp_voice` | `whatsapp_call`)
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

**En tant que** gestionnaire, **je veux** une page dans mes parametres pour activer/gerer le numero IA **pour que** je puisse controler mon assistant et mon abonnement.

**Criteres d'acceptation :**
- Page `/gestionnaire/parametres/assistant-ia`
- **Selection du pack** : Solo (49€/100min) / Equipe (99€/250min) / Agence (149€/500min)
- Affichage du numero attribue + statut WhatsApp
- **Barre de progression** des minutes (`X / Y min` selon le pack souscrit, avec % visuel)
- **Bouton top-up** : "Recharger 100 min — Z EUR" (tarif adapte au pack)
- **Toggle auto-top-up** : recharge automatique a 100% des minutes
- Stats du mois : nombre d'appels tel. + conversations WhatsApp, minutes consommees
- Lien vers l'historique des appels
- Bouton "Changer de pack" (redirect vers Stripe Customer Portal ou modal inline)
- Bouton "Gerer l'abonnement" (Stripe Customer Portal)
- Server Component avec `getServerAuthContext`
- Responsive mobile
- Lint passe

**Taille :** M | **Depend de :** US-001, US-002 | **Couche :** UI

---

#### US-009 — Historique des appels

**En tant que** gestionnaire, **je veux** voir l'historique de tous les appels recus par l'assistant **pour que** je puisse suivre l'activite et retrouver un appel specifique.

**Criteres d'acceptation :**
- Page `/gestionnaire/parametres/assistant-ia/historique`
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

**En tant que** gestionnaire, **je veux** voir mon usage de minutes en temps reel **pour que** je puisse anticiper les depassements et recharger si necessaire.

**Criteres d'acceptation :**
- Composant `PhoneUsageCounter` reutilisable
- Affiche : minutes utilisees / quota du pack (100, 250 ou 500 selon le tier)
- Barre de progression visuelle avec code couleur (vert < 60%, orange 60-80%, rouge > 80%)
- Alerte visuelle in-app a 80% d'utilisation (via Stripe Billing Alert webhook)
- Alerte email + notification push a 100% avec bouton "Recharger"
- Affichage du nombre de top-ups effectues ce mois
- Integration dans la page parametres (US-008) + widget compact dans le dashboard
- Lint passe

**Taille :** S | **Depend de :** US-001, US-008 | **Couche :** UI

---

#### US-012 — Stripe add-on billing (3 tiers)

**En tant que** gestionnaire, **je veux** choisir un pack IA (Solo/Equipe/Agence) et etre facture mensuellement **pour que** la facturation soit previsible et adaptee a mon volume.

**Criteres d'acceptation :**
- **1 Stripe Product** "Assistant IA Multi-Canal" avec **3 Prices** (Solo 49€, Equipe 99€, Agence 149€)
- Add-on ajoute comme 2eme item sur le subscription existant (pas de subscription separee)
- **Billing Meter** `ai_voice_minutes` pour tracking d'usage (alertes, pas facturation)
- Usage reporte via `stripe.billing.meterEvents.create()` apres chaque appel
  - Valeurs entieres (arrondi au-dessus), timestamp dans les 35 derniers jours
  - Ecouter `v1.billing.meter.error_report_triggered` pour les erreurs
- **Billing Alerts** : 80% et 100% du quota → webhook `billing.alert.triggered`
- **Top-up** : one-time invoice (100 min au tarif du pack) declenche manuellement ou automatiquement
- **Changement de tier** : `subscriptions.update` avec `proration_behavior: 'create_prorations'`
- Annulation immediate : `invoice_now: true, prorate: true`
- Annulation en fin de periode : arret du renouvellement, acces maintenu jusqu'a fin de cycle
- Integration avec le Customer Portal existant (gestion tier + annulation)
- Champ `ai_tier` (`solo` | `equipe` | `agence`) + `auto_topup` (boolean) dans `ai_phone_numbers`
- Lint passe

**Taille :** L | **Depend de :** US-002, US-011 | **Couche :** Backend

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

#### US-014 — WhatsApp provisioning + integration ElevenLabs

**En tant que** gestionnaire, **je veux** que mes locataires puissent aussi contacter l'assistant via WhatsApp **pour que** ceux qui preferent ecrire aient un canal adapte.

**Criteres d'acceptation :**
- Le numero de l'equipe est enregistre dans le WABA Meta lors du provisioning
- L'agent ElevenLabs est connecte au canal WhatsApp pour ce numero
- Modes supportes : texte, notes vocales, appels vocaux WhatsApp
- Le meme agent gere les 2 canaux (telephone SIP + WhatsApp)
- Le webhook ElevenLabs recoit les conversations WhatsApp avec le meme format
- Le champ `channel` dans `ai_phone_calls` identifie le canal (`phone` / `whatsapp_text` / `whatsapp_voice` / `whatsapp_call`)
- La premiere reponse WhatsApp inclut la disclosure IA
- Rollback : si l'enregistrement WhatsApp echoue, le provisioning telephone continue (WhatsApp = optional)
- Lint passe

**Taille :** M | **Depend de :** US-001, US-002, US-003 | **Couche :** Backend

---

#### US-015 — WhatsApp canal dans page parametres

**En tant que** gestionnaire, **je veux** voir le statut WhatsApp dans ma page parametres **pour que** je sache si mes locataires peuvent utiliser les deux canaux.

**Criteres d'acceptation :**
- Badge "WhatsApp actif" a cote du numero si `whatsapp_enabled = true`
- Historique des conversations affiche le canal (icone telephone / icone WhatsApp)
- Filtres dans l'historique : Tous | Telephone | WhatsApp
- Stats separees : X appels telephoniques (Y min) + Z conversations WhatsApp
- Server Component avec `getServerAuthContext`
- Responsive mobile
- Lint passe

**Taille :** S | **Depend de :** US-008, US-014 | **Couche :** UI

---

#### US-016 — Landing page AI enhancement (micro-modifs + section IA)

**En tant que** visiteur du site, **je veux** decouvrir naturellement que SEIDO inclut un assistant IA **pour que** je percoive la valeur ajoutee sans avoir l'impression d'une page de vente agressive.

**Approche :** Enhancement subtil de la page existante (10 micro-modifications + 1 nouvelle section). Aucune restructuration. Le contenu existant est conserve integralement.

**Criteres d'acceptation :**
- **Hero** : sous-titre enrichi ("...vos locataires informes — meme a 23h —, vos prestataires...") + pill "Assistant 24h/24 inclus"
- **Pain point #1** : ajout micro-phrase "L'assistant note tout, a votre place."
- **Card gestionnaire** : 4e bullet "Appels hors-heures → L'assistant prend la demande. Vous validez le matin."
- **Portail locataire** : tagline modifiee "Ils n'ont plus besoin de vous appeler."
- **5e carte fonctionnalites** : remplacer Import par "Disponible quand vous ne l'etes pas" (import conserve ailleurs)
- **Nouvelle section IA** : "Un numero qui repond en votre nom" — 4 cartes (Voix naturelle, Appels + WhatsApp, Cree l'intervention, Disponible 24h/24)
- **Vision** : texte enrichi mentionnant l'assistant IA comme premiere etape d'automatisation
- **Pricing** : bandeau "Ajouter l'assistant IA — A partir de 49€/mois" au-dessus des pricing cards
- **FAQ** : 3 nouvelles questions (comment fonctionne l'assistant, transparence IA, inclusion dans SEIDO)
- **CTA final** : "Moins d'appels. Plus de visibilite. Zero engagement."
- **Schema markup** : ajouter `Product` assistant IA aux offers existantes
- Lint passe

**Taille :** M | **Depend de :** — | **Couche :** UI + SEO

> **Design complet :** [`docs/plans/2026-03-02-landing-page-ai-redesign.md`](../../plans/2026-03-02-landing-page-ai-redesign.md)

---

## 11 — Estimation des couts

### 11.1 Cout de developpement

| Phase | Stories | Estimation |
|-------|---------|------------|
| Schema + Backend (IA) | US-001 a US-007 | ~3 semaines |
| WhatsApp | US-014 | ~0.5 semaine |
| UI + Settings (IA) | US-008 a US-011, US-015 | ~2 semaines |
| Billing 3-tier + Tests | US-012 a US-013 | ~1.5 semaine |
| Landing page AI enhancement | US-016 | ~3 jours |
| Dashboard Admin : Schema + Backend | US-017 a US-020 | ~2 semaines |
| Dashboard Admin : UI (L0 + L1) | US-021 a US-025 | ~2.5 semaines |
| Dashboard Admin : Alertes + polish | US-026 | ~0.5 semaine |
| **Total** | **26 stories** | **~12.5 semaines** |

### 11.2 Cout operationnel mensuel (par equipe, selon le pack)

| Pack | Minutes incluses | Cout variable | Cout fixe (numero) | Cout total SEIDO | Revenue | **Marge** |
|------|-----------------|---------------|---------------------|------------------|---------|-----------|
| **Solo** | 100 min | €10.40 | €0.92 | €11.32 | €49 | **€37.68 (77%)** |
| **Equipe** | 250 min | €26.00 | €0.92 | €26.92 | €99 | **€72.08 (73%)** |
| **Agence** | 500 min | €52.00 | €0.92 | €52.92 | €149 | **€96.08 (64%)** |

**Avec top-ups (par tranche de 100 min) :**

| Pack | Prix top-up | Cout reel | Marge top-up |
|------|-------------|-----------|--------------|
| Solo | €50 | €10.40 | **€39.60 (79%)** |
| Equipe | €40 | €10.40 | **€29.60 (74%)** |
| Agence | €30 | €10.40 | **€19.60 (65%)** |

### 11.3 Couts fixes mensuels (plateforme)

| Service | Cout | Note |
|---------|------|------|
| ElevenLabs Pro | $99/mo (~€91) | 1100 agent minutes incluses, 20 concurrent |
| Telnyx | $0/mo (hors numeros) | Pay-as-you-go, $1/numero/mo |
| Anthropic API | Pay-as-you-go | ~$0.0015/appel (post-traitement Haiku) |
| Meta WhatsApp WABA | $0/mo | Pas de frais fixes, service messages gratuits |
| Stripe fees | ~3.1% + €0.25/tx | Inclus dans le prix des packs |
| **Total fixe** | **~€91/mo** | ElevenLabs Pro = seul cout fixe significatif |

### 11.4 Break-even

| Scenario | Revenue/equipe | Cout fixe amorti | Break-even |
|----------|---------------|------------------|------------|
| Toutes Solo (49€) | €49/mo | €91 fixe | **~2 equipes** |
| Mix Solo + Equipe | ~€74/mo moyen | €91 fixe | **~2 equipes** |
| Toutes Agence (149€) | €149/mo | €91 fixe | **~1 equipe** |

> **Conclusion :** Le break-even est atteint des **2 equipes** sur le pack le moins cher. A 10 equipes (mix moyen), le cout fixe ElevenLabs represente seulement ~€9/equipe, soit une marge nette de **60-70%**.

### 11.5 Projections de revenus

| Equipes | Mix de packs | Revenue/mo | Cout/mo | **Profit/mo** |
|---------|-------------|------------|---------|---------------|
| 5 | 3 Solo + 2 Equipe | €345 | €91 + €5 numeros + ~€155 variable = ~€251 | **~€94** |
| 10 | 4 Solo + 4 Equipe + 2 Agence | €890 | €91 + €10 + ~€310 = ~€411 | **~€479** |
| 25 | 10 Solo + 10 Equipe + 5 Agence | €2,225 | €91* + €25 + ~€780 = ~€896 | **~€1,329** |
| 50 | 20 Solo + 20 Equipe + 10 Agence | €4,450 | €182** + €50 + ~€1,560 = ~€1,792 | **~€2,658** |

> *A 25+ equipes, ElevenLabs Pro suffit (1100 min agent incluses pour le workspace).
> **A 50 equipes avec usage eleve, passer au plan Scale ($330/mo, minutes illimitees au tarif pipeline).

### 11.6 Comparaison avec l'ancien modele (15€ flat)

| Metrique | Ancien (15€/60min) | Nouveau (3 tiers) | Amelioration |
|----------|--------------------|--------------------|--------------|
| Revenue min/equipe | €15/mo | €49/mo | **+227%** |
| Revenue max/equipe | €15 + overage | €149/mo + top-ups | **+900%+** |
| Marge min | ~49% | ~64% (Agence) | **+15 pts** |
| Marge max | ~58% (overage) | ~79% (Solo top-up) | **+21 pts** |
| Break-even | 8 equipes | 2 equipes | **4x plus rapide** |
| ARPU moyen | ~€15 | ~€89 (mix moyen) | **+493%** |

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
| Video analyse | L'IA analyse les videos envoyees par WhatsApp (en plus des photos, deja supportees au MVP) |
| Prestataire IA | L'IA appelle le prestataire pour planifier le creneau |
| TLS upgrade | Migrer SIP transport de TCP vers TLS + SRTP pour encryption bout-en-bout |
| WhatsApp templates | Messages proactifs (rappels RDV, suivi intervention) via templates utility |

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
| Numero par equipe | Numero unique (SIP + WhatsApp) | Numero partage (pas d'identification) |
| Dual-canal | Meme numero pour telephone + WhatsApp | 2 numeros separes (confus pour locataire) |
| WhatsApp multi-tenant | 1 WABA → N numeros (1/equipe) | 1 WABA par equipe (impossible a scale) |
| Requirement group | Reutiliser existant | Nouveau groupe (72h d'attente) |
| Webhook | 1 endpoint workspace (tel + WhatsApp) | N endpoints par agent (pas supporte) |
| Prompt customisation | Instructions appendees (500 chars) | Full prompt editable (trop risque) |
| Mode dev | Variables `DEV_*` | Sandbox Telnyx (n'existe pas) |
| EU data residency | `api.elevenlabs.io` (Pro plan = US). Migration vers Enterprise (EU) quand volume justifie. DPA ElevenLabs signe. | — |

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
  → Enregistrer numero dans WABA Meta (WhatsApp)
  → Connecter agent ElevenLabs au canal WhatsApp pour ce numero
  → INSERT ai_phone_numbers (whatsapp_enabled = true)
  (rollback si une etape echoue — WhatsApp optional, telephone obligatoire)
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

## 14 — Canal WhatsApp

### 14.1 Vue d'ensemble

ElevenLabs supporte nativement WhatsApp depuis decembre 2025. Le meme agent gere
les appels telephoniques (via Telnyx SIP) ET les conversations WhatsApp (via Meta Cloud API).

Le meme numero belge (+32) sert pour les deux canaux :
- **Appels telephoniques** : le numero est route via Telnyx SIP trunk vers ElevenLabs
- **Messages WhatsApp** : le numero est enregistre dans le WABA Meta et connecte a ElevenLabs

> Ces deux chemins sont **totalement independants** — pas de bridging, pas de conflit.

### 14.2 Modes de conversation WhatsApp

| Mode | Description | Fonctionnement | Cout ElevenLabs |
|------|-------------|----------------|-----------------|
| **Texte** | Locataire ecrit un message | ElevenLabs repond en texte. Script adapte (concis, demande photo). | **$0.003/message agent** |
| **Note vocale** | Locataire envoie un audio | ElevenLabs transcrit (STT Scribe v2) → repond en texte | STT rates + $0.003/reponse |
| **Appel vocal** | Locataire lance un appel WhatsApp | Conversation vocale complete (comme telephone) | ~$0.09/min |
| **Media** | Locataire envoie photo/document | Image passee au LLM (si multimodal). Stockee apres conversation. | Inclus dans la conversation |

> **Tous les modes** aboutissent au meme webhook `post_call_transcription` et creent une intervention.

#### Flux detaille — Conversation texte WhatsApp

```
Locataire envoie : "Bonjour, j'ai une fuite dans la cuisine"
         │
         ▼  (ElevenLabs agent, mode texte)
Agent IA : "Bonjour, je suis l'assistant de Immo Dupont.
Quel est votre nom et votre adresse ?"
         │
         ▼  (le locataire repond a son rythme — async)
Locataire : "Jean Dupuis, Rue de la Loi 42, Bruxelles"
         │
         ▼
Agent IA : "Merci. Pouvez-vous decrire le probleme plus en detail ?"
         │
         ▼
Locataire : "Il y a de l'eau qui coule sous l'evier depuis ce matin"
         │
         ▼
Agent IA : "Avez-vous une photo du probleme ?"
         │
         ▼
Locataire : [envoie une photo]
         │
         ▼
Agent IA : "Jean Dupuis, Rue de la Loi 42 — fuite sous l'evier.
C'est bien ca ?"
         │
         ▼
Locataire : "Oui c'est correct"
         │
         ▼
Agent IA : "Votre demande est enregistree. Bonne journee !"
→ Tool "End conversation" invoque
         │
         ▼
Webhook post_call_transcription → SEIDO
  → Intervention creee (channel: 'whatsapp_text')
  → Photo telechargee via Meta API → stockee dans Supabase Storage
  → media_urls mis a jour dans ai_phone_calls
  → Notification gestionnaire (avec photo en piece jointe)
```

> **Timeout securite :** Si le locataire ne repond plus pendant 30 min, ElevenLabs ferme
> la session automatiquement (`max_duration_seconds: 1800`). L'intervention est creee
> avec les infos collectees jusque-la (peut etre partielle).

### 14.3 Architecture multi-tenant WhatsApp

```
1 Meta Business Manager (SEIDO)
         │
         ▼
1 WABA (WhatsApp Business Account)
         │
         ├── Numero +32 4 260 08 08  →  Agent "SEIDO - Immo Dupont"
         ├── Numero +32 2 XXX XX XX  →  Agent "SEIDO - Gestion Martin"
         └── Numero +32 9 XXX XX XX  →  Agent "SEIDO - Vastgoed Peeters"
```

**Chaque numero a :**
- Son propre `display_name` dans WhatsApp (ex: "Immo Dupont")
- Son propre agent ElevenLabs assigne (avec prompt personnalise)
- Son propre `whatsapp_phone_number_id` dans la table `ai_phone_numbers`

### 14.4 Provisioning WhatsApp

Lors du provisioning d'un nouveau numero (US-014), apres les etapes Telnyx + ElevenLabs :

```typescript
// Etape 5 : Enregistrer le numero dans le WABA Meta
// POST https://graph.facebook.com/v21.0/{WABA_ID}/phone_numbers
const waResponse = await fetch(
  `https://graph.facebook.com/v21.0/${process.env.META_WHATSAPP_BUSINESS_ID}/phone_numbers`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.META_WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cc: '32',                              // Country code Belgique
      phone_number: phoneNumber.replace('+32', ''),
      verified_name: `SEIDO - ${teamName}`,  // Display name WhatsApp
    }),
  }
)
// → { id: "987654321098765" }  (whatsapp_phone_number_id)

// Etape 6 : Connecter le numero WhatsApp a l'agent ElevenLabs
// Via ElevenLabs Dashboard : Settings → Integrations → WhatsApp → Add Number
// OU via API si disponible (verifier docs ElevenLabs au moment de l'implementation)
```

> **Note :** L'enregistrement d'un numero WhatsApp necessite que le numero soit
> **verifie** (Meta envoie un code de verification par SMS ou appel).
> Le code de verification est recu sur le numero Telnyx → doit etre forward a Meta.

### 14.5 Webhook — Meme endpoint pour telephone et WhatsApp

ElevenLabs envoie le meme webhook `post_call_transcription` pour les deux canaux.
La distinction se fait via les metadata du payload :

```typescript
// Dans le webhook handler (app/api/elevenlabs-webhook/route.ts)

// Detecter le canal
const channel = detectChannel(payload.metadata)

function detectChannel(metadata: any): string {
  // WhatsApp conversations ont un champ specifique dans les metadata
  if (metadata?.whatsapp) return 'whatsapp_text'
  if (metadata?.whatsapp_voice_note) return 'whatsapp_voice'
  if (metadata?.whatsapp_call) return 'whatsapp_call'
  return 'phone' // Default: appel telephonique
}

// Stocker avec le canal
await storeCallLog({
  ...callData,
  channel,
  duration_seconds: channel === 'whatsapp_text' ? null : duration,
})
```

### 14.6 Pricing WhatsApp

| Element | Cout | Note |
|---------|------|------|
| **Service messages** (customer-initiated) | **GRATUIT** | Le locataire ecrit en premier → pas de frais Meta |
| **Utility templates** (business-initiated) | ~$0.017/msg | Pour confirmations (post-MVP) |
| **ElevenLabs vocal** (notes vocales, appels) | $0.08-$0.10/min | Meme tarif que telephone |
| **ElevenLabs texte** | **$0.003/message agent** | ~$0.021/conversation (7 msgs moy.) |

> **Pour le MVP, 100% des conversations sont customer-initiated (service messages) = GRATUIT.**
> Les messages proactifs (templates utility) sont prevus en V4 (post-MVP).

### 14.7 Experience locataire WhatsApp

```
Locataire envoie : "Bonjour, j'ai un probleme de plomberie"
         │
         ▼
Agent IA repond : "Bonjour, je suis l'assistant IA de Immo Dupont.
Je vais prendre en note votre demande d'intervention.
Quel est votre nom complet et votre adresse ?"
         │
         ▼
  (meme script 4 etapes que le telephone)
         │
         ▼
Agent IA : "Votre demande a bien ete enregistree. Votre
gestionnaire sera notifie et traitera votre demande au
plus vite. Bonne journee !"
         │
         ▼
  Webhook → SEIDO → Intervention creee (channel: 'whatsapp_text')
```

### 14.8 Avantages du canal WhatsApp

| Avantage | Detail |
|----------|--------|
| **Accessibilite** | Locataires qui preferent ecrire (bruit, timidite, langue) |
| **Asynchrone** | Le locataire peut repondre a son rythme (pas de pression temps reel) |
| **~5x moins cher** | Texte = ~$0.023/conversation vs vocal ~$0.114/min |
| **Photos & documents** | Le locataire envoie une photo du probleme → stockee et attachee a l'intervention |
| **Trace ecrite** | Le locataire garde l'historique de sa conversation dans WhatsApp |
| **Adoption** | WhatsApp = 91% penetration en Belgique (2025) |

---

## 15 — Landing Page AI Enhancement

> **Design complet :** [`docs/plans/2026-03-02-landing-page-ai-redesign.md`](../../plans/2026-03-02-landing-page-ai-redesign.md)

### 15.1 Approche

**Enhancement subtil** de la landing page existante — PAS un redesign. La page actuelle est de qualite et bien positionnee. L'objectif est d'y integrer naturellement l'assistant IA via 10 micro-modifications + 1 nouvelle section, sans casser la structure ni le ton.

**Regle copy** : Nommer "assistant IA" exactement **2 fois** sur la page (section features IA + FAQ). Partout ailleurs, utiliser un langage fonctionnel ("l'assistant prend la demande", "disponible 24h/24"). Pas de superlatifs, pas de promesses tapageuses.

### 15.2 Modifications (10 micro-modifs + 1 nouvelle section)

| # | Zone | Type | Detail |
|---|------|------|--------|
| 1 | Hero sous-titre | Modification | "...vos locataires informes — meme a 23h —, vos prestataires..." |
| 2 | Hero | Ajout | Pill "Assistant 24h/24 inclus" au-dessus du H1 |
| 3 | Pain point #1 (40%) | Ajout | Micro-phrase : "L'assistant note tout, a votre place." |
| 4 | Card gestionnaire | Ajout | 4e bullet : "Appels hors-heures → L'assistant prend la demande. Vous validez le matin." |
| 5 | Portail locataire | Modification | Tagline : "Ils n'ont plus besoin de vous appeler." |
| 6 | 5e carte fonctionnalites | Remplacement | "Disponible quand vous ne l'etes pas" (remplace Import rapide, conserve ailleurs) |
| 7 | **Nouvelle section** | **Ajout** | **"Un numero qui repond en votre nom"** — 4 cartes (voir 15.3) |
| 8 | Vision | Modification | Texte enrichi mentionnant l'assistant IA comme premiere etape d'automatisation |
| 9 | Pricing | Ajout | Bandeau "Ajouter l'assistant IA — A partir de 49€/mois" au-dessus des pricing cards |
| 10 | FAQ | Ajout | 3 nouvelles questions (fonctionnement, transparence, inclusion) |
| 11 | CTA final | Modification | "Moins d'appels. Plus de visibilite. Zero engagement." |

### 15.3 Nouvelle section — "Un numero qui repond en votre nom"

Positionnement : **apres les 4 cartes fonctionnalites techniques** (setup, preuves, mobile, email), avant la section Data import.

4 cartes en grille 2×2 :

| # | Icone Lucide | Titre | Texte |
|---|-------------|-------|-------|
| 1 | `AudioLines` | Voix naturelle, ton professionnel | L'assistant repond par telephone avec une voix naturelle, en francais, neerlandais ou anglais. Le locataire decrit son probleme comme il le ferait avec vous. |
| 2 | `MessageCircle` | Appels et WhatsApp, meme numero | Un seul numero belge (+32). Le locataire choisit d'appeler ou d'ecrire sur WhatsApp. L'assistant comprend les deux. |
| 3 | `FileText` | Cree l'intervention automatiquement | L'assistant identifie le locataire, le bien concerne, et la nature du probleme. Vous retrouvez une demande structuree dans SEIDO le lendemain matin. |
| 4 | `Clock` | Disponible 24h/24, y compris le week-end | Les urgences n'attendent pas lundi. L'assistant prend les demandes a toute heure. Vous gardez le controle : rien ne se passe sans votre validation. |

### 15.4 Copy exacte par zone

**Hero sous-titre (modifie) :**
> "Un seul outil pour vos biens, vos interventions, vos locataires informes — meme a 23h —, vos prestataires coordonnes, et vos documents en ordre."

**Pill (nouveau) :**
> `Assistant 24h/24 inclus`

**Pain point #1 — ajout sous le chiffre 40% :**
> "L'assistant note tout, a votre place."

**Card Gestionnaire — 4e bullet :**
> "Appels hors-heures → L'assistant prend la demande. Vous validez le matin."

**Portail locataire — tagline :**
> "Ils n'ont plus besoin de vous appeler."

**5e carte fonctionnalites :**
> **Titre :** "Disponible quand vous ne l'etes pas"
> **Texte :** "Les demandes arrivent meme la nuit et le week-end. L'assistant prend le relais quand le bureau est ferme."

**Vision — texte mis a jour :**
> "On a commence par le plus douloureux : les interventions, les prestataires, le suivi. L'assistant s'occupe deja de la partie la plus repetitive — prendre les appels, noter la demande, creer l'intervention. La suite ? Administration des baux et suivi financier arrivent courant 2026."

**Pricing — bandeau :**
> "Ajouter l'assistant IA — A partir de 49€/mois · 100 minutes incluses · Telephone + WhatsApp"
> CTA : "En savoir plus"

**3 FAQ ajoutees :**

| # | Question | Reponse |
|---|----------|---------|
| 9 | Comment fonctionne l'assistant IA ? | Votre locataire appelle ou envoie un message WhatsApp sur votre numero dedie. L'assistant identifie le locataire, note le probleme et cree une demande d'intervention dans SEIDO. Vous retrouvez un resume structure dans votre tableau de bord. Rien ne se passe sans votre validation. |
| 10 | Mes locataires savent-ils qu'ils parlent a une IA ? | Oui, l'assistant se presente clairement des le debut de l'appel. La transparence est un choix de conception, pas une obligation legale contournee. Les locataires le savent et l'adoptent — ils preferent une reponse immediate a un repondeur. |
| 11 | L'assistant IA est-il inclus dans SEIDO ou en option ? | L'assistant est un module complementaire, a partir de 49€/mois (100 minutes incluses). SEIDO fonctionne parfaitement sans. L'assistant s'active en un clic depuis vos parametres quand vous etes pret. |

**CTA final :**
> "Moins d'appels. Plus de visibilite. Zero engagement."

### 15.5 SEO Technique

| Element | Implementation |
|---------|----------------|
| **Title tag** | Inchange ("SEIDO — Gestion Locative Simplifiee \| Belgique") — ajout IA en title quand le module est en production |
| **Meta description** | Enrichir : ajouter "Assistant IA integre. Disponible 24/7." en fin de description existante |
| **Schema markup** | Ajouter `Product` assistant IA dans les `offers` du JSON-LD existant (3 tiers : 49/99/149€) |
| **hreflang** | Inchange (deja present) |
| **Keywords secondaires** | "assistant IA gestion locative", "telephone IA immobilier" (via contenu, pas meta-keyword) |

### 15.6 Fichiers impactes

| Fichier | Modification | Effort |
|---------|-------------|--------|
| `components/landing/landing-page.tsx` | 10 micro-modifs texte + 1 nouvelle section (4 cartes) | Principal |
| `data/faq.ts` | Ajouter 3 FAQ items (ids 9, 10, 11) | Mineur |
| `app/page.tsx` | Ajouter offers IA dans JSON-LD existant | Mineur |
| `app/layout.tsx` | Enrichir meta description | Mineur |

> **Note :** Pas de restructuration de `components/pricing-cards.tsx` — le bandeau IA est un element simple dans `landing-page.tsx` qui renvoie vers la page de settings.

---

## 16 — Dashboard Admin & KPIs

### 16.1 Objectif

Construire un dashboard admin multi-niveaux pour piloter SEIDO avec des donnees reelles (pas simulees). Le dashboard doit couvrir **4 domaines** : revenus Stripe, adoption produit, performance IA, et sante operationnelle.

**Etat actuel :** 4 stat cards basiques avec taux de croissance hardcodes et revenus simules (interventions × €450). Aucun graphique, aucune metrique Stripe reelle, aucun tracking IA.

**Etat cible :** Dashboard 3 niveaux (Overview → Domain → Drill-down) avec MRR reel, cohortes, metriques IA, et alertes automatiques.

| Niveau | Contenu | Frequence |
|--------|---------|-----------|
| **L0 — Overview** | 8 KPI cards + sparklines + MRR trend + alertes | Temps reel (5 min cache) |
| **L1 — Revenue** | MRR breakdown, movements, NRR, projections | Quotidien |
| **L1 — Usage** | DAU/MAU, feature adoption, activation, sessions | Quotidien |
| **L1 — AI** | Minutes, cout/marge, taux resolution, categories | Temps reel |
| **L1 — Customers** | Cohortes retention, health score, at-risk | Hebdomadaire |
| **L1 — Operations** | Webhooks, erreurs, emails, push | Temps reel |
| **L2 — Drill-down** | Vue equipe individuelle, export CSV | On-demand |

### 16.2 KPIs par domaine

#### Revenue (source : Stripe webhooks → Supabase)

| KPI | Formule | Benchmark SaaS B2B | Priorite |
|-----|---------|---------------------|----------|
| **MRR** | Somme mensuelle normalisee (lots + IA) | — | Critique |
| **ARR** | MRR × 12 | — | Critique |
| **ARPU** | MRR / equipes payantes | — | Haute |
| **Revenue Churn** | MRR perdu / MRR debut de periode | < 2%/mois = bon | Critique |
| **NRR** | (MRR debut - churn - contraction + expansion) / MRR debut | > 106% median, > 113% top quartile | Critique |
| **GRR** | (MRR debut - churn - contraction) / MRR debut | > 90% = sain | Haute |
| **Expansion MRR** | MRR upgrades lots + activation IA + changement pack | — | Haute |
| **New MRR** | MRR nouvelles souscriptions du mois | — | Haute |
| **MRR par source** | Lots (5€/lot) vs IA Solo/Equipe/Agence vs Top-ups | — | Haute |

**Visualisations revenue :**
- Area chart empile : MRR 12 mois (lots + IA Solo + IA Equipe + IA Agence)
- Bar chart : MRR movements (new, expansion, contraction, churn, reactivation)
- Donut : Repartition MRR par source
- KPI card + sparkline : NRR glissant 3 mois

#### Adoption produit

| KPI | Formule | Ce que ca revele |
|-----|---------|------------------|
| **Equipes actives** | >= 1 action dans les 7 derniers jours | Engagement |
| **DAU/MAU** | Users actifs jour / Users actifs mois | Stickiness (> 25% = bon B2B) |
| **Activation rate** | Equipes ayant complete onboarding / Total signups | Qualite onboarding |
| **Feature adoption** | % equipes utilisant feature X | Product-market fit |
| **Time-to-value** | Jours entre signup et 1ere intervention | Efficacite onboarding |
| **Taux conversion trial** | Equipes payantes / Equipes en trial | Conversion |
| **Taux adoption IA** | Equipes avec add-on IA / Total equipes payantes | Penetration add-on |

#### AI Phone Assistant

| KPI | Categorie | Source |
|-----|-----------|--------|
| **Minutes consommees / allouees** | Usage | `ai_phone_usage` + `ai_phone_numbers.ai_tier` |
| **Taux d'utilisation moyen** | Usage | Moyenne (minutes / quota) par equipe |
| **Cout reel / minute** | Cost | (ElevenLabs + Telnyx + Anthropic) / minutes |
| **Marge IA effective** | Revenue | (Revenue IA - Cout IA) / Revenue IA |
| **Appels / equipe / mois** | Volume | `ai_phone_calls` COUNT par equipe |
| **Duree moyenne appel** | Efficiency | AVG(duration_seconds) |
| **Taux resolution IA** | Qualite | Appels → intervention creee sans escalade |
| **Top categories** | Insight | Groupement par `intervention_type` |
| **Canal prefere** | Insight | Repartition telephone vs WhatsApp |
| **Revenue IA total** | Revenue | Somme packs + top-ups |

#### Operations

| KPI | Cible | Seuil d'alerte |
|-----|-------|----------------|
| **Webhooks traites/h** | — | Pic > 2× baseline |
| **Webhook latence p95** | < 5s | > 30s |
| **Erreurs API (5xx)** | < 0.1% | > 1% |
| **Emails envoyes/echoues** | — | Taux echec > 5% |
| **Push notifications** | — | Taux echec > 10% |

### 16.3 Architecture technique

#### Nouvelles tables (pre-agregation)

```sql
-- Snapshot MRR quotidien (webhook + job nightly)
CREATE TABLE admin_mrr_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL UNIQUE,
  total_mrr INTEGER NOT NULL,                    -- en cents
  new_mrr INTEGER DEFAULT 0,
  expansion_mrr INTEGER DEFAULT 0,
  contraction_mrr INTEGER DEFAULT 0,
  churned_mrr INTEGER DEFAULT 0,
  reactivation_mrr INTEGER DEFAULT 0,
  mrr_lots INTEGER DEFAULT 0,                    -- MRR lots (5€/lot)
  mrr_ai_solo INTEGER DEFAULT 0,                 -- MRR pack Solo
  mrr_ai_equipe INTEGER DEFAULT 0,               -- MRR pack Equipe
  mrr_ai_agence INTEGER DEFAULT 0,               -- MRR pack Agence
  active_subscriptions INTEGER DEFAULT 0,
  trial_subscriptions INTEGER DEFAULT 0,
  paying_teams INTEGER DEFAULT 0,
  churned_teams INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Evenements subscription (source de verite MRR movements)
CREATE TABLE admin_subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id),
  stripe_subscription_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'new', 'upgrade', 'downgrade', 'cancel', 'reactivate',
    'ai_addon', 'ai_upgrade', 'ai_downgrade', 'ai_cancel', 'ai_topup'
  )),
  previous_mrr INTEGER,                          -- en cents
  new_mrr INTEGER,                               -- en cents
  mrr_delta INTEGER,                             -- new_mrr - previous_mrr
  stripe_event_id TEXT,                           -- Stripe event ID pour idempotence webhook
  metadata JSONB,                                -- plan details, tier, etc.
  event_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(stripe_event_id)                        -- Idempotence
);

-- Usage produit quotidien (job nightly depuis activity_logs)
CREATE TABLE admin_usage_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL,
  team_id UUID REFERENCES teams(id),             -- NULL = global
  active_users INTEGER DEFAULT 0,
  sessions_count INTEGER DEFAULT 0,
  interventions_created INTEGER DEFAULT 0,
  interventions_closed INTEGER DEFAULT 0,
  documents_uploaded INTEGER DEFAULT 0,
  contracts_created INTEGER DEFAULT 0,
  ai_minutes_consumed NUMERIC(10,2) DEFAULT 0,
  ai_calls_count INTEGER DEFAULT 0,
  ai_whatsapp_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(snapshot_date, team_id)
);

-- Health score equipe (job hebdomadaire)
CREATE TABLE admin_team_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL UNIQUE REFERENCES teams(id),
  health_score INTEGER NOT NULL CHECK (health_score BETWEEN 0 AND 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('healthy', 'warning', 'at_risk', 'churning')),
  last_active_at TIMESTAMPTZ,
  days_since_login INTEGER,
  usage_trend TEXT CHECK (usage_trend IN ('growing', 'stable', 'declining')),
  mrr INTEGER DEFAULT 0,                         -- en cents, snapshot courant
  factors JSONB,                                  -- detail des facteurs du score
  computed_at TIMESTAMPTZ DEFAULT now()
);

-- RLS : admin-only
ALTER TABLE admin_mrr_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_usage_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_team_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_read" ON admin_mrr_snapshots FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = get_current_user_id() AND role = 'admin'));
-- Idem pour les 3 autres tables
-- INSERT/UPDATE via service role uniquement (CRON jobs + webhooks)
```

#### Data flow

```
Stripe Webhooks ──────┐
  subscription.*      │
  invoice.paid/failed ├──→ admin_subscription_events
                      │         │
                      │         ├──→ admin_mrr_snapshots (CRON nightly)
                      │         │
ElevenLabs Webhook ───┤         │
  ai_phone_calls      ├──→ admin_usage_snapshots ──→  /admin/dashboard/*
  ai_phone_usage      │    (CRON nightly)              Server Components
                      │                                + shadcn/ui Charts
activity_logs ────────┤                                + Supabase Realtime
  (existant)          │
                      │
users + subscriptions ┘──→ admin_team_health (CRON weekly)
```

#### Couche service (Repository Pattern)

| Fichier | Responsabilite |
|---------|----------------|
| `admin-revenue.service.ts` | MRR, ARR, NRR, churn, movements |
| `admin-usage.service.ts` | DAU/MAU, feature adoption, activation |
| `admin-ai-metrics.service.ts` | Minutes IA, cout, marge, resolution |
| `admin-cohort.service.ts` | Retention cohortes, survival curves |
| `admin-health.service.ts` | Health score equipe, alertes at-risk |
| `admin-mrr.repository.ts` | Queries `admin_mrr_snapshots` |
| `admin-usage.repository.ts` | Queries `admin_usage_snapshots` |
| `admin-events.repository.ts` | Queries `admin_subscription_events` |

#### Calcul MRR (webhook-driven)

```typescript
// Dans stripe-webhook.handler.ts
function calculateSubscriptionMRR(subscription: Stripe.Subscription): number {
  let mrr = 0
  for (const item of subscription.items.data) {
    const amount = item.price.unit_amount ?? 0
    const quantity = item.quantity ?? 1
    const interval = item.price.recurring?.interval
    const intervalCount = item.price.recurring?.interval_count ?? 1
    switch (interval) {
      case 'month': mrr += (amount * quantity) / intervalCount; break
      case 'year':  mrr += (amount * quantity) / (12 * intervalCount); break
    }
  }
  if (subscription.discount?.coupon?.percent_off) {
    mrr *= (1 - subscription.discount.coupon.percent_off / 100)
  }
  return Math.round(mrr) // en cents
}
```

#### Caching (SSR + Realtime hybride)

| Donnee | Strategie | TTL |
|--------|-----------|-----|
| KPI cards overview | `unstable_cache` + `revalidateTag('admin-dashboard')` | 5 min |
| MRR trend 12 mois | `unstable_cache` | 1 heure |
| Usage quotidien | `unstable_cache` | 5 min |
| AI metrics | Supabase Realtime sur `ai_phone_calls` | Live |
| Cohortes | `unstable_cache` | 1 heure |
| Health scores | `unstable_cache` | 1 heure |

#### Stack technique

| Composant | Choix | Raison |
|-----------|-------|--------|
| **Charts** | shadcn/ui Charts (Recharts 2.15.4) | Deja installe, theming OKLCH natif, zero bundle supplementaire |
| **Realtime** | Supabase Realtime (postgres_changes) | Deja en stack, fonctionne sur Vercel |
| **Pre-agregation** | pg_cron ou Supabase Edge Functions (CRON) | Nightly pour snapshots, weekly pour health |
| **Cache** | `unstable_cache` + `revalidateTag` | Next.js natif, invalidation on-demand |

### 16.4 Design UI

#### Overview (L0) — `/admin/dashboard/`

```
┌─────────────────────────────────────────────────────────────────────┐
│  SEIDO Admin                                          [Mars 2026 ▼]│
│                                                                     │
│  ┌─ Overview ─┬─ Revenue ─┬─ Usage ─┬─ IA ─┬─ Clients ─┬─ Ops ─┐  │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ MRR      │ │ NRR      │ │ Equipes  │ │ Churn    │              │
│  │ €4,280   │ │ 112%     │ │ 47       │ │ 2.1%     │              │
│  │ ▁▂▃▄▅▆▇ │ │ ▅▆▆▇▇▇▇ │ │ ▂▃▃▄▅▆▇ │ │ ▇▅▄▃▃▂▂ │              │
│  │ +18% ↑   │ │ +3pp ↑   │ │ +8 ↑     │ │ -0.5 ↓   │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│  │ ARPU     │ │ IA Actif │ │ Min. IA  │ │ Marge IA │              │
│  │ €91      │ │ 12/47    │ │ 1,847    │ │ 71%      │              │
│  │ ▃▄▄▅▅▆▇ │ │ ▁▂▃▄▅▆▇ │ │ ▂▃▄▅▅▆▇ │ │ ▇▇▆▆▆▇▇ │              │
│  │ +€12 ↑   │ │ 26% ↑    │ │ +420 ↑   │ │ stable   │              │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘              │
│                                                                     │
│  ── MRR Trend (12 mois) ── Area chart empile lots + 3 packs IA    │
│  ── Repartition MRR (donut) ── + ── Alertes recentes (feed) ──    │
│  ── Top equipes par MRR (tableau avec health score) ──             │
└─────────────────────────────────────────────────────────────────────┘
```

#### Revenue (L1) — `/admin/dashboard/revenue`

```
┌─────────────────────────────────────────────────────────────────────┐
│  MRR Movements (bar chart)                                          │
│  ███ New  ███ Expansion  ░░░ Contraction  ░░░ Churn                │
│                                                                     │
│  NRR glissant 3 mois (line chart)                                  │
│                                                                     │
│  Tableau evenements subscription recents                            │
│  │ Date │ Equipe │ Type │ Details │ Delta MRR │                    │
└─────────────────────────────────────────────────────────────────────┘
```

#### AI (L1) — `/admin/dashboard/ai`

```
┌─────────────────────────────────────────────────────────────────────┐
│  Minutes totales ce mois ████████░░░░ 1,847 / 2,600 (71%)         │
│  Cout reel vs Revenue IA (line dual-axis)                          │
│                                                                     │
│  Repartition par pack (donut)                                      │
│  Solo: 3 equipes │ Equipe: 6 │ Agence: 3                          │
│                                                                     │
│  Top categories appels IA (horizontal bar)                         │
│  Canal prefere : Tel 68% / WhatsApp 32% (donut)                   │
│                                                                     │
│  Tableau equipes par usage IA                                       │
│  │ Equipe │ Pack │ Utilise/Quota │ Marge │ Top-ups │              │
└─────────────────────────────────────────────────────────────────────┘
```

#### Customers (L1) — `/admin/dashboard/customers`

```
┌─────────────────────────────────────────────────────────────────────┐
│  Cohorte retention (heatmap CSS Grid)                              │
│  ┌──────┬──M1──┬──M2──┬──M3──┬──M4──┐                            │
│  │Oct 25│ 100% │ 87%  │ 82%  │ 78%  │                            │
│  │Nov 25│ 100% │ 91%  │ 85%  │      │                            │
│  │Dec 25│ 100% │ 88%  │      │      │                            │
│  └──────┴──────┴──────┴──────┴──────┘                            │
│                                                                     │
│  Equipes at-risk (health < 40) — liste avec actions                │
│  Conversion funnel : Signup → Trial → Paid → IA (bar horizontal)  │
└─────────────────────────────────────────────────────────────────────┘
```

#### Composants reutilisables

| Composant | Props | Usage |
|-----------|-------|-------|
| `AdminKpiCard` | label, value, trend, sparklineData, format | 8 cards overview |
| `MrrTrendChart` | data[], period | Area chart empile |
| `MrrMovementsChart` | data[] | Bar chart movements |
| `RevenueDonut` | segments[] | Repartition MRR |
| `AlertsFeed` | alerts[] | Feed evenements business |
| `TeamHealthTable` | teams[] | Tableau sortable + health badges |
| `CohortHeatmap` | matrix[][] | CSS Grid heatmap retention |
| `AiUsageChart` | data[] | Line chart minutes + seuils |
| `PeriodSelector` | value, onChange | Filtre global 7j/30j/90j/12m |

#### Principes UI

- 8 KPI cards max au-dessus du fold
- Sparkline 30j dans chaque card pour tendance instantanee
- Code couleur : vert = sain, orange = attention, rouge = critique
- Delta vs periode precedente sur chaque KPI
- Tooltips explicatifs (l'admin visite rarement → besoin de contexte)
- Mobile : KPI cards en carousel (composant `kpi-carousel.tsx` existant)
- Dark mode automatique via tokens OKLCH

### 16.5 User stories

| # | ID | Titre | Taille | Priorite | Couche | Depend de |
|---|-----|-------|--------|----------|--------|-----------|
| 17 | US-017 | Schema DB admin metrics (4 tables) | S | 1 | Schema | — |
| 18 | US-018 | Webhook MRR tracking + subscription events | M | 2 | Backend | US-017 |
| 19 | US-019 | CRON jobs pre-agregation (nightly + weekly) | M | 2 | Backend | US-017 |
| 20 | US-020 | Service layer admin metrics (5 services) | M | 2 | Backend | US-017, US-019 |
| 21 | US-021 | Dashboard overview L0 (8 KPI + MRR trend) | L | 3 | UI | US-020 |
| 22 | US-022 | Dashboard Revenue L1 (MRR movements, NRR) | M | 3 | UI | US-020 |
| 23 | US-023 | Dashboard AI L1 (minutes, cout, categories) | M | 3 | UI | US-020 |
| 24 | US-024 | Dashboard Customers L1 (cohortes, health) | M | 4 | UI | US-020 |
| 25 | US-025 | Dashboard Usage + Operations L1 | M | 4 | UI | US-020 |
| 26 | US-026 | Alertes admin (at-risk, churn, anomalies) | S | 4 | Backend | US-020 |

#### US-017 — Schema DB admin metrics

**En tant que** developpeur, **je veux** les tables `admin_mrr_snapshots`, `admin_subscription_events`, `admin_usage_snapshots`, `admin_team_health` creees avec RLS admin-only **pour que** les metriques pre-agregees soient stockees de maniere securisee.

**Criteres d'acceptation :**
- Migration cree les 4 tables avec tous les index (snapshot_date, team_id)
- RLS : SELECT pour role admin, INSERT/UPDATE via service role uniquement
- CHECK constraints sur `event_type`, `risk_level`, `health_score`
- `npm run supabase:types` regenere sans erreur
- Lint passe

**Taille :** S | **Depend de :** — | **Couche :** Schema

---

#### US-018 — Webhook MRR tracking + subscription events

**En tant que** systeme, **je veux** calculer le MRR reel a chaque evenement Stripe **pour que** les donnees financieres soient fiables et temps-reel.

**Criteres d'acceptation :**
- Ecouter : `subscription.created/updated/deleted`, `invoice.paid/failed`
- `calculateSubscriptionMRR()` normalise en monthly (lots + IA, gere annual/monthly)
- INSERT dans `admin_subscription_events` avec `event_type` et `mrr_delta`
- Idempotent via `stripe_event_id` unique
- Gere les coupons/discounts (percent_off et amount_off)
- Distingue les events lots vs IA (via price metadata ou price ID matching)
- Tests unitaires pour : new, upgrade, downgrade, cancel, reactivate, ai_addon, ai_topup
- Lint passe

**Taille :** M | **Depend de :** US-017 | **Couche :** Backend

---

#### US-019 — CRON jobs pre-agregation

**En tant que** systeme, **je veux** des jobs de pre-agregation nightly et weekly **pour que** les dashboards soient rapides sans calculer a la volee.

**Criteres d'acceptation :**
- **Nightly job** : agrege `admin_subscription_events` → `admin_mrr_snapshots` (1 row/jour)
- **Nightly job** : agrege `activity_logs` + `ai_phone_calls` → `admin_usage_snapshots` (1 row/jour/equipe + 1 row global)
- **Weekly job** : calcule health score par equipe → `admin_team_health`
  - Score base sur : derniere connexion, interventions creees, usage IA, trend
  - `risk_level` derive : healthy > 60, warning 40-60, at_risk 20-40, churning < 20
- Implementation : pg_cron dans Supabase ou Supabase Edge Function schedulee
- Idempotent (UPSERT sur snapshot_date + team_id)
- Lint passe

**Taille :** M | **Depend de :** US-017 | **Couche :** Backend

---

#### US-020 — Service layer admin metrics

**En tant que** developpeur, **je veux** 5 services + repositories pour acceder aux metriques admin **pour que** les pages dashboard aient une API propre.

**Criteres d'acceptation :**
- `admin-revenue.service.ts` : getMRRTrend(months), getMRRMovements(period), getNRR(months), getRevenueBreakdown()
- `admin-usage.service.ts` : getDAUMAU(period), getFeatureAdoption(), getActivationRate(), getTrialConversion()
- `admin-ai-metrics.service.ts` : getAIUsageSummary(), getCostMargin(), getTopCategories(), getChannelDistribution()
- `admin-cohort.service.ts` : getRetentionCohorts(months), getSurvivalCurve()
- `admin-health.service.ts` : getAtRiskTeams(), getHealthDistribution(), getAlerts(limit)
- Repositories correspondants avec queries typees
- Toutes les methodes acceptent un `period` optionnel (7d/30d/90d/12m)
- Lint passe

**Taille :** M | **Depend de :** US-017, US-019 | **Couche :** Backend

---

#### US-021 — Dashboard overview L0

**En tant qu'** admin SEIDO, **je veux** voir en un coup d'oeil les KPIs business essentiels **pour que** je puisse piloter mes decisions rapidement.

**Criteres d'acceptation :**
- Page `/admin/dashboard/` avec `getServerAuthContext('admin')`
- 8 KPI cards avec sparklines : MRR, NRR, Equipes payantes, Customer Churn, ARPU, IA actif, Minutes IA, Marge IA
- Delta vs mois precedent (%, direction, couleur)
- Area chart MRR 12 mois (empile : lots + IA Solo + IA Equipe + IA Agence)
- Donut repartition MRR par source
- Feed alertes recentes (5 dernieres)
- Tableau top 10 equipes par MRR avec health score badge
- `PeriodSelector` global (7j/30j/90j/12m)
- shadcn/ui Charts (Recharts existant, pas de nouvelle dependance)
- Responsive : kpi-carousel sur mobile
- `unstable_cache` avec `revalidateTag('admin-dashboard')`, TTL 5 min
- Lint passe

**Taille :** L | **Depend de :** US-020 | **Couche :** UI

---

#### US-022 — Dashboard Revenue L1

**En tant qu'** admin, **je veux** un detail des mouvements de revenus **pour que** je comprenne d'ou vient la croissance et ou je perds du MRR.

**Criteres d'acceptation :**
- Page `/admin/dashboard/revenue`
- Bar chart MRR movements (new, expansion, contraction, churn, reactivation)
- Line chart NRR glissant 3 mois
- Tableau evenements subscription recents (date, equipe, type, delta MRR)
- Filtres par periode
- Lint passe

**Taille :** M | **Depend de :** US-020 | **Couche :** UI

---

#### US-023 — Dashboard AI L1

**En tant qu'** admin, **je veux** voir la performance et la rentabilite de l'assistant IA **pour que** je puisse optimiser les packs et les couts.

**Criteres d'acceptation :**
- Page `/admin/dashboard/ai`
- Barre de progression minutes totales consommees / allouees (toutes equipes)
- Line chart dual-axis : cout reel IA vs revenue IA (par mois)
- Donut repartition par pack (Solo/Equipe/Agence)
- Horizontal bar chart top categories d'appels
- Donut canal prefere (telephone vs WhatsApp)
- Tableau equipes par usage IA (pack, utilise/quota, marge, top-ups)
- Lint passe

**Taille :** M | **Depend de :** US-020 | **Couche :** UI

---

#### US-024 — Dashboard Customers L1

**En tant qu'** admin, **je veux** voir la retention par cohorte et les equipes a risque **pour que** je puisse agir avant qu'elles ne churnent.

**Criteres d'acceptation :**
- Page `/admin/dashboard/customers`
- Heatmap cohorte retention (CSS Grid, lignes = mois signup, colonnes = mois depuis)
- Liste equipes at-risk (health < 40) avec dernier login, MRR, trend
- Bar horizontal funnel : Signup → Trial → Paid → IA addon
- Lint passe

**Taille :** M | **Depend de :** US-020 | **Couche :** UI

---

#### US-025 — Dashboard Usage + Operations L1

**En tant qu'** admin, **je veux** voir l'adoption produit et la sante operationnelle **pour que** je puisse detecter les problemes techniques et les features sous-utilisees.

**Criteres d'acceptation :**
- Page `/admin/dashboard/usage` : DAU/MAU trend, feature adoption bar chart, activation rate, trial conversion rate
- Page `/admin/dashboard/operations` : webhooks traites/h, latence p95, erreurs API, emails envoyes/echoues
- Supabase Realtime pour les metriques ops temps reel
- Lint passe

**Taille :** M | **Depend de :** US-020 | **Couche :** UI

---

#### US-026 — Alertes admin

**En tant qu'** admin, **je veux** recevoir des alertes automatiques sur les anomalies business **pour que** je puisse reagir proactivement.

**Criteres d'acceptation :**
- Alertes generees dans le feed overview :
  - MRR drop > 5% month-over-month
  - Equipe at-risk (health < 40, 0 login 14j+)
  - Churn spike (> 2× baseline en 7j)
  - Trial expire dans 1-3j (equipes avec > 3 lots)
  - Upgrade/downgrade (info)
  - AI error rate > 5% en 1h
- Stockage : table `admin_alerts` ou champ JSONB dans `admin_team_health`
- Email optionnel a l'admin pour alertes critiques
- Lint passe

**Taille :** S | **Depend de :** US-020 | **Couche :** Backend

### 16.6 Estimation

| Phase | Stories | Estimation |
|-------|---------|------------|
| Schema + Backend | US-017 a US-020 | ~2 semaines |
| Dashboard UI (L0 + L1) | US-021 a US-025 | ~2.5 semaines |
| Alertes + polish | US-026 | ~0.5 semaine |
| **Total Dashboard Admin** | **10 stories** | **~5 semaines** |

### 16.7 Routes

```
/admin/dashboard/
  ├── page.tsx              (L0 — Overview)
  ├── revenue/page.tsx      (L1 — Revenue)
  ├── usage/page.tsx        (L1 — Usage)
  ├── ai/page.tsx           (L1 — AI)
  ├── customers/page.tsx    (L1 — Customers)
  └── operations/page.tsx   (L1 — Operations)
```

Toutes les pages utilisent `getServerAuthContext('admin')` + Server Components. Client Components uniquement pour les charts interactifs (shadcn/ui Charts).

### 16.8 Fichiers impactes

| Fichier | Modification |
|---------|-------------|
| `supabase/migrations/` | Nouvelle migration : 4 tables admin + RLS |
| `lib/services/domain/stripe-webhook.handler.ts` | Ajouter calcul MRR + INSERT events |
| `lib/services/domain/admin-*.service.ts` | 5 nouveaux services |
| `lib/services/repositories/admin-*.repository.ts` | 4 nouveaux repositories |
| `app/admin/(with-navbar)/dashboard/` | Refonte complete (6 sous-pages) |
| `components/dashboards/admin/` | Nouveaux composants (KPI, charts, heatmap) |
| `components/ui/chart.tsx` | Deja existant (Recharts wrapper) |
| `supabase/functions/` ou pg_cron | Jobs nightly + weekly |

---

*Document genere le 27 fevrier 2026 — v2.0 le 28 fevrier 2026 (Twilio) — v3.0 le 1 mars 2026 (retour Telnyx SIP trunk) — v3.1 le 1 mars 2026 (self-service multi-tenant + script 4 etapes) — v3.2 le 1 mars 2026 (audit documentation + securite : 8 bloqueurs corriges) — v3.3 le 2 mars 2026 (canal WhatsApp dual-canal) — v3.4 le 2 mars 2026 (pricing 3-tier + landing page redesign + analyse economique) — v3.5 le 2 mars 2026 (dashboard admin & KPIs) — v3.6 le 2 mars 2026 (audit technique complet : 24 corrections — latence, RGPD, schema DB, risques operationnels, best practices Claude/Stripe/ElevenLabs/Telnyx)*
*Basee sur : brainstorming session + recherche 4 agents specialises + verification docs officielles + test dashboard reel + configuration Telnyx/ElevenLabs validee + recherche WhatsApp Business API + analyse SEO concurrentielle + copywriting conversion + recherche SaaS B2B dashboard best practices*
*Stack : Telnyx SIP trunk (FQDN) + ElevenLabs Conversational AI (Claude Haiku 4.5) + Meta Cloud API (WhatsApp) + Vercel AI SDK 6.x (Claude Haiku 4.5) + @react-pdf/renderer + Stripe Billing (flat-rate + meters + alerts) + shadcn/ui Charts (Recharts)*
