# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e8]
      - generic [ref=e13]: Authentification SEIDO
    - alert [ref=e16]:
      - img [ref=e17]
      - generic [ref=e19]:
        - strong [ref=e20]: Erreur d'authentification
        - text: ❌ Tokens manquants dans l'URL
        - text: Redirection vers la page de connexion...
  - region "Notifications (F8)":
    - list
  - generic [ref=e25] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e26] [cursor=pointer]:
      - img [ref=e27] [cursor=pointer]
    - generic [ref=e32] [cursor=pointer]:
      - button "Open issues overlay" [ref=e33] [cursor=pointer]:
        - generic [ref=e34] [cursor=pointer]:
          - generic [ref=e35] [cursor=pointer]: "0"
          - generic [ref=e36] [cursor=pointer]: "1"
        - generic [ref=e37] [cursor=pointer]: Issue
      - button "Collapse issues badge" [ref=e38] [cursor=pointer]:
        - img [ref=e39] [cursor=pointer]
  - alert [ref=e41]
```