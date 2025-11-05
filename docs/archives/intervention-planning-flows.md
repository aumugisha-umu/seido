# 📅 Flows de Planification des Interventions

> **Date**: 2025-10-18
> **Statut**: ✅ Production
> **Auteur**: Claude Code

## Vue d'ensemble

L'application SEIDO implémente **deux flows de planification complémentaires** pour gérer la coordination des interventions entre gestionnaires, locataires et prestataires.

---

## 🎯 Flow 1: Planification Initiée par le Gestionnaire (Nouveau - 2025-10-18)

**Route API**: `/api/intervention-schedule`
**Rôle requis**: `gestionnaire` uniquement
**Statut intervention**: `approuvee` → `planification`

### Scénarios disponibles

#### 1. **Fixer le rendez-vous** (`planningType: "direct"`)
Le gestionnaire propose **un rendez-vous unique** aux participants.

```typescript
{
  planningType: "direct",
  directSchedule: {
    date: "2025-10-20",
    startTime: "14:00",
    endTime: "14:00" // Pas de fin pour un rendez-vous
  }
}
```

**Comportement**:
- Crée **1 seul time_slot** dans `intervention_time_slots`
- `is_selected: false` (en attente de confirmation)
- `proposed_by: gestionnaire_user_id`
- Envoie notification au locataire et prestataire
- Intervention reste en statut `planification`

---

#### 2. **Proposer des créneaux** (`planningType: "propose"`)
Le gestionnaire propose **plusieurs créneaux** parmi lesquels les participants peuvent choisir.

```typescript
{
  planningType: "propose",
  proposedSlots: [
    { date: "2025-10-20", startTime: "09:00", endTime: "11:00" },
    { date: "2025-10-21", startTime: "14:00", endTime: "16:00" },
    { date: "2025-10-22", startTime: "10:00", endTime: "12:00" }
  ]
}
```

**Comportement**:
- Crée **N time_slots** dans `intervention_time_slots`
- Chaque slot: `is_selected: false`, `proposed_by: gestionnaire_user_id`
- Les participants peuvent ensuite confirmer un créneau
- Intervention reste en statut `planification`

---

#### 3. **Laisser s'organiser** (`planningType: "organize"`)
Le gestionnaire active le **mode autonome** où locataire et prestataire se coordonnent directement.

```typescript
{
  planningType: "organize"
}
```

**Comportement**:
- Aucun time_slot créé par le gestionnaire
- Notification envoyée aux participants
- Locataire et prestataire peuvent ajouter leurs disponibilités via Flow 2
- Intervention reste en statut `planification`

---

## 📋 Flow 2: Gestion des Disponibilités (Existant)

**Routes API multiples**:
- `/api/intervention/[id]/user-availability` - Ajouter disponibilités (locataire/prestataire)
- `/api/intervention/[id]/tenant-availability` - Disponibilités spécifiques locataire
- `/api/intervention/[id]/availability-response` - Réponse à une disponibilité proposée
- `/api/intervention/[id]/match-availabilities` - Matching automatique
- `/api/intervention/[id]/select-slot` - Sélection finale d'un créneau

**Rôles autorisés**: `locataire`, `prestataire`, `gestionnaire`
**Statut intervention**: `planification` → `planifiee` (après confirmation)

### Utilisation

Ce flow est utilisé **en complément du Flow 1**, notamment:
- Quand le gestionnaire choisit "Laisser s'organiser" (scenario 3)
- Quand les participants veulent proposer des contre-propositions
- Pour le matching automatique des disponibilités

**Composants associés**:
- `TenantAvailabilityInput` (locataire ajoute ses disponibilités)
- `ProviderAvailabilitySelection` (prestataire sélectionne/ajoute)
- `ProviderAvailabilityModal` (modal de gestion prestataire)

**Hooks**:
- `use-availability-management.ts`

---

## 🔄 Workflow Complet

```
┌─────────────────────────────────────────────────────┐
│  Intervention approuvée (status: 'approuvee')       │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Gestionnaire choisit le mode de planification      │
│  ├─ Fixer le rendez-vous (Flow 1 - direct)          │
│  ├─ Proposer des créneaux (Flow 1 - propose)        │
│  └─ Laisser s'organiser (Flow 1 - organize)         │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Intervention en planification (status: 'planif.')  │
│                                                      │
│  Si mode "organize" ou besoin de coordination:      │
│  ├─ Locataire ajoute disponibilités (Flow 2)        │
│  ├─ Prestataire ajoute disponibilités (Flow 2)      │
│  └─ Matching automatique (Flow 2)                   │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Confirmation du créneau (Flow 2 - select-slot)     │
│  ├─ is_selected: true sur le time_slot choisi       │
│  └─ scheduled_date, scheduled_start_time mis à jour │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Intervention planifiée (status: 'planifiee')       │
└─────────────────────────────────────────────────────┘
```

---

## 🔒 Permissions et Rôles

### API `/api/intervention-schedule` (Flow 1)
```typescript
// Vérification stricte
if (user.role !== 'gestionnaire') {
  return 403 // Seuls les gestionnaires peuvent initier
}
```

**Logs de debug disponibles**:
- `authUserId`, `userId`, `userRole`, `userEmail`, `userName`
- Log d'erreur si rôle incorrect

### APIs de disponibilités (Flow 2)
Permissions variables selon l'endpoint:
- `user-availability`: locataire, prestataire, gestionnaire
- `tenant-availability`: locataire (+ gestionnaire en lecture)
- `select-slot`: tous les participants autorisés

---

## 🐛 Debugging

### Erreur "Seuls les gestionnaires peuvent planifier"

**Cause**: L'utilisateur actuel n'a pas `role = 'gestionnaire'` dans la table `users`.

**Vérifications**:
1. Consulter les logs serveur pour voir le rôle récupéré:
   ```
   🔍 DEBUG: User retrieved from database
   {
     authUserId: "...",
     userId: "...",
     userRole: "prestataire", // ← Le problème
     userEmail: "...",
     userName: "..."
   }
   ```

2. Vérifier en BDD:
   ```sql
   SELECT id, email, role, name
   FROM users
   WHERE auth_user_id = 'votre-auth-user-id';
   ```

3. Corriger le rôle si nécessaire:
   ```sql
   UPDATE users
   SET role = 'gestionnaire'
   WHERE id = 'user-id';
   ```

---

## 📝 Notes Techniques

### Table `intervention_time_slots`

Champs clés:
- `intervention_id`: FK vers `interventions`
- `slot_date`: Date du créneau
- `start_time`: Heure de début
- `end_time`: Heure de fin (ou identique à `start_time` pour un rendez-vous)
- `is_selected`: `false` jusqu'à confirmation
- `proposed_by`: UUID du user qui a proposé ce slot (gestionnaire ou autre)

### Transition de statut

Les interventions ne passent à `'planifiee'` qu'après:
1. Au moins 1 time_slot avec `is_selected = true`
2. Appel à `/api/intervention/[id]/select-slot` (Flow 2)
3. Mise à jour de `scheduled_date` et `scheduled_start_time` sur l'intervention

---

## 🔮 Évolutions Futures

- [ ] Permettre au prestataire de proposer des créneaux dans le Flow 1 (mode organize)
- [ ] Notifications en temps réel pour les changements de créneaux
- [ ] Intégration calendrier externe (Google Calendar, Outlook)
- [ ] Gestion des créneaux récurrents

---

**Dernière mise à jour**: 2025-10-18
**Validé par**: Tests E2E + Tests manuels gestionnaire
