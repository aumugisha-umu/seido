# Guide de débogage : Email non reçu par le locataire

## 🔍 Problème

Lors de la création d'une intervention par un gestionnaire :
- ✅ 2 prestataires ont reçu leur email
- ❌ 1 locataire n'a PAS reçu son email
- ✅ Le gestionnaire créateur n'a pas reçu d'email (comportement attendu)

## 📋 Checklist de diagnostic

### 1. Vérifier les logs serveur

Cherchez dans les logs serveur (console) les entrées suivantes :

#### A. Vérifier que le locataire est dans la liste des recipients déterminés

```
✅ [EMAIL-NOTIFICATION] Recipients determined
```

**Ce que vous devez voir :**
```json
{
  "interventionId": "...",
  "recipientCount": 3,
  "assignedTenants": 1,
  "assignedTenantIds": ["<LOCATAIRE_USER_ID>"]
}
```

**Si `assignedTenants: 0` ou `assignedTenantIds: []`** :
→ Le locataire n'est pas dans `intervention_assignments` avec `role='locataire'`

#### B. Vérifier que le locataire a un email valide

```
✅ [EMAIL-NOTIFICATION] Recipients filtered by email
```

**Ce que vous devez voir :**
```json
{
  "recipientsWithEmail": 3,
  "recipientsWithoutEmail": 0,
  "recipientsByRole": {
    "prestataire": 2,
    "locataire": 1
  }
}
```

**Si `recipientsWithoutEmail > 0`** :
→ Vérifiez la section `recipientsWithoutEmailDetails` pour voir quel locataire n'a pas d'email

#### C. Vérifier l'envoi de l'email au locataire

```
📧 [EMAIL-NOTIFICATION] Sending email to recipient
```

**Ce que vous devez voir :**
```json
{
  "recipientId": "<LOCATAIRE_USER_ID>",
  "recipientEmail": "locataire@example.com",
  "recipientRole": "locataire",
  "subject": "🏠 Intervention prévue ..."
}
```

**Puis soit :**
```
✅ [EMAIL-NOTIFICATION] Email sent successfully to recipient
```

**Ou :**
```
❌ [EMAIL-NOTIFICATION] Error sending email to recipient
```

### 2. Vérifier dans la base de données

Utilisez le script SQL fourni : `scripts/diagnose-email-issue.sql`

#### A. Vérifier les assignments

```sql
SELECT 
  ia.*,
  u.email,
  u.name,
  u.role
FROM intervention_assignments ia
JOIN users u ON u.id = ia.user_id
WHERE ia.intervention_id = '<INTERVENTION_ID>'
  AND ia.role = 'locataire';
```

**Points à vérifier :**
- ✅ Le locataire apparaît dans les résultats
- ✅ `ia.role = 'locataire'`
- ✅ `u.email` n'est pas NULL et n'est pas vide

#### B. Vérifier l'email du locataire

```sql
SELECT 
  id,
  email,
  name,
  role,
  CASE 
    WHEN email IS NULL THEN '❌ PAS D''EMAIL'
    WHEN email = '' THEN '❌ EMAIL VIDE'
    WHEN email NOT LIKE '%@%' THEN '❌ EMAIL INVALIDE'
    ELSE '✅ EMAIL VALIDE'
  END as email_status
FROM users
WHERE id = '<LOCATAIRE_USER_ID>';
```

### 3. Causes possibles et solutions

#### ❌ Cause 1 : Le locataire n'est pas assigné à l'intervention

**Symptôme :**
- `assignedTenants: 0` dans les logs
- Aucun résultat dans la requête SQL des assignments

**Solution :**
Vérifiez que l'assignment du locataire a bien été créé lors de la création de l'intervention. Dans `create-manager-intervention`, les locataires sont auto-assignés depuis les contrats actifs (lignes 529-569).

**Vérification :**
```sql
-- Vérifier les contrats actifs pour le lot
SELECT * FROM contracts 
WHERE lot_id = '<LOT_ID>' 
  AND status = 'actif';
```

#### ❌ Cause 2 : Le locataire n'a pas d'email

**Symptôme :**
- `recipientsWithoutEmail > 0` dans les logs
- Le locataire apparaît dans `recipientsWithoutEmailDetails`

**Solution :**
Ajoutez un email valide au locataire dans la table `users` :
```sql
UPDATE users 
SET email = 'locataire@example.com' 
WHERE id = '<LOCATAIRE_USER_ID>';
```

#### ❌ Cause 3 : Le rôle du locataire n'est pas 'locataire'

**Symptôme :**
- Le locataire apparaît dans les recipients mais le switch case ne correspond pas
- L'email utilise le template gestionnaire au lieu du template locataire

**Solution :**
Vérifiez que le rôle dans la table `users` est bien `'locataire'` :
```sql
SELECT id, email, role FROM users WHERE id = '<LOCATAIRE_USER_ID>';
```

#### ❌ Cause 4 : Erreur lors de l'envoi de l'email

**Symptôme :**
- Log `❌ [EMAIL-NOTIFICATION] Error sending email to recipient`
- Erreur dans `result.error`

**Solution :**
Vérifiez :
1. La configuration Resend (clé API valide)
2. Les logs d'erreur détaillés dans la console
3. Les limites de taux de Resend

#### ❌ Cause 5 : Le locataire est le créateur de l'intervention

**Symptôme :**
- Le locataire est exclu par `excludeUserId` dans `determineInterventionRecipients`

**Solution :**
C'est le comportement attendu. Le créateur ne reçoit pas d'email. Si le gestionnaire a créé l'intervention, le locataire devrait quand même recevoir l'email.

## 🔧 Améliorations apportées

### Logs améliorés

Les logs suivants ont été ajoutés pour faciliter le diagnostic :

1. **Logs détaillés des recipients déterminés** :
   - Nombre de locataires assignés
   - IDs des locataires assignés

2. **Logs détaillés du filtrage par email** :
   - Comptage par rôle
   - Détails des utilisateurs sans email

3. **Logs individuels pour chaque email envoyé** :
   - Avant l'envoi : recipientId, email, rôle, subject
   - Après l'envoi : succès ou erreur avec détails

### Script SQL de diagnostic

Un script SQL complet est disponible dans `scripts/diagnose-email-issue.sql` pour :
- Vérifier les assignments
- Vérifier les emails des utilisateurs
- Lister tous les recipients attendus
- Identifier les problèmes potentiels

## 📝 Prochaines étapes

1. **Exécutez le script SQL** avec l'ID de l'intervention concernée
2. **Vérifiez les logs serveur** pour les entrées `[EMAIL-NOTIFICATION]`
3. **Identifiez la cause** en utilisant la checklist ci-dessus
4. **Appliquez la solution** correspondante

## 🔗 Fichiers concernés

- `lib/services/domain/email-notification.service.ts` - Service d'envoi d'emails
- `lib/services/domain/notification-helpers.ts` - Logique de détermination des recipients
- `lib/services/repositories/notification-repository.ts` - Récupération des données d'intervention
- `app/api/create-manager-intervention/route.ts` - Création d'intervention par gestionnaire


