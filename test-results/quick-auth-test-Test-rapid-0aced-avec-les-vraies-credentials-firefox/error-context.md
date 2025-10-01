# Page snapshot

```yaml
- generic [ref=e1]:
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
          - textbox "Adresse email" [ref=e23]: arthur+gest@seido.pm
        - generic [ref=e24]:
          - generic [ref=e25]: Mot de passe
          - generic [ref=e26]:
            - textbox "Mot de passe" [ref=e27]: Wxcvbn123
            - button [ref=e28]:
              - img
        - button "Se connecter" [active] [ref=e29]
      - link "Mot de passe oublié ?" [ref=e31] [cursor=pointer]:
        - /url: /auth/reset-password
      - paragraph [ref=e33]:
        - text: Pas encore de compte ?
        - link "Créer un compte" [ref=e34] [cursor=pointer]:
          - /url: /auth/signup
  - region "Notifications (F8)":
    - list
```