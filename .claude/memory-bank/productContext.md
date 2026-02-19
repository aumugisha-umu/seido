# SEIDO Product Context

## Problème Résolu

Les gestionnaires immobiliers passent 70-80% de leur temps en mode "pompier" :
- 2h/jour à chercher des informations dispersées
- 50 appels téléphoniques/jour pour des mises à jour de statut
- Aucune visibilité sur le travail des prestataires
- Chaos multi-canal (WhatsApp, email, SMS, téléphone)

## Solution SEIDO

1. **Plateforme unifiée** - Toutes les communications en un lieu
2. **Suivi temps réel** - Statut intervention visible par tous les acteurs
3. **Portails self-service** - Réduction 70% du volume d'appels
4. **Automatisation** - Templates, actions bulk, notifications intelligentes

## Frustrations par Persona

### Gestionnaire (Thomas - 70% users)

| Frustration | Solution SEIDO |
|-------------|----------------|
| "2h/jour à chercher les infos" | ContextPanel toujours visible, recherche globale |
| "50 appels/jour pour des statuts" | Portails self-service, statut temps réel |
| "Le prestataire est un trou noir" | Timeline end-to-end, timers SLA |

### Prestataire (Marc - 20% users)

| Frustration | Solution SEIDO |
|-------------|----------------|
| "Infos manquantes sur site" | Indicateur complétude, toutes infos avant déplacement |
| "Délais devis 2 semaines" | Notifications temps réel, suivi deadlines |
| "Annulations dernière minute" | Confirmation J-1, pénalités |

### Locataire (Emma - 10% users)

| Frustration | Solution SEIDO |
|-------------|----------------|
| "Ne sais pas où en est ma demande" | Timeline 8 étapes style Deliveroo |
| "Délais vagues" | Créneaux précis, rappel J-1 |
| "Documents perdus" | Espace documents centralisé |

## Modules Implémentés

### Phase 1 ✅ Core Architecture
- Authentification (JWT + OAuth Google)
- Gestion utilisateurs, équipes, entreprises
- Invitations avec magic links

### Phase 2 ✅ Property Management
- Biens immobiliers (immeubles, lots)
- Contacts associés
- Documents de propriété

### Phase 3 ✅ Interventions & Communication
- Workflow interventions (9 statuts - simplifié 2026-01)
- Chat/Conversations temps réel (5 thread types - étendu 2026-02)
- Notifications multi-canal (Email + In-App + Push)
- Email (IMAP/SMTP sync)

### Phase 4 ✅ Contracts & Import
- Gestion des contrats
- Documents contractuels
- Jobs d'import

### Phase 5 ✅ UX Improvements (Complete 2026-02)
- [x] Google OAuth integration
- [x] Onboarding modal (5 slides)
- [x] Avatar system
- [x] Email quote stripping improvements
- [x] Gmail OAuth integration (conversation threading)
- [x] Email link tracking (email_links table)
- [x] Memory Bank implementation
- [x] **PWA Push Notifications** (personal user alerts)
- [x] Chat message bubble layout enhancements
- [x] **Confirmation participants** (multi-step validation flow)
- [x] **Intervention types dynamiques** (37 types, admin UI)
- [x] **Individual conversation threads** (NEW 2026-02)
- [x] **Quote workflow notifications** (Email + In-App + Push)

### Phase 6 🚧 Performance & Polish (En cours)
- [x] Auth API optimization (250+ calls → 1 per navigation)
- [x] Infinite refresh loop fix (intervention detail page)
- [x] **Property Documents** (upload with slot configs, expiry dates, multi-lot support)
- [x] **Property Interventions Step** (5-step wizard for building/lot creation with scheduled interventions)
- [x] **Intervention Workflow Polish** (7 themes: flag-based quotes, status alignment, finalization)
- [x] **Code Review Fixes** (TDZ, multi-lot bugs, Zod validation, role checks)
- [x] **SEO Landing Page Optimization** (score 52→78/100, JSON-LD, FAQ schema)
- [x] **Blog Section** (landing preview, /blog index with filters, /blog/[slug] articles, sitemap SEO)
- [ ] Stripe Subscription integration (36 user stories ready)
- [ ] Google Maps integration (AddressInput + Geocoding)
- [ ] Dashboard analytics avancé

### Métriques Infrastructure (2026-02-19)
- **365 composants** (UI + dashboards + workflow + blog)
- **70 hooks** custom
- **19 repositories** + **33 domain services**
- **114 API routes**
- **165 migrations SQL**
- **2 blog articles** (SEO-optimized, sourced)

## Fonctionnalités Prévues
- [ ] Google Maps integration - Priorité: Haute (Phase 2-3 restantes)
- [ ] Export PDF rapports - Priorité: Moyenne
- [ ] Integration calendrier - Priorité: Moyenne
- [ ] Dashboard analytics avancé - Priorité: Haute

---
*Dernière mise à jour: 2026-02-19*
*Références: docs/design/persona-gestionnaire-unifie.md, persona-prestataire.md, persona-locataire.md*
