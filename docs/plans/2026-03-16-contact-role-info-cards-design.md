# Design: Contact Role Info Cards + Proprietaire Type

## Context

The contact creation wizard has 4 types (locataire, gestionnaire, prestataire, autre). Only gestionnaire has an info card explaining what happens when invited. The user wants info cards for ALL types, plus adding `proprietaire` as a new type (not yet invitable, on roadmap).

## Files to Modify

| File | Change |
|------|--------|
| `app/gestionnaire/(no-navbar)/contacts/nouveau/steps/step-1-type.tsx` | Add info cards for all 5 types, add `proprietaire` to select |
| `app/gestionnaire/(no-navbar)/contacts/nouveau/steps/step-3-contact.tsx` | Adapt invitation section for proprietaire/autre (no checkbox) |
| `app/gestionnaire/(no-navbar)/contacts/nouveau/steps/step-4-confirmation.tsx` | Adapt confirmation section for proprietaire/autre |
| `app/gestionnaire/(no-navbar)/contacts/nouveau/contact-creation-client.tsx` | Add `proprietaire` to type union, force inviteToApp logic |

## Step 1: Info Cards (step-1-type.tsx)

Add `proprietaire` to the select options. Show an info card between the category select and the Personne/Societe radio for each type. Cards are informative only (no interaction).

| Type | Color | Icon | Title | Message |
|------|-------|------|-------|---------|
| Prestataire | green-50/green-200 | Wrench | "Prestataire de services" | "S'il est invite, ce prestataire pourra consulter ses interventions assignees, soumettre des devis, confirmer des creneaux et echanger avec les gestionnaires via la messagerie." |
| Locataire | blue-50/blue-200 | Home | "Locataire" | "S'il est invite, ce locataire pourra signaler des problemes, suivre l'avancement des interventions et echanger avec les gestionnaires via la messagerie." |
| Gestionnaire | blue-50/blue-200 | UserPlus | "Nouveau membre d'equipe" | (unchanged - already exists, replaces Personne/Societe radio) |
| Proprietaire | purple-50/purple-200 | Crown | "Proprietaire" | "Pour l'instant, les proprietaires ne peuvent pas etre invites dans l'application. Cette fonctionnalite est sur notre roadmap. Ce contact sera enregistre dans votre base." |
| Autre | muted/border | UserX | "Contact externe" | "Ce type de contact ne peut pas etre invite dans l'application. Utilisez-le pour stocker les coordonnees de tout autre contact (notaire, architecte, assureur...)." |

Prestataire and locataire cards appear ABOVE the Personne/Societe radio (not replacing it).
Gestionnaire card replaces the Personne/Societe radio (unchanged behavior).
Proprietaire and autre cards appear ABOVE the Personne/Societe radio.

## Step 3: Invitation Section (step-3-contact.tsx)

| Type | Behavior |
|------|----------|
| Gestionnaire | Forced invite (no checkbox) — unchanged |
| Prestataire | Optional checkbox — unchanged |
| Locataire | Optional checkbox — unchanged |
| Proprietaire | No checkbox. Purple card: "L'invitation des proprietaires n'est pas encore disponible. Cette fonctionnalite est sur notre roadmap." |
| Autre | No checkbox. Gray card: "Les contacts de type 'Autre' ne peuvent pas etre invites dans l'application." |

## Step 4: Confirmation (step-4-confirmation.tsx)

| Type | Display |
|------|---------|
| Gestionnaire | Unchanged — "Invitation a l'application" |
| Prestataire/Locataire | Unchanged — based on inviteToApp toggle |
| Proprietaire | Dedicated card: "Pas d'acces a l'application (fonctionnalite a venir)" — no toggle |
| Autre | Dedicated card: "Contact externe — pas d'acces a l'application" — no toggle |

## Parent Logic (contact-creation-client.tsx)

- Add `'proprietaire'` to the type union everywhere
- When contactType changes to `proprietaire` or `autre` -> force `inviteToApp = false`
- When contactType changes to `gestionnaire` -> force `inviteToApp = true` (already done)
- proprietaire type gets `personOrCompany` radio (can be person or company)

## What NOT to change

- Gestionnaire card behavior (already works)
- Server-side contact creation logic (proprietaire maps to existing `proprietaire` role in DB)
- The checkbox interaction for prestataire/locataire
