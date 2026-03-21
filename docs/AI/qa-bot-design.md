# QA Bot — Autonomous E2E Testing Agent for SEIDO

**Date:** 2026-03-20
**Status:** Design validated, ready for implementation
**Author:** Claude Code + Arthur

---

## 1. Overview

An autonomous QA agent that runs comprehensive E2E tests after every Vercel deployment. Combines deterministic Playwright test scenarios (Phase 1) with AI-driven autonomous exploration via Claude API (Phase 2), producing structured bug reports with screenshots that feed back into Claude Code for fixes.

### Goals

- Catch regressions after every deploy (preview + production)
- Cover ALL 47 routes and flows across 3 roles (gestionnaire, locataire, prestataire)
- Detect visual bugs, JS errors, network failures, broken flows
- Generate actionable reports (Markdown + GitHub Issues + email)
- Enable Claude Code feedback loop: report → fix → re-deploy → re-test

### Non-Goals (for now)

- Performance/load testing
- Visual regression (pixel-diff)
- Accessibility audit (WCAG)
- Auto-fix by Claude Code (Phase 2 future)

---

## 2. Architecture

```
TRIGGERS
  Vercel Deploy Hook ──→ repository_dispatch (vercel.deployment.ready / .promoted)
  Manual ──→ workflow_dispatch (input: url, mode)

GITHUB ACTIONS WORKFLOW
  ┌──────────────────────────────────────────────────────┐
  │                                                      │
  │  Phase 1 — Guided Scenarios (Playwright, no AI)      │
  │    8 parallel shards via matrix strategy              │
  │    Blob reporter → merge into HTML report             │
  │                                                      │
  │  Phase 2 — Autonomous Exploration (Claude API)       │
  │    Only if Phase 1 passes                             │
  │    Claude API + page.accessibility.snapshot()         │
  │    Budget: max 15 min / 50 pages / ~$1-2 per run     │
  │                                                      │
  │  Phase 3 — Reporting                                  │
  │    Markdown report → GitHub artifact                  │
  │    GitHub Issue → if Critical/High anomalies          │
  │    Email notification → via Resend                    │
  │                                                      │
  └──────────────────────────────────────────────────────┘
```

---

## 3. Infrastructure

### GitHub Actions (free tier)

- **Runners:** ubuntu-latest, 2 vCPU, 7 GB RAM
- **Budget:** 2000 min/month free (sufficient for 1-2 runs/day)
- **Browsers:** `npx playwright install --with-deps chromium`
- **Sharding:** 8 parallel shards via matrix strategy, `fail-fast: false`
- **Reporter:** Blob (per shard) → merge → HTML (final)

### Why not a VPS

- GitHub Actions is free (2000 min/month)
- 7 GB RAM per runner (vs 4 GB on Hostinger)
- No server maintenance
- Native artifact storage (auto-cleanup after 7 days)
- Native sharding/parallelization

### Estimated monthly costs

| Item | Cost |
|------|------|
| GitHub Actions | Free (< 2000 min/month) |
| Claude API (exploration) | ~$30-50/month (1 run/day on main) |
| Resend emails | Free (< 100 emails/month) |
| **Total** | **~$30-50/month** |

---

## 4. Trigger Configuration

### Vercel → GitHub Actions (native integration)

Enable "Repository Dispatch" in Vercel project settings. Vercel sends events automatically.

```yaml
on:
  repository_dispatch:
    types:
      - 'vercel.deployment.ready'     # Preview deployments
      - 'vercel.deployment.promoted'  # Production deployments

  workflow_dispatch:
    inputs:
      target_url:
        description: 'URL to test'
        default: 'https://preview.seido.app'
        type: string
      mode:
        description: 'Test mode'
        type: choice
        options:
          - guided
          - full
        default: 'full'
```

### Event payload (from Vercel)

```json
{
  "environment": "production",
  "git": {
    "ref": "main",
    "sha": "abcdef1234567890",
    "shortSha": "abcdef1"
  },
  "url": "https://example-project-abc123.vercel.app",
  "project": { "name": "seido-app" }
}
```

### Important: Checkout action

Use `vercel/repository-dispatch/actions/checkout@main` (NOT `actions/checkout@v5`) because `repository_dispatch` events reference the default branch HEAD, not the deployed commit. The Vercel action extracts `client_payload.git.sha` and checks out the correct commit.

### Rate limiting

- **Preview deploys:** Phase 1 only (guided, free) — no autonomous exploration
- **Main deploys:** Phase 1 + Phase 2 (full)
- **Cooldown:** 30 min between auto-triggered runs (skip if deploy within cooldown)
- **Manual:** No cooldown, but subject to budget limiter

---

## 5. Phase 1 — Guided Scenarios (8 Shards)

### Auth Strategy

Dedicated QA accounts with Playwright `storageState`:

