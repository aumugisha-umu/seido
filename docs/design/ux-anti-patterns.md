# SEIDO - Anti-Patterns UX à Éviter

> **Fichier parent** : [ux-ui-decision-guide.md](./ux-ui-decision-guide.md)
> **Version** : 1.1 | **Date** : 2025-12-07

Ce document liste les anti-patterns UX identifiés à partir des frustrations des personas et des erreurs techniques courantes.

---

## Table des Matières

1. [Anti-Patterns basés sur les Frustrations Personas](#1-anti-patterns-basés-sur-les-frustrations-personas)
2. [Anti-Patterns Techniques](#2-anti-patterns-techniques)

---

## 1. Anti-Patterns basés sur les Frustrations Personas

### Anti-Pattern 1: "Information Hunting"
**Source** : Thomas perd 2h/jour à chercher des infos

```tsx
// ❌ MAUVAIS - Infos éparpillées dans des tabs
<InterventionDetail>
  <Tab>Détails</Tab>      // Building info ici
  <Tab>Timeline</Tab>     // Provider info ici
  <Tab>Documents</Tab>    // Tenant info ici
</InterventionDetail>

// ✅ BON - Contexte toujours visible
<InterventionDetail>
  <MainContent>
    {/* Timeline, documents, etc */}
  </MainContent>

  <Sidebar> {/* TOUJOURS VISIBLE */}
    <ContextPanel>
      <BuildingPreview />
      <LotPreview />
      <TenantPreview />
      <ProviderPreview />
    </ContextPanel>
  </Sidebar>
</InterventionDetail>
```

---

### Anti-Pattern 2: "Phone Ring Hell"
**Source** : Thomas reçoit 50 appels/jour

```tsx
// ❌ MAUVAIS - Notifications intrusives pour tout
const sendNotification = (intervention) => {
  sendEmail(...)   // Email
  sendSMS(...)     // + SMS
  sendPush(...)    // + Push
  // Pour CHAQUE changement mineur!
}

// ✅ BON - Notifications intelligentes + agrégation
const sendSmartNotification = (intervention) => {
  // Agrégation: 1 notif pour 5 changements mineurs
  if (shouldAggregate(intervention)) {
    queueForDigest(intervention)
  } else {
    // Notification immédiate seulement si urgent
    if (intervention.urgency === 'urgente') {
      sendPush(...)
    }
    sendInApp(...) // Toujours in-app, moins intrusif
  }
}

// User preferences
<NotificationSettings>
  <Toggle label="Email quotidien (digest)" defaultChecked />
  <Toggle label="SMS urgences uniquement" defaultChecked />
  <Toggle label="Push temps réel" defaultChecked={false} />
</NotificationSettings>
```

---

### Anti-Pattern 3: "Repetitive Task Hell"
**Source** : Thomas fait les mêmes tâches 10x/jour

```tsx
// ❌ MAUVAIS - Pas de templates, 15 champs à remplir
<CreateIntervention>
  <Input label="Titre" />
  <Textarea label="Description" />
  <Select label="Type" />
  {/* 12 autres champs... */}
</CreateIntervention>

// ✅ BON - Templates + Quick actions
<CreateIntervention>
  <TemplateSelector>
    <Template
      name="Fuite évier standard"
      onClick={() => applyTemplate({
        title: 'Fuite évier cuisine',
        type: 'plomberie',
        urgency: 'normale',
        description: 'Fuite au niveau du robinet...'
      })}
    />
    <Template name="Problème chauffage hiver" />
    <Template name="Serrure bloquée" />
  </TemplateSelector>

  {/* OU Quick create depuis liste */}
  <QuickActions>
    <Action>Dupliquer</Action>
    <Action>Créer similaire</Action>
  </QuickActions>
</CreateIntervention>
```

---

### Anti-Pattern 4: "Black Box Provider"
**Source** : Trou noir prestataires - aucune visibilité

```tsx
// ❌ MAUVAIS - Aucune visibilité sur avancement
<InterventionCard>
  <Status>Assigné à prestataire</Status>
  {/* Pas d'info sur l'avancement */}
</InterventionCard>

// ✅ BON - Tracking end-to-end
<InterventionCard>
  <Status>Assigné à prestataire</Status>
  <ProgressBar value={60} />
  <TimelinePreview>
    <Event completed>Devis envoyé</Event>
    <Event completed>Devis validé</Event>
    <Event current>En attente planification</Event>
    <Event>Intervention planifiée</Event>
    <Event>Travaux effectués</Event>
  </TimelinePreview>
  <LastUpdate>Dernière activité: Il y a 2h</LastUpdate>
  <SLATimer>⏰ Réponse attendue sous: 4h 23min</SLATimer>
</InterventionCard>
```

---

### Anti-Pattern 5: "Fear of Delegation"
**Source** : Impossibilité de déléguer par manque de traçabilité

```tsx
// ❌ MAUVAIS - Permissions binaires (tout ou rien)
const canEdit = user.role === 'gestionnaire'

// ✅ BON - Permissions granulaires + audit trail
<PermissionSettings>
  <PermissionRow>
    <Action>Créer interventions</Action>
    <Checkbox role="assistant" checked />
    <Checkbox role="gestionnaire" checked />
  </PermissionRow>
  <PermissionRow>
    <Action>Valider devis > €500</Action>
    <Checkbox role="assistant" checked={false} />
    <Checkbox role="gestionnaire" checked />
  </PermissionRow>
</PermissionSettings>

// Audit trail visible
<AuditLog>
  <LogEntry>
    <User>Marie Dupont</User>
    <Action>a créé l'intervention INT-2025-001</Action>
    <Timestamp>Il y a 10 min</Timestamp>
  </LogEntry>
</AuditLog>
```

---

## 2. Anti-Patterns Techniques

### Anti-Pattern 6: "Mobile Afterthought"

```tsx
// ❌ MAUVAIS - Desktop-first
<div className="w-[1200px]"> {/* Fixed width */}
  <div className="grid grid-cols-4"> {/* 4 cols même sur mobile */}
    {items.map(...)}
  </div>
</div>

// ✅ BON - Mobile-first responsive
<div className="w-full max-w-7xl mx-auto px-4">
  <div className="
    grid
    grid-cols-1        /* Mobile: 1 col */
    sm:grid-cols-2     /* Small: 2 cols */
    lg:grid-cols-4     /* Large: 4 cols */
    gap-4
  ">
    {items.map(...)}
  </div>
</div>
```

---

### Anti-Pattern 7: "Loading Hell"

```tsx
// ❌ MAUVAIS - Spinners partout
{isLoading && <Spinner />}
{!isLoading && <Content />}

// ✅ BON - Skeleton screens
{isLoading ? (
  <Skeleton variant="card" count={3} />
) : (
  <Content />
)}

// ✅ BON - Optimistic updates
const createIntervention = async (data) => {
  // Optimistic: Add to list immediately
  const tempId = `temp-${Date.now()}`
  addToList({ ...data, id: tempId })

  try {
    const result = await api.create(data)
    replaceInList(tempId, result) // Replace temp with real
  } catch (error) {
    removeFromList(tempId) // Rollback on error
    showError(error)
  }
}
```

---

### Anti-Pattern 8: "Inaccessible UI"

```tsx
// ❌ MAUVAIS - Pas d'accessibilité
<div onClick={deleteItem}> {/* Pas accessible clavier */}
  <Icon name="trash" />
</div>

// ✅ BON - Accessible
<button
  onClick={deleteItem}
  aria-label="Supprimer l'intervention"
  className="focus:ring-2 focus:ring-blue-500"
>
  <Icon name="trash" aria-hidden="true" />
</button>

// ✅ BON - ARIA live regions
<div role="alert" aria-live="polite">
  {successMessage}
</div>

// ✅ BON - Semantic HTML
<nav>
  <ul>
    <li><a href="/">Accueil</a></li>
  </ul>
</nav>
```

---

### Anti-Pattern 9: "Mystery Meat Navigation"

```tsx
// ❌ MAUVAIS - Icons sans labels
<BottomNav>
  <NavItem><Icon name="home" /></NavItem>
  <NavItem><Icon name="wrench" /></NavItem>
  <NavItem><Icon name="building" /></NavItem>
</BottomNav>

// ✅ BON - Icons + Labels toujours
<BottomNav>
  <NavItem>
    <Icon name="home" />
    <Label>Accueil</Label>
  </NavItem>
  <NavItem>
    <Icon name="wrench" />
    <Label>Interventions</Label>
  </NavItem>
  <NavItem>
    <Icon name="building" />
    <Label>Biens</Label>
  </NavItem>
</BottomNav>
```

---

### Anti-Pattern 10: "Error Messages from Hell"

```tsx
// ❌ MAUVAIS - Messages cryptiques
<div className="error">
  Error: FOREIGN_KEY_VIOLATION on table interventions column tenant_id
</div>

// ✅ BON - Messages clairs + actions
<Alert variant="error">
  <AlertTitle>Impossible de créer l'intervention</AlertTitle>
  <AlertDescription>
    Le lot sélectionné n'a pas de locataire assigné.
    Vous devez d'abord assigner un locataire pour créer une intervention.
  </AlertDescription>
  <AlertActions>
    <Button onClick={assignTenant}>Assigner un locataire maintenant</Button>
    <Button variant="ghost" onClick={dismiss}>Annuler</Button>
  </AlertActions>
</Alert>
```

---

## Checklist Avant Déploiement

### UX
- [ ] Mobile testé (pas d'afterthought)
- [ ] Touch targets ≥ 44px
- [ ] Loading states (skeletons)
- [ ] Empty states définis
- [ ] Error states explicatifs

### Accessibilité
- [ ] Navigation clavier
- [ ] ARIA labels
- [ ] Contraste ≥ 4.5:1
- [ ] Focus visible

### Performance
- [ ] Optimistic updates
- [ ] Skeleton loaders
- [ ] Lazy loading images

---

## Voir aussi

- [Principes UX Communs](./ux-common-principles.md)
- [Composants UI](./ux-components.md)
- [Métriques UX](./ux-metrics.md)
