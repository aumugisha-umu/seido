# Blog Hub/Cluster Redesign — Design Document

**Date**: 2026-03-11
**Status**: Validated
**Scope**: Restructure 3 omnibus blog articles into 20 individual articles + 3 hub pages

---

## Context & Rationale

The Seido blog currently has 3 monthly "digest" articles covering 6-8 topics each. SEO best practices (2025-2026) strongly recommend the **pillar/cluster model**:

- 1 omnibus article = 1 ranking opportunity. 20 individual articles = **20 ranking opportunities**
- Google rewards pages that are a **"complete answer"** to a specific query
- Individual articles can be **updated independently**
- Hub pages serve as **internal linking nodes**, not SEO targets
- Topic clusters build **topical authority** signals

## File Structure

### Naming Convention

`YYYY-MM-##-keyword.md` where `##` indicates order within the month.

- `00` = hub page (monthly index)
- `01-08` = individual articles in publication order

### Full File List

```
blog/articles/
  # Hubs (00)
  2026-01-00-essentiel-immo-janvier-2026.md
  2026-02-00-essentiel-immo-fevrier-2026.md
  2026-03-00-essentiel-immo-mars-2026.md

  # Janvier (6 articles)
  2026-01-01-peb-bruxelles-copropriete-amendes.md
  2026-01-02-succession-immobiliere-wallonie-2028.md
  2026-01-03-moratoire-hivernal-fonds-indemnisation.md
  2026-01-04-cedh-proprietaires-lex-mitior.md
  2026-01-05-syndic-copropriete-missions-controle.md
  2026-01-06-fausses-fiches-paie-annulation-bail.md

  # Fevrier (8 articles)
  2026-02-01-grille-loyers-bruxelles-deconnexion.md
  2026-02-02-precompte-immobilier-bruxelles-explosion.md
  2026-02-03-fibre-optique-copropriete.md
  2026-02-04-renovation-energetique-copropriete-chiffres.md
  2026-02-05-vices-caches-copropriete-cassation.md
  2026-02-06-moratoire-hivernal-cour-constitutionnelle.md
  2026-02-07-residences-secondaires-cote-taxes.md
  2026-02-08-syndic-actions-justice-ratification.md

  # Mars (6 articles)
  2026-03-01-gouvernement-bruxellois-dpr-proprietaires.md
  2026-03-02-suppression-deduction-interets-immobiliers.md
  2026-03-03-wallonie-feuille-route-energetique-peb-2028.md
  2026-03-04-barometre-federia-offre-locative.md
  2026-03-05-taxes-comportementales-immobilier.md
  2026-03-06-moratoire-hivernal-exceptions-jurisprudence.md
```

### Files to Delete

After migration, delete the 3 original omnibus articles:
- `2026-01-panorama-immobilier-belgique-janvier-2026.md`
- `2026-02-immobilier-belgique-fevrier-2026.md`
- `2026-03-immobilier-belgique-mars-2026.md`

## Frontmatter Templates

### Hub Page Frontmatter

```yaml
---
title: "L'essentiel immo #3 — Mars 2026"
slug: "essentiel-immo-mars-2026"
date: "2026-03-15"
author: "Equipe Seido"
category: "L'essentiel immo"
tags: ["recap mensuel", "gestion immobiliere"]
description: "Meta description 150-160 chars"
reading_time: "3 min"
type: "hub"
---
```

### Individual Article Frontmatter

```yaml
---
title: "Titre avec keyword principal (50-60 chars)"
slug: "keyword-principal-slug"
date: "2026-03-15"
author: "Equipe Seido"
category: "Fiscalite"
tags: ["keyword1", "keyword2", "keyword3"]
description: "Meta description 150-160 chars"
reading_time: "5 min"
type: "article"
hub: "essentiel-immo-mars-2026"
---
```

### Hub Page Content Template (~400 mots)

```markdown
# L'essentiel immo #3 — Mars 2026

*Chapeau accrocheur avec chiffres cles*

---

## 1. [Titre sujet 1](/blog/slug-1)
Resume 2-3 lignes. Chiffre cle en **gras**. [Lire →](/blog/slug-1)

## 2. [Titre sujet 2](/blog/slug-2)
Resume 2-3 lignes...

(...)

---

## Checklist du mois
- [ ] Item actionnable 1
(...)

---

**CTA Seido final**
```

### Individual Article Content Template (800-1500 mots)

```markdown
# Titre H1

*Chapeau : contexte + chiffre choc + pourquoi gestionnaires*

---

## H2 : Question-format (featured snippet target)

Paragraphe answer-first (40-60 mots).

### H3 : Detail 1
Contenu + tableau/liste.

### H3 : Detail 2
(...)

## H2 : Ce que les gestionnaires doivent faire

Actions concretes.

---

> **Avec Seido**, CTA contextuel. [Action →](#)

---

> Cet article fait partie de [L'essentiel immo #3](/blog/essentiel-immo-mars-2026).
> A lire aussi : [article lie](/blog/slug).

---

## Sources et references
- [Source](url), description
```

## Code Changes

### 1. `lib/blog.ts` — Add type/hub support

**Interface changes:**
```typescript
export interface ArticleMeta {
  slug: string
  title: string
  date: string
  author: string
  category: string
  tags: string[]
  description: string
  reading_time: string
  type: string        // NEW: "hub" | "article"
  hub: string         // NEW: slug of parent hub (empty for hubs)
}
```

**Parsing changes in `parseArticleFile`:**
```typescript
type: data.type || 'article',
hub: data.hub || '',
```

**New/modified functions:**
- `getLatestArticles(n)` — filter out `type === "hub"` so hubs don't appear in "latest articles" on landing page
- `getArticlesByHub(hubSlug)` — return articles where `hub === hubSlug`, sorted by date

### 2. `app/blog/[slug]/page.tsx` — Hub-article relationship

- If article has `hub` field: render a banner at bottom linking to the hub + sibling articles
- If article is a hub: no change needed (hub content is already an index with links)

### 3. `app/blog/page.tsx` — No structural changes

The existing category/tag filter system already works. Hubs will have category "L'essentiel immo" and can be filtered naturally.

### 4. Landing page — No change

`getLatestArticles(3)` will automatically skip hubs after the filter is added.

## Execution Plan

### Phase 1 — Mars (6 articles + 1 hub)
Source: `2026-03-immobilier-belgique-mars-2026.md` (already written + sources verified)

### Phase 2 — Fevrier (8 articles + 1 hub)
Source: `2026-02-immobilier-belgique-fevrier-2026.md`

### Phase 3 — Janvier (6 articles + 1 hub)
Source: `2026-01-panorama-immobilier-belgique-janvier-2026.md`

### Phase 4 — Code changes
- `lib/blog.ts` (~30 lines)
- `app/blog/[slug]/page.tsx` (~10 lines)
- Delete 3 original omnibus files

## SEO Checklist per Article

- [ ] H1 unique with primary keyword
- [ ] H2/H3 hierarchy without level skipping
- [ ] Answer-first paragraph for featured snippet
- [ ] Primary keyword in title, first paragraph, conclusion
- [ ] Meta description 150-160 chars
- [ ] 800-1500 words
- [ ] Internal links (hub + cross-links)
- [ ] External links to authoritative sources (2-3)
- [ ] Contextual CTA Seido
- [ ] Sources section with URLs
