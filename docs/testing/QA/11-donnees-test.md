# Guide des Données de Test - SEIDO

> **Version** : 1.0
> **Date** : 2025-12-18
> **Objectif** : Fournir aux testeurs toutes les données nécessaires pour exécuter les tests de manière reproductible

---

## 1. Comptes de Test

### 1.1 Comptes par Rôle

| Rôle | Email | Password | Team | Notes |
|------|-------|----------|------|-------|
| **Admin** | `admin@test-seido.fr` | `TestSeido2024!` | SEIDO Admin | Accès complet système |
| **Gestionnaire** | `gestionnaire@test-seido.fr` | `TestSeido2024!` | Immobilière Test | 70% des tests |
| **Gestionnaire 2** | `gestionnaire2@test-seido.fr` | `TestSeido2024!` | Autre Team | Tests multi-team |
| **Prestataire** | `prestataire@test-seido.fr` | `TestSeido2024!` | Plomberie Express | Spécialité: Plomberie |
| **Prestataire 2** | `electricien@test-seido.fr` | `TestSeido2024!` | Élec Pro | Spécialité: Électricité |
| **Locataire** | `locataire@test-seido.fr` | `TestSeido2024!` | - | Lot: Apt 3B |
| **Locataire 2** | `locataire2@test-seido.fr` | `TestSeido2024!` | - | Lot: Apt 5A |
| **Propriétaire** | `proprietaire@test-seido.fr` | `TestSeido2024!` | - | Lecture seule |

### 1.2 Comptes Spéciaux (Edge Cases)

| Cas | Email | Password | Usage |
|-----|-------|----------|-------|
| Compte non confirmé | `nonconfirme@test-seido.fr` | `TestSeido2024!` | Test email non vérifié |
| Compte désactivé | `desactive@test-seido.fr` | `TestSeido2024!` | Test compte bloqué |
| Nouveau compte | `nouveau@test-seido.fr` | `TestSeido2024!` | Test onboarding |
| Multi-rôles | `multirole@test-seido.fr` | `TestSeido2024!` | Gestionnaire + Prestataire |

### 1.3 Format Password Standard

```
TestSeido2024!
```

**Règles de validation password :**
- Minimum 8 caractères
- Au moins 1 majuscule
- Au moins 1 minuscule
- Au moins 1 chiffre
- Au moins 1 caractère spécial (`!@#$%^&*`)

---

## 2. Données de Référence (Seed Data)

### 2.1 Immeubles de Test

| ID Ref | Nom | Adresse | Code Postal | Ville | Lots | Statut |
|--------|-----|---------|-------------|-------|------|--------|
| `IMM-001` | Résidence Les Lilas | 12 rue de la Paix | 75001 | Paris | 8 | Actif |
| `IMM-002` | Le Panorama | 45 avenue Victor Hugo | 75016 | Paris | 12 | Actif |
| `IMM-003` | Les Jardins | 8 rue des Fleurs | 69001 | Lyon | 6 | Actif |
| `IMM-004` | Immeuble Vide | 1 rue Test | 13001 | Marseille | 0 | Test état vide |

### 2.2 Lots de Test

| ID Ref | Immeuble | Référence | Type | Étage | Locataire | Statut |
|--------|----------|-----------|------|-------|-----------|--------|
| `LOT-001` | IMM-001 | Apt 3B | Appartement | 3 | locataire@test-seido.fr | Occupé |
| `LOT-002` | IMM-001 | Apt 5A | Appartement | 5 | locataire2@test-seido.fr | Occupé |
| `LOT-003` | IMM-001 | Garage A1 | Garage | -1 | - | Vacant |
| `LOT-004` | IMM-002 | Studio 12 | Appartement | 1 | - | Vacant |
| `LOT-005` | IMM-001 | Cave C3 | Autre | -2 | locataire@test-seido.fr | Occupé |

### 2.3 Contacts Prestataires

| ID Ref | Nom | Société | Spécialité | Email | Téléphone |
|--------|-----|---------|------------|-------|-----------|
| `PRE-001` | Jean Dupont | Plomberie Express | Plomberie | prestataire@test-seido.fr | 06 12 34 56 78 |
| `PRE-002` | Marie Martin | Élec Pro | Électricité | electricien@test-seido.fr | 06 98 76 54 32 |
| `PRE-003` | Pierre Durand | Chauff'Service | Chauffage | chauffage@test-seido.fr | 06 11 22 33 44 |
| `PRE-004` | Sophie Leroy | Multi-Services | Autre | multiservice@test-seido.fr | 06 55 66 77 88 |

### 2.4 Interventions de Test

