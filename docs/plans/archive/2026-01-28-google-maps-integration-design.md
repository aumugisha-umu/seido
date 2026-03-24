# Design : Intégration Google Maps API

**Date** : 2026-01-28
**Statut** : Validé
**Auteur** : Claude + Arthur

---

## Résumé

Intégration de Google Maps Platform dans SEIDO pour :
1. **Autocomplétion d'adresses** lors de la création/édition de lots et immeubles
2. **Affichage de cartes interactives** avec pin sur les fiches lots, immeubles et interventions

---

## Décisions de design

| Question | Décision |
|----------|----------|
| Région prioritaire | Benelux + France (BE, FR, LU, NL) |
| Stockage coordonnées | Table `addresses` centralisée (refactorisation) |
| Affichage carte | Carte interactive cliquable |
| Clé API | Réutiliser projet Google Cloud existant (OAuth) |
| Comportement autocomplete | Remplir champs + afficher preview carte |
| Migration données existantes | Non, seulement nouvelles entrées |
| Multi-adresse par entité | Non, relation 1:1 |

---

## Architecture

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │ AddressAutocomplete │    │       GoogleMapPreview          │ │
│  │    (Places API)     │    │    (Maps JavaScript API)        │ │
│  └─────────────────────┘    └─────────────────────────────────┘ │
│              │                           ▲                      │
│              ▼                           │                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              APIProvider (@vis.gl/react-google-maps)        ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Supabase)                         │
├─────────────────────────────────────────────────────────────────┤
│  addresses (NEW)              │  buildings / lots / companies   │
│  ├─ street                    │  └─ address_id (FK)             │
│  ├─ postal_code               │                                 │
│  ├─ city                      │                                 │
│  ├─ country                   │                                 │
│  ├─ latitude                  │                                 │
│  ├─ longitude                 │                                 │
│  ├─ place_id                  │                                 │
│  └─ formatted_address         │                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Librairie React officielle

