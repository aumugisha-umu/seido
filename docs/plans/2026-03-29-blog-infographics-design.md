# Blog Infographics — Design & Implementation Plan

**Date:** 2026-03-29
**Branch:** preview
**Scope:** 7 reusable infographic components + frontmatter integration for 24 blog articles

---

## Architecture

### How it works

```
article.md frontmatter     →  lib/blog.ts parses `infographic` field
    ↓                              ↓
app/blog/[slug]/page.tsx   →  <BlogInfographic config={article.infographic} />
    ↓                              ↓  (before <BlogMarkdown />)
components/blog/infographics/  →  dispatches to correct component by `type`
```

### Frontmatter schema

```yaml
---
title: "PEB Bruxelles copropriete : amendes..."
# ... existing fields ...
infographic:
  type: "timeline"  # timeline | comparison-bars | flow-tree | checklist | stat-highlight | regional-comparison | data-table
  data:
    # type-specific config (see component specs below)
---
```

### File structure

```
components/blog/infographics/
  index.ts                    # barrel export
  blog-infographic.tsx        # dispatcher (reads type → renders component)
  use-scroll-reveal.ts        # shared hook: IntersectionObserver + hero-animate trigger
  timeline-chart.tsx           # Component 1
  comparison-bars.tsx          # Component 2
  flow-decision-tree.tsx       # Component 3
  checklist-tracker.tsx        # Component 4
  stat-highlight.tsx           # Component 5
  regional-comparison.tsx      # Component 6
  data-table.tsx               # Component 7
```

---

## Shared Animation System

All components reuse `hero-flow.css` animation classes + a shared `useScrollReveal` hook.

### `use-scroll-reveal.ts`

```typescript
// Returns: { ref, isVisible }
// On scroll into view → adds hero-visible class via isVisible state
// Respects prefers-reduced-motion (instant visible)
// Uses IntersectionObserver with threshold 0.15
// One-shot: disconnects after first trigger
```

### Animation pattern per component

- Container: `hero-animate-slide-up` (fade + slide from below)
- Child elements: staggered `transitionDelay` (150ms increments)
- Bars/numbers: `hero-animate-scale` for growing effect
- Stats: reuse existing `<CountUp>` component
- All wrapped in `prefers-reduced-motion` check

### Shared styling

- Card wrapper: `rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 md:p-8`
- Title: `text-sm font-semibold text-white/50 uppercase tracking-wider mb-4`
- Colors: use CSS variables `--chart-1` through `--chart-5` from globals.css
- Dark theme only (blog is always dark)

---

## Component Specs (7 types)

### 1. `TimelineChart` — Horizontal milestones

**Used by:** PEB Bruxelles, Moratoire calendrier, DPR Bruxelles, PEB Wallonie, Hub Jan, Hub Mars, Moratoire Cour Constit (7 articles)

```typescript
interface TimelineConfig {
  type: 'timeline'
  data: {
    title?: string
    milestones: Array<{
      date: string        // "2033", "Nov 1", "Sep 15"
      label: string       // "PEB F/G interdit"
      detail?: string     // "Amende jusqu'à 31 250€"
      color?: string      // tailwind color name: "red" | "blue" | "green" | "amber"
      icon?: string       // "alert" | "check" | "clock" | "calendar"
    }>
    zones?: Array<{
      from: number        // milestone index start
      to: number          // milestone index end
      label: string       // "Période de blocage"
      color: string       // "red" | "blue"
    }>
  }
}
```

**Visual:** Horizontal line with dots at each milestone, labels above/below alternating, colored zones as background bands. Responsive: stacks vertical on mobile.

**Animation:** Line draws left→right, milestones appear staggered (150ms each).

---

### 2. `ComparisonBars` — Horizontal/vertical bar comparisons

**Used by:** Précompte +118%, Grille loyers, Baromètre Federia, Déduction intérêts, Succession 2028, Résidences secondaires (6 articles)

```typescript
interface ComparisonBarsConfig {
  type: 'comparison-bars'
  data: {
    title?: string
    items: Array<{
      label: string       // "Saint-Josse", "Brussels", "Paris"
      value: number       // 118, 75, 3287
      suffix?: string     // "%", "€/mois", "€"
      prefix?: string     // "+"
      color?: string      // "red" | "blue" | "green" | "amber"
      highlight?: boolean // bold/glow for focus item
    }>
    direction?: 'horizontal' | 'vertical'  // default: horizontal
    showValues?: boolean  // show number at end of bar (default: true)
    baselineLabel?: string // optional: "Grille de référence" dashed line
    baselineValue?: number
  }
}
```