```typescript
// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /.*\.setup\.ts/ },
  {
    name: 'gestionnaire',
    use: { storageState: 'playwright/.auth/gestionnaire.json' },
    dependencies: ['setup'],
  },
  {
    name: 'locataire',
    use: { storageState: 'playwright/.auth/locataire.json' },
    dependencies: ['setup'],
  },
  {
    name: 'prestataire',
    use: { storageState: 'playwright/.auth/prestataire.json' },
    dependencies: ['setup'],
  },
]
```

Setup file authenticates via Supabase GoTrue REST API (reuses existing `global-setup.ts` logic), saves cookies per role.

Note: Supabase SSR uses chunked cookies (`sb-*-auth-token`), which `storageState` handles correctly (cookies + localStorage). No sessionStorage workaround needed.

### Shard 1: Auth + Smoke + Navigation

```
- Login gestionnaire → dashboard loads
- Login locataire → dashboard loads
- Login prestataire → dashboard loads
- KPI carousel renders (gestionnaire): buildings, lots, occupancy, interventions
- Dashboard hybrid renders (locataire): properties carousel, intervention navigator
- Dashboard navigator renders (prestataire): intervention tabs with counts
- Sidebar navigation: click all 6 main sections → pages load
- Profile page accessible (3 roles)
- Push notification: modal renders, subscribe flow
```

### Shard 2: Patrimoine + Contacts

```
- Create immeuble (wizard): address, name, details → success toast
- View immeuble detail page
- Edit immeuble → save → verify changes
- Create lot linked to immeuble: category, surface, details → success
- View lot detail page
- Edit lot → save → verify
- Create contact prestataire (?type=prestataire): name, email, phone, company
- Create contact locataire (?type=locataire): name, email, phone
- View contact details + société
- Contact list with search/filter
- Verify system notification: "Immeuble créé" in /notifications
```

### Shard 3: Contrats + Rappels

```
CONTRACTS:
- Create bail locatif: tenant selection, lot, dates, rent, intervention planner
- Create contrat fournisseur: supplier, service type, cost, auto-schedule
- View/edit contracts
- Document checklist on contract

REMINDERS — Full lifecycle:
- Create reminder (wizard 3 steps):
  - Step 1: Toggle ON property linking → select lot
  - Step 2: Title "Test QA Rappel" + description + due date (tomorrow)
         + priority haute + assign to gestionnaire
         + recurrence: monthly, every 1 month, end after 3 occurrences
  - Step 3: Verify confirmation summary (all fields displayed)
  - Submit → success toast → redirect to detail
- View reminder detail:
  - Verify badges: priority haute (red), status en_attente, recurrent
  - Verify linked property visible
  - Verify assigned user visible
- Start reminder: click "Commencer" → status becomes en_cours
- Add notes: type text → click "Enregistrer" → toast success
- Complete reminder: click "Terminer" → status becomes termine
- Verify: notes textarea disabled after completion
- Verify: action buttons hidden after completion

- Create 2nd reminder: no property, no recurrence, priority basse
- Cancel reminder: click "Annuler" → status becomes annule

REMINDERS NAVIGATOR:
- Tab "Toutes": shows both reminders (not annule)
- Tab "En attente": shows 0 (both changed status)
- Tab "Terminées": shows 1
- Count badges match per tab
- Toggle cards/list view

OVERDUE REMINDER:
- Create reminder with due date = yesterday
- Verify "En retard" badge (red) on detail page
- Verify orange banner with overdue message

RECURRENCE CONFIG:
- Frequency weekly + select Mon/Wed/Fri checkboxes
- Frequency monthly: toggle between "by date" and "by day" (e.g., 2nd Tuesday)
- End condition: "After 5 occurrences" → verify RRULE string generated
```

### Shard 4: Intervention Lifecycle Multi-Role

```
CREATION (Gestionnaire):
- Step 1: Select lot (QA Lot A)
- Step 2: Title "QA Test Intervention"
        + type "plomberie"
        + urgency "haute"
        + description "Test complet lifecycle"
        + attach 1 file (image)
- Step 3: Select managers (auto-populated)
        + select prestataire (qa-prestataire)
        + include locataire (qa-locataire)
        + scheduling type "slots" → add 2 time slots
        + expects_quote ON
        + confirmation toggle ON → verify checkboxes appear
- Step 4: Verify summary shows all selections
- Submit → success toast → redirect to detail

NOTIFICATIONS CHECK:
- Navigate to /notifications → see "Intervention créée" (team broadcast)

APPROVAL (Gestionnaire):
- Detail page: click "Approuver" → status becomes approuvée
- Verify conversation threads created (group thread visible)
- Check locataire notification: "Intervention approuvée"
- Check prestataire notification: "Intervention approuvée"

PLANNING (Gestionnaire):
- Click "Lancer planification" → status becomes planification
- Verify time slots visible in planning card

TENANT CONFIRMATION (Locataire):
- Login as locataire → navigate to intervention
- See intervention on dashboard
- Open detail → see proposed time slots
- Confirm slot (click → status "selected")

PROVIDER RESPONSE (Prestataire):
- Login as prestataire → see intervention on dashboard
- Open detail → respond to time slots (accept)

QUOTE FLOW (Prestataire):
- Submit quote: fill amount, description → send (draft → sent)
- Verify notification gestionnaire: "Devis reçu"

QUOTE APPROVAL (Gestionnaire):
- Open quotes tab → see pending quote
- Click "Approuver" → quote status becomes accepted
- Verify notification prestataire: "Devis accepté"

CLOSURE CHAIN:
- Prestataire: click "Clôturer" → cloturee_par_prestataire
- Locataire: click "Valider travaux" → cloturee_par_locataire
- Gestionnaire: click "Finaliser" (enter final cost) → cloturee_par_gestionnaire

REJECTION FLOW (separate intervention):
- Create new intervention (minimal: title + lot)
- Reject with reason → status rejetee
- Verify rejection notification to locataire

CANCELLATION:
- Create new intervention → approve → cancel
- Verify status annulee, read-only view
```

