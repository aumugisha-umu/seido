# Email Archives - Dev Tools

Ce dossier contient des outils de développement archivés qui ne sont plus utilisés en production mais conservés pour référence.

## 📁 Contenu

### Email Template Preview (Archivé)

**Fichiers**:
- `page-email-preview-templates.tsx` - Preview des templates email Resend
- `email-preview-client.tsx` - Client component pour la preview

**Pourquoi archivé ?**:
- Route `/mail` maintenant redirige vers `/mail/inbox` (email client interface)
- Les templates email sont testables via Storybook ou tests unitaires
- Cette preview était utile en phase de développement mais n'est plus nécessaire

**Templates concernés**:
1. Signup Confirmation
2. Welcome Email
3. Password Reset
4. Password Changed
5. Team Invitation

**Si besoin de réactiver**:
1. Copier les fichiers vers `/gestionnaire/mail/preview-templates/`
2. Créer route `/mail/preview-templates`
3. Accéder via `/gestionnaire/mail/preview-templates`

---

## 🔄 Migration vers Email Client Interface

**Ancienne structure** (avant 2025-11-05):
```
/gestionnaire/mail/
├── page.tsx                    # Preview templates (archivé)
└── email-preview-client.tsx    # Preview client (archivé)
```

**Nouvelle structure** (après 2025-11-05):
```
/gestionnaire/mail/
├── page.tsx                    # Redirect → /mail/inbox
├── inbox/
│   └── page.tsx                # Email client interface (3-column layout)
├── _components/                # Shared components
│   ├── dummy-data.ts
│   ├── mailbox-sidebar.tsx
│   ├── email-list.tsx
│   ├── email-list-item.tsx
│   ├── email-detail.tsx
│   ├── link-to-building-dropdown.tsx
│   ├── mark-irrelevant-dialog.tsx
│   └── blacklist-manager.tsx
└── archives/                   # Ce dossier
    ├── README.md               # Ce fichier
    ├── page-email-preview-templates.tsx
    └── email-preview-client.tsx
```

---

## 📖 Documentation

**Email Client Interface** (production):
- [Frontend Implementation Guide](../../../../docs/email_integration/FRONTEND_IMPLEMENTATION.md)
- [UI Design Variants](../../../../docs/email_integration/email-ui-design-variants.mdx)
- [Backend Integration Guide](../../../../docs/email_integration/email-integration-guide-imap-smtp.md)

**Templates Email** (Resend):
- Voir `/emails/templates/` pour les fichiers source
- Tests: `__tests__/emails/` (si implémentés)

---

**Archivé le**: 2025-11-05
**Raison**: Migration vers email client interface IMAP/SMTP
**Peut être supprimé ?**: Oui, après vérification que les templates email fonctionnent en production
