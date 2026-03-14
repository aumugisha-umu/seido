---
description: SEIDO feature reference — key files per feature (2026-01 to 2026-03). Auto-loaded when searching for feature implementations.
globs:
  - "components/**"
  - "app/gestionnaire/**"
  - "app/api/**"
---

## Features Reference

### 2026-01

| Feature | Fichiers principaux |
|---------|-------------------|
| Google OAuth | `app/auth/login/login-form.tsx`, `app/auth/callback/page.tsx` |
| Onboarding Modal | `components/auth/onboarding-modal.tsx` |
| Avatar System | `app/api/upload-avatar/route.ts`, `components/profile-page.tsx` |
| Intervention Types | Tables `intervention_type_categories`, `intervention_types` |
| PWA Push | `lib/send-push-notification.ts`, `app/api/push/` |
| Email Notification Module | `lib/services/domain/email-notification/` (15 fichiers) |

### 2026-02

| Feature | Fichiers principaux |
|---------|-------------------|
| Stripe Billing | `lib/services/domain/subscription.service.ts`, `components/billing/` |
| Unified Documents Bucket | `documents` bucket (replaces 3 legacy buckets) |
| Property Documents Step | `components/documents/document-checklist-generic.tsx` |
| E2E Testing V2 | `tests/e2e/` (25 tests, 5 POMs, Puppeteer + Vitest) |
| Auth Migration | `getServerAuthContext()` across all pages/actions |
| Blog Section | `lib/blog.ts`, `app/blog/`, `blog/articles/*.md` |

### 2026-03

| Feature | Fichiers principaux |
|---------|-------------------|
| Performance TIER 1+2 | 11 pages parallelized, `after()` deferred work, dead revalidation removed |
| AI Phone Assistant | `app/api/ai-phone/`, tables `ai_phone_calls`, `ai_phone_usage` |
| Email Refonte Phase 1 | Email counts RPC, navigation improvements |
| Blog Hub/Cluster | 23 articles, hub-cluster architecture in frontmatter |
| Intervention Planner | `components/contract/intervention-planner-step.tsx` (shared reusable) |
| Supplier Contracts | `supplier_contracts` table, `supplier-contract.repository.ts`, `supplier-contract-card.tsx` |