| ID Ref | Référence | Immeuble/Lot | Type | Statut | Prestataire | Créée par |
|--------|-----------|--------------|------|--------|-------------|-----------|
| `INT-001` | INT-2025-0001 | IMM-001/LOT-001 | Plomberie | demande | - | locataire |
| `INT-002` | INT-2025-0002 | IMM-001/LOT-002 | Électricité | approuvee | PRE-002 | gestionnaire |
| `INT-003` | INT-2025-0003 | IMM-002/Communes | Chauffage | demande_de_devis | - | gestionnaire |
| `INT-004` | INT-2025-0004 | IMM-001/LOT-001 | Plomberie | planifiee | PRE-001 | gestionnaire |
| `INT-005` | INT-2025-0005 | IMM-001/Communes | Menage | en_cours | PRE-004 | gestionnaire |
| `INT-006` | INT-2025-0006 | IMM-003/LOT-003 | Serrurerie | cloturee_par_gestionnaire | PRE-001 | gestionnaire |

---

## 3. Énumérations de Référence

### 3.1 Statuts d'Intervention (`intervention_status`)

| Valeur | Label UI | Description | Rôle qui peut créer | Couleur Badge |
|--------|----------|-------------|---------------------|---------------|
| `demande` | Demande | Demande initiale du locataire | Locataire | Gris |
| `rejetee` | Rejetée | Demande refusée par gestionnaire | Gestionnaire | Rouge |
| `approuvee` | Approuvée | Intervention validée | Gestionnaire | Vert |
| `demande_de_devis` | Demande de devis | En attente de devis prestataires | Gestionnaire | Orange |
| `planification` | En planification | Recherche de créneau | Prestataire | Bleu clair |
| `planifiee` | Planifiée | RDV confirmé | Gestionnaire | Bleu |
| `en_cours` | En cours | Travaux démarrés | Prestataire | Violet |
| `cloturee_par_prestataire` | Clôturée (prestataire) | Travaux terminés côté prestataire | Prestataire | Vert clair |
| `cloturee_par_locataire` | Clôturée (locataire) | Validée par locataire | Locataire | Vert |
| `cloturee_par_gestionnaire` | Clôturée | Finalisée par gestionnaire | Gestionnaire | Vert foncé |
| `annulee` | Annulée | Intervention annulée | Tous | Rouge |

### 3.2 Transitions de Statut Autorisées

```
demande ─────┬─── approuvee ──────────────────┬─── planification ─── planifiee ─── en_cours
             │                                 │
             └─── rejetee                      └─── demande_de_devis ─── planification

en_cours ─── cloturee_par_prestataire ─── cloturee_par_locataire ─── cloturee_par_gestionnaire

[Tout statut] ─── annulee
```

### 3.3 Types d'Intervention (`intervention_type`)

| Valeur | Label | Icône |
|--------|-------|-------|
| `plomberie` | Plomberie | 🔧 |
| `electricite` | Électricité | ⚡ |
| `chauffage` | Chauffage | 🔥 |
| `serrurerie` | Serrurerie | 🔑 |
| `peinture` | Peinture | 🎨 |
| `menage` | Ménage | 🧹 |
| `jardinage` | Jardinage | 🌱 |
| `autre` | Autre | ⚙️ |

### 3.4 Niveaux d'Urgence (`intervention_urgency`)

| Valeur | Label | Délai SLA | Couleur |
|--------|-------|-----------|---------|
| `basse` | Basse | 30 jours | Gris |
| `normale` | Normale | 14 jours | Bleu |
| `haute` | Haute | 7 jours | Orange |
| `urgente` | Urgente | 48h | Rouge |

### 3.5 Rôles Utilisateur (`user_role`)

| Valeur | Label | Permissions principales |
|--------|-------|------------------------|
| `admin` | Administrateur | Tout (système, users, config) |
| `gestionnaire` | Gestionnaire | CRUD biens, interventions, contacts |
| `prestataire` | Prestataire | Voir interventions assignées, devis, planning |
| `locataire` | Locataire | Créer demandes, suivre ses interventions |
| `proprietaire` | Propriétaire | Lecture seule sur ses biens |

### 3.6 Catégories de Lot (`lot_category`)

| Valeur | Label |
|--------|-------|
| `appartement` | Appartement |
| `collocation` | Collocation |
| `maison` | Maison |
| `garage` | Garage |
| `local_commercial` | Local commercial |
| `autre` | Autre |

---

## 4. Fichiers de Test

### 4.1 Images de Test

| Fichier | Taille | Usage |
|---------|--------|-------|
| `test-image-valid.jpg` | 500 KB | Upload photo intervention |
| `test-image-large.jpg` | 15 MB | Test limite taille (doit échouer) |
| `test-image.png` | 200 KB | Format PNG valide |
| `test-image.webp` | 100 KB | Format WEBP valide |
| `test-document.pdf` | 1 MB | Test format invalide pour photos |

### 4.2 Documents de Test

| Fichier | Type | Usage |
|---------|------|-------|
| `test-devis.pdf` | PDF | Upload devis prestataire |
| `test-facture.pdf` | PDF | Upload facture |
| `test-plan.pdf` | PDF | Plan d'immeuble |
| `test-bail.pdf` | PDF | Document bail |

### 4.3 Fichiers Import Excel/CSV

| Fichier | Contenu | Usage |
|---------|---------|-------|
| `import-immeubles-valid.xlsx` | 5 immeubles valides | Test import réussi |
| `import-immeubles-errors.xlsx` | Données invalides | Test gestion erreurs |
| `import-lots-valid.csv` | 10 lots valides | Test import CSV |
| `import-template.xlsx` | Template vide | Téléchargement modèle |

---

## 5. Procédures de Reset

### 5.1 Reset Données Test (Manuel)

```sql
-- ⚠️ À exécuter UNIQUEMENT sur environnement de test
-- Ne JAMAIS exécuter en production

-- 1. Supprimer interventions de test
DELETE FROM interventions WHERE reference LIKE 'INT-TEST-%';

-- 2. Reset statuts interventions de test
UPDATE interventions
SET status = 'demande'
WHERE reference IN ('INT-2025-0001', 'INT-2025-0002');

-- 3. Supprimer notifications de test
DELETE FROM notifications
WHERE user_id IN (
  SELECT id FROM users WHERE email LIKE '%@test-seido.fr'
);

-- 4. Reset compteurs
-- (Dépend de l'implémentation des séquences)
```

### 5.2 Créer Données de Test

```sql
-- Créer un immeuble de test
INSERT INTO buildings (id, name, address, city, postal_code, team_id)
VALUES (
  gen_random_uuid(),
  'Immeuble Test QA',
  '123 rue du Test',
  'Paris',
  '75001',
  'TEAM_ID_HERE'
);

-- Créer une intervention de test
INSERT INTO interventions (
  reference,
  type,
  status,
  urgency,
  description,
  building_id,
  team_id,
  created_by
)
VALUES (
  'INT-TEST-001',
  'plomberie',
  'demande',
  'normale',
  'Intervention créée pour test QA',
  'BUILDING_ID_HERE',
  'TEAM_ID_HERE',
  'USER_ID_HERE'
);
```

### 5.3 Vérification État Initial

Avant chaque session de test, vérifier :

```sql
-- Compter les entités de test
SELECT
  (SELECT COUNT(*) FROM users WHERE email LIKE '%@test-seido.fr') as test_users,
  (SELECT COUNT(*) FROM buildings WHERE name LIKE '%Test%') as test_buildings,
  (SELECT COUNT(*) FROM interventions WHERE reference LIKE 'INT-TEST-%') as test_interventions;
```

---

## 6. Configuration Environnements

### 6.1 URLs par Environnement

| Environnement | URL | Base de données |
|---------------|-----|-----------------|
| **Local** | `http://localhost:3000` | Supabase local |
| **Preview** | `https://preview.seido.app` | Supabase staging |
| **Production** | `https://app.seido.app` | Supabase prod |

### 6.2 Variables Spécifiques Test

```env
# .env.test
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
TEST_USER_EMAIL=gestionnaire@test-seido.fr
TEST_USER_PASSWORD=TestSeido2024!
```

---

## 7. Matrice Préconditions par Test

### 7.1 Tests Gestionnaire

| Test | Préconditions requises |
|------|------------------------|
| Dashboard | Connecté gestionnaire, ≥1 bien, ≥1 intervention |
| Créer immeuble | Connecté gestionnaire |
| Créer lot | Connecté gestionnaire, ≥1 immeuble |
| Créer intervention | Connecté gestionnaire, ≥1 bien, ≥1 prestataire |
| Valider devis | Intervention en statut `demande_de_devis`, ≥1 devis soumis |
| Planifier | Intervention en statut `planification`, créneaux proposés |

### 7.2 Tests Prestataire

| Test | Préconditions requises |
|------|------------------------|
| Dashboard | Connecté prestataire, ≥1 intervention assignée |
| Soumettre devis | Intervention en `demande_de_devis` assignée |
| Proposer créneaux | Intervention en `planification` |
| Démarrer travaux | Intervention en `planifiee` |
| Clôturer intervention | Intervention en `en_cours` |

### 7.3 Tests Locataire

| Test | Préconditions requises |
|------|------------------------|
| Dashboard | Connecté locataire, associé à un lot |
| Créer demande | Connecté locataire |
| Suivre intervention | ≥1 intervention créée par le locataire |
| Valider travaux | Intervention en `cloturee_par_prestataire` |

---

## 8. Checklist Avant Session de Test

- [ ] **Environnement** : URL correcte (Local/Preview/Prod)
- [ ] **Comptes** : Accès aux comptes de test confirmé
- [ ] **Données** : Seed data présent (immeubles, lots, interventions)
- [ ] **Navigateur** : Cache/cookies vidés
- [ ] **Console** : DevTools ouvert (F12)
- [ ] **Réseau** : Connexion stable
- [ ] **Notifications** : Service notifications actif (si testé)

---

## Références

- [Glossaire Terminologie](/docs/testing/QA/12-glossaire.md)
- [Database Types](/lib/database.types.ts)
- [Service Types](/lib/services/core/service-types.ts)
