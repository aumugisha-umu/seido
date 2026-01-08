# Instructions de Refactorisation - Composants Intervention Preview

## Contexte

Trois nouveaux designs de prévisualisation d'intervention ont été créés en tant que prototypes :
- `PreviewHybridManager` (Vue Gestionnaire)
- `PreviewHybridProvider` (Vue Prestataire)
- `PreviewHybridTenant` (Vue Locataire)

Ces composants contiennent actuellement beaucoup de duplication de code. Votre mission est de les refactoriser en composants réutilisables et modulaires en suivant la méthodologie BEM.

## Objectifs

1. **Créer des composants réutilisables** pour minimiser la duplication
2. **Respecter la méthodologie BEM** pour la structure des composants
3. **Préserver les logiques métier** existantes (boutons, actions, permissions par rôle)
4. **Tester sur la page de test** avant l'implémentation finale
5. **Implémenter sur les pages de production** après validation

---

## Phase 1 : Analyse et Planification

### 1.1 Identifier les Composants Réutilisables

Analysez les trois fichiers suivants :
- `components/interventions/preview-designs/preview-hybrid-manager.tsx`
- `components/interventions/preview-designs/preview-hybrid-provider.tsx`
- `components/interventions/preview-designs/preview-hybrid-tenant.tsx`

Identifiez les éléments communs qui peuvent être extraits en composants réutilisables :

**Composants de Sidebar :**
- `InterventionSidebar` - Container principal
- `ParticipantsList` - Liste des participants avec avatars
- `ProgressionTimeline` - Timeline de progression
- `ConversationButton` - Bouton de navigation vers les conversations

**Composants de Contenu :**
- `InterventionTabs` - Système d'onglets (Général, Conversations, Planning)
- `InterventionDetailsCard` - Card Description + Instructions
- `SummaryCard` - Card Synthèse (Planning + Devis)
- `CommentsCard` - Card Commentaires internes
- `DocumentsCard` - Card Rapports & Documents
- `QuotesCard` - Card Devis (tab Planning)
- `PlanningCard` - Card Planification avec créneaux
- `ConversationCard` - Card Discussion avec messages

**Composants Atomiques :**
- `RoleBadge` - Badge de rôle (Gestionnaire, Prestataire, Locataire)
- `StatusBadge` - Badge de statut (En attente, Validé, etc.)
- `ParticipantAvatar` - Avatar avec initiales
- `TimeSlotCard` - Card de créneau horaire
- `MessageBubble` - Bulle de message de chat
- `DocumentItem` - Item de document avec actions

### 1.2 Créer un Plan de Composants BEM

Créez un document `components-architecture.md` dans le dossier `components/interventions/shared/` avec :

```
shared/
├── sidebar/
│   ├── InterventionSidebar.tsx
│   ├── ParticipantsList.tsx
│   ├── ProgressionTimeline.tsx
│   └── ConversationButton.tsx
├── cards/
│   ├── InterventionDetailsCard.tsx
│   ├── SummaryCard.tsx
│   ├── CommentsCard.tsx
│   ├── DocumentsCard.tsx
│   ├── QuotesCard.tsx
│   ├── PlanningCard.tsx
│   └── ConversationCard.tsx
├── atoms/
│   ├── RoleBadge.tsx
│   ├── StatusBadge.tsx
│   ├── ParticipantAvatar.tsx
│   ├── TimeSlotCard.tsx
│   ├── MessageBubble.tsx
│   └── DocumentItem.tsx
└── types/
    └── intervention-preview.types.ts
```

---

## Phase 2 : Création des Composants Réutilisables

### 2.1 Méthodologie BEM

Suivez strictement la méthodologie BEM (Block Element Modifier) :

**Structure :**
```tsx
// Block
const InterventionSidebar = ({ ... }) => {
  return (
    <aside className="intervention-sidebar">
      {/* Element */}
      <div className="intervention-sidebar__header">
        {/* Modifier */}
        <h3 className="intervention-sidebar__title intervention-sidebar__title--primary">
          ...
        </h3>
      </div>
    </aside>
  )
}
```

**Conventions de nommage :**
- **Block** : `intervention-sidebar`, `participant-list`, `quote-card`
- **Element** : `intervention-sidebar__header`, `participant-list__item`
- **Modifier** : `quote-card--approved`, `status-badge--pending`

