# OpenClaw QA Bot — VPS Setup Guide (Hostinger KVM 2)

## Specs VPS

| Spec | Valeur |
|------|--------|
| Pack | Hostinger KVM 2 |
| vCPU | 2 coeurs |
| RAM | 8 Go |
| Disque | 100 Go NVMe |
| Bande passante | 8 To |
| OS | Ubuntu 22.04 (recommande) |
| Prix | 7,99 EUR/mois |

## Etape 1 : Commander le VPS

1. Aller sur [hostinger.com/be-fr/vps/docker/openclaw](https://hostinger.com/be-fr/vps/docker/openclaw)
2. Choisir le pack **KVM 2** (8 Go RAM — necessaire pour Chromium headless)
3. Cliquer **Deployer**
4. Choisir le template **OpenClaw Docker** (pre-configure)
5. Definir un mot de passe root fort
6. Noter l'adresse IP du VPS

## Etape 2 : Premiere connexion SSH

```bash
ssh root@<IP_DU_VPS>
```

Le template Docker OpenClaw devrait avoir installe automatiquement :
- Docker + Docker Compose
- OpenClaw gateway
- Node.js

Verifier :

```bash
openclaw doctor
docker --version
node --version
```

Si OpenClaw n'est pas installe (template non-Docker) :

```bash
curl -fsSL https://raw.githubusercontent.com/pasogott/openclaw-ansible/main/install.sh | bash
```

## Etape 3 : Configurer les cles IA

Hostinger propose des jetons IA pre-integres via hPanel. Sinon, configurer manuellement :

```bash
# Editer la config OpenClaw
nano ~/.openclaw/.env
```

Ajouter :

```env
# ─── AI Provider ───
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxx

# ─── SEIDO Test Accounts ───
TARGET_URL=https://seido-git-preview-seido-app.vercel.app/
E2E_GESTIONNAIRE_EMAIL=arthur@seido.pm
E2E_GESTIONNAIRE_PASSWORD=xxxxxxxxxx
E2E_LOCATAIRE_EMAIL=demo+noelle.montagne@seido-app.com
E2E_LOCATAIRE_PASSWORD=xxxxxxxxxx
E2E_PRESTATAIRE_EMAIL=demo+artisan.polyvalent@seido-app.com
E2E_PRESTATAIRE_PASSWORD=xxxxxxxxxx

# ─── Supabase ───
NEXT_PUBLIC_SUPABASE_URL=https://yfmybfmflghwvylqjfbc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOxxxxxxxx

# ─── Reporting ───
RESEND_API_KEY=re_xxxxxxxxxxxx
NOTIFICATION_EMAIL=arthur@seido.pm
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
GITHUB_REPOSITORY=seido-app/seido-app
```

## Etape 4 : Cloner le repo et installer les deps

```bash
mkdir -p ~/.openclaw/workspace-seido-qa
cd ~/.openclaw/workspace-seido-qa

git clone --depth 1 --branch preview https://github.com/seido-app/seido-app.git
cd seido-app

npm ci --ignore-scripts
npx playwright install chromium --with-deps
```

## Etape 5 : Installer la config OpenClaw

```bash
# Copier la config OpenClaw dans le repertoire attendu
cp openclaw/openclaw.json ~/.openclaw/config.json

# Ou utiliser le fichier directement
openclaw agent run --config openclaw/openclaw.json --agent seido-qa --message "Test connection"
```

## Etape 6 : Test manuel

Lancer un run QA complet manuellement :

```bash
cd ~/.openclaw/workspace-seido-qa/seido-app
chmod +x scripts/openclaw-qa.sh
./scripts/openclaw-qa.sh
```

Verifier :
- [ ] Phase 1 : Tests Playwright passent
- [ ] Phase 2 : Exploration autonome s'execute
- [ ] Phase 3 : Rapport genere dans `reports/`
- [ ] Email recu (si RESEND_API_KEY configure)
- [ ] GitHub Issue cree (si anomalies Critical/High)

## Etape 7 : Cron automatique post-deploy

### Option A : Cron OpenClaw (recommande)

```bash
# Toutes les heures, verifier si un nouveau deploy a eu lieu
openclaw cron add \
  --name "seido-qa-hourly" \
  --every "1h" \
  --session isolated \
  --message "Check if a new deployment happened on the preview branch. If TARGET_URL returns a different commit than the last run, execute the full QA pipeline (Phase 1 + 2 + 3). If same commit, skip." \
  --wake now
```

### Option B : Webhook Vercel (post-deploy automatique)

1. Dans Vercel > Settings > Webhooks, ajouter :
   - URL : `http://<IP_DU_VPS>:3001/webhook/vercel-deploy`
   - Events : `deployment.succeeded`
   - Branch filter : `preview`

2. Creer un petit endpoint webhook sur le VPS :

```bash
# Installer le webhook listener
cat > /opt/seido-qa-webhook.sh << 'WEBHOOK_EOF'
#!/bin/bash
# Vercel webhook handler — triggers QA bot on successful preview deploy

DEPLOY_URL=$(echo "$1" | jq -r '.payload.url // empty')
COMMIT_SHA=$(echo "$1" | jq -r '.payload.deployment.meta.githubCommitSha // empty')

if [[ -n "$DEPLOY_URL" ]]; then
  export TARGET_URL="https://${DEPLOY_URL}"
  export COMMIT_SHA="$COMMIT_SHA"

  cd ~/.openclaw/workspace-seido-qa/seido-app
  git fetch origin preview --depth 1
  git reset --hard origin/preview

  ./scripts/openclaw-qa.sh "$TARGET_URL" &
fi
WEBHOOK_EOF
chmod +x /opt/seido-qa-webhook.sh
```

3. Utiliser un micro-serveur webhook (ex: `webhook` package) :

```bash
apt install -y webhook
cat > /etc/webhook.conf << 'CONF_EOF'
[
  {
    "id": "vercel-deploy",
    "execute-command": "/opt/seido-qa-webhook.sh",
    "pass-arguments-to-command": [
      { "source": "entire-payload" }
    ],
    "trigger-rule": {
      "match": {
        "type": "value",
        "value": "deployment.succeeded",
        "parameter": { "source": "payload", "name": "type" }
      }
    }
  }
]
CONF_EOF

# Lancer le webhook listener (port 3001)
webhook -hooks /etc/webhook.conf -port 3001 -verbose &
```

### Option C : Lancement manuel via SSH

```bash
ssh root@<IP_DU_VPS> "cd ~/.openclaw/workspace-seido-qa/seido-app && ./scripts/openclaw-qa.sh"
```

## Etape 8 : Firewall

Configurer le firewall via hPanel ou manuellement :

```bash
# SSH uniquement + webhook port
ufw allow 22/tcp
ufw allow 3001/tcp    # Webhook Vercel (si Option B)
ufw enable
```

Ou via Hostinger API CLI :

```bash
hapi vps firewall create --name "seido-qa"
hapi vps firewall rules create <firewall-id> --port 22 --protocol SSH --source any
hapi vps firewall rules create <firewall-id> --port 3001 --protocol TCP --source any
```

## Etape 9 : Monitoring

Verifier que le bot tourne correctement :

```bash
# Voir les cron jobs OpenClaw
openclaw cron list

# Voir les derniers runs
openclaw cron runs --id seido-qa-hourly

# Voir les logs
tail -f ~/.openclaw/logs/gateway.log

# Lister les rapports
ls -la ~/.openclaw/workspace-seido-qa/seido-app/reports/
```

## Maintenance

### Mise a jour OpenClaw

```bash
# Via le package manager
npm update -g openclaw

# Ou re-installer
curl -fsSL https://raw.githubusercontent.com/pasogott/openclaw-ansible/main/install.sh | bash
```

### Mise a jour du repo SEIDO

Le script `openclaw-qa.sh` fait un `git fetch + reset` automatiquement avant chaque run.

### Rotation des rapports

Ajouter un cron systeme pour nettoyer les vieux rapports :

```bash
# Garder les 30 derniers rapports
echo "0 0 * * 0 find ~/.openclaw/workspace-seido-qa/seido-app/reports/ -name 'qa-report-*.md' -mtime +30 -delete" | crontab -
```

## Troubleshooting

| Probleme | Solution |
|----------|----------|
| Chromium crash OOM | Augmenter swap : `fallocate -l 4G /swapfile && mkswap /swapfile && swapon /swapfile` |
| Tests timeout | Verifier que TARGET_URL est accessible depuis le VPS : `curl -I $TARGET_URL` |
| Auth fails | Verifier les credentials E2E dans `~/.openclaw/.env` |
| Webhook pas recu | Verifier le firewall (port 3001 ouvert) et les logs webhook |
| OpenClaw doctor fail | `openclaw doctor --fix` ou reinstaller |
| Git clone fail | Verifier le GITHUB_TOKEN a les droits `repo` sur le repo prive |
| Rapport pas envoye | Verifier RESEND_API_KEY et que le domaine `seido-app.com` est verifie dans Resend |
