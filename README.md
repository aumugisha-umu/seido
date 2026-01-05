# SEIDO - Plateforme de Gestion Immobilière Multi-Rôles

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15.2.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.9-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-success)](https://github.com/aumugisha-umu/seido)

**Plateforme SaaS de gestion immobilière pour gestionnaires, prestataires et locataires**

[🚀 Démo Live](https://seido-app.vercel.app) • [📖 Documentation](./docs/) • [🐛 Signaler un bug](https://github.com/aumugisha-umu/seido/issues)

</div>

---

## 📑 Table des Matières

- [🎯 Vue d'ensemble](#-vue-densemble)
  - [✨ Caractéristiques principales](#-caractéristiques-principales)
  - [🚀 Fonctionnalités Premium](#-fonctionnalités-premium)
- [🏗️ Architecture Technique](#️-architecture-technique)
- [👥 Système Multi-Rôles](#-système-multi-rôles)
- [📖 User Stories](#-user-stories)
  - [Admin Stories](#admin-stories)
  - [Gestionnaire Stories](#gestionnaire-stories)
  - [Prestataire Stories](#prestataire-stories)
  - [Locataire Stories](#locataire-stories)
  - [Shared Stories](#shared-stories)
- [🔄 Workflow d'Intervention](#-workflow-dintervention)
- [📧 Système d'Emails](#-système-demails)
- [🔌 API Routes Reference](#-api-routes-reference)
- [🎨 Bibliothèque de Composants](#-bibliothèque-de-composants)
- [🔐 Sécurité & Authentification](#-sécurité--authentification)
- [🧪 Tests & Qualité](#-tests--qualité)
- [⚡ Performance & Optimisation](#-performance--optimisation)
- [🚀 Installation & Démarrage](#-installation--démarrage-rapide)
- [📚 Scripts de Développement](#-scripts-de-développement)
- [🗄️ Base de Données](#️-base-de-données)
- [🚢 Déploiement Production](#-déploiement-production)
- [🤝 Contribution](#-contribution)

---

## 🎯 Vue d'ensemble

**SEIDO** est une application web de gestion immobilière **en production** qui permet la gestion complète du cycle de vie des interventions de maintenance dans un contexte multi-rôles. L'application gère des bâtiments, lots, interventions, devis, et coordonne les interactions entre gestionnaires immobiliers, prestataires de services et locataires.

### ✨ Caractéristiques principales

- 🏢 **Gestion de patrimoine** - Bâtiments, lots, contacts, documents
- 📝 **Gestion des contrats/baux** - Création, suivi, renouvellement avec alertes expiration
- 🔧 **Workflow d'interventions** - Cycle complet avec 11 statuts
- 💰 **Système de devis** - Demandes multi-prestataires et comparaison
- 📅 **Planification** - Gestion des disponibilités et créneaux horaires
- 👥 **Multi-rôles** - Admin, Gestionnaire, Prestataire, Locataire
- 📊 **Analytics** - Statistiques et rapports en temps réel
- 🔐 **Sécurité** - RLS (Row Level Security) au niveau base de données
- 📧 **Notifications multi-canaux** - In-app, Push, Email (18 templates)
- ✉️ **Email client IMAP/SMTP** - Sync emails et gestion communications
- 🎨 **UI/UX** - 270+ composants (50+ shadcn/ui + 19 shared + custom)
- ⚡ **Performance** - Cache multi-niveaux (Redis + LRU)

### 🚀 Fonctionnalités Premium

#### 💬 Communication Intégrée
- **Chat temps réel** - Conversations par intervention avec pièces jointes
- **Client Email complet** - IMAP/SMTP avec sync, envoi, archives et brouillons
- **Notifications instantanées** - 18 types d'événements, WebSocket optimisé (1 connexion/utilisateur)

#### 📱 Mobilité & Accessibilité
- **PWA (Progressive Web App)** - Installation native sans App Store
- **Interface responsive** - Optimisée mobile, tablette et desktop
- **Mode hors-ligne** - Service Worker pour fonctionnement déconnecté

#### 📄 Gestion Documentaire
- **Upload et prévisualisation** - Drag & drop, preview images et PDF
- **Visibilité par rôle** - Documents équipe, locataire ou intervention
- **Association automatique** - Documents liés aux propriétés ou interventions

#### ✅ Conformité & Audit
- **Logs d'activité** - Audit trail complet de toutes les actions
- **RGPD compliant** - Données sécurisées, chiffrement, droit à l'oubli
- **Bannière cookies RGPD** - Consentement opt-in avec préférences granulaires
- **Multi-tenant** - Isolation RLS garantie entre équipes

### 📊 Métriques de l'Application

| Métrique | Valeur | Détails |
|----------|--------|---------|
| **API Routes** | 94 routes | 100% authentifiées, 100% rate-limited |
| **Composants UI** | 270+ composants | 50+ shadcn/ui + 76 intervention workflow + 19 shared + dashboards |
| **Storybook Stories** | 19 stories | Documentation interactive composants intervention |
| **Services** | 24 services | Domain services (business logic) |
| **Repositories** | 21 repositories | Data access layer avec caching |
| **Custom Hooks** | 56 hooks | Auth, data fetching, UI state, real-time, analytics |
| **Validation Schemas** | 59 schémas Zod | 780+ lignes, 95% routes validées |
| **Email Templates** | 18 templates React Email | Auth, interventions, quotes |
| **Migrations DB** | 87 migrations | Phases 1, 2, 3, 4 (contracts) + RLS fixes appliquées |
| **Test Coverage** | 60% (unit) | Cible: 80% |
| **Build Status** | ✅ 0 erreurs TS | Production ready |

---

## 🚀 Dernières Mises à Jour - Décembre 2025

### 📥 Import Excel/CSV Biens (Dec 17, 2025)

**Fonctionnalité d'import en masse** permettant aux gestionnaires d'importer leurs biens immobiliers depuis Excel ou CSV.

**Fonctionnalités** :
- 📊 **Template Excel multi-feuilles** - 4 onglets : Immeubles, Lots, Contacts, Baux
- 🔄 **Mode Upsert intelligent** - Mise à jour si existe, création sinon (clé : nom immeuble, référence lot, email contact)
- ✅ **Validation en temps réel** - Erreurs affichées avant import avec numéro de ligne
- 📈 **Données d'exemple Belgique** - 3 immeubles, 15 lots, 10 contacts, 4 baux pré-remplis
- 🌍 **Support multi-pays** - France, Belgique, Suisse, Luxembourg, Allemagne, Pays-Bas

**Architecture** :
| Composant | Description |
|-----------|-------------|
| `lib/import/` | Parser, validateurs, templates, types |
| `app/api/import/` | 3 routes : template, validate, execute |
| `components/import/` | Wizard 4 étapes avec drag & drop |
| `lib/services/domain/import.service.ts` | Orchestration import |
| `supabase/migrations/20251216000000_create_import_jobs.sql` | Table de tracking |

**Workflow** :
1. **Télécharger template** → Fichier Excel avec exemples
2. **Upload fichier** → Drag & drop ou sélection
3. **Validation** → Vérification format et références
4. **Import** → Création/mise à jour en base

---

### 🔐 Impersonation Admin (Dec 16, 2025)

**Fonctionnalité d'impersonation** permettant aux admins de se connecter en tant qu'un autre utilisateur pour debug et support.

**Fonctionnalités** :
- 👤 **Se connecter en tant que** - Menu action dans `/admin/users` pour chaque utilisateur
- 🔗 **Magic Link sécurisé** - Utilise `auth.admin.generateLink()` de Supabase (flow PKCE standard)
- 🍪 **Cookie JWT signé** - Stocke l'email admin pour restauration de session
- 🟠 **Bandeau visuel** - Indicateur orange en bas de l'écran pendant l'impersonation
- ↩️ **Retour admin** - Bouton "Revenir à mon compte" pour restaurer la session admin
- 📍 **Mode minimisé** - Le bandeau peut être réduit en badge discret

**Fichiers créés** :
| Fichier | Rôle |
|---------|------|
| `lib/impersonation-jwt.ts` | Utilitaires JWT pour cookie d'impersonation |
| `app/actions/impersonation-actions.ts` | Server Actions start/stop impersonation |
| `app/auth/impersonate/callback/route.ts` | Callback OTP verification |
| `components/impersonation-banner.tsx` | Bandeau visuel avec minimize |

**Sécurité** :
- ✅ Vérification admin obligatoire avant impersonation
- ✅ JWT signé avec `SUPABASE_JWT_SECRET`
- ✅ Expiration 4h du token
- ✅ Logging complet des actions

---

### 👥 Gestion Utilisateurs Admin (Dec 16, 2025)

**Page complète de gestion des utilisateurs** pour les administrateurs.

**Fonctionnalités** :
- 📋 **Liste paginée** - Tous les utilisateurs avec filtres (rôle, statut, recherche)
- ➕ **Création** - Dialogue modal pour créer de nouveaux utilisateurs
- ✏️ **Modification** - Édition des informations utilisateur
- 🔄 **Changement de rôle** - Switch entre admin/gestionnaire/prestataire/locataire
- 🔒 **Toggle statut** - Activer/désactiver un compte
- 🗑️ **Suppression** - Avec protection contre suppression du dernier admin
- 👤 **Impersonation** - Se connecter en tant que l'utilisateur

**Fichiers créés** :
| Fichier | Rôle |
|---------|------|
| `app/admin/(with-navbar)/users/page.tsx` | Server Component avec stats |
| `app/admin/(with-navbar)/users/users-management-client.tsx` | Client Component table + dialogs |
| `app/actions/user-admin-actions.ts` | Server Actions CRUD utilisateurs |

---

### 🔧 Corrections & Améliorations (Dec 8-15, 2025)

**Fixes critiques et améliorations** :
- 🔐 **Tenant RLS Fix** (Dec 15) - Accès locataire via `contract_contacts` pour isolation multi-tenant correcte
- 👥 **Multi-provider Assignments** (Dec 8) - Support de plusieurs prestataires par intervention
- 💬 **Intervention Detail UX** (Dec 9) - Amélioration des cartes commentaires et planning
- ✉️ **Email Notification Service** (Dec 11) - Dispatcher notifications amélioré
- 📇 **Contact Management** (Dec 11-12) - Service et repository contacts enrichis

---

### 📋 Documentation QA Complète (Dec 15, 2025)

**Suite complète de documentation QA** basée sur ISO 29119, ISTQB et OWASP.

**12 fichiers créés** dans [`docs/testing/QA/`](./docs/testing/QA/) :

| Fichier | Description |
|---------|-------------|
| `00-plan-test-qa-complet.md` | Index et méthodologie (ISO 29119, ISTQB) |
| `01-checklist-fonctionnel.md` | 63 pages testées exhaustivement |
| `02-checklist-design-system.md` | Vérification Design System SEIDO |
| `03-checklist-accessibilite.md` | Conformité WCAG 2.1 AA |
| `04-checklist-securite.md` | Tests OWASP Top 10 |
| `05-checklist-performance.md` | Core Web Vitals |
| `06-10-parcours-*.md` | Parcours E2E par rôle (5 fichiers) |
| `09-template-bug-report.md` | Template rapport de bug |

**Couverture** : 63 pages, 5 rôles, 330+ tests, workflows E2E complets

---

### 📝 Module Contrats/Baux (Dec 5, 2025)

**Gestion complète des contrats de location** avec alertes automatiques d'expiration.

**Fonctionnalités** :
- 📝 **Création en 4 étapes** - Lot → Détails & Paiements → Contacts & Garantie → Confirmation
- 👥 **Gestion des contacts** - Locataires, colocataires et garants liés au contrat
- 🔄 **Retour automatique après création contact** - Création de contact depuis le flux bail avec retour automatique et auto-sélection
- 💰 **Configuration des paiements** - Loyer, charges, fréquence de paiement
- 🛡️ **Garantie locative** - Types multiples (dépôt, compte bloqué, e-dépôt, etc.)
- 📄 **Documents contractuels** - Upload avec types (bail, avenant, état des lieux, etc.)
- ⏰ **Alertes automatiques** - Notifications 30j et 7j avant expiration
- ✏️ **Édition complète** - Modification des contrats existants
- 🎯 **Statut auto-calculé** - Statut déterminé automatiquement selon les dates (brouillon/actif/expiré)

**Nouvelles tables DB** :
- `contracts` - Contrats de bail avec loyer, charges, garantie
- `contract_contacts` - Liaison locataires/garants (table junction)
- `contract_documents` - Documents associés aux contrats

**Nouveaux composants** (25+) :
```
components/contracts/
├── contracts-navigator.tsx     # Navigateur avec filtres et recherche
├── contract-card-compact.tsx   # Carte pour liste
├── contract-status-badge.tsx   # Badge statut dynamique
├── contract-type-badge.tsx     # Badge type de bail
├── contract-contacts-list.tsx  # Liste locataires/garants
└── ...
```

**User Stories couvertes** : US-G22 à US-G27 (voir section User Stories)

---

### 🍪 Bannière Cookies RGPD (Dec 4, 2025)

**Conformité RGPD** avec consentement granulaire.

**Fonctionnalités** :
- 🍪 **Bannière cookies RGPD** - Consentement opt-in conforme EU/UK/CH
- 🎛️ **Préférences granulaires** - Analytics / Publicité / Fonctionnel
- 💾 **Persistance localStorage** - 1 an avec versioning

**Fichiers clés** :
| Fichier | Rôle |
|---------|------|
| `hooks/use-cookie-consent.tsx` | Context + Provider + Hooks consentement |
| `components/cookie-consent-banner.tsx` | Bannière UI + Modal préférences |

---

### 📊 Analytics & SEO (Dec 6, 2025)

**Intégration Contentsquare/Clarity avec tracking SPA et conformité RGPD.**

**Fonctionnalités** :
- 🗺️ **Sitemap dynamique** - Next.js 15 sitemap.ts avec routes publiques
- 📈 **SPA Page Tracking** - Notification automatique à chaque changement de route
- 👤 **User Segmentation** - Custom variables par rôle (gestionnaire, locataire, prestataire)
- 🔒 **Privacy Masking** - Masquage automatique des PII (email, password) via `data-cs-mask`
- ✅ **Consent-aware** - Tracking uniquement si cookies analytics acceptés

**Architecture** :
```
Navigation SPA → usePathname() → trackPageview() → Contentsquare
                                ↓
              useAuth() → setCustomVariable(role) → Segmentation dashboard
```

**Fichiers clés** :
| Fichier | Rôle |
|---------|------|
| `app/sitemap.ts` | Sitemap dynamique (routes publiques uniquement) |
| `hooks/use-analytics-tracking.ts` | Hook tracking changements de page |
| `hooks/use-analytics-identify.ts` | Hook segmentation utilisateur (anonymisé) |
| `components/analytics-provider.tsx` | Provider avec respect du consentement |

---

### 🔒 Headers de Sécurité (Dec 6, 2025)

**Configuration Next.js complète pour protection contre attaques web.**

**Headers configurés** (`next.config.js`) :
| Header | Valeur | Protection |
|--------|--------|------------|
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `X-XSS-Protection` | `1; mode=block` | XSS (legacy) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Fuite de données |
| `Content-Security-Policy` | Voir ci-dessous | XSS, injection |
| `Vary` | `Accept-Encoding` | Cache optimisation |

**CSP Directives** :
- `default-src 'self'` - Ressources par défaut
- `base-uri 'self'` - Protection injection `<base>`
- `script-src` - Self + Vercel + Contentsquare
- `connect-src` - Self + Supabase (https + wss)
- `frame-ancestors 'self'` - Anti-clickjacking

---

### 🎨 Système de Thème Material Design 3 (Dec 3, 2025)

**Dark/Light mode avec système de couleurs unifié** basé sur Material Design 3 et Tailwind v4.

**Nouveautés** :
- 🌙 **Dark/Light Mode** - Toggle accessible dans le header (navbar)
- 🎨 **Palette MD3** - 5 couleurs clés (Primary, Secondary, Tertiary, Neutral, Neutral-Variant)
- 📱 **System preference** - Détection automatique des préférences OS (`prefers-color-scheme`)
- ✨ **Glassmorphism** - Effets visuels modernes en dark mode
- 🖼️ **Hero Video adaptatif** - Vidéo différente selon le thème (`hero-light.webm` / `hero-dark.webm`)
- ♿ **Accessibilité WCAG 2.1 AA** - Ratios de contraste vérifiés (4.5:1 minimum)

**Architecture Tailwind v4** :
```css
/* globals.css - Configuration des couleurs via @theme */
@theme {
  --color-surface: var(--surface);
  --color-on-surface: var(--on-surface);
  --color-primary: var(--primary);
  /* ... génère automatiquement bg-surface, text-on-surface, etc. */
}
```

**Fichiers clés** :
| Fichier | Rôle |
|---------|------|
| `app/globals.css` | Variables CSS (`:root`, `.dark`) + `@theme` block |
| `app/providers.tsx` | ThemeProvider (next-themes) |
| `components/ui/theme-toggle.tsx` | Toggle Sun/Moon animé |
| `components/landing/hero-video.tsx` | Vidéo conditionnelle selon thème |

---

### 👥 Personas & UX Design (Dec 6, 2025)

**Guide de décision UX/UI complet** basé sur l'analyse approfondie de 3 personas utilisateurs.

#### Personas Analysés

| Persona | Profil | Portefeuille | Mode de travail | Besoin UX principal |
|---------|--------|--------------|-----------------|---------------------|
| **Philippe** (Multipropriétaire) | 55 ans, peu digital | 10-50 logements | Desktop, emails | Dashboard KPIs clair |
| **Thomas** (Gestionnaire) | 38 ans, très mobile | 50-200 logements | **80% mobile** | App mobile complète |
| **Julien** (Agent agence) | 42 ans, variable | 200-500+ logements | Multi-outils | Intégrations, multi-users |

#### 5 Challenges UX Critiques Identifiés

| Challenge | Citation utilisateur | Solution UX |
|-----------|---------------------|-------------|
| Mode pompier 70-80% | "Je passe mon temps à éteindre des feux" | Priorisation intelligente |
| Trou noir prestataires | "Impossible de savoir où en est..." | Tracking visible end-to-end |
| Multi-canal ingérable | "Je perds 2h/jour à chercher des infos" | Recherche universelle (Ctrl+K) |
| Peur de perdre contrôle | "Je perds le contrôle si je délègue" | Permissions granulaires |
| Burn-out imminent | "Pas de vacances depuis 3 ans" | Automatisations poussées |

#### Philosophie Design SEIDO

> **"Professional without being corporate, powerful without being complex."**

- **Clarity over cleverness** — Information immédiatement compréhensible
- **Mobile-first** — 80% du travail terrain se fait sur mobile
- **Progressive complexity** — Simple par défaut, puissant quand nécessaire

**Documentation complète** : [`docs/design/ux-ui-decision-guide.md`](./docs/design/ux-ui-decision-guide.md) (3500+ lignes)
- Heuristiques de Nielsen appliquées à SEIDO
- Patterns Material Design 3 & Apple HIG
- Guidelines par rôle (Gestionnaire, Prestataire, Locataire, Admin)
- Stratégies pour la densité de données
- Anti-patterns à éviter

#### 🎨 Design System SEIDO

| Document | Contenu |
|----------|---------|
| [`00-general.md`](./docs/design/00-general.md) | Introduction et principes fondamentaux |
| [`01-colors.md`](./docs/design/01-colors.md) | Système de couleurs OKLCH |
| [`02-typography.md`](./docs/design/02-typography.md) | Typographie et hiérarchie |
| [`03-spacing.md`](./docs/design/03-spacing.md) | Système d'espacement 4px |
| [`04-layouts.md`](./docs/design/04-layouts.md) | Grilles et layouts responsive |
| [`05-components.md`](./docs/design/05-components.md) | Composants UI et métier |
| [`06-icons.md`](./docs/design/06-icons.md) | Système d'icônes Lucide React |
| [`07-guidelines.md`](./docs/design/07-guidelines.md) | Bonnes pratiques UX |

**Personas unifiés** :
- [`persona-gestionnaire-unifie.md`](./docs/design/persona-gestionnaire-unifie.md) - Thomas, 280 logements, 60% bureau / 40% mobile
- [`persona-locataire.md`](./docs/design/persona-locataire.md) - Emma, 29 ans, Millennial, mobile-first
- [`persona-prestataire.md`](./docs/design/persona-prestataire.md) - Marc, 38 ans, artisan, 75% terrain

**Source de vérité CSS** : [`app/globals.css`](./app/globals.css)
- Couleurs OKLCH (`--primary`, `--background`, `--destructive`, etc.)
- Variables dashboard (`--dashboard-padding-*`, `--header-*`)
- Classes BEM (`.header`, `.dashboard`, `.layout-*`)

---

### 📚 Storybook & Architecture Composants (Dec 1, 2025)

**Documentation interactive des composants** avec Storybook et nouvelle architecture modulaire.

**Nouveautés** :
- 📚 **Storybook** - 19 stories pour documenter les composants intervention
- 🧩 **Architecture BEM** - Composants partagés organisés en atoms/cards/sidebar/layout
- 🎨 **Preview Hybrid Layout** - Nouveau design pour les détails d'intervention
- ⚡ **Realtime amélioré** - Reconnexion avec exponential backoff (max 5 tentatives)
- 🔧 **Cards unifiées** - ManagerInterventionCard utilisé partout (dashboard + liste)
- 🐛 **Layout Fix** - Correction hauteur sidebar avec flexbox

**Nouvelle architecture composants** :
```
components/interventions/shared/
├── atoms/          # Composants atomiques (6 fichiers + stories)
├── cards/          # Cartes de contenu (7 fichiers + stories)
├── sidebar/        # Composants sidebar (4 fichiers + stories)
└── layout/         # Layouts (2 fichiers + stories)
```

**Commandes Storybook** :
```bash
npm run storybook       # Lancer Storybook (http://localhost:6006)
npm run build-storybook # Build statique
```

---

## 🔔 Mises à Jour - Novembre 2025

### Migration Architecture des Notifications (Nov 22, 2025)

**Architecture modernisée** : Passage de singleton à Server Actions + Domain Service + Repository

**Bénéfices** :
- ✅ **Next.js 15 compliant** : Server Actions au lieu de singleton
- ✅ **RLS compliant** : Server client avec permissions appropriées
- ✅ **Testable** : Dependency injection dans Domain Service
- ✅ **Performant** : JOIN queries au lieu de N+1 patterns
- ✅ **Type-safe** : TypeScript strict sur toute la chaîne

**Migration Status** :
- ✅ 13 fichiers migrés vers Server Actions
- ✅ RLS policy appliquée (migration `20251122000001`)
- ✅ 3 indexes de performance ajoutés
- ✅ ~350 lignes de code éliminées

---

### 🔒 Sécurisation Complète de l'Application (Oct 23, 2025)

**SEIDO est maintenant production-ready** avec 3 initiatives de sécurité majeures complétées en 48h :

---

#### ✅ 1. Migration Architecture API (Oct 22)

**86 routes API migrées** vers un pattern d'authentification centralisé :
- ✅ **9 failles de sécurité critiques corrigées**
- ✅ **~4,000 lignes de code dupliqué éliminées**
- ✅ **Pattern Next.js 15 + Supabase SSR officiel** partout
- ✅ **Build production validé** (0 erreur TypeScript)

**Helper centralisé** :
```typescript
// Pattern standard pour toutes les routes API
import { getApiAuthContext } from '@/lib/api-auth-helper'

const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
if (!authResult.success) return authResult.error
const { supabase, userProfile } = authResult.data
```

---

#### ✅ 2. Rate Limiting avec Upstash Redis (Oct 23)

**4 niveaux de protection** déployés sur toutes les routes API :

| Niveau | Limite | Endpoints | Protection |
|--------|--------|-----------|------------|
| **STRICT** | 5 req/10s | Authentification, reset password | ⛔ Brute force |
| **MODERATE** | 3 req/60s | Uploads, envois emails, créations | 🛡️ DoS |
| **NORMAL** | 30 req/10s | API standard | 🔒 Abus général |
| **LENIENT** | 100 req/60s | Lecture publique | 👀 Throttling léger |

**Caractéristiques** :
- ✅ **Upstash Redis** en production (distribué, persistant)
- ✅ **Fallback in-memory** en développement (zero-config)
- ✅ **Rate limiting par utilisateur** (authenticated) et **par IP** (anonymous)
- ✅ **Sliding window algorithm** pour précision maximale
- ✅ **Analytics intégrées** dans Upstash console

**Fichier** : `lib/rate-limit.ts` (188 lignes)

---

#### ✅ 3. Validation Zod Complète (Oct 23)

**52/55 routes validées** (100% des routes avec request body) :

| Catégorie | Routes Validées | Couverture | Statut |
|-----------|----------------|------------|--------|
| **Interventions** | 26/26 | 100% | ✅ Complet |
| **Buildings/Lots** | 4/4 | 100% | ✅ Complet |
| **Documents** | 5/5 | 100% | ✅ Complet |
| **Invitations** | 10/10 | 100% | ✅ Complet |
| **Quotes** | 3/4 | 75% | 🟡 Partiel |
| **Users/Auth** | 3/3 | 100% | ✅ Complet |
| **Autres** | 4/6 | 67% | 🟡 Partiel (2 GET) |
| **TOTAL** | **52/55** | **95%** | ✅ **100% avec body** |

**59 schémas Zod créés** dans `lib/validation/schemas.ts` (780+ lignes) :
- ✅ **UUID validation** → Prévention injection SQL
- ✅ **Email RFC 5322** → Max 255 chars
- ✅ **Passwords complexes** → Limite bcrypt (72 chars)
- ✅ **Enums type-safe** → Statuts interventions (français)
- ✅ **Length limits** → Prévention DoS (descriptions 2000 chars)
- ✅ **File validation** → Size limits (100MB), MIME types

---

**📊 Impact Global** :
- ✅ **Authentification** : 100% routes protégées
- ✅ **Rate Limiting** : 100% routes throttlées
- ✅ **Validation** : 100% routes avec body validées
- ✅ **Type Safety** : TypeScript strict partout
- ✅ **Production Ready** : Build sans erreurs

Voir [HANDOVER.md](./HANDOVER.md) pour documentation technique complète et [rapport d'audit](./docs/rapport-audit-complet-seido.md) pour détails sécurité.

---

## 🏗️ Architecture Technique

### Stack Technologique

| Couche | Technologie | Version | Utilisation |
|--------|-------------|---------|-------------|
| **Framework** | Next.js | 15.2.4 | App Router, SSR, Server Actions |
| **Language** | TypeScript | 5.x | Strict mode, type-safety |
| **UI** | React | 19.x | Server Components, Suspense |
| **Styling** | Tailwind CSS | 4.1.9 | OKLCH colors, utility-first |
| **Components** | shadcn/ui | 50+ | Radix UI primitives |
| **Database** | PostgreSQL | via Supabase | 83 migrations appliquées |
| **Auth** | Supabase Auth | 2.57.0 | PKCE flow, RLS integration |
| **Cache** | Redis + LRU | ioredis 5.8.0 | Multi-level caching |
| **Email** | Resend | 6.1.2 | Transactional emails (18 templates) |
| **Forms** | React Hook Form | 7.60.0 | + Zod validation (59 schemas) |
| **Testing** | Vitest + Playwright | 2.1.9 / 1.55.1 | Unit + E2E tests |
| **Logging** | Pino | 9.12.0 | Structured logging |

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 15 App Router                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  UI Layer    │  │ Server       │  │ API Routes   │     │
│  │  (React 19)  │  │ Actions      │  │ (86 routes)  │     │
│  │  245 comps   │  │ (12 files)   │  │ 100% auth    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │      Domain Services Layer          │
          │  (24 services - Business Logic)     │
          │  ┌────────────────────────────┐     │
          │  │ • InterventionService      │     │
          │  │ • BuildingService          │     │
          │  │ • NotificationService      │     │
          │  │ • EmailService             │     │
          │  │ • TeamService              │     │
          │  │ • StatsService             │     │
          │  │ • ConversationService      │     │
          │  │ + 17 autres services       │     │
          │  └────────────────────────────┘     │
          └──────────────┬─────────────────────┘
                         │
          ┌──────────────┴─────────────────────┐
          │    Repository Pattern Layer         │
          │  (18 repositories - Data Access)    │
          │  ┌────────────────────────────┐     │
          │  │ • BaseRepository (CRUD)    │     │
          │  │ • InterventionRepository   │     │
          │  │ • BuildingRepository       │     │
          │  │ • NotificationRepository   │     │
          │  │ • EmailRepository          │     │
          │  │ + 13 autres repositories   │     │
          │  └────────────────────────────┘     │
          └──────────────┬─────────────────────┘
                         │
          ┌──────────────┴─────────────────────┐
          │        Infrastructure Layer         │
          │  ┌────────────┐  ┌──────────────┐  │
          │  │ Supabase   │  │ Cache        │  │
          │  │ PostgreSQL │  │ Redis + LRU  │  │
          │  │ + RLS      │  │ Multi-level  │  │
          │  │ 83 migr.   │  │ DataLoader   │  │
          │  └────────────┘  └──────────────┘  │
          └────────────────────────────────────┘
```

### Structure du Projet

```
seido-app/
├── app/                          # Next.js App Router
│   ├── [role]/                   # Routes dynamiques par rôle
│   │   ├── admin/                # Dashboard admin (3 pages)
│   │   ├── gestionnaire/         # Dashboard gestionnaire (16 pages)
│   │   ├── prestataire/          # Dashboard prestataire (5 pages)
│   │   └── locataire/            # Dashboard locataire (4 pages)
│   ├── api/                      # 86 API routes (100% auth, 95% validated)
│   ├── actions/                  # 12 Server Actions files
│   └── auth/                     # Authentication pages
│
├── components/                   # React Components (270+ total)
│   ├── ui/                       # 50+ shadcn/ui components
│   ├── dashboards/               # Role-specific dashboards
│   ├── contracts/                # 25+ contract management components
│   ├── intervention/             # 57 intervention workflow components
│   ├── email/                    # Email client components
│   └── notifications/            # Notification components
│
├── lib/                          # Core Business Logic
│   ├── services/                 # Repository Pattern
│   │   ├── core/                 # Infrastructure
│   │   │   ├── supabase-client.ts
│   │   │   ├── base-repository.ts
│   │   │   └── error-handler.ts
│   │   ├── repositories/         # 18 Data Repositories
│   │   └── domain/               # 24 Domain Services
│   ├── validation/
│   │   └── schemas.ts            # 59 Zod schemas (780+ lines)
│   ├── rate-limit.ts             # Rate limiting (Upstash Redis)
│   ├── auth-dal.ts               # Auth Data Access Layer
│   ├── server-context.ts         # Server auth context
│   ├── api-auth-helper.ts        # API auth helper
│   ├── database.types.ts         # Generated Supabase types
│   └── utils.ts
│
├── hooks/                        # 51 Custom React Hooks
│   ├── use-auth.ts
│   ├── use-intervention-*.ts
│   ├── use-buildings.ts
│   └── ...
│
├── emails/                       # Email Templates
│   └── templates/                # 18 React Email templates
│       ├── auth/                 # 5 auth templates
│       ├── interventions/        # 6 intervention templates
│       ├── quotes/               # 4 quote templates
│       └── ...
│
├── supabase/migrations/          # 87 Database Migrations
├── tests-new/                    # E2E Test Suite (Playwright)
├── docs/                         # Documentation
│   ├── design/                   # Design System (8 fichiers)
│   ├── testing/QA/               # Documentation QA (12 fichiers)
│   ├── refacto/                  # Architecture docs
│   ├── rapport-audit-complet-seido.md
│   └── notification-migration-status.md
└── package.json
```

---

## 👥 Système Multi-Rôles

SEIDO implémente **5 rôles distincts** avec permissions granulaires et isolation multi-tenant via Row Level Security (RLS).

### 🔑 Rôles et Permissions

| Rôle | Permissions Clés | Dashboard | Pages | Cas d'usage |
|------|------------------|-----------|-------|-------------|
| **Admin** | Administration système complète, accès global, impersonation | KPIs globaux, gestion users | 4 pages | Supervision plateforme |
| **Gestionnaire** | Gestion patrimoine, contrats/baux, validation interventions, email client | Portfolio, contrats, interventions, emails | 27 pages | Gestion immobilière |
| **Prestataire** | Exécution travaux, création devis, planning | Tâches assignées, planning | 5 pages | Maintenance & réparations |
| **Locataire** | Création demandes, suivi interventions, validation | Mes demandes, historique | 8 pages | Vie quotidienne logement |
| **Proprietaire** | Consultation patrimoine et interventions (lecture seule) | Vue consolidée patrimoine | 3 pages | Suivi investissement |

### 📄 Pages par Rôle

#### Admin (4 pages)
- `/admin/dashboard` - System KPIs with growth metrics
- `/admin/users` - User management with CRUD + impersonation
- `/admin/notifications` - System notifications
- `/admin/profile` - Admin profile management

#### Gestionnaire (16 pages)
- `/gestionnaire/dashboard` - Portfolio overview + recent interventions
- `/gestionnaire/biens` - Buildings & lots list
- `/gestionnaire/biens/immeubles/[id]` - Building details
- `/gestionnaire/biens/immeubles/nouveau` - Create building
- `/gestionnaire/biens/lots/[id]` - Lot details
- `/gestionnaire/biens/lots/nouveau` - Create lot
- `/gestionnaire/contacts` - Contacts management
- `/gestionnaire/contrats` - Contracts list with filters
- `/gestionnaire/contrats/[id]` - Contract details
- `/gestionnaire/contrats/nouveau` - Create contract (5 steps)
- `/gestionnaire/contrats/modifier/[id]` - Edit contract
- `/gestionnaire/interventions` - Interventions list
- `/gestionnaire/interventions/[id]` - Intervention details
- `/gestionnaire/mail` - Email client (IMAP/SMTP)
- `/gestionnaire/parametres/emails` - Email connections
- `/gestionnaire/profile` - Profile

#### Prestataire (5 pages)
- `/prestataire/dashboard` - Assigned tasks and pending actions
- `/prestataire/interventions/[id]` - Intervention details with workflow
- `/prestataire/notifications` - Notifications
- `/prestataire/profile` - Profile
- `/prestataire/parametres` - Settings

#### Locataire (8 pages)
- `/locataire/dashboard` - My requests and status
- `/locataire/interventions` - Interventions list
- `/locataire/interventions/nouvelle-demande` - Create request
- `/locataire/interventions/new` - Alternate create request
- `/locataire/interventions/[id]` - Request details
- `/locataire/notifications` - Notifications
- `/locataire/parametres` - Settings
- `/locataire/profile` - Profile

#### Proprietaire (3 pages) - NOUVEAU
- `/proprietaire/dashboard` - Vue consolidée du patrimoine
- `/proprietaire/biens` - Consultation des biens (lecture seule)
- `/proprietaire/interventions` - Suivi des interventions (lecture seule)

> **Note**: Le rôle Proprietaire a un accès en **lecture seule** uniquement. Aucune action de création, modification ou suppression n'est possible.

---

## 📖 User Stories

Cette section détaille toutes les fonctionnalités de l'application sous forme de user stories suivant le format standard : **"As a [role], I want to [action], so that [benefit]"**.

### Admin Stories

#### Supervision Système

**US-A1**: En tant qu'admin, je veux visualiser les statistiques globales de la plateforme (total utilisateurs, bâtiments, interventions, revenus) afin de monitorer la santé et la croissance du système.

**US-A2**: En tant qu'admin, je veux recevoir des notifications système sur les événements critiques afin de pouvoir répondre rapidement aux problèmes.

**US-A3**: En tant qu'admin, je veux accéder à toutes les équipes et utilisateurs afin de fournir du support et résoudre les problèmes.

#### Gestion des Utilisateurs

**US-A4**: En tant qu'admin, je veux visualiser la liste de tous les utilisateurs avec filtres (rôle, statut, recherche) afin de gérer efficacement les comptes.

**US-A5**: En tant qu'admin, je veux créer, modifier et supprimer des utilisateurs afin de gérer les accès à la plateforme.

**US-A6**: En tant qu'admin, je veux changer le rôle d'un utilisateur (admin/gestionnaire/prestataire/locataire) afin d'adapter ses permissions.

**US-A7**: En tant qu'admin, je veux activer ou désactiver un compte utilisateur afin de contrôler l'accès sans supprimer les données.

#### Impersonation & Debug

**US-A8**: En tant qu'admin, je veux me connecter en tant qu'un autre utilisateur (impersonation) afin de debugger des problèmes ou effectuer des opérations de support.

**US-A9**: En tant qu'admin en mode impersonation, je veux voir un bandeau visuel indiquant que je suis connecté en tant qu'un autre utilisateur afin de ne pas confondre avec mon propre compte.

**US-A10**: En tant qu'admin en mode impersonation, je veux pouvoir revenir à mon compte admin en un clic afin de terminer la session de debug rapidement.

---

### Gestionnaire Stories

#### Gestion du Patrimoine

**US-G1**: En tant que gestionnaire, je veux créer et gérer des immeubles avec des informations d'adresse complètes afin d'organiser mon portfolio immobilier.

**US-G2**: En tant que gestionnaire, je veux créer des lots (appartements, maisons, locaux commerciaux) soit liés à des immeubles soit autonomes afin de gérer tous types de propriétés.

**US-G3**: En tant que gestionnaire, je veux suivre les taux d'occupation de mon portfolio afin d'optimiser mes revenus locatifs.

**US-G4**: En tant que gestionnaire, je veux téléverser des documents de propriété (baux, diagnostics, plans) avec contrôles de visibilité (équipe/locataire) afin de maintenir des dossiers organisés.

**US-G5**: En tant que gestionnaire, je veux visualiser les détails complets d'un immeuble (lots, contacts, documents, interventions) afin d'avoir une vue d'ensemble de la propriété.

#### Gestion des Contacts

**US-G6**: En tant que gestionnaire, je veux créer des contacts (prestataires, locataires, propriétaires) et envoyer des invitations par email afin de construire mon réseau.

**US-G7**: En tant que gestionnaire, je veux assigner des contacts à des immeubles et lots spécifiques avec définition de rôles afin de suivre les relations.

**US-G8**: En tant que gestionnaire, je veux suivre le statut des invitations (en attente, acceptée, expirée) afin de relancer les invitations sans réponse.

#### Gestion des Interventions

**US-G9**: En tant que gestionnaire, je veux visualiser toutes les interventions de mon équipe filtrées par statut afin de prioriser mes actions.

**US-G10**: En tant que gestionnaire, je veux approuver ou rejeter les demandes d'intervention des locataires avec une raison afin de contrôler les coûts de maintenance.

**US-G11**: En tant que gestionnaire, je veux créer des interventions initiées par le gestionnaire (maintenance proactive) afin de prévenir les problèmes.

**US-G12**: En tant que gestionnaire, je veux demander des devis à plusieurs prestataires pour une intervention afin de comparer les prix.

**US-G13**: En tant que gestionnaire, je veux comparer les devis soumis côte à côte afin de sélectionner la meilleure offre.

**US-G14**: En tant que gestionnaire, je veux valider ou rejeter les devis des prestataires afin d'autoriser le travail à procéder.

**US-G15**: En tant que gestionnaire, je veux planifier des interventions en matchant les disponibilités des prestataires et locataires afin de trouver des créneaux convenables.

**US-G16**: En tant que gestionnaire, je veux suivre la progression des interventions à travers 11 statuts afin de savoir quelles actions sont en attente.

**US-G17**: En tant que gestionnaire, je veux finaliser les interventions complétées après validation du locataire afin de clôturer le workflow.

**US-G18**: En tant que gestionnaire, je veux annuler des interventions avec une raison à n'importe quelle étape afin de gérer les circonstances changeantes.

#### Intégration Email

**US-G19**: En tant que gestionnaire, je veux connecter mes comptes email IMAP/SMTP afin de gérer les communications d'intervention depuis la plateforme.

**US-G20**: En tant que gestionnaire, je veux synchroniser les emails des prestataires et locataires afin d'avoir un historique centralisé des communications.

**US-G21**: En tant que gestionnaire, je veux envoyer des emails depuis la plateforme et les associer aux interventions afin de maintenir le contexte.

#### Gestion des Contrats/Baux

**US-G22**: En tant que gestionnaire, je veux créer des contrats de bail avec un formulaire en 5 étapes afin de structurer les informations de location.

**US-G23**: En tant que gestionnaire, je veux lier des locataires et garants existants aux contrats afin de gérer les relations contractuelles.

**US-G24**: En tant que gestionnaire, je veux configurer les conditions financières (loyer, charges, garantie) afin de formaliser les obligations locatives.

**US-G25**: En tant que gestionnaire, je veux recevoir des alertes automatiques 30 et 7 jours avant l'expiration des baux afin de préparer les renouvellements.

**US-G26**: En tant que gestionnaire, je veux téléverser des documents contractuels (bail, états des lieux, attestations) afin de centraliser les pièces justificatives.

**US-G27**: En tant que gestionnaire, je veux visualiser la liste de mes contrats avec filtres par statut afin de suivre mon portefeuille locatif.

---

### Prestataire Stories

**US-P1**: En tant que prestataire, je veux visualiser les interventions qui me sont assignées afin de connaître mon travail à venir.

**US-P2**: En tant que prestataire, je veux recevoir des demandes de devis avec les détails de l'intervention afin de pouvoir estimer le travail.

**US-P3**: En tant que prestataire, je veux soumettre des devis avec montant et description afin de postuler pour du travail.

**US-P4**: En tant que prestataire, je veux proposer plusieurs créneaux horaires pour les interventions afin de planifier selon mes disponibilités.

**US-P5**: En tant que prestataire, je veux accepter ou rejeter les créneaux horaires planifiés afin de confirmer ma disponibilité.

**US-P6**: En tant que prestataire, je veux marquer une intervention comme démarrée afin que le système suive la progression du travail.

**US-P7**: En tant que prestataire, je veux marquer le travail comme complété et téléverser des photos/rapports afin de documenter le travail fini.

**US-P8**: En tant que prestataire, je veux recevoir des notifications temps réel sur les validations de devis et confirmations de créneaux afin de pouvoir répondre rapidement.

---

### Locataire Stories

**US-L1**: En tant que locataire, je veux créer des demandes d'intervention avec une description et des photos afin de signaler des problèmes.

**US-L2**: En tant que locataire, je veux sélectionner le niveau d'urgence de ma demande afin que les problèmes critiques soient priorisés.

**US-L3**: En tant que locataire, je veux fournir mes disponibilités pour la planification afin que les interventions soient planifiées quand je suis à domicile.

**US-L4**: En tant que locataire, je veux suivre le statut de ma demande en temps réel afin de savoir quand le travail aura lieu.

**US-L5**: En tant que locataire, je veux recevoir des notifications quand ma demande est approuvée, planifiée ou complétée afin de rester informé.

**US-L6**: En tant que locataire, je veux valider le travail complété avant la clôture finale afin d'assurer la qualité.

**US-L7**: En tant que locataire, je veux visualiser mon historique d'interventions afin de suivre la maintenance au fil du temps.

---

### Shared Stories (Tous Rôles)

**US-S1**: En tant qu'utilisateur, je veux recevoir des notifications in-app pour les événements pertinents afin de rester à jour.

**US-S2**: En tant qu'utilisateur, je veux recevoir des notifications email pour les événements critiques afin de pouvoir répondre même hors ligne.

**US-S3**: En tant qu'utilisateur, je veux commenter sur les interventions afin de communiquer avec les autres parties prenantes.

**US-S4**: En tant qu'utilisateur, je veux téléverser des documents aux interventions afin de partager des preuves et rapports.

**US-S5**: En tant qu'utilisateur, je veux mettre à jour mon profil et avatar afin de personnaliser mon compte.

**US-S6**: En tant qu'utilisateur, je veux que mes données soient protégées par la sécurité au niveau ligne (RLS) afin de voir uniquement les informations pertinentes à mon rôle et équipe.

**US-S7**: En tant qu'utilisateur, je veux changer mon mot de passe de manière sécurisée afin de maintenir la sécurité de mon compte.

**US-S8**: En tant qu'utilisateur, je veux recevoir des suggestions de disponibilité basées sur mon historique afin de faciliter la planification.

---

## 🔄 Workflow d'Intervention

### Cycle de Vie Complet (11 Statuts)

L'intervention suit un workflow structuré avec 11 statuts distincts :

```
1. demande (Locataire crée la demande)
   ↓
2. rejetee (Gestionnaire rejette) OU approuvee (Gestionnaire approuve)
   ↓
3. approuvee → demande_de_devis (Devis requis ?)
   ↓
4. demande_de_devis (Demandes de devis envoyées aux prestataires)
   ↓
5. [Devis soumis par prestataire] → Gestionnaire valide le devis
   ↓
6. planification (Recherche de créneau)
   ↓
7. planifiee (Créneau confirmé)
   ↓
8. en_cours (Travail en progression)
   ↓
9. cloturee_par_prestataire (Prestataire termine)
   ↓
10. cloturee_par_locataire (Locataire valide)
   ↓
11. cloturee_par_gestionnaire (Gestionnaire finalise)
   ↓
TERMINÉE ou annulee (Annulée à n'importe quelle étape)
```

### Actions par Rôle et Statut

| Statut | Gestionnaire | Prestataire | Locataire | Action Suivante |
|--------|--------------|-------------|-----------|-----------------|
| **demande** | Approuver / Rejeter | - | Visualiser | → approuvee / rejetee |
| **approuvee** | Demander devis / Planifier | - | Visualiser | → demande_de_devis / planification |
| **demande_de_devis** | Visualiser | Soumettre devis | Visualiser | → planification (après validation) |
| **planification** | Proposer créneaux | Répondre créneaux | Fournir disponibilités | → planifiee |
| **planifiee** | Visualiser | Démarrer travail | Visualiser | → en_cours |
| **en_cours** | Visualiser | Marquer complété | Visualiser | → cloturee_par_prestataire |
| **cloturee_par_prestataire** | Visualiser | - | Valider travail | → cloturee_par_locataire |
| **cloturee_par_locataire** | Finaliser | - | - | → cloturee_par_gestionnaire |
| **cloturee_par_gestionnaire** | - | - | - | TERMINÉE |
| **annulee** | - | - | - | FERMÉE |

### Composants du Workflow (57 composants)

Situés dans `components/intervention/` :

**Planification & Scheduling** :
- `availability-form.tsx` - Formulaire de disponibilités
- `time-slot-proposal-form.tsx` - Proposition de créneaux
- `time-slot-responses-modal.tsx` - Réponses aux créneaux
- `slot-selection-modal.tsx` - Sélection finale

**Système de Devis** :
- `quote-request-form.tsx` - Demande de devis
- `quote-submission-form.tsx` - Soumission de devis
- `quote-comparison-modal.tsx` - Comparaison side-by-side
- `quote-validation-modal.tsx` - Validation gestionnaire

**Documents & Preuves** :
- `intervention-document-upload.tsx` - Upload documents
- `intervention-document-viewer.tsx` - Visualisation
- `work-completion-form.tsx` - Rapport de complétion

**Communication** :
- `intervention-comments.tsx` - Système de commentaires
- `intervention-chat.tsx` - Chat temps réel

**Finalization** :
- `manager-finalization-modal.tsx` - Finalisation gestionnaire
- `tenant-validation-modal.tsx` - Validation locataire
- `cancellation-modal.tsx` - Annulation avec raison

---

## 📧 Système d'Emails

### 📨 18 React Email Templates

SEIDO utilise **Resend** et **React Email** pour les emails transactionnels avec templates professionnels.

#### Templates d'Authentification (5)

| Template | Fichier | Déclencheur | Variables |
|----------|---------|-------------|-----------|
| **Welcome** | `auth/welcome.tsx` | Inscription complétée | firstName, role, loginUrl |
| **Signup Confirmation** | `auth/signup-confirmation.tsx` | Nouveau compte | firstName, confirmationUrl, expiresIn |
| **Invitation** | `auth/invitation.tsx` | Invitation équipe | inviterName, teamName, acceptUrl, role |
| **Password Reset** | `auth/password-reset.tsx` | Demande reset | firstName, resetUrl, expiresIn |
| **Password Changed** | `auth/password-changed.tsx` | Mot de passe changé | firstName, changeTime, ipAddress |

#### Templates d'Interventions (6)

| Template | Fichier | Déclencheur | Destinataires |
|----------|---------|-------------|---------------|
| **Intervention Created** | `interventions/intervention-created.tsx` | Nouvelle intervention | Gestionnaire, Prestataires concernés |
| **Intervention Approved** | `interventions/intervention-approved.tsx` | Approbation | Locataire, Prestataires |
| **Intervention Rejected** | `interventions/intervention-rejected.tsx` | Rejet | Locataire |
| **Intervention Scheduled** | `interventions/intervention-scheduled.tsx` | Créneau confirmé | Prestataire, Locataire |
| **Intervention Completed** | `interventions/intervention-completed.tsx` | Travail terminé | Gestionnaire, Locataire |
| **Intervention Status Change** | `interventions/intervention-status-change.tsx` | Changement statut | Parties prenantes |

#### Templates de Devis (4)

| Template | Fichier | Déclencheur | Destinataires |
|----------|---------|-------------|---------------|
| **Quote Request** | `quotes/quote-request.tsx` | Demande de devis | Prestataire |
| **Quote Submitted** | `quotes/quote-submitted.tsx` | Devis soumis | Gestionnaire |
| **Quote Approved** | `quotes/quote-approved.tsx` | Devis validé | Prestataire |
| **Quote Rejected** | `quotes/quote-rejected.tsx` | Devis rejeté | Prestataire |

#### Templates Généraux (3)

| Template | Fichier | Usage |
|----------|---------|-------|
| **Notification Digest** | `general/notification-digest.tsx` | Résumé quotidien notifications |
| **Document Shared** | `general/document-shared.tsx` | Partage de document |
| **System Alert** | `general/system-alert.tsx` | Alertes système |

### 📧 Email Client IMAP/SMTP (Gestionnaire)

**Fonctionnalités** :
- ✅ Configuration multiple comptes email
- ✅ Synchronisation IMAP (emails entrants)
- ✅ Envoi SMTP (emails sortants)
- ✅ Association emails ↔ interventions
- ✅ Gestion pièces jointes
- ✅ Statut lu/non lu
- ✅ Test connexion intégré

**Services** :
- `lib/services/domain/email-sync.service.ts` - Sync IMAP
- `lib/services/domain/imap.service.ts` - Client IMAP
- `lib/services/domain/smtp.service.ts` - Client SMTP
- `lib/services/domain/encryption.service.ts` - Chiffrement credentials

**Routes API** :
- `POST /api/emails/connections` - Créer connexion
- `POST /api/emails/connections/[id]/sync` - Synchroniser
- `POST /api/emails/connections/[id]/test` - Tester connexion
- `POST /api/emails/send` - Envoyer email

### 🚀 Resend Batch API

**Performance** :
- ✅ Jusqu'à 100 emails/requête
- ✅ Batch automatique dans `EmailNotificationService`
- ✅ Retry logic intégré
- ✅ Tracking deliverability

**Architecture** :
```typescript
Server Actions → NotificationDispatcher → EmailNotificationService → Resend Batch API
```

### 🔗 Magic Links pour Notifications Email (Dec 24, 2025)

**Connexion automatique via liens email** - Les boutons CTA des emails de notification utilisent des magic links Supabase permettant une connexion automatique puis redirection vers la page cible.

**Fonctionnement** :
1. 📧 L'utilisateur reçoit un email de notification (ex: nouvelle intervention)
2. 🔗 Le bouton CTA contient un **magic link** avec `token_hash` + `next` parameter
3. ✅ Clic → Vérification OTP → Session établie → Redirection automatique
4. 🔄 Fallback gracieux : si génération échoue, URL directe (connexion manuelle)

**Architecture** :
| Fichier | Rôle |
|---------|------|
| `lib/services/domain/magic-link.service.ts` | Génération batch des magic links |
| `app/auth/email-callback/route.ts` | Callback OTP verification + redirection |

**Sécurité** :
- ✅ Tokens cryptographiquement sécurisés par Supabase
- ✅ Validation `next` parameter contre open redirect
- ✅ Expiration configurable (recommandé: 7 jours via Supabase Dashboard)
- ✅ Batch generation avec chunking (max 10 concurrents)

**Fonctions batch utilisant magic links** :
- `sendInterventionCreatedBatch` - Nouvelle intervention
- `sendInterventionScheduledBatch` - Intervention planifiée
- `sendInterventionCompletedBatch` - Intervention terminée
- `sendInterventionStatusChangedBatch` - Changement de statut
- `sendTimeSlotsProposedBatch` - Créneaux proposés

---

## 🔌 API Routes Reference

### 86 Routes API (100% authentifiées, 100% rate-limited)

#### Authentication & Users (12 routes)

| Méthode | Route | Rate Limit | Validation | Description |
|---------|-------|------------|------------|-------------|
| POST | `/api/accept-invitation` | STRICT | ✅ | Accepter invitation équipe |
| POST | `/api/auth/accept-invitation` | STRICT | ✅ | Accepter invitation auth |
| POST | `/api/change-email` | STRICT | ✅ | Changer email utilisateur |
| POST | `/api/change-password` | STRICT | ✅ | Changer mot de passe |
| POST | `/api/reset-password` | STRICT | ✅ | Reset mot de passe |
| POST | `/api/invite-user` | MODERATE | ✅ | Inviter utilisateur |
| POST | `/api/resend-invitation` | MODERATE | ✅ | Renvoyer invitation |
| POST | `/api/cancel-invitation` | NORMAL | ✅ | Annuler invitation |
| POST | `/api/create-provider-account` | MODERATE | ✅ | Créer compte prestataire |
| PATCH | `/api/update-user-profile` | NORMAL | ✅ | Mettre à jour profil |
| POST | `/api/upload-avatar` | MODERATE | ✅ | Upload avatar |
| POST | `/api/signup-complete` | STRICT | ❌ | (Deprecated) |

#### Buildings & Lots (4 routes)

| Méthode | Route | Rate Limit | Validation | Description |
|---------|-------|------------|------------|-------------|
| GET/POST | `/api/buildings` | NORMAL | ✅ (POST) | Liste / Créer immeuble |
| GET/PUT/DELETE | `/api/buildings/[id]` | NORMAL | ✅ (PUT) | Détail / Modifier / Supprimer |
| GET/POST | `/api/lots` | NORMAL | ✅ (POST) | Liste / Créer lot |
| GET/PUT/DELETE | `/api/lots/[id]` | NORMAL | ✅ (PUT) | Détail / Modifier / Supprimer |

#### Contacts (5 routes)

| Méthode | Route | Rate Limit | Validation | Description |
|---------|-------|------------|------------|-------------|
| POST | `/api/create-contact` | MODERATE | ✅ | Créer contact |
| POST | `/api/send-existing-contact-invitation` | MODERATE | ✅ | Inviter contact existant |
| POST | `/api/check-email-team` | NORMAL | ✅ | Vérifier email dans équipe |
| GET | `/api/check-active-users` | NORMAL | ❌ | Vérifier utilisateurs actifs |
| GET | `/api/company/lookup` | LENIENT | ❌ | Lookup infos entreprise |

#### Interventions (30+ routes)

| Méthode | Route | Rate Limit | Validation | Description |
|---------|-------|------------|------------|-------------|
| POST | `/api/create-intervention` | MODERATE | ✅ | Créer intervention (locataire) |
| POST | `/api/create-manager-intervention` | MODERATE | ✅ | Créer intervention (gestionnaire) |
| POST | `/api/intervention-approve` | NORMAL | ✅ | Approuver intervention |
| POST | `/api/intervention-reject` | NORMAL | ✅ | Rejeter intervention |
| POST | `/api/intervention-cancel` | NORMAL | ✅ | Annuler intervention |
| POST | `/api/intervention-schedule` | NORMAL | ✅ | Planifier intervention |
| POST | `/api/intervention-start` | NORMAL | ✅ | Démarrer travail |
| POST | `/api/intervention-complete` | NORMAL | ✅ | Marquer complété |
| POST | `/api/intervention-finalize` | NORMAL | ✅ | Finaliser (gestionnaire) |
| POST | `/api/intervention-validate-tenant` | NORMAL | ✅ | Valider (locataire) |
| PATCH | `/api/intervention/[id]/status` | NORMAL | ✅ | Mettre à jour statut |
| POST | `/api/intervention/[id]/select-slot` | NORMAL | ✅ | Sélectionner créneau |
| POST | `/api/intervention/[id]/availability-response` | NORMAL | ✅ | Répondre disponibilité |
| POST | `/api/intervention/[id]/work-completion` | MODERATE | ✅ | Rapport complétion |
| POST | `/api/intervention/[id]/manager-finalization` | NORMAL | ✅ | Finalisation gestionnaire |
| POST | `/api/intervention/[id]/tenant-validation` | NORMAL | ✅ | Validation locataire |
| ... | (+ routes quotes, documents, availabilities) | ... | ... | ... |

#### Quotes (8 routes)

| Méthode | Route | Rate Limit | Validation | Description |
|---------|-------|------------|------------|-------------|
| POST | `/api/intervention-quote-request` | MODERATE | ✅ | Demander devis |
| POST | `/api/intervention-quote-submit` | MODERATE | ✅ | Soumettre devis |
| POST | `/api/intervention-quote-validate` | NORMAL | ✅ | Valider devis |
| POST | `/api/quotes/[id]/approve` | NORMAL | ✅ | Approuver devis |
| POST | `/api/quotes/[id]/reject` | NORMAL | ✅ | Rejeter devis |
| POST | `/api/quotes/[id]/cancel` | NORMAL | ✅ | Annuler devis |
| GET | `/api/quote-requests` | NORMAL | ❌ | Liste demandes devis |
| GET | `/api/quote-requests/[id]` | NORMAL | ❌ | Détail demande devis |

#### Documents (6 routes)

| Méthode | Route | Rate Limit | Validation | Description |
|---------|-------|------------|------------|-------------|
| GET/POST | `/api/property-documents` | MODERATE (POST) | ✅ (POST) | Liste / Upload document propriété |
| GET/DELETE | `/api/property-documents/[id]` | NORMAL | ❌ | Détail / Supprimer document |
| GET | `/api/property-documents/[id]/download` | LENIENT | ❌ | Télécharger document |
| POST | `/api/upload-intervention-document` | MODERATE | ✅ | Upload document intervention |
| GET | `/api/download-intervention-document` | LENIENT | ❌ | Télécharger document |

#### Email System (12 routes)

| Méthode | Route | Rate Limit | Validation | Description |
|---------|-------|------------|------------|-------------|
| GET | `/api/emails` | NORMAL | ❌ | Liste emails |
| POST | `/api/emails/send` | MODERATE | ✅ | Envoyer email |
| GET/POST | `/api/emails/connections` | NORMAL / MODERATE | ✅ (POST) | Liste / Créer connexion |
| GET/PUT/DELETE | `/api/emails/connections/[id]` | NORMAL | ✅ (PUT) | Détail / Modifier / Supprimer |
| POST | `/api/emails/connections/[id]/sync` | MODERATE | ❌ | Synchroniser emails |
| POST | `/api/emails/connections/[id]/test` | NORMAL | ❌ | Tester connexion |
| GET | `/api/cron/sync-emails` | LENIENT | ❌ | Sync automatique (cron) |

#### Notifications & Logs (4 routes)

| Méthode | Route | Rate Limit | Validation | Description |
|---------|-------|------------|------------|-------------|
| GET/POST/PATCH | `/api/notifications` | NORMAL | ✅ (POST) | Gérer notifications |
| GET | `/api/activity-logs` | NORMAL | ❌ | Liste activity logs |
| GET | `/api/activity-stats` | NORMAL | ❌ | Statistiques activité |
| POST | `/api/push/subscribe` | MODERATE | ✅ | S'abonner push |
| POST | `/api/push/unsubscribe` | NORMAL | ✅ | Se désabonner push |

---

## 🎨 Bibliothèque de Composants

### 264 Composants UI

#### 📚 Storybook (Documentation Interactive)

**19 stories** documentant les composants intervention preview. Lancer avec `npm run storybook`.

| Catégorie | Stories | Composants |
|-----------|---------|------------|
| **Atoms** | 6 | role-badge, status-badge, participant-avatar, message-bubble, time-slot-card, document-item |
| **Cards** | 7 | planning-card, intervention-details-card, summary-card, comments-card, documents-card, conversation-card, quotes-card |
| **Sidebar** | 4 | participants-list, progression-timeline, conversation-button, intervention-sidebar |
| **Layout** | 2 | intervention-tabs, preview-hybrid-layout |

#### shadcn/ui Base (50+ composants)

Situés dans `components/ui/` :

**Layout & Navigation** :
- `accordion`, `tabs`, `separator`, `card`, `sheet`, `dialog`, `drawer`

**Forms & Inputs** :
- `button`, `input`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `slider`, `form`, `label`

**Data Display** :
- `table`, `badge`, `avatar`, `skeleton`, `tooltip`, `popover`, `hover-card`, `alert`, `toast`

**Feedback** :
- `progress`, `spinner`, `alert-dialog`, `toast` (sonner)

**Typography** :
- Typographie Tailwind + `text` utilities

#### Intervention Workflow (76 composants)

Situés dans `components/intervention/` et `components/interventions/shared/` :

**Shared Components - Preview Design** (19 composants) :

Nouvelle architecture modulaire pour les previews d'intervention :
```
components/interventions/shared/
├── atoms/          # Composants atomiques réutilisables
├── cards/          # Cartes de contenu (devis, documents, commentaires)
├── sidebar/        # Sidebar avec participants et progression
└── layout/         # Layouts et tabs
```

**Planning & Scheduling** (12 composants) :
- `availability-form.tsx`
- `time-slot-proposal-form.tsx`
- `time-slot-responses-modal.tsx`
- `slot-selection-modal.tsx`
- `availability-suggestions.tsx`
- `calendar-view.tsx`
- + 6 autres composants

**Quote System** (8 composants) :
- `quote-request-form.tsx`
- `quote-submission-form.tsx`
- `quote-comparison-modal.tsx`
- `quote-validation-modal.tsx`
- `quote-list.tsx`
- + 3 autres composants

**Documents & Attachments** (7 composants) :
- `intervention-document-upload.tsx`
- `intervention-document-viewer.tsx`
- `work-completion-form.tsx`
- `document-gallery.tsx`
- + 3 autres composants

**Communication** (6 composants) :
- `intervention-comments.tsx`
- `intervention-chat.tsx`
- `comment-form.tsx`
- `chat-bubble.tsx`
- + 2 autres composants

**Finalization & Validation** (8 composants) :
- `manager-finalization-modal.tsx`
- `tenant-validation-modal.tsx`
- `cancellation-modal.tsx`
- `rejection-modal.tsx`
- + 4 autres composants

**Status & Progress** (16 composants) :
- `intervention-status-badge.tsx`
- `intervention-timeline.tsx`
- `status-card-demande.tsx`
- `status-card-approuvee.tsx`
- `status-card-demande-de-devis.tsx`
- `status-card-planification.tsx`
- `status-card-planifiee.tsx`
- `status-card-en-cours.tsx`
- `status-card-cloturee-par-prestataire.tsx`
- + 7 autres composants

#### Dashboards & Views (30+ composants)

**Dashboard Components** :
- `dashboard-header.tsx`
- `stats-card.tsx`
- `recent-interventions-list.tsx`
- `pending-actions-card.tsx`
- `portfolio-overview.tsx`
- + 25 autres composants

#### Email & Notifications (15 composants)

**Email Client** :
- `email-list.tsx`
- `email-viewer.tsx`
- `email-composer.tsx`
- `email-connection-form.tsx`
- + 11 autres composants

**Notifications** :
- `notification-list.tsx`
- `notification-bell.tsx`
- `notification-card.tsx`
- `realtime-notification-provider.tsx`

#### Forms & Validation (30+ composants)

**Building & Lot Forms** :
- `building-form.tsx`
- `lot-form.tsx`
- `contact-form.tsx`
- `property-document-upload-form.tsx`
- + 26 autres composants

#### Layouts (12 composants)

- `navbar.tsx`
- `sidebar.tsx`
- `footer.tsx`
- `layout-wrapper.tsx`
- `role-layout.tsx`
- + 7 autres composants

---

## 🔐 Sécurité & Authentification

### 3-Layer Security Model

```
┌─────────────────────────────────────────────────────────┐
│                  Layer 1: Database                      │
│              Row Level Security (RLS)                   │
│  ┌───────────────────────────────────────────────┐     │
│  │ • Multi-tenant isolation via team_id          │     │
│  │ • Helper functions (is_admin, is_gestionnaire)│     │
│  │ • Policy enforcement at PostgreSQL level     │     │
│  └───────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                Layer 2: Application                     │
│         Centralized Auth Contexts                       │
│  ┌───────────────────────────────────────────────┐     │
│  │ • getServerAuthContext() - Server Components  │     │
│  │ • getApiAuthContext() - API Routes            │     │
│  │ • Role-based access control                   │     │
│  │ • Team membership validation                  │     │
│  └───────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Layer 3: API                          │
│       Rate Limiting + Zod Validation                    │
│  ┌───────────────────────────────────────────────┐     │
│  │ • Upstash Redis rate limiting (4 tiers)       │     │
│  │ • Zod validation (59 schemas, 95% coverage)   │     │
│  │ • Request/response sanitization               │     │
│  │ • CSRF protection                             │     │
│  └───────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

### Row Level Security (RLS)

Toutes les tables sensibles sont protégées par des politiques RLS Supabase :

```sql
-- Exemple : Les gestionnaires voient uniquement leurs bâtiments
CREATE POLICY "Gestionnaires access own buildings" ON buildings
FOR SELECT USING (
  is_gestionnaire() AND
  team_id = (SELECT team_id FROM users WHERE auth_user_id = auth.uid())
);

-- Les locataires voient uniquement leurs interventions
CREATE POLICY "Tenants view own interventions" ON interventions
FOR SELECT USING (
  is_tenant_of_lot(lot_id)
);

-- Les prestataires voient les interventions assignées
CREATE POLICY "Providers view assigned interventions" ON interventions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM intervention_assignments
    WHERE intervention_id = interventions.id
    AND provider_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  )
);
```

**Helper Functions RLS** (9 fonctions) :
- `is_admin()` - Vérifie si utilisateur admin
- `is_gestionnaire()` - Vérifie si gestionnaire
- `is_team_manager(team_id)` - Vérifie si manager de l'équipe
- `can_view_building(building_id)` - Vérifie accès immeuble
- `can_view_lot(lot_id)` - Vérifie accès lot
- `is_tenant_of_lot(lot_id)` - Vérifie si locataire du lot
- `get_building_team_id(building_id)` - Récupère team_id immeuble
- `get_lot_team_id(lot_id)` - Récupère team_id lot
- `get_user_team_id()` - Récupère team_id utilisateur

### Audit de Sécurité (Octobre 2025)

#### ✅ Résultats Audit

| Catégorie | Score | Détails |
|-----------|-------|---------|
| **Authentification** | 100% | 86/86 routes authentifiées |
| **Rate Limiting** | 100% | 86/86 routes throttlées |
| **Validation** | 95% | 52/55 routes validées (100% avec body) |
| **RLS Policies** | 100% | Toutes tables sensibles protégées |
| **Type Safety** | 100% | TypeScript strict, 0 erreur |

#### 🔒 Failles Corrigées (9 critiques)

1. ✅ **3 pages sans auth** - Server auth context ajouté
2. ✅ **Auth code dupliqué** - 4,000 lignes éliminées
3. ✅ **Routes sans rate limiting** - 86 routes protégées
4. ✅ **Validation manquante** - 52 schémas Zod ajoutés
5. ✅ **SQL injection risk** - UUID validation stricte
6. ✅ **DoS via uploads** - File size limits (100MB)
7. ✅ **Brute force auth** - STRICT rate limit (5 req/10s)
8. ✅ **CSRF tokens** - Next.js built-in protection
9. ✅ **Sensitive data exposure** - RLS + field filtering

### Authentication Flow

```typescript
// Server Components (21 pages migrées)
import { getServerAuthContext } from '@/lib/server-context'

export default async function GestionnairePage() {
  const { user, profile, team, supabase } = await getServerAuthContext('gestionnaire')

  // Data fetching with authenticated client
  const data = await someService.getData(team.id)

  return <PageComponent data={data} />
}

// API Routes (86 routes migrées)
import { getApiAuthContext } from '@/lib/api-auth-helper'

export async function POST(request: Request) {
  const authResult = await getApiAuthContext({ requiredRole: 'gestionnaire' })
  if (!authResult.success) return authResult.error

  const { supabase, userProfile } = authResult.data

  // Business logic with authenticated client
}

// Client Components
import { useAuth } from '@/hooks/use-auth'
import { useTeamStatus } from '@/hooks/use-team-status'

function ClientComponent() {
  const { user, profile } = useAuth()
  const { currentTeam } = useTeamStatus()

  // Client-side logic
}
```

### Impersonation Security (Admin Only)

L'impersonation permet aux admins de se connecter en tant qu'un autre utilisateur pour debug et support.

**Flow sécurisé** :
```
1. Admin clique "Se connecter en tant que" sur /admin/users
2. Server Action vérifie le rôle admin
3. Magic link généré via supabaseAdmin.auth.admin.generateLink()
4. Email admin stocké dans cookie JWT signé (4h expiration)
5. Callback vérifie OTP et établit session utilisateur
6. Bandeau orange visible pendant toute la session
7. "Revenir à mon compte" restaure la session admin
```

**Mesures de sécurité** :
| Mesure | Détails |
|--------|---------|
| **Auth vérification** | `getServerAuthContext('admin')` obligatoire |
| **JWT signé** | Cookie signé avec `SUPABASE_JWT_SECRET` |
| **Expiration** | Token valide 4 heures maximum |
| **Audit trail** | Logging de start/stop impersonation |
| **Visual indicator** | Bandeau orange permanent (non masquable) |
| **RLS preserved** | L'admin voit exactement ce que voit l'utilisateur |

**Fichiers** :
- `lib/impersonation-jwt.ts` - Utilities JWT
- `app/actions/impersonation-actions.ts` - Server Actions
- `app/auth/impersonate/callback/route.ts` - OTP callback
- `components/impersonation-banner.tsx` - Visual indicator

---

## 🧪 Tests & Qualité

### Infrastructure de Tests

#### Unit Tests (Vitest)

**Coverage** : 60% (cible: 80%)

**Fichiers testés** :
- `lib/services/__tests__/` - Repository pattern tests
- `lib/services/domain/__tests__/` - Domain service tests
- `hooks/__tests__/` - Custom hooks tests
- `lib/__tests__/` - Utility functions tests

**Commandes** :
```bash
npm test                   # Run all unit tests
npm run test:coverage      # Generate coverage report
npm test -- --watch        # Watch mode
```

#### Integration Tests (Playwright)

**Coverage** : E2E tests pour user-facing features

**Test Suites** :
- Authentication flows (signup, login, role-based access)
- Building/lot CRUD operations
- Intervention lifecycle (11 statuses)
- Quote submission and validation
- Multi-role scenarios

**Helpers** (Pattern 5 - Test Isolation) :
- `tests-new/helpers/auth-helper.ts` - Authentication utilities
- `tests-new/helpers/navigation-helper.ts` - Page navigation
- `tests-new/helpers/isolation-helper.ts` - Data isolation
- `tests-new/helpers/debug-helper.ts` - Auto-healing debug

**Commandes** :
```bash
npm run test:new                    # All E2E tests
npx playwright test --grep="Phase 2"  # Specific phase
npx playwright test --ui            # Interactive UI mode
npx playwright test --debug         # Debug mode
npx playwright show-report          # View test report
```

### Métriques Qualité

| Métrique | Actuel | Cible | Statut | Actions |
|----------|--------|-------|--------|---------|
| **Unit Test Coverage** | 60% | 80% | 🟡 En cours | Augmenter tests services |
| **E2E Pass Rate** | 58% | 95% | 🟡 Amélioration | Stabiliser tests flaky |
| **API Response Time** | <100ms | <100ms | ✅ Atteint | Maintenir optimisations |
| **E2E Test Duration** | <5min | <5min | ✅ Optimal | - |
| **TypeScript Errors** | 0 | 0 | ✅ Parfait | Strict mode maintenu |
| **ESLint Issues** | 0 | 0 | ✅ Clean | Linter automatique |
| **Build Time** | <2min | <3min | ✅ Rapide | - |
| **Lighthouse Score** | 85+ | 90+ | 🟡 Optimiser | Performance audit |

### Quality Assurance Process

1. **Pre-commit** :
   - ✅ ESLint auto-fix
   - ✅ TypeScript type-check
   - ✅ Prettier formatting

2. **Pre-push** :
   - ✅ Unit tests
   - ✅ Build validation

3. **CI/CD** (Vercel) :
   - ✅ E2E tests
   - ✅ Lighthouse audit
   - ✅ Security scan
   - ✅ Performance metrics

---

## ⚡ Performance & Optimisation

### Stratégie de Caching Multi-Niveaux

```typescript
// L1 Cache : LRU In-Memory (rapide, volatile)
const lruCache = new LRU<string, CachedData>({
  max: 500,           // 500 entrées max
  ttl: 1000 * 60 * 5  // 5 minutes TTL
})

// L2 Cache : Redis (persistant, partagé)
const redisCache = new Redis(process.env.REDIS_URL)

// L3 : Database (source de vérité)

// Pattern : Cache-Aside avec Fallback
async function getData(key: string) {
  // 1. Check L1 (LRU - ~1ms)
  let data = lruCache.get(key)
  if (data) return data

  // 2. Check L2 (Redis - ~5-10ms)
  data = await redisCache.get(key)
  if (data) {
    lruCache.set(key, data)
    return data
  }

  // 3. Fetch from DB (~50-100ms)
  data = await database.fetch(key)
  await redisCache.set(key, data, 'EX', 300) // 5min
  lruCache.set(key, data)
  return data
}
```

### Optimisations Implémentées

#### Database Layer

- ✅ **DataLoader Pattern** : Batch loading pour éviter N+1 queries
- ✅ **Query Optimization** : SELECT spécifiques, pas de `SELECT *`
- ✅ **Database Indexes** : 15+ indexes sur foreign keys et filtres fréquents
- ✅ **Connection Pooling** : Supabase connection pool
- ✅ **Prepared Statements** : Protection SQL injection + performance

#### Application Layer

- ✅ **Server Components** : Rendu côté serveur par défaut (React 19)
- ✅ **Streaming SSR** : Suspense boundaries pour progressive rendering
- ✅ **React.cache()** : Deduplication requests dans Server Components
- ✅ **Memoization** : useMemo/useCallback dans Client Components
- ✅ **Code Splitting** : Route-based + dynamic imports

#### Network Layer

- ✅ **API Response Compression** : Gzip/Brotli
- ✅ **Image Optimization** : Next.js Image component (WebP, lazy load)
- ✅ **Font Optimization** : Next.js font optimization
- ✅ **Static Asset Caching** : CDN + long-lived cache headers

### Performance Metrics

| Métrique | Valeur | Cible | Méthode |
|----------|--------|-------|---------|
| **First Contentful Paint (FCP)** | 1.2s | <1.8s | Lighthouse |
| **Largest Contentful Paint (LCP)** | 2.1s | <2.5s | Lighthouse |
| **Time to Interactive (TTI)** | 2.8s | <3.5s | Lighthouse |
| **API Response (p95)** | 87ms | <100ms | Monitoring |
| **API Response (p99)** | 142ms | <200ms | Monitoring |
| **Database Query (avg)** | 45ms | <50ms | Supabase logs |
| **Redis Hit Rate** | 78% | >75% | Redis stats |
| **LRU Hit Rate** | 92% | >90% | In-memory metrics |

---

## 🚀 Installation & Démarrage Rapide

### Prérequis

- **Node.js** 18+ et npm
- **Compte Supabase** (gratuit sur [supabase.com](https://supabase.com))
- **Compte Resend** (optionnel, pour emails - [resend.com](https://resend.com))
- **Compte Upstash** (optionnel, pour Redis - [upstash.com](https://upstash.com))

### 1. Clone et Installation

```bash
# Cloner le repository
git clone https://github.com/aumugisha-umu/seido.git
cd seido

# Installer les dépendances
npm install
```

### 2. Configuration Environnement

Créer un fichier `.env.local` à la racine :

```bash
# ========================================
# SUPABASE CONFIGURATION
# ========================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ========================================
# APPLICATION URL
# ========================================
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# ========================================
# EMAIL CONFIGURATION (Resend)
# ========================================
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL="SEIDO <noreply@yourdomain.com>"

# ========================================
# REDIS CACHE (Optionnel - Upstash)
# ========================================
REDIS_URL=redis://localhost:6379
# OU pour Upstash:
# REDIS_URL=rediss://:password@endpoint.upstash.io:6379

# ========================================
# RATE LIMITING (Optionnel - Upstash)
# ========================================
UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# ========================================
# LOGGING
# ========================================
LOG_LEVEL=debug  # trace, debug, info, warn, error, fatal
```

> 📘 **Guide détaillé** : Voir [docs/VERCEL_ENV_SETUP.md](./docs/VERCEL_ENV_SETUP.md) pour la configuration complète

### 3. Configuration Base de Données

```bash
# Appliquer les migrations Supabase
npx supabase db push

# Générer les types TypeScript
npm run supabase:types

# (Optionnel) Seed avec données de test
npx supabase db reset
```

### 4. Lancer l'Application

```bash
# Mode développement
npm run dev

# L'application sera disponible sur http://localhost:3000
```

**Utilisateurs de test** (après seed de la base) :
- **Admin**: `admin@seido.pm` / `password123`
- **Gestionnaire**: `gestionnaire@seido.pm` / `password123`
- **Prestataire**: `prestataire@seido.pm` / `password123`
- **Locataire**: `locataire@seido.pm` / `password123`

---

## 📚 Scripts de Développement

```bash
# ========================================
# DÉVELOPPEMENT
# ========================================
npm run dev              # Dev server (localhost:3000)
npm run dev:utf8         # Force UTF-8 encoding (Windows)
npm run dev:no-emoji     # Logs sans emojis
npm run build            # Production build
npm run start            # Production server

# ========================================
# BASE DE DONNÉES
# ========================================
npm run supabase:types   # Générer types TypeScript
npx supabase db push     # Appliquer migrations
npx supabase db reset    # Reset + seed
npx supabase migration new <name>  # Nouvelle migration

# ========================================
# TESTS
# ========================================
npm test                 # Unit tests (Vitest)
npm run test:coverage    # Coverage report
npm run test:watch       # Watch mode
npm run test:new         # E2E tests (Playwright)
npx playwright test --ui # Mode UI interactif
npx playwright test --debug  # Debug mode
npx playwright show-report   # View test report

# ========================================
# CODE QUALITY
# ========================================
npm run lint             # ESLint
npm run lint:fix         # Auto-fix issues
npm run type-check       # TypeScript validation (npx tsc --noEmit)

# ========================================
# VALIDATION CIBLÉE (Recommandé)
# ========================================
# Valider TypeScript sur fichiers spécifiques (rapide ~2-5s)
npx tsc --noEmit components/ui/my-component.tsx

# Lint ciblé
npm run lint -- components/ui/my-component.tsx
```

### ⚠️ Important : Pas de Build Automatique

**INTERDICTION de lancer `npm run build` sans demande explicite** :
- Les builds Next.js sont longs (~30-60 secondes)
- Ils consomment beaucoup de ressources
- Ils laissent des processus Node.js actifs qui causent des conflits
- Ils ne sont pas nécessaires pour valider du code TypeScript

**À la place, utiliser** :
```bash
# ✅ BON - Validation TS ciblée (rapide)
npx tsc --noEmit components/ui/my-component.tsx

# ❌ MAUVAIS - Build complet (lent)
npm run build
```

---

## 🗄️ Base de Données

### Statut des Migrations

| Phase | Description | Tables | Statut |
|-------|-------------|--------|--------|
| **Phase 1** | Users, Teams, Companies, Invitations | `users`, `teams`, `team_members`, `companies`, `user_invitations`, `company_members` | ✅ Appliquée |
| **Phase 2** | Buildings, Lots, Property Documents | `buildings`, `lots`, `building_contacts`, `lot_contacts`, `property_documents` | ✅ Appliquée |
| **Phase 3** | Interventions, Quotes, Chat, Notifications | `interventions`, `intervention_assignments`, `intervention_quotes`, `intervention_time_slots`, `time_slot_responses`, `intervention_documents`, `intervention_comments`, `intervention_links`, `conversation_threads`, `conversation_messages`, `notifications`, `activity_logs`, `push_subscriptions` | ✅ Appliquée |
| **Phase 4** | Contracts, Contract Contacts, Contract Documents | `contracts`, `contract_contacts`, `contract_documents`, `import_jobs` | ✅ Appliquée |
| **Optim** | Dénormalisation RLS + Vues _active | `*_active` views | ✅ Appliquée (2025-12-26) |
| **TOTAL** | **4 phases + optimisations** | **35 tables + 4 vues** | ✅ **Production** |

### Optimisations RLS (2025-12-26)

| Optimisation | Description | Impact |
|--------------|-------------|--------|
| **Dénormalisation team_id** | Ajout de `team_id` sur 4 tables (`conversation_messages`, `building_contacts`, `lot_contacts`, `intervention_time_slots`) | Élimine 1-3 JOINs par requête RLS |
| **Triggers automatiques** | Synchronisation `team_id` via triggers BEFORE INSERT | Transparence totale pour le code applicatif |
| **Vues _active** | 4 vues pré-filtrées `WHERE deleted_at IS NULL` | Simplifie les requêtes, évite les oublis |
| **147+ indexes** | Indexes partiels, composites, covering | Optimisation des politiques RLS |

**Vues disponibles :**
- `interventions_active` - Interventions non supprimées
- `buildings_active` - Immeubles actifs
- `lots_active` - Lots actifs
- `contracts_active` - Contrats actifs

### Schéma Principal

```sql
-- ========================================
-- PHASE 1: USERS & TEAMS
-- ========================================
users (
  id UUID PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users,
  email VARCHAR(255) UNIQUE NOT NULL,
  role user_role NOT NULL,  -- 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
  team_id UUID REFERENCES teams,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(20),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users
)

teams (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  manager_id UUID REFERENCES users,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

team_members (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams,
  user_id UUID REFERENCES users,
  role team_member_role,  -- 'manager' | 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW()
)

companies (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  vat_number VARCHAR(50),
  address TEXT,
  team_id UUID REFERENCES teams
)

user_invitations (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  role user_role NOT NULL,
  team_id UUID REFERENCES teams,
  invited_by UUID REFERENCES users,
  status invitation_status,  -- 'pending' | 'accepted' | 'expired' | 'cancelled'
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
)

-- ========================================
-- PHASE 2: BUILDINGS & LOTS
-- ========================================
buildings (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(255),
  postal_code VARCHAR(20),
  team_id UUID REFERENCES teams NOT NULL,
  manager_id UUID REFERENCES users,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users
)

lots (
  id UUID PRIMARY KEY,
  building_id UUID REFERENCES buildings,  -- NULL for standalone houses
  apartment_number VARCHAR(50),
  category lot_category NOT NULL,  -- 'appartement' | 'maison' | 'garage' | 'local_commercial' | 'parking' | 'autre'
  floor INT,
  surface_area NUMERIC(10,2),
  rooms INT,
  rent_amount NUMERIC(10,2),
  tenant_id UUID REFERENCES users,
  team_id UUID REFERENCES teams NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users
)

property_documents (
  id UUID PRIMARY KEY,
  building_id UUID REFERENCES buildings,
  lot_id UUID REFERENCES lots,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(100),
  file_size BIGINT,
  visibility_level document_visibility_level,  -- 'equipe' | 'locataire'
  uploaded_by UUID REFERENCES users,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
)

building_contacts (
  id UUID PRIMARY KEY,
  contact_id UUID REFERENCES users NOT NULL,
  building_id UUID REFERENCES buildings NOT NULL,
  role_type VARCHAR(100)  -- 'prestataire' | 'proprietaire' | etc.
)

lot_contacts (
  id UUID PRIMARY KEY,
  contact_id UUID REFERENCES users NOT NULL,
  lot_id UUID REFERENCES lots NOT NULL,
  role_type VARCHAR(100)  -- 'locataire' | 'proprietaire' | etc.
)

-- ========================================
-- PHASE 4: CONTRACTS (BAUX)
-- ========================================
contracts (
  id UUID PRIMARY KEY,
  team_id UUID REFERENCES teams NOT NULL,
  lot_id UUID REFERENCES lots NOT NULL,
  created_by UUID REFERENCES users,
  title TEXT,
  contract_type contract_type NOT NULL,  -- 'bail_habitation' | 'bail_meuble'
  status contract_status NOT NULL,       -- 'brouillon' | 'actif' | 'expire' | 'resilie' | 'renouvele'
  start_date DATE NOT NULL,
  duration_months INT NOT NULL,
  end_date DATE GENERATED,  -- start_date + duration_months
  payment_frequency payment_frequency,   -- 'mensuel' | 'trimestriel' | etc.
  payment_frequency_value INT DEFAULT 1,
  rent_amount DECIMAL(10,2),
  charges_amount DECIMAL(10,2),
  guarantee_type guarantee_type,         -- 'pas_de_garantie' | 'compte_proprietaire' | etc.
  guarantee_amount DECIMAL(10,2),
  guarantee_notes TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users
)

contract_contacts (
  id UUID PRIMARY KEY,
  contract_id UUID REFERENCES contracts NOT NULL,
  user_id UUID REFERENCES users NOT NULL,
  role contract_contact_role NOT NULL,   -- 'locataire' | 'colocataire' | 'garant' | 'autre'
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

contract_documents (
  id UUID PRIMARY KEY,
  contract_id UUID REFERENCES contracts NOT NULL,
  team_id UUID REFERENCES teams NOT NULL,
  document_type contract_document_type,  -- 'bail' | 'avenant' | 'etat_des_lieux_entree' | etc.
  filename TEXT NOT NULL,
  original_filename TEXT,
  file_size BIGINT,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'contract-documents',
  title TEXT,
  description TEXT,
  uploaded_by UUID REFERENCES users,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users
)

-- ========================================
-- PHASE 3: INTERVENTIONS
-- ========================================
interventions (
  id UUID PRIMARY KEY,
  lot_id UUID REFERENCES lots NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status intervention_status NOT NULL,  -- 11 statuses
  urgency urgency_level,  -- 'low' | 'medium' | 'high' | 'urgent'
  requester_id UUID REFERENCES users NOT NULL,
  team_id UUID REFERENCES teams NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT
)

intervention_assignments (
  id UUID PRIMARY KEY,
  intervention_id UUID REFERENCES interventions NOT NULL,
  provider_id UUID REFERENCES users NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES users
)

intervention_quotes (
  id UUID PRIMARY KEY,
  intervention_id UUID REFERENCES interventions NOT NULL,
  provider_id UUID REFERENCES users NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  status quote_status,  -- 'pending' | 'approved' | 'rejected' | 'cancelled'
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES users
)

-- + intervention_time_slots, time_slot_responses, intervention_documents,
--   intervention_comments, conversation_threads, conversation_messages,
--   notifications, activity_logs, push_subscriptions
```

### Enums

```sql
-- User & Team
user_role: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
team_member_role: 'manager' | 'member'
invitation_status: 'pending' | 'accepted' | 'expired' | 'cancelled'

-- Property
lot_category: 'appartement' | 'maison' | 'garage' | 'local_commercial' | 'parking' | 'autre'
document_visibility_level: 'equipe' | 'locataire'

-- Contracts (Baux)
contract_type: 'bail_habitation' | 'bail_meuble'
contract_status: 'brouillon' | 'actif' | 'expire' | 'resilie' | 'renouvele'
guarantee_type: 'pas_de_garantie' | 'compte_proprietaire' | 'compte_bloque' | 'e_depot' | 'autre'
payment_frequency: 'mensuel' | 'trimestriel' | 'semestriel' | 'annuel'
contract_contact_role: 'locataire' | 'colocataire' | 'garant' | 'autre'
contract_document_type: 'bail' | 'avenant' | 'etat_des_lieux_entree' | 'etat_des_lieux_sortie' |
                        'attestation_assurance' | 'justificatif_identite' | 'justificatif_revenus' |
                        'caution_bancaire' | 'quittance' | 'reglement_copropriete' | 'diagnostic' | 'autre'

-- Interventions
intervention_status:
  'demande' | 'rejetee' | 'approuvee' | 'demande_de_devis' |
  'planification' | 'planifiee' | 'en_cours' |
  'cloturee_par_prestataire' | 'cloturee_par_locataire' |
  'cloturee_par_gestionnaire' | 'annulee'

urgency_level: 'low' | 'medium' | 'high' | 'urgent'
quote_status: 'pending' | 'approved' | 'rejected' | 'cancelled'

-- Notifications
notification_type:
  'intervention' | 'chat' | 'document' | 'system' |
  'team_invite' | 'assignment' | 'reminder'
```

---

## 🚢 Déploiement Production

### Vercel (Recommandé)

SEIDO est optimisé pour Vercel avec support complet Next.js 15.

#### Étapes de Déploiement

```bash
# 1. Connecter à Vercel
npx vercel

# 2. Configurer les variables d'environnement
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
npx vercel env add RESEND_API_KEY
npx vercel env add RESEND_FROM_EMAIL
npx vercel env add UPSTASH_REDIS_REST_URL
npx vercel env add UPSTASH_REDIS_REST_TOKEN

# 3. Déployer
npx vercel --prod
```

#### Configuration Vercel

**vercel.json** :
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "framework": "nextjs",
  "regions": ["cdg1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  }
}
```

**Important** :
- Toutes les variables `NEXT_PUBLIC_*` nécessitent un **redéploiement** après modification
- Les variables serveur peuvent être modifiées sans redéploiement

### Configuration Supabase Production

1. **Créer un projet Supabase production** sur [supabase.com](https://supabase.com)
2. **Appliquer les migrations** :
   ```bash
   npx supabase db push --db-url "postgresql://..."
   ```
3. **Configurer les email templates** dans Supabase Auth Settings
4. **Vérifier les RLS policies** sont actives (Security → Policies)
5. **Activer Row Level Security** sur toutes les tables sensibles
6. **Configurer les limites de connexion** (Settings → Database)

### Configuration Resend Production

1. **Vérifier le domaine** dans Resend dashboard
2. **Configurer DNS records** (SPF, DKIM, DMARC)
3. **Tester l'envoi** depuis l'interface Resend
4. **Monitorer deliverability** via Resend analytics

### Configuration Upstash Redis

1. **Créer une base Redis** sur [upstash.com](https://upstash.com)
2. **Copier REST URL et TOKEN** dans variables d'environnement
3. **Configurer eviction policy** : `allkeys-lru`
4. **Monitorer usage** via Upstash dashboard

### Checklist Déploiement

- [ ] Variables d'environnement configurées
- [ ] Migrations Supabase appliquées
- [ ] RLS policies activées
- [ ] Email templates configurés
- [ ] Domaine email vérifié (Resend)
- [ ] Redis configuré (Upstash)
- [ ] Build production testé localement (`npm run build && npm run start`)
- [ ] Tests E2E passés (`npm run test:new`)
- [ ] Lighthouse audit > 85
- [ ] Monitoring configuré (Vercel Analytics)

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

### Processus de Contribution

1. **Fork le projet**
2. **Créer une branche feature** (`git checkout -b feature/amazing-feature`)
3. **Commit les changements** (`git commit -m '✨ Add amazing feature'`)
4. **Push vers la branche** (`git push origin feature/amazing-feature`)
5. **Ouvrir une Pull Request**

### Guidelines

**Code Style** :
- ✅ TypeScript strict mode
- ✅ kebab-case pour noms de composants (`my-component.tsx`)
- ✅ Event handlers préfixés "handle" (`handleClick`)
- ✅ Const functions : `const functionName = () => {}`
- ✅ Early returns pour lisibilité
- ✅ Tailwind pour styling (pas de CSS inline)
- ✅ Proper accessibility (tabindex, aria-label)

**Tests** :
- ✅ Unit tests pour nouvelles features
- ✅ E2E tests pour user flows critiques
- ✅ Maintenir coverage > 60%

**Documentation** :
- ✅ JSDoc pour fonctions publiques
- ✅ README mis à jour si nouvelles features
- ✅ User stories ajoutées si nouveau rôle/workflow

**Commits** :
- ✅ Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, etc.)
- ✅ Messages descriptifs en anglais ou français
- ✅ Référence issue si applicable (`#123`)

**Pull Requests** :
- ✅ Description claire du problème résolu
- ✅ Screenshots pour changements UI
- ✅ Tests ajoutés/mis à jour
- ✅ Build passe sans erreurs
- ✅ Revue par au moins 1 personne

---

## 📖 Documentation Supplémentaire

| Document | Description |
|----------|-------------|
| [CLAUDE.md](./.claude/CLAUDE.md) | Guidelines développement pour AI assistants |
| [VERCEL_ENV_SETUP.md](./docs/VERCEL_ENV_SETUP.md) | Configuration déploiement Vercel |
| [backend-architecture-report.md](./docs/backend-architecture-report.md) | Architecture backend détaillée |
| [rapport-audit-complet-seido.md](./docs/rapport-audit-complet-seido.md) | Audit complet de l'application |
| [HANDOVER.md](./docs/HANDOVER.md) | Documentation review sécurité/performance |
| [notification-migration-status.md](./docs/notification-migration-status.md) | Status migration notifications |
| [Tests HELPERS-GUIDE.md](./docs/refacto/Tests/HELPERS-GUIDE.md) | Patterns de tests E2E |
| [troubleshooting-checklist.md](./docs/troubleshooting-checklist.md) | Guide de résolution de problèmes |

---

## 📝 License

Ce projet est sous licence MIT. Voir [LICENSE](./LICENSE) pour plus de détails.

---

## 🙏 Remerciements

- [Next.js](https://nextjs.org/) - Framework React
- [Supabase](https://supabase.com/) - Backend-as-a-Service
- [shadcn/ui](https://ui.shadcn.com/) - Composants UI
- [Tailwind CSS](https://tailwindcss.com/) - Framework CSS
- [Resend](https://resend.com/) - Email transactionnel
- [Upstash](https://upstash.com/) - Redis serverless
- [Vercel](https://vercel.com/) - Hosting & déploiement
- [Playwright](https://playwright.dev/) - E2E testing
- [Vitest](https://vitest.dev/) - Unit testing

---

<div align="center">

**Fait avec ❤️ par l'équipe SEIDO**

[⬆ Retour en haut](#seido---plateforme-de-gestion-immobilière-multi-rôles)

</div>
