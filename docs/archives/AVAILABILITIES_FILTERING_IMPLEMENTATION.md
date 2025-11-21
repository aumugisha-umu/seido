# Implementation du filtrage des disponibilités par statut de devis

## Aperçu

Le composant `UserAvailabilitiesDisplay` a été amélioré pour supporter le filtrage intelligent des disponibilités basé sur les statuts des devis. Cette fonctionnalité améliore l'expérience utilisateur en masquant automatiquement les disponibilités non pertinentes.

## Fonctionnalités ajoutées

### 1. Filtrage par statut de devis
- **Automatique** : Les disponibilités des prestataires avec uniquement des devis rejetés sont automatiquement masquées
- **Optionnel** : Le filtrage ne s'active que si la prop `quotes` est fournie
- **Intelligent** : Préserve toutes les disponibilités des locataires et gestionnaires

### 2. Indicateurs visuels
- **Badge "Filtré"** : Badge bleu avec icône de filtre quand un filtrage est appliqué
- **Tooltip informatif** : Explique le filtrage au survol du badge
- **Alert contextuelle** : Message détaillé sur les disponibilités masquées
- **Animation smooth** : Transitions douces pour les changements d'état

### 3. Messages d'état vide améliorés
- **Différenciation** : Messages distincts pour "aucune disponibilité" vs "toutes filtrées"
- **Contexte détaillé** : Indique précisément pourquoi les disponibilités sont masquées
- **Design cohérent** : Utilise le design system existant avec des couleurs appropriées

## Utilisation

### Sans filtrage (comportement existant maintenu)
```tsx
<UserAvailabilitiesDisplay
  availabilities={availabilities}
  userRole="gestionnaire"
  title="Disponibilités"
/>
```

### Avec filtrage par devis
```tsx
import { UserAvailabilitiesDisplay } from '@/components/intervention/user-availabilities-display'

// Dans votre composant de page d'intervention
<UserAvailabilitiesDisplay
  availabilities={interventionAvailabilities}
  quotes={interventionQuotes} // Nouveau : active le filtrage
  userRole="gestionnaire"
  title="Disponibilités pour l'intervention"
  filterRole="prestataire" // Optionnel : filtre par rôle
/>
```

### Exemple complet dans une page d'intervention
```tsx
// app/gestionnaire/interventions/[id]/page.tsx
import { UserAvailabilitiesDisplay } from '@/components/intervention/user-availabilities-display'

export default function InterventionDetailPage() {
  const { intervention, quotes, availabilities } = useInterventionData()

  return (
    <div className="space-y-6">
      {/* Onglet Exécution */}
      <TabPanel value="execution">
        {/* Affichage des disponibilités avec filtrage intelligent */}
        <UserAvailabilitiesDisplay
          availabilities={availabilities}
          quotes={quotes} // Active le filtrage automatique
          userRole="gestionnaire"
          title="Disponibilités confirmées"
          showCard={true}
        />

        {/* Reste du contenu de l'onglet */}
      </TabPanel>
    </div>
  )
}
```

## Comportement du filtrage

### Règles de filtrage
1. **Toujours inclus** :
   - Toutes les disponibilités des locataires
   - Toutes les disponibilités des gestionnaires
   - Les prestataires avec au moins un devis en attente ou approuvé

2. **Exclus** :
   - Les prestataires n'ayant que des devis rejetés
   - Les prestataires dont tous les devis sont rejetés

### États visuels

#### Pas de filtrage appliqué
- Affichage normal sans badge ni message
- Toutes les disponibilités sont visibles

#### Filtrage actif avec disponibilités visibles
- Badge "Filtré" bleu à côté du titre
- Alert d'information si des disponibilités sont masquées
- Liste des disponibilités non filtrées

#### Toutes les disponibilités filtrées
- Message d'état vide avec icône AlertCircle
- Explication détaillée du filtrage
- Liste des prestataires exclus

## Props du composant

```typescript
interface UserAvailabilitiesDisplayProps {
  availabilities: UserAvailability[]      // Liste des disponibilités
  title?: string                          // Titre personnalisé
  userRole: 'locataire' | 'gestionnaire' | 'prestataire'
  filterRole?: string                     // Filtre par rôle spécifique
  className?: string                      // Classes CSS additionnelles
  showCard?: boolean                      // Affichage dans une Card
  quotes?: Quote[]                        // NOUVEAU : Devis pour filtrage
}
```

## Styles et animations

### Couleurs utilisées
- **Badge filtré** : `bg-blue-50 text-blue-700 border-blue-200`
- **Alert info** : `bg-blue-50 border-blue-200`
- **État vide** : `bg-gray-50 border-gray-200`

### Transitions
- **Badge hover** : `transition-colors duration-200`
- **Card hover** : `transition-all duration-200 hover:shadow-sm`
- **Animations** : Utilise les animations Radix UI pour les tooltips

## Migration depuis l'ancienne version

Le composant est **rétro-compatible**. Les usages existants continueront de fonctionner sans modification :

```tsx
// Ancien usage - fonctionne toujours
<UserAvailabilitiesDisplay
  availabilities={availabilities}
  userRole="gestionnaire"
/>

// Nouveau usage avec filtrage
<UserAvailabilitiesDisplay
  availabilities={availabilities}
  quotes={quotes} // Simplement ajouter cette prop
  userRole="gestionnaire"
/>
```

## Performance

- **Mémoïsation** : Utilise `useMemo` pour optimiser les calculs de filtrage
- **Rendu conditionnel** : Ne calcule le filtrage que si `quotes` est fourni
- **Groupage efficace** : Regroupe les disponibilités une seule fois

## Accessibilité

- **ARIA labels** : Tooltips et alerts avec rôles appropriés
- **Contraste** : Respecte les ratios WCAG AA
- **Keyboard navigation** : Badge et tooltip accessibles au clavier
- **Screen readers** : Messages descriptifs pour les états filtrés