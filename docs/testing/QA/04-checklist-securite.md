# Checklist Sécurité - SEIDO

> **Standard** : OWASP Top 10 (2021)
> **Objectif** : Identifier et prévenir les vulnérabilités de sécurité
> **Niveau** : Tests de base (pas de pentest avancé)

---

## 1. Injection (A03:2021)

### 1.1 SQL Injection

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.1.1 | Inputs sanitized côté serveur | ☐ | |
| 1.1.2 | Utilisation de requêtes paramétrées | ☐ | |
| 1.1.3 | ORM (Supabase) utilisé partout | ☐ | |
| 1.1.4 | Pas de concaténation SQL directe | ☐ | |

**Test manuel** :
```
Essayer dans les champs de recherche :
' OR '1'='1
'; DROP TABLE users;--
```
Résultat attendu : Erreur de validation, pas d'exécution SQL

### 1.2 Cross-Site Scripting (XSS)

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.2.1 | Inputs échappés à l'affichage | ☐ | |
| 1.2.2 | React échappe automatiquement | ☐ | |
| 1.2.3 | Pas de `dangerouslySetInnerHTML` non sanitizé | ☐ | |
| 1.2.4 | CSP headers configurés | ☐ | |

**Test manuel** :
```
Essayer dans les champs texte :
<script>alert('XSS')</script>
<img src="x" onerror="alert('XSS')">
```
Résultat attendu : Texte affiché tel quel, pas d'exécution JS

### 1.3 Command Injection

| # | Test | Status | Notes |
|---|------|--------|-------|
| 1.3.1 | Pas d'exécution de commandes système | ☐ | |
| 1.3.2 | File names sanitized | ☐ | |

---

## 2. Broken Authentication (A07:2021)

### 2.1 Gestion des Sessions

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.1.1 | Session tokens sécurisés (Supabase Auth) | ☐ | |
| 2.1.2 | Expiration de session configurée | ☐ | |
| 2.1.3 | Logout invalide la session | ☐ | |
| 2.1.4 | Session régénérée après login | ☐ | |
| 2.1.5 | Cookies HttpOnly et Secure | ☐ | |
| 2.1.6 | Pas de session ID dans l'URL | ☐ | |

### 2.2 Authentification

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.2.1 | Password minimum 8 caractères | ☐ | |
| 2.2.2 | Password avec complexité | ☐ | |
| 2.2.3 | Brute force protection (rate limiting) | ☐ | |
| 2.2.4 | Erreur générique "Invalid credentials" | ☐ | |
| 2.2.5 | Email confirmation requis | ☐ | |
| 2.2.6 | Reset password via email uniquement | ☐ | |
| 2.2.7 | Token reset expire rapidement (< 1h) | ☐ | |

### 2.3 Multi-Factor (si applicable)

| # | Test | Status | Notes |
|---|------|--------|-------|
| 2.3.1 | 2FA disponible (optionnel) | ☐ | |
| 2.3.2 | Recovery codes | ☐ | |

---

## 3. Sensitive Data Exposure (A02:2021)

### 3.1 Données en Transit

| # | Test | Status | Notes |
|---|------|--------|-------|
| 3.1.1 | HTTPS forcé (HTTP redirige vers HTTPS) | ☐ | |
| 3.1.2 | TLS 1.2+ | ☐ | |
| 3.1.3 | HSTS header configuré | ☐ | |
| 3.1.4 | Certificat SSL valide | ☐ | |

### 3.2 Données au Repos

| # | Test | Status | Notes |
|---|------|--------|-------|
| 3.2.1 | Passwords hashés (bcrypt/argon2) | ☐ | |
| 3.2.2 | Données sensibles chiffrées en DB | ☐ | |
| 3.2.3 | Backups chiffrés | ☐ | |

### 3.3 Fichiers Sensibles

| # | Test | Status | Notes |
|---|------|--------|-------|
| 3.3.1 | `.env` non exposé publiquement | ☐ | |
| 3.3.2 | `.env` dans `.gitignore` | ☐ | |
| 3.3.3 | Pas de credentials dans le code | ☐ | |
| 3.3.4 | Pas de clés API dans le frontend | ☐ | |
| 3.3.5 | `robots.txt` bloque les pages sensibles | ☐ | |
| 3.3.6 | Source maps désactivées en prod | ☐ | |

---

## 4. Broken Access Control (A01:2021)

### 4.1 Authorization

| # | Test | Status | Notes |
|---|------|--------|-------|
| 4.1.1 | Vérification rôle côté serveur | ☐ | |
| 4.1.2 | RLS Supabase activé | ☐ | |
| 4.1.3 | Pas d'IDOR (Insecure Direct Object Reference) | ☐ | |
| 4.1.4 | User ne peut accéder qu'à ses données | ☐ | |
| 4.1.5 | Admin routes protégées | ☐ | |
| 4.1.6 | API routes authentifiées | ☐ | |

**Test IDOR** :
```
1. Connecté en tant que User A
2. Noter l'ID d'un objet de User A (ex: /intervention/123)
3. Se connecter en tant que User B
4. Accéder à /intervention/123
5. Résultat attendu : 403 Forbidden
```

### 4.2 Tests par Rôle

| Rôle | Peut accéder | Ne peut PAS accéder | Status |
|------|--------------|---------------------|--------|
| Gestionnaire | `/gestionnaire/*` | `/admin/*`, données autres teams | ☐ |
| Prestataire | `/prestataire/*` | `/gestionnaire/*`, `/admin/*` | ☐ |
| Locataire | `/locataire/*` | `/gestionnaire/*`, `/prestataire/*` | ☐ |
| Admin | Tout | - | ☐ |

### 4.3 Vérifications RLS Supabase

| # | Test | Status |
|---|------|--------|
| 4.3.1 | `users` : visible uniquement par owner ou team | ☐ |
| 4.3.2 | `buildings` : visible par team members | ☐ |
| 4.3.3 | `lots` : visible par team members | ☐ |
| 4.3.4 | `interventions` : visible par team + assignés | ☐ |
| 4.3.5 | `notifications` : visible par recipient | ☐ |
| 4.3.6 | `contracts` : visible par team | ☐ |

---

## 5. Security Misconfiguration (A05:2021)

### 5.1 Headers de Sécurité

Vérifier avec https://securityheaders.com/

| Header | Valeur Attendue | Status |
|--------|-----------------|--------|
| `X-Content-Type-Options` | `nosniff` | ☐ |
| `X-Frame-Options` | `DENY` ou `SAMEORIGIN` | ☐ |
| `X-XSS-Protection` | `1; mode=block` | ☐ |
| `Content-Security-Policy` | Configuré | ☐ |
| `Strict-Transport-Security` | `max-age=31536000` | ☐ |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ☐ |
| `Permissions-Policy` | Configuré | ☐ |

### 5.2 Configuration Serveur

| # | Test | Status |
|---|------|--------|
| 5.2.1 | Directory listing désactivé | ☐ |
| 5.2.2 | Stack traces non exposées | ☐ |
| 5.2.3 | Debug mode désactivé en prod | ☐ |
| 5.2.4 | Default credentials changés | ☐ |
| 5.2.5 | Ports non utilisés fermés | ☐ |

### 5.3 CORS

| # | Test | Status |
|---|------|--------|
| 5.3.1 | CORS configuré (pas de `*` en prod) | ☐ |
| 5.3.2 | Origins autorisées listées explicitement | ☐ |
| 5.3.3 | Credentials only avec origins spécifiques | ☐ |

---

## 6. Vulnerable Components (A06:2021)

### 6.1 Audit npm

Exécuter :
```bash
npm audit
```

| Sévérité | Count | Corrigé |
|----------|-------|---------|
| Critical | | ☐ |
| High | | ☐ |
| Moderate | | ☐ |
| Low | | ☐ |

**Objectif** : 0 Critical, 0 High

### 6.2 Dépendances

| # | Test | Status |
|---|------|--------|
| 6.2.1 | Dépendances à jour | ☐ |
| 6.2.2 | Pas de packages dépréciés | ☐ |
| 6.2.3 | License check OK | ☐ |
| 6.2.4 | Snyk ou Dependabot activé | ☐ |

---

## 7. CSRF (Cross-Site Request Forgery)

| # | Test | Status | Notes |
|---|------|--------|-------|
| 7.1 | Tokens CSRF sur formulaires | ☐ | |
| 7.2 | SameSite cookies | ☐ | |
| 7.3 | Origin/Referer validation | ☐ | |
| 7.4 | Double submit cookie | ☐ | |

**Test manuel** :
1. Créer une page HTML externe avec un form POST vers l'app
2. Soumettre le formulaire
3. Résultat attendu : Requête rejetée

---

## 8. File Upload Security

| # | Test | Status | Notes |
|---|------|--------|-------|
| 8.1 | Validation type MIME | ☐ | |
| 8.2 | Validation extension | ☐ | |
| 8.3 | Limite taille fichier | ☐ | |
| 8.4 | Rename fichiers uploadés | ☐ | |
| 8.5 | Stockage hors webroot | ☐ | |
| 8.6 | Scan antivirus (optionnel) | ☐ | |
| 8.7 | Pas d'exécution de fichiers uploadés | ☐ | |

**Test** :
```
Essayer d'uploader :
- fichier.php (devrait être rejeté)
- fichier.exe (devrait être rejeté)
- fichier.svg avec script (devrait être sanitizé)
- fichier > 10MB (devrait être rejeté)
```

---

## 9. Logging et Monitoring

| # | Test | Status |
|---|------|--------|
| 9.1 | Logins échoués logués | ☐ |
| 9.2 | Actions sensibles logées | ☐ |
| 9.3 | Pas de données sensibles dans logs | ☐ |
| 9.4 | Logs centralisés et sécurisés | ☐ |
| 9.5 | Alertes sur activités suspectes | ☐ |

---

## 10. Checklist Rapide

Pour chaque déploiement, vérifier :

```
☐ npm audit : 0 critical/high
☐ HTTPS actif
☐ .env non exposé
☐ Debug mode off
☐ Source maps off
☐ Security headers OK
☐ RLS Supabase actif
☐ Logs configurés
```

---

## Outils Recommandés

| Outil | Usage | URL |
|-------|-------|-----|
| Security Headers | Check headers | https://securityheaders.com/ |
| SSL Labs | Check TLS | https://www.ssllabs.com/ssltest/ |
| npm audit | Check deps | `npm audit` |
| OWASP ZAP | Scan auto | https://www.zaproxy.org/ |
| Snyk | Monitoring | https://snyk.io/ |

---

## Résumé des Vulnérabilités

| Catégorie | Critical | High | Medium | Low |
|-----------|----------|------|--------|-----|
| Injection | | | | |
| Authentication | | | | |
| Data Exposure | | | | |
| Access Control | | | | |
| Misconfiguration | | | | |
| Components | | | | |
| **TOTAL** | | | | |

---

**Testeur** : _________________
**Date** : _________________
**npm audit clean** : ☐ Yes / ☐ No