Utilisation de **[@vis.gl/react-google-maps](https://visgl.github.io/react-google-maps/)** (sponsorisée par Google) :
- `APIProvider` : Chargement unique de l'API
- `Map` : Composant carte
- `AdvancedMarker` + `Pin` : Markers personnalisables
- `useMapsLibrary` : Hook pour charger Places API

### Nouvelle API Places (2025+)

**Important** : `google.maps.places.Autocomplete` est déprécié depuis mars 2025 pour les nouveaux clients.

Utilisation de la nouvelle API :
```typescript
const { suggestions } = await google.maps.places.AutocompleteSuggestion
  .fetchAutocompleteSuggestions({
    input,
    sessionToken,
    includedRegionCodes: ['BE', 'FR', 'LU', 'NL']
  })
```

---

## Base de données

### Nouvelle table `addresses`

```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Champs d'adresse normalisés
  street TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  country country NOT NULL,

  -- Géolocalisation Google Maps
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  place_id TEXT,
  formatted_address TEXT,

  -- Multi-tenant
  team_id UUID NOT NULL REFERENCES teams(id),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),

  CONSTRAINT valid_coordinates CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL)
  )
);

-- Index
CREATE INDEX idx_addresses_coordinates
ON addresses(latitude, longitude)
WHERE latitude IS NOT NULL;

CREATE INDEX idx_addresses_location
ON addresses(team_id, city, postal_code);

-- RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
```

### Modification des tables existantes

```sql
-- Ajouter FK aux tables existantes
ALTER TABLE buildings ADD COLUMN address_id UUID REFERENCES addresses(id);
ALTER TABLE lots ADD COLUMN address_id UUID REFERENCES addresses(id);
ALTER TABLE companies ADD COLUMN address_id UUID REFERENCES addresses(id);
```

### Stratégie de migration

1. **Phase 1** : Créer table + FK nullable (rétrocompatible)
2. **Phase 2** : Migrer données existantes sans géocodage
3. **Phase 3** : Mettre à jour le code applicatif
4. **Phase 4** : Supprimer anciennes colonnes (optionnel, après validation)

---

## Composants React

### AddressAutocompleteInput

```tsx
interface AddressAutocompleteInputProps {
  onAddressSelect: (address: AddressData) => void
  defaultValue?: string
  placeholder?: string
  disabled?: boolean
}

interface AddressData {
  street: string
  postalCode: string
  city: string
  country: string
  latitude: number
  longitude: number
  placeId: string
  formattedAddress: string
}
```

**Fonctionnalités** :
- Suggestions en temps réel (debounce 300ms)
- Biais géographique BE/FR/LU/NL
- Session tokens pour optimisation billing
- Parsing automatique des composants d'adresse
- UI avec shadcn/ui (Popover + Command)

### GoogleMapPreview

```tsx
interface GoogleMapPreviewProps {
  latitude: number
  longitude: number
  address?: string
  height?: number
  className?: string
}
```

**Fonctionnalités** :
- Carte interactive avec zoom/pan
- Advanced Marker avec couleur SEIDO
- Bouton "Ouvrir dans Google Maps"
- Gesture handling coopératif

---

## Configuration Google Cloud

### APIs à activer

| API | Usage |
|-----|-------|
| Maps JavaScript API | Cartes interactives |
| Places API (New) | Autocomplétion |

### Clé API - Restrictions

**HTTP referrers** :
- `https://seido.app/*`
- `https://*.seido.app/*`
- `http://localhost:3000/*`
- `https://*.vercel.app/*`

**API restrictions** :
- Maps JavaScript API
- Places API (New)

### Map ID

- Nom : `SEIDO_MAP_PREVIEW`
- Type : JavaScript / Vector

### Variables d'environnement

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
NEXT_PUBLIC_GOOGLE_MAP_ID=SEIDO_MAP_PREVIEW
```

---

## Plan d'implémentation

### Phase 1 : Infrastructure (1-2h)
- Activer APIs Google Cloud
- Créer clé API + Map ID
- Ajouter variables .env
- `npm install @vis.gl/react-google-maps`

### Phase 2 : Base de données (1h)
- Créer migration table addresses
- Ajouter FK aux tables existantes
- Migrer données existantes
- Regénérer database.types.ts

### Phase 3 : Composants Google Maps (2-3h)
- Créer wrapper APIProvider
- Créer AddressAutocompleteInput
- Créer GoogleMapPreview
- Tests manuels

### Phase 4 : Intégration formulaires (2-3h)
- Modifier BuildingInfoForm
- Intégrer création immeuble/lot
- Mettre à jour server actions

### Phase 5 : Affichage cartes (1-2h)
- Carte sur fiche immeuble
- Carte sur fiche lot
- Carte sur fiche intervention

### Phase 6 : Tests & Polish (1h)
- Tests E2E
- Vérifier responsive
- Documenter

**Temps total estimé : 8-12 heures**

---

## Fichiers impactés

### À créer

| Fichier | Description |
|---------|-------------|
| `supabase/migrations/XXXXXX_create_addresses_table.sql` | Migration DB |
| `components/google-maps/index.ts` | Exports |
| `components/google-maps/address-autocomplete-input.tsx` | Autocomplete |
| `components/google-maps/google-map-preview.tsx` | Carte |
| `lib/services/repositories/address.repository.ts` | Repository |
| `lib/services/domain/address.service.ts` | Service |

### À modifier

| Fichier | Modification |
|---------|--------------|
| `lib/database.types.ts` | Regénérer |
| `components/building-info-form.tsx` | Intégrer autocomplete |
| `app/gestionnaire/.../immeubles/nouveau/` | APIProvider |
| `app/gestionnaire/.../lots/nouveau/` | APIProvider |
| `app/gestionnaire/biens/immeubles/[id]/` | GoogleMapPreview |
| `app/gestionnaire/biens/lots/[id]/` | GoogleMapPreview |
| `app/gestionnaire/interventions/[id]/` | GoogleMapPreview |
| `app/actions/building-actions.ts` | Sauvegarder address_id |

---

## Coûts estimés

| Usage | Requêtes/mois | Coût |
|-------|---------------|------|
| 50 créations | ~50 sessions | < $1 |
| 500 vues fiches | ~500 loads | ~$3.50 |
| **Total** | | **~$5/mois** |

Google offre $200/mois de crédits gratuits.

---

## Sources

- [Place Autocomplete Data API](https://developers.google.com/maps/documentation/javascript/place-autocomplete-data)
- [@vis.gl/react-google-maps](https://visgl.github.io/react-google-maps/docs)
- [Advanced Markers](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview)
- [GitHub Discussion - New Places API](https://github.com/visgl/react-google-maps/discussions/707)
- [Dépréciation Autocomplete](https://github.com/visgl/react-google-maps/issues/736)
