# SEIDO Gestionnaire UI Patterns Analysis - Contracts Feature Specifications

## Executive Summary

Based on comprehensive analysis of the SEIDO gestionnaire section, I have identified all UI patterns, components, and design system conventions. This document provides complete specifications for building the Contracts feature following the exact same patterns used across Biens, Contacts, and Interventions sections.

---

## Table of Contents

1. [Design System Foundations](#1-design-system-foundations)
2. [Page Layout Patterns](#2-page-layout-patterns)
3. [Navigator Component Pattern](#3-navigator-component-pattern)
4. [shadcn/ui Components Catalog](#4-shadcnui-components-catalog)
5. [Table Configuration Pattern](#5-table-configuration-pattern)
6. [Responsive Design Patterns](#6-responsive-design-patterns)
7. [Accessibility Requirements](#7-accessibility-requirements-wcag-21-aa)
8. [Contracts Feature Specifications](#8-contracts-feature---complete-specifications)
9. [Implementation Checklist](#9-implementation-checklist)
10. [Summary](#10-summary)

---

## 1. DESIGN SYSTEM FOUNDATIONS

### 1.1 CSS Variables & Design Tokens (globals.css)

**Content Max Width**
```css
--content-max-width: 96rem; /* 1280px - Tailwind max-w-7xl */
```

**Scrollbar System**
```css
--scrollbar-track-width: 12px;
--scrollbar-thumb-spacing: 3px;
--scrollbar-border-radius: 8px;
--scrollbar-track: rgb(243 244 246); /* gray-100 */
--scrollbar-thumb: rgb(59 130 246); /* blue-500 */
--scrollbar-thumb-hover: rgb(37 99 235); /* blue-600 */
```

**Dashboard Spacing (Material Design 3)**
```css
--dashboard-padding-x-mobile: 1.25rem;  /* 20px - Tailwind px-5 */
--dashboard-padding-x-tablet: 1.5rem;   /* 24px - Tailwind px-6 */
--dashboard-padding-x-desktop: 2.5rem;  /* 40px - Tailwind px-10 */
--dashboard-padding-y: 1.5rem;          /* 24px - Tailwind py-6 */
--dashboard-section-gap: 2rem;          /* 32px - Tailwind gap-8 */
```

**Header System**
```css
--header-height-mobile: 3.5rem;   /* 56px - h-14 */
--header-height-desktop: 4rem;    /* 64px - h-16 */
--header-touch-target: 2.75rem;   /* 44px minimum */
```

**Typography**
- Primary Font: `Inter` (interface)
- Editorial: `Merriweather` (marketing, help text)
- Monospace: `JetBrains Mono` (technical, IDs, codes)

**Color System (OKLCH)**
- Primary: `oklch(0.5854 0.2041 277.1173)` - Blue #2563eb
- Secondary: `oklch(0.9276 0.0058 264.5313)` - Darker blue
- Destructive: `oklch(0.6368 0.2078 25.3313)` - Red #ef4444
- Border: `oklch(0.8717 0.0093 258.3382)` - Gray #d1d5db

### 1.2 Utility Classes

**Layout Classes**
```css
.layout-padding          /* px-5 sm:px-6 lg:px-10 py-4 */
.content-max-width       /* max-w-[96rem] mx-auto w-full */
.layout-container        /* Combined padding + max-width */
```

**Scrollbar Classes**
```css
.scrollbar-hide          /* Hide scrollbar completely */
.scrollbar-thin          /* Thin scrollbar with custom colors */
```

**Sticky Footer**
```css
.sticky-footer-base      /* Base styles without margins */
.sticky-footer-full-width /* Negative margins for full width */
.sticky-footer           /* Complete sticky footer */
```

### 1.3 Responsive Breakpoints
```
Mobile:  320px - 767px   (default)
Tablet:  768px - 1023px  (sm:)
Desktop: 1024px+         (lg:)
2xl:     1400px+         (2xl:)
```

---

## 2. PAGE LAYOUT PATTERNS

### 2.1 List Page Pattern (Biens, Contacts)

**File Structure:**
```
app/gestionnaire/(with-navbar)/
  └── [section]/
      ├── page.tsx              (Server Component)
      └── [section]-page-client.tsx (Client Component)
```

**Server Component (page.tsx)**
```typescript
import { getServerAuthContext } from '@/lib/server-context'
import { create[Section]Service } from '@/lib/services'

export default async function [Section]Page() {
  // 1. Centralized Auth + Team (1 line, cached)
  const { user, team } = await getServerAuthContext('gestionnaire')

  // 2. Load data server-side
  const service = await create[Section]Service()
  const result = await service.getByTeam(team.id)

  // 3. Pass to Client Component
  return (
    <[Section]PageClient
      initialData={result.data}
      teamId={team.id}
    />
  )
}
```

**Client Component ([section]-page-client.tsx)**
```typescript
"use client"

export function [Section]PageClient({ initialData, teamId }) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)

  return (
    <div className="h-full flex flex-col overflow-hidden layout-container">
      <div className="content-max-width flex flex-col flex-1 min-h-0 overflow-hidden">

        {/* Page Header */}
        <div className="mb-4 lg:mb-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl mb-2">
              [Title]
            </h1>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline">
                <Plus className="h-4 w-4" />
                <span>[Action]</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Card Wrapper */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="bg-card rounded-lg border border-border shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 p-4">

              {/* Navigator Component */}
              <[Section]Navigator
                data={data}
                loading={loading}
                onRefresh={handleRefresh}
                className="bg-transparent border-0 shadow-none flex-1 flex flex-col min-h-0"
              />

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
```

**Key Layout Classes:**
- Outer container: `h-full flex flex-col overflow-hidden layout-container`
- Content wrapper: `content-max-width flex flex-col flex-1 min-h-0 overflow-hidden`
- Header section: `mb-4 lg:mb-6 flex-shrink-0`
- Card wrapper: `flex-1 flex flex-col min-h-0`
- Card: `bg-card rounded-lg border border-border shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden`
- Padding layer: `flex-1 flex flex-col min-h-0 p-4`

### 2.2 Detail Page Pattern (Building Details, Lot Details)

**File Structure:**
```
app/gestionnaire/(no-navbar)/
  └── [section]/
      └── [id]/
          ├── page.tsx                    (Server Component)
          └── [section]-details-client.tsx (Client Component)
```

**Server Component Pattern:**
```typescript
export default async function [Section]DetailPage({ params }) {
  const { id } = await params

  // 1. Auth + Team
  const { team } = await getServerAuthContext('gestionnaire')

  // 2. Load all data server-side (parallel where possible)
  const service = await create[Section]Service()
  const result = await service.getById(id)

  if (!result.success) notFound()

  // 3. Load related data
  const relatedData = await Promise.all([
    loadRelation1(id),
    loadRelation2(id),
  ])

  // 4. Pass to Client Component
  return (
    <[Section]DetailsClient
      item={result.data}
      relatedData={relatedData}
      teamId={team.id}
    />
  )
}
```

**Client Component with DetailPageHeader:**
```typescript
"use client"

import { DetailPageHeader } from '@/components/ui/detail-page-header'

export default function [Section]DetailsClient({ item, teamId }) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">

      {/* Sticky Header */}
      <DetailPageHeader
        title={item.name}
        subtitle={item.description}
        onBack={() => router.back()}
        hasGlobalNav={false}

        badges={[
          {
            label: 'Active',
            color: 'bg-green-100 text-green-800 border-green-200',
            dotColor: 'bg-green-500'
          }
        ]}

        metadata={[
          { icon: MapPin, text: item.address },
          { icon: Calendar, text: formatDate(item.created_at) }
        ]}

        primaryActions={[
          {
            label: 'Modifier',
            icon: Edit,
            onClick: handleEdit,
            variant: 'default'
          }
        ]}

        dropdownActions={[
          { label: 'Archiver', icon: Archive, onClick: handleArchive },
          { label: 'Supprimer', icon: Trash, onClick: handleDelete }
        ]}
      />

      {/* Content */}
      <main className="content-max-width px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs, Cards, etc. */}
      </main>

    </div>
  )
}
```

**DetailPageHeader Configuration:**
```typescript
interface DetailPageHeaderProps {
  // Navigation
  onBack: () => void
  backButtonText?: string // Default: 'Retour'

  // Content
  title: string
  subtitle?: string

  // Badges (status, urgency, etc.)
  badges?: DetailPageHeaderBadge[]

  // Metadata (building, date, user, etc.)
  metadata?: DetailPageHeaderMetadata[]

  // Actions
  primaryActions?: DetailPageHeaderAction[]
  dropdownActions?: DetailPageHeaderAction[]
  actionButtons?: React.ReactNode // Custom override

  // Status indicator (optional alert/warning banner)
  statusIndicator?: {
    message: string
    variant: 'info' | 'warning' | 'error' | 'success'
  }

  // Layout
  hasGlobalNav?: boolean // top-16 vs top-0
}
```

### 2.3 Creation Form Pattern (Multi-Step)

**File Structure:**
```
app/gestionnaire/(no-navbar)/
  └── [section]/
      └── nouveau/
          ├── page.tsx    (Server Component - minimal)
          └── [section]-creation-client.tsx (Client Component)
```

**Using StepProgressHeader:**
```typescript
"use client"

import { StepProgressHeader } from '@/components/ui/step-progress-header'
import { lotSteps } from '@/lib/step-configurations'

export default function [Section]CreationClient() {
  const [currentStep, setCurrentStep] = useState(1)

  return (
    <div className="min-h-screen bg-background">

      {/* Sticky Multi-Step Header */}
      <StepProgressHeader
        title="Nouveau [Section]"
        subtitle="Créer un nouveau [section]"
        onBack={() => router.back()}
        steps={lotSteps} // Array of { icon, label }
        currentStep={currentStep}
        hasGlobalNav={false}
      />

      {/* Form Content */}
      <main className="content-max-width px-4 sm:px-6 lg:px-8 py-8">
        {currentStep === 1 && <Step1Component />}
        {currentStep === 2 && <Step2Component />}
        {/* ... */}
      </main>

      {/* Sticky Footer with Navigation */}
      <div className="sticky-footer">
        <div className="content-max-width flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4" />
            Précédent
          </Button>

          <Button onClick={handleNext}>
            {currentStep === totalSteps ? 'Créer' : 'Suivant'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

    </div>
  )
}
```

**Step Configuration Format:**
```typescript
// lib/step-configurations.ts
export const contractSteps: StepConfig[] = [
  { icon: FileText, label: 'Informations' },
  { icon: Users, label: 'Parties' },
  { icon: Calendar, label: 'Dates' },
  { icon: Check, label: 'Confirmation' }
]
```

---

## 3. NAVIGATOR COMPONENT PATTERN

### 3.1 BEM Component Structure

**Pattern from PatrimoineNavigator:**
```typescript
// Block: patrimoine-section
// Elements: __content, __tabs, __tab, __controls, __search, __filter-btn,
//           __view-switcher, __view-btn, __data
// Modifiers: __tab--active, __view-btn--active

export function [Section]Navigator({ data, loading, onRefresh, className }) {
  const [activeTab, setActiveTab] = useState<'type1' | 'type2'>('type1')
  const [searchTerm, setSearchTerm] = useState('')
  const { viewMode, setViewMode, mounted } = useViewMode({
    defaultMode: 'cards',
    syncWithUrl: false
  })

  // BEM Classes
  const blockClass = cn(
    "[section]-section",
    "flex-1 min-h-0 flex flex-col overflow-hidden",
    "border border-slate-200 rounded-lg shadow-sm bg-white",
    className
  )

  return (
    <div className={blockClass}>
      <div className="[section]-section__content p-4 space-y-4 flex-1 flex flex-col min-h-0">

        {/* Header with Tabs + Search + View Toggle */}
        <div className="[section]-section__header flex items-center justify-between gap-4">

          {/* Tabs */}
          <div className="[section]-section__tabs inline-flex h-10 bg-slate-100 rounded-md p-1">
            <button className={getTabClass(activeTab === 'type1')}>
              <Icon className="h-4 w-4 mr-2" />
              Type 1
              <span className={getTabBadgeClass(activeTab === 'type1')}>
                {count}
              </span>
            </button>
          </div>

          {/* Search + Filters + View Toggle */}
          <div className="[section]-section__controls flex items-center gap-2 flex-1">
            <Button variant="outline" size="sm" className="h-10 w-10 p-0">
              <Filter className="h-4 w-4" />
            </Button>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            {mounted && (
              <div className="[section]-section__view-switcher inline-flex h-10 bg-slate-100 rounded-md p-1">
                <button className={getViewBtnClass(viewMode === 'cards')}>
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button className={getViewBtnClass(viewMode === 'list')}>
                  <List className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Data Display */}
        <div className="[section]-section__data flex-1 mt-4 overflow-y-auto">
          {viewMode === 'list' ? (
            <DataTable data={filteredData} columns={config.columns} />
          ) : (
            <DataCards data={filteredData} CardComponent={CardComponent} />
          )}
        </div>

      </div>
    </div>
  )
}
```

### 3.2 BEM Class Naming Convention

**Tab Classes:**
```typescript
const getTabClass = (isActive: boolean) => cn(
  "patrimoine-section__tab",
  "inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
  isActive
    ? "patrimoine-section__tab--active bg-white text-sky-600 shadow-sm"
    : "text-slate-600 hover:bg-slate-200/60"
)

const getTabBadgeClass = (isActive: boolean) => cn(
  "patrimoine-section__tab-badge",
  "ml-2 text-xs px-2 py-0.5 rounded",
  isActive ? "bg-sky-100 text-sky-800" : "bg-slate-200 text-slate-700"
)
```

**View Button Classes:**
```typescript
const getViewBtnClass = (isActive: boolean) => cn(
  "patrimoine-section__view-btn",
  "inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
  isActive
    ? "patrimoine-section__view-btn--active bg-white text-slate-900 shadow-sm"
    : "text-slate-600 hover:bg-slate-200/60"
)
```

---

## 4. SHADCN/UI COMPONENTS CATALOG

### 4.1 Available Components (50+)

**Layout & Structure:**
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `CardAction`
- `Separator`
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `ScrollArea`
- `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`
- `Collapsible`
- `ResizablePanels`

**Navigation:**
- `NavigationMenu`
- `Breadcrumb`
- `Pagination`
- `Sidebar`

**Form Components:**
- `Input`, `Textarea`
- `Button` (variants: default, destructive, outline, outlined-danger, secondary, tonal, ghost, link)
- `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`
- `Checkbox`, `RadioGroup`, `RadioGroupItem`
- `Switch`, `Slider`
- `Label`, `Form`
- `Calendar`, `DatePicker`, `DateTimePicker`, `TimePicker24h`
- `InputOTP`

**Feedback:**
- `Alert`, `AlertDialog`, `AlertDescription`
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`
- `Sheet`
- `Toast`, `Toaster`, `Sonner`
- `Progress`, `Skeleton`
- `HoverCard`, `Tooltip`, `Popover`
- `Badge`

**Data Display:**
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`
- `Avatar`, `AvatarImage`, `AvatarFallback`
- `Chart`

**Actions:**
- `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`
- `ContextMenu`
- `Menubar`
- `Command`
- `Toggle`, `ToggleGroup`

**Custom SEIDO Components:**
- `StepProgressHeader` - Multi-step form header
- `DetailPageHeader` - Detail page sticky header
- `BuildingContactCardV3` - Contact card for buildings
- `LotContactCardV4` - Contact card for lots
- `LotCategorySelector` - Category picker
- `CompanySelector` - Company search/select
- `ContactSelector` - Contact picker with search
- `DateTimePicker` - Date + time combined
- `FileUploader` - File upload with preview
- `StatCard` - Dashboard statistics card

### 4.2 Card Component Pattern

**Anatomy:**
```typescript
<Card className="bg-card text-card-foreground rounded-xl border shadow-sm">
  <CardHeader className="grid grid-rows-[auto_auto] gap-1.5">
    <CardTitle className="leading-none font-semibold">Title</CardTitle>
    <CardDescription className="text-muted-foreground text-sm">
      Description
    </CardDescription>
    <CardAction className="col-start-2 row-span-2 self-start justify-self-end">
      <Button>Action</Button>
    </CardAction>
  </CardHeader>

  <CardContent className="px-6">
    {/* Content */}
  </CardContent>

  <CardFooter className="px-6">
    {/* Footer actions */}
  </CardFooter>
</Card>
```

**Key Classes:**
- Card: `rounded-xl border p-6 shadow-sm min-w-0 w-full`
- Header: Grid layout with auto action placement
- Content: `px-6` padding
- Footer: `px-6` padding, flex layout

### 4.3 Button Variants

```typescript
// Primary action
<Button variant="default">Action</Button>

// Secondary action
<Button variant="outline">Action</Button>

// Danger action (outlined)
<Button variant="outlined-danger">Supprimer</Button>

// Destructive (solid)
<Button variant="destructive">Delete</Button>

// Tonal (subtle emphasis)
<Button variant="tonal">Info</Button>

// Ghost (minimal)
<Button variant="ghost">Cancel</Button>

// With loading state
<Button isLoading={isPending} loadingText="Chargement...">
  Sauvegarder
</Button>
```

**Sizes:**
- `sm` - h-8, rounded-md, px-3
- `default` - h-9, px-4
- `lg` - h-10, rounded-md, px-6
- `icon` - size-9 (square)

---

## 5. TABLE CONFIGURATION PATTERN

### 5.1 Config File Structure

**Location:** `config/table-configs/[section].config.tsx`

```typescript
import type { DataTableConfig } from '@/components/data-navigator/types'

export interface [Section]Data {
  id: string
  name: string
  // ... fields
}

export const [section]TableConfig: DataTableConfig<[Section]Data> = {
  id: '[section]',
  name: '[Section Display Name]',

  // Columns for list view
  columns: [
    {
      id: 'name',
      header: 'Nom',
      accessorKey: 'name',
      sortable: true,
      className: 'font-medium',
      cell: (item) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
            <Icon className="h-4 w-4 text-sky-600" />
          </div>
          <span className="font-medium text-slate-900">{item.name}</span>
        </div>
      )
    },
    {
      id: 'status',
      header: 'Statut',
      width: '120px',
      cell: (item) => (
        <Badge className={getStatusClass(item.status)}>
          {item.status}
        </Badge>
      )
    },
    // ... more columns
  ],

  // Search configuration
  searchConfig: {
    placeholder: 'Rechercher par nom, référence...',
    searchableFields: ['name', 'reference', 'description']
  },

  // Filters
  filters: [
    {
      id: 'status',
      label: 'Statut',
      options: [
        { value: 'all', label: 'Tous' },
        { value: 'active', label: 'Actif' },
        { value: 'archived', label: 'Archivé' }
      ],
      defaultValue: 'all'
    }
  ],

  // Actions (row-level)
  actions: {
    view: (item) => `/gestionnaire/[section]/${item.id}`,
    edit: (item) => `/gestionnaire/[section]/${item.id}/modifier`,
    delete: async (item) => { /* ... */ }
  },

  // Card view component
  views: {
    card: {
      component: [Section]CardCompact,
      compact: true
    }
  },

  // Empty state
  emptyState: {
    title: 'Aucun [section]',
    description: 'Créez votre premier [section] pour commencer',
    action: {
      label: 'Créer un [section]',
      href: '/gestionnaire/[section]/nouveau'
    }
  }
}
```

### 5.2 Card Component for Grid View

**Pattern from BuildingCardCompact:**
```typescript
interface [Section]CardCompactProps {
  item: [Section]Data
  onView?: (id: string) => void
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function [Section]CardCompact({
  item,
  onView,
  onEdit,
  onDelete
}: [Section]CardCompactProps) {
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
              <Icon className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <CardTitle className="text-base">{item.name}</CardTitle>
              <CardDescription className="text-sm">
                {item.description}
              </CardDescription>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView?.(item.id)}>
                <Eye className="h-4 w-4 mr-2" />
                Voir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(item.id)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete?.(item.id)}>
                <Trash className="h-4 w-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Metadata */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1 text-slate-600">
            <Icon className="h-3 w-3" />
            <span>{item.field1}</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600">
            <Icon className="h-3 w-3" />
            <span>{item.field2}</span>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          <Badge variant="secondary" className={getStatusClass(item.status)}>
            {item.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 6. RESPONSIVE DESIGN PATTERNS

### 6.1 Header Responsive Behavior

**Mobile (< 640px):**
- Logo: 32px × 32px
- Back button: Icon only, text hidden
- Title: text-base (16px)
- Actions: Icon only buttons
- Metadata: Hidden

**Tablet (640px - 1024px):**
- Back button: Icon + text visible
- Title: text-lg (18px)
- Badge labels: Visible
- Some metadata visible

**Desktop (1024px+):**
- Full layout with all elements
- Metadata fully visible
- Badge + button labels visible

**Implementation:**
```typescript
{/* Mobile: Icon only */}
<span className="hidden sm:inline">{backButtonText}</span>

{/* Desktop only */}
<div className="hidden lg:flex items-center gap-3">
  {metadata.map(...)}
</div>

{/* Responsive text size */}
<h1 className="text-base sm:text-lg font-semibold">
```

### 6.2 Grid Breakpoints

**Cards Grid:**
```typescript
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
```

**Statistics Cards:**
```typescript
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
```

**Form Columns:**
```typescript
className="grid grid-cols-1 md:grid-cols-2 gap-6"
```

### 6.3 Touch Targets (Mobile)

**Minimum Size:**
```css
@media (max-width: 768px) {
  button, a, [role="button"] {
    min-height: 44px;
    min-width: 44px;
  }
}
```

**Header Touch Target:**
```css
--header-touch-target: 2.75rem; /* 44px minimum */
```

---

## 7. ACCESSIBILITY REQUIREMENTS (WCAG 2.1 AA)

### 7.1 Color Contrast

**Minimum Ratios:**
- Normal text: 4.5:1
- Large text (18pt+): 3:1
- UI components: 3:1

**Implementation:**
```typescript
// Text on white background
text-slate-900  // #0f172a - 16.1:1 ratio ✓
text-slate-600  // #475569 - 7.1:1 ratio ✓

// Interactive states
focus-visible:ring-ring focus-visible:ring-[3px]
aria-invalid:ring-destructive/20
```

### 7.2 Keyboard Navigation

**Required Patterns:**
- Tab order follows visual flow
- All interactive elements focusable
- Focus indicators visible (ring-3px)
- Skip links for long lists
- Escape closes modals

**Implementation:**
```typescript
// Focus visible state
<Button className="focus-visible:ring-ring focus-visible:ring-[3px]">

// ARIA labels
<button aria-label="Retour au dashboard" title="Retour au dashboard">

// Keyboard handlers
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') handleAction()
  if (e.key === 'Escape') closeModal()
}}
```

### 7.3 Screen Reader Support

**ARIA Attributes:**
```typescript
// Loading states
<Button aria-busy={isLoading} aria-label="Chargement en cours">

// Invalid states
<Input aria-invalid={hasError} aria-describedby="error-message">

// Hidden content
<VisuallyHidden>Description for screen readers</VisuallyHidden>

// Live regions
<div role="status" aria-live="polite">
  {notification}
</div>
```

---

## 8. CONTRACTS FEATURE - COMPLETE SPECIFICATIONS

### 8.1 Database Schema (Assumed)

```sql
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Basic Information
  reference VARCHAR(255) NOT NULL UNIQUE,
  contract_type VARCHAR(50) NOT NULL, -- 'location', 'prestation', 'syndic', 'autre'
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'expired', 'terminated'

  -- Parties
  lot_id UUID REFERENCES lots(id) ON DELETE SET NULL,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES users(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES users(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,
  signature_date DATE,

  -- Financial
  monthly_rent DECIMAL(10, 2),
  charges DECIMAL(10, 2),
  deposit DECIMAL(10, 2),
  payment_day INTEGER, -- 1-31

  -- Documents
  document_url TEXT,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Indexes
CREATE INDEX idx_contracts_team ON contracts(team_id);
CREATE INDEX idx_contracts_lot ON contracts(lot_id);
CREATE INDEX idx_contracts_building ON contracts(building_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_type ON contracts(contract_type);
```

### 8.2 File Structure

```
app/gestionnaire/(with-navbar)/
  └── contrats/
      ├── page.tsx                      # Server Component
      └── contrats-page-client.tsx      # Client Component (List View)

app/gestionnaire/(no-navbar)/
  └── contrats/
      ├── nouveau/
      │   ├── page.tsx                  # Server Component (minimal)
      │   ├── contrat-creation-client.tsx
      │   └── actions.ts                # Server Actions
      └── [id]/
          ├── page.tsx                  # Server Component
          ├── contrat-details-client.tsx
          └── actions.ts

components/contrats/
  ├── contrats-navigator.tsx            # Navigator with tabs/search
  ├── contrat-card-compact.tsx          # Card view component
  └── contrat-form-steps/
      ├── step-1-info.tsx               # Contract info step
      ├── step-2-parties.tsx            # Parties selection
      ├── step-3-dates.tsx              # Dates and terms
      └── step-4-confirmation.tsx       # Review

config/table-configs/
  └── contrats.config.tsx               # Table configuration

lib/
  ├── step-configurations.ts            # Add contractSteps
  └── services/
      └── repositories/
          └── contract.repository.ts    # CRUD operations
```

### 8.3 List Page (contrats/page.tsx)

```typescript
// Server Component
import { getServerAuthContext } from '@/lib/server-context'
import { createServerContractRepository } from '@/lib/services/repositories/contract.repository'
import { ContratsPageClient } from './contrats-page-client'

export const dynamic = 'force-dynamic'

export default async function ContratsPage() {
  const { team } = await getServerAuthContext('gestionnaire')

  const contractRepo = await createServerContractRepository()
  const result = await contractRepo.findByTeam(team.id)

  return (
    <ContratsPageClient
      initialContracts={result.data || []}
      teamId={team.id}
    />
  )
}
```

### 8.4 List Page Client Component

```typescript
// Client Component
"use client"

import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ContratsNavigator } from "@/components/contrats/contrats-navigator"
import { useState } from "react"

interface ContratsPageClientProps {
  initialContracts: Contract[]
  teamId: string
}

export function ContratsPageClient({ initialContracts, teamId }: ContratsPageClientProps) {
  const router = useRouter()
  const [contracts, setContracts] = useState(initialContracts)
  const [loading, setLoading] = useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    router.refresh()
  }

  return (
    <div className="h-full flex flex-col overflow-hidden layout-container">
      <div className="content-max-width flex flex-col flex-1 min-h-0 overflow-hidden">

        {/* Page Header */}
        <div className="mb-4 lg:mb-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl mb-2">
                Contrats
              </h1>
              <p className="text-sm text-muted-foreground">
                Gérez les contrats de location, prestations et syndic
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                className="flex items-center space-x-2"
                onClick={() => router.push('/gestionnaire/contrats/nouveau')}
              >
                <Plus className="h-4 w-4" />
                <span>Nouveau contrat</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Card Wrapper */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="bg-card rounded-lg border border-border shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 p-4">

              <ContratsNavigator
                contracts={contracts}
                loading={loading}
                onRefresh={handleRefresh}
                className="bg-transparent border-0 shadow-none flex-1 flex flex-col min-h-0"
              />

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
```

### 8.5 Navigator Component (See Full Implementation in Section 3)

### 8.6 Table Configuration (See Full Implementation in Section 5)

### 8.7 Card Component (See Full Implementation in Section 5.2)

### 8.8 Creation Form - Multi-Step

```typescript
// lib/step-configurations.ts
import { FileText, Users, Calendar, Check } from 'lucide-react'

export const contractSteps: StepConfig[] = [
  { icon: FileText, label: 'Informations' },
  { icon: Users, label: 'Parties' },
  { icon: Calendar, label: 'Dates & Loyer' },
  { icon: Check, label: 'Confirmation' }
]
```

**See Section 2.3 for complete multi-step form pattern.**

### 8.9 Detail Page (See Section 2.2 for complete pattern)

---

## 9. IMPLEMENTATION CHECKLIST

### Phase 1: Database & Backend
- [ ] Create migration for `contracts` table
- [ ] Add RLS policies for multi-tenant isolation
- [ ] Create `contract.repository.ts` with CRUD operations
- [ ] Create Server Actions for mutations
- [ ] Add validation schemas with Zod

### Phase 2: List View
- [ ] Create `contrats/page.tsx` (Server Component)
- [ ] Create `contrats-page-client.tsx` (Client Component)
- [ ] Create `contrats-navigator.tsx` (Navigator with tabs)
- [ ] Create `contrat-card-compact.tsx` (Card view)
- [ ] Create `contrats.config.tsx` (Table configuration)

### Phase 3: Creation Form
- [ ] Create `nouveau/page.tsx` (Server Component)
- [ ] Create `contrat-creation-client.tsx` (Multi-step form)
- [ ] Create step components (Step1Info, Step2Parties, etc.)
- [ ] Add `contractSteps` to `step-configurations.ts`
- [ ] Implement Server Actions for creation

### Phase 4: Detail View
- [ ] Create `[id]/page.tsx` (Server Component)
- [ ] Create `contrat-details-client.tsx` (Detail page)
- [ ] Add tabs (Détails, Parties, Documents, Historique)
- [ ] Implement edit/delete actions

### Phase 5: Testing & Polish
- [ ] E2E tests for contract creation
- [ ] E2E tests for contract list/detail
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Responsive design testing
- [ ] Performance optimization

---

## 10. SUMMARY

This comprehensive UI specification document provides:

1. **Design System Foundations** - CSS variables, tokens, utility classes
2. **Page Layout Patterns** - Server/Client Component architecture for List, Detail, Creation
3. **Navigator Component Pattern** - BEM methodology, tabs, search, view modes
4. **shadcn/ui Components Catalog** - 50+ available components with usage examples
5. **Table Configuration Pattern** - Centralized data table config approach
6. **Responsive Design Patterns** - Mobile-first breakpoints and adaptations
7. **Accessibility Requirements** - WCAG 2.1 AA compliance guidelines
8. **Complete Contracts Feature Specs** - Database schema, file structure, all components
9. **Implementation Checklist** - Phase-by-phase delivery plan

**All patterns follow existing SEIDO conventions observed in Biens, Contacts, and Interventions sections. The Contracts feature can be built by replicating these exact patterns with contract-specific data models.**

---

**Document Version:** 1.0
**Last Updated:** 2025-12-04
**Author:** UI Designer Agent
**Status:** Ready for Implementation
