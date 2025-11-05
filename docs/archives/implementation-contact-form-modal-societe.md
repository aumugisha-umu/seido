# Implémentation ContactFormModal - Support Société

**Fichier** : `components/contact-form-modal.tsx`
**Lignes** : 627
**Complexité** : Élevée (validation multi-équipes, gestion erreurs, etc.)

---

## 📋 Modifications Nécessaires

### 1. Imports à Ajouter (ligne ~11)

```typescript
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { User, Building2, Mail, AlertCircle } from "lucide-react"
```

### 2. Interface ContactFormData à Étendre (ligne ~26)

**AVANT** :
```typescript
interface ContactFormData {
  type: string
  firstName: string
  lastName: string
  email: string
  phone: string
  speciality?: string
  notes: string
  inviteToApp: boolean
}
```

**APRÈS** :
```typescript
interface ContactFormData {
  type: string
  // Contact type toggle
  contactType: 'person' | 'company'  // NOUVEAU

  // Company fields
  companyMode?: 'new' | 'existing'  // NOUVEAU
  companyId?: string | null  // NOUVEAU (si existing)
  companyName?: string  // NOUVEAU (si new)
  vatNumber?: string  // NOUVEAU (si new)
  street?: string  // NOUVEAU (si new)
  streetNumber?: string  // NOUVEAU (si new)
  postalCode?: string  // NOUVEAU (si new)
  city?: string  // NOUVEAU (si new)
  country?: string  // NOUVEAU (si new, default 'belgique')

  // Person fields (maintenant optionnels pour société)
  firstName: string
  lastName: string
  email: string
  phone: string
  speciality?: string
  notes: string
  inviteToApp: boolean
}
```

### 3. État Initial à Adapter (ligne ~94)

**AVANT** :
```typescript
const [formData, setFormData] = useState<ContactFormData>({
  type: defaultType,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  speciality: "",
  notes: "",
  inviteToApp: shouldInviteByDefault(defaultType),
})
```

**APRÈS** :
```typescript
const [formData, setFormData] = useState<ContactFormData>({
  type: defaultType,
  contactType: 'person',  // NOUVEAU: par défaut personne physique
  companyMode: 'new',  // NOUVEAU
  companyId: null,  // NOUVEAU
  companyName: "",  // NOUVEAU
  vatNumber: "",  // NOUVEAU
  street: "",  // NOUVEAU
  streetNumber: "",  // NOUVEAU
  postalCode: "",  // NOUVEAU
  city: "",  // NOUVEAU
  country: "belgique",  // NOUVEAU: default Belgique
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  speciality: "",
  notes: "",
  inviteToApp: shouldInviteByDefault(defaultType),
})
```

### 4. Validation Conditionnelle (nouveau helper, ~ligne 240)

```typescript
/**
 * Valider les champs selon le type de contact
 */
const validateFormData = (): boolean => {
  const newErrors: FormErrors = {}

  // Validation commune
  if (!formData.email.trim()) {
    newErrors.email = "L'email est requis"
  } else if (!isValidEmail(formData.email)) {
    newErrors.email = "L'email n'est pas valide"
  }

  if (formData.phone && !isValidPhone(formData.phone)) {
    newErrors.phone = "Le numéro de téléphone n'est pas valide"
  }

  // Validation spécifique PERSONNE PHYSIQUE
  if (formData.contactType === 'person') {
    if (!formData.firstName.trim()) {
      newErrors.firstName = "Le prénom est requis"
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Le nom est requis"
    }
  }

  // Validation spécifique SOCIÉTÉ
  if (formData.contactType === 'company') {
    if (formData.companyMode === 'new') {
      // Nouvelle société
      if (!formData.companyName?.trim()) {
        newErrors.companyName = "Le nom de la société est requis"
      }
      if (!formData.vatNumber?.trim()) {
        newErrors.vatNumber = "Le numéro de TVA est requis"
      }
      if (!formData.street?.trim()) {
        newErrors.street = "La rue est requise"
      }
      if (!formData.streetNumber?.trim()) {
        newErrors.streetNumber = "Le numéro est requis"
      }
      if (!formData.postalCode?.trim()) {
        newErrors.postalCode = "Le code postal est requis"
      } else if (!/^\d{4,5}$/.test(formData.postalCode)) {
        newErrors.postalCode = "Le code postal doit contenir 4 ou 5 chiffres"
      }
      if (!formData.city?.trim()) {
        newErrors.city = "La ville est requise"
      }

      // Validation TVA avec le validateur
      if (formData.vatNumber?.trim()) {
        const vatValidation = validateVatNumber(formData.vatNumber)
        if (!vatValidation.isValid) {
          newErrors.vatNumber = vatValidation.error
        }
      }
    } else if (formData.companyMode === 'existing') {
      // Société existante: firstName/lastName requis pour l'interlocuteur
      if (!formData.companyId) {
        newErrors.companyId = "Veuillez sélectionner une société"
      }
      if (!formData.firstName.trim()) {
        newErrors.firstName = "Le prénom de l'interlocuteur est requis"
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = "Le nom de l'interlocuteur est requis"
      }
    }
  }

  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}
```

### 5. UI Toggle Contact Type (insérer après ligne ~446)

**Emplacement** : Juste après le `<form>` opening tag, avant le dropdown "Type de contact"

```tsx
{/* Toggle Personne / Société */}
<div className="space-y-3 pb-4 border-b">
  <Label className="text-sm font-medium text-gray-700">
    Type de contact <span className="text-red-500">*</span>
  </Label>
  <RadioGroup
    value={formData.contactType}
    onValueChange={(value: 'person' | 'company') => {
      setFormData(prev => ({
        ...prev,
        contactType: value,
        // Reset company fields when switching to person
        ...(value === 'person' ? {
          companyMode: 'new',
          companyId: null,
          companyName: "",
          vatNumber: "",
          street: "",
          streetNumber: "",
          postalCode: "",
          city: "",
          country: "belgique",
        } : {})
      }))
      setErrors({})
    }}
    className="flex gap-4"
  >
    <div className="flex items-center space-x-2 flex-1">
      <RadioGroupItem value="person" id="person" />
      <Label
        htmlFor="person"
        className="flex items-center gap-2 cursor-pointer font-normal"
      >
        <User className="h-4 w-4" />
        <span>Personne physique</span>
      </Label>
    </div>
    <div className="flex items-center space-x-2 flex-1">
      <RadioGroupItem value="company" id="company" />
      <Label
        htmlFor="company"
        className="flex items-center gap-2 cursor-pointer font-normal"
      >
        <Building2 className="h-4 w-4" />
        <span>Société</span>
      </Label>
    </div>
  </RadioGroup>
</div>
```

### 6. UI Sous-Sélection Société (si contactType === 'company')

**Insérer après le toggle Personne/Société** :

```tsx
{/* Sous-sélection Nouvelle / Existante (si société) */}
{formData.contactType === 'company' && (
  <div className="space-y-3 pb-4 border-b">
    <Label className="text-sm font-medium text-gray-700">
      Mode société
    </Label>
    <RadioGroup
      value={formData.companyMode}
      onValueChange={(value: 'new' | 'existing') => {
        setFormData(prev => ({
          ...prev,
          companyMode: value,
          // Reset fields selon le mode
          ...(value === 'new' ? {
            companyId: null,
          } : {
            companyName: "",
            vatNumber: "",
            street: "",
            streetNumber: "",
            postalCode: "",
            city: "",
            country: "belgique",
          })
        }))
        setErrors({})
      }}
      className="flex gap-4"
    >
      <div className="flex items-center space-x-2 flex-1">
        <RadioGroupItem value="new" id="new" />
        <Label
          htmlFor="new"
          className="cursor-pointer font-normal"
        >
          Nouvelle société
        </Label>
      </div>
      <div className="flex items-center space-x-2 flex-1">
        <RadioGroupItem value="existing" id="existing" />
        <Label
          htmlFor="existing"
          className="cursor-pointer font-normal"
        >
          Société existante
        </Label>
      </div>
    </RadioGroup>
  </div>
)}
```

### 7. Champs Conditionnels

**Après le "Type de contact" dropdown, remplacer les champs firstName/lastName par** :

```tsx
{/* Champs PERSONNE PHYSIQUE */}
{formData.contactType === 'person' && (
  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label htmlFor="firstName">
        Prénom <span className="text-red-500">*</span>
      </Label>
      <Input
        id="firstName"
        value={formData.firstName}
        onChange={(e) => handleInputChange('firstName', e.target.value)}
        onBlur={(e) => handleBlur('firstName', e)}
        placeholder="Jean"
        className={errors.firstName ? 'border-red-500' : ''}
      />
      {errors.firstName && (
        <p className="text-sm text-red-500">{errors.firstName}</p>
      )}
    </div>
    <div className="space-y-2">
      <Label htmlFor="lastName">
        Nom <span className="text-red-500">*</span>
      </Label>
      <Input
        id="lastName"
        value={formData.lastName}
        onChange={(e) => handleInputChange('lastName', e.target.value)}
        onBlur={(e) => handleBlur('lastName', e)}
        placeholder="Dupont"
        className={errors.lastName ? 'border-red-500' : ''}
      />
      {errors.lastName && (
        <p className="text-sm text-red-500">{errors.lastName}</p>
      )}
    </div>
  </div>
)}

{/* Champs SOCIÉTÉ NOUVELLE */}
{formData.contactType === 'company' && formData.companyMode === 'new' && (
  <>
    {/* Nom société + TVA */}
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="companyName">
          Nom de la société <span className="text-red-500">*</span>
        </Label>
        <Input
          id="companyName"
          value={formData.companyName || ""}
          onChange={(e) => handleInputChange('companyName', e.target.value)}
          placeholder="ACME SARL"
          className={errors.companyName ? 'border-red-500' : ''}
        />
        {errors.companyName && (
          <p className="text-sm text-red-500">{errors.companyName}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="vatNumber">
          Numéro de TVA <span className="text-red-500">*</span>
        </Label>
        <Input
          id="vatNumber"
          value={formData.vatNumber || ""}
          onChange={(e) => handleInputChange('vatNumber', e.target.value.toUpperCase())}
          placeholder="BE0123456789"
          className={errors.vatNumber ? 'border-red-500' : ''}
        />
        {errors.vatNumber && (
          <p className="text-sm text-red-500">{errors.vatNumber}</p>
        )}
      </div>
    </div>

    {/* Adresse */}
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2 space-y-2">
        <Label htmlFor="street">
          Rue <span className="text-red-500">*</span>
        </Label>
        <Input
          id="street"
          value={formData.street || ""}
          onChange={(e) => handleInputChange('street', e.target.value)}
          placeholder="Rue de la Paix"
          className={errors.street ? 'border-red-500' : ''}
        />
        {errors.street && (
          <p className="text-sm text-red-500">{errors.street}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="streetNumber">
          N° <span className="text-red-500">*</span>
        </Label>
        <Input
          id="streetNumber"
          value={formData.streetNumber || ""}
          onChange={(e) => handleInputChange('streetNumber', e.target.value)}
          placeholder="42"
          className={errors.streetNumber ? 'border-red-500' : ''}
        />
        {errors.streetNumber && (
          <p className="text-sm text-red-500">{errors.streetNumber}</p>
        )}
      </div>
    </div>

    <div className="grid grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor="postalCode">
          Code postal <span className="text-red-500">*</span>
        </Label>
        <Input
          id="postalCode"
          value={formData.postalCode || ""}
          onChange={(e) => handleInputChange('postalCode', e.target.value)}
          placeholder="1000"
          className={errors.postalCode ? 'border-red-500' : ''}
        />
        {errors.postalCode && (
          <p className="text-sm text-red-500">{errors.postalCode}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">
          Ville <span className="text-red-500">*</span>
        </Label>
        <Input
          id="city"
          value={formData.city || ""}
          onChange={(e) => handleInputChange('city', e.target.value)}
          placeholder="Bruxelles"
          className={errors.city ? 'border-red-500' : ''}
        />
        {errors.city && (
          <p className="text-sm text-red-500">{errors.city}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="country">
          Pays <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.country || "belgique"}
          onValueChange={(value) => handleInputChange('country', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="belgique">Belgique</SelectItem>
            <SelectItem value="france">France</SelectItem>
            <SelectItem value="allemagne">Allemagne</SelectItem>
            <SelectItem value="pays-bas">Pays-Bas</SelectItem>
            <SelectItem value="suisse">Suisse</SelectItem>
            <SelectItem value="luxembourg">Luxembourg</SelectItem>
            <SelectItem value="autre">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    {/* Interlocuteur (optionnel pour nouvelle société) */}
    <div className="pt-4 border-t">
      <Label className="text-sm font-medium text-gray-700 mb-3 block">
        Interlocuteur (optionnel)
      </Label>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder="Jean"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder="Dupont"
          />
        </div>
      </div>
    </div>
  </>
)}

{/* Champs SOCIÉTÉ EXISTANTE */}
{formData.contactType === 'company' && formData.companyMode === 'existing' && (
  <>
    {/* Sélecteur société */}
    <div className="space-y-2">
      <Label htmlFor="companyId">
        Société <span className="text-red-500">*</span>
      </Label>
      <CompanySelector
        teamId={teamId}
        value={formData.companyId}
        onChange={(companyId) => handleInputChange('companyId', companyId)}
      />
      {errors.companyId && (
        <p className="text-sm text-red-500">{errors.companyId}</p>
      )}
    </div>

    {/* Interlocuteur (REQUIS pour société existante) */}
    <div className="pt-4 border-t">
      <Label className="text-sm font-medium text-gray-700 mb-3 block">
        Interlocuteur <span className="text-red-500">*</span>
      </Label>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">
            Prénom <span className="text-red-500">*</span>
          </Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            placeholder="Jean"
            className={errors.firstName ? 'border-red-500' : ''}
          />
          {errors.firstName && (
            <p className="text-sm text-red-500">{errors.firstName}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">
            Nom <span className="text-red-500">*</span>
          </Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            placeholder="Dupont"
            className={errors.lastName ? 'border-red-500' : ''}
          />
          {errors.lastName && (
            <p className="text-sm text-red-500">{errors.lastName}</p>
          )}
        </div>
      </div>
    </div>
  </>
)}
```

### 8. Adapter handleSubmit (ligne ~240)

**Ajouter avant l'appel à onSubmit** :

```typescript
// Préparer le payload selon le type de contact
let contactPayload

if (formData.contactType === 'person') {
  // Personne physique (inchangé)
  contactPayload = {
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
    email: formData.email.trim().toLowerCase(),
    phone: formData.phone.trim(),
    type: formData.type,
    speciality: formData.type === "provider" ? formData.speciality : undefined,
    notes: formData.notes.trim(),
    inviteToApp: formData.inviteToApp
  }
} else if (formData.contactType === 'company') {
  if (formData.companyMode === 'new') {
    // Nouvelle société
    contactPayload = {
      contactType: 'company',
      companyMode: 'new',
      companyData: {
        name: formData.companyName!.trim(),
        vat_number: formData.vatNumber!.trim().toUpperCase(),
        street: formData.street!.trim(),
        street_number: formData.streetNumber!.trim(),
        postal_code: formData.postalCode!.trim(),
        city: formData.city!.trim(),
        country: formData.country || 'belgique',
      },
      firstName: formData.firstName.trim() || undefined,
      lastName: formData.lastName.trim() || undefined,
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      type: formData.type,
      notes: formData.notes.trim(),
      inviteToApp: formData.inviteToApp
    }
  } else {
    // Société existante
    contactPayload = {
      contactType: 'company',
      companyMode: 'existing',
      companyId: formData.companyId!,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      type: formData.type,
      notes: formData.notes.trim(),
      inviteToApp: formData.inviteToApp
    }
  }
}

await onSubmit(contactPayload)
```

---

## ✅ Checklist d'Implémentation

- [ ] Ajouter imports (RadioGroup, RadioGroupItem)
- [ ] Étendre interface ContactFormData
- [ ] Adapter état initial formData
- [ ] Créer fonction validateFormData()
- [ ] Ajouter UI toggle Personne/Société
- [ ] Ajouter UI sous-sélection Nouvelle/Existante
- [ ] Ajouter champs conditionnels personne
- [ ] Ajouter champs conditionnels société nouvelle
- [ ] Ajouter champs conditionnels société existante
- [ ] Créer CompanySelector component
- [ ] Adapter handleSubmit avec 3 cas
- [ ] Tester validation
- [ ] Tester soumission

---

## 🎯 Prochaine Étape

Créer le composant `CompanySelector` pour lister les sociétés existantes.

**Fichier** : `components/ui/company-selector.tsx`
