# Google Maps Integration - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Intégrer Google Maps Platform pour l'autocomplétion d'adresses et l'affichage de cartes interactives dans SEIDO.

**Architecture:** Table `addresses` centralisée avec FK vers buildings/lots/companies. Composants React utilisant @vis.gl/react-google-maps (librairie officielle Google). Nouvelle API Places (AutocompleteSuggestion) pour l'autocomplétion.

**Tech Stack:** Next.js 15, @vis.gl/react-google-maps, Supabase PostgreSQL, shadcn/ui, TypeScript

**Design Reference:** `docs/plans/2026-01-28-google-maps-integration-design.md`

---

## Phase 1: Infrastructure & Configuration

### Task 1.1: Install Google Maps React Library

**Files:**
- Modify: `package.json`

**Step 1: Install the package**

Run:
```bash
npm install @vis.gl/react-google-maps
```

Expected: Package added to dependencies

**Step 2: Verify installation**

Run:
```bash
npm ls @vis.gl/react-google-maps
```

Expected: Shows installed version (1.x.x)

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @vis.gl/react-google-maps for Google Maps integration"
```

---

### Task 1.2: Add Environment Variables

**Files:**
- Modify: `.env.example`
- Modify: `.env.local` (manual - not committed)

**Step 1: Update .env.example**

Add at the end of `.env.example`:

```env
# ================================
# 🗺️ GOOGLE MAPS PLATFORM
# ================================
# Get your API key from: https://console.cloud.google.com/google/maps-apis/credentials
# Required APIs: Maps JavaScript API, Places API (New)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Map ID for Advanced Markers (create in Google Cloud Console → Map Management)
NEXT_PUBLIC_GOOGLE_MAP_ID=your_map_id_here
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add Google Maps environment variables template"
```

**Step 3: Manual - Update .env.local**

⚠️ User action required: Add actual API key to `.env.local`

---

## Phase 2: Database Migration

### Task 2.1: Create Addresses Table Migration

**Files:**
- Create: `supabase/migrations/20260128000001_create_addresses_table.sql`

**Step 1: Create the migration file**

```sql
-- Migration: Create centralized addresses table
-- Description: Refactors address storage from multiple tables into a single addresses table
-- with Google Maps geocoding support

-- ============================================
-- TABLE: addresses
-- ============================================
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Address fields (normalized)
  street TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  country country NOT NULL DEFAULT 'belgique',

  -- Google Maps geocoding data
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  place_id TEXT,
  formatted_address TEXT,

  -- Multi-tenant isolation
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT valid_coordinates CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL AND
     latitude >= -90 AND latitude <= 90 AND
     longitude >= -180 AND longitude <= 180)
  )
);

-- ============================================
-- INDEXES
-- ============================================
-- Geo queries index (partial - only geocoded addresses)
CREATE INDEX idx_addresses_coordinates
ON addresses(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Team + location search
CREATE INDEX idx_addresses_team_location
ON addresses(team_id, city, postal_code)
WHERE deleted_at IS NULL;

-- Place ID lookup (for Google cache)
CREATE INDEX idx_addresses_place_id
ON addresses(place_id)
WHERE place_id IS NOT NULL;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE TRIGGER set_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Policy: Team members can view addresses in their team
CREATE POLICY "Team members can view addresses"
ON addresses FOR SELECT
TO authenticated
USING (
  team_id IN (SELECT get_my_team_ids())
);

-- Policy: Gestionnaires and admins can insert addresses
CREATE POLICY "Gestionnaires can insert addresses"
ON addresses FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (SELECT get_my_team_ids())
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.team_id = addresses.team_id
    AND user_profiles.role IN ('admin', 'gestionnaire')
  )
);

-- Policy: Gestionnaires and admins can update addresses
CREATE POLICY "Gestionnaires can update addresses"
ON addresses FOR UPDATE
TO authenticated
USING (
  team_id IN (SELECT get_my_team_ids())
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.team_id = addresses.team_id
    AND user_profiles.role IN ('admin', 'gestionnaire')
  )
)
WITH CHECK (
  team_id IN (SELECT get_my_team_ids())
);

-- Policy: Soft delete only (gestionnaires)
CREATE POLICY "Gestionnaires can soft delete addresses"
ON addresses FOR UPDATE
TO authenticated
USING (
  team_id IN (SELECT get_my_team_ids())
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.team_id = addresses.team_id
    AND user_profiles.role IN ('admin', 'gestionnaire')
  )
);

-- ============================================
-- ADD FK TO EXISTING TABLES
-- ============================================
-- Buildings
ALTER TABLE buildings
ADD COLUMN address_id UUID REFERENCES addresses(id) ON DELETE SET NULL;