### Shard 5: Conversations + Documents

```
CONVERSATIONS:
- Open intervention detail → Conversations tab
- Send message in group thread → verify toast
- Verify notification in-app for other participants
- Send 2nd message within 5 min → verify NO duplicate email notification (throttle)
- Read message as locataire → thread visible
- Internal comment (manager-only): add comment → verify not visible as locataire

DOCUMENTS:
- Upload document on intervention (gestionnaire): select file, choose type
- Upload photo (locataire): image file
- Download document: verify signed URL works (200 response)
- Verify notification "Document ajouté"

TENANT INTERVENTION REQUEST:
- Login locataire → nouvelle-demande
- Select lot + type + description + upload photo
- Submit → verify success
- Verify notification gestionnaire: "Nouvelle demande d'intervention"
- Gestionnaire sees it in operations list with status "demande"
```

### Shard 6: Email System

```
EMAIL SETTINGS:
- Navigate to /parametres/emails
- Page renders (connections list, blacklist section)
- Verify existing connections shown (if any in QA team)

MAIL HUB:
- Navigate to /mail
- If no connections: verify EmailConnectionPrompt takeover
- If connections exist:
  - Folder navigation: click Inbox → Processed → Sent → Archive
  - Verify email counts per folder (badges)
  - Select email → detail panel opens
  - Verify email body renders (sanitized HTML)
  - Verify sender, subject, date visible
  - Mark as processed → email moves to Processed folder
  - Mark as unprocessed → email moves back to Inbox
  - Archive email → moves to Archive
  - Search: type subject keyword → verify filtered results
  - Date filter: "Cette semaine" → verify filtered

EMAIL DETAIL:
- Open email → verify body, sender, attachments list
- Attachment download (if exists): click → verify signed URL
- Reply: click Reply → verify To pre-filled, Subject "Re: ..."

EMAIL LINKING:
- Click "Lier à une entité" → dialog opens
- Select Building tab → search → select entity
- Save → verify link visible in links section
- Unlink → verify removed

COMPOSITION:
- Click "Rédiger" → modal opens
- Fill: From (dropdown), To (email), Subject, Body
- Send → verify toast success
- Verify email appears in Sent folder

INTERNAL CHAT ON EMAIL:
- Select email → open discussion panel
- If ≥2 gestionnaires: "Start conversation" button visible
- Start conversation → select participant → verify thread created

BLACKLIST:
- Navigate to settings → blacklist tab
- Add manual entry: email@test.com → verify appears in list
- Unblock → verify removed
```

### Shard 7: Notifications System

```
IN-APP NOTIFICATIONS:
- Navigate to /notifications (gestionnaire)
- Verify page renders with read/unread separation
- Find unread notification → click "Marquer comme lu"
- Verify moved to read section
- Click "Marquer comme non-lu" → verify moved back
- Archive notification → verify removed from list
- Bell popover: verify unread count badge matches
- Click notification → verify navigation to related entity (intervention/building)

- Navigate to /notifications (locataire) → verify renders
- Navigate to /notifications (prestataire) → verify renders

PUSH NOTIFICATION SUBSCRIPTION:
- Verify permission modal renders
- Subscribe flow: accept → verify endpoint registered
  (check via /api/push/subscribe response)

NOTIFICATION ROUTING:
- After intervention creation (shard 4): verify
  - Team broadcast notification (is_personal=false) visible to all gestionnaires
  - Personal notification (is_personal=true) visible to assigned users
- After approval: verify
  - Locataire receives notification (NOT gestionnaire)
  - Prestataire receives notification (NOT gestionnaire)
- After new message: verify
  - All thread participants notified (except sender)
- After quote submission: verify
  - Gestionnaire receives notification

EDGE CASES:
- Creator excluded: verify creator does NOT receive notification for own action
- Multi-team scoping: if QA user has 2 teams, verify correct scope filtering
```

### Shard 8: Billing + Settings + Edge Cases

