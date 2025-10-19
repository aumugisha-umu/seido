# 🧪 Guide de Test : Bouton "Accepter" Time Slot

Ce guide vous aide à tester et diagnostiquer le problème du bouton "Accepter" qui ne répond pas.

## 🎯 Objectif

Identifier pourquoi le bouton "Accepter" ne fonctionne pas et vérifier que les corrections apportées résolvent le problème.

---

## 📋 Prérequis

1. **Navigateur** : Ouvrir Chrome/Edge avec DevTools (F12)
2. **Onglet Console** : Ouvrir l'onglet Console des DevTools
3. **Utilisateur** : Connecté en tant que Prestataire
4. **Intervention** : Une intervention avec un time slot créé par le gestionnaire

---

## 🔍 Test 1 : Vérifier les Logs du Chargement

### Étape 1 : Ouvrir la page de l'intervention

1. Se connecter en tant que Prestataire
2. Naviguer vers l'intervention concernée
3. Aller sur l'onglet "Exécution"

### Étape 2 : Vérifier dans la Console

Cherchez les logs suivants :

```javascript
🔍 [ExecutionTab] Button rendering logic: {
  slotId: "...",
  currentUserId: "...",
  userResponse: { ... } ou null,
  isProposer: false,
  canSelectSlot: true,
  slotStatus: "requested" ou "pending",
  hasResponses: true/false,
  responsesCount: N
}
```

### ✅ Diagnostic

| Situation | Diagnostic | Action |
|-----------|-----------|--------|
| `userResponse = null` | ❌ Response pas créée proactivement | Continuer au Test 2 |
| `userResponse = { response: "pending" }` | ✅ Response existe | Bouton "Accepter ce créneau" doit être visible |
| `userResponse = { response: "accepted" }` | ✅ Déjà accepté | Affiche "Vous avez accepté ce créneau" |
| `hasResponses = false` | ⚠️ Aucune response chargée | Vérifier le chargement des données |

---

## 🔍 Test 2 : Cliquer sur "Accepter"

### Étape 1 : Ouvrir la Console et cliquer

1. Console DevTools ouverte
2. Cliquer sur le bouton "Accepter"
3. Observer les logs en temps réel

### Étape 2 : Logs attendus (Succès)

```javascript
🔵 [ExecutionTab] Accept slot clicked: {
  slotId: "...",
  interventionId: "...",
  currentUserId: "...",
  userRole: "prestataire",
  timestamp: "..."
}

🔵 [ExecutionTab] Calling acceptTimeSlotAction...

✅ [SERVER-ACTION] Accepting time slot: { ... }
✅ Permission verified: {
  hasTeamMembership: false,
  hasAssignment: true,
  assignmentRole: "prestataire"
}
📊 Existing response: {
  exists: true,
  currentStatus: "pending",
  willUpdate: true
}
✅ Response upserted successfully: { ... }
📊 Summary columns after upsert: {
  selected_by_manager: false,
  selected_by_provider: true,  ← DOIT PASSER À TRUE
  selected_by_tenant: false,
  userRole: "prestataire"
}
✅ [SERVER-ACTION] Time slot accepted successfully

🔵 [ExecutionTab] acceptTimeSlotAction result: {
  success: true,
  error: undefined,
  data: undefined
}

✅ [ExecutionTab] Slot accepted successfully, reloading page...
```

### Étape 3 : Après le reload

- ✅ Le bouton "Accepter" a disparu
- ✅ Affiche "Vous avez accepté ce créneau" (fond vert)
- ✅ Badge "Prêt à finaliser" si locataire a aussi accepté

---

## ❌ Test 3 : Identifier les Erreurs

### Erreur 1 : Permission Refusée

```javascript
❌ [ExecutionTab] Failed to accept slot:
   "Vous n'êtes pas autorisé à accepter ce créneau. Vous devez être assigné à cette intervention."

⚠️ User not authorized to accept this time slot: {
  userId: "...",
  interventionId: "...",
  hasTeamMembership: false,
  hasAssignment: false  ← PROBLÈME ICI
}
```

**Cause** : Le prestataire n'est pas dans `intervention_assignments`

**Solution** : Vérifier dans Supabase :
```sql
SELECT * FROM intervention_assignments
WHERE intervention_id = 'intervention-uuid'
AND user_id = 'prestataire-uuid';
```

Si aucun résultat → Le prestataire n'est pas assigné à l'intervention.

---

### Erreur 2 : RLS Policy Bloque l'INSERT

```javascript
❌ Error creating/updating response: {
  code: "42501",  ← Code d'erreur PostgreSQL pour permission denied
  message: "new row violates row-level security policy",
  ...
}
```

**Cause** : La RLS policy `time_slot_responses_insert` bloque l'insertion

**Solution** : Exécuter le script de diagnostic SQL :
```bash
# Ouvrir tools/diagnostic-timeslot-responses.sql
# Remplacer les variables :intervention_id, :slot_id, :user_id
# Exécuter dans Supabase SQL Editor
# Vérifier Section 6 : TEST DE PERMISSION INSERT
```

Si `has_permission = false` → Le prestataire n'a pas les droits d'insérer une response.

---

### Erreur 3 : Response Existe mais Trigger Ne Met Pas à Jour

