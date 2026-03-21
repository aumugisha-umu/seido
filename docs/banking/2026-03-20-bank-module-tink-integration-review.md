# Revue du document Bank Module — Intégration Tink

**Date** : 20 mars 2026  
**Document analysé** : `2026-03-19-bank-module-tink-integration.md`  
**Sources consultées** : docs.tink.com, Tink API, Tink Link, Credentials Session, Retrieve Access Token

---

## Synthèse

Le document de conception est **très complet** et aligné avec les patterns SEIDO. Les corrections post-audit (v2) ont traité les principaux points techniques.  
La comparaison avec la doc officielle Tink révèle cependant **une contradiction critique** sur le tier (Standard vs Enterprise) et quelques ajustements à prévoir sur les URLs, scopes et contraintes DB.

---

## 1. Points validés

### 1.1 Architecture générale

- Modèle de données cohérent (`bank_connections`, `bank_transactions`, `transaction_links`, `rent_calls`, `auto_linking_rules`).
- RLS avec `is_team_manager(team_id)` conforme aux autres modules.
- Usage de `EncryptionService` (AES-256-GCM) identique à `email-connection.repository.ts`.
- Flux OAuth Tink standard (client token → user create → Tink Link redirect → callback → token exchange).

### 1.2 API Tink

- **OAuth token** : `POST https://api.tink.com/api/v1/oauth/token` confirmé (doc "Retrieve access token").
- **Token user** : `expires_in: 7200` (2h) confirmé.
- **Montants** : Format `unscaledValue` + `scale` confirmé (doc Tink API data v2, structure `currencyDenominatedAmount` ou `amount.value`).
- **Conversion** : `Number(unscaledValue) / Math.pow(10, Number(scale))` correcte.
- **Session PSD2** : 90 jours confirmé (doc Credentials Session).
- **Continuous Access** : Background refresh 4×/jour confirmé.

### 1.3 Sécurité

- Chiffrement des tokens et IBAN via `EncryptionService`.
- Pas de Supabase Vault (non configuré).
- Service-role pour les crons de sync.
- RLS par action (SELECT/INSERT/UPDATE/DELETE).

### 1.4 Codebase

- `is_team_manager()` existe et est utilisé dans les migrations.
- `EncryptionService` existe et utilise `EMAIL_ENCRYPTION_KEY`.
- `payment_frequency` et `payment_frequency_value` existent sur `contracts`.

---

## 2. Points critiques

### 2.1 Tier Tink : Standard vs Enterprise — contradiction (bloquant)

**Problème** : Le document indique "Standard pour le MVP" (Décisions ouvertes #1) alors que :

- **Sans Permanent Users** : les données sont supprimées après 24h (doc Credentials Session, Introduction to Transactions).
- **Permanent Users** : nécessitent un contrat **Enterprise** (doc "Permanent users", "Configure data enrichment").
- Le flow prévu (1 Tink user par équipe, sync cron 4h, 90 jours de consentement) suppose des **permanent users** et donc **Enterprise**.

**Conséquence** : Avec le tier Standard (sandbox), après 24h les données sont perdues. Aucun produit viable n’est possible sans permanent users.

**Recommandation** :

1. **Expliciter** dans le document que le module Banque nécessite un contrat Tink **Enterprise** avec **Permanent Users** activés.
2. **Ou** prévoir une alternative pour le MVP (ex. one-time access + warning 24h pour démo POC uniquement).
3. Mettre à jour la table "Décisions ouvertes" : pour un MVP réel, le choix est Enterprise, pas Standard.

---

### 2.2 Tink Link URL — à vérifier

**Dans le document** : `https://link.tink.com/1.0/transactions/connect-accounts`

**Documentation Tink** :  
- **Business Transactions** : `https://link.tink.com/1.0/business-transactions/connect-accounts`  
- **Standard aggregation** : URL à confirmer dans la doc "Connect to a bank account" / "Tink Link Web".

**Action** : Vérifier dans la console Tink et la doc "Tink Link Web" / "Link Transactions" l’URL exacte pour l’agrégation standard (transactions, pas business). En cas de doute, tester en sandbox.

---

### 2.3 Scopes OAuth — compléter la liste

**Document** :  
`accounts:read`, `transactions:read`, `credentials:read`, `provider-consents:read`

**Documentation Tink (Transactions, Credentials)** :  
Pour un flux complet avec Continuous Access, il faut aussi :

- `authorization:grant` — pour le client token
- `user:create` — pour créer un Tink user
- `credentials:write` — pour créer des credentials
- `credentials:refresh` — pour les background refresh
- `credentials:read` — déjà prévu

**Recommandation** : Ajouter dans la section "Scopes OAuth nécessaires" tous les scopes requis pour le flow complet, en s’appuyant sur la doc Tink (ex. "Prerequisites for Using Transactions").

---

### 2.4 Refresh token dans la réponse OAuth

**Document** : La section "Refresh Token Strategy" suppose un `refresh_token` dans la réponse du token exchange.

**Doc "Retrieve access token"** : L’exemple ne montre que `access_token`, `expires_in`, `scope`. Pas de `refresh_token` explicite.

**Reality** : Pour Continuous Access, Tink renvoie bien un refresh token. L’exemple de la doc est minimal. À confirmer en sandbox : la réponse complète doit inclure `refresh_token` pour le flow prévu.

---

## 3. Ajustements recommandés

### 3.1 Clé de chiffrement — variable d’environnement

**Document** : Réutilisation de `EncryptionService` comme pour l’email.

**Implémentation actuelle** : `EncryptionService` utilise `EMAIL_ENCRYPTION_KEY`.

**Recommandation** :  
- Soit réutiliser `EMAIL_ENCRYPTION_KEY` (clef partagée) — documenter ce choix.  
- Soit introduire `BANK_ENCRYPTION_KEY` ou une clef commune `ENCRYPTION_KEY` pour séparer les usages sensibles.  

À trancher selon la politique de sécurité du projet.

---

### 3.2 Contrainte UNIQUE sur `transaction_links`

**Document** :
```sql
CONSTRAINT unique_transaction_entity UNIQUE (
  bank_transaction_id, rent_call_id, intervention_id, supplier_contract_id
)
```

**Problème** : En PostgreSQL, `NULL` n’est pas égal à `NULL` dans une contrainte UNIQUE. Donc plusieurs lignes avec `(tx_id, NULL, NULL, NULL)` peuvent exister si on ne vérifie pas la contrainte "exactement un lien".

**Recommandation** :  
Utiliser une contrainte `CHECK` pour imposer exactement un FK non-null, et une contrainte/trigger ou index partiel pour garantir 1 lien par transaction par entité. Exemple :

```sql
-- S'assurer qu'exactement 1 des 3 FK est non-null
CONSTRAINT exactly_one_link CHECK (...),

-- Empêcher 2 liens vers la même rent_call pour la même transaction
-- (via index unique partiel ou application layer)
```

Ou index unique partiel par type de lien, selon le modèle cible.

---

### 3.3 Champ `amount` Tink — structure exacte

**Document** : Mapping depuis `amount.value` avec `unscaledValue` et `scale`.

**Documentation Tink** :  
Le format peut varier selon l’endpoint (Data v2 vs autres) : `amount`, `currencyDenominatedAmount`, ou `value` imbriqué.

**Recommandation** :  
Tester en sandbox et gérer les variantes possibles :

```typescript
function parseTinkAmount(obj: unknown): number {
  const val = (obj as any)?.value ?? obj
  const unscaled = val?.unscaledValue ?? val?.unscaled_value
  const scale = val?.scale ?? 2
  return Number(unscaled) / Math.pow(10, Number(scale))
}
```

---

### 3.4 Jour de paiement pour `rent_calls`

**Document** : `due_date` = "1er de chaque mois (ou date configurée)".

**Schema `contracts`** : `payment_frequency`, `payment_frequency_value`. Pas de colonne explicite "jour du mois" dans les migrations vues.

**Action** :  
Vérifier si `payment_frequency_value` ou une autre colonne encode le jour (ex. 1–31). Si non, ajouter une colonne `payment_day` (1–31) dans la migration des `rent_calls` ou réutiliser un champ existant pour calculer `due_date`.

---

### 3.5 Webhooks Tink — signature et documentation

**Document** : Webhooks pour `account:updated`, `reports-generation:completed`.

**Recommandation** :  
La doc Tink décrit la vérification de signature des webhooks. Ajouter dans le plan :  
- Méthode de vérification (ex. HMAC ou clé partagée)  
- Liste des événements réellement nécessaires (certains peuvent être Enterprise)  
- Stratégie si le webhook échoue (retry, idempotence)

---

## 4. Points à valider en sandbox

Avant implémentation :

| Élément | Vérification |
|--------|--------------|
| URL Tink Link exacte | Tester `transactions/connect-accounts` vs `business-transactions/connect-accounts` |
| Réponse token exchange | Confirmer présence de `refresh_token` |
| Structure réponse Data v2 | Vérifier noms des champs (`amount` vs `currencyDenominatedAmount`) |
| Test provider | Utiliser `se-test-bankid-successful` ou équivalent |
| Permanent users | Confirmer activation et comportement en sandbox Enterprise |

---

## 5. Checklist avant développement

- [ ] Clarifier le tier Tink (Enterprise + Permanent Users) et mettre à jour le document.
- [ ] Vérifier l’URL Tink Link dans la doc / console.
- [ ] Compléter la liste des scopes OAuth.
- [ ] Confirmer le format `refresh_token` en sandbox.
- [ ] Revoir la contrainte UNIQUE sur `transaction_links`.
- [ ] Documenter la gestion du "jour de paiement" pour `rent_calls`.
- [ ] Préciser la clé de chiffrement (réutilisation ou dédiée).
- [ ] Documenter la vérification de signature des webhooks Tink.

---

## 6. Conclusion

Le document est solide d’un point de vue fonctionnel et aligné avec les standards SEIDO. Le blocage principal vient du **tier Tink** : le modèle de "Continuous Access" et persistance au-delà de 24h nécessite **Enterprise + Permanent Users**. Cette exigence doit être explicite dans le document et intégrée au budget / plan de déploiement.

Les autres points (URL, scopes, refresh token, contraintes DB, jour de paiement, webhooks) sont des ajustements à anticiper avant ou pendant l’implémentation.