```
BILLING:
- Navigate to /settings/billing → page renders
- Verify subscription status card
- Subscription quota: if readOnly, verify "Nouvelle intervention" disabled
- Verify tooltip "Activez votre abonnement" on disabled buttons

SETTINGS:
- Paramètres equipe page renders
- Assistant IA settings page renders
- AI Phone history page renders

LOCATAIRE PAGES:
- Lot details: verify bail info, address, intervention history
- Parametres: notification preferences page renders

PRESTATAIRE PAGES:
- Parametres: notification preferences page renders

EDGE CASES:
- Create intervention → approve → cancel → verify status annulee
- Verify cancelled intervention is read-only (no action buttons)
- Import page renders (/import)
- Help page renders (/aide)
```

---

## 6. Phase 2 — Autonomous Exploration

### Architecture

```
                   ┌──────────────┐
                   │  Explorer.ts │ (orchestrator)
                   └──────┬───────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   ┌─────────┐    ┌──────────────┐   ┌──────────────┐
   │Playwright│    │  Claude API  │   │   Anomaly    │
   │ Browser  │───→│ (@anthropic- │   │  Detector    │
   │          │←───│  ai/sdk)     │   │              │
   └─────────┘    └──────────────┘   └──────────────┘
        │                                    │
        │         accessibility              │
        │         snapshot (2-5 KB)           │
        │◄───────────────────────────────────►│
        │         action commands             │ console errors
        │                                     │ network failures
        │                                     │ layout issues
```

### How it works

1. **Explorer loads the sitemap** (47 known routes)
2. **Prioritizes pages** by:
   - Pages modified in the deployed commit (via `git diff`)
   - Routes NOT covered by Phase 1 guided tests
   - Routes with historical bug count (from `summary.json`)
3. **For each page:**
   - Playwright navigates to the URL
   - Captures `page.accessibility.snapshot()` (2-5 KB)
   - Sends snapshot to Claude API: "Here is the accessibility tree. List all interactive elements. Which should I click to find bugs?"
   - Claude returns ordered actions
   - Playwright executes each action
   - Anomaly Detector monitors: console errors, network 4xx/5xx, error boundaries, placeholder text
   - Screenshot captured ONLY on anomaly
4. **"Off-script" testing:**
   - Invalid inputs (empty, XSS payloads, very long strings)
   - Double-click on submit buttons
   - Browser back/forward mid-flow
   - Page refresh during wizard (step 2 of 4)
   - Direct URL access without auth → verify redirect to login

### Budget controls

| Control | Value |
|---------|-------|
| Max duration | 15 minutes |
| Max pages | 50 |
| Max Claude API calls | 100 |
| Daily API spend cap | $5 (Anthropic dashboard) |
| Preview deploys | Phase 1 only (no exploration) |
| Main deploys | Full (Phase 1 + 2) |
| Cooldown | 30 min between auto-triggered runs |

### Anomaly detection rules

| Type | Detection | Severity |
|------|-----------|----------|
| Error boundary / crash | Text "Something went wrong" or blank page | Critical |
| Console JS error | `page.on('console', msg => msg.type() === 'error')` | High |
| Network 4xx/5xx | `page.on('requestfailed')` + `response.status() >= 400` | High |
| Unhandled promise rejection | `page.on('pageerror')` | High |
| Placeholder text visible | "Lorem ipsum", "TODO", "undefined", "NaN" | Medium |
| Layout overflow | Element wider than viewport | Medium |
| Disabled button without reason | Interactive element with no tooltip/explanation | Low |
| Slow page load | Navigation > 10s | Low |

---

## 7. Phase 3 — Reporting

### Markdown report (GitHub artifact)

```markdown
# QA Bot Report — 2026-03-20 — a1b2c3d

## Run Info
- **Commit:** a1b2c3d (branch: main)
- **Environment:** production
- **Target URL:** https://seido.app
- **Duration:** 4m32s
- **Phase 1:** 42/42 tests pass
- **Phase 2:** 47 pages explored, 3 anomalies found

## Anomalies Found

### [CRITICAL] Error boundary on /gestionnaire/contrats/[id]
- **URL:** https://seido.app/gestionnaire/contrats/abc123
- **Screenshot:** screenshots/anomaly-001.png
- **Console error:** `TypeError: Cannot read property 'name' of undefined`
- **Steps to reproduce:**
  1. Navigate to /gestionnaire/contrats
  2. Click on supplier contract card with ID abc123
  3. Error boundary renders
- **Git blame:** last modified in commit f4e5d6 (file: components/contract/supplier-contract-detail.tsx)
- **Probable cause:** Missing null check on supplier.name

### [HIGH] 500 on POST /api/emails/send
- **URL:** https://seido.app/gestionnaire/mail
- **Action:** Clicked "Envoyer" in compose modal
- **Response:** 500 Internal Server Error
- **Body:** {"error": "SMTP connection refused"}
- **Probable cause:** QA team email connection SMTP credentials expired

## Coverage Summary
- Routes tested: 47/47
- Buttons clicked: 234
- Forms submitted: 12
- Modals opened: 18
- No regression vs previous run: YES

## Phase 1 Test Results
| Shard | Tests | Pass | Fail | Duration |
|-------|-------|------|------|----------|
| 1 | 9 | 9 | 0 | 28s |
| 2 | 11 | 11 | 0 | 35s |
| 3 | 19 | 19 | 0 | 52s |
| 4 | 14 | 14 | 0 | 4m10s |
| 5 | 10 | 10 | 0 | 38s |
| 6 | 13 | 13 | 0 | 45s |
| 7 | 11 | 11 | 0 | 32s |
| 8 | 8 | 8 | 0 | 25s |
```

