# QA Bot — Seed Data Setup Guide

## Overview

The QA Bot requires dedicated test accounts and seed data in Supabase to run E2E tests safely without affecting production data.

## Prerequisites

- Access to Supabase Dashboard (preview project)
- Admin access to create users and teams

## Step 1: Create QA Accounts

Create 3 user accounts in Supabase Auth (Authentication > Users > Add User):

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Gestionnaire | `qa-gestionnaire@seido-test.app` | Generate strong password | Team admin |
| Locataire | `qa-locataire@seido-test.app` | Generate strong password | Tenant role |
| Prestataire | `qa-prestataire@seido-test.app` | Generate strong password | Provider role |

After creating accounts, note down the `id` (UUID) for each user from the Auth dashboard.

## Step 2: Create QA Team

Insert a team record in the `teams` table:

```sql
INSERT INTO teams (id, name, created_at)
VALUES (gen_random_uuid(), 'QA-Bot-Team', now())
RETURNING id;
```

Note the team ID — this becomes `QA_TEAM_ID` in GitHub Secrets.

## Step 3: Add Team Members

```sql
-- Get user IDs from auth.users
-- Replace {user_id} and {team_id} with actual UUIDs

-- Gestionnaire (admin role in team)
INSERT INTO team_members (user_id, team_id, role, joined_at)
VALUES ('{gestionnaire_user_id}', '{team_id}', 'admin', now());

-- Locataire
INSERT INTO team_members (user_id, team_id, role, joined_at)
VALUES ('{locataire_user_id}', '{team_id}', 'locataire', now());

-- Prestataire
INSERT INTO team_members (user_id, team_id, role, joined_at)
VALUES ('{prestataire_user_id}', '{team_id}', 'prestataire', now());
```

## Step 4: Create Seed Data

### Building

```sql
INSERT INTO buildings (id, team_id, name, created_by)
VALUES (gen_random_uuid(), '{team_id}', 'QA Building', '{gestionnaire_user_id}')
RETURNING id;
```

Then create an address record linked to the building.

### Lots

```sql
-- Lot A (occupied by locataire)
INSERT INTO lots (id, team_id, building_id, name, category, is_occupied, created_by)
VALUES (gen_random_uuid(), '{team_id}', '{building_id}', 'QA Lot A', 'appartement', true, '{gestionnaire_user_id}')
RETURNING id;

-- Lot B (vacant)
INSERT INTO lots (id, team_id, building_id, name, category, is_occupied, created_by)
VALUES (gen_random_uuid(), '{team_id}', '{building_id}', 'QA Lot B', 'appartement', false, '{gestionnaire_user_id}')
RETURNING id;
```

### Lease Contract (Bail)

```sql
INSERT INTO contracts (id, team_id, type, lot_id, tenant_id, start_date, status, created_by)
VALUES (
  gen_random_uuid(),
  '{team_id}',
  'bail_locatif',
  '{lot_a_id}',
  '{locataire_user_id}',
  '2026-01-01',
  'active',
  '{gestionnaire_user_id}'
)
RETURNING id;
```

### Supplier Contract

```sql
INSERT INTO supplier_contracts (id, team_id, supplier_id, service_type, status, created_by)
VALUES (
  gen_random_uuid(),
  '{team_id}',
  '{prestataire_user_id}',
  'plomberie',
  'active',
  '{gestionnaire_user_id}'
)
RETURNING id;
```

## Step 5: Configure GitHub Secrets

Add these secrets to the GitHub repository (Settings > Secrets > Actions):

| Secret | Value |
|--------|-------|
| `QA_TEST_CREDENTIALS` | `{"gestionnaire":{"email":"qa-gestionnaire@seido-test.app","password":"..."},"locataire":{"email":"qa-locataire@seido-test.app","password":"..."},"prestataire":{"email":"qa-prestataire@seido-test.app","password":"..."}}` |
| `QA_TEAM_ID` | The team UUID from Step 2 |
| `ANTHROPIC_API_KEY` | Claude API key for autonomous exploration |
| `RESEND_API_KEY` | Already exists (used by SEIDO) |
| `NOTIFICATION_EMAIL` | Email to receive QA reports (e.g., `arthur@seido-app.com`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (for cleanup script) |

## Step 6: Verify Setup

Run the QA Bot manually to verify:

```bash
# Local test (against localhost:3000)
npm run qa:guided

# Against preview
TARGET_URL=https://preview.seido.app npm run qa:guided

# Or trigger via GitHub Actions
gh workflow run qa-bot.yml -f target_url=https://preview.seido.app -f mode=guided
```

## Maintenance

- **Cleanup runs automatically** after each QA Bot run (cleanup job in GitHub Actions)
- **Base data is preserved** (building, lots, contacts, contracts) — only test-generated entities are deleted
- **Credentials rotation**: Update `QA_TEST_CREDENTIALS` secret if passwords change
- **Schema changes**: If tables/columns change, update cleanup.ts table list
