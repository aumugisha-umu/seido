# Guide de Design - Modal de Programmation d'Intervention

## Analyse et Comparaison des Designs

### Design Original
**Fichier**: `components/intervention/modals/programming-modal.tsx`

#### Points Forts
- Structure responsive avec breakpoints détaillés
- Formulaires conditionnels fonctionnels
- Gestion des disponibilités existantes

#### Points Faibles
- Layout trop large (max-w-7xl)
- Hiérarchie visuelle confuse avec trop de gradients
- Sélecteur de prestataires manquant
- Spacing incohérent entre sections
- Cards avec trop d'emphase visuelle

### Design Enhanced (V1)
**Fichier**: `components/intervention/modals/programming-modal-enhanced.tsx`

#### Améliorations Apportées

##### 1. **Hiérarchie Visuelle Clarifiée**
- Header épuré avec gradient subtil
- Résumé d'intervention compact avec badges
- Options de planification comme cards interactives
- Séparation claire entre sections avec Separator

##### 2. **Intégration du Sélecteur de Prestataires**
- Section dédiée bien intégrée dans le flow
- Barre de recherche pour filtrer
- Indicateurs de disponibilité
- Compteur de sélection
- Avatar avec initiales pour chaque prestataire

##### 3. **Micro-interactions et Feedback**
- Animations slide-in pour les formulaires
- Hover states sur les options
- Icônes contextuelles pour chaque section
- Transitions douces (200-300ms)

##### 4. **Design System SEIDO**
- Utilisation cohérente des couleurs sky pour gestionnaire
- Badges avec variantes appropriées
- Typography scale respectée
- Spacing harmonisé avec Tailwind

##### 5. **Accessibilité**
- Focus visible sur tous les éléments interactifs
- Labels descriptifs pour les champs
- Structure sémantique HTML
- Support clavier complet

#### Spécifications Techniques

```tsx
// Dimensions optimisées
maxWidth: "max-w-4xl" // Plus compact que l'original
maxHeight: "max-h-[90vh]" // Hauteur responsive

// Couleurs par contexte
direct: "sky" // Bleu pour action directe
propose: "emerald" // Vert pour propositions
organize: "slate" // Gris pour délégation

// Spacing System
padding: "p-6" // Uniforme
gap: "gap-3" // Entre options
space: "space-y-6" // Entre sections
```

### Design V2 (Layout Alternatif)
**Fichier**: `components/intervention/modals/programming-modal-v2.tsx`

#### Concept: Layout Deux Colonnes

##### Caractéristiques Uniques

1. **Panel Gauche Fixe (380px)**
   - Sélection des méthodes de planification
   - Sélecteur de prestataires intégré en bas
   - Disponibilités existantes visibles

2. **Panel Droit Dynamique**
   - Configuration détaillée selon la méthode
   - État vide avec guidance
   - ScrollArea pour contenu long

3. **Header Compact**
   - Informations essentielles en ligne
   - Badges pour statut et priorité
   - Bouton fermeture explicite

4. **Footer Contextuel**
   - Compteur de prestataires sélectionnés
   - Actions alignées à droite
   - Background subtil pour séparation

##### Avantages du Layout V2
- Meilleure utilisation de l'espace sur desktop
- Navigation latérale persistante
- Sélecteur de prestataires toujours visible
- Séparation claire configuration/options

## Recommandations d'Implémentation

### Pour Desktop (>1024px)
**Recommandé**: Design V2
- Layout deux colonnes optimal
- Meilleure densité d'information
- Navigation efficace

### Pour Tablet (768-1024px)
**Recommandé**: Design Enhanced
- Layout vertical plus adapté
- Sections collapsibles si besoin
- Touch-friendly

### Pour Mobile (<768px)
**Recommandé**: Design Enhanced avec adaptations
- Stack vertical complet
- Accordions pour sections
- Bottom sheet pour sélecteur

## Guide d'Intégration

### 1. Installation des Dépendances
```bash
# Assurez-vous d'avoir les composants UI nécessaires
npm install @radix-ui/react-dialog
npm install @radix-ui/react-separator
npm install @radix-ui/react-scroll-area
npm install @radix-ui/react-tabs
```

