# ✍️ Design System - Typographie

## Vue d'ensemble

Notre système typographique est conçu pour optimiser la **lisibilité**, créer une **hiérarchie claire** et garantir une **accessibilité optimale** sur tous les devices. Il utilise la police **Inter** pour sa neutralité professionnelle et sa lisibilité exceptionnelle.

## 🔤 Police Principale

### Inter - Fonctionnalité & Lisibilité

```css
font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
  sans-serif;
```

**Pourquoi Inter ?**

- ✅ Optimisée pour les interfaces digitales
- ✅ Excellente lisibilité à toutes les tailles
- ✅ Support complet des caractères latins
- ✅ Open source et performante
- ✅ Rendu cohérent cross-browser

### Fallbacks System

```css
/* Hiérarchie de fallback intelligente */
font-family: "Inter", /* Police principale */ system-ui, /* Police système moderne */ -apple-system,
  /* San Francisco sur macOS/iOS */ BlinkMacSystemFont, /* San Francisco sur macOS Chrome */
    "Segoe UI", /* Segoe UI sur Windows */ Roboto, /* Roboto sur Android */
    sans-serif; /* Fallback générique */
```

## 📏 Échelle Typographique

### Tailles (Mobile-First)

```css
/* Système basé sur la progression harmonique */
--text-xs: 0.75rem; /* 12px - Labels, timestamps */
--text-sm: 0.875rem; /* 14px - Metadata, secondary text */
--text-base: 1rem; /* 16px - Body text, base de lecture */
--text-lg: 1.125rem; /* 18px - Emphasized text */
--text-xl: 1.25rem; /* 20px - Section headings */
--text-2xl: 1.5rem; /* 24px - Page headings */
--text-3xl: 1.875rem; /* 30px - Main headings */
--text-4xl: 2.25rem; /* 36px - Hero headings */
--text-5xl: 3rem; /* 48px - Display headings */
```

### Poids (Font Weights)

```css
--font-light: 300; /* Texte décoratif, emphasis léger */
--font-normal: 400; /* Texte courant, paragraphes */
--font-medium: 500; /* Labels, emphasis modéré */
--font-semibold: 600; /* Titres sections, navigation */
--font-bold: 700; /* Titres importants, emphasis fort */
--font-extrabold: 800; /* Headlines, hero text */
```

### Hauteurs de ligne (Line Heights)

```css
--leading-tight: 1.25; /* 1.25 - Titres compacts */
--leading-snug: 1.375; /* 1.375 - Titres normaux */
--leading-normal: 1.5; /* 1.5 - Texte de lecture optimal */
--leading-relaxed: 1.625; /* 1.625 - Paragraphes longs */
--leading-loose: 2; /* 2 - Texte aéré, special cases */
```

## 📋 Hiérarchie Typographique

### H1 - Titre Principal de Page

```tsx
// Usage: Titre de page principale, hero sections
className="text-3xl font-bold text-slate-900 leading-tight lg:text-4xl"

// Exemple d'utilisation
<h1 className="text-3xl font-bold text-slate-900 leading-tight lg:text-4xl">
  Dashboard Propriétaire
</h1>
```

### H2 - Titre de Section

```tsx
// Usage: Sections principales, cards importantes
className="text-2xl font-semibold text-slate-900 leading-snug"

// Exemple d'utilisation
<h2 className="text-2xl font-semibold text-slate-900 leading-snug mb-4">
  Interventions Récentes
</h2>
```

### H3 - Sous-titre de Section

```tsx
// Usage: Sous-sections, groupes de contenu
className="text-xl font-semibold text-slate-800 leading-snug"

// Exemple d'utilisation
<h3 className="text-xl font-semibold text-slate-800 leading-snug mb-3">
  Propriétés en Attente
</h3>
```

### H4 - Titre de Composant

```tsx
// Usage: Titres de cards, widgets, modals
className="text-lg font-medium text-slate-800 leading-snug"

// Exemple d'utilisation
<h4 className="text-lg font-medium text-slate-800 leading-snug mb-2">
  Building Résidence Parc
</h4>
```

### Body Text - Texte de Lecture

```tsx
// Usage: Paragraphes, descriptions, contenu principal
className="text-base text-slate-700 leading-normal"

// Exemple d'utilisation
<p className="text-base text-slate-700 leading-normal">
  Cette intervention nécessite l'intervention d'un plombier qualifié...
</p>
```

### Small Text - Métadonnées

```tsx
// Usage: Timestamps, labels, informations secondaires
className="text-sm text-slate-500 leading-normal"

// Exemple d'utilisation
<span className="text-sm text-slate-500 leading-normal">
  Créé le 15 janvier 2025
</span>
```

### Caption - Légendes & Labels

```tsx
// Usage: Légendes, labels de formulaires, badges
className="text-xs font-medium text-slate-600 uppercase tracking-wide"

// Exemple d'utilisation
<label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
  Référence Lot
</label>
```

## 🎯 Usage par Context

### Navigation

```tsx
// Navigation principale (sidebar)
className = "text-sm font-medium text-slate-700 hover:text-slate-900";

// Breadcrumbs
className = "text-sm text-slate-500 hover:text-slate-700";

// Active nav item
className = "text-sm font-semibold text-sky-600";
```

### Formulaires

```tsx
// Labels
className = "text-sm font-medium text-slate-700";

// Input text
className = "text-base text-slate-900";

// Placeholder
className = "text-base text-slate-400";

// Help text
className = "text-xs text-slate-500";

// Error message
className = "text-xs text-red-600 font-medium";
```

### Boutons

