# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e8]
      - generic [ref=e16]:
        - generic [ref=e17]: Connexion à SEIDO
        - generic [ref=e18]: Accédez à votre espace de gestion immobilière
    - generic [ref=e19]:
      - generic [ref=e20]:
        - generic [ref=e21]:
          - generic [ref=e22]: Adresse email
          - textbox "Adresse email" [ref=e23]
        - generic [ref=e24]:
          - generic [ref=e25]: Mot de passe
          - generic [ref=e26]:
            - textbox "Mot de passe" [ref=e27]
            - button [ref=e28]:
              - img
        - link "Mot de passe oublié ?" [ref=e30] [cursor=pointer]:
          - /url: /auth/reset-password
        - button "Se connecter" [ref=e31]
      - paragraph [ref=e33]:
        - text: Pas encore de compte ?
        - link "Créer un compte" [ref=e34] [cursor=pointer]:
          - /url: /auth/signup
  - region "Notifications (F8)":
    - list
```