### 2.2 Props et TypeScript

Créez des interfaces TypeScript strictes pour chaque composant :

```tsx
// types/intervention-preview.types.ts
export interface Participant {
  id: string
  name: string
  email?: string
  role: 'manager' | 'provider' | 'tenant'
}

export interface Quote {
  id: string
  amount: number
  status: 'pending' | 'sent' | 'approved' | 'rejected'
  provider_name?: string
  created_at?: string
}

export interface TimeSlot {
  id: string
  slot_date: string
  start_time: string
  end_time: string
  status: string
}

// Exemple de props pour un composant
export interface ParticipantsListProps {
  participants: Participant[]
  currentUserRole: 'manager' | 'provider' | 'tenant'
  onConversationClick?: (participantId: string) => void
  activeConversation?: string
  showConversationButtons?: boolean
}
```

### 2.3 Gestion des Permissions par Rôle

Créez un système de permissions centralisé :

```tsx
// shared/utils/permissions.ts
export const canManageQuotes = (role: UserRole): boolean => {
  return role === 'manager'
}

export const canEditPlanning = (role: UserRole): boolean => {
  return role === 'manager'
}

export const canAddDocuments = (role: UserRole): boolean => {
  return ['manager', 'provider'].includes(role)
}

export const canViewInternalComments = (role: UserRole): boolean => {
  return role === 'manager'
}
```

Utilisez ces permissions dans vos composants :

```tsx
import { canManageQuotes } from '../utils/permissions'

export const QuotesCard = ({ quotes, userRole, onAddQuote }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Devis</CardTitle>
        {canManageQuotes(userRole) && (
          <Button onClick={onAddQuote}>+ Nouveau devis</Button>
        )}
      </CardHeader>
      {/* ... */}
    </Card>
  )
}
```

### 2.4 Composants Contrôlés vs Non-Contrôlés

**Composants contrôlés** (pour les états partagés) :
```tsx
export const InterventionTabs = ({ 
  activeTab, 
  onTabChange,
  children 
}: InterventionTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      {children}
    </Tabs>
  )
}
```

**Composants non-contrôlés** (pour les états locaux) :
```tsx
export const DocumentsCard = ({ documents, onUpload }: DocumentsCardProps) => {
  const [isUploading, setIsUploading] = useState(false)
  // État local géré dans le composant
}
```

---

## Phase 3 : Refactorisation des Composants Existants

### 3.1 Ordre de Refactorisation

1. **Commencez par les composants atomiques** (RoleBadge, StatusBadge, etc.)
2. **Puis les composants de niveau moyen** (ParticipantsList, TimeSlotCard, etc.)
3. **Enfin les composants complexes** (QuotesCard, PlanningCard, etc.)

### 3.2 Exemple de Refactorisation

**Avant (code dupliqué) :**
```tsx
// Dans preview-hybrid-manager.tsx
const RoleBadge = ({ role }: { role: string }) => {
  switch (role) {
    case 'Gestionnaire': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">Gestionnaire</Badge>
    // ...
  }
}
```

**Après (composant réutilisable) :**
```tsx
// shared/atoms/RoleBadge.tsx
export interface RoleBadgeProps {
  role: 'manager' | 'provider' | 'tenant'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const RoleBadge = ({ role, size = 'sm', className }: RoleBadgeProps) => {
  const roleConfig = {
    manager: {
      label: 'Gestionnaire',
      className: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    provider: {
      label: 'Prestataire',
      className: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    tenant: {
      label: 'Locataire',
      className: 'bg-green-50 text-green-700 border-green-200'
    }
  }

  const config = roleConfig[role]
  const sizeClass = size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-sm'

  return (
    <Badge 
      variant="outline" 
      className={cn(config.className, sizeClass, className)}
    >
      {config.label}
    </Badge>
  )
}
```

### 3.3 Gestion des Actions et Callbacks

Passez les handlers en props pour garder la logique métier dans les composants parents :

