# 🏗️ Design System - Layouts & Grilles

> 📁 **Source de vérité :** `app/globals.css` contient tous les design tokens centralisés (couleurs OKLCH, spacing, shadows, fonts)

## Vue d'ensemble

Notre système de layout est conçu pour créer des interfaces **cohérentes**, **responsive** et **accessibles** sur tous les devices. Il combine CSS Grid, Flexbox et des patterns éprouvés pour optimiser l'expérience utilisateur de chaque rôle (Admin, Gestionnaire, Locataire, Prestataire).

## 📱 Breakpoints & Responsive

### Système de Breakpoints

```css
/* Mobile First Approach */
/* Default: 320px+ - Mobile portrait */

--breakpoint-sm: 640px; /* Mobile landscape, small tablets */
--breakpoint-md: 768px; /* Tablets portrait */
--breakpoint-lg: 1024px; /* Tablets landscape, small desktop */
--breakpoint-xl: 1280px; /* Desktop standard */
--breakpoint-2xl: 1536px; /* Large desktop, ultrawide */
```

### Tailwind Responsive Classes

```tsx
// Mobile first progression
className = "w-full sm:w-1/2 lg:w-1/3 xl:w-1/4";

// Container responsive
className = "container mx-auto px-4 sm:px-6 lg:px-8";

// Grid responsive
className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
```

## 🏠 Layout Principal - App Shell

### Structure Globale

```tsx
// App layout container
<div className="min-h-screen bg-slate-50">
  {/* Header global - toujours visible */}
  <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header content */}
    </div>
  </header>

  {/* Main application layout */}
  <div className="flex h-[calc(100vh-64px)]">
    {/* Sidebar navigation - desktop */}
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-200 lg:bg-white">
      {/* Sidebar content */}
    </aside>

    {/* Main content area */}
    <main className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page content */}
      </div>
    </main>
  </div>

  {/* Mobile bottom navigation */}
  <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200">
    {/* Mobile nav content */}
  </nav>
</div>
```

## 📐 Grilles de Composition

### Grid Standard - Contenu Principal

```tsx
// Grid responsive 12 colonnes
className="grid grid-cols-12 gap-4 lg:gap-6"

// Répartition contenu
<div className="col-span-12 lg:col-span-8"> {/* Contenu principal */}
<div className="col-span-12 lg:col-span-4"> {/* Sidebar */}
```

### Grid Dashboard - Layout Metrics

```tsx
// Dashboard cards grid
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"

// Dashboard main + sidebar
<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
  <div className="lg:col-span-3"> {/* Graphiques, tables */}
  <div className="lg:col-span-1"> {/* KPIs, actions rapides */}
</div>
```

### Grid Cards - Listes d'Éléments

```tsx
// Cards responsive auto-fit
className = "grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6";

// Cards tailles fixes
className = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4";
```

## 🎨 Patterns de Layout par Context

### 🔧 Admin Layout - Information Dense

```tsx
// Layout admin - Maximum d'information
<div className="grid grid-cols-12 gap-4">

  {/* Sidebar navigation dense */}
  <aside className="col-span-2">
    <nav className="space-y-1">
      {/* Navigation compacte */}
    </nav>
  </aside>

  {/* Content area maximized */}
  <main className="col-span-10">

    {/* Page header compact */}
    <header className="mb-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard Admin</h1>
        <div className="flex space-x-3"> {/* Actions */}
      </div>
    </header>

    {/* Content grid dense */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2"> {/* Tableau principal */}
      <div className="lg:col-span-1"> {/* Stats et actions */}
    </div>
  </main>
</div>
```

### 🏢 Gestionnaire Layout - Business Professional

```tsx
// Layout gestionnaire - Professional clean
<div className="max-w-7xl mx-auto">

  {/* Header spacieux avec branding */}
  <header className="mb-8">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <h1 className="text-3xl font-bold">Portfolio Overview</h1>
      </div>
      <div className="flex space-x-4"> {/* Actions gestionnaire */}
    </div>
  </header>

  {/* Dashboard grid spacieux */}
  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

    {/* KPIs section */}
    <div className="lg:col-span-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI cards */}
      </div>
    </div>

    {/* Content principal + sidebar */}
    <div className="lg:col-span-3"> {/* Charts, tables */}
    <div className="lg:col-span-1"> {/* Quick actions */}
  </div>
</div>
```

