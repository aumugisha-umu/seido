# Plan : Fix Participant Selection in ProgrammingModal

## Problème

Quand l'utilisateur clique "+ Ajouter prestataire" dans la ProgrammingModal, sélectionne un contact et confirme, rien ne se passe. La sélection n'est pas persistée visuellement ni transmise au serveur.

## Root Cause

1. `onProviderToggle` et `onManagerToggle` sont `() => {}` dans les 2 parents
2. Le hook `useInterventionPlanning` reçoit `selectedProviders` comme paramètre constructeur mais est appelé sans arguments dans `interventions-page-client.tsx`
3. Le `ContactSelector.onContactSelected` appelle `onProviderToggle(contact.id)` → no-op
4. `onConfirm` ne passe aucun paramètre → le hook ne sait pas quels participants ont été sélectionnés

## Approche : État local dans ProgrammingModal

La modale gère son propre état participants, initialisé depuis les props, et passe les sélections finales à `onConfirm`.

**Pourquoi cette approche :**
- La modale est temporaire (ouvrir → modifier → confirmer → fermer)
- Les props actuels `selectedProviders` / `providers` deviennent les valeurs initiales
- Pas besoin de nouvelles props ni de modifier l'interface du hook côté parent
- Le ContactSelector fournit l'objet Contact complet dans `onContactSelected`

---

## Fichiers à modifier (3)

### 1. `components/intervention/modals/programming-modal-FINAL.tsx`

**A. Ajouter l'état local** (après la ligne 160, après le ref) :

```typescript
// Internal participant state (initialized from props when modal opens)
const [localProviders, setLocalProviders] = useState<Provider[]>([])
const [localSelectedProviderIds, setLocalSelectedProviderIds] = useState<string[]>([])
const [localManagers, setLocalManagers] = useState<Contact[]>([])
const [localSelectedManagerIds, setLocalSelectedManagerIds] = useState<string[]>([])
```

**B. Ajouter un `useEffect` pour initialiser** depuis les props quand la modale s'ouvre :

```typescript
useEffect(() => {
  if (isOpen) {
    setLocalProviders(providers || [])
    setLocalSelectedProviderIds(selectedProviders || [])
    setLocalManagers(managers || [])
    setLocalSelectedManagerIds(selectedManagers || [])
  }
}, [isOpen])
```

**C. Handlers internes pour add/remove** :

```typescript
const handleAddContact = (contact: Contact, contactType: string) => {
  if (contactType === 'provider') {
    setLocalProviders(prev => {
      if (prev.some(p => p.id === contact.id)) return prev
      return [...prev, { id: contact.id, name: contact.name, email: contact.email || '' }]
    })
    setLocalSelectedProviderIds(prev =>
      prev.includes(contact.id) ? prev : [...prev, contact.id]
    )
  } else if (contactType === 'manager') {
    setLocalManagers(prev => {
      if (prev.some(m => m.id === contact.id)) return prev
      return [...prev, { ...contact, type: 'gestionnaire' as const }]
    })
    setLocalSelectedManagerIds(prev =>
      prev.includes(contact.id) ? prev : [...prev, contact.id]
    )
  }
}

const handleRemoveContact = (contactId: string, contactType: string) => {
  if (contactType === 'provider') {
    setLocalSelectedProviderIds(prev => prev.filter(id => id !== contactId))
    // Keep in localProviders for potential re-add (filtered by selectedIds)
  } else if (contactType === 'manager') {
    setLocalSelectedManagerIds(prev => prev.filter(id => id !== contactId))
  }
}
```

**D. Modifier les computed contacts** (lignes 167-177) pour utiliser l'état local :

```typescript
// Remplacer managers/selectedManagers/providers/selectedProviders par les versions locales
const selectedManagerContacts: Contact[] = localManagers
  .filter(m => localSelectedManagerIds.includes(m.id))
  .map(m => ({ ...m, type: 'gestionnaire' as const }))

const selectedProviderContacts: Contact[] = localProviders
  .filter(p => localSelectedProviderIds.includes(p.id))
  .map(p => ({ ...p, type: 'prestataire' as const, email: p.email || '' }))
```

**E. Modifier les callbacks ContactSection** (lignes 333-348) :

