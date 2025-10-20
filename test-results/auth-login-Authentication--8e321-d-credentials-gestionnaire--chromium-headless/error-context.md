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
      - alert [ref=e16]:
        - generic [ref=e17]:
          - strong [ref=e18]: Session expirée
          - text: Votre session a expiré. Veuillez vous reconnecter.
      - generic [ref=e19]:
        - generic [ref=e20]:
          - generic [ref=e21]: Adresse email
          - textbox "Adresse email" [ref=e22]
        - generic [ref=e23]:
          - generic [ref=e24]: Mot de passe
          - generic [ref=e25]:
            - textbox "Mot de passe" [ref=e26]
            - button [ref=e27]:
              - img
        - button "Se connecter" [ref=e28]
      - link "Mot de passe oublié ?" [ref=e30] [cursor=pointer]:
        - /url: /auth/reset-password
      - paragraph [ref=e32]:
        - text: Pas encore de compte ?
        - link "Créer un compte" [ref=e33] [cursor=pointer]:
          - /url: /auth/signup
  - region "Notifications (F8)":
    - list
  - button "Open Next.js Dev Tools" [ref=e39] [cursor=pointer]:
    - img [ref=e40] [cursor=pointer]
  - alert [ref=e43]
```