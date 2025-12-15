# Plan de Test QA Complet - SEIDO

> **Version**: 1.0
> **Date**: 2025-12-15
> **Auteur**: Claude Code
> **Statut**: Actif

---

## 1. Introduction

Ce document définit le plan de test QA complet pour l'application SEIDO, une plateforme de gestion immobilière multi-rôles. L'objectif est d'assurer la qualité, la cohérence du design, la correction des bugs, et l'optimisation des performances.

### 1.1 Objectifs du QA

1. **Harmonisation du design** - Vérifier la cohérence visuelle selon le Design System SEIDO
2. **Correction des bugs** - Identifier et documenter tous les défauts fonctionnels
3. **Optimisation** - Améliorer les performances (Core Web Vitals)
4. **Accessibilité** - Conformité WCAG 2.1 AA
5. **Sécurité** - Vérification OWASP Top 10

### 1.2 Périmètre

| Élément | Quantité |
|---------|----------|
| Pages/Écrans | 63 |
| Routes API | 91 |
| Composants | 333+ |
| Rôles utilisateur | 5 |
| Workflows E2E | 15+ |

---

## 2. Méthodologie

### 2.1 Standards Appliqués

Ce plan est basé sur les standards internationaux reconnus :

| Standard | Application |
|----------|-------------|
| **ISO/IEC/IEEE 29119** | Structure de documentation et processus de test |
| **ISTQB CTFL v4.0** | 7 principes fondamentaux du testing |
| **OWASP Top 10** | Tests de sécurité web |
| **WCAG 2.1 AA** | Tests d'accessibilité |
| **Google Test Pyramid** | Distribution des types de tests |

### 2.2 Les 7 Principes ISTQB

1. **Le testing montre la présence de défauts** - Pas leur absence
2. **Le testing exhaustif est impossible** - Prioriser par risque
3. **Tester tôt (shift-left)** - Intégrer les tests dès le développement
4. **Les défauts se regroupent** - 80% des bugs dans 20% du code
5. **Paradoxe du pesticide** - Varier les tests pour trouver de nouveaux bugs
6. **Le testing est contextuel** - Adapter selon le type d'application
7. **L'illusion de l'absence d'erreurs** - Un logiciel sans bug peut être inutilisable

### 2.3 Test Pyramid

Distribution recommandée des tests :

```
           ┌──────────┐
           │   E2E    │  10% - Parcours critiques uniquement
           │  Tests   │       (lent, coûteux, fragile)
           ├──────────┤
           │Integration│  20% - API, services, workflows
           │  Tests   │       (moyen, fiable)
           ├──────────┤
           │          │
           │  Unit    │  70% - Composants, fonctions, logique
           │  Tests   │       (rapide, stable, nombreux)
           └──────────┘
```

**Sources** :
- [Martin Fowler - Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Google Testing Blog](https://testing.googleblog.com/)

---

## 3. Inventaire de l'Application

### 3.1 Rôles Utilisateur

| Rôle | % Utilisateurs | Focus UX |
|------|----------------|----------|
| **Gestionnaire** | 70% | Dashboard, interventions, gestion biens |
| **Prestataire** | 15% | Planning, devis, mobile-first |
| **Locataire** | 8% | Demandes, suivi, simplicité |
| **Proprietaire** | 5% | Consultation biens, suivi interventions (lecture seule) |
| **Admin** | 2% | Système, monitoring, densité info |

### 3.2 Pages par Rôle

#### Pages Publiques/Auth (14)
- Landing page `/`
- Auth : login, signup, signup-success, reset-password, confirm, callback, logout, beta-thank-you, unauthorized, update-password, set-password, error
- Legal : terms, privacy

#### Gestionnaire (27 pages)
- Dashboard
- Biens : liste, immeubles (nouveau, détail, modifier), lots (nouveau, détail, modifier)
- Contacts : liste, nouveau, détail, modifier, sociétés (détail, modifier)
- Contrats : liste, nouveau, détail, modifier
- Interventions : liste, nouvelle, détail
- Mail, Notifications, Paramètres (général, emails), Profile

#### Prestataire (5 pages)
- Dashboard, Interventions détail, Notifications, Paramètres, Profile

#### Locataire (8 pages)
- Dashboard, Interventions (liste, nouvelle, new, détail), Notifications, Paramètres, Profile

#### Proprietaire (3 pages)
- Dashboard, Biens (lecture seule), Interventions (lecture seule)

#### Admin (4 pages)
- Dashboard, Notifications, Paramètres, Profile

### 3.3 Workflows Critiques

| # | Workflow | Complexité | Priorité |
|---|----------|------------|----------|
| 1 | Création intervention complète | Haute | P1 |
| 2 | Cycle de vie devis | Haute | P1 |
| 3 | Planification intervention | Haute | P1 |
| 4 | Clôture intervention | Moyenne | P1 |
| 5 | Création bien (immeuble + lots) | Moyenne | P2 |
| 6 | Gestion contacts | Moyenne | P2 |
| 7 | Création contrat | Moyenne | P2 |
| 8 | Demande intervention locataire | Basse | P2 |
| 9 | Soumission devis prestataire | Moyenne | P2 |
| 10 | Validation travaux | Basse | P3 |

---

## 4. Critères d'Acceptation

### 4.1 Performance (Core Web Vitals)

| Métrique | Cible | Actuel | Statut |
|----------|-------|--------|--------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 5.1s | ❌ À améliorer |
| **INP** (Interaction to Next Paint) | < 100ms | ~300ms | ❌ À améliorer |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.25 | ❌ À améliorer |
| **TTI** (Time to Interactive) | < 3s | 8.5s | ❌ À améliorer |
| **Lighthouse Score** | > 80 | TBD | ⏳ À mesurer |

### 4.2 Accessibilité (WCAG 2.1 AA)

- [ ] Contraste texte minimum 4.5:1
- [ ] Navigation clavier complète
- [ ] Focus visible sur tous les éléments interactifs
- [ ] Labels sur tous les champs de formulaire
- [ ] Touch targets minimum 44x44px sur mobile
- [ ] Alt text sur toutes les images significatives

### 4.3 Sécurité (OWASP Top 10)

- [ ] Protection contre injection SQL/XSS
- [ ] Authentification robuste (sessions, tokens)
- [ ] Données sensibles chiffrées
- [ ] Contrôle d'accès (RLS Supabase)
- [ ] Headers de sécurité configurés
- [ ] npm audit sans vulnérabilités critiques

### 4.4 Design System

- [ ] Couleurs exclusivement via CSS variables OKLCH
- [ ] Typographie hiérarchique respectée
- [ ] Spacing sur grille 4px (Tailwind tokens)
- [ ] Composants shadcn/ui utilisés
- [ ] Responsive : mobile, tablet, desktop

---

## 5. Workflow de Test Recommandé

### 5.1 Ordre de Test

1. **Smoke Test** (15 min)
   - Login fonctionne
   - Navigation principale accessible
   - Pas d'erreurs console critiques

2. **Tests Fonctionnels** (2-3h par rôle)
   - Parcourir chaque page
   - Tester chaque action
   - Vérifier les états vides/erreur

3. **Tests Design System** (1-2h)
   - Cohérence couleurs
   - Typographie
   - Spacing
   - Responsive

4. **Tests Accessibilité** (1h)
   - Navigation clavier
   - Contraste
   - Screen reader (optionnel)

5. **Tests Performance** (30min)
   - Lighthouse
   - Core Web Vitals

6. **Tests Sécurité** (30min)
   - Vérifications basiques
   - npm audit

### 5.2 Environnements de Test

| Environnement | URL | Usage |
|---------------|-----|-------|
| Local | `localhost:3000` | Développement |
| Preview | `preview.seido.app` | QA |
| Production | `app.seido.app` | Validation finale |

### 5.3 Navigateurs à Tester

| Navigateur | Version | Priorité |
|------------|---------|----------|
| Chrome | Latest | P1 |
| Firefox | Latest | P2 |
| Safari | Latest | P2 |
| Edge | Latest | P3 |
| Mobile Safari | iOS 15+ | P1 |
| Chrome Mobile | Android 10+ | P1 |

### 5.4 Viewports à Tester

| Device | Largeur | Priorité |
|--------|---------|----------|
| Mobile S | 320px | P2 |
| Mobile M | 375px | P1 |
| Mobile L | 425px | P2 |
| Tablet | 768px | P1 |
| Laptop | 1024px | P1 |
| Desktop | 1440px | P1 |
| Large | 1920px | P2 |

---

## 6. Index des Documents QA

| Fichier | Description | Lignes |
|---------|-------------|--------|
| `00-plan-test-qa-complet.md` | Ce document - Index et méthodologie | ~300 |
| `01-checklist-fonctionnel.md` | Checklist exhaustive par page | ~600 |
| `02-checklist-design-system.md` | Vérification cohérence visuelle | ~400 |
| `03-checklist-accessibilite.md` | WCAG 2.1 AA compliance | ~250 |
| `04-checklist-securite.md` | OWASP Top 10 | ~200 |
| `05-checklist-performance.md` | Core Web Vitals | ~200 |
| `06-parcours-gestionnaire.md` | Scénarios E2E Gestionnaire | ~400 |
| `07-parcours-prestataire.md` | Scénarios E2E Prestataire | ~250 |
| `08-parcours-locataire.md` | Scénarios E2E Locataire | ~200 |
| `09-template-bug-report.md` | Template rapport de bug | ~100 |
| `10-parcours-proprietaire.md` | Scénarios E2E Proprietaire | ~150 |

---

## 7. Références

### Standards
- [ISO/IEC/IEEE 29119](https://www.iso.org/standard/81291.html) - Software Testing Standard
- [ISTQB](https://istqb.org/) - International Software Testing Qualifications Board
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Web Security Risks
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/) - Web Content Accessibility Guidelines

### Ressources Industrie
- [Martin Fowler - Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Google Testing Blog](https://testing.googleblog.com/)
- [BrowserStack QA Best Practices](https://www.browserstack.com/guide/qa-best-practices)

### Documentation SEIDO
- `docs/design/ux-ui-decision-guide.md` - Guide UX/UI
- `docs/design/00-general.md` à `07-guidelines.md` - Design System
- `app/globals.css` - Variables CSS source de vérité

---

## 8. Tracking & Reporting

### 8.1 Métriques à Suivre

| Métrique | Description |
|----------|-------------|
| Bugs trouvés | Total par sévérité |
| Bugs corrigés | Total et % |
| Couverture | Pages testées / Total |
| Score Lighthouse | Performance, Accessibility, SEO |
| Temps de test | Par module |

### 8.2 Rapports

Mettre à jour après chaque session QA :
- `docs/rapport-audit-complet-seido.md` (existant)

---

**Dernière mise à jour** : 2025-12-15