CREATE INDEX idx_buildings_address_id ON buildings(address_id)
WHERE address_id IS NOT NULL;

-- Lots
ALTER TABLE lots
ADD COLUMN address_id UUID REFERENCES addresses(id) ON DELETE SET NULL;

CREATE INDEX idx_lots_address_id ON lots(address_id)
WHERE address_id IS NOT NULL;

-- Companies
ALTER TABLE companies
ADD COLUMN address_id UUID REFERENCES addresses(id) ON DELETE SET NULL;

CREATE INDEX idx_companies_address_id ON companies(address_id)
WHERE address_id IS NOT NULL;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE addresses IS 'Centralized address storage with Google Maps geocoding support';
COMMENT ON COLUMN addresses.street IS 'Street name and number (e.g., "Rue de la Paix 123")';
COMMENT ON COLUMN addresses.latitude IS 'GPS latitude from Google Places API (-90 to 90)';
COMMENT ON COLUMN addresses.longitude IS 'GPS longitude from Google Places API (-180 to 180)';
COMMENT ON COLUMN addresses.place_id IS 'Google Places unique identifier for caching and updates';
COMMENT ON COLUMN addresses.formatted_address IS 'Canonical formatted address from Google';
```

**Step 2: Verify migration syntax**

Run:
```bash
npx supabase db lint
```

Expected: No syntax errors

**Step 3: Commit**

```bash
git add supabase/migrations/20260128000001_create_addresses_table.sql
git commit -m "feat(db): create centralized addresses table with geocoding support"
```

---

### Task 2.2: Apply Migration & Regenerate Types

**Step 1: Push migration to Supabase**

Run:
```bash
npx supabase db push
```

Expected: Migration applied successfully

**Step 2: Regenerate TypeScript types**

Run:
```bash
npm run supabase:types
```

Expected: `lib/database.types.ts` updated with `addresses` table types

**Step 3: Verify types generated**

Check that `lib/database.types.ts` contains:
- `addresses` table definition
- `address_id` column in `buildings`, `lots`, `companies`

**Step 4: Commit**

```bash
git add lib/database.types.ts
git commit -m "chore(types): regenerate database types with addresses table"
```

---

### Task 2.3: Migrate Existing Address Data

**Files:**
- Create: `supabase/migrations/20260128000002_migrate_existing_addresses.sql`

**Step 1: Create data migration**

```sql
-- Migration: Migrate existing addresses from buildings/lots/companies
-- This is a data migration - creates address records from existing data

-- ============================================
-- MIGRATE BUILDINGS ADDRESSES
-- ============================================
INSERT INTO addresses (street, postal_code, city, country, team_id, created_at)
SELECT
  b.address,
  b.postal_code,
  b.city,
  b.country,
  b.team_id,
  b.created_at
FROM buildings b
WHERE b.address IS NOT NULL
  AND b.postal_code IS NOT NULL
  AND b.city IS NOT NULL
  AND b.deleted_at IS NULL
  AND b.address_id IS NULL;

-- Link buildings to their new addresses
UPDATE buildings b
SET address_id = a.id
FROM addresses a
WHERE a.street = b.address
  AND a.postal_code = b.postal_code
  AND a.city = b.city
  AND a.country = b.country
  AND a.team_id = b.team_id
  AND b.address_id IS NULL
  AND b.deleted_at IS NULL;

-- ============================================
-- MIGRATE STANDALONE LOTS ADDRESSES
-- ============================================
-- Only migrate lots that have their own address (not inherited from building)
INSERT INTO addresses (street, postal_code, city, country, team_id, created_at)
SELECT
  l.street,
  l.postal_code,
  l.city,
  l.country,
  l.team_id,
  l.created_at
FROM lots l
WHERE l.street IS NOT NULL
  AND l.postal_code IS NOT NULL
  AND l.city IS NOT NULL
  AND l.building_id IS NULL  -- Standalone lots only
  AND l.deleted_at IS NULL
  AND l.address_id IS NULL;

-- Link standalone lots to their new addresses
UPDATE lots l
SET address_id = a.id
FROM addresses a
WHERE a.street = l.street
  AND a.postal_code = l.postal_code
  AND a.city = l.city
  AND a.country = l.country
  AND a.team_id = l.team_id
  AND l.building_id IS NULL
  AND l.address_id IS NULL
  AND l.deleted_at IS NULL;

-- ============================================
-- MIGRATE COMPANIES ADDRESSES
-- ============================================
INSERT INTO addresses (street, postal_code, city, country, team_id, created_at)
SELECT
  COALESCE(c.street || ' ' || COALESCE(c.street_number, ''), c.address),
  c.postal_code,
  c.city,
  COALESCE(c.country::country, 'belgique'),
  c.team_id,
  c.created_at