### GitHub Issue (auto-created on Critical/High)

```markdown
Title: [QA Bot] 3 anomalies on deploy a1b2c3
Labels: qa-bot, bug, auto-generated

## Summary
- 1 Critical, 2 High anomalies detected
- Deploy: a1b2c3d on main
- Full report: [artifact link]

## Critical: Error boundary on /gestionnaire/contrats/[id]
[Full anomaly details + screenshot inline]

## High: 500 on POST /api/emails/send
[Full anomaly details]

## Suggested fix workflow
1. Open Claude Code
2. Run: `gh issue view 142` to read this issue
3. Claude Code can read the steps to reproduce and fix the bugs

---
Generated by QA Bot | [Full HTML Report](artifact-link) | [GitHub Actions Run](run-link)
```

### Email notification (via Resend)

```
Subject: [SEIDO QA] 3 anomalies detected — deploy a1b2c3

Body:
- 1 Critical, 2 High
- Link to GitHub Issue #142
- Link to full report artifact
- Link to GitHub Actions run
```

### Regression tracking (summary.json)

```json
{
  "runs": [
    {
      "date": "2026-03-20T14:30:00Z",
      "commit": "a1b2c3d",
      "environment": "production",
      "phase1": { "total": 42, "pass": 42, "fail": 0 },
      "phase2": { "pages": 47, "anomalies": 3, "critical": 1, "high": 2 },
      "duration_seconds": 272,
      "api_cost_usd": 1.23
    }
  ],
  "trends": {
    "anomalies_last_7_days": [5, 3, 2, 3, 1, 0, 3],
    "most_problematic_routes": [
      { "route": "/gestionnaire/contrats/[id]", "failures": 4 },
      { "route": "/gestionnaire/mail", "failures": 2 }
    ]
  }
}
```

---

## 8. Security & Safety

### Isolated QA accounts

```
Dedicated accounts (never used in dev/prod):
  qa-gestionnaire@seido-test.app → team "QA-Bot-Team"
  qa-locataire@seido-test.app    → tenant on QA Lot A
  qa-prestataire@seido-test.app  → assigned on QA interventions

Seed data:
  1 building "QA Building" (address: 1 Rue du Test, 1000 Bruxelles)
  2 lots "QA Lot A" + "QA Lot B"
  1 active lease (qa-locataire on QA Lot A)
  1 supplier contract (qa-prestataire)
```

### Protection des secrets

```yaml
# Stored ONLY in GitHub Secrets, never in repo
QA_TEST_CREDENTIALS: |
  {
    "gestionnaire": { "email": "qa-gestionnaire@...", "password": "..." },
    "locataire": { "email": "qa-locataire@...", "password": "..." },
    "prestataire": { "email": "qa-prestataire@...", "password": "..." }
  }
ANTHROPIC_API_KEY: "sk-ant-..."
RESEND_API_KEY: "re_..."
# GITHUB_TOKEN: auto-provided by GitHub Actions
```

### Safety guardrails

| Risk | Protection |
|------|------------|
| Bot clicks "Delete" on real data | QA accounts in isolated team |
| Infinite exploration loop | Budget limiter: 15 min OR 50 pages max |
| API cost explosion | Anthropic hard cap: $5/day |
| Bot creates 1000 entities | Post-run cleanup: delete entities created during run |
| Sensitive data in screenshots | Artifacts auto-deleted after 7 days |
| Bot navigates outside app | URL whitelist: only `*.seido.app` |
| Stale test data pollution | Cleanup script runs after every test suite |

### Post-run cleanup

```typescript
async function cleanup(supabase: SupabaseClient, runStartTime: string) {
  const QA_TEAM_ID = process.env.QA_TEAM_ID

  // Delete interventions created during this run
  await supabase.from('interventions')
    .delete()
    .eq('team_id', QA_TEAM_ID)
    .gte('created_at', runStartTime)

  // Delete reminders created during this run
  await supabase.from('reminders')
    .delete()
    .eq('team_id', QA_TEAM_ID)
    .gte('created_at', runStartTime)

  // Keep base entities (building, lots, contacts, contracts)
  // They are reused across runs
}
```

---

## 9. File Structure

