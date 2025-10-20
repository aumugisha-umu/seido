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
          - textbox "Adresse email" [ref=e19]: arthur+loc@seido.pm
        - generic [ref=e20]:
          - generic [ref=e21]: Mot de passe
          - generic [ref=e22]:
            - textbox "Mot de passe" [ref=e23]: Wxcvbn123
            - button [ref=e24]:
              - img
        - link "Mot de passe oublié ?" [ref=e26] [cursor=pointer]:
          - /url: /auth/reset-password
        - button "Connexion..." [disabled]
      - paragraph [ref=e28]:
        - text: Pas encore de compte ?
        - link "Créer un compte" [ref=e29] [cursor=pointer]:
          - /url: /auth/signup
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e35] [cursor=pointer]:
    - img [ref=e36] [cursor=pointer]
  - alert [ref=e39]
```