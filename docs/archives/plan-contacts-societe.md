# Plan de Migration : Support Contacts Société

**Date de début** : 2025-11-04
**Statut** : ✅ Backend Complet | 🔄 Frontend En Cours

---

## 📋 Vue d'Ensemble

Ajout de la possibilité de créer des contacts de type "Société" avec :
- **Personne physique** : Prénom + Nom + Email + Téléphone
- **Société** : Nom société + TVA + Adresse complète + Contact optionnel (prénom/nom)

### Fonctionnalité Clé
Lors de la création d'un contact société, l'utilisateur peut :
- **Créer une nouvelle société** : Formulaire complet (TVA, adresse)
- **Lier à une société existante** : Sélection dropdown + Prénom/Nom du contact dans la société

---

## ✅ Phase 1 : Migration Base de Données (COMPLÉTÉ)

### Fichier Créé
- `supabase/migrations/20251104000000_add_company_support_to_contacts.sql`

### Modifications Apportées

**Table `companies`** :
- ✅ Ajout `vat_number` VARCHAR(50) - Numéro de TVA
- ✅ Ajout `street` VARCHAR(255) - Nom de la rue
- ✅ Ajout `street_number` VARCHAR(20) - Numéro dans la rue
- ✅ Ajout `is_active` BOOLEAN - Statut actif
- ✅ Renommage `registration_number` → `vat_number`

**Table `users`** :
- ✅ Ajout `is_company` BOOLEAN DEFAULT FALSE - Type de contact

**Nouvelle table `company_members`** :
- ✅ Relation many-to-many (users ↔ companies)
- ✅ Champs : id, company_id, user_id, team_id, role, joined_at, left_at
- ✅ RLS policies complètes (gestionnaires/admins only)

**Indexes & Optimisation** :
- ✅ 7 index créés pour performance
- ✅ Trigger `updated_at` automatique
- ✅ Migration automatique des données existantes

**Migration Données Existantes** :
```sql
UPDATE users SET is_company = TRUE WHERE company_id IS NOT NULL;
```

---

## ✅ Phase 2 : Backend Services (COMPLÉTÉ)

### 1. CompanyRepository (`lib/services/repositories/company.repository.ts`)

**Méthodes Créées** :
- ✅ `findByTeam(teamId)` - Liste sociétés d'une équipe
- ✅ `findActiveByTeam(teamId)` - Sociétés actives (pour sélecteurs)
- ✅ `findByVatNumber(vat, teamId)` - Vérification unicité TVA
- ✅ `createWithAddress(data)` - Création avec adresse complète
- ✅ `deactivate(companyId)` - Soft deactivation

**Validation** :
- ✅ Champs requis : name, team_id
- ✅ Enum country validé
- ✅ Unicité TVA par équipe

### 2. Validateur TVA (`lib/utils/vat-validator.ts`)

**Formats Supportés** :
- ✅ Belgique (BE0123456789) avec checksum
- ✅ France (FRXX123456789)
- ✅ Pays-Bas (NL123456789B01)
- ✅ Allemagne (DE123456789)
- ✅ Luxembourg (LU12345678)
- ✅ Suisse (CHE-123.456.789)

**Fonctions** :
- ✅ `validateVatNumber(vat, strictCountry?)` - Validation complète
- ✅ `validateBelgianVat(vat)` - Checksum spécifique BE
- ✅ `formatVatNumber(vat)` - Formatage avec espaces
- ✅ `normalizeVatNumber(vat)` - Nettoyage (uppercase, no spaces)

### 3. ContactRepository Adapté

**Méthodes Mises à Jour** :
- ✅ `findByIdWithRelations()` - Inclut company complète (TVA, adresse)
- ✅ `findByUser()` - Inclut company complète
- ✅ `findByRole()` - Inclut company complète

**Champs Company Récupérés** :
```typescript
id, name, vat_number, street, street_number,
postal_code, city, country, email, phone, is_active
```

### 4. Types TypeScript Régénérés
- ✅ `lib/database.types.ts` mis à jour automatiquement
- ✅ Nouveaux champs disponibles dans les types

---

## 🔄 Phase 3 : Frontend Formulaire (À FAIRE)

### 1. ContactFormModal - Toggle Personne/Société