```
seido-app/
├── .github/
│   └── workflows/
│       ├── ci.yml                       # existing (lint)
│       └── qa-bot.yml                   # NEW — main workflow
│
├── tests/
│   ├── e2e/                             # existing (Puppeteer — kept temporarily)
│   └── qa-bot/                          # NEW
│       ├── playwright.config.ts         # config (sharding, blob reporter, projects)
│       │
│       ├── setup/
│       │   └── auth.setup.ts            # multi-role auth via Supabase GoTrue
│       │
│       ├── guided/                      # Phase 1 — deterministic scenarios
│       │   ├── auth-smoke.spec.ts       # Shard 1
│       │   ├── patrimoine.spec.ts       # Shard 2
│       │   ├── contrats-rappels.spec.ts # Shard 3
│       │   ├── intervention-lifecycle.spec.ts  # Shard 4
│       │   ├── conversations-docs.spec.ts      # Shard 5
│       │   ├── email-system.spec.ts     # Shard 6
│       │   ├── notifications.spec.ts    # Shard 7
│       │   └── billing-settings.spec.ts # Shard 8
│       │
│       ├── autonomous/                  # Phase 2 — AI exploration
│       │   ├── explorer.ts              # orchestrator (sitemap → Claude → actions)
│       │   ├── anomaly-detector.ts      # console/network/layout monitors
│       │   ├── page-analyzer.ts         # accessibility snapshot → Claude API
│       │   └── budget-limiter.ts        # 15min / 50 pages guard
│       │
│       ├── reporting/                   # Phase 3 — reports
│       │   ├── report-generator.ts      # Markdown report
│       │   ├── github-issue.ts          # auto-create issue via GitHub API
│       │   ├── email-notifier.ts        # send via Resend
│       │   └── regression-tracker.ts    # summary.json trends
│       │
│       ├── pages/                       # Page Object Models (Playwright)
│       │   ├── dashboard.page.ts
│       │   ├── intervention-wizard.page.ts
│       │   ├── intervention-detail.page.ts
│       │   ├── building-wizard.page.ts
│       │   ├── lot-wizard.page.ts
│       │   ├── contract-wizard.page.ts
│       │   ├── reminder-wizard.page.ts
│       │   ├── reminder-detail.page.ts
│       │   ├── mail-hub.page.ts
│       │   ├── notifications.page.ts
│       │   └── billing.page.ts
│       │
│       └── helpers/
│           ├── auth.ts                  # cookie management
│           ├── routes.ts                # sitemap (47 routes)
│           ├── cleanup.ts               # post-run entity cleanup
│           └── selectors.ts             # shared utilities
│
├── reports/                             # NEW (gitignored)
│   ├── screenshots/
│   └── summary.json
│
└── package.json                         # new scripts:
                                         #   "qa:guided": "playwright test --config tests/qa-bot/playwright.config.ts"
                                         #   "qa:full": "npm run qa:guided && node tests/qa-bot/autonomous/explorer.ts"
```

---

## 10. GitHub Actions Workflow

```yaml
name: QA Bot

on:
  repository_dispatch:
    types:
      - 'vercel.deployment.ready'
      - 'vercel.deployment.promoted'
  workflow_dispatch:
    inputs:
      target_url:
        description: 'URL to test'
        default: 'https://preview.seido.app'
        type: string
      mode:
        description: 'Test mode'
        type: choice
        options: [guided, full]
        default: 'full'

env:
  TARGET_URL: ${{ github.event.client_payload.url || inputs.target_url || 'https://preview.seido.app' }}
  IS_PRODUCTION: ${{ github.event.client_payload.environment == 'production' || false }}

jobs:
  # ─────────────────────────────────────────
  # Phase 1: Guided Scenarios (8 shards)
  # ─────────────────────────────────────────
  guided-tests:
    timeout-minutes: 15
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shardIndex: [1, 2, 3, 4, 5, 6, 7, 8]
        shardTotal: [8]
    steps:
      - uses: vercel/repository-dispatch/actions/checkout@main
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: 'npm'

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run guided tests (shard ${{ matrix.shardIndex }})
        run: npx playwright test --config tests/qa-bot/playwright.config.ts --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}
        env:
          TARGET_URL: ${{ env.TARGET_URL }}
          QA_TEST_CREDENTIALS: ${{ secrets.QA_TEST_CREDENTIALS }}

      - name: Upload blob report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: blob-report-${{ matrix.shardIndex }}
          path: blob-report
          retention-days: 1

      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: screenshots-${{ matrix.shardIndex }}
          path: test-results/
          retention-days: 7

  # ─────────────────────────────────────────
  # Merge shard reports into single HTML
  # ─────────────────────────────────────────
  merge-reports:
    if: ${{ !cancelled() }}
    needs: [guided-tests]
    runs-on: ubuntu-latest
    outputs:
      phase1_passed: ${{ steps.check.outputs.passed }}
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: 'npm'

      - run: npm ci

      - name: Download all blob reports
        uses: actions/download-artifact@v5
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true

      - name: Merge into HTML report
        run: npx playwright merge-reports --reporter html ./all-blob-reports

      - name: Upload merged HTML report
        uses: actions/upload-artifact@v4
        with:
          name: qa-html-report
          path: playwright-report
          retention-days: 14

      - name: Check Phase 1 result
        id: check
        run: echo "passed=${{ needs.guided-tests.result == 'success' }}" >> "$GITHUB_OUTPUT"

  # ─────────────────────────────────────────
  # Phase 2: Autonomous Exploration (Claude)
  # ─────────────────────────────────────────
  autonomous-exploration:
    if: ${{ needs.merge-reports.outputs.phase1_passed == 'true' && (github.event.client_payload.environment == 'production' || inputs.mode == 'full') }}
    needs: [merge-reports]
    timeout-minutes: 20
    runs-on: ubuntu-latest
    steps:
      - uses: vercel/repository-dispatch/actions/checkout@main
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: 'npm'

      - run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run autonomous exploration
        run: npx tsx tests/qa-bot/autonomous/explorer.ts
        env:
          TARGET_URL: ${{ env.TARGET_URL }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          QA_TEST_CREDENTIALS: ${{ secrets.QA_TEST_CREDENTIALS }}

      - name: Upload exploration report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: exploration-report
          path: reports/
          retention-days: 7

  # ─────────────────────────────────────────
  # Phase 3: Reporting
  # ─────────────────────────────────────────
  reporting:
    if: ${{ !cancelled() }}
    needs: [guided-tests, merge-reports, autonomous-exploration]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: 'npm'

      - run: npm ci

      - name: Download all reports
        uses: actions/download-artifact@v5
        with:
          path: all-reports
          pattern: '{qa-html-report,exploration-report,screenshots-*}'
          merge-multiple: true

      - name: Generate Markdown report
        run: npx tsx tests/qa-bot/reporting/report-generator.ts
        env:
          TARGET_URL: ${{ env.TARGET_URL }}
          COMMIT_SHA: ${{ github.event.client_payload.git.sha || github.sha }}

      - name: Create GitHub Issue (if anomalies)
        run: npx tsx tests/qa-bot/reporting/github-issue.ts
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: ${{ github.repository }}

      - name: Send email notification
        run: npx tsx tests/qa-bot/reporting/email-notifier.ts
        env:
          RESEND_API_KEY: ${{ secrets.RESEND_API_KEY }}
          NOTIFICATION_EMAIL: ${{ secrets.NOTIFICATION_EMAIL }}

      - name: Upload final report
        uses: actions/upload-artifact@v4
        with:
          name: qa-final-report
          path: reports/
          retention-days: 14

  # ─────────────────────────────────────────
  # Cleanup: Remove test data
  # ─────────────────────────────────────────
  cleanup:
    if: ${{ !cancelled() }}
    needs: [reporting]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: 'npm'

      - run: npm ci

      - name: Cleanup QA test data
        run: npx tsx tests/qa-bot/helpers/cleanup.ts
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          QA_TEAM_ID: ${{ secrets.QA_TEAM_ID }}
```

