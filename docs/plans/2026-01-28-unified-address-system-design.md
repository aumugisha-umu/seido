# Unified Address System - Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Centraliser toutes les adresses (buildings, lots, companies) dans la table `addresses` avec support Google Maps unifié et geocoding bidirectionnel.

**Architecture:** Table `addresses` centralisée avec FK `address_id` dans toutes les entités. Composant `AddressFieldsWithMap` réutilisable avec autocomplétion ET geocoding automatique des champs manuels.

**Tech Stack:** Next.js 15, Supabase, @vis.gl/react-google-maps, Google Places API, Google Geocoding API

---

## 1. Architecture Cible

```
┌─────────────────────────────────────────────────────────────┐
│                    Table `addresses`                        │
├─────────────────────────────────────────────────────────────┤
│  id, street, postal_code, city, country,                    │
│  latitude, longitude, place_id, formatted_address,          │
│  team_id, created_at, updated_at, deleted_at                │
└─────────────────────────────────────────────────────────────┘
           ▲                    ▲                    ▲
           │                    │                    │
    ┌──────┴──────┐      ┌──────┴──────┐      ┌──────┴──────┐
    │  buildings  │      │    lots     │      │  companies  │
    │ address_id  │      │ address_id  │      │ address_id  │
    └─────────────┘      └─────────────┘      └─────────────┘
```

## 2. Migration Base de Données

### 2.1 Colonnes à SUPPRIMER

| Table | Colonnes à supprimer |
|-------|---------------------|
| `buildings` | `address`, `city`, `postal_code`, `country` |
| `lots` | `street`, `postal_code`, `city`, `country` |
| `companies` | `address`, `street`, `street_number`, `postal_code`, `city`, `country` |

### 2.2 Script de Migration

```sql
-- Step 1: Migrer les données existantes vers addresses (si pas déjà fait)
-- Pour buildings sans address_id
INSERT INTO addresses (id, street, postal_code, city, country, team_id, created_at)
SELECT
  gen_random_uuid(),
  b.address,
  b.postal_code,
  b.city,
  b.country,
  b.team_id,
  NOW()
FROM buildings b
WHERE b.address_id IS NULL AND b.address IS NOT NULL;

-- Mettre à jour address_id
UPDATE buildings b
SET address_id = (
  SELECT a.id FROM addresses a
  WHERE a.street = b.address
    AND a.postal_code = b.postal_code
    AND a.city = b.city
    AND a.team_id = b.team_id
  LIMIT 1
)
WHERE b.address_id IS NULL;

-- Répéter pour lots et companies...

-- Step 2: Supprimer les colonnes (APRÈS vérification)
ALTER TABLE buildings DROP COLUMN IF EXISTS address;
ALTER TABLE buildings DROP COLUMN IF EXISTS city;
ALTER TABLE buildings DROP COLUMN IF EXISTS postal_code;
ALTER TABLE buildings DROP COLUMN IF EXISTS country;

ALTER TABLE lots DROP COLUMN IF EXISTS street;
ALTER TABLE lots DROP COLUMN IF EXISTS postal_code;
ALTER TABLE lots DROP COLUMN IF EXISTS city;
ALTER TABLE lots DROP COLUMN IF EXISTS country;

ALTER TABLE companies DROP COLUMN IF EXISTS address;
ALTER TABLE companies DROP COLUMN IF EXISTS street;
ALTER TABLE companies DROP COLUMN IF EXISTS street_number;
ALTER TABLE companies DROP COLUMN IF EXISTS postal_code;
ALTER TABLE companies DROP COLUMN IF EXISTS city;
ALTER TABLE companies DROP COLUMN IF EXISTS country;
```

## 3. Composant AddressFieldsWithMap

### 3.1 Interface

```typescript
interface AddressFieldsWithMapProps {
  // Valeurs des champs
  street: string
  postalCode: string
  city: string
  country: string

  // Coordonnées (optionnel, pour édition)
  latitude?: number
  longitude?: number

  // Callbacks
  onFieldsChange: (fields: AddressFields) => void
  onGeocodeResult?: (result: GeocodeResult | null) => void

  // Options
  showAutocomplete?: boolean  // Afficher le champ recherche Google
  showMap?: boolean           // Afficher la carte preview
  mapHeight?: number          // Hauteur de la carte (défaut: 180)
  disabled?: boolean
  required?: boolean
}

interface AddressFields {
  street: string
  postalCode: string
  city: string
  country: string
}

interface GeocodeResult {
  latitude: number
  longitude: number
  placeId: string
  formattedAddress: string
}
```

### 3.2 Comportement

1. **Autocomplétion Google** (si `showAutocomplete=true`)
   - Input de recherche avec suggestions
   - Sélection → remplit tous les champs + coordonnées + carte

2. **Saisie manuelle**
   - Champs rue, code postal, ville, pays éditables
   - Debounce 800ms après modification
   - Geocoding automatique avec l'adresse combinée
   - Si trouvé → coordonnées + carte
   - Si pas trouvé → carte masquée

