# Prochaine session : Remettre les cards pour mobile + rôles simplifiés

## Contexte

On vient de supprimer les card views des navigateurs gestionnaire (preview branch).
Mais les cards restent pertinentes dans 2 cas :

### 1. Vue mobile (toutes les listes gestionnaire)
- Sur mobile (< 768px), les cards sont plus ergonomiques que les tableaux
- Les tableaux dense ne fonctionnent pas bien sur petit écran (scroll horizontal, colonnes tronquées)
- Pattern à explorer : **responsive view switching** — table sur desktop, cards sur mobile (automatique, sans toggle)

### 2. Rôles locataire et prestataire
- Ces utilisateurs ont besoin de **simplicité maximale**
- Locataire : usage occasionnel, veut juste voir ses demandes (cards = plus visuel, moins intimidant)
- Prestataire : 75% mobile terrain, cards = tap targets larges, scan rapide
- Possiblement cards par défaut pour ces rôles, sans toggle (pas de choix = plus simple)

## TODO prochaine session

1. **Rechercher les bonnes pratiques** : responsive tables vs cards, mobile-first B2B/B2C patterns, Nielsen Norman Group mobile data display
2. **Décider** : toggle responsive automatique (breakpoint) ou cards-only pour certains rôles ?
3. **Implémenter** : ajouter le responsive behavior aux navigateurs concernés
4. **Vérifier** les pages locataire et prestataire existantes (ont-elles des listes ? lesquelles ?)

## Fichiers de référence
- `hooks/use-view-mode.ts` — ViewMode type inclut encore 'cards' (on l'a gardé exprès)
- `components/patrimoine/patrimoine-navigator.tsx` — exemple de navigateur nettoyé
- `docs/design/persona-locataire.md` — persona locataire
- `docs/design/persona-prestataire.md` — persona prestataire
- `docs/design/ux-role-locataire.md` — guidelines UX locataire
- `docs/design/ux-role-prestataire.md` — guidelines UX prestataire
