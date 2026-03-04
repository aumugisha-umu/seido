# Design: Remove Card Views from Gestionnaire List Pages

**Date:** 2026-03-04
**Status:** Validated
**Scope:** Gestionnaire role list pages only — locataire/prestataire unchanged

## Problem

All 4 gestionnaire list pages offer a card/list toggle. Card views are inappropriate for B2B power users managing 100-300+ items:
- Cards show 2-3 items per screen vs 8-10 rows in list view
- No column comparison possible — working memory overhead
- View toggle adds cognitive overhead (choosing which view)
- Doubles maintenance surface (two UIs per entity)

## Research Evidence

- **Linear, Stripe, Salesforce, HubSpot, Jira**: None offer card toggles for core data lists
- **Nielsen Norman Group**: Tables are superior for scanning, comparison, outlier detection, bulk actions
- **Material Design 3**: "Cards distract from scanning" — lists recommended for user-driven prioritization
- **SEIDO gestionnaire persona**: 100-300 items/month, desktop-heavy, needs bulk actions + column sorting

## Design Decisions

| Page | Before | After | Rationale |
|------|--------|-------|-----------|
| Interventions | Cards, List, Calendar | **List + Calendar** | Calendar is legitimate (time planning). Cards removed. |
| Biens | Cards, List | **List only** | Pure data scanning. No toggle needed. |
| Contacts | Cards, List | **List only** | Pure data scanning. No toggle needed. |
| Contrats | Cards, List | **List only** | Pure data scanning. No toggle needed. |

## Per-Role Analysis

| Role | Action | Why |
|------|--------|-----|
| Gestionnaire | Remove card views + toggle | Power user, 100+ items, scanning/triage |
| Prestataire | No change | No list pages (dashboard only) |
| Locataire | No change | No list pages, card detail is appropriate for 1-2 items |

## Implementation Plan

### 1. InterventionsNavigator (`components/interventions/interventions-navigator.tsx`)
- Remove 'cards' from ViewMode options — keep 'list' + 'calendar'
- Remove `InterventionCard` rendering branch from `InterventionsViewContainer`
- Update `ViewModeSwitcherV1` to only show List + Calendar icons
- Default viewMode: 'list' (was 'cards')

### 2. PatrimoineNavigator (`components/patrimoine/patrimoine-navigator.tsx`)
- Remove view toggle UI entirely (only list mode)
- Remove card rendering branch (`BuildingCardExpandable`, `LotCardUnified`)
- Always render `DataTable`
- Remove viewMode state management

### 3. ContactsNavigator (`components/contacts/contacts-navigator.tsx`)
- Remove view toggle UI entirely
- Remove `DataCards` rendering with `ContactCardCompact`/`CompanyCardCompact`
- Always render `DataTable`
- Remove viewMode state management

### 4. ContractsNavigator (`components/contracts/contracts-navigator.tsx`)
- Remove view toggle UI entirely
- Remove `ContractCard` rendering branch
- Always render `ContractsListView`
- Remove viewMode state management

### 5. useViewMode hook (`hooks/use-view-mode.ts`)
- Update ViewMode type: remove 'cards' option
- Update default to 'list'
- Keep 'calendar' for interventions

### 6. ViewModeSwitcherV1 (`components/interventions/view-mode-switcher-v1.tsx`)
- Remove cards icon/button
- Only show List + Calendar

### 7. PropertySelector (`components/property-selector.tsx`)
- Remove `showViewToggle` prop and toggle UI
- Always show list view
- Update E2E tests that use `data-testid="view-toggle-cards"`

## Files NOT Modified

- Card components themselves (InterventionCard, BuildingCardExpandable, etc.) — may be used in dashboards
- Locataire/prestataire views — no list pages
- Dashboard KPIMobileGrid — different context (KPI display)
- `DataTable` component — already exists, no changes needed

## Verification

- All 4 gestionnaire list pages render in list/table mode only
- Interventions page shows List + Calendar toggle (no cards option)
- Biens, Contacts, Contrats pages have no view toggle
- Desktop view unchanged in layout quality
- E2E tests updated for removed card view toggles
- No TypeScript errors from removed ViewMode options
