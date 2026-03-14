# PRD — SEO/Copy/CRO Optimization: Landing Page + Auth Sections

## Context

Audit complet de la landing page et des sections auth SEIDO via les 3 agents SEO (strategist, copywriter, reviewer). Score actuel : **52/100** (Insuffisant). 18 BLOCKERS, 12 WARNINGS, 8 INFO.

## Problem Statement

La landing page SEIDO a un excellent design visuel (glassmorphism, video hero, animations) mais souffre de :
1. **SEO invisible** : zero schema markup, zero sitemap, zero robots.ts, keyword absent du H1, locale OG incorrect
2. **GEO absent** : zero passage citable pour AI Overviews/ChatGPT/Perplexity
3. **E-E-A-T faible** : temoignages anonymes, pas de contact physique, pas de signaux de confiance
4. **CRO non-optimise** : CTAs faibles ("Commencer"), pas de social proof bar, pas de micro-copy
5. **Auth pages** : zero metadata, CTA signup sous-optimal

## Goals

- Score reviewer >= 75/100 (seuil publication)
- Tous les BLOCKERs resolus
- Technical SEO infra en place (robots.ts, sitemap.ts, JSON-LD)
- CTAs optimises selon donnees CRO A/B
- E-E-A-T signals presents

## Non-Goals

- Redesign visuel complet (le design glassmorphism est bon)
- Creation de nouvelles pages (blog, comparatifs) — scope futur
- Traduction multilingue (EN/NL) — scope futur
- Migration vers Server Components de la landing page entiere

## User Stories

### US-001: SEO Infrastructure (robots.ts, sitemap.ts, JSON-LD component)
Creer les fichiers techniques SEO manquants : `app/robots.ts`, `app/sitemap.ts`, et un composant reutilisable `components/seo/json-ld.tsx`.

### US-002: Homepage Metadata Fix
Corriger `app/page.tsx` : locale fr_BE, supprimer keywords deprecated, ajouter canonical/alternates, integrer JSON-LD (Organization + SoftwareApplication + FAQPage).

### US-003: Header CTA Optimization
Changer le CTA header de "Commencer" a "Essai gratuit" (mobile) / "Essayer gratuitement" (desktop) selon donnees CRO (+104%).

### US-004: Hero Section Polish
- Integrer keyword "gestion locative" dans le H1
- Ajouter micro-copy sous le CTA principal
- Ajouter social proof bar sous le hero

### US-005: Testimonials E-E-A-T Fix
Remplacer les temoignages anonymes par des vrais noms/roles/entreprises (ou marquer comme "Programme Fondateurs" si beta).

### US-006: Footer + Trust Signals
Remplir la colonne vide du footer avec contact physique (+32), liens sociaux, et signaux de confiance.

### US-007: CTA Consistency + Micro-copy
Harmoniser tous les CTAs (signup "Creer mon compte" → "Commencer mon essai gratuit"), ajouter micro-copy risk reversal, corriger inconsistance duree essai (14j vs 1 mois).

### US-008: Auth Pages Metadata + noindex
Ajouter metadata correctes aux pages login/signup + s'assurer que robots.ts les bloque.

## Priority Order

Schema → Backend/Infra (US-001, US-002) → UI (US-003 → US-008)
