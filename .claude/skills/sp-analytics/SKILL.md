---
name: sp-analytics
description: Event tracking design, funnel instrumentation, and KPI measurement for SEIDO. Use when adding analytics, measuring features, or designing experiments.
---

# Analytics & Event Tracking

## Overview

Design and implement event tracking to measure user engagement, feature adoption, and business KPIs. Without analytics, you're building blind.

**Core principle:** Track actions that answer business questions, not everything that moves.

## Auto-Invocation Triggers

- "analytics", "tracking", "metrics", "KPI"
- "how many users", "is this feature used", "measure"
- "funnel", "conversion", "churn", "retention"
- When building new features (suggest tracking plan)

## SEIDO KPIs to Track

### Business Metrics
| KPI | Definition | Target |
|-----|-----------|--------|
| MRR | Monthly Recurring Revenue | Growth |
| Churn Rate | % teams cancelling per month | < 5% |
| Expansion Revenue | Upgrades + additional lots | > 20% of MRR |
| Time to Value | Signup -> first intervention created | < 24h |
| NPS | Net Promoter Score | > 40 |

### Product Metrics (Per Role)

#### Gestionnaire
| Event | Why Track | Business Impact |
|-------|-----------|-----------------|
| `intervention.created` | Core action frequency | Engagement |
| `intervention.status_changed` | Workflow completion rate | Value delivery |
| `building.created` | Portfolio growth | Expansion signal |
| `dashboard.viewed` | Daily active usage | Retention |
| `bulk_action.performed` | Power user adoption | Stickiness |

#### Prestataire
| Event | Why Track | Business Impact |
|-------|-----------|-----------------|
| `quote.submitted` | Response rate | Platform value |
| `intervention.completed` | Completion rate | Service quality |
| `time_slot.confirmed` | Scheduling success | Coordination |

#### Locataire
| Event | Why Track | Business Impact |
|-------|-----------|-----------------|
| `intervention.requested` | Self-service adoption | Gestionnaire time saved |
| `wizard.abandoned` | Drop-off point | UX improvement |
| `wizard.completed` | Completion rate | Feature effectiveness |

## Event Naming Convention

```
{entity}.{action}[.{detail}]
```

Examples:
- `intervention.created`
- `intervention.status_changed.approved`
- `building.created`
- `wizard.step_completed.step_2`
- `onboarding.completed`

## Implementation Pattern (SEIDO)

```typescript
// lib/analytics/track.ts
export const track = (event: string, properties?: Record<string, unknown>) => {
  // Microsoft Clarity custom events (already integrated)
  if (typeof window !== 'undefined' && window.clarity) {
    window.clarity('event', event)
  }

  // Future: Posthog, Mixpanel, or Supabase analytics
  // Add providers here without changing call sites
}
```

### Where to Place Tracking

| Location | When to Use |
|----------|-------------|
| Server Actions | Business-critical events (created, updated, deleted) |
| Client Components | UI interactions (clicked, viewed, abandoned) |
| API Routes | External integrations (webhook received, email sent) |

## Funnel Analysis Template

```markdown
### Funnel: [Name]

1. **Entry**: [Page/action] — [X users/week]
2. **Step 1**: [Action] — [Y users] ([Y/X]% conversion)
3. **Step 2**: [Action] — [Z users] ([Z/Y]% step, [Z/X]% overall)
4. **Completion**: [Action] — [W users] ([W/X]% overall conversion)

**Drop-off point**: Step [N] — [reason]
**Improvement hypothesis**: [change] should increase [step] by [X]%
```

## Privacy & GDPR

- [ ] No PII in event properties (no names, emails, phone numbers)
- [ ] Team ID is OK (not personal data)
- [ ] Role is OK (not identifying)
- [ ] Use anonymized user IDs
- [ ] Cookie consent banner before non-essential tracking
- [ ] Data retention policy documented

## Skills Integration

| Situation | Skill |
|-----------|-------|
| New feature -> tracking plan | Include in `sp-prd` |
| Tracking implementation | `sp-test-driven-development` |
| Measure experiment | `sp-brainstorming` (hypothesis) |
| Dashboard for KPIs | `sp-ralph` (full feature) |
