# Checklist Performance - SEIDO

> **Standard** : Core Web Vitals (Google)
> **Objectif** : Optimiser les performances pour une meilleure UX
> **Outils** : Lighthouse, WebPageTest, Chrome DevTools

---

## 1. Core Web Vitals

### 1.1 Métriques Cibles

| Métrique | Description | Bon | À améliorer | Mauvais |
|----------|-------------|-----|-------------|---------|
| **LCP** | Largest Contentful Paint | < 2.5s | 2.5-4s | > 4s |
| **INP** | Interaction to Next Paint | < 200ms | 200-500ms | > 500ms |
| **CLS** | Cumulative Layout Shift | < 0.1 | 0.1-0.25 | > 0.25 |

### 1.2 Mesures Actuelles

| Page | LCP | INP | CLS | Status |
|------|-----|-----|-----|--------|
| `/` | s | ms | | ☐ |
| `/auth/login` | s | ms | | ☐ |
| `/gestionnaire/dashboard` | s | ms | | ☐ |
| `/gestionnaire/biens` | s | ms | | ☐ |
| `/gestionnaire/interventions` | s | ms | | ☐ |
| `/gestionnaire/interventions/[id]` | s | ms | | ☐ |
| `/prestataire/dashboard` | s | ms | | ☐ |
| `/locataire/dashboard` | s | ms | | ☐ |

---

## 2. Lighthouse Scores

### 2.1 Cibles

| Catégorie | Cible | Minimum |
|-----------|-------|---------|
| Performance | ≥ 90 | ≥ 80 |
| Accessibility | ≥ 90 | ≥ 90 |
| Best Practices | ≥ 90 | ≥ 80 |
| SEO | ≥ 90 | ≥ 80 |

### 2.2 Scores par Page

Exécuter Lighthouse en mode Mobile (throttling 4G) :

| Page | Perf | A11y | BP | SEO | Status |
|------|------|------|-----|-----|--------|
| `/` | /100 | /100 | /100 | /100 | ☐ |
| `/auth/login` | /100 | /100 | /100 | /100 | ☐ |
| `/gestionnaire/dashboard` | /100 | /100 | /100 | /100 | ☐ |
| `/gestionnaire/biens` | /100 | /100 | /100 | /100 | ☐ |
| `/gestionnaire/interventions` | /100 | /100 | /100 | /100 | ☐ |
| `/prestataire/dashboard` | /100 | /100 | /100 | /100 | ☐ |
| `/locataire/dashboard` | /100 | /100 | /100 | /100 | ☐ |

---

## 3. Optimisations Images

### 3.1 Checklist Images

| # | Test | Status | Notes |
|---|------|--------|-------|
| 3.1.1 | Images en format moderne (WebP, AVIF) | ☐ | |
| 3.1.2 | Images dimensionnées correctement | ☐ | |
| 3.1.3 | Lazy loading sur images below the fold | ☐ | |
| 3.1.4 | Attributs `width` et `height` définis | ☐ | |
| 3.1.5 | Images responsive (`srcset`) | ☐ | |
| 3.1.6 | Compression appliquée | ☐ | |
| 3.1.7 | CDN utilisé pour images | ☐ | |
| 3.1.8 | `priority` sur LCP image | ☐ | |

### 3.2 Next.js Image Optimization

| # | Test | Status |
|---|------|--------|
| 3.2.1 | Utilisation de `next/image` | ☐ |
| 3.2.2 | Configuration `images.domains` | ☐ |
| 3.2.3 | Placeholder blur pour grandes images | ☐ |

---

## 4. JavaScript Bundle

### 4.1 Analyse du Bundle

Exécuter :
```bash
npm run build
# Vérifier la taille dans .next/analyze (si configuré)
```

| Métrique | Cible | Actuel | Status |
|----------|-------|--------|--------|
| First Load JS | < 100KB | KB | ☐ |
| Total Bundle | < 300KB | KB | ☐ |
| Largest Chunk | < 50KB | KB | ☐ |

