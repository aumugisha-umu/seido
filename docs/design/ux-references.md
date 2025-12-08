# SEIDO - Références & Inspirations UX/UI

> **Fichier parent** : [ux-ui-decision-guide.md](./ux-ui-decision-guide.md)
> **Version** : 1.1 | **Date** : 2025-12-07

Ce document liste les ressources, design systems et applications de référence pour SEIDO.

---

## Table des Matières

1. [Apps de Référence par Pattern](#1-apps-de-référence-par-pattern)
2. [Design Systems de Référence](#2-design-systems-de-référence)
3. [UX Research Resources](#3-ux-research-resources)
4. [Accessibility Resources](#4-accessibility-resources)
5. [Performance Resources](#5-performance-resources)
6. [Inspiration Galleries](#6-inspiration-galleries)

---

## 1. Apps de Référence par Pattern

| Pattern | App de Référence | Ce qu'on adopte |
|---------|------------------|-----------------|
| **Command Palette** | Linear | Ctrl+K universal search |
| **Data Organization** | Notion | Database views (table/cards/calendar) |
| **Property Management** | Airbnb Host | Property cards, map view |
| **Mobile UX** | Revolut | Bottom sheets, swipe actions |
| **Dashboards** | Stripe | KPI cards, charts, drill-down |
| **Collaboration** | Slack | Chat threading, mentions |
| **Project Management** | Asana | Timeline, task dependencies |
| **Email Management** | Superhuman | Keyboard shortcuts, inbox zero |

---

## 2. Design Systems de Référence

### Material Design 3
**Site** : https://m3.material.io/

**Adopté** :
- Color system (primary, secondary, tertiary)
- Typography scale
- Elevation system
- Motion principles
- Component specs (buttons, cards, dialogs)

### Apple Human Interface Guidelines
**Site** : https://developer.apple.com/design/human-interface-guidelines/

**Adopté** :
- Clarity (typography, contrast)
- Deference (content-first)
- Depth (z-index hierarchy)
- Touch targets (44x44px)

### Tailwind CSS
**Site** : https://tailwindcss.com/

**Utilisé** :
- Utility-first approach
- Design tokens (colors, spacing, typography)
- Responsive modifiers
- Custom config for SEIDO theme

### shadcn/ui
**Site** : https://ui.shadcn.com/

**Utilisé** :
- 50+ components (Button, Card, Dialog, etc.)
- Accessible by default
- Customizable with Tailwind
- Copy-paste pattern (not npm dependency)

---

## 3. UX Research Resources

### Nielsen Norman Group
**Site** : https://www.nngroup.com/

**Articles clés** :
- [10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [Mobile UX](https://www.nngroup.com/topic/mobile-ux/)
- [Dashboard Design](https://www.nngroup.com/articles/dashboard-design/)
- [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/)

### Laws of UX
**Site** : https://lawsofux.com/

**Lois appliquées** :
- **Fitts's Law** : Boutons d'action principaux grands et proches
- **Hick's Law** : Limiter choix (max 5-7 options)
- **Jakob's Law** : Suivre conventions (icons familiers)
- **Miller's Law** : Grouper infos par 5-9 items
- **Proximity** : Grouper éléments liés visuellement

### Baymard Institute
**Site** : https://baymard.com/

**Research utilisé** :
- Form UX best practices
- Mobile commerce UX
- Search & filtering patterns

---

## 4. Accessibility Resources

### WCAG 2.1 AA Guidelines
**Site** : https://www.w3.org/WAI/WCAG21/quickref/

**Critères prioritaires** :
- **1.4.3** Contrast (4.5:1 text, 3:1 graphics)
- **2.1.1** Keyboard navigation
- **2.4.7** Focus visible
- **4.1.2** Name, role, value (ARIA)

### A11y Project
**Site** : https://www.a11yproject.com/

**Checklists utilisées** :
- WCAG compliance checklist
- ARIA authoring practices
- Screen reader testing guide

---

## 5. Performance Resources

### Web.dev
**Site** : https://web.dev/

**Guides utilisés** :
- Core Web Vitals
- Performance budgets
- Image optimization
- Code splitting

### Lighthouse
**Outil** : Chrome DevTools

**Audits** :
- Performance (>90)
- Accessibility (>90)
- Best Practices (>90)
- SEO (>90)

---

## 6. Inspiration Galleries

### Dribbble - Real Estate Management
**Site** : https://dribbble.com/tags/property-management

**Inspiration** :
- Dashboard layouts
- Property cards
- Map integrations
- Mobile interfaces

### Mobbin - Mobile Patterns
**Site** : https://mobbin.com/

**Patterns étudiés** :
- Bottom sheets
- Swipe actions
- Pull to refresh
- Empty states

### UI Garage
**Site** : https://uigarage.net/

**Collections** :
- Data tables
- Form layouts
- Notification patterns
- Loading states

---

## Outils de Design

### Design
- **Figma** : Maquettes et prototypes
- **Whimsical** : Flowcharts et wireframes

### Développement
- **Storybook** : Documentation composants
- **Chromatic** : Visual regression testing

### Analytics
- **Hotjar** : Heatmaps et recordings
- **Mixpanel** : Event tracking
- **Vercel Analytics** : Core Web Vitals

---

## Voir aussi

- [Principes UX Communs](./ux-common-principles.md)
- [Métriques UX](./ux-metrics.md)
- [Design System SEIDO](./00-general.md)