```javascript
✅ Response upserted successfully: { ... }

📊 Summary columns after upsert: {
  selected_by_manager: false,
  selected_by_provider: false,  ← DEVRAIT ÊTRE TRUE
  selected_by_tenant: false,
  userRole: "prestataire"
}
```

**Cause** : Le trigger `update_time_slot_validation_summary` ne fonctionne pas

**Solution** : Vérifier dans Supabase :
```sql
-- Vérifier que le trigger est actif
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid = 'time_slot_responses'::regclass
AND tgname = 'update_validation_summary_on_response';

-- tgenabled doit être 'O' (Enabled)
-- Si 'D' (Disabled), réactiver :
ALTER TABLE time_slot_responses
ENABLE TRIGGER update_validation_summary_on_response;
```

---

## 🔧 Outils de Diagnostic Avancés

### 1. Script SQL de Diagnostic Complet

Fichier : `tools/diagnostic-timeslot-responses.sql`

**Usage** :
1. Ouvrir Supabase SQL Editor
2. Copier le contenu du fichier
3. Remplacer les variables :
   ```sql
   -- REMPLACER CES VALEURS :
   \set intervention_id 'uuid-de-intervention'
   \set slot_id 'uuid-du-slot'
   \set user_id 'uuid-du-prestataire'
   ```
4. Exécuter le script complet
5. Analyser les 9 sections de résultats

**Sections Clés** :
- **Section 1** : Vérifier que le prestataire est assigné
- **Section 3** : Vérifier si sa response existe
- **Section 6** : Vérifier ses permissions d'insertion
- **Section 7** : Identifier les responses manquantes
- **Section 9** : Vérifier les colonnes `selected_by_*`

---

### 2. Logging Détaillé Serveur

Les logs serveur (via `logger.info/error`) s'affichent dans :
- **Local Dev** : Terminal où `npm run dev` tourne
- **Production** : Logs Vercel / Platform logs

Chercher les emojis :
- `✅` : Succès
- `❌` : Erreur
- `⚠️` : Avertissement
- `🔍` : Étape de diagnostic
- `📊` : Données intermédiaires

---

## 🐛 Scénarios de Bugs Connus

### Scénario A : Prestataire Assigné Après Création du Slot

**Symptôme** :
- `userResponse = null` dans les logs
- Aucune response dans la base de données

**Cause** :
Le trigger `create_responses_for_new_timeslot()` s'exécute au moment de la création du slot et créé des responses uniquement pour les utilisateurs déjà présents dans `intervention_assignments` à ce moment-là.

**Workflow problématique** :
1. Gestionnaire créé une intervention
2. Gestionnaire créé un time slot
3. → Trigger créé responses pour tous les assignés (locataire, gestionnaire)
4. Gestionnaire assigne un prestataire APRÈS
5. → Le prestataire n'a pas de response créée automatiquement
6. Prestataire clique sur "Accepter"
7. → L'UPSERT essaie de créer une nouvelle response
8. → Si RLS policy stricte, l'INSERT échoue

**Solution Appliquée** :
La nouvelle version de `acceptTimeSlotAction` vérifie explicitement l'assignment avant l'upsert, ce qui garantit que l'utilisateur a bien les permissions nécessaires.

---

### Scénario B : Trigger de Mise à Jour Désactivé

**Symptôme** :
- L'upsert réussit
- Mais `selected_by_provider` reste à `false`
- Le bouton "Accepter" reste visible après reload

**Cause** :
Le trigger `update_validation_summary_on_response` est désactivé ou a une erreur.

**Vérification** :
```sql
SELECT tgname, tgenabled, tgisinternal
FROM pg_trigger
WHERE tgrelid = 'time_slot_responses'::regclass;
```

**Solution** :
```sql
-- Réactiver le trigger
ALTER TABLE time_slot_responses
ENABLE TRIGGER update_validation_summary_on_response;

-- Tester manuellement
UPDATE time_slot_responses
SET response = 'accepted'
WHERE id = 'response-uuid';

-- Vérifier que selected_by_* a changé
SELECT selected_by_provider
FROM intervention_time_slots
WHERE id = 'slot-uuid';
```

---

## 📞 Support

Si le problème persiste après ces tests :

1. **Exporter les logs Console** (clic droit → Save as...)
2. **Exécuter le script SQL de diagnostic**
3. **Capturer un screenshot de l'interface**
4. **Noter** :
   - ID de l'intervention
   - ID du slot
   - ID de l'utilisateur (prestataire)
   - Logs de la console
   - Résultats du script SQL

---

## ✅ Checklist de Validation Finale

Après corrections, valider que :

- [ ] Le bouton "Accepter" est visible pour le prestataire
- [ ] Cliquer sur "Accepter" affiche les logs détaillés en console
- [ ] Le toast "Créneau accepté" apparaît
- [ ] La page se recharge automatiquement
- [ ] Après reload, le bouton "Accepter" a disparu
- [ ] Affiche "Vous avez accepté ce créneau" (fond vert)
- [ ] Dans Supabase, `selected_by_provider = true`
- [ ] Si locataire a aussi accepté, le badge "Prêt à finaliser" s'affiche

---

**Dernière mise à jour** : 2025-10-19
**Version** : 1.0
