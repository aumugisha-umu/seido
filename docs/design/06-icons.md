# 🎨 Design System - Icônes

## Vue d'ensemble

Notre système d'icônes privilégie la **cohérence**, la **lisibilité** et la **reconnaissance** immédiate. Nous utilisons une approche unifiée avec des icônes **Heroicons** comme base, complétées par des icônes métier spécifiques.

## 📚 Bibliothèque Principale

### Heroicons - Foundation

```tsx
// Import des icônes principales
import {
  HomeIcon,
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  UserIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
```

**Pourquoi Heroicons ?**

- ✅ Cohérent avec Tailwind CSS
- ✅ Deux styles : outline et solid
- ✅ Optimisées SVG
- ✅ Accessibilité intégrée
- ✅ Support TypeScript

## 📏 Tailles Standardisées

### Système de Tailles

```css
/* Tailles d'icônes harmonieuses */
--icon-xs: 12px; /* 0.75rem - Badges, inline */
--icon-sm: 16px; /* 1rem - Boutons, navigation */
--icon-md: 20px; /* 1.25rem - Standard */
--icon-lg: 24px; /* 1.5rem - Headers, actions */
--icon-xl: 32px; /* 2rem - Hero, illustration */
--icon-2xl: 48px; /* 3rem - Landing, empty states */
```

### Usage Tailwind

```tsx
// Tailles courantes
<HomeIcon className="w-4 h-4" />   // 16px - sm
<HomeIcon className="w-5 h-5" />   // 20px - md (standard)
<HomeIcon className="w-6 h-6" />   // 24px - lg
<HomeIcon className="w-8 h-8" />   // 32px - xl
```

## 🎯 Icônes par Contexte

### Navigation & Interface

```tsx
// Navigation principale
<HomeIcon className="w-5 h-5" />           // Accueil
<BuildingOfficeIcon className="w-5 h-5" /> // Propriétés
<WrenchScrewdriverIcon className="w-5 h-5" /> // Interventions
<UserIcon className="w-5 h-5" />           // Utilisateurs
<Cog6ToothIcon className="w-5 h-5" />      // Paramètres

// Interface actions
<PlusIcon className="w-4 h-4" />           // Ajouter
<PencilIcon className="w-4 h-4" />         // Éditer
<TrashIcon className="w-4 h-4" />          // Supprimer
<EyeIcon className="w-4 h-4" />            // Voir détails
<ArrowDownTrayIcon className="w-4 h-4" />  // Télécharger
```

### Status & États

```tsx
// Status interventions
<CheckCircleIcon className="w-5 h-5 text-emerald-500" />     // Terminé
<ClockIcon className="w-5 h-5 text-amber-500" />             // En attente
<WrenchScrewdriverIcon className="w-5 h-5 text-blue-500" /> // En cours
<XCircleIcon className="w-5 h-5 text-red-500" />            // Rejeté

// Alertes & notifications
<BellIcon className="w-5 h-5" />                    // Notifications
<ExclamationTriangleIcon className="w-5 h-5 text-amber-500" /> // Attention
<InformationCircleIcon className="w-5 h-5 text-blue-500" />    // Information
<ShieldCheckIcon className="w-5 h-5 text-emerald-500" />       // Sécurisé
```

### Métier Immobilier

```tsx
// Gestion propriétés
<BuildingOffice2Icon className="w-6 h-6" />  // Bâtiments
<HomeModernIcon className="w-6 h-6" />       // Lots/Appartements
<MapPinIcon className="w-5 h-5" />           // Localisation
<KeyIcon className="w-5 h-5" />              // Accès/Clés

// Interventions & maintenance
<WrenchScrewdriverIcon className="w-5 h-5" /> // Réparation
<BoltIcon className="w-5 h-5" />              // Électricité
<BeakerIcon className="w-5 h-5" />            // Plomberie
<FireIcon className="w-5 h-5" />              // Chauffage
<ShieldCheckIcon className="w-5 h-5" />       // Sécurité

// Communication & documents
<ChatBubbleLeftRightIcon className="w-5 h-5" /> // Messages
<DocumentTextIcon className="w-5 h-5" />        // Documents
<PhotoIcon className="w-5 h-5" />               // Photos
<PaperClipIcon className="w-4 h-4" />           // Pièces jointes
```

## 🎨 Icônes par Rôle Utilisateur

### 🔧 Admin Icons

```tsx
// Supervision & contrôle
<EyeIcon className="w-5 h-5" />              // Monitoring
<ChartBarIcon className="w-5 h-5" />         // Analytics
<UserGroupIcon className="w-5 h-5" />        // Gestion users
<ShieldCheckIcon className="w-5 h-5" />      // Sécurité
<ExclamationTriangleIcon className="w-5 h-5" /> // Alertes système
```

### 🏢 Owner Icons

```tsx
// Business & gestion
<BuildingOfficeIcon className="w-6 h-6" />   // Portfolio
<BanknotesIcon className="w-5 h-5" />        // Finances
<ChartPieIcon className="w-5 h-5" />         // Statistiques
<DocumentChartBarIcon className="w-5 h-5" /> // Rapports
<UserPlusIcon className="w-5 h-5" />         // Gestion locataires
```

### 🏠 Tenant Icons

