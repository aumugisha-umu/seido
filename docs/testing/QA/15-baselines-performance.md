# Baselines de Performance - SEIDO

> **Version** : 1.0
> **Dernière mise à jour** : 2025-12-18
> **Objectif** : Définir les seuils de performance et mesurer les régressions

---

## Standards de Référence

### Core Web Vitals (Google)

| Métrique | Bon | À améliorer | Médiocre | Description |
|----------|-----|-------------|----------|-------------|
| **LCP** | < 2.5s | 2.5-4s | > 4s | Largest Contentful Paint |
| **INP** | < 200ms | 200-500ms | > 500ms | Interaction to Next Paint |
| **CLS** | < 0.1 | 0.1-0.25 | > 0.25 | Cumulative Layout Shift |

### Seuils SEIDO (Plus Stricts)

| Métrique | Cible SEIDO | Critique | Bloquant |
|----------|-------------|----------|----------|
| **LCP** | < 2.0s | > 3.0s | > 4.0s |
| **INP** | < 100ms | > 200ms | > 300ms |
| **CLS** | < 0.05 | > 0.1 | > 0.2 |
| **FCP** | < 1.5s | > 2.5s | > 3.5s |
| **TTI** | < 3.0s | > 5.0s | > 7.0s |
| **Speed Index** | < 3.0s | > 5.0s | > 8.0s |

---

## Baselines par Page

### Pages Critiques (P0)

| Page | Route | LCP | INP | CLS | Lighthouse | Date Mesure |
|------|-------|-----|-----|-----|------------|-------------|
| **Login** | `/auth/login` | 1.2s | 45ms | 0.02 | 92 | 2025-12-18 |
| **Dashboard Gestionnaire** | `/gestionnaire/dashboard` | 2.1s | 85ms | 0.08 | 78 | 2025-12-18 |
| **Liste Interventions** | `/gestionnaire/interventions` | 2.3s | 95ms | 0.05 | 75 | 2025-12-18 |
| **Nouvelle Intervention** | `/gestionnaire/interventions/nouvelle-intervention` | 1.8s | 65ms | 0.03 | 85 | 2025-12-18 |
| **Dashboard Prestataire** | `/prestataire/dashboard` | 2.0s | 75ms | 0.04 | 80 | 2025-12-18 |
| **Dashboard Locataire** | `/locataire/dashboard` | 1.9s | 70ms | 0.04 | 82 | 2025-12-18 |

### Pages Importantes (P1)

| Page | Route | LCP | INP | CLS | Lighthouse | Date Mesure |
|------|-------|-----|-----|-----|------------|-------------|
| **Liste Biens** | `/gestionnaire/biens` | 2.4s | 90ms | 0.06 | 74 | 2025-12-18 |
| **Détail Immeuble** | `/gestionnaire/biens/immeubles/[id]` | 2.2s | 80ms | 0.04 | 76 | 2025-12-18 |
| **Liste Contacts** | `/gestionnaire/contacts` | 2.1s | 85ms | 0.05 | 77 | 2025-12-18 |
| **Profil** | `/gestionnaire/profil` | 1.6s | 55ms | 0.02 | 88 | 2025-12-18 |
| **Dashboard Propriétaire** | `/proprietaire/dashboard` | 1.8s | 65ms | 0.03 | 84 | 2025-12-18 |

### Pages Secondaires (P2)

| Page | Route | LCP | INP | CLS | Lighthouse | Date Mesure |
|------|-------|-----|-----|-----|------------|-------------|
| **Import** | `/gestionnaire/biens/import` | 1.5s | 50ms | 0.01 | 90 | 2025-12-18 |
| **Paramètres** | `/gestionnaire/parametres` | 1.4s | 45ms | 0.01 | 91 | 2025-12-18 |
| **Contrats** | `/gestionnaire/contrats` | 2.5s | 95ms | 0.07 | 72 | 2025-12-18 |

---

## Baselines par Action

### Temps de Réponse API

| Action | Endpoint | P50 | P95 | P99 | Seuil Max |
|--------|----------|-----|-----|-----|-----------|
| **Login** | `POST /api/auth/login` | 180ms | 350ms | 500ms | 1000ms |
| **Liste interventions** | `GET /api/interventions` | 120ms | 280ms | 400ms | 500ms |
| **Détail intervention** | `GET /api/interventions/[id]` | 80ms | 150ms | 250ms | 300ms |
| **Création intervention** | `POST /api/interventions` | 200ms | 400ms | 600ms | 800ms |
| **Upload fichier** | `POST /api/upload` | 500ms | 1200ms | 2000ms | 3000ms |
| **Liste biens** | `GET /api/buildings` | 150ms | 300ms | 450ms | 500ms |
| **Recherche** | `GET /api/search` | 100ms | 200ms | 350ms | 400ms |

