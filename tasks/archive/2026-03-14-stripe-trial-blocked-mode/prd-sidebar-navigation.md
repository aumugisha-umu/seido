# PRD: Sidebar Navigation for Gestionnaire

## Overview

Replace the current top navigation bar (DashboardHeader) with a **collapsible left sidebar** for the gestionnaire role. The sidebar provides persistent navigation, better scalability for growing menu items, and a professional B2B SaaS look matching the reference designs.

## Problem Statement

The current top navigation bar:
- Takes vertical space on every page, reducing content area
- Doesn't scale well as menu items grow (6 items already crowded on tablet)
- Mobile hamburger menu is a full-screen overlay that feels heavy
- Doesn't match modern B2B SaaS dashboard patterns (sidebar is the standard)

## Target Design (from reference images)

### Desktop - Expanded Sidebar (~240px)
```
┌──────────────────┬──────────────────────────────────────────┐
│ 🏠 Seido         │ Tableau de bord  [period] ... [actions] 🔔│
│ Gestion Immo.    │                                          │
│                  │                                          │
│ [←] collapse btn │  ┌─────────────────────────────────────┐ │
│                  │  │  Content area (dashboard, lists...)  │ │
│ ◻ Dashboard      │  │                                     │ │
│ ◻ Patrimoine     │  │                                     │ │
│ ◻ Contacts       │  │                                     │ │
│ ◻ Contrats       │  │                                     │ │
│ ◻ Interventions  │  │                                     │ │
│                  │  │                                     │ │
│ ─────────────── │  │                                     │ │
│ ⚙ Paramètres    │  │                                     │ │
│ ❓ Aides         │  │                                     │ │
│                  │  │                                     │ │
│ ─────────────── │  └─────────────────────────────────────┘ │
│ [Avatar] Marie   │                                          │
│   Gestionnaire ▾ │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

### Desktop - Collapsed Sidebar (~48px, icons only)
```
┌────┬──────────────────────────────────────────────────┐
│ 🏠 │ Tableau de bord  [period]   ...  [actions]  🔔   │
│    │                                                  │
│ [→]│  ┌─────────────────────────────────────────────┐ │
│    │  │  Content area (wider)                       │ │
│ ◻  │  │                                             │ │
│ ◻  │  │                                             │ │
│ ◻  │  │                                             │ │
│ ◻  │  │                                             │ │
│ ◻  │  │                                             │ │
│    │  │                                             │ │
│ ── │  │                                             │ │
│ ⚙  │  │                                             │ │
│ ❓  │  │                                             │ │
│    │  └─────────────────────────────────────────────┘ │
│ 👤 │                                                  │
└────┴──────────────────────────────────────────────────┘
```

### Mobile (< 768px) - Sheet overlay
```
┌──────────────────────────────────────────────────┐
│ [☰]  Tableau de bord                         🔔  │
├──────────────────────────────────────────────────┤
│                                                  │
│  Content area (full width)                       │
│                                                  │
└──────────────────────────────────────────────────┘