```tsx
// Confort & simplicité
<HomeIcon className="w-6 h-6" />             // Mon logement
<WrenchScrewdriverIcon className="w-5 h-5" /> // Demandes
<ChatBubbleLeftIcon className="w-5 h-5" />   // Support
<CalendarIcon className="w-5 h-5" />         // Rendez-vous
<BellIcon className="w-5 h-5" />             // Notifications
```

### ⚡ Provider Icons

```tsx
// Action & efficacité
<WrenchScrewdriverIcon className="w-6 h-6" /> // Interventions
<ClockIcon className="w-5 h-5" />             // Planning
<CheckCircleIcon className="w-5 h-5" />       // Complétion
<CameraIcon className="w-5 h-5" />            // Photos travaux
<DocumentTextIcon className="w-5 h-5" />      // Rapports
```

## 🎨 Styles & Variants

### Outline vs Solid

```tsx
// Outline - Usage général, interface
import { HomeIcon } from "@heroicons/react/24/outline";
<HomeIcon className="w-5 h-5 text-slate-600" />;

// Solid - Emphasis, états actifs
import { HomeIcon } from "@heroicons/react/24/solid";
<HomeIcon className="w-5 h-5 text-sky-600" />;
```

### États Interactifs

```tsx
// Bouton avec icône
<button className="flex items-center space-x-2 text-slate-600 hover:text-slate-900">
  <PlusIcon className="w-4 h-4" />
  <span>Ajouter</span>
</button>

// Navigation active
<a className="flex items-center text-sky-600">
  <HomeIcon className="w-5 h-5 mr-3" />
  <span>Dashboard</span>
</a>

// Status badge avec icône
<div className="flex items-center space-x-1 text-emerald-600">
  <CheckCircleIcon className="w-4 h-4" />
  <span>Terminé</span>
</div>
```

## 📱 Responsive Icons

### Adaptation Mobile

```tsx
// Desktop: icône + texte
<div className="hidden lg:flex items-center space-x-2">
  <HomeIcon className="w-5 h-5" />
  <span>Dashboard</span>
</div>

// Mobile: icône seule
<div className="lg:hidden">
  <HomeIcon className="w-6 h-6" />
</div>

// Navigation bottom mobile
<nav className="grid grid-cols-4">
  <a className="flex flex-col items-center py-2">
    <HomeIcon className="w-6 h-6 mb-1" />
    <span className="text-xs">Accueil</span>
  </a>
</nav>
```

## 🎨 Couleurs d'Icônes

### Palette Status

```tsx
// Success / Positif
<CheckCircleIcon className="w-5 h-5 text-emerald-500" />

// Warning / Attention
<ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />

// Error / Critique
<XCircleIcon className="w-5 h-5 text-red-500" />

// Info / Neutre
<InformationCircleIcon className="w-5 h-5 text-blue-500" />

// Standard / Interface
<HomeIcon className="w-5 h-5 text-slate-600" />

// Active / Selected
<HomeIcon className="w-5 h-5 text-sky-600" />
```

## 🔧 Composant Icon System

### Icon Wrapper Component

```tsx
// src/components/ui/Icon.tsx
interface IconProps {
  icon: React.ComponentType<{ className?: string }>;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: "default" | "primary" | "success" | "warning" | "error";
  className?: string;
}

const Icon: React.FC<IconProps> = ({
  icon: IconComponent,
  size = "md",
  color = "default",
  className = "",
}) => {
  const sizes = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  };

  const colors = {
    default: "text-slate-600",
    primary: "text-sky-600",
    success: "text-emerald-500",
    warning: "text-amber-500",
    error: "text-red-500",
  };

  return (
    <IconComponent className={`${sizes[size]} ${colors[color]} ${className}`} />
  );
};

// Usage
<Icon icon={HomeIcon} size="lg" color="primary" />;
```

## 🚫 Anti-Patterns Icons

### À éviter absolument

```tsx
// ❌ MAUVAIS - Tailles incohérentes
<HomeIcon className="w-[17px] h-[17px]" />

// ❌ MAUVAIS - Couleurs hardcodées
<HomeIcon style={{ color: '#FF5733' }} />

// ❌ MAUVAIS - Mix de bibliothèques
<FontAwesomeIcon icon="home" />  // Incohérent avec Heroicons

// ❌ MAUVAIS - Icônes sans signification
<StarIcon /> // Pour représenter une intervention

// ✅ BON - Usage cohérent
<HomeIcon className="w-5 h-5 text-slate-600" />
```

## 📋 Checklist Icons

### Validation Usage

- [ ] Icône provient de Heroicons
- [ ] Taille utilise les tokens définis
- [ ] Couleur respecte la palette système
- [ ] Signification claire et universelle
- [ ] Accessible (aria-label si nécessaire)
- [ ] Cohérente avec le contexte

### Guidelines Accessibilité

```tsx
// Icône décorative
<HomeIcon className="w-5 h-5" aria-hidden="true" />

// Icône informative
<CheckCircleIcon
  className="w-5 h-5 text-emerald-500"
  aria-label="Intervention terminée"
/>

// Bouton icône seule
<button aria-label="Supprimer l'intervention">
  <TrashIcon className="w-4 h-4" />
</button>
```

---

**💡 Conseil** : Utilisez toujours des icônes avec une signification claire et universelle. Évitez les icônes ambiguës ou créatives.

**📋 Checklist** : Chaque icône doit avoir une taille et couleur cohérente avec le Design System et être accessible.