**Fichier** : `components/contact-form-modal.tsx`

**UI à Ajouter** :
```tsx
<RadioGroup value={contactType} onValueChange={setContactType}>
  <RadioGroupItem value="person" icon={User}>
    Personne physique
  </RadioGroupItem>
  <RadioGroupItem value="company" icon={Building2}>
    Société
  </RadioGroupItem>
</RadioGroup>
```

**États** :
- `contactType: 'person' | 'company'`
- `companyMode: 'new' | 'existing'` (si contactType = 'company')
- `selectedCompanyId: string | null` (si companyMode = 'existing')

### 2. Sous-Sélection Nouvelle/Existante

**Si contactType = 'company'** :
```tsx
<RadioGroup value={companyMode}>
  <RadioGroupItem value="new">Nouvelle société</RadioGroupItem>
  <RadioGroupItem value="existing">Société existante</RadioGroupItem>
</RadioGroup>
```

### 3. CompanySelector Component

**Fichier** : `components/ui/company-selector.tsx` (à créer)

**Props** :
```typescript
{
  teamId: string
  value: string | null
  onChange: (companyId: string) => void
}
```

**Affichage** :
- Nom société
- Numéro TVA
- Ville

### 4. Formulaire Nouvelle Société

**Champs** :
- Nom société* (text)
- Numéro TVA* (text avec validation temps réel)
- Rue* + Numéro* (text)
- Code postal* (text, regex 4-5 chiffres)
- Ville* (text)
- Pays* (select, Belgique par défaut)