```tsx
export interface QuotesCardProps {
  quotes: Quote[]
  userRole: UserRole
  onAddQuote?: () => void
  onViewQuote?: (quoteId: string) => void
  onEditQuote?: (quoteId: string) => void
  onDeleteQuote?: (quoteId: string) => void
  isLoading?: boolean
}

export const QuotesCard = ({ 
  quotes, 
  userRole, 
  onAddQuote,
  onViewQuote,
  isLoading = false 
}: QuotesCardProps) => {
  return (
    <Card className="quote-card">
      <CardHeader className="quote-card__header">
        <CardTitle>Devis</CardTitle>
        {canManageQuotes(userRole) && onAddQuote && (
          <Button onClick={onAddQuote}>+ Nouveau devis</Button>
        )}
      </CardHeader>
      <CardContent className="quote-card__content">
        {isLoading ? (
          <LoadingSpinner />
        ) : quotes.length > 0 ? (
          quotes.map(quote => (
            <QuoteItem 
              key={quote.id}
              quote={quote}
              onView={() => onViewQuote?.(quote.id)}
            />
          ))
        ) : (
          <EmptyState message="Aucun devis pour le moment" />
        )}
      </CardContent>
    </Card>
  )
}
```

---

## Phase 4 : Intégration et Tests

### 4.1 Mise à Jour de la Page de Test

Modifiez `app/gestionnaire/test-preview/page.tsx` pour utiliser les nouveaux composants :

```tsx
import { InterventionSidebar } from '@/components/interventions/shared/sidebar/InterventionSidebar'
import { QuotesCard } from '@/components/interventions/shared/cards/QuotesCard'
// ... autres imports

export default function TestPreviewPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [activeConversation, setActiveConversation] = useState<string | 'group'>('group')

  const handleAddQuote = () => {
    console.log('Add quote clicked')
    // Logique d'ajout de devis
  }

  return (
    <div className="intervention-preview">
      <InterventionSidebar
        participants={mockParticipants}
        currentUserRole="manager"
        onConversationClick={setActiveConversation}
        activeConversation={activeConversation}
      />
      <main className="intervention-preview__content">
        <InterventionTabs activeTab={activeTab} onTabChange={setActiveTab}>
          <TabsContent value="planning">
            <QuotesCard
              quotes={mockQuotes}
              userRole="manager"
              onAddQuote={handleAddQuote}
            />
          </TabsContent>
        </InterventionTabs>
      </main>
    </div>
  )
}
```

### 4.2 Tests à Effectuer

Pour chaque composant créé, testez :

1. **Rendu visuel** : Le composant s'affiche correctement
2. **Props** : Toutes les props fonctionnent comme prévu
3. **Permissions** : Les actions sont bien filtrées par rôle
4. **Interactions** : Les callbacks sont appelés correctement
5. **États** : Les états locaux et contrôlés fonctionnent
6. **Responsive** : Le composant s'adapte aux différentes tailles d'écran

**Checklist de validation :**
- [ ] Le composant fonctionne pour le rôle Manager
- [ ] Le composant fonctionne pour le rôle Provider
- [ ] Le composant fonctionne pour le rôle Tenant
- [ ] Les boutons/actions respectent les permissions
- [ ] Le style est cohérent avec le design system
- [ ] Pas de duplication de code
- [ ] TypeScript : pas d'erreurs de type
- [ ] Pas de warnings dans la console

---

## Phase 5 : Implémentation en Production

### 5.1 Pages à Mettre à Jour

Une fois la validation sur la page de test effectuée, implémentez les composants sur les pages de production :

**Pages Gestionnaire :**
- `app/gestionnaire/interventions/[id]/page.tsx` (page de détail intervention)
- Toute autre page utilisant les previews d'intervention

**Pages Prestataire :**
- `app/prestataire/interventions/[id]/page.tsx`

**Pages Locataire :**
- `app/locataire/interventions/[id]/page.tsx`

### 5.2 Migration Progressive

**Stratégie recommandée :**

1. **Créez une feature flag** (optionnel mais recommandé) :
```tsx
const USE_NEW_PREVIEW_COMPONENTS = process.env.NEXT_PUBLIC_USE_NEW_PREVIEW === 'true'

// Dans la page
{USE_NEW_PREVIEW_COMPONENTS ? (
  <NewInterventionPreview {...props} />
) : (
  <OldInterventionPreview {...props} />
)}
```

2. **Migrez page par page** :
   - Commencez par la page gestionnaire
   - Puis prestataire
   - Enfin locataire

3. **Testez après chaque migration** :
   - Vérifiez que toutes les fonctionnalités existantes fonctionnent
   - Testez les actions (ajout devis, modification planning, etc.)
   - Vérifiez les permissions par rôle

### 5.3 Nettoyage

