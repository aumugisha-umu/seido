# Design: Gestionnaire Contact Creation Flow

**Date:** 2026-03-15
**Status:** Validated

## Problem

When creating a contact of type "Gestionnaire", the user sees a "Personne physique / Societe" selector that makes no sense — a gestionnaire is always a person joining the team.

## Solution: Adaptive Step 1

When `contactType === 'gestionnaire'`:
1. **Step 1**: Hide "Personne/Societe" radio group, show info banner instead
2. **Client state**: Force `personOrCompany = 'person'` and `inviteToApp = true`
3. **Step 3**: Hide `inviteToApp` toggle, show reminder banner

### Banner copy (Step 1)
> **Bienvenue dans l'equipe**
> Cette personne rejoindra votre equipe avec un acces complet : biens, interventions, contrats et contacts. Elle recevra un email d'invitation pour creer son compte.

### Files
- `steps/step-1-type.tsx` — conditional render
- `contact-creation-client.tsx` — force state values
- `steps/step-3-contact.tsx` — hide toggle, show banner