**Visual:** Bars grow from left, proportional to max value. Highlighted item has glow. Optional dashed baseline.

**Animation:** Bars grow with `scaleX` transition staggered 100ms each. Values count up via `<CountUp>`.

---

### 3. `FlowDecisionTree` — Yes/No branching flowchart

**Used by:** Fausses fiches, Syndic missions, Vices cachés, Syndic justice, Fibre optique, Moratoire exceptions (6 articles)

```typescript
interface FlowTreeConfig {
  type: 'flow-tree'
  data: {
    title?: string
    nodes: Array<{
      id: string
      label: string       // "Bail enregistré ?"
      type: 'question' | 'action' | 'result' | 'warning'
    }>
    edges: Array<{
      from: string        // node id
      to: string          // node id
      label?: string      // "Oui" | "Non"
      type?: 'yes' | 'no' | 'default'
    }>
  }
}
```

**Visual:** Top-down flow with diamond questions, rounded-rect actions, color-coded results (green=safe, red=danger, amber=warning). Connected by lines with "Oui"/"Non" labels.

**Animation:** Nodes appear top→bottom staggered. Lines draw after source node visible.

**Layout:** Auto-layout with simple tree positioning (no external lib). Max 2 branches per node. Mobile: linear stack with indentation.

---

### 4. `ChecklistTracker` — Conditions with status + deadline

**Used by:** Moratoire fonds, Taxes comportementales, CEDH lex mitior (3 articles)

```typescript
interface ChecklistConfig {
  type: 'checklist'
  data: {
    title?: string
    deadline?: { date: string; label: string }  // "15 septembre" + "Date limite"
    items: Array<{
      label: string        // "Bail enregistré"
      status: 'required' | 'done' | 'warning' | 'info'
      detail?: string      // "Obligatoire depuis 2007"
    }>
  }
}
```

**Visual:** Vertical checklist with status icons (✓ green, ⚠ amber, ● blue, ✗ red). Deadline banner at top with countdown feel.

**Animation:** Items appear staggered top→bottom. Deadline pulses once.

---

### 5. `StatHighlight` — 2-4 key numbers with animated counters

**Used by:** Rénovation copro 8 ans, Hub Février, + any article needing emphasis on numbers (flexible)

```typescript
interface StatHighlightConfig {
  type: 'stat-highlight'
  data: {
    title?: string
    stats: Array<{
      value: number        // 8, 62500, 27
      prefix?: string      // "€", "+"
      suffix?: string      // " ans", "%", "€/mois"
      label: string        // "Durée moyenne du chantier"
      color?: string       // "blue" | "red" | "green" | "amber"
    }>
  }
}
```

**Visual:** 2-4 stat cards in a row. Large animated number (CountUp), small label below. Color accent per stat.

**Animation:** Numbers count up on scroll. Cards stagger 200ms each via `hero-animate-scale`.

---

### 6. `RegionalComparison` — 3-column BXL/WAL/VL table

**Used by:** Indexation loyer (1 article, but reusable for any regional comparison)

```typescript
interface RegionalComparisonConfig {
  type: 'regional-comparison'
  data: {
    title?: string
    regions: string[]      // ["Bruxelles", "Wallonie", "Flandre"]
    rows: Array<{
      label: string        // "Indice de départ"
      values: string[]     // ["Mois avant signature", "Mois avant signature", "Mois avant entrée"]
      highlight?: number   // index of the different value (optional)
    }>
  }
}
```

**Visual:** Styled table with region headers, alternating row colors, highlighted cells for differences between regions.

**Animation:** Table slides up, rows appear staggered.

---

### 7. `DataTable` — Generic styled data table

**Used by:** Any article with structured tabular data (costs, comparisons, timelines)

```typescript
interface DataTableConfig {
  type: 'data-table'
  data: {
    title?: string
    caption?: string
    headers: string[]
    rows: Array<{
      cells: string[]
      highlight?: boolean  // bold row
      color?: string       // row accent color
    }>
    footer?: string        // source citation
  }
}
```

**Visual:** Clean dark table with header row, hover effects, optional highlighted rows with left color border. Responsive: horizontal scroll on mobile.

**Animation:** Table slides up, rows stagger 50ms each.