Une fois toutes les pages migrées :

1. **Supprimez les anciens composants** :
   - `preview-hybrid-manager.tsx`
   - `preview-hybrid-provider.tsx`
   - `preview-hybrid-tenant.tsx`

2. **Supprimez le code dupliqué** dans les autres fichiers

3. **Mettez à jour la documentation** des composants

---

## Phase 6 : Documentation

### 6.1 Documenter Chaque Composant

Ajoutez des commentaires JSDoc à chaque composant :

```tsx
/**
 * QuotesCard - Affiche la liste des devis d'une intervention
 * 
 * @component
 * @example
 * ```tsx
 * <QuotesCard
 *   quotes={quotes}
 *   userRole="manager"
 *   onAddQuote={() => console.log('Add quote')}
 * />
 * ```
 * 
 * @param {Quote[]} quotes - Liste des devis
 * @param {UserRole} userRole - Rôle de l'utilisateur actuel
 * @param {() => void} [onAddQuote] - Callback lors de l'ajout d'un devis
 * @param {(id: string) => void} [onViewQuote] - Callback lors de la visualisation d'un devis
 */
export const QuotesCard = ({ ... }: QuotesCardProps) => { ... }
```

### 6.2 Créer un Storybook (Optionnel mais Recommandé)

Si le projet utilise Storybook, créez des stories pour chaque composant :

```tsx
// QuotesCard.stories.tsx
export default {
  title: 'Interventions/Cards/QuotesCard',
  component: QuotesCard,
} as Meta

export const WithQuotes: Story = {
  args: {
    quotes: mockQuotes,
    userRole: 'manager',
  }
}

export const Empty: Story = {
  args: {
    quotes: [],
    userRole: 'manager',
  }
}

export const ProviderView: Story = {
  args: {
    quotes: mockQuotes,
    userRole: 'provider',
  }
}
```

---

## Checklist Finale

Avant de considérer le travail terminé, vérifiez :

### Code Quality
- [ ] Tous les composants suivent la méthodologie BEM
- [ ] Pas de duplication de code
- [ ] TypeScript strict activé, pas d'erreurs
- [ ] Toutes les props sont typées
- [ ] Les permissions sont centralisées et réutilisées

### Fonctionnalités
- [ ] Toutes les actions existantes fonctionnent
- [ ] Les permissions par rôle sont respectées
- [ ] Les états sont gérés correctement
- [ ] Les callbacks sont appelés au bon moment

### Tests
- [ ] Tests sur la page de test réussis
- [ ] Tests sur les pages de production réussis
- [ ] Tests pour les 3 rôles (manager, provider, tenant)
- [ ] Tests responsive (mobile, tablet, desktop)

### Documentation
- [ ] Chaque composant est documenté (JSDoc)
- [ ] Architecture des composants documentée
- [ ] Guide d'utilisation créé
- [ ] Exemples d'utilisation fournis

### Nettoyage
- [ ] Anciens composants supprimés
- [ ] Code mort supprimé
- [ ] Imports inutilisés supprimés
- [ ] Console.log de debug supprimés

---

## Ressources et Références

### Fichiers Existants à Analyser
- `components/interventions/preview-designs/preview-hybrid-manager.tsx`
- `components/interventions/preview-designs/preview-hybrid-provider.tsx`
- `components/interventions/preview-designs/preview-hybrid-tenant.tsx`
- `components/interventions/intervention-scheduling-preview.tsx`
- `app/gestionnaire/test-preview/page.tsx`

### Pages de Production
- `app/gestionnaire/interventions/[id]/page.tsx`
- `app/prestataire/interventions/[id]/page.tsx`
- `app/locataire/interventions/[id]/page.tsx`

### Méthodologie BEM
- [BEM Official Documentation](http://getbem.com/)
- [BEM 101](https://css-tricks.com/bem-101/)

### Bonnes Pratiques React/TypeScript
- Composants purs et prévisibles
- Props immutables
- Séparation des préoccupations (UI vs logique métier)
- Composition over inheritance

---

## Contact et Support

Si vous avez des questions ou besoin de clarifications :
1. Consultez d'abord cette documentation
2. Analysez les composants existants pour comprendre le contexte
3. Testez vos modifications sur la page de test avant la production
4. Documentez vos décisions importantes

**Bonne chance avec la refactorisation ! 🚀**
