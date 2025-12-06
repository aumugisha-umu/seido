# 🎨 Design System - Icônes

> 📁 **Source de vérité :** `app/globals.css` contient tous les design tokens centralisés (couleurs OKLCH, spacing, shadows, fonts)

## Vue d'ensemble

Notre système d'icônes privilégie la **cohérence**, la **lisibilité** et la **reconnaissance** immédiate. Nous utilisons **Lucide React** comme bibliothèque principale pour ses icônes SVG optimisées et son excellente intégration avec React.

## 📚 Bibliothèque Principale

### Lucide React - Foundation

```tsx
// Import des icônes principales
import {
  Home,
  Building,
  Building2,
  Wrench,
  User,
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Settings,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Download,
} from "lucide-react";
```

**Pourquoi Lucide React ?**

- ✅ Fork maintenu activement de Feather Icons
- ✅ 1400+ icônes disponibles
- ✅ Icônes SVG optimisées et légères (~1-2KB par icône)
- ✅ Support TypeScript natif
- ✅ Props standardisées (`size`, `color`, `strokeWidth`)
- ✅ Tree-shakeable (seules les icônes importées sont incluses)
- ✅ Parfaitement compatible avec Tailwind CSS

### Installation

```bash
npm install lucide-react
```

## 📏 Tailles Standardisées

### Système de Tailles

```css
/* Tailles d'icônes harmonieuses */
--icon-xs: 12px; /* Badges, inline */
--icon-sm: 16px; /* Boutons, navigation */
--icon-md: 20px; /* Standard */
--icon-lg: 24px; /* Headers, actions */
--icon-xl: 32px; /* Hero, illustration */
--icon-2xl: 48px; /* Landing, empty states */
```

### Usage avec Lucide

```tsx
// Via prop size (recommandé)
<Home size={16} />   // 16px - sm
<Home size={20} />   // 20px - md (standard)
<Home size={24} />   // 24px - lg
<Home size={32} />   // 32px - xl

// Via className Tailwind
<Home className="w-4 h-4" />   // 16px - sm
<Home className="w-5 h-5" />   // 20px - md (standard)
<Home className="w-6 h-6" />   // 24px - lg
<Home className="w-8 h-8" />   // 32px - xl
```

### Props Lucide React

```tsx
interface LucideProps {
  size?: number | string;       // Taille en pixels
  color?: string;               // Couleur (currentColor par défaut)
  strokeWidth?: number;         // Épaisseur du trait (2 par défaut)
  absoluteStrokeWidth?: boolean; // Stroke indépendant de la taille
  className?: string;           // Classes CSS/Tailwind
}
```

## 🎯 Icônes par Contexte

### Navigation & Interface

```tsx
// Navigation principale
<Home size={20} />           // Accueil
<Building2 size={20} />      // Propriétés / Biens
<Wrench size={20} />         // Interventions
<User size={20} />           // Utilisateurs
<Settings size={20} />       // Paramètres
<Bell size={20} />           // Notifications

// Interface actions
<Plus size={16} />           // Ajouter
<Pencil size={16} />         // Éditer
<Trash2 size={16} />         // Supprimer
<Eye size={16} />            // Voir détails
<Download size={16} />       // Télécharger
<Copy size={16} />           // Copier
<Search size={16} />         // Rechercher
```

### Status & États

```tsx
// Status interventions
<CheckCircle size={20} className="text-emerald-500" />     // Terminé
<Clock size={20} className="text-amber-500" />              // En attente
<Wrench size={20} className="text-blue-500" />              // En cours
<XCircle size={20} className="text-red-500" />              // Rejeté

// Alertes & notifications
<Bell size={20} />                                          // Notifications
<AlertTriangle size={20} className="text-amber-500" />     // Attention
<Info size={20} className="text-blue-500" />               // Information
<ShieldCheck size={20} className="text-emerald-500" />     // Sécurisé
```

### Métier Immobilier

