---
name: sp-monitoring
description: Error budgets, performance tracking, alerting setup, and Core Web Vitals monitoring. Use when setting up monitoring, investigating production issues, or checking application health.
---

# Monitoring & Observability

## Overview

Proactive monitoring prevents silent failures. Set up error budgets, track Core Web Vitals, and create alerting rules.

**Core principle:** If you can't measure it, you can't improve it.

## Auto-Invocation Triggers

- "monitoring", "alerting", "observability"
- "error budget", "core web vitals", "performance budget"
- "why is it slow", "users are reporting errors"
- After any sp-release deployment

## Core Web Vitals Targets (SEIDO)

| Metric | Target | Threshold | Tool |
|--------|--------|-----------|------|
| LCP | < 2.5s | < 4.0s | Vercel Analytics / Lighthouse |
| INP | < 200ms | < 500ms | Vercel Analytics |
| CLS | < 0.1 | < 0.25 | Lighthouse |
| TTFB | < 800ms | < 1.8s | Vercel Analytics |

## Error Monitoring Checklist

### Setup
- [ ] Error tracking service configured (Sentry / Vercel)
- [ ] Source maps uploaded for production builds
- [ ] User context attached to errors (role, team_id — NOT personal data)
- [ ] Error grouping rules configured (dedup similar errors)

### Error Budget
| Severity | Budget (per week) | Action |
|----------|-------------------|--------|
| Critical (app crash) | 0 | Immediate fix |
| High (feature broken) | < 5 | Fix within 24h |
| Medium (degraded UX) | < 20 | Fix within 1 week |
| Low (cosmetic) | < 50 | Backlog |

### Alerting Rules
- **Uptime**: Alert if < 99.5% availability in 5-minute window
- **Error rate**: Alert if > 1% of requests return 5xx
- **Performance**: Alert if LCP p95 > 4s for 10 minutes
- **Database**: Alert if connection pool > 80% utilization

## SEIDO-Specific Monitoring

### RLS Performance
```sql
-- Check slow RLS policies
SELECT schemaname, tablename, policyname, qual
FROM pg_policies
WHERE tablename IN ('interventions', 'buildings', 'lots');
```

### Real-time Channels
- Monitor WebSocket connection count per user
- Alert if > 3 simultaneous channels (should be 1 via RealtimeProvider)

### Supabase Dashboard
- Database size growth rate
- Active connections vs pool size
- Slow queries (> 1s)

## Microsoft Clarity (Already Integrated)
- Session recordings for UX insights
- Heatmaps for click patterns
- Rage click detection
- Dead click detection

## Skills Integration

| Situation | Skill |
|-----------|-------|
| Performance regression | `sp-systematic-debugging` |
| Error spike post-deploy | `sp-release` (rollback) |
| Slow page identified | `sp-brainstorming` (optimization) |
| Monitoring setup | `sp-writing-plans` (if complex) |
