# 📐 Design System - Espacement

> 📁 **Source de vérité :** `app/globals.css` contient tous les design tokens centralisés (couleurs OKLCH, spacing, shadows, fonts)

## Vue d'ensemble

Notre système d'espacement est basé sur une progression **mathématique harmonieuse** qui garantit la cohérence visuelle et la lisibilité. Il utilise une base de **4px** (0.25rem) avec des multiples logiques pour créer un rythme visuel équilibré.

## 📏 Échelle de Base

### Système 4px - Fondation

```css
/* Base unit: 4px = 0.25rem */
--space-px: 1px; /* 1px - Bordures fines */
--space-0: 0; /* 0px - Reset */
--space-0.5: 0.125rem; /* 2px - Micro-ajustements */
--space-1: 0.25rem; /* 4px - Base unit */
--space-1.5: 0.375rem; /* 6px - Ajustements fins */
--space-2: 0.5rem; /* 8px - Espacement minimal */
--space-2.5: 0.625rem; /* 10px - Micro-marges */
--space-3: 0.75rem; /* 12px - Espacement petit */
--space-3.5: 0.875rem; /* 14px - Ajustements */
--space-4: 1rem; /* 16px - Unité de base confortable */
--space-5: 1.25rem; /* 20px - Espacement moyen */
--space-6: 1.5rem; /* 24px - Espacement généreux */
--space-7: 1.75rem; /* 28px - Espacement large */
--space-8: 2rem; /* 32px - Séparation claire */
--space-9: 2.25rem; /* 36px - Espacement très large */
--space-10: 2.5rem; /* 40px - Séparation de sections */
--space-11: 2.75rem; /* 44px - Grand espacement */
--space-12: 3rem; /* 48px - Séparation majeure */
--space-14: 3.5rem; /* 56px - Espacement héroïque */
--space-16: 4rem; /* 64px - Séparation maximale */
--space-20: 5rem; /* 80px - Layout majeur */
--space-24: 6rem; /* 96px - Sections distinctes */
--space-32: 8rem; /* 128px - Séparation de pages */
```

## 🎯 Usage par Context

### Micro-espacements (1px - 12px)

```tsx
// Bordures et ajustements fins
className = "border border-slate-200"; // 1px
className = "gap-0.5"; // 2px entre éléments inline
className = "p-1"; // 4px padding minimal
className = "m-1.5"; // 6px margin fine
className = "gap-2"; // 8px gap confortable
className = "space-y-3"; // 12px entre éléments verticaux
```

### Espacements Standard (16px - 32px)

```tsx
// Espacement de base pour composants
className = "p-4"; // 16px padding standard
className = "m-5"; // 20px margin confortable
className = "gap-6"; // 24px gap généreux
className = "space-y-8"; // 32px séparation claire
```

### Macro-espacements (48px+)

```tsx
// Séparations de sections et layout
className = "mb-12"; // 48px entre sections majeures
className = "p-16"; // 64px padding large container
className = "my-20"; // 80px séparation layout
className = "pt-24"; // 96px top padding héroïque
```

## 📋 Patterns d'Espacement

### Cards & Containers

```tsx
// Card standard
className = "p-6 space-y-4";
// Padding: 24px, espacement interne: 16px

// Card compacte
className = "p-4 space-y-3";
// Padding: 16px, espacement interne: 12px

// Card large
className = "p-8 space-y-6";
// Padding: 32px, espacement interne: 24px
```

### Formulaires

```tsx
// Container formulaire
className = "space-y-6";
// 24px entre champs

// Groupe de champs
className = "space-y-4";
// 16px entre champs du même groupe

// Label et input
className = "space-y-2";
// 8px entre label et champ

// Boutons
className = "space-x-3";
// 12px entre boutons
```

### Navigation

```tsx
// Items navigation horizontale
className = "space-x-6";
// 24px entre liens principaux

// Items navigation verticale (sidebar)
className = "space-y-2";
// 8px entre liens sidebar

// Sections navigation
className = "space-y-8";
// 32px entre sections navigation
```

### Lists & Tables