```tsx
// Button primary
className = "text-sm font-semibold text-white";

// Button secondary
className = "text-sm font-medium text-slate-700";

// Button small
className = "text-xs font-medium uppercase tracking-wide";
```

### Tables

```tsx
// Table headers
className = "text-xs font-semibold text-slate-600 uppercase tracking-wide";

// Table cells
className = "text-sm text-slate-900";

// Table metadata
className = "text-xs text-slate-500";
```

### Status & Badges

```tsx
// Status badge
className = "text-xs font-medium uppercase tracking-wide";

// Notification badge
className = "text-xs font-bold text-white";

// Count badge
className = "text-xs font-semibold";
```

## 📱 Responsive Typography

### Mobile (320px - 767px)

```tsx
// Ajustements pour petits écrans
// H1 Mobile
className = "text-2xl font-bold leading-tight";

// H2 Mobile
className = "text-xl font-semibold leading-snug";

// Body Mobile (lisibilité optimisée)
className = "text-base leading-relaxed";
```

### Desktop (1024px+)

```tsx
// Tailles agrandies pour grands écrans
// H1 Desktop
className = "text-3xl lg:text-4xl font-bold leading-tight";

// H2 Desktop
className = "text-2xl lg:text-3xl font-semibold leading-snug";

// Body Desktop
className = "text-base lg:text-lg leading-normal";
```

## 🌍 Typographie par Rôle

### 🔧 Admin - Autorité & Précision

```tsx
// Headers admin - Fort impact visuel
className = "text-3xl font-extrabold text-slate-900";

// Body admin - Densité informationnelle
className = "text-sm text-slate-700 leading-normal";

// Actions admin - Clarity absolue
className = "text-xs font-bold uppercase tracking-wide";
```

### 🏢 Owner - Professionnalisme & Clarté

```tsx
// Headers owner - Business professional
className = "text-2xl font-bold text-slate-800";

// Body owner - Lecture confortable
className = "text-base text-slate-700 leading-normal";

// Emphasis owner - Insights business
className = "text-lg font-semibold text-slate-900";
```

### 🏠 Tenant - Accessibilité & Simplicité

```tsx
// Headers tenant - Approchable et clair
className = "text-2xl font-semibold text-slate-800";

// Body tenant - Lisibilité maximale
className = "text-base text-slate-700 leading-relaxed";

// Actions tenant - Guidage simple
className = "text-sm font-medium text-slate-600";
```

### ⚡ Provider - Efficacité & Action

```tsx
// Headers provider - Direct et actionable
className = "text-xl font-bold text-slate-900";

// Body provider - Information dense mais claire
className = "text-sm text-slate-700 leading-normal";

// Status provider - Feedback immédiat
className = "text-xs font-bold uppercase text-amber-700";
```

## 🎨 Combinaisons Couleurs

### Texte Principal

```tsx
// High contrast - Lecture principale
className = "text-slate-900";

// Medium contrast - Texte secondaire
className = "text-slate-700";

// Low contrast - Metadata, désactivé
className = "text-slate-500";
```

### Texte sur Fond Coloré

```tsx
// Sur fond sombre
className = "text-white";

// Sur fond coloré clair
className = "text-slate-900";

// Sur fond d'alerte
className = "text-red-900 bg-red-50";
```

## ♿ Accessibilité Typographique

### Ratios de Contraste WCAG 2.1

| Combinaison             | Ratio   | Niveau |
| ----------------------- | ------- | ------ |
| `slate-900` sur `white` | 18.07:1 | AAA    |
| `slate-700` sur `white` | 9.67:1  | AAA    |
| `slate-600` sur `white` | 7.14:1  | AAA    |
| `slate-500` sur `white` | 4.59:1  | AA     |

### Guidelines Lisibilité

- ✅ Taille minimale : 16px (1rem) pour le body text
- ✅ Line height : minimum 1.5 pour le texte courant
- ✅ Contraste : minimum 4.5:1 pour texte normal
- ✅ Contraste : minimum 3:1 pour texte large (18px+)

### Support Dyslexie

```tsx
// Espacement lettres amélioré pour dyslexie
className = "tracking-wide leading-relaxed";

// Éviter l'italique sur long texte
// Préférer la mise en évidence par le poids
className = "font-semibold"; // au lieu de "italic"
```

## 🚫 Anti-Patterns Typographiques

### À éviter absolument

```tsx
// ❌ MAUVAIS - Tailles hardcodées
style={{ fontSize: '15px' }}

// ❌ MAUVAIS - Line height trop serrée
className="leading-none text-base" // pour body text

// ❌ MAUVAIS - Contraste insuffisant
className="text-slate-400 bg-white" // Ratio 2.5:1

// ❌ MAUVAIS - Hiérarchie inversée
<h2 className="text-lg">Section</h2>
<h3 className="text-2xl">Sous-section</h3>

// ✅ BON - Utilisation des tokens
className="text-base leading-normal text-slate-700"
```

## 🔧 Implémentation Technique

### CSS Variables

```css
:root {
  /* Font Sizes */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;

  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
}
```

### Utility Classes Personnalisées

```css
/* Utilitaires typographiques spécifiques */
.heading-hero {
  @apply text-4xl font-extrabold text-slate-900 leading-tight;
}

.body-primary {
  @apply text-base text-slate-700 leading-normal;
}

.caption-label {
  @apply text-xs font-medium text-slate-600 uppercase tracking-wide;
}
```

---

**💡 Conseil** : Respectez toujours la hiérarchie typographique. Un h3 ne doit jamais être visuellement plus grand qu'un h2.

**📋 Checklist** : Testez la lisibilité sur différents devices et résolutions avant de valider un choix typographique.
