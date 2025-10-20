# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e8]
      - generic [ref=e12]:
        - generic [ref=e13]: Connexion à SEIDO
        - generic [ref=e14]: Accédez à votre espace de gestion immobilière
    - generic [ref=e15]:
      - generic [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]: Adresse email
          - textbox "Adresse email" [ref=e19]
        - generic [ref=e20]:
          - generic [ref=e21]: Mot de passe
          - generic [ref=e22]:
            - textbox "Mot de passe" [ref=e23]
            - button [ref=e24]:
              - img
        - link "Mot de passe oublié ?" [ref=e26] [cursor=pointer]:
          - /url: /auth/reset-password
        - button "Se connecter" [ref=e27]
      - paragraph [ref=e29]:
        - text: Pas encore de compte ?
        - link "Créer un compte" [ref=e30] [cursor=pointer]:
          - /url: /auth/signup
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e36] [cursor=pointer]:
    - img [ref=e37] [cursor=pointer]
  - alert [ref=e40]
```