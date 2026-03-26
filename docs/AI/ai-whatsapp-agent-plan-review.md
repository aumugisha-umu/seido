# Analyse du plan AI WhatsApp Agent — Revue technique

**Date** : 20 mars 2026  
**Document analysé** : `ai-whatsapp-agent-plan.md` (v2.0)  
**Contexte** : Audit indépendant du plan avant implémentation

---

## Synthèse

Le plan est **globalement solide et bien structuré**. L’architecture (Claude API directe, Meta Cloud API, sessions en DB) est cohérente avec l’existant SEIDO (ElevenLabs, interventions).  
Néanmoins, plusieurs **bugs techniques**, **incohérences** et **points d’attention** ont été identifiés. Les corrections sont ciblées et ne remettent pas en cause la conception générale.

---

## 1. Points validés

### 1.1 Architecture et stack

- **Claude API directe** : choix pertinent (coût, contrôle du prompt, multimodal).
- **Meta Cloud API** : approche standard, messages service gratuits.
- **Sessions en DB** : adapté aux flux asynchrones WhatsApp, cohérent avec Supabase existant.
- **Twilio pour les numéros (Mode A)** : API simple, bundle réglementaire Belgique documenté.
- **`after()` pour le traitement async** : aligné avec le pattern ElevenLabs (AGENTS.md Learning #107).

### 1.2 Webhook Meta

- **Vérification GET** : `hub.mode`, `hub.verify_token`, `hub.challenge` conformes à la doc Meta.
- **HMAC-SHA256** : bonne pratique de sécurité.
- **Signature X-Hub-Signature-256** : correspond à la doc Meta.

### 1.3 API Meta

- **Mark as read** : structure `POST /{phone_id}/messages` avec `messaging_product`, `status: "read"`, `message_id` correcte (doc Meta Nov 2025).
- **Numéro destinataire** : Meta attend le numéro sans `+` (ex. `32498123456`), à normaliser côté SEIDO.

### 1.4 Modèle de données

- Tables `ai_whatsapp_numbers`, `ai_whatsapp_sessions`, `ai_whatsapp_usage` bien dimensionnées.
- Contrainte `UNIQUE(team_id)` sur `ai_whatsapp_numbers` cohérente avec “1 numéro par équipe”.
- Index partiel pour session active pertinente.

### 1.5 Intégration SEIDO

- Colonne `source` sur `interventions` existe déjà (`web`, `phone_ai`) — `whatsapp_ai` est un nouvel enum à ajouter.
- Contrainte `valid_intervention_location` assouplie : `building_id` et `lot_id` peuvent être NULL (AGENTS.md Learning #128).
- Pattern ElevenLabs : `interventionRepo.create()` + `skipInitialSelect`, `source: 'phone_ai'` — à reproduire pour `whatsapp_ai`.

---

## 2. Bugs et corrections requises

### 2.1 Déduplication des messages — logique incorrecte (CRITIQUE)

**Lignes 917–924 du plan :**

```typescript
const { data: existing } = await supabase
  .from('ai_whatsapp_sessions')
  .select('id')
  .contains('messages', [{ wamid: message.id }])
  .limit(1)
```

**Problème** : La colonne `messages` stocke `[{role, content, timestamp, media_type}]`. Il n’y a **pas de champ `wamid`** dans ces objets. La requête `.contains('messages', [{ wamid: message.id }])` ne matchera jamais.

**Correction** : Introduire un champ dédié pour l’idempotence, par exemple :

- soit une colonne `processed_message_ids JSONB DEFAULT '[]'` dans `ai_whatsapp_sessions`,
- soit une table `ai_whatsapp_processed_messages (session_id, wamid) UNIQUE`,

et vérifier `message.id` (wamid) dedans avant tout traitement.

---

### 2.2 Numéro Meta `to` — format à normaliser

**Problème** : Meta attend un numéro sans préfixe `+` (ex. `32498123456`). Si `contactPhone` arrive en `+32498123456`, l’API peut échouer ou mal router.

**Correction** : avant l’envoi, normaliser :

```typescript
const to = contactPhone.replace(/\D/g, '')  // Supprimer tout sauf chiffres
```

---

### 2.3 Création d’intervention — champs obligatoires manquants (CRITIQUE)

**Lignes 1021–1035 du plan :**

```typescript
await supabase.from('interventions').insert({
  team_id: session.team_id,
  title: `[WhatsApp AI] ${session.extracted_data.problem_description?.substring(0, 80)}`,
  description: buildInterventionDescription(session),
  status: 'demande',
  source: 'whatsapp_ai',
  reported_by: identifiedUser?.id || null,
  // lot_id: auto-detect si possible via adresse
})
```

**Problèmes** :

1. **`reference`** : colonne obligatoire (NOT NULL ou non nullable en pratique). Le plan ne la fournit pas. Le flow ElevenLabs et `create-intervention` utilisent un format du type `INT-YYMMDDHHmmss-XXX`.
2. **`type`** : requis par le schéma (enum `intervention_type`). Valeur par défaut recommandée : `'autre'` ou une catégorie dérivée de `extracted_data`.
3. **Pas d’usage du repository** : le plan fait un `insert` direct au lieu d’utiliser `InterventionRepository` + service role, ce qui contourne la génération de référence et les validations.

**Correction** : S’aligner sur le flow ElevenLabs :

- Utiliser `interventionRepo.create()` avec `createServiceRoleSupabaseClient()`.
- Générer une référence (`generateReference()` ou équivalent).
- Inclure `reference`, `type` (ex. `'autre'`), et les mêmes champs que pour `phone_ai`.
- Utiliser `skipInitialSelect: true` si la suite du flux n’a pas besoin de l’intervention complète immédiatement.

---

### 2.4 AI SDK — format de la sortie structurée

**Lignes 607–619 du plan :**

```typescript
output: Output.object({
  schema: z.object({
    text: z.string()...,
    conversation_complete: z.boolean()...,
    extracted_data: z.object({...}).optional()
  })
})
```

**Point d’attention** : En AI SDK 6, le schéma est imbriqué sous une clé. L’accès se fait généralement via `result.output` ou une structure imbriquée selon la config. Vérifier la doc actuelle de `generateText` + `Output.object` pour accéder à `text`, `conversation_complete`, `extracted_data` (et non à un objet global sans clé).

---

### 2.5 RLS — support multi-profil

**Lignes 810–822 du plan :**

```sql
CREATE POLICY "team_read" ON ai_whatsapp_numbers FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM team_members WHERE user_id = get_current_user_id()
  ));
```

**Problème** : `get_current_user_id()` renvoie un seul profil. Pour les utilisateurs multi-profils (plusieurs équipes), certaines équipes peuvent être invisibles (AGENTS.md Learning #003, #086).

**Correction** : Utiliser `get_my_profile_ids()` comme dans les migrations récentes (ex. `20260319100000`) :

```sql
WHERE user_id IN (SELECT get_my_profile_ids())
```

(En adaptant la sous-requête selon la structure exacte des policies.)

---

### 2.6 `markAsRead` — endpoint correct, paramètre manquant

Le plan utilise le bon endpoint : `POST /{phone_number_id}/messages` avec `status: "read"` et `message_id`. La doc Meta indique toutefois qu’il peut être nécessaire de passer le `message_id` complet (ex. `wamid.xxx`). S’assurer que `message.id` du payload webhook est bien transmis tel quel.

---

## 3. Incohérences et clarifications

### 3.1 `phone_number_id` vs `whatsapp_phone_number_id`

Le plan utilise :

- `phone_number_id` dans le schéma TypeScript (session, etc.) comme FK vers `ai_whatsapp_numbers`,
- `whatsapp_phone_number_id` comme ID Meta dans `ai_whatsapp_numbers`.

C’est cohérent. À garder : `whatsapp_phone_number_id` = Meta, `phone_number_id` = clé interne (UUID).

### 3.2 `createInterventionNotification` vs `createInterventionNotificationAction`

Le plan mentionne `createInterventionNotification(intervention.id)` (ligne 1052). L’existant utilise `createInterventionNotification` depuis `notification-actions`. Vérifier le nom exact du helper (action vs fonction) dans le code actuel avant d’implémenter.

### 3.3 Génération du PDF

Le plan évoque `generateCallReportPdf`. L’implémentation ElevenLabs a son propre service de rapport d’appel. À prévoir : réutiliser ou adapter ce service pour WhatsApp (transcript, extractions, médias), ou créer un module dédié `whatsapp-call-report-pdf` partageant la logique commune.

---

## 4. Risques et recommandations

### 4.1 Réglementation Twilio Belgique

Le plan indique que le regulatory bundle pour la Belgique est approuvé. Les guidelines Twilio exigent des justificatifs (extrait BCE, preuve d’adresse, etc.) pour les numéros belges. À valider en amont : éligibilité du compte et documentation requise.

### 4.2 Vérification d’entreprise Meta

Sans vérification Meta, le sandbox limite à 5 destinataires. L’ordre recommandé (Business Manager → vérification → numéros) est correct.

### 4.3 Gestion des erreurs Claude

Le plan ne détaille pas la gestion des erreurs (rate limit, timeout, crash). Recommandation : ajouter un try/catch autour de l’appel Claude + message de repli du type “Désolé, une erreur s’est produite. Réessayez dans quelques instants.” (AGENTS.md Learning #127).

### 4.4 Timeout de session (2 h)

Le plan prévoit une fermeture de session après 2 h sans réponse. Cela suppose un job CRON ou un processus périodique. Ce point n’est pas détaillé dans le plan. À prévoir : CRON ou worker qui parcourt les sessions `active` avec `last_message_at < now() - 2h` et les ferme.

---

## 5. Checklist pré-implémentation

Avant de coder :

- [ ] Corriger la logique de déduplication des messages (champ ou table dédiée pour `wamid`)
- [ ] Normaliser le numéro `to` (sans `+`) pour l’API Meta
- [ ] Utiliser `interventionRepo.create()` avec `reference` et `type` pour les interventions WhatsApp
- [ ] Adapter les policies RLS avec `get_my_profile_ids()` si nécessaire
- [ ] Valider le format de sortie structurée de l’AI SDK 6
- [ ] Définir le mécanisme de timeout (CRON, worker)
- [ ] Vérifier les prérequis réglementaires Twilio pour les numéros belges

---

## 6. Conclusion

Le plan est **prêt pour l’implémentation** à condition d’intégrer les corrections listées ci-dessus. Les principaux points bloquants sont :

1. La **déduplication des messages** (structure actuelle invalide),
2. La **création d’intervention** (champs obligatoires et usage du repository),
3. Les **policies RLS multi-profil**.

Le reste du design (architecture, flux, sécurité, coûts) est cohérent avec l’existant SEIDO et les bonnes pratiques.
