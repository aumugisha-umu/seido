# SEIDO - Métriques UX à Suivre

> **Fichier parent** : [ux-ui-decision-guide.md](./ux-ui-decision-guide.md)
> **Version** : 1.1 | **Date** : 2025-12-07

Ce document définit les métriques UX à suivre pour mesurer l'efficacité de l'application SEIDO.

---

## Table des Matières

1. [Performance Metrics](#1-performance-metrics)
2. [User Engagement Metrics](#2-user-engagement-metrics)
3. [Error & Friction Metrics](#3-error--friction-metrics)
4. [Business Impact Metrics](#4-business-impact-metrics)
5. [Dashboard UX Metrics](#5-dashboard-ux-metrics)

---

## 1. Performance Metrics

### Core Web Vitals

```typescript
const PERFORMANCE_TARGETS = {
  LCP: 2500,  // Largest Contentful Paint (ms)
  FID: 100,   // First Input Delay (ms)
  CLS: 0.1,   // Cumulative Layout Shift (score)
  TTFB: 600   // Time to First Byte (ms)
}
```

### Custom Metrics SEIDO

```typescript
const UX_METRICS = {
  timeToInteractive: 3000,        // Page ready for interaction
  timeToFirstAction: 5000,        // User can perform first action
  formCompletionTime: 60000,      // Average time to complete form
  searchResultTime: 500,          // Search results appear
  interventionCreationTime: 120000 // Full intervention creation
}
```

### Tracking Implementation

```tsx
import { trackEvent } from '@/lib/analytics'

trackEvent('intervention_created', {
  timeToCreate: timeElapsed,
  stepsCompleted: 4,
  templatesUsed: true,
  photosUploaded: 2
})

trackEvent('page_load', {
  route: '/gestionnaire/interventions',
  loadTime: performance.now(),
  dataFetched: interventions.length
})
```

---

## 2. User Engagement Metrics

```typescript
const ENGAGEMENT_METRICS = {
  // Activation
  daysToFirstIntervention: 1,     // Nouveau user crée intervention
  onboardingCompletion: 0.9,      // % qui complètent onboarding

  // Retention
  dau: 0,                          // Daily Active Users
  wau: 0,                          // Weekly Active Users
  mau: 0,                          // Monthly Active Users

  // Feature adoption
  templateUsageRate: 0.7,          // % interventions using templates
  bulkActionsRate: 0.3,            // % using bulk operations
  mobileUsageRate: 0.8,            // % sessions on mobile

  // Efficiency
  avgInterventionsPerDay: 5,
  avgTimePerIntervention: 120,     // seconds
  searchSuccessRate: 0.85          // % searches leading to result click
}
```

---

## 3. Error & Friction Metrics

```typescript
const ERROR_METRICS = {
  // Error tracking
  formValidationErrors: 0,         // Per form submission
  apiErrorRate: 0.01,              // % API calls failing
  userReportedBugs: 0,             // Monthly bug reports

  // Friction points
  formAbandonmentRate: 0.2,        // % who start but don't finish
  searchRefinementRate: 0.3,       // % who refine search query
  pageBackRate: 0.15,              // % who go back immediately

  // Support
  supportTicketsPerUser: 0.1,      // Monthly average
  chatbotResolutionRate: 0.7       // % resolved without human
}
```

---

## 4. Business Impact Metrics

```typescript
const BUSINESS_METRICS = {
  // Time savings (vs. frustrations personas)
  timeSearchingSaved: 7200,        // 2h/day → target: 0.5h/day
  phoneCallsReduced: 35,           // 50/day → target: 15/day

  // Efficiency
  interventionsPerGestionnaire: 15, // Monthly average
  avgInterventionDuration: 5,      // Days from creation to closure

  // Quality
  tenantSatisfaction: 4.5,         // /5 rating
  providerRating: 4.3,             // /5 rating
  reOpenRate: 0.05,                // % interventions re-opened

  // Cost savings
  automationRate: 0.6,             // % tasks automated
  manualDataEntryReduced: 0.7      // vs. legacy process
}
```

---

## 5. Dashboard UX Metrics

### Exemple d'Implémentation

```tsx
<UXMetricsDashboard>
  <MetricSection title="Performance">
    <MetricCard
      label="LCP"
      value="1.8s"
      target="< 2.5s"
      status="good"
    />
    <MetricCard
      label="Time to First Action"
      value="3.2s"
      target="< 5s"
      status="good"
    />
  </MetricSection>

  <MetricSection title="Engagement">
    <MetricCard
      label="Mobile Usage"
      value="78%"
      target="> 70%"
      status="good"
      trend="+5%"
    />
    <MetricCard
      label="Template Usage"
      value="65%"
      target="> 70%"
      status="warning"
      trend="+12%"
    />
  </MetricSection>

  <MetricSection title="Friction">
    <MetricCard
      label="Form Abandonment"
      value="18%"
      target="< 20%"
      status="good"
      trend="-3%"
    />
    <MetricCard
      label="Search Success"
      value="88%"
      target="> 85%"
      status="good"
    />
  </MetricSection>

  <MetricSection title="Business Impact">
    <MetricCard
      label="Time Searching (avg/day)"
      value="45min"
      target="< 30min"
      status="warning"
      previousValue="2h" // Before SEIDO
    />
    <MetricCard
      label="Phone Calls (avg/day)"
      value="18"
      target="< 15"
      status="warning"
      previousValue="50"
    />
  </MetricSection>
</UXMetricsDashboard>
```

---

## Objectifs par Phase

### Phase 1 (Launch)
| Métrique | Target |
|----------|--------|
| LCP | < 3s |
| Form Abandonment | < 25% |
| Mobile Usage | > 60% |

### Phase 2 (Growth)
| Métrique | Target |
|----------|--------|
| LCP | < 2.5s |
| Form Abandonment | < 20% |
| Template Usage | > 50% |
| Search Success | > 80% |

### Phase 3 (Optimization)
| Métrique | Target |
|----------|--------|
| LCP | < 2s |
| Form Abandonment | < 15% |
| Template Usage | > 70% |
| Time Searching | < 30min/day |

---

## Voir aussi

- [Principes UX Communs](./ux-common-principles.md)
- [Anti-Patterns à éviter](./ux-anti-patterns.md)
- [Références & Inspirations](./ux-references.md)