### 4.2 Checklist JavaScript

| # | Test | Status | Notes |
|---|------|--------|-------|
| 4.2.1 | Code splitting par route | ☐ | |
| 4.2.2 | Dynamic imports pour gros composants | ☐ | |
| 4.2.3 | Tree shaking actif | ☐ | |
| 4.2.4 | Pas de dépendances inutilisées | ☐ | |
| 4.2.5 | Minification en production | ☐ | |
| 4.2.6 | Source maps désactivées en prod | ☐ | |

### 4.3 Imports à Vérifier

| Pattern | Problème | Solution |
|---------|----------|----------|
| `import _ from 'lodash'` | Bundle entier | `import debounce from 'lodash/debounce'` |
| `import * as Icons from 'lucide-react'` | Toutes icônes | `import { Home } from 'lucide-react'` |
| `import moment from 'moment'` | Lourd (300KB) | `date-fns` ou natif |

---

## 5. CSS Performance

### 5.1 Checklist CSS

| # | Test | Status | Notes |
|---|------|--------|-------|
| 5.1.1 | Tailwind purgé en production | ☐ | |
| 5.1.2 | CSS critique inline | ☐ | |
| 5.1.3 | Pas de CSS inutilisé | ☐ | |
| 5.1.4 | Éviter @import (préférer link) | ☐ | |
| 5.1.5 | Fonts préchargées | ☐ | |

### 5.2 Fonts

| # | Test | Status |
|---|------|--------|
| 5.2.1 | `next/font` utilisé | ☐ |
| 5.2.2 | Font display: swap | ☐ |
| 5.2.3 | Subset de caractères | ☐ |
| 5.2.4 | Préconnexion aux fonts | ☐ |

---

## 6. Server Performance

### 6.1 Time to First Byte (TTFB)

| Page | TTFB Cible | Actuel | Status |
|------|------------|--------|--------|
| `/` | < 200ms | ms | ☐ |
| `/gestionnaire/dashboard` | < 500ms | ms | ☐ |
| `/gestionnaire/interventions` | < 500ms | ms | ☐ |

### 6.2 Checklist Server

| # | Test | Status | Notes |
|---|------|--------|-------|
| 6.2.1 | Server Components utilisés | ☐ | |
| 6.2.2 | Streaming activé | ☐ | |
| 6.2.3 | Cache headers configurés | ☐ | |
| 6.2.4 | Static generation quand possible | ☐ | |
| 6.2.5 | ISR configuré si applicable | ☐ | |
| 6.2.6 | Edge runtime pour API rapides | ☐ | |

---

## 7. Caching

### 7.1 Browser Cache

| Ressource | Cache-Control | Status |
|-----------|---------------|--------|
| Images statiques | `max-age=31536000, immutable` | ☐ |
| JS/CSS bundles | `max-age=31536000, immutable` | ☐ |
| HTML pages | `no-cache` ou court | ☐ |
| API responses | Selon besoin | ☐ |

### 7.2 Application Cache

| # | Test | Status |
|---|------|--------|
| 7.2.1 | React Query/SWR pour data fetching | ☐ |
| 7.2.2 | Stale-while-revalidate pattern | ☐ |
| 7.2.3 | unstable_cache Next.js | ☐ |
| 7.2.4 | Redis cache (si applicable) | ☐ |

---

## 8. Database Queries

### 8.1 Checklist DB

| # | Test | Status | Notes |
|---|------|--------|-------|
| 8.1.1 | N+1 queries évitées | ☐ | |
| 8.1.2 | Index sur colonnes fréquentes | ☐ | |
| 8.1.3 | Pagination sur grandes listes | ☐ | |
| 8.1.4 | Select uniquement colonnes nécessaires | ☐ | |
| 8.1.5 | Requêtes parallèles quand possible | ☐ | |
| 8.1.6 | Connection pooling | ☐ | |