```tsx
// Gestion propriétés
<Building2 size={24} />       // Bâtiments / Immeubles
<Home size={24} />            // Lots / Appartements
<MapPin size={20} />          // Localisation
<Key size={20} />             // Accès / Clés
<FileText size={20} />        // Documents

// Interventions & maintenance
<Wrench size={20} />          // Réparation
<Zap size={20} />             // Électricité
<Droplets size={20} />        // Plomberie
<Flame size={20} />           // Chauffage
<ShieldCheck size={20} />     // Sécurité
<Hammer size={20} />          // Travaux

// Communication & documents
<MessageSquare size={20} />   // Messages
<FileText size={20} />        // Documents
<Image size={20} />           // Photos
<Paperclip size={16} />       // Pièces jointes
<Mail size={20} />            // Email
<Phone size={20} />           // Téléphone
```

## 🎨 Icônes par Rôle Utilisateur

### 🔧 Admin Icons

```tsx
// Supervision & contrôle
<Eye size={20} />              // Monitoring
<BarChart3 size={20} />        // Analytics
<Users size={20} />            // Gestion users
<ShieldCheck size={20} />      // Sécurité
<AlertTriangle size={20} />    // Alertes système
<Database size={20} />         // Base de données
```

### 🏢 Gestionnaire Icons

```tsx
// Business & gestion
<Building2 size={24} />        // Portfolio
<Banknote size={20} />         // Finances
<PieChart size={20} />         // Statistiques
<FileBarChart size={20} />     // Rapports
<UserPlus size={20} />         // Gestion locataires
<ClipboardList size={20} />    // Liste des tâches
```

### 🏠 Locataire Icons

```tsx
// Confort & simplicité
<Home size={24} />             // Mon logement
<Wrench size={20} />           // Demandes
<MessageCircle size={20} />    // Support
<Calendar size={20} />         // Rendez-vous
<Bell size={20} />             // Notifications
<HelpCircle size={20} />       // Aide
```

### ⚡ Prestataire Icons

```tsx
// Action & efficacité
<Wrench size={24} />           // Interventions
<Clock size={20} />            // Planning
<CheckCircle size={20} />      // Complétion
<Camera size={20} />           // Photos travaux
<FileText size={20} />         // Rapports
<Navigation size={20} />       // Itinéraire
```

## 🎨 Styles & Variants

### Couleurs avec Tailwind

```tsx
// Standard / Interface
<Home className="text-slate-600" />

// Active / Selected
<Home className="text-primary" />

// Success / Positif
<CheckCircle className="text-emerald-500" />

// Warning / Attention
<AlertTriangle className="text-amber-500" />

// Error / Critique
<XCircle className="text-red-500" />

// Info / Neutre
<Info className="text-blue-500" />
```

### États Interactifs

```tsx
// Bouton avec icône
<button className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
  <Plus size={16} />
  <span>Ajouter</span>
</button>

// Navigation active
<a className="flex items-center gap-3 text-primary">
  <Home size={20} />
  <span>Dashboard</span>
</a>

// Status badge avec icône
<div className="flex items-center gap-1 text-emerald-600">
  <CheckCircle size={16} />
  <span>Terminé</span>
</div>
```

### Stroke Width

```tsx
// Défaut (2)
<Home size={20} strokeWidth={2} />

// Plus fin (1.5) - élégant
<Home size={20} strokeWidth={1.5} />

// Plus épais (2.5) - impact
<Home size={20} strokeWidth={2.5} />
```

## 📱 Responsive Icons

### Adaptation Mobile

```tsx
// Desktop: icône + texte
<div className="hidden lg:flex items-center gap-2">
  <Home size={20} />
  <span>Dashboard</span>
</div>

// Mobile: icône seule (plus grande)
<div className="lg:hidden">
  <Home size={24} />
</div>

// Navigation bottom mobile
<nav className="grid grid-cols-4">
  <a className="flex flex-col items-center py-2">
    <Home size={24} className="mb-1" />
    <span className="text-xs">Accueil</span>
  </a>
</nav>
```

## 🔧 Composant Icon System

### Icon Wrapper Component

