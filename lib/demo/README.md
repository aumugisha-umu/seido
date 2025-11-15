# Mode Démo SEIDO

Mode démonstration complet avec données réalistes belges et impersonation d'utilisateurs.

## 🎯 Fonctionnalités

### ✅ Données Réalistes
- **50 immeubles** : 80% en Belgique (Bruxelles, Flandre, Wallonie), 20% pays frontaliers
- **~170 lots** : Appartements, studios, parkings...
- **120 interventions** : Tous les statuts du workflow
- **17 utilisateurs** : 3 gestionnaires, 8 locataires, 5 prestataires, 1 admin

### ✨ Impersonation
Fonctionnalité clé du mode démo :
1. Naviguer vers **Contacts** en tant que gestionnaire
2. Cliquer sur **"Se connecter"** sur une card utilisateur
3. Le rôle change automatiquement
4. Vous voyez l'application **exactement comme cet utilisateur**
5. Switch entre rôles avec la barre en haut → **retourne au dernier utilisateur impersoné**

### 🎨 UX
- **Barre orange sticky** en haut avec :
  - Indicateur "MODE DÉMO"
  - Sélecteur de rôle (tabs)
  - Utilisateur actuel impersoné (avec avatar)
  - Bouton "Réinitialiser données"
  - Lien "Quitter le mode démo"
- **Filtrage automatique** des données par utilisateur
- **Données locales** (LokiJS in-memory, aucun appel Supabase)

## 📁 Architecture

```
lib/demo/
├── config/
│   └── locations.config.ts         # Adresses BE + frontaliers
├── store/
│   └── demo-data-store.ts          # LokiJS singleton
├── factories/
│   └── index.ts                    # Factories pour générer données
├── demo-context.tsx                # React Context (impersonation state)
├── seed.ts                         # Générateur de dataset complet
└── README.md

app/demo/
├── layout.tsx                      # DemoProvider + seed initial
├── [role]/
│   ├── layout.tsx                  # DemoRoleSwitcher
│   ├── dashboard/page.tsx
│   └── contacts/page.tsx           # Page clé pour impersonation

components/demo/
├── demo-role-switcher.tsx          # Barre sticky en haut
└── demo-contact-card.tsx           # Card avec bouton "Se connecter"

app/api/demo/
└── switch-role/route.ts            # API pour changer de rôle
```

## 🚀 Utilisation

### Accéder au mode démo
1. Aller sur `/auth/login`
2. Cliquer sur **"Essayer en mode démo"**
3. → Redirigé vers `/demo/gestionnaire/dashboard`

### Tester l'impersonation
1. En tant que Gestionnaire, aller dans **Contacts**
2. Onglet **Locataires** → Choisir "Marie Dubois"
3. Cliquer **"Se connecter"**
4. → Switch automatique vers rôle Locataire
5. Dashboard montre **uniquement les données de Marie** :
   - Son lot (référence, adresse...)
   - Ses interventions (5-10 au lieu de 120)
6. Switch vers **Prestataire** → Retourne au dernier prestataire
7. Switch retour vers **Locataire** → Retourne à Marie ✅

### Réinitialiser
Bouton **"Réinitialiser"** dans la barre → Régénère toutes les données fraîches

## 🔧 Développement

### Ajouter des données
Modifier `lib/demo/seed.ts` :
```typescript
// Ajouter plus d'utilisateurs
const nouveauxLocataires = [
  factories.createUser('locataire', { ... })
]
```

### Ajouter une page demo
```tsx
// app/demo/[role]/ma-page/page.tsx
'use client'
import { useDemoContext } from '@/lib/demo/demo-context'

export default function MaPageDemo() {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()
  const data = store.query('...')

  return <div>...</div>
}
```

### Filtrer par utilisateur
```typescript
// Récupérer les interventions d'un utilisateur
const assignments = store.query('intervention_assignments', {
  filters: { user_id: user.id }
})
const interventionIds = assignments.map(a => a.intervention_id)
const interventions = interventionIds.map(id => store.get('interventions', id))
```

## 📊 Dataset Détails

### Distribution Géographique
- **Bruxelles-Capitale** : 30% (15 biens)
- **Flandre** : 30% (15 biens)
- **Wallonie** : 20% (10 biens)
- **France** : 10% (5 biens)
- **Pays-Bas, Allemagne, Luxembourg** : 10% (5 biens)

### Statuts Interventions
- Demandes : 15%
- Approuvées : 10%
- Devis demandé : 12%
- Planification : 8%
- Planifiées : 10%
- En cours : 15%
- Clôturées : 25%
- Annulées : 5%

### Utilisateurs Clés
**Gestionnaires :**
- Jean Dupont
- Sophie Van der Linden
- Marc Janssens

**Locataires (pour tester impersonation) :**
- Marie Dubois → Lot 3B, Bruxelles
- Pierre Lambert → Lot 12A, Anvers
- Isabelle Martin → Lot 5C, Liège

**Prestataires :**
- Plomberie Bruxelloise SPRL
- Électricité Liégeoise SA
- Chauffage Expert Anvers

## 🔐 Sécurité

- ✅ **Aucun appel Supabase** en mode démo
- ✅ **Données 100% locales** (LokiJS in-memory)
- ✅ **Cookies** pour détecter mode demo
- ✅ **Isolation totale** de la prod

## 🎓 Cas d'Usage

1. **Démonstrations commerciales** → Montrer toutes les interfaces
2. **Formation utilisateurs** → Essayer sans risque
3. **Tests UX** → Voir l'app de différentes perspectives
4. **Développement** → Tester rapidement des features

## 📝 Notes

- Données réinitialisées au refresh de page
- LocalStorage pour mémoire d'impersonation
- ~150KB de bundle (LokiJS)
- Compatible Next.js 15 + React 19