When hamburger tapped → Sheet slides from left:
┌──────────────────┬───────────────────────────────┐
│ 🏠 Seido         │  (dimmed backdrop)             │
│ Gestion Immo.    │                               │
│                  │                               │
│ ◻ Dashboard      │                               │
│ ◻ Patrimoine     │                               │
│ ◻ Contacts       │                               │
│ ◻ Contrats       │                               │
│ ◻ Interventions  │                               │
│                  │                               │
│ ─────────────── │                               │
│ ⚙ Paramètres    │                               │
│ ❓ Aides         │                               │
│                  │                               │
│ ─────────────── │                               │
│ [Avatar] Marie   │                               │
│   Gestionnaire ▾ │                               │
└──────────────────┘───────────────────────────────┘
```

## Scope

### In Scope
- **Gestionnaire role ONLY** (admin, prestataire, locataire unchanged)
- Sidebar with expanded (labels) and collapsed (icons-only) modes
- Persistent state via cookie (survives page reload)
- Keyboard shortcut Ctrl+B to toggle
- Mobile: Sheet/drawer from left (using existing shadcn Sheet)
- Top bar: page title + page actions + notifications bell (no nav items)
- Smooth CSS transitions for expand/collapse
- Active page highlighting with left accent bar
- User profile section at bottom of sidebar
- Tooltips on collapsed icons
- Scroll handling when many items

### Out of Scope
- Changing prestataire/locataire/admin navigation
- Adding new menu items (just moving existing ones)
- Nested/sub-menus (future enhancement)
- Dark mode sidebar theming (follows existing dark mode)

## Navigation Items

### Main Navigation (top section)
| Item | Icon | Route | Same as current |
|------|------|-------|-----------------|
| Dashboard | LayoutDashboard (or Home) | /gestionnaire/dashboard | ✅ |
| Patrimoine | Building2 | /gestionnaire/biens | ✅ |
| Contacts | Users | /gestionnaire/contacts | ✅ |
| Contrats | FileText | /gestionnaire/contrats | ✅ |
| Interventions | Wrench | /gestionnaire/interventions | ✅ |

### Secondary Navigation (bottom section, before user)
| Item | Icon | Route | Note |
|------|------|-------|------|
| Paramètres | Settings | /gestionnaire/parametres | Was in user menu |
| Aides | HelpCircle | /gestionnaire/aide | New explicit link (or external) |

### User Profile (very bottom)
- Avatar + Name + Role label + dropdown chevron
- Click → same menu as current UserMenu (profile, logout)

## Responsive Behavior

### Desktop ≥ 1024px (lg)
- Sidebar visible, expandable/collapsible
- Default state: expanded on first visit, then cookie-persisted
- Top bar: page title + breadcrumbs zone + notification bell + quick actions
- Content area: `margin-left` adapts to sidebar width

### Tablet 768px–1023px (md)
- Sidebar visible but **collapsed by default** (icons only)
- Can expand on click, but auto-collapses on navigation
- Top bar: same as desktop

### Mobile < 768px (sm/xs)
- **NO persistent sidebar** — full-width content
- Top bar: hamburger button (left) + page title (center) + notification bell (right)
- Hamburger opens Sheet (shadcn) from left with full sidebar content
- Sheet auto-closes on navigation
- Touch-friendly: min 48px tap targets

### (no-navbar) Pages (Detail/Edit pages)
- Sidebar is **NOT shown** on these pages (same as current behavior)
- These pages keep their own DetailPageHeader / StepProgressHeader
- This is controlled by the Route Groups: `(with-navbar)` vs `(no-navbar)`

## Technical Approach

### Foundation: shadcn Sidebar Primitive
The codebase already has `components/ui/sidebar.tsx` with:
- `SidebarProvider` (context, cookie persistence, keyboard shortcut)
- `Sidebar`, `SidebarContent`, `SidebarHeader`, `SidebarFooter`
- `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`
- `SidebarTrigger` (toggle button)
- Mobile mode with Sheet
- `expanded`/`collapsed` states via `data-state`

### New Components
1. **`components/gestionnaire-sidebar.tsx`** — Gestionnaire-specific sidebar using shadcn primitives
2. **`components/gestionnaire-topbar.tsx`** — Simplified top bar (title + notifications + actions)

### Modified Files
- `app/gestionnaire/(with-navbar)/layout.tsx` — Replace DashboardHeader with Sidebar + Topbar layout
- `app/globals.css` — Add sidebar CSS variables and BEM classes
- `components/dashboard-header.tsx` — Keep for admin role, remove gestionnaire-specific code (or deprecate gestionnaire usage)

### Layout Structure Change

**Before:**
```tsx
// (with-navbar)/layout.tsx
<div className="flex flex-col h-screen">
  <DashboardHeader ... />          {/* horizontal top bar */}
  <main className="flex-1 overflow-y-auto">
    {children}
  </main>
</div>
```

**After:**
```tsx
// (with-navbar)/layout.tsx
<SidebarProvider defaultOpen={true}>
  <div className="flex h-screen w-full">
    <GestionnaireSidebar ... />       {/* left sidebar */}
    <div className="flex flex-col flex-1 min-w-0">
      <GestionnaireTopbar ... />      {/* slim top bar */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  </div>
</SidebarProvider>
```

## Acceptance Criteria

1. Sidebar shows all gestionnaire nav items with correct icons and active states
2. Collapse/expand works with smooth animation and persists via cookie
3. Collapsed mode shows icons only with tooltips on hover
4. Mobile shows hamburger → Sheet drawer from left
5. Notifications bell remains in top bar with unread count badge
6. Page title displays in top bar
7. User profile section at sidebar bottom with avatar, name, role
8. Keyboard shortcut Ctrl+B toggles sidebar
9. Active page has visual indicator (highlighted background + left accent)
10. No regressions on admin/prestataire/locataire navigation
11. TypeScript compiles without errors
12. Touch targets ≥ 48px on mobile
13. Team selector works in sidebar (for multi-team users)

## Non-Functional Requirements

- Smooth transitions (200-300ms) for expand/collapse
- No layout shift/flash on page load (cookie-based initial state)
- Accessible: proper ARIA labels, keyboard navigation, focus management
- Performance: no additional API calls (same server data as current)
