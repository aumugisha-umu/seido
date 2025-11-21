# React-Big-Calendar Integration Guide - SEIDO

## Fichiers créés

### 1. `components/interventions/big-calendar-wrapper.tsx`
Composant wrapper React pour react-big-calendar avec:
- Configuration française (semaine commence lundi)
- Intégration shadcn/ui design system
- Gestion des événements (click, slot selection)
- Affichage personnalisé avec icônes et badges de statut
- Support des vues mois/semaine/jour

### 2. `components/interventions/big-calendar-custom.css`
CSS custom pour correspondre au design SEIDO:
- Couleurs Tailwind (slate/blue palette)
- Borders arrondis cohérents
- Shadows subtiles
- Hover states élégants
- Typography cohérente
- Support responsive et accessibilité

---

## Installation

### Dépendances requises

```bash
npm install react-big-calendar date-fns
```

**Note:** `date-fns` est probablement déjà installé dans SEIDO.

---

## Utilisation

### Exemple basique

```tsx
"use client"

import { BigCalendarWrapper } from '@/components/interventions/big-calendar-wrapper'
import { useRouter } from 'next/navigation'
import type { InterventionWithRelations } from '@/lib/services'

export function MyCalendarPage({ interventions }: { interventions: InterventionWithRelations[] }) {
  const router = useRouter()

  const handleSelectEvent = (intervention: InterventionWithRelations) => {
    // Navigate to intervention detail page
    router.push(`/gestionnaire/interventions/${intervention.id}`)
  }

  const handleSelectSlot = (date: Date) => {
    // Open dialog to create new intervention at this date
    console.log('Selected slot:', date)
    // TODO: Open intervention creation modal
  }

  return (
    <div className="h-screen p-8">
      <BigCalendarWrapper
        interventions={interventions}
        dateField="scheduled_date"
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        initialView="week"
        className="h-full"
      />
    </div>
  )
}
```

### Remplacement de la vue semaine actuelle

Pour remplacer la vue semaine dans `interventions-calendar-view.tsx`:

```tsx
// Dans interventions-calendar-view.tsx

import { BigCalendarWrapper } from './big-calendar-wrapper'

// ...

{/* OPTION 1: Remplacer complètement la vue semaine */}
{calendarMode === 'week' && (
  <div className="flex-1 min-h-0">
    <BigCalendarWrapper
      interventions={interventions}
      dateField={dateField}
      onSelectEvent={(intervention) => router.push(getInterventionUrl(intervention.id))}
      onSelectSlot={(date) => setSelectedDate(date)}
      initialView="week"
      className="h-full"
    />
  </div>
)}

{/* OPTION 2: Ajouter comme troisième mode "Calendrier" */}
// Modifier CalendarViewMode type
type CalendarViewMode = 'month' | 'week' | 'calendar'

// Ajouter un nouveau toggle dans la toolbar
<ToggleGroupItem
  value="calendar"
  aria-label="Vue calendrier professionnel"
  className="h-7 px-2 data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700"
  title="Vue calendrier professionnel"
>
  <Calendar className="h-3.5 w-3.5 mr-1" />
  <span className="text-xs">Calendrier</span>
</ToggleGroupItem>

// Dans le contenu
{calendarMode === 'calendar' && (
  <div className="flex-1 min-h-0 p-3">
    <BigCalendarWrapper
      interventions={interventions}
      dateField={dateField}
      onSelectEvent={(intervention) => router.push(getInterventionUrl(intervention.id))}
      onSelectSlot={(date) => setSelectedDate(date)}
      initialView="week"
      className="h-full"
    />
  </div>
)}
```

---

## Props du composant

### `BigCalendarWrapper`

| Prop | Type | Description | Défaut |
|------|------|-------------|--------|
| `interventions` | `InterventionWithRelations[]` | Liste des interventions à afficher | **Requis** |
| `dateField` | `'scheduled_date' \| 'created_at' \| 'requested_date'` | Champ de date à utiliser | **Requis** |
| `onSelectEvent` | `(intervention: InterventionWithRelations) => void` | Callback lors du clic sur une intervention | **Requis** |
| `onSelectSlot` | `(date: Date) => void` | Callback lors de la sélection d'un créneau vide | **Requis** |
| `initialView` | `'month' \| 'week' \| 'day'` | Vue initiale du calendrier | `'week'` |
| `className` | `string` | Classes CSS supplémentaires | `''` |

---

## Fonctionnalités

### Vues disponibles

1. **Vue Mois**: Aperçu mensuel avec tous les événements
2. **Vue Semaine**: Planning hebdomadaire détaillé (7 jours)
3. **Vue Jour**: Planning journalier avec créneaux horaires

### Interactions

- **Clic sur intervention**: Déclenche `onSelectEvent`
- **Clic sur créneau vide**: Déclenche `onSelectSlot`
- **Navigation**: Boutons Précédent/Suivant/Aujourd'hui
- **Toggle vues**: Boutons Mois/Semaine/Jour dans la toolbar

### Affichage des interventions

Chaque événement affiche:
- **Icône de type**: Plomberie, électricité, chauffage, etc.
- **Heure**: Format HH:mm (si `scheduled_date` disponible)
- **Titre**: Titre de l'intervention
- **Badge de statut**: Couleur selon le statut (visible en desktop uniquement)

### Couleurs par statut

Les interventions sont colorées selon leur statut:
- **Demande**: Rouge clair
- **Approuvée**: Vert clair
- **Devis demandé**: Bleu clair
- **Planification**: Jaune clair
- **Planifiée**: Violet clair
- **En cours**: Indigo clair
- **Clôturée prestataire**: Orange clair
- **Clôturée locataire**: Émeraude clair
- **Clôturée gestionnaire**: Vert clair
- **Annulée**: Gris clair

