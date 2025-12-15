# Documentation QA - SEIDO

> **Version** : 1.1
> **Dernière mise à jour** : 2025-12-15
> **Statut** : Complet et vérifié

---

## Vue d'ensemble

Ce dossier contient la documentation complète pour les tests QA (Quality Assurance) de l'application SEIDO, une plateforme de gestion immobilière multi-rôles.

### Statistiques de l'Application

| Métrique | Valeur |
|----------|--------|
| Pages/Écrans | 63 |
| Routes API | 91 |
| Composants | 333+ |
| Rôles utilisateur | 5 |
| Workflows E2E | 15+ |

### Rôles Testés

| Rôle | % Utilisateurs | Focus |
|------|----------------|-------|
| Gestionnaire | 70% | Dashboard, interventions, gestion biens |
| Prestataire | 15% | Planning, devis, mobile-first |
| Locataire | 8% | Demandes, suivi, simplicité |
| Proprietaire | 5% | Consultation patrimoine (lecture seule) |
| Admin | 2% | Système, monitoring |

---

## Structure des Fichiers

```
docs/testing/QA/
├── README.md                        # Ce fichier
├── 00-plan-test-qa-complet.md       # Index et méthodologie
├── 01-checklist-fonctionnel.md      # Tests fonctionnels (63 pages)
├── 02-checklist-design-system.md    # Cohérence visuelle
├── 03-checklist-accessibilite.md    # WCAG 2.1 AA
├── 04-checklist-securite.md         # OWASP Top 10
├── 05-checklist-performance.md      # Core Web Vitals
├── 06-parcours-gestionnaire.md      # E2E Gestionnaire (101 étapes)
├── 07-parcours-prestataire.md       # E2E Prestataire (76 étapes)
├── 08-parcours-locataire.md         # E2E Locataire (76 étapes)
├── 09-template-bug-report.md        # Template rapport de bug
└── 10-parcours-proprietaire.md      # E2E Proprietaire (77 étapes)
```

---

## Description des Fichiers

### Index et Méthodologie

| Fichier | Description |
|---------|-------------|
| **00-plan-test-qa-complet.md** | Document principal avec méthodologie (ISO 29119, ISTQB), inventaire application, critères d'acceptation, workflow de test recommandé |

### Checklists Thématiques

| Fichier | Contenu | Standards |
|---------|---------|-----------|
| **01-checklist-fonctionnel.md** | Tests exhaustifs pour les 63 pages, organisés par rôle | - |
| **02-checklist-design-system.md** | Vérification couleurs OKLCH, typographie, spacing, composants shadcn/ui | Design System SEIDO |
| **03-checklist-accessibilite.md** | Tests d'accessibilité : contraste, navigation clavier, screen readers | WCAG 2.1 AA |
| **04-checklist-securite.md** | Tests de sécurité : injection, auth, RLS, headers | OWASP Top 10 |
| **05-checklist-performance.md** | Métriques de performance : LCP, INP, CLS, Lighthouse | Core Web Vitals |

### Parcours E2E par Rôle

| Fichier | Rôle | Étapes | Priorité |
|---------|------|--------|----------|
| **06-parcours-gestionnaire.md** | Gestionnaire | 101 | P1 - Critique |
| **07-parcours-prestataire.md** | Prestataire | 76 | P2 - Important |
| **08-parcours-locataire.md** | Locataire | 76 | P2 - Important |
| **10-parcours-proprietaire.md** | Proprietaire | 77 | P3 - Important |

### Outils

| Fichier | Usage |
|---------|-------|
| **09-template-bug-report.md** | Template standardisé pour rapporter les bugs (sévérité, reproduction, environnement) |

---

## Comment Utiliser cette Documentation

### 1. Ordre de Test Recommandé

```
1. Smoke Test (15 min)
   └── Login fonctionne, navigation OK, pas d'erreurs critiques

2. Tests Fonctionnels (2-3h par rôle)
   └── Utiliser 01-checklist-fonctionnel.md

3. Parcours E2E (1-2h par rôle)
   └── Suivre 06/07/08/10-parcours-*.md

4. Design System (1-2h)
   └── Utiliser 02-checklist-design-system.md

5. Accessibilité (1h)
   └── Utiliser 03-checklist-accessibilite.md

6. Performance (30min)
   └── Utiliser 05-checklist-performance.md

7. Sécurité (30min)
   └── Utiliser 04-checklist-securite.md
```

### 2. Notation des Tests

| Symbole | Signification |
|---------|---------------|
| ☐ | Non testé |
| ✅ | OK - Passe |
| ❌ | Bug - Échec |
| ⚠️ | À améliorer |
| ⏭️ | Non applicable |

### 3. Rapporter un Bug

1. Ouvrir `09-template-bug-report.md`
2. Copier le template
3. Remplir toutes les sections
4. Ajouter screenshots/vidéos
5. Assigner une sévérité :
   - 🔴 **Critical** : Bloquant, perte de données
   - 🟠 **Major** : Fonctionnalité principale KO
   - 🟡 **Minor** : Fonctionnalité secondaire ou workaround existe
   - 🟢 **Trivial** : Cosmétique, typo

---

## Environnements de Test

| Environnement | URL | Usage |
|---------------|-----|-------|
| Local | `localhost:3000` | Développement |
| Preview | `preview.seido.app` | QA |
| Production | `app.seido.app` | Validation finale |

## Navigateurs à Tester

| Navigateur | Priorité |
|------------|----------|
| Chrome Desktop | P1 |
| Safari iOS | P1 |
| Chrome Mobile | P1 |
| Firefox | P2 |
| Safari Desktop | P2 |
| Edge | P3 |

## Viewports Critiques

| Device | Largeur | Priorité |
|--------|---------|----------|
| Mobile M | 375px | P1 |
| Tablet | 768px | P1 |
| Laptop | 1024px | P1 |
| Desktop | 1440px | P1 |

---

## Critères d'Acceptation Globaux

### Performance (Core Web Vitals)

| Métrique | Cible |
|----------|-------|
| LCP | < 2.5s |
| INP | < 100ms |
| CLS | < 0.1 |
| Lighthouse | > 80 |

### Accessibilité

- Contraste texte minimum 4.5:1
- Navigation clavier complète
- Touch targets minimum 44px

### Sécurité

- Pas de vulnérabilités critiques (npm audit)
- RLS Supabase actif
- Headers de sécurité configurés

---

## Standards et Références

### Méthodologies QA

- [ISO/IEC/IEEE 29119](https://www.iso.org/standard/81291.html) - Software Testing Standard
- [ISTQB CTFL v4.0](https://istqb.org/) - 7 principes fondamentaux
- [Martin Fowler - Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)

### Standards Techniques

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Sécurité web
- [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibilité
- [Core Web Vitals](https://web.dev/vitals/) - Performance

### Documentation SEIDO

- `docs/design/ux-ui-decision-guide.md` - Guide UX/UI
- `docs/design/00-general.md` à `07-guidelines.md` - Design System
- `app/globals.css` - Variables CSS (source de vérité)

---

## Mise à Jour de la Documentation

Après chaque session QA, mettre à jour :

1. **Les checklists** - Cocher les items testés
2. **Les bugs trouvés** - Via template `09-template-bug-report.md`
3. **Le rapport d'audit** - `docs/rapport-audit-complet-seido.md`

---

## Historique des Versions

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 2025-12-15 | Création initiale (10 fichiers) |
| 1.1 | 2025-12-15 | Ajout rôle Proprietaire, correction comptage pages (63), ajout pages Auth manquantes |

---

**Mainteneur** : Claude Code
**Contact** : Voir repository SEIDO