### 8.2 Queries à Surveiller

| Route | Query Time Cible | Actuel | Status |
|-------|------------------|--------|--------|
| Dashboard stats | < 100ms | ms | ☐ |
| Liste biens | < 200ms | ms | ☐ |
| Liste interventions | < 200ms | ms | ☐ |
| Détail intervention | < 100ms | ms | ☐ |

---

## 9. Network

### 9.1 Checklist Network

| # | Test | Status |
|---|------|--------|
| 9.1.1 | Compression GZIP/Brotli activée | ☐ |
| 9.1.2 | HTTP/2 ou HTTP/3 | ☐ |
| 9.1.3 | CDN pour assets statiques | ☐ |
| 9.1.4 | Preconnect aux domaines tiers | ☐ |
| 9.1.5 | DNS prefetch | ☐ |

### 9.2 Requêtes

| # | Test | Status |
|---|------|--------|
| 9.2.1 | Nombre de requêtes initial < 50 | ☐ |
| 9.2.2 | Pas de requêtes bloquantes inutiles | ☐ |
| 9.2.3 | Waterfall optimisé | ☐ |

---

## 10. Tests de Charge (Optionnel)

### 10.1 Scénarios

| Scénario | Users | Duration | Status |
|----------|-------|----------|--------|
| Smoke | 10 | 1min | ☐ |
| Load | 100 | 5min | ☐ |
| Stress | 500 | 10min | ☐ |

### 10.2 Métriques à Surveiller

| Métrique | Seuil | Status |
|----------|-------|--------|
| Response time p95 | < 1s | ☐ |
| Error rate | < 1% | ☐ |
| Throughput | > 100 req/s | ☐ |

---

## 11. Mobile Performance

### 11.1 Simulation 3G

Lighthouse avec throttling "Slow 4G" :

| Page | LCP | INP | Score | Status |
|------|-----|-----|-------|--------|
| `/gestionnaire/dashboard` | s | ms | /100 | ☐ |
| `/gestionnaire/interventions` | s | ms | /100 | ☐ |

### 11.2 Checklist Mobile

| # | Test | Status |
|---|------|--------|
| 11.2.1 | Touch response < 100ms | ☐ |
| 11.2.2 | Scroll fluide (60fps) | ☐ |
| 11.2.3 | Pas de layout shift au scroll | ☐ |
| 11.2.4 | Keyboard ne cause pas de reflow | ☐ |

---

## 12. Outils de Mesure

### 12.1 Commandes Utiles

```bash
# Lighthouse CLI
npx lighthouse https://localhost:3000 --view

# Bundle analyzer
ANALYZE=true npm run build

# Web Vitals en dev
# Ajouter dans pages/_app.tsx :
export function reportWebVitals(metric) {
  console.log(metric)
}
```

### 12.2 Extensions Chrome

- Lighthouse
- Web Vitals
- Performance Insights
- Coverage (DevTools)

### 12.3 Services en Ligne

- [PageSpeed Insights](https://pagespeed.web.dev/)
- [WebPageTest](https://www.webpagetest.org/)
- [GTmetrix](https://gtmetrix.com/)

---

## Résumé Performance

| Page | Lighthouse | LCP | INP | CLS | Status |
|------|------------|-----|-----|-----|--------|
| Landing | /100 | s | ms | | ☐ |
| Login | /100 | s | ms | | ☐ |
| Dashboard Gestionnaire | /100 | s | ms | | ☐ |
| Liste Interventions | /100 | s | ms | | ☐ |
| Détail Intervention | /100 | s | ms | | ☐ |
| Dashboard Prestataire | /100 | s | ms | | ☐ |
| Dashboard Locataire | /100 | s | ms | | ☐ |

**Score Global Moyen** : _____/100

---

**Testeur** : _________________
**Date** : _________________
**Environnement** : ☐ Local / ☐ Preview / ☐ Production