### 🏠 Tenant Layout - Simple & Accessible

```tsx
// Layout tenant - Simplicité et clarté
<div className="max-w-4xl mx-auto px-4">
  {/* Header simple et accueillant */}
  <header className="mb-8 text-center lg:text-left">
    <h1 className="text-2xl font-semibold text-slate-800 mb-2">Mon Logement</h1>
    <p className="text-slate-600">Résidence du Parc, Apt 2B</p>
  </header>

  {/* Layout cards simple */}
  <div className="space-y-8">
    {/* Section interventions */}
    <section>
      <h2 className="text-xl font-medium mb-6">Mes Interventions</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Intervention cards */}
      </div>
    </section>

    {/* Section actions rapides */}
    <section>
      <h2 className="text-xl font-medium mb-6">Actions Rapides</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Action buttons */}
      </div>
    </section>
  </div>
</div>
```

### ⚡ Provider Layout - Action Oriented

```tsx
// Layout provider - Focus sur l'action
<div className="max-w-5xl mx-auto">

  {/* Header action-focused */}
  <header className="mb-6">
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Intervention #2025-001
          </h1>
          <p className="text-slate-600">Réparation plomberie - Urgent</p>
        </div>
        <div className="flex space-x-3"> {/* Status + actions */}
      </div>
    </div>
  </header>

  {/* Content focused */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2"> {/* Détails intervention */}
    <div className="lg:col-span-1"> {/* Actions et contacts */}
  </div>
</div>
```

## 📄 Layout de Pages Spécifiques

### Page List - Tables & Filters

```tsx
// Layout listes avec filtres
<div className="space-y-6">
  {/* Header avec actions */}
  <div className="flex justify-between items-center">
    <h1 className="text-2xl font-bold">Interventions</h1>
    <div className="flex space-x-3">
      <button>Filtres</button>
      <button>Nouveau</button>
    </div>
  </div>

  {/* Filters bar */}
  <div className="bg-white p-4 rounded-lg border border-slate-200">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Filtres */}
    </div>
  </div>

  {/* Content table/cards */}
  <div className="bg-white rounded-lg border border-slate-200">
    {/* Table ou cards responsive */}
  </div>
</div>
```

### Page Detail - Focus Content

```tsx
// Layout page détail
<div className="max-w-4xl mx-auto space-y-8">

  {/* Breadcrumb navigation */}
  <nav className="text-sm text-slate-500">
    <a href="#">Accueil</a> / <a href="#">Interventions</a> / <span>INT-001</span>
  </nav>

  {/* Header détail */}
  <header>
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">INT-001</h1>
        <p className="text-slate-600 mt-2">Intervention plomberie</p>
      </div>
      <div className="flex space-x-3"> {/* Actions contextuelles */}
    </div>
  </header>

  {/* Content detail grid */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div className="lg:col-span-2"> {/* Contenu principal */}
    <div className="lg:col-span-1"> {/* Sidebar info/actions */}
  </div>
</div>
```

### Page Form - Creation/Edition

```tsx
// Layout formulaires
<div className="max-w-2xl mx-auto">
  {/* Header form */}
  <header className="mb-8">
    <h1 className="text-2xl font-bold text-slate-900">Nouvelle Intervention</h1>
    <p className="text-slate-600 mt-2">Décrivez le problème à résoudre</p>
  </header>

  {/* Form content */}
  <form className="space-y-8">
    {/* Sections formulaire */}
    <section className="space-y-6">
      <h2 className="text-lg font-medium text-slate-900">
        Informations générales
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Champs formulaire */}
      </div>
    </section>

    {/* Actions formulaire */}
    <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200">
      <button type="button">Annuler</button>
      <button type="submit">Créer</button>
    </div>
  </form>
</div>
```

## 📱 Navigation Mobile

### Bottom Navigation

```tsx
// Navigation mobile fixed bottom
<nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 safe-area-pb">
  <div className="grid grid-cols-4 gap-0">
    {Array.from({ length: 4 }).map((_, i) => (
      <a key={i} className="flex flex-col items-center py-2 px-1">
        <svg className="w-6 h-6 mb-1">{/* Icon */}</svg>
        <span className="text-xs">Label</span>
      </a>
    ))}
  </div>
</nav>
```

### Mobile Sidebar

