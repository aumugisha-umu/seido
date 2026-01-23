# SEIDO Project Brief

## Vision
SEIDO est une plateforme de gestion immobilière multi-rôles qui unifie
la communication entre gestionnaires, prestataires et locataires pour
réduire le "mode pompier" de 70% à 30%.

## Objectifs Principaux
1. Réduire la charge gestionnaire (60h/semaine → 40h/semaine)
2. Éliminer le "phone ring hell" (50 appels/jour → 15/jour)
3. Visibilité end-to-end sur les interventions
4. Portails self-service pour tous les rôles

## Public Cible

| Rôle | % Users | Device | Besoin Principal |
|------|---------|--------|------------------|
| Gestionnaire | 70% | 80% mobile | Efficacité, vue d'ensemble |
| Prestataire | 20% | 75% mobile | Infos terrain, actions rapides |
| Locataire | 10% | Mobile-first | Suivi simple |
| Admin | <1% | Desktop | Gestion système |

## Personas Clés

### Thomas (Gestionnaire) - 70% des utilisateurs
- 280 logements, 80% mobile
- Frustration : "2h/jour à chercher les infos"
- Besoin : ContextPanel toujours visible, recherche globale

### Marc (Prestataire) - 20% des utilisateurs
- 38 ans, 75% terrain
- Frustration : "Infos manquantes sur site"
- Besoin : Indicateur complétude, toutes infos avant déplacement

### Emma (Locataire) - 10% des utilisateurs
- 29 ans, mobile-first
- Frustration : "Ne sais pas où en est ma demande"
- Besoin : Timeline 8 étapes style Deliveroo

## Contraintes Techniques
- Stack: Next.js 15, React 19, Supabase, TypeScript strict
- Multi-tenant avec RLS policies
- SSR-first avec @supabase/ssr
- Production-ready avec Repository Pattern + Service Layer

## Critères de Succès
- [ ] Création intervention < 30 sec (gestionnaire)
- [ ] Acceptation mission < 3 taps (prestataire)
- [ ] Soumission demande < 2 min (locataire)
- [ ] 0 fuite de données cross-tenant

---
*Dernière mise à jour: 2026-01-22*
*Source: docs/design/persona-*.md*