```tsx
// components/ui/icon.tsx
import { LucideIcon } from 'lucide-react';

interface IconProps {
  icon: LucideIcon;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: "default" | "primary" | "success" | "warning" | "error";
  className?: string;
}

const sizes = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

const colors = {
  default: "text-slate-600",
  primary: "text-primary",
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-red-500",
};

export const Icon: React.FC<IconProps> = ({
  icon: IconComponent,
  size = "md",
  color = "default",
  className = "",
}) => {
  return (
    <IconComponent
      size={sizes[size]}
      className={`${colors[color]} ${className}`}
    />
  );
};

// Usage
import { Home } from 'lucide-react';
<Icon icon={Home} size="lg" color="primary" />
```

## 🚫 Anti-Patterns Icons

### À éviter absolument

```tsx
// ❌ MAUVAIS - Tailles incohérentes
<Home size={17} />  // Utiliser les tailles standards

// ❌ MAUVAIS - Couleurs hardcodées
<Home style={{ color: '#FF5733' }} />  // Utiliser les classes Tailwind

// ❌ MAUVAIS - Mix de bibliothèques
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
<FontAwesomeIcon icon="home" />  // Incohérent avec Lucide

// ❌ MAUVAIS - Icône sans signification claire
<Star />  // Pour représenter une intervention

// ✅ BON - Usage cohérent
<Home size={20} className="text-slate-600" />
```

### Ne pas utiliser

- ❌ **Heroicons** — Non utilisé dans le projet
- ❌ **Font Awesome** — Trop lourd, style différent
- ❌ **Material Icons** — Style incompatible
- ❌ **Icônes personnalisées SVG** — Sauf cas très spécifique

## 📋 Checklist Icons

### Validation Usage

- [ ] Icône provient de Lucide React
- [ ] Taille utilise les tokens définis (16, 20, 24, 32)
- [ ] Couleur respecte la palette système (Tailwind classes)
- [ ] Signification claire et universelle
- [ ] Accessible (aria-label si nécessaire)
- [ ] Cohérente avec le contexte

### Guidelines Accessibilité

```tsx
// Icône décorative (accompagnée de texte)
<Home size={20} aria-hidden="true" />

// Icône informative (seule, transmet une info)
<CheckCircle
  size={20}
  className="text-emerald-500"
  aria-label="Intervention terminée"
/>

// Bouton icône seule
<button aria-label="Supprimer l'intervention">
  <Trash2 size={16} />
</button>

// Icône dans un lien
<a href="/dashboard" aria-label="Retour au tableau de bord">
  <Home size={24} />
</a>
```

## 🔍 Recherche d'Icônes

Pour trouver une icône spécifique :

1. **Site officiel** : [lucide.dev](https://lucide.dev)
2. **Recherche par mot-clé** : Utilisez la barre de recherche
3. **Catégories** : Navigation, Actions, Status, Communication, etc.

### Icônes Fréquemment Utilisées dans SEIDO

| Usage | Icône | Import |
|-------|-------|--------|
| Accueil | Home | `import { Home } from 'lucide-react'` |
| Immeuble | Building2 | `import { Building2 } from 'lucide-react'` |
| Appartement | Home | `import { Home } from 'lucide-react'` |
| Intervention | Wrench | `import { Wrench } from 'lucide-react'` |
| Contact | User | `import { User } from 'lucide-react'` |
| Ajouter | Plus | `import { Plus } from 'lucide-react'` |
| Modifier | Pencil | `import { Pencil } from 'lucide-react'` |
| Supprimer | Trash2 | `import { Trash2 } from 'lucide-react'` |
| Valider | CheckCircle | `import { CheckCircle } from 'lucide-react'` |
| Annuler | XCircle | `import { XCircle } from 'lucide-react'` |
| Notification | Bell | `import { Bell } from 'lucide-react'` |
| Paramètres | Settings | `import { Settings } from 'lucide-react'` |
| Recherche | Search | `import { Search } from 'lucide-react'` |
| Menu | Menu | `import { Menu } from 'lucide-react'` |
| Fermer | X | `import { X } from 'lucide-react'` |

---

**💡 Conseil :** Utilisez toujours des icônes avec une signification claire et universelle. Évitez les icônes ambiguës ou créatives.

**📋 Checklist :** Chaque icône doit utiliser Lucide React, avoir une taille et couleur cohérente avec le Design System, et être accessible.
