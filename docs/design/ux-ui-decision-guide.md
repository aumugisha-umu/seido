# SEIDO - UX/UI Decision Guide
## Guide de Décisions Design pour Application de Gestion Immobilière Multi-Rôles

**Version** : 2.0 (Restructuré)
**Date** : 2025-12-07
**Statut** : Production Ready

---

## Navigation Rapide

Ce guide est divisé en plusieurs fichiers pour faciliter la consultation :

### Par Rôle Utilisateur

| Rôle | Fichier | Description |
|------|---------|-------------|
| **Gestionnaire** | [ux-role-gestionnaire.md](./ux-role-gestionnaire.md) | Dashboard, interventions, création - 70% des users |
| **Prestataire** | [ux-role-prestataire.md](./ux-role-prestataire.md) | Planning, devis, mobile-first terrain |
| **Locataire** | [ux-role-locataire.md](./ux-role-locataire.md) | Wizard simplifié, suivi interventions |
| **Admin** | [ux-role-admin.md](./ux-role-admin.md) | Interface dense, outils système |

### Ressources Transversales

| Ressource | Fichier | Description |
|-----------|---------|-------------|
| **Principes UX** | [ux-common-principles.md](./ux-common-principles.md) | Nielsen, Material Design, Apple HIG |
| **Composants UI** | [ux-components.md](./ux-components.md) | Navigation, Forms, Notifications |
| **Anti-Patterns** | [ux-anti-patterns.md](./ux-anti-patterns.md) | Erreurs à éviter |
| **Métriques** | [ux-metrics.md](./ux-metrics.md) | KPIs UX à suivre |
| **Références** | [ux-references.md](./ux-references.md) | Apps et resources de référence |

---

## Personas de Référence

> Les décisions UX/UI sont basées sur ces personas :

| Persona | Fichier | Profil |
|---------|---------|--------|
| **Thomas Marchal** | [persona-gestionnaire-unifie.md](./persona-gestionnaire-unifie.md) | Gestionnaire, 280 logements, 80% mobile |
| **Emma Dubois** | [persona-locataire.md](./persona-locataire.md) | Locataire, 29 ans, mobile-first |
| **Marc Dufour** | [persona-prestataire.md](./persona-prestataire.md) | Artisan, 38 ans, 75% terrain |

---

## Executive Summary

### Challenges UX Principaux

| Challenge | Source | Solution |
|-----------|--------|----------|
| **Mode "Pompier"** | 70-80% temps réactif | Priorisation intelligente, filtres rapides |
| **Trou Noir Prestataires** | Aucune visibilité | Tracking end-to-end, SLA timers |
| **Multi-Canal** | WhatsApp + Email + SMS | Inbox unifiée, threading |
| **Peur Déléguer** | Manque traçabilité | Permissions granulaires, audit trail |
| **Burn-Out** | 60h/semaine | Automatisations, batch actions |

### Philosophie Design

> **"Professional without being corporate, powerful without being complex"**

#### Principes Directeurs

1. **Mobile-First Absolu** - 80% des gestionnaires en déplacement
2. **Progressive Disclosure** - Essentiel d'abord, détails au drill-down
3. **Action-Oriented** - Boutons visibles, raccourcis, bulk actions
4. **Trust Through Transparency** - Statuts temps réel, historique complet
5. **Consistency Across Roles** - Même design system, adaptations contextuelles

---

## Design System SEIDO

Le design system complet est documenté dans les fichiers suivants :

| Fichier | Contenu |
|---------|---------|
| [00-general.md](./00-general.md) | Introduction et principes |
| [01-colors.md](./01-colors.md) | Système de couleurs OKLCH |
| [02-typography.md](./02-typography.md) | Typographie et hiérarchie |
| [03-spacing.md](./03-spacing.md) | Système d'espacement 4px |
| [04-layouts.md](./04-layouts.md) | Grilles et layouts responsive |
| [05-components.md](./05-components.md) | Composants UI et métier |
| [06-icons.md](./06-icons.md) | Icônes Lucide React |
| [07-guidelines.md](./07-guidelines.md) | Bonnes pratiques UX |

---

## Checklist Rapide

### Avant de concevoir un écran

- [ ] Identifier le rôle utilisateur principal
- [ ] Consulter le fichier `ux-role-[role].md` correspondant
- [ ] Vérifier les principes dans `ux-common-principles.md`
- [ ] S'assurer de ne pas reproduire les anti-patterns

### Avant de développer

- [ ] Mobile-first (commencer par mobile)
- [ ] Touch targets ≥ 44px
- [ ] Skeleton loaders (pas spinners)
- [ ] Empty states définis
- [ ] Error states explicatifs

### Avant de livrer

- [ ] Test sur mobile réel
- [ ] Navigation clavier
- [ ] Contraste ≥ 4.5:1
- [ ] Métriques configurées

---

## Mise à Jour

Ce guide est maintenu par l'équipe SEIDO. Pour toute question ou suggestion :
- Ouvrir une issue sur le repo
- Contacter l'équipe UX/UI

**Dernière mise à jour** : 2025-12-07