FROM companies c
WHERE (c.street IS NOT NULL OR c.address IS NOT NULL)
  AND c.postal_code IS NOT NULL
  AND c.city IS NOT NULL
  AND c.deleted_at IS NULL
  AND c.address_id IS NULL;

-- Link companies to their new addresses
UPDATE companies c
SET address_id = a.id
FROM addresses a
WHERE a.postal_code = c.postal_code
  AND a.city = c.city
  AND a.team_id = c.team_id
  AND c.address_id IS NULL
  AND c.deleted_at IS NULL;
```

**Step 2: Apply migration**

Run:
```bash
npx supabase db push
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260128000002_migrate_existing_addresses.sql
git commit -m "feat(db): migrate existing addresses to centralized table"
```

---

## Phase 3: Repository & Service Layer

### Task 3.1: Create Address Repository

**Files:**
- Create: `lib/services/repositories/address.repository.ts`

**Step 1: Create the repository file**

```typescript
/**
 * Address Repository
 * Handles all database operations for the centralized addresses table
 */

import { BaseRepository } from '../core/base-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  validateRequired,
  validateLength,
  validateNumber
} from '../core/service-types'
import { logger } from '@/lib/logger'

// Type aliases from database
type AddressRow = Database['public']['Tables']['addresses']['Row']
type AddressInsert = Database['public']['Tables']['addresses']['Insert']
type AddressUpdate = Database['public']['Tables']['addresses']['Update']

export type Address = AddressRow
export type { AddressInsert, AddressUpdate }

/**
 * Address data for creating/updating with geocoding
 */
export interface AddressWithGeocode extends AddressInsert {
  latitude?: number | null
  longitude?: number | null
  place_id?: string | null
  formatted_address?: string | null
}

/**
 * Address Repository
 */
export class AddressRepository extends BaseRepository<Address, AddressInsert, AddressUpdate> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'addresses')
  }

  /**
   * Validation hook for address data
   */
  protected async validate(data: AddressInsert | AddressUpdate): Promise<void> {
    if ('street' in data && data.street) {
      validateLength(data.street, 3, 200, 'street')
    }

    if ('city' in data && data.city) {
      validateLength(data.city, 2, 100, 'city')
    }

    if ('postal_code' in data && data.postal_code) {
      validateLength(data.postal_code, 2, 20, 'postal_code')
    }

    // Validate coordinates if provided
    if ('latitude' in data && data.latitude !== null && data.latitude !== undefined) {
      validateNumber(data.latitude, -90, 90, 'latitude')
    }

    if ('longitude' in data && data.longitude !== null && data.longitude !== undefined) {
      validateNumber(data.longitude, -180, 180, 'longitude')
    }

    // For insert, validate required fields
    if (this.isInsertData(data)) {
      validateRequired(data, ['street', 'postal_code', 'city', 'team_id'])
    }
  }

  /**
   * Type guard to check if data is for insert
   */
  private isInsertData(data: AddressInsert | AddressUpdate): data is AddressInsert {
    return 'street' in data && 'postal_code' in data && 'city' in data && 'team_id' in data
  }

  /**
   * Find address by place_id (Google Places unique ID)
   */
  async findByPlaceId(placeId: string, teamId: string): Promise<Address | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('place_id', placeId)
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      logger.error('Error finding address by place_id', { placeId, error })
      return null
    }

    return data
  }

  /**
   * Find addresses by team with optional filters
   */
  async findByTeam(
    teamId: string,
    options?: {
      city?: string
      hasCoordinates?: boolean
      limit?: number
    }
  ): Promise<Address[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('team_id', teamId)
      .is('deleted_at', null)

    if (options?.city) {
      query = query.ilike('city', `%${options.city}%`)
    }

    if (options?.hasCoordinates === true) {
      query = query.not('latitude', 'is', null)
    } else if (options?.hasCoordinates === false) {
      query = query.is('latitude', null)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      logger.error('Error finding addresses by team', { teamId, error })
      return []
    }

    return data || []
  }

  /**
   * Create address with geocoding data
   */
  async createWithGeocode(data: AddressWithGeocode): Promise<Address | null> {
    return this.create(data)
  }

  /**
   * Update geocoding data for an existing address
   */
  async updateGeocode(
    addressId: string,
    geocodeData: {
      latitude: number
      longitude: number
      place_id: string
      formatted_address: string
    }
  ): Promise<Address | null> {
    return this.update(addressId, geocodeData)
  }
}

