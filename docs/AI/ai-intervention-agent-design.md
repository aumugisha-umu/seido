# AI Intervention Agent — Design Document

**Date:** 2026-03-20 (review technique integree 2026-03-26)
**Status:** Validated — review corrections applied (v1.1)
**Branch:** feature/operations-reminders-phase1
**Scope:** Phase 1 (manual) + Phase 2 (automatic)
**Review:** Audit independant integre — 2 bugs corriges, 4 clarifications, 3 risques documentes

---

## Table of Contents

1. [Vision & Objectives](#1-vision--objectives)
2. [Architecture Globale](#2-architecture-globale)
3. [Agent Tools Definition](#3-agent-tools-definition)
4. [Document Extraction at Upload](#4-document-extraction-at-upload)
5. [Agent UI — Structured Result + Chat](#5-agent-ui--structured-result--chat)
6. [Security, Audit & Cost Control](#6-security-audit--cost-control)
7. [Phase 2 — Automation on `demande`](#7-phase-2--automation-on-demande)
8. [Database Migrations](#8-database-migrations)
9. [File Structure](#9-file-structure)
10. [Implementation Order](#10-implementation-order)

---

## 1. Vision & Objectives

### What

An AI agent integrated into SEIDO that, when triggered, analyzes all data related to an intervention (property, contracts, contacts, history, documents, emails, conversations) and proposes a structured action plan to the property manager. Upon validation, the agent executes the approved actions.

### Two-Phase Approach

- **Phase 1 (Manual):** Manager clicks "Analyser avec l'IA" on any intervention. Agent analyzes, proposes plan, executes upon approval.
- **Phase 2 (Automatic):** When a tenant creates a `demande`, the agent auto-analyzes and sends an enriched notification with the proposed plan.

### Autonomy Model — Hybrid

Actions are classified dynamically based on whether external parties (locataire/prestataire) are involved:

- **Safe actions** (auto-executed after plan validation): When only gestionnaires are assigned
- **Sensitive actions** (individual confirmation required): When locataire or prestataire is implicated
- **Forbidden actions** (never proposed): Delete anything, modify contracts, financial actions (validate quotes, billing), cancel interventions

### AI Provider

- **Claude (Anthropic)** exclusively, via Vercel AI SDK
- **Sonnet 4.5** for analysis + plan generation
- **Haiku 4.5** for document extraction (cost-effective for structured parsing)

### User Interaction

- **Structured result** with action cards (primary interface)
- **Optional chat** to refine the plan conversationally
- NOT a chatbot — a decision dashboard with AI-powered insights

---

## 2. Architecture Globale

```
+-------------------------------------------------------------+
|                    GESTIONNAIRE UI                            |
|                                                              |
|  [Analyser avec l'IA]  ->  Agent Analysis Panel             |
|       button                 +-- Context summary             |
|                              +-- Action plan (cards)         |
|                              +-- [Approve] [Reject]          |
|                              +-- [Chat with AI]              |
|                                                              |
|  Document Upload  ->  Inline AI Extraction                   |
|       drop zone       +-- Extracted metadata                 |
|                       +-- [Validate] [Correct]               |
+---------------------------+----------------------------------+
                            |
                            v
+-------------------------------------------------------------+
|              NEXT.JS API LAYER                               |
|                                                              |
|  POST /api/agent/analyze       <- Auth + Rate limit          |
|  POST /api/agent/execute       <- Auth + Cost cap            |
|  POST /api/agent/chat          <- Auth + Streaming           |
|  POST /api/agent/extract-doc   <- Auth + File validation     |
+---------------------------+----------------------------------+
                            |
                            v
+-------------------------------------------------------------+
|           VERCEL AI SDK - ToolLoopAgent                      |
|                                                              |
|  Model: Claude Sonnet 4.5 (analysis + plans)                |
|  Model: Claude Haiku 4.5 (document extraction)              |
|                                                              |
|  READ Tools (auto)          WRITE Tools (needsApproval)     |
|  +-- queryIntervention      +-- assignProvider               |
|  +-- queryBuilding/Lot      +-- sendEmail                    |
|  +-- queryContacts          +-- changeStatus                 |
|  +-- queryContracts         +-- proposeTimeSlots             |
|  +-- queryHistory           +-- requestQuote                 |
|  +-- queryDocuments                                          |
|  +-- queryEmails            SAFE Tools (auto)                |
|  +-- queryReminders         +-- createReminder               |
|  +-- queryTeamProviders     +-- addNote                      |
|                             +-- assignGestionnaire           |
+---------------------------+----------------------------------+
                            |
                            v
+-------------------------------------------------------------+
|        EXISTING SEIDO SERVICE LAYER                          |
|  (Repositories -> Supabase + RLS)                           |
|                                                              |
|  + SECURITY DEFINER RPCs for agent writes                   |
|  + Audit logging on every tool call                         |
|  + Authenticated client (user JWT) for reads                |
+-------------------------------------------------------------+
```

### Key Principles

1. **Same service layer** — Agent uses existing repositories and domain services. No parallel DB access path.
2. **Authenticated client for reads** — RLS ensures the agent only sees the team's data.
3. **SECURITY DEFINER RPCs for writes** — Business rules enforced at DB level.
4. **Vercel AI SDK ToolLoopAgent** — Native Next.js integration, streaming, `needsApproval` pattern.

---

## 3. Agent Tools Definition

### READ Tools (auto-executed, authenticated client + RLS)

| Tool | Data Returned | Existing Service |
|------|--------------|-----------------|
| `queryIntervention` | Full intervention + assignments + time slots + quotes | `InterventionRepository` |
| `queryBuildingAndLot` | Building + lot + address + attached contacts | `BuildingRepository` + `LotRepository` |
| `queryContracts` | Lot/building contracts — both **baux** (tenant) + **supplier** contracts | `ContractRepository` + `SupplierContractRepository` |
| `queryInterventionHistory` | Past interventions on this property (type, provider, cost, duration) | `InterventionRepository` |
| `queryDocuments` | Documents + validated `ai_extracted_metadata` | **A creer**: `InterventionDocumentRepository` (pas de repository dedie actuellement — acces direct a `intervention_documents`) |
| `queryConversations` | Thread messages (group, tenant, provider) | `ConversationRepository` |
| `queryEmails` | Emails linked to the intervention | `EmailRepository` |
| `queryTeamProviders` | Team providers + specialties + performance history | `UserRepository` |
| `queryReminders` | Existing reminders on the property/contact/contract | `ReminderRepository` (**a etendre**: ajouter `findByBuilding`, `findByLot`, `findByContact`, `findByContract` ou methode combinee `findByInterventionContext()`) |

### WRITE Tools — Dynamic Classification

The classification depends on `has_external_party`:

```typescript
const hasExternalParty = assignments.some(a => a.role !== 'gestionnaire')
```

| Tool | Safe (gestionnaires only) | Sensitive (locataire/presta involved) |
|------|:---:|:---:|
| `createReminder` | Auto | Auto |
| `addNote` | Auto | Auto |
| `assignGestionnaire` | Auto | Auto |
| `assignProvider` | Auto | Confirmation |
| `changeStatus` | Auto | Confirmation |
| `proposeTimeSlots` | Auto | Confirmation |
| `sendEmail` | -- | Confirmation |
| `requestQuote` | -- | Confirmation |

### Dynamic needsApproval Logic

> **Note:** `needsApproval` dans Vercel AI SDK recoit uniquement les arguments du tool,
> PAS un deuxieme parametre `context`. Utiliser une **closure** (factory pattern) pour
> injecter le contexte de l'intervention au moment de la creation des tools.

```typescript
const ALWAYS_SAFE_TOOLS = ['createReminder', 'addNote', 'assignGestionnaire']

// Factory pattern — le contexte est capture par closure
const createAgentTools = (interventionContext: { assignments: Assignment[] }) => ({
  assignProvider: tool({
    description: 'Assign a provider to the intervention',
    inputSchema: z.object({ providerId: z.string(), reason: z.string() }),
    needsApproval: async () => {
      if (ALWAYS_SAFE_TOOLS.includes('assignProvider')) return false
      return interventionContext.assignments.some(a => a.role !== 'gestionnaire')
    },
    execute: async (args) => { /* ... */ }
  }),
  // ... autres tools
})
```

### Guard Rails

- `stopWhen: stepCountIs(10)` — max 10 agent iterations per analysis
- Each tool has a strict Zod schema (no free-form parameters)
- WRITE tools can only act on the current intervention (no cross-intervention actions)
- System prompt: "ALWAYS propose an action plan before executing write operations"

---

## 4. Document Extraction at Upload

### Flow

```
User drops file -> Upload to Storage (existing)
    -> POST /api/agent/extract-doc { documentId, fileUrl, mimeType, documentType }
    -> Claude Haiku 4.5 (vision for images/PDF, text for the rest)
    -> try/catch: en cas d'erreur API, fallback metadata minimal { error: true }
    -> Returns structured JSON per document_type
    -> UPDATE intervention_documents SET ai_extracted_metadata = {...}
    -> UI shows inline collapsible block under file
    -> User clicks [Validate] or [Correct]
    -> UPDATE SET ai_metadata_validated = true, ai_metadata_validated_at = now()
```

### Extracted Metadata Schema by Document Type

```typescript
// devis / facture
{
  amount: number,
  provider: string,
  date: string,
  line_items: string[],
  validity?: string,
  invoice_number?: string
}

// rapport
{
  summary: string,
  conclusions: string[],
  recommendations: string[]
}

// photo_avant / photo_apres (vision AI)
{
  description: string,
  damage_type?: string,
  severity?: string,
  location_in_unit?: string
}

// certificat / garantie
{
  type: string,
  issuer: string,
  expiration_date?: string,
  coverage?: string
}

// bon_de_commande
{
  items: { name: string, quantity: number, unit_price?: number }[],
  supplier: string
}

// plan
{
  plan_type: string,
  zones: string[],
  scale?: string
}

// Note: 'contrat' n'est PAS dans l'enum intervention_document_type.
// Les contrats fournisseurs sont dans supplier_contract_documents (table separee).
// Si besoin d'extraction IA sur les contrats, etendre supplier_contract_documents
// avec ai_extracted_metadata (pas intervention_documents).
```

### UI — Inline Collapsible Under File

```
+------------------------------------------+
| devis-plomberie-martin.pdf         [x]   |
| 1.2 MB - Uploaded 3s ago                 |
|                                          |
| v AI Analysis                            |
| +--------------------------------------+ |
| | Amount: 1 450,00 EUR                 | |
| | Provider: Martin Plomberie           | |
| | Date: 15/03/2026                     | |
| | Validity: 30 days                    | |
| | Line items:                          | |
| |  - Water heater replacement          | |
| |  - Labor (3h)                        | |
| |  - Travel fee                        | |
| |                                      | |
| |        [Validate]  [Correct]         | |
| +--------------------------------------+ |
+------------------------------------------+
```

When "Correct" is clicked: fields become editable inline, user modifies, clicks "Save". The corrected JSON is stored as the validated version.

### Database Migration

```sql
ALTER TABLE intervention_documents
  ADD COLUMN ai_extracted_metadata JSONB,
  ADD COLUMN ai_metadata_validated BOOLEAN DEFAULT FALSE,
  ADD COLUMN ai_metadata_validated_at TIMESTAMPTZ;
```

---

## 5. Agent UI — Structured Result + Chat

### Panel Layout

When the manager clicks "Analyser avec l'IA", a panel opens (side panel or expandable section on the intervention page) with 3 zones:

```
+--------------------------------------------------+
| AI Analysis                              [x]     |
|                                                   |
| +-- CONTEXT ----------------------------------- +|
| | Water leak reported at lot 3B, building        ||
| | Residence du Parc. Tenant: Marie Dupont.       ||
| | Active plumbing contract with Martin SARL      ||
| | (expires 06/2026). 2 past plumbing             ||
| | interventions on this lot (last: 11/2025,      ||
| | Martin SARL, 890EUR, resolved in 3 days).      ||
| | Uploaded quote: 1 450EUR (AI-validated).        ||
| +----------------------------------------------- +|
|                                                   |
| +-- ACTION PLAN -------------------------------- +|
| |                                                ||
| | [done] Create reminder "Follow-up lot 3B" D+3 ||
| |    -> Auto                                     ||
| |                                                ||
| | [!] Assign Martin SARL (plumbing)              ||
| |    Reason: active contract, good history       ||
| |    -> [Approve] [Reject] [Modify]              ||
| |                                                ||
| | [!] Send email to tenant                       ||
| |    "Your request has been received..."         ||
| |    -> [Preview] [Approve] [Reject]             ||
| |                                                ||
| | [!] Propose slot: Monday 24/03 9h-12h         ||
| |    Reason: Martin SARL availability + urgency  ||
| |    -> [Approve] [Modify] [Reject]              ||
| |                                                ||
| +----------------------------------------------- +|
|                                                   |
| +-- CHAT (optional, collapsed) ----------------- +|
| | [Chat with AI to refine the plan]              ||
| |                                                ||
| | Manager: "Propose Thursday morning instead"    ||
| | AI: "Slot modified: Thursday 27/03 9h-12h"    ||
| |     -> [Approve] [Modify]                      ||
| |                                                ||
| | [____________________________] [Send]          ||
| +----------------------------------------------- +|
+--------------------------------------------------+
```

### Zone Behavior

- **Context zone**: Appears first (streaming), summary of all data consulted. Non-actionable, purely informational.
- **Action Plan zone**: Action cards. Each card has a badge (auto/confirmation). Safe actions execute immediately and show `[done]`. Sensitive ones await click.
- **Chat zone**: Collapsed by default. Opens if manager wants to discuss. Chat can modify the plan (add/remove/modify actions). New proposed actions appear as cards in the plan.

### Action Card States

| State | Visual | Description |
|-------|--------|-------------|
| `pending` | Warning badge | Awaiting manager decision |
| `auto_executed` | Green check, "done" | Safe action, already executed |
| `approved` | Spinner | Being executed |
| `executed` | Green check | Successfully completed |
| `rejected` | Grey strikethrough | Rejected by manager |
| `failed` | Red X + error message | Execution error |

---

## 6. Security, Audit & Cost Control

### Defense in Depth — 7 Layers

| Layer | Protection |
|-------|-----------|
| **1. API Route** | `getServerAuthContext('gestionnaire')` — only managers access the agent |
| **2. Rate Limiting** | 10 analyses/min per user, 50/min per team |
| **3. Cost Cap** | Monthly budget per team (stored in DB), blocks when exceeded |
| **4. Agent Config** | `stopWhen: stepCountIs(10)` — max 10 iterations per analysis |
| **5. Tool Schemas** | Strict Zod on every input — no free parameters, no injection |
| **6. Service Layer** | Tools call existing services (same business validations) |
| **7. RLS + SECURITY DEFINER** | Reads filtered by team, writes validated at DB level |

### Audit — `agent_sessions` Table

```sql
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  user_id UUID NOT NULL REFERENCES users(id),
  intervention_id UUID REFERENCES interventions(id),

  -- Analysis
  trigger_type TEXT NOT NULL,    -- 'manual' | 'auto_demande'
  context_summary TEXT,          -- Generated summary
  proposed_plan JSONB,           -- Proposed plan (actions array)

  -- Execution
  executed_actions JSONB,        -- Executed actions + results
  rejected_actions JSONB,        -- Actions rejected by user

  -- Costs
  total_input_tokens INT,
  total_output_tokens INT,
  estimated_cost_usd NUMERIC(10,6),
  model_used TEXT,
  tool_calls_count INT,

  -- Lifecycle
  status TEXT DEFAULT 'analyzing',  -- analyzing | proposed | executing | completed | failed
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

### Monthly Cost Tracking — `agent_usage_monthly` Table

```sql
CREATE TABLE agent_usage_monthly (
  team_id UUID NOT NULL REFERENCES teams(id),
  month DATE NOT NULL,
  total_sessions INT DEFAULT 0,
  total_input_tokens BIGINT DEFAULT 0,
  total_output_tokens BIGINT DEFAULT 0,
  total_cost_usd NUMERIC(10,4) DEFAULT 0,
  total_doc_extractions INT DEFAULT 0,
  PRIMARY KEY (team_id, month)
);
```

### Pre-Call Budget Check

```typescript
const usage = await agentUsageRepo.getCurrentMonth(teamId)
if (usage.total_cost_usd >= team.ai_monthly_budget) {
  return { error: 'Budget IA mensuel atteint', usage }
}
```

### Integration with Existing Activity Log

Every agent action creates an `activity_logs` entry:

```typescript
{
  entity_type: 'intervention',
  entity_id: interventionId,
  action_type: 'agent_action',
  metadata: {
    agent_session_id: sessionId,
    tool_name: 'assignProvider',
    auto_executed: false,
    approved_by: userId
  }
}
```

Visible in the intervention activity feed alongside manual actions.

---

## 7. Phase 2 — Automation on `demande`

### Trigger

When a tenant creates an intervention (status `demande`), a Supabase Database Webhook triggers automatic analysis:

```
INSERT interventions (status='demande')
    -> Supabase Database Webhook (pg_net)
    -> POST /api/agent/auto-analyze { interventionId }
    -> Agent analyzes in background
    -> Creates agent_session with proposed_plan
    -> Push + email notification to manager:
       "AI analyzed request #REF-2026-042 - Proposed plan (3 actions)"
    -> Direct link to intervention page with AI panel open
```

### Enriched Notification

```
+------------------------------------------+
| AI Analysis - Water leak lot 3B          |
|                                          |
| Context: Tenant Marie Dupont,            |
| active plumbing contract Martin SARL.    |
| 2 similar past interventions.            |
|                                          |
| Proposed plan:                           |
|  - Assign Martin SARL                    |
|  - Send acknowledgment email             |
|  - Create reminder D+3                   |
|                                          |
| [View full plan ->]                      |
| [Approve all]  [Review first]            |
+------------------------------------------+
```

### "Approve All" from Notification

- One-tap: executes all sensitive actions without opening the app
- Implemented via magic link token (same pattern as existing email action links)
- Only available if the plan contains only medium-risk actions (no critical status changes)
- **Securite magic link :** token unique, usage unique, expiration courte (ex: 1h). Verifier que le pattern existant fournit ces garanties.

### Risques Phase 2

> Issues identifiees lors de la revue technique.

**Webhook auto-analyze — authentification :**
Le webhook Supabase (pg_net) n'a pas de session utilisateur ni de cookies. Authentifier via cle secrete partagee (`X-Webhook-Secret` header) ou JWT signe par un secret connu uniquement du projet. A implementer dans `/api/agent/auto-analyze`.

**Race condition sur le trigger `demande` :**
La creation d'une intervention est un flux multi-etapes (INSERT → assignations → threads → documents). Si l'agent analyse trop tot, il manque des donnees. Strategies :
- Declencher via job differe (5-10s apres l'INSERT) plutot qu'un trigger immediat
- Ou utiliser un `AFTER INSERT` qui verifie la presence des donnees critiques
- Documenter la strategie choisie lors de l'implementation

### Progressive Learning (Phase 2.5)

The agent observes manager patterns from past sessions:

```typescript
const pastSessions = await agentSessionRepo.findByTeam(teamId, {
  status: 'completed',
  limit: 50
})

// Enriched system prompt:
// "Observed preferences for this team:
//  - Preferred plumbing provider: Martin SARL (assigned 8/10 times)
//  - Usual reminder delay: D+3 (used 70% of the time)
//  - Manager systematically rejects auto-emails to tenants
//    -> Do not propose tenant emails, propose conversation message instead"
```

### Vector Embeddings (Phase 2.5)

For semantic search across analyzed documents:

> **Embedding provider:** Voyage AI (recommande par Anthropic). Dimension 1024 (defaut).
> 1536 = OpenAI (text-embedding-ada-002) — ne pas utiliser avec Voyage.
> Adapter si un autre provider est choisi.

```sql
-- pgvector extension (available on Supabase)
ALTER TABLE intervention_documents
  ADD COLUMN ai_embedding vector(1024);

CREATE INDEX idx_documents_embedding
  ON intervention_documents
  USING ivfflat (ai_embedding vector_cosine_ops);
```

The agent can then search "documents similar to this leak" across the entire team history, not just the current property.

---

## 8. Database Migrations

### Migration 1: Document AI Metadata

```sql
-- Add AI extraction columns to intervention_documents
ALTER TABLE intervention_documents
  ADD COLUMN ai_extracted_metadata JSONB,
  ADD COLUMN ai_metadata_validated BOOLEAN DEFAULT FALSE,
  ADD COLUMN ai_metadata_validated_at TIMESTAMPTZ;

COMMENT ON COLUMN intervention_documents.ai_extracted_metadata
  IS 'Structured data extracted by AI from the document (type-specific JSON schema)';
```

### Migration 2: Agent Sessions & Usage

```sql
-- Agent sessions (audit + state tracking)
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  user_id UUID NOT NULL REFERENCES users(id),
  intervention_id UUID REFERENCES interventions(id),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('manual', 'auto_demande')),
  context_summary TEXT,
  proposed_plan JSONB,
  executed_actions JSONB,
  rejected_actions JSONB,
  total_input_tokens INT,
  total_output_tokens INT,
  estimated_cost_usd NUMERIC(10,6),
  model_used TEXT,
  tool_calls_count INT,
  status TEXT DEFAULT 'analyzing'
    CHECK (status IN ('analyzing', 'proposed', 'executing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_agent_sessions_team ON agent_sessions(team_id);
CREATE INDEX idx_agent_sessions_intervention ON agent_sessions(intervention_id);
CREATE INDEX idx_agent_sessions_status ON agent_sessions(status);

-- RLS: gestionnaire only, team-scoped
-- Note: get_my_profile_ids() pour multi-profil (AGENTS.md #003, #086)
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_sessions_team_access ON agent_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = agent_sessions.team_id
      AND team_members.user_id IN (SELECT get_my_profile_ids())
      AND team_members.role IN ('admin', 'gestionnaire')
    )
  );

-- Monthly usage tracking
CREATE TABLE agent_usage_monthly (
  team_id UUID NOT NULL REFERENCES teams(id),
  month DATE NOT NULL,
  total_sessions INT DEFAULT 0,
  total_input_tokens BIGINT DEFAULT 0,
  total_output_tokens BIGINT DEFAULT 0,
  total_cost_usd NUMERIC(10,4) DEFAULT 0,
  total_doc_extractions INT DEFAULT 0,
  PRIMARY KEY (team_id, month)
);

ALTER TABLE agent_usage_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY agent_usage_team_access ON agent_usage_monthly
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = agent_usage_monthly.team_id
      AND team_members.user_id IN (SELECT get_my_profile_ids())
      AND team_members.role IN ('admin', 'gestionnaire')
    )
  );
```

### Migration 3 (Phase 2): AI Budget on Teams

```sql
ALTER TABLE teams
  ADD COLUMN ai_monthly_budget NUMERIC(10,4) DEFAULT 10.00,
  ADD COLUMN ai_enabled BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN teams.ai_monthly_budget
  IS 'Monthly AI budget in USD. Default 10.00. Set per subscription tier.';
```

### Migration 4 (Phase 2.5): Vector Embeddings

```sql
-- Enable pgvector if not already
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE intervention_documents
  ADD COLUMN ai_embedding vector(1024);

-- lists ≈ sqrt(row_count). 100 convient pour < 10k documents.
-- A ajuster en production selon le volume reel.
CREATE INDEX idx_documents_embedding
  ON intervention_documents
  USING ivfflat (ai_embedding vector_cosine_ops)
  WITH (lists = 100);
```

---

## 9. File Structure

```
lib/services/domain/agent/
  +-- agent.service.ts              # Main agent orchestration (ToolLoopAgent setup)
  +-- agent-tools.ts                # Tool definitions (READ + WRITE + SAFE)
  +-- agent-tools.types.ts          # Zod schemas for all tool inputs/outputs
  +-- agent-prompt.ts               # System prompt construction (context-aware)
  +-- document-extraction.service.ts # Haiku-based document analysis
  +-- agent-cost.service.ts         # Budget check + usage tracking

lib/services/repositories/
  +-- agent-session.repository.ts   # CRUD for agent_sessions
  +-- agent-usage.repository.ts     # Monthly usage tracking

app/api/agent/
  +-- analyze/route.ts              # POST - Trigger analysis (Phase 1: manual)
  +-- execute/route.ts              # POST - Execute approved actions
  +-- chat/route.ts                 # POST - Streaming chat refinement
  +-- extract-doc/route.ts          # POST - Document extraction at upload
  +-- auto-analyze/route.ts         # POST - Phase 2: webhook-triggered

app/actions/
  +-- agent-actions.ts              # Server actions for agent UI interactions

components/agent/
  +-- agent-analysis-panel.tsx      # Main panel (context + plan + chat)
  +-- agent-context-summary.tsx     # Context zone (streaming)
  +-- agent-action-card.tsx         # Individual action card with states
  +-- agent-action-plan.tsx         # Plan zone (list of action cards)
  +-- agent-chat.tsx                # Optional chat zone
  +-- agent-trigger-button.tsx      # "Analyser avec l'IA" button
  +-- document-ai-extraction.tsx    # Inline extraction display + validate/correct

hooks/
  +-- use-agent-session.ts          # Agent session state management
  +-- use-document-extraction.ts    # Document extraction state + polling

lib/types/
  +-- agent.types.ts                # All agent-related TypeScript types
```

---

## 10. Implementation Order

### Phase 1 — Manual Analysis (estimated: 8 stories)

| # | Story | Scope |
|---|-------|-------|
| 1 | **DB migrations** — document AI columns + agent_sessions + agent_usage_monthly | SQL |
| 2 | **Document extraction service** — Haiku integration, extract by type, store metadata | Backend |
| 3 | **Document extraction UI** — Inline collapsible, validate/correct flow | Frontend |
| 4 | **Agent service + tools (READ)** — ToolLoopAgent setup, all 9 read tools | Backend |
| 5 | **Agent service + tools (WRITE)** — Safe + sensitive tools, needsApproval logic | Backend |
| 6 | **Agent API routes** — /analyze, /execute, /chat with auth + rate limit + cost cap | Backend |
| 7 | **Agent UI panel** — Context + Action Plan + Chat zones on intervention page | Frontend |
| 8 | **Audit + cost tracking** — agent_sessions logging, usage aggregation, budget gate | Backend |

### Phase 2 — Automation (estimated: 4 stories)

| # | Story | Scope |
|---|-------|-------|
| 9 | **DB migration** — ai_monthly_budget on teams | SQL |
| 10 | **Auto-analyze webhook** — Database Webhook on INSERT demande, /auto-analyze route | Backend |
| 11 | **Enriched notifications** — Plan summary in push/email, "Approve all" magic link | Backend + Email |
| 12 | **Settings UI** — Enable/disable AI, budget config, usage dashboard per team | Frontend |

### Phase 2.5 — Learning + Embeddings (estimated: 3 stories)

| # | Story | Scope |
|---|-------|-------|
| 13 | **Vector embeddings migration** — pgvector, embedding column, index | SQL |
| 14 | **Embedding pipeline** — Generate embeddings on document validation, semantic search tool | Backend |
| 15 | **Learning from history** — Past sessions analysis, preference extraction, prompt enrichment | Backend |

---

## Technical References

### External

- [Anthropic: Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) — Orchestrator-workers pattern, simplicity principle
- [Vercel AI SDK: Tools & Tool Calling](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling) — `needsApproval`, Zod schemas, approval flow
- [Vercel AI SDK: Building Agents](https://ai-sdk.dev/docs/agents/building-agents) — `ToolLoopAgent`, `stopWhen`, lifecycle callbacks
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — `security_invoker` views, SECURITY DEFINER functions
- [Supabase: Database Webhooks](https://supabase.com/docs/guides/database/webhooks) — pg_net async triggers
- [Supabase: AI & Vectors](https://supabase.com/docs/guides/ai) — pgvector, embeddings, hybrid search

### Internal SEIDO

- `lib/services/README.md` — Repository pattern documentation
- `lib/server-context.ts` — `getServerAuthContext()` pattern
- `.claude/memory-bank/systemPatterns.md` — 37 architecture patterns
- `app/api/ai-phone/` — Existing AI integration (ElevenLabs phone agent)
- `lib/services/domain/email-notification/` — Email builder architecture (reuse for agent emails)
- `app/actions/notification-actions.ts` — 20 notification server actions

---

*Document generated: 2026-03-20*
*Validated through brainstorming session: 6 sections, all approved*
*Review technique integree: 2026-03-26 (v1.1) — 2 bugs corriges (embeddings 1024, contrat schema), 4 clarifications (needsApproval closure, queryContracts baux, queryReminders methods, queryDocuments repo), 3 risques (webhook auth, race condition, magic link security), RLS multi-profil*
*Ancien fichier review `ai-intervention-agent-design-review.md` fusionne ici*
*Next step: Implementation via sp-ralph (Phase 1, stories 1-8)*
