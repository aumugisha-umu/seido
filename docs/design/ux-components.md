# SEIDO - Composants UI Recommandés

> **Fichier parent** : [ux-ui-decision-guide.md](./ux-ui-decision-guide.md)
> **Version** : 1.1 | **Date** : 2025-12-07

Ce document décrit les patterns de composants UI recommandés pour SEIDO.

---

## Table des Matières

1. [Navigation Patterns](#1-navigation-patterns)
2. [Form Patterns](#2-form-patterns)
3. [Notification Patterns](#3-notification-patterns)
4. [Mobile-First Considerations](#4-mobile-first-considerations)

---

## 1. Navigation Patterns

### 1.1 Desktop Navigation (Sidebar)

```tsx
<Sidebar collapsible defaultCollapsed={false}>
  <SidebarHeader>
    <Logo collapsed={isCollapsed} />
    <TeamSwitcher />
  </SidebarHeader>

  <SidebarNav>
    <NavSection label="Principal">
      <NavItem
        icon={LayoutDashboard}
        label="Dashboard"
        href="/gestionnaire/dashboard"
        badge={pendingCount}
      />
      <NavItem
        icon={Wrench}
        label="Interventions"
        href="/gestionnaire/interventions"
        badge={activeCount}
      />
      <NavItem icon={Building} label="Biens" href="/gestionnaire/biens" />
      <NavItem icon={Users} label="Contacts" href="/gestionnaire/contacts" />
    </NavSection>

    <NavSection label="Outils">
      <NavItem icon={Mail} label="Emails" />
      <NavItem icon={FileText} label="Documents" />
      <NavItem icon={Settings} label="Paramètres" />
    </NavSection>
  </SidebarNav>

  <SidebarFooter>
    <UserMenu />
  </SidebarFooter>
</Sidebar>
```

**Responsive Breakpoints** :
| Device | Comportement |
|--------|--------------|
| Desktop (≥1024px) | Sidebar always visible |
| Tablet (768-1023px) | Sidebar collapsible |
| Mobile (<768px) | Drawer overlay |

### 1.2 Mobile Navigation (Bottom Tabs)

```tsx
<MobileLayout>
  <Content className="pb-16">
    {children}
  </Content>

  <BottomNavigation className="fixed bottom-0 left-0 right-0 bg-white border-t">
    <NavItem
      icon={LayoutDashboard}
      label="Accueil"
      href="/gestionnaire/dashboard"
      active={pathname === '/gestionnaire/dashboard'}
    />
    <NavItem
      icon={Wrench}
      label="Interventions"
      href="/gestionnaire/interventions"
      badge={activeCount}
    />
    <NavItem
      icon={Building}
      label="Biens"
      href="/gestionnaire/biens"
    />
    <NavItem
      icon={User}
      label="Profil"
      href="/gestionnaire/profile"
    />
  </BottomNavigation>
</MobileLayout>
```

**Best Practices** :
- **Max 5 items** (thumb reach)
- **Icons + Labels** (clarity)
- **Active state** clair (couleur + bold)
- **Badge counts** visibles

### 1.3 Breadcrumbs (Context)

```tsx
// Desktop - Full breadcrumbs
<Breadcrumbs>
  <BreadcrumbItem href="/gestionnaire/dashboard">Accueil</BreadcrumbItem>
  <BreadcrumbItem href="/gestionnaire/biens">Biens</BreadcrumbItem>
  <BreadcrumbItem href={`/gestionnaire/biens/immeubles/${building.id}`}>
    {building.name}
  </BreadcrumbItem>
  <BreadcrumbItem current>Lot {lot.reference}</BreadcrumbItem>
</Breadcrumbs>

// Mobile - Condensed
<MobileBreadcrumbs>
  <BackButton />
  <CurrentPage>{lot.reference}</CurrentPage>
</MobileBreadcrumbs>
```

---

## 2. Form Patterns

### 2.1 Form Layout

```tsx
<Form onSubmit={handleSubmit}>
  <FormSection title="Informations générales">
    <FormGrid cols={2}> {/* 2 cols desktop, 1 col mobile */}
      <FormField>
        <Label required>Titre</Label>
        <Input placeholder="Ex: Fuite évier cuisine" error={errors.title} />
      </FormField>

      <FormField>
        <Label required>Type</Label>
        <Select options={interventionTypes} error={errors.type} />
      </FormField>
    </FormGrid>

    <FormField>
      <Label>Description</Label>
      <Textarea rows={4} placeholder="Décrivez le problème..." />
    </FormField>
  </FormSection>

  <FormActions>
    <Button variant="secondary" onClick={cancel}>Annuler</Button>
    <Button variant="primary" type="submit" loading={isSubmitting}>
      {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
    </Button>
  </FormActions>
</Form>
```

### 2.2 Validation Patterns

```tsx
<FormField>
  <Label>Email</Label>
  <Input
    type="email"
    value={email}
    onChange={setEmail}
    onBlur={validateEmail}
    error={errors.email}
    success={email && !errors.email}
  />
  {errors.email && <ErrorMessage>{errors.email}</ErrorMessage>}
  {email && !errors.email && <SuccessMessage>✓ Format valide</SuccessMessage>}
</FormField>
```

**Règles de validation** :
- **onBlur** : Validation au blur, pas onChange (évite frustration)
- **Inline errors** : Message sous le champ
- **Success feedback** : Indication visuelle quand valide

### 2.3 Auto-save Drafts

```tsx
<Form>
  {/* Form fields */}
  <AutoSaveIndicator status={saveStatus} lastSaved={lastSavedAt} />
</Form>

// Auto-save logic
useEffect(() => {
  const timer = setTimeout(() => saveDraft(formData), 2000) // 2s debounce
  return () => clearTimeout(timer)
}, [formData])

// Indicator states
const AutoSaveIndicator = ({ status, lastSaved }) => {
  if (status === 'saving') return <Spinner size="sm" /> Enregistrement...
  if (status === 'saved') return <Check size="sm" /> Enregistré {formatRelative(lastSaved)}
  if (status === 'error') return <AlertCircle size="sm" /> Erreur
  return null
}
```

---

## 3. Notification Patterns

### 3.1 Toast Notifications

```tsx
const { toast } = useToast()

toast({
  variant: 'success',
  title: 'Intervention créée',
  description: 'INT-2025-001 a été créée avec succès',
  action: <Button variant="ghost" onClick={viewIntervention}>Voir</Button>,
  duration: 5000
})

// Variants disponibles
toast({ variant: 'success', ... })  // Vert
toast({ variant: 'error', ... })    // Rouge
toast({ variant: 'warning', ... })  // Orange
toast({ variant: 'info', ... })     // Bleu
```

**Position** :
- **Desktop** : Top-right (non-intrusive)
- **Mobile** : Top-center (thumb reach)

### 3.2 In-App Notifications (Bell icon)

```tsx
<NotificationCenter>
  <NotificationBell count={unreadCount} onClick={togglePanel} />

  <NotificationPanel open={isOpen}>
    <PanelHeader>
      <Title>Notifications</Title>
      <Button variant="ghost" onClick={markAllRead}>
        Tout marquer comme lu
      </Button>
    </PanelHeader>

    <NotificationList>
      {notifications.map(n => (
        <NotificationItem
          key={n.id}
          unread={!n.read_at}
          onClick={() => handleClick(n)}
        >
          <NotificationIcon type={n.type} />
          <NotificationContent>
            <Title>{n.title}</Title>
            <Description>{n.message}</Description>
            <Timestamp>{formatRelative(n.created_at)}</Timestamp>
          </NotificationContent>
        </NotificationItem>
      ))}
    </NotificationList>

    <PanelFooter>
      <Link href="/notifications">Voir toutes</Link>
    </PanelFooter>
  </NotificationPanel>
</NotificationCenter>
```

### 3.3 Push Notifications (Mobile)

```tsx
const sendPushNotification = async (notification) => {
  await webpush.sendNotification({
    title: notification.title,
    body: notification.message,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: notification.id,
    data: { url: notification.action_url },
    actions: [
      { action: 'open', title: 'Voir détails' },
      { action: 'dismiss', title: 'Ignorer' }
    ]
  })
}
```

---

## 4. Mobile-First Considerations

### 4.1 Touch Targets

```tsx
// ✅ BON - Touch targets 44x44px minimum
<Button className="min-h-[44px] min-w-[44px] p-3">Action</Button>

<Checkbox className="h-6 w-6" /> {/* 24px visible, 44px tap area */}

// Tap area avec pseudo-element
<button className="relative p-2">
  <Icon name="trash" />
  <span className="absolute inset-0 -m-2" /> {/* Expand tap area */}
</button>
```

### 4.2 Swipe Actions

```tsx
<SwipeableCard
  leftActions={[
    {
      icon: Check,
      label: 'Valider',
      color: 'green',
      threshold: 75,
      onTrigger: approve
    }
  ]}
  rightActions={[
    {
      icon: Archive,
      label: 'Archiver',
      color: 'gray',
      threshold: 75,
      onTrigger: archive
    },
    {
      icon: Trash,
      label: 'Supprimer',
      color: 'red',
      threshold: 150, // Plus dur à déclencher
      onTrigger: remove
    }
  ]}
>
  <InterventionCard />
</SwipeableCard>
```

### 4.3 Pull to Refresh

```tsx
<ScrollView
  onPullToRefresh={async () => await refetchData()}
  refreshThreshold={80}
  refreshIndicator={<Spinner />}
>
  <Content />
</ScrollView>
```

### 4.4 Responsive Breakpoints

```typescript
// Tailwind breakpoints SEIDO
const BREAKPOINTS = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet portrait
  lg: '1024px',  // Tablet landscape / Desktop
  xl: '1280px',  // Desktop wide
  '2xl': '1536px' // Desktop ultra-wide
}

// Usage
<div className="
  grid
  grid-cols-1        /* Mobile: 1 column */
  md:grid-cols-2     /* Tablet: 2 columns */
  lg:grid-cols-3     /* Desktop: 3 columns */
  gap-4
">
  {items.map(...)}
</div>
```

---

## Voir aussi

- [Principes UX Communs](./ux-common-principles.md)
- [Anti-Patterns à éviter](./ux-anti-patterns.md)
- [Design System](./05-components.md)