---

## Personnalisation

### Modifier la durée par défaut

Actuellement, chaque intervention a une durée d'1 heure par défaut. Pour personnaliser:

```tsx
// Dans big-calendar-wrapper.tsx, ligne ~251

// Option 1: Durée fixe de 2 heures
endDate.setHours(endDate.getHours() + 2)

// Option 2: Durée selon le type d'intervention
const durationMap: Record<string, number> = {
  'plomberie': 2,
  'electricite': 3,
  'chauffage': 4,
  'peinture': 6,
  'default': 1
}
const duration = durationMap[intervention.type || 'default']
endDate.setHours(endDate.getHours() + duration)

// Option 3: Utiliser un champ duration de la DB (si disponible)
if (intervention.estimated_duration) {
  endDate.setMinutes(endDate.getMinutes() + intervention.estimated_duration)
}
```

### Ajouter des icônes personnalisées

```tsx
// Dans big-calendar-wrapper.tsx, fonction getInterventionIcon

const iconMap: Record<string, JSX.Element> = {
  'plomberie': <Droplet className="w-3 h-3 flex-shrink-0" />,
  'electricite': <Zap className="w-3 h-3 flex-shrink-0" />,
  'mon_nouveau_type': <MonIcon className="w-3 h-3 flex-shrink-0" />,
  // ...
}
```

### Personnaliser les messages français

```tsx
// Dans big-calendar-wrapper.tsx, objet messages

const messages = {
  today: "Aujourd'hui",
  previous: "Précédent",
  next: "Suivant",
  // ... ajouter/modifier les messages
}
```

---

## Comparaison avec le calendrier custom

| Critère | Custom Calendar | React-Big-Calendar |
|---------|-----------------|-------------------|
| **Taille bundle** | Léger (~10 KB) | Lourd (~50 KB) |
| **Mobile** | Excellent | Correct |
| **Desktop** | Bon | Excellent |
| **Fonctionnalités** | Basiques | Avancées |
| **Drag-and-drop** | Non | Oui (future) |
| **Courbe d'apprentissage** | Faible | Moyenne |
| **Maintenance** | Custom | Librairie tierce |

**Recommandation:**
- **Gestionnaire desktop**: React-Big-Calendar
- **Mobile/locataire**: Custom Calendar
- **Prestataire**: Custom Calendar (plus simple)

---

## Problèmes connus et solutions

### 1. Bundle size trop grand

**Solution**: Lazy load le composant

```tsx
import dynamic from 'next/dynamic'

const BigCalendarWrapper = dynamic(
  () => import('@/components/interventions/big-calendar-wrapper').then(m => ({ default: m.BigCalendarWrapper })),
  { ssr: false, loading: () => <CalendarSkeleton /> }
)
```

### 2. Conflits CSS avec Tailwind

**Solution**: Importer le CSS custom **après** le CSS de react-big-calendar

```tsx
// Dans big-calendar-wrapper.tsx
import 'react-big-calendar/lib/css/react-big-calendar.css'
import './big-calendar-custom.css' // Doit être après
```

### 3. Performances avec beaucoup d'interventions (>500)

**Solution**: Filtrer les interventions par période visible

```tsx
const visibleInterventions = useMemo(() => {
  // Ne garder que les interventions du mois/semaine affichée
  return interventions.filter(i => {
    const date = new Date(i[dateField])
    return date >= visibleStart && date <= visibleEnd
  })
}, [interventions, dateField, visibleStart, visibleEnd])
```

---

## Tests

### Test manuel

1. Ouvrir `/gestionnaire/interventions`
2. Vérifier que le calendrier s'affiche correctement
3. Tester la navigation (Précédent/Suivant/Aujourd'hui)
4. Tester les toggles de vues (Mois/Semaine/Jour)
5. Cliquer sur une intervention → Redirection vers détail
6. Cliquer sur un créneau vide → Log de la date
7. Vérifier les couleurs par statut
8. Vérifier les icônes par type

### Test E2E (à ajouter)

```typescript
// tests/calendar-view.spec.ts
test('should display interventions in calendar', async ({ page }) => {
  await page.goto('/gestionnaire/interventions')

  // Wait for calendar to load
  await page.waitForSelector('.rbc-calendar')

  // Check toolbar
  await expect(page.locator('.rbc-toolbar-label')).toBeVisible()

  // Check events
  const events = page.locator('.rbc-event')
  await expect(events).toHaveCount(3) // Si 3 interventions prévues

  // Click event
  await events.first().click()
  await expect(page).toHaveURL(/\/interventions\/[a-z0-9-]+/)
})
```

---

## Prochaines étapes

1. **Drag-and-drop**: Permettre de déplacer les interventions
2. **Resize**: Ajuster la durée en tirant les bords
3. **Multi-sélection**: Sélectionner plusieurs interventions
4. **Export**: Exporter le calendrier en PDF/ICS
5. **Filtres**: Filtrer par statut/type/prestataire
6. **Légende**: Afficher une légende des couleurs
7. **Print view**: Vue optimisée pour l'impression

---

## Support et Documentation

- [React-Big-Calendar Docs](https://github.com/jquense/react-big-calendar)
- [date-fns Docs](https://date-fns.org/)
- [shadcn/ui Docs](https://ui.shadcn.com/)
- [SEIDO Design System](./DESIGN/)

---

**Créé le**: 2025-11-01
**Auteur**: Claude (UI/UX Designer)
**Version**: 1.0.0
