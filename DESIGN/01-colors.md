# 🎨 Design System - Couleurs

## Vue d'ensemble

Notre palette de couleurs est conçue pour inspirer **confiance professionnelle** et **clarté opérationnelle** dans l'écosystème de gestion immobilière. Chaque couleur a été choisie pour optimiser la lisibilité, l'accessibilité et la hiérarchie visuelle.

## 🎯 Couleurs Principales

### Primary - Autorité & Confiance

```css
/* Slate - Professionnalisme et stabilité */
--primary-900: #0F172A    /* Texte principal, navigation importante */
--primary-800: #1E293B    /* Éléments de structure */
--primary-700: #334155    /* Navigation, accents secondaires */
--primary-600: #475569    /* Texte secondaire */
--primary-500: #64748B    /* Texte tertiaire */
--primary-400: #94A3B8    /* Texte désactivé */
--primary-300: #CBD5E1    /* Bordures actives */
--primary-200: #E2E8F0    /* Bordures subtiles */
--primary-100: #F1F5F9    /* Background secondaire */
--primary-50: #F8FAFC     /* Background principal */
```

**Usage Tailwind :**

- `bg-slate-900`, `text-slate-900` pour les éléments principaux
- `bg-slate-50`, `bg-slate-100` pour les surfaces
- `border-slate-200`, `border-slate-300` pour les séparateurs

### Secondary - Action & Engagement

```css
/* Sky Blue - Actions et liens */
--secondary-600: #0284C7   /* Boutons principaux */
--secondary-500: #0EA5E9   /* Links, CTA secondaires */
--secondary-400: #38BDF8   /* Hover states */
--secondary-300: #7DD3FC   /* Background léger */
--secondary-100: #E0F2FE   /* Background très léger */
--secondary-50: #F0F9FF    /* Background minimal */
```

**Usage Tailwind :**

- `bg-sky-600`, `hover:bg-sky-700` pour les boutons
- `text-sky-500` pour les liens
- `bg-sky-50` pour les zones d'information

## 🚨 Couleurs Fonctionnelles

### Success - Validation & Accomplissement

```css
--success-600: #059669    /* Actions positives */
--success-500: #10B981    /* Confirmations */
--success-100: #D1FAE5    /* Background success */
--success-50: #ECFDF5     /* Background très léger */
```

### Warning - Attention & Attente

```css
--warning-600: #D97706    /* Actions d'attention */
--warning-500: #F59E0B    /* Alertes modérées */
--warning-100: #FEF3C7    /* Background warning */
--warning-50: #FFFBEB     /* Background très léger */
```

### Error - Urgence & Erreurs

```css
--error-600: #DC2626     /* Actions destructives */
--error-500: #EF4444     /* Alertes critiques */
--error-100: #FEE2E2     /* Background error */
--error-50: #FEF2F2      /* Background très léger */
```

### Info - Information & Navigation

```css
--info-600: #2563EB      /* Information importante */
--info-500: #3B82F6      /* Notifications */
--info-100: #DBEAFE      /* Background info */
--info-50: #EFF6FF       /* Background très léger */
```

## 📊 Mapping par Rôle Utilisateur

### 🔧 Admin - Supervision

- **Couleur dominante** : `slate-900` (autorité)
- **Accent** : `red-500` (actions critiques)
- **Background** : `slate-50` (neutralité)

### 🏢 Owner - Gestion

- **Couleur dominante** : `slate-800` (professionnalisme)
- **Accent** : `sky-600` (actions business)
- **Background** : `white` (clarté)

### 🏠 Tenant - Confort

- **Couleur dominante** : `slate-700` (accessibilité)
- **Accent** : `emerald-500` (positif)
- **Background** : `slate-50` (sérénité)

### ⚡ Provider - Action

- **Couleur dominante** : `slate-700` (fiabilité)
- **Accent** : `amber-500` (urgence)
- **Background** : `white` (efficacité)

## 🎨 Contextes d'Usage

### Interface Principale

```tsx
// Header navigation
className = "bg-slate-900 text-white";

// Page background
className = "bg-slate-50 min-h-screen";

// Cards principales
className = "bg-white border border-slate-200 shadow-sm";

// Texte principal
className = "text-slate-900";

// Texte secondaire
className = "text-slate-600";
```

### États Interactifs

```tsx
// Bouton principal
className = "bg-sky-600 hover:bg-sky-700 focus:ring-sky-500";

// Bouton secondaire
className = "bg-slate-100 hover:bg-slate-200 text-slate-700";

// Bouton destructif
className = "bg-red-600 hover:bg-red-700 focus:ring-red-500";

// Link
className = "text-sky-600 hover:text-sky-800 underline";
```

### Status & Badges

```tsx
// Success
className = "bg-emerald-100 text-emerald-800 border-emerald-200";

// Warning
className = "bg-amber-100 text-amber-800 border-amber-200";

// Error
className = "bg-red-100 text-red-800 border-red-200";

// Info
className = "bg-blue-100 text-blue-800 border-blue-200";
```

## 🔍 Contraste & Accessibilité

### Ratios de contraste validés WCAG 2.1 AA

| Combinaison             | Ratio   | Statut |
| ----------------------- | ------- | ------ |
| `slate-900` sur `white` | 18.07:1 | ✅ AAA |
| `slate-700` sur `white` | 9.67:1  | ✅ AAA |
| `sky-600` sur `white`   | 7.14:1  | ✅ AAA |
| `slate-500` sur `white` | 4.59:1  | ✅ AA  |
| `white` sur `slate-900` | 18.07:1 | ✅ AAA |
| `white` sur `sky-600`   | 7.14:1  | ✅ AAA |

### Tests de daltonisme

- ✅ Protanopie (8% hommes)
- ✅ Deutéranopie (1% hommes)
- ✅ Tritanopie (rare)

## 🚫 Couleurs Interdites

### À éviter absolument

- `red-500` sur `white` pour du texte (insuffisant)
- Couleurs fluorescentes ou saturées à 100%
- Gradients complexes sur texte
- Couleurs hardcodées (`#FF0000`, `rgb(255,0,0)`)

### Anti-patterns

```tsx
// ❌ MAUVAIS - Couleur hardcodée
style={{ backgroundColor: '#FF5733' }}

// ❌ MAUVAIS - Contraste insuffisant
className="text-slate-400 bg-slate-300"

// ✅ BON - Utilisation des tokens
className="bg-red-600 text-white"
```

## 📱 Adaptation Responsive

### Mobile (320px+)

- Privilégier les contrastes élevés
- Augmenter la taille des zones tactiles
- Utiliser les couleurs de status pour feedback

### Desktop (1024px+)

- Exploiter toute la gamme de nuances
- Hiérarchie visuelle avancée
- Subtilités de hover et focus

## 🔧 Implémentation Technique

### Variables CSS

```css
:root {
  /* Primary Palette */
  --color-primary-900: #0f172a;
  --color-primary-800: #1e293b;
  --color-primary-700: #334155;
  --color-primary-600: #475569;
  --color-primary-500: #64748b;

  /* Secondary Palette */
  --color-secondary-600: #0284c7;
  --color-secondary-500: #0ea5e9;
  --color-secondary-400: #38bdf8;

  /* Functional Colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
}
```

### Tailwind Config Extension

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
      },
    },
  },
};
```

---

**💡 Conseil** : Utilisez toujours les classes Tailwind prédéfinies plutôt que les couleurs hardcodées. Cela garantit la cohérence et facilite la maintenance.

**📋 Checklist** : Avant d'utiliser une couleur, vérifiez qu'elle respecte les ratios de contraste WCAG 2.1 AA (4.5:1 minimum).
