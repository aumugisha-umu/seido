---
name: sp-release
description: Pre-deployment checklist, release process, rollback plan, and changelog generation. Use before any production deployment or when user says "deploy", "release", "ship it".
---

# Release & Deployment Checklist

## Overview

Ensure safe, reversible deployments with proper validation at each step.

**Core principle:** Every deployment must be reversible within 5 minutes.

## Auto-Invocation Triggers

- "deploy", "release", "ship it", "push to prod"
- "mise en production", "deployer"
- Before any `git push` to main/master

## Pre-Deployment Checklist

### 1. Code Quality Gate
- [ ] `npm run lint` passes
- [ ] `npm test` passes
- [ ] No BLOCKER issues from sp-quality-gate
- [ ] All PRD stories marked `passes: true` (if Ralph feature)

### 2. Database Safety
- [ ] New migrations tested locally with `npx supabase db push --linked`
- [ ] Migration is reversible (has DOWN migration or documented rollback)
- [ ] RLS policies added for new tables
- [ ] Types regenerated: `npm run supabase:types`
- [ ] No destructive changes without explicit backup confirmation

### 3. Environment & Config
- [ ] Environment variables set in Vercel (if new ones added)
- [ ] No hardcoded URLs (localhost, staging URLs in prod code)
- [ ] Stripe webhooks configured for new events (if billing changes)
- [ ] Resend email templates updated (if email changes)

### 4. Feature Validation
- [ ] Tested with gestionnaire account (70% of users)
- [ ] Tested with prestataire account (mobile — 75%)
- [ ] Tested with locataire account (occasional user)
- [ ] Tested with admin account (if admin features)

### 5. Changelog
Generate changelog from git log since last release:
```bash
git log --oneline $(git describe --tags --abbrev=0)..HEAD
```

Format:
```markdown
## [version] - YYYY-MM-DD
### Added
- [feature description]
### Fixed
- [bugfix description]
### Changed
- [modification description]
```

## Deployment Process (Vercel)

1. **Merge PR to main** — triggers Vercel build
2. **Monitor build** — check Vercel dashboard for build success
3. **Smoke test** — visit production URL, verify critical paths
4. **Monitor errors** — check error tracking for 15 minutes post-deploy

## Rollback Plan

If issues detected post-deployment:
1. **Vercel instant rollback** — Deployments tab → previous deployment → Promote
2. **Database rollback** — `supabase migration repair --status reverted <timestamp> --linked`
3. **Notify team** — Document what went wrong

## Post-Deployment

- [ ] Smoke test critical user flows
- [ ] Check error monitoring dashboard
- [ ] Update `tasks/progress.txt` with deployment note
- [ ] Run `/compound` if this was a major feature release

## Skills Integration

| Situation | Skill |
|-----------|-------|
| Before deploy | `sp-quality-gate` (mandatory) |
| Build fails | `sp-systematic-debugging` |
| Post-deploy issues | `sp-systematic-debugging` |
| Feature complete | `sp-compound` |
