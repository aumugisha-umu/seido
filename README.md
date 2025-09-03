# SEIDO - Plateforme de Gestion Immobilière

## Vue d'ensemble

SEIDO est un **prototype de plateforme** de gestion immobilière multi-rôles qui démontre une interface de gestion des propriétés, interventions et relations locatives. Ce prototype présente une interface complète pour quatre types d'utilisateurs avec des fonctionnalités UI spécialisées pour chaque rôle.

> ⚠️ **État Actuel** : Il s'agit d'un prototype/démo avec des interfaces fonctionnelles mais sans backend de production. Toutes les données sont simulées.

## Architecture de l'Application

### Technologies Utilisées
- **Frontend**: Next.js 15.2.4 avec App Router
- **UI Framework**: React 19 avec TypeScript
- **Styling**: Tailwind CSS v4 avec shadcn/ui
- **Authentification**: Système de démo (localStorage)
- **Données**: Mock data intégrée dans le code
- **État**: Prototype/Démo sans backend
- **Déploiement**: Compatible Vercel

### Structure des Rôles

#### 1. 👑 **Admin** - Administration Système
**Responsabilités**: Supervision globale de la plateforme
- Gestion des utilisateurs (2,847 utilisateurs)
- Administration système et configuration
- Supervision des bâtiments (1,234 propriétés)
- Monitoring des interventions (5,678 interventions)
- Suivi des revenus globaux (€45,231)
- Rapports et analytics
- Support technique

#### 2. 🏠 **Gestionnaire** - Gestion de Patrimoine
**Responsabilités**: Gestion du portfolio immobilier et relations locatives
- **Portfolio**: 12 bâtiments, 48 lots, 85% d'occupation, €15,850/mois
- Création et gestion des bâtiments/lots
- Validation des demandes d'intervention
- Gestion des devis et prestataires
- Planification et coordination des interventions
- Gestion des contacts (locataires, prestataires)
- Suivi financier et occupancy

#### 3. 🔧 **Prestataire** - Services et Maintenance
**Responsabilités**: Exécution des interventions et services
- **Activité**: 12 interventions actives, 47 terminées/mois, €3,240/mois
- Gestion des demandes d'intervention
- Création et soumission de devis
- Planification et exécution des travaux
- Gestion des disponibilités
- Suivi des paiements
- Reporting d'intervention

#### 4. 🏃 **Locataire** - Vie Quotidienne
**Responsabilités**: Gestion personnelle du logement
- **Logement**: Résidence Champs-Élysées, 45m², €1,200/mois
- Création de demandes d'intervention
- Suivi des réparations en temps réel
- Communication avec gestionnaires
- Accès aux documents
- Historique des interventions

## Workflow Principal - Gestion des Interventions

### Cycle de Vie d'une Intervention

```
1. CRÉATION
   Locataire → Nouvelle demande → Gestionnaire

2. VALIDATION
   Gestionnaire → Approuve/Rejette → Prestataire assigné

3. DEVIS (si requis)
   Prestataire → Crée devis → Gestionnaire → Accepte/Refuse

4. PLANIFICATION
   Gestionnaire → Fixe horaire/Propose créneaux → Coordination

5. EXÉCUTION
   Prestataire → Commence → En cours → Finalise

6. PAIEMENT
   Prestataire → Marque payé → Gestionnaire → Finalise → Terminé
```

### Statuts d'Intervention

#### Pour le Gestionnaire:
- **Nouvelles demandes**: Demandes en attente de validation
- **Devis**: En attente de devis des prestataires
- **À programmer**: Interventions approuvées à planifier
- **Programmées**: Interventions avec horaire fixé
- **En cours**: Interventions en cours d'exécution
- **Finalisation en attente**: En attente de finalisation paiement
- **Terminées**: Interventions complétées
- **Annulées**: Interventions annulées

#### Pour le Prestataire:
- **Nouvelles demandes**: Nouvelles assignations
- **Devis à fournir**: Devis requis
- **À programmer**: En attente de planification
- **Programmées**: Horaire confirmé
- **Paiement à recevoir**: En attente de paiement
- **Terminées**: Interventions payées
- **Rejetées**: Demandes refusées
- **Annulées**: Interventions annulées

