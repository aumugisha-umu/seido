# 🪟 Guide : Configuration UTF-8 pour Windows Terminal

Ce guide explique comment configurer Windows Terminal pour afficher correctement les emojis et caractères UTF-8 dans les logs Pino.

---

## 🚨 Problème : Emojis Corrompus dans les Logs

### Symptômes

Vous voyez des caractères corrompus au lieu des emojis dans vos logs :

```
❌ Avant (encodage incorrect):
{"msg":"Ô£à [STEP-4] Activity logged successfully"}
{"msg":"­ƒÄë [INVITE-USER-SIMPLE] Process completed"}
{"msg":"­ƒôº [TEAM-INVITATIONS] Fetching invitations"}
```

```
✅ Après (UTF-8 correct):
{"msg":"✅ [STEP-4] Activity logged successfully"}
{"msg":"🎫 [INVITE-USER-SIMPLE] Process completed"}
{"msg":"🔍 [TEAM-INVITATIONS] Fetching invitations"}
```

### Cause Racine

Par défaut, Windows Terminal utilise **CP1252** (Western European) au lieu d'**UTF-8**. Les emojis (qui sont des caractères UTF-8 sur 4 bytes) sont donc mal interprétés.

---

## ✅ Solution 1 : Utiliser `npm run dev:pretty` (RECOMMANDÉE)

### Avantage

**Aucune configuration système nécessaire** - Fonctionne immédiatement

### Commande

```bash
npm run dev:pretty
```

### Résultat

```
[13:08:59] INFO: ✅ [STEP-4] Activity logged successfully
    userId: "7d808b3b-1caf-4226-a5f4-459e9c7f7c38"
    action: "invite_user"

[13:08:59] INFO: 🎫 [INVITE-USER-SIMPLE] Process completed successfully
    invitationId: "abc-123-..."
    email: "arthur+test@seido.pm"

[13:09:00] INFO: 🔍 [TEAM-INVITATIONS] Fetching all invitations for team
    teamId: "f187f3c0-f4c1-42c3-9260-cb6ede7eb9e2"
```

**C'est la solution recommandée pour le développement quotidien.**

---

## ✅ Solution 2 : Configurer UTF-8 dans Windows Terminal (PERMANENT)

### Étapes

#### 1. Ouvrir Windows Terminal Settings

**Méthode A** : Raccourci clavier
- Appuyez sur `Ctrl + ,` dans Windows Terminal

**Méthode B** : Menu
- Cliquez sur l'icône `▼` (flèche vers le bas) dans l'onglet
- Sélectionnez `Paramètres` / `Settings`

#### 2. Configurer le Profil Par Défaut

1. Dans le menu de gauche, cliquez sur **`Profils`**
2. Sélectionnez **`Par défaut`** ou **`Default`**
3. Faites défiler jusqu'à la section **`Avancé`** / **`Advanced`**
4. Localisez l'option **`Page de codes`** / **`Code page`**
5. Changez la valeur à : **`UTF-8 (65001)`**

#### 3. Sauvegarder et Redémarrer

1. Cliquez sur **`Enregistrer`** / **`Save`** en bas à droite
2. Fermez complètement Windows Terminal
3. Relancez Windows Terminal

#### 4. Vérifier la Configuration

```bash
# Dans un nouveau terminal, vérifiez l'encoding
chcp
```

**Résultat attendu** :
```
Active code page: 65001
```

---

## ✅ Solution 3 : Forcer UTF-8 Temporairement (Par Session)

### Commande

```bash
chcp 65001
npm run dev
```

### Avantage

- ✅ Fonctionne immédiatement
- ✅ Pas de modification permanente

### Inconvénient

- ❌ À répéter à chaque nouvelle session de terminal

---

## 📋 Configuration Avancée : settings.json

Si vous préférez éditer manuellement le fichier de configuration Windows Terminal :

### 1. Localiser settings.json

**Chemin** :
```
%LOCALAPPDATA%\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json
```

**Ou via GUI** :
- `Ctrl + ,` → Cliquez sur `⚙️ Ouvrir le fichier JSON` en bas à gauche

### 2. Modifier le Profil Par Défaut

Ajoutez la propriété `"codePage": 65001` dans le profil par défaut :

```json
{
  "profiles": {
    "defaults": {
      "codePage": 65001,
      // ... autres paramètres
    },
    "list": [
      // ... vos profils
    ]
  }
}
```

### 3. Sauvegarder et Redémarrer

Windows Terminal détectera automatiquement les changements.

---

## 🧪 Test : Vérifier que UTF-8 Fonctionne

### Test 1 : Emojis dans Terminal

```bash
echo "✅ 🎫 🔍 🚀 📦 ⚠️ ❌"
```

**Résultat attendu** : Emojis affichés correctement

### Test 2 : Logs Pino avec Emojis

```bash
npm run dev
```

**Recherchez dans les logs** :
```
{"msg":"✅ [DAL] Valid session found"}
{"msg":"🚀 [LOGIN-ACTION] Starting server-side login"}
{"msg":"📦 [DASHBOARD] Teams result"}
```

Les emojis doivent être visibles et non corrompus.

---

## 🐛 Dépannage

### Problème : `chcp` retourne toujours 1252

**Solution** : Windows Terminal ne prend pas en charge `chcp` pour certains profils.

**Alternative** :
1. Utilisez `npm run dev:pretty` au lieu de `npm run dev`
2. Ou configurez UTF-8 dans `settings.json` (Solution 3)

### Problème : Emojis toujours corrompus après configuration

**Vérifications** :
1. Avez-vous bien **redémarré Windows Terminal** complètement ?
2. Vérifiez que vous avez configuré le **profil par défaut** et pas un profil spécifique
3. Testez avec `echo "✅"` - si ça ne fonctionne pas, le problème est système

**Solution de secours** :
```bash
npm run dev:pretty  # Toujours fonctionne
```

### Problème : PowerShell ne respecte pas UTF-8

PowerShell nécessite une configuration supplémentaire.

**Ajoutez à votre profil PowerShell** (`$PROFILE`) :
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
```

**Ou lancez avant chaque session** :
```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
npm run dev
```

---

## 📊 Résumé : Quelle Solution Choisir ?

| Solution | Difficulté | Permanent | Recommandation |
|----------|------------|-----------|----------------|
| `npm run dev:pretty` | ⭐ Facile | Non (à chaque session) | ✅ **RECOMMANDÉE pour développement** |
| Configuration UTF-8 Terminal | ⭐⭐ Moyenne | ✅ Oui | ✅ **RECOMMANDÉE pour tous projets** |
| `chcp 65001` temporaire | ⭐ Facile | Non (à chaque session) | ⚠️ Dépannage uniquement |

---

## 🎯 Recommandation Finale

**Pour développement SEIDO** :
```bash
# Commande recommandée
npm run dev:pretty
```

**Pour configuration système permanente** :
1. Suivre **Solution 2** (Windows Terminal Settings)
2. Redémarrer le terminal
3. Vérifier avec `chcp` ou `echo "✅"`

---

**Dernière mise à jour** : 2025-10-05
**Testé sur** : Windows 11, Windows Terminal 1.20+
