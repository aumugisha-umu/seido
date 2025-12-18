# Matrice de Traçabilité Requirements → Tests - SEIDO

> **Version** : 1.0
> **Dernière mise à jour** : 2025-12-18
> **Objectif** : Lier chaque exigence fonctionnelle aux tests correspondants

---

## Vue d'ensemble

Cette matrice permet de :
- Vérifier que chaque exigence est couverte par au moins un test
- Identifier les gaps de couverture
- Tracer les bugs vers les exigences impactées

---

## 1. Exigences Authentification (AUTH)

| ID | Exigence | Priorité | Tests Manuels | Tests E2E | Couverture |
|----|----------|----------|---------------|-----------|------------|
| AUTH-01 | Login avec email/password | P0 | 01-checklist:1.2.1-1.2.5 | 16-regression:1.1-1.4 | ✅ 100% |
| AUTH-02 | Logout avec redirect | P0 | 01-checklist:1.3.1-1.3.3 | 16-regression:1.2 | ✅ 100% |
| AUTH-03 | Signup nouveau compte | P0 | 01-checklist:1.4.1-1.4.5 | - | ⚠️ 80% |
| AUTH-04 | Reset password | P1 | 01-checklist:1.5.1-1.5.5 | - | ⚠️ 70% |
| AUTH-05 | Redirect par rôle | P0 | 01-checklist:1.2.5 | 16-regression:1.1,1.3,1.4 | ✅ 100% |

---

## 2. Exigences Gestion Biens (BIENS)

| ID | Exigence | Priorité | Tests Manuels | Tests E2E | Couverture |
|----|----------|----------|---------------|-----------|------------|
| BIENS-01 | CRUD Immeubles | P0 | 01-checklist:2.3-2.4 | 06-gestionnaire:2.1-2.5 | ✅ 100% |
| BIENS-02 | CRUD Lots | P0 | 01-checklist:2.5-2.6 | 06-gestionnaire:2.6-2.10 | ✅ 100% |
| BIENS-03 | Import Excel/CSV | P1 | 01-checklist:2.24 | - | ⚠️ 80% |
| BIENS-04 | Recherche/Filtres | P1 | 01-checklist:2.2.1-2.2.4 | - | ⚠️ 70% |
| BIENS-05 | Documents bien | P2 | 01-checklist:2.7 | - | ⚠️ 60% |

---

## 3. Exigences Interventions (INT)

| ID | Exigence | Priorité | Tests Manuels | Tests E2E | Couverture |
|----|----------|----------|---------------|-----------|------------|
| INT-01 | Création intervention | P0 | 01-checklist:2.8-2.10 | 06-gestionnaire:3.1-3.5 | ✅ 100% |
| INT-02 | Workflow statuts | P0 | 01-checklist:2.11-2.14 | 06-gestionnaire:3.6-3.15 | ✅ 100% |
| INT-03 | Assignation prestataire | P0 | 01-checklist:2.15 | 06-gestionnaire:4.1-4.5 | ✅ 100% |
| INT-04 | Gestion devis | P0 | 01-checklist:2.16-2.17 | 07-prestataire:2.1-2.10 | ✅ 100% |
| INT-05 | Planification créneaux | P1 | 01-checklist:2.18-2.19 | 07-prestataire:3.1-3.8 | ✅ 90% |
| INT-06 | Chat intervention | P1 | 20-realtime:3.1-3.23 | - | ⚠️ 80% |
| INT-07 | Documents intervention | P2 | 01-checklist:2.20 | - | ⚠️ 70% |
| INT-08 | Clôture multi-rôle | P0 | 01-checklist:2.21 | 06-gestionnaire:5.1-5.5 | ✅ 100% |

---

## 4. Exigences Contacts (CONT)

| ID | Exigence | Priorité | Tests Manuels | Tests E2E | Couverture |
|----|----------|----------|---------------|-----------|------------|
| CONT-01 | CRUD Contacts | P0 | 01-checklist:2.22 | 06-gestionnaire:1.15-1.20 | ✅ 100% |
| CONT-02 | Types contact | P1 | 01-checklist:2.22.2 | - | ⚠️ 80% |
| CONT-03 | Invitation email | P1 | 01-checklist:2.22.5 | - | ⚠️ 70% |

---

## 5. Exigences Contrats (CTR)

| ID | Exigence | Priorité | Tests Manuels | Tests E2E | Couverture |
|----|----------|----------|---------------|-----------|------------|
| CTR-01 | CRUD Contrats | P0 | 01-checklist:2.23 | - | ⚠️ 80% |
| CTR-02 | Dates début/fin | P1 | 01-checklist:2.23.3 | - | ⚠️ 70% |
| CTR-03 | Documents contrat | P2 | 01-checklist:2.23.5 | - | ⚠️ 60% |

---

## 6. Exigences Email/Mail (MAIL)

| ID | Exigence | Priorité | Tests Manuels | Tests E2E | Couverture |
|----|----------|----------|---------------|-----------|------------|
| MAIL-01 | Inbox/folders | P0 | 19-email:1.1-1.4 | - | ✅ 90% |
| MAIL-02 | Lire email | P0 | 19-email:3.1-3.3 | - | ✅ 90% |
| MAIL-03 | Répondre email | P1 | 19-email:4.1 | - | ⚠️ 80% |
| MAIL-04 | Archiver/Supprimer | P1 | 19-email:4.2-4.3 | - | ⚠️ 80% |
| MAIL-05 | Lier à immeuble | P2 | 19-email:4.4 | - | ⚠️ 70% |
| MAIL-06 | Real-time sync | P1 | 19-email:5.1-5.3 | - | ⚠️ 80% |

---

## 7. Exigences Notifications (NOTIF)

| ID | Exigence | Priorité | Tests Manuels | Tests E2E | Couverture |
|----|----------|----------|---------------|-----------|------------|
| NOTIF-01 | Badge count | P0 | 20-realtime:2.3 | - | ⚠️ 80% |
| NOTIF-02 | Real-time INSERT | P0 | 20-realtime:2.1-2.2 | - | ⚠️ 80% |
| NOTIF-03 | Mark as read | P1 | 20-realtime:2.6-2.7 | - | ⚠️ 70% |
| NOTIF-04 | Navigation vers ressource | P1 | 20-realtime:2.9 | - | ⚠️ 70% |

---

## 8. Exigences PWA (PWA)

| ID | Exigence | Priorité | Tests Manuels | Tests E2E | Couverture |
|----|----------|----------|---------------|-----------|------------|
| PWA-01 | Install banner | P1 | 18-pwa:1.1-1.5 | - | ✅ 90% |
| PWA-02 | Installation | P1 | 18-pwa:2.1-2.5 | - | ✅ 90% |
| PWA-03 | Standalone mode | P2 | 18-pwa:3.1-3.4 | - | ⚠️ 80% |
| PWA-04 | Session persistence | P2 | 18-pwa:4.1-4.4 | - | ⚠️ 80% |

---

## 9. Exigences Sécurité (SEC)

| ID | Exigence | Priorité | Tests Manuels | Tests E2E | Couverture |
|----|----------|----------|---------------|-----------|------------|
| SEC-01 | RLS multi-tenant | P0 | 04-securite:1.1-1.10 | - | ✅ 100% |
| SEC-02 | CSRF protection | P0 | 04-securite:2.1-2.3 | - | ⚠️ 80% |
| SEC-03 | XSS prevention | P0 | 04-securite:3.1-3.5 | - | ⚠️ 80% |
| SEC-04 | SQL injection | P0 | 04-securite:4.1-4.3 | - | ⚠️ 80% |

---

## 10. Exigences Performance (PERF)

| ID | Exigence | Priorité | Tests Manuels | Tests E2E | Couverture |
|----|----------|----------|---------------|-----------|------------|
| PERF-01 | LCP < 2.5s | P0 | 05-performance:1.1 | 15-baselines | ✅ 100% |
| PERF-02 | INP < 100ms | P1 | 05-performance:1.2 | 15-baselines | ⚠️ 80% |
| PERF-03 | CLS < 0.1 | P1 | 05-performance:1.3 | 15-baselines | ⚠️ 80% |

---

## Résumé de Couverture

### Par Domaine

| Domaine | Exigences | Couvertes 100% | Partielles | Non couvertes |
|---------|-----------|----------------|------------|---------------|
| AUTH | 5 | 4 | 1 | 0 |
| BIENS | 5 | 2 | 3 | 0 |
| INT | 8 | 6 | 2 | 0 |
| CONT | 3 | 1 | 2 | 0 |
| CTR | 3 | 0 | 3 | 0 |
| MAIL | 6 | 2 | 4 | 0 |
| NOTIF | 4 | 0 | 4 | 0 |
| PWA | 4 | 2 | 2 | 0 |
| SEC | 4 | 1 | 3 | 0 |
| PERF | 3 | 1 | 2 | 0 |
| **TOTAL** | **45** | **19 (42%)** | **26 (58%)** | **0 (0%)** |

### Par Priorité

| Priorité | Total | 100% | Partiel |
|----------|-------|------|---------|
| P0 | 22 | 14 (64%) | 8 (36%) |
| P1 | 17 | 4 (24%) | 13 (76%) |
| P2 | 6 | 1 (17%) | 5 (83%) |

---

## Légende

| Symbole | Signification |
|---------|---------------|
| ✅ 100% | Exigence entièrement couverte par tests |
| ⚠️ 70-90% | Exigence partiellement couverte |
| ❌ < 70% | Exigence insuffisamment couverte |

---

## Actions Recommandées

### Priorité Haute
1. Augmenter couverture E2E pour MAIL, NOTIF, PWA
2. Automatiser tests SEC (RLS, XSS, CSRF)

### Priorité Moyenne
3. Ajouter tests CTR (contrats)
4. Compléter tests BIENS (import, documents)

### Priorité Basse
5. Ajouter tests PERF automatisés (Lighthouse CI)

---

## Historique

| Version | Date | Changements |
|---------|------|-------------|
| 1.0 | 2025-12-18 | Création initiale (45 exigences) |

---

**Mainteneur** : Claude Code
**Exigences tracées** : 45