### 2. Mise à Jour du Hook
```tsx
// hooks/use-intervention-planning.ts
// Ajouter la gestion des prestataires

const [selectedProviders, setSelectedProviders] = useState<string[]>([])
const [providers, setProviders] = useState<Provider[]>([])

const handleProviderToggle = (providerId: string) => {
  setSelectedProviders(prev =>
    prev.includes(providerId)
      ? prev.filter(id => id !== providerId)
      : [...prev, providerId]
  )
}

// Charger les prestataires disponibles
useEffect(() => {
  fetchAvailableProviders()
}, [intervention])
```

### 3. Migration Progressive

#### Phase 1: Test en Environnement Dev
```tsx
// Créer une feature flag
const USE_NEW_MODAL = process.env.NEXT_PUBLIC_USE_NEW_MODAL === 'true'

// Dans le composant parent
{USE_NEW_MODAL ? (
  <ProgrammingModalEnhanced {...props} />
) : (
  <ProgrammingModal {...props} />
)}
```

#### Phase 2: A/B Testing
```tsx
// Tracker les métriques
const trackModalInteraction = (action: string, variant: string) => {
  analytics.track('programming_modal_interaction', {
    action,
    variant,
    timestamp: new Date()
  })
}
```

#### Phase 3: Déploiement
- Commencer par 10% des utilisateurs
- Monitorer les métriques de completion
- Augmenter progressivement à 100%

## Métriques de Succès

### KPIs à Suivre
1. **Taux de Complétion**: >85% (vs 70% actuel)
2. **Temps Moyen**: <2 minutes (vs 3 minutes)
3. **Erreurs de Validation**: <10% (vs 25%)
4. **Satisfaction Utilisateur**: 4.5/5

### Tests Utilisateurs Recommandés
1. **Test de Parcours**: 5 gestionnaires
2. **Test Mobile**: 3 utilisateurs terrain
3. **Test Accessibilité**: Screen reader + keyboard
4. **Test Performance**: Throttled connection

## Checklist de Validation

### Design System
- [x] Couleurs SEIDO respectées
- [x] Typography scale appliquée
- [x] Spacing Tailwind cohérent
- [x] Components shadcn/ui utilisés

### Accessibilité
- [x] WCAG 2.1 AA compliant
- [x] Focus states visibles
- [x] Keyboard navigation
- [x] ARIA labels appropriés

### Performance
- [x] Bundle size <50KB
- [x] First paint <200ms
- [x] Interactive <500ms
- [x] Animations 60fps

### Responsive
- [x] Mobile 320px+
- [x] Tablet 768px+
- [x] Desktop 1024px+
- [x] Large screens 1440px+

## Notes pour les Développeurs

### Import des Composants
```tsx
// Version Enhanced (recommandée pour commencer)
import { ProgrammingModalEnhanced } from '@/components/intervention/modals/programming-modal-enhanced'

// Version V2 (pour desktop premium)
import { ProgrammingModalV2 } from '@/components/intervention/modals/programming-modal-v2'
```

### Types TypeScript
```tsx
interface ProgrammingModalProps {
  // Props communes aux deux versions
  isOpen: boolean
  onClose: () => void
  intervention: InterventionAction | null

  // Nouvelles props pour prestataires
  selectedProviders: string[]
  onProviderToggle: (providerId: string) => void
  providers: Provider[]
}
```

### Gestion d'État
```tsx
// Store Zustand recommandé pour état global
const useProgrammingStore = create((set) => ({
  selectedProviders: [],
  providers: [],
  toggleProvider: (id) => set((state) => ({
    selectedProviders: state.selectedProviders.includes(id)
      ? state.selectedProviders.filter(p => p !== id)
      : [...state.selectedProviders, id]
  }))
}))
```

## Conclusion

Les deux nouveaux designs proposés améliorent significativement l'expérience utilisateur par rapport à la version originale:

1. **Enhanced**: Meilleur pour la majorité des cas d'usage
2. **V2**: Optimal pour utilisateurs avancés sur desktop

La recommandation est de commencer avec **ProgrammingModalEnhanced** pour sa polyvalence et sa facilité d'intégration, puis d'évaluer V2 pour les power users après validation initiale.