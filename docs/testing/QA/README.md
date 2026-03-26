# Documentation QA - SEIDO

> **Version** : 2.3
> **Dernière mise à jour** : 2025-12-18
> **Statut** : Documentation complète avec 100% couverture features (PWA, Email, Real-time), 157+ cas négatifs, matrice traçabilité

---

## Vue d'ensemble

Ce dossier contient la documentation complète pour les tests QA (Quality Assurance) de l'application SEIDO, une plateforme de gestion immobilière multi-rôles.

### Nouveautés v2.3

- **Checklist PWA** : 44 tests installation, offline, cache (18-checklist-pwa.md)
- **Parcours Email E2E** : 32 scénarios Gherkin inbox/folders/real-time (19-parcours-email.md)
- **Checklist Real-time** : 74 tests chat, notifications, WebSocket (20-checklist-realtime.md)
- **Matrice Traçabilité** : 45 exigences liées aux tests (21-matrice-tracabilite.md)
- **Sections Enrichies** : Prestataire (32 tests), Locataire (28 tests) dans checklist fonctionnel
- **Guide Troubleshooting** : Section problèmes fréquents dans README
- **Cas Négatifs Notifications** : 12 nouveaux cas (total: 157)

### Nouveautés v2.2

- **Parcours Admin E2E** : 28 scénarios Gherkin pour le rôle Admin (gestion utilisateurs, impersonation)
- **Tests Import Excel/CSV** : Section complète avec 11 tests et cas négatifs
- **Tests RLS Multi-Tenant** : 40+ tests d'isolation sécurité (Team A/B, locataire, prestataire)
- **Cas Négatifs Enrichis** : Devis workflow (12 cas), double booking (12 cas), upload sécurité (20 cas)
- **Tests Contrats Détaillés** : CRUD complet avec critères d'acceptation (~50 tests)

### Nouveautés v2.1

- **Matrice de couverture** : Visualisation des tests automatisés vs manuels par fonctionnalité
- **Catalogue de cas négatifs** : ~145 scénarios d'erreur documentés
- **Baselines de performance** : Seuils Core Web Vitals par page
- **Checklist de régression rapide** : 20 tests critiques (~30 min)

### Nouveautés v2.0

- **Templates standardisés** pour créer de nouveaux tests
- **Guide des données de test** avec comptes et fixtures
- **Glossaire terminologique** unifiant code et UI
- **Critères d'acceptation détaillés** pour chaque test
- **Format hybride** : Gherkin (E2E) + Checklists (fonctionnel)
- **Parcours E2E enrichis** : Format Gherkin avec ~166 scenarios

### Statistiques de l'Application

| Métrique | Valeur |
|----------|--------|
| Pages/Écrans | 70+ |
| Routes API | 94 |
| Composants | 340+ |
| Rôles utilisateur | 5 |
| Workflows E2E | 17+ |
| Scenarios Gherkin | ~226 |
| Cas Négatifs | ~157 |
| Tests documentés | ~750+ |

### Rôles Testés

| Rôle | % Utilisateurs | Focus |
|------|----------------|-------|
| Gestionnaire | 70% | Dashboard, interventions, gestion biens |
| Prestataire | 15% | Planning, devis, mobile-first |
| Locataire | 8% | Demandes, suivi, simplicité |
| Propriétaire | 5% | Consultation patrimoine (lecture seule) |
| Admin | 2% | Système, monitoring |

---

## Structure des Fichiers

```
docs/testing/QA/
├── README.md                          # Ce fichier (index)
│
├── 📋 MÉTHODOLOGIE
│   └── 00-plan-test-qa-complet.md     # Plan de test, méthodologie ISO/ISTQB
│
├── ✅ CHECKLISTS THÉMATIQUES
│   ├── 01-checklist-fonctionnel.md    # Tests fonctionnels (65 pages) [v2.0 enrichie]
│   ├── 02-checklist-design-system.md  # Cohérence visuelle, Design System
│   ├── 03-checklist-accessibilite.md  # WCAG 2.1 AA
│   ├── 04-checklist-securite.md       # OWASP Top 10, RLS
│   └── 05-checklist-performance.md    # Core Web Vitals, Lighthouse
│
├── 🎭 PARCOURS E2E (par rôle) - Format Gherkin [v2.0+]
│   ├── 06-parcours-gestionnaire.md    # E2E Gestionnaire (48 scenarios)
│   ├── 07-parcours-prestataire.md     # E2E Prestataire (47 scenarios)
│   ├── 08-parcours-locataire.md       # E2E Locataire (39 scenarios)
│   ├── 10-parcours-proprietaire.md    # E2E Proprietaire (32 scenarios)
│   ├── 17-parcours-admin.md           # E2E Admin (28 scenarios) [v2.2]
│   └── 19-parcours-email.md           # E2E Email/Mail (32 scenarios) [NOUVEAU v2.3]
│
├── 📝 TEMPLATES [v2.0]
│   └── templates/
│       ├── test-case-template.md      # Template générique
│       ├── test-case-e2e.md           # Template Gherkin (Given-When-Then)
│       └── test-case-fonctionnel.md   # Template checklist simple
│
├── 📚 RÉFÉRENCES [v2.0]
│   ├── 11-donnees-test.md             # Comptes de test, données fixtures
│   └── 12-glossaire.md                # Terminologie, statuts, mapping code↔UI
│
├── 📊 MÉTRIQUES & COUVERTURE [v2.1+]
│   ├── 13-matrice-couverture.md       # Matrice tests auto vs manuels
│   ├── 14-cas-negatifs.md             # Catalogue ~157 cas d'erreur [MAJ v2.3]
│   ├── 15-baselines-performance.md    # Seuils Core Web Vitals
│   ├── 16-regression-rapide.md        # 20 tests critiques (~30 min)
│   └── 21-matrice-tracabilite.md      # Requirements → Tests (45 exigences) [NOUVEAU v2.3]
│
├── 📱 FEATURES AVANCÉES [NOUVEAU v2.3]
│   ├── 18-checklist-pwa.md            # PWA install, offline, cache (44 tests)
│   └── 20-checklist-realtime.md       # Chat, notifications WebSocket (74 tests)
│
└── 🛠️ OUTILS
    └── 09-template-bug-report.md      # Template rapport de bug
```

---

## Guide de Démarrage Rapide

### Pour un nouveau testeur

1. **Lire le glossaire** → `12-glossaire.md`
   - Comprendre les statuts d'intervention
   - Connaître les rôles utilisateur

2. **Obtenir les comptes de test** → `11-donnees-test.md`
   - Email/password par rôle
   - Données de test disponibles

3. **Choisir la checklist appropriée** → `01-checklist-fonctionnel.md`
   - Suivre les préconditions
   - Utiliser les critères d'acceptation détaillés

### Pour créer un nouveau test

1. **Copier le template** → `templates/`
   - `test-case-e2e.md` pour parcours complets (Gherkin)
   - `test-case-fonctionnel.md` pour tests simples (Checklist)

2. **Remplir les sections**
   - Préconditions avec données exactes
   - Critères d'acceptation mesurables
   - Cas d'erreur à tester

---

## Description des Fichiers

### Documents Fondamentaux (NOUVEAU v2.0)

| Fichier | Description | Usage |
|---------|-------------|-------|
| **11-donnees-test.md** | Comptes de test, données fixtures, procédures reset | Avant chaque session |
| **12-glossaire.md** | Terminologie, statuts, mapping code↔UI | Référence constante |
| **templates/** | Templates standardisés pour nouveaux tests | Création de tests |

### Index et Méthodologie

| Fichier | Description |
|---------|-------------|
| **00-plan-test-qa-complet.md** | Document principal : méthodologie (ISO 29119, ISTQB), inventaire, critères globaux |

### Checklists Thématiques

| Fichier | Contenu | Format | Standards |
|---------|---------|--------|-----------|
| **01-checklist-fonctionnel.md** | Tests 65 pages avec critères détaillés | Checklist + Details | v2.0 enrichie |
| **02-checklist-design-system.md** | Couleurs OKLCH, typography, spacing | Checklist | Design System SEIDO |
| **03-checklist-accessibilite.md** | Contraste, clavier, screen readers | Checklist | WCAG 2.1 AA |
| **04-checklist-securite.md** | Injection, auth, RLS, headers | Checklist | OWASP Top 10 |
| **05-checklist-performance.md** | LCP, INP, CLS, Lighthouse | Checklist | Core Web Vitals |

### Parcours E2E par Rôle (Format Gherkin v2.0+)

| Fichier | Rôle | Scenarios | Format | Priorité |
|---------|------|-----------|--------|----------|
| **06-parcours-gestionnaire.md** | Gestionnaire | 48 | Gherkin + Checklist | P0 - Critique |
| **07-parcours-prestataire.md** | Prestataire | 47 | Gherkin + Checklist | P1 - Important |
| **08-parcours-locataire.md** | Locataire | 39 | Gherkin + Checklist | P1 - Important |
| **10-parcours-proprietaire.md** | Propriétaire | 32 | Gherkin + Checklist | P2 - Standard |
| **17-parcours-admin.md** | Admin | 28 | Gherkin + Checklist | P0 - Critique |
| **19-parcours-email.md** | Email/Mail | 32 | Gherkin + Checklist | P1 - Important | [NOUVEAU v2.3]

### Métriques & Couverture (v2.1+)

| Fichier | Contenu | Usage |
|---------|---------|-------|
| **13-matrice-couverture.md** | Matrice Unit/Integration/E2E/Manual par fonctionnalité | Identifier les gaps |
| **14-cas-negatifs.md** | ~157 cas d'erreur (validation, auth, réseau, sécurité, notifs) | Tests exhaustifs |
| **15-baselines-performance.md** | Seuils LCP/INP/CLS par page + historique | Détecter régressions |
| **16-regression-rapide.md** | 20 tests critiques, checklist pré-déploiement | Avant chaque release |
| **21-matrice-tracabilite.md** | 45 exigences → Tests mapping [NOUVEAU v2.3] | Vérifier couverture |

### Features Avancées (NOUVEAU v2.3)

| Fichier | Contenu | Tests | Usage |
|---------|---------|-------|-------|
| **18-checklist-pwa.md** | PWA install banner, offline, service worker, cache | 44 | Multi-plateforme |
| **20-checklist-realtime.md** | WebSocket, notifications, chat, multi-tab sync | 74 | Performance RT |

### Outils

| Fichier | Usage |
|---------|-------|
| **09-template-bug-report.md** | Template standardisé pour rapporter les bugs |

---

## Ordre de Test Recommandé

### Option A : Test Complet (Full QA)

```
1. 🚀 Régression Rapide (30 min) [NOUVEAU]
   └── Utiliser 16-regression-rapide.md (20 tests critiques)

2. ✅ Tests Fonctionnels (2-3h par rôle)
   ├── Utiliser 01-checklist-fonctionnel.md
   ├── Suivre les préconditions
   └── Vérifier les critères d'acceptation détaillés

3. 🎭 Parcours E2E (1-2h par rôle)
   ├── Gestionnaire : 06-parcours-gestionnaire.md (48 scenarios)
   ├── Admin : 17-parcours-admin.md (28 scenarios) [NOUVEAU v2.2]
   ├── Prestataire : 07-parcours-prestataire.md (47 scenarios)
   ├── Locataire : 08-parcours-locataire.md (39 scenarios)
   └── Propriétaire : 10-parcours-proprietaire.md (32 scenarios)

4. ❌ Cas Négatifs (1-2h)
   └── Utiliser 14-cas-negatifs.md (~145 cas d'erreur)

5. 🎨 Design System (1-2h)
   └── Utiliser 02-checklist-design-system.md

6. ♿ Accessibilité (1h)
   └── Utiliser 03-checklist-accessibilite.md

7. ⚡ Performance (30min)
   ├── Utiliser 05-checklist-performance.md
   └── Comparer avec 15-baselines-performance.md [NOUVEAU]

8. 🔒 Sécurité (30min)
   └── Utiliser 04-checklist-securite.md
```

### Option B : Test Rapide (Pré-Déploiement)

```
1. 🚀 Régression Rapide UNIQUEMENT (30 min)
   └── 16-regression-rapide.md → 20 tests, GO/NO-GO immédiat
```

---

## Notation des Tests

| Symbole | Signification |
|---------|---------------|
| ☐ | Non testé |
| ✅ | OK - Passe |
| ❌ | Bug - Échec |
| ⚠️ | À améliorer |
| ⏭️ | Non applicable |

---

## Rapporter un Bug

1. Ouvrir `09-template-bug-report.md`
2. Copier le template
3. Remplir toutes les sections
4. Ajouter screenshots/vidéos
5. Assigner une sévérité :

| Sévérité | Description | Exemple |
|----------|-------------|---------|
| 🔴 **Critical** | Bloquant, perte de données | Login impossible |
| 🟠 **Major** | Fonctionnalité principale KO | Création intervention échoue |
| 🟡 **Minor** | Fonctionnalité secondaire ou workaround existe | Filtre ne fonctionne pas |
| 🟢 **Trivial** | Cosmétique, typo | Faute d'orthographe |

---

## Environnements de Test

| Environnement | URL | Usage |
|---------------|-----|-------|
| Local | `localhost:3000` | Développement |
| Preview | `preview.seido-app.com` | QA |
| Production | `app.seido-app.com` | Validation finale |

## Navigateurs à Tester

| Navigateur | Priorité |
|------------|----------|
| Chrome Desktop | P0 |
| Safari iOS | P0 |
| Chrome Mobile | P0 |
| Firefox | P1 |
| Safari Desktop | P1 |
| Edge | P2 |

## Viewports Critiques

| Device | Largeur | Priorité |
|--------|---------|----------|
| Mobile M | 375px | P0 |
| Tablet | 768px | P0 |
| Laptop | 1024px | P0 |
| Desktop | 1440px | P0 |

---

## Critères d'Acceptation Globaux

### Performance (Core Web Vitals)

| Métrique | Cible | Mesure |
|----------|-------|--------|
| LCP | < 2.5s | DevTools > Lighthouse |
| INP | < 100ms | DevTools > Performance |
| CLS | < 0.1 | DevTools > Lighthouse |
| Lighthouse | > 80 | DevTools > Lighthouse |

### Accessibilité

- Contraste texte minimum 4.5:1
- Navigation clavier complète
- Touch targets minimum 44px
- Labels sur tous les champs

### Sécurité

- Pas de vulnérabilités critiques (npm audit)
- RLS Supabase actif
- Headers de sécurité configurés
- Pas de données sensibles exposées

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
- [Cucumber Gherkin](https://cucumber.io/docs/gherkin/) - Format BDD

### Documentation SEIDO

- `docs/design/ux-ui-decision-guide.md` - Guide UX/UI
- `docs/design/00-general.md` à `07-guidelines.md` - Design System
- `app/globals.css` - Variables CSS (source de vérité)

---

## Checklist Avant Session QA

- [ ] Comptes de test accessibles (voir `11-donnees-test.md`)
- [ ] Environnement correct (Local/Preview/Prod)
- [ ] Navigateur à jour
- [ ] DevTools ouvert (F12)
- [ ] Données de test présentes
- [ ] Documentation QA à jour

---

## Mise à Jour de la Documentation

Après chaque session QA, mettre à jour :

1. **Les checklists** - Cocher les items testés
2. **Les bugs trouvés** - Via `09-template-bug-report.md`
3. **Le rapport d'audit** - `docs/rapport-audit-complet-seido.md`

---

## Troubleshooting - Problèmes Fréquents

### Authentification

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| "Invalid login credentials" | Mauvais mot de passe | Utiliser `TestSeido2024!` pour les comptes de test |
| Redirect infini vers login | Cookie expiré | Vider les cookies, se reconnecter |
| "User not found" | Mauvais email | Vérifier l'email dans `11-donnees-test.md` |

### RLS / Permissions

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| Liste vide alors que données existent | RLS policy bloque | Vérifier le rôle utilisateur correspond aux données |
| "Permission denied" | Utilisateur pas dans l'équipe | Assigner l'utilisateur à la bonne équipe |
| Interventions non visibles | Filtrage par team_id | Vérifier que l'intervention appartient à la même équipe |

### Real-time

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| Pas de notifications en temps réel | Realtime non activé | Vérifier Supabase Dashboard → Database → Replication |
| "CHANNEL_ERROR" dans console | WebSocket bloqué | Vérifier firewall/proxy, réessayer |
| Reconnexion en boucle | Problème réseau | Vérifier connexion internet, attendre backoff |

### Performance

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| Page charge > 5s | Cache froid | Rafraîchir, vérifier DevTools Network |
| LCP > 3s | Images non optimisées | Vérifier taille images, lazy loading |
| INP > 200ms | JS bloquant | Vérifier DevTools Performance |

### Données de Test

| Problème | Solution |
|----------|----------|
| Aucune donnée de test | Exécuter les seeds: voir `11-donnees-test.md` |
| Données corrompues | Réinitialiser la base de test |
| Intervention dans mauvais statut | Utiliser Supabase Studio pour modifier manuellement |

### Contacts Support

- **Bugs critiques** : Créer issue GitHub avec template `09-template-bug-report.md`
- **Questions QA** : Contacter le mainteneur de la documentation
- **Problèmes Supabase** : Vérifier [status.supabase.com](https://status.supabase.com)

---

## Historique des Versions

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 2025-12-15 | Création initiale (10 fichiers) |
| 1.1 | 2025-12-15 | Ajout rôle Propriétaire, correction comptage pages |
| 1.2 | 2025-12-17 | Ajout fonctionnalité Import Excel/CSV |
| 2.0 | 2025-12-18 | Enrichissement : templates, données test, glossaire, parcours E2E Gherkin (166 scenarios) |
| 2.1 | 2025-12-18 | Métriques : matrice couverture, 100 cas négatifs, baselines performance, régression rapide |
| 2.2 | 2025-12-18 | Parcours Admin (28 scenarios), tests RLS avancés (40+), cas négatifs enrichis (145), tests Contrats |
| **2.3** | **2025-12-18** | **PWA (44 tests), Email/Mail (32 scenarios), Real-time (74 tests), Traçabilité (45 exigences), Prestataire/Locataire enrichis (+60 tests)** |

---

**Mainteneur** : Claude Code
**Contact** : Voir repository SEIDO
**Total fichiers QA** : 25
