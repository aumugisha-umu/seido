# Property Preview Design - Comparison & Analysis

## 🎯 Objective

Rework the Lot and Building preview pages for property managers using the hybrid design pattern successfully implemented in the interventions preview system.

## 📊 Design Approach

### Architecture Pattern: Hybrid Layout

Following the intervention preview system, we've adopted a **sidebar + tabs + content** layout:

```
┌─────────────────────────────────────────┐
│  PropertySidebar  │  PropertyTabs       │
│  (Fixed 320px)    │  ┌───────────────┐  │
│                   │  │ Tab Navigation│  │
│  - Image/Icon     │  └───────────────┘  │
│  - Title          │                     │
│  - Address        │  Content Area       │
│  - Key Stats      │  (Scrollable)       │
│  - Contacts       │                     │
│                   │                     │
└─────────────────────────────────────────┘
```

## 🏗️ Components Created

### 1. Shared Components

#### `PropertySidebar`
**Location:** `components/properties/shared/sidebar/property-sidebar.tsx`

**Purpose:** Display property overview, key stats, and primary contacts

**Features:**
- Image/icon header with property type badge
- Title and address with map pin icon
- Grid of key statistics (2 columns)
- Contact list with avatars
- Scrollable content area

**Props:**
```typescript
{
  title: string
  subtitle: string
  type: 'lot' | 'building'
  image?: string
  stats: { label: string, value: string, icon: React.ElementType }[]
  contacts: { role: string, name: string, email?: string, phone?: string, avatar?: string }[]
}
```

#### `PropertyTabs`
**Location:** `components/properties/shared/layout/property-tabs.tsx`

**Purpose:** Flexible tab navigation system

**Features:**
- Dynamic tab configuration
- Icon + label display
- Responsive (icons only on mobile)
- Reuses shadcn/ui Tabs component

### 2. Card Components

#### `LotDetailsCard`
**Location:** `components/properties/shared/cards/lot-details-card.tsx`

**Displays:**
- Surface area (m²)
- Floor number
- Number of rooms
- Heating type
- Water heating
- Exposure (optional)
- Annexes (optional)

#### `BuildingDetailsCard`
**Location:** `components/properties/shared/cards/building-details-card.tsx`

**Displays:**
- Construction year
- Number of floors
- Number of lots
- Elevator (yes/no)
- Digicode (yes/no)
- Caretaker (yes/no)
- Heating type

#### `FinancialCard`
**Location:** `components/properties/shared/cards/financial-card.tsx`

**Displays:**
- Monthly rent (with charges)
- Current balance with status badge
- Next payment date
- Visual indicators for late/up-to-date status

### 3. Preview Components

#### `PreviewHybridLot`
**Location:** `components/properties/preview-designs/preview-hybrid-lot.tsx`

**Tabs:**
1. **Détails** - Characteristics and description
2. **Finances** - Rent, charges, balance
3. **Documents** - Lease, inventory, etc.
4. **Interventions** - Lot-specific interventions

#### `PreviewHybridBuilding`
**Location:** `components/properties/preview-designs/preview-hybrid-building.tsx`

**Tabs:**
1. **Détails** - Building information and notes
2. **Lots** - List/grid of all lots (placeholder)
3. **Documents** - Rules, maintenance logs
4. **Interventions** - Common area interventions

## 🎨 Design Decisions

### 1. Consistency with Interventions
- **Reused:** `PreviewHybridLayout`, `ContentWrapper` from interventions
- **Adapted:** Tab system to be more flexible (dynamic tab configuration)
- **Maintained:** Same spacing, colors, and interaction patterns

### 2. Information Hierarchy

**Sidebar (Always Visible):**
- Most critical info: Title, address, key metrics
- Quick access to primary contacts
- Visual identity (image or icon)

**Tabs (Contextual):**
- Detailed information organized by concern
- Reduces cognitive load
- Allows focused workflows

### 3. Visual Language

**Colors:**
- Slate for neutrals (consistent with app)
- Green for positive financial status
- Red for negative/late status
- Blue for primary actions

**Typography:**
- Bold titles for hierarchy
- Regular weight for data
- Muted colors for labels
- Mono for IDs/codes (if needed)

**Spacing:**
- 24px (6) between major sections
- 16px (4) between related items
- 8px (2) for tight groupings

## 📱 Responsive Behavior

### Desktop (1024px+)
- Sidebar visible (320px fixed)
- 2-column grid for cards
- Full tab labels

### Tablet (768px-1023px)
- Sidebar visible (280px)
- 1-column grid for cards
- Full tab labels

### Mobile (< 768px)
- Sidebar hidden (collapsible)
- 1-column layout
- Icon-only tabs

## ✅ Advantages of This Design

1. **Familiar Pattern:** Users already know this layout from interventions
2. **Efficient Space Use:** Sidebar for overview, tabs for details
3. **Scalable:** Easy to add new tabs or sidebar sections
4. **Accessible:** Keyboard navigation, screen reader friendly
5. **Performance:** Lazy-loaded tab content
6. **Maintainable:** Shared components, consistent patterns

## 🔄 Comparison with Old Design

### Before (Assumed)
- Single-page layout with all info
- Harder to scan
- No clear information hierarchy
- Difficult to add new features

### After (Hybrid)
- Organized by concern (tabs)
- Quick overview (sidebar)
- Clear visual hierarchy
- Extensible architecture

## 🚀 Next Steps

### Phase 1: Complete Core Features
- [ ] Implement Lots grid/list view for building preview
- [ ] Add real intervention data integration
- [ ] Expand financial details (payment history)
- [ ] Add action buttons (edit, delete, manage)

### Phase 2: Enhanced Features
- [ ] Add filters and search for lots list
- [ ] Implement document upload/management
- [ ] Add financial charts and analytics
- [ ] Create intervention quick-create from property

### Phase 3: Integration
- [ ] Connect to Supabase for real data
- [ ] Add real-time updates
- [ ] Implement role-based permissions
- [ ] Add audit trail

### Phase 4: Polish
- [ ] Mobile optimization and testing
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] User testing and feedback

## 📝 Technical Notes

### Dependencies
- Reuses intervention shared components
- Requires shadcn/ui components (Card, Tabs, Badge, Avatar)
- Uses Lucide icons
- Tailwind CSS for styling

### Data Flow
```
Page → Preview Component → Sidebar + Tabs → Cards
                         ↓
                    Mock Data (currently)
                         ↓
                    Real Data (future)
```

### File Structure
```
components/properties/
├── preview-designs/
│   ├── preview-hybrid-lot.tsx
│   └── preview-hybrid-building.tsx
├── shared/
│   ├── sidebar/
│   │   └── property-sidebar.tsx
│   ├── layout/
│   │   └── property-tabs.tsx
│   └── cards/
│       ├── lot-details-card.tsx
│       ├── building-details-card.tsx
│       └── financial-card.tsx
```

## 🎯 Success Metrics

- [ ] Consistent UX with intervention previews
- [ ] Reduced time to find property information
- [ ] Positive user feedback from property managers
- [ ] Easy to extend with new features
- [ ] Mobile-friendly and accessible

## 📚 References

- [Intervention Preview Implementation](../interventions/shared/)
- [Material Design - Cards](https://m3.material.io/components/cards)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
