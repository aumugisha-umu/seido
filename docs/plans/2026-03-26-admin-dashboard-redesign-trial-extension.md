# Admin Dashboard Redesign + Trial Extension

**Date:** 2026-03-26
**Branch:** `preview`
**Status:** Design validated

---

## 1. Objectif

Refondre le dashboard admin SEIDO et ajouter la possibilite pour l'admin d'etendre la duree d'essai gratuit des equipes individuellement.

### Decisions de design (brainstorming)
- **Dashboard:** Panneau "Equipes en trial" integre + page dediee `/admin/teams`
- **Extension trial:** Boutons predefinis (+7j/+14j/+30j) + date picker custom
- **Notification:** Email automatique au gestionnaire admin de l'equipe
- **Audit trail:** Entree `activity_logs` avec raison optionnelle

---

## 2. Etat actuel (problemes identifies)

| Probleme | Severite |
|----------|----------|
| KPIs avec donnees simulees (revenus = interventions x 450EUR, croissance hardcodee) | Critique |
| 3 boutons d'action = divs sans onClick/href | Critique |
| Bouton "Parametres" pointe vers `/admin/settings` (n'existe pas) | P0 |
| Aucune page "Equipes" — entite business #1 absente | High |
| Page notifications = mock data | High |
| Aucun indicateur de sante systeme | Medium |
| `logger.info()` en render dans AdminDashboardClient | Low |

---

## 3. Architecture cible

### 3.1 Dashboard redesigne (`/admin/dashboard`)

```
[KPI Row — 4 cards: Users actifs, Equipes, MRR Stripe, Interventions]

[Two-column section]
  Left (60%): Equipes en trial (table compacte: nom, jours restants, lots, action rapide)
  Right (40%): Activite recente (derniers signups, changements subscription)

[Quick Links — 3 navigation cards avec vrais hrefs]
```

**KPIs reels:**
- Users actifs: `COUNT(users) WHERE last_login > now() - 30 days`
- Equipes: `COUNT(teams) WHERE deleted_at IS NULL`
- Interventions: `COUNT(interventions) WHERE created_at > now() - 30 days`
- MRR: Differe a Phase 2 (Stripe API) — afficher nombre d'abonnements actifs pour l'instant

**Panneau "Equipes en trial":**
- Affiche uniquement les equipes avec `status = 'trialing'`
- Colonnes: Nom equipe, Gestionnaire, Lots, Jours restants, Actions
- Actions: bouton "Etendre" ouvre le dialog d'extension
- Lien "Voir toutes les equipes" vers `/admin/teams`

### 3.2 Page Equipes (`/admin/teams`) — nouvelle

Table complete de toutes les equipes:

| Colonne | Source |
|---------|--------|
| Nom | `teams.name` |
| Admin | `users.name` via `team_members` WHERE `role = 'admin'` |
| Membres | `COUNT(team_members)` |
| Lots | `COUNT(lots)` via buildings |
| Plan | `subscriptions.status` |
| Trial end | `subscriptions.trial_end` |
| Cree le | `teams.created_at` |
| Actions | Etendre trial, Impersonner |

Filtres: par statut subscription (trialing, active, canceled, all).

### 3.3 Dialog "Etendre trial"

```
+------------------------------------------+
|  Etendre l'essai — [Nom equipe]          |
|                                          |
|  Trial actuel: expire le 15 avril 2026   |
|  (dans 20 jours)                         |
|                                          |
|  [+7 jours]  [+14 jours]  [+30 jours]   |
|                                          |
|  Ou choisir une date:                    |
|  [______ Date picker ______]             |
|                                          |
|  Nouvelle date: 22 avril 2026            |
|                                          |
|  Raison (optionnel):                     |
|  [________________________________]      |
|                                          |
|  [Annuler]              [Confirmer]      |
+------------------------------------------+
```

Le dialog:
- Affiche la date actuelle de fin de trial
- Les boutons +7/+14/+30 calculent depuis la date actuelle de fin (pas depuis aujourd'hui)
- Le date picker permet une date custom (minimum = demain)
- Affiche la preview de la nouvelle date avant confirmation
- Raison optionnelle (textarea, max 200 chars)

### 3.4 Email "Trial prolonge"

Nouveau template: `emails/templates/admin/trial-extended.tsx`

```
[EmailHeader: "Bonne nouvelle !"]

Bonjour {firstName},

L'essai gratuit de votre equipe "{teamName}" a ete prolonge.

  Nouvelle date de fin: {newTrialEnd}
  Jours supplementaires: {daysAdded}

Profitez de ce temps supplementaire pour explorer toutes les
fonctionnalites de SEIDO.

[EmailButton: "Acceder a mon espace" → dashboard URL]

[EmailFooter]
```

---

## 4. Implementation technique

### 4.1 Server action: `extendTeamTrialAction`

**Fichier:** `app/actions/admin-team-actions.ts` (nouveau)

```typescript
export async function extendTeamTrialAction(
  teamId: string,
  newTrialEnd: string,   // ISO date
  reason?: string
): Promise<ActionResult>
```

Logique:
1. `getServerAuthContext('admin')` — securite
2. Charger `subscriptions` WHERE `team_id = teamId`
3. Verifier `status = 'trialing'` (on ne prolonge que les trials)
4. UPDATE `subscriptions` SET `trial_end = newTrialEnd` WHERE `team_id = teamId`
5. INSERT `activity_logs` avec `action_type = 'trial_extended'`, metadata: `{team_id, old_end, new_end, days_added, reason}`
6. Envoyer email via `emailService.sendTrialExtendedEmail()`
7. Return success

**Client service role:** Necessaire pour l'UPDATE sur `subscriptions` (meme pattern que billing — RLS bloque les writes authentifies).

### 4.2 Server action: `getAdminTeamsWithSubscriptions`

**Fichier:** `app/actions/admin-team-actions.ts`

```typescript
export async function getAdminTeamsWithSubscriptions(): Promise<ActionResult<AdminTeam[]>>
```

Query: `teams` LEFT JOIN `subscriptions` + count members + count lots.
Retourne: `{ id, name, admin_name, admin_email, member_count, lot_count, subscription_status, trial_end, created_at }`

### 4.3 Navigation

Ajouter dans `components/dashboard-header.tsx` roleConfigs.admin.navigation:
```typescript
{ href: "/admin/teams", label: "Equipes", icon: Building2 },
```

Position: entre "Dashboard" et "Utilisateurs".

### 4.4 Email service

Ajouter `sendTrialExtendedEmail` dans `lib/email/email-service.ts`.
Ajouter `TrialExtendedEmailProps` dans `emails/utils/types.ts`.

---

## 5. Fichiers a creer

| Fichier | Description |
|---------|-------------|
| `app/admin/(with-navbar)/teams/page.tsx` | Server component — page equipes |
| `app/admin/(with-navbar)/teams/teams-management-client.tsx` | Client component — table + filtres + dialog |
| `app/admin/(with-navbar)/teams/loading.tsx` | Loading skeleton |
| `app/actions/admin-team-actions.ts` | Server actions admin equipes |
| `emails/templates/admin/trial-extended.tsx` | Template email trial prolonge |

## 6. Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `app/admin/(with-navbar)/dashboard/page.tsx` | Refonte complete: vrais KPIs + panneau trial + activite recente |
| `app/admin/(with-navbar)/dashboard/admin-dashboard-client.tsx` | Fix route parametres, remove render logger, ajouter interactivite |
| `components/dashboard-header.tsx` | Ajouter "Equipes" dans nav admin |
| `lib/email/email-service.ts` | Ajouter `sendTrialExtendedEmail` |
| `emails/utils/types.ts` | Ajouter `TrialExtendedEmailProps` |

---

## 7. Hors scope (Phase 2)

- MRR reel via Stripe API (afficher nb abonnements actifs pour l'instant)
- Indicateurs sante systeme (Supabase/Stripe/Resend health checks)
- Refonte page notifications (remplacement mock data)
- Bulk actions / CSV export sur la table users
- Audit log page dediee
- Command palette admin

---

## 8. Verification

- `npm run lint` — pas d'erreurs
- Navigation admin: 5 items (Dashboard, Equipes, Utilisateurs, Types intervention, Parametres)
- Dashboard: KPIs reels, panneau equipes trial, liens fonctionnels
- Extension trial: dialog avec boutons predefinis + date picker, confirmation, email envoye
- Activity log: entree creee apres chaque extension