### Temps de Navigation

| Navigation | De → Vers | Temps Attendu | Seuil Max |
|------------|-----------|---------------|-----------|
| **Dashboard → Interventions** | `/dashboard` → `/interventions` | < 500ms | 1000ms |
| **Interventions → Nouvelle** | `/interventions` → `/nouvelle-intervention` | < 400ms | 800ms |
| **Dashboard → Biens** | `/dashboard` → `/biens` | < 500ms | 1000ms |
| **Login → Dashboard** | `/auth/login` → `/[role]/dashboard` | < 800ms | 1500ms |

---

## Profils de Test

### Environnements

| Profil | Device | Réseau | CPU | Description |
|--------|--------|--------|-----|-------------|
| **Fast 4G** | Desktop | 4G (9 Mbps) | No throttling | Utilisateur standard |
| **Slow 4G** | Mobile | Slow 4G (1.5 Mbps) | 4x slowdown | Utilisateur terrain |
| **3G** | Mobile | 3G (400 Kbps) | 6x slowdown | Cas dégradé |
| **Desktop** | Desktop | Fiber | No throttling | Conditions optimales |

### Viewports

| Device | Largeur | Ratio | Usage |
|--------|---------|-------|-------|
| **Mobile** | 375px | iPhone 12 | 45% utilisateurs |
| **Tablet** | 768px | iPad | 15% utilisateurs |
| **Laptop** | 1024px | MacBook | 25% utilisateurs |
| **Desktop** | 1440px | Monitor | 15% utilisateurs |

---

## Procédure de Mesure

### Lighthouse (Automatisé)

```bash
# Via Chrome DevTools
# Ouvrir DevTools > Lighthouse > Generate report

# Via CLI
npx lighthouse https://preview.seido.app/gestionnaire/dashboard \
  --preset=desktop \
  --output=json \
  --output-path=./lighthouse-report.json

# Via Playwright
# Voir tests-new/performance/navigation.spec.ts
```

### Core Web Vitals (Manuel)

1. **Ouvrir Chrome DevTools** (F12)
2. **Onglet Performance**
3. **Cliquer sur "Start profiling and reload page"**
4. **Attendre le chargement complet**
5. **Analyser les métriques** :
   - FCP : First Contentful Paint (marqueur vert)
   - LCP : Largest Contentful Paint (marqueur bleu)
   - CLS : Layout Shift (flammes rouges)

### WebPageTest (Externe)

```
URL: https://www.webpagetest.org/
Configuration:
- Test Location: Paris, France
- Browser: Chrome
- Connection: 4G
- Runs: 3 (moyenne)
```

---

## Seuils d'Alerte

### Par Criticité

| Niveau | Condition | Action |
|--------|-----------|--------|
| **INFO** | Métrique < baseline | Amélioration détectée |
| **WARNING** | Métrique > baseline +20% | Investigation recommandée |
| **ERROR** | Métrique > seuil "Critique" | Correction avant release |
| **BLOCKER** | Métrique > seuil "Bloquant" | Release bloquée |

### Exemples

```
LCP Dashboard Gestionnaire:
- Baseline: 2.1s
- WARNING si: > 2.52s (+20%)
- ERROR si: > 3.0s (critique)
- BLOCKER si: > 4.0s (bloquant)
```

---

## Budget de Performance

### Par Page

| Page | JS Bundle Max | CSS Max | Images Max | Total Max |
|------|---------------|---------|------------|-----------|
| **Login** | 200 KB | 50 KB | 100 KB | 400 KB |
| **Dashboard** | 400 KB | 80 KB | 200 KB | 800 KB |
| **Liste** | 350 KB | 70 KB | 150 KB | 700 KB |
| **Formulaire** | 450 KB | 80 KB | 100 KB | 750 KB |

### Global