#### Pour le Locataire:
- **En attente**: Demande soumise
- **Approuvée**: Validée par gestionnaire
- **En cours**: Intervention active
- **Terminée**: Intervention complétée
- **Rejetée**: Demande refusée

## Architecture des Données (Prototype)

### Système Actuel - Données de Démonstration

#### **Utilisateurs Demo**
```typescript
// lib/auth.ts - Utilisateurs prédéfinis pour la démo
export const demoUsers: Record<UserRole, User> = {
  admin: {
    id: "1",
    name: "Marie Dubois",
    email: "marie.dubois@seido.fr",
    role: "admin",
  },
  gestionnaire: {
    id: "2", 
    name: "Pierre Martin",
    email: "pierre.martin@seido.fr",
    role: "gestionnaire",
  },
  prestataire: {
    id: "3",
    name: "Jean Plombier", 
    email: "jean.plombier@services.fr",
    role: "prestataire",
  },
  locataire: {
    id: "4",
    name: "Sophie Tenant",
    email: "sophie.tenant@email.fr", 
    role: "locataire",
  },
}
```

#### **Types d'Intervention**
```typescript
// lib/intervention-data.ts
export const PROBLEM_TYPES = [
  { value: "maintenance", label: "Maintenance générale" },
  { value: "plumbing", label: "Plomberie" },
  { value: "electrical", label: "Électricité" },
  { value: "heating", label: "Chauffage" },
  { value: "locksmith", label: "Serrurerie" },
  { value: "painting", label: "Peinture" },
  { value: "other", label: "Autre" },
]

export const URGENCY_LEVELS = [
  {
    value: "low",
    label: "Bas - Quelques semaines à plusieurs mois",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "medium", 
    label: "Moyenne - Dans la semaine",
    color: "bg-orange-100 text-orange-800",
  },
  {
    value: "high",
    label: "Urgente - Dans les 24h",
    color: "bg-red-100 text-red-800",
  },
]
```

### Schéma de Base de Données (Conception Future)

> **Note** : Le schéma suivant représente la conception de la base de données pour une implémentation future en production. Actuellement, l'application fonctionne avec des données mock.

#### **users** (Future)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE user_role AS ENUM ('admin', 'gestionnaire', 'prestataire', 'locataire');
```

#### **buildings** (Future)
```sql
CREATE TABLE buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    country VARCHAR(100) DEFAULT 'France',
    manager_id UUID REFERENCES users(id),
    total_lots INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **lots** (Future)
```sql
CREATE TABLE lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
    lot_number VARCHAR(50) NOT NULL,
    floor INTEGER,
    surface_area DECIMAL(8,2),
    rooms INTEGER,
    rent_amount DECIMAL(10,2),
    charges_amount DECIMAL(10,2),
    tenant_id UUID REFERENCES users(id),
    is_occupied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(building_id, lot_number)
);
```

#### **interventions** (Future)
```sql
CREATE TABLE interventions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type intervention_type NOT NULL,
    urgency urgency_level NOT NULL,
    status intervention_status NOT NULL DEFAULT 'nouvelle-demande',
    location_details TEXT,
    
    -- Relations
    lot_id UUID REFERENCES lots(id),
    tenant_id UUID REFERENCES users(id),
    manager_id UUID REFERENCES users(id),
    assigned_provider_id UUID REFERENCES users(id),
    
    -- Devis et paiement
    expects_quote BOOLEAN DEFAULT FALSE,
    estimated_duration VARCHAR(100),
    final_amount DECIMAL(10,2),
    
    -- Dates
    scheduled_date TIMESTAMP,
    scheduled_start_time TIME,
    scheduled_end_time TIME,
    completed_at TIMESTAMP,
    
    -- Commentaires
    tenant_comment TEXT,
    manager_internal_comment TEXT,
    provider_execution_comment TEXT,
    provider_billing_comment TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE intervention_type AS ENUM (
    'plomberie', 'electricite', 'chauffage', 'serrurerie', 
    'peinture', 'menage', 'jardinage', 'autre'
);

CREATE TYPE urgency_level AS ENUM ('normale', 'urgente', 'critique');

CREATE TYPE intervention_status AS ENUM (
    'nouvelle-demande', 'approuvee', 'rejetee', 'devis-a-fournir', 
    'devis', 'a-programmer', 'programmee', 'en-cours', 
    'paiement-a-recevoir', 'finalisation-en-attente', 'terminee', 'annulee'
);
```

