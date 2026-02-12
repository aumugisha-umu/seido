# SEIDO Active Context

## Focus Actuel
**Objectif:** Voice Recorder + Documents Management + Reports Card (COMPLETE 2026-02-12)
**Branch:** `preview`
**Sprint:** Multi-Team Support + Performance Optimization (Jan-Feb 2026)
**Derniere analyse:** Voice recorder audio upload + reports display - 2026-02-12

---

## ✅ COMPLETE: Voice Recorder + Documents + Reports Card (2026-02-12)

### Vue d'Ensemble
Améliorations complètes de l'upload de fichiers et de l'affichage des rapports de clôture :

1. **Fix fileName audio** — Nomenclature "Rapport audio - [titre intervention]"
2. **Fix mediaFiles upload** — Les File objects n'étaient pas envoyés (perdus dans JSON.stringify)
3. **Fix preview/download documents** — Signed URLs via createBrowserSupabaseClient pour prestataire et locataire
4. **Nouveau composant ReportsCard** — Affiche les 3 rapports de clôture (provider_report, tenant_report, manager_report) pour les 3 rôles
5. **AGENTS.md enrichi** — 3 nouveaux learnings (#030, #031, #032)
6. **Retrospective créée** — docs/learnings/2026-02-12-voice-recorder-documents-reports-retrospective.md

### Changes Summary

| Area | Files Changed | Key Change |
|------|--------------|------------|
| Voice recorder | use-audio-recorder.ts, voice-recorder.tsx | fileName: "Rapport audio - [title]" |
| Upload fix | intervention-action-buttons.tsx | FormData pour File objects (au lieu de JSON.stringify) |
| Documents preview | documents-card.tsx (prestataire, locataire) | createBrowserSupabaseClient pour signed URLs |
| Reports display | reports-card.tsx (NEW) | Composant shared pour les 3 rôles |
| Data fetching | 3 page.tsx (gestionnaire, prestataire, locataire) | Fetch intervention_reports |
| Knowledge base | AGENTS.md, progress.txt | +3 learnings, total: 32 |

### Fichiers créés (1)
- `components/interventions/shared/cards/reports-card.tsx` (165 lignes)

### Fichiers modifiés (13)
- `hooks/use-audio-recorder.ts`
- `components/intervention/voice-recorder.tsx`
- `components/intervention/simple-work-completion-modal.tsx`
- `components/intervention/intervention-action-buttons.tsx`
- `components/interventions/shared/cards/reports-card.tsx`
- `components/interventions/shared/cards/index.ts`
- `app/prestataire/(no-navbar)/interventions/[id]/page.tsx`
- `app/prestataire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx`
- `app/locataire/(no-navbar)/interventions/[id]/page.tsx`
- `app/locataire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx`
- `app/gestionnaire/(no-navbar)/interventions/[id]/page.tsx`
- `app/gestionnaire/(no-navbar)/interventions/[id]/components/intervention-detail-client.tsx`
- `AGENTS.md`

### Nouveaux Learnings (AGENTS.md #030-#032)
- #030: JSON.stringify strips File objects — use FormData for uploads
- #031: Signed URLs require client-side Supabase client with auth
- #032: ReportsCard shared component pattern for consistent UI

### Retrospective
`docs/learnings/2026-02-12-voice-recorder-documents-reports-retrospective.md`

---

## 🚧 IN PROGRESS: Intervention Workflow Polish (2026-02-11)

### Vue d'Ensemble
Multiple uncommitted changes improving intervention workflow and UI polish:

1. **New scheduling-service.ts** (327 lines) — Domain service for intervention scheduling logic
2. **ParticipantsRow polish** — Tooltips on section labels, ContactRound icon, badge consistency, separate counts
3. **Intervention planning enhancements** — New params: assignmentMode, providerInstructions, confirmationRequired
4. **UI components** — Calendar, date-picker, time-picker, modals improvements
5. **Programming modal + approval modal** — Workflow refinements

### Changes Summary (40 files, uncommitted)

| Area | Files Changed | Key Change |
|------|--------------|------------|
| New service | scheduling-service.ts (327 lines) | Domain logic for scheduling |
| ParticipantsRow | participants-row.tsx | Tooltip, ContactRound icon, badge unification |
| Planning hook | use-intervention-planning.ts | assignmentMode, providerInstructions params |
| Intervention workflow | action-utils, actions-service | Workflow refinements |
| UI components | calendar, date-picker, time-picker | Polish |
| Modals | programming-modal, approval-modal, multi-slot | Enhancements |

---

## ✅ COMPLETE: Conversation Thread Fix + Planning Button (2026-02-09)

### Vue d'Ensemble
Two features completed:
1. **Planning Button Consolidation** — Replaced 2 header buttons ("Gérer créneaux" + "Gérer estimations") with single "Gérer planification" that opens ProgrammingModal with pre-filled state
2. **Conversation Thread Fix** (4 stories via Ralph) — Fixed DB trigger bugs + added visual participant account indicator

### Changes Summary

| Feature | Files Changed | Key Change |
|---------|--------------|------------|
| Planning button | 2 | `manage_planning` action + pre-fill modal |
| DB trigger fix | 1 migration | auth_user_id guard + participant_id filter |
| hasAccount flag | 4 | Propagate auth_user_id to participant types (3 roles) |
| Visual indicator | 1 | Dashed border + muted colors + no chat icon for contacts |

### New Learnings (AGENTS.md #024-#026)
- #024: DB triggers must guard on auth_user_id
- #025: Supabase migration repair workflow
- #026: Optional boolean backwards compat (`!== false`)

### Retrospective
`docs/learnings/2026-02-09-conversation-thread-fix-retrospective.md`

---

## ✅ COMPLETE: Performance Navigation Optimization V2 (2026-02-08)

### Vue d'Ensemble
Optimisation complete des performances de navigation en 5 phases, 17 user stories.
**Commit:** `3bb1f4e` feat(performance): complete Performance Navigation Optimization V2 (17 stories)

### Gains de Performance

| Metrique | Avant | Apres | Amelioration |
|----------|-------|-------|--------------|
| Liste 1000 items render | 2-3s | <500ms | 80% plus rapide |
| Requetes detail intervention | 20+ | 5-8 | 60-75% moins |
| Filter search latency | 200ms/char | 0ms debounced | Fluide |
| Fatal error UX | Crash | Error boundary | Graceful |
| Memory (long list) | O(n) DOM | O(k) visible | 90% reduction |

### Stories Completees par Phase

**Phase 1: Error Handling (3 stories)**
- US-101: error.tsx global et par domaine (5 fichiers)
- US-102: not-found.tsx avec UX coherente (5 fichiers)
- US-103: loading.tsx avec PageSkeleton (5 variants)

**Phase 2: List Performance (4 stories)**
- US-201: Hook useDebounce (300ms) + useDebounceCallback
- US-202: Pagination backend interventions (findByTeamPaginated)
- US-203: Virtual scrolling react-window v2 (VIRTUALIZATION_THRESHOLD=50)
- US-204: Prefetch on hover (usePrefetch hook)

**Phase 3: Detail Pages (4 stories)**
- US-301: Batch queries unread counts (N+1 → 2 queries)
- US-302: Parallel address loading (Promise.all)
- US-303: Batch lot queries building detail
- US-304: Lazy load InterventionChatTab (dynamic + ssr:false)

**Phase 4: Next.js 15 Patterns (3 stories)**
- US-401: Suspense streaming (async Server Components)
- US-402: generateMetadata dynamique (SEO)
- US-403: PPR config (commente, requires canary)

**Phase 5: Supabase Optimizations (3 stories)**
- US-501: Browser client singleton
- US-502: Index conversation_messages (deja existant)
- US-503: Exponential backoff realtime + toast warnings

### Nouveaux Learnings (AGENTS.md)

| # | Titre | Resume |
|---|-------|--------|
| #018 | react-window v2 API migration | FixedSizeList → List, prop renames |
| #019 | Virtualization threshold | Seuil 50+ items avant virtualisation |
| #020 | Suspense streaming | Async Server Components + Suspense |
| #021 | Supabase relation alias | `alias:foreign_key(columns)` syntax |

### Nouveaux Patterns (systemPatterns.md)

| # | Pattern | Description |
|---|---------|-------------|
| #28 | Suspense Streaming | Shell instant + content stream |
| #29 | Virtual Scrolling avec Seuil | react-window v2 + threshold check |

### Bug Fixes During Implementation

1. **use-debounce.ts**: Duplicate `useEffect` import
2. **react-window v2**: API changes (FixedSizeList → List)
3. **mail/page.tsx**: Wrong table/column names
4. **intervention-detail-client.tsx**: Duplicate `dynamic` import

### Documentation Creee

- `tasks/progress.txt` - Log complet des 17 stories
- `docs/learnings/2026-02-08-performance-navigation-v2-retrospective.md`
- `docs/architecture/ssr-migration-pattern.md`

---

## Flow des Interventions - Vue Complete

### Statuts (9 actifs)
```
demande -> rejetee (terminal)
        -> approuvee -> planification -> planifiee
                                              |
                                    cloturee_par_prestataire
                                              |
                                    cloturee_par_locataire
                                              |
                                    cloturee_par_gestionnaire (terminal)
        -> annulee (terminal - possible a chaque etape)
```

---

## Multi-Equipe - Etat Actuel

### Corrections Appliquees (Phase 7+)

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 5 | API routes: `.single()` → `.limit(1)` | ✅ |
| Phase 6 | Browser side: auth-service.ts multi-profil | ✅ |
| Phase 7 | RLS: `get_my_profile_ids()` | ✅ |
| Phase 8 | Conversations: `can_view_conversation()` multi-profil | ✅ |
| Phase 9 | Participants: Trigger `thread_add_managers` | ✅ |
| Phase 10 | Filtrage auth_id contacts invites | ✅ |
| Phase 11 | Push subscription security fix | ✅ |

---

## Prochaines Etapes

### Fonctionnalites a Venir
- [ ] Google Maps Integration Phase 2: Composant AddressInput avec Places API
- [ ] Google Maps Integration Phase 3: Geocoding service automatique
- [ ] PPR activation quand Next.js canary disponible

### Maintenance
- [ ] Verifier deploiement Vercel reussi
- [ ] Tester push subscription apres fix

---

## Metriques Systeme (Mise a jour 2026-02-12)

| Composant | Valeur |
|-----------|--------|
| **Tables DB** | **44** |
| **Migrations** | **165** |
| **API Routes** | **114** (10 domaines) |
| **Pages** | **87** (5+ route groups) |
| **Composants** | **362** |
| **Hooks** | **68** |
| **Services domain** | **33** (+1: scheduling-service) |
| **Repositories** | **19** |
| Statuts intervention | 9 |
| Notification actions | **20** |
| **AGENTS.md Learnings** | **32** (+3) |
| **systemPatterns.md Patterns** | **29** |
| **Shared Cards** | **15** (documents, reports, comments, conversation, quotes, planning, summary, intervention-details) |

---

## Points de Vigilance - react-window v2

### Migration API v1 → v2
```typescript
// v1 (OBSOLETE)
import { FixedSizeList } from 'react-window'
<FixedSizeList
  itemCount={items.length}
  itemSize={52}
  itemData={items}
  height={400}
>
  {({ index, data, style }) => <Row item={data[index]} style={style} />}
</FixedSizeList>

// v2 (CORRECT)
import { List, type RowComponentProps } from 'react-window'
<List
  rowCount={items.length}
  rowHeight={52}
  rowProps={{ items }}
  rowComponent={VirtualizedRow}
  defaultHeight={400}
  width="100%"
/>
```

---

## Commits Recents (preview branch)

| Hash | Description |
|------|-------------|
| `992cc39` | fix(security): set interventions_active view to SECURITY INVOKER |
| `ff7c703` | fix(security): set search_path='' on 52 functions + scope webhook RLS policy |
| `fdea638` | chore: update last sync timestamp and modify PRD for security views |
| `f5e15a5` | feat(sidebar): implement collapsible sidebar navigation for gestionnaire |
| `bdfbbb9` | docs: update AGENTS.md with new learnings and memory bank |

---

*Derniere mise a jour: 2026-02-12 14:00*
*Focus: Voice Recorder + Documents + Reports Card COMPLETE (13 files modified)*

## Files Recently Modified
### 2026-02-12 13:07:28 (Auto-updated)
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/activeContext.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/progress.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/memory-bank/systemPatterns.md`
- `C:/Users/arthu/Desktop/Coding/Seido-app/.claude/auto-memory/last-sync`
