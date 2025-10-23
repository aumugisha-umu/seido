# 🧩 Design System - Composants

## Vue d'ensemble

Notre bibliothèque de composants est construite selon les principes **MVP**, **réutilisabilité** et **accessibilité**. Chaque composant est conçu pour être **cohérent**, **flexible** et **facile à maintenir**. Les composants sont organisés en deux catégories : **UI (génériques)** et **Features (spécifiques métier)**.

## 📁 Architecture des Composants

### Structure de Dossiers

```
src/components/
├── ui/                    # Composants génériques réutilisables
│   ├── Button/
│   ├── Card/
│   ├── Input/
│   ├── Modal/
│   └── ...
├── features/              # Composants spécifiques métier
│   ├── admin/
│   ├── owner/
│   ├── tenant/
│   ├── provider/
│   └── shared/           # Composants métier partagés
└── layout/               # Composants de structure
    ├── Header/
    ├── Sidebar/
    └── Navigation/
```

## 🎯 Composants UI - Foundation

### Button - Actions Utilisateur

```tsx
// Variants disponibles
type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

// Usage de base
<Button variant="primary" size="md">
  Créer Intervention
</Button>

// Button avec icône
<Button variant="secondary" size="sm" icon={<PlusIcon />}>
  Ajouter
</Button>

// Button destructive
<Button variant="destructive" size="md">
  Supprimer
</Button>
```

**Implémentation :**

```tsx
// src/components/ui/Button/Button.tsx
interface ButtonProps {
  variant?: "primary" | "secondary" | "destructive" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  icon,
  loading,
  disabled,
  children,
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  const variants = {
    primary: "bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500",
    secondary:
      "bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-500",
    destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    ghost: "text-slate-600 hover:bg-slate-100 focus:ring-slate-500",
    link: "text-sky-600 hover:text-sky-800 underline",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      disabled={disabled || loading}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {loading ? "Chargement..." : children}
    </button>
  );
};
```

### Card - Conteneurs d'Information

```tsx
// Usage de base
<Card>
  <Card.Header>
    <Card.Title>Intervention #2025-001</Card.Title>
    <Card.Description>Réparation plomberie</Card.Description>
  </Card.Header>
  <Card.Content>
    <p>Description détaillée de l'intervention...</p>
  </Card.Content>
  <Card.Footer>
    <Button variant="primary">Approuver</Button>
    <Button variant="secondary">Reporter</Button>
  </Card.Footer>
</Card>

// Card avec status
<Card variant="warning">
  <Card.Header>
    <StatusBadge status="urgent" />
    <Card.Title>Intervention Urgente</Card.Title>
  </Card.Header>
</Card>
```

### Input - Saisie de Données

```tsx
// Input de base
<Input
  label="Référence du lot"
  placeholder="Ex: LOT-001"
  value={value}
  onChange={setValue}
/>

// Input avec validation
<Input
  label="Email"
  type="email"
  value={email}
  onChange={setEmail}
  error={errors.email}
  help="Format: user@domain.com"
/>

// Input avec icône
<Input
  label="Recherche"
  icon={<SearchIcon />}
  placeholder="Rechercher une intervention..."
/>
```

### Modal - Dialogues & Overlays

```tsx
// Modal de confirmation
<Modal open={isOpen} onClose={setIsOpen}>
  <Modal.Header>
    <Modal.Title>Confirmer la suppression</Modal.Title>
  </Modal.Header>
  <Modal.Content>
    <p>Êtes-vous sûr de vouloir supprimer cette intervention ?</p>
  </Modal.Content>
  <Modal.Footer>
    <Button variant="destructive" onClick={handleDelete}>
      Supprimer
    </Button>
    <Button variant="secondary" onClick={() => setIsOpen(false)}>
      Annuler
    </Button>
  </Modal.Footer>
</Modal>

// Modal formulaire
<Modal open={isOpen} onClose={setIsOpen} size="lg">
  <Modal.Header>
    <Modal.Title>Nouvelle Intervention</Modal.Title>
  </Modal.Header>
  <Modal.Content>
    <InterventionForm onSubmit={handleSubmit} />
  </Modal.Content>
</Modal>
```

### StatusBadge - Indicateurs d'État

```tsx
// Badge status intervention
<StatusBadge status="pending" />
<StatusBadge status="approved" />
<StatusBadge status="in_progress" />
<StatusBadge status="completed" />
<StatusBadge status="urgent" />

// Badge avec compteur
<StatusBadge status="pending" count={3} />

// Badge personnalisé
<StatusBadge
  status="custom"
  label="En Retard"
  color="amber"
/>
```

## 🎯 Composants Features - Métier

### InterventionCard - Gestion Interventions

```tsx
// Card intervention pour Owner
<InterventionCard
  intervention={intervention}
  role="owner"
  onApprove={handleApprove}
  onReject={handleReject}
  onAssign={handleAssign}
/>

// Card intervention pour Tenant
<InterventionCard
  intervention={intervention}
  role="tenant"
  onUpdate={handleUpdate}
  showProgress={true}
/>

// Card intervention pour Provider
<InterventionCard
  intervention={intervention}
  role="provider"
  onComplete={handleComplete}
  onUpdateStatus={handleStatusUpdate}
/>
```

