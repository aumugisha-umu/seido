# Retrospective: Blog Hub/Cluster Redesign

**Date:** 2026-03-11
**Duration:** ~1 session
**Stories Completed:** 9 / 9
**Branch:** feature/landing-page-redesign

## What Went Well
- Parallel agent delegation: 3 SEO copywriter agents created 20 articles simultaneously
- Additive schema changes (type/hub defaults) caused zero breaking changes for existing articles
- Ralph methodology kept the 9-story scope organized and trackable
- Hub-article banner was clean as an async Server Component — no client-side complexity

## What Could Be Improved
- Agent-generated cross-links used wrong slugs (14 files needed fixing)
- Should have included a post-creation slug validation step in the agent prompts
- Could have run a single verification agent to check all frontmatter consistency after content creation

## New Learnings Added to AGENTS.md
- Learning #130: Agent-delegated content — verify cross-reference slugs match canonical frontmatter
- Learning #131: Additive schema changes with defaults — zero migration for existing content
- Learning #132: Async Server Component for data-dependent UI — no useEffect needed

## Patterns Discovered
- **Hub/cluster blog model**: type/hub frontmatter fields with defaults create a non-breaking extension to the blog system
- **Parallel content delegation**: 3 independent months = 3 independent agents. Content creation is embarrassingly parallel when articles don't cross-reference across months
- **Post-creation validation**: After bulk content generation, always grep for internal links and verify against canonical slugs

## Anti-Patterns Avoided (or Encountered)
- **Encountered**: Agents inferring slugs from filenames instead of reading target frontmatter
- **Avoided**: Breaking existing articles by requiring new frontmatter fields (solved with defaults)

## Recommendations for Similar Future Work
- When delegating content to agents, include exact slugs as a lookup table in the prompt
- Run a post-creation grep for all internal links and validate against actual frontmatter slugs
- For additive schema changes, always use defaults that match the "normal" case

## Files Changed
- `lib/blog.ts` — Added type/hub to ArticleMeta, hub filter in getLatestArticles, new getArticlesByHub
- `app/blog/[slug]/page.tsx` — Added HubBanner async component
- 20 new individual article files (blog/articles/2026-0[1-3]-0[1-8]-*.md)
- 3 new hub pages (blog/articles/2026-0[1-3]-00-*.md)
- 3 deleted omnibus articles
- `docs/plans/2026-03-11-blog-hub-cluster-redesign.md` — Design document