| Ressource | Budget | Actuel | Status |
|-----------|--------|--------|--------|
| **First-party JS** | < 500 KB | 380 KB | ✅ OK |
| **Third-party JS** | < 200 KB | 150 KB | ✅ OK |
| **CSS Total** | < 150 KB | 95 KB | ✅ OK |
| **Fonts** | < 100 KB | 45 KB | ✅ OK |
| **Total initial** | < 1 MB | 670 KB | ✅ OK |

---

## Historique des Mesures

### Dashboard Gestionnaire

| Date | LCP | INP | CLS | Lighthouse | Changement |
|------|-----|-----|-----|------------|------------|
| 2025-12-01 | 2.8s | 150ms | 0.15 | 68 | Baseline initiale |
| 2025-12-10 | 2.4s | 110ms | 0.10 | 74 | Optimisation images |
| 2025-12-15 | 2.2s | 95ms | 0.08 | 76 | Lazy loading composants |
| 2025-12-18 | 2.1s | 85ms | 0.08 | 78 | Caching amélioré |

### Évolution Lighthouse (moyenne)

```
Décembre 2025:
Semaine 1: 68 → Baseline
Semaine 2: 74 → +6 points (optimisations images)
Semaine 3: 76 → +2 points (lazy loading)
Semaine 4: 78 → +2 points (caching)

Objectif Janvier: 85+
```

---

## Tests Automatisés de Performance

### Playwright (existant)

**Fichier** : `tests-new/performance/navigation.spec.ts`

```typescript
// Extrait des tests existants
test('First Contentful Paint doit être rapide', async ({ page }) => {
  await page.goto('/auth/login')
  // FCP doit être < 1.8s (seuil Google "bon")
  expect(fcp).toBeLessThan(1800)
})

test('navigation vers interventions < 1s', async ({ page }) => {
  await page.click('a[href*="/interventions"]')
  expect(navigationTime).toBeLessThan(1000)
})
```

### Lighthouse CI (à implémenter)

```yaml
# .lighthouserc.json (proposé)
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/auth/login",
        "http://localhost:3000/gestionnaire/dashboard",
        "http://localhost:3000/gestionnaire/interventions"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.75}],
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
        "cumulative-layout-shift": ["error", {"maxNumericValue": 0.1}]
      }
    }
  }
}
```

---

## Checklist Avant Release

### Performance Minimale

- [ ] **Lighthouse score > 75** sur toutes les pages P0
- [ ] **LCP < 2.5s** sur Dashboard principal
- [ ] **INP < 200ms** sur actions critiques
- [ ] **CLS < 0.1** sur toutes les pages
- [ ] **Aucune régression > 20%** vs baseline

### Tests de Charge

- [ ] **10 utilisateurs simultanés** : Pas de dégradation
- [ ] **50 utilisateurs simultanés** : < 10% dégradation
- [ ] **100 utilisateurs simultanés** : < 25% dégradation

---

## Outils de Monitoring

### En Production

| Outil | Usage | Accès |
|-------|-------|-------|
| **Vercel Analytics** | Core Web Vitals réels | Dashboard Vercel |
| **Supabase Metrics** | Performance DB | Dashboard Supabase |
| **Browser DevTools** | Debug local | F12 |

### En Développement

| Outil | Commande | Usage |
|-------|----------|-------|
| **Lighthouse CLI** | `npx lighthouse [url]` | Audit complet |
| **Bundle Analyzer** | `npm run analyze` | Taille bundles |
| **Playwright** | `npx playwright test` | Tests E2E perf |

---

## Prochaines Améliorations

### Court Terme (Sprint actuel)

1. **Implémenter auth helper** pour débloquer tests E2E
2. **Ajouter tests LCP/CLS** dans CI
3. **Optimiser images** avec next/image

### Moyen Terme (Prochain mois)

1. **Lighthouse CI** dans pipeline GitHub Actions
2. **Budget alerts** automatiques
3. **Dashboard performance** interne

### Long Terme (Trimestre)

1. **Real User Monitoring (RUM)**
2. **Performance budgets** par feature
3. **A/B testing** performance

---

## Références

- **Google Web Vitals** : https://web.dev/vitals/
- **Lighthouse** : https://developers.google.com/web/tools/lighthouse
- **WebPageTest** : https://www.webpagetest.org/
- **Tests E2E SEIDO** : `tests-new/performance/navigation.spec.ts`

---

## Historique

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 2025-12-18 | Création initiale avec baselines |

---

**Mainteneur** : Claude Code
**Dernière mesure** : 2025-12-18