## Installation et Utilisation

### Prérequis
- Node.js 18+ 
- npm (pas de base de données requise pour la démo)

### Installation
```bash
# Cloner le dépôt
git clone [repository-url]
cd seido-app

# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# Construire pour la production
npm run build
npm run start
```

### Scripts Disponibles
```bash
npm run dev      # Serveur de développement
npm run build    # Construction pour production
npm run start    # Serveur de production
npm run lint     # Vérification du code
```

### Accès à la Démo

1. **Page d'accueil** : `/` - Présentation et navigation vers les rôles
2. **Connexion démo** : `/login` - Utiliser un des emails demo :
   - `marie.dubois@seido.fr` (Admin)
   - `pierre.martin@seido.fr` (Gestionnaire) 
   - `jean.plombier@services.fr` (Prestataire)
   - `sophie.tenant@email.fr` (Locataire)
3. **Dashboards** : Accès direct via `/dashboard/[role]`

### Structure de l'Application

```
seido-app/
├── app/                    # App Router Next.js 15
│   ├── dashboard/          # Dashboards par rôle
│   │   ├── admin/         
│   │   ├── gestionnaire/   
│   │   ├── prestataire/   
│   │   └── locataire/     
│   ├── login/             # Authentification démo
│   ├── signup/            # Inscription démo
│   └── globals.css        # Styles globaux Tailwind
├── components/            # Composants React
│   ├── ui/               # Composants shadcn/ui
│   ├── dashboards/       # Dashboards spécialisés
│   └── intervention/     # Composants interventions
├── lib/                  # Utilitaires et helpers
│   ├── auth.ts          # Données démo utilisateurs
│   ├── utils.ts         # Utilitaires généraux
│   └── intervention-data.ts # Types et niveaux d'urgence
└── hooks/               # Custom hooks React
```

### Configuration pour Production

#### Variables d'Environnement
```env
# Configuration Supabase Production
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[your-anon-key-here]
```

Voir `production-env-template.txt` et `SUPABASE_STAGING_SETUP.md` pour les instructions détaillées.

#### Scripts Futurs
```bash
# Migration base de données (à implémenter)
npm run db:migrate

# Seed données de test (à implémenter) 
npm run db:seed
```

## Sécurité et Permissions (Future)

### Row Level Security (RLS)
```sql
-- Activer RLS sur toutes les tables sensibles
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE availabilities ENABLE ROW LEVEL SECURITY;

-- Politique pour les gestionnaires
CREATE POLICY gestionnaire_interventions ON interventions
    FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'gestionnaire' AND 
        manager_id = auth.uid()
    );

-- Politique pour les prestataires
CREATE POLICY prestataire_interventions ON interventions
    FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'prestataire' AND 
        assigned_provider_id = auth.uid()
    );

-- Politique pour les locataires
CREATE POLICY locataire_interventions ON interventions
    FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'locataire' AND 
        tenant_id = auth.uid()
    );
```

## Roadmap - Évolution vers la Production

### Phase Actuelle : Prototype/Démo ✅
- [x] Interfaces utilisateur complètes pour 4 rôles
- [x] Design system avec Tailwind CSS v4 + shadcn/ui
- [x] Navigation et routing Next.js 15
- [x] Authentification de démonstration
- [x] Données mockées pour tous les workflows

### Phase 1 : Backend & Base de Données 🔄
- [ ] Intégration PostgreSQL/Supabase
- [ ] Implémentation du schéma de base complet
- [ ] Système d'authentification réel
- [ ] API routes Next.js pour CRUD operations
- [ ] Migration des données de démo

### Phase 2 : Fonctionnalités Avancées 📋
- [ ] Gestion des fichiers et uploads
- [ ] Système de notifications en temps réel
- [ ] Workflow complet des interventions
- [ ] Génération de rapports et analytics
- [ ] Row Level Security (RLS)

### Phase 3 : Production 🚀
- [ ] Tests automatisés
- [ ] Monitoring et logging
- [ ] Optimisations de performance
- [ ] Documentation API
- [ ] Déploiement continu

---

**Cette architecture de prototype démontre une gestion complète du cycle de vie des interventions immobilières avec une séparation claire des responsabilités entre les différents acteurs du système, prête pour une implémentation backend complète.**#   s e i d o  
 