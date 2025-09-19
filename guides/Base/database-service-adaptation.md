# Adaptation database-service.ts - Suivi des Modifications

## ✅ Modifications Terminées

### buildingService
- [x] `getAll()` - Adapté pour `building_contacts`
- [x] `getTeamBuildings()` - Adapté pour `building_contacts`
- [x] `getUserBuildings()` - Adapté pour `building_contacts`
- [x] `getById()` - Adapté pour `building_contacts` et `lot_contacts`

### interventionService
- [x] `getInterventionsWithDocumentsByBuildingId()` - Adapté pour `intervention_contacts`
- [x] `getInterventionsWithDocumentsByLotId()` - Adapté pour `intervention_contacts`

### contactService (partiellement adapté)
- [x] `getAll()` - Adapté pour table `users`
- [x] `getById()` - Adapté pour table `users`  
- [x] `getBySpeciality()` - Adapté pour table `users`
- [x] `getTeamContacts()` - En cours d'adaptation

## ❌ À Adapter

### contactService (reste)
- [ ] Finir `getTeamContacts()` 
- [ ] `getLotContacts()` - À adapter pour `lot_contacts` → `users`
- [ ] `getLotContactsLegacy()` - À adapter 
- [ ] `create()` - Créer dans `users` au lieu de `contacts`
- [ ] `update()` - Modifier `users` au lieu de `contacts`
- [ ] `delete()` - Supprimer de `users`
- [ ] `findOrCreate()` - Adapter pour `users`

### Autres services
- [ ] `statsService.getManagerStats()` - Vérifier les requêtes
- [ ] `lotService` - Adapter les références `tenant_id`
- [ ] Toutes les fonctions qui utilisent encore `assigned_contact_id`

## 🔍 Recherches à faire
```bash
# Chercher toutes les références restantes à :
grep -r "contacts" lib/database-service.ts
grep -r "manager_id" lib/database-service.ts  
grep -r "tenant_id" lib/database-service.ts
grep -r "assigned_contact_id" lib/database-service.ts
```

## ⚠️ Problèmes Potentiels
- References à `contact_type` dans `building_contacts`/`lot_contacts` vs `users`
- Post-traitement pour extraire les relations principales
- Compatibilité avec les composants UI existants
