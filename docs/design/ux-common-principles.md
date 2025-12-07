# SEIDO - Principes UX Communs

> **Fichier parent** : [ux-ui-decision-guide.md](./ux-ui-decision-guide.md)
> **Version** : 1.1 | **Date** : 2025-12-07

Ce document contient les principes UX fondamentaux applicables à tous les rôles utilisateurs de SEIDO.

---

## Table des Matières

1. [Heuristiques de Nielsen](#1-heuristiques-de-nielsen-appliquées-à-seido)
2. [Material Design 3 Principles](#2-material-design-3-principles)
3. [Apple Human Interface Guidelines](#3-apple-human-interface-guidelines)
4. [Patterns des Apps de Référence](#4-patterns-des-apps-de-référence)
5. [Stratégies pour la Densité de Données](#5-stratégies-pour-la-densité-de-données)

---

## 1. Heuristiques de Nielsen Appliquées à SEIDO

### 1.1 Visibility of System Status
**Contexte**: Les gestionnaires veulent savoir où en est chaque intervention 24/7

**Applications SEIDO**:
```tsx
// ✅ BON - Statut intervention avec contexte
<InterventionCard>
  <StatusBadge
    status="en_cours"
    lastUpdate="Il y a 2h"
    nextAction="Attente devis prestataire"
  />
  <ProgressBar value={60} label="60% complété" />
  <TimelinePreview steps={5} currentStep={3} />
</InterventionCard>

// ❌ MAUVAIS - Statut cryptique
<div>Status: 4</div>
```

**Règles**:
- Toujours afficher le **statut actuel** + **prochaine action attendue**
- Utiliser des **couleurs sémantiques** (vert=ok, orange=attention, rouge=urgent)
- Afficher **timestamp** de dernière mise à jour
- **Progress indicators** pour processus longs (upload, sync)

### 1.2 Match Between System and Real World
**Contexte**: Les gestionnaires parlent métier, pas tech

**Applications SEIDO**:
```tsx
// ✅ BON - Langage métier
<Button>Demander un devis</Button>
<Status>En attente du plombier</Status>
<Alert>Fuite détectée - Urgent</Alert>

// ❌ MAUVAIS - Jargon technique
<Button>POST /api/quotes</Button>
<Status>Status code 202</Status>
<Alert>Error: NULL_REFERENCE</Alert>
```

**Vocabulaire SEIDO**:
- **Intervention** (pas "ticket" ou "request")
- **Prestataire** (pas "provider" ou "vendor")
- **Lot** (pas "unit" ou "property")
- **Gestionnaire** (pas "manager" ou "admin")

### 1.3 User Control and Freedom
**Contexte**: Erreurs fréquentes en mobilité, besoin de "undo"

**Applications SEIDO**:
```tsx
// ✅ BON - Actions réversibles
<Toast variant="success">
  Intervention archivée
  <Button variant="ghost" onClick={undo}>Annuler</Button>
</Toast>

// ✅ BON - Confirmation pour actions critiques
<ConfirmDialog
  title="Supprimer l'intervention INT-2025-001 ?"
  description="Cette action est définitive. Historique et documents seront supprimés."
  confirmText="Oui, supprimer"
  cancelText="Annuler"
/>

// ❌ MAUVAIS - Suppression sans confirmation
<Button onClick={deleteIntervention}>Supprimer</Button>
```

**Règles**:
- **Toast avec "Undo"** pour actions réversibles (archive, assignation)
- **Confirmation modale** pour actions destructives (suppression)
- **Auto-save** formulaires (brouillons)
- **Breadcrumbs** pour navigation complexe

### 1.4 Consistency and Standards
**Contexte**: Multi-rôles = risque d'incohérence

**Applications SEIDO**:
```tsx
// ✅ BON - Design tokens centralisés
// Tous les rôles utilisent les mêmes patterns
<Card variant="intervention">
  <Card.Header>
    <InterventionBadge /> {/* Même component partout */}
  </Card.Header>
</Card>

// Color coding cohérent
const URGENCY_COLORS = {
  urgente: 'bg-red-100 text-red-800',
  normale: 'bg-blue-100 text-blue-800',
  basse: 'bg-gray-100 text-gray-800'
}

// ❌ MAUVAIS - Incohérence par rôle
// Gestionnaire: <Badge color="red">Urgent</Badge>
// Prestataire: <Tag variant="danger">Urgent</Tag>
// Locataire: <Label className="urgent">Urgent</Label>
```

**Standards SEIDO**:
- **shadcn/ui** comme base (50+ components)
- **Tailwind v4** tokens pour couleurs/spacing
- **Lucide React** pour icônes
- **WCAG 2.1 AA** pour contraste/accessibilité

### 1.5 Error Prevention
**Contexte**: Saisie mobile = erreurs fréquentes

**Applications SEIDO**:
```tsx
// ✅ BON - Validation inline + auto-complétion
<AddressInput
  value={address}
  onChange={setAddress}
  autoComplete="google-places"
  validate={validateAddress}
  error={errors.address}
  suggestions={nearbyAddresses}
/>

// ✅ BON - Désactivation smart
<Button
  disabled={!canSubmit}
  tooltip={!canSubmit ? "Champs obligatoires manquants" : ""}
>
  Créer intervention
</Button>

// ❌ MAUVAIS - Validation au submit uniquement
<form onSubmit={handleSubmit}>
  <Input /> {/* Pas de validation */}
  <Button>Submit</Button>
</form>
```

**Patterns**:
- **Validation en temps réel** (onBlur, pas onChange pour éviter frustration)
- **Auto-complétion** (adresses, contacts, prestataires)
- **Smart defaults** (date=aujourd'hui, urgence=normale)
- **Constraints UI** (date picker bloque dates passées)

### 1.6 Recognition Rather Than Recall
**Contexte**: Gestionnaires gèrent 50-500 logements, impossible de mémoriser

**Applications SEIDO**:
```tsx
// ✅ BON - Contexte visible partout
<InterventionHeader>
  <BuildingPreview id={intervention.building_id} />
  <LotPreview id={intervention.lot_id} />
  <ContactPreview id={intervention.tenant_id} />
  <ProviderPreview id={intervention.provider_id} />
</InterventionHeader>

// ✅ BON - Historique récent accessible
<RecentlyViewedPanel>
  {recentBuildings.map(b => <QuickLink key={b.id} {...b} />)}
</RecentlyViewedPanel>

// ❌ MAUVAIS - IDs cryptiques
<div>Intervention for LOT-1234 in BLDG-5678</div>
```

**Patterns**:
- **Autocomplete** avec preview (nom + adresse + photo)
- **Recently viewed** sidebar
- **Breadcrumbs** avec infos contextuelles
- **Related entities** toujours visibles

### 1.7 Flexibility and Efficiency of Use
**Contexte**: Power users (gestionnaires pro) vs novices (locataires)

**Applications SEIDO**:
```tsx
// ✅ BON - Shortcuts pour experts
<Tooltip content="Raccourci: Ctrl+N">
  <Button onClick={createIntervention}>
    Nouvelle intervention
  </Button>
</Tooltip>

// ✅ BON - Bulk actions
<InterventionList>
  <SelectAll />
  {selected.length > 0 && (
    <BulkActions>
      <Button>Assigner à prestataire</Button>
      <Button>Changer urgence</Button>
      <Button>Archiver</Button>
    </BulkActions>
  )}
</InterventionList>

// ✅ BON - Templates pour tâches répétitives
<TemplateSelector
  templates={['Fuite évier', 'Problème chauffage', 'Serrure bloquée']}
  onSelect={applyTemplate}
/>
```

**Patterns**:
- **Keyboard shortcuts** (desktop)
- **Swipe actions** (mobile)
- **Bulk operations** (sélection multiple)
- **Templates** (interventions récurrentes)
- **Quick filters** (favoris, récents, assignés à moi)

### 1.8 Aesthetic and Minimalist Design
**Contexte**: Densité de données MAIS éviter surcharge cognitive

**Applications SEIDO**:
```tsx
// ✅ BON - Information layering
<InterventionCard variant="compact">
  {/* Layer 1: Essentiel visible immédiatement */}
  <Title>Fuite évier cuisine</Title>
  <Status>En attente devis</Status>
  <Urgency>Urgente</Urgency>

  {/* Layer 2: Détails au hover/click */}
  <ExpandableSection>
    <Description />
    <History />
    <Documents />
  </ExpandableSection>
</InterventionCard>

// ❌ MAUVAIS - Tout affiché d'un coup
<InterventionCard>
  <div>ID: 123</div>
  <div>Created: 2025-01-15 14:32:18</div>
  <div>Updated: 2025-01-16 09:12:45</div>
  {/* 20 lignes de plus... */}
</InterventionCard>
```

**Règles**:
- **Primary info** = titre + statut + urgence (3 éléments max)
- **Secondary info** = dates, contacts, prestataire (expandable)
- **Tertiary info** = historique, documents (modal/page dédiée)
- **White space** généreux (min 16px entre sections)

### 1.9 Help Users Recognize, Diagnose, and Recover from Errors
**Contexte**: Erreurs fréquentes (mobile, multi-tâches)

**Applications SEIDO**:
```tsx
// ✅ BON - Message d'erreur explicatif + action
<Alert variant="error">
  <AlertTitle>Impossible de créer l'intervention</AlertTitle>
  <AlertDescription>
    Le lot sélectionné n'a pas de locataire assigné.
    Vous devez d'abord assigner un locataire au lot.
  </AlertDescription>
  <AlertActions>
    <Button onClick={assignTenant}>Assigner un locataire</Button>
    <Button variant="ghost" onClick={dismiss}>Annuler</Button>
  </AlertActions>
</Alert>

// ❌ MAUVAIS - Message cryptique
<div className="error">
  Error: FOREIGN_KEY_VIOLATION tenant_id
</div>
```

**Patterns**:
- **Plain language** (pas de codes d'erreur techniques)
- **Root cause** expliquée
- **Action corrective** proposée (bouton direct)
- **Toast persistent** pour erreurs critiques

### 1.10 Help and Documentation
**Contexte**: Onboarding rapide nécessaire (burn-out)

**Applications SEIDO**:
```tsx
// ✅ BON - Contextual help
<FormField>
  <Label>
    Urgence
    <TooltipIcon content="Urgente = intervention sous 24h, Normale = sous 72h" />
  </Label>
  <Select />
</FormField>

// ✅ BON - Empty states avec guidance
<EmptyState>
  <Icon name="building" />
  <Title>Aucun immeuble</Title>
  <Description>
    Commencez par ajouter votre premier immeuble pour gérer votre parc immobilier.
  </Description>
  <Button>Ajouter un immeuble</Button>
  <Link href="/docs/buildings">En savoir plus</Link>
</EmptyState>

// ✅ BON - Onboarding interactif
<OnboardingTour
  steps={[
    { target: '#dashboard', content: 'Voici vos KPIs' },
    { target: '#interventions', content: 'Gérez vos interventions ici' }
  ]}
/>
```

---

## 2. Material Design 3 Principles

### 2.1 Material You - Personnalisation

**Contexte SEIDO**: Multi-tenant, chaque agence veut sa marque

**Applications**:
```tsx
// ✅ BON - Theming dynamique
<ThemeProvider theme={team.branding}>
  <App />
</ThemeProvider>

// Team branding config
const teamTheme = {
  primaryColor: '#0066CC', // Couleur agence
  logo: 'https://cdn.seido.fr/team-123/logo.png',
  typography: 'Inter' // ou autre font
}

// ❌ MAUVAIS - Hard-coded colors
<div className="bg-blue-500">...</div>
```

**Customization levels**:
- **Logo** agence (navbar, emails, PDF)
- **Primary color** (boutons, accents)
- **Typography** (optionnel)
- **Light/Dark mode** (préférence utilisateur)

### 2.2 Material Motion - Animations Signifiantes

**Contexte SEIDO**: Mobile = transitions importantes pour orientation

**Applications**:
```tsx
// ✅ BON - Shared element transition
<InterventionCard
  layoutId={intervention.id}
  onClick={() => router.push(`/interventions/${intervention.id}`)}
/>

// Page détail avec même layoutId
<InterventionDetail layoutId={intervention.id} />

// ✅ BON - Loading states fluides
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  <InterventionList />
</motion.div>

// ❌ MAUVAIS - Pas de transition (jarring)
{showModal && <Modal />} // Apparaît brutalement
```

**Animation rules**:
- **Duration**: 200-300ms (rapide mais perceptible)
- **Easing**: `ease-out` pour entrées, `ease-in` pour sorties
- **Shared elements**: Card → Detail page
- **Skeleton loaders**: Pendant chargement données

### 2.3 Material Elevation - Hiérarchie Visuelle

**Contexte SEIDO**: Beaucoup de cartes/modales = besoin hiérarchie claire

**Elevation scale SEIDO**:
| Level | Usage | Shadow |
|-------|-------|--------|
| 0 | Page background | none |
| 1 | Cards, Panels | sm |
| 2 | Buttons, Chips | md |
| 3 | Dropdowns, Tooltips | lg |
| 4 | Modals, Dialogs | xl |
| 5 | Reserved (notifications importantes) | 2xl |

---

## 3. Apple Human Interface Guidelines

### 3.1 Clarity - Lisibilité Avant Tout

**Contexte SEIDO**: Mobile en extérieur (soleil, mouvement)

**Rules**:
- **Minimum font size**: 16px (mobile), 14px (desktop)
- **Minimum contrast**: 4.5:1 (WCAG AA)
- **Line height**: 1.5 (body text), 1.2 (headings)
- **Max line length**: 70 caractères (prose)

### 3.2 Deference - Le Contenu Prime

**Contexte SEIDO**: Gestionnaires veulent infos, pas décorations

**Rules**:
- **Backgrounds**: Gris clairs (50-100), pas de gradients flashy
- **Borders**: Subtiles (gray-200), pas de borders épaisses
- **Animations**: Fonctionnelles uniquement (pas décoratives)
- **Icons**: Cohérents (Lucide React), taille 20-24px

### 3.3 Depth - Hiérarchie Par Layers

**Contexte SEIDO**: Information architecture complexe

```tsx
// ✅ BON - Z-index scale
const Z_INDEX = {
  base: 0,           // Page content
  dropdown: 10,      // Dropdowns, popovers
  sticky: 20,        // Sticky headers
  modal: 30,         // Modals, dialogs
  toast: 40,         // Notifications
  tooltip: 50        // Tooltips (toujours au-dessus)
}
```

---

## 4. Patterns des Apps de Référence

### 4.1 Linear - Project Management Excellence

**Ce qu'on adopte**:
- **Command palette** → Recherche universelle (interventions, biens, contacts)
- **Keyboard shortcuts** → Desktop uniquement (mobile = swipe)
- **Inline editing** → Champs non-critiques uniquement

### 4.2 Notion - Data Organization

**Ce qu'on adopte**:
- **Database views** → Interventions (table, cards, calendar, map)
- **Filters** → Sauvegardables comme "vues" (Mes interventions urgentes)
- **Properties** → Metadata interventions

### 4.3 Airbnb - Property Management

**Ce qu'on adopte**:
- **Property cards** → Building/Lot cards
- **Map view** → Géolocalisation biens (utile pour gestionnaire en déplacement)
- **Calendar** → Planning interventions

### 4.4 Revolut - Premium Mobile UX

**Ce qu'on adopte**:
- **Bottom sheets** → Actions mobiles (remplace dropdowns)
- **Swipe actions** → Interventions list (quick actions)
- **Pull to refresh** → Toutes les listes
- **Biometric** → Login rapide (optionnel)

---

## 5. Stratégies pour la Densité de Données

### 5.1 Progressive Disclosure

**Problème**: Dashboard gestionnaire = 350 logements, 50 interventions actives, 200 contacts

**Solution**: Information layering avec 3 niveaux

#### Layer 1: Glanceable (Coup d'œil rapide)
```tsx
<DashboardGlance>
  <KPI label="Interventions" value="12" trend="+3" />
  <KPI label="Occupation" value="94%" trend="-2%" />
  <KPI label="Revenus" value="€45K" trend="+12%" />
</DashboardGlance>
```

#### Layer 2: Scannable (Scan rapide)
```tsx
<InterventionCompactList>
  {interventions.map(i => (
    <CompactRow key={i.id}>
      <StatusDot color={i.urgency} />
      <Title>{i.title}</Title>
      <Meta>{i.building.address} · {i.created_at}</Meta>
    </CompactRow>
  ))}
</InterventionCompactList>
```

#### Layer 3: Deep Dive (Analyse approfondie)
→ Page dédiée avec tous les détails

### 5.2 Information Hierarchy

**Principe**: L'œil doit trouver l'info critique en < 2 secondes

| Importance | Font Size | Font Weight | Color | Usage |
|------------|-----------|-------------|-------|-------|
| Critical | 18-24px | Bold (700) | gray-900 | Titres, montants |
| High | 16px | Semibold (600) | gray-800 | Sous-titres, labels |
| Medium | 14px | Normal (400) | gray-600 | Body text |
| Low | 12px | Normal (400) | gray-500 | Metadata, timestamps |

### 5.3 Color Coding Sémantique

```tsx
const STATUS_COLORS = {
  // Success/Positive
  cloturee: 'bg-emerald-100 text-emerald-800',
  approuvee: 'bg-green-100 text-green-800',

  // Warning/Attention
  en_attente: 'bg-amber-100 text-amber-800',
  demande_devis: 'bg-orange-100 text-orange-800',

  // Error/Urgent
  urgente: 'bg-red-100 text-red-800',
  rejetee: 'bg-red-100 text-red-800',

  // Neutral/Info
  demande: 'bg-blue-100 text-blue-800',
  en_cours: 'bg-sky-100 text-sky-800',

  // Inactive
  annulee: 'bg-gray-100 text-gray-800'
}
```

### 5.4 Table vs Card Views

**Règle**: Table pour analyse, Cards pour action

- **Table View** (Desktop, Dense Data) → Colonnes triables, bulk selection, pagination
- **Card View** (Mobile, Visual) → Swipe actions, touch-friendly
- **Hybrid View** → Adaptation automatique responsive

---

## Voir aussi

- [Guidelines Gestionnaire](./ux-role-gestionnaire.md)
- [Guidelines Prestataire](./ux-role-prestataire.md)
- [Guidelines Locataire](./ux-role-locataire.md)
- [Guidelines Admin](./ux-role-admin.md)
- [Composants UI](./ux-components.md)
- [Anti-Patterns](./ux-anti-patterns.md)