**Champs Optionnels Contact** :
- Prénom + Nom (pour l'interlocuteur)
- Email* (toujours requis)
- Téléphone
- Notes

### 5. Validation Zod Conditionnelle

```typescript
const personSchema = z.object({
  type: z.literal('person'),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

const companyNewSchema = z.object({
  type: z.literal('company'),
  companyMode: z.literal('new'),
  companyName: z.string().min(2),
  vatNumber: z.string().regex(/^(BE|FR)[0-9]{10,11}$/),
  street: z.string().min(3),
  streetNumber: z.string().min(1),
  postalCode: z.string().regex(/^\d{4,5}$/),
  city: z.string().min(2),
  country: z.enum(['belgique', 'france', ...]),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

const companyExistingSchema = z.object({
  type: z.literal('company'),
  companyMode: z.literal('existing'),
  companyId: z.string().uuid(),
  firstName: z.string().min(2), // Requis pour contact dans société existante
  lastName: z.string().min(2),  // Requis
  email: z.string().email(),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

const contactSchema = z.discriminatedUnion('type', [
  personSchema,
  companyNewSchema,
  companyExistingSchema
])
```

### 6. handleSubmit Adapté

**3 Cas à Gérer** :

**Cas 1 : Personne physique** (inchangé)
```typescript
const payload = {
  is_company: false,
  first_name: data.firstName,
  last_name: data.lastName,
  name: `${data.firstName} ${data.lastName}`,
  email: data.email,
  phone: data.phone,
  notes: data.notes,
  team_id: teamId,
  role: selectedRole,
}
```

**Cas 2 : Société nouvelle**
```typescript
// 1. Créer la société
const companyResult = await companyRepository.createWithAddress({
  name: data.companyName,
  vat_number: data.vatNumber,
  street: data.street,
  street_number: data.streetNumber,
  postal_code: data.postalCode,
  city: data.city,
  country: data.country,
  team_id: teamId,
  email: data.email,
  phone: data.phone,
})

// 2. Créer le contact lié
const payload = {
  is_company: true,
  company_id: companyResult.data.id,
  first_name: data.firstName || null,
  last_name: data.lastName || null,
  name: data.firstName && data.lastName
    ? `${data.firstName} ${data.lastName}`
    : data.companyName,
  email: data.email,
  phone: data.phone,
  notes: data.notes,
  team_id: teamId,
  role: selectedRole,
}
```

**Cas 3 : Société existante**
```typescript
const payload = {
  is_company: true,
  company_id: data.companyId,
  first_name: data.firstName,
  last_name: data.lastName,
  name: `${data.firstName} ${data.lastName}`,
  email: data.email,
  phone: data.phone,
  notes: data.notes,
  team_id: teamId,
  role: selectedRole,
}
```

---

## 🎨 Phase 4 : Affichages Frontend (À FAIRE)

### 1. Liste Contacts (`contacts-page-client.tsx`)

**Adaptations** :
- Badge 🏢 "Entreprise" si `is_company = true`
- Affichage nom :
  - Si société sans interlocuteur : `company.name`
  - Si société avec interlocuteur : `${first_name} ${last_name}` + badge société
  - Si personne : `${first_name} ${last_name}`
- Icône Building2 dans avatar pour sociétés

**Code Exemple** :
```tsx
{contact.is_company && (
  <Badge variant="secondary" className="ml-2">
    <Building2 className="h-3 w-3 mr-1" />
    Entreprise
  </Badge>
)}
```

### 2. Page Détails Contact (`contact-details-client.tsx`)

**Section Conditionnelle** :

**Si is_company = false** (personne physique) :
```tsx
<Section title="Informations Personnelles">
  <Field label="Prénom" value={contact.first_name} />
  <Field label="Nom" value={contact.last_name} />
  <Field label="Email" value={contact.email} />
  <Field label="Téléphone" value={contact.phone} />
</Section>
```

**Si is_company = true** (société) :
```tsx
<Section title="Informations Société">
  <Field label="Nom société" value={contact.company?.name} />
  <Field label="Numéro TVA" value={contact.company?.vat_number} />
  <Badge variant="outline">Entreprise</Badge>
</Section>

{(contact.first_name || contact.last_name) && (
  <Section title="Interlocuteur">
    <Field label="Prénom" value={contact.first_name} />
    <Field label="Nom" value={contact.last_name} />
  </Section>
)}

<Section title="Adresse Société">
  <Field label="Rue" value={`${contact.company?.street} ${contact.company?.street_number}`} />
  <Field label="Code postal" value={contact.company?.postal_code} />
  <Field label="Ville" value={contact.company?.city} />
  <Field label="Pays" value={contact.company?.country} />
</Section>

<Section title="Contact">
  <Field label="Email" value={contact.email} />
  <Field label="Téléphone" value={contact.phone} />
</Section>
```

### 3. Contact Detail Header (`contact-detail-header.tsx`)

**Adaptations** :
- Icône conditionnelle : `<Building2 />` si société, `<User />` sinon
- Badge "Entreprise" dans le header si société
- Nom affiché :
  - Société sans interlocuteur : nom société
  - Société avec interlocuteur : prénom + nom
  - Personne : prénom + nom

### 4. Contact Selector (`contact-selector.tsx`)

**Adaptations** :
- Badge "(Société)" après le nom dans la dropdown
- Icône Building2 dans l'avatar pour sociétés
- Affichage nom société si applicable

### 5. Composants Réutilisables (À CRÉER)

**ContactAvatar** (`components/ui/contact-avatar.tsx`) :
```tsx
<ContactAvatar
  contact={contact}
  isCompany={contact.is_company}
  fallback={contact.is_company ? <Building2 /> : getInitials(contact)}
/>
```

**ContactName** (`components/ui/contact-name.tsx`) :
```tsx
<ContactName contact={contact} />
// Affiche automatiquement le bon nom selon le type
```

---

## 🧪 Phase 5 : Tests & Migration (À FAIRE)

### 1. Tests Backend

**Fichier** : `lib/services/__tests__/contact.service.test.ts`

**Scénarios** :
- ✅ Créer contact personne physique
- ✅ Créer contact société nouvelle avec TVA valide
- ❌ Créer contact société avec TVA invalide → erreur
- ❌ Créer contact société sans adresse → erreur
- ✅ Vérifier unicité TVA dans l'équipe
- ✅ Créer contact lié à société existante

### 2. Tests Frontend

**Fichier** : `components/__tests__/contact-form-modal.test.tsx`

**Scénarios** :
- Toggle entre personne/société fonctionne
- Validation champs personne
- Validation champs société (TVA, adresse)
- Soumission formulaire personne
- Soumission formulaire société nouvelle
- Soumission formulaire société existante

### 3. Tests E2E

**Fichier** : `tests-new/gestionnaire/contacts-company.spec.ts`

**Scénarios** :
- Créer contact société avec TVA belge
- Affichage badge "Entreprise" dans liste
- Affichage détails société avec adresse complète
- Édition contact société
- Recherche par nom société
- Lier nouveau contact à société existante

### 4. Migration Données Existantes

**Script** : `scripts/migrate-existing-contacts-to-companies.sql`

```sql
-- 1. Créer les companies pour les users existants avec company
INSERT INTO companies (id, name, team_id, created_at)
SELECT
  gen_random_uuid(),
  company,
  team_id,
  created_at
FROM users
WHERE company IS NOT NULL
  AND company != ''
  AND deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- 2. Lier les users aux companies créées
UPDATE users u
SET
  company_id = c.id,
  is_company = TRUE
FROM companies c
WHERE u.company = c.name
  AND u.team_id = c.team_id
  AND u.company IS NOT NULL
  AND u.deleted_at IS NULL;
```

---

## 📊 Progression Actuelle

**Phase 1 : Migration DB** → ✅ 100% (2/2 tâches)
**Phase 2 : Backend Services** → ✅ 100% (4/4 tâches)
**Phase 3 : Frontend Formulaire** → ⏳ 0% (0/6 tâches)
**Phase 4 : Affichages Frontend** → ⏳ 0% (0/5 tâches)
**Phase 5 : Tests & Migration** → ⏳ 0% (0/4 tâches)

**Total : 6/21 tâches complétées (29%)**

---

## 🚀 Prochaines Étapes (Session Suivante)

### Priorité 1 : Formulaire ContactFormModal
1. Ajouter toggle Personne/Société
2. Implémenter sous-sélection Nouvelle/Existante
3. Créer CompanySelector
4. Implémenter formulaire nouvelle société
5. Ajouter validation Zod conditionnelle
6. Adapter handleSubmit (3 cas)

### Priorité 2 : Affichages
1. Liste contacts (badge entreprise)
2. Page détails (sections société)
3. Contact header (icône/badge)
4. Contact selector (affichage société)
5. Composants réutilisables

### Priorité 3 : Tests
1. Tests backend complets
2. Tests frontend
3. Tests E2E
4. Migration données existantes

---

## 📝 Notes Techniques

### Logique du Nom Contact
- **Personne** : `name = firstName + lastName`
- **Société avec interlocuteur** : `name = firstName + lastName`
- **Société sans interlocuteur** : `name = companyName`

### Validation TVA
- Format obligatoire : `BE0123456789` ou `FR12345678901`
- Checksum belge vérifié automatiquement
- Unicité par équipe

### Relations Base de Données
- **1-to-many** : company → users (via company_id)
- **many-to-many** : company ↔ users (via company_members, future)

---

## 🔗 Fichiers Modifiés/Créés

### Backend (6 fichiers)
- ✅ `supabase/migrations/20251104000000_add_company_support_to_contacts.sql`
- ✅ `lib/database.types.ts` (auto-généré)
- ✅ `lib/services/repositories/company.repository.ts` (nouveau)
- ✅ `lib/utils/vat-validator.ts` (nouveau)
- ✅ `lib/services/repositories/contact.repository.ts` (adapté)
- ⏳ `lib/services/domain/contact.service.ts` (à adapter)

### Frontend (7 fichiers à modifier)
- ⏳ `components/contact-form-modal.tsx`
- ⏳ `components/ui/company-selector.tsx` (à créer)
- ⏳ `app/gestionnaire/contacts/contacts-page-client.tsx`
- ⏳ `app/gestionnaire/contacts/details/[id]/contact-details-client.tsx`
- ⏳ `components/contact-detail-header.tsx`
- ⏳ `components/ui/contact-selector.tsx`
- ⏳ `components/ui/contact-avatar.tsx` (à créer)
- ⏳ `components/ui/contact-name.tsx` (à créer)

### Tests (3 fichiers à créer)
- ⏳ `lib/services/__tests__/contact.service.test.ts`
- ⏳ `components/__tests__/contact-form-modal.test.tsx`
- ⏳ `tests-new/gestionnaire/contacts-company.spec.ts`

---

**Dernière mise à jour** : 2025-11-04
**Auteur** : Claude Code
**Statut** : Backend Prêt → Frontend À Implémenter