### PropertyCard - Gestion Propriétés

```tsx
// Card propriété avec stats
<PropertyCard property={property}>
  <PropertyCard.Header>
    <PropertyCard.Image src={property.image} />
    <PropertyCard.Title>{property.name}</PropertyCard.Title>
    <PropertyCard.Address>{property.address}</PropertyCard.Address>
  </PropertyCard.Header>
  <PropertyCard.Stats>
    <StatItem label="Lots" value={property.totalLots} />
    <StatItem label="Occupés" value={property.occupiedLots} />
    <StatItem label="Taux" value={`${property.occupancyRate}%`} />
  </PropertyCard.Stats>
  <PropertyCard.Actions>
    <Button variant="ghost" size="sm">
      Voir détails
    </Button>
    <Button variant="secondary" size="sm">
      Gérer
    </Button>
  </PropertyCard.Actions>
</PropertyCard>
```

### UserProfile - Profils Utilisateurs

```tsx
// Profile Admin complet
<UserProfile user={user} role="admin" editable={true}>
  <UserProfile.Avatar size="lg" />
  <UserProfile.Info>
    <UserProfile.Name>{user.name}</UserProfile.Name>
    <UserProfile.Email>{user.email}</UserProfile.Email>
    <UserProfile.Role>{user.role}</UserProfile.Role>
  </UserProfile.Info>
  <UserProfile.Actions>
    <Button variant="secondary">Éditer</Button>
    <Button variant="destructive">Désactiver</Button>
  </UserProfile.Actions>
</UserProfile>

// Profile Tenant simple
<UserProfile user={user} role="tenant" compact={true}>
  <UserProfile.Avatar size="md" />
  <UserProfile.Info>
    <UserProfile.Name>{user.name}</UserProfile.Name>
    <UserProfile.Status status={user.status} />
  </UserProfile.Info>
</UserProfile>
```

### DataTable - Tableaux de Données

```tsx
// Table interventions avec filters
<DataTable
  data={interventions}
  columns={interventionColumns}
  filters={interventionFilters}
  sortable={true}
  pagination={true}
  onRowClick={handleRowClick}
/>

// Table simple users
<DataTable
  data={users}
  columns={userColumns}
  compact={true}
  actions={userActions}
/>
```

## 📊 Composants Spécialisés par Rôle

### 🔧 Admin Components

```tsx
// AdminDashboard - KPIs et monitoring
<AdminDashboard>
  <AdminDashboard.KPIs>
    <KPICard title="Utilisateurs Actifs" value={1234} trend="+5%" />
    <KPICard title="Interventions" value={567} trend="+12%" />
  </AdminDashboard.KPIs>
  <AdminDashboard.Charts>
    <ActivityChart data={activityData} />
    <UsageChart data={usageData} />
  </AdminDashboard.Charts>
</AdminDashboard>

// AdminUserManager - Gestion utilisateurs
<AdminUserManager>
  <UserFilters onFilterChange={handleFilter} />
  <UserTable users={users} onAction={handleUserAction} />
  <UserModal user={selectedUser} onSave={handleSave} />
</AdminUserManager>
```

### 🏢 Owner Components

```tsx
// OwnerPortfolio - Vue portfolio
<OwnerPortfolio>
  <PortfolioSummary data={portfolioData} />
  <PropertyGrid properties={properties} />
  <RecentInterventions interventions={recentInterventions} />
</OwnerPortfolio>

// PropertyManager - Gestion propriétés
<PropertyManager>
  <PropertyFilters onFilter={handleFilter} />
  <PropertyCards properties={filteredProperties} />
  <PropertyActions onAction={handleAction} />
</PropertyManager>
```

### 🏠 Tenant Components

```tsx
// TenantDashboard - Interface locataire
<TenantDashboard>
  <WelcomeSection tenant={tenant} />
  <ActiveInterventions interventions={activeInterventions} />
  <QuickActions actions={tenantActions} />
</TenantDashboard>

// InterventionRequest - Demande intervention
<InterventionRequest>
  <CategorySelector onSelect={handleCategory} />
  <DescriptionForm onSubmit={handleSubmit} />
  <PhotoUpload onUpload={handlePhotoUpload} />
</InterventionRequest>
```

### ⚡ Provider Components

```tsx
// ProviderPortal - Interface prestataire
<ProviderPortal>
  <InterventionDetails intervention={intervention} />
  <ContactInfo contacts={contacts} />
  <ActionButtons onAction={handleAction} />
</ProviderPortal>

// CompletionForm - Finalisation intervention
<CompletionForm>
  <WorkDescription onDescribe={handleDescription} />
  <PhotoGallery onPhotoAdd={handlePhotoAdd} />
  <InvoiceUpload onInvoiceUpload={handleInvoice} />
</CompletionForm>
```

## 🎨 Theming & Variants

### Theme System

```tsx
// Composant avec theme context
const Card = ({ variant = "default", ...props }) => {
  const theme = useTheme();

  const variants = {
    default: "bg-white border-slate-200",
    success: "bg-emerald-50 border-emerald-200",
    warning: "bg-amber-50 border-amber-200",
    error: "bg-red-50 border-red-200",
  };

  return (
    <div className={`${baseClasses} ${variants[variant]}`}>
      {props.children}
    </div>
  );
};
```

### Dark Mode Support

```tsx
// Composant avec support dark mode
const Button = ({ variant, ...props }) => {
  const darkClasses = {
    primary: "dark:bg-sky-700 dark:hover:bg-sky-600",
    secondary: "dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600",
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${darkClasses[variant]}`}
    >
      {props.children}
    </button>
  );
};
```

## 📱 Responsive Components

### Mobile Adaptations

```tsx
// Navigation responsive
<Navigation className="hidden lg:flex"> {/* Desktop */}
<MobileNavigation className="lg:hidden"> {/* Mobile */}

// Cards responsive
<Card className="p-4 lg:p-6"> {/* Padding adaptatif */}
  <Card.Title className="text-lg lg:text-xl"> {/* Typo responsive */}
</Card>

// Table responsive
<div className="hidden lg:block">
  <DesktopTable data={data} />
</div>
<div className="lg:hidden">
  <MobileCardList data={data} />
</div>
```

## ♿ Accessibilité

### Guidelines Accessibilité

```tsx
// Button accessible
<Button
  aria-label="Supprimer l'intervention #2025-001"
  aria-describedby="delete-help"
>
  Supprimer
</Button>
<div id="delete-help" className="sr-only">
  Cette action est irréversible
</div>

// Modal accessible
<Modal
  role="dialog"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Titre du modal</h2>
  <p id="modal-description">Description</p>
</Modal>

// Form accessible
<label htmlFor="intervention-title">
  Titre de l'intervention
</label>
<input
  id="intervention-title"
  aria-required="true"
  aria-invalid={!!errors.title}
  aria-describedby={errors.title ? "title-error" : undefined}
/>
{errors.title && (
  <div id="title-error" role="alert">
    {errors.title}
  </div>
)}
```

## 🔧 Composition Patterns

### Compound Components

```tsx
// Pattern composition pour flexibilité
<InterventionCard>
  <InterventionCard.Header>
    <InterventionCard.Status status="urgent" />
    <InterventionCard.Title>INT-001</InterventionCard.Title>
    <InterventionCard.Timestamp>Il y a 2h</InterventionCard.Timestamp>
  </InterventionCard.Header>

  <InterventionCard.Content>
    <InterventionCard.Description>
      Fuite d'eau dans la salle de bain...
    </InterventionCard.Description>
    <InterventionCard.Location>Bâtiment A, Lot 2B</InterventionCard.Location>
  </InterventionCard.Content>

  <InterventionCard.Footer>
    <InterventionCard.Actions role="owner">
      <Button variant="primary">Approuver</Button>
      <Button variant="secondary">Rejeter</Button>
    </InterventionCard.Actions>
  </InterventionCard.Footer>
</InterventionCard>
```

### Render Props Pattern

```tsx
// Pattern flexible pour données
<DataFetcher url="/api/interventions">
  {({ data, loading, error }) => (
    <>
      {loading && <Spinner />}
      {error && <ErrorMessage error={error} />}
      {data && <InterventionsList interventions={data} />}
    </>
  )}
</DataFetcher>
```

## 🚫 Anti-Patterns Composants

### À éviter absolument

```tsx
// ❌ MAUVAIS - Composant trop spécialisé
<InterventionCardForOwnerInDashboardWithActionsAndStatus /> // Trop spécifique

// ❌ MAUVAIS - Props boolean hell
<Button
  isPrimary={true}
  isLarge={false}
  hasIcon={true}
  isLoading={false}
/> // Utiliser variants

// ❌ MAUVAIS - Styles inline hardcodés
<div style={{ backgroundColor: '#FF0000' }}> // Violer le design system

// ✅ BON - Composant générique et flexible
<Card variant="warning">
  <InterventionContent intervention={intervention} />
  <ActionButtons role={user.role} actions={availableActions} />
</Card>
```

## 📋 Checklist Composants

### Avant de créer un nouveau composant

- [ ] Vérifier s'il existe déjà un composant similaire
- [ ] Définir la responsabilité unique du composant
- [ ] Prévoir les variants nécessaires
- [ ] Implémenter l'accessibilité (ARIA, keyboard)
- [ ] Tester responsive (mobile/desktop)
- [ ] Documenter l'usage et les props
- [ ] Ajouter les tests unitaires

### Critères de qualité

- [ ] Réutilisable dans différents contextes
- [ ] Props API claire et cohérente
- [ ] Performance optimisée (memo si nécessaire)
- [ ] Accessibilité WCAG 2.1 AA
- [ ] Documentation complète
- [ ] Tests de régression

---

**💡 Conseil** : Privilégiez la composition à l'héritage. Créez des composants simples qui se combinent plutôt qu'un composant complexe qui fait tout.

**📋 Checklist** : Chaque nouveau composant doit être accessible, responsive et respecter les tokens du Design System.