```tsx
// Sidebar mobile avec overlay
<div className="lg:hidden">
  {/* Overlay */}
  <div className="fixed inset-0 bg-slate-900/50 z-40" />

  {/* Sidebar */}
  <aside className="fixed inset-y-0 left-0 w-64 bg-white z-50 transform transition-transform">
    <div className="p-6">{/* Navigation mobile */}</div>
  </aside>
</div>
```

## 🔧 Container System

### Page Containers

```tsx
// Container principal page
className = "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";

// Container contenu centré
className = "max-w-4xl mx-auto px-4";

// Container form/detail
className = "max-w-2xl mx-auto px-4";

// Container fullwidth
className = "w-full px-4 sm:px-6 lg:px-8";
```

### Section Containers

```tsx
// Section avec background
className = "bg-white rounded-lg border border-slate-200 p-6";

// Section sans background
className = "space-y-6";

// Section avec séparateur
className = "border-b border-slate-200 pb-8 mb-8";
```

## 🚫 Anti-Patterns Layout

### À éviter absolument

```tsx
// ❌ MAUVAIS - Layout non responsive
<div className="grid grid-cols-4 gap-4"> // Cassé sur mobile

// ❌ MAUVAIS - Hauteurs fixes problématiques
className="h-screen" // Problème avec keyboard mobile

// ❌ MAUVAIS - Z-index anarchique
className="z-999999" // Z-index non géré

// ❌ MAUVAIS - Overflow non géré
className="w-screen" // Débordement horizontal

// ✅ BON - Layout responsive et flexible
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
className="min-h-screen" // Hauteur minimale flexible
className="z-50" // Z-index système cohérent
className="max-w-full" // Largeur contrôlée
```

## 🔧 Implémentation Technique

### CSS Custom Properties

```css
:root {
  /* Layout measurements */
  --header-height: 64px;
  --sidebar-width: 256px;
  --mobile-nav-height: 72px;

  /* Container widths */
  --container-sm: 640px;
  --container-md: 768px;
  --container-lg: 1024px;
  --container-xl: 1280px;
  --container-2xl: 1536px;
}
```

### Classes BEM (globals.css)

Ces classes sont définies dans `globals.css` pour garantir la cohérence des layouts :

```css
/* Header */
.header { /* Container header principal */ }
.header__container { /* Inner container avec max-width */ }
.header__nav { /* Navigation links */ }
.header__logo { /* Logo brand */ }
.header__actions { /* Actions header (notifications, profile) */ }

/* Dashboard */
.dashboard { /* Container dashboard */ }
.dashboard__container { /* Inner container avec padding responsive */ }
.dashboard__header { /* Header section dashboard */ }
.dashboard__stats { /* Zone KPIs/stats */ }
.dashboard__content { /* Contenu principal */ }

/* Layout Utilities */
.layout-padding { /* px-5 sm:px-6 lg:px-10 py-4 */ }
.layout-container { /* Combination avec max-width */ }
.content-max-width { /* max-width: var(--content-max-width) */ }
.sticky-footer { /* Footer sticky avec backdrop-blur */ }
```

**Usage exemple :**

```tsx
<div className="dashboard">
  <div className="dashboard__container content-max-width mx-auto">
    <header className="dashboard__header">
      <h1>Tableau de bord</h1>
    </header>
    <section className="dashboard__stats">
      {/* KPI cards */}
    </section>
    <main className="dashboard__content">
      {/* Contenu principal */}
    </main>
  </div>
</div>
```

### Layout Utility Classes

```css
/* Layout patterns réutilisables */
.page-container {
  @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
}

.content-grid {
  @apply grid grid-cols-1 lg:grid-cols-4 gap-8;
}

.card-grid {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6;
}

.app-shell {
  @apply min-h-screen bg-slate-50;
}
```

### Z-Index System

```css
/* Z-index hierachy */
:root {
  --z-below: -1;
  --z-normal: 0;
  --z-dropdown: 10;
  --z-sticky: 20;
  --z-sidebar: 30;
  --z-modal: 40;
  --z-overlay: 50;
  --z-tooltip: 60;
}
```

---

**💡 Conseil** : Testez toujours vos layouts sur différentes tailles d'écran et orientations avant validation.

**📋 Checklist** : Vérifiez que les layouts s'adaptent correctement de mobile (320px) à desktop (1920px+).
