# SEO & Content Roadmap — SEIDO Landing + Blog

> Plan d'ameliorations restantes, classees par priorite et effort.
> Derniere mise a jour : 2026-03-12

---

## Deja fait (P0 + P1 + Quick Wins + P2 critiques)

- [x] metadataBase harmonise (`www.seido-app.com`)
- [x] H1 sur landing + blog index
- [x] `<main>` semantique sur landing et blog
- [x] BlogPosting schema enrichi (dateModified, author Person, publisher logo, BreadcrumbList)
- [x] Double H1 blog supprime (markdown h1 → null)
- [x] Footer h3 → p, CTA h2 → p (heading hierarchy)
- [x] Accents corriges (metadata blog, RSS, landing)
- [x] aria-labelledby sur 8 sections landing
- [x] OG images dynamiques blog (`opengraph-image.tsx`)
- [x] seido.be → seido-app.com (23 articles)
- [x] hreflang corriges (fr-BE + x-default uniquement, nl-BE/en retires)
- [x] BlogPosting image dans JSON-LD
- [x] updated_at dans blog pipeline + sitemap + OG meta + JSON-LD
- [x] Testimonials reactives (dark theme glassmorphism, SSR avec skeleton)
- [x] Schema Review sur testimonials (5 avis + datePublished dans @graph)
- [x] Schema Blog + BreadcrumbList sur page `/blog` index
- [x] RSS feed (`/blog/feed.xml` + alternate link dans layout)
- [x] Reading time auto-calcule (200 mots/min)
- [x] Author harmonise (frontmatter → JSON-LD dynamique)
- [x] `<p>` vide supprime du hero landing
- [x] Lazy-load testimonials (dynamic import avec skeleton CLS-safe)

---

## P2 — Ameliorations techniques restantes

### 1. Maillage inter-hub dans le corps des articles
**Effort** : 2-3h | **Impact** : SEO interne eleve

Les articles d'un meme hub ne renvoient pas vers les freres dans le corps du texte. Le banner en bas existe mais le maillage interne dans le contenu est plus valorise par Google.

**Action** : Pour chaque hub (janvier, fevrier, mars), ajouter 1-2 liens contextuels dans chaque article vers d'autres articles du meme cluster. Exemple : dans l'article PEB, lier vers l'article renovation energetique.

**Fichiers** : `blog/articles/*.md` (20 articles thematiques)

---

### 2. Title tags blog avec suffixe keyword
**Effort** : 30min | **Impact** : SEO moyen

Le template actuel est `%s | Blog SEIDO`. On pourrait enrichir avec des mots-cles par categorie.

**Action** : Dans `generateMetadata` de `app/blog/[slug]/page.tsx`, ajouter un suffixe contextuel :
```typescript
title: `${article.title} — ${article.category} | Blog SEIDO`
```

---

### 3. Blog search server-side (?q=)
**Effort** : 1-2h | **Impact** : SEO moyen (valide le SearchAction schema)

Le schema WebSite declare un `SearchAction` vers `/blog?q=`, mais la page blog n'a qu'un filtre client-side. Pour que Google valorise ce schema, le parametre `q` devrait filtrer cote serveur.

**Action** : Dans `app/blog/page.tsx`, lire `searchParams.q` et passer comme prop au client pour pre-filtrer.

---

### 4. Table des matieres flottante (articles longs)
**Effort** : 2-3h | **Impact** : UX eleve, SEO indirect (dwell time)

Pour les articles > 2000 mots, afficher un sommaire lateral base sur les H2/H3 (deja slugifies via `rehype-slug`).

**Action** : Creer `components/blog/table-of-contents.tsx` qui parse les headings du contenu markdown et genere une nav sticky.

---

### 5. Pagination blog
**Effort** : 1-2h | **Impact** : UX moyen (necessaire a 30+ articles)

Avec 23 articles et en croissance, la page va devenir lourde.

**Action** : Ajouter pagination (12 articles/page) ou infinite scroll dans `blog-list-client.tsx`.

---

### 6. Pages auteur pour E-E-A-T
**Effort** : 2h | **Impact** : SEO eleve (E-E-A-T)

Creer `/blog/auteurs/[slug]` avec bio, credentials, et liste des articles. Google utilise ces pages pour evaluer la credibilite des auteurs.

**Action** : Creer `app/blog/auteurs/[slug]/page.tsx` + data dans `data/authors.ts`.

---

### 7. Twitter images explicites
**Effort** : 15min | **Impact** : Social faible

Ajouter `twitter.images` dans le `generateMetadata` des articles pour garantir l'affichage correct sur X/Twitter sans dependre uniquement du fallback Next.js.

---

## P3 — Effort eleve ou dependant contenu

### 8. Video/demo interactive dans le hero
**Effort** : 4-8h | **Impact** : Conversion eleve (dwell time, engagement)

Le commentaire hero mentionne "Background Video" mais il n'y en a pas. Une courte demo interactive ou video produit augmenterait significativement le temps sur page.

**Action** : Produire une video de 30-60s ou une demo interactive (Loom, screen recording).

---

### 9. Liens contextuels landing → blog
**Effort** : 1h | **Impact** : SEO interne moyen

Ajouter 2-3 liens depuis les sections de la landing vers des articles blog pertinents. Exemple : section gestion interventions → article moratoire hivernal.

---

### 10. Pre-generation OG images au build
**Effort** : 30min | **Impact** : Performance (cold start)

Tester si les OG images sont deja pre-generees par le build Next.js (probable avec `generateStaticParams` sur la page). Si non, forcer le pre-render.

---

### 11. Font preload verification
**Effort** : 15min | **Impact** : CWV (LCP)

Verifier que les fonts Geist sont preloaded. `npm run build` puis inspecter le HTML pour `<link rel="preload" as="font">`.

---

## Strategie Contenu Blog SaaS B2B — BOFU / MOFU / TOFU

### Etat actuel

Le blog SEIDO est **100% TOFU** (Top of Funnel) : legislation, reglementation, actualite immobiliere. Ces articles attirent du trafic mais ne convertissent pas directement.

**Ratio ideal pour un SaaS B2B** :
- **30% TOFU** — Attirer, eduquer (articles legislation, tendances marche)
- **40% MOFU** — Engager, qualifier (guides pratiques, comparatifs neutres, use cases)
- **30% BOFU** — Convertir (vs competitors, ROI calculators, case studies)

### BOFU — Bottom of Funnel (priorite haute, conversion directe)

Les articles BOFU ciblent les prospects prets a acheter. Ils convertissent **10x plus** que les TOFU.

| Article a creer | Keyword cible | Format |
|----------------|---------------|--------|
| "SEIDO vs Smovin : quel logiciel gestion locative choisir ?" | `smovin alternative`, `smovin avis` | Comparatif feature-by-feature |
| "SEIDO vs Rentila : comparatif gestion locative Belgique" | `rentila belgique`, `rentila alternative` | Comparatif + pricing |
| "Meilleur logiciel gestion locative Belgique 2026" | `logiciel gestion locative belgique` | Listicle avec SEIDO en #1 |
| "Combien coute la gestion locative sans outil ? (Calculateur)" | `cout gestion locative` | Article + calculateur interactif |
| "Comment [agence X] a reduit de 60% son temps de gestion avec SEIDO" | `gestion locative automatisee` | Case study client reel |
| "Migration vers SEIDO : guide pas-a-pas depuis Excel/Smovin/Rentila" | `migration logiciel gestion locative` | Guide pratique |

**Bonnes pratiques BOFU SaaS B2B** :
- Toujours inclure un **CTA contextuel** vers l'essai gratuit
- Ajouter des **screenshots produit** (pas juste du texte)
- Citer des **chiffres concrets** : "15 min/jour au lieu de 2h", "ROI en 3 semaines"
- Schema `Product` + `AggregateRating` sur les pages comparatives
- `FAQ` schema avec les questions "SEIDO vs X" pour les People Also Ask

### MOFU — Middle of Funnel (priorite moyenne, qualification)

Les articles MOFU aident le prospect a comprendre comment resoudre son probleme. Il decouvre SEIDO comme solution naturelle.

| Article a creer | Keyword cible | Format |
|----------------|---------------|--------|
| "Guide complet : digitaliser sa gestion locative en 2026" | `digitaliser gestion locative` | Guide long-form (3000+ mots) |
| "Checklist : les 15 taches que vous pouvez automatiser en gestion locative" | `automatiser gestion locative` | Checklist actionnable |
| "Portail locataire : pourquoi c'est devenu indispensable" | `portail locataire immobilier` | Article opinion + demo |
| "Comment gerer 100+ lots sans embaucher" | `gestion locative scale` | Guide strategie + product-led |
| "Gestion interventions immobilieres : le workflow ideal" | `gestion interventions immobilier` | Workflow diagram + SEIDO demo |
| "Les 7 KPIs que tout gestionnaire locatif devrait suivre" | `kpi gestion locative` | Data-driven + dashboard screenshots |
| "RGPD et gestion locative : guide pratique pour gestionnaires" | `rgpd gestion locative` | Compliance + comment SEIDO aide |

**Bonnes pratiques MOFU SaaS B2B** :
- Inclure des **templates/outils telechargeables** (lead magnets)
- Montrer le produit en contexte naturel ("Voici comment ca se passe dans SEIDO")
- Liens vers les articles BOFU en fin d'article
- **Content upgrades** : "Telechargez la checklist complete" → capture email

### TOFU — Top of Funnel (deja couvert, continuer le rythme)

Les 23 articles existants sont excellents pour le TOFU. Continuer a 6 articles/mois sur l'actualite immobiliere belge.

**Ajustements pour les futurs TOFU** :
- Ajouter 1 CTA product-led par article (pas juste le lien generique `seido-app.com`)
- Lier vers les MOFU/BOFU en fin d'article ("Pour aller plus loin...")
- Ajouter des `internal links` vers 2-3 articles connexes dans le corps du texte

### Calendrier editorial recommande

| Mois | TOFU | MOFU | BOFU | Total |
|------|------|------|------|-------|
| Mars 2026 | 6 (fait) | 0 | 0 | 6 |
| Avril 2026 | 4 | 2 | 2 | 8 |
| Mai 2026 | 4 | 3 | 2 | 9 |
| Juin 2026 | 4 | 3 | 1 | 8 |

**Objectif Q2 2026** : Passer de 100% TOFU a un ratio 50% TOFU / 30% MOFU / 20% BOFU.

---

## Bonnes pratiques Blog SaaS B2B — Reference

### Architecture contenu

1. **Hub-Cluster** (deja en place) : chaque hub mensuel lie vers 6 articles spoke. Google comprend la topical authority.
2. **Pillar Pages** : creer 3-4 pages piliers long-form (3000+ mots) sur les themes majeurs :
   - "Guide complet gestion locative Belgique 2026"
   - "Tout savoir sur les interventions immobilieres"
   - "Reglementation PEB Belgique : guide pour gestionnaires"
3. **Content Clusters** : chaque pillar page lie vers 5-10 articles specifiques. Les articles lient vers le pillar.

### Optimisation par article

| Element | Bonne pratique | Status SEIDO |
|---------|---------------|-------------|
| Title tag | 50-60 chars, keyword en debut | Partiel (titres parfois longs) |
| Meta description | 150-160 chars, CTA inclus | Correct |
| H1 | Unique, keyword-rich, different du title | Correct |
| URL slug | Court, keyword, pas de date | Correct |
| Images | Alt text descriptif, WebP, lazy-load | Manque (pas d'images dans articles) |
| Internal links | 3-5 par article vers d'autres articles | Faible (1 lien CTA generique) |
| External links | 1-2 vers sources autoritaires | Correct (sources primaires citees) |
| CTA | 1 contextuel par article | Faible (lien generique en blockquote) |
| Schema | BlogPosting complet | Correct |
| Reading time | Affiche, auto-calcule | Correct |

### Metriques cles pour un blog SaaS B2B

| Metrique | Cible | Comment mesurer |
|----------|-------|-----------------|
| Organic traffic | +20% MoM | Google Search Console |
| Click-through rate (CTR) | > 3% | Google Search Console |
| Dwell time | > 3 min | Vercel Analytics / Contentsquare |
| Blog → Signup conversion | > 1% | Event tracking CTA clicks |
| Keyword rankings top 10 | 15+ keywords | Search Console / Ahrefs |
| Backlinks | 2-3 nouveaux/mois | Ahrefs / Search Console |
| Rich results impressions | FAQ + Review snippets | Search Console |

### Erreurs frequentes blogs SaaS B2B a eviter

1. **100% TOFU** — Le blog attire du trafic mais ne convertit jamais → ajouter MOFU/BOFU
2. **Pas de CTA contextuel** — Le lecteur finit l'article et part → chaque article doit avoir 1 CTA lie au sujet
3. **Contenu generique** — Les AI Overviews favorisent le contenu avec des entites specifiques (Federia, SNPC, regions belges) → SEIDO fait bien ici
4. **Pas de lead magnets** — Templates, checklists, calculateurs = capture email → a implementer
5. **Pas de page auteur** — E-E-A-T exige des auteurs credibles avec bio publique → a creer
6. **Negliger les images** — Articles 100% texte = engagement faible → ajouter infographies, captures d'ecran, schemas
7. **Pas de republication** — Les meilleurs articles doivent etre mis a jour et republies tous les 6 mois → utiliser `updated_at`
8. **Ignorer les featured snippets** — Structurer les articles en listes, tableaux, definitions pour capter les positions 0

---

## Metriques de suivi

| Metrique | Outil | Cible |
|----------|-------|-------|
| Core Web Vitals (LCP, CLS, INP) | PageSpeed Insights | LCP < 2.5s, CLS < 0.1 |
| SEO score landing | Lighthouse | > 95 |
| SEO score blog | Lighthouse | > 90 |
| Rich results | Google Search Console | FAQ + Review snippets |
| Blog traffic | Vercel Analytics | +20% MoM |
| Blog → Signup | Event tracking | > 1% conversion |
| RSS subscribers | Feed analytics | Baseline |
| Keyword rankings | Search Console | 15+ top 10 |

---

*Score actuel : **75/100** — Potentiel apres completion P2 + strategie BOFU : **~90/100***

*Prochaine revue prevue : semaine du 2026-03-17*