```tsx
// Items de liste
className = "space-y-3";
// 12px entre items liste

// Colonnes table
className = "px-6";
// 24px padding horizontal cellules

// Rows table
className = "py-4";
// 16px padding vertical cellules
```

## 🏗️ Architecture Layout

### Page Layout - Container Principal

```tsx
// Layout page standard
className = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8";
// Container centré avec padding responsive

// Sections principales
className = "space-y-12";
// 48px entre sections de page
```

### Grid Layouts

```tsx
// Grid 2 colonnes avec gap
className = "grid grid-cols-2 gap-6";
// 24px entre éléments grid

// Grid responsive
className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6";
// Gap responsive: 16px mobile, 24px desktop
```

### Flex Layouts

```tsx
// Header avec éléments espacés
className = "flex justify-between items-center space-x-4";
// 16px entre éléments flex

// Stacks verticales
className = "flex flex-col space-y-6";
// 24px entre éléments stacks
```

## 📱 Responsive Spacing

### Mobile (320px - 767px)

```tsx
// Espacement réduit pour mobile
className = "p-4 space-y-4";
// Padding et gaps plus serrés

// Marges externes mobiles
className = "mx-4 my-6";
// Margins optimisées tactile
```

### Tablet (768px - 1023px)

```tsx
// Espacement intermédiaire
className = "p-6 sm:p-8 space-y-6";
// Augmentation progressive

// Layout tablet
className = "px-6 py-8 sm:px-8 sm:py-12";
// Adaptation douce
```

### Desktop (1024px+)

```tsx
// Espacement généreux desktop
className = "p-8 lg:p-12 space-y-8";
// Exploitation espace disponible

// Grandes séparations desktop
className = "my-16 lg:my-24";
// Respirations importantes
```

## 🎨 Espacement par Rôle

### 🔧 Admin - Densité Informationnelle

```tsx
// Interface dense pour productivité
className = "p-4 space-y-3";
// Espacements compacts

// Tables admin denses
className = "px-4 py-2";
// Padding réduit pour plus de données
```

### 🏢 Gestionnaire - Professional & Clear

```tsx
// Espacement business professional
className = "p-6 space-y-6";
// Équilibre confort/efficacité

// Dashboard gestionnaire
className = "gap-6 lg:gap-8";
// Gaps généreux pour clarté
```

### 🏠 Tenant - Confort & Accessibility

```tsx
// Espacement généreux pour accessibilité
className = "p-6 space-y-6";
// Breathing room important

// Zone tactile mobile tenant
className = "p-4 m-2";
// Facilité d'interaction
```

### ⚡ Provider - Efficiency & Speed

```tsx
// Espacement optimisé action rapide
className = "p-4 space-y-4";
// Interface efficace

// Actions provider spacing
className = "space-x-3";
// Accès rapide boutons
```

## 🔍 Règles Spacing

### Hiérarchie Verticale

```tsx
// Section title → content
className = "mb-6"; // 24px

// Subsection → items
className = "mb-4"; // 16px

// Item → sub-items
className = "mb-3"; // 12px

// Related elements
className = "mb-2"; // 8px
```

### Cohérence Horizontale

```tsx
// Items navigation
className = "space-x-6"; // 24px items principaux
className = "space-x-4"; // 16px items secondaires
className = "space-x-2"; // 8px items inline

// Boutons groupés
className = "space-x-3"; // 12px standard
className = "space-x-2"; // 8px compacts
```

### Breathing Room

```tsx
// Container externe
className = "p-8"; // 32px breathing room

// Container interne
className = "p-6"; // 24px padding confortable

// Container compact
className = "p-4"; // 16px padding standard
```

## 🚫 Anti-Patterns Spacing

### À éviter absolument

```tsx
// ❌ MAUVAIS - Valeurs arbitraires
className="p-[13px] m-[27px]"

// ❌ MAUVAIS - Espacement incohérent
<div className="mb-3">
  <div className="mb-7"> // Pas de progression logique
    <div className="mb-2">

// ❌ MAUVAIS - Surcharge de margins
className="mt-4 mb-6 ml-2 mr-8" // Complexité inutile

// ✅ BON - Usage tokens systématiques
className="p-6 space-y-4"
```

