---
paths:
  - "tests/**"
  - "docs/qa/**"
  - "app/**/page.tsx"
---

# Testing Rules - SEIDO

> Ces regles s'appliquent quand tu modifies des tests, la QA, ou des routes/pages.

## Test Maintenance (auto-update)

Quand une modification touche :
- Une route (`page.tsx` ajoutee/supprimee/renommee)
- Un wizard/formulaire (etapes ajoutees/supprimees)
- Un statut ou flow d'intervention (nouveau statut, transition modifiee)
- Un bouton/action visible par l'utilisateur

→ Mettre a jour **dans le meme changement** :
1. `docs/qa/discovery-tree.json` — ajouter/modifier/supprimer le noeud concerne
2. Les tests E2E impactes (`tests/e2e/`)
3. Regenerer le markdown : `npx tsx scripts/generate-discovery-tree.ts`

## Discovery Tree (QA)

L'arbre de decouverte est la **source de verite** de tous les chemins testables :
- **JSON** (source) : `docs/qa/discovery-tree.json`
- **Markdown** (lisible) : `docs/qa/discovery-tree.md` — auto-genere
- **103 noeuds** : 9 auth, 70 gestionnaire, 12 locataire, 12 prestataire + 4 cross-role
- **3 modes** : discovery (lecture), creation (ecriture), destruction (suppression)

Consulter cet arbre avant d'ajouter une nouvelle page ou de modifier un flow existant.

## Audit Obligation

A chaque test, mettre a jour `docs/rapport-audit-complet-seido.md`.

## Invitations de test

Toujours utiliser `demo+invite-{timestamp}@seido-app.com` pour les adresses creees lors des tests (E2E, integration).

## Skills pour Testing

| Action | Skill |
|--------|-------|
| Nouveau test E2E | `sp-test-driven-development` |
| Bug test | `sp-systematic-debugging` |
| Avant commit | `sp-verification-before-completion` |
