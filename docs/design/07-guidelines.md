# 📋 Design System - Guidelines & Bonnes Pratiques

> 📁 **Source de vérité :** `app/globals.css` contient tous les design tokens centralisés (couleurs OKLCH, spacing, shadows, fonts)

> 📖 **Guide de référence :** [UX/UI Decision Guide](./ux-ui-decision-guide.md)
> 👥 **Personas :** [Gestionnaire](./persona-gestionnaire-unifie.md) | [Locataire](./persona-locataire.md) | [Prestataire](./persona-prestataire.md)

## Vue d'ensemble

Ces guidelines définissent les **principes fondamentaux** et **bonnes pratiques** pour maintenir la cohérence, l'accessibilité et la qualité de l'expérience utilisateur sur la plateforme SEIDO de gestion immobilière.

## 🎯 Principes Directeurs

### 1. Simplicité & Clarté (KISS)

> "Chaque interface doit être intuitive pour un utilisateur non-technique"

- **Hiérarchie visuelle claire** : L'information la plus importante est immédiatement visible
- **Actions évidentes** : Les boutons et liens sont facilement identifiables
- **Langage simple** : Éviter le jargon technique inutile
- **Progressive disclosure** : Révéler l'information par niveaux de détail

### 2. Cohérence Universelle

> "Une fois appris, l'interface doit être prévisible partout"

- **Patterns répétés** : Mêmes interactions pour mêmes actions
- **Vocabulaire unifié** : Terminologie constante dans toute l'app
- **Styles harmonieux** : Respect des tokens du Design System
- **Comportements standardisés** : États loading, erreur, succès identiques

### 3. Modularité & Réutilisabilité

> "Créer une fois, utiliser partout"

**Avant de créer un composant :**
1. ✅ Vérifier si shadcn/ui a un composant similaire (50+ disponibles)
2. ✅ Chercher dans `components/` si un composant existe déjà
3. ✅ Considérer l'extension d'un composant existant avec des props/variants
4. ✅ Composer plusieurs composants simples plutôt qu'un composant monolithique

**Anti-patterns à éviter :**
- ❌ Copier-coller un composant pour modification mineure
- ❌ Styles inline ou valeurs hardcodées
- ❌ Composant trop spécifique (ex: `ButtonForDashboardOnlyForAdmin`)
- ❌ Duplication de logic business dans les composants UI

### 4. Accessibilité Inclusive

> "L'application doit être utilisable par tous, sans exception"

- **Contraste suffisant** : Minimum WCAG 2.1 AA (4.5:1)
- **Navigation clavier** : Tous les éléments accessibles au clavier
- **Lecteurs d'écran** : ARIA labels et descriptions appropriées
- **Zones tactiles** : Minimum 44px×44px sur mobile

## ♿ Accessibilité - Standards WCAG 2.1

### Niveau AA Obligatoire

#### Contraste des Couleurs

```tsx
// ✅ BON - Contraste suffisant
className = "text-slate-900 bg-white"; // Ratio 18.07:1

// ❌ MAUVAIS - Contraste insuffisant
className = "text-slate-400 bg-white"; // Ratio 2.5:1
```

#### Navigation Clavier

```tsx
// ✅ BON - Focus visible et logique
<button className="focus:ring-2 focus:ring-sky-500 focus:outline-none">
  Action
</button>

// ✅ BON - Tab order cohérent
<div>
  <input tabIndex={1} />
  <button tabIndex={2} />
  <a tabIndex={3} />
</div>
```

#### ARIA Labels

```tsx
// ✅ BON - Labels descriptifs
<button aria-label="Supprimer l'intervention #2025-001">
  <TrashIcon />
</button>

// ✅ BON - États communiqués
<div role="alert" aria-live="polite">
  Intervention créée avec succès
</div>

// ✅ BON - Relations établies
<label htmlFor="intervention-title">Titre</label>
<input id="intervention-title" aria-describedby="title-help" />
<div id="title-help">Maximum 100 caractères</div>
```

### Zones Tactiles Mobiles

```tsx
// ✅ BON - Zone tactile suffisante
className = "p-3 min-h-[44px] min-w-[44px]"; // 44px minimum

// ❌ MAUVAIS - Zone trop petite
className = "p-1"; // < 44px
```

