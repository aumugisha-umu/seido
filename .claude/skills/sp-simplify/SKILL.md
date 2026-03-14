---
name: simplify
description: Review changed code for reuse, quality, and efficiency, then fix any issues found. Supports targeted sections and scales via parallel agents/worktrees for large scopes.
---

# Simplify: Code Review and Cleanup

> **Note:** Core craftsmanship checks are now embedded in upstream skills (ralph, tdd, quality-gate) via "Code Craftsmanship Standards" in CLAUDE.md.
> This skill remains useful for: targeted deep reviews, full-app audits, and catching edge cases.

Review code for reuse, quality, and efficiency. Fix any issues found.

## Phase 1: Determine Scope

Parse the user's message to determine what to review:

### Mode A: Recent Changes (default)
If the user just says `/simplify` with no target:
- Run `git diff` (or `git diff HEAD` if staged changes exist)
- If no git changes, review the most recently modified files mentioned in conversation

### Mode B: Targeted Section
If the user specifies a target (e.g., `/simplify components/confirmation`, `/simplify interventions`, `/simplify lib/services`):
- Use the specified path(s) as the review scope
- Run `git diff -- <path>` first to see recent changes in that scope
- If no recent changes, do a full review of the specified directory/files
- Use `find <path> -name "*.tsx" -o -name "*.ts" | head -50` to enumerate files

### Mode C: Multi-Section / Full App Audit
If the user specifies multiple sections or asks for a broad audit (e.g., `/simplify all wizards`, `/simplify components/ lib/services/ app/actions/`):
- Split into independent review domains (max 15-20 files per domain)
- **Scale strategy:**
  - **2-3 domains** → Launch parallel review agents (one per domain)
  - **4+ domains** → Use worktrees (`isolation: "worktree"`) for each agent to avoid file read contention
- Each domain agent runs the full 3-lens review independently
- Aggregate all findings at the end

## Phase 2: Launch Review Agents

Based on the scope determined in Phase 1, launch review agents.

### Small scope (< 20 files changed): 3 parallel agents

Launch all three agents concurrently in a single message. Pass each agent the file list and diff context.

#### Agent 1: Code Reuse Review

For each change:
1. **Search for existing utilities and helpers** that could replace newly written code. Use Grep to find similar patterns elsewhere in the codebase — common locations are utility directories (`lib/utils/`, `lib/constants/`, `components/ui/`), shared modules, and files adjacent to the changed ones.
2. **Flag any new function that duplicates existing functionality.** Suggest the existing function to use instead.
3. **Flag any inline logic that could use an existing utility** — hand-rolled string manipulation, manual path handling, custom environment checks, ad-hoc type guards, and similar patterns are common candidates.

#### Agent 2: Code Quality Review

Review the same changes for hacky patterns:
1. **Redundant state**: state that duplicates existing state, cached values that could be derived, observers/effects that could be direct calls
2. **Parameter sprawl**: adding new parameters to a function instead of generalizing or restructuring existing ones
3. **Copy-paste with slight variation**: near-duplicate code blocks that should be unified with a shared abstraction
4. **Leaky abstractions**: exposing internal details that should be encapsulated, or breaking existing abstraction boundaries
5. **Stringly-typed code**: using raw strings where constants, enums (string unions), or branded types already exist in the codebase

#### Agent 3: Efficiency Review

Review the same changes for efficiency:
1. **Unnecessary work**: redundant computations, repeated file reads, duplicate network/API calls, N+1 patterns
2. **Missed concurrency**: independent operations run sequentially when they could run in parallel
3. **Hot-path bloat**: new blocking work added to startup or per-request/per-render hot paths
4. **Unnecessary existence checks**: pre-checking file/resource existence before operating (TOCTOU anti-pattern) — operate directly and handle the error
5. **Memory**: unbounded data structures, missing cleanup, event listener leaks
6. **Overly broad operations**: reading entire files when only a portion is needed, loading all items when filtering for one

### Large scope (20+ files or multi-domain): Domain-split agents

For each domain:
1. Launch one agent (with `isolation: "worktree"` if 4+ domains) that runs ALL 3 reviews (reuse + quality + efficiency) for its file set
2. Each agent returns a structured report:
   ```
   ## Domain: [name]
   ### Critical Issues (must fix)
   ### Important Issues (should fix)
   ### Suggestions (nice to have)
   ### Files Reviewed: [list]
   ```

## Phase 3: Fix Issues

Wait for all agents to complete. Aggregate their findings and:

1. **Critical issues**: Fix immediately
2. **Important issues**: Fix unless they require architectural changes (flag those for user decision)
3. **Suggestions**: Note but skip unless trivial to fix
4. **False positives**: Skip silently — do not argue with the finding

When done, briefly summarize:
- Number of issues found per category
- What was fixed
- What was flagged for user decision
- Confirm the code is clean (or list remaining items)

## SEIDO-Specific Patterns to Check

These are common issues in this codebase:
- **`.single()` vs `.limit(1)`**: multi-team users break `.single()` → must use `.limit(1)`
- **Missing `getServerAuthContext`**: Server Components/Actions without auth
- **Direct Supabase calls**: Should use repository pattern
- **Inline styles**: Should use Tailwind classes
- **Hardcoded colors**: Should use CSS variables/design tokens from `globals.css`
- **Missing error boundaries**: Service/component boundaries without error handling
- **Unused imports**: Dead imports left after refactoring
- **`any` types**: Should be properly typed
- **Console.log left in**: Debug logging that should be removed or use `logger`