---

## 11. Implementation Plan

### Phase 1 — Foundations (week 1)

```
1. Install Playwright + configure project
   - npm install @playwright/test @anthropic-ai/sdk
   - playwright.config.ts (sharding, blob reporter, projects)
   - Auth setup file (Supabase GoTrue → storageState)

2. Create QA accounts + team in preview Supabase
   - 3 accounts (gestionnaire, locataire, prestataire)
   - Team "QA-Bot-Team" + seed data (building, lots, lease, supplier contract)

3. Migrate 3 critical test suites to Playwright
   - auth-smoke.spec.ts (validates infra works)
   - intervention-lifecycle.spec.ts (core flow)
   - patrimoine.spec.ts (CRUD buildings/lots)

4. Basic GitHub Actions workflow
   - workflow_dispatch only (manual trigger)
   - Single shard (no parallelization yet)
   - Upload report as artifact
```

### Phase 2 — Full Coverage (week 2)

```
5. Implement remaining 5 test suites
   - contrats-rappels.spec.ts (full reminder lifecycle + recurrence)
   - conversations-docs.spec.ts (threads, documents, tenant requests)
   - email-system.spec.ts (mail hub, compose, linking, blacklist)
   - notifications.spec.ts (in-app, push, routing, edge cases)
   - billing-settings.spec.ts (subscription, settings, edge cases)

6. Enable 8-shard parallelization
   - Matrix strategy + blob reporter + merge job

7. Reporting: Markdown + GitHub Issue
   - report-generator.ts
   - github-issue.ts
```

### Phase 3 — Autonomous Exploration (week 3)

```
8. Claude API integration
   - page-analyzer.ts (accessibility.snapshot() → Claude)
   - explorer.ts (orchestrator with sitemap + prioritization)
   - anomaly-detector.ts (console, network, layout monitors)
   - budget-limiter.ts (15 min / 50 pages)

9. Git diff prioritization
   - Parse deployed commit → changed files → affected routes

10. Off-script testing
    - Invalid inputs, double submits, back/forward, refresh mid-wizard
```

### Phase 4 — Full Automation (week 4)

```
11. Vercel repository_dispatch integration
    - Enable in Vercel settings
    - Configure event types (ready + promoted)

12. Email notification (Resend)

13. Regression tracker (summary.json)

14. Post-run cleanup job

15. Documentation + runbook
```

---

## 12. Feedback Loop: QA Bot → Claude Code

### Workflow when bugs are detected