## 📱 Responsive Design

### Mobile-First Approach

```tsx
// ✅ BON - Mobile-first progression
className="text-sm md:text-base lg:text-lg"

// ✅ BON - Navigation adaptative
<div className="block lg:hidden"> {/* Mobile nav */}
<div className="hidden lg:block"> {/* Desktop nav */}
```

### Breakpoints Cohérents

- **Mobile** : 320px - 767px (touch-first)
- **Tablet** : 768px - 1023px (hybrid)
- **Desktop** : 1024px+ (precision-first)

### Touch vs Pointer

```tsx
// Espacement mobile généreux
className = "p-4 space-y-4 lg:p-6 lg:space-y-6";

// Actions tactiles évidentes
className = "bg-sky-600 text-white py-3 px-6 rounded-lg text-base font-medium";
```

## 🎨 UX Guidelines par Rôle

### 🔧 Admin - Efficacité & Contrôle

**Objectif** : Maximum d'information, actions rapides

```tsx
// Interface dense mais organisée
<div className="grid grid-cols-12 gap-4">
  <aside className="col-span-2"> {/* Navigation compacte */}
  <main className="col-span-10"> {/* Contenu maximisé */}
</div>

// Actions groupées logiquement
<div className="flex space-x-2">
  <Button size="sm" variant="secondary">Voir</Button>
  <Button size="sm" variant="primary">Éditer</Button>
  <Button size="sm" variant="destructive">Supprimer</Button>
</div>
```

### 🏢 Gestionnaire - Clarté Business

**Objectif** : Insights clairs, décisions informées

```tsx
// KPIs mis en évidence
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  <KPICard title="Taux d'occupation" value="94%" trend="+2%" />
  <KPICard title="Revenus" value="€15,450" trend="+12%" />
</div>

// Actions business contextuelles
<Card>
  <Card.Header>
    <Card.Title>Bâtiment Résidence Parc</Card.Title>
    <StatusBadge status="needs_attention" />
  </Card.Header>
  <Card.Actions>
    <Button variant="primary">Voir détails</Button>
    <Button variant="secondary">Gérer</Button>
  </Card.Actions>
</Card>
```

### 🏠 Tenant - Simplicité & Guidance

**Objectif** : Facilité d'usage, guidance claire

```tsx
// Interface accueillante
<div className="max-w-2xl mx-auto space-y-8">
  <header className="text-center">
    <h1 className="text-2xl font-semibold text-slate-800">
      Bonjour {tenant.name}
    </h1>
    <p className="text-slate-600">Voici vos informations de logement</p>
  </header>
  // Actions guidées
  <div className="space-y-4">
    <Button variant="primary" size="lg" className="w-full">
      📞 Demander une intervention
    </Button>
    <Button variant="secondary" size="lg" className="w-full">
      💬 Contacter le propriétaire
    </Button>
  </div>
</div>
```

### ⚡ Provider - Action & Efficacité

**Objectif** : Actions rapides, informations essentielles

```tsx
// Interface action-oriented
<div className="space-y-6">
  <Card variant="urgent">
    <Card.Header>
      <div className="flex justify-between items-start">
        <div>
          <Card.Title>INT-2025-001</Card.Title>
          <p className="text-sm text-slate-600">Plomberie - Urgent</p>
        </div>
        <StatusBadge status="assigned" />
      </div>
    </Card.Header>

    <Card.Actions>
      <Button variant="primary" size="lg">
        🚀 Commencer l'intervention
      </Button>
    </Card.Actions>
  </Card>
</div>
```

## 🔄 États & Feedback Utilisateur

### Loading States

```tsx
// Loading bouton
<Button loading={isSubmitting}>
  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
</Button>

// Loading page/section
<div className="animate-pulse space-y-4">
  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
</div>

// Loading avec contexte
<div className="text-center py-8">
  <Spinner className="w-8 h-8 mx-auto mb-4" />
  <p className="text-slate-600">Chargement de vos interventions...</p>
</div>
```

### Success States

```tsx
// Success immédiat
<div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
  <div className="flex items-center">
    <CheckCircleIcon className="w-5 h-5 text-emerald-500 mr-3" />
    <span className="text-emerald-800">Intervention créée avec succès</span>
  </div>
</div>

// Success avec action
<Toast variant="success">
  <span>Modification enregistrée</span>
  <Button variant="ghost" size="sm">Annuler</Button>
</Toast>
```

### Error States

```tsx
// Error inline formulaire
<Input
  error="Ce champ est obligatoire"
  aria-invalid="true"
  aria-describedby="field-error"
/>

// Error page/section
<div className="text-center py-12">
  <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
  <h3 className="text-lg font-medium text-slate-900 mb-2">
    Erreur de chargement
  </h3>
  <p className="text-slate-600 mb-4">
    Impossible de charger les données
  </p>
  <Button variant="primary" onClick={retry}>
    Réessayer
  </Button>
</div>
```

### Empty States

```tsx
// Empty state avec action
<div className="text-center py-12">
  <BuildingOfficeIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
  <h3 className="text-lg font-medium text-slate-900 mb-2">Aucune propriété</h3>
  <p className="text-slate-600 mb-6">
    Commencez par ajouter votre première propriété
  </p>
  <Button variant="primary">Ajouter une propriété</Button>
</div>
```

## 📝 Formulaires & Validation

### Validation en Temps Réel

```tsx
// Validation progressive
<Input
  label="Email"
  value={email}
  onChange={setEmail}
  onBlur={validateEmail}
  error={errors.email}
  success={email && !errors.email}
  help="Utilisé pour les notifications importantes"
/>;

// Messages contextuels
{
  errors.email && (
    <div className="text-sm text-red-600 mt-1">{errors.email}</div>
  );
}

{
  email && !errors.email && (
    <div className="text-sm text-emerald-600 mt-1">✓ Format valide</div>
  );
}
```

### Prévention d'Erreurs

```tsx
// Désactivation contextuelle
<Button
  disabled={!isFormValid || isSubmitting}
  variant={isFormValid ? "primary" : "secondary"}
>
  {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
</Button>

// Guidage visuel
<div className="space-y-4">
  <ProgressSteps currentStep={2} totalSteps={4} />
  <p className="text-sm text-slate-600">
    Étape 2 sur 4 - Informations du lot
  </p>
</div>
```

## 🚫 Anti-Patterns UX

### À éviter absolument

```tsx
// ❌ MAUVAIS - Actions sans feedback
<button onClick={deleteItem}> // Pas de confirmation
  Supprimer
</button>

// ❌ MAUVAIS - Messages cryptiques
<div>Erreur 500</div> // Pas d'explication utilisateur

// ❌ MAUVAIS - Navigation cassée
<a href="#" onClick={handleClick}> // Pas de vraie URL

// ❌ MAUVAIS - Responsive cassé
<div className="w-[800px]"> // Largeur fixe

// ✅ BON - UX soignée
<Modal>
  <Modal.Title>Confirmer la suppression</Modal.Title>
  <Modal.Content>
    Cette action est irréversible. Êtes-vous sûr ?
  </Modal.Content>
  <Modal.Actions>
    <Button variant="destructive" onClick={confirmDelete}>
      Oui, supprimer
    </Button>
    <Button variant="secondary" onClick={cancel}>
      Annuler
    </Button>
  </Modal.Actions>
</Modal>
```

## 📋 Checklist Qualité UX

### Avant chaque release

- [ ] **Navigation** : Tous les liens fonctionnent
- [ ] **Responsive** : Testé sur mobile/tablet/desktop
- [ ] **Accessibilité** : Navigation clavier + contraste
- [ ] **Performance** : Chargement < 3s
- [ ] **Erreurs** : Messages clairs et actions correctives
- [ ] **Loading** : États intermédiaires gérés
- [ ] **Validation** : Feedback temps réel formulaires
- [ ] **Cohérence** : Design System respecté

### Tests utilisateurs

- [ ] **Admin** : Peut accomplir ses tâches rapidement
- [ ] **Gestionnaire** : Comprend ses KPIs et peut prendre des décisions
- [ ] **Locataire** : Peut demander une intervention facilement
- [ ] **Prestataire** : Peut traiter une intervention efficacement

---

**💡 Conseil** : Testez toujours avec de vrais utilisateurs des différents rôles avant de valider une interface.

**📋 Checklist** : Chaque nouvelle fonctionnalité doit respecter l'accessibilité WCAG 2.1 AA et être responsive de mobile à desktop.