### Violations communes

```tsx
// ❌ MAUVAIS - Padding + margin redondants
className = "p-4 m-4"; // sur même élément

// ❌ MAUVAIS - Espacement trop serré tactile
className = "py-1 px-2"; // Zone tactile < 44px

// ❌ MAUVAIS - Gap asymétrique sans raison
className = "space-x-2 space-y-8"; // Proportion étrange

// ✅ BON - Espacement proportionnel
className = "space-x-4 space-y-4"; // Cohérent
```

## 🔧 Implémentation Technique

### CSS Variables Spacing

```css
:root {
  /* Spacing Scale */
  --space-px: 1px;
  --space-0: 0;
  --space-1: 0.25rem; /* 4px */
  --space-2: 0.5rem; /* 8px */
  --space-3: 0.75rem; /* 12px */
  --space-4: 1rem; /* 16px */
  --space-6: 1.5rem; /* 24px */
  --space-8: 2rem; /* 32px */
  --space-12: 3rem; /* 48px */
  --space-16: 4rem; /* 64px */
  --space-20: 5rem; /* 80px */
  --space-24: 6rem; /* 96px */
}
```

### Variables Dashboard (globals.css)

```css
:root {
  /* Dashboard Padding */
  --dashboard-padding-x-mobile: 1.25rem;   /* 20px */
  --dashboard-padding-x-tablet: 1.5rem;    /* 24px */
  --dashboard-padding-x-desktop: 2.5rem;   /* 40px */
  --dashboard-padding-y: 1.5rem;           /* 24px */

  /* Dashboard Spacing */
  --dashboard-section-gap: 2rem;           /* 32px - Entre sections */
  --dashboard-header-gap: 1rem;            /* 16px - Entre header éléments */

  /* Header Dimensions */
  --header-height-mobile: 3.5rem;          /* 56px */
  --header-height-desktop: 4rem;           /* 64px */
  --header-touch-target: 2.75rem;          /* 44px minimum WCAG */

  /* Content Constraints */
  --content-max-width: 96rem;              /* 1536px */
}
```

**Usage avec les classes BEM (globals.css) :**

```tsx
// Dashboard container
<div className="dashboard">
  <div className="dashboard__container">
    <header className="dashboard__header">
      {/* Utilise --dashboard-header-gap */}
    </header>
    <main className="dashboard__content">
      {/* Utilise --dashboard-section-gap */}
    </main>
  </div>
</div>

// Layout padding responsive
<div className="layout-padding">
  {/* px-5 sm:px-6 lg:px-10 py-4 */}
</div>
```

### Utility Classes Personnalisées

```css
/* Spacing patterns récurrents */
.card-standard {
  @apply p-6 space-y-4;
}

.form-section {
  @apply space-y-6;
}

.nav-items {
  @apply space-x-6;
}

.page-container {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
}
```

### Tailwind Config Extension

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      spacing: {
        18: "4.5rem", // 72px - Custom spacing
        22: "5.5rem", // 88px - Custom spacing
        26: "6.5rem", // 104px - Custom spacing
      },
    },
  },
};
```

## 📏 Guides Pratiques

### Checklist Spacing

- [ ] Utiliser toujours les tokens définis (pas de valeurs arbitraires)
- [ ] Respecter la progression 4px base
- [ ] Maintenir ratios cohérents (1:1.5, 1:2, 1:3)
- [ ] Tester responsive sur mobile/tablet/desktop
- [ ] Vérifier accessibilité tactile (min 44px zones)

### Debugging Spacing

```tsx
// Visualiser les espacements en développement
className = "border border-red-500"; // Révéler containers
className = "bg-red-100"; // Révéler zones padding
```

---

**💡 Conseil** : Commencez toujours par l'espacement minimum nécessaire, puis augmentez progressivement si besoin.

**📋 Checklist** : Vérifiez que tous les espacements utilisent les tokens définis et respectent la hiérarchie visuelle.