// Factory functions
export function createAddressRepository(supabase: SupabaseClient): AddressRepository {
  return new AddressRepository(supabase)
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit lib/services/repositories/address.repository.ts
```

Expected: No errors

**Step 3: Commit**

```bash
git add lib/services/repositories/address.repository.ts
git commit -m "feat(repo): add address repository for centralized address storage"
```

---

### Task 3.2: Create Address Service

**Files:**
- Create: `lib/services/domain/address.service.ts`

**Step 1: Create the service file**

```typescript
/**
 * Address Service
 * Business logic for address management with Google Maps integration
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  AddressRepository,
  createAddressRepository,
  type Address,
  type AddressInsert,
  type AddressWithGeocode
} from '../repositories/address.repository'
import { logger } from '@/lib/logger'
import { createSuccessResponse, createErrorResponse, type ServiceResponse } from '../core/error-handler'

/**
 * Address data from Google Places API
 */
export interface GooglePlaceAddress {
  street: string
  postalCode: string
  city: string
  country: string
  latitude: number
  longitude: number
  placeId: string
  formattedAddress: string
}

/**
 * Address Service
 */
export class AddressService {
  private repository: AddressRepository

  constructor(supabase: SupabaseClient) {
    this.repository = createAddressRepository(supabase)
  }

  /**
   * Create address from Google Places data
   */
  async createFromGooglePlace(
    googlePlace: GooglePlaceAddress,
    teamId: string
  ): Promise<ServiceResponse<Address>> {
    try {
      // Check if address already exists by place_id
      const existing = await this.repository.findByPlaceId(googlePlace.placeId, teamId)
      if (existing) {
        logger.debug('Address already exists', { placeId: googlePlace.placeId })
        return createSuccessResponse(existing)
      }

      // Map Google Place data to database format
      const addressData: AddressWithGeocode = {
        street: googlePlace.street,
        postal_code: googlePlace.postalCode,
        city: googlePlace.city,
        country: this.mapCountryToEnum(googlePlace.country),
        latitude: googlePlace.latitude,
        longitude: googlePlace.longitude,
        place_id: googlePlace.placeId,
        formatted_address: googlePlace.formattedAddress,
        team_id: teamId
      }

      const address = await this.repository.createWithGeocode(addressData)

      if (!address) {
        return createErrorResponse('Failed to create address')
      }

      logger.info('Address created from Google Place', {
        addressId: address.id,
        placeId: googlePlace.placeId
      })

      return createSuccessResponse(address)
    } catch (error) {
      logger.error('Error creating address from Google Place', { error, googlePlace })
      return createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Create address manually (without geocoding)
   */
  async createManual(
    data: {
      street: string
      postalCode: string
      city: string
      country: string
    },
    teamId: string
  ): Promise<ServiceResponse<Address>> {
    try {
      const addressData: AddressInsert = {
        street: data.street,
        postal_code: data.postalCode,
        city: data.city,
        country: this.mapCountryToEnum(data.country),
        team_id: teamId
      }

      const address = await this.repository.create(addressData)

      if (!address) {
        return createErrorResponse('Failed to create address')
      }

      return createSuccessResponse(address)
    } catch (error) {
      logger.error('Error creating manual address', { error, data })
      return createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Get address by ID
   */
  async getById(addressId: string): Promise<ServiceResponse<Address>> {
    try {
      const address = await this.repository.findById(addressId)

      if (!address) {
        return createErrorResponse('Address not found')
      }

      return createSuccessResponse(address)
    } catch (error) {
      logger.error('Error getting address', { error, addressId })
      return createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Update address geocoding data
   */
  async updateGeocode(
    addressId: string,
    geocodeData: {
      latitude: number
      longitude: number
      placeId: string
      formattedAddress: string
    }
  ): Promise<ServiceResponse<Address>> {
    try {
      const address = await this.repository.updateGeocode(addressId, {
        latitude: geocodeData.latitude,
        longitude: geocodeData.longitude,
        place_id: geocodeData.placeId,
        formatted_address: geocodeData.formattedAddress
      })

      if (!address) {
        return createErrorResponse('Failed to update address geocoding')
      }

      return createSuccessResponse(address)
    } catch (error) {
      logger.error('Error updating address geocoding', { error, addressId })
      return createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Map country name to database enum
   */
  private mapCountryToEnum(country: string): Database['public']['Enums']['country'] {
    const countryMap: Record<string, Database['public']['Enums']['country']> = {
      'Belgium': 'belgique',
      'Belgique': 'belgique',
      'France': 'france',
      'Luxembourg': 'luxembourg',
      'Netherlands': 'pays_bas',
      'Pays-Bas': 'pays_bas',
      'Germany': 'allemagne',
      'Allemagne': 'allemagne',
      'Switzerland': 'suisse',
      'Suisse': 'suisse'
    }

    return countryMap[country] || 'autre'
  }
}

// Need to import Database type
import type { Database } from '@/lib/database.types'

// Factory functions
export function createAddressService(supabase: SupabaseClient): AddressService {
  return new AddressService(supabase)
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit lib/services/domain/address.service.ts
```

Expected: No errors

**Step 3: Commit**

```bash
git add lib/services/domain/address.service.ts
git commit -m "feat(service): add address service with Google Places integration"
```

---

### Task 3.3: Export Services from Index

**Files:**
- Modify: `lib/services/index.ts`

**Step 1: Add exports**

Add to `lib/services/index.ts`:

```typescript
// Address Repository & Service
export { AddressRepository, createAddressRepository } from './repositories/address.repository'
export type { Address, AddressInsert, AddressUpdate, AddressWithGeocode } from './repositories/address.repository'

export { AddressService, createAddressService } from './domain/address.service'
export type { GooglePlaceAddress } from './domain/address.service'
```

**Step 2: Add factory function**

Add factory function for server actions:

```typescript
export async function createServerActionAddressService() {
  const supabase = await createServerActionSupabaseClient()
  return createAddressService(supabase)
}
```

**Step 3: Commit**

```bash
git add lib/services/index.ts
git commit -m "feat(services): export address repository and service"
```

---

## Phase 4: Google Maps React Components

### Task 4.1: Create Google Maps Provider

**Files:**
- Create: `components/google-maps/google-maps-provider.tsx`

**Step 1: Create the provider component**

```tsx
'use client'

import { APIProvider } from '@vis.gl/react-google-maps'
import { ReactNode } from 'react'

interface GoogleMapsProviderProps {
  children: ReactNode
}

/**
 * Google Maps API Provider
 * Wraps components that need access to Google Maps APIs
 *
 * Usage:
 * <GoogleMapsProvider>
 *   <AddressAutocompleteInput />
 *   <GoogleMapPreview />
 * </GoogleMapsProvider>
 */
export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.warn('Google Maps API key not configured')
    return <>{children}</>
  }

  return (
    <APIProvider
      apiKey={apiKey}
      solutionChannel="SEIDO_REAL_ESTATE"
    >
      {children}
    </APIProvider>
  )
}
```

**Step 2: Verify no TypeScript errors**

Run:
```bash
npx tsc --noEmit components/google-maps/google-maps-provider.tsx
```

**Step 3: Commit**

```bash
git add components/google-maps/google-maps-provider.tsx
git commit -m "feat(maps): add Google Maps API provider component"
```

---

### Task 4.2: Create Address Autocomplete Input

**Files:**
- Create: `components/google-maps/address-autocomplete-input.tsx`

**Step 1: Create the component**

```tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { Input } from '@/components/ui/input'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { MapPin, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Address data returned from Google Places
 */
export interface AddressData {
  street: string
  postalCode: string
  city: string
  country: string
  latitude: number
  longitude: number
  placeId: string
  formattedAddress: string
}

interface AddressAutocompleteInputProps {
  onAddressSelect: (address: AddressData) => void
  defaultValue?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * Address Autocomplete Input using Google Places API (New)
 *
 * Features:
 * - Real-time suggestions with debounce (300ms)
 * - Geographic bias for BE/FR/LU/NL
 * - Session tokens for billing optimization
 * - Automatic address component parsing
 */
export function AddressAutocompleteInput({
  onAddressSelect,
  defaultValue = '',
  placeholder = 'Rechercher une adresse...',
  disabled = false,
  className
}: AddressAutocompleteInputProps) {
  const places = useMapsLibrary('places')

  const [inputValue, setInputValue] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Session token for billing optimization
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)

  // Create new session token on mount
  useEffect(() => {
    if (places && window.google?.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
    }
  }, [places])

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback(async (input: string) => {
    if (!places || !window.google?.maps?.places?.AutocompleteSuggestion || input.length < 3) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      const request: google.maps.places.AutocompleteRequest = {
        input,
        includedRegionCodes: ['BE', 'FR', 'LU', 'NL'],
        language: 'fr'
      }

      // Add session token if available
      if (sessionTokenRef.current) {
        request.sessionToken = sessionTokenRef.current
      }

      const { suggestions: results } = await google.maps.places.AutocompleteSuggestion
        .fetchAutocompleteSuggestions(request)

      setSuggestions(results || [])
      setIsOpen((results || []).length > 0)
    } catch (error) {
      console.error('Autocomplete error:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [places])

  // Debounce input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue.length >= 3) {
        fetchSuggestions(inputValue)
      } else {
        setSuggestions([])
        setIsOpen(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [inputValue, fetchSuggestions])

  // Handle suggestion selection
  const handleSelect = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!suggestion.placePrediction) return

    setIsLoading(true)
    try {
      const place = suggestion.placePrediction.toPlace()
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'addressComponents']
      })

      // Parse address components
      const addressData = parseAddressComponents(place)

      setInputValue(place.formattedAddress || '')
      setIsOpen(false)
      setSuggestions([])
      onAddressSelect(addressData)

      // Create new session token after selection (billing optimization)
      if (window.google?.maps?.places?.AutocompleteSessionToken) {
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
      }
    } catch (error) {
      console.error('Place details error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Check if Places API is available
  const isPlacesAvailable = places && typeof window !== 'undefined' && window.google?.maps?.places

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={cn('relative', className)}>
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || !isPlacesAvailable}
            className="pl-10 pr-10"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>

      {suggestions.length > 0 && (
        <PopoverContent
          className="p-0 w-[var(--radix-popover-trigger-width)]"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              <CommandEmpty>Aucune adresse trouvée</CommandEmpty>
              <CommandGroup>
                {suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={index}
                    onSelect={() => handleSelect(suggestion)}
                    className="cursor-pointer"
                  >
                    <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-medium truncate">
                        {suggestion.placePrediction?.mainText?.text}
                      </span>
                      <span className="text-sm text-muted-foreground truncate">
                        {suggestion.placePrediction?.secondaryText?.text}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  )
}

/**
 * Parse Google Place address components into structured data
 */
function parseAddressComponents(place: google.maps.places.Place): AddressData {
  const components = place.addressComponents || []

  const getComponent = (type: string): string => {
    const component = components.find(c => c.types.includes(type))
    return component?.longText || ''
  }

  const streetNumber = getComponent('street_number')
  const route = getComponent('route')
  const street = route ? `${route}${streetNumber ? ` ${streetNumber}` : ''}` : ''

  return {
    street: street.trim(),
    postalCode: getComponent('postal_code'),
    city: getComponent('locality') || getComponent('administrative_area_level_2') || getComponent('sublocality'),
    country: getComponent('country'),
    latitude: place.location?.lat() || 0,
    longitude: place.location?.lng() || 0,
    placeId: place.id || '',
    formattedAddress: place.formattedAddress || ''
  }
}
```

**Step 2: Verify no TypeScript errors**

Run:
```bash
npx tsc --noEmit components/google-maps/address-autocomplete-input.tsx
```

**Step 3: Commit**

```bash
git add components/google-maps/address-autocomplete-input.tsx
git commit -m "feat(maps): add address autocomplete input with Places API"
```

---

### Task 4.3: Create Google Map Preview

**Files:**
- Create: `components/google-maps/google-map-preview.tsx`

**Step 1: Create the component**

```tsx
'use client'

import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface GoogleMapPreviewProps {
  latitude: number
  longitude: number
  address?: string
  height?: number
  className?: string
  showOpenButton?: boolean
}

/**
 * Google Map Preview Component
 *
 * Displays an interactive map with a marker at the specified coordinates.
 * Includes an optional button to open the location in Google Maps.
 */
export function GoogleMapPreview({
  latitude,
  longitude,
  address,
  height = 200,
  className,
  showOpenButton = true
}: GoogleMapPreviewProps) {
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || 'DEMO_MAP_ID'
  const position = { lat: latitude, lng: longitude }

  const openInGoogleMaps = () => {
    const query = address
      ? encodeURIComponent(address)
      : `${latitude},${longitude}`
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  // Don't render if no valid coordinates
  if (!latitude || !longitude || (latitude === 0 && longitude === 0)) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Map
        style={{ width: '100%', height }}
        defaultCenter={position}
        defaultZoom={16}
        mapId={mapId}
        disableDefaultUI
        gestureHandling="cooperative"
        className="rounded-lg overflow-hidden border"
      >
        <AdvancedMarker position={position} title={address}>
          <Pin
            background="#6366f1"
            glyphColor="#ffffff"
            borderColor="#4f46e5"
          />
        </AdvancedMarker>
      </Map>

      {showOpenButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={openInGoogleMaps}
          className="w-full"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Ouvrir dans Google Maps
        </Button>
      )}
    </div>
  )
}
```

**Step 2: Verify no TypeScript errors**

Run:
```bash
npx tsc --noEmit components/google-maps/google-map-preview.tsx
```

**Step 3: Commit**

```bash
git add components/google-maps/google-map-preview.tsx
git commit -m "feat(maps): add Google Map preview component with marker"
```

---

### Task 4.4: Create Index Export

**Files:**
- Create: `components/google-maps/index.ts`

**Step 1: Create the index file**

```typescript
// Google Maps Components
export { GoogleMapsProvider } from './google-maps-provider'
export { AddressAutocompleteInput, type AddressData } from './address-autocomplete-input'
export { GoogleMapPreview } from './google-map-preview'
```

**Step 2: Commit**

```bash
git add components/google-maps/index.ts
git commit -m "feat(maps): add google-maps components index export"
```

---

## Phase 5: Form Integration

### Task 5.1: Update BuildingInfoForm with Address Autocomplete

**Files:**
- Modify: `components/building-info-form.tsx`

**Step 1: Add imports**

Add at the top of the file:

```typescript
import { AddressAutocompleteInput, type AddressData } from '@/components/google-maps'
import { GoogleMapPreview } from '@/components/google-maps'
```

**Step 2: Add state for selected address**

Add inside the component, after existing state:

```typescript
// Google Maps address state
const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null)
```

**Step 3: Add interface extension**

Update `BuildingInfo` interface:

```typescript
interface BuildingInfo {
  name: string
  address: string
  postalCode: string
  city: string
  country: string
  description: string
  floor?: string
  doorNumber?: string
  category?: LotCategory
  // Google Maps geocoding data
  latitude?: number
  longitude?: number
  placeId?: string
  formattedAddress?: string
}
```

**Step 4: Add address selection handler**

Add handler function inside the component:

```typescript
const handleAddressSelect = (address: AddressData) => {
  setSelectedAddress(address)

  // Auto-fill form fields
  setBuildingInfo({
    ...buildingInfo,
    address: address.street,
    postalCode: address.postalCode,
    city: address.city,
    country: mapGoogleCountryToLocal(address.country),
    latitude: address.latitude,
    longitude: address.longitude,
    placeId: address.placeId,
    formattedAddress: address.formattedAddress
  })
}

// Helper to map Google country names to local country names
const mapGoogleCountryToLocal = (googleCountry: string): string => {
  const countryMap: Record<string, string> = {
    'Belgium': 'Belgique',
    'France': 'France',
    'Luxembourg': 'Luxembourg',
    'Netherlands': 'Pays-Bas',
    'Germany': 'Allemagne'
  }
  return countryMap[googleCountry] || googleCountry
}
```

**Step 5: Add autocomplete input in JSX**

Add before the existing address fields in `showAddressSection`:

```tsx
{showAddressSection && (
  <>
    {/* Google Maps Address Autocomplete */}
    <div>
      <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <MapPin className="w-4 h-4" />
        Rechercher une adresse
      </Label>
      <AddressAutocompleteInput
        onAddressSelect={handleAddressSelect}
        defaultValue={buildingInfo.formattedAddress || ''}
        placeholder="Commencez à taper une adresse..."
        className="mt-1"
      />
      <p className="text-xs text-gray-500 mt-1">
        Utilisez la recherche Google pour remplir automatiquement l'adresse
      </p>
    </div>

    {/* Map Preview */}
    {selectedAddress && selectedAddress.latitude !== 0 && (
      <div className="rounded-lg border p-4 bg-gray-50">
        <p className="text-sm font-medium mb-2">Aperçu de l'emplacement</p>
        <GoogleMapPreview
          latitude={selectedAddress.latitude}
          longitude={selectedAddress.longitude}
          address={selectedAddress.formattedAddress}
          height={180}
        />
      </div>
    )}

    {/* Existing address fields below... */}
    <div>
      <Label htmlFor="address" className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <MapPin className="w-4 h-4" />
        Rue et numéro*
      </Label>
      {/* ... rest of existing code */}
```

**Step 6: Verify no TypeScript errors**

Run:
```bash
npx tsc --noEmit components/building-info-form.tsx
```

**Step 7: Commit**

```bash
git add components/building-info-form.tsx
git commit -m "feat(form): integrate address autocomplete in building info form"
```

---

### Task 5.2: Wrap Building Creation Page with GoogleMapsProvider

**Files:**
- Modify: `app/gestionnaire/(no-navbar)/biens/immeubles/nouveau/page.tsx` or layout

**Step 1: Identify the correct file**

Check if there's a layout file or wrap in page directly.

**Step 2: Add GoogleMapsProvider wrapper**

Wrap the form content:

```tsx
import { GoogleMapsProvider } from '@/components/google-maps'

// In the component return:
<GoogleMapsProvider>
  <BuildingCreationForm ... />
</GoogleMapsProvider>
```

**Step 3: Commit**

```bash
git add app/gestionnaire/\(no-navbar\)/biens/immeubles/nouveau/
git commit -m "feat(pages): wrap building creation with GoogleMapsProvider"
```

---

### Task 5.3: Update Building Actions to Save Address

**Files:**
- Modify: `app/actions/building-actions.ts`
- Modify: `lib/services/domain/composite.service.ts` (if needed)

**Step 1: Update CreateCompletePropertyData type**

Ensure the type includes geocoding fields:

```typescript
interface BuildingData {
  // ... existing fields
  latitude?: number
  longitude?: number
  place_id?: string
  formatted_address?: string
}
```

**Step 2: Update createCompleteProperty action**

Add logic to create address record and link to building:

```typescript
// In createCompleteProperty:
// 1. If geocoding data provided, create address first
// 2. Add address_id to building data
// 3. Create building with address_id
```

**Step 3: Commit**

```bash
git add app/actions/building-actions.ts lib/services/domain/composite.service.ts
git commit -m "feat(actions): save address with geocoding in property creation"
```

---

## Phase 6: Display Maps on Detail Pages

### Task 6.1: Add Map to Building Detail Page

**Files:**
- Modify: `app/gestionnaire/biens/immeubles/[id]/page.tsx`

**Step 1: Fetch address with building**

Update the query to include address relation.

**Step 2: Add GoogleMapPreview component**

```tsx
import { GoogleMapsProvider, GoogleMapPreview } from '@/components/google-maps'

// In the component:
{building.address?.latitude && building.address?.longitude && (
  <GoogleMapsProvider>
    <Card>
      <CardHeader>
        <CardTitle>Localisation</CardTitle>
      </CardHeader>
      <CardContent>
        <GoogleMapPreview
          latitude={building.address.latitude}
          longitude={building.address.longitude}
          address={building.address.formatted_address}
          height={250}
        />
      </CardContent>
    </Card>
  </GoogleMapsProvider>
)}
```

**Step 3: Commit**

```bash
git add app/gestionnaire/biens/immeubles/\[id\]/
git commit -m "feat(pages): display map on building detail page"
```

---

### Task 6.2: Add Map to Lot Detail Page

**Files:**
- Modify: `app/gestionnaire/biens/lots/[id]/page.tsx`

**Step 1: Similar to Task 6.1**

Add GoogleMapPreview for lots with address.

**Step 2: Commit**

```bash
git add app/gestionnaire/biens/lots/\[id\]/
git commit -m "feat(pages): display map on lot detail page"
```

---

### Task 6.3: Add Map to Intervention Detail Page

**Files:**
- Modify: `app/gestionnaire/interventions/[id]/page.tsx`

**Step 1: Get address from lot or building**

Intervention → Lot → Address (or Building → Address)

**Step 2: Display map**

```tsx
{interventionAddress && (
  <GoogleMapsProvider>
    <GoogleMapPreview
      latitude={interventionAddress.latitude}
      longitude={interventionAddress.longitude}
      address={interventionAddress.formatted_address}
    />
  </GoogleMapsProvider>
)}
```

**Step 3: Commit**

```bash
git add app/gestionnaire/interventions/\[id\]/
git commit -m "feat(pages): display location map on intervention detail"
```

---

## Phase 7: Final Verification

### Task 7.1: Run TypeScript Check

**Step 1: Full type check**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors

### Task 7.2: Run ESLint

**Step 1: Lint check**

Run:
```bash
npm run lint
```

Expected: No errors

### Task 7.3: Manual Testing Checklist

- [ ] API key configured in `.env.local`
- [ ] Building creation form shows address autocomplete
- [ ] Suggestions appear when typing address
- [ ] Selecting suggestion fills form fields
- [ ] Map preview appears after selection
- [ ] Building detail page shows map (if geocoded)
- [ ] Lot detail page shows map (if geocoded)
- [ ] Intervention detail page shows location map

### Task 7.4: Final Commit

```bash
git add .
git commit -m "feat(maps): complete Google Maps integration for addresses"
```

---

## Summary

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| 1. Infrastructure | 2 tasks | 30 min |
| 2. Database | 3 tasks | 45 min |
| 3. Services | 3 tasks | 1 hour |
| 4. Components | 4 tasks | 1.5 hours |
| 5. Form Integration | 3 tasks | 1.5 hours |
| 6. Detail Pages | 3 tasks | 1 hour |
| 7. Verification | 4 tasks | 30 min |
| **Total** | **22 tasks** | **~7 hours** |

---

## User Action Required

Before starting implementation:

1. **Google Cloud Console Setup:**
   - Enable "Maps JavaScript API"
   - Enable "Places API (New)"
   - Create API key with HTTP referrer restrictions
   - Create Map ID for Advanced Markers

2. **Environment Variables:**
   - Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env.local`
   - Add `NEXT_PUBLIC_GOOGLE_MAP_ID` to `.env.local`