---

## Integration Points

### 1. Update `lib/blog.ts` — Parse infographic field

Add `infographic` to `ArticleMeta` interface + pass through from frontmatter.

```typescript
interface ArticleMeta {
  // ... existing fields ...
  infographic?: InfographicConfig  // NEW — parsed from frontmatter YAML
}
```

### 2. Update `app/blog/[slug]/page.tsx` — Render above content

```tsx
{/* Infographic — above article content */}
{article.infographic && (
  <div className="max-w-4xl mx-auto mb-8">
    <BlogInfographic config={article.infographic} />
  </div>
)}

{/* Article content */}
<article className="max-w-4xl mx-auto">
  <div className="...">
    <BlogMarkdown content={article.content} />
  </div>
</article>
```

### 3. Update article frontmatter (24 files)

Add `infographic:` block to each article's YAML frontmatter. Example for PEB Bruxelles:

```yaml
infographic:
  type: "timeline"
  data:
    title: "Calendrier PEB Bruxelles"
    milestones:
      - date: "2027"
        label: "Nouvelles tables climatiques"
        detail: "Scores améliorés de 1-2 classes"
        color: "blue"
        icon: "calendar"
      - date: "2033"
        label: "F/G interdit"
        detail: "Amende jusqu'à 31 250€/apt"
        color: "red"
        icon: "alert"
      - date: "2043"
        label: "D/E interdit"
        detail: "Objectif 150 kWh/m²/an"
        color: "amber"
        icon: "clock"
```

---

## Implementation Order (stories)

| # | Story | Files | Estimate |
|---|-------|-------|----------|
| 1 | Shared infra: `useScrollReveal` hook + `BlogInfographic` dispatcher + types + `lib/blog.ts` update + `page.tsx` integration | 5 files | S |
| 2 | `StatHighlight` component + 2 article frontmatters | 3 files | S |
| 3 | `ComparisonBars` component + 6 article frontmatters | 7 files | M |
| 4 | `TimelineChart` component + 7 article frontmatters | 8 files | M |
| 5 | `DataTable` component + frontmatters for remaining articles | varies | S |
| 6 | `ChecklistTracker` component + 3 article frontmatters | 4 files | S |
| 7 | `FlowDecisionTree` component + 6 article frontmatters | 7 files | L |
| 8 | `RegionalComparison` component + 1 article frontmatter | 2 files | S |

**Total:** ~40 files touched. Parallelizable: stories 2-8 are independent after story 1.

**Recommended execution:** Story 1 first (infra), then stories 2-4 in parallel (highest impact), then 5-8.

---

## Article → Component Mapping (complete)

| Article | Component | Priority |
|---------|-----------|----------|
| PEB Bruxelles amendes | `TimelineChart` | HIGH |
| Succession Wallonie 2028 | `ComparisonBars` | HIGH |
| Fausses fiches de paie | `FlowDecisionTree` | HIGH |
| Moratoire hivernal fonds | `ChecklistTracker` | HIGH |
| CEDH lex mitior | `ChecklistTracker` | MEDIUM |
| Syndic missions | `FlowDecisionTree` | MEDIUM |
| Essentiel immo Janvier | `StatHighlight` | HIGH |
| Grille loyers Bruxelles | `ComparisonBars` | HIGH |
| Précompte immobilier | `ComparisonBars` | HIGH |
| Fibre optique copro | `FlowDecisionTree` | MEDIUM |
| Rénovation copro 8 ans | `StatHighlight` | HIGH |
| Vices cachés Cassation | `FlowDecisionTree` | MEDIUM |
| Moratoire Cour Constit | `TimelineChart` | HIGH |
| Résidences secondaires | `DataTable` | MEDIUM |
| Syndic actions justice | `FlowDecisionTree` | MEDIUM |
| Essentiel immo Février | `StatHighlight` | MEDIUM |
| Essentiel immo Mars | `TimelineChart` | HIGH |
| DPR Bruxelles | `TimelineChart` | HIGH |
| Déduction intérêts | `ComparisonBars` | HIGH |
| PEB Wallonie 2028 | `TimelineChart` | HIGH |
| Baromètre Federia | `ComparisonBars` | HIGH |
| Taxes comportementales | `ChecklistTracker` | MEDIUM |
| Moratoire exceptions | `FlowDecisionTree` | MEDIUM |
| Indexation loyer | `RegionalComparison` | HIGH |
