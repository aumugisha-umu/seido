# SEIDO - Architecture Optimale Complète de Base de Données

> **Version** : 2.0.0
> **Date** : 2025-12-29

---

## Table des Matières

1. [Vue d'Ensemble](#1-vue-densemble)
2. [Architecture Contacts / Users](#2-architecture-contacts--users)
3. [Phase 1: Users & Teams](#3-phase-1-users--teams)
4. [Phase 2: Properties](#4-phase-2-properties)
5. [Phase 3: Interventions](#5-phase-3-interventions)
6. [Phase 3: Chat System](#6-phase-3-chat-system)
7. [Phase 3: Notifications & Audit](#7-phase-3-notifications--audit)
8. [Phase 3: Email System](#8-phase-3-email-system)
9. [Phase 4: Contracts](#9-phase-4-contracts)
10. [Phase 4: Import System](#10-phase-4-import-system)
11. [RBAC & Permissions](#11-rbac--permissions)
12. [Subscriptions](#12-subscriptions)
13. [Enums PostgreSQL](#13-enums-postgresql)
14. [Fonctions RLS](#14-fonctions-rls)
15. [Indexes de Performance](#15-indexes-de-performance)
16. [Types TypeScript](#16-types-typescript)
17. [Stratégie de Migration](#17-stratégie-de-migration)
18. [Références](#18-références)

---

## 1. Vue d'Ensemble

### 1.1 Statistiques Globales (Architecture Optimale)

| Métrique | Valeur Actuelle | Valeur Optimale |
|----------|-----------------|-----------------|
| **Tables** | 35 | 44 (+9) |
| **Enums PostgreSQL** | 31 | 37 (+6) |
| **Fonctions RLS** | 59 | 68 (+9) |
| **Indexes** | 100+ | 130+ |
| **Triggers** | 15+ | 20+ |
| **Storage Buckets** | 4 | 4 |

**Changements majeurs :**
- **+4 tables Stripe** : `stripe_customers`, `stripe_products`, `stripe_prices`, `stripe_invoices`
- **+3 tables RBAC/CRM** : `contacts`, `permissions`, `role_default_permissions`
- **+1 table addresses** : Centralisation des adresses (buildings, lots standalone, contacts, companies)
- **+1 table documents** : Centralisation polymorphe des documents (remplace property_documents, intervention_documents, contract_documents)
- **+3 enums Stripe** : `pricing_type`, `pricing_interval`, `invoice_status` (modifiée)
- **+3 enums documents** : `document_entity_type`, `document_type` (24 types unifiés), `document_visibility_level`
- **+3 fonctions RLS** : `has_active_subscription()`, `get_subscription_status()`, `is_subscription_valid()`
- **+5 permissions billing** : `billing.subscription_view/manage`, `billing.invoices_view/download`, `billing.payment_method`
- **+2 permissions team** : `team.managers_invite/manage` séparées de `team.members_invite/manage`
- **Séparation Facturation/Opérationnel** : Les permissions billing sont séparées des permissions métier
- **Séparation Gestionnaires/Membres** : Protection contre l'escalade de privilèges (28 permissions totales)
- **Centralisation Adresses** : Une seule table `addresses` partagée, FK `address_id` sur les entités
- **Centralisation Documents** : Table `documents` polymorphe avec `entity_type` + `entity_id`

### 1.2 Nouvelles Tables Proposées

| Table | Description | Phase |
|-------|-------------|-------|
| `contacts` | CRM - Tous les contacts (personnes et entreprises) | Refacto |
| `addresses` | Adresses normalisées partagées (buildings, lots, contacts, companies) | Refacto |
| `documents` | Documents centralisés polymorphes (entity_type + entity_id) | Refacto |
| `permissions` | Définitions des permissions RBAC | RBAC |
| `role_default_permissions` | Permissions par défaut par rôle | RBAC |
| `stripe_customers` | Mapping Team ↔ Stripe Customer | Billing (Stripe) |
| `stripe_products` | Catalogue produits (sync Stripe) | Billing (Stripe) |
| `stripe_prices` | Plans tarifaires (sync Stripe) | Billing (Stripe) |
| `subscriptions` | Abonnements actifs (sync Stripe) | Billing (Stripe) |
| `stripe_invoices` | Historique factures (sync Stripe) | Billing (Stripe) |

### 1.3 Principes Architecturaux

| Principe | Implémentation |
|----------|----------------|
| **Multi-tenant** | Isolation par `team_id` sur toutes les tables |
| **Soft Delete** | Pattern `deleted_at` + `deleted_by` |
| **RLS (Row Level Security)** | Politiques PostgreSQL + fonctions SECURITY DEFINER |
| **Séparation Contacts/Users** | `contacts` = CRM, `users` = authentification |
| **RBAC Granulaire** | Permissions modulaires par équipe |
| **Property-Based Billing** | Facturation par bien, pas par utilisateur |
| **Audit Trail** | `activity_logs` pour traçabilité |
| **Centralisation Adresses** | Table `addresses` partagée, FK `address_id` sur buildings/lots/contacts/companies |
| **Centralisation Documents** | Table `documents` polymorphe avec `entity_type` + `entity_id` |

### 1.4 Diagramme Complet de la Base de Données

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ARCHITECTURE COMPLÈTE SEIDO - 44 TABLES                                       │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                                 │
│  ╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗  │
│  ║                                    PHASE 1: USERS & TEAMS                                                  ║  │
│  ╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                                                           ║  │
│  ║   ┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐                          ║  │
│  ║   │   auth.users     │         │      users       │         │  user_invitations│                          ║  │
│  ║   │   (Supabase)     │◀───────▶│   (App Users)    │────────▶│   (Pending)      │                          ║  │
│  ║   │                  │  1:1    │                  │  1:N    │                  │                          ║  │
│  ║   │ • id (UUID)      │         │ • id             │         │ • id             │                          ║  │
│  ║   │ • email          │         │ • auth_user_id   │         │ • email          │                          ║  │
│  ║   │ • created_at     │         │ • email          │         │ • role           │                          ║  │
│  ║   └──────────────────┘         │ • role           │         │ • invited_by     │                          ║  │
│  ║                                │ • first_name     │         │ • team_id        │                          ║  │
│  ║                                │ • last_name      │         │ • status         │                          ║  │
│  ║                                │ • phone          │         │ • expires_at     │                          ║  │
│  ║                                └────────┬─────────┘         └──────────────────┘                          ║  │
│  ║                                         │                                                                 ║  │
│  ║                                         │ 1:N                                                             ║  │
│  ║                                         ▼                                                                 ║  │
│  ║   ┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐                          ║  │
│  ║   │   permissions    │         │   team_members   │◀───────▶│      teams       │                          ║  │
│  ║   │   (System)       │         │  (Membership)    │   N:1   │   (Tenants)      │                          ║  │
│  ║   │                  │         │                  │         │                  │                          ║  │
│  ║   │ • id             │         │ • id             │         │ • id             │                          ║  │
│  ║   │ • reference      │◀ ──── ▶│ • user_id        │         │ • name           │                          ║  │
│  ║   │ • name           │  check  │ • team_id        │         │ • slug           │                          ║  │
│  ║   │ • category       │         │ • role           │         │ • settings       │                          ║  │
│  ║   │ • is_admin_only  │         │ • permissions[]  │         │ • created_by     │                          ║  │
│  ║   └──────────────────┘         │ • is_team_owner  │         │ • deleted_at     │                          ║  │
│  ║                                │ • invited_by     │         └────────┬─────────┘                          ║  │
│  ║   ┌──────────────────┐         └──────────────────┘                  │                                    ║  │
│  ║   │role_default_perms│                                               │ 1:1                                ║  │
│  ║   │                  │                                               ▼                                    ║  │
│  ║   │ • id             │                                      ┌──────────────────┐                          ║  │
│  ║   │ • role           │                                      │  subscriptions   │                          ║  │
│  ║   │ • permission_id  │                                      │   (Billing)      │                          ║  │
│  ║   └──────────────────┘                                      │                  │                          ║  │
│  ║                                                             │ • team_id        │                          ║  │
│  ║   ┌──────────────────┐         ┌──────────────────┐         │ • status         │                          ║  │
│  ║   │    companies     │◀───────▶│ company_members  │         │ • billing_period │                          ║  │
│  ║   │                  │   1:N   │                  │         │ • stripe_*       │                          ║  │
│  ║   │ • id             │         │ • id             │         │ • billable_props │                          ║  │
│  ║   │ • name           │         │ • company_id     │         └────────┬─────────┘                          ║  │
│  ║   │ • vat_number     │         │ • contact_id     │                  │                                    ║  │
│  ║   │ • address_id ─▶  │         │ • role           │                  │ 1:N                                ║  │
│  ║   │ • team_id        │         └──────────────────┘                  ▼                                    ║  │
│  ║   └──────────────────┘                                                                                    ║  │
│  ║                                                             ┌──────────────────┐                          ║  │
│  ║                                                             │ stripe_invoices  │                          ║  │
│  ║                                                             │ (Stripe Sync)    │                          ║  │
│  ║                                                             │                  │                          ║  │
│  ║                                                             │ • id (in_xxx)    │                          ║  │
│  ║                                                             │ • team_id        │                          ║  │
│  ║                                                             │ • amount_due     │                          ║  │
│  ║                                                             │ • status         │                          ║  │
│  ║                                                             └──────────────────┘                          ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝  │
│                                                                                                                 │
│  ╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗  │
│  ║                                    PHASE CRM: CONTACTS                                                     ║  │
│  ╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                                                           ║  │
│  ║   ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐    ║  │
│  ║   │                                        contacts (CRM)                                             │    ║  │
│  ║   │                                                                                                   │    ║  │
│  ║   │  • id                    • email                • phone               • category                  │    ║  │
│  ║   │  • team_id ─────────────────────────────────────────────────────────────────▶ teams               │    ║  │
│  ║   │  • contact_type          • first_name           • mobile_phone        • speciality               │    ║  │
│  ║   │  • user_id (nullable) ──────────────────────────────────────────────────────▶ users (optionnel)   │    ║  │
│  ║   │  • company_id ──────────────────────────────────────────────────────────────▶ companies           │    ║  │
│  ║   │  • address_id ──────────────────────────────────────────────────────────────▶ addresses           │    ║  │
│  ║   │  • display_name          • last_name            • notes                                           │    ║  │
│  ║   └──────────────────────────────────────────────────────────────────────────────────────────────────┘    ║  │
│  ║                                                                                                          ║  │
│  ║   ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐    ║  │
│  ║   │                                 addresses (CENTRALISÉE)                                           │    ║  │
│  ║   │                                                                                                   │    ║  │
│  ║   │  • id                    • street_line_1         • postal_code         • is_geocoded              │    ║  │
│  ║   │  • team_id ─────────────────────────────────────────────────────────────────▶ teams               │    ║  │
│  ║   │  • label                 • street_line_2         • city                • is_verified              │    ║  │
│  ║   │  • country (enum)        • state_province        • latitude/longitude                             │    ║  │
│  ║   │                                                                                                   │    ║  │
│  ║   │  ◀─── Utilisé par: buildings, lots (standalone), contacts, companies                              │    ║  │
│  ║   └──────────────────────────────────────────────────────────────────────────────────────────────────┘    ║  │
│  ║                                                                                                          ║  │
│  ║   ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐    ║  │
│  ║   │                              documents (CENTRALISÉE - POLYMORPHE)                                 │    ║  │
│  ║   │                                                                                                   │    ║  │
│  ║   │  • id                    • document_type (enum)     • storage_path        • is_validated          │    ║  │
│  ║   │  • team_id ─────────────────────────────────────────────────────────────────▶ teams               │    ║  │
│  ║   │  • entity_type (enum)    • title                    • storage_bucket      • validated_by          │    ║  │
│  ║   │  • entity_id ────────────────────────────────────────▶ building | lot | intervention | contract   │    ║  │
│  ║   │  • visibility_level      • description              • uploaded_by         • tags[]                │    ║  │
│  ║   │                                                                                                   │    ║  │
│  ║   │  ◀─── Remplace: property_documents, intervention_documents, contract_documents                    │    ║  │
│  ║   └──────────────────────────────────────────────────────────────────────────────────────────────────┘    ║  │
│  ║                            │                                           │                                  ║  │
│  ║                            │ 1:N                                       │ 1:N                              ║  │
│  ║                            ▼                                           ▼                                  ║  │
│  ║   ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐            ║  │
│  ║   │building_contacts │    │   lot_contacts   │    │contract_contacts │    │   (future CRM)   │            ║  │
│  ║   │                  │    │                  │    │                  │    │   interactions   │            ║  │
│  ║   │ • building_id    │    │ • lot_id         │    │ • contract_id    │    │   tasks, notes   │            ║  │
│  ║   │ • contact_id     │    │ • contact_id     │    │ • contact_id     │    │                  │            ║  │
│  ║   │ • contact_role   │    │ • contact_role   │    │ • contact_role   │    │                  │            ║  │
│  ║   └──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘            ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝  │
│                                                                                                                 │
│  ╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗  │
│  ║                                    PHASE 2: PROPERTIES                                                     ║  │
│  ╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                                                           ║  │
│  ║   ┌──────────────────────────────────────────┐         ┌──────────────────────────────────────────┐       ║  │
│  ║   │                buildings                 │         │                  lots                    │       ║  │
│  ║   │                                          │         │                                          │       ║  │
│  ║   │ • id                    • name           │   1:N   │ • id                    • reference      │       ║  │
│  ║   │ • team_id ──────────────────────▶ teams  │◀───────▶│ • team_id ──────────────────────▶ teams  │       ║  │
│  ║   │ • address_id ────────────▶ addresses     │         │ • building_id (nullable) ───────▶ self   │       ║  │
│  ║   │ • reference              • description   │         │ • address_id (standalone) ─▶ addresses   │       ║  │
│  ║   │ • total_lots            • occupied_lots  │         │ • floor                 • category       │       ║  │
│  ║   │ • vacant_lots           • metadata       │         │ • apartment_number      • description    │       ║  │
│  ║   │ • deleted_at            • deleted_by     │         │ • deleted_at            • deleted_by     │       ║  │
│  ║   └───────────────────────────┬──────────────┘         └───────────────────────────┬──────────────┘       ║  │
│  ║                               │                                                    │                      ║  │
│  ║                               │ 1:N                                                │ 1:N                  ║  │
│  ║                               ▼                                                    ▼                      ║  │
│  ║   ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐    ║  │
│  ║   │                          property_documents ⚠️ DEPRECATED → documents                             │    ║  │
│  ║   │                                                                                                   │    ║  │
│  ║   │  Remplacée par la table centralisée `documents` (entity_type = 'building' | 'lot')                │    ║  │
│  ║   │  Voir section 2.2.3 pour le nouveau schéma                                                        │    ║  │
│  ║   └──────────────────────────────────────────────────────────────────────────────────────────────────┘    ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝  │
│                                                                                                                 │
│  ╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗  │
│  ║                                    PHASE 3: INTERVENTIONS                                                  ║  │
│  ╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                                                           ║  │
│  ║                              ┌──────────────────────────────────────────┐                                 ║  │
│  ║                              │              interventions               │                                 ║  │
│  ║                              │                                          │                                 ║  │
│  ║                              │ • id                    • reference      │                                 ║  │
│  ║                              │ • team_id ──────────────────────▶ teams  │                                 ║  │
│  ║                              │ • building_id ─────────────▶ buildings   │                                 ║  │
│  ║                              │ • lot_id (nullable) ───────────▶ lots    │                                 ║  │
│  ║                              │ • created_by ──────────────────▶ users   │                                 ║  │
│  ║                              │ • type                  • urgency        │                                 ║  │
│  ║                              │ • status                • title          │                                 ║  │
│  ║                              │ • description           • scheduled_date │                                 ║  │
│  ║                              │ • deleted_at            • deleted_by     │                                 ║  │
│  ║                              └─────────────────────┬────────────────────┘                                 ║  │
│  ║                                                    │                                                      ║  │
│  ║              ┌─────────────────┬───────────────────┼───────────────────┬─────────────────┐                ║  │
│  ║              │                 │                   │                   │                 │                ║  │
│  ║              ▼                 ▼                   ▼                   ▼                 ▼                ║  │
│  ║   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐     ║  │
│  ║   │intervention_    │ │intervention_    │ │intervention_    │ │intervention_    │ │intervention_    │     ║  │
│  ║   │  assignments    │ │   time_slots    │ │     quotes      │ │   documents     │ │    comments     │     ║  │
│  ║   │                 │ │                 │ │                 │ │                 │ │                 │     ║  │
│  ║   │• intervention_id│ │• intervention_id│ │• intervention_id│ │• intervention_id│ │• intervention_id│     ║  │
│  ║   │• user_id        │ │• proposed_by    │ │• provider_id    │ │• file_path      │ │• user_id        │     ║  │
│  ║   │• assigned_by    │ │• start_time     │ │• amount         │ │• document_type  │ │• content        │     ║  │
│  ║   │• role           │ │• end_time       │ │• status         │ │• uploaded_by    │ │• is_internal    │     ║  │
│  ║   └─────────────────┘ │• status         │ │• valid_until    │ └─────────────────┘ └─────────────────┘     ║  │
│  ║                       └────────┬────────┘ └─────────────────┘                                             ║  │
│  ║                                │                                                                          ║  │
│  ║   ┌─────────────────┐          │ 1:N      ┌─────────────────┐         ┌─────────────────┐                 ║  │
│  ║   │intervention_    │          ▼          │intervention_    │         │conversation_    │                 ║  │
│  ║   │    reports      │ ┌─────────────────┐ │     links       │         │   threads       │◀────────┐       ║  │
│  ║   │                 │ │time_slot_       │ │                 │         │                 │         │       ║  │
│  ║   │• intervention_id│ │   responses     │ │• intervention_id│         │• intervention_id│         │       ║  │
│  ║   │• created_by     │ │                 │ │• linked_interv  │         │• created_by     │         │       ║  │
│  ║   │• content        │ │• time_slot_id   │ │• link_type      │         │• is_active      │         │       ║  │
│  ║   │• photos[]       │ │• user_id        │ └─────────────────┘         └────────┬────────┘         │       ║  │
│  ║   └─────────────────┘ │• response       │                                      │                  │       ║  │
│  ║                       │• available      │                                      │ 1:N              │       ║  │
│  ║                       └─────────────────┘                                      ▼                  │       ║  │
│  ║                                                                       ┌─────────────────┐         │       ║  │
│  ║                                                                       │conversation_    │         │       ║  │
│  ║                                                                       │   messages      │         │       ║  │
│  ║                                                                       │                 │         │       ║  │
│  ║                                                                       │• thread_id      │         │       ║  │
│  ║                                                                       │• sender_id      │         │       ║  │
│  ║                       ┌─────────────────┐                             │• content        │         │       ║  │
│  ║                       │conversation_    │                             │• attachments[]  │         │       ║  │
│  ║                       │  participants   │◀────────────────────────────│• read_by[]      │         │       ║  │
│  ║                       │                 │                             └─────────────────┘         │       ║  │
│  ║                       │• thread_id ─────┼─────────────────────────────────────────────────────────┘       ║  │
│  ║                       │• user_id        │                                                                 ║  │
│  ║                       │• role           │                                                                 ║  │
│  ║                       └─────────────────┘                                                                 ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝  │
│                                                                                                                 │
│  ╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗  │
│  ║                                PHASE 3: NOTIFICATIONS, AUDIT & EMAIL                                       ║  │
│  ╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                                                           ║  │
│  ║   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐             ║  │
│  ║   │  notifications  │     │  activity_logs  │     │push_subscriptions│     │ email_blacklist │             ║  │
│  ║   │                 │     │                 │     │                 │     │                 │             ║  │
│  ║   │ • id            │     │ • id            │     │ • id            │     │ • id            │             ║  │
│  ║   │ • user_id       │     │ • team_id       │     │ • user_id       │     │ • team_id       │             ║  │
│  ║   │ • team_id       │     │ • user_id       │     │ • endpoint      │     │ • email         │             ║  │
│  ║   │ • type          │     │ • action        │     │ • keys          │     │ • reason        │             ║  │
│  ║   │ • title         │     │ • entity_type   │     │ • created_at    │     │ • created_at    │             ║  │
│  ║   │ • read_at       │     │ • entity_id     │     └─────────────────┘     └─────────────────┘             ║  │
│  ║   │ • link          │     │ • changes       │                                                             ║  │
│  ║   └─────────────────┘     │ • ip_address    │                                                             ║  │
│  ║                           └─────────────────┘                                                             ║  │
│  ║                                                                                                           ║  │
│  ║   ┌──────────────────────────────────────────┐     ┌──────────────────────────────────────────┐           ║  │
│  ║   │         team_email_connections           │     │                  emails                  │           ║  │
│  ║   │                                          │     │                                          │           ║  │
│  ║   │ • id               • team_id             │ 1:N │ • id               • connection_id       │           ║  │
│  ║   │ • provider         • email_address       │────▶│ • from             • to                  │           ║  │
│  ║   │ • access_token     • refresh_token       │     │ • subject          • body_html           │           ║  │
│  ║   │ • is_active        • last_sync_at        │     │ • direction        • status              │           ║  │
│  ║   └──────────────────────────────────────────┘     │ • intervention_id  • building_id         │           ║  │
│  ║                                                    └───────────────────────────┬──────────────┘           ║  │
│  ║                                                                                │                          ║  │
│  ║                                                                                │ 1:N                      ║  │
│  ║                                                                                ▼                          ║  │
│  ║                                                    ┌──────────────────────────────────────────┐           ║  │
│  ║                                                    │            email_attachments             │           ║  │
│  ║                                                    │                                          │           ║  │
│  ║                                                    │ • id               • email_id            │           ║  │
│  ║                                                    │ • filename         • file_path           │           ║  │
│  ║                                                    │ • content_type     • size                │           ║  │
│  ║                                                    └──────────────────────────────────────────┘           ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝  │
│                                                                                                                 │
│  ╔═══════════════════════════════════════════════════════════════════════════════════════════════════════════╗  │
│  ║                                    PHASE 4: CONTRACTS & IMPORT                                             ║  │
│  ╠═══════════════════════════════════════════════════════════════════════════════════════════════════════════╣  │
│  ║                                                                                                           ║  │
│  ║   ┌──────────────────────────────────────────┐         ┌──────────────────────────────────────────┐       ║  │
│  ║   │                contracts                 │         │              import_jobs                 │       ║  │
│  ║   │                                          │         │                                          │       ║  │
│  ║   │ • id               • reference           │         │ • id               • team_id             │       ║  │
│  ║   │ • team_id ─────────────────────▶ teams   │         │ • file_name        • file_path           │       ║  │
│  ║   │ • lot_id ──────────────────────▶ lots    │         │ • status           • import_type         │       ║  │
│  ║   │ • type             • status              │         │ • total_rows       • processed_rows      │       ║  │
│  ║   │ • start_date       • end_date            │         │ • errors           • created_by          │       ║  │
│  ║   │ • rent_amount      • charges             │         │ • completed_at     • created_at          │       ║  │
│  ║   │ • deposit          • deleted_at          │         └──────────────────────────────────────────┘       ║  │
│  ║   └───────────────────────────┬──────────────┘                                                            ║  │
│  ║                               │                                                                           ║  │
│  ║                               │ 1:N                                                                       ║  │
│  ║                               ▼                                                                           ║  │
│  ║   ┌──────────────────────────────────────────────────────────────────────────────────────────────┐       ║  │
│  ║   │                          contract_documents ⚠️ DEPRECATED → documents                       │       ║  │
│  ║   │                                                                                             │       ║  │
│  ║   │  Remplacée par la table centralisée `documents` (entity_type = 'contract')                  │       ║  │
│  ║   └──────────────────────────────────────────────────────────────────────────────────────────────┘       ║  │
│  ╚═══════════════════════════════════════════════════════════════════════════════════════════════════════════╝  │
│                                                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.5 Schema SQL Complet

Cette section regroupe tout le SQL necessaire pour creer l'architecture complete de la base de donnees SEIDO.

#### 1.5.1 Enums PostgreSQL

```sql
-- ============================================================================
-- ENUMS POSTGRESQL (37 types)
-- Description: Types enumeres pour garantir l'integrite des donnees
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 1: USERS & TEAMS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE user_role AS ENUM ('admin', 'gestionnaire', 'locataire', 'prestataire', 'proprietaire');
CREATE TYPE team_member_role AS ENUM ('admin', 'gestionnaire', 'locataire', 'prestataire', 'proprietaire');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE CRM: CONTACTS & ADDRESSES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE contact_type AS ENUM ('person', 'company');
CREATE TYPE contact_category AS ENUM (
  'locataire', 'proprietaire', 'prestataire', 'syndic',
  'assurance', 'notaire', 'banque', 'administration', 'autre'
);
CREATE TYPE country AS ENUM ('belgique', 'france', 'allemagne', 'pays-bas', 'suisse', 'luxembourg', 'autre');

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 2: PROPERTIES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE lot_category AS ENUM ('appartement', 'collocation', 'maison', 'garage', 'local_commercial', 'parking', 'autre');

-- DEPRECATED: Utiliser document_type a la place
CREATE TYPE property_document_type AS ENUM (
  'bail', 'garantie', 'facture', 'diagnostic', 'photo_compteur',
  'plan', 'reglement_copropriete', 'etat_des_lieux', 'certificat',
  'manuel_utilisation', 'photo_generale', 'autre'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- DOCUMENTS CENTRALISES (NOUVEAU)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE document_entity_type AS ENUM ('building', 'lot', 'intervention', 'contract', 'contact', 'company');

CREATE TYPE document_type AS ENUM (
  -- Contrats
  'bail', 'avenant', 'etat_des_lieux_entree', 'etat_des_lieux_sortie', 'reglement_copropriete',
  -- Financier
  'facture', 'devis', 'quittance', 'bon_de_commande',
  -- Technique
  'diagnostic', 'plan', 'certificat', 'garantie', 'manuel_utilisation', 'rapport',
  -- Administratif
  'justificatif_identite', 'justificatif_revenus', 'attestation_assurance', 'caution_bancaire',
  -- Photos
  'photo_avant', 'photo_apres', 'photo_compteur', 'photo_generale',
  -- Autre
  'autre'
);

CREATE TYPE document_visibility_level AS ENUM ('prive', 'equipe', 'locataire', 'prestataire', 'public');

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 3: INTERVENTIONS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE intervention_type AS ENUM (
  'plomberie', 'electricite', 'chauffage', 'serrurerie', 'peinture',
  'menage', 'jardinage', 'climatisation', 'vitrerie', 'toiture', 'autre'
);

CREATE TYPE intervention_urgency AS ENUM ('basse', 'normale', 'haute', 'urgente');

CREATE TYPE intervention_status AS ENUM (
  'demande', 'rejetee', 'approuvee', 'demande_de_devis', 'planification',
  'planifiee', 'en_cours', 'cloturee_par_prestataire',
  'cloturee_par_locataire', 'cloturee_par_gestionnaire', 'annulee'
);

CREATE TYPE assignment_role AS ENUM ('gestionnaire', 'prestataire');
CREATE TYPE time_slot_status AS ENUM ('pending', 'selected', 'rejected', 'cancelled');
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'cancelled', 'expired');

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 3: CHAT & COMMUNICATION
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE conversation_thread_type AS ENUM ('group', 'tenant_to_managers', 'provider_to_managers');

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 3: NOTIFICATIONS & AUDIT
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE notification_type AS ENUM (
  'intervention', 'chat', 'document', 'system', 'team_invite',
  'assignment', 'status_change', 'reminder', 'deadline'
);
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TYPE activity_action_type AS ENUM (
  'create', 'update', 'delete', 'view', 'assign', 'unassign',
  'approve', 'reject', 'upload', 'download', 'share', 'comment',
  'status_change', 'send_notification', 'login', 'logout'
);

CREATE TYPE activity_entity_type AS ENUM (
  'user', 'team', 'building', 'lot', 'intervention',
  'document', 'contact', 'notification', 'message',
  'quote', 'report', 'contract'
);

CREATE TYPE activity_status AS ENUM ('success', 'failure', 'pending');

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 3: EMAIL SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE email_direction AS ENUM ('received', 'sent');
CREATE TYPE email_status AS ENUM ('unread', 'read', 'archived', 'deleted');

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 4: CONTRACTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE contract_type AS ENUM ('bail_habitation', 'bail_meuble');
CREATE TYPE contract_status AS ENUM ('brouillon', 'actif', 'expire', 'resilie', 'renouvele');
CREATE TYPE guarantee_type AS ENUM ('pas_de_garantie', 'compte_proprietaire', 'compte_bloque', 'e_depot', 'autre');
CREATE TYPE payment_frequency AS ENUM ('mensuel', 'trimestriel', 'semestriel', 'annuel');
CREATE TYPE contract_contact_role AS ENUM ('locataire', 'colocataire', 'garant', 'representant_legal', 'autre');

-- DEPRECATED: Utiliser document_type a la place
CREATE TYPE contract_document_type AS ENUM (
  'bail', 'avenant', 'etat_des_lieux_entree', 'etat_des_lieux_sortie',
  'attestation_assurance', 'justificatif_identite', 'justificatif_revenus',
  'caution_bancaire', 'quittance', 'reglement_copropriete', 'diagnostic', 'autre'
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PHASE 4: IMPORT SYSTEM
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE import_job_status AS ENUM ('pending', 'validating', 'importing', 'completed', 'failed', 'cancelled');
CREATE TYPE import_entity_type AS ENUM ('building', 'lot', 'contact', 'contract', 'mixed');

-- ═══════════════════════════════════════════════════════════════════════════
-- SUBSCRIPTIONS & BILLING (STRIPE)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TYPE subscription_status AS ENUM (
  'trialing', 'active', 'incomplete', 'incomplete_expired',
  'past_due', 'unpaid', 'canceled', 'paused'
);

CREATE TYPE pricing_type AS ENUM ('one_time', 'recurring');
CREATE TYPE pricing_interval AS ENUM ('day', 'week', 'month', 'year');
CREATE TYPE invoice_status AS ENUM ('draft', 'open', 'paid', 'uncollectible', 'void');
```

#### 1.5.2 Phase 1: Users & Teams

```sql
-- ============================================================================
-- TABLE: users
-- Description: Utilisateurs authentifies uniquement (peuvent se connecter)
-- ============================================================================
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Authentification Supabase (OBLIGATOIRE)
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Informations de base
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT,

  -- Role global (pour l'application)
  role user_role NOT NULL DEFAULT 'gestionnaire',

  -- Equipe principale (pour performance)
  primary_team_id UUID REFERENCES teams(id),

  -- Statut
  is_active BOOLEAN DEFAULT TRUE,
  password_set BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP WITH TIME ZONE,

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE UNIQUE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_primary_team ON users(primary_team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE users IS 'Utilisateurs authentifies uniquement. Chaque user DOIT avoir un auth_user_id.';

-- ============================================================================
-- TABLE: teams
-- Description: Equipes/agences - Unite d'isolation multi-tenant
-- ============================================================================
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Configuration
  settings JSONB DEFAULT '{}',

  -- Createur (devient team_owner)
  created_by UUID REFERENCES users(id),

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE teams IS 'Equipes/agences - Toutes les donnees metier sont scopees par team_id';

-- ============================================================================
-- TABLE: team_members
-- Description: Appartenance utilisateur-equipe avec permissions
-- Pattern: Soft delete via left_at (pas de DELETE physique)
-- ============================================================================
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Role dans l'equipe
  role team_member_role NOT NULL DEFAULT 'gestionnaire',

  -- Permissions granulaires
  permissions TEXT[] DEFAULT NULL,  -- NULL = utiliser defauts du role
  is_team_owner BOOLEAN DEFAULT FALSE,  -- Createur de l'equipe

  -- Dates d'appartenance
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Soft delete membership (desactivation)
  left_at TIMESTAMP WITH TIME ZONE,
  left_by UUID REFERENCES users(id),  -- Qui a desactive le membre
  left_reason TEXT,  -- Raison de la desactivation (optionnel)

  -- Contraintes
  CONSTRAINT unique_team_user UNIQUE (team_id, user_id),
  CONSTRAINT valid_left CHECK (
    (left_at IS NULL AND left_by IS NULL) OR
    (left_at IS NOT NULL AND left_by IS NOT NULL)
  )
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEX team_members
-- ═══════════════════════════════════════════════════════════════════════════

-- Index critique pour RLS
CREATE INDEX idx_team_members_user_team_role ON team_members(user_id, team_id, role) WHERE left_at IS NULL;

-- Index GIN pour permissions
CREATE INDEX idx_team_members_permissions ON team_members USING GIN(permissions) WHERE permissions IS NOT NULL;

-- Index pour team owners
CREATE INDEX idx_team_members_owner ON team_members(team_id) WHERE is_team_owner = TRUE;

-- Index pour filtrer les membres actifs (tres frequent)
CREATE INDEX idx_team_members_active ON team_members(team_id, user_id) WHERE left_at IS NULL;

-- Index pour historique des membres
CREATE INDEX idx_team_members_history ON team_members(team_id, left_at DESC) WHERE left_at IS NOT NULL;

-- Index pour recherche par utilisateur (multi-equipes)
CREATE INDEX idx_team_members_user_active ON team_members(user_id, team_id) WHERE left_at IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGERS team_members
-- ═══════════════════════════════════════════════════════════════════════════

-- Trigger pour empecher la suppression physique (force soft delete)
CREATE OR REPLACE FUNCTION prevent_team_member_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si left_at n'est pas defini, c'est une suppression non autorisee
  IF OLD.left_at IS NULL THEN
    RAISE EXCEPTION 'Suppression physique interdite. Utilisez UPDATE left_at = NOW()';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER tr_prevent_team_member_delete
BEFORE DELETE ON team_members
FOR EACH ROW
EXECUTE FUNCTION prevent_team_member_delete();

-- Trigger pour auto-remplir left_by lors de la desactivation
CREATE OR REPLACE FUNCTION set_team_member_left_by()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.left_at IS NOT NULL AND OLD.left_at IS NULL THEN
    IF NEW.left_by IS NULL THEN
      NEW.left_by := get_current_user_id();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_set_team_member_left_by
BEFORE UPDATE ON team_members
FOR EACH ROW
EXECUTE FUNCTION set_team_member_left_by();

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS team_members
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Politique: Membres actifs visibles par les membres de l'equipe
CREATE POLICY "team_members_active_select" ON team_members
FOR SELECT USING (
  is_admin() OR
  (
    user_belongs_to_team_v2(team_id) AND
    left_at IS NULL
  )
);

-- Politique: Historique visible par les gestionnaires de l'equipe
CREATE POLICY "team_members_history_select" ON team_members
FOR SELECT USING (
  is_admin() OR
  (
    is_team_manager(team_id) AND
    left_at IS NOT NULL
  )
);

-- Politique: Seuls les admins/gestionnaires peuvent desactiver
CREATE POLICY "team_members_deactivate" ON team_members
FOR UPDATE USING (
  is_admin() OR
  can_deactivate_member(team_id, user_id)
)
WITH CHECK (
  is_admin() OR
  can_deactivate_member(team_id, user_id)
);

COMMENT ON TABLE team_members IS 'Appartenance utilisateur-equipe. Utilise soft delete via left_at.';
COMMENT ON COLUMN team_members.permissions IS 'Override des permissions. NULL = permissions par defaut du role.';
COMMENT ON COLUMN team_members.is_team_owner IS 'TRUE = createur de l''equipe, a TOUTES les permissions.';
COMMENT ON COLUMN team_members.left_at IS 'Date de desactivation. NULL = membre actif.';
COMMENT ON COLUMN team_members.left_by IS 'Utilisateur qui a desactive ce membre.';
COMMENT ON COLUMN team_members.left_reason IS 'Raison de la desactivation (optionnel).';

-- ═══════════════════════════════════════════════════════════════════════════
-- VUE: team_members_active
-- Description: Membres actifs avec informations utilisateur et equipe
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW team_members_active AS
SELECT
  tm.id,
  tm.team_id,
  tm.user_id,
  tm.role,
  tm.permissions,
  tm.is_team_owner,
  tm.joined_at,
  u.email,
  u.first_name,
  u.last_name,
  u.role as user_role,
  t.name as team_name
FROM team_members tm
JOIN users u ON u.id = tm.user_id
JOIN teams t ON t.id = tm.team_id
WHERE tm.left_at IS NULL
  AND u.deleted_at IS NULL
  AND t.deleted_at IS NULL;

COMMENT ON VIEW team_members_active IS 'Membres actifs avec informations utilisateur et equipe. Herite des RLS de team_members.';

-- ============================================================================
-- TABLE: companies
-- Description: Entreprises (prestataires, syndics, etc.)
-- ============================================================================
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Informations legales
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  vat_number VARCHAR(50),
  registration_number VARCHAR(50),  -- SIRET/BCE

  -- Coordonnees
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),

  -- Metadonnees
  logo_url TEXT,
  notes TEXT,

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_companies_team ON companies(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_vat ON companies(vat_number) WHERE vat_number IS NOT NULL;

-- RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: company_members
-- Description: Membres d'une entreprise (contacts employes)
-- ============================================================================
CREATE TABLE company_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Role dans l'entreprise
  role VARCHAR(50),  -- 'owner', 'admin', 'employee', 'contractor'
  job_title VARCHAR(100),
  is_primary BOOLEAN DEFAULT FALSE,

  notes TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_company_contact UNIQUE (company_id, contact_id)
);

-- RLS
ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: user_invitations
-- Description: Invitations en attente pour rejoindre une equipe
-- ============================================================================
CREATE TABLE user_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Contact invite
  email VARCHAR(255) NOT NULL,
  contact_id UUID REFERENCES contacts(id),  -- Lien vers le contact

  -- Equipe cible
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- User cree (apres acceptation)
  user_id UUID REFERENCES users(id),

  -- Invitant
  invited_by UUID NOT NULL REFERENCES users(id),

  -- Configuration
  role user_role NOT NULL DEFAULT 'gestionnaire',
  provider_category VARCHAR(50),  -- Si prestataire

  -- Pre-remplissage
  first_name VARCHAR(255),
  last_name VARCHAR(255),

  -- Token et statut
  invitation_token VARCHAR(255),
  status invitation_status NOT NULL DEFAULT 'pending',

  -- Dates
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_pending_invitation UNIQUE (email, team_id)
);

CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_team ON user_invitations(team_id);
CREATE INDEX idx_user_invitations_status ON user_invitations(status);
CREATE INDEX idx_user_invitations_contact ON user_invitations(contact_id) WHERE contact_id IS NOT NULL;

-- RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
```

#### 1.5.3 Phase CRM: Contacts & Addresses

```sql
-- ============================================================================
-- TABLE: addresses
-- Description: Adresses normalisees reutilisables (buildings, lots, contacts, companies)
-- ============================================================================
CREATE TABLE addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Libelle optionnel
  label VARCHAR(100),  -- "Siege social", "Adresse facturation", "Adresse principale"

  -- Adresse structuree
  street_line_1 TEXT NOT NULL,        -- Numero + rue
  street_line_2 TEXT,                  -- Complement (batiment, etage, boite, etc.)
  postal_code VARCHAR(20) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state_province VARCHAR(100),         -- Region, province, canton (optionnel)
  country country NOT NULL DEFAULT 'belgique',

  -- Geocodage (optionnel, pour cartes/calcul distances)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_geocoded BOOLEAN DEFAULT FALSE,

  -- Validation
  is_verified BOOLEAN DEFAULT FALSE,   -- Adresse verifiee manuellement

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index de base
CREATE INDEX idx_addresses_team ON addresses(team_id);
CREATE INDEX idx_addresses_city ON addresses(team_id, city);
CREATE INDEX idx_addresses_postal ON addresses(team_id, postal_code);

-- Index geographique (pour recherche par proximite)
CREATE INDEX idx_addresses_geo ON addresses(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Full-text search
CREATE INDEX idx_addresses_search ON addresses USING GIN (
  to_tsvector('french',
    COALESCE(street_line_1, '') || ' ' ||
    COALESCE(city, '') || ' ' ||
    COALESCE(postal_code, '')
  )
);

-- RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addresses_team_isolation" ON addresses
  FOR ALL USING (is_team_manager(team_id) OR is_admin());

COMMENT ON TABLE addresses IS 'Table centralisee des adresses. Utilisee par buildings, lots (standalone), contacts, companies.';
COMMENT ON COLUMN addresses.label IS 'Libelle optionnel: Siege social, Adresse facturation, etc.';
COMMENT ON COLUMN addresses.is_geocoded IS 'TRUE si latitude/longitude ont ete calculees via API de geocodage.';

-- ============================================================================
-- TABLE: contacts
-- Description: Table CRM principale - Tous les contacts (personnes et entreprises)
-- ============================================================================
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Association equipe (multi-tenant)
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Type de contact
  contact_type contact_type NOT NULL DEFAULT 'person',  -- 'person' | 'company'

  -- Informations de base
  email VARCHAR(255),                    -- Nullable (certains contacts n'ont pas d'email)
  first_name VARCHAR(255),               -- Pour les personnes
  last_name VARCHAR(255),                -- Pour les personnes
  display_name VARCHAR(255),             -- Nom affiche (calcule ou override)
  phone VARCHAR(50),
  mobile_phone VARCHAR(50),

  -- Adresse (FK vers table centralisee)
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,

  -- Informations entreprise (si contact_type = 'company')
  company_name VARCHAR(255),             -- Nom de l'entreprise
  vat_number VARCHAR(50),                -- Numero TVA
  registration_number VARCHAR(50),       -- SIRET/BCE

  -- Association a une entreprise (si contact_type = 'person')
  company_id UUID REFERENCES companies(id),

  -- Categorisation CRM
  category contact_category NOT NULL DEFAULT 'autre',

  speciality intervention_type,          -- Si prestataire
  provider_rating DECIMAL(3,2) DEFAULT 0.00,
  total_interventions INTEGER DEFAULT 0,

  -- Lien optionnel vers utilisateur (si invite a l'app)
  user_id UUID REFERENCES users(id),     -- NULL si pas invite

  -- Metadonnees
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  source VARCHAR(50),                    -- 'manual', 'import', 'api'

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contraintes
  CONSTRAINT valid_contact_type CHECK (
    (contact_type = 'person' AND (first_name IS NOT NULL OR last_name IS NOT NULL))
    OR
    (contact_type = 'company' AND company_name IS NOT NULL)
  ),
  CONSTRAINT unique_email_per_team UNIQUE (team_id, email)
);

-- Index
CREATE INDEX idx_contacts_team_id ON contacts(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_email ON contacts(team_id, email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_contacts_category ON contacts(team_id, category) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_user_id ON contacts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_contacts_company_id ON contacts(company_id) WHERE company_id IS NOT NULL;

-- Full-text search
CREATE INDEX idx_contacts_search ON contacts USING GIN (
  to_tsvector('french', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(company_name, '') || ' ' || COALESCE(email, ''))
) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE contacts IS 'Table CRM principale. Contient tous les contacts (personnes et entreprises). Peut etre lie a un user si invite a l''app.';
COMMENT ON COLUMN contacts.user_id IS 'FK vers users si le contact a ete invite et a acces a l''application. NULL sinon.';
```

#### 1.5.4 Phase 2: Properties

```sql
-- ============================================================================
-- TABLE: buildings
-- Description: Immeubles - Peuvent contenir plusieurs lots
-- ============================================================================
CREATE TABLE buildings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  reference VARCHAR(50),  -- Reference interne

  -- Adresse (via table centralisee)
  address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,

  -- Description
  description TEXT,

  -- Compteurs (maintenus par trigger)
  total_lots INTEGER DEFAULT 0,
  occupied_lots INTEGER DEFAULT 0,
  vacant_lots INTEGER DEFAULT 0,
  total_interventions INTEGER DEFAULT 0,
  active_interventions INTEGER DEFAULT 0,

  -- Metadonnees
  metadata JSONB DEFAULT '{}',

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_lots_count CHECK (occupied_lots + vacant_lots = total_lots)
);

CREATE INDEX idx_buildings_team ON buildings(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_buildings_address ON buildings(address_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_buildings_search ON buildings USING GIN (to_tsvector('french', name)) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: lots
-- Description: Lots/appartements - Standalone ou dans un building
-- ============================================================================
CREATE TABLE lots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,  -- NULL = standalone

  -- Identification
  reference TEXT NOT NULL,
  category lot_category NOT NULL DEFAULT 'appartement',

  -- Localisation dans l'immeuble
  floor INTEGER,  -- -5 a 100
  apartment_number TEXT,

  -- Adresse (si standalone, sinon herite via building.address_id)
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,

  -- Description
  description TEXT,

  -- Compteurs
  total_interventions INTEGER DEFAULT 0,
  active_interventions INTEGER DEFAULT 0,

  -- Metadonnees
  metadata JSONB DEFAULT '{}',

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_reference_per_team UNIQUE (team_id, reference) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT valid_floor CHECK (floor >= -5 AND floor <= 100)
);

CREATE INDEX idx_lots_team ON lots(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lots_building ON lots(building_id) WHERE building_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_lots_standalone ON lots(team_id) WHERE building_id IS NULL AND deleted_at IS NULL;

-- RLS
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: building_contacts
-- Description: Contacts associes aux immeubles
-- ============================================================================
CREATE TABLE building_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,  -- Denormalise pour RLS

  -- Role
  role TEXT,  -- 'syndic', 'proprietaire', 'gardien', etc.
  is_primary BOOLEAN DEFAULT FALSE,

  notes TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_building_contact UNIQUE (building_id, contact_id)
);

-- RLS
ALTER TABLE building_contacts ENABLE ROW LEVEL SECURITY;

-- Trigger pour synchroniser team_id
CREATE TRIGGER tr_building_contacts_team_id
BEFORE INSERT ON building_contacts
FOR EACH ROW EXECUTE FUNCTION sync_building_contact_team_id();

-- ============================================================================
-- TABLE: lot_contacts
-- Description: Contacts associes aux lots (locataires, proprietaires)
-- ============================================================================
CREATE TABLE lot_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,  -- Denormalise pour RLS

  -- Role
  role TEXT,  -- 'locataire', 'proprietaire', 'garant', etc.
  is_primary BOOLEAN DEFAULT FALSE,

  notes TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_lot_contact UNIQUE (lot_id, contact_id)
);

-- RLS
ALTER TABLE lot_contacts ENABLE ROW LEVEL SECURITY;

-- Trigger pour synchroniser team_id
CREATE TRIGGER tr_lot_contacts_team_id
BEFORE INSERT ON lot_contacts
FOR EACH ROW EXECUTE FUNCTION sync_lot_contact_team_id();

-- ============================================================================
-- TABLE: property_documents (DEPRECATED - Utiliser 'documents' a la place)
-- Description: Documents attaches aux immeubles ou lots
-- Migration: -> documents (entity_type = 'building' | 'lot')
-- ============================================================================
CREATE TABLE property_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relation polymorphique
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,

  -- Type et categorie
  document_type property_document_type NOT NULL DEFAULT 'autre',
  category TEXT,

  -- Fichier
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'property-documents',

  -- Metadonnees
  title TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  expiry_date DATE,
  document_date DATE,

  -- Visibilite
  visibility_level document_visibility_level DEFAULT 'equipe',
  is_archived BOOLEAN DEFAULT FALSE,

  -- Upload
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contrainte polymorphique
  CONSTRAINT valid_property_reference CHECK (
    (building_id IS NOT NULL AND lot_id IS NULL) OR
    (building_id IS NULL AND lot_id IS NOT NULL)
  )
);

-- RLS
ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE property_documents IS 'DEPRECATED: Utiliser la table documents avec entity_type = building ou lot';
```

#### 1.5.5 Phase 3: Interventions

```sql
-- ============================================================================
-- TABLE: interventions
-- Description: Demandes d'intervention - Coeur du workflow metier
-- ============================================================================
CREATE TABLE interventions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identification
  reference VARCHAR(20) NOT NULL UNIQUE,  -- INT-YYYYMMDD-XXX

  -- Relation polymorphique vers bien
  building_id UUID REFERENCES buildings(id),
  lot_id UUID REFERENCES lots(id),
  team_id UUID NOT NULL REFERENCES teams(id),

  -- Demandeur (contact)
  tenant_contact_id UUID REFERENCES contacts(id),  -- Contact qui a fait la demande

  -- Description
  title TEXT NOT NULL,
  description TEXT,
  type intervention_type NOT NULL DEFAULT 'autre',
  urgency intervention_urgency NOT NULL DEFAULT 'normale',

  -- Statut
  status intervention_status NOT NULL DEFAULT 'demande',

  -- Dates
  requested_date TIMESTAMP WITH TIME ZONE,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,

  -- Couts
  estimated_cost DECIMAL(10,2),
  final_cost DECIMAL(10,2),

  -- Metadonnees
  is_contested BOOLEAN DEFAULT FALSE,
  scheduling_method TEXT,  -- 'direct', 'slots', 'flexible'
  provider_guidelines TEXT,
  has_attachments BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',

  -- Createur
  created_by UUID REFERENCES users(id),

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_interventions_team_status ON interventions(team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_lot ON interventions(lot_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_building ON interventions(building_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_reference ON interventions(reference);

-- RLS
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- Trigger pour generer la reference
CREATE TRIGGER tr_intervention_reference
BEFORE INSERT ON interventions
FOR EACH ROW EXECUTE FUNCTION generate_intervention_reference();

-- ============================================================================
-- TABLE: intervention_assignments
-- Description: Assignations de gestionnaires et prestataires aux interventions
-- ============================================================================
CREATE TABLE intervention_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),  -- Utilisateur assigne (doit avoir acces app)

  -- Configuration
  role assignment_role NOT NULL DEFAULT 'gestionnaire',  -- 'gestionnaire' | 'prestataire'
  is_primary BOOLEAN DEFAULT FALSE,

  -- Notification
  notified BOOLEAN DEFAULT FALSE,
  notes TEXT,

  -- Assignation
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_intervention_user_role UNIQUE (intervention_id, user_id, role)
);

-- RLS
ALTER TABLE intervention_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: intervention_time_slots
-- Description: Creneaux horaires proposes pour la planification
-- ============================================================================
CREATE TABLE intervention_time_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,  -- Denormalise pour RLS

  -- Creneau
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Statut
  is_selected BOOLEAN DEFAULT FALSE,
  status time_slot_status DEFAULT 'pending',

  -- Proposant
  proposed_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_slot UNIQUE (intervention_id, slot_date, start_time, end_time),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- RLS
ALTER TABLE intervention_time_slots ENABLE ROW LEVEL SECURITY;

-- Trigger synchronisation team_id
CREATE TRIGGER tr_time_slots_team_id
BEFORE INSERT ON intervention_time_slots
FOR EACH ROW EXECUTE FUNCTION sync_intervention_time_slot_team_id();

-- ============================================================================
-- TABLE: intervention_quotes
-- Description: Devis et factures pour les interventions
-- ============================================================================
CREATE TABLE intervention_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES users(id),  -- Prestataire
  team_id UUID NOT NULL,

  -- Type
  quote_type TEXT NOT NULL DEFAULT 'estimation',  -- 'estimation' | 'final'

  -- Montants
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',

  -- Detail
  description TEXT,
  line_items JSONB DEFAULT '[]',  -- [{description, quantity, unit, unit_price, total}]

  -- Statut
  status quote_status NOT NULL DEFAULT 'draft',
  valid_until DATE,

  -- Validation
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  -- Createur
  created_by UUID REFERENCES users(id),

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE intervention_quotes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLES ADDITIONNELLES INTERVENTIONS
-- intervention_reports: Rapports textuels
-- intervention_documents: DEPRECATED -> Utiliser 'documents' (entity_type = 'intervention')
-- intervention_comments: Commentaires threades
-- intervention_links: Liens entre interventions
-- time_slot_responses: Reponses aux creneaux
-- ============================================================================
```

#### 1.5.6 Phase 3: Chat & Communication

```sql
-- ============================================================================
-- TABLE: conversation_threads
-- Description: Fils de discussion lies aux interventions
-- ============================================================================
CREATE TABLE conversation_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,  -- Denormalise

  -- Type de fil
  thread_type conversation_thread_type NOT NULL DEFAULT 'group',
  title TEXT,

  -- Compteurs
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,

  -- Createur
  created_by UUID NOT NULL REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_thread_per_intervention UNIQUE (intervention_id, thread_type)
);

-- RLS
ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: conversation_messages
-- Description: Messages dans les fils de discussion
-- ============================================================================
CREATE TABLE conversation_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),  -- Nullable si user supprime
  team_id UUID NOT NULL,  -- Denormalise pour RLS

  -- Contenu
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',  -- mentions, reactions, attachments

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;

-- Trigger synchronisation team_id
CREATE TRIGGER tr_messages_team_id
BEFORE INSERT ON conversation_messages
FOR EACH ROW EXECUTE FUNCTION sync_conversation_message_team_id();

-- ============================================================================
-- TABLE: conversation_participants
-- Description: Participants aux fils de discussion avec suivi de lecture
-- ============================================================================
CREATE TABLE conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Suivi de lecture
  last_read_message_id UUID REFERENCES conversation_messages(id),
  last_read_at TIMESTAMP WITH TIME ZONE,

  -- Date d'ajout
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_participant UNIQUE (thread_id, user_id)
);

-- RLS
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
```

#### 1.5.7 Phase 3: Notifications & Audit

```sql
-- ============================================================================
-- TABLE: notifications
-- Description: Notifications in-app temps reel
-- ============================================================================
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  created_by UUID REFERENCES users(id),

  -- Type et priorite
  type notification_type NOT NULL DEFAULT 'system',
  priority notification_priority NOT NULL DEFAULT 'normal',

  -- Contenu
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  -- Entite liee (polymorphique)
  related_entity_type TEXT,  -- 'intervention', 'contract', 'building', etc.
  related_entity_id UUID,

  -- Statut
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  archived BOOLEAN DEFAULT FALSE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, created_at DESC)
WHERE archived = FALSE;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: activity_logs
-- Description: Journal d'audit complet
-- ============================================================================
CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Action
  action_type activity_action_type NOT NULL,
  entity_type activity_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  entity_name TEXT,

  -- Resultat
  status activity_status NOT NULL DEFAULT 'success',
  description TEXT,
  error_message TEXT,

  -- Details
  metadata JSONB DEFAULT '{}',  -- old_values, new_values, etc.

  -- Contexte
  ip_address INET,
  user_agent TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_team_date ON activity_logs(team_id, created_at DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: push_subscriptions
-- Description: Abonnements notifications push (PWA)
-- ============================================================================
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,  -- { p256dh, auth }
  user_agent TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
```

#### 1.5.8 Phase 3: Email System

```sql
-- ============================================================================
-- TABLE: team_email_connections
-- Description: Configuration des connexions email IMAP/SMTP par equipe
-- ============================================================================
CREATE TABLE team_email_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Provider
  provider VARCHAR(50) NOT NULL,  -- 'gmail', 'outlook', 'ovh', 'custom'
  email_address VARCHAR(255) NOT NULL,

  -- IMAP
  imap_host VARCHAR(255) NOT NULL,
  imap_port INTEGER DEFAULT 993,
  imap_use_ssl BOOLEAN DEFAULT TRUE,
  imap_username VARCHAR(255) NOT NULL,
  imap_password_encrypted TEXT NOT NULL,

  -- SMTP
  smtp_host VARCHAR(255) NOT NULL,
  smtp_port INTEGER DEFAULT 587,
  smtp_use_tls BOOLEAN DEFAULT TRUE,
  smtp_username VARCHAR(255) NOT NULL,
  smtp_password_encrypted TEXT NOT NULL,

  -- Synchronisation
  last_uid BIGINT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,

  -- Statut
  is_active BOOLEAN DEFAULT TRUE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_team_email UNIQUE (team_id, email_address)
);

-- RLS
ALTER TABLE team_email_connections ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: emails
-- Description: Emails recus et envoyes avec recherche full-text
-- ============================================================================
CREATE TABLE emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email_connection_id UUID REFERENCES team_email_connections(id),

  -- Direction
  direction email_direction NOT NULL DEFAULT 'received',
  status email_status NOT NULL DEFAULT 'unread',

  -- Headers
  message_id TEXT,
  in_reply_to UUID REFERENCES emails(id),
  references_header TEXT,

  -- Adresses
  from_address TEXT NOT NULL,
  to_addresses TEXT[] DEFAULT '{}',
  cc_addresses TEXT[] DEFAULT '{}',
  bcc_addresses TEXT[] DEFAULT '{}',

  -- Contenu
  subject TEXT,
  body_text TEXT,
  body_html TEXT,

  -- Liens optionnels
  building_id UUID REFERENCES buildings(id),
  lot_id UUID REFERENCES lots(id),
  intervention_id UUID REFERENCES interventions(id),

  -- Dates
  received_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,

  -- Recherche
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('french', COALESCE(subject, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(body_text, '')), 'B') ||
    setweight(to_tsvector('french', COALESCE(from_address, '')), 'C')
  ) STORED,

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_emails_search_vector ON emails USING GIN (search_vector);
CREATE INDEX idx_emails_team_status ON emails(team_id, status) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
```

#### 1.5.9 Phase 4: Contracts & Import

```sql
-- ============================================================================
-- TABLE: contracts
-- Description: Baux et contrats de location
-- ============================================================================
CREATE TABLE contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE RESTRICT,

  -- Informations
  title TEXT,
  contract_type contract_type NOT NULL DEFAULT 'bail_habitation',
  status contract_status NOT NULL DEFAULT 'brouillon',

  -- Dates
  start_date DATE NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 12,
  end_date DATE GENERATED ALWAYS AS (start_date + (duration_months || ' months')::interval) STORED,
  signed_date DATE,

  -- Paiement
  payment_frequency payment_frequency NOT NULL DEFAULT 'mensuel',
  payment_frequency_value INTEGER DEFAULT 1,
  rent_amount DECIMAL(10,2) NOT NULL,
  charges_amount DECIMAL(10,2) DEFAULT 0,

  -- Garantie
  guarantee_type guarantee_type NOT NULL DEFAULT 'pas_de_garantie',
  guarantee_amount DECIMAL(10,2),
  guarantee_notes TEXT,

  -- Metadonnees
  comments TEXT,
  metadata JSONB DEFAULT '{}',

  -- Chaine de renouvellement
  renewed_from_id UUID REFERENCES contracts(id),
  renewed_to_id UUID REFERENCES contracts(id),

  -- Createur
  created_by UUID REFERENCES users(id),

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_duration CHECK (duration_months >= 0 AND duration_months <= 120),
  CONSTRAINT valid_payment_frequency CHECK (payment_frequency_value >= 1 AND payment_frequency_value <= 12)
);

CREATE INDEX idx_contracts_team ON contracts(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_lot ON contracts(lot_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_status ON contracts(team_id, status) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: contract_contacts
-- Description: Contacts parties au contrat
-- ============================================================================
CREATE TABLE contract_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  -- Role
  role contract_contact_role NOT NULL DEFAULT 'locataire',
  is_primary BOOLEAN DEFAULT FALSE,

  notes TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_contract_contact_role UNIQUE (contract_id, contact_id, role)
);

-- RLS
ALTER TABLE contract_contacts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: contract_documents (DEPRECATED - Utiliser 'documents' a la place)
-- Migration: -> documents (entity_type = 'contract')
-- ============================================================================
-- DEPRECATED: Utiliser 'documents' avec entity_type = 'contract'

-- ============================================================================
-- TABLE: import_jobs
-- Description: Suivi des imports Excel/CSV
-- ============================================================================
CREATE TABLE import_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),

  -- Type et statut
  entity_type import_entity_type NOT NULL DEFAULT 'mixed',
  status import_job_status NOT NULL DEFAULT 'pending',

  -- Fichier source
  filename VARCHAR(255) NOT NULL,

  -- Progression
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,

  -- Details
  errors JSONB DEFAULT '[]',
  created_ids JSONB DEFAULT '{}',
  updated_ids JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Dates
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
```

#### 1.5.10 Documents Centralises

```sql
-- ============================================================================
-- TABLE: documents
-- Description: Documents centralises avec relation polymorphe
-- Remplace: property_documents, intervention_documents, contract_documents
-- ============================================================================
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- ══════════════════════════════════════════════════════════════════════════
  -- RELATION POLYMORPHE
  -- ══════════════════════════════════════════════════════════════════════════
  entity_type document_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  -- Note: Pas de FK car polymorphe - integrite via trigger ou applicatif

  -- ══════════════════════════════════════════════════════════════════════════
  -- CLASSIFICATION
  -- ══════════════════════════════════════════════════════════════════════════
  document_type document_type NOT NULL DEFAULT 'autre',
  category TEXT,                          -- Categorie libre pour tri/filtrage
  tags TEXT[] DEFAULT '{}',               -- Tags pour recherche full-text

  -- ══════════════════════════════════════════════════════════════════════════
  -- FICHIER
  -- ══════════════════════════════════════════════════════════════════════════
  filename TEXT NOT NULL,                 -- Nom stocke (UUID ou slugifie)
  original_filename TEXT NOT NULL,        -- Nom original uploade
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  mime_type TEXT NOT NULL,                -- ex: application/pdf, image/jpeg
  storage_path TEXT NOT NULL,             -- Chemin dans Supabase Storage
  storage_bucket TEXT NOT NULL DEFAULT 'documents',

  -- ══════════════════════════════════════════════════════════════════════════
  -- METADONNEES
  -- ══════════════════════════════════════════════════════════════════════════
  title TEXT,                             -- Titre libre
  description TEXT,                       -- Description detaillee
  document_date DATE,                     -- Date du document (ex: date facture)
  expiry_date DATE,                       -- Date d'expiration (ex: diagnostic)
  visibility_level document_visibility_level NOT NULL DEFAULT 'equipe',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,

  -- ══════════════════════════════════════════════════════════════════════════
  -- VALIDATION WORKFLOW (optionnel)
  -- ══════════════════════════════════════════════════════════════════════════
  is_validated BOOLEAN NOT NULL DEFAULT FALSE,
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMP WITH TIME ZONE,

  -- ══════════════════════════════════════════════════════════════════════════
  -- LIEN CHAT (pour pieces jointes conversation)
  -- ══════════════════════════════════════════════════════════════════════════
  message_id UUID REFERENCES conversation_messages(id) ON DELETE SET NULL,

  -- ══════════════════════════════════════════════════════════════════════════
  -- AUDIT COMPLET
  -- ══════════════════════════════════════════════════════════════════════════
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- ══════════════════════════════════════════════════════════════════════════
  -- CONTRAINTES
  -- ══════════════════════════════════════════════════════════════════════════
  CONSTRAINT valid_expiry CHECK (expiry_date IS NULL OR expiry_date >= document_date),
  CONSTRAINT valid_validation CHECK (
    (is_validated = FALSE AND validated_by IS NULL AND validated_at IS NULL) OR
    (is_validated = TRUE AND validated_by IS NOT NULL AND validated_at IS NOT NULL)
  )
);

-- ══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

-- Index principal: recherche par entite
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id) WHERE deleted_at IS NULL;

-- Index team pour isolation multi-tenant
CREATE INDEX idx_documents_team ON documents(team_id) WHERE deleted_at IS NULL;

-- Index par type de document
CREATE INDEX idx_documents_type ON documents(team_id, document_type) WHERE deleted_at IS NULL;

-- Index pour documents building
CREATE INDEX idx_documents_building ON documents(entity_id) WHERE entity_type = 'building' AND deleted_at IS NULL;

-- Index pour documents lot
CREATE INDEX idx_documents_lot ON documents(entity_id) WHERE entity_type = 'lot' AND deleted_at IS NULL;

-- Index pour documents intervention
CREATE INDEX idx_documents_intervention ON documents(entity_id) WHERE entity_type = 'intervention' AND deleted_at IS NULL;

-- Index pour documents contract
CREATE INDEX idx_documents_contract ON documents(entity_id) WHERE entity_type = 'contract' AND deleted_at IS NULL;

-- Index pour expiration (rappels)
CREATE INDEX idx_documents_expiry ON documents(expiry_date) WHERE expiry_date IS NOT NULL AND deleted_at IS NULL;

-- Index archives
CREATE INDEX idx_documents_archived ON documents(team_id, is_archived) WHERE deleted_at IS NULL;

-- Index validation
CREATE INDEX idx_documents_validation ON documents(team_id, is_validated) WHERE deleted_at IS NULL;

-- Index chat messages
CREATE INDEX idx_documents_message ON documents(message_id) WHERE message_id IS NOT NULL AND deleted_at IS NULL;

-- Full-text search
CREATE INDEX idx_documents_search ON documents USING GIN (
  to_tsvector('french',
    COALESCE(title, '') || ' ' ||
    COALESCE(description, '') || ' ' ||
    COALESCE(original_filename, '') || ' ' ||
    COALESCE(array_to_string(tags, ' '), '')
  )
) WHERE deleted_at IS NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Admin: acces total
CREATE POLICY "documents_admin_all" ON documents
  FOR ALL TO authenticated
  USING (is_admin());

-- Team managers: acces aux documents de leur equipe
CREATE POLICY "documents_team_manager" ON documents
  FOR ALL TO authenticated
  USING (is_team_manager(team_id));

-- Prestataires: acces aux documents des interventions assignees
CREATE POLICY "documents_prestataire_intervention" ON documents
  FOR SELECT TO authenticated
  USING (
    entity_type = 'intervention' AND
    is_assigned_to_intervention(entity_id) AND
    visibility_level IN ('prestataire', 'public')
  );

-- Locataires: acces aux documents de leurs lots avec visibilite appropriee
CREATE POLICY "documents_locataire_lot" ON documents
  FOR SELECT TO authenticated
  USING (
    entity_type = 'lot' AND
    is_tenant_of_lot(entity_id) AND
    visibility_level IN ('locataire', 'public')
  );

COMMENT ON TABLE documents IS 'Table centralisee pour tous les documents (polymorphe via entity_type/entity_id).';
```

#### 1.5.11 Subscriptions & Billing (Stripe)

```sql
-- ============================================================================
-- TABLE: stripe_customers
-- Description: Mapping entre equipes SEIDO et clients Stripe
-- ============================================================================
CREATE TABLE stripe_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- References
  team_id UUID NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,  -- cus_xxx (ID Stripe)

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_stripe_customers_team ON stripe_customers(team_id);
CREATE INDEX idx_stripe_customers_stripe ON stripe_customers(stripe_customer_id);

-- RLS: Gestionnaires de l'equipe uniquement
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_customers_select" ON stripe_customers
  FOR SELECT USING (is_admin() OR is_team_manager(team_id));

CREATE POLICY "stripe_customers_all" ON stripe_customers
  FOR ALL USING (is_admin());

-- ============================================================================
-- TABLE: stripe_products
-- Description: Catalogue de produits synchronise depuis Stripe Dashboard
-- ============================================================================
CREATE TABLE stripe_products (
  id TEXT PRIMARY KEY,  -- prod_xxx (ID Stripe comme PK)

  -- Informations produit
  active BOOLEAN DEFAULT TRUE,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Lecture publique (catalogue visible par tous les utilisateurs authentifies)
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_products_public_read" ON stripe_products
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "stripe_products_admin_write" ON stripe_products
  FOR ALL USING (is_admin());

-- Realtime pour mise a jour catalogue
ALTER PUBLICATION supabase_realtime ADD TABLE stripe_products;

-- ============================================================================
-- TABLE: stripe_prices
-- Description: Plans tarifaires synchronises depuis Stripe Dashboard
-- ============================================================================
CREATE TABLE stripe_prices (
  id TEXT PRIMARY KEY,  -- price_xxx (ID Stripe comme PK)

  -- Reference produit
  product_id TEXT NOT NULL REFERENCES stripe_products(id) ON DELETE CASCADE,

  -- Informations prix
  active BOOLEAN DEFAULT TRUE,
  description TEXT,
  unit_amount INTEGER,  -- En centimes (999 = 9.99EUR)
  currency TEXT DEFAULT 'eur',

  -- Type de facturation
  type pricing_type DEFAULT 'recurring',
  interval pricing_interval DEFAULT 'month',
  interval_count INTEGER DEFAULT 1,
  trial_period_days INTEGER,

  -- Metadonnees Stripe
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_stripe_prices_product ON stripe_prices(product_id);
CREATE INDEX idx_stripe_prices_active ON stripe_prices(active) WHERE active = TRUE;

-- RLS: Lecture publique
ALTER TABLE stripe_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_prices_public_read" ON stripe_prices
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "stripe_prices_admin_write" ON stripe_prices
  FOR ALL USING (is_admin());

-- Realtime pour mise a jour tarifs
ALTER PUBLICATION supabase_realtime ADD TABLE stripe_prices;

-- ============================================================================
-- TABLE: subscriptions
-- Description: Abonnements actifs synchronises depuis Stripe
-- ============================================================================
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,  -- sub_xxx (ID Stripe comme PK)

  -- References
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  price_id TEXT REFERENCES stripe_prices(id),

  -- Statut
  status subscription_status NOT NULL DEFAULT 'trialing',

  -- Periodes (synchronisees depuis Stripe)
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,

  -- Annulation
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancel_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,

  -- SEIDO Specifique: Compteur de biens facturables
  -- (buildings.count + lots.count WHERE building_id IS NULL)
  billable_properties INTEGER NOT NULL DEFAULT 0,

  -- Quantite (pour tarification par unite)
  quantity INTEGER DEFAULT 1,

  -- Metadonnees
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes pour lookups frequents
CREATE INDEX idx_subscriptions_team ON subscriptions(team_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_active ON subscriptions(team_id, status)
  WHERE status IN ('trialing', 'active', 'past_due');

-- RLS: Gestionnaires de l'equipe uniquement
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select" ON subscriptions
  FOR SELECT USING (is_admin() OR is_team_manager(team_id));

CREATE POLICY "subscriptions_all" ON subscriptions
  FOR ALL USING (is_admin());

-- ============================================================================
-- TABLE: stripe_invoices
-- Description: Historique des factures synchronisees depuis Stripe
-- ============================================================================
CREATE TABLE stripe_invoices (
  id TEXT PRIMARY KEY,  -- in_xxx (ID Stripe comme PK)

  -- References
  subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  team_id UUID NOT NULL REFERENCES teams(id),
  stripe_customer_id TEXT NOT NULL,

  -- Montants (en centimes)
  amount_due INTEGER NOT NULL,
  amount_paid INTEGER DEFAULT 0,
  amount_remaining INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'eur',

  -- Statut
  status invoice_status NOT NULL DEFAULT 'draft',

  -- URLs Stripe (pour paiement/telechargement)
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,

  -- Periodes
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Metadonnees SEIDO
  property_count INTEGER,  -- Nombre de biens factures sur cette periode

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_stripe_invoices_team ON stripe_invoices(team_id);
CREATE INDEX idx_stripe_invoices_subscription ON stripe_invoices(subscription_id);
CREATE INDEX idx_stripe_invoices_status ON stripe_invoices(status);
CREATE INDEX idx_stripe_invoices_date ON stripe_invoices(created_at DESC);

-- RLS: Gestionnaires de l'equipe uniquement
ALTER TABLE stripe_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_invoices_select" ON stripe_invoices
  FOR SELECT USING (is_admin() OR is_team_manager(team_id));

CREATE POLICY "stripe_invoices_all" ON stripe_invoices
  FOR ALL USING (is_admin());

-- ============================================================================
-- TRIGGER: Maintenir billable_properties synchronise
-- Description: Compte automatiquement buildings + lots standalone
-- ============================================================================
CREATE OR REPLACE FUNCTION update_subscription_property_count()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
  v_count INTEGER;
BEGIN
  -- Determiner l'equipe concernee
  IF TG_OP = 'DELETE' THEN
    v_team_id := OLD.team_id;
  ELSE
    v_team_id := NEW.team_id;
  END IF;

  -- Compter les biens facturables:
  -- - Tous les buildings actifs
  -- - Tous les lots standalone (sans building_id) actifs
  SELECT
    COALESCE((SELECT COUNT(*) FROM buildings WHERE team_id = v_team_id AND deleted_at IS NULL), 0) +
    COALESCE((SELECT COUNT(*) FROM lots WHERE team_id = v_team_id AND building_id IS NULL AND deleted_at IS NULL), 0)
  INTO v_count;

  -- Mettre a jour l'abonnement de l'equipe
  UPDATE subscriptions
  SET billable_properties = v_count, updated_at = NOW()
  WHERE team_id = v_team_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur buildings
CREATE TRIGGER tr_buildings_subscription_count
AFTER INSERT OR UPDATE OF deleted_at OR DELETE ON buildings
FOR EACH ROW EXECUTE FUNCTION update_subscription_property_count();

-- Trigger sur lots (pour les lots standalone)
CREATE TRIGGER tr_lots_subscription_count
AFTER INSERT OR UPDATE OF building_id, deleted_at OR DELETE ON lots
FOR EACH ROW EXECUTE FUNCTION update_subscription_property_count();
```

#### 1.5.12 RBAC & Permissions

```sql
-- ============================================================================
-- TABLE: permissions
-- Description: Definitions des permissions (table systeme)
-- ============================================================================
CREATE TABLE permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_admin_only BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_permissions_code ON permissions(code);
CREATE INDEX idx_permissions_category ON permissions(category);

-- RLS
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- TABLE: role_default_permissions
-- Description: Permissions par defaut par role
-- ============================================================================
CREATE TABLE role_default_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

  UNIQUE(role, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_default_permissions(role);

-- RLS
ALTER TABLE role_default_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SEED DATA: 28 Permissions
-- ============================================================================
INSERT INTO permissions (code, name, description, category, sort_order, is_system) VALUES
-- PERMISSIONS EQUIPE (6)
('team.view', 'Voir l''equipe', 'Voir les parametres', 'team', 1, true),
('team.manage', 'Gerer l''equipe', 'Modifier les parametres', 'team', 2, false),
('team.managers_invite', 'Inviter gestionnaires', 'Creer des comptes gestionnaire', 'team', 3, false),
('team.managers_manage', 'Gerer gestionnaires', 'Modifier permissions gestionnaires', 'team', 4, false),
('team.members_invite', 'Inviter membres', 'Inviter prestataires/locataires/proprietaires', 'team', 5, false),
('team.members_manage', 'Gerer membres', 'Modifier permissions autres membres', 'team', 6, false),

-- PERMISSIONS OPERATIONNELLES (17)
-- Properties (4)
('properties.view', 'Voir les biens', 'Consulter immeubles/lots', 'properties', 10, true),
('properties.create', 'Creer des biens', 'Ajouter immeubles/lots', 'properties', 11, false),
('properties.manage', 'Gerer les biens', 'Modifier/supprimer', 'properties', 12, false),
('properties.documents', 'Gerer documents', 'Upload/supprimer docs', 'properties', 13, false),

-- Contracts (3)
('contracts.view', 'Voir les contrats', 'Consulter les baux', 'contracts', 20, true),
('contracts.create', 'Creer des contrats', 'Ajouter des baux', 'contracts', 21, false),
('contracts.manage', 'Gerer les contrats', 'Modifier/resilier', 'contracts', 22, false),

-- Interventions (4)
('interventions.view', 'Voir les interventions', 'Consulter la liste', 'interventions', 30, true),
('interventions.create', 'Creer des interventions', 'Creer des demandes', 'interventions', 31, false),
('interventions.manage', 'Gerer les interventions', 'Approuver/assigner', 'interventions', 32, false),
('interventions.close', 'Cloturer', 'Finaliser interventions', 'interventions', 33, false),

-- Contacts (3)
('contacts.view', 'Voir les contacts', 'Consulter la liste', 'contacts', 40, true),
('contacts.create', 'Creer des contacts', 'Ajouter contacts', 'contacts', 41, false),
('contacts.manage', 'Gerer les contacts', 'Modifier/supprimer', 'contacts', 42, false),

-- Reports (3)
('reports.view', 'Voir les rapports', 'Acces dashboard', 'reports', 50, true),
('reports.export', 'Exporter', 'Export CSV/Excel', 'reports', 51, false),
('reports.analytics', 'Analytics', 'Analytics avances', 'reports', 52, false),

-- PERMISSIONS FACTURATION (5)
('billing.subscription_view', 'Voir l''abonnement', 'Consulter statut et plan actuel', 'billing', 60, false),
('billing.subscription_manage', 'Gerer l''abonnement', 'Modifier le plan, annuler', 'billing', 61, false),
('billing.invoices_view', 'Voir les factures', 'Consulter l''historique des factures', 'billing', 62, false),
('billing.invoices_download', 'Telecharger factures', 'Exporter les factures PDF', 'billing', 63, false),
('billing.payment_method', 'Gerer le paiement', 'Modifier carte bancaire ou IBAN', 'billing', 64, false);
```

#### 1.5.13 Fonctions RLS

```sql
-- ============================================================================
-- FONCTIONS IDENTITE
-- ============================================================================

-- Retourne l'ID du profil utilisateur connecte
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM users WHERE auth_user_id = auth.uid(); $$;

-- Retourne le role de l'utilisateur
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM users WHERE auth_user_id = auth.uid(); $$;

-- Verifie si admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin'); $$;

-- Verifie si gestionnaire
CREATE OR REPLACE FUNCTION is_gestionnaire()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'gestionnaire')); $$;

-- ============================================================================
-- FONCTIONS EQUIPE
-- ============================================================================

-- Retourne toutes les equipes de l'utilisateur
CREATE OR REPLACE FUNCTION get_user_teams_v2()
RETURNS TABLE(team_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT tm.team_id
  FROM team_members tm
  INNER JOIN users u ON tm.user_id = u.id
  WHERE u.auth_user_id = auth.uid() AND tm.left_at IS NULL;
$$;

-- Verifie l'appartenance a une equipe
CREATE OR REPLACE FUNCTION user_belongs_to_team_v2(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM get_user_teams_v2() WHERE team_id = p_team_id); $$;

-- Verifie si gestionnaire de l'equipe
CREATE OR REPLACE FUNCTION is_team_manager(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON tm.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND tm.team_id = p_team_id
      AND tm.role IN ('admin', 'gestionnaire')
      AND tm.left_at IS NULL
  );
$$;

-- Verifie si l'utilisateur est membre actif d'une equipe
CREATE OR REPLACE FUNCTION is_active_team_member(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = get_current_user_id()
      AND left_at IS NULL
  );
$$;

-- Verifie si l'utilisateur peut desactiver un membre
CREATE OR REPLACE FUNCTION can_deactivate_member(p_team_id UUID, p_target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_current_user_id UUID;
  v_current_role team_member_role;
  v_target_role team_member_role;
  v_is_owner BOOLEAN;
  v_admin_count INT;
BEGIN
  v_current_user_id := get_current_user_id();

  -- Admin systeme peut tout faire
  IF is_admin() THEN RETURN TRUE; END IF;

  -- Recuperer le role de l'utilisateur courant dans l'equipe
  SELECT role, is_team_owner INTO v_current_role, v_is_owner
  FROM team_members
  WHERE team_id = p_team_id AND user_id = v_current_user_id AND left_at IS NULL;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Team owner peut desactiver tout le monde sauf lui-meme
  IF v_is_owner AND p_target_user_id != v_current_user_id THEN
    RETURN TRUE;
  END IF;

  -- Gestionnaire/admin equipe peut desactiver les non-gestionnaires
  IF v_current_role IN ('admin', 'gestionnaire') THEN
    SELECT role INTO v_target_role
    FROM team_members
    WHERE team_id = p_team_id AND user_id = p_target_user_id AND left_at IS NULL;

    IF v_target_role NOT IN ('admin', 'gestionnaire') THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Empecher la desactivation du dernier admin/gestionnaire
  IF v_current_user_id = p_target_user_id THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM team_members
    WHERE team_id = p_team_id
      AND role IN ('admin', 'gestionnaire')
      AND left_at IS NULL;

    IF v_admin_count <= 1 THEN RETURN FALSE; END IF;
  END IF;

  RETURN FALSE;
END;
$$;

-- Compte les membres actifs d'une equipe
CREATE OR REPLACE FUNCTION get_active_member_count(p_team_id UUID)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM team_members
  WHERE team_id = p_team_id AND left_at IS NULL;
$$;

-- ============================================================================
-- FONCTIONS PERMISSIONS
-- ============================================================================

-- Verifie une permission specifique dans une equipe
CREATE OR REPLACE FUNCTION has_permission(p_team_id UUID, p_permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role user_role;
  v_member_permissions TEXT[];
  v_is_team_owner BOOLEAN;
BEGIN
  SELECT id, role INTO v_user_id, v_user_role
  FROM users WHERE auth_user_id = auth.uid();

  IF v_user_id IS NULL THEN RETURN FALSE; END IF;
  IF v_user_role = 'admin' THEN RETURN TRUE; END IF;

  SELECT permissions, is_team_owner INTO v_member_permissions, v_is_team_owner
  FROM team_members
  WHERE user_id = v_user_id AND team_id = p_team_id AND left_at IS NULL;

  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF v_is_team_owner = TRUE THEN RETURN TRUE; END IF;

  IF v_member_permissions IS NOT NULL THEN
    RETURN p_permission_code = ANY(v_member_permissions);
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM role_default_permissions rdp
    INNER JOIN permissions p ON rdp.permission_id = p.id
    WHERE rdp.role = v_user_role AND p.code = p_permission_code
  );
END;
$$;

-- Retourne toutes les permissions de l'utilisateur dans une equipe
CREATE OR REPLACE FUNCTION get_user_permissions(p_team_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role user_role;
  v_member_permissions TEXT[];
  v_is_team_owner BOOLEAN;
BEGIN
  SELECT id, role INTO v_user_id, v_user_role
  FROM users WHERE auth_user_id = auth.uid();

  IF v_user_id IS NULL THEN RETURN ARRAY[]::TEXT[]; END IF;
  IF v_user_role = 'admin' THEN
    RETURN (SELECT array_agg(code ORDER BY sort_order) FROM permissions);
  END IF;

  SELECT permissions, is_team_owner INTO v_member_permissions, v_is_team_owner
  FROM team_members
  WHERE user_id = v_user_id AND team_id = p_team_id AND left_at IS NULL;

  IF NOT FOUND THEN RETURN ARRAY[]::TEXT[]; END IF;
  IF v_is_team_owner THEN
    RETURN (SELECT array_agg(code ORDER BY sort_order) FROM permissions);
  END IF;

  IF v_member_permissions IS NOT NULL THEN RETURN v_member_permissions; END IF;

  RETURN (
    SELECT array_agg(p.code ORDER BY p.sort_order)
    FROM role_default_permissions rdp
    INNER JOIN permissions p ON rdp.permission_id = p.id
    WHERE rdp.role = v_user_role
  );
END;
$$;

-- ============================================================================
-- FONCTIONS PROPRIETES ET CONTACTS
-- ============================================================================

-- Recupere le team_id d'un immeuble
CREATE OR REPLACE FUNCTION get_building_team_id(p_building_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT team_id FROM buildings WHERE id = p_building_id; $$;

-- Recupere le team_id d'un lot
CREATE OR REPLACE FUNCTION get_lot_team_id(p_lot_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(l.team_id, b.team_id)
  FROM lots l
  LEFT JOIN buildings b ON l.building_id = b.id
  WHERE l.id = p_lot_id;
$$;

-- Verifie si l'utilisateur est locataire d'un lot (via contacts + contracts)
CREATE OR REPLACE FUNCTION is_tenant_of_lot(p_lot_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM contracts c
    INNER JOIN contract_contacts cc ON cc.contract_id = c.id
    INNER JOIN contacts co ON cc.contact_id = co.id
    WHERE c.lot_id = p_lot_id
      AND c.status IN ('actif', 'brouillon')
      AND c.deleted_at IS NULL
      AND cc.role IN ('locataire', 'colocataire')
      AND co.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );
$$;

-- Verifie si proprietaire d'un lot
CREATE OR REPLACE FUNCTION is_proprietaire_of_lot(p_lot_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lot_contacts lc
    INNER JOIN contacts c ON lc.contact_id = c.id
    WHERE lc.lot_id = p_lot_id
      AND (c.category = 'proprietaire' OR lc.role = 'proprietaire')
      AND c.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );
$$;

-- Verifie si l'utilisateur est assigne a une intervention
CREATE OR REPLACE FUNCTION is_assigned_to_intervention(p_intervention_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM intervention_assignments ia
    INNER JOIN users u ON ia.user_id = u.id
    WHERE ia.intervention_id = p_intervention_id
      AND u.auth_user_id = auth.uid()
  );
$$;

-- ============================================================================
-- FONCTIONS SUBSCRIPTION (Stripe)
-- ============================================================================

-- Verifie si l'equipe a un abonnement actif
CREATE OR REPLACE FUNCTION has_active_subscription(p_team_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE team_id = p_team_id
    AND status IN ('trialing', 'active', 'past_due')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Retourne le statut d'abonnement actuel de l'equipe
CREATE OR REPLACE FUNCTION get_subscription_status(p_team_id UUID)
RETURNS subscription_status AS $$
  SELECT status FROM subscriptions
  WHERE team_id = p_team_id
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Verifie si l'abonnement permet l'acces aux fonctionnalites
CREATE OR REPLACE FUNCTION is_subscription_valid(p_team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status subscription_status;
BEGIN
  SELECT status INTO v_status
  FROM subscriptions
  WHERE team_id = p_team_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Statuts permettant l'acces
  RETURN v_status IN ('trialing', 'active', 'past_due');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

---

### 1.6 Legende des Relations

| Symbole | Signification |
|---------|---------------|
| `──────▶` | Foreign Key (référence directe) |
| `◀──────▶` | Relation bidirectionnelle (N:M via junction table) |
| `1:1` | Relation un-à-un |
| `1:N` | Relation un-à-plusieurs |
| `N:M` | Relation plusieurs-à-plusieurs |
| `(nullable)` | Clé étrangère optionnelle |
| `─ ─ ─ ─▶` | Référence logique (check, pas FK) |

---

### 1.7 Matrice d'Accès par Rôle et par Table

Cette matrice définit les permissions **RLS (Row Level Security)** pour chaque table selon le rôle de l'utilisateur.

**Légende des Permissions :**
- ✅ **CRUD** = Create, Read, Update, Delete (accès complet)
- 📖 **R** = Read only (lecture seule)
- ✏️ **RU** = Read + Update (modification limitée)
- ➕ **CR** = Create + Read (création + lecture)
- 🔒 **RLS** = Accès filtré par team_id/user_id
- ❌ = Aucun accès
- 🔑 = Dépend des permissions RBAC
- 👤 = Propres données uniquement

#### Phase 1: Users & Teams

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope RLS |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-----------|
| `users` | ✅ CRUD | 📖 R team | 📖 R assigned | 👤 self | 👤 self | `team_members` |
| `teams` | ✅ CRUD | ✏️ RU 🔑 | 📖 R own | 📖 R own | 📖 R own | `team_members` |
| `team_members` | ✅ CRUD | ✅ CRUD 🔑 | 📖 R own | 📖 R own | 📖 R own | `team_id` |
| `user_invitations` | ✅ CRUD | ✅ CRUD 🔑 | ❌ | ❌ | ❌ | `team_id` |
| `companies` | ✅ CRUD | ✅ CRUD | 📖 R own | ❌ | 📖 R own | `team_id` |
| `company_members` | ✅ CRUD | ✅ CRUD | 📖 R own | ❌ | 📖 R own | via `companies` |
| `permissions` | ✅ CRUD | 📖 R | 📖 R | 📖 R | 📖 R | public |
| `role_default_permissions` | ✅ CRUD | 📖 R | 📖 R | 📖 R | 📖 R | public |
| `subscriptions` | ✅ CRUD | ✏️ RU 🔑 | ❌ | ❌ | ❌ | `team_id` |
| `subscription_invoices` | ✅ CRUD | 📖 R | ❌ | ❌ | ❌ | via `subscriptions` |

**Détail des actions `team_members` (soft delete avec `left_at`) :**

| Action | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire |
|--------|:-----:|:------------:|:-----------:|:---------:|:------------:|
| Voir membres actifs | ✅ | ✅ team | 📖 R self | 📖 R self | 📖 R self |
| Voir historique membres | ✅ | ✅ team | ❌ | ❌ | ❌ |
| Désactiver membre | ✅ | ✅ non-managers* | ❌ | ❌ | ❌ |
| Réactiver membre | ✅ | ✅ team | ❌ | ❌ | ❌ |

*\* Gestionnaires peuvent désactiver uniquement les membres avec rôle prestataire/locataire, pas les autres gestionnaires. Le team owner peut désactiver tous les membres sauf lui-même. La désactivation du dernier admin/gestionnaire est interdite.*

#### Phase CRM: Contacts

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope RLS |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-----------|
| `contacts` | ✅ CRUD | ✅ CRUD 🔑 | 📖 R assigned | 👤 self | 👤 self | `team_id` |
| `building_contacts` | ✅ CRUD | ✅ CRUD | 📖 R assigned | ❌ | 📖 R own bldg | via `buildings` |
| `lot_contacts` | ✅ CRUD | ✅ CRUD | 📖 R assigned | 📖 R own lot | 📖 R own lot | via `lots` |
| `contract_contacts` | ✅ CRUD | ✅ CRUD | ❌ | 📖 R own | 📖 R own | via `contracts` |

#### Phase 2: Properties

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope RLS |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-----------|
| `buildings` | ✅ CRUD | ✅ CRUD 🔑 | 📖 R assigned | 📖 R own | 📖 R own | `team_id` |
| `lots` | ✅ CRUD | ✅ CRUD 🔑 | 📖 R assigned | 📖 R own | 📖 R own | `team_id` |
| `property_documents` | ⚠️ **DEPRECATED** → `documents` | | | | | |

#### Phase 3: Interventions

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope RLS |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-----------|
| `interventions` | ✅ CRUD | ✅ CRUD 🔑 | ✏️ RU assigned | ➕ CR own | 📖 R own | `team_id` + assignments |
| `intervention_assignments` | ✅ CRUD | ✅ CRUD | 📖 R own | ❌ | ❌ | via `interventions` |
| `intervention_time_slots` | ✅ CRUD | ✅ CRUD | ➕ CR own | 📖 R own | 📖 R own | via `interventions` |
| `time_slot_responses` | ✅ CRUD | ✅ CRUD | ➕ CR own | ➕ CR own | ❌ | via `time_slots` |
| `intervention_quotes` | ✅ CRUD | ✅ CRUD 🔑 | ✅ CRUD own | 📖 R own | 📖 R own | via `interventions` |
| `intervention_documents` | ⚠️ **DEPRECATED** → `documents` | | | | | |
| `intervention_comments` | ✅ CRUD | ✅ CRUD | ➕ CR own | ➕ CR own | 📖 R own | via `interventions` |
| `intervention_reports` | ✅ CRUD | ✅ CRUD | ✅ CRUD own | 📖 R own | 📖 R own | via `interventions` |
| `intervention_links` | ✅ CRUD | ✅ CRUD | 📖 R | ❌ | ❌ | via `interventions` |

#### Phase 3: Chat & Communication

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope RLS |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-----------|
| `conversation_threads` | ✅ CRUD | ✅ CRUD | 📖 R participant | 📖 R participant | 📖 R participant | via `participants` |
| `conversation_messages` | ✅ CRUD | ✅ CRUD | ➕ CR own | ➕ CR own | ➕ CR own | via `threads` |
| `conversation_participants` | ✅ CRUD | ✅ CRUD | 📖 R own | 📖 R own | 📖 R own | via `threads` |

#### Phase 3: Notifications & Audit

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope RLS |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-----------|
| `notifications` | ✅ CRUD | ✏️ RU own | ✏️ RU own | ✏️ RU own | ✏️ RU own | `user_id` |
| `activity_logs` | ✅ CRUD | 📖 R team | ❌ | ❌ | ❌ | `team_id` |
| `push_subscriptions` | ✅ CRUD | ✅ CRUD own | ✅ CRUD own | ✅ CRUD own | ✅ CRUD own | `user_id` |

#### Phase 3: Email System

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope RLS |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-----------|
| `team_email_connections` | ✅ CRUD | ✅ CRUD 🔑 | ❌ | ❌ | ❌ | `team_id` |
| `emails` | ✅ CRUD | ✅ CRUD | 📖 R linked | 📖 R linked | 📖 R linked | via `connections` |
| `email_attachments` | ✅ CRUD | ✅ CRUD | 📖 R linked | 📖 R linked | 📖 R linked | via `emails` |
| `email_blacklist` | ✅ CRUD | ✅ CRUD | ❌ | ❌ | ❌ | `team_id` |

#### Phase 4: Contracts & Import

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope RLS |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-----------|
| `contracts` | ✅ CRUD | ✅ CRUD 🔑 | ❌ | 📖 R own | 📖 R own | `team_id` |
| `contract_documents` | ⚠️ **DEPRECATED** → `documents` | | | | | |
| `import_jobs` | ✅ CRUD | ✅ CRUD | ❌ | ❌ | ❌ | `team_id` |

#### Documents Centralisés (NEW)

| Table | Admin | Gestionnaire | Prestataire | Locataire | Propriétaire | Scope RLS |
|-------|:-----:|:------------:|:-----------:|:---------:|:------------:|-----------|
| `documents` | ✅ CRUD | ✅ CRUD 🔑 | 📖 R via visibility | 📖 R via visibility | 📖 R via visibility | `team_id` + `entity_type` + `visibility_level` |

**Notes sur les permissions `documents` :**
- **Admin** : Accès complet à tous les documents
- **Gestionnaire** : CRUD sur documents de son équipe (🔑 = audit créateur)
- **Prestataire** : Lecture si `visibility_level IN ('prestataire', 'public')` OU assigné à l'intervention
- **Locataire** : Lecture si `visibility_level IN ('locataire', 'public')` OU lié à son lot/contrat
- **Propriétaire** : Lecture si `visibility_level IN ('locataire', 'public')` OU lié à son bien

**Exemples de politiques RLS dynamiques :**
```sql
-- Prestataire: accès via visibility OU assignation intervention
CREATE POLICY "prestataire_documents_select" ON documents
  FOR SELECT USING (
    visibility_level IN ('prestataire', 'public')
    OR (
      entity_type = 'intervention'
      AND is_assigned_to_intervention(entity_id)
    )
  );
```

---

### 1.8 Explication Détaillée des Accès par Rôle

Cette section explique en détail la logique d'accès pour chaque rôle utilisateur dans SEIDO.

#### 🔴 Admin (Système)

**Description :** Administrateur système avec accès complet à toutes les données de la plateforme.

**Caractéristiques :**
- **Bypass RLS :** Les admins ont accès à TOUTES les équipes et données
- **Fonction RLS :** `is_admin()` retourne `TRUE` → bypass des politiques
- **Cas d'usage :** Support technique, debugging, gestion des abonnements

**Accès spécifiques :**
```sql
-- L'admin bypass toutes les politiques via :
CREATE POLICY "admin_full_access" ON any_table
  USING (is_admin());
```

**⚠️ Sécurité :** Les admins ne doivent jamais avoir le rôle `admin` stocké en base. Ils sont identifiés par une liste d'emails autorisés ou un flag système.

---

#### 🟢 Gestionnaire (Property Manager)

**Description :** Rôle principal de gestion. C'est le rôle attribué automatiquement à l'utilisateur qui crée une équipe.

**Caractéristiques :**
- **Scope :** Accès complet à sa(ses) équipe(s) via `team_members`
- **RBAC :** Les permissions peuvent être restreintes via `team_members.permissions[]`
- **Multi-équipe :** Un gestionnaire peut appartenir à plusieurs équipes avec des permissions différentes
- **Team Owner :** Le créateur de l'équipe (`is_team_owner = TRUE`) a toutes les permissions

**Accès par catégorie :**

| Catégorie | Accès | Condition RBAC |
|-----------|-------|----------------|
| **Properties** | CRUD buildings, lots | `has_permission(team_id, 'create_building')`, etc. |
| **Interventions** | CRUD complet | `has_permission(team_id, 'create_intervention')`, etc. |
| **Contacts** | CRUD complet | `has_permission(team_id, 'create_contact')`, etc. |
| **Team** | Inviter/gérer membres | `has_permission(team_id, 'invite_users')` |
| **Subscription** | Gérer abonnement | `has_permission(team_id, 'manage_subscription')` |
| **Company** | Modifier settings | `has_permission(team_id, 'manage_company_settings')` |

**Exemple de politique RLS :**
```sql
CREATE POLICY "gestionnaire_buildings" ON buildings
  USING (
    is_admin() OR
    (is_gestionnaire() AND is_team_manager(team_id))
  )
  WITH CHECK (
    is_admin() OR
    (is_gestionnaire() AND is_team_manager(team_id) AND has_permission(team_id, 'create_building'))
  );
```

**Cas particuliers :**
- **Gestionnaire invité sans permission `manage_subscription`** : Ne peut pas voir/modifier l'abonnement
- **Gestionnaire dans 2 équipes** : Peut avoir `full access` dans l'équipe A et `read only` dans l'équipe B

---

#### 🟡 Prestataire (Service Provider)

**Description :** Intervenant externe qui exécute les interventions (plombier, électricien, etc.).

**Caractéristiques :**
- **Scope limité :** Voit uniquement les interventions auxquelles il est assigné
- **Création limitée :** Peut créer devis, créneaux, documents sur ses interventions
- **Pas d'accès global :** Ne voit pas les buildings/lots sans intervention associée
- **Workflow actif :** Peut proposer des créneaux, soumettre des devis, clôturer

**Accès par catégorie :**

| Catégorie | Accès | Condition |
|-----------|-------|-----------|
| **Interventions** | Read + Update (statuts) | `is_assigned_to_intervention(intervention_id)` |
| **Quotes** | CRUD (propres devis) | `provider_id = current_user_id` |
| **Time Slots** | Create + Read | `proposed_by = current_user_id` |
| **Documents** | Create + Read | Sur ses interventions uniquement |
| **Chat** | Participer | Si `conversation_participants` contient son ID |
| **Buildings/Lots** | Read | Seulement ceux liés à ses interventions |

**Exemple de politique RLS :**
```sql
CREATE POLICY "prestataire_interventions" ON interventions
  USING (
    is_admin() OR
    is_assigned_to_intervention(id)
  );

-- Fonction helper
CREATE FUNCTION is_assigned_to_intervention(p_intervention_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM intervention_assignments
    WHERE intervention_id = p_intervention_id
    AND user_id = get_current_user_id()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

**Workflow typique :**
1. Reçoit notification d'assignation → `notifications`
2. Consulte l'intervention → `interventions` (read)
3. Propose des créneaux → `intervention_time_slots` (create)
4. Soumet un devis → `intervention_quotes` (create)
5. Réalise l'intervention et clôture → `interventions` (update status)
6. Ajoute rapport + photos → `intervention_reports`, `documents` (entity_type='intervention')

---

#### 🔵 Locataire (Tenant)

**Description :** Occupant d'un lot qui peut signaler des problèmes et suivre les interventions.

**Caractéristiques :**
- **Scope très limité :** Voit uniquement son(ses) lot(s) et ses interventions
- **Création simple :** Peut créer des demandes d'intervention
- **Suivi :** Peut voir le statut, répondre aux créneaux, participer au chat
- **Pas de données sensibles :** Pas d'accès aux devis, abonnements, autres locataires

**Accès par catégorie :**

| Catégorie | Accès | Condition |
|-----------|-------|-----------|
| **Lots** | Read (propre lot) | `is_tenant_of_lot(lot_id)` |
| **Interventions** | Create (demande) + Read (siennes) | `created_by = current_user_id` OU `lot_id` = son lot |
| **Time Slots** | Read + Respond | Sur ses interventions |
| **Documents** | Read | Sur ses interventions |
| **Chat** | Participer | Si participant à la conversation |
| **Contracts** | Read (propre contrat) | `lot_id` = son lot AND est signataire |
| **Notifications** | Read + Update | `user_id = current_user_id` |

**Exemple de politique RLS :**
```sql
CREATE POLICY "locataire_interventions" ON interventions
  USING (
    is_admin() OR
    (
      -- Ses propres demandes
      created_by = get_current_user_id()
    ) OR
    (
      -- Interventions sur son lot
      lot_id IN (
        SELECT lot_id FROM lot_contacts
        WHERE contact_id IN (
          SELECT id FROM contacts WHERE user_id = get_current_user_id()
        )
        AND contact_role = 'locataire'
      )
    )
  );

-- Fonction helper
CREATE FUNCTION is_tenant_of_lot(p_lot_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM lot_contacts lc
    JOIN contacts c ON c.id = lc.contact_id
    WHERE lc.lot_id = p_lot_id
    AND c.user_id = get_current_user_id()
    AND lc.contact_role = 'locataire'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

**Workflow typique :**
1. Signale un problème → `interventions` (create avec status='demande')
2. Reçoit notification de planification → `notifications`
3. Répond aux créneaux proposés → `time_slot_responses` (create)
4. Suit l'avancement → `interventions` (read)
5. Participe au chat si besoin → `conversation_messages` (create)
6. Confirme la résolution → `interventions` (update: status='cloturee_par_locataire')

---

#### 🟣 Propriétaire (Owner)

**Description :** Propriétaire d'un ou plusieurs lots, peut avoir un regard sur ses biens sans gérer activement.

**Caractéristiques :**
- **Scope par propriété :** Voit ses lots via `lot_contacts.contact_role = 'proprietaire'`
- **Lecture principale :** Accès en lecture aux interventions, documents, contrats de ses biens
- **Pas de gestion active :** Ne crée pas d'interventions (sauf cas particulier)
- **Vue financière :** Peut voir les devis approuvés (pour information)
- **Multi-lots possible :** Un propriétaire peut avoir plusieurs lots dans différents buildings

**Accès par catégorie :**

| Catégorie | Accès | Condition |
|-----------|-------|-----------|
| **Buildings** | Read (ses immeubles) | Via `building_contacts.contact_role = 'proprietaire'` |
| **Lots** | Read (ses lots) | Via `lot_contacts.contact_role = 'proprietaire'` |
| **Interventions** | Read | Sur ses lots uniquement |
| **Quotes** | Read (approuvés) | Sur ses interventions |
| **Documents** | Read | `documents` avec visibility appropriée (ses biens) |
| **Contracts** | Read | Sur ses lots |
| **Chat** | Lecture (si invité) | Via `conversation_participants` |
| **Notifications** | Read + Update | Ses propres notifications |

**Exemple de politique RLS :**
```sql
CREATE POLICY "proprietaire_buildings" ON buildings
  USING (
    is_admin() OR
    -- Via building_contacts
    id IN (
      SELECT bc.building_id FROM building_contacts bc
      JOIN contacts c ON c.id = bc.contact_id
      WHERE c.user_id = get_current_user_id()
      AND bc.contact_role = 'proprietaire'
    )
    OR
    -- Via lot_contacts (propriétaire d'un lot dans le building)
    id IN (
      SELECT l.building_id FROM lots l
      JOIN lot_contacts lc ON lc.lot_id = l.id
      JOIN contacts c ON c.id = lc.contact_id
      WHERE c.user_id = get_current_user_id()
      AND lc.contact_role = 'proprietaire'
    )
  );

-- Fonction helper
CREATE FUNCTION is_owner_of_lot(p_lot_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM lot_contacts lc
    JOIN contacts c ON c.id = lc.contact_id
    WHERE lc.lot_id = p_lot_id
    AND c.user_id = get_current_user_id()
    AND lc.contact_role = 'proprietaire'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

**Workflow typique :**
1. Reçoit notification d'intervention majeure sur son bien → `notifications`
2. Consulte les détails → `interventions` (read)
3. Voit les devis approuvés → `intervention_quotes` (read, status='approuve')
4. Consulte les documents → `documents` (entity_type IN ('building', 'lot', 'intervention'))
5. Participe au chat si invité → `conversation_messages` (create, si participant)

---

#### 📋 Workflow: Désactivation d'un Membre d'Équipe

Ce workflow décrit le processus de **soft delete** des membres d'équipe via le champ `left_at`.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW: DÉSACTIVATION D'UN MEMBRE                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ÉTAPE 1: Vérification des Permissions                                       │
│  ─────────────────────────────────────                                       │
│  → can_deactivate_member(team_id, target_user_id)                            │
│  → Vérifie: admin système, team owner, ou gestionnaire vs non-gestionnaire   │
│  → Empêche: désactivation du dernier admin/gestionnaire                      │
│                                                                              │
│  ÉTAPE 2: Désactivation (Soft Delete)                                        │
│  ────────────────────────────────────                                        │
│  → UPDATE team_members SET                                                   │
│      left_at = NOW(),                                                        │
│      left_by = current_user_id,                                              │
│      left_reason = 'Raison optionnelle'                                      │
│    WHERE team_id = X AND user_id = Y AND left_at IS NULL                     │
│                                                                              │
│  ⚠️ La suppression physique (DELETE) est bloquée par le trigger             │
│     prevent_team_member_delete()                                             │
│                                                                              │
│  ÉTAPE 3: Effets Automatiques                                                │
│  ────────────────────────────                                                │
│  → Trigger set_team_member_left_by() renseigne left_by si absent             │
│  → Les fonctions RLS filtrent automatiquement (WHERE left_at IS NULL)        │
│  → L'utilisateur perd immédiatement l'accès aux données de l'équipe          │
│                                                                              │
│  ÉTAPE 4: Notifications                                                      │
│  ─────────────────────                                                       │
│  → Notifier le membre désactivé                                              │
│  → Logger l'action dans activity_logs                                        │
│                                                                              │
│  ÉTAPE 5: Réactivation (si nécessaire)                                       │
│  ─────────────────────────────────────                                       │
│  → UPDATE team_members SET                                                   │
│      left_at = NULL,                                                         │
│      left_by = NULL,                                                         │
│      left_reason = NULL                                                      │
│    WHERE team_id = X AND user_id = Y AND left_at IS NOT NULL                 │
│                                                                              │
│  → L'utilisateur retrouve immédiatement son accès                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Fonctions RLS impliquées :**
- `is_active_team_member(team_id)` - Vérifie si l'utilisateur courant est actif
- `can_deactivate_member(team_id, user_id)` - Vérifie les permissions de désactivation
- `get_active_member_count(team_id)` - Compte les membres actifs

**Vue de commodité :**
- `team_members_active` - Pré-filtrée avec `left_at IS NULL`

**Exemple d'appel depuis le service :**
```typescript
// Dans team.repository.ts
async deactivateMember(teamId: string, userId: string, reason?: string) {
  // ⚠️ Utiliser UPDATE, pas DELETE
  const { data, error } = await supabase
    .from('team_members')
    .update({
      left_at: new Date().toISOString(),
      left_reason: reason || null
      // left_by est rempli automatiquement par le trigger
    })
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .is('left_at', null)  // Seulement si membre actif
    .select()
    .single()

  return { data, error }
}

async reactivateMember(teamId: string, userId: string) {
  const { data, error } = await supabase
    .from('team_members')
    .update({
      left_at: null,
      left_by: null,
      left_reason: null
    })
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .not('left_at', 'is', null)  // Seulement si membre désactivé
    .select()
    .single()

  return { data, error }
}
```

---

### 1.9 Logique RBAC et Résolution des Permissions

#### Ordre de Vérification des Permissions

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RÉSOLUTION DES PERMISSIONS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   1️⃣ ADMIN SYSTÈME ?                                                │
│   └─▶ is_admin() = TRUE → ✅ ACCÈS TOTAL (bypass)                   │
│                                                                     │
│   2️⃣ TEAM OWNER ?                                                   │
│   └─▶ team_members.is_team_owner = TRUE → ✅ TOUTES PERMISSIONS     │
│                                                                     │
│   3️⃣ PERMISSIONS CUSTOM ?                                           │
│   └─▶ team_members.permissions[] contient la permission ?           │
│       • OUI → ✅ ACCÈS                                               │
│       • NON et array non vide → ❌ REFUSÉ                            │
│       • Array NULL → continuer ⬇️                                    │
│                                                                     │
│   4️⃣ PERMISSIONS PAR DÉFAUT DU RÔLE                                 │
│   └─▶ role_default_permissions pour (role, permission_code)        │
│       • EXISTS → ✅ ACCÈS                                            │
│       • NOT EXISTS → ❌ REFUSÉ                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### Fonction `has_permission()` Complète

```sql
CREATE OR REPLACE FUNCTION has_permission(
  p_team_id UUID,
  p_permission_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_is_owner BOOLEAN;
  v_custom_permissions TEXT[];
  v_user_role user_role;
BEGIN
  -- 1. Récupérer l'ID utilisateur courant
  v_user_id := get_current_user_id();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 2. Admin système = bypass total
  IF is_admin() THEN
    RETURN TRUE;
  END IF;

  -- 3. Récupérer les infos du team_member
  SELECT
    tm.is_team_owner,
    tm.permissions,
    u.role
  INTO v_is_owner, v_custom_permissions, v_user_role
  FROM team_members tm
  JOIN users u ON u.id = tm.user_id
  WHERE tm.team_id = p_team_id
    AND tm.user_id = v_user_id
    AND tm.deleted_at IS NULL;

  -- Pas membre de l'équipe
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- 4. Team owner = toutes les permissions
  IF v_is_owner THEN
    RETURN TRUE;
  END IF;

  -- 5. Permissions custom définies ?
  IF v_custom_permissions IS NOT NULL AND array_length(v_custom_permissions, 1) > 0 THEN
    -- Utiliser les permissions custom (override complet)
    RETURN p_permission_code = ANY(v_custom_permissions);
  END IF;

  -- 6. Sinon, utiliser les permissions par défaut du rôle
  RETURN EXISTS (
    SELECT 1
    FROM role_default_permissions rdp
    JOIN permissions p ON p.id = rdp.permission_id
    WHERE rdp.role = v_user_role
      AND p.code = p_permission_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

#### Exemples de Scénarios

**Scénario 1 : Gestionnaire créateur d'équipe**
```
Marie crée l'équipe "Immo Paris"
→ team_members.is_team_owner = TRUE
→ has_permission('immo_paris', 'ANY') = TRUE
→ Accès complet à tout
```

**Scénario 2 : Gestionnaire invité avec permissions limitées**
```
Jean est invité par Marie avec permissions = ['create_intervention', 'edit_intervention']
→ team_members.permissions = ['create_intervention', 'edit_intervention']
→ has_permission('immo_paris', 'create_intervention') = TRUE
→ has_permission('immo_paris', 'invite_users') = FALSE
→ Jean peut gérer les interventions mais pas inviter d'utilisateurs
```

**Scénario 3 : Gestionnaire invité sans permissions custom**
```
Luc est invité par Marie sans permissions spécifiques
→ team_members.permissions = NULL
→ Fallback vers role_default_permissions pour 'gestionnaire'
→ Accès selon les permissions par défaut du rôle gestionnaire
```

**Scénario 4 : Multi-équipe avec permissions différentes**
```
Sophie est gestionnaire dans 2 équipes :
- "Immo Paris" : is_team_owner = TRUE → Full access
- "Immo Lyon" : permissions = ['create_building'] → Accès limité

→ has_permission('immo_paris', 'delete_building') = TRUE
→ has_permission('immo_lyon', 'delete_building') = FALSE
```

---

## 2. Architecture Contacts / Users

### 2.1 Problème de l'Architecture Actuelle

**État actuel :** Table `users` unifiée contenant :
- Utilisateurs authentifiés (`auth_user_id` non null)
- Contacts non authentifiés (`auth_user_id` = null)

**Problèmes :**
1. Confusion conceptuelle - "users" contient des non-utilisateurs
2. Difficile de distinguer contacts CRM vs utilisateurs app
3. Limitations pour fonctionnalités CRM futures

### 2.2 Architecture Proposée : Séparation Contacts / Users

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NOUVELLE ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   contacts (CRM)                         users (Auth)               │
│   ┌─────────────────┐                    ┌─────────────────┐        │
│   │ id              │                    │ id              │        │
│   │ team_id         │     optionnel      │ auth_user_id    │        │
│   │ email           │───── user_id ─────▶│ email           │        │
│   │ first_name      │                    │ role            │        │
│   │ last_name       │                    │ created_at      │        │
│   │ phone           │                    └────────┬────────┘        │
│   │ contact_type    │                             │                 │
│   │ company_id      │                             │                 │
│   │ user_id (FK)    │                             ▼                 │
│   │ notes           │                    ┌─────────────────┐        │
│   │ created_at      │                    │  team_members   │        │
│   └────────┬────────┘                    │  (permissions)  │        │
│            │                             └─────────────────┘        │
│            │                                                        │
│            ▼                                                        │
│   ┌────────────────────────────────────────────────────┐            │
│   │  building_contacts, lot_contacts, contract_contacts │            │
│   │  (FK → contacts.id)                                 │            │
│   └────────────────────────────────────────────────────┘            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2.1 Table `addresses` (Adresses Normalisées)

```sql
-- ============================================================================
-- TABLE: addresses
-- Description: Adresses normalisées réutilisables (buildings, lots, contacts, companies)
-- ============================================================================
CREATE TABLE addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Libellé optionnel
  label VARCHAR(100),  -- "Siège social", "Adresse facturation", "Adresse principale"

  -- Adresse structurée
  street_line_1 TEXT NOT NULL,        -- Numéro + rue
  street_line_2 TEXT,                  -- Complément (bâtiment, étage, boîte, etc.)
  postal_code VARCHAR(20) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state_province VARCHAR(100),         -- Région, province, canton (optionnel)
  country country NOT NULL DEFAULT 'belgique',

  -- Géocodage (optionnel, pour cartes/calcul distances)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_geocoded BOOLEAN DEFAULT FALSE,

  -- Validation
  is_verified BOOLEAN DEFAULT FALSE,   -- Adresse vérifiée manuellement

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index de base
CREATE INDEX idx_addresses_team ON addresses(team_id);
CREATE INDEX idx_addresses_city ON addresses(team_id, city);
CREATE INDEX idx_addresses_postal ON addresses(team_id, postal_code);

-- Index géographique (pour recherche par proximité)
CREATE INDEX idx_addresses_geo ON addresses(latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Full-text search
CREATE INDEX idx_addresses_search ON addresses USING GIN (
  to_tsvector('french',
    COALESCE(street_line_1, '') || ' ' ||
    COALESCE(city, '') || ' ' ||
    COALESCE(postal_code, '')
  )
);

-- RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addresses_team_isolation" ON addresses
  FOR ALL USING (is_team_manager(team_id) OR is_admin());

COMMENT ON TABLE addresses IS 'Table centralisée des adresses. Utilisée par buildings, lots (standalone), contacts, companies.';
COMMENT ON COLUMN addresses.label IS 'Libellé optionnel: Siège social, Adresse facturation, etc.';
COMMENT ON COLUMN addresses.is_geocoded IS 'TRUE si latitude/longitude ont été calculées via API de géocodage.';
```

### 2.2.2 Vue `v_addresses_formatted`

```sql
-- ============================================================================
-- VUE: v_addresses_formatted
-- Description: Adresses avec formatage prêt à l'affichage
-- ============================================================================
CREATE OR REPLACE VIEW v_addresses_formatted AS
SELECT
  a.*,
  -- Adresse formatée sur une ligne
  CONCAT_WS(', ',
    a.street_line_1,
    NULLIF(a.street_line_2, ''),
    a.postal_code || ' ' || a.city,
    a.country::TEXT
  ) AS full_address,
  -- Adresse courte (ville + code postal)
  a.postal_code || ' ' || a.city AS short_address,
  -- Adresse sur deux lignes (pour affichage)
  a.street_line_1 || COALESCE(E'\n' || a.street_line_2, '') AS street_address,
  a.postal_code || ' ' || a.city || ', ' || a.country::TEXT AS city_country
FROM addresses a;

COMMENT ON VIEW v_addresses_formatted IS 'Vue avec adresses formatées pour affichage UI.';
```

### 2.2.3 Table `documents` (Documents Centralisés - Polymorphe)

```sql
-- ============================================================================
-- TABLE: documents
-- Description: Documents centralisés avec relation polymorphe
-- Remplace: property_documents, intervention_documents, contract_documents
-- ============================================================================
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- ══════════════════════════════════════════════════════════════════════════
  -- RELATION POLYMORPHE
  -- ══════════════════════════════════════════════════════════════════════════
  entity_type document_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  -- Note: Pas de FK car polymorphe - intégrité via trigger ou applicatif

  -- ══════════════════════════════════════════════════════════════════════════
  -- CLASSIFICATION
  -- ══════════════════════════════════════════════════════════════════════════
  document_type document_type NOT NULL DEFAULT 'autre',
  category TEXT,                          -- Catégorie libre pour tri/filtrage
  tags TEXT[] DEFAULT '{}',               -- Tags pour recherche full-text

  -- ══════════════════════════════════════════════════════════════════════════
  -- FICHIER
  -- ══════════════════════════════════════════════════════════════════════════
  filename TEXT NOT NULL,                 -- Nom stocké (UUID ou slugifié)
  original_filename TEXT NOT NULL,        -- Nom original uploadé
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  mime_type TEXT NOT NULL,                -- ex: application/pdf, image/jpeg
  storage_path TEXT NOT NULL,             -- Chemin dans Supabase Storage
  storage_bucket TEXT NOT NULL DEFAULT 'documents',

  -- ══════════════════════════════════════════════════════════════════════════
  -- MÉTADONNÉES
  -- ══════════════════════════════════════════════════════════════════════════
  title TEXT,                             -- Titre libre
  description TEXT,                       -- Description détaillée
  document_date DATE,                     -- Date du document (ex: date facture)
  expiry_date DATE,                       -- Date d'expiration (ex: diagnostic)
  visibility_level document_visibility_level NOT NULL DEFAULT 'equipe',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,

  -- ══════════════════════════════════════════════════════════════════════════
  -- VALIDATION WORKFLOW (optionnel)
  -- ══════════════════════════════════════════════════════════════════════════
  is_validated BOOLEAN NOT NULL DEFAULT FALSE,
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMP WITH TIME ZONE,

  -- ══════════════════════════════════════════════════════════════════════════
  -- LIEN CHAT (pour pièces jointes conversation)
  -- ══════════════════════════════════════════════════════════════════════════
  message_id UUID REFERENCES conversation_messages(id) ON DELETE SET NULL,

  -- ══════════════════════════════════════════════════════════════════════════
  -- AUDIT COMPLET
  -- ══════════════════════════════════════════════════════════════════════════
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- ══════════════════════════════════════════════════════════════════════════
  -- CONTRAINTES
  -- ══════════════════════════════════════════════════════════════════════════
  CONSTRAINT valid_expiry CHECK (expiry_date IS NULL OR expiry_date >= document_date),
  CONSTRAINT valid_validation CHECK (
    (is_validated = FALSE AND validated_by IS NULL AND validated_at IS NULL) OR
    (is_validated = TRUE AND validated_by IS NOT NULL AND validated_at IS NOT NULL)
  )
);

-- ══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════════════════════

-- Index principal: recherche par entité
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id)
  WHERE deleted_at IS NULL;

-- Index team pour isolation multi-tenant
CREATE INDEX idx_documents_team ON documents(team_id)
  WHERE deleted_at IS NULL;

-- Index par type de document
CREATE INDEX idx_documents_type ON documents(team_id, document_type)
  WHERE deleted_at IS NULL;

-- Index pour documents building
CREATE INDEX idx_documents_building ON documents(entity_id)
  WHERE entity_type = 'building' AND deleted_at IS NULL;

-- Index pour documents lot
CREATE INDEX idx_documents_lot ON documents(entity_id)
  WHERE entity_type = 'lot' AND deleted_at IS NULL;

-- Index pour documents intervention
CREATE INDEX idx_documents_intervention ON documents(entity_id)
  WHERE entity_type = 'intervention' AND deleted_at IS NULL;

-- Index pour documents contract
CREATE INDEX idx_documents_contract ON documents(entity_id)
  WHERE entity_type = 'contract' AND deleted_at IS NULL;

-- Index pour expiration (rappels)
CREATE INDEX idx_documents_expiry ON documents(expiry_date)
  WHERE expiry_date IS NOT NULL AND deleted_at IS NULL;

-- Index archivés
CREATE INDEX idx_documents_archived ON documents(team_id, is_archived)
  WHERE deleted_at IS NULL;

-- Index validation
CREATE INDEX idx_documents_validation ON documents(team_id, is_validated)
  WHERE deleted_at IS NULL;

-- Index chat messages
CREATE INDEX idx_documents_message ON documents(message_id)
  WHERE message_id IS NOT NULL AND deleted_at IS NULL;

-- Full-text search
CREATE INDEX idx_documents_search ON documents USING GIN (
  to_tsvector('french',
    COALESCE(title, '') || ' ' ||
    COALESCE(description, '') || ' ' ||
    COALESCE(original_filename, '') || ' ' ||
    COALESCE(array_to_string(tags, ' '), '')
  )
) WHERE deleted_at IS NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Admin: accès total
CREATE POLICY "documents_admin_all" ON documents
  FOR ALL TO authenticated
  USING (is_admin());

-- Team managers: accès aux documents de leur équipe
CREATE POLICY "documents_team_manager" ON documents
  FOR ALL TO authenticated
  USING (is_team_manager(team_id));

-- Prestataires: accès aux documents des interventions assignées
CREATE POLICY "documents_prestataire_intervention" ON documents
  FOR SELECT TO authenticated
  USING (
    entity_type = 'intervention' AND
    is_assigned_to_intervention(entity_id) AND
    visibility_level IN ('prestataire', 'public')
  );

-- Locataires: accès aux documents de leurs lots avec visibilité appropriée
CREATE POLICY "documents_locataire_lot" ON documents
  FOR SELECT TO authenticated
  USING (
    entity_type = 'lot' AND
    is_tenant_of_lot(entity_id) AND
    visibility_level IN ('locataire', 'public')
  );

COMMENT ON TABLE documents IS 'Table centralisée pour tous les documents (polymorphe via entity_type/entity_id).';
```

### 2.2.4 Vue `v_documents_with_entity`

```sql
-- ============================================================================
-- VUE: v_documents_with_entity
-- Description: Documents avec infos de l'entité parente résolue
-- ============================================================================
CREATE OR REPLACE VIEW v_documents_with_entity AS
SELECT
  d.*,

  -- Infos entité résolue
  CASE d.entity_type
    WHEN 'building' THEN b.name
    WHEN 'lot' THEN l.reference
    WHEN 'intervention' THEN i.reference
    WHEN 'contract' THEN c.reference
    WHEN 'contact' THEN ct.display_name
    WHEN 'company' THEN co.name
  END AS entity_name,

  -- Adresse (si applicable)
  CASE d.entity_type
    WHEN 'building' THEN (SELECT full_address FROM v_addresses_formatted WHERE id = b.address_id)
    WHEN 'lot' THEN (SELECT full_address FROM v_addresses_formatted WHERE id = COALESCE(l.address_id, lb.address_id))
  END AS entity_address,

  -- Nom uploader
  u.display_name AS uploader_name

FROM documents d
LEFT JOIN buildings b ON d.entity_type = 'building' AND d.entity_id = b.id
LEFT JOIN lots l ON d.entity_type = 'lot' AND d.entity_id = l.id
LEFT JOIN buildings lb ON l.building_id = lb.id
LEFT JOIN interventions i ON d.entity_type = 'intervention' AND d.entity_id = i.id
LEFT JOIN contracts c ON d.entity_type = 'contract' AND d.entity_id = c.id
LEFT JOIN contacts ct ON d.entity_type = 'contact' AND d.entity_id = ct.id
LEFT JOIN companies co ON d.entity_type = 'company' AND d.entity_id = co.id
LEFT JOIN users u ON d.uploaded_by = u.id
WHERE d.deleted_at IS NULL;

COMMENT ON VIEW v_documents_with_entity IS 'Vue documents avec résolution automatique du nom de l''entité parente.';
```

### 2.3 Nouvelle Table : `contacts`

```sql
-- ============================================================================
-- TABLE: contacts
-- Description: Table CRM principale - Tous les contacts (personnes et entreprises)
-- ============================================================================
CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Association équipe (multi-tenant)
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Type de contact
  contact_type contact_type NOT NULL DEFAULT 'person',  -- 'person' | 'company'

  -- Informations de base
  email VARCHAR(255),                    -- Nullable (certains contacts n'ont pas d'email)
  first_name VARCHAR(255),               -- Pour les personnes
  last_name VARCHAR(255),                -- Pour les personnes
  display_name VARCHAR(255),             -- Nom affiché (calculé ou override)
  phone VARCHAR(50),
  mobile_phone VARCHAR(50),

  -- Adresse (FK vers table centralisée)
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,

  -- Informations entreprise (si contact_type = 'company')
  company_name VARCHAR(255),             -- Nom de l'entreprise
  vat_number VARCHAR(50),                -- Numéro TVA
  registration_number VARCHAR(50),       -- SIRET/BCE

  -- Association à une entreprise (si contact_type = 'person')
  company_id UUID REFERENCES companies(id),

  -- Catégorisation CRM
  category contact_category NOT NULL DEFAULT 'autre',
  -- 'locataire', 'proprietaire', 'prestataire', 'syndic', 'assurance', 'autre'

  speciality intervention_type,          -- Si prestataire
  provider_rating DECIMAL(3,2) DEFAULT 0.00,
  total_interventions INTEGER DEFAULT 0,

  -- Lien optionnel vers utilisateur (si invité à l'app)
  user_id UUID REFERENCES users(id),     -- NULL si pas invité

  -- Métadonnées
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  source VARCHAR(50),                    -- 'manual', 'import', 'api'

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contraintes
  CONSTRAINT valid_contact_type CHECK (
    (contact_type = 'person' AND (first_name IS NOT NULL OR last_name IS NOT NULL))
    OR
    (contact_type = 'company' AND company_name IS NOT NULL)
  ),
  CONSTRAINT unique_email_per_team UNIQUE (team_id, email) WHERE email IS NOT NULL
);

-- Index
CREATE INDEX idx_contacts_team_id ON contacts(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_email ON contacts(team_id, email) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_contacts_category ON contacts(team_id, category) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_user_id ON contacts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_contacts_company_id ON contacts(company_id) WHERE company_id IS NOT NULL;

-- Full-text search
CREATE INDEX idx_contacts_search ON contacts USING GIN (
  to_tsvector('french', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(company_name, '') || ' ' || COALESCE(email, ''))
) WHERE deleted_at IS NULL;

COMMENT ON TABLE contacts IS 'Table CRM principale. Contient tous les contacts (personnes et entreprises). Peut être lié à un user si invité à l''app.';
COMMENT ON COLUMN contacts.user_id IS 'FK vers users si le contact a été invité et a accès à l''application. NULL sinon.';
```

### 2.4 Nouveaux Enums pour Contacts

```sql
-- Type de contact
CREATE TYPE contact_type AS ENUM ('person', 'company');

-- Catégorie de contact (CRM)
CREATE TYPE contact_category AS ENUM (
  'locataire',
  'proprietaire',
  'prestataire',
  'syndic',
  'assurance',
  'notaire',
  'banque',
  'administration',
  'autre'
);
```

### 2.5 Table `users` Modifiée

La table `users` devient **uniquement** pour les utilisateurs authentifiés :

```sql
-- ============================================================================
-- TABLE: users (MODIFIÉE)
-- Description: Utilisateurs authentifiés uniquement (peuvent se connecter)
-- ============================================================================
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Authentification Supabase (OBLIGATOIRE)
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Informations de base
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(50),
  avatar_url TEXT,

  -- Rôle global (pour l'application)
  role user_role NOT NULL DEFAULT 'gestionnaire',

  -- Équipe principale (pour performance)
  primary_team_id UUID REFERENCES teams(id),

  -- Statut
  is_active BOOLEAN DEFAULT TRUE,
  password_set BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP WITH TIME ZONE,

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE UNIQUE INDEX idx_users_auth_user_id ON users(auth_user_id);
CREATE UNIQUE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_primary_team ON users(primary_team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;

COMMENT ON TABLE users IS 'Utilisateurs authentifiés uniquement. Chaque user DOIT avoir un auth_user_id.';
COMMENT ON COLUMN users.auth_user_id IS 'Lien vers Supabase Auth. OBLIGATOIRE - pas de users sans authentification.';
```

### 2.6 Flux de Création et d'Invitation

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    FLUX DE CRÉATION DE CONTACT                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ÉTAPE 1: Création Contact (CRM)                                             │
│  ────────────────────────────────                                            │
│  → INSERT INTO contacts (team_id, email, first_name, last_name, category)    │
│  → user_id = NULL (pas d'accès app)                                          │
│  → Le contact existe dans le CRM                                             │
│                                                                              │
│                                                                              │
│  ÉTAPE 2: Invitation à l'App (Optionnel)                                     │
│  ───────────────────────────────────────                                     │
│  → Gestionnaire clique "Inviter à l'app"                                     │
│  → Supabase Auth: supabase.auth.admin.generateLink('magiclink', email)       │
│  → INSERT INTO users (auth_user_id, email, role)                             │
│  → UPDATE contacts SET user_id = <new_user_id>                               │
│  → INSERT INTO team_members (user_id, team_id, role, is_team_owner=FALSE)    │
│  → INSERT INTO user_invitations (email, user_id, team_id, status='pending')  │
│  → Envoi email d'invitation                                                  │
│                                                                              │
│                                                                              │
│  ÉTAPE 3: Acceptation Invitation                                             │
│  ───────────────────────────────                                             │
│  → Contact clique sur le lien magic                                          │
│  → Supabase Auth confirme l'email                                            │
│  → Trigger: UPDATE user_invitations SET status='accepted'                    │
│  → Le contact peut maintenant se connecter                                   │
│                                                                              │
│                                                                              │
│  ÉTAPE 4 (optionnel): Révocation d'accès                                     │
│  ────────────────────────────────────────                                    │
│  → Gestionnaire clique "Révoquer l'accès"                                    │
│  → UPDATE team_members SET left_at = NOW()                                   │
│  → Le contact reste dans le CRM mais ne peut plus se connecter               │
│  → contacts.user_id reste lié (historique)                                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.7 Modification des Tables Junction

Les tables `building_contacts`, `lot_contacts`, `contract_contacts` doivent pointer vers `contacts` :

```sql
-- ============================================================================
-- MODIFICATION: building_contacts
-- Changer FK de users.id vers contacts.id
-- ============================================================================
ALTER TABLE building_contacts
  DROP CONSTRAINT building_contacts_user_id_fkey,
  RENAME COLUMN user_id TO contact_id,
  ADD CONSTRAINT building_contacts_contact_id_fkey
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

-- Idem pour lot_contacts et contract_contacts
```

---

## 3. Phase 1: Users & Teams

### 3.1 Table `teams`

```sql
-- ============================================================================
-- TABLE: teams
-- Description: Équipes/agences - Unité d'isolation multi-tenant
-- ============================================================================
CREATE TABLE teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Configuration
  settings JSONB DEFAULT '{}',

  -- Créateur (devient team_owner)
  created_by UUID REFERENCES users(id),

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE teams IS 'Équipes/agences - Toutes les données métier sont scopées par team_id';
```

**Structure du champ `settings` :**
```json
{
  "notifications": {
    "email_enabled": true,
    "push_enabled": true
  },
  "branding": {
    "logo_url": "https://...",
    "primary_color": "#1a73e8"
  },
  "features": {
    "email_integration": true,
    "quote_workflow": true
  },
  "billing": {
    "company_name": "Mon Agence SPRL",
    "vat_number": "BE0123456789",
    "billing_email": "facturation@monagence.be"
  }
}
```

### 3.2 Table `team_members`

```sql
-- ============================================================================
-- TABLE: team_members (MODIFIÉE)
-- Description: Appartenance utilisateur-équipe avec permissions
-- ============================================================================
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Rôle dans l'équipe
  role team_member_role NOT NULL DEFAULT 'gestionnaire',

  -- Permissions granulaires (NOUVEAU)
  permissions TEXT[] DEFAULT NULL,  -- NULL = utiliser défauts du rôle
  is_team_owner BOOLEAN DEFAULT FALSE,  -- Créateur de l'équipe

  -- Dates
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,  -- Soft delete membership

  -- Contraintes
  CONSTRAINT unique_team_user UNIQUE (team_id, user_id)
);

-- Index critique pour RLS
CREATE INDEX idx_team_members_user_team_role
ON team_members(user_id, team_id, role)
WHERE left_at IS NULL;

-- Index GIN pour permissions
CREATE INDEX idx_team_members_permissions ON team_members USING GIN(permissions)
WHERE permissions IS NOT NULL;

-- Index pour team owners
CREATE INDEX idx_team_members_owner ON team_members(team_id)
WHERE is_team_owner = TRUE;

COMMENT ON COLUMN team_members.permissions IS 'Override des permissions. NULL = permissions par défaut du rôle.';
COMMENT ON COLUMN team_members.is_team_owner IS 'TRUE = créateur de l''équipe, a TOUTES les permissions.';
```

### 3.3 Table `companies`

```sql
-- ============================================================================
-- TABLE: companies
-- Description: Entreprises (prestataires, syndics, etc.)
-- ============================================================================
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Informations légales
  name VARCHAR(255) NOT NULL,
  legal_name VARCHAR(255),
  vat_number VARCHAR(50),
  registration_number VARCHAR(50),  -- SIRET/BCE

  -- Coordonnées
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),

  -- Métadonnées
  logo_url TEXT,
  notes TEXT,

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_companies_team ON companies(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_vat ON companies(vat_number) WHERE vat_number IS NOT NULL;
```

### 3.4 Table `company_members`

```sql
-- ============================================================================
-- TABLE: company_members (MODIFIÉE)
-- Description: Membres d'une entreprise (contacts employés)
-- ============================================================================
CREATE TABLE company_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,  -- Changé de user_id

  -- Rôle dans l'entreprise
  role VARCHAR(50),  -- 'owner', 'admin', 'employee', 'contractor'
  job_title VARCHAR(100),
  is_primary BOOLEAN DEFAULT FALSE,

  notes TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_company_contact UNIQUE (company_id, contact_id)
);
```

### 3.5 Table `user_invitations`

```sql
-- ============================================================================
-- TABLE: user_invitations
-- Description: Invitations en attente pour rejoindre une équipe
-- ============================================================================
CREATE TABLE user_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Contact invité
  email VARCHAR(255) NOT NULL,
  contact_id UUID REFERENCES contacts(id),  -- NOUVEAU: lien vers le contact

  -- Équipe cible
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- User créé (après acceptation)
  user_id UUID REFERENCES users(id),

  -- Invitant
  invited_by UUID NOT NULL REFERENCES users(id),

  -- Configuration
  role user_role NOT NULL DEFAULT 'gestionnaire',
  provider_category VARCHAR(50),  -- Si prestataire

  -- Pré-remplissage
  first_name VARCHAR(255),
  last_name VARCHAR(255),

  -- Token et statut
  invitation_token VARCHAR(255),
  status invitation_status NOT NULL DEFAULT 'pending',

  -- Dates
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_pending_invitation UNIQUE (email, team_id)
);

CREATE INDEX idx_user_invitations_email ON user_invitations(email);
CREATE INDEX idx_user_invitations_team ON user_invitations(team_id);
CREATE INDEX idx_user_invitations_status ON user_invitations(status);
CREATE INDEX idx_user_invitations_contact ON user_invitations(contact_id) WHERE contact_id IS NOT NULL;
```

---

## 4. Phase 2: Properties

### 4.1 Table `buildings`

```sql
-- ============================================================================
-- TABLE: buildings
-- Description: Immeubles - Peuvent contenir plusieurs lots
-- ============================================================================
CREATE TABLE buildings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  reference VARCHAR(50),  -- Référence interne

  -- Adresse (via table centralisée)
  address_id UUID NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,

  -- Description
  description TEXT,

  -- Compteurs (maintenus par trigger)
  total_lots INTEGER DEFAULT 0,
  occupied_lots INTEGER DEFAULT 0,
  vacant_lots INTEGER DEFAULT 0,
  total_interventions INTEGER DEFAULT 0,
  active_interventions INTEGER DEFAULT 0,

  -- Métadonnées
  metadata JSONB DEFAULT '{}',

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_lots_count CHECK (occupied_lots + vacant_lots = total_lots)
);

CREATE INDEX idx_buildings_team ON buildings(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_buildings_address ON buildings(address_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_buildings_search ON buildings USING GIN (
  to_tsvector('french', name)
) WHERE deleted_at IS NULL;
-- Note: Pour recherche full-text incluant l'adresse, utiliser JOIN avec addresses
```

### 4.2 Table `lots`

```sql
-- ============================================================================
-- TABLE: lots
-- Description: Lots/appartements - Standalone ou dans un building
-- ============================================================================
CREATE TABLE lots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,  -- NULL = standalone

  -- Identification
  reference TEXT NOT NULL,
  category lot_category NOT NULL DEFAULT 'appartement',

  -- Localisation dans l'immeuble
  floor INTEGER,  -- -5 à 100
  apartment_number TEXT,

  -- Adresse (si standalone, sinon hérite via building.address_id)
  address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,

  -- Description
  description TEXT,

  -- Compteurs
  total_interventions INTEGER DEFAULT 0,
  active_interventions INTEGER DEFAULT 0,

  -- Métadonnées
  metadata JSONB DEFAULT '{}',

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_reference_per_team UNIQUE (team_id, reference) DEFERRABLE INITIALLY DEFERRED,
  CONSTRAINT valid_floor CHECK (floor >= -5 AND floor <= 100)
);

CREATE INDEX idx_lots_team ON lots(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lots_building ON lots(building_id) WHERE building_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_lots_standalone ON lots(team_id) WHERE building_id IS NULL AND deleted_at IS NULL;
```

### 4.3 Table `building_contacts`

```sql
-- ============================================================================
-- TABLE: building_contacts (MODIFIÉE)
-- Description: Contacts associés aux immeubles
-- ============================================================================
CREATE TABLE building_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,  -- Changé!
  team_id UUID NOT NULL,  -- Dénormalisé pour RLS

  -- Rôle
  role TEXT,  -- 'syndic', 'proprietaire', 'gardien', etc.
  is_primary BOOLEAN DEFAULT FALSE,

  notes TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_building_contact UNIQUE (building_id, contact_id)
);

-- Trigger pour synchroniser team_id
CREATE TRIGGER tr_building_contacts_team_id
BEFORE INSERT ON building_contacts
FOR EACH ROW EXECUTE FUNCTION sync_building_contact_team_id();
```

### 4.4 Table `lot_contacts`

```sql
-- ============================================================================
-- TABLE: lot_contacts (MODIFIÉE)
-- Description: Contacts associés aux lots (locataires, propriétaires)
-- ============================================================================
CREATE TABLE lot_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,  -- Changé!
  team_id UUID NOT NULL,  -- Dénormalisé pour RLS

  -- Rôle
  role TEXT,  -- 'locataire', 'proprietaire', 'garant', etc.
  is_primary BOOLEAN DEFAULT FALSE,

  notes TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_lot_contact UNIQUE (lot_id, contact_id)
);

-- Trigger pour synchroniser team_id
CREATE TRIGGER tr_lot_contacts_team_id
BEFORE INSERT ON lot_contacts
FOR EACH ROW EXECUTE FUNCTION sync_lot_contact_team_id();
```

### 4.5 Table `property_documents` ⚠️ **DEPRECATED**

> **DEPRECATED**: Cette table est remplacée par la table centralisée `documents` (section 2.2.3).
> Utilisez `documents` avec `entity_type = 'building'` ou `entity_type = 'lot'`.

```sql
-- ============================================================================
-- TABLE: property_documents (DEPRECATED - Utiliser 'documents' à la place)
-- Description: Documents attachés aux immeubles ou lots
-- Migration: → documents (entity_type = 'building' | 'lot')
-- ============================================================================
CREATE TABLE property_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relation polymorphique
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,

  -- Type et catégorie
  document_type property_document_type NOT NULL DEFAULT 'autre',
  category TEXT,

  -- Fichier
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'property-documents',

  -- Métadonnées
  title TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  expiry_date DATE,
  document_date DATE,

  -- Visibilité
  visibility_level document_visibility_level DEFAULT 'equipe',
  is_archived BOOLEAN DEFAULT FALSE,

  -- Upload
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Contrainte polymorphique
  CONSTRAINT valid_property_reference CHECK (
    (building_id IS NOT NULL AND lot_id IS NULL) OR
    (building_id IS NULL AND lot_id IS NOT NULL)
  )
);
```

---

## 5. Phase 3: Interventions

### 5.1 Table `interventions`

```sql
-- ============================================================================
-- TABLE: interventions
-- Description: Demandes d'intervention - Coeur du workflow métier
-- ============================================================================
CREATE TABLE interventions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identification
  reference VARCHAR(20) NOT NULL UNIQUE,  -- INT-YYYYMMDD-XXX

  -- Relation polymorphique vers bien
  building_id UUID REFERENCES buildings(id),
  lot_id UUID REFERENCES lots(id),
  team_id UUID NOT NULL REFERENCES teams(id),

  -- Demandeur (contact)
  tenant_contact_id UUID REFERENCES contacts(id),  -- Contact qui a fait la demande

  -- Description
  title TEXT NOT NULL,
  description TEXT,
  type intervention_type NOT NULL DEFAULT 'autre',
  urgency intervention_urgency NOT NULL DEFAULT 'normale',

  -- Statut
  status intervention_status NOT NULL DEFAULT 'demande',

  -- Dates
  requested_date TIMESTAMP WITH TIME ZONE,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,

  -- Coûts
  estimated_cost DECIMAL(10,2),
  final_cost DECIMAL(10,2),

  -- Métadonnées
  is_contested BOOLEAN DEFAULT FALSE,
  scheduling_method TEXT,  -- 'direct', 'slots', 'flexible'
  provider_guidelines TEXT,
  has_attachments BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',

  -- Créateur
  created_by UUID REFERENCES users(id),

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_interventions_team_status ON interventions(team_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_lot ON interventions(lot_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_building ON interventions(building_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_reference ON interventions(reference);

-- Trigger pour générer la référence
CREATE TRIGGER tr_intervention_reference
BEFORE INSERT ON interventions
FOR EACH ROW EXECUTE FUNCTION generate_intervention_reference();
```

### 5.2 Table `intervention_assignments`

```sql
-- ============================================================================
-- TABLE: intervention_assignments
-- Description: Assignations de gestionnaires et prestataires aux interventions
-- ============================================================================
CREATE TABLE intervention_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),  -- Utilisateur assigné (doit avoir accès app)

  -- Configuration
  role assignment_role NOT NULL DEFAULT 'gestionnaire',  -- 'gestionnaire' | 'prestataire'
  is_primary BOOLEAN DEFAULT FALSE,

  -- Notification
  notified BOOLEAN DEFAULT FALSE,
  notes TEXT,

  -- Assignation
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_intervention_user_role UNIQUE (intervention_id, user_id, role)
);
```

### 5.3 Table `intervention_time_slots`

```sql
-- ============================================================================
-- TABLE: intervention_time_slots
-- Description: Créneaux horaires proposés pour la planification
-- ============================================================================
CREATE TABLE intervention_time_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,  -- Dénormalisé pour RLS

  -- Créneau
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  -- Statut
  is_selected BOOLEAN DEFAULT FALSE,
  status time_slot_status DEFAULT 'pending',

  -- Proposant
  proposed_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_slot UNIQUE (intervention_id, slot_date, start_time, end_time),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Trigger synchronisation team_id
CREATE TRIGGER tr_time_slots_team_id
BEFORE INSERT ON intervention_time_slots
FOR EACH ROW EXECUTE FUNCTION sync_intervention_time_slot_team_id();
```

### 5.4 Table `intervention_quotes`

```sql
-- ============================================================================
-- TABLE: intervention_quotes
-- Description: Devis et factures pour les interventions
-- ============================================================================
CREATE TABLE intervention_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES users(id),  -- Prestataire
  team_id UUID NOT NULL,

  -- Type
  quote_type TEXT NOT NULL DEFAULT 'estimation',  -- 'estimation' | 'final'

  -- Montants
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',

  -- Détail
  description TEXT,
  line_items JSONB DEFAULT '[]',  -- [{description, quantity, unit, unit_price, total}]

  -- Statut
  status quote_status NOT NULL DEFAULT 'draft',
  valid_until DATE,

  -- Validation
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,

  -- Créateur
  created_by UUID REFERENCES users(id),

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 5.5 Autres Tables Interventions

```sql
-- intervention_reports: Rapports textuels
-- intervention_documents: ⚠️ DEPRECATED → Utiliser 'documents' (entity_type = 'intervention')
-- intervention_comments: Commentaires threadés
-- intervention_links: Liens entre interventions
-- time_slot_responses: Réponses aux créneaux
-- (Schéma similaire à la documentation existante)
```

> **Note DEPRECATED**: `intervention_documents` est remplacée par la table centralisée `documents` (section 2.2.3).
> Utilisez `documents` avec `entity_type = 'intervention'`.

---

## 6. Phase 3: Chat System

### 6.1 Table `conversation_threads`

```sql
-- ============================================================================
-- TABLE: conversation_threads
-- Description: Fils de discussion liés aux interventions
-- ============================================================================
CREATE TABLE conversation_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,  -- Dénormalisé

  -- Type de fil
  thread_type conversation_thread_type NOT NULL DEFAULT 'group',
  title TEXT,

  -- Compteurs
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMP WITH TIME ZONE,

  -- Créateur
  created_by UUID NOT NULL REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_thread_per_intervention UNIQUE (intervention_id, thread_type)
);
```

### 6.2 Table `conversation_messages`

```sql
-- ============================================================================
-- TABLE: conversation_messages
-- Description: Messages dans les fils de discussion
-- ============================================================================
CREATE TABLE conversation_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),  -- Nullable si user supprimé
  team_id UUID NOT NULL,  -- Dénormalisé pour RLS

  -- Contenu
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',  -- mentions, reactions, attachments

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger synchronisation team_id
CREATE TRIGGER tr_messages_team_id
BEFORE INSERT ON conversation_messages
FOR EACH ROW EXECUTE FUNCTION sync_conversation_message_team_id();
```

### 6.3 Table `conversation_participants`

```sql
-- ============================================================================
-- TABLE: conversation_participants
-- Description: Participants aux fils de discussion avec suivi de lecture
-- ============================================================================
CREATE TABLE conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  thread_id UUID NOT NULL REFERENCES conversation_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Suivi de lecture
  last_read_message_id UUID REFERENCES conversation_messages(id),
  last_read_at TIMESTAMP WITH TIME ZONE,

  -- Date d'ajout
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_participant UNIQUE (thread_id, user_id)
);
```

---

## 7. Phase 3: Notifications & Audit

### 7.1 Table `notifications`

```sql
-- ============================================================================
-- TABLE: notifications
-- Description: Notifications in-app temps réel
-- ============================================================================
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  created_by UUID REFERENCES users(id),

  -- Type et priorité
  type notification_type NOT NULL DEFAULT 'system',
  priority notification_priority NOT NULL DEFAULT 'normal',

  -- Contenu
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  -- Entité liée (polymorphique)
  related_entity_type TEXT,  -- 'intervention', 'contract', 'building', etc.
  related_entity_id UUID,

  -- Statut
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  archived BOOLEAN DEFAULT FALSE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, created_at DESC)
WHERE archived = FALSE;
```

### 7.2 Table `activity_logs`

```sql
-- ============================================================================
-- TABLE: activity_logs
-- Description: Journal d'audit complet
-- ============================================================================
CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id),
  user_id UUID NOT NULL REFERENCES users(id),

  -- Action
  action_type activity_action_type NOT NULL,
  entity_type activity_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  entity_name TEXT,

  -- Résultat
  status activity_status NOT NULL DEFAULT 'success',
  description TEXT,
  error_message TEXT,

  -- Détails
  metadata JSONB DEFAULT '{}',  -- old_values, new_values, etc.

  -- Contexte
  ip_address INET,
  user_agent TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_team_date ON activity_logs(team_id, created_at DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
```

### 7.3 Table `push_subscriptions`

```sql
-- ============================================================================
-- TABLE: push_subscriptions
-- Description: Abonnements notifications push (PWA)
-- ============================================================================
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,  -- { p256dh, auth }
  user_agent TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 8. Phase 3: Email System

### 8.1 Table `team_email_connections`

```sql
-- ============================================================================
-- TABLE: team_email_connections
-- Description: Configuration des connexions email IMAP/SMTP par équipe
-- ============================================================================
CREATE TABLE team_email_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Provider
  provider VARCHAR(50) NOT NULL,  -- 'gmail', 'outlook', 'ovh', 'custom'
  email_address VARCHAR(255) NOT NULL,

  -- IMAP
  imap_host VARCHAR(255) NOT NULL,
  imap_port INTEGER DEFAULT 993,
  imap_use_ssl BOOLEAN DEFAULT TRUE,
  imap_username VARCHAR(255) NOT NULL,
  imap_password_encrypted TEXT NOT NULL,

  -- SMTP
  smtp_host VARCHAR(255) NOT NULL,
  smtp_port INTEGER DEFAULT 587,
  smtp_use_tls BOOLEAN DEFAULT TRUE,
  smtp_username VARCHAR(255) NOT NULL,
  smtp_password_encrypted TEXT NOT NULL,

  -- Synchronisation
  last_uid BIGINT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,

  -- Statut
  is_active BOOLEAN DEFAULT TRUE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_team_email UNIQUE (team_id, email_address)
);
```

### 8.2 Table `emails`

```sql
-- ============================================================================
-- TABLE: emails
-- Description: Emails reçus et envoyés avec recherche full-text
-- ============================================================================
CREATE TABLE emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email_connection_id UUID REFERENCES team_email_connections(id),

  -- Direction
  direction email_direction NOT NULL DEFAULT 'received',
  status email_status NOT NULL DEFAULT 'unread',

  -- Headers
  message_id TEXT,
  in_reply_to UUID REFERENCES emails(id),
  references_header TEXT,

  -- Adresses
  from_address TEXT NOT NULL,
  to_addresses TEXT[] DEFAULT '{}',
  cc_addresses TEXT[] DEFAULT '{}',
  bcc_addresses TEXT[] DEFAULT '{}',

  -- Contenu
  subject TEXT,
  body_text TEXT,
  body_html TEXT,

  -- Liens optionnels
  building_id UUID REFERENCES buildings(id),
  lot_id UUID REFERENCES lots(id),
  intervention_id UUID REFERENCES interventions(id),

  -- Dates
  received_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,

  -- Recherche
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('french', COALESCE(subject, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(body_text, '')), 'B') ||
    setweight(to_tsvector('french', COALESCE(from_address, '')), 'C')
  ) STORED,

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_emails_search_vector ON emails USING GIN (search_vector);
CREATE INDEX idx_emails_team_status ON emails(team_id, status) WHERE deleted_at IS NULL;
```

### 8.3 Tables `email_attachments` et `email_blacklist`

```sql
-- email_attachments: Pièces jointes des emails
-- email_blacklist: Liste noire d'expéditeurs
-- (Schéma similaire à la documentation existante)
```

---

## 9. Phase 4: Contracts

### 9.1 Table `contracts`

```sql
-- ============================================================================
-- TABLE: contracts
-- Description: Baux et contrats de location
-- ============================================================================
CREATE TABLE contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  lot_id UUID NOT NULL REFERENCES lots(id) ON DELETE RESTRICT,

  -- Informations
  title TEXT,
  contract_type contract_type NOT NULL DEFAULT 'bail_habitation',
  status contract_status NOT NULL DEFAULT 'brouillon',

  -- Dates
  start_date DATE NOT NULL,
  duration_months INTEGER NOT NULL DEFAULT 12,
  end_date DATE GENERATED ALWAYS AS (start_date + (duration_months || ' months')::interval) STORED,
  signed_date DATE,

  -- Paiement
  payment_frequency payment_frequency NOT NULL DEFAULT 'mensuel',
  payment_frequency_value INTEGER DEFAULT 1,
  rent_amount DECIMAL(10,2) NOT NULL,
  charges_amount DECIMAL(10,2) DEFAULT 0,

  -- Garantie
  guarantee_type guarantee_type NOT NULL DEFAULT 'pas_de_garantie',
  guarantee_amount DECIMAL(10,2),
  guarantee_notes TEXT,

  -- Métadonnées
  comments TEXT,
  metadata JSONB DEFAULT '{}',

  -- Chaîne de renouvellement
  renewed_from_id UUID REFERENCES contracts(id),
  renewed_to_id UUID REFERENCES contracts(id),

  -- Créateur
  created_by UUID REFERENCES users(id),

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_duration CHECK (duration_months >= 0 AND duration_months <= 120),
  CONSTRAINT valid_payment_frequency CHECK (payment_frequency_value >= 1 AND payment_frequency_value <= 12)
);

CREATE INDEX idx_contracts_team ON contracts(team_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_lot ON contracts(lot_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_status ON contracts(team_id, status) WHERE deleted_at IS NULL;
```

### 9.2 Table `contract_contacts`

```sql
-- ============================================================================
-- TABLE: contract_contacts (MODIFIÉE)
-- Description: Contacts parties au contrat
-- ============================================================================
CREATE TABLE contract_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,  -- Changé!

  -- Rôle
  role contract_contact_role NOT NULL DEFAULT 'locataire',
  is_primary BOOLEAN DEFAULT FALSE,

  notes TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_contract_contact_role UNIQUE (contract_id, contact_id, role)
);
```

### 9.3 Table `contract_documents` ⚠️ **DEPRECATED**

> **DEPRECATED**: Cette table est remplacée par la table centralisée `documents` (section 2.2.3).
> Utilisez `documents` avec `entity_type = 'contract'`.

```sql
-- (DEPRECATED - Utiliser 'documents' avec entity_type = 'contract')
-- Migration: → documents (entity_type = 'contract')
```

---

## 10. Phase 4: Import System

### 10.1 Table `import_jobs`

```sql
-- ============================================================================
-- TABLE: import_jobs
-- Description: Suivi des imports Excel/CSV
-- ============================================================================
CREATE TABLE import_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),

  -- Type et statut
  entity_type import_entity_type NOT NULL DEFAULT 'mixed',
  status import_job_status NOT NULL DEFAULT 'pending',

  -- Fichier source
  filename VARCHAR(255) NOT NULL,

  -- Progression
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,

  -- Détails
  errors JSONB DEFAULT '[]',
  created_ids JSONB DEFAULT '{}',
  updated_ids JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Dates
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 11. RBAC & Permissions

### 11.1 Table `permissions`

```sql
-- ============================================================================
-- TABLE: permissions
-- Description: Définitions des permissions (table système)
-- ============================================================================
CREATE TABLE permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_admin_only BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_permissions_code ON permissions(code);
CREATE INDEX idx_permissions_category ON permissions(category);
```

### 11.2 Table `role_default_permissions`

```sql
-- ============================================================================
-- TABLE: role_default_permissions
-- Description: Permissions par défaut par rôle
-- ============================================================================
CREATE TABLE role_default_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,

  UNIQUE(role, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_default_permissions(role);
```

### 11.3 Seed Data: 28 Permissions

```sql
INSERT INTO permissions (code, name, description, category, sort_order, is_system) VALUES
-- ═══════════════════════════════════════════════════════════════════════════
-- PERMISSIONS ÉQUIPE (6) - Gestion de l'équipe et des membres
-- Séparation Gestionnaires vs Autres Membres pour contrôle d'escalade privilèges
-- ═══════════════════════════════════════════════════════════════════════════
('team.view', 'Voir l''équipe', 'Voir les paramètres', 'team', 1, true),
('team.manage', 'Gérer l''équipe', 'Modifier les paramètres', 'team', 2, false),
-- Gestionnaires (risque élevé - accès données sensibles)
('team.managers_invite', 'Inviter gestionnaires', 'Créer des comptes gestionnaire', 'team', 3, false),
('team.managers_manage', 'Gérer gestionnaires', 'Modifier permissions gestionnaires', 'team', 4, false),
-- Autres membres (risque modéré - prestataires, locataires, propriétaires)
('team.members_invite', 'Inviter membres', 'Inviter prestataires/locataires/propriétaires', 'team', 5, false),
('team.members_manage', 'Gérer membres', 'Modifier permissions autres membres', 'team', 6, false),

-- ═══════════════════════════════════════════════════════════════════════════
-- PERMISSIONS OPÉRATIONNELLES (17) - Gestion métier (biens, contacts, etc.)
-- ═══════════════════════════════════════════════════════════════════════════

-- Properties (4)
('properties.view', 'Voir les biens', 'Consulter immeubles/lots', 'properties', 10, true),
('properties.create', 'Créer des biens', 'Ajouter immeubles/lots', 'properties', 11, false),
('properties.manage', 'Gérer les biens', 'Modifier/supprimer', 'properties', 12, false),
('properties.documents', 'Gérer documents', 'Upload/supprimer docs', 'properties', 13, false),

-- Contracts (3)
('contracts.view', 'Voir les contrats', 'Consulter les baux', 'contracts', 20, true),
('contracts.create', 'Créer des contrats', 'Ajouter des baux', 'contracts', 21, false),
('contracts.manage', 'Gérer les contrats', 'Modifier/résilier', 'contracts', 22, false),

-- Interventions (4)
('interventions.view', 'Voir les interventions', 'Consulter la liste', 'interventions', 30, true),
('interventions.create', 'Créer des interventions', 'Créer des demandes', 'interventions', 31, false),
('interventions.manage', 'Gérer les interventions', 'Approuver/assigner', 'interventions', 32, false),
('interventions.close', 'Clôturer', 'Finaliser interventions', 'interventions', 33, false),

-- Contacts (3)
('contacts.view', 'Voir les contacts', 'Consulter la liste', 'contacts', 40, true),
('contacts.create', 'Créer des contacts', 'Ajouter contacts', 'contacts', 41, false),
('contacts.manage', 'Gérer les contacts', 'Modifier/supprimer', 'contacts', 42, false),

-- Reports (3)
('reports.view', 'Voir les rapports', 'Accès dashboard', 'reports', 50, true),
('reports.export', 'Exporter', 'Export CSV/Excel', 'reports', 51, false),
('reports.analytics', 'Analytics', 'Analytics avancés', 'reports', 52, false),

-- ═══════════════════════════════════════════════════════════════════════════
-- PERMISSIONS FACTURATION (5) - Séparées de l'opérationnel
-- Accès réservé : Admin système + Team Owner + assignation explicite
-- ═══════════════════════════════════════════════════════════════════════════
('billing.subscription_view', 'Voir l''abonnement', 'Consulter statut et plan actuel', 'billing', 60, false),
('billing.subscription_manage', 'Gérer l''abonnement', 'Modifier le plan, annuler', 'billing', 61, false),
('billing.invoices_view', 'Voir les factures', 'Consulter l''historique des factures', 'billing', 62, false),
('billing.invoices_download', 'Télécharger factures', 'Exporter les factures PDF', 'billing', 63, false),
('billing.payment_method', 'Gérer le paiement', 'Modifier carte bancaire ou IBAN', 'billing', 64, false);
```

### 11.3.1 Séparation Facturation / Opérationnel

```
┌─────────────────────────────────────────────────────────────────────────────┐
│               SÉPARATION AUTORISATIONS ADMIN                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────┐    ┌───────────────────────────────┐     │
│  │      🔧 OPÉRATIONNEL          │    │      💰 FACTURATION           │     │
│  │      (17 permissions)         │    │      (5 permissions)          │     │
│  ├───────────────────────────────┤    ├───────────────────────────────┤     │
│  │                               │    │                               │     │
│  │  📍 Biens (properties)        │    │  💳 Abonnement                │     │
│  │  • properties.view            │    │  • billing.subscription_view  │     │
│  │  • properties.create          │    │  • billing.subscription_manage│     │
│  │  • properties.manage          │    │                               │     │
│  │  • properties.documents       │    │  🧾 Factures                  │     │
│  │                               │    │  • billing.invoices_view      │     │
│  │  📋 Contrats (contracts)      │    │  • billing.invoices_download  │     │
│  │  • contracts.view             │    │                               │     │
│  │  • contracts.create           │    │  💳 Paiement                  │     │
│  │  • contracts.manage           │    │  • billing.payment_method     │     │
│  │                               │    │                               │     │
│  │  🔨 Interventions             │    └───────────────────────────────┘     │
│  │  • interventions.view         │                                          │
│  │  • interventions.create       │    ┌───────────────────────────────┐     │
│  │  • interventions.manage       │    │      ⚙️ ÉQUIPE (team)         │     │
│  │  • interventions.close        │    ├───────────────────────────────┤     │
│  │                               │    │  • team.view                  │     │
│  │  👥 Contacts (contacts)       │    │  • team.manage                │     │
│  │  • contacts.view              │    │  • team.members_invite        │     │
│  │  • contacts.create            │    │  • team.members_manage        │     │
│  │  • contacts.manage            │    └───────────────────────────────┘     │
│  │                               │                                          │
│  │  📊 Rapports (reports)        │                                          │
│  │  • reports.view               │                                          │
│  │  • reports.export             │                                          │
│  │  • reports.analytics          │                                          │
│  └───────────────────────────────┘                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Principe clé : Séparation des Responsabilités**

> 🔐 **Admin Facturation** peut gérer l'abonnement et voir les factures sans toucher aux données métier.
> 🔧 **Admin Opérationnel** peut gérer tous les biens/interventions sans accès aux informations de paiement.

Cette séparation permet :
- **Comptable** : accès uniquement à `billing.*` → gère factures sans voir les données immobilières
- **Gestionnaire standard** : accès `properties.*`, `contracts.*`, etc. → travaille sans voir les données de paiement
- **Team Owner** : accès TOTAL via flag `is_team_owner = TRUE` → bypass automatique

### 11.4 Matrice des Permissions par Rôle

> **Note :** Le **Team Owner** (`is_team_owner = TRUE`) a automatiquement accès à TOUTES les permissions (bypass complet). Voir section 11.5 pour les règles de résolution.

#### 11.4.1 Permissions Équipe (team.*)

> ⚠️ **Séparation Gestionnaires / Autres Membres** : Un gestionnaire standard peut inviter des prestataires/locataires mais NE PEUT PAS créer d'autres gestionnaires (protection contre l'escalade de privilèges).

| Permission | Admin Système | Team Owner | Gestionnaire | Prestataire | Locataire | Propriétaire |
|------------|:-------------:|:----------:|:------------:|:-----------:|:---------:|:------------:|
| team.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| team.manage | ✓ | ✓ | ✓ | - | - | - |
| **team.managers_invite** | ✓ | ✓ | **-** | - | - | - |
| **team.managers_manage** | ✓ | ✓ | **-** | - | - | - |
| team.members_invite | ✓ | ✓ | ✓ | - | - | - |
| team.members_manage | ✓ | ✓ | ✓ | - | - | - |

**Hiérarchie des risques :**
- `team.managers_*` : Risque **élevé** - Création de comptes avec accès aux données sensibles → Réservé Admin/Team Owner
- `team.members_*` : Risque **modéré** - Invitation terrain (prestataires, locataires, propriétaires) → Accessible aux gestionnaires

#### 11.4.2 Permissions Opérationnelles (métier)

| Permission | Admin Système | Team Owner | Gestionnaire | Prestataire | Locataire | Propriétaire |
|------------|:-------------:|:----------:|:------------:|:-----------:|:---------:|:------------:|
| properties.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| properties.create | ✓ | ✓ | ✓ | - | - | - |
| properties.manage | ✓ | ✓ | ✓ | - | - | - |
| properties.documents | ✓ | ✓ | ✓ | - | - | - |
| contracts.view | ✓ | ✓ | ✓ | - | ✓ | ✓ |
| contracts.create | ✓ | ✓ | ✓ | - | - | - |
| contracts.manage | ✓ | ✓ | ✓ | - | - | - |
| interventions.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| interventions.create | ✓ | ✓ | ✓ | - | ✓ | - |
| interventions.manage | ✓ | ✓ | ✓ | - | - | - |
| interventions.close | ✓ | ✓ | ✓ | - | - | - |
| contacts.view | ✓ | ✓ | ✓ | ✓ | - | ✓ |
| contacts.create | ✓ | ✓ | ✓ | - | - | - |
| contacts.manage | ✓ | ✓ | ✓ | - | - | - |
| reports.view | ✓ | ✓ | ✓ | - | - | ✓ |
| reports.export | ✓ | ✓ | ✓ | - | - | ✓ |
| reports.analytics | ✓ | ✓ | ✓ | - | - | - |

#### 11.4.3 Permissions Facturation (billing.*)

> ⚠️ **Séparées de l'opérationnel** : Un gestionnaire standard n'a PAS accès aux permissions billing par défaut.

| Permission | Admin Système | Team Owner | Gestionnaire | Prestataire | Locataire | Propriétaire |
|------------|:-------------:|:----------:|:------------:|:-----------:|:---------:|:------------:|
| billing.subscription_view | ✓ | ✓ | - | - | - | - |
| billing.subscription_manage | ✓ | ✓ | - | - | - | - |
| billing.invoices_view | ✓ | ✓ | - | - | - | - |
| billing.invoices_download | ✓ | ✓ | - | - | - | - |
| billing.payment_method | ✓ | ✓ | - | - | - | - |

**Attribution manuelle possible :**
Un gestionnaire peut recevoir des permissions billing explicitement via `team_members.permissions[]`.

### 11.5 Cas d'Usage : Exemples de Profils

#### Scénario 1 : Comptable de l'Équipe

```
Marie est comptable chez "Immo Paris"
───────────────────────────────────────
team_members.role = 'gestionnaire'
team_members.permissions = ['billing.*']

→ Accès complet à la facturation
→ Aucun accès aux biens/interventions/contacts (pas de fallback)
```

#### Scénario 2 : Gestionnaire Standard

```
Jean est gestionnaire chez "Immo Paris"
───────────────────────────────────────
team_members.role = 'gestionnaire'
team_members.permissions = NULL (défaut)

→ Fallback vers role_default_permissions pour 'gestionnaire'
→ Accès complet à l'opérationnel (properties, interventions, contacts, contracts)
→ PEUT inviter des prestataires, locataires, propriétaires (team.members_invite)
→ NE PEUT PAS créer d'autres gestionnaires (team.managers_invite = non accordée)
→ PAS d'accès à la facturation (billing.*)
```

#### Scénario 3 : Gestionnaire + Lecture Factures

```
Sophie est gestionnaire principale chez "Immo Paris"
───────────────────────────────────────
team_members.role = 'gestionnaire'
team_members.permissions = ['billing.invoices_view', 'billing.invoices_download']

→ Accès opérationnel complet (via role defaults car permissions[] ne contient pas properties.*)
→ Accès lecture factures (via custom permissions explicites)
→ PAS de modification d'abonnement
```

**⚠️ Note :** Quand `permissions[]` est défini (non NULL), il **REMPLACE** les defaults sauf si on merge explicitement.

#### Scénario 4 : Team Owner

```
Thomas a créé l'équipe "Immo Paris"
───────────────────────────────────────
team_members.is_team_owner = TRUE

→ has_permission(..., ANY) = TRUE
→ Accès TOTAL (opérationnel + facturation + équipe)
→ Bypass complet, aucune vérification de permissions nécessaire
```

#### Scénario 5 : Gestionnaire RH (Recrutement)

```
Lucie gère le recrutement chez "Immo Paris"
───────────────────────────────────────
team_members.role = 'gestionnaire'
team_members.permissions = ['team.managers_invite', 'team.managers_manage']

→ PEUT inviter des gestionnaires (assignation explicite team.managers_invite)
→ PEUT gérer les permissions des gestionnaires (team.managers_manage)
→ Accès opérationnel complet via role defaults (properties, interventions, etc.)
→ PEUT aussi inviter membres terrain via defaults (team.members_invite)
→ PAS d'accès à la facturation (billing.*)
```

**Cas d'usage :**
- L'entreprise a besoin d'une personne dédiée au recrutement de gestionnaires
- Le Team Owner délègue cette responsabilité sans donner l'accès complet
- Lucie peut embaucher sans avoir accès aux finances

---

## 12. Subscriptions & Billing (Stripe Integration)

Cette section définit l'architecture d'abonnement intégrée avec **Stripe** selon les bonnes pratiques officielles.

### 12.1 Architecture Stripe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ARCHITECTURE STRIPE SEIDO                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   STRIPE (Source de Vérité)              SUPABASE (Cache Local)             │
│   ─────────────────────────              ───────────────────────            │
│                                                                             │
│   ┌─────────────────┐    Webhooks    ┌─────────────────────────┐            │
│   │ Stripe Customer │───────────────▶│   stripe_customers      │            │
│   │ cus_xxx         │                │   (team_id ↔ cus_xxx)   │            │
│   └─────────────────┘                └─────────────────────────┘            │
│                                                                             │
│   ┌─────────────────┐    Webhooks    ┌─────────────────────────┐            │
│   │ Stripe Product  │───────────────▶│   stripe_products       │            │
│   │ prod_xxx        │                │   (id = prod_xxx)       │            │
│   └─────────────────┘                └─────────────────────────┘            │
│                                                                             │
│   ┌─────────────────┐    Webhooks    ┌─────────────────────────┐            │
│   │ Stripe Price    │───────────────▶│   stripe_prices         │            │
│   │ price_xxx       │                │   (id = price_xxx)      │            │
│   └─────────────────┘                └─────────────────────────┘            │
│                                                                             │
│   ┌─────────────────┐    Webhooks    ┌─────────────────────────┐            │
│   │ Stripe Sub      │───────────────▶│   subscriptions         │            │
│   │ sub_xxx         │                │   (id = sub_xxx)        │            │
│   └─────────────────┘                │   + billable_properties │            │
│                                      └─────────────────────────┘            │
│                                                                             │
│   ┌─────────────────┐    Webhooks    ┌─────────────────────────┐            │
│   │ Stripe Invoice  │───────────────▶│   stripe_invoices       │            │
│   │ in_xxx          │                │   (id = in_xxx)         │            │
│   └─────────────────┘                └─────────────────────────┘            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Principe clé :** Stripe est la **source de vérité**. Les tables locales sont synchronisées via webhooks pour éviter les appels API bloquants.

**Références :**
- [Stripe Subscriptions Overview](https://docs.stripe.com/billing/subscriptions/overview)
- [Stripe Webhook Best Practices](https://docs.stripe.com/billing/subscriptions/webhooks)
- [Vercel Next.js Subscription Payments](https://github.com/vercel/nextjs-subscription-payments)

### 12.2 Table `stripe_customers`

```sql
-- ============================================================================
-- TABLE: stripe_customers
-- Description: Mapping entre équipes SEIDO et clients Stripe
-- ============================================================================
CREATE TABLE stripe_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Références
  team_id UUID NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,  -- cus_xxx (ID Stripe)

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_stripe_customers_team ON stripe_customers(team_id);
CREATE INDEX idx_stripe_customers_stripe ON stripe_customers(stripe_customer_id);

-- RLS: Gestionnaires de l'équipe uniquement
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_customers_select" ON stripe_customers
  FOR SELECT USING (is_admin() OR is_team_manager(team_id));

CREATE POLICY "stripe_customers_all" ON stripe_customers
  FOR ALL USING (is_admin());
```

### 12.3 Table `stripe_products`

```sql
-- ============================================================================
-- TABLE: stripe_products
-- Description: Catalogue de produits synchronisé depuis Stripe Dashboard
-- ============================================================================
CREATE TABLE stripe_products (
  id TEXT PRIMARY KEY,  -- prod_xxx (ID Stripe comme PK)

  -- Informations produit
  active BOOLEAN DEFAULT TRUE,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Lecture publique (catalogue visible par tous les utilisateurs authentifiés)
ALTER TABLE stripe_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_products_public_read" ON stripe_products
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "stripe_products_admin_write" ON stripe_products
  FOR ALL USING (is_admin());

-- Realtime pour mise à jour catalogue
ALTER PUBLICATION supabase_realtime ADD TABLE stripe_products;
```

### 12.4 Table `stripe_prices`

```sql
-- ============================================================================
-- TABLE: stripe_prices
-- Description: Plans tarifaires synchronisés depuis Stripe Dashboard
-- ============================================================================
CREATE TYPE pricing_type AS ENUM ('one_time', 'recurring');
CREATE TYPE pricing_interval AS ENUM ('day', 'week', 'month', 'year');

CREATE TABLE stripe_prices (
  id TEXT PRIMARY KEY,  -- price_xxx (ID Stripe comme PK)

  -- Référence produit
  product_id TEXT NOT NULL REFERENCES stripe_products(id) ON DELETE CASCADE,

  -- Informations prix
  active BOOLEAN DEFAULT TRUE,
  description TEXT,
  unit_amount INTEGER,  -- En centimes (999 = 9.99€)
  currency TEXT DEFAULT 'eur',

  -- Type de facturation
  type pricing_type DEFAULT 'recurring',
  interval pricing_interval DEFAULT 'month',
  interval_count INTEGER DEFAULT 1,
  trial_period_days INTEGER,

  -- Métadonnées Stripe
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_stripe_prices_product ON stripe_prices(product_id);
CREATE INDEX idx_stripe_prices_active ON stripe_prices(active) WHERE active = TRUE;

-- RLS: Lecture publique
ALTER TABLE stripe_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_prices_public_read" ON stripe_prices
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "stripe_prices_admin_write" ON stripe_prices
  FOR ALL USING (is_admin());

-- Realtime pour mise à jour tarifs
ALTER PUBLICATION supabase_realtime ADD TABLE stripe_prices;
```

### 12.5 Table `subscriptions`

```sql
-- ============================================================================
-- TABLE: subscriptions
-- Description: Abonnements actifs synchronisés depuis Stripe
-- ============================================================================

-- Statuts Stripe officiels (8 statuts)
-- https://docs.stripe.com/api/subscriptions/object#subscription_object-status
CREATE TYPE subscription_status AS ENUM (
  'trialing',           -- Période d'essai active
  'active',             -- En règle, accès complet
  'incomplete',         -- Paiement initial en attente (23h max)
  'incomplete_expired', -- Paiement initial échoué
  'past_due',           -- Facture impayée, accès maintenu temporairement
  'unpaid',             -- Factures impayées multiples, accès suspendu
  'canceled',           -- Annulé définitivement (terminal)
  'paused'              -- Essai terminé sans moyen de paiement
);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,  -- sub_xxx (ID Stripe comme PK)

  -- Références
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  price_id TEXT REFERENCES stripe_prices(id),

  -- Statut
  status subscription_status NOT NULL DEFAULT 'trialing',

  -- Périodes (synchronisées depuis Stripe)
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,

  -- Annulation
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancel_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,

  -- SEIDO Spécifique: Compteur de biens facturables
  -- (buildings.count + lots.count WHERE building_id IS NULL)
  billable_properties INTEGER NOT NULL DEFAULT 0,

  -- Quantité (pour tarification par unité)
  quantity INTEGER DEFAULT 1,

  -- Métadonnées
  metadata JSONB DEFAULT '{}',

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes pour lookups fréquents
CREATE INDEX idx_subscriptions_team ON subscriptions(team_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_active ON subscriptions(team_id, status)
  WHERE status IN ('trialing', 'active', 'past_due');

-- RLS: Gestionnaires de l'équipe uniquement
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select" ON subscriptions
  FOR SELECT USING (is_admin() OR is_team_manager(team_id));

CREATE POLICY "subscriptions_all" ON subscriptions
  FOR ALL USING (is_admin());
```

### 12.6 Table `stripe_invoices`

```sql
-- ============================================================================
-- TABLE: stripe_invoices
-- Description: Historique des factures synchronisées depuis Stripe
-- ============================================================================

-- Statuts Stripe pour factures
-- https://docs.stripe.com/api/invoices/object#invoice_object-status
CREATE TYPE invoice_status AS ENUM (
  'draft',          -- Brouillon (modifiable)
  'open',           -- Ouverte (en attente de paiement)
  'paid',           -- Payée
  'uncollectible',  -- Irrécupérable
  'void'            -- Annulée
);

CREATE TABLE stripe_invoices (
  id TEXT PRIMARY KEY,  -- in_xxx (ID Stripe comme PK)

  -- Références
  subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  team_id UUID NOT NULL REFERENCES teams(id),
  stripe_customer_id TEXT NOT NULL,

  -- Montants (en centimes)
  amount_due INTEGER NOT NULL,
  amount_paid INTEGER DEFAULT 0,
  amount_remaining INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'eur',

  -- Statut
  status invoice_status NOT NULL DEFAULT 'draft',

  -- URLs Stripe (pour paiement/téléchargement)
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,

  -- Périodes
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Métadonnées SEIDO
  property_count INTEGER,  -- Nombre de biens facturés sur cette période

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_stripe_invoices_team ON stripe_invoices(team_id);
CREATE INDEX idx_stripe_invoices_subscription ON stripe_invoices(subscription_id);
CREATE INDEX idx_stripe_invoices_status ON stripe_invoices(status);
CREATE INDEX idx_stripe_invoices_date ON stripe_invoices(created_at DESC);

-- RLS: Gestionnaires de l'équipe uniquement
ALTER TABLE stripe_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stripe_invoices_select" ON stripe_invoices
  FOR SELECT USING (is_admin() OR is_team_manager(team_id));

CREATE POLICY "stripe_invoices_all" ON stripe_invoices
  FOR ALL USING (is_admin());
```

### 12.7 Trigger: Compteur de Biens (SEIDO Spécifique)

```sql
-- ============================================================================
-- TRIGGER: Maintenir billable_properties synchronisé
-- Description: Compte automatiquement buildings + lots standalone
-- ============================================================================
CREATE OR REPLACE FUNCTION update_subscription_property_count()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
  v_count INTEGER;
BEGIN
  -- Déterminer l'équipe concernée
  IF TG_OP = 'DELETE' THEN
    v_team_id := OLD.team_id;
  ELSE
    v_team_id := NEW.team_id;
  END IF;

  -- Compter les biens facturables:
  -- - Tous les buildings actifs
  -- - Tous les lots standalone (sans building_id) actifs
  SELECT
    COALESCE((SELECT COUNT(*) FROM buildings WHERE team_id = v_team_id AND deleted_at IS NULL), 0) +
    COALESCE((SELECT COUNT(*) FROM lots WHERE team_id = v_team_id AND building_id IS NULL AND deleted_at IS NULL), 0)
  INTO v_count;

  -- Mettre à jour l'abonnement de l'équipe
  UPDATE subscriptions
  SET billable_properties = v_count, updated_at = NOW()
  WHERE team_id = v_team_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger sur buildings
CREATE TRIGGER tr_buildings_subscription_count
AFTER INSERT OR UPDATE OF deleted_at OR DELETE ON buildings
FOR EACH ROW EXECUTE FUNCTION update_subscription_property_count();

-- Trigger sur lots (pour les lots standalone)
CREATE TRIGGER tr_lots_subscription_count
AFTER INSERT OR UPDATE OF building_id, deleted_at OR DELETE ON lots
FOR EACH ROW EXECUTE FUNCTION update_subscription_property_count();
```

### 12.8 Fonctions Helper RLS

```sql
-- ============================================================================
-- FONCTION: has_active_subscription
-- Description: Vérifie si l'équipe a un abonnement actif
-- Usage: WHERE has_active_subscription(team_id) dans les politiques RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION has_active_subscription(p_team_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE team_id = p_team_id
    AND status IN ('trialing', 'active', 'past_due')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- FONCTION: get_subscription_status
-- Description: Retourne le statut d'abonnement actuel de l'équipe
-- ============================================================================
CREATE OR REPLACE FUNCTION get_subscription_status(p_team_id UUID)
RETURNS subscription_status AS $$
  SELECT status FROM subscriptions
  WHERE team_id = p_team_id
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- FONCTION: is_subscription_valid
-- Description: Vérifie si l'abonnement permet l'accès aux fonctionnalités
-- Retourne TRUE pour: trialing, active, past_due (grace period)
-- ============================================================================
CREATE OR REPLACE FUNCTION is_subscription_valid(p_team_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status subscription_status;
BEGIN
  SELECT status INTO v_status
  FROM subscriptions
  WHERE team_id = p_team_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Statuts permettant l'accès
  RETURN v_status IN ('trialing', 'active', 'past_due');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### 12.9 Webhooks Stripe

#### Événements à Écouter

| Événement | Action | Table(s) Impactée(s) |
|-----------|--------|----------------------|
| `product.created` | INSERT | `stripe_products` |
| `product.updated` | UPDATE | `stripe_products` |
| `product.deleted` | UPDATE (active=false) | `stripe_products` |
| `price.created` | INSERT | `stripe_prices` |
| `price.updated` | UPDATE | `stripe_prices` |
| `price.deleted` | UPDATE (active=false) | `stripe_prices` |
| `customer.created` | INSERT | `stripe_customers` |
| `customer.subscription.created` | INSERT | `subscriptions` |
| `customer.subscription.updated` | UPDATE | `subscriptions` |
| `customer.subscription.deleted` | UPDATE (status=canceled) | `subscriptions` |
| `invoice.created` | INSERT | `stripe_invoices` |
| `invoice.finalized` | UPDATE | `stripe_invoices` |
| `invoice.paid` | UPDATE (status=paid) | `stripe_invoices` |
| `invoice.payment_failed` | Notification | `notifications` |
| `checkout.session.completed` | UPDATE (status=active) | `subscriptions` |

#### Endpoint Webhook

```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: Request) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  // Handle events...
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionChange(event.data.object as Stripe.Subscription)
      break
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice)
      break
    // ... autres événements
  }

  return new Response('OK', { status: 200 })
}
```

### 12.10 Flux Utilisateur

#### Inscription d'une Nouvelle Équipe

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     FLUX: INSCRIPTION ÉQUIPE                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User s'inscrit                                                       │
│     └─▶ INSERT auth.users                                                │
│     └─▶ INSERT users                                                     │
│     └─▶ INSERT teams                                                     │
│     └─▶ INSERT team_members (is_team_owner = TRUE)                       │
│                                                                          │
│  2. API crée client Stripe                                               │
│     └─▶ stripe.customers.create({ email, metadata: { team_id } })        │
│     └─▶ INSERT stripe_customers                                          │
│                                                                          │
│  3. Abonnement trial créé automatiquement                                │
│     └─▶ INSERT subscriptions (status = 'trialing')                       │
│     └─▶ trial_end = NOW() + 14 jours                                     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Passage au Payant (Checkout)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     FLUX: PASSAGE AU PAYANT                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User clique "S'abonner"                                              │
│     └─▶ API crée Stripe Checkout Session                                 │
│     └─▶ Redirection vers Stripe Checkout                                 │
│                                                                          │
│  2. Paiement réussi                                                      │
│     └─▶ Webhook: checkout.session.completed                              │
│     └─▶ UPDATE subscriptions SET status = 'active'                       │
│                                                                          │
│  3. Facture générée                                                      │
│     └─▶ Webhook: invoice.paid                                            │
│     └─▶ INSERT stripe_invoices (status = 'paid')                         │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Ajout/Suppression de Biens

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     FLUX: MODIFICATION BIENS                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Gestionnaire ajoute un immeuble                                      │
│     └─▶ INSERT buildings                                                 │
│     └─▶ Trigger: tr_buildings_subscription_count                         │
│     └─▶ UPDATE subscriptions SET billable_properties = N                 │
│                                                                          │
│  2. Prochaine facturation                                                │
│     └─▶ Stripe facture: quantity = billable_properties                   │
│     └─▶ Montant = price_per_property × billable_properties               │
│                                                                          │
│  Note: Le changement de quantité peut être:                              │
│  - Immédiat (proration) via subscription.update({ quantity })            │
│  - Au prochain cycle via metadata sync                                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Annulation d'Abonnement

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     FLUX: ANNULATION                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User annule via Stripe Customer Portal                               │
│     └─▶ Webhook: customer.subscription.updated                           │
│     └─▶ UPDATE subscriptions SET cancel_at_period_end = TRUE             │
│                                                                          │
│  2. Fin de période                                                       │
│     └─▶ Webhook: customer.subscription.deleted                           │
│     └─▶ UPDATE subscriptions SET                                         │
│            status = 'canceled',                                          │
│            ended_at = NOW()                                              │
│                                                                          │
│  3. Accès révoqué                                                        │
│     └─▶ has_active_subscription(team_id) = FALSE                         │
│     └─▶ UI affiche "Abonnement expiré"                                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Enums PostgreSQL

### 13.1 Liste Complète des Enums (37)

| Enum | Valeurs | Table(s) |
|------|---------|----------|
| `user_role` | admin, gestionnaire, locataire, prestataire, proprietaire | users |
| `team_member_role` | admin, gestionnaire, locataire, prestataire, proprietaire | team_members |
| `contact_type` | person, company | contacts |
| `contact_category` | locataire, proprietaire, prestataire, syndic, assurance, notaire, banque, administration, autre | contacts |
| `invitation_status` | pending, accepted, expired, cancelled | user_invitations |
| `country` | belgique, france, allemagne, pays-bas, suisse, luxembourg, autre | buildings, lots |
| `lot_category` | appartement, collocation, maison, garage, local_commercial, parking, autre | lots |
| `property_document_type` | ⚠️ **DEPRECATED** - bail, garantie, facture, diagnostic, photo_compteur, plan, reglement_copropriete, etat_des_lieux, certificat, manuel_utilisation, photo_generale, autre | ~~property_documents~~ → documents |
| `document_entity_type` | **NEW** - building, lot, intervention, contract, contact, company | documents |
| `document_type` | **NEW UNIFIED** - bail, avenant, etat_des_lieux_entree, etat_des_lieux_sortie, reglement_copropriete, facture, devis, quittance, bon_de_commande, diagnostic, plan, certificat, garantie, manuel_utilisation, rapport, justificatif_identite, justificatif_revenus, attestation_assurance, caution_bancaire, photo_avant, photo_apres, photo_compteur, photo_generale, autre | documents |
| `document_visibility_level` | **EXTENDED** - prive, equipe, locataire, prestataire, public | documents |
| `intervention_type` | plomberie, electricite, chauffage, serrurerie, peinture, menage, jardinage, climatisation, vitrerie, toiture, autre | interventions |
| `intervention_urgency` | basse, normale, haute, urgente | interventions |
| `intervention_status` | demande, rejetee, approuvee, demande_de_devis, planification, planifiee, en_cours, cloturee_par_prestataire, cloturee_par_locataire, cloturee_par_gestionnaire, annulee | interventions |
| `assignment_role` | gestionnaire, prestataire | intervention_assignments |
| `time_slot_status` | pending, selected, rejected, cancelled | intervention_time_slots |
| `quote_status` | draft, sent, accepted, rejected, cancelled, expired | intervention_quotes |
| `conversation_thread_type` | group, tenant_to_managers, provider_to_managers | conversation_threads |
| `notification_type` | intervention, chat, document, system, team_invite, assignment, status_change, reminder, deadline | notifications |
| `notification_priority` | low, normal, high, urgent | notifications |
| `activity_action_type` | create, update, delete, view, assign, unassign, approve, reject, upload, download, share, comment, status_change, send_notification, login, logout | activity_logs |
| `activity_entity_type` | user, team, building, lot, intervention, document, contact, notification, message, quote, report, contract | activity_logs |
| `activity_status` | success, failure, pending | activity_logs |
| `email_direction` | received, sent | emails |
| `email_status` | unread, read, archived, deleted | emails |
| `contract_type` | bail_habitation, bail_meuble | contracts |
| `contract_status` | brouillon, actif, expire, resilie, renouvele | contracts |
| `guarantee_type` | pas_de_garantie, compte_proprietaire, compte_bloque, e_depot, autre | contracts |
| `payment_frequency` | mensuel, trimestriel, semestriel, annuel | contracts |
| `contract_contact_role` | locataire, colocataire, garant, representant_legal, autre | contract_contacts |
| `contract_document_type` | ⚠️ **DEPRECATED** - bail, avenant, etat_des_lieux_entree, etat_des_lieux_sortie, attestation_assurance, justificatif_identite, justificatif_revenus, caution_bancaire, quittance, reglement_copropriete, diagnostic, autre | ~~contract_documents~~ → documents |
| `import_job_status` | pending, validating, importing, completed, failed, cancelled | import_jobs |
| `import_entity_type` | building, lot, contact, contract, mixed | import_jobs |
| `subscription_status` | trialing, active, incomplete, incomplete_expired, past_due, unpaid, canceled, paused | subscriptions |
| `pricing_type` | one_time, recurring | stripe_prices |
| `pricing_interval` | day, week, month, year | stripe_prices |
| `invoice_status` | draft, open, paid, uncollectible, void | stripe_invoices |

---

## 14. Fonctions RLS

### 14.1 Fonctions Identité

```sql
-- Retourne l'ID du profil utilisateur connecté
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT id FROM users WHERE auth_user_id = auth.uid(); $$;

-- Retourne le rôle de l'utilisateur
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM users WHERE auth_user_id = auth.uid(); $$;

-- Vérifie si admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'admin'); $$;

-- Vérifie si gestionnaire
CREATE OR REPLACE FUNCTION is_gestionnaire()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role IN ('admin', 'gestionnaire')); $$;
```

### 14.2 Fonctions Équipe

```sql
-- Retourne toutes les équipes de l'utilisateur
CREATE OR REPLACE FUNCTION get_user_teams_v2()
RETURNS TABLE(team_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT tm.team_id
  FROM team_members tm
  INNER JOIN users u ON tm.user_id = u.id
  WHERE u.auth_user_id = auth.uid() AND tm.left_at IS NULL;
$$;

-- Vérifie l'appartenance à une équipe
CREATE OR REPLACE FUNCTION user_belongs_to_team_v2(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM get_user_teams_v2() WHERE team_id = p_team_id); $$;

-- Vérifie si gestionnaire de l'équipe
CREATE OR REPLACE FUNCTION is_team_manager(p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members tm
    INNER JOIN users u ON tm.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND tm.team_id = p_team_id
      AND tm.role IN ('admin', 'gestionnaire')
      AND tm.left_at IS NULL
  );
$$;
```

### 14.3 Fonctions Permissions (NOUVEAU)

```sql
-- Vérifie une permission spécifique dans une équipe
CREATE OR REPLACE FUNCTION has_permission(p_team_id UUID, p_permission_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role user_role;
  v_member_permissions TEXT[];
  v_is_team_owner BOOLEAN;
BEGIN
  SELECT id, role INTO v_user_id, v_user_role
  FROM users WHERE auth_user_id = auth.uid();

  IF v_user_id IS NULL THEN RETURN FALSE; END IF;
  IF v_user_role = 'admin' THEN RETURN TRUE; END IF;

  SELECT permissions, is_team_owner INTO v_member_permissions, v_is_team_owner
  FROM team_members
  WHERE user_id = v_user_id AND team_id = p_team_id AND left_at IS NULL;

  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF v_is_team_owner = TRUE THEN RETURN TRUE; END IF;

  IF v_member_permissions IS NOT NULL THEN
    RETURN p_permission_code = ANY(v_member_permissions);
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM role_default_permissions rdp
    INNER JOIN permissions p ON rdp.permission_id = p.id
    WHERE rdp.role = v_user_role AND p.code = p_permission_code
  );
END;
$$;

-- Retourne toutes les permissions de l'utilisateur dans une équipe
CREATE OR REPLACE FUNCTION get_user_permissions(p_team_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role user_role;
  v_member_permissions TEXT[];
  v_is_team_owner BOOLEAN;
BEGIN
  SELECT id, role INTO v_user_id, v_user_role
  FROM users WHERE auth_user_id = auth.uid();

  IF v_user_id IS NULL THEN RETURN ARRAY[]::TEXT[]; END IF;
  IF v_user_role = 'admin' THEN
    RETURN (SELECT array_agg(code ORDER BY sort_order) FROM permissions);
  END IF;

  SELECT permissions, is_team_owner INTO v_member_permissions, v_is_team_owner
  FROM team_members
  WHERE user_id = v_user_id AND team_id = p_team_id AND left_at IS NULL;

  IF NOT FOUND THEN RETURN ARRAY[]::TEXT[]; END IF;
  IF v_is_team_owner THEN
    RETURN (SELECT array_agg(code ORDER BY sort_order) FROM permissions);
  END IF;

  IF v_member_permissions IS NOT NULL THEN RETURN v_member_permissions; END IF;

  RETURN (
    SELECT array_agg(p.code ORDER BY p.sort_order)
    FROM role_default_permissions rdp
    INNER JOIN permissions p ON rdp.permission_id = p.id
    WHERE rdp.role = v_user_role
  );
END;
$$;
```

### 14.4 Fonctions Propriétés et Contacts

```sql
-- Récupère le team_id d'un immeuble
CREATE OR REPLACE FUNCTION get_building_team_id(p_building_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT team_id FROM buildings WHERE id = p_building_id; $$;

-- Récupère le team_id d'un lot
CREATE OR REPLACE FUNCTION get_lot_team_id(p_lot_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(l.team_id, b.team_id)
  FROM lots l
  LEFT JOIN buildings b ON l.building_id = b.id
  WHERE l.id = p_lot_id;
$$;

-- Vérifie si l'utilisateur est locataire d'un lot (via contacts + contracts)
CREATE OR REPLACE FUNCTION is_tenant_of_lot(p_lot_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM contracts c
    INNER JOIN contract_contacts cc ON cc.contract_id = c.id
    INNER JOIN contacts co ON cc.contact_id = co.id
    WHERE c.lot_id = p_lot_id
      AND c.status IN ('actif', 'brouillon')
      AND c.deleted_at IS NULL
      AND cc.role IN ('locataire', 'colocataire')
      AND co.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );
$$;

-- Vérifie si propriétaire d'un lot
CREATE OR REPLACE FUNCTION is_proprietaire_of_lot(p_lot_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lot_contacts lc
    INNER JOIN contacts c ON lc.contact_id = c.id
    WHERE lc.lot_id = p_lot_id
      AND (c.category = 'proprietaire' OR lc.role = 'proprietaire')
      AND c.user_id = (SELECT id FROM users WHERE auth_user_id = auth.uid())
  );
$$;
```

---

## 15. Indexes de Performance

### 15.1 Indexes Critiques pour RLS

```sql
-- Team members (utilisé dans TOUTES les vérifications RLS)
CREATE INDEX idx_team_members_rls_covering
ON team_members(user_id, team_id, role)
INCLUDE (permissions, is_team_owner)
WHERE left_at IS NULL;

-- Contacts avec user_id (pour vérifier si contact a accès app)
CREATE INDEX idx_contacts_user_id ON contacts(user_id)
WHERE user_id IS NOT NULL AND deleted_at IS NULL;

-- Interventions pour liste dashboard
CREATE INDEX idx_interventions_dashboard
ON interventions(team_id, status, created_at DESC)
WHERE deleted_at IS NULL;
```

### 15.2 Indexes Full-Text Search

```sql
-- Recherche contacts
CREATE INDEX idx_contacts_search ON contacts USING GIN (
  to_tsvector('french', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(company_name, '') || ' ' || COALESCE(email, ''))
) WHERE deleted_at IS NULL;

-- Recherche immeubles (nom uniquement, adresse via JOIN addresses)
CREATE INDEX idx_buildings_search ON buildings USING GIN (
  to_tsvector('french', name)
) WHERE deleted_at IS NULL;
-- Note: Pour recherche full-text incluant l'adresse, utiliser JOIN avec addresses

-- Recherche emails
CREATE INDEX idx_emails_search ON emails USING GIN (search_vector);
```

---

## 16. Types TypeScript

### 16.1 Types Contacts

```typescript
// lib/types/contacts.ts

export type ContactType = 'person' | 'company';

export type ContactCategory =
  | 'locataire'
  | 'proprietaire'
  | 'prestataire'
  | 'syndic'
  | 'assurance'
  | 'notaire'
  | 'banque'
  | 'administration'
  | 'autre';

export interface Contact {
  id: string;
  team_id: string;
  contact_type: ContactType;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  phone: string | null;
  mobile_phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  company_name: string | null;
  vat_number: string | null;
  registration_number: string | null;
  company_id: string | null;
  category: ContactCategory;
  speciality: string | null;
  provider_rating: number;
  total_interventions: number;
  user_id: string | null;  // Lien vers user si invité
  notes: string | null;
  is_active: boolean;
  source: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ContactWithUser extends Contact {
  user: User | null;
  company: Company | null;
}
```

### 16.2 Types Permissions

```typescript
// lib/types/permissions.ts

export type PermissionCode =
  | 'team.view' | 'team.manage' | 'team.members_invite' | 'team.members_manage' | 'team.billing'
  | 'properties.view' | 'properties.create' | 'properties.manage' | 'properties.documents'
  | 'contracts.view' | 'contracts.create' | 'contracts.manage'
  | 'interventions.view' | 'interventions.create' | 'interventions.manage' | 'interventions.close'
  | 'contacts.view' | 'contacts.create' | 'contacts.manage'
  | 'reports.view' | 'reports.export' | 'reports.analytics';

export type PermissionCategory = 'team' | 'properties' | 'contracts' | 'interventions' | 'contacts' | 'reports';

export interface Permission {
  id: string;
  code: PermissionCode;
  name: string;
  description: string | null;
  category: PermissionCategory;
  sort_order: number;
  is_admin_only: boolean;
  is_system: boolean;
}

export interface TeamMemberWithPermissions {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamMemberRole;
  permissions: PermissionCode[] | null;
  is_team_owner: boolean;
  joined_at: string;
  left_at: string | null;
}
```

### 16.3 Types Subscriptions

```typescript
// lib/types/subscriptions.ts

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';
export type BillingPeriod = 'monthly' | 'yearly';
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'failed' | 'voided';

export interface Subscription {
  id: string;
  team_id: string;
  status: SubscriptionStatus;
  billing_period: BillingPeriod;
  price_per_property: number;
  yearly_discount_percent: number;
  currency: string;
  billable_properties: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_start_date: string | null;
  trial_end_date: string | null;
  current_period_start: string;
  current_period_end: string;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionInvoice {
  id: string;
  subscription_id: string;
  team_id: string;
  invoice_number: string;
  status: InvoiceStatus;
  property_count: number;
  unit_price: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  billing_period: BillingPeriod;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## 17. Stratégie de Migration

### 17.1 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PLAN DE MIGRATION (4 PHASES)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Phase 1: Préparation (Non-Breaking)                                │
│  ─────────────────────────────────────                              │
│  → Créer table contacts (vide)                                      │
│  → Créer tables permissions, role_default_permissions               │
│  → Créer tables subscriptions, subscription_invoices                │
│  → Ajouter colonnes à team_members (permissions, is_team_owner)     │
│  → Créer nouvelles fonctions RLS                                    │
│                                                                     │
│  Phase 2: Migration Données                                         │
│  ──────────────────────────────                                     │
│  → Copier users → contacts (tous les users existants)               │
│  → Lier contacts.user_id pour les users avec auth_user_id           │
│  → Migrer FKs des junction tables (user_id → contact_id)            │
│  → Seed permissions par défaut                                      │
│  → Créer subscriptions pour équipes existantes                      │
│  → Marquer team owners                                              │
│                                                                     │
│  Phase 3: Mise à Jour Application                                   │
│  ────────────────────────────────                                   │
│  → Mettre à jour repositories (contact.repository.ts)               │
│  → Mettre à jour services (contact-invitation.service.ts)           │
│  → Mettre à jour API routes                                         │
│  → Mettre à jour composants UI                                      │
│                                                                     │
│  Phase 4: Nettoyage                                                 │
│  ─────────────────                                                  │
│  → Supprimer colonnes obsolètes de users                            │
│  → Supprimer anciennes politiques RLS                               │
│  → Mettre à jour documentation                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 17.2 Scripts de Migration

#### Phase 1: Créer les nouvelles structures

```sql
-- Migration: 20251229000001_create_contacts_table.sql

-- 1. Créer enums
CREATE TYPE contact_type AS ENUM ('person', 'company');
CREATE TYPE contact_category AS ENUM ('locataire', 'proprietaire', 'prestataire', 'syndic', 'assurance', 'notaire', 'banque', 'administration', 'autre');

-- 2. Créer table contacts
CREATE TABLE contacts (...);  -- Voir section 2.3

-- 3. Créer tables RBAC
CREATE TABLE permissions (...);
CREATE TABLE role_default_permissions (...);

-- 4. Créer tables Stripe billing
CREATE TABLE stripe_customers (...);
CREATE TABLE stripe_products (...);
CREATE TABLE stripe_prices (...);
CREATE TABLE subscriptions (...);
CREATE TABLE stripe_invoices (...);

-- 5. Modifier team_members
ALTER TABLE team_members
ADD COLUMN permissions TEXT[] DEFAULT NULL,
ADD COLUMN is_team_owner BOOLEAN DEFAULT FALSE;
```

#### Phase 2: Migrer les données

```sql
-- Migration: 20251229000002_migrate_users_to_contacts.sql

-- 1. Copier tous les users vers contacts
INSERT INTO contacts (
  id, team_id, contact_type, email, first_name, last_name, phone,
  category, speciality, provider_rating, total_interventions,
  user_id, notes, is_active, created_at, updated_at, deleted_at
)
SELECT
  gen_random_uuid(),  -- Nouvel ID
  team_id,
  'person',
  email,
  COALESCE(first_name, split_part(name, ' ', 1)),
  COALESCE(last_name, substring(name from position(' ' in name) + 1)),
  phone,
  role::text::contact_category,  -- Mapper le rôle vers category
  speciality,
  provider_rating,
  total_interventions,
  CASE WHEN auth_user_id IS NOT NULL THEN id ELSE NULL END,  -- Lier si authentifié
  notes,
  is_active,
  created_at,
  updated_at,
  deleted_at
FROM users
WHERE deleted_at IS NULL;

-- 2. Créer mapping temporaire (old_user_id → new_contact_id)
CREATE TEMP TABLE user_contact_mapping AS
SELECT u.id as user_id, c.id as contact_id
FROM users u
INNER JOIN contacts c ON c.email = u.email AND c.team_id = u.team_id;

-- 3. Migrer les FKs des junction tables
-- building_contacts
ALTER TABLE building_contacts ADD COLUMN contact_id_new UUID;
UPDATE building_contacts bc
SET contact_id_new = ucm.contact_id
FROM user_contact_mapping ucm
WHERE bc.user_id = ucm.user_id;
ALTER TABLE building_contacts DROP COLUMN user_id;
ALTER TABLE building_contacts RENAME COLUMN contact_id_new TO contact_id;

-- (Répéter pour lot_contacts, contract_contacts, company_members)

-- 4. Seed permissions
INSERT INTO permissions (code, name, ...) VALUES ...;
INSERT INTO role_default_permissions (role, permission_id) ...;

-- 5. Créer subscriptions pour équipes existantes
INSERT INTO subscriptions (team_id, status, current_period_end, ...)
SELECT id, 'trialing', CURRENT_DATE + INTERVAL '30 days', ...
FROM teams WHERE deleted_at IS NULL;

-- 6. Marquer les team owners
UPDATE team_members tm
SET is_team_owner = TRUE
FROM teams t
WHERE tm.team_id = t.id
  AND tm.user_id = t.created_by
  AND tm.left_at IS NULL;
```

### 17.3 Checklist d'Implémentation

- [ ] **Phase 1: Tables & Enums**
  - [ ] Créer enums contact_type, contact_category
  - [ ] Créer table contacts
  - [ ] Créer table permissions + seed data
  - [ ] Créer table role_default_permissions + seed data
  - [ ] Créer table subscriptions
  - [ ] Créer table subscription_invoices
  - [ ] Modifier team_members (permissions, is_team_owner)
  - [ ] Créer nouvelles fonctions RLS

- [ ] **Phase 2: Migration Données**
  - [ ] Migrer users → contacts
  - [ ] Mettre à jour FKs (building_contacts, lot_contacts, etc.)
  - [ ] Marquer team owners
  - [ ] Créer subscriptions pour équipes existantes

- [ ] **Phase 3: Application**
  - [ ] Mettre à jour contact.repository.ts
  - [ ] Mettre à jour contact-invitation.service.ts
  - [ ] Mettre à jour invite-user/route.ts
  - [ ] Créer usePermissions hook
  - [ ] Mettre à jour composants UI

- [ ] **Phase 4: Nettoyage**
  - [ ] Supprimer colonnes obsolètes de users
  - [ ] Mettre à jour politiques RLS
  - [ ] Régénérer types TypeScript

---

## 18. Références

### Standards Appliqués

| Standard | Application |
|----------|-------------|
| **OWASP Authorization Cheat Sheet** | Principe du moindre privilège, RBAC |
| **Supabase RLS Best Practices** | SECURITY DEFINER, fonctions STABLE |
| **NIST RBAC Model** | Rôles, permissions, assignations |
| **Multi-Tenant SaaS Patterns** | Isolation par team_id |
| **CRM Best Practices** | Séparation contacts/users (HubSpot, Salesforce) |

### Liens Documentation

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [NIST RBAC Model](https://csrc.nist.gov/projects/role-based-access-control)
- [Stripe Billing](https://stripe.com/docs/billing)

---

**Document créé le** : 2025-12-29
**Dernière mise à jour** : 2025-12-29
**Version** : 2.0.0
**Statut** : Architecture Complète - En attente d'implémentation
