# 📧 Guide Logo Email - Approche CID (Content-ID)

## Implémentation Actuelle

Le logo SEIDO dans les emails utilise l'approche **CID (Content-ID) attachments** recommandée par Resend.

---

## Comment ça fonctionne

### 1. Le logo est attaché à l'email

**Fichier**: `lib/email/email-service.ts`

```typescript
// Le logo est attaché comme pièce jointe avec un Content-ID
const logoBuffer = fs.readFileSync(path.join(process.cwd(), 'public/images/Logo/Logo_Seido_White.png'))

attachments: [{
  filename: 'logo.png',
  content: logoBuffer, // Buffer pour fichiers locaux
  content_id: 'logo@seido', // Content-ID unique (propriété Resend API)
  content_type: 'image/png' // Type MIME
}]
```

### 2. Le template email référence le CID

**Fichier**: `emails/components/email-header.tsx`

```tsx
// Référence au logo via son Content-ID
<Img
  src="cid:logo@seido"
  alt="SEIDO"
  width="200"
  height="50"
/>
```

---

## Avantages de cette approche

✅ **Simple**: Pas d'URL à configurer, pas d'API route nécessaire
✅ **Fiable**: Le logo est attaché directement à l'email
✅ **Compatible**: Fonctionne dans tous les clients email (Gmail, Outlook, Apple Mail, Yahoo, Thunderbird)
✅ **Universel**: Fonctionne en dev (localhost) ET en production sans configuration
✅ **Aucune dépendance externe**: Pas besoin d'URL publique accessible
✅ **Pas de configuration**: Fonctionne out-of-the-box

---

## Vérification

### Test rapide

1. **Démarrer le serveur**:
   ```bash
   npm run dev
   ```

2. **S'inscrire avec un email de test**:
   - Aller sur http://localhost:3000/auth/signup
   - Créer un compte avec votre email
   - Vérifier l'email de confirmation

3. **Le logo doit s'afficher** ✅

---

## Compatibilité Email Clients

| Client Email | Status | Notes |
|-------------|--------|-------|
| Gmail | ✅ Fonctionne | Affichage parfait |
| Outlook | ✅ Fonctionne | Affichage parfait |
| Apple Mail | ✅ Fonctionne | Affichage parfait |
| Yahoo Mail | ✅ Fonctionne | Affichage parfait |
| Thunderbird | ✅ Fonctionne | Affichage parfait |
| Webmail | ✅ Fonctionne | Tous les webmails supportent CID |

---

## Troubleshooting

### Le logo ne s'affiche pas

**Cause probable**: Le fichier logo n'existe pas à l'emplacement attendu

**Solution**:
1. Vérifier que le fichier existe:
   ```bash
   ls public/images/Logo/Logo_Seido_White.png
   ```

2. Si le fichier n'existe pas, vérifier les autres formats disponibles:
   ```bash
   ls public/images/Logo/
   ```

3. Mettre à jour le chemin dans `lib/email/email-service.ts` ligne 46

---

### L'email n'arrive pas

**Vérifications**:
1. Vérifier que Resend est configuré:
   ```bash
   # .env.local doit contenir:
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL="SEIDO <notifications@seido-app.com>"
   ```

2. Vérifier les logs dans la console:
   ```
   [EMAIL-SERVICE] Email sent successfully
   ```

3. Vérifier le dashboard Resend:
   https://resend.com/emails

---

## Fichiers concernés

- **`lib/email/email-service.ts`** - Ajout de l'attachment CID (lignes 45-62, 74)
- **`emails/components/email-header.tsx`** - Référence `cid:logo@seido` (ligne 20, 40)
- **`public/images/Logo/Logo_Seido_White.png`** - Fichier logo utilisé

---

## Pourquoi CID plutôt qu'une URL?

### Approche URL (ancienne)
```tsx
<Img src="https://seido.pm/api/email-assets/logo" />
```

**Problèmes**:
- ❌ Nécessite une URL publique accessible
- ❌ Ne fonctionne pas en développement (localhost)
- ❌ Nécessite configuration Vercel en production
- ❌ Peut échouer si le serveur est temporairement inaccessible
- ❌ Complexité: API route, variables d'environnement, etc.

### Approche CID (actuelle)
```tsx
<Img src="cid:logo@seido" />
```

**Avantages**:
- ✅ Fonctionne partout (dev + prod)
- ✅ Aucune configuration nécessaire
- ✅ Fiabilité maximale (logo attaché à l'email)
- ✅ Simplicité: 1 ligne de code dans email-service.ts

---

## Références

- **Documentation Resend**: https://resend.com/docs/api-reference/emails/send-email#attachments
- **Pattern CID**: Standard email RFC 2392
- **React Email Img**: https://react.email/docs/components/img

---

**Dernière mise à jour**: 2025-10-29
**Status**: ✅ Production Ready
