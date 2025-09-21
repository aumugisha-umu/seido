# Logique de soumission de devis - Prestataires

## Règles métier

### Un seul devis actif par prestataire
- Un prestataire ne peut avoir qu'**un seul devis actif** à la fois par intervention
- Les statuts considérés comme "actifs" sont :
  - `pending` - Devis en attente de validation
  - `approved` - Devis accepté par le gestionnaire

### Conditions pour soumettre un nouveau devis

Le bouton "Soumettre un devis" est visible **UNIQUEMENT** si :
1. L'utilisateur est connecté en tant que **prestataire**
2. Il n'y a **aucun devis actif** de ce prestataire pour cette intervention

### Scénarios possibles

#### ✅ Cas où le prestataire PEUT soumettre un devis :
- Aucun devis existant
- Devis précédent avec statut `rejected` (rejeté)
- Devis précédent avec statut `cancelled` (annulé par le prestataire)

#### ❌ Cas où le prestataire NE PEUT PAS soumettre un devis :
- Devis existant avec statut `pending` (en attente)
- Devis existant avec statut `approved` (accepté)

### Interface utilisateur

#### Bouton visible (peut soumettre)
```
[+ Soumettre un devis]
```

#### Message informatif (ne peut pas soumettre)
```
Vous ne pouvez soumettre qu'un devis à la fois.
Annulez le devis actuel si vous souhaitez en soumettre un nouveau.
```

#### Actions disponibles selon les statuts
- **Devis pending** : Bouton "Annuler devis" disponible
- **Devis approved** : Aucune action (le processus continue)
- **Devis rejected** : Le prestataire peut soumettre un nouveau devis

## Implémentation technique

### Fonction de vérification
```typescript
const canSubmitQuote = () => {
  if (userContext !== 'prestataire' || !onSubmitQuote) return false
  
  // Vérifier s'il y a un devis actif du prestataire (pending ou approved)
  const activeUserQuote = quotes.find(quote => 
    quote.isCurrentUserQuote && 
    (quote.status === 'pending' || quote.status === 'approved')
  )
  
  // Le prestataire peut soumettre un devis seulement s'il n'y en a pas d'actif
  return !activeUserQuote
}
```

### Intégration dans l'interface
- Le bouton est intégré directement dans le header de la card "Devis"
- Position : Côté droit du titre de la section
- Style : Bouton primaire bleu (`bg-sky-600`)
