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
- Workflow interventions (11 statuts)
- Chat/Conversations temps réel
- Notifications multi-canal
- Email (IMAP/SMTP sync)

### Phase 4 ✅ Contracts & Import
- Gestion des contrats
- Documents contractuels
- Jobs d'import

### Phase 5 🚧 UX Improvements (En cours)
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
- [ ] Intervention types dynamiques

### Métriques Infrastructure (2026-01-22)
- **369 composants** (UI + dashboards + workflow)
- **58 hooks** custom
- **21 repositories** + **31 domain services**
- **113 API routes**

## Fonctionnalités Prévues
- [ ] Dashboard analytics avancé - Priorité: Haute
- [ ] Export PDF rapports - Priorité: Moyenne
- [ ] Integration calendrier - Priorité: Moyenne

---
*Dernière mise à jour: 2026-01-25*
*Références: docs/design/persona-gestionnaire-unifie.md, persona-prestataire.md, persona-locataire.md*