```typescript
// Gestionnaires
<ContactSection
  sectionType="managers"
  contacts={selectedManagerContacts}
  onAddContact={onOpenManagerModal || (() => contactSelectorRef.current?.openContactModal('manager'))}
  onRemoveContact={(id) => handleRemoveContact(id, 'manager')}
  minRequired={1}
  customLabel="Gestionnaire(s) assigné(s)"
/>

// Prestataires
<ContactSection
  sectionType="providers"
  contacts={selectedProviderContacts}
  onAddContact={onOpenProviderModal || (() => contactSelectorRef.current?.openContactModal('provider'))}
  onRemoveContact={(id) => handleRemoveContact(id, 'provider')}
  customLabel="Prestataire(s) à contacter"
/>
```

**F. Modifier le callback ContactSelector** (lignes 904-911) :

```typescript
<ContactSelector
  ref={contactSelectorRef}
  teamId={teamId}
  displayMode="compact"
  hideUI={true}
  selectedContacts={{
    manager: selectedManagerContacts,
    provider: selectedProviderContacts
  }}
  onContactSelected={(contact, contactType) => {
    handleAddContact(contact, contactType)
  }}
  onContactRemoved={(contactId, contactType) => {
    handleRemoveContact(contactId, contactType)
  }}
/>
```

**G. Modifier le bouton Confirmer** (ligne 884) pour passer les sélections :

```typescript
onClick={() => onConfirm?.({
  selectedProviderIds: localSelectedProviderIds,
  selectedManagerIds: localSelectedManagerIds
})}
```

**H. Mettre à jour le type de `onConfirm`** dans `ProgrammingModalFinalProps` :

```typescript
onConfirm?: (participants?: {
  selectedProviderIds: string[]
  selectedManagerIds: string[]
}) => void
```

---

### 2. `hooks/use-intervention-planning.ts`

**A. Modifier la signature de `handleProgrammingConfirm`** (ligne 170) :

```typescript
const handleProgrammingConfirm = async (participants?: {
  selectedProviderIds: string[]
  selectedManagerIds: string[]
}) => {
  if (!programmingModal.intervention || !programmingOption) return

  const planningData: PlanningData = {
    option: programmingOption,
    directSchedule: programmingOption === "direct" ? programmingDirectSchedule : undefined,
    proposedSlots: programmingOption === "propose" ? programmingProposedSlots : undefined,
    requireQuote: requireQuote,
    // ✅ Use participants from modal state instead of hook constructor params
    selectedProviders: participants?.selectedProviderIds || selectedProviders || [],
    instructions: instructions || undefined,
  }
  // ... reste inchangé
```

---

### 3. Nettoyage parents (optionnel, cosmétique)

**`intervention-detail-client.tsx`** — les `() => {}` handlers ne sont plus utilisés par la modale mais restent dans le code. Pas de casse, juste du code mort qu'on peut laisser.

**`interventions-page-client.tsx`** — idem.

---

## Imports à ajouter

Dans `programming-modal-FINAL.tsx`, ajouter `useState` et `useEffect` aux imports React (ligne 1 du fichier, s'ils n'y sont pas déjà).

---

## Ce que ça change

| Aspect | Avant | Après |
|--------|-------|-------|
| Click "Ajouter prestataire" | Rien ne se passe | Le prestataire apparaît dans la section |
| Click "×" sur un contact | Rien ne se passe | Le contact est retiré de la section |
| Confirmer la planification | `selectedProviders: []` | `selectedProviders: [id1, id2...]` |
| Réouvrir la modale | - | État réinitialisé depuis les props |

## Vérification

1. `npm run build` — compilation sans erreurs
2. Test manuel :
   - Ouvrir une intervention "approuvée"
   - Cliquer "Planifier" → ProgrammingModal s'ouvre
   - Vérifier que les participants existants sont pré-remplis
   - Cliquer "+ Ajouter prestataire" → ContactSelector s'ouvre
   - Sélectionner un prestataire → Il apparaît dans la section
   - Cliquer "×" sur un prestataire → Il disparaît
   - Sélectionner une option de planning + confirmer
   - Vérifier que les providers sont envoyés au serveur (logs)