3. **Carte preview** (si `showMap=true` et coordonnées disponibles)
   - Affichée uniquement si lat/lng disponibles
   - Pin aux couleurs SEIDO
   - Bouton "Ouvrir dans Google Maps"

## 4. Flux par Entité

### 4.1 Buildings (Immeubles)

```
Création:
1. GoogleMapsProvider wraps form
2. AddressFieldsWithMap avec showAutocomplete=true, showMap=true
3. À la soumission:
   - Créer entrée dans `addresses` via AddressService
   - Créer building avec `address_id`

Lecture:
- Query: select('*, address:address_id(*)')
- Affichage carte si address.latitude/longitude
```

### 4.2 Lots (Indépendants)

```
Création lot indépendant:
1. Si buildingAssociation === 'independent'
2. AddressFieldsWithMap avec showAutocomplete=true, showMap=true
3. À la soumission:
   - Créer entrée dans `addresses`
   - Créer lot avec `address_id`

Lots rattachés à un immeuble:
- Pas de champs adresse (hérité du building)
- address_id = null (récupérer via building.address_id)
```

### 4.3 Companies (Sociétés)

```
Création via recherche TVA:
1. CompanySearch (CBE API) retourne adresse
2. Champs pré-remplis automatiquement
3. AddressFieldsWithMap avec showAutocomplete=false, showMap=true
4. Geocoding automatique de l'adresse TVA
5. Carte affichée si geocoding réussi
6. À la soumission:
   - Créer entrée dans `addresses`
   - Créer company avec `address_id`
```

## 5. Services à Adapter

### 5.1 AddressService

Déjà existant dans `lib/services/domain/address.service.ts`:
- `createFromGooglePlace()` ✅
- `createManual()` ✅
- Ajouter: `geocodeAddress(street, postalCode, city, country): Promise<GeocodeResult | null>`

### 5.2 BuildingService / Repository

```typescript
// Avant
create({ name, address, city, postal_code, country, ... })

// Après
create({ name, address_id, ... })

// Lecture avec jointure
findById(id) {
  return supabase
    .from('buildings')
    .select('*, address:address_id(*)')
    .eq('id', id)
    .single()
}
```

### 5.3 LotService / Repository

```typescript
// Idem, ajouter jointure sur address_id
findById(id) {
  return supabase
    .from('lots')
    .select('*, address:address_id(*), building:building_id(*, address:address_id(*))')
    .eq('id', id)
    .single()
}
```

### 5.4 CompanyService / Repository

```typescript
// Ajouter support address_id
create({ name, vat_number, address_id, ... })

findById(id) {
  return supabase
    .from('companies')
    .select('*, address:address_id(*)')
    .eq('id', id)
    .single()
}
```

## 6. Fichiers à Modifier

### 6.1 Nouveaux fichiers

| Fichier | Description |
|---------|-------------|
| `components/google-maps/address-fields-with-map.tsx` | Composant unifié |
| `supabase/migrations/XXXX_unified_addresses.sql` | Migration DB |

### 6.2 Fichiers à adapter

| Fichier | Changement |
|---------|------------|
| `lib/database.types.ts` | Régénérer après migration |
| `lib/services/domain/address.service.ts` | Ajouter `geocodeAddress()` |
| `lib/services/repositories/building.repository.ts` | Jointures address |
| `lib/services/repositories/lot.repository.ts` | Jointures address |
| `lib/services/repositories/company.repository.ts` | Jointures address |
| `lib/services/domain/composite.service.ts` | Adapter création building/lot |
| `components/building-info-form.tsx` | Utiliser AddressFieldsWithMap |
| `app/.../lots/nouveau/page.tsx` | Lots indépendants avec Maps |
| `app/.../lots/modifier/[id]/lot-edit-client.tsx` | Édition avec Maps |
| `app/.../contacts/nouveau/steps/step-2-company.tsx` | Sociétés avec carte |
| Toutes les pages d'affichage | Jointures pour récupérer adresse |

## 7. Plan d'Implémentation

### Phase 1: Composant AddressFieldsWithMap
1. Créer le composant avec autocomplétion + geocoding manuel
2. Tester en isolation

### Phase 2: Migration DB
1. Créer script migration (migrer données existantes)
2. Exécuter en staging
3. Régénérer types TypeScript

### Phase 3: Adapter Buildings
1. Modifier repository (jointures)
2. Modifier formulaire création
3. Modifier formulaire édition
4. Adapter affichage (détails, listes)

### Phase 4: Adapter Lots
1. Modifier repository (jointures)
2. Ajouter Maps aux lots indépendants (création)
3. Ajouter Maps aux lots indépendants (édition)
4. Adapter affichage

### Phase 5: Adapter Companies
1. Modifier repository (jointures)
2. Ajouter carte après recherche TVA
3. Adapter affichage

### Phase 6: Cleanup & Tests
1. Supprimer code obsolète
2. Tests E2E création/édition
3. Vérifier toutes les pages d'affichage

---

**Estimation:** 6-8 heures de développement

**Risques:**
- Migration données existantes (bien tester en staging)
- Casser les requêtes existantes (faire les jointures partout)
- Google Geocoding quotas (mettre en cache les résultats)