```
1. QA Bot detects anomalies after deploy
2. GitHub Issue #142 created automatically
3. Email notification sent to arthur@seido-app.com
4. Arthur opens Claude Code:

   Option A — Fix from issue:
   > "Read and fix issue #142"
   Claude Code runs: gh issue view 142
   Reads steps to reproduce, console errors, affected files
   Proposes and implements fixes

   Option B — Fix from report:
   > "Read reports/qa-report-2026-03-20.md and fix all anomalies"
   Report contains structured data: steps, errors, git blame

   Option C — Batch fix:
   > "Fix all open qa-bot issues"
   Claude Code runs: gh issue list --label qa-bot --state open
   Processes each issue sequentially

5. After fixes committed + deployed:
   QA Bot runs again automatically
   Verifies fixes + checks for regressions
   Closes issue if anomaly resolved (future enhancement)
```

### Future: Auto-fix (Phase 2 of project)

```
QA Bot detects LOW severity anomaly
  → Creates issue with label "auto-fixable"
  → Triggers separate workflow
  → Claude Code API (headless) reads issue + fixes
  → Creates PR with fix
  → QA Bot re-runs on PR preview deploy
  → If green → auto-merge
```

---

## 13. Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Playwright over Puppeteer** | Auto-wait, built-in sharding, Microsoft-backed, better CI support |
| **GitHub Actions over VPS** | Free, 7GB RAM, native parallelization, no maintenance |
| **Claude API direct over Playwright MCP** | MCP not designed for CI loops; direct API is simpler and documented |
| **Accessibility tree over screenshots** | 20-50x less tokens, faster, deterministic element targeting |
| **Blob reporter** | Only way to merge sharded test results in Playwright |
| **8 shards** | Balances parallelism vs. overhead (each shard installs browsers) |
| **Vercel repository_dispatch** | Native integration, no custom webhook code needed |
| **Isolated QA team** | Prevents data pollution, contains blast radius |
| **Post-run cleanup** | Keeps QA team clean between runs |

---

## 14. Appendix: Route Coverage Map

### Gestionnaire (36 routes)

| Route | Shard | Test Type |
|-------|-------|-----------|
| /gestionnaire/dashboard | 1 | Smoke |
| /gestionnaire/biens | 2 | CRUD |
| /gestionnaire/biens/immeubles/nouveau | 2 | Wizard |
| /gestionnaire/biens/immeubles/[id] | 2 | View |
| /gestionnaire/biens/immeubles/modifier/[id] | 2 | Edit |
| /gestionnaire/biens/lots/nouveau | 2 | Wizard |
| /gestionnaire/biens/lots/[id] | 2 | View |
| /gestionnaire/biens/lots/modifier/[id] | 2 | Edit |
| /gestionnaire/contacts | 2 | List |
| /gestionnaire/contacts/nouveau | 2 | Create |
| /gestionnaire/contacts/details/[id] | 2 | View |
| /gestionnaire/contacts/modifier/[id] | 2 | Edit |
| /gestionnaire/contacts/societes/[id] | 2 | View |
| /gestionnaire/contrats | 3 | List |
| /gestionnaire/contrats/nouveau | 3 | Wizard |
| /gestionnaire/contrats/[id] | 3 | View |
| /gestionnaire/contrats/modifier/[id] | 3 | Edit |
| /gestionnaire/operations | 3 | Tabs |
| /gestionnaire/operations/nouvelle-intervention | 4 | Wizard |
| /gestionnaire/operations/interventions/[id] | 4 | Detail |
| /gestionnaire/operations/interventions/modifier/[id] | 4 | Edit |
| /gestionnaire/operations/nouveau-rappel | 3 | Wizard |
| /gestionnaire/operations/rappels/[id] | 3 | Detail |
| /gestionnaire/mail | 6 | Hub |
| /gestionnaire/parametres | 8 | Settings |
| /gestionnaire/parametres/assistant-ia | 8 | Settings |
| /gestionnaire/parametres/assistant-ia/historique | 8 | View |
| /gestionnaire/parametres/emails | 6 | Settings |
| /gestionnaire/settings/billing | 8 | Billing |
| /gestionnaire/profile | 1 | Profile |
| /gestionnaire/notifications | 7 | Notifications |
| /gestionnaire/aide | 8 | Static |
| /gestionnaire/import | 8 | Import |
| /gestionnaire/interventions | 4 | List |

### Locataire (6 routes)

| Route | Shard | Test Type |
|-------|-------|-----------|
| /locataire/dashboard | 1 | Smoke |
| /locataire/interventions/nouvelle-demande | 5 | Wizard |
| /locataire/interventions/[id] | 4 | Detail |
| /locataire/lots/[id] | 8 | View |
| /locataire/profile | 1 | Profile |
| /locataire/notifications | 7 | Notifications |

### Prestataire (5 routes)

| Route | Shard | Test Type |
|-------|-------|-----------|
| /prestataire/dashboard | 1 | Smoke |
| /prestataire/interventions/[id] | 4 | Detail |
| /prestataire/profile | 1 | Profile |
| /prestataire/parametres | 8 | Settings |
| /prestataire/notifications | 7 | Notifications |

**Total: 47 routes covered across 8 shards**
