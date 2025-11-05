# PLAN DE TEST MANUEL EXHAUSTIF - SEIDO
**Plateforme de Gestion Immobilière Multi-Rôles**

---

## 📋 INFORMATIONS GÉNÉRALES

**Application** : SEIDO (Système de gestion immobilière)
**Version** : Production Ready
**Date de création** : 2025-10-30
**Stack technique** : Next.js 15.2.4, React 19, TypeScript 5, Supabase PostgreSQL
**Environnements de test** :
- **Développement** : http://localhost:3000
- **Staging** : [URL à définir]
- **Production** : [URL à définir]

**Rôles utilisateurs** : 5 rôles
- **Admin** : Administration système
- **Gestionnaire** : Gestion immeubles, lots, interventions, contacts
- **Prestataire** : Exécution interventions, soumission devis
- **Locataire** : Demandes interventions, validation travaux
- **Proprietaire** : Consultation read-only

**Objectif du plan** : Garantir zéro bug bloquant/majeur avant release en couvrant tous les parcours utilisateurs, permissions, états UI, notifications, et intégrations.

---

## 📊 TABLE DES MATIÈRES

1. [Arbre Décisionnel Global des Parcours](#1-arbre-décisionnel-global-des-parcours)
2. [Checklists Détaillées par Écran](#2-checklists-détaillées-par-écran)
   - 2.1 [Authentification & Onboarding](#21-authentification--onboarding)
   - 2.2 [Admin](#22-admin)
   - 2.3 [Gestionnaire](#23-gestionnaire)
   - 2.4 [Prestataire](#24-prestataire)
   - 2.5 [Locataire](#25-locataire)
   - 2.6 [Proprietaire](#26-proprietaire)
3. [Matrice de Couverture](#3-matrice-de-couverture)
4. [Gabarit de Rapport de Bug](#4-gabarit-de-rapport-de-bug)
5. [Questions Ouvertes & Hypothèses](#5-questions-ouvertes--hypothèses)

---

# 1. ARBRE DÉCISIONNEL GLOBAL DES PARCOURS

## 1.1 Vue d'Ensemble des Flux Principaux

```
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION SEIDO                          │
│              (Plateforme Gestion Immobilière)               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │   FLUX 1: AUTHENTIFICATION           │
        │   (Point d'entrée obligatoire)        │
        └───────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │                                       │
        ▼                                       ▼
    [NOUVEAU]                              [EXISTANT]
        │                                       │
        ▼                                       ▼
   F1.1-1.8: Inscription/Login            F1.2: Login
   → Invitation (F1.1)                    → Session
   → Signup (F1.1)                        → Role Detection
   → Set Password (F1.5)                  → Password Reset (F1.4)
   → Email Confirm (F1.6)
   → OAuth Callback (F1.7)
   → Signup Success (F1.8)
        │                                       │
        └───────────────────┬───────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │   FLUX 2: ONBOARDING & SETUP         │
        │   (Première connexion)                │
        └───────────────────────────────────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │ Vérification Équipe                   │
        │ ✓ Équipe OK → Dashboard rôle          │
        │ ✗ Pas d'équipe → /unauthorized        │
        └───────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │  Role-Based Redirect  │
                └───────────┬───────────┘
                            │
        ┌───────┬───────┬───┴───┬───────┬───────┐
        │       │       │       │       │       │
        ▼       ▼       ▼       ▼       ▼       ▼
     ADMIN   GEST.  PREST.  LOCAT. PROP.   [Logout]
        │       │       │       │       │
        │       │       │       │       └─→ F1.3: Logout
        │       │       │       │
        │       │       │       └─→ Parcours Locataire
        │       │       │           ├─→ F5: Workflow Interventions
        │       │       │           ├─→ F6: Conversations
        │       │       │           ├─→ F7: Documents (view)
        │       │       │           ├─→ F8: PWA & Push Notifs
        │       │       │           └─→ F9: Recherche
        │       │       │
        │       │       └─→ Parcours Prestataire
        │       │           ├─→ F5: Workflow Interventions
        │       │           ├─→ F6: Conversations
        │       │           ├─→ F8: PWA & Push Notifs
        │       │           └─→ F9: Recherche
        │       │
        │       └─→ Parcours Gestionnaire
        │           ├─→ F3: Gestion Biens (Buildings/Lots)
        │           ├─→ F4: Gestion Contacts (Invite/Manage)
        │           ├─→ F5: Workflow Interventions (Approval/Quotes/Planning)
        │           ├─→ F6: Communication (Conversations multi-threads)
        │           ├─→ F7: Gestion Documents (Upload/Share/Preview)
        │           ├─→ F8: PWA & Push Notifications
        │           └─→ F9: Recherche & Filtrage Global
        │
        └─→ Administration Système
```

---

## 1.2 FLUX 1: AUTHENTIFICATION (Tous rôles)

### F1.1 - Invitation & Signup

```
[START] Gestionnaire invite contact
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ API: POST /api/invite-user                                  │
│ Input: { email, role, first_name, last_name, team_id }     │
│ Actions:                                                     │
│   1. Vérifier email unique dans team                        │
│   2. Générer invitation_token (UUID)                         │
│   3. Créer user (auth_user_id=NULL, is_active=false)       │
│   4. Créer user_invitation (status=pending, expires_at=+7j) │
│   5. Envoyer email avec lien magique                        │
└─────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS] Email envoyé
    │   │ Notification: Gestionnaire "Invitation envoyée à {email}"
    │   │ Activity Log: action=invite_user, entity=user_invitation
    │   │
    │   ▼
    │   User reçoit email
    │   │
    │   ├─→ [USER CLIQUE LIEN] /auth/signup?token={UUID}
    │   │   │
    │   │   ▼
    │   │   ┌─────────────────────────────────────┐
    │   │   │ Page: /auth/signup                  │
    │   │   │ Validation token:                   │
    │   │   │  ✓ Token existe                     │
    │   │   │  ✓ status = pending                 │
    │   │   │  ✓ expires_at > now()               │
    │   │   └─────────────────────────────────────┘
    │   │       │
    │   │       ├─→ [TOKEN VALIDE] Affiche formulaire
    │   │       │   │ Fields: password (min 8 char), confirm password
    │   │       │   │
    │   │       │   ▼
    │   │       │   User soumet formulaire
    │   │       │   │
    │   │       │   ▼
    │   │       │   ┌─────────────────────────────────┐
    │   │       │   │ API: POST /api/accept-invitation│
    │   │       │   │ Actions:                        │
    │   │       │   │  1. Créer auth Supabase         │
    │   │       │   │  2. Lier users.auth_user_id     │
    │   │       │   │  3. Update invitation accepted  │
    │   │       │   │  4. Update users.is_active=true │
    │   │       │   │  5. Créer team_member           │
    │   │       │   └─────────────────────────────────┘
    │   │       │       │
    │   │       │       ├─→ [SUCCÈS] Redirect /auth/signup-success
    │   │       │       │   │ Notification: User "Bienvenue sur SEIDO"
    │   │       │       │   │ Activity Log: action=accept_invitation
    │   │       │       │   │
    │   │       │       │   ▼
    │   │       │       │   [Modal Bienvenue] → Redirect /dashboard
    │   │       │       │   │
    │   │       │       │   └─→ F1.2 Login automatique (session créée)
    │   │       │       │
    │   │       │       └─→ [ERREUR]
    │   │       │           ├─→ Email déjà utilisé → Toast "Compte existe déjà"
    │   │       │           ├─→ Erreur Supabase → Toast "Erreur création compte"
    │   │       │           └─→ Password faible → Inline error "Min 8 caractères"
    │   │       │
    │   │       ├─→ [TOKEN EXPIRÉ] expires_at < now()
    │   │       │   │ Affiche: Alert "Invitation expirée"
    │   │       │   │ CTA: "Demander nouvelle invitation"
    │   │       │   └─→ Redirect /auth/login
    │   │       │
    │   │       └─→ [TOKEN INVALIDE/INTROUVABLE]
    │   │           │ Affiche: Alert "Lien invalide ou déjà utilisé"
    │   │           └─→ Redirect /auth/login
    │   │
    │   └─→ [USER IGNORE EMAIL] Après 7 jours
    │       │ Invitation status reste "pending"
    │       │ Gestionnaire peut réinviter: POST /api/resend-invitation
    │       └─→ Nouveau token généré, expires_at prolongé
    │
    └─→ [ERREUR API]
        ├─→ Email déjà invité → Toast "Invitation déjà envoyée"
        ├─→ Email invalide → Inline error "Format email invalide"
        ├─→ Role non autorisé → Toast "Rôle non valide"
        └─→ Erreur serveur → Toast "Erreur envoi invitation"
```

**Rôles concernés** : Admin (peut inviter tous rôles), Gestionnaire (peut inviter G/P/L/Prop)
**Permissions** : RLS vérifie `is_team_manager(team_id)`
**Notifications générées** :
- Gestionnaire: "Invitation envoyée à {email}"
- User (après signup): "Bienvenue sur SEIDO"

**Activity Logs** :
- `action=invite_user` (gestionnaire)
- `action=accept_invitation` (user)

---

### F1.2 - Login (Utilisateur Existant)

```
[START] User accède /auth/login
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Page: /auth/login                                           │
│ Formulaire: email, password                                 │
│ Options: [ ] Remember me, "Mot de passe oublié ?"          │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
User soumet credentials
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ API: Supabase Auth signInWithPassword()                     │
│ Validations:                                                 │
│  - Email format valide (Zod)                                │
│  - Password non vide                                         │
└─────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS] Auth OK
    │   │
    │   ▼
    │   Création session (JWT token, cookie httpOnly)
    │   │
    │   ▼
    │   ┌─────────────────────────────────────┐
    │   │ Redirect /dashboard                 │
    │   │ Server détecte rôle via profile     │
    │   └─────────────────────────────────────┘
    │       │
    │       ▼
    │   getServerAuthContext() appelé
    │   │ 1. Vérifier session
    │   │ 2. Charger profile (users table)
    │   │ 3. Charger teams (team_members)
    │   │ 4. Vérifier au moins 1 équipe
    │   │
    │   ├─→ [ÉQUIPE OK] Redirect final /{role}/dashboard
    │   │   │ Notification: "Connexion réussie"
    │   │   │ Activity Log: action=login, ip_address, user_agent
    │   │   │
    │   │   ├─→ role=admin → /admin/dashboard
    │   │   ├─→ role=gestionnaire → /gestionnaire/dashboard
    │   │   ├─→ role=prestataire → /prestataire/dashboard
    │   │   ├─→ role=locataire → /locataire/dashboard
    │   │   └─→ role=proprietaire → /proprietaire/dashboard
    │   │
    │   └─→ [PAS D'ÉQUIPE] user.team_id NULL ou team_members vide
    │       │ Redirect /auth/unauthorized?reason=no_team
    │       │ Affiche: "Aucune équipe assignée - Contactez administrateur"
    │       └─→ [END - Bloqué]
    │
    ├─→ [ERREUR AUTH]
    │   ├─→ Credentials invalides
    │   │   │ Toast: "Email ou mot de passe incorrect"
    │   │   │ Compteur tentatives +1
    │   │   │
    │   │   ├─→ [< 5 tentatives] Reste sur /auth/login
    │   │   │
    │   │   └─→ [≥ 5 tentatives] Rate limiting (si configuré)
    │   │       │ Toast: "Trop de tentatives - Réessayez dans 15 min"
    │   │       │ Activity Log: action=login_failed, status=failure
    │   │       └─→ Blocage temporaire IP/email
    │   │
    │   ├─→ Compte désactivé (is_active=false)
    │   │   │ Toast: "Compte désactivé - Contactez administrateur"
    │   │   └─→ Reste sur /auth/login
    │   │
    │   ├─→ Email non vérifié (si email verification activée)
    │   │   │ Toast: "Veuillez vérifier votre email"
    │   │   └─→ CTA "Renvoyer email de vérification"
    │   │
    │   └─→ Erreur serveur
    │       │ Toast: "Erreur de connexion - Réessayez"
    │       └─→ Reste sur /auth/login
    │
    └─→ [VALIDATION FRONTEND ÉCHOUE]
        ├─→ Email vide → Inline error "Email requis"
        ├─→ Email invalide → Inline error "Format email invalide"
        ├─→ Password vide → Inline error "Mot de passe requis"
        └─→ Form disabled jusqu'à correction
```

**Options supplémentaires** :
- **Remember me** : Prolonge durée session (7j → 30j)
- **Mot de passe oublié** : → F1.4 Reset Password

**Rôles concernés** : Tous
**Permissions** : Publique (page login accessible sans auth)
**Notifications générées** : "Connexion réussie" (toast éphémère)
**Activity Logs** : `action=login` (success) ou `action=login_failed` (failure)

---

### F1.3 - Logout

```
[START] User clique "Se déconnecter" (header menu)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ API: GET /auth/logout                                       │
│ Actions:                                                     │
│  1. supabase.auth.signOut()                                 │
│  2. Suppression cookies session                             │
│  3. Clear localStorage (cache client)                       │
└─────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS]
    │   │ Toast: "Déconnexion réussie"
    │   │ Activity Log: action=logout
    │   │
    │   ▼
    │   Redirect /auth/login
    │   │ Session cleared
    │   │ Tentative accès /{role}/* → Redirect /auth/login?reason=auth_error
    │   └─→ [END]
    │
    └─→ [ERREUR] (rare)
        │ Toast: "Erreur déconnexion - Réessayez"
        │ Bouton "Réessayer" disponible
        └─→ Reste sur page courante
```

**Rôles concernés** : Tous
**Permissions** : Authentifié uniquement
**Notifications générées** : "Déconnexion réussie"
**Activity Logs** : `action=logout`

---

### F1.4 - Reset Password

```
[START] User clique "Mot de passe oublié ?" sur /auth/login
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Page: /auth/reset-password                                  │
│ Formulaire: email                                            │
│ Description: "Entrez votre email pour recevoir lien reset"  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
User soumet email
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ API: POST /api/reset-password                               │
│ Actions:                                                     │
│  1. Vérifier email existe (users.email)                     │
│  2. Appeler Supabase resetPasswordForEmail()                │
│  3. Email envoyé avec lien magique                          │
└─────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS] (même si email n'existe pas - sécurité)
    │   │ Toast: "Email envoyé si compte existe"
    │   │ Redirect /auth/login
    │   │ Activity Log: action=password_reset_requested
    │   │
    │   ▼
    │   User reçoit email (si compte existe)
    │   │ Lien: /auth/update-password?token={reset_token}
    │   │
    │   ├─→ [USER CLIQUE LIEN]
    │   │   │
    │   │   ▼
    │   │   ┌─────────────────────────────────────┐
    │   │   │ Page: /auth/update-password         │
    │   │   │ Validation token Supabase           │
    │   │   │ Formulaire: new_password, confirm   │
    │   │   └─────────────────────────────────────┘
    │   │       │
    │   │       ├─→ [TOKEN VALIDE]
    │   │       │   │ User soumet nouveau password
    │   │       │   │
    │   │       │   ▼
    │   │       │   ┌─────────────────────────────────┐
    │   │       │   │ API: POST /api/change-password  │
    │   │       │   │ Actions:                        │
    │   │       │   │  1. Vérifier password strength  │
    │   │       │   │  2. Update auth Supabase        │
    │   │       │   │  3. Update users.password_set   │
    │   │       │   └─────────────────────────────────┘
    │   │       │       │
    │   │       │       ├─→ [SUCCÈS]
    │   │       │       │   │ Toast: "Mot de passe modifié"
    │   │       │       │   │ Activity Log: action=password_changed
    │   │       │       │   │ Redirect /auth/login
    │   │       │       │   └─→ User doit se reconnecter
    │   │       │       │
    │   │       │       └─→ [ERREUR]
    │   │       │           ├─→ Password faible → "Min 8 caractères"
    │   │       │           ├─→ Passwords différents → "Mots de passe différents"
    │   │       │           └─→ Erreur serveur → "Erreur modification"
    │   │       │
    │   │       └─→ [TOKEN EXPIRÉ/INVALIDE]
    │   │           │ Alert: "Lien expiré ou invalide"
    │   │           │ CTA: "Demander nouveau lien"
    │   │           └─→ Redirect /auth/reset-password
    │   │
    │   └─→ [USER IGNORE EMAIL]
    │       │ Token expire après 1h (Supabase default)
    │       └─→ Doit redemander reset
    │
    └─→ [ERREUR API]
        ├─→ Email vide → Inline error "Email requis"
        ├─→ Email invalide → Inline error "Format email invalide"
        └─→ Erreur serveur → Toast "Erreur - Réessayez"
```

**Rôles concernés** : Tous (publique)
**Permissions** : Aucune (page accessible sans auth)
**Notifications générées** : "Email envoyé si compte existe" (volontairement vague)
**Activity Logs** : `action=password_reset_requested`, `action=password_changed`

**Sécurité** :
- Ne pas révéler si email existe (timing attack prevention)
- Token reset expire après 1h
- Rate limiting sur demandes reset (max 3/heure par IP)

---

### F1.5 - Set Password (Définir Nouveau Mot de Passe)

```
[START] User accède /auth/set-password?token={UUID}
    │ (Contexte: Nouveau compte créé, premier login, ou réinitialisation)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Page: /auth/set-password                                    │
│ Validation token (query param)                              │
└─────────────────────────────────────────────────────────────┘
    │
    ├─→ [TOKEN VALIDE]
    │   │ Affiche formulaire
    │   │
    │   ▼
    │   ┌─────────────────────────────────────────────────────┐
    │   │ Formulaire:                                         │
    │   │  • new_password* (password, min 8 car)             │
    │   │  • confirm_password* (password)                     │
    │   │                                                      │
    │   │ Password Strength Indicator:                        │
    │   │  ⚪ Faible (< 8 caractères)                        │
    │   │  🟡 Moyen (8+ car, lettres uniquement)             │
    │   │  🟢 Fort (8+ car, lettres + chiffres + symboles)   │
    │   └─────────────────────────────────────────────────────┘
    │       │
    │       ▼
    │   User soumet formulaire
    │       │
    │       ▼
    │   ┌─────────────────────────────────────────────────────┐
    │   │ Validations Frontend (Zod):                        │
    │   │  ✓ new_password min 8 caractères                   │
    │   │  ✓ confirm_password matches new_password           │
    │   │  ✓ Password contient lettre + chiffre             │
    │   └─────────────────────────────────────────────────────┘
    │       │
    │       ├─→ [VALIDATION OK]
    │       │   │
    │       │   ▼
    │       │   ┌─────────────────────────────────────────────┐
    │       │   │ API: POST /api/set-password                │
    │       │   │ Input: { token, new_password }             │
    │       │   │ Actions:                                    │
    │       │   │  1. Vérifier token validité                │
    │       │   │  2. Update Supabase Auth password          │
    │       │   │  3. Update users.password_set_at (NOW())   │
    │       │   │  4. Invalider token (one-time use)         │
    │       │   │  5. Créer session automatique (auto-login) │
    │       │   └─────────────────────────────────────────────┘
    │       │       │
    │       │       ├─→ [SUCCÈS]
    │       │       │   │ Toast: "Mot de passe défini avec succès"
    │       │       │   │ Activity Log: action=password_set
    │       │       │   │ Session créée → JWT token
    │       │       │   │
    │       │       │   ▼
    │       │       │   Redirect /{role}/dashboard
    │       │       │   │ User connecté automatiquement
    │       │       │   └─→ [END - Succès]
    │       │       │
    │       │       └─→ [ERREUR API]
    │       │           ├─→ Token invalide/expiré
    │       │           │   │ Alert: "Lien invalide ou expiré"
    │       │           │   └─→ Redirect /auth/login
    │       │           │
    │       │           ├─→ Password trop faible (backend reject)
    │       │           │   │ Toast: "Password trop faible - Min 8 car"
    │       │           │   └─→ Reste sur /auth/set-password
    │       │           │
    │       │           └─→ Erreur serveur
    │       │               │ Toast: "Erreur définition password"
    │       │               └─→ Reste sur /auth/set-password
    │       │
    │       └─→ [VALIDATION FRONTEND ÉCHOUE]
    │           ├─→ Password < 8 caractères
    │           │   │ Inline error: "Minimum 8 caractères requis"
    │           │   └─→ Bouton submit disabled
    │           │
    │           ├─→ Passwords différents
    │           │   │ Inline error: "Mots de passe différents"
    │           │   └─→ Bouton submit disabled
    │           │
    │           └─→ Password trop simple
    │               │ Warning: "Ajoutez chiffres/symboles (recommandé)"
    │               └─→ Submit enabled mais indicateur 🟡
    │
    ├─→ [TOKEN EXPIRÉ] (checked server-side)
    │   │ Alert: "Ce lien a expiré"
    │   │ CTA: "Demander nouveau lien"
    │   └─→ Redirect /auth/reset-password
    │
    ├─→ [TOKEN DÉJÀ UTILISÉ] (one-time use check)
    │   │ Alert: "Ce lien a déjà été utilisé"
    │   │ Info: "Connectez-vous avec votre mot de passe"
    │   └─→ Redirect /auth/login
    │
    └─→ [TOKEN INVALIDE/ABSENT]
        │ Alert: "Lien invalide - Vérifiez l'URL"
        └─→ Redirect /auth/login
```

**Rôles concernés** : Tous (nouveau compte ou reset)
**Permissions** : Publique (URL avec token)
**Notifications générées** : "Mot de passe défini avec succès"
**Activity Logs** : `action=password_set`

**Cas d'usage** :
1. **Premier login** après invitation → Set password → Auto-login
2. **Reset password** via lien email → Nouveau password → Redirect login
3. **Compte créé par admin** → User reçoit lien → Set password

**Sécurité** :
- Token one-time use (invalidé après utilisation)
- Password strength enforced (min 8 char, lettre+chiffre)
- Auto-login sécurisé après set (session Supabase)
- Rate limiting sur endpoint (max 10 tentatives/heure par IP)

---

### F1.6 - Email Confirmation (Vérification Email)

```
[START] User accède /auth/confirm?token={confirmation_token}
    │ (Contexte: Lien cliqué depuis email de vérification)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Page: /auth/confirm                                         │
│ Loading state pendant validation token                      │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ API: GET /api/confirm-email?token={confirmation_token}     │
│ Validations:                                                 │
│  1. Token existe dans email_confirmations table             │
│  2. Token non expiré (< 24h)                                │
│  3. Token non déjà utilisé (status = pending)               │
│  4. User lié au token existe                                │
└─────────────────────────────────────────────────────────────┘
    │
    ├─→ [TOKEN VALIDE & CONFIRMÉ]
    │   │
    │   ▼
    │   ┌─────────────────────────────────────────────────────┐
    │   │ Actions Backend:                                    │
    │   │  1. Update users.email_verified_at = NOW()         │
    │   │  2. Update email_confirmations.status = confirmed  │
    │   │  3. Update email_confirmations.confirmed_at        │
    │   │  4. Log activity: action=email_confirmed           │
    │   └─────────────────────────────────────────────────────┘
    │       │
    │       ▼
    │   ┌─────────────────────────────────────────────────────┐
    │   │ Affichage:                                          │
    │   │  ✓ Icône succès (checkmark)                        │
    │   │  📧 "Email confirmé avec succès !"                 │
    │   │  "Vous pouvez maintenant vous connecter"           │
    │   │                                                      │
    │   │ Bouton: "Se connecter" (primary)                   │
    │   └─────────────────────────────────────────────────────┘
    │       │
    │       ├─→ [USER CLIQUE "Se connecter"]
    │       │   │ Redirect /auth/login
    │       │   │ (User peut se connecter normalement)
    │       │   └─→ [END - Succès]
    │       │
    │       └─→ [USER IGNORE] Auto-redirect après 10s
    │           └─→ Redirect /auth/login
    │
    ├─→ [TOKEN DÉJÀ CONFIRMÉ]
    │   │ Affichage:
    │   │  ℹ️ "Cet email a déjà été confirmé"
    │   │  "Connectez-vous pour accéder à votre compte"
    │   │
    │   │ Bouton: "Se connecter"
    │   └─→ Redirect /auth/login (après 5s ou clic)
    │
    ├─→ [TOKEN EXPIRÉ] (> 24h)
    │   │ Affichage:
    │   │  ⚠️ "Ce lien de confirmation a expiré"
    │   │  "Les liens sont valides 24h"
    │   │
    │   │ CTA: "Renvoyer email de confirmation"
    │   │ Formulaire: email (pré-rempli si dispo)
    │   │
    │   ├─→ [USER SOUMET EMAIL]
    │   │   │
    │   │   ▼
    │   │   ┌─────────────────────────────────────────────────┐
    │   │   │ API: POST /api/resend-confirmation             │
    │   │   │ Actions:                                        │
    │   │   │  1. Générer nouveau token                      │
    │   │   │  2. Créer email_confirmations (expires +24h)   │
    │   │   │  3. Envoyer email avec nouveau lien            │
    │   │   └─────────────────────────────────────────────────┘
    │   │       │
    │   │       ├─→ [SUCCÈS]
    │   │       │   │ Toast: "Email envoyé - Vérifiez boîte"
    │   │       │   └─→ Redirect /auth/login
    │   │       │
    │   │       └─→ [ERREUR]
    │   │           ├─→ Email non trouvé
    │   │           │   │ Toast: "Compte introuvable"
    │   │           │   └─→ Redirect /auth/login
    │   │           │
    │   │           └─→ Rate limit (max 3/heure)
    │   │               │ Toast: "Trop de demandes - Réessayez +tard"
    │   │               └─→ Bouton disabled 15min
    │   │
    │   └─→ [USER CLIQUE "Connexion"]
    │       └─→ Redirect /auth/login (peut se connecter même sans verif)
    │
    └─→ [TOKEN INVALIDE/INTROUVABLE]
        │ Affichage:
        │  ❌ "Lien de confirmation invalide"
        │  "Vérifiez l'URL ou demandez nouveau lien"
        │
        │ CTA: "Se connecter" ou "Renvoyer email"
        └─→ Options: /auth/login ou form resend
```

**Rôles concernés** : Tous (vérification optionnelle/obligatoire selon config)
**Permissions** : Publique (URL avec token)
**Notifications générées** : "Email confirmé avec succès"
**Activity Logs** : `action=email_confirmed`, `action=email_confirmation_resent`

**Cas d'usage** :
1. **Email verification obligatoire** : User ne peut pas utiliser app tant que non vérifié
2. **Email verification optionnelle** : User peut utiliser app, mais certaines features limitées
3. **Changement email** : User doit confirmer nouvel email

**Sécurité** :
- Token expire après 24h
- One-time use (status = pending → confirmed)
- Rate limiting sur resend (max 3/heure par email)
- Log IP address pour audit

---

### F1.7 - OAuth Callback (Google/Azure AD)

```
[START] User clique "Se connecter avec Google/Azure" sur /auth/login
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Supabase Auth: signInWithOAuth({ provider: 'google' })     │
│ Redirect vers OAuth provider avec state parameter          │
│ (state = random UUID pour CSRF protection)                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
User s'authentifie sur provider (Google/Azure)
    │
    ├─→ [USER APPROUVE]
    │   │ Provider redirect vers callback URL
    │   │ URL: /auth/callback?code={auth_code}&state={UUID}
    │   │
    │   ▼
    │   ┌─────────────────────────────────────────────────────┐
    │   │ Page: /auth/callback                                │
    │   │ Server Component (Next.js Route Handler)            │
    │   └─────────────────────────────────────────────────────┘
    │       │
    │       ▼
    │   ┌─────────────────────────────────────────────────────┐
    │   │ Validations:                                        │
    │   │  1. Vérifier state parameter (anti-CSRF)           │
    │   │  2. Exchange code pour access_token (Supabase)     │
    │   │  3. Récupérer user info depuis provider            │
    │   │     → email, name, avatar_url                      │
    │   └─────────────────────────────────────────────────────┘
    │       │
    │       ├─→ [STATE VALIDE & TOKEN OK]
    │       │   │
    │       │   ▼
    │       │   ┌─────────────────────────────────────────────┐
    │       │   │ Vérifier si user existe:                   │
    │       │   │ SELECT * FROM users                         │
    │       │   │ WHERE auth_user_id = {oauth_user_id}       │
    │       │   └─────────────────────────────────────────────┘
    │       │       │
    │       │       ├─→ [USER EXISTE] (Returning user)
    │       │       │   │
    │       │       │   ▼
    │       │       │   ┌─────────────────────────────────────┐
    │       │       │   │ Actions:                            │
    │       │       │   │  1. Update users.last_login_at      │
    │       │       │   │  2. Update avatar si changé         │
    │       │       │   │  3. Créer session Supabase          │
    │       │       │   │  4. Log: action=oauth_login         │
    │       │       │   └─────────────────────────────────────┘
    │       │       │       │
    │       │       │       ▼
    │       │       │   Redirect /{role}/dashboard
    │       │       │   │ Toast: "Connexion réussie"
    │       │       │   └─→ [END - Login Succès]
    │       │       │
    │       │       └─→ [USER N'EXISTE PAS] (First-time OAuth)
    │       │           │
    │       │           ▼
    │       │           ┌─────────────────────────────────────┐
    │       │           │ Vérifier si email est invité:      │
    │       │           │ SELECT * FROM user_invitations      │
    │       │           │ WHERE email = {oauth_email}         │
    │       │           │ AND status = pending                │
    │       │           └─────────────────────────────────────┘
    │       │               │
    │       │               ├─→ [INVITATION EXISTE]
    │       │               │   │ (Email préalablement invité par gestionnaire)
    │       │               │   │
    │       │               │   ▼
    │       │               │   ┌─────────────────────────────┐
    │       │               │   │ Auto-provisioning compte:   │
    │       │               │   │  1. Créer/lier users        │
    │       │               │   │     auth_user_id = oauth_id │
    │       │               │   │     role (from invitation)  │
    │       │               │   │  2. Créer team_member       │
    │       │               │   │  3. Update invitation       │
    │       │               │   │     status = accepted       │
    │       │               │   │  4. Créer session           │
    │       │               │   └─────────────────────────────┘
    │       │               │       │
    │       │               │       ▼
    │       │               │   Redirect /auth/signup-success
    │       │               │   │ Modal bienvenue
    │       │               │   │ Activity Log: oauth_signup_via_invitation
    │       │               │   └─→ Auto-redirect dashboard
    │       │               │
    │       │               └─→ [PAS D'INVITATION]
    │       │                   │ (OAuth signup non autorisé sans invitation)
    │       │                   │
    │       │                   ▼
    │       │                   ┌─────────────────────────────┐
    │       │                   │ Affichage:                  │
    │       │                   │  ⚠️ "Compte non autorisé"  │
    │       │                   │  "Demandez invitation"      │
    │       │                   │                             │
    │       │                   │ Actions:                    │
    │       │                   │  - Supprimer auth Supabase  │
    │       │                   │  - Log: oauth_unauthorized  │
    │       │                   └─────────────────────────────┘
    │       │                       │
    │       │                       ▼
    │       │                   Redirect /auth/login?error=no_invitation
    │       │                   │ Toast: "Aucune invitation - Contactez admin"
    │       │                   └─→ [END - Blocked]
    │       │
    │       └─→ [STATE INVALIDE] (CSRF attack prevention)
    │           │ Log: action=oauth_csrf_attempt, ip_address
    │           │ Alert: "Erreur sécurité - Réessayez"
    │           └─→ Redirect /auth/login?error=security
    │
    └─→ [USER REFUSE] (Cancel on provider page)
        │ Provider redirect avec error=access_denied
        │ Redirect /auth/login?error=oauth_cancelled
        │ Toast: "Connexion annulée"
        └─→ [END]
```

**Rôles concernés** : Tous (OAuth disponible pour tous)
**Permissions** : Publique (OAuth flow)
**Notifications générées** : "Connexion réussie" ou "Bienvenue sur SEIDO" (first-time)
**Activity Logs** : `action=oauth_login`, `action=oauth_signup_via_invitation`, `action=oauth_unauthorized`

**Providers supportés** :
- Google (google.com)
- Azure AD (azure.com - for enterprise)

**Cas d'usage** :
1. **Login rapide** : User existant → OAuth → Dashboard
2. **First-time OAuth** : User invité → OAuth → Auto-provision → Dashboard
3. **OAuth blocked** : User non invité → OAuth → Error page

**Sécurité** :
- State parameter (CSRF protection)
- Email verification automatique (OAuth provider trusted)
- Invitation required pour nouveaux users
- IP logging pour audit

---

### F1.8 - Signup Success (Confirmation Inscription)

```
[START] User redirigé vers /auth/signup-success
    │ (Contexte: Après accept-invitation OU OAuth first-time)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Page: /auth/signup-success                                  │
│ Server Component vérifie session active                     │
└─────────────────────────────────────────────────────────────┘
    │
    ├─→ [SESSION VALIDE] (User authentifié)
    │   │
    │   ▼
    │   ┌─────────────────────────────────────────────────────┐
    │   │ Affichage Modal Bienvenue:                          │
    │   │                                                      │
    │   │  🎉 "Bienvenue sur SEIDO !"                        │
    │   │                                                      │
    │   │  "Votre compte a été créé avec succès"             │
    │   │                                                      │
    │   │  Informations affichées:                            │
    │   │   • Nom: {user.first_name} {user.last_name}        │
    │   │   • Email: {user.email}                            │
    │   │   • Rôle: {user.role}                              │
    │   │   • Équipe: {team.name}                            │
    │   │                                                      │
    │   │  Prochaines étapes (selon rôle):                   │
    │   │   ─────────────────────────────────────────────    │
    │   │   [GESTIONNAIRE]                                    │
    │   │    ✓ Complétez votre profil                        │
    │   │    ✓ Créez votre premier immeuble                  │
    │   │    ✓ Invitez des contacts                          │
    │   │                                                      │
    │   │   [PRESTATAIRE]                                     │
    │   │    ✓ Complétez profil entreprise                   │
    │   │    ✓ Attendez assignation interventions            │
    │   │                                                      │
    │   │   [LOCATAIRE]                                       │
    │   │    ✓ Complétez votre profil                        │
    │   │    ✓ Créez votre première demande                  │
    │   │                                                      │
    │   │   [PROPRIETAIRE]                                    │
    │   │    ✓ Consultez vos biens immobiliers               │
    │   │    ✓ Suivez les interventions                      │
    │   │                                                      │
    │   │  Boutons:                                           │
    │   │   [Accéder au tableau de bord] (primary, auto-focus)│
    │   │   "Redirection automatique dans 5s..."             │
    │   └─────────────────────────────────────────────────────┘
    │       │
    │       ├─→ [USER CLIQUE "Accéder"] (immédiat)
    │       │   │ Redirect /{role}/dashboard
    │       │   └─→ [END]
    │       │
    │       └─→ [AUTO-REDIRECT] Après 5 secondes
    │           │ Countdown visible (5... 4... 3... 2... 1...)
    │           │ Redirect /{role}/dashboard
    │           │
    │           └─→ Dashboard affiche empty states avec CTAs
    │               │ (Voir FLUX 2: Onboarding)
    │               │
    │               ├─→ Gestionnaire → Empty states: "Créez immeuble"
    │               ├─→ Prestataire → Empty state: "Interventions à venir"
    │               ├─→ Locataire → CTA: "Nouvelle demande intervention"
    │               └─→ Proprietaire → Liste biens (si déjà assignés)
    │
    └─→ [SESSION INVALIDE] (User pas connecté - cas edge)
        │ (Possible si cookies bloqués ou session expirée)
        │
        │ Toast: "Session expirée - Reconnectez-vous"
        │ Redirect /auth/login
        └─→ [END]
```

**Rôles concernés** : Tous (après signup)
**Permissions** : Authentifié uniquement (session required)
**Notifications générées** : "Bienvenue sur SEIDO" (notification persistante)
**Activity Logs** : `action=signup_success_viewed` (analytics)

**Cas d'usage** :
1. **Invitation standard** : Accept invitation → Set password → Auto-login → Signup success → Dashboard
2. **OAuth first-time** : OAuth → Auto-provision → Signup success → Dashboard
3. **Session perdue** : Redirect login (edge case)

**UX Notes** :
- **Auto-redirect 5s** : User peut lire infos sans être pressé
- **Skip button** : User peut accéder immédiatement
- **Role-specific tips** : Guidance adaptée au rôle
- **Team info** : User voit son équipe assignée

**Accessibilité** :
- Focus automatique sur bouton "Accéder"
- Countdown annoncé aux screen readers
- Escape key pour skip auto-redirect

---

## 1.3 FLUX 2: ONBOARDING & VÉRIFICATIONS

```
[User connecté] Session active
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Server Component Layout appelle getServerAuthContext()     │
│ Vérifications séquentielles:                                │
│                                                              │
│  1. Session valide ?                                        │
│     ✗ → Redirect /auth/login?reason=auth_error             │
│                                                              │
│  2. User profile existe ? (users table)                     │
│     ✗ → Redirect /auth/login?reason=profile_missing        │
│                                                              │
│  3. User has team(s) ? (team_members)                       │
│     ✗ → Redirect /auth/unauthorized?reason=no_team         │
│                                                              │
│  4. User.is_active = true ?                                 │
│     ✗ → Redirect /auth/unauthorized?reason=account_inactive│
│                                                              │
│  5. Role valide pour route ? (ex: /gestionnaire/* requis   │
│     role=gestionnaire)                                      │
│     ✗ → Redirect /auth/unauthorized?reason=role_mismatch   │
│                                                              │
│  ✓ Toutes vérifications OK                                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
[User accède dashboard rôle]
    │
    ├─→ [PREMIÈRE CONNEXION] (détecté via metadata ou compteur)
    │   │
    │   ├─→ [GESTIONNAIRE]
    │   │   │ Tour guidé (optionnel): "Créez votre premier immeuble"
    │   │   │ CTA proactifs sur empty states
    │   │   └─→ /gestionnaire/dashboard (empty states avec CTA)
    │   │
    │   ├─→ [PRESTATAIRE]
    │   │   │ Message: "Attendez assignation intervention par gestionnaire"
    │   │   └─→ /prestataire/dashboard (vide initial)
    │   │
    │   ├─→ [LOCATAIRE]
    │   │   │ Message: "Créez votre première demande intervention"
    │   │   │ CTA: Bouton "Nouvelle demande" prominent
    │   │   └─→ /locataire/dashboard
    │   │
    │   └─→ [ADMIN/PROPRIETAIRE]
    │       └─→ Dashboard respectif
    │
    └─→ [CONNEXION HABITUELLE]
        │ Dashboard charge données existantes
        │ Cache hit si données récentes (Redis)
        └─→ Affichage normal selon rôle
```

**Points de contrôle** :
- ✅ Session validée à chaque requête (middleware)
- ✅ Team obligatoire (sauf admin système)
- ✅ Role-based routing strict
- ✅ RLS policies appliquées côté DB

---

## 1.4 FLUX 3: GESTION DES BIENS (Gestionnaire)

### F3.1 - Création Immeuble (Wizard)

```
[START] Gestionnaire clique "Nouvel immeuble" (/gestionnaire/biens)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Page: /gestionnaire/biens/immeubles/nouveau                 │
│ Wizard 4 étapes (PropertyCreationContext)                   │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ ÉTAPE 1/4: Informations Générales                               │
│ ───────────────────────────────────────────────────────────────  │
│ Champs:                                                          │
│  • Nom immeuble* (text, min 2 car)                              │
│  • Adresse* (text)                                               │
│  • Ville* (text)                                                 │
│  • Code postal* (text, pattern selon pays)                      │
│  • Pays* (select: belgique|france|allemagne|pays-bas|suisse|    │
│    luxembourg|autre)                                             │
│  • Description (textarea, optionnel, max 1000 car)              │
│                                                                  │
│ Validations:                                                     │
│  ✓ Champs requis renseignés                                     │
│  ✓ Nom unique dans team (vérification async backend)            │
│  ✓ Code postal format valide                                    │
│                                                                  │
│ Boutons: [Annuler] [Suivant →]                                  │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [Annuler] → Redirect /gestionnaire/biens (data perdue)
    │
    └─→ [Suivant] Validations OK
        │ State sauvegardé dans Context
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ ÉTAPE 2/4: Contacts                                              │
│ ───────────────────────────────────────────────────────────────  │
│ Types contacts:                                                  │
│  • Syndic (optionnel, 1 max)                                     │
│  • Concierge (optionnel, multiple OK)                            │
│  • Gestionnaire principal (optionnel, 1 recommandé)              │
│                                                                  │
│ Actions:                                                         │
│  1. [Sélectionner contact existant] → Modal liste contacts      │
│     team filtrés par rôle                                        │
│  2. [Créer nouveau contact] → Modal inline création              │
│     (champs: first_name, last_name, email, phone, role)         │
│                                                                  │
│ Liste sélectionnés:                                              │
│  • Avatar + Nom + Rôle + Badge "Principal" si is_primary        │
│  • Bouton [×] pour retirer                                       │
│                                                                  │
│ Boutons: [← Précédent] [Passer] [Suivant →]                     │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [Précédent] → Retour Étape 1 (data conservée)
    │
    ├─→ [Passer] → Étape 3 (aucun contact assigné, OK)
    │
    └─→ [Suivant] → State contacts sauvegardé
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ ÉTAPE 3/4: Lots (Optionnel)                                     │
│ ───────────────────────────────────────────────────────────────  │
│ Message: "Ajoutez les lots de cet immeuble (peut être fait      │
│           plus tard)"                                            │
│                                                                  │
│ Formulaire ajout lot (répétable):                               │
│  • Référence* (text, unique dans building)                      │
│  • Catégorie* (select: appartement|collocation|maison|garage|   │
│    local_commercial|parking|autre)                               │
│  • Numéro appartement (text, optionnel)                         │
│  • Étage (number, optionnel, ex: -1, 0, 1, 2...)               │
│  • Description (textarea, optionnel)                             │
│                                                                  │
│ [+ Ajouter un lot]                                               │
│                                                                  │
│ Liste lots ajoutés:                                              │
│  • Référence | Catégorie | Étage | [Modifier] [Supprimer]      │
│                                                                  │
│ Boutons: [← Précédent] [Passer] [Suivant →]                     │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [Précédent] → Retour Étape 2 (data conservée)
    │
    ├─→ [Passer] → Étape 4 (aucun lot, OK)
    │
    └─→ [Suivant] → State lots sauvegardé
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ ÉTAPE 4/4: Documents (Optionnel)                                │
│ ───────────────────────────────────────────────────────────────  │
│ Message: "Ajoutez des documents (règlement copropriété, plans,  │
│           diagnostics...)"                                       │
│                                                                  │
│ Upload multiple:                                                 │
│  • Drag & drop zone                                              │
│  • Type document* (select: reglement_copropriete|plan|          │
│    diagnostic|certificat|photo_generale|autre)                   │
│  • Titre (text, auto-rempli avec filename)                      │
│  • Visibilité* (radio: equipe|locataire)                        │
│  • Date document (date picker, optionnel)                       │
│                                                                  │
│ Contraintes upload:                                              │
│  • Max 10MB par fichier                                          │
│  • Formats: PDF, JPG, PNG, DOCX                                  │
│  • Max 10 fichiers simultanés                                    │
│                                                                  │
│ Liste fichiers uploadés:                                         │
│  • Preview | Nom | Type | Taille | [Supprimer]                  │
│                                                                  │
│ Boutons: [← Précédent] [Passer] [Créer l'immeuble]              │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [Précédent] → Retour Étape 3
    │
    ├─→ [Passer] → Submit sans documents
    │
    └─→ [Créer l'immeuble]
        │ Validation finale de toutes étapes
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ API: POST /api/buildings                                         │
│ Payload:                                                         │
│  {                                                               │
│    name, address, city, postal_code, country, description,      │
│    team_id (auto from session),                                 │
│    contacts: [ { user_id, role, is_primary } ],                 │
│    lots: [ { reference, category, apartment_number, floor } ],  │
│    documents: [ { file, type, title, visibility_level } ]       │
│  }                                                               │
│                                                                  │
│ Transaction DB (atomique):                                       │
│  1. INSERT buildings (génère building_id)                       │
│  2. INSERT building_contacts (foreach contact)                  │
│  3. INSERT lots (foreach lot, lie building_id)                  │
│  4. Upload documents Storage (foreach file)                     │
│  5. INSERT property_documents (metadata + storage_path)         │
│  6. Activity Log: action=create, entity_type=building           │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS]
    │   │ Toast: "Immeuble '{name}' créé avec succès"
    │   │ Notification: Gestionnaires team "Nouvel immeuble créé"
    │   │ Activity Log: success, metadata={ building_id, lots_count }
    │   │
    │   ▼
    │   Redirect /gestionnaire/biens/immeubles/[new_id]
    │   │ Affiche détail immeuble nouvellement créé
    │   │ CTA: "Ajouter des lots" si aucun lot créé
    │   └─→ [END]
    │
    └─→ [ERREUR]
        ├─→ Nom déjà existe
        │   │ Toast: "Un immeuble '{name}' existe déjà"
        │   │ Retour Étape 1, focus champ nom
        │   └─→ User corrige
        │
        ├─→ Upload document échoue
        │   │ Toast: "Erreur upload '{filename}' - Fichier trop lourd"
        │   │ Retour Étape 4, fichier retiré de liste
        │   └─→ User peut retry ou passer
        │
        ├─→ Lot référence dupliquée
        │   │ Toast: "Référence lot '{ref}' déjà utilisée"
        │   │ Retour Étape 3, highlight lot en erreur
        │   └─→ User corrige
        │
        └─→ Erreur serveur (rare)
            │ Toast: "Erreur création immeuble - Réessayez"
            │ Modal: "Données sauvegardées temporairement"
            │ Option: [Retry] [Sauvegarder brouillon] [Annuler]
            └─→ Activity Log: status=failure, error_message
```

**Rôles autorisés** : Gestionnaire uniquement
**Permissions RLS** : `is_team_manager(team_id)` pour INSERT buildings
**Notifications** :
- Gestionnaires team: "Nouvel immeuble '{name}' créé par {user_name}"
**Activity Logs** :
- `action=create, entity_type=building, status=success/failure`

---

### F3.2 - Création Lot Indépendant (Sans Immeuble)

```
[START] Gestionnaire clique "Nouveau lot" (/gestionnaire/biens)
    │
    ▼
Détection contexte:
    ├─→ [Depuis page Building] building_id pré-rempli
    └─→ [Depuis liste générale] building_id = NULL (lot indépendant)
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Page: /gestionnaire/biens/lots/nouveau                          │
│ Wizard 3 étapes (LotCreationContext)                            │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ ÉTAPE 1/3: Informations Générales                               │
│ ───────────────────────────────────────────────────────────────  │
│ Champs:                                                          │
│  • Référence* (text, unique dans team si lot indépendant)       │
│  • Catégorie* (select: appartement|collocation|maison|garage|   │
│    local_commercial|parking|autre)                               │
│  • Immeuble rattaché (select, optionnel)                        │
│    └─→ Si NULL → Affiche champs adresse complète:               │
│        • Adresse* (text)                                         │
│        • Ville* (text)                                           │
│        • Code postal* (text)                                     │
│        • Pays* (select)                                          │
│  • Numéro appartement (text, optionnel)                         │
│  • Étage (number, optionnel)                                    │
│  • Description (textarea, optionnel)                             │
│                                                                  │
│ Validations:                                                     │
│  ✓ Référence unique (scope: team si indépendant, building si    │
│    rattaché)                                                     │
│  ✓ Si building_id NULL: adresse complète requise                │
│  ✓ Si building_id renseigné: adresse masquée (hérite building)  │
│                                                                  │
│ Boutons: [Annuler] [Suivant →]                                  │
└──────────────────────────────────────────────────────────────────┘
    │
    └─→ [Suivant] Validations OK
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ ÉTAPE 2/3: Contacts                                              │
│ ───────────────────────────────────────────────────────────────  │
│ Types contacts:                                                  │
│  • Locataire principal* (1 requis si catégorie≠garage/parking)  │
│  • Propriétaire (optionnel, 1 recommandé)                        │
│  • Autres contacts (optionnel, multiple)                         │
│                                                                  │
│ Actions:                                                         │
│  1. [Sélectionner contact existant] → Modal liste contacts      │
│  2. [Créer nouveau contact] → Modal inline                       │
│  3. [Inviter contact] → Modal invitation (envoie email)          │
│                                                                  │
│ Validation:                                                      │
│  ✓ Au moins 1 locataire si catégorie = appartement/maison       │
│  ✓ Max 1 locataire "principal" (is_primary=true)                │
│                                                                  │
│ Boutons: [← Précédent] [Suivant →]                              │
└──────────────────────────────────────────────────────────────────┘
    │
    └─→ [Suivant]
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ ÉTAPE 3/3: Documents                                             │
│ ───────────────────────────────────────────────────────────────  │
│ Types documents suggérés:                                        │
│  • Bail (contract PDF)                                           │
│  • État des lieux (entree/sortie)                               │
│  • Diagnostics (DPE, amiante, plomb, gaz, électricité)          │
│  • Photos compteurs (eau, gaz, électricité)                     │
│                                                                  │
│ Upload similaire Étape 4 Building                               │
│ Visibilité par défaut: "locataire" (visible par locataire du    │
│                        lot)                                      │
│                                                                  │
│ Boutons: [← Précédent] [Passer] [Créer le lot]                  │
└──────────────────────────────────────────────────────────────────┘
    │
    └─→ [Créer le lot]
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ API: POST /api/lots                                              │
│ Payload:                                                         │
│  {                                                               │
│    reference, category, building_id (nullable),                 │
│    apartment_number, floor, description,                         │
│    street, city, postal_code, country (si building_id NULL),    │
│    team_id (auto),                                              │
│    contacts: [ { user_id, role, is_primary } ],                 │
│    documents: [ { file, type, title, visibility_level } ]       │
│  }                                                               │
│                                                                  │
│ Transaction:                                                     │
│  1. INSERT lots                                                  │
│  2. INSERT lot_contacts                                          │
│  3. Upload documents Storage                                     │
│  4. INSERT property_documents (lot_id)                          │
│  5. Update building compteurs (si building_id renseigné):       │
│     - total_lots +1                                              │
│     - occupied_lots +1 (si locataire assigné)                   │
│  6. Activity Log                                                 │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS]
    │   │ Toast: "Lot '{reference}' créé avec succès"
    │   │ Notification: Locataire assigné "Vous êtes locataire de {ref}"
    │   │ Activity Log: action=create, entity_type=lot
    │   │
    │   ▼
    │   Redirect /gestionnaire/biens/lots/[new_id]
    │   └─→ [END]
    │
    └─→ [ERREUR]
        ├─→ Référence existe → Retour Étape 1
        ├─→ Adresse manquante (lot indépendant) → Retour Étape 1
        ├─→ Pas de locataire (catégorie appartement) → Warning Étape 2
        └─→ Upload fail → Retour Étape 3
```

**Rôles autorisés** : Gestionnaire uniquement
**Permissions RLS** : `is_team_manager(team_id)`
**Notifications** :
- Locataire assigné: "Vous êtes maintenant locataire de {lot_reference}"
**Activity Logs** : `action=create, entity_type=lot`

**Logique clé** :
- **Lot indépendant** : `building_id = NULL` → Adresse complète requise
- **Lot rattaché** : `building_id` renseigné → Hérite adresse immeuble

---

### F3.3 - Édition Immeuble/Lot

```
[START] Gestionnaire clique "Modifier" (détail building/lot)
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Page: /gestionnaire/biens/immeubles/[id] (mode édition)         │
│ ou /gestionnaire/biens/lots/[id]                                │
│                                                                  │
│ Options édition:                                                 │
│  1. Inline editing (champs deviennent éditables)                │
│  2. Modal formulaire complet                                     │
│  3. Re-wizard (réutilise wizard création)                       │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
User modifie champs
    │ Validations temps réel (Zod)
    │
    ▼
User clique "Enregistrer"
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ API: PUT /api/buildings/[id] ou PUT /api/lots/[id]              │
│ Payload: Champs modifiés uniquement (delta)                     │
│                                                                  │
│ Validations backend:                                             │
│  ✓ User is_team_manager(building.team_id)                       │
│  ✓ Nom/Référence unique (si modifié)                            │
│  ✓ Contraintes DB respectées                                    │
│                                                                  │
│ Actions:                                                         │
│  1. UPDATE buildings/lots SET ... WHERE id=X                    │
│  2. Activity Log: action=update, entity_type, entity_id         │
│  3. Cache invalidation (Redis keys: building:*, lot:*)          │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS]
    │   │ Toast: "Modifications enregistrées"
    │   │ Optimistic UI: Changements affichés immédiatement
    │   │ Activity Log: status=success, metadata={ changed_fields }
    │   │ Revalidation cache (SWR pattern)
    │   └─→ Reste sur page détail
    │
    └─→ [ERREUR]
        ├─→ Conflict (nom/ref existe) → Toast + Rollback UI
        ├─→ Permission denied → Toast "Accès refusé" (RLS)
        ├─→ Validation fail → Inline errors + Rollback
        └─→ Erreur serveur → Toast + Retry option
```

**Rôles autorisés** : Gestionnaire uniquement
**Permissions RLS** : `is_team_manager(entity.team_id)` pour UPDATE
**Notifications** : Aucune (édition silencieuse)
**Activity Logs** : `action=update, entity_type=building/lot, metadata={ changed_fields: [...] }`

**Optimistic UI** : Changements affichés immédiatement, rollback si erreur

---

### F3.4 - Suppression Immeuble/Lot (Soft Delete)

```
[START] Gestionnaire clique "Supprimer" (détail building/lot)
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Modal Confirmation:                                              │
│ ───────────────────────────────────────────────────────────────  │
│ Titre: "Supprimer {entity_type} '{name}' ?"                     │
│                                                                  │
│ Avertissements:                                                  │
│  ⚠ Si Building avec lots:                                       │
│    "Cet immeuble contient X lots. La suppression affectera      │
│     également ces lots et leurs documents."                      │
│                                                                  │
│  ⚠ Si Lot avec interventions actives:                           │
│    "Ce lot a Y interventions actives. Veuillez les clôturer     │
│     avant suppression."                                          │
│    → Bouton "Supprimer" désactivé, CTA "Voir interventions"     │
│                                                                  │
│  ⚠ Si documents attachés:                                       │
│    "Z documents seront archivés (non supprimés définitivement)" │
│                                                                  │
│ Checkbox: "Je comprends que cette action est réversible         │
│            (restauration possible via admin)"                    │
│                                                                  │
│ Boutons: [Annuler] [Supprimer] (rouge, requis checkbox coché)   │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [Annuler] → Ferme modal, aucune action
    │
    └─→ [Supprimer] (après confirmation)
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ API: DELETE /api/buildings/[id] ou DELETE /api/lots/[id]        │
│                                                                  │
│ Vérifications pré-suppression:                                   │
│  ✓ User is_team_manager(entity.team_id)                         │
│  ✓ Aucune intervention active (status ≠ cloturee/annulee)       │
│    └─→ Si intervention active: HTTP 400 "Clôturer d'abord"      │
│                                                                  │
│ Soft Delete (pas de DELETE physique):                           │
│  1. UPDATE buildings/lots SET deleted_at=NOW(), deleted_by=user │
│  2. Cascade soft delete (si building):                          │
│     - UPDATE lots WHERE building_id=X SET deleted_at=NOW()      │
│     - UPDATE property_documents WHERE building_id=X SET ...     │
│  3. Activity Log: action=delete (soft)                          │
│  4. Cache invalidation                                           │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS]
    │   │ Toast: "{entity_type} supprimé(e) avec succès"
    │   │ Activity Log: action=delete, status=success
    │   │ Redirect /gestionnaire/biens (liste)
    │   │
    │   ▼
    │   Entity masquée dans listes (WHERE deleted_at IS NULL)
    │   │ Restauration possible via:
    │   │  - Admin panel
    │   │  - API: PATCH /api/buildings/[id]/restore
    │   └─→ [END]
    │
    └─→ [ERREUR]
        ├─→ Interventions actives
        │   │ Toast: "Impossible - X interventions actives"
        │   │ CTA: Lien vers /gestionnaire/interventions?lot_id=X
        │   └─→ User doit clôturer interventions d'abord
        │
        ├─→ Permission denied (RLS)
        │   │ Toast: "Accès refusé"
        │   └─→ Modal reste ouverte
        │
        └─→ Erreur serveur
            │ Toast: "Erreur suppression - Réessayez"
            └─→ Modal reste ouverte, option Retry
```

**Rôles autorisés** : Gestionnaire uniquement
**Permissions RLS** : `is_team_manager(entity.team_id)` pour UPDATE (soft delete)
**Notifications** : Aucune
**Activity Logs** : `action=delete, entity_type, status=success, metadata={ cascade_count }`

**Règles métier** :
- ✅ Soft delete uniquement (deleted_at timestamp)
- ❌ Suppression physique interdite (données conservées pour audit)
- ⚠ Bloque suppression si interventions actives
- ♻️ Restauration possible par admin

---

## 1.5 FLUX 4: GESTION DES CONTACTS (Gestionnaire)

### F4.1 - Création Contact Simple (Sans Invitation)

```
[START] Gestionnaire clique "Ajouter contact" (/gestionnaire/contacts)
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Modal: Nouveau Contact                                          │
│ ───────────────────────────────────────────────────────────────  │
│ Champs:                                                          │
│  • Prénom* (text, min 2 car)                                    │
│  • Nom* (text, min 2 car)                                       │
│  • Email* (email format)                                         │
│  • Téléphone (text, format international optionnel)             │
│  • Rôle* (select: gestionnaire|prestataire|locataire|           │
│    proprietaire)                                                 │
│  • Adresse (textarea, optionnel)                                │
│  • Entreprise (select, optionnel, si role=prestataire)          │
│    └─→ Option "Créer nouvelle entreprise" si absente            │
│  • Spécialité (select, si role=prestataire):                    │
│    plomberie|electricite|chauffage|serrurerie|peinture|menage|  │
│    jardinage|autre                                               │
│                                                                  │
│ Options post-création:                                           │
│  [ ] Envoyer invitation immédiatement (email avec lien signup)  │
│  [ ] Assigner à un bien maintenant                              │
│                                                                  │
│ Validations:                                                     │
│  ✓ Email unique dans team                                       │
│  ✓ Email format valide (Zod)                                    │
│  ✓ Téléphone format international (optionnel mais validé)       │
│                                                                  │
│ Boutons: [Annuler] [Créer]                                      │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [Annuler] → Ferme modal, aucune action
    │
    └─→ [Créer]
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ API: POST /api/create-contact                                    │
│ Payload:                                                         │
│  {                                                               │
│    first_name, last_name, email, phone, address,                │
│    role, team_id (auto), company_id (si prestataire),           │
│    provider_category, speciality (si prestataire)               │
│  }                                                               │
│                                                                  │
│ Actions:                                                         │
│  1. Vérifier email unique (users.email WHERE team_id=X)         │
│  2. INSERT users SET auth_user_id=NULL, is_active=false,        │
│     password_set=false                                           │
│     └─→ Statut compte: "À inviter" (visible dans annuaire)      │
│  3. INSERT team_members (user_id, team_id, role)                │
│  4. Activity Log: action=create, entity_type=user               │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS]
    │   │ Toast: "Contact '{first_name} {last_name}' créé"
    │   │ Activity Log: status=success
    │   │
    │   ├─→ [Si "Envoyer invitation" coché]
    │   │   │ → Redirect F4.2 (Invitation Flow)
    │   │   └─→ API: POST /api/invite-user (user_id existant)
    │   │
    │   ├─→ [Si "Assigner à bien" coché]
    │   │   │ → Modal sélection building/lot
    │   │   │ → API: POST /api/building-contacts ou lot-contacts
    │   │   └─→ Toast: "Contact assigné à {entity_name}"
    │   │
    │   └─→ [Sinon]
    │       │ Redirect /gestionnaire/contacts (liste)
    │       │ Nouveau contact visible avec badge "Non invité"
    │       └─→ [END]
    │
    └─→ [ERREUR]
        ├─→ Email déjà existe
        │   │ Inline error: "Cet email existe déjà dans l'équipe"
        │   │ CTA: "Voir le contact existant"
        │   └─→ Modal reste ouverte
        │
        ├─→ Email invalide
        │   │ Inline error: "Format email invalide"
        │   └─→ Modal reste ouverte, focus champ email
        │
        ├─→ Champs requis manquants
        │   │ Inline errors sous champs concernés
        │   └─→ Modal reste ouverte
        │
        └─→ Erreur serveur
            │ Toast: "Erreur création contact - Réessayez"
            │ Activity Log: status=failure
            └─→ Modal reste ouverte, option Retry
```

**Rôles autorisés** : Gestionnaire uniquement
**Permissions RLS** : `is_team_manager(team_id)` pour INSERT users
**Notifications** : Aucune (création silencieuse)
**Activity Logs** : `action=create, entity_type=user, status=success/failure`

**Différence Contact vs User** :
- **Contact simple** : `auth_user_id = NULL` (pas de compte auth)
- **User invité** : `auth_user_id` renseigné après signup
- Contact peut être invité plus tard via F4.2

---

### F4.2 - Invitation Contact (Avec Email)

```
[START] Options déclenchement:
    ├─→ 1. Après création contact (F4.1, option cochée)
    ├─→ 2. Depuis annuaire: clic "Inviter" sur contact "Non invité"
    └─→ 3. Depuis création building/lot (inline invite contact)
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Modal: Inviter Contact                                          │
│ ───────────────────────────────────────────────────────────────  │
│ Cas 1: Contact existant (user_id connu)                         │
│   Affiche: Nom, Email (disabled, pré-rempli)                    │
│   Message: "Une invitation sera envoyée à {email}"              │
│                                                                  │
│ Cas 2: Nouvel utilisateur (combiné création + invitation)       │
│   Champs: Tous champs F4.1 + email                              │
│   Message: "Le contact sera créé ET invité"                     │
│                                                                  │
│ Paramètres invitation:                                           │
│  • Message personnalisé (textarea, optionnel, max 500 car)      │
│    Exemple: "Bonjour, je vous invite à rejoindre notre équipe   │
│              pour gérer les biens immobiliers..."               │
│                                                                  │
│ Informations:                                                    │
│  ℹ️ "L'invitation expire dans 7 jours"                          │
│  ℹ️ "Un email sera envoyé avec lien de configuration compte"    │
│                                                                  │
│ Boutons: [Annuler] [Envoyer l'invitation]                       │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [Annuler] → Ferme modal
    │
    └─→ [Envoyer l'invitation]
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ API: POST /api/invite-user                                       │
│ Payload:                                                         │
│  {                                                               │
│    email, role, first_name, last_name, team_id,                 │
│    invited_by (user_id session),                                │
│    custom_message (optionnel)                                   │
│  }                                                               │
│                                                                  │
│ Actions séquentielles:                                           │
│  1. Vérifier email unique dans team                             │
│  2. Si user_id NULL (nouveau):                                  │
│     - INSERT users (auth_user_id=NULL, is_active=false)         │
│     - INSERT team_members                                        │
│  3. Générer invitation_token (crypto.randomUUID())              │
│  4. INSERT user_invitations:                                     │
│     - status = 'pending'                                         │
│     - expires_at = NOW() + INTERVAL '7 days'                    │
│     - invitation_token                                           │
│  5. Envoyer email (Resend API - à configurer):                  │
│     - Template: invitation-email                                │
│     - Variables: {first_name, inviter_name, team_name, token}   │
│     - Lien: {APP_URL}/auth/signup?token={token}                 │
│     - Custom message injecté si présent                         │
│  6. Activity Log: action=invite_user                            │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS]
    │   │ Toast: "Invitation envoyée à {email}"
    │   │ Notification: Gestionnaire "Invitation envoyée à {email}"
    │   │ Activity Log: status=success, metadata={ invitation_id }
    │   │
    │   ▼
    │   Update UI contact dans annuaire:
    │   │ Badge: "Invitation envoyée" (orange)
    │   │ Hover badge: "Envoyée le {date} - Expire le {expires_at}"
    │   │ Actions disponibles: [Renvoyer] [Révoquer]
    │   │
    │   └─→ [User reçoit email]
    │       │
    │       └─→ Voir F1.1 (Flow signup via invitation token)
    │
    └─→ [ERREUR]
        ├─→ Email déjà invité (status=pending)
        │   │ Toast: "Invitation déjà envoyée à {email}"
        │   │ CTA: "Renvoyer l'invitation ?"
        │   │   └─→ API: POST /api/resend-invitation (génère nouveau token)
        │   └─→ Modal reste ouverte
        │
        ├─→ Email déjà utilisé (auth_user_id renseigné)
        │   │ Toast: "Cet email a déjà un compte actif"
        │   └─→ Modal se ferme
        │
        ├─→ Erreur envoi email (Resend API fail)
        │   │ Toast: "Invitation créée mais email non envoyé"
        │   │ Invitation status reste 'pending' (retry possible)
        │   │ Activity Log: status=partial_success, error="email_send_failed"
        │   └─→ CTA "Renvoyer email" disponible dans annuaire
        │
        └─→ Erreur serveur
            │ Toast: "Erreur création invitation - Réessayez"
            │ Activity Log: status=failure
            └─→ Modal reste ouverte, option Retry
```

**Rôles autorisés** : Gestionnaire uniquement
**Permissions RLS** : `is_team_manager(team_id)`
**Notifications** :
- Gestionnaire émetteur: "Invitation envoyée à {email}"
**Activity Logs** : `action=invite_user, entity_type=user_invitation, status=success/partial_success/failure`

**Email Template** (Resend - à configurer) :
```
Objet: Invitation à rejoindre l'équipe {team_name} sur SEIDO

Bonjour {first_name},

{inviter_name} vous invite à rejoindre l'équipe {team_name} sur SEIDO,
la plateforme de gestion immobilière.

{custom_message (si présent)}

Cliquez sur le lien ci-dessous pour créer votre compte :
{APP_URL}/auth/signup?token={invitation_token}

Ce lien expire dans 7 jours.

À bientôt sur SEIDO !
```

---

### F4.3 - Réinvitation (Token Expiré/Perdu)

```
[START] Options déclenchement:
    ├─→ 1. Gestionnaire clique "Renvoyer" (annuaire, badge "Expirée")
    ├─→ 2. User tente signup avec token expiré → CTA "Demander nouveau lien"
    └─→ 3. Contact clique "Je n'ai pas reçu l'email" (page signup)
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ API: POST /api/resend-invitation                                 │
│ Payload: { invitation_id } ou { email }                         │
│                                                                  │
│ Actions:                                                         │
│  1. Récupérer invitation existante (status=pending/expired)     │
│  2. Vérifier user pas encore activé (auth_user_id NULL)         │
│  3. Générer NOUVEAU invitation_token                            │
│  4. UPDATE user_invitations SET:                                │
│     - invitation_token = NEW_TOKEN                              │
│     - expires_at = NOW() + INTERVAL '7 days' (prolongé)         │
│     - status = 'pending' (réinitialise si expired)              │
│     - resent_count +1 (compteur réinvitations)                  │
│  5. Renvoyer email avec nouveau lien                            │
│  6. Activity Log: action=resend_invitation                      │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS]
    │   │ Toast: "Nouvelle invitation envoyée à {email}"
    │   │ Activity Log: status=success, metadata={ resent_count }
    │   │
    │   ▼
    │   Update UI:
    │   │ Badge: "Invitation renvoyée" (orange)
    │   │ Hover: "Renvoyée le {date} - Expire le {new_expires_at}"
    │   │ Compteur: "Renvoyée {resent_count} fois"
    │   │
    │   └─→ User reçoit nouvel email avec nouveau token
    │       └─→ F1.1 (Flow signup)
    │
    └─→ [ERREUR]
        ├─→ Compte déjà activé
        │   │ Toast: "{email} a déjà un compte actif"
        │   └─→ Suggestion: "Utilisez Reset Password"
        │
        ├─→ Invitation révoquée (status=cancelled)
        │   │ Toast: "Invitation révoquée - Impossible de renvoyer"
        │   │ CTA: "Créer nouvelle invitation"
        │   └─→ Nécessite nouvelle invitation (F4.2)
        │
        ├─→ Limite réinvitations atteinte (ex: > 5)
        │   │ Toast: "Limite réinvitations atteinte - Contactez {email}"
        │   │ Activity Log: status=failure, error="resend_limit_reached"
        │   └─→ Bloque action (security)
        │
        └─→ Erreur envoi email
            │ Toast: "Token prolongé mais email non envoyé"
            │ Status: partial_success
            └─→ Retry possible
```

**Rôles autorisés** : Gestionnaire uniquement
**Permissions RLS** : `is_team_manager(team_id)`
**Notifications** : "Nouvelle invitation envoyée à {email}"
**Activity Logs** : `action=resend_invitation, status=success/failure, metadata={ resent_count }`

**Règles métier** :
- ✅ Génère toujours nouveau token (ancien invalidé)
- ✅ Prolonge expires_at de 7 jours
- ⚠ Limite 5 réinvitations max (sécurité anti-spam)
- ℹ️ Compteur resent_count incrémenté

---

### F4.4 - Révocation Invitation

```
[START] Gestionnaire clique "Révoquer" (annuaire, contact "Invitation envoyée")
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Modal Confirmation:                                              │
│ ───────────────────────────────────────────────────────────────  │
│ Titre: "Révoquer l'invitation de {first_name} {last_name} ?"    │
│                                                                  │
│ Message:                                                         │
│  "L'invitation envoyée à {email} sera annulée. Le lien actuel   │
│   ne fonctionnera plus."                                         │
│                                                                  │
│ Options post-révocation:                                         │
│  ( ) Supprimer le contact de l'annuaire                         │
│  ( ) Conserver le contact (invitation révoquée uniquement)      │
│      └─→ Permet de réinviter plus tard                          │
│                                                                  │
│ Raison révocation (optionnel):                                  │
│  [textarea, max 200 car]                                         │
│  Ex: "Email incorrect", "Personne non disponible", etc.         │
│                                                                  │
│ Boutons: [Annuler] [Révoquer l'invitation] (rouge)              │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [Annuler] → Ferme modal
    │
    └─→ [Révoquer l'invitation]
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ API: POST /api/revoke-invitation                                 │
│ Payload:                                                         │
│  {                                                               │
│    invitation_id,                                               │
│    delete_contact (boolean),                                    │
│    revocation_reason (optionnel)                                │
│  }                                                               │
│                                                                  │
│ Actions:                                                         │
│  1. UPDATE user_invitations SET:                                │
│     - status = 'cancelled'                                      │
│     - cancelled_at = NOW()                                      │
│     - cancelled_by = current_user_id                            │
│     - cancellation_reason = revocation_reason                   │
│  2. Si delete_contact=true:                                     │
│     - Soft delete user (deleted_at)                             │
│     - Soft delete team_members                                  │
│  3. Activity Log: action=revoke_invitation                      │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS]
    │   │ Toast: "Invitation révoquée"
    │   │ Activity Log: status=success
    │   │
    │   ├─→ [Si delete_contact=true]
    │   │   │ Contact disparaît de l'annuaire
    │   │   └─→ Peut être restauré par admin si nécessaire
    │   │
    │   └─→ [Si delete_contact=false]
    │       │ Contact reste dans annuaire
    │       │ Badge: "Invitation révoquée" (gris)
    │       │ Actions: [Réinviter] (crée nouvelle invitation)
    │       └─→ [END]
    │
    └─→ [ERREUR]
        ├─→ Invitation déjà acceptée
        │   │ Toast: "Invitation déjà acceptée - Compte actif"
        │   │ Suggestion: "Utilisez 'Désactiver compte' à la place"
        │   └─→ Modal se ferme
        │
        ├─→ Invitation déjà révoquée
        │   │ Toast: "Invitation déjà révoquée"
        │   └─→ Modal se ferme
        │
        └─→ Erreur serveur
            │ Toast: "Erreur révocation - Réessayez"
            └─→ Modal reste ouverte, option Retry
```

**Rôles autorisés** : Gestionnaire uniquement
**Permissions RLS** : `is_team_manager(team_id)`
**Notifications** : Aucune (révocation silencieuse)
**Activity Logs** : `action=revoke_invitation, status=success, metadata={ delete_contact, reason }`

**Différence Révoquer vs Supprimer Contact** :
- **Révoquer** : Invalide invitation uniquement, contact peut rester
- **Supprimer contact** : Soft delete user + team_members (option combinée)

---

## 1.6 FLUX 5: WORKFLOW INTERVENTIONS (Multi-Rôles)

### Vue d'Ensemble des Statuts

```
┌─────────────────────────────────────────────────────────────────┐
│ WORKFLOW INTERVENTION - 11 STATUTS                              │
│ ───────────────────────────────────────────────────────────────  │
│                                                                  │
│  (1) DEMANDE           → Demande initiale (L/G)                 │
│       ├→ approve       → (3) APPROUVEE                          │
│       ├→ reject        → (2) REJETEE [TERMINAL]                 │
│       └→ cancel        → (11) ANNULEE [TERMINAL]                │
│                                                                  │
│  (3) APPROUVEE                                                  │
│       ├→ quote request → (4) DEMANDE_DE_DEVIS                   │
│       ├→ schedule      → (5) PLANIFICATION                      │
│       └→ cancel        → (11) ANNULEE                           │
│                                                                  │
│  (4) DEMANDE_DE_DEVIS                                           │
│       ├→ quote valid   → (5) PLANIFICATION                      │
│       └→ cancel        → (11) ANNULEE                           │
│                                                                  │
│  (5) PLANIFICATION                                              │
│       ├→ slot finalized → (6) PLANIFIEE                         │
│       └→ cancel         → (11) ANNULEE                          │
│                                                                  │
│  (6) PLANIFIEE                                                  │
│       ├→ start         → (7) EN_COURS                           │
│       └→ cancel        → (11) ANNULEE                           │
│                                                                  │
│  (7) EN_COURS                                                   │
│       ├→ complete      → (8) CLOTUREE_PAR_PRESTATAIRE           │
│       └→ cancel        → (11) ANNULEE                           │
│                                                                  │
│  (8) CLOTUREE_PAR_PRESTATAIRE                                   │
│       ├→ tenant valid  → (9) CLOTUREE_PAR_LOCATAIRE             │
│       └→ cancel        → (11) ANNULEE                           │
│                                                                  │
│  (9) CLOTUREE_PAR_LOCATAIRE                                     │
│       ├→ manager final → (10) CLOTUREE_PAR_GESTIONNAIRE [TERM.] │
│       └→ cancel        → (11) ANNULEE [TERMINAL]                │
│                                                                  │
│  États terminaux (pas de transition):                           │
│   • (2) REJETEE                                                 │
│   • (10) CLOTUREE_PAR_GESTIONNAIRE                              │
│   • (11) ANNULEE                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

### F5.1 - Création Demande Intervention (Locataire)

```
[START] Locataire clique "Nouvelle demande" (/locataire/interventions/new)
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Page: /locataire/interventions/new                              │
│ Formulaire création demande                                      │
│ ───────────────────────────────────────────────────────────────  │
│ Champs:                                                          │
│  • Logement concerné* (select)                                   │
│    └─→ Dropdown: Liste lots dont user est locataire (RLS)       │
│        Option: "Mon logement au {address}" (1 seul normalement)  │
│                                                                  │
│  • Titre* (text, min 10 car, max 100 car)                       │
│    Placeholder: "Ex: Fuite d'eau sous l'évier cuisine"          │
│                                                                  │
│  • Type d'intervention* (select)                                 │
│    Options: Plomberie | Électricité | Chauffage | Serrurerie |  │
│             Peinture | Ménage | Jardinage | Autre                │
│                                                                  │
│  • Description détaillée* (textarea, min 50 car, max 2000 car)  │
│    Placeholder: "Décrivez le problème en détail..."             │
│    Guidance: "Plus vous êtes précis, plus vite nous pourrons    │
│               intervenir. Indiquez: localisation exacte, quand   │
│               le problème est apparu, gravité..."                │
│                                                                  │
│  • Urgence* (radio buttons)                                      │
│    ( ) Basse      - "Peut attendre plusieurs jours"             │
│    (•) Normale    - "À traiter sous 2-3 jours" [DEFAULT]        │
│    ( ) Haute      - "Urgent, gêne importante"                   │
│    ( ) Urgente    - "Critique, danger ou dégât des eaux"        │
│                                                                  │
│  • Localisation précise (text, optionnel)                       │
│    Placeholder: "Ex: Cuisine, sous l'évier"                     │
│                                                                  │
│  • Photos du problème (upload multiple, optionnel)              │
│    - Drag & drop zone                                            │
│    - Max 5 fichiers, 10MB each                                   │
│    - Formats: JPG, PNG                                           │
│    - Preview thumbnails après upload                             │
│                                                                  │
│  • Devis requis ? (checkbox)                                    │
│    [✓] Demander un devis avant intervention                     │
│    └─→ Si coché: requires_quote=true                            │
│                                                                  │
│  • Disponibilités (optionnel, textarea)                         │
│    Placeholder: "Indiquez vos disponibilités si vous souhaitez  │
│                  être présent lors de l'intervention"            │
│                                                                  │
│ Validations:                                                     │
│  ✓ Lot sélectionné (user doit être locataire du lot via RLS)   │
│  ✓ Titre min 10 car                                             │
│  ✓ Description min 50 car                                       │
│  ✓ Type sélectionné                                             │
│  ✓ Urgence sélectionnée                                         │
│  ✓ Photos < 10MB each                                           │
│                                                                  │
│ Boutons: [Annuler] [Créer la demande]                           │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [Annuler] → Redirect /locataire/interventions (data perdue)
    │
    └─→ [Créer la demande]
        │ Validations OK
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ API: POST /api/create-intervention                               │
│ Payload:                                                         │
│  {                                                               │
│    lot_id, title, description, type, urgency,                   │
│    specific_location (optionnel),                               │
│    requires_quote (boolean),                                    │
│    tenant_availability_notes (optionnel),                       │
│    photos (array files)                                         │
│  }                                                               │
│                                                                  │
│ Actions séquentielles (transaction):                            │
│  1. Vérifier user is_tenant_of_lot(lot_id) (RLS)               │
│  2. Générer référence unique (format: INT-YYYYMMDD-XXXX)       │
│  3. Récupérer team_id via get_lot_team_id(lot_id)              │
│  4. INSERT interventions SET:                                   │
│     - reference, title, description, type, urgency              │
│     - lot_id, team_id                                           │
│     - status = 'demande' [INITIAL]                              │
│     - requires_quote                                            │
│     - specific_location                                         │
│     - created_at = NOW()                                        │
│  5. INSERT intervention_assignments:                            │
│     - intervention_id, user_id (locataire), role='locataire'   │
│     - is_primary=true, assigned_at=NOW()                        │
│  6. Upload photos Storage (si présentes):                       │
│     - Bucket: intervention-documents/{team_id}/{inter_id}/      │
│     - INSERT intervention_documents:                            │
│       * document_type='photo_avant'                             │
│       * uploaded_by=user_id                                     │
│  7. Update compteurs:                                           │
│     - lots.total_interventions +1                               │
│     - lots.active_interventions +1                              │
│     - buildings.total_interventions +1 (si lot.building_id)    │
│     - buildings.active_interventions +1                         │
│  8. Créer notifications:                                        │
│     - Destinataires: Tous gestionnaires de la team              │
│     - Type: 'intervention', title: "Nouvelle demande {ref}"    │
│     - Message: "{tenant_name} a créé une demande ({type})"     │
│     - related_entity_type='intervention', id                    │
│  9. Créer threads conversation:                                 │
│     - Thread "group" (tous participants)                        │
│     - Thread "tenant_to_managers" (locataire ↔ gestionnaires)  │
│ 10. Activity Log:                                               │
│     - action='create', entity_type='intervention'               │
│     - actor=locataire, description="Demande créée"              │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS]
    │   │ Toast: "Demande créée avec succès"
    │   │ Modal confirmation:
    │   │   ┌────────────────────────────────────┐
    │   │   │ ✓ Demande envoyée                  │
    │   │   │                                    │
    │   │   │ Référence: {reference}             │
    │   │   │ Type: {type}                       │
    │   │   │ Urgence: {urgency}                 │
    │   │   │                                    │
    │   │   │ "Votre demande a été transmise aux │
    │   │   │  gestionnaires. Vous recevrez une  │
    │   │   │  notification dès qu'elle sera     │
    │   │   │  traitée."                         │
    │   │   │                                    │
    │   │   │ [Voir ma demande] [Retour accueil] │
    │   │   └────────────────────────────────────┘
    │   │
    │   ├─→ [Voir ma demande]
    │   │   │ Redirect /locataire/interventions/[new_id]
    │   │   │ Affiche détail intervention (status=demande)
    │   │   │ Badge "En attente d'approbation" (orange)
    │   │   └─→ [END]
    │   │
    │   └─→ [Retour accueil]
    │       │ Redirect /locataire/dashboard
    │       │ Intervention apparaît dans "Interventions récentes"
    │       └─→ [END]
    │
    └─→ [ERREUR]
        ├─→ User pas locataire du lot (RLS deny)
        │   │ Toast: "Vous n'êtes pas locataire de ce logement"
        │   │ Inline error sur champ "Logement"
        │   └─→ Reste sur formulaire
        │
        ├─→ Upload photo échoue
        │   │ Toast: "Erreur upload photo '{filename}'"
        │   │ Option: Continuer sans photo ou Retry
        │   └─→ Reste sur formulaire
        │
        ├─→ Validation échoue
        │   │ Inline errors sous champs concernés
        │   │ Focus premier champ en erreur
        │   └─→ Reste sur formulaire
        │
        └─→ Erreur serveur
            │ Toast: "Erreur création demande - Réessayez"
            │ Activity Log: status=failure, error_message
            │ Option: [Retry] [Sauvegarder brouillon]
            └─→ Reste sur formulaire
```

**Rôles autorisés** : Locataire (son lot uniquement), Gestionnaire (tous lots)
**Permissions RLS** :
- INSERT: `is_tenant_of_lot(lot_id)` OR `is_team_manager(team_id)`
**Notifications générées** :
- Tous gestionnaires team: "Nouvelle demande {reference} - {type} ({urgency})"
**Activity Logs** :
- `action=create, entity_type=intervention, actor_role=locataire, status=success`

**Données intervention créée** :
```json
{
  "id": "uuid",
  "reference": "INT-20251030-0001",
  "status": "demande",
  "title": "Fuite d'eau sous l'évier cuisine",
  "description": "...",
  "type": "plomberie",
  "urgency": "haute",
  "lot_id": "uuid",
  "team_id": "uuid",
  "requires_quote": true,
  "specific_location": "Cuisine, sous l'évier",
  "created_at": "2025-10-30T14:30:00Z"
}
```

---

### F5.2 - Approbation Demande (Gestionnaire)

```
[START] Gestionnaire reçoit notification "Nouvelle demande {ref}"
    │
    ▼
Gestionnaire accède /gestionnaire/interventions/[id]
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Page Détail Intervention - Status: DEMANDE                      │
│ ───────────────────────────────────────────────────────────────  │
│ Header:                                                          │
│  • Référence: {reference}                                        │
│  • Badge status: "EN ATTENTE D'APPROBATION" (orange)            │
│  • Urgence: Badge couleur selon niveau                          │
│  • Type: {type} (icon)                                           │
│                                                                  │
│ Tabs:                                                            │
│  [Résumé]* [Planning] [Devis] [Fichiers] [Chat] [Activité]     │
│                                                                  │
│ Tab Résumé (actif):                                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Informations Intervention                                  │ │
│  │ ────────────────────────────────────────────────────────── │ │
│  │ Titre: {title}                                             │ │
│  │ Description: {description}                                 │ │
│  │ Localisation: {specific_location}                          │ │
│  │ Créée le: {created_at} par {tenant_name}                  │ │
│  │ Devis requis: {Oui/Non}                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Logement Concerné                                          │ │
│  │ ────────────────────────────────────────────────────────── │ │
│  │ Référence: {lot.reference}                                 │ │
│  │ Immeuble: {building.name} (si rattaché)                    │ │
│  │ Adresse: {lot_or_building.address}                         │ │
│  │ Locataire: Avatar + {tenant_name} + phone + email         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Photos du Problème (si uploadées)                          │ │
│  │ ────────────────────────────────────────────────────────── │ │
│  │ [Gallery thumbnails clickable → lightbox]                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Actions disponibles (bottom sticky bar):                        │
│  [✓ Approuver] [✗ Rejeter] [Assigner prestataire] [Annuler]   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
Gestionnaire évalue demande
    │
    ├─→ [DÉCISION: APPROUVER]
    │   │ Clic "Approuver"
    │   │
    │   ▼
    │   ┌──────────────────────────────────────────────────────┐
    │   │ Modal: Approuver la Demande                         │
    │   │ ──────────────────────────────────────────────────── │
    │   │                                                      │
    │   │ Commentaire gestionnaire (optionnel, textarea):     │
    │   │ [Commentaire visible par toutes les parties...]     │
    │   │                                                      │
    │   │ Prochaine étape (radio):                            │
    │   │ (•) Demander devis (si requires_quote=true)         │
    │   │     └─→ Assigner prestataires pour devis            │
    │   │ ( ) Passer à la planification (si devis non requis) │
    │   │     └─→ Planifier intervention directement          │
    │   │                                                      │
    │   │ Assigner prestataire maintenant ?                   │
    │   │ [ ] Oui, assigner (affiche sélecteur multi)         │
    │   │     └─→ Liste prestataires team filtrés par         │
    │   │         speciality={type} si applicable             │
    │   │         Checkboxes: [✓] {provider_name} ({spec})    │
    │   │                                                      │
    │   │ Boutons: [Annuler] [Approuver la demande]           │
    │   └──────────────────────────────────────────────────────┘
    │       │
    │       ├─→ [Annuler] → Ferme modal
    │       │
    │       └─→ [Approuver la demande]
    │           │
    │           ▼
    │       ┌──────────────────────────────────────────────────┐
    │       │ API: POST /api/intervention-approve              │
    │       │ Payload:                                         │
    │       │  {                                               │
    │       │    intervention_id,                              │
    │       │    manager_comment (optionnel),                  │
    │       │    assigned_provider_ids (array, optionnel)     │
    │       │  }                                               │
    │       │                                                  │
    │       │ Actions:                                         │
    │       │  1. Vérifier status=demande                     │
    │       │  2. Vérifier user can_manage_intervention(id)   │
    │       │  3. UPDATE interventions SET:                   │
    │       │     - status = 'approuvee'                      │
    │       │     - manager_comment                           │
    │       │     - updated_at = NOW()                        │
    │       │  4. Si assigned_provider_ids fourni:            │
    │       │     - INSERT intervention_assignments (foreach) │
    │       │       * role='prestataire', is_primary=false    │
    │       │  5. Créer notifications:                        │
    │       │     - Locataire: "Demande approuvée"            │
    │       │     - Prestataires assignés: "Nouvelle inter"   │
    │       │  6. Activity Log: action=approve                │
    │       └──────────────────────────────────────────────────┘
    │           │
    │           ├─→ [SUCCÈS]
    │           │   │ Toast: "Demande approuvée"
    │           │   │ Badge status → "APPROUVÉE" (vert)
    │           │   │ Notifications envoyées
    │           │   │ Activity Log: status=success
    │           │   │
    │           │   ├─→ [Si requires_quote=true]
    │           │   │   │ Modal suivant: "Demander devis ?"
    │           │   │   └─→ F5.3 (Flow demande devis)
    │           │   │
    │           │   └─→ [Si requires_quote=false]
    │           │       │ Status → 'approuvee'
    │           │       │ CTA: "Passer à la planification"
    │           │       └─→ F5.5 (Flow planification)
    │           │
    │           └─→ [ERREUR]
    │               ├─→ Status invalide (pas demande)
    │               │   └─→ Toast "Transition invalide"
    │               ├─→ Permission denied (RLS)
    │               │   └─→ Toast "Accès refusé"
    │               └─→ Erreur serveur
    │                   └─→ Toast "Erreur - Réessayez"
    │
    └─→ [DÉCISION: REJETER]
        │ Clic "Rejeter"
        │
        ▼
        ┌──────────────────────────────────────────────────────┐
        │ Modal: Rejeter la Demande                           │
        │ ──────────────────────────────────────────────────── │
        │                                                      │
        │ ⚠️ "Cette action mettra fin à la demande"           │
        │                                                      │
        │ Raison du rejet* (textarea, min 20 car):            │
        │ [Expliquez pourquoi la demande est rejetée...]      │
        │                                                      │
        │ Ce message sera visible par le locataire.           │
        │                                                      │
        │ Boutons: [Annuler] [Confirmer le rejet] (rouge)     │
        └──────────────────────────────────────────────────────┘
            │
            ├─→ [Annuler] → Ferme modal
            │
            └─→ [Confirmer le rejet]
                │
                ▼
            ┌──────────────────────────────────────────────────┐
            │ API: POST /api/intervention-reject              │
            │ Payload:                                         │
            │  {                                               │
            │    intervention_id,                              │
            │    rejection_reason (required)                   │
            │  }                                               │
            │                                                  │
            │ Actions:                                         │
            │  1. Vérifier status=demande                     │
            │  2. UPDATE interventions SET:                   │
            │     - status = 'rejetee' [TERMINAL]             │
            │     - manager_comment = rejection_reason        │
            │  3. Update compteurs:                           │
            │     - lots.active_interventions -1              │
            │     - buildings.active_interventions -1         │
            │  4. Créer notification:                         │
            │     - Locataire: "Demande rejetée - {reason}"   │
            │  5. Activity Log: action=reject                 │
            └──────────────────────────────────────────────────┘
                │
                ├─→ [SUCCÈS]
                │   │ Toast: "Demande rejetée"
                │   │ Badge status → "REJETÉE" (rouge)
                │   │ Raison affichée au locataire
                │   │ Notification locataire envoyée
                │   │ Activity Log: status=success
                │   │
                │   ▼
                │   Page détail intervention (read-only)
                │   │ Status TERMINAL: Aucune action possible
                │   │ Affiche raison rejet prominent
                │   │ Option: "Créer nouvelle demande"
                │   └─→ [END]
                │
                └─→ [ERREUR]
                    ├─→ Raison trop courte (< 20 car)
                    │   └─→ Inline error "Min 20 caractères"
                    ├─→ Permission denied
                    │   └─→ Toast "Accès refusé"
                    └─→ Erreur serveur
                        └─→ Toast "Erreur - Réessayez"
```

**Rôles autorisés** : Gestionnaire uniquement
**Permissions RLS** : `can_manage_intervention(intervention_id)`
**Notifications générées** :
- **Si approuvée** :
  - Locataire: "Votre demande {reference} a été approuvée"
  - Prestataires assignés: "Nouvelle intervention assignée - {reference}"
- **Si rejetée** :
  - Locataire: "Votre demande {reference} a été rejetée - Raison: {rejection_reason}"

**Activity Logs** :
- Approbation: `action=approve, entity_type=intervention, metadata={ assigned_providers }`
- Rejet: `action=reject, entity_type=intervention, metadata={ rejection_reason }`

**Transitions statut** :
- Approuvée: `demande` → `approuvee`
- Rejetée: `demande` → `rejetee` [TERMINAL]

---

### F5.3 - Demande Devis (Gestionnaire)

```
[START] Intervention status=approuvee + requires_quote=true
    │
    ▼
Gestionnaire clique "Demander devis" (détail intervention)
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Modal: Demander Devis                                           │
│ ───────────────────────────────────────────────────────────────  │
│ Options:                                                         │
│                                                                  │
│ 1. Demander aux prestataires assignés                           │
│    └─→ Si prestataires déjà assignés                            │
│        Liste: {provider_name} ({speciality}) [✓]                │
│                                                                  │
│ 2. Sélectionner prestataires                                    │
│    └─→ Multi-select:                                            │
│        Prestataires team filtrés par provider_category={type}   │
│        [✓] {name} | {speciality} | {rating} | {phone}           │
│        Min 1, recommandé 3+ pour comparer                       │
│                                                                  │
│ 3. Demander devis externe (prestataire hors plateforme)         │
│    └─→ Champs:                                                  │
│        • Nom prestataire (text)                                 │
│        • Email (email)                                          │
│        • Téléphone (text)                                       │
│        • Message personnalisé (textarea)                        │
│        → Envoie email externe (Resend)                          │
│                                                                  │
│ Détails demande devis:                                          │
│  • Date limite soumission (date picker, défaut: +7j)            │
│  • Instructions spécifiques (textarea, optionnel)               │
│    Ex: "Merci de préciser détail fournitures/main d'œuvre"     │
│                                                                  │
│ Boutons: [Annuler] [Envoyer les demandes]                       │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [Annuler] → Ferme modal
    │
    └─→ [Envoyer les demandes]
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ API: POST /api/intervention-quote-request                        │
│ Payload:                                                         │
│  {                                                               │
│    intervention_id,                                             │
│    provider_ids (array),                                        │
│    external_providers (array, optionnel):                       │
│      [ { name, email, phone, message } ],                       │
│    deadline (date),                                             │
│    instructions (text, optionnel)                               │
│  }                                                               │
│                                                                  │
│ Actions:                                                         │
│  1. Vérifier status=approuvee                                   │
│  2. UPDATE interventions SET:                                   │
│     - status = 'demande_de_devis'                               │
│     - quote_deadline = deadline                                 │
│     - quote_instructions = instructions                         │
│  3. Si provider_ids:                                            │
│     - INSERT/UPDATE intervention_assignments (foreach)          │
│       * role='prestataire', notified=false                      │
│     - Créer notifications internes (foreach provider):          │
│       * type='quote_request'                                    │
│       * title="Demande de devis {reference}"                    │
│       * message="Soumettez devis avant {deadline}"              │
│  4. Si external_providers:                                      │
│     - Envoyer emails externes (Resend API):                     │
│       * Template: external-quote-request                        │
│       * Variables: {intervention_details, deadline, link}       │
│       * Lien: Magic link temporaire (expiration 30j)            │
│     - INSERT quote_requests (tracking externe):                 │
│       * email, name, status='sent', expires_at                  │
│  5. Activity Log: action=request_quotes                         │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS]
    │   │ Toast: "Demandes de devis envoyées à {count} prestataires"
    │   │ Badge status → "DEMANDE DE DEVIS" (bleu)
    │   │ Notifications/Emails envoyés
    │   │ Activity Log: status=success, metadata={ provider_count }
    │   │
    │   ▼
    │   Page détail intervention - Tab "Devis"
    │   │
    │   ┌──────────────────────────────────────────────────────┐
    │   │ Tab Devis                                            │
    │   │ ──────────────────────────────────────────────────── │
    │   │                                                      │
    │   │ Status: En attente de soumission                    │
    │   │ Deadline: {deadline}                                │
    │   │ Prestataires contactés: {count}                     │
    │   │                                                      │
    │   │ Liste demandes:                                      │
    │   │  • {provider_name} | Status: ⏳ En attente          │
    │   │  • {provider_name} | Status: ⏳ En attente          │
    │   │  • {external_email} (Externe) | ⏳ En attente       │
    │   │                                                      │
    │   │ Instructions: {quote_instructions}                  │
    │   │                                                      │
    │   │ Actions: [Relancer prestataires] [Ajouter prest.]   │
    │   └──────────────────────────────────────────────────────┘
    │   │
    │   └─→ Attente soumission devis prestataires
    │       └─→ F5.4 (Flow soumission devis prestataire)
    │
    └─→ [ERREUR]
        ├─→ Aucun prestataire sélectionné
        │   └─→ Inline error "Sélectionnez au moins 1 prestataire"
        ├─→ Deadline passée
        │   └─→ Inline error "Date limite doit être future"
        ├─→ Email externe invalide
        │   └─→ Inline error "Email invalide"
        └─→ Erreur serveur
            └─→ Toast "Erreur envoi demandes - Réessayez"
```

**Rôles autorisés** : Gestionnaire uniquement
**Permissions RLS** : `can_manage_intervention(intervention_id)`
**Notifications générées** :
- Prestataires internes: "Demande de devis - {intervention.title} - Deadline: {deadline}"
- Emails externes (Resend): Template avec détails intervention + magic link

**Activity Logs** :
- `action=request_quotes, entity_type=intervention, metadata={ provider_ids, external_count, deadline }`

**Transition statut** : `approuvee` → `demande_de_devis`

---

Compte tenu de la longueur très importante du document (estimée 3000-4000 lignes), je vais continuer avec les flux restants dans le même fichier. Le fichier est créé et je continue l'écriture...

---

### F5.4 - Soumission Devis (Prestataire)

```
[START] Prestataire reçoit notification "Demande de devis {ref}"
    │
    ▼
Prestataire accède /prestataire/interventions/[id]
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Page Détail Intervention - Status: DEMANDE_DE_DEVIS             │
│ Tab "Devis" actif                                                │
│ ───────────────────────────────────────────────────────────────  │
│                                                                  │
│ Badge: "ACTION REQUISE - Soumettez votre devis avant {deadline}"│
│                                                                  │
│ Informations intervention:                                       │
│  • Titre, Description, Type, Urgence                            │
│  • Localisation                                                  │
│  • Photos problème (gallery)                                     │
│  • Instructions gestionnaire: {quote_instructions}              │
│  • Deadline soumission: {quote_deadline} (countdown)            │
│                                                                  │
│ Bouton: [Soumettre mon devis]                                    │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
Prestataire clique "Soumettre mon devis"
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Modal/Page: Formulaire Soumission Devis                         │
│ ───────────────────────────────────────────────────────────────  │
│ Montant & Détails:                                               │
│  • Montant total HT* (number, min 0, step 0.01)                 │
│    Input: [_____ €] HT                                           │
│    Calcul auto TVA (20%): [_____ €] TTC                         │
│                                                                  │
│  • Type devis (select):                                          │
│    - Forfait (prix fixe)                                         │
│    - Au temps passé (tarif horaire)                             │
│    - Détaillé (lignes détaillées)                               │
│                                                                  │
│ Détail Lignes (si type=détaillé):                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Ligne 1:                                                   │ │
│  │  • Description* (text): "Remplacement robinet"             │ │
│  │  • Quantité* (number): 1                                   │ │
│  │  • Prix unitaire HT* (number): 45.00 €                     │ │
│  │  • Sous-total: 45.00 € [Auto-calculé]                      │ │
│  │  [× Supprimer ligne]                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│  [+ Ajouter une ligne]                                           │
│  Total lignes: [_____ €] HT                                      │
│                                                                  │
│ Description travaux* (textarea, min 100 car):                    │
│  [Décrivez précisément les travaux inclus dans ce devis...]     │
│  Suggestions: Fournitures, main d'œuvre, garanties, délais      │
│                                                                  │
│ Validité devis* (date picker, défaut: +30j):                    │
│  Date limite: [__/__/____]                                       │
│  "Ce devis est valable jusqu'au {valid_until}"                  │
│                                                                  │
│ Délai intervention estimé (number, optionnel):                  │
│  [__] jours après acceptation                                    │
│                                                                  │
│ Conditions & Notes (textarea, optionnel):                       │
│  [Conditions particulières, garanties, paiement...]             │
│                                                                  │
│ Documents joints (optionnel):                                    │
│  • Upload devis PDF (si déjà généré)                            │
│  • Upload certifications (si pertinent)                         │
│  Max 5 fichiers, 10MB each                                       │
│                                                                  │
│ Validations:                                                     │
│  ✓ Montant total > 0                                            │
│  ✓ Description min 100 car                                      │
│  ✓ Valid_until > now() et < intervention.quote_deadline         │
│  ✓ Si type=détaillé: Au moins 1 ligne, total cohérent          │
│                                                                  │
│ Boutons: [Sauvegarder brouillon] [Annuler] [Soumettre le devis]│
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [Sauvegarder brouillon]
    │   │ API: POST /api/intervention-quote-submit (status=draft)
    │   │ Toast: "Brouillon sauvegardé"
    │   │ Prestataire peut revenir compléter plus tard
    │   └─→ Reste sur formulaire
    │
    ├─→ [Annuler] → Ferme modal/page, aucune sauvegarde
    │
    └─→ [Soumettre le devis]
        │ Validations OK
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ API: POST /api/intervention-quote-submit                         │
│ Payload:                                                         │
│  {                                                               │
│    intervention_id, provider_id (auto from session),            │
│    amount (decimal), currency='EUR',                            │
│    quote_type ('forfait'|'hourly'|'detailed'),                  │
│    line_items (JSON array si detailed):                         │
│      [ { description, quantity, unit_price, subtotal } ],       │
│    description, valid_until, estimated_duration_days,           │
│    terms_and_conditions, documents (files)                      │
│  }                                                               │
│                                                                  │
│ Actions:                                                         │
│  1. Vérifier is_prestataire_of_intervention(intervention_id)    │
│  2. Vérifier deadline pas dépassée (NOW() < quote_deadline)     │
│  3. Upload documents Storage (si présents):                     │
│     - Bucket: intervention-documents/{team_id}/{inter_id}/      │
│     - document_type='devis'                                     │
│  4. INSERT intervention_quotes SET:                             │
│     - intervention_id, provider_id                              │
│     - amount, currency, quote_type, line_items (JSON)           │
│     - description, valid_until, estimated_duration_days         │
│     - terms_and_conditions                                      │
│     - status = 'submitted' [Initial]                            │
│     - created_at = NOW()                                        │
│  5. Créer notifications:                                        │
│     - Gestionnaires team: "Nouveau devis soumis - {provider}"  │
│     - Mention montant: "{amount} € HT"                          │
│  6. Activity Log: action=submit_quote                           │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS]
    │   │ Toast: "Devis soumis avec succès"
    │   │ Modal confirmation:
    │   │   ┌────────────────────────────────────┐
    │   │   │ ✓ Devis envoyé                     │
    │   │   │                                    │
    │   │   │ Montant: {amount} € HT             │
    │   │   │ Validité: jusqu'au {valid_until}   │
    │   │   │                                    │
    │   │   │ "Votre devis a été transmis au     │
    │   │   │  gestionnaire. Vous serez notifié  │
    │   │   │  de sa décision."                  │
    │   │   │                                    │
    │   │   │ [Voir l'intervention] [OK]         │
    │   │   └────────────────────────────────────┘
    │   │
    │   ▼
    │   Page détail intervention - Tab Devis
    │   │ Mon devis affiché:
    │   │  • Status: ⏳ En attente validation
    │   │  • Montant: {amount} € HT
    │   │  • Soumis le: {created_at}
    │   │  • Actions: [Modifier] [Retirer]
    │   │
    │   └─→ Attente validation gestionnaire
    │       └─→ F5.5 (Flow validation devis gestionnaire)
    │
    └─→ [ERREUR]
        ├─→ Deadline dépassée
        │   │ Toast: "Deadline de soumission dépassée ({deadline})"
        │   │ Modal: "Contactez gestionnaire pour prolonger"
        │   └─→ Formulaire disabled
        │
        ├─→ Devis déjà soumis
        │   │ Toast: "Vous avez déjà soumis un devis"
        │   │ CTA: "Modifier le devis existant"
        │   └─→ Charge devis existant en mode édition
        │
        ├─→ Montant invalide (≤ 0 ou > 1000000)
        │   │ Inline error: "Montant invalide"
        │   └─→ Reste sur formulaire
        │
        ├─→ Description trop courte (< 100 car)
        │   │ Inline error: "Description trop courte (min 100 car)"
        │   └─→ Reste sur formulaire, focus champ
        │
        ├─→ Upload document échoue
        │   │ Toast: "Erreur upload document"
        │   │ Option: Continuer sans document ou Retry
        │   └─→ Reste sur formulaire
        │
        └─→ Erreur serveur
            │ Toast: "Erreur soumission devis - Réessayez"
            │ Activity Log: status=failure
            │ Option: [Retry] [Sauvegarder brouillon]
            └─→ Reste sur formulaire
```

**Rôles autorisés** : Prestataire (assigné à intervention uniquement)
**Permissions RLS** : `is_prestataire_of_intervention(intervention_id)`
**Notifications générées** :
- Gestionnaires team: "Nouveau devis soumis par {provider_name} - {amount} € HT - Intervention {reference}"
**Activity Logs** :
- `action=submit_quote, entity_type=intervention_quote, actor_role=prestataire, metadata={ amount, quote_type }`

**Données devis créées** :
```json
{
  "id": "uuid",
  "intervention_id": "uuid",
  "provider_id": "uuid",
  "amount": 450.00,
  "currency": "EUR",
  "quote_type": "detailed",
  "line_items": [
    {
      "description": "Remplacement robinet",
      "quantity": 1,
      "unit_price": 45.00,
      "subtotal": 45.00
    },
    {
      "description": "Main d'œuvre (2h)",
      "quantity": 2,
      "unit_price": 65.00,
      "subtotal": 130.00
    }
  ],
  "description": "Remplacement complet robinet cuisine...",
  "status": "submitted",
  "valid_until": "2025-11-30",
  "estimated_duration_days": 1,
  "created_at": "2025-10-30T15:00:00Z"
}
```

**Business Rules** :
- Prestataire peut soumettre 1 seul devis par intervention
- Modification possible tant que status=submitted (pas validé)
- Deadline stricte (bloque soumission si dépassée)
- Gestionnaire reçoit notification immédiate

---

### F5.5 - Validation Devis (Gestionnaire)

```
[START] Gestionnaire reçoit notification "Nouveau devis soumis"
    │
    ▼
Gestionnaire accède /gestionnaire/interventions/[id] - Tab "Devis"
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Tab Devis - Status intervention: DEMANDE_DE_DEVIS               │
│ ───────────────────────────────────────────────────────────────  │
│ Devis reçus: 3 soumissions                                       │
│                                                                  │
│ Vue Liste:                                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Devis #1 - {Provider A}                                    │ │
│  │ ────────────────────────────────────────────────────────── │ │
│  │ Montant: 450.00 € HT (540.00 € TTC)                        │ │
│  │ Type: Forfait                                              │ │
│  │ Soumis le: 30/10/2025 15:00                                │ │
│  │ Validité: jusqu'au 30/11/2025                              │ │
│  │ Délai: 1 jour                                              │ │
│  │ Status: ⏳ En attente                                      │ │
│  │ [Voir détails] [Valider] [Rejeter]                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Devis #2 - {Provider B}                                    │ │
│  │ Montant: 380.00 € HT (456.00 € TTC)                        │ │
│  │ Type: Détaillé (5 lignes)                                  │ │
│  │ Soumis le: 30/10/2025 16:30                                │ │
│  │ [Voir détails] [Valider] [Rejeter]                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Devis #3 - {Provider C}                                    │ │
│  │ Montant: 520.00 € HT (624.00 € TTC)                        │ │
│  │ [Voir détails] [Valider] [Rejeter]                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Action: [Comparer les devis] (affiche tableau comparatif)       │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [Comparer les devis]
    │   │
    │   ▼
    │   ┌──────────────────────────────────────────────────────┐
    │   │ Modal: Comparaison Devis (quotes-comparison.tsx)    │
    │   │ ──────────────────────────────────────────────────── │
    │   │                                                      │
    │   │ Tableau comparatif côte-à-côte:                     │
    │   │                                                      │
    │   │           Provider A   Provider B   Provider C      │
    │   │ Montant   450.00 €     380.00 € ✓   520.00 €       │
    │   │ TTC       540.00 €     456.00 €     624.00 €       │
    │   │ Type      Forfait      Détaillé     Forfait        │
    │   │ Délai     1 jour       2 jours      1 jour         │
    │   │ Rating    4.5/5 ⭐     4.8/5 ⭐     4.2/5 ⭐       │
    │   │ Détails   [Voir]       [Voir]       [Voir]         │
    │   │                                                      │
    │   │ Actions:  [Valider]    [Valider]    [Valider]      │
    │   │           [Rejeter]    [Rejeter]    [Rejeter]      │
    │   │                                                      │
    │   └──────────────────────────────────────────────────────┘
    │   │
    │   └─→ Gestionnaire choisit meilleur devis
    │
    └─→ [Valider] devis sélectionné
        │
        ▼
        ┌──────────────────────────────────────────────────────┐
        │ Modal: Valider le Devis                             │
        │ ──────────────────────────────────────────────────── │
        │                                                      │
        │ Récapitulatif:                                       │
        │  • Prestataire: {provider_name}                     │
        │  • Montant: {amount} € HT ({amount_ttc} € TTC)      │
        │  • Type: {quote_type}                               │
        │  • Délai: {estimated_duration_days} jours           │
        │                                                      │
        │ ✓ "En validant ce devis, vous approuvez le montant  │
        │    et acceptez les conditions du prestataire."       │
        │                                                      │
        │ Ajuster budget estimé ? (optionnel):                │
        │  Intervention.estimated_cost = [____] € (pré-rempli)│
        │                                                      │
        │ Commentaire validation (optionnel, textarea):       │
        │  [Commentaire visible par prestataire...]            │
        │                                                      │
        │ Prochaine étape:                                    │
        │  (•) Passer à la planification (recommandé)         │
        │  ( ) Rester en attente (validation seule)           │
        │                                                      │
        │ Boutons: [Annuler] [Valider ce devis]               │
        └──────────────────────────────────────────────────────┘
            │
            ├─→ [Annuler] → Ferme modal
            │
            └─→ [Valider ce devis]
                │
                ▼
            ┌──────────────────────────────────────────────────┐
            │ API: POST /api/quotes/[quote_id]/approve        │
            │ Payload:                                         │
            │  {                                               │
            │    quote_id,                                     │
            │    manager_comment (optionnel),                  │
            │    estimated_cost (update si fourni)             │
            │  }                                               │
            │                                                  │
            │ Actions:                                         │
            │  1. Vérifier can_manage_quote(quote_id)         │
            │  2. UPDATE intervention_quotes SET:             │
            │     - status = 'approved'                       │
            │     - validated_by = manager_id                 │
            │     - validated_at = NOW()                      │
            │  3. Rejeter automatiquement autres devis:       │
            │     - UPDATE quotes WHERE intervention_id=X     │
            │       AND id != approved_quote_id               │
            │       SET status='rejected',                    │
            │           rejection_reason='Autre devis validé' │
            │  4. UPDATE interventions SET:                   │
            │     - status = 'planification'                  │
            │     - estimated_cost = quote.amount             │
            │     - selected_provider_id = quote.provider_id  │
            │       (si pas déjà assigné primary)             │
            │  5. Créer notifications:                        │
            │     - Prestataire sélectionné: "Devis accepté"  │
            │     - Prestataires rejetés: "Devis non retenu"  │
            │     - Locataire: "Devis validé - Planification" │
            │  6. Activity Log: action=approve_quote          │
            └──────────────────────────────────────────────────┘
                │
                ├─→ [SUCCÈS]
                │   │ Toast: "Devis validé - Passage à planification"
                │   │ Badge status intervention → "PLANIFICATION" (violet)
                │   │ Devis validé badge → "✓ VALIDÉ" (vert)
                │   │ Autres devis badge → "✗ Non retenu" (gris)
                │   │ Notifications envoyées
                │   │ Activity Log: status=success
                │   │
                │   ├─→ [Si "Passer à planification" coché]
                │   │   │ Redirect automatique Tab "Planning"
                │   │   └─→ F5.6 (Flow planification)
                │   │
                │   └─→ [Sinon]
                │       │ Reste sur Tab Devis
                │       │ CTA: "Planifier l'intervention maintenant"
                │       └─→ [END phase devis]
                │
                └─→ [ERREUR]
                    ├─→ Devis déjà validé
                    │   └─→ Toast "Devis déjà validé"
                    ├─→ Devis expiré (valid_until < now)
                    │   │ Toast: "Devis expiré - Demandez prolongation"
                    │   └─→ CTA "Contacter prestataire"
                    └─→ Erreur serveur
                        └─→ Toast "Erreur validation - Réessayez"
```

**Alternative: REJETER Devis**

```
Gestionnaire clique "Rejeter" sur un devis
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Modal: Rejeter le Devis                                         │
│ ───────────────────────────────────────────────────────────────  │
│ Prestataire: {provider_name}                                     │
│ Montant: {amount} € HT                                           │
│                                                                  │
│ Raison du rejet* (select + textarea):                            │
│  ( ) Prix trop élevé                                             │
│  ( ) Délai trop long                                             │
│  ( ) Proposition inadéquate                                      │
│  ( ) Autre raison (précisez)                                     │
│                                                                  │
│ Commentaire* (textarea, min 20 car):                             │
│ [Expliquez la raison du rejet au prestataire...]                │
│                                                                  │
│ Options:                                                         │
│  [ ] Autoriser resoumission (nouveau devis avec corrections)    │
│      └─→ Prolonge deadline de +3 jours                           │
│                                                                  │
│ Boutons: [Annuler] [Rejeter ce devis] (orange)                  │
└──────────────────────────────────────────────────────────────────┘
    │
    └─→ [Rejeter ce devis]
        │
        ▼
    ┌──────────────────────────────────────────────────────────────┐
    │ API: POST /api/quotes/[quote_id]/reject                      │
    │ Payload: { quote_id, rejection_reason, allow_resubmission }  │
    │                                                               │
    │ Actions:                                                      │
    │  1. UPDATE intervention_quotes SET:                          │
    │     - status = 'rejected'                                    │
    │     - rejection_reason                                       │
    │     - rejected_by = manager_id, rejected_at = NOW()          │
    │  2. Si allow_resubmission:                                   │
    │     - UPDATE interventions.quote_deadline (+3 jours)         │
    │  3. Créer notification:                                      │
    │     - Prestataire: "Devis rejeté - {rejection_reason}"       │
    │  4. Activity Log: action=reject_quote                        │
    └──────────────────────────────────────────────────────────────┘
        │
        ├─→ [SUCCÈS]
        │   │ Toast: "Devis rejeté"
        │   │ Devis badge → "✗ REJETÉ" (rouge)
        │   │ Notification prestataire envoyée
        │   │
        │   ├─→ [Si allow_resubmission=true]
        │   │   │ Prestataire peut soumettre nouveau devis
        │   │   │ Notification: "Vous pouvez soumettre nouveau devis"
        │   │   └─→ Deadline prolongée
        │   │
        │   └─→ [Sinon]
        │       │ Prestataire ne peut plus soumettre
        │       └─→ [END pour ce prestataire]
        │
        └─→ [ERREUR]
            └─→ Toast "Erreur rejet - Réessayez"
```

**Rôles autorisés** : Gestionnaire uniquement
**Permissions RLS** : `can_manage_quote(quote_id)`
**Notifications générées** :
- **Si validé** :
  - Prestataire validé: "Votre devis de {amount} € HT a été accepté - Planification en cours"
  - Prestataires rejetés: "Votre devis n'a pas été retenu - Un autre prestataire a été sélectionné"
  - Locataire: "Devis validé - {provider_name} interviendra pour {amount} € HT"
- **Si rejeté** :
  - Prestataire: "Votre devis a été rejeté - Raison: {rejection_reason}" + (optionnel: "Vous pouvez soumettre un nouveau devis")

**Activity Logs** :
- Validation: `action=approve_quote, entity_type=intervention_quote, metadata={ quote_id, amount }`
- Rejet: `action=reject_quote, entity_type=intervention_quote, metadata={ quote_id, rejection_reason, allow_resubmission }`

**Transition statut intervention** : `demande_de_devis` → `planification` (après validation devis)

---

### F5.6 - Planification Créneaux (Multi-Parties)

```
[START] Intervention status=planification (après devis validé ou si pas devis)
    │
    ▼
Gestionnaire accède Tab "Planning"
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Tab Planning - 3 Modes Disponibles                              │
│ ───────────────────────────────────────────────────────────────  │
│ Sélectionnez mode de planification:                             │
│                                                                  │
│ ( ) Mode Flexible (recommandé)                                  │
│     "Les 3 parties proposent disponibilités, système trouve     │
│      créneaux communs automatiquement"                          │
│     → Adapté si flexibilité des 3 côtés                         │
│                                                                  │
│ ( ) Mode Slots                                                  │
│     "Vous proposez plusieurs créneaux, prestataire et locataire │
│      votent pour leur préférence"                               │
│     → Adapté si vous avez déjà quelques dates possibles         │
│                                                                  │
│ (•) Mode Date Fixe [DEFAULT simple]                             │
│     "Vous imposez une date/heure précise immédiatement"         │
│     → Adapté si date déjà convenue (téléphone, urgence)         │
│                                                                  │
│ [Continuer avec ce mode]                                         │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [MODE FLEXIBLE] (scheduling_type=flexible)
    │   │
    │   ▼
    │   ┌──────────────────────────────────────────────────────┐
    │   │ Planification Flexible - Étape 1/3                  │
    │   │ ──────────────────────────────────────────────────── │
    │   │ "Demander disponibilités aux parties"               │
    │   │                                                      │
    │   │ Message automatique envoyé:                         │
    │   │  • Prestataire: "Indiquez vos disponibilités"       │
    │   │  • Locataire: "Indiquez vos disponibilités"         │
    │   │                                                      │
    │   │ [Envoyer les demandes]                              │
    │   └──────────────────────────────────────────────────────┘
    │       │
    │       ▼
    │   ┌──────────────────────────────────────────────────────┐
    │   │ API: POST /api/intervention/[id]/request-            │
    │   │      availabilities                                  │
    │   │                                                      │
    │   │ Actions:                                             │
    │   │  1. UPDATE interventions SET                        │
    │   │     scheduling_type='flexible'                      │
    │   │  2. Créer notifications:                            │
    │   │     - Prestataire: "Indiquez disponibilités"        │
    │   │     - Locataire: "Indiquez disponibilités"          │
    │   │  3. Activity Log: action=request_availabilities     │
    │   └──────────────────────────────────────────────────────┘
    │       │
    │       ▼
    │   ┌──────────────────────────────────────────────────────┐
    │   │ Prestataire & Locataire reçoivent notification       │
    │   │ "ACTION REQUISE: Indiquez vos disponibilités"       │
    │   └──────────────────────────────────────────────────────┘
    │       │
    │       ├─→ [PRESTATAIRE] accède intervention
    │       │   │
    │       │   ▼
    │       │   ┌──────────────────────────────────────────────┐
    │       │   │ Modal: Mes Disponibilités (Prestataire)     │
    │       │   │ ──────────────────────────────────────────── │
    │       │   │                                              │
    │       │   │ Calendrier interactif (date picker range):  │
    │       │   │  • Sélectionnez plages de dates             │
    │       │   │  • Ajoutez créneaux horaires                │
    │       │   │                                              │
    │       │   │ Créneaux proposés:                          │
    │       │   │  ┌────────────────────────────────────────┐ │
    │       │   │  │ Créneau 1:                             │ │
    │       │   │  │  • Date: [03/11/2025]                  │ │
    │       │   │  │  • Heure début: [09:00]                │ │
    │       │   │  │  • Heure fin: [12:00]                  │ │
    │       │   │  │  [× Supprimer]                          │ │
    │       │   │  └────────────────────────────────────────┘ │
    │       │   │  [+ Ajouter un créneau]                     │
    │       │   │                                              │
    │       │   │ Notes (optionnel):                          │
    │       │   │  [Précisions sur disponibilités...]         │
    │       │   │                                              │
    │       │   │ Boutons: [Annuler] [Envoyer disponibilités] │
    │       │   └──────────────────────────────────────────────┘
    │       │       │
    │       │       └─→ [Envoyer disponibilités]
    │       │           │
    │       │           ▼
    │       │       ┌──────────────────────────────────────────┐
    │       │       │ API: POST /api/intervention/[id]/        │
    │       │       │      user-availability                   │
    │       │       │ Payload:                                 │
    │       │       │  {                                       │
    │       │       │    slots: [                              │
    │       │       │      { date, start_time, end_time },     │
    │       │       │      ...                                 │
    │       │       │    ],                                    │
    │       │       │    notes                                 │
    │       │       │  }                                       │
    │       │       │                                          │
    │       │       │ Actions:                                 │
    │       │       │  1. INSERT intervention_time_slots       │
    │       │       │     (foreach slot):                      │
    │       │       │     - status='proposed'                  │
    │       │       │     - proposed_by=prestataire_id         │
    │       │       │  2. Notification gestionnaire:           │
    │       │       │     "Prestataire a indiqué dispos"       │
    │       │       └──────────────────────────────────────────┘
    │       │           │
    │       │           └─→ Toast: "Disponibilités envoyées"
    │       │
    │       └─→ [LOCATAIRE] même processus
    │           │ Modal similaire
    │           │ Propose ses créneaux
    │           └─→ API: POST /api/intervention/[id]/
    │                    tenant-availability
    │
    │       ▼
    │   ┌──────────────────────────────────────────────────────┐
    │   │ Gestionnaire reçoit notifications:                   │
    │   │  ✓ "Prestataire a indiqué disponibilités"            │
    │   │  ✓ "Locataire a indiqué disponibilités"              │
    │   └──────────────────────────────────────────────────────┘
    │       │
    │       ▼
    │   ┌──────────────────────────────────────────────────────┐
    │   │ Gestionnaire accède Tab Planning                     │
    │   │ Composant: availability-matcher.tsx                  │
    │   │ ──────────────────────────────────────────────────── │
    │   │                                                      │
    │   │ Matching Automatique:                                │
    │   │  "✓ 3 créneaux communs trouvés !"                   │
    │   │                                                      │
    │   │  ┌────────────────────────────────────────────────┐ │
    │   │  │ Créneau Commun 1 (recommandé ⭐)               │ │
    │   │  │ ────────────────────────────────────────────── │ │
    │   │  │ Date: Lundi 03/11/2025                         │ │
    │   │  │ Heure: 09:00 - 11:00                           │ │
    │   │  │ ✓ Prestataire disponible                       │ │
    │   │  │ ✓ Locataire disponible                         │ │
    │   │  │ ✓ Gestionnaire OK                              │ │
    │   │  │ [Sélectionner ce créneau]                      │ │
    │   │  └────────────────────────────────────────────────┘ │
    │   │                                                      │
    │   │  [Créneaux alternatifs: 2 autres]                   │
    │   │                                                      │
    │   │  Si aucun créneau commun:                           │
    │   │   ⚠ "Aucun créneau commun trouvé"                  │
    │   │   Actions:                                           │
    │   │    • [Redemander disponibilités]                    │
    │   │    • [Imposer date fixe]                            │
    │   └──────────────────────────────────────────────────────┘
    │       │
    │       └─→ Gestionnaire sélectionne créneau optimal
    │           │
    │           ▼
    │       ┌──────────────────────────────────────────────────┐
    │       │ API: POST /api/intervention/[id]/select-slot    │
    │       │ Payload: { slot_id }                            │
    │       │                                                  │
    │       │ Actions:                                         │
    │       │  1. UPDATE intervention_time_slots SET:         │
    │       │     - is_selected=true (slot choisi)            │
    │       │     - selected_by_manager=true                  │
    │       │     - status='selected'                         │
    │       │  2. UPDATE interventions SET:                   │
    │       │     - status = 'planifiee'                      │
    │       │     - scheduled_date = slot.date + start_time   │
    │       │     - selected_slot_id                          │
    │       │  3. Notifications 3 parties:                    │
    │       │     "Intervention planifiée le {date}"          │
    │       │  4. Activity Log: action=schedule               │
    │       └──────────────────────────────────────────────────┘
    │           │
    │           ├─→ [SUCCÈS]
    │           │   │ Toast: "Intervention planifiée"
    │           │   │ Badge status → "PLANIFIÉE" (bleu)
    │           │   │ Date/heure affichée
    │           │   │ Notifications envoyées
    │           │   │ Rappels automatiques créés:
    │           │   │  - J-1: Toutes parties
    │           │   │  - H-2: Toutes parties
    │           │   └─→ Attente jour J
    │           │       └─→ F5.7 (Démarrage travaux)
    │           │
    │           └─→ [ERREUR]
    │               └─→ Toast "Erreur planification"
    │
    ├─→ [MODE SLOTS] (scheduling_type=slots)
    │   │
    │   ▼
    │   ┌──────────────────────────────────────────────────────┐
    │   │ Gestionnaire propose plusieurs créneaux              │
    │   │ ──────────────────────────────────────────────────── │
    │   │                                                      │
    │   │ Créneaux proposés:                                   │
    │   │  ┌────────────────────────────────────────────────┐ │
    │   │  │ Option A: Lundi 03/11 - 09:00-12:00           │ │
    │   │  │ Option B: Mardi 04/11 - 14:00-17:00           │ │
    │   │  │ Option C: Mercredi 05/11 - 10:00-13:00        │ │
    │   │  └────────────────────────────────────────────────┘ │
    │   │                                                      │
    │   │ [Envoyer aux parties pour vote]                     │
    │   └──────────────────────────────────────────────────────┘
    │       │
    │       ▼
    │   Prestataire & Locataire votent (accept/reject chaque slot)
    │       │
    │       ▼
    │   Premier slot avec 2 "accept" → Auto-sélectionné
    │       │
    │       └─→ Status 'planifiee'
    │
    └─→ [MODE DATE FIXE] (scheduling_type=fixed)
        │
        ▼
        ┌──────────────────────────────────────────────────────┐
        │ Modal: Planification Date Fixe                      │
        │ ──────────────────────────────────────────────────── │
        │                                                      │
        │ "Imposer une date/heure immédiatement"              │
        │                                                      │
        │ Date intervention* (date picker):                   │
        │  [03/11/2025]                                        │
        │                                                      │
        │ Heure début* (time picker):                         │
        │  [09:00]                                             │
        │                                                      │
        │ Heure fin estimée (time picker):                    │
        │  [12:00]                                             │
        │                                                      │
        │ Raison date fixe (optionnel):                       │
        │  [Urgence, date convenue téléphone, etc.]           │
        │                                                      │
        │ ⚠ "Les parties seront notifiées de cette date"     │
        │                                                      │
        │ Boutons: [Annuler] [Planifier]                      │
        └──────────────────────────────────────────────────────┘
            │
            └─→ [Planifier]
                │
                ▼
            ┌──────────────────────────────────────────────────┐
            │ API: POST /api/intervention-schedule            │
            │ Payload:                                         │
            │  {                                               │
            │    intervention_id,                              │
            │    scheduled_date (datetime),                    │
            │    scheduled_end_time (optionnel),               │
            │    notes                                         │
            │  }                                               │
            │                                                  │
            │ Actions:                                         │
            │  1. UPDATE interventions SET:                   │
            │     - status = 'planifiee'                      │
            │     - scheduled_date                            │
            │     - scheduling_type='fixed'                   │
            │  2. Notifications 3 parties:                    │
            │     "Intervention planifiée {date}"             │
            │  3. Activity Log: action=schedule_fixed         │
            └──────────────────────────────────────────────────┘
                │
                ├─→ [SUCCÈS]
                │   │ Toast: "Intervention planifiée"
                │   │ Status → 'planifiee'
                │   │ Notifications envoyées
                │   └─→ Attente jour J
                │
                └─→ [ERREUR]
                    ├─→ Date passée
                    │   └─→ Inline error "Date doit être future"
                    └─→ Erreur serveur
                        └─→ Toast "Erreur planification"
```

**Rôles impliqués** : Gestionnaire (décision), Prestataire (dispos), Locataire (dispos)
**Permissions RLS** : `can_manage_intervention(id)` pour gestionnaire, `is_assigned_to_intervention(id)` pour autres
**Notifications générées** :
- Demande dispos: Prestataire + Locataire "Indiquez vos disponibilités pour {reference}"
- Créneau sélectionné: Toutes parties "Intervention planifiée le {date} à {time}"
- Rappels automatiques: J-1 et H-2 avant scheduled_date

**Activity Logs** :
- `action=request_availabilities, entity_type=intervention`
- `action=submit_availability, actor_role=prestataire/locataire`
- `action=schedule, entity_type=intervention, metadata={ scheduling_type, scheduled_date }`

**Transition statut** : `planification` → `planifiee`

---

### F5.7 - Démarrage Travaux (Prestataire)

```
[START] Jour J: Intervention status=planifiee, scheduled_date=aujourd'hui
    │
    ▼
Prestataire reçoit rappel: "Intervention aujourd'hui - {time}"
    │
    ▼
Prestataire accède /prestataire/interventions/[id]
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Page Détail Intervention - Status: PLANIFIÉE                    │
│ ───────────────────────────────────────────────────────────────  │
│ Badge: "AUJOURD'HUI - {scheduled_date} à {time}"                 │
│                                                                  │
│ Informations:                                                    │
│  • Adresse: {lot_address} (lien Google Maps)                    │
│  • Contact locataire: {tenant_phone} (clic to call)             │
│  • Devis validé: {amount} € HT                                   │
│  • Durée estimée: {estimated_duration_days} jours                │
│                                                                  │
│ Action: [Démarrer les travaux]                                   │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
Prestataire sur place, clique "Démarrer les travaux"
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Modal: Démarrer les Travaux                                     │
│ ───────────────────────────────────────────────────────────────  │
│ ✓ "Confirmez que vous êtes sur place et démarrez travaux"       │
│                                                                  │
│ Heure début effective (auto-rempli: NOW()):                     │
│  [30/10/2025 09:15]                                              │
│                                                                  │
│ Photos avant travaux (optionnel, recommandé):                   │
│  • Upload multiple (max 10 photos)                              │
│  • Formats: JPG, PNG                                             │
│  • Max 5MB each                                                  │
│  [Drag & drop zone]                                              │
│                                                                  │
│ Notes début (optionnel, textarea):                              │
│  [Observations initiales, état des lieux...]                    │
│                                                                  │
│ Boutons: [Annuler] [Démarrer]                                    │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [Annuler] → Ferme modal
    │
    └─→ [Démarrer]
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ API: POST /api/intervention-start                                │
│ Payload:                                                         │
│  {                                                               │
│    intervention_id,                                             │
│    start_notes (optionnel),                                     │
│    before_photos (array files, optionnel)                       │
│  }                                                               │
│                                                                  │
│ Actions:                                                         │
│  1. Vérifier status=planifiee                                   │
│  2. Vérifier is_prestataire_of_intervention(id)                 │
│  3. UPDATE interventions SET:                                   │
│     - status = 'en_cours'                                       │
│     - actual_start_time = NOW()                                 │
│     - updated_at = NOW()                                        │
│  4. Si before_photos:                                            │
│     - Upload Storage                                             │
│     - INSERT intervention_documents:                            │
│       * document_type='photo_avant'                             │
│       * uploaded_by=prestataire_id                              │
│  5. Créer notifications:                                        │
│     - Gestionnaire: "Travaux démarrés - {reference}"            │
│     - Locataire: "Travaux en cours à votre logement"            │
│  6. Activity Log: action=start_work                             │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS]
    │   │ Toast: "Travaux démarrés"
    │   │ Badge status → "EN COURS" (vert vif)
    │   │ Timer début affiché: "Démarré à 09:15"
    │   │ Notifications envoyées
    │   │ Activity Log: status=success
    │   │
    │   ▼
    │   Page détail intervention - Mode "En cours"
    │   │
    │   ┌──────────────────────────────────────────────────────┐
    │   │ Actions pendant travaux:                             │
    │   │  • [Upload photos progression]                       │
    │   │  • [Ajouter notes/observations]                      │
    │   │  • [Joindre documents (factures, etc.)]              │
    │   │  • [Chat avec gestionnaire/locataire]                │
    │   │  • [Marquer terminé]                                  │
    │   └──────────────────────────────────────────────────────┘
    │   │
    │   └─→ Prestataire travaille, upload docs au fur et à mesure
    │       └─→ F5.8 (Fin travaux)
    │
    └─→ [ERREUR]
        ├─→ Status invalide (pas planifiee)
        │   └─→ Toast "Impossible démarrer - Status invalide"
        ├─→ Permission denied (pas assigné)
        │   └─→ Toast "Accès refusé"
        ├─→ Upload photos échoue
        │   │ Toast: "Erreur upload photos"
        │   │ Option: Continuer sans photos ou Retry
        │   └─→ Modal reste ouverte
        └─→ Erreur serveur
            └─→ Toast "Erreur démarrage - Réessayez"
```

**Rôles autorisés** : Prestataire (assigné à intervention uniquement)
**Permissions RLS** : `is_prestataire_of_intervention(intervention_id)`
**Notifications générées** :
- Gestionnaire: "Travaux démarrés - Intervention {reference} par {provider_name}"
- Locataire: "Les travaux sont en cours à votre logement ({type})"

**Activity Logs** :
- `action=start_work, entity_type=intervention, actor_role=prestataire, metadata={ actual_start_time }`

**Transition statut** : `planifiee` → `en_cours`

**Données tracking** :
- `actual_start_time`: Timestamp précis début travaux
- Photos avant uploadées: Traçabilité état initial

---

### F5.8 - Fin Travaux & Rapport (Prestataire)

```
[START] Travaux terminés, intervention status=en_cours
    │
    ▼
Prestataire clique "Marquer terminé" (détail intervention)
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Modal: Rapport de Fin de Travaux                                │
│ ───────────────────────────────────────────────────────────────  │
│ Heure fin effective (auto-rempli: NOW()):                       │
│  [30/10/2025 11:45]                                              │
│                                                                  │
│ Durée réelle:                                                    │
│  2h30 (calculé auto depuis actual_start_time)                   │
│                                                                  │
│ Rapport de travaux* (textarea, min 100 car):                    │
│  [Décrivez les travaux effectués, fournitures utilisées,        │
│   observations, recommandations...]                              │
│                                                                  │
│ Travaux conformes au devis ?                                    │
│  (•) Oui, conformes                                              │
│  ( ) Non, dépassement (expliquez)                               │
│      └─→ Si coché: Textarea "Raison dépassement"                │
│                                                                  │
│ Photos après travaux* (obligatoire, min 2 photos):              │
│  • Upload multiple                                               │
│  • Formats: JPG, PNG                                             │
│  • Max 10MB each                                                 │
│  [Drag & drop zone]                                              │
│  Gallery: [Thumbnail 1] [Thumbnail 2] ...                       │
│                                                                  │
│ Documents supplémentaires (optionnel):                          │
│  • Factures fournisseurs                                         │
│  • Certificats (si applicable)                                   │
│  • Garanties                                                     │
│  [Upload zone]                                                   │
│                                                                  │
│ Recommandations / Suivi nécessaire ? (checkbox)                 │
│  [ ] Intervention de suivi requise                              │
│      └─→ Textarea: "Précisez nature suivi"                      │
│                                                                  │
│ Validations:                                                     │
│  ✓ Rapport min 100 car                                          │
│  ✓ Au moins 2 photos après                                      │
│  ✓ Photos < 10MB each                                           │
│                                                                  │
│ Boutons: [Sauvegarder brouillon] [Annuler] [Marquer terminé]   │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [Sauvegarder brouillon] → Sauvegarde partielle, pas de changement status
    │
    ├─→ [Annuler] → Ferme modal, aucune action
    │
    └─→ [Marquer terminé]
        │ Validations OK
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ API: POST /api/intervention-complete                             │
│ Payload:                                                         │
│  {                                                               │
│    intervention_id,                                             │
│    provider_comment (rapport),                                  │
│    actual_duration_minutes (calculé),                           │
│    conforms_to_quote (boolean),                                 │
│    exceeding_reason (si non conforme),                          │
│    after_photos (array files),                                  │
│    additional_documents (array files, optionnel),               │
│    follow_up_required (boolean),                                │
│    follow_up_notes (si oui)                                     │
│  }                                                               │
│                                                                  │
│ Actions:                                                         │
│  1. Vérifier status=en_cours                                    │
│  2. Vérifier is_prestataire_of_intervention(id)                 │
│  3. UPDATE interventions SET:                                   │
│     - status = 'cloturee_par_prestataire'                       │
│     - completed_date = NOW()                                    │
│     - provider_comment                                          │
│     - actual_duration_minutes                                   │
│     - conforms_to_quote                                         │
│     - updated_at = NOW()                                        │
│  4. Upload photos après:                                        │
│     - Storage: intervention-documents/{team_id}/{id}/           │
│     - INSERT intervention_documents (foreach):                  │
│       * document_type='photo_apres'                             │
│       * uploaded_by=prestataire_id                              │
│       * is_validated=false (attente validation gestionnaire)    │
│  5. Upload documents supplémentaires:                           │
│     - INSERT intervention_documents:                            │
│       * document_type='facture'|'certificat'|'garantie'         │
│  6. Si follow_up_required:                                      │
│     - INSERT intervention_reports:                              │
│       * report_type='follow_up_required'                        │
│       * content=follow_up_notes                                 │
│  7. Créer notifications:                                        │
│     - Locataire: "Travaux terminés - Validation requise"        │
│     - Gestionnaire: "Travaux terminés par {provider_name}"      │
│  8. Activity Log: action=complete_work                          │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS]
    │   │ Toast: "Travaux marqués terminés"
    │   │ Modal confirmation:
    │   │   ┌────────────────────────────────────┐
    │   │   │ ✓ Rapport envoyé                   │
    │   │   │                                    │
    │   │   │ "Votre rapport a été transmis au   │
    │   │   │  locataire pour validation."       │
    │   │   │                                    │
    │   │   │ Durée travaux: 2h30                │
    │   │   │ Photos uploadées: 5                │
    │   │   │                                    │
    │   │   │ [Voir l'intervention] [OK]         │
    │   │   └────────────────────────────────────┘
    │   │
    │   ▼
    │   Badge status → "TERMINÉ - VALIDATION LOCATAIRE" (orange)
    │   │ Notifications envoyées
    │   │ Activity Log: status=success
    │   │
    │   ▼
    │   Attente validation locataire
    │   │ Prestataire peut encore:
    │   │  • Consulter intervention (read-only)
    │   │  • Chat avec locataire/gestionnaire
    │   │  • Upload docs complémentaires
    │   │
    │   └─→ F5.9 (Validation locataire)
    │
    └─→ [ERREUR]
        ├─→ Status invalide (pas en_cours)
        │   └─→ Toast "Transition invalide"
        │
        ├─→ Photos manquantes (< 2)
        │   │ Inline error: "Min 2 photos après requises"
        │   └─→ Modal reste ouverte, focus upload
        │
        ├─→ Rapport trop court (< 100 car)
        │   │ Inline error: "Rapport min 100 caractères"
        │   └─→ Modal reste ouverte, focus textarea
        │
        ├─→ Upload photos échoue
        │   │ Toast: "Erreur upload photo '{filename}'"
        │   │ Liste photos: Affiche [✗ Erreur] pour fichier concerné
        │   │ Option: Retry upload ou Supprimer fichier
        │   └─→ Modal reste ouverte
        │
        └─→ Erreur serveur
            │ Toast: "Erreur marquage terminé - Réessayez"
            │ Activity Log: status=failure
            │ Option: [Retry] [Sauvegarder brouillon]
            └─→ Modal reste ouverte
```

**Rôles autorisés** : Prestataire (assigné à intervention uniquement)
**Permissions RLS** : `is_prestataire_of_intervention(intervention_id)`
**Notifications générées** :
- Locataire: "Les travaux sont terminés - Merci de valider ({reference})"
- Gestionnaire: "Travaux terminés par {provider_name} - Intervention {reference}"

**Activity Logs** :
- `action=complete_work, entity_type=intervention, actor_role=prestataire, metadata={ actual_duration_minutes, photos_count }`

**Transition statut** : `en_cours` → `cloturee_par_prestataire`

**Données rapport créées** :
```json
{
  "intervention_id": "uuid",
  "status": "cloturee_par_prestataire",
  "completed_date": "2025-10-30T11:45:00Z",
  "actual_start_time": "2025-10-30T09:15:00Z",
  "actual_duration_minutes": 150,
  "provider_comment": "Remplacement robinet effectué. Fournitures: robinet mitigeur GROHE...",
  "conforms_to_quote": true,
  "documents": [
    { "type": "photo_apres", "count": 5 },
    { "type": "facture", "count": 1 }
  ]
}
```

---

### F5.9 - Validation Travaux (Locataire)

```
[START] Locataire reçoit notification "Travaux terminés - Validation requise"
    │
    ▼
Locataire accède /locataire/interventions/[id]
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Page Détail Intervention - Status: CLOTUREE_PAR_PRESTATAIRE     │
│ ───────────────────────────────────────────────────────────────  │
│ Badge: "ACTION REQUISE - Validez les travaux"                   │
│                                                                  │
│ Rapport Prestataire:                                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Date fin: 30/10/2025 11:45                                 │ │
│  │ Durée: 2h30                                                │ │
│  │ Rapport: {provider_comment}                                │ │
│  │                                                             │ │
│  │ Photos après travaux:                                      │ │
│  │  [Gallery: 5 photos clickable]                             │ │
│  │                                                             │ │
│  │ Documents joints:                                          │ │
│  │  • Facture fournisseur (PDF)                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Action: [Valider les travaux]                                    │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
Locataire clique "Valider les travaux"
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Modal: Validation Travaux Locataire                             │
│ ───────────────────────────────────────────────────────────────  │
│ Question: "Les travaux sont-ils satisfaisants ?"                │
│                                                                  │
│ Évaluation (required):                                           │
│  (•) ✓ Oui, travaux conformes                                   │
│  ( ) ⚠ Travaux incomplets ou non conformes                      │
│      └─→ Si coché: Textarea "Précisez les problèmes"            │
│                                                                  │
│ Commentaire locataire (optionnel, textarea):                    │
│  [Votre avis sur l'intervention, qualité travaux, propreté,     │
│   ponctualité prestataire...]                                    │
│                                                                  │
│ Note prestataire (optionnel, stars 1-5):                        │
│  ☆☆☆☆☆ → ⭐⭐⭐⭐⭐                                               │
│                                                                  │
│ Photos validation (optionnel):                                  │
│  • Upload photos si besoin illustrer problème                   │
│  • Ou photos confirmation travaux OK                            │
│  [Upload zone]                                                   │
│                                                                  │
│ Validations:                                                     │
│  ✓ Évaluation sélectionnée                                      │
│  ✓ Si "non conforme": Commentaire min 20 car                    │
│                                                                  │
│ Boutons: [Annuler] [Valider]                                     │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [Annuler] → Ferme modal
    │
    └─→ [Valider]
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ API: POST /api/intervention-validate-tenant                      │
│ Payload:                                                         │
│  {                                                               │
│    intervention_id,                                             │
│    is_satisfactory (boolean),                                   │
│    tenant_comment,                                              │
│    provider_rating (1-5, optionnel),                            │
│    validation_photos (array files, optionnel)                   │
│  }                                                               │
│                                                                  │
│ Actions:                                                         │
│  1. Vérifier status=cloturee_par_prestataire                    │
│  2. Vérifier is_tenant_of_intervention(id)                      │
│  3. UPDATE interventions SET:                                   │
│     - status = 'cloturee_par_locataire'                         │
│     - tenant_comment                                            │
│     - tenant_satisfaction = is_satisfactory                     │
│     - updated_at = NOW()                                        │
│  4. Si validation_photos:                                       │
│     - Upload Storage                                             │
│     - INSERT intervention_documents:                            │
│       * document_type='photo_validation'                        │
│       * uploaded_by=locataire_id                                │
│  5. Si provider_rating fourni:                                  │
│     - UPDATE users SET provider_rating (recalcul moyenne)       │
│       WHERE id=prestataire_id                                   │
│  6. Créer notifications:                                        │
│     - Gestionnaire: "Locataire a validé travaux - {ref}"        │
│     - Prestataire: "Travaux validés par locataire" +            │
│       (optionnel: "Note: {rating}/5 ⭐")                         │
│  7. Activity Log: action=tenant_validation                      │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS]
    │   │ Toast: "Validation enregistrée - Merci !"
    │   │ Modal confirmation:
    │   │   ┌────────────────────────────────────┐
    │   │   │ ✓ Travaux validés                  │
    │   │   │                                    │
    │   │   │ "Merci pour votre retour. Le       │
    │   │   │  gestionnaire va clôturer          │
    │   │   │  l'intervention."                  │
    │   │   │                                    │
    │   │   │ [Voir l'intervention] [OK]         │
    │   │   └────────────────────────────────────┘
    │   │
    │   ▼
    │   Badge status → "VALIDÉ - CLÔTURE GESTIONNAIRE" (bleu)
    │   │ Notifications envoyées
    │   │ Activity Log: status=success
    │   │ Rating prestataire mis à jour (si fourni)
    │   │
    │   ▼
    │   Attente clôture finale gestionnaire
    │   │ Locataire peut encore:
    │   │  • Consulter intervention (read-only)
    │   │  • Chat (si besoin clarifications)
    │   │
    │   └─→ F5.10 (Clôture gestionnaire)
    │
    └─→ [ERREUR]
        ├─→ Status invalide (pas cloturee_par_prestataire)
        │   └─→ Toast "Validation impossible - Status invalide"
        │
        ├─→ Commentaire manquant (si non satisfaisant)
        │   │ Inline error: "Précisez les problèmes (min 20 car)"
        │   └─→ Modal reste ouverte
        │
        ├─→ Upload photos échoue
        │   │ Toast: "Erreur upload photo"
        │   │ Option: Continuer sans photo ou Retry
        │   └─→ Modal reste ouverte
        │
        └─→ Erreur serveur
            │ Toast: "Erreur validation - Réessayez"
            │ Activity Log: status=failure
            └─→ Modal reste ouverte, option Retry
```

**Alternative: REFUSER Validation (Travaux Non Conformes)**

```
Locataire sélectionne "Travaux incomplets ou non conformes"
    │
    ▼
Champ "Précisez les problèmes" devient obligatoire (min 20 car)
    │
    ▼
Locataire décrit problèmes détaillés
    │
    ▼
[Valider] (enregistre refus)
    │
    ▼
API: Même endpoint, is_satisfactory=false
    │
    ├─→ Status reste 'cloturee_par_prestataire' (PAS de passage à cloturee_par_locataire)
    │
    ├─→ Créer notifications:
    │   │ - Gestionnaire: "⚠ Locataire signale problèmes - {ref}"
    │   │ - Prestataire: "Locataire demande corrections - {problems}"
    │   │
    │   ▼
    │   Gestionnaire doit arbitrer:
    │    ├─→ Demander corrections prestataire
    │    ├─→ Valider quand même (travaux OK malgré remarques)
    │    └─→ Annuler intervention (cas exceptionnel)
    │
    └─→ Workflow correction déclenché (gestionnaire contacte prestataire)
```

**Rôles autorisés** : Locataire (assigné à intervention uniquement)
**Permissions RLS** : `is_tenant_of_intervention(intervention_id)`
**Notifications générées** :
- **Si satisfaisant** :
  - Gestionnaire: "Locataire a validé les travaux - Intervention {reference}"
  - Prestataire: "Vos travaux ont été validés par le locataire" + (optionnel note)
- **Si non satisfaisant** :
  - Gestionnaire: "⚠ Locataire signale des problèmes - Intervention {reference} - {problems}"
  - Prestataire: "Le locataire demande des corrections - {problems}"

**Activity Logs** :
- `action=tenant_validation, entity_type=intervention, actor_role=locataire, metadata={ is_satisfactory, provider_rating }`

**Transition statut** :
- Si satisfaisant: `cloturee_par_prestataire` → `cloturee_par_locataire`
- Si non satisfaisant: Reste `cloturee_par_prestataire` (corrections requises)

---

### F5.10 - Clôture Finale (Gestionnaire)

```
[START] Gestionnaire reçoit notification "Locataire a validé travaux"
    │
    ▼
Gestionnaire accède /gestionnaire/interventions/[id]
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Page Détail Intervention - Status: CLOTUREE_PAR_LOCATAIRE       │
│ ───────────────────────────────────────────────────────────────  │
│ Badge: "ACTION REQUISE - Clôture finale"                        │
│                                                                  │
│ Récapitulatif complet:                                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Timeline:                                                  │ │
│  │  • Demande: 25/10/2025                                     │ │
│  │  • Approbation: 26/10/2025                                 │ │
│  │  • Devis validé: 450.00 € HT                               │ │
│  │  • Planification: 28/10/2025                               │ │
│  │  • Travaux: 30/10/2025 (durée: 2h30)                       │ │
│  │  • Validation locataire: 30/10/2025 ✓                      │ │
│  │                                                             │ │
│  │ Documents:                                                  │ │
│  │  • Photos avant: 3                                         │ │
│  │  • Photos après: 5                                         │ │
│  │  • Factures: 1                                             │ │
│  │  • Rapports: 1                                             │ │
│  │                                                             │ │
│  │ Participants:                                               │ │
│  │  • Locataire: {tenant_name} - Satisfait ✓                  │ │
│  │  • Prestataire: {provider_name} - Note: 4.5/5 ⭐          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Action: [Clôturer l'intervention]                                │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
Gestionnaire clique "Clôturer l'intervention"
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ Modal: Clôture Finale Intervention                              │
│ ───────────────────────────────────────────────────────────────  │
│ Coût final* (number, pré-rempli avec devis):                    │
│  Coût estimé: 450.00 € HT                                        │
│  Coût final: [450.00] € HT (éditable)                            │
│                                                                  │
│  ℹ️ Si différent du devis, précisez raison                       │
│                                                                  │
│ Commentaire final gestionnaire (optionnel, textarea):           │
│  [Bilan intervention, observations, points d'amélioration...]   │
│                                                                  │
│ Validation documents (checklist):                               │
│  [✓] Rapport prestataire complet                                │
│  [✓] Photos avant/après présentes                               │
│  [✓] Factures jointes                                            │
│  [✓] Validation locataire enregistrée                           │
│                                                                  │
│ Actions post-clôture:                                            │
│  [ ] Archiver l'intervention (masquer des listes actives)       │
│  [ ] Créer intervention de suivi (si follow_up_required)        │
│      └─→ Si coché: Préremplit formulaire nouvelle intervention  │
│                                                                  │
│ ⚠ "Cette action est définitive. L'intervention ne pourra plus   │
│    être modifiée."                                               │
│                                                                  │
│ Validations:                                                     │
│  ✓ final_cost > 0                                               │
│  ✓ Toutes checkboxes validation cochées                         │
│                                                                  │
│ Boutons: [Annuler] [Clôturer définitivement] (vert)             │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [Annuler] → Ferme modal
    │
    └─→ [Clôturer définitivement]
        │
        ▼
┌──────────────────────────────────────────────────────────────────┐
│ API: POST /api/intervention/[id]/manager-finalization           │
│ Payload:                                                         │
│  {                                                               │
│    intervention_id,                                             │
│    final_cost (decimal),                                        │
│    manager_comment,                                             │
│    archive (boolean),                                           │
│    create_follow_up (boolean)                                   │
│  }                                                               │
│                                                                  │
│ Actions séquentielles (transaction):                            │
│  1. Vérifier status=cloturee_par_locataire                      │
│  2. Vérifier can_manage_intervention(id)                        │
│  3. UPDATE interventions SET:                                   │
│     - status = 'cloturee_par_gestionnaire' [TERMINAL]           │
│     - final_cost                                                │
│     - manager_comment                                           │
│     - finalized_at = NOW()                                      │
│     - finalized_by = manager_id                                 │
│     - is_archived = archive                                     │
│  4. Update compteurs (finalisation):                            │
│     - lots.active_interventions -1                              │
│     - buildings.active_interventions -1 (si applicable)         │
│     - users.total_interventions +1 (prestataire)                │
│       (compteur total interventions terminées)                  │
│  5. Créer notifications:                                        │
│     - Toutes parties: "Intervention clôturée - {reference}"     │
│  6. Si create_follow_up:                                        │
│     - Redirect wizard création intervention                     │
│     - Pré-rempli: lot_id, type, prestataire (from current)     │
│     - Description: "Suivi intervention {reference}"             │
│  7. Activity Log: action=finalize, status=success              │
└──────────────────────────────────────────────────────────────────┘
    │
    ├─→ [SUCCÈS]
    │   │ Toast: "Intervention clôturée définitivement"
    │   │ Modal confirmation:
    │   │   ┌────────────────────────────────────┐
    │   │   │ ✓ Intervention clôturée            │
    │   │   │                                    │
    │   │   │ Référence: {reference}             │
    │   │   │ Coût final: {final_cost} € HT      │
    │   │   │                                    │
    │   │   │ "L'intervention est maintenant     │
    │   │   │  archivée et ne peut plus être     │
    │   │   │  modifiée."                        │
    │   │   │                                    │
    │   │   │ [Voir récapitulatif] [OK]          │
    │   │   └────────────────────────────────────┘
    │   │
    │   ▼
    │   Badge status → "CLÔTURÉE" (gris)
    │   │ Notifications envoyées (toutes parties)
    │   │ Activity Log: status=success
    │   │ Statistiques mises à jour
    │   │
    │   ├─→ [Si archive=true]
    │   │   │ Intervention masquée listes "actives"
    │   │   │ Visible uniquement dans "Historique/Archivées"
    │   │   └─→ Reste consultable (read-only)
    │   │
    │   ├─→ [Si create_follow_up=true]
    │   │   │ Redirect /gestionnaire/interventions/nouvelle-intervention
    │   │   │ Formulaire pré-rempli (lot, type, prestataire)
    │   │   └─→ Gestionnaire complète et crée nouvelle intervention
    │   │
    │   └─→ [Sinon]
    │       │ Redirect /gestionnaire/interventions (liste)
    │       │ Intervention clôturée apparaît badge "Terminée"
    │       └─→ [END WORKFLOW COMPLET ✓]
    │
    └─→ [ERREUR]
        ├─→ Status invalide (pas cloturee_par_locataire)
        │   └─→ Toast "Clôture impossible - Validation locataire manquante"
        │
        ├─→ final_cost invalide (≤ 0 ou > 1000000)
        │   │ Inline error: "Coût final invalide"
        │   └─→ Modal reste ouverte
        │
        ├─→ Checkboxes validation pas toutes cochées
        │   │ Alert: "Veuillez valider tous les documents"
        │   └─→ Modal reste ouverte, highlight checkboxes manquantes
        │
        └─→ Erreur serveur
            │ Toast: "Erreur clôture - Réessayez"
            │ Activity Log: status=failure
            └─→ Modal reste ouverte, option Retry
```

**Rôles autorisés** : Gestionnaire uniquement
**Permissions RLS** : `can_manage_intervention(intervention_id)`
**Notifications générées** :
- Toutes parties (locataire, prestataire, gestionnaires): "Intervention {reference} clôturée - Coût final: {final_cost} € HT"

**Activity Logs** :
- `action=finalize, entity_type=intervention, actor_role=gestionnaire, metadata={ final_cost, variance_from_estimate }`

**Transition statut** : `cloturee_par_locataire` → `cloturee_par_gestionnaire` [ÉTAT TERMINAL]

**Statistiques mises à jour** :
- `lots.active_interventions` : -1
- `lots.total_interventions` : Reste inchangé (déjà compté)
- `buildings.active_interventions` : -1
- `users.total_interventions` (prestataire) : +1 (compteur interventions terminées)
- `users.provider_rating` (prestataire) : Recalculé moyenne (si locataire a noté)

**État final intervention** :
```json
{
  "id": "uuid",
  "reference": "INT-20251030-0001",
  "status": "cloturee_par_gestionnaire",
  "created_at": "2025-10-25T10:00:00Z",
  "finalized_at": "2025-10-30T16:00:00Z",
  "duration_days": 5,
  "estimated_cost": 450.00,
  "final_cost": 450.00,
  "is_archived": true,
  "tenant_satisfaction": true,
  "provider_rating": 4.5,
  "documents_count": 9,
  "activity_logs_count": 18
}
```

---

## 1.7 FLUX 6: COMMUNICATION & CONVERSATIONS (Multi-Rôles)

### F6.1 - Création Thread Conversation (Intervention)

```
[START] User (L/G/P) accède page intervention /{role}/interventions/[id]
    │ Tab "Conversation" visible
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Component: InterventionConversation                         │
│ Détection threads existants via:                            │
│  SELECT * FROM conversation_threads                         │
│  WHERE intervention_id = {intervention_id}                  │
└─────────────────────────────────────────────────────────────┘
    │
    ├─→ [THREADS EXISTENT] (Intervention en cours)
    │   │ Affiche liste threads par type:
    │   │
    │   ├─→ Thread "Groupe" (visible Tous: G+L+P)
    │   │   │ Badge: "🌐 Groupe" (public icon)
    │   │
    │   ├─→ Thread "Gestionnaires uniquement" (visible: G only)
    │   │   │ Badge: "🔒 Gestion interne" (locked icon)
    │   │
    │   ├─→ Thread "Locataire ↔ Gestionnaires" (visible: L+G)
    │   │   │ Badge: "👤 Locataire" (private)
    │   │
    │   └─→ Thread "Prestataire ↔ Gestionnaires" (visible: P+G)
    │       │ Badge: "🔧 Prestataire" (private)
    │       │
    │       └─→ User clique sur thread → Ouvre conversation (F6.2)
    │
    └─→ [AUCUN THREAD] (Intervention nouvellement créée)
        │ Auto-création threads par défaut (backend):
        │
        ▼
        ┌─────────────────────────────────────────────────────┐
        │ API: POST /api/interventions/[id]/init-threads     │
        │ Créé 4 threads par défaut:                         │
        │                                                      │
        │  1. type='group' (visible: G+L+P)                  │
        │     visibility='all_parties'                        │
        │                                                      │
        │  2. type='managers_only' (visible: G)              │
        │     visibility='managers'                           │
        │                                                      │
        │  3. type='tenant_to_managers' (visible: L+G)       │
        │     visibility='tenant_and_managers'                │
        │                                                      │
        │  4. type='provider_to_managers' (visible: P+G)     │
        │     visibility='provider_and_managers'              │
        │                                                      │
        │ Metadata: intervention_id, created_by, timestamps  │
        └─────────────────────────────────────────────────────┘
            │
            ├─→ [SUCCÈS]
            │   │ Threads créés, UI refresh
            │   │ User voit threads accessibles selon rôle
            │   └─→ Redirect F6.2 (Envoi message)
            │
            └─→ [ERREUR]
                │ Toast: "Erreur init conversations"
                │ Retry automatique après 3s
                └─→ Si échec persistant: Bouton "Réessayer"
```

**Rôles concernés** : Gestionnaire, Locataire, Prestataire
**Permissions** : RLS vérifie participation intervention (is_team_manager, is_tenant_of_lot, assigned provider)
**Notifications générées** : Aucune (init silencieuse)
**Activity Logs** : `action=conversation_threads_initialized`

**Visibilité threads** :
| Thread Type              | Gestionnaires | Locataire | Prestataire | Use Case                                  |
|--------------------------|---------------|-----------|-------------|-------------------------------------------|
| `group`                  | ✅            | ✅        | ✅          | Communication publique entre tous         |
| `managers_only`          | ✅            | ❌        | ❌          | Notes internes gestionnaires              |
| `tenant_to_managers`     | ✅            | ✅        | ❌          | Questions locataire privées               |
| `provider_to_managers`   | ✅            | ❌        | ✅          | Coordination prestataire/gestionnaires    |

---

### F6.2 - Envoi Message dans Thread

```
[START] User ouvre thread conversation
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Component: ConversationThread                               │
│ Affichage:                                                   │
│  • Header: Nom thread, participants, badge type             │
│  • Messages (scroll infini, plus récent en bas)             │
│  • Input: Textarea + boutons (Send, Attach)                 │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
User écrit message dans textarea
    │
    ├─→ [USER TAPE MESSAGE]
    │   │
    │   ├─→ [AVEC PIÈCE JOINTE]
    │   │   │ User clique bouton "📎 Joindre fichier"
    │   │   │
    │   │   ▼
    │   │   ┌─────────────────────────────────────────────────┐
    │   │   │ File Upload Dialog                              │
    │   │   │ Accept: images/*, .pdf, .doc, .docx, .xls       │
    │   │   │ Max size: 10MB par fichier                      │
    │   │   │ Max files: 5 fichiers par message               │
    │   │   └─────────────────────────────────────────────────┘
    │   │       │
    │   │       ├─→ [FILE VALIDE]
    │   │       │   │ Preview fichier (thumbnail si image)
    │   │       │   │ Upload vers Supabase Storage
    │   │       │   │ Path: conversations/{thread_id}/{file_name}
    │   │       │   │ Progress bar pendant upload
    │   │       │   │
    │   │       │   └─→ Attachment stored, URL récupéré
    │   │       │
    │   │       └─→ [FILE INVALIDE]
    │   │           ├─→ > 10MB → Toast "Fichier trop volumineux"
    │   │           ├─→ Type non supporté → Toast "Format non supporté"
    │   │           └─→ > 5 fichiers → Toast "Max 5 fichiers"
    │   │
    │   └─→ [SANS PIÈCE JOINTE]
    │       │ Juste texte
    │       │
    │       ▼
    │   User clique "Envoyer" (ou Ctrl+Enter)
    │       │
    │       ▼
    │   ┌─────────────────────────────────────────────────────┐
    │   │ Validations Frontend:                               │
    │   │  ✓ Message non vide (trim)                         │
    │   │  ✓ Max 2000 caractères                             │
    │   │  ✓ Au moins 1 caractère visible                    │
    │   └─────────────────────────────────────────────────────┘
    │       │
    │       ├─→ [VALIDATION OK]
    │       │   │
    │       │   ▼
    │       │   ┌─────────────────────────────────────────────┐
    │       │   │ API: POST /api/conversations/[threadId]/msgs│
    │       │   │ Input:                                      │
    │       │   │  {                                          │
    │       │   │    content: string,                         │
    │       │   │    attachments: FileUpload[],               │
    │       │   │    thread_id: UUID                          │
    │       │   │  }                                          │
    │       │   │                                              │
    │       │   │ Actions:                                    │
    │       │   │  1. Vérifier permissions (RLS thread)      │
    │       │   │  2. Insert conversation_messages            │
    │       │   │  3. Link attachments (if any)               │
    │       │   │  4. Update thread.last_message_at           │
    │       │   │  5. Créer notifications destinataires       │
    │       │   │  6. Broadcast via Supabase Realtime        │
    │       │   └─────────────────────────────────────────────┘
    │       │       │
    │       │       ├─→ [SUCCÈS]
    │       │       │   │
    │       │       │   ▼
    │       │       │   ┌─────────────────────────────────────┐
    │       │       │   │ UI Updates (Optimistic + Realtime): │
    │       │       │   │  1. Message ajouté immédiatement    │
    │       │       │   │     (état "sending...")             │
    │       │       │   │  2. Realtime confirm (✓ delivered) │
    │       │       │   │  3. Scroll auto vers bas            │
    │       │       │   │  4. Textarea cleared                │
    │       │       │   │  5. Attachments cleared             │
    │       │       │   └─────────────────────────────────────┘
    │       │       │       │
    │       │       │       ▼
    │       │       │   ┌─────────────────────────────────────┐
    │       │       │   │ Notifications générées:             │
    │       │       │   │                                      │
    │       │       │   │ Pour chaque participant (sauf sender):│
    │       │       │   │  • Type: 'new_message'              │
    │       │       │   │  • Titre: "Nouveau message"         │
    │       │       │   │  • Contenu: "{User}: {preview}"     │
    │       │       │   │  • Link: /interventions/[id]#conv   │
    │       │       │   │  • Badge notification count +1      │
    │       │       │   │  • Push notification si activée     │
    │       │       │   └─────────────────────────────────────┘
    │       │       │       │
    │       │       │       └─→ Activity Log: action=message_sent
    │       │       │           └─→ [END - Message envoyé]
    │       │       │
    │       │       └─→ [ERREUR API]
    │       │           ├─→ Permission denied (thread non accessible)
    │       │           │   │ Toast: "Accès refusé à cette conversation"
    │       │           │   └─→ Reste sur page (message non envoyé)
    │       │           │
    │       │           ├─→ Intervention clôturée (read-only)
    │       │           │   │ Toast: "Conversation fermée (intervention terminée)"
    │       │           │   │ Input disabled
    │       │           │   └─→ Mode lecture seule
    │       │           │
    │       │           └─→ Erreur serveur/réseau
    │       │               │ Toast: "Erreur envoi - Réessayez"
    │       │               │ Message marqué "❌ Échec envoi"
    │       │               │ Bouton "↻ Réessayer" visible
    │       │               └─→ [Retry possible]
    │       │
    │       └─→ [VALIDATION FRONTEND ÉCHOUE]
    │           ├─→ Message vide
    │           │   │ Bouton "Envoyer" disabled
    │           │   └─→ Aucune action
    │           │
    │           ├─→ > 2000 caractères
    │           │   │ Counter: "2150/2000" (rouge)
    │           │   │ Inline warning: "Message trop long"
    │           │   └─→ Bouton disabled
    │           │
    │           └─→ Upload en cours
    │               │ Bouton "Envoyer" disabled pendant upload
    │               └─→ Progress: "Upload fichier... 45%"
    │
    └─→ [REALTIME MESSAGE REÇU] (autre user envoie)
        │ Supabase Realtime event: INSERT on conversation_messages
        │
        ▼
        ┌─────────────────────────────────────────────────────┐
        │ Realtime Handler:                                   │
        │  1. Vérifier thread_id correspond                  │
        │  2. Vérifier message pas de current user (no echo) │
        │  3. Ajouter message à conversation                  │
        │  4. Play sound notification (si tab en background) │
        │  5. Badge "Nouveau" si scroll pas en bas           │
        │  6. Auto-scroll si user déjà en bas                │
        └─────────────────────────────────────────────────────┘
            │
            └─→ Message affiché en temps réel (< 500ms latency)
```

**Rôles concernés** : Gestionnaire, Locataire, Prestataire
**Permissions** : RLS `conversation_messages` vérifie thread access
**Notifications générées** : "Nouveau message" pour destinataires
**Activity Logs** : `action=message_sent`, `action=message_read` (quand ouvert)

**Real-time Features** :
- **Supabase Realtime Channel** : `intervention:{intervention_id}:conversations`
- **Events subscribed** : INSERT, UPDATE, DELETE sur `conversation_messages`
- **Typing indicators** : "User is typing..." (broadcast presence)
- **Read receipts** : "✓ Lu" quand message lu (optionnel)

**UX Notes** :
- **Optimistic UI** : Message affiché immédiatement (UX fluide)
- **Retry on fail** : Bouton retry si erreur réseau
- **Sound notifications** : Son discret si nouveau message
- **Auto-scroll intelligent** : Scroll vers bas sauf si user scrolle historique

---

## 1.8 FLUX 7: GESTION DES DOCUMENTS (Multi-Rôles)

### F7.1 - Upload Document (Gestionnaire)

```
[START] Gestionnaire accède /gestionnaire/biens/immeubles/[id] ou /lots/[id]
    │ Tab "Documents" visible
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Component: PropertyDocuments                                │
│ Affichage:                                                   │
│  • Liste documents existants (table triable)                │
│  • Bouton "+ Ajouter document" (si permissions)             │
│  • Filtres: Type, Visibilité, Date                          │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Gestionnaire clique "+ Ajouter document"
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Modal: UploadDocumentModal                                  │
│                                                              │
│ Formulaire:                                                  │
│  • Titre* (text, max 100 car)                               │
│  • Type document* (select):                                 │
│    - bail                                                    │
│    - facture                                                 │
│    - diagnostic                                              │
│    - assurance                                               │
│    - copropriete                                             │
│    - autre                                                   │
│                                                              │
│  • Niveau visibilité* (radio):                              │
│    ○ Équipe uniquement (managers team)                      │
│    ○ Locataire + Équipe (si lot a tenant)                   │
│                                                              │
│  • Fichier* (drag-drop ou file picker)                      │
│    Accept: .pdf, .jpg, .jpeg, .png, .doc, .docx            │
│    Max: 15MB                                                 │
│                                                              │
│  • Description (textarea, optionnel, max 500 car)           │
│                                                              │
│ Boutons: [Annuler] [Téléverser]                            │
└─────────────────────────────────────────────────────────────┘
    │
    ├─→ [USER DRAG FILE]
    │   │ File dropped dans zone drag-drop
    │   │
    │   ▼
    │   ┌─────────────────────────────────────────────────────┐
    │   │ Validations Frontend:                               │
    │   │  ✓ Type fichier autorisé                           │
    │   │  ✓ Taille < 15MB                                   │
    │   │  ✓ Nom fichier valide (sans caractères spéciaux)   │
    │   └─────────────────────────────────────────────────────┘
    │       │
    │       ├─→ [FILE VALIDE]
    │       │   │ Preview:
    │       │   │  • Nom: "bail_lot_12.pdf"
    │       │   │  • Taille: "3.2 MB"
    │       │   │  • Type: application/pdf
    │       │   │  • Thumbnail (si image)
    │       │   │
    │       │   └─→ File ready, champs pré-remplis:
    │       │       │ Titre suggéré: "bail_lot_12"
    │       │       │ Type auto-détecté si possible
    │       │
    │       └─→ [FILE INVALIDE]
    │           ├─→ > 15MB
    │           │   │ Toast: "Fichier trop volumineux (max 15MB)"
    │           │   └─→ File rejected
    │           │
    │           ├─→ Type non supporté (ex: .exe)
    │           │   │ Toast: "Format non supporté"
    │           │   │ Liste formats acceptés affichée
    │           │   └─→ File rejected
    │           │
    │           └─→ Nom fichier invalide (caractères spéciaux)
    │               │ Auto-sanitize: "Bail (2024).pdf" → "Bail_2024.pdf"
    │               └─→ Warning: "Nom nettoyé: {new_name}"
    │
    └─→ [USER CLIQUE "Téléverser"]
        │ Validation formulaire complet
        │
        ▼
        ┌─────────────────────────────────────────────────────┐
        │ Validations:                                        │
        │  ✓ Titre renseigné                                 │
        │  ✓ Type document sélectionné                       │
        │  ✓ Visibilité choisie                              │
        │  ✓ Fichier attaché                                 │
        └─────────────────────────────────────────────────────┘
            │
            ├─→ [VALIDATION OK]
            │   │
            │   ▼
            │   ┌─────────────────────────────────────────────┐
            │   │ Upload Process (Multi-Step):                │
            │   │                                              │
            │   │ ÉTAPE 1: Upload fichier Supabase Storage   │
            │   │ ──────────────────────────────────────────  │
            │   │  Path: documents/{team_id}/{property_type}/│
            │   │        {property_id}/{filename}             │
            │   │  Progress bar: 0% → 100%                    │
            │   │  Chunked upload (grandes fichiers)          │
            │   │                                              │
            │   │ ÉTAPE 2: Créer metadata DB                 │
            │   │ ──────────────────────────────────────────  │
            │   │  API: POST /api/documents                   │
            │   │  Insert property_documents:                 │
            │   │   {                                         │
            │   │     title, type, visibility_level,          │
            │   │     file_path, file_size, mime_type,        │
            │   │     property_id, property_type,             │
            │   │     uploaded_by, team_id                    │
            │   │   }                                         │
            │   │                                              │
            │   │ ÉTAPE 3: Apply RLS & Notifications         │
            │   │ ──────────────────────────────────────────  │
            │   │  • RLS vérifie permissions team            │
            │   │  • Si visibility='locataire':               │
            │   │    Notifier tenant du lot                   │
            │   │  • Activity log: document_uploaded          │
            │   └─────────────────────────────────────────────┘
            │       │
            │       ├─→ [SUCCÈS]
            │       │   │ Progress: "✓ Upload terminé"
            │       │   │ Toast: "Document ajouté avec succès"
            │       │   │ Modal fermée
            │       │   │ Liste documents refresh (nouveau doc visible)
            │       │   │
            │       │   ├─→ [SI visibility='locataire']
            │       │   │   │ Notification créée pour tenant:
            │       │   │   │  Type: 'document_shared'
            │       │   │   │  Titre: "Nouveau document partagé"
            │       │   │   │  Contenu: "{title} disponible"
            │       │   │   │  Link: /locataire/biens/lots/[id]#docs
            │       │   │   └─→ Activity Log: action=document_shared
            │       │   │
            │       │   └─→ [SI visibility='equipe']
            │       │       │ Pas de notification externe
            │       │       └─→ Activity Log: action=document_uploaded
            │       │       └─→ [END - Succès]
            │       │
            │       └─→ [ERREUR]
            │           ├─→ Upload Storage échoue
            │           │   │ Progress: "❌ Erreur upload"
            │           │   │ Toast: "Erreur upload - Vérifiez connexion"
            │           │   │ Bouton "Réessayer" visible
            │           │   └─→ [Retry possible]
            │           │
            │           ├─→ Quota storage dépassé
            │           │   │ Toast: "Espace stockage insuffisant"
            │           │   │ Info: "Contactez admin pour extension"
            │           │   └─→ Modal reste ouverte
            │           │
            │           ├─→ Permission denied (RLS)
            │           │   │ Toast: "Permission refusée"
            │           │   │ (Cas edge: user perd permissions pendant upload)
            │           │   └─→ Redirect /gestionnaire/biens
            │           │
            │           └─→ Duplicate filename
            │               │ Toast: "Fichier existe déjà - Renommez"
            │               │ Suggestion: "bail_lot_12 (1).pdf"
            │               └─→ Reste sur modal (correction titre)
            │
            └─→ [VALIDATION ÉCHOUE]
                ├─→ Titre vide → Inline error "Titre requis"
                ├─→ Type non sélectionné → "Sélectionnez type"
                ├─→ Aucun fichier → "Joignez un fichier"
                └─→ Bouton "Téléverser" disabled jusqu'à correction
```

**Rôles concernés** : Gestionnaire (upload), Locataire (view si visibility='locataire')
**Permissions** : RLS vérifie `is_team_manager(team_id)` pour upload
**Notifications générées** : "Nouveau document partagé" (si visibility='locataire')
**Activity Logs** : `action=document_uploaded`, `action=document_shared`

**Visibilité Documents** :
| Niveau           | Gestionnaires | Locataire | Use Case                              |
|------------------|---------------|-----------|---------------------------------------|
| `equipe`         | ✅            | ❌        | Documents internes équipe             |
| `locataire`      | ✅            | ✅        | Documents partagés (bail, diagnostics)|

**Storage Path Structure** :
```
documents/
  {team_id}/
    buildings/
      {building_id}/
        bail_immeuble_2024.pdf
        diagnostic_amiante.pdf
    lots/
      {lot_id}/
        bail_locataire_dupont.pdf
        etat_lieux_entree.pdf
```

---

### F7.2 - Preview & Download Document

```
[START] User (G/L) clique sur document dans liste
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ RLS Check (Automatic):                                      │
│ SELECT * FROM property_documents                            │
│ WHERE id = {doc_id}                                         │
│ AND (                                                        │
│   visibility_level = 'equipe' AND is_team_manager(team_id) │
│   OR                                                         │
│   visibility_level = 'locataire' AND (                      │
│     is_team_manager(team_id)                                │
│     OR is_tenant_of_lot(property_id)                        │
│   )                                                          │
│ )                                                            │
└─────────────────────────────────────────────────────────────┘
    │
    ├─→ [ACCESS GRANTED] (RLS policy OK)
    │   │
    │   ▼
    │   ┌─────────────────────────────────────────────────────┐
    │   │ Modal: DocumentPreviewModal                         │
    │   │                                                      │
    │   │ Header:                                              │
    │   │  • Titre document                                   │
    │   │  • Badge type (ex: "Bail")                          │
    │   │  • Badge visibilité (🔒 Équipe / 👤 Partagé)       │
    │   │                                                      │
    │   │ Preview Zone (selon type MIME):                     │
    │   │  ───────────────────────────────────────────────    │
    │   │  [SI image/jpeg, image/png]                         │
    │   │   → <img src={signed_url} /> (full size)            │
    │   │                                                      │
    │   │  [SI application/pdf]                               │
    │   │   → PDF Viewer embedded (react-pdf)                 │
    │   │   → Zoom controls, page navigation                  │
    │   │                                                      │
    │   │  [SI autres types (.doc, .xls)]                     │
    │   │   → Icône fichier + métadonnées                     │
    │   │   → Pas de preview (download uniquement)            │
    │   │                                                      │
    │   │ Metadata Section:                                   │
    │   │  • Taille: 3.2 MB                                   │
    │   │  • Téléversé par: {user.full_name}                  │
    │   │  • Date: 15 mars 2025 à 14:32                       │
    │   │  • Description: {description}                       │
    │   │                                                      │
    │   │ Actions:                                             │
    │   │  [📥 Télécharger] (primary)                         │
    │   │  [🗑️ Supprimer] (si permissions - G only)          │
    │   │  [✕ Fermer]                                         │
    │   └─────────────────────────────────────────────────────┘
    │       │
    │       ├─→ [USER CLIQUE "Télécharger"]
    │       │   │
    │       │   ▼
    │       │   ┌─────────────────────────────────────────────┐
    │       │   │ API: GET /api/documents/[id]/download      │
    │       │   │ Actions:                                    │
    │       │   │  1. Vérifier RLS permissions               │
    │       │   │  2. Générer signed URL Supabase Storage    │
    │       │   │     (expires: 1h)                           │
    │       │   │  3. Activity log: document_downloaded       │
    │       │   │  4. Return download URL                     │
    │       │   └─────────────────────────────────────────────┘
    │       │       │
    │       │       ├─→ [SUCCÈS]
    │       │       │   │ Browser download start
    │       │       │   │ Filename: "{title}.{extension}"
    │       │       │   │ Toast: "Téléchargement en cours..."
    │       │       │   │ Activity Log: action=document_downloaded
    │       │       │   └─→ [END]
    │       │       │
    │       │       └─→ [ERREUR]
    │       │           ├─→ Permission denied
    │       │           │   │ Toast: "Accès refusé"
    │       │           │   └─→ Modal fermée
    │       │           │
    │       │           └─→ Fichier introuvable (deleted?)
    │       │               │ Toast: "Fichier introuvable"
    │       │               └─→ Refresh liste documents
    │       │
    │       └─→ [USER CLIQUE "Supprimer"] (Gestionnaire only)
    │           │
    │           ▼
    │           ┌─────────────────────────────────────────────┐
    │           │ Modal Confirmation:                         │
    │           │  ⚠️ "Supprimer ce document ?"              │
    │           │  "Cette action est irréversible"           │
    │           │                                              │
    │           │ Boutons: [Annuler] [Supprimer]             │
    │           └─────────────────────────────────────────────┘
    │               │
    │               ├─→ [CONFIRME]
    │               │   │
    │               │   ▼
    │               │   ┌─────────────────────────────────────┐
    │               │   │ API: DELETE /api/documents/[id]    │
    │               │   │ Actions:                            │
    │               │   │  1. Vérifier permissions (manager) │
    │               │   │  2. Soft delete property_documents  │
    │               │   │     deleted_at = NOW()              │
    │               │   │  3. Keep file in storage (audit)   │
    │               │   │  4. Activity log                    │
    │               │   └─────────────────────────────────────┘
    │               │       │
    │               │       ├─→ [SUCCÈS]
    │               │       │   │ Toast: "Document supprimé"
    │               │       │   │ Modal fermée
    │               │       │   │ Liste refresh (doc disparu)
    │               │       │   │ Activity Log: document_deleted
    │               │       │   └─→ [END]
    │               │       │
    │               │       └─→ [ERREUR]
    │               │           │ Toast: "Erreur suppression"
    │               │           └─→ Reste sur modal
    │               │
    │               └─→ [ANNULE]
    │                   └─→ Reste sur preview modal
    │
    └─→ [ACCESS DENIED] (RLS policy failed)
        │ Toast: "Vous n'avez pas accès à ce document"
        │ Redirect liste documents
        └─→ [END - Blocked]
```

**Rôles concernés** : Gestionnaire (full access), Locataire (si visibility='locataire')
**Permissions** : RLS policy `property_documents_select` (voir migration Phase 2)
**Notifications générées** : Aucune (consultation silencieuse)
**Activity Logs** : `action=document_downloaded`, `action=document_deleted`

**Security Features** :
- **Signed URLs** : Temporary access (1h expiration)
- **RLS enforcement** : Server-side permission check
- **Soft delete** : Fichiers conservés pour audit (90 jours)
- **Activity tracking** : Qui a téléchargé quand

---

## 1.9 FLUX 8: PWA & NOTIFICATIONS PUSH (Multi-Rôles)

### F8.1 - Installation PWA

```
[START] User accède app via browser (Chrome/Edge/Safari)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Service Worker Registration (auto au chargement app)       │
│ File: /public/service-worker.js                            │
│ Scope: / (entire app)                                       │
└─────────────────────────────────────────────────────────────┘
    │
    ├─→ [PWA DÉJÀ INSTALLÉE]
    │   │ Détection: window.matchMedia('(display-mode: standalone)')
    │   │ Aucune action (app already installed)
    │   └─→ [END]
    │
    └─→ [PWA PAS INSTALLÉE]
        │
        ▼
        ┌─────────────────────────────────────────────────────┐
        │ Browser Install Prompt (criteria check):           │
        │  ✓ HTTPS enabled (required)                        │
        │  ✓ manifest.json présent                           │
        │  ✓ Service worker registered                        │
        │  ✓ User engagement sufficient (2+ visits)          │
        └─────────────────────────────────────────────────────┘
            │
            ├─→ [BROWSER AUTO-PROMPT] (Chrome/Edge uniquement)
            │   │ Native "Install SEIDO?" banner (browser-controlled)
            │   │
            │   ├─→ [USER ACCEPTE]
            │   │   │ App installed to desktop/home screen
            │   │   │ Icon visible: SEIDO (logo)
            │   │   │ Launch standalone mode (pas de browser UI)
            │   │   └─→ [END - Installé]
            │   │
            │   └─→ [USER REFUSE]
            │       │ Banner dismissed (peut re-prompt +1 semaine)
            │       └─→ Custom install card shown (in-app)
            │
            └─→ [CUSTOM INSTALL CARD] (SEIDO app-level)
                │ Affiché dans paramètres: /parametres
                │
                ▼
                ┌─────────────────────────────────────────────┐
                │ Component: PWAInstallCard                   │
                │                                              │
                │  📱 "Installer SEIDO"                       │
                │  "Accès rapide depuis votre écran d'accueil"│
                │                                              │
                │  Avantages:                                  │
                │   ✓ Lancement instantané                    │
                │   ✓ Notifications push                      │
                │   ✓ Mode hors ligne (bientôt)               │
                │                                              │
                │  Bouton: [Installer l'application]          │
                │  Link: "Non merci" (dismiss)                │
                └─────────────────────────────────────────────┘
                    │
                    ├─→ [USER CLIQUE "Installer"]
                    │   │
                    │   ▼
                    │   ┌─────────────────────────────────────┐
                    │   │ Trigger beforeinstallprompt event  │
                    │   │ (captured et stocké au mount)       │
                    │   │                                      │
                    │   │ deferredPrompt.prompt()             │
                    │   │ → Browser native dialog shown       │
                    │   └─────────────────────────────────────┘
                    │       │
                    │       ├─→ [USER CONFIRME]
                    │       │   │ App installed
                    │       │   │ Toast: "SEIDO installé avec succès"
                    │       │   │ Card hidden (plus affiché)
                    │       │   │ Activity Log: pwa_installed
                    │       │   └─→ [END - Installé]
                    │       │
                    │       └─→ [USER ANNULE]
                    │           │ Card reste visible
                    │           │ Info: "Vous pouvez installer +tard"
                    │           └─→ [END]
                    │
                    └─→ [USER CLIQUE "Non merci"]
                        │ Card dismissed (localStorage flag)
                        │ Ne re-apparaît pas pendant 30 jours
                        └─→ [END]
```

**Rôles concernés** : Tous (PWA disponible pour tous)
**Permissions** : Aucune (fonctionnalité browser)
**Notifications générées** : Aucune
**Activity Logs** : `action=pwa_installed` (analytics)

**Manifest.json (Excerpt)** :
```json
{
  "name": "SEIDO - Gestion Immobilière",
  "short_name": "SEIDO",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Service Worker Features** :
- **Cache Strategy** : Network-first (toujours data fraîche si online)
- **Offline Fallback** : Page "/offline" si pas de connexion
- **Static Assets** : HTML/CSS/JS/Images cached (faster loading)
- **Background Sync** : Retry failed requests quand online again

---

### F8.2 - Activation & Réception Push Notifications

```
[START] User accède /parametres
    │ Section "Notifications Push"
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Component: PushNotificationToggle                           │
│                                                              │
│ État actuel: ⚪ Désactivées                                 │
│                                                              │
│ Info: "Recevez alertes temps réel pour interventions"      │
│                                                              │
│ Toggle: [ ] Activer notifications push                      │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
User active toggle → ON
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Vérifications Prerequisites:                                │
│  1. Service worker registered? (required)                   │
│  2. Browser supports Push API? (Chrome/Edge/Firefox)        │
│  3. HTTPS enabled? (required)                               │
└─────────────────────────────────────────────────────────────┘
    │
    ├─→ [PREREQUISITES OK]
    │   │
    │   ▼
    │   ┌─────────────────────────────────────────────────────┐
    │   │ Browser Permission Request:                         │
    │   │ Notification.requestPermission()                    │
    │   │                                                      │
    │   │ Native dialog:                                       │
    │   │  "SEIDO souhaite vous envoyer notifications"       │
    │   │  [Bloquer] [Autoriser]                             │
    │   └─────────────────────────────────────────────────────┘
    │       │
    │       ├─→ [USER AUTORISE] (permission = 'granted')
    │       │   │
    │       │   ▼
    │       │   ┌─────────────────────────────────────────────┐
    │       │   │ Subscribe to Push Service:                 │
    │       │   │                                              │
    │       │   │ 1. Generate subscription object (browser)  │
    │       │   │    {                                        │
    │       │   │      endpoint: "https://fcm.googleapis...", │
    │       │   │      keys: { p256dh, auth }                 │
    │       │   │    }                                        │
    │       │   │                                              │
    │       │   │ 2. Send subscription to backend            │
    │       │   │    API: POST /api/push/subscribe            │
    │       │   │    Store in push_subscriptions table        │
    │       │   │    Link to user_id, device_info             │
    │       │   └─────────────────────────────────────────────┘
    │       │       │
    │       │       ├─→ [SUBSCRIPTION SAVED]
    │       │       │   │ Toggle: ✅ Activées
    │       │       │   │ Toast: "Notifications activées"
    │       │       │   │ Activity Log: push_enabled
    │       │       │   │
    │       │       │   ▼
    │       │       │   ┌─────────────────────────────────────┐
    │       │       │   │ Test Notification (immediate):     │
    │       │       │   │  Title: "Notifications activées"    │
    │       │       │   │  Body: "Vous recevrez alertes..."  │
    │       │       │   │  Icon: /icons/icon-192.png          │
    │       │       │   └─────────────────────────────────────┘
    │       │       │       │
    │       │       │       └─→ User reçoit notification test
    │       │       │           │ (Validates setup works)
    │       │       │           └─→ [END - Activé]
    │       │       │
    │       │       └─→ [ERREUR SUBSCRIPTION]
    │       │           │ Toast: "Erreur activation - Réessayez"
    │       │           │ Toggle reset → OFF
    │       │           └─→ [END - Échec]
    │       │
    │       ├─→ [USER REFUSE] (permission = 'denied')
    │       │   │ Toggle automatiquement reset → OFF
    │       │   │
    │       │   ▼
    │       │   ┌─────────────────────────────────────────────┐
    │       │   │ Alert:                                      │
    │       │   │  ⚠️ "Autorisation refusée"                 │
    │       │   │  "Changez paramètres browser pour activer" │
    │       │   │                                              │
    │       │   │ Instructions (selon browser):               │
    │       │   │  [Chrome] → Paramètres > Confidentialité... │
    │       │   │  [Edge]   → Paramètres > Cookies...         │
    │       │   │  [Safari] → Préférences > Sites web...      │
    │       │   └─────────────────────────────────────────────┘
    │       │       │
    │       │       └─→ Toggle disabled (grisé)
    │       │           │ Activity Log: push_denied
    │       │           └─→ [END - Bloqué]
    │       │
    │       └─→ [PERMISSION DÉJÀ REFUSÉE] (permission = 'denied' avant prompt)
    │           │ (User a bloqué notifications auparavant)
    │           │
    │           │ Alert immédiate (sans prompt):
    │           │  ⚠️ "Notifications bloquées dans browser"
    │           │  Instructions pour débloquer
    │           │
    │           └─→ Toggle reste OFF
    │
    └─→ [PREREQUISITES FAIL]
        ├─→ Service worker pas registered
        │   │ Toast: "Erreur technique - Rafraîchissez page"
        │   └─→ Auto-retry registration
        │
        ├─→ Browser pas supporté (ex: IE11)
        │   │ Alert: "Notifications non disponibles sur ce navigateur"
        │   │ Suggestion: "Utilisez Chrome/Edge/Firefox"
        │   └─→ Toggle disabled
        │
        └─→ Pas HTTPS (dev local uniquement)
            │ Alert: "HTTPS requis pour notifications"
            └─→ Toggle disabled

────────────────────────────────────────────────────────────────

[NOTIFICATION PUSH REÇUE] (Événement backend → User device)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend Event Trigger (exemples):                          │
│  • Nouvelle intervention assignée (Prestataire)            │
│  • Demande intervention approuvée (Locataire)              │
│  • Nouveau message conversation (Tous)                      │
│  • Devis soumis (Gestionnaire)                             │
│  • Intervention urgente (Gestionnaire)                      │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend: NotificationService.sendPush()                    │
│                                                              │
│ 1. Récupérer push_subscriptions de user_id                 │
│ 2. Pour chaque device/subscription:                        │
│    webpush.sendNotification(subscription, {                │
│      title: "Nouvelle intervention",                        │
│      body: "Fuite d'eau - Urgent",                         │
│      icon: "/icons/icon-192.png",                          │
│      badge: "/icons/badge-72.png",                         │
│      data: {                                                │
│        url: "/prestataire/interventions/123",               │
│        intervention_id: "123",                              │
│        type: "intervention_assigned"                        │
│      },                                                      │
│      actions: [                                             │
│        { action: "view", title: "Voir détails" },          │
│        { action: "dismiss", title: "Plus tard" }           │
│      ]                                                       │
│    })                                                        │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Push message delivered to browser (via FCM/APNS/Web Push)
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Service Worker: 'push' event handler                       │
│ File: /public/service-worker.js                            │
│                                                              │
│ self.addEventListener('push', (event) => {                 │
│   const data = event.data.json()                           │
│   self.registration.showNotification(data.title, {         │
│     body: data.body,                                        │
│     icon: data.icon,                                        │
│     badge: data.badge,                                      │
│     data: data.data, // Custom payload                     │
│     actions: data.actions,                                  │
│     vibrate: [200, 100, 200], // Pattern                   │
│     requireInteraction: data.urgent // Sticky si urgent    │
│   })                                                        │
│ })                                                          │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Native notification displayed (OS-level)
    │
    ├─→ [USER CLIQUE NOTIFICATION]
    │   │ Service Worker: 'notificationclick' event
    │   │
    │   ▼
    │   ┌─────────────────────────────────────────────────────┐
    │   │ event.notification.data.action checked:            │
    │   │                                                      │
    │   │  IF action === 'view':                             │
    │   │    clients.openWindow(data.url)                     │
    │   │    → Ouvre /prestataire/interventions/123          │
    │   │    → Focus sur intervention                         │
    │   │                                                      │
    │   │  IF action === 'dismiss':                          │
    │   │    notification.close()                             │
    │   │    → Pas d'action (dismissed)                      │
    │   │                                                      │
    │   │  Activity Log: push_notification_clicked            │
    │   └─────────────────────────────────────────────────────┘
    │       │
    │       └─→ App ouverte sur URL spécifique
    │           └─→ [END - Action completed]
    │
    └─→ [USER IGNORE]
        │ Notification reste visible (si pas requireInteraction)
        │ Auto-dismiss après 10s (OS behavior)
        └─→ [END]
```

**Rôles concernés** : Tous (chaque rôle reçoit notifications pertinentes)
**Permissions** : Browser permission 'notifications' required
**Notifications types** :
- **Gestionnaire** : Nouvelle demande, devis soumis, validation locataire
- **Prestataire** : Intervention assignée, demande devis, validation devis
- **Locataire** : Demande approuvée/rejetée, intervention planifiée, travaux terminés
- **Proprietaire** : Nouvelle intervention, clôture intervention

**Activity Logs** : `action=push_enabled`, `action=push_disabled`, `action=push_notification_clicked`

**Technical Stack** :
- **Web Push Protocol** : Standard W3C (Chrome/Edge/Firefox)
- **Backend Library** : `web-push` (Node.js)
- **VAPID Keys** : Server identification (env variables)
- **Delivery** : Via FCM (Google), APNS (Apple), Mozilla Push

**UX Notes** :
- **Badges** : Notification count visible sur icon app (si PWA)
- **Vibration** : Pattern personnalisé selon urgence
- **Sound** : Browser default (customizable si PWA)
- **Grouping** : Notifications similaires groupées

---

## 1.10 FLUX 9: RECHERCHE & FILTRAGE GLOBAL (Multi-Rôles)

### F9.1 - Recherche Globale (Header Search)

```
[START] User tape dans search bar (header app)
    │ Input: <SearchInput placeholder="Rechercher..." />
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Component: GlobalSearch (avec debounce 300ms)              │
│ Scope: Search dans entités accessibles selon rôle          │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
User tape query (ex: "Dupont")
    │
    ├─→ [QUERY < 2 CARACTÈRES]
    │   │ Pas de recherche (trop court)
    │   │ Placeholder: "Min 2 caractères"
    │   └─→ [END - Attente]
    │
    └─→ [QUERY ≥ 2 CARACTÈRES]
        │ Debounce 300ms → API call
        │
        ▼
        ┌─────────────────────────────────────────────────────┐
        │ API: GET /api/search?q={query}&role={user.role}   │
        │                                                      │
        │ Backend: Multi-table search (role-scoped)          │
        │                                                      │
        │ [GESTIONNAIRE] Search dans:                         │
        │  • buildings (nom, adresse, ville)                 │
        │  • lots (nom, type)                                │
        │  • users/contacts (nom, email, role)               │
        │  • interventions (titre, description, ref)         │
        │                                                      │
        │ [PRESTATAIRE] Search dans:                         │
        │  • interventions (assignées uniquement)            │
        │  • lots (via interventions)                        │
        │                                                      │
        │ [LOCATAIRE] Search dans:                           │
        │  • interventions (créées par lui)                  │
        │  • lots (où il est tenant)                         │
        │                                                      │
        │ Query optimization:                                 │
        │  • Full-text search (PostgreSQL tsvector)          │
        │  • Trigram similarity (pg_trgm extension)          │
        │  • RLS filters applied (team_id, permissions)      │
        │  • LIMIT 50 results (pagination si plus)           │
        └─────────────────────────────────────────────────────┘
            │
            ├─→ [RÉSULTATS TROUVÉS]
            │   │
            │   ▼
            │   ┌─────────────────────────────────────────────┐
            │   │ Results Dropdown (grouped by entity type): │
            │   │                                              │
            │   │ 🏢 IMMEUBLES (2)                           │
            │   │  • Résidence Dupont - 12 Rue...           │
            │   │  • Immeuble Dupont - 45 Avenue...         │
            │   │                                              │
            │   │ 🏠 LOTS (3)                                │
            │   │  • Appt 12 - M. Dupont                     │
            │   │  • Garage 5 - Mme Dupont                   │
            │   │  • Parking 8                                │
            │   │                                              │
            │   │ 👤 CONTACTS (1)                            │
            │   │  • Jean Dupont (locataire)                 │
            │   │                                              │
            │   │ 🔧 INTERVENTIONS (4)                       │
            │   │  • #INT-2024-042 - Fuite appt Dupont      │
            │   │  • #INT-2024-038 - Chauffage Dupont       │
            │   │                                              │
            │   │ Footer: "6 résultats - Voir tous"         │
            │   └─────────────────────────────────────────────┘
            │       │
            │       ├─→ [USER CLIQUE SUR RÉSULTAT]
            │       │   │ Redirect vers entité:
            │       │   │
            │       │   ├─→ Immeuble → /gestionnaire/biens/immeubles/[id]
            │       │   ├─→ Lot → /gestionnaire/biens/lots/[id]
            │       │   ├─→ Contact → /gestionnaire/contacts/details/[id]
            │       │   ├─→ Intervention → /{role}/interventions/[id]
            │       │   │
            │       │   │ Dropdown fermé
            │       │   │ Activity Log: search_result_clicked
            │       │   └─→ [END - Navigue]
            │       │
            │       ├─→ [USER CLIQUE "Voir tous"]
            │       │   │ Redirect /search?q={query}
            │       │   │ Page résultats complets (avec filtres)
            │       │   └─→ F9.2 (Page résultats)
            │       │
            │       └─→ [USER CONTINUE TYPING]
            │           │ Dropdown update (debounced)
            │           │ Nouvelle query API
            │           └─→ Results refresh
            │
            ├─→ [AUCUN RÉSULTAT]
            │   │
            │   ▼
            │   ┌─────────────────────────────────────────────┐
            │   │ Dropdown Empty State:                       │
            │   │  🔍 "Aucun résultat pour 'Dupont'"        │
            │   │  "Essayez un autre terme"                  │
            │   │                                              │
            │   │ Suggestions:                                │
            │   │  • Vérifiez orthographe                    │
            │   │  • Utilisez mots-clés généraux             │
            │   │  • Essayez recherche avancée               │
            │   └─────────────────────────────────────────────┘
            │       │
            │       └─→ User peut modifier query
            │
            └─→ [ERREUR API]
                ├─→ Timeout (> 5s)
                │   │ Toast: "Recherche trop longue - Réessayez"
                │   └─→ Dropdown fermé
                │
                ├─→ Permission denied (RLS)
                │   │ Toast: "Erreur permissions"
                │   └─→ Dropdown fermé
                │
                └─→ Erreur serveur
                    │ Toast: "Erreur recherche"
                    │ Retry automatique après 3s
                    └─→ Si échec: Bouton "Réessayer"
```

**Rôles concernés** : Tous (scope adapté au rôle)
**Permissions** : RLS appliqué (user ne voit que ses entités team)
**Notifications générées** : Aucune
**Activity Logs** : `action=search_performed`, `action=search_result_clicked`

**Search Algorithm** :
1. **Full-text search** : PostgreSQL `tsvector` (mots entiers)
2. **Trigram similarity** : `pg_trgm` extension (typos tolérés)
3. **Ranking** : Pertinence calculée (title > description > tags)
4. **Highlighting** : Mots clés surlignés dans résultats

**Performance** :
- **Debounce 300ms** : Réduit API calls (typing fluide)
- **Cache** : Redis cache résultats fréquents (5 min TTL)
- **Indexes** : GIN indexes sur colonnes searchables
- **Limit** : Max 50 résultats dropdown (pagination si plus)

---

### F9.2 - Filtrage Avancé (Liste Interventions)

```
[START] User accède /gestionnaire/interventions
    │ Page liste interventions
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Component: InterventionsListWithFilters                    │
│                                                              │
│ Header: Filtres (collapsible sidebar)                      │
│ Main: Table interventions (triable, paginée)               │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ Filtres disponibles:                                        │
│                                                              │
│ 🔍 Recherche textuelle                                     │
│  → Input: Titre, description, référence                    │
│                                                              │
│ 📊 Status (multi-select)                                   │
│  ☐ Demande                                                  │
│  ☐ Approuvée                                                │
│  ☐ Planifiée                                                │
│  ☐ En cours                                                 │
│  ☐ Clôturée                                                 │
│  ☐ Rejetée                                                  │
│  ☐ Annulée                                                  │
│                                                              │
│ ⚠️ Urgence (multi-select)                                  │
│  ☐ Critique                                                 │
│  ☐ Urgente                                                  │
│  ☐ Normale                                                  │
│  ☐ Basse                                                    │
│                                                              │
│ 🏢 Bien immobilier (select)                                │
│  ○ Tous les biens                                          │
│  ○ Résidence Dupont                                         │
│  ○ Immeuble Central                                         │
│  ... (liste biens team)                                    │
│                                                              │
│ 👤 Assigné à (select)                                      │
│  ○ Tous prestataires                                       │
│  ○ Plombier Pro                                             │
│  ○ Électricien Services                                    │
│  ... (liste prestataires team)                             │
│                                                              │
│ 📅 Période (date range)                                    │
│  Du: [__/__/____]  Au: [__/__/____]                       │
│  Presets: Aujourd'hui | 7j | 30j | Ce mois                │
│                                                              │
│ 💰 Budget (range slider)                                   │
│  0€ ──●────────●── 5000€+                                  │
│                                                              │
│ Boutons:                                                     │
│  [Réinitialiser] [Appliquer filtres (24)]                 │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
User modifie filtres (ex: Status = [Approuvée, Planifiée])
    │
    ├─→ [AUTO-APPLY MODE] (real-time filtering)
    │   │ Chaque changement filtre → API call (debounced 500ms)
    │   │
    │   ▼
    │   ┌─────────────────────────────────────────────────────┐
    │   │ API: GET /api/interventions?filters={JSON}         │
    │   │                                                      │
    │   │ Query params:                                       │
    │   │  ?status=approuvee,planifiee                        │
    │   │  &urgency=critique,urgente                          │
    │   │  &building_id=uuid-123                              │
    │   │  &provider_id=uuid-456                              │
    │   │  &date_from=2025-01-01                              │
    │   │  &date_to=2025-03-31                                │
    │   │  &budget_min=0                                       │
    │   │  &budget_max=2000                                    │
    │   │  &page=1                                             │
    │   │  &limit=25                                           │
    │   │  &sort=created_at:desc                              │
    │   │                                                      │
    │   │ Backend: Supabase query builder                    │
    │   │  SELECT * FROM interventions                        │
    │   │  WHERE team_id = {user.team_id}                    │
    │   │  AND status IN ('approuvee', 'planifiee')          │
    │   │  AND urgency_level IN ('critique', 'urgente')      │
    │   │  AND building_id = 'uuid-123'                       │
    │   │  AND provider_id = 'uuid-456'                       │
    │   │  AND created_at BETWEEN '2025-01-01' AND '2025-03-31'│
    │   │  AND estimated_cost BETWEEN 0 AND 2000              │
    │   │  ORDER BY created_at DESC                           │
    │   │  LIMIT 25 OFFSET 0                                  │
    │   │                                                      │
    │   │ RLS applied (automatic team filtering)             │
    │   └─────────────────────────────────────────────────────┘
    │       │
    │       ├─→ [RÉSULTATS TROUVÉS] (ex: 24 interventions)
    │       │   │
    │       │   ▼
    │       │   ┌─────────────────────────────────────────────┐
    │       │   │ Table Update (smooth transition):          │
    │       │   │  • Loading skeleton 200ms                   │
    │       │   │  • Fade-in nouveaux résultats              │
    │       │   │  • Badge: "24 résultats"                   │
    │       │   │  • Pagination: Page 1/1                    │
    │       │   │                                              │
    │       │   │ Colonnes table:                             │
    │       │   │  Réf | Titre | Bien | Status | Urgence...  │
    │       │   │  #042 | Fuite | Res.Dupont | ✅ Approuvée..│
    │       │   │  #041 | Chauf | Imm.Central | 📅 Planifiée │
    │       │   │  ...                                        │
    │       │   │                                              │
    │       │   │ Sorting: Clickable headers                  │
    │       │   │  (▲ Asc / ▼ Desc)                          │
    │       │   └─────────────────────────────────────────────┘
    │       │       │
    │       │       ├─→ [USER CLIQUE HEADER POUR TRIER]
    │       │       │   │ Ex: Clique "Urgence" → Sort urgency_level DESC
    │       │       │   │ Query params update: &sort=urgency_level:desc
    │       │       │   │ Table refresh avec nouveau tri
    │       │       │   └─→ [END]
    │       │       │
    │       │       ├─→ [USER CLIQUE LIGNE]
    │       │       │   │ Redirect /interventions/[id]
    │       │       │   └─→ [END]
    │       │       │
    │       │       └─→ [USER CHANGE PAGE] (si > 25 résultats)
    │       │           │ Pagination: [< 1 2 3 >]
    │       │           │ Query params: &page=2
    │       │           │ Table refresh page 2
    │       │           └─→ [END]
    │       │
    │       ├─→ [AUCUN RÉSULTAT]
    │       │   │
    │       │   ▼
    │       │   ┌─────────────────────────────────────────────┐
    │       │   │ Empty State:                                │
    │       │   │  🔍 "Aucune intervention trouvée"          │
    │       │   │  "Essayez d'élargir les critères"          │
    │       │   │                                              │
    │       │   │ Suggestions:                                │
    │       │   │  • Désélectionnez filtres status           │
    │       │   │  • Étendez période                         │
    │       │   │  • Vérifiez bien immobilier sélectionné    │
    │       │   │                                              │
    │       │   │ Bouton: [Réinitialiser filtres]            │
    │       │   └─────────────────────────────────────────────┘
    │       │       │
    │       │       └─→ User clique Réinitialiser
    │       │           │ Tous filtres cleared
    │       │           │ Query: /api/interventions (no filters)
    │       │           └─→ Affiche toutes interventions team
    │       │
    │       └─→ [ERREUR API]
    │           │ Toast: "Erreur chargement"
    │           │ Bouton "Réessayer" visible
    │           └─→ [Retry]
    │
    └─→ [USER CLIQUE "Réinitialiser"]
        │ Tous filtres cleared
        │ URL reset: /gestionnaire/interventions
        │ Table affiche toutes interventions (pas de filtres)
        └─→ [END]
```

**Rôles concernés** : Gestionnaire (full filtering), Prestataire/Locataire (subset)
**Permissions** : RLS filtre automatiquement par team_id
**Notifications générées** : Aucune
**Activity Logs** : `action=interventions_filtered` (analytics usage filtres)

**URL State Management** :
- **Query params** : Filtres sauvegardés dans URL (shareable links)
- **Example** : `/interventions?status=approuvee&urgency=critique&sort=created_at:desc`
- **Benefits** : Bookmark filtres fréquents, partage liens filtrés

**Performance Optimizations** :
- **Debounce** : 500ms sur filtres texte (évite API spam)
- **Indexes DB** : Indexes sur colonnes filtrables (status, urgency, dates)
- **Pagination** : Limit 25 par défaut (évite fetch 1000+ rows)
- **Cache** : Redis cache résultats fréquents (5 min TTL)

**UX Notes** :
- **Active filters badge** : "3 filtres actifs" visible
- **Clear individual** : Chaque filtre a "✕" pour clear rapide
- **Presets** : Filtres pré-configurés (ex: "Urgent aujourd'hui")
- **Save filters** : User peut sauvegarder filtres personnalisés (feature future)

---

## 1.11 Parcours Complets Simplifiés (Pour Référence Rapide)

### Parcours Locataire (Demande Simple Sans Devis)

```
1. Login → /locataire/dashboard
2. Clic "Nouvelle demande" → Formulaire création
3. Rempli: Lot, Titre, Type, Description, Urgence, Photos
4. Submit → Status 'demande', notification gestionnaires
5. Attente approbation (notification reçue si approuvé/rejeté)
6. Si approuvé: Notification "Demande approuvée"
7. Planification (gestionnaire impose date ou demande dispos)
8. Si demande dispos: Locataire propose créneaux
9. Notification "Intervention planifiée le XX/XX"
10. Jour J: Notification "Intervention aujourd'hui"
11. Notification "Travaux démarrés"
12. Notification "Travaux terminés - Validation requise"
13. Locataire accède intervention → Clique "Valider travaux"
14. Formulaire validation: Satisfaisant? Commentaire, Note prestataire
15. Submit → Status 'cloturee_par_locataire', notification gestionnaire
16. Attente clôture finale gestionnaire
17. Notification "Intervention clôturée"
18. END - Intervention consultable en historique
```

**Nombre étapes locataire** : 4 actions (création, dispos, validation, consultation)
**Durée typique** : 5-10 jours

---

### Parcours Prestataire (Avec Devis)

```
1. Login → /prestataire/dashboard
2. Notification "Nouvelle intervention assignée" ou "Demande de devis"
3. Accès intervention → Tab "Devis"
4. Clic "Soumettre mon devis" → Formulaire soumission
5. Rempli: Montant, Détail lignes, Description, Validité, Documents
6. Submit → Status devis 'submitted', notification gestionnaire
7. Attente validation devis
8. Notification "Devis accepté" ou "Devis rejeté"
9. Si accepté: Status intervention 'planification'
10. Notification "Indiquez vos disponibilités"
11. Prestataire propose créneaux disponibles
12. Notification "Intervention planifiée le XX/XX"
13. Jour J: Notification "Intervention aujourd'hui"
14. Prestataire clique "Démarrer travaux" → Upload photos avant
15. Status 'en_cours', notification gestionnaire + locataire
16. Pendant travaux: Upload docs, notes, photos progression
17. Fin travaux: Clique "Marquer terminé" → Formulaire rapport
18. Rempli: Rapport, Photos après, Documents, Durée
19. Submit → Status 'cloturee_par_prestataire', notification locataire
20. Attente validation locataire
21. Notification "Travaux validés par locataire" (+ note si fournie)
22. Attente clôture gestionnaire
23. Notification "Intervention clôturée"
24. END - Rating prestataire mis à jour
```

**Nombre étapes prestataire** : 6 actions (devis, dispos, démarrage, travaux, rapport, consultation)
**Durée typique** : 7-15 jours

---

### Parcours Gestionnaire (Workflow Complet)

```
1. Login → /gestionnaire/dashboard
2. Notification "Nouvelle demande intervention"
3. Accès intervention → Évalue demande
4. Décision: Approuver ou Rejeter
5. Si approuvé: Clique "Approuver" → Modal commentaire + assigner prestataires
6. Submit → Status 'approuvee', notifications envoyées
7. Si requires_quote: Clique "Demander devis" → Sélection prestataires
8. Submit demande devis → Status 'demande_de_devis', notifications
9. Attente soumissions devis
10. Notifications "Nouveau devis soumis" (×N prestataires)
11. Accès Tab "Devis" → Comparaison devis
12. Sélection meilleur devis → Clique "Valider"
13. Submit → Status 'planification', devis validé, autres rejetés
14. Tab "Planning" → Sélection mode planification
15. Si mode flexible: Demande dispos → Attente réponses
16. Système trouve créneaux communs → Gestionnaire sélectionne
17. Submit créneau → Status 'planifiee', notifications 3 parties
18. Jour J: Notification "Travaux démarrés"
19. Notification "Travaux terminés par prestataire"
20. Notification "Locataire a validé travaux"
21. Accès intervention → Vérif documents, coûts, validations
22. Clique "Clôturer l'intervention" → Formulaire clôture
23. Rempli: Coût final, Commentaire, Validation checklist
24. Submit → Status 'cloturee_par_gestionnaire' [TERMINAL]
25. Notifications toutes parties "Intervention clôturée"
26. END - Stats mises à jour, intervention archivée
```

**Nombre étapes gestionnaire** : 10+ actions (approbation, devis, planification, assignation, clôture, + arbitrages)
**Durée typique** : Suit toute la durée de l'intervention (5-15 jours)

---

# 2. CHECKLISTS DÉTAILLÉES PAR ÉCRAN

**★ Insight ─────────────────────────────────────**
Cette section fournit des checklists exhaustives pour chaque écran de l'application, organisées par rôle. Chaque checklist suit une structure standardisée : Métadonnées, Tests fonctionnels, Sécurité, Notifications, UI/UX, et Critères d'acceptation. Cette approche systématique garantit qu'aucun aspect n'est oublié lors des tests manuels.
─────────────────────────────────────────────────

## 2.1 AUTHENTIFICATION & ONBOARDING

### 2.1.1 - /auth/login (Login)

**Métadonnées**
- **Objectif** : Permettre connexion utilisateurs avec email/password
- **Rôles autorisés** : Public (tous, avant auth)
- **Préconditions** : Aucune (page publique)
- **Jeux de données** :
  - Valid: email existant + password correct
  - Invalid: email inexistant, password incorrect, email format invalide

**Tests Fonctionnels**
- [ ] **Formulaire affiché** : 2 champs (email, password), bouton "Se connecter", lien "Mot de passe oublié ?"
- [ ] **Validation email format** : Inline error si format invalide (ex: "abc@", "test.com")
- [ ] **Champs requis** : Error "Email requis" et "Mot de passe requis" si vides
- [ ] **Login SUCCESS** : Credentials valides → Redirect /dashboard (puis /{role}/dashboard)
- [ ] **Login FAIL - Credentials invalides** : Toast "Email ou mot de passe incorrect", reste sur /auth/login
- [ ] **Login FAIL - Compte désactivé** : Toast "Compte désactivé - Contactez administrateur"
- [ ] **Login FAIL - Email non vérifié** : Toast "Veuillez vérifier votre email" (si email verification activée)
- [ ] **Rate limiting** : Après 5 tentatives échouées → Toast "Trop de tentatives - Réessayez dans 15 min"
- [ ] **Checkbox "Remember me"** : Si coché, session 30j au lieu de 7j
- [ ] **Lien "Mot de passe oublié"** : Redirect vers /auth/reset-password
- [ ] **Redirect après login** : Utilisateur redirigé vers page initialement demandée (si deep link)

**Sécurité**
- [ ] **Password masqué** : Input type="password", option "Afficher" toggle
- [ ] **Pas de credentials en URL** : POST request, pas de GET params
- [ ] **Cookie httpOnly** : Session cookie secure + httpOnly
- [ ] **HTTPS enforced** : Production utilise HTTPS uniquement

**Notifications & Activity Logs**
- [ ] **Activity Log créé** : action=login, status=success, ip_address, user_agent
- [ ] **Activity Log échec** : action=login_failed si credentials invalides

**UI/UX**
- [ ] **Responsive** : Layout correct mobile (< 640px), tablet, desktop
- [ ] **Focus gestion** : Auto-focus champ email au chargement
- [ ] **Tab order** : Email → Password → Remember me → Submit → Forgot password
- [ ] **Enter submit** : Enter dans password field soumet formulaire
- [ ] **Loading state** : Bouton "Connexion..." (disabled + spinner) pendant requête
- [ ] **Accessibilité** : Labels associés inputs, ARIA labels présents, contraste WCAG AA

**Critères d'Acceptation**
- **PASS** : Login SUCCESS avec credentials valides redirect correct rôle dashboard
- **PASS** : Login FAIL avec credentials invalides affiche error approprié
- **PASS** : Rate limiting fonctionne après 5 tentatives
- **FAIL** : Si aucun error message, ou redirect incorrect, ou session pas créée

**Bugs à capturer**
- Étapes repro, credentials testés, error message exact, screenshots, console logs, environnement (browser, version)

---

### 2.1.2 - /auth/signup (Signup via Invitation)

**Métadonnées**
- **Objectif** : Création compte utilisateur via lien invitation
- **Rôles autorisés** : Public (utilisateur invité avec token valide)
- **Préconditions** : Invitation créée par gestionnaire, token valide et non expiré
- **URL** : `/auth/signup?token={invitation_token}`
- **Jeux de données** :
  - Token valide (status=pending, expires_at > now())
  - Token expiré (expires_at < now())
  - Token invalide/inexistant

**Tests Fonctionnels**
- [ ] **Token VALIDE** : Formulaire affiché avec email pré-rempli (disabled), champs password + confirm
- [ ] **Token EXPIRÉ** : Alert "Invitation expirée", CTA "Demander nouvelle invitation", redirect /auth/login
- [ ] **Token INVALIDE** : Alert "Lien invalide ou déjà utilisé", redirect /auth/login
- [ ] **Validation password strength** : Min 8 caractères, inline error si trop court
- [ ] **Validation passwords match** : Error "Mots de passe différents" si confirm ≠ password
- [ ] **Signup SUCCESS** : Submit → Compte créé, auth_user_id lié, invitation status=accepted, redirect /auth/signup-success
- [ ] **Signup FAIL - Email déjà utilisé** : Toast "Cet email a déjà un compte actif"
- [ ] **Signup FAIL - Supabase error** : Toast "Erreur création compte - Réessayez"
- [ ] **Modal bienvenue** : Page /auth/signup-success affiche modal "Bienvenue sur SEIDO", redirect /dashboard après 3s ou clic OK

**Sécurité**
- [ ] **Token unique** : Chaque token utilisable 1 seule fois (vérif status=pending)
- [ ] **Password hashed** : Supabase Auth hash password (bcrypt)
- [ ] **Pas de password en clair** : Logs ne contiennent pas passwords

**Notifications & Activity Logs**
- [ ] **Notification gestionnaire** : "Invitation acceptée par {email}"
- [ ] **Notification user** : "Bienvenue sur SEIDO" après création compte
- [ ] **Activity Log** : action=accept_invitation, user_id, invitation_id

**UI/UX**
- [ ] **Email pré-rempli** : Email lecture seule (depuis invitation)
- [ ] **Password strength indicator** : Barre visuelle vert/orange/rouge selon force password
- [ ] **Responsive** : Form centré, adapté mobile/tablet/desktop
- [ ] **Loading state** : Bouton "Créer mon compte..." pendant submit

**Critères d'Acceptation**
- **PASS** : Token valide → Form displayed → Submit SUCCESS → Account created + redirect signup-success
- **PASS** : Token expiré/invalide → Alert displayed + redirect login
- **FAIL** : Si token valide mais account pas créé, ou redirect incorrect

---

### 2.1.3 - /auth/reset-password (Demande Reset Password)

**Métadonnées**
- **Objectif** : Demande lien reset password par email
- **Rôles autorisés** : Public
- **Préconditions** : Aucune
- **Jeux de données** :
  - Email existant (user actif)
  - Email inexistant
  - Email invalide format

**Tests Fonctionnels**
- [ ] **Formulaire** : 1 champ email, description claire, bouton "Envoyer lien"
- [ ] **Validation email format** : Inline error si format invalide
- [ ] **Submit SUCCESS** : Toast "Email envoyé si compte existe" (message volontairement vague sécurité), redirect /auth/login
- [ ] **Email reçu** : User reçoit email avec lien /auth/update-password?token={reset_token}
- [ ] **Submit FAIL - Rate limiting** : Max 3 demandes/heure par IP, toast "Limite atteinte"
- [ ] **No email sent si email inexistant** : Mais toast identique (sécurité : pas révéler si email existe)

**Sécurité**
- [ ] **Pas de révélation email** : Toast identique que email existe ou pas (anti enumeration)
- [ ] **Rate limiting** : Max 3 reqs/h par IP
- [ ] **Token expiration** : Reset token expire après 1h

**Notifications & Activity Logs**
- [ ] **Activity Log** : action=password_reset_requested, status=success (même si email pas trouvé)
- [ ] **Pas de notification** : Seul email envoyé (si compte existe)

**UI/UX**
- [ ] **Message clair** : "Entrez votre email pour recevoir lien reset"
- [ ] **Responsive** : Form centré, adapté tous devices

**Critères d'Acceptation**
- **PASS** : Email existant → Email reçu avec lien valide
- **PASS** : Email inexistant → Toast affiché mais pas d'email (sécurité OK)
- **FAIL** : Si email existant mais pas d'email reçu, ou lien invalide

---

### 2.1.4 - /auth/update-password (Changement Password Après Reset)

**Métadonnées**
- **Objectif** : Définir nouveau password via lien reset
- **Rôles autorisés** : Public (avec reset token valide)
- **Préconditions** : Reset demandé, token valide Supabase
- **URL** : `/auth/update-password?token={reset_token}`
- **Jeux de données** :
  - Token valide (généré par Supabase, expires < 1h)
  - Token expiré
  - Token invalide

**Tests Fonctionnels**
- [ ] **Token VALIDE** : Formulaire affiché (new_password, confirm_password)
- [ ] **Token EXPIRÉ/INVALIDE** : Alert "Lien expiré ou invalide", CTA "Demander nouveau lien", redirect /auth/reset-password
- [ ] **Validation password** : Min 8 car, passwords doivent match
- [ ] **Submit SUCCESS** : Password changé, toast "Mot de passe modifié", redirect /auth/login, user doit se reconnecter
- [ ] **Submit FAIL - Password faible** : Inline error "Min 8 caractères"
- [ ] **Submit FAIL - Passwords différents** : Inline error "Mots de passe différents"

**Sécurité**
- [ ] **Token single-use** : Token invalidé après utilisation (Supabase gère)
- [ ] **Password hashed** : Nouveau password hashé par Supabase

**Notifications & Activity Logs**
- [ ] **Activity Log** : action=password_changed, user_id
- [ ] **Pas de notification** : Changement silencieux (user a demandé)

**UI/UX**
- [ ] **Password strength indicator** : Visuel force password
- [ ] **Boutons afficher/masquer** : Toggle visibility passwords

**Critères d'Acceptation**
- **PASS** : Token valide → Form → Submit → Password changé + redirect login + login SUCCESS avec nouveau password
- **FAIL** : Si password pas changé, ou ancien password fonctionne encore

---

### 2.1.5 - /auth/logout (Déconnexion)

**Métadonnées**
- **Objectif** : Déconnexion utilisateur, suppression session
- **Rôles autorisés** : Authentifié uniquement
- **Préconditions** : User logged in
- **Jeux de données** : Session active

**Tests Fonctionnels**
- [ ] **Logout SUCCESS** : Session supprimée, cookies cleared, redirect /auth/login, toast "Déconnexion réussie"
- [ ] **Logout vérifié** : Tentative accès /{role}/* après logout → Redirect /auth/login?reason=auth_error
- [ ] **Multi-tab logout** : Si logout dans 1 tab, autres tabs doivent aussi déconnecter (broadcast channel ou polling)

**Sécurité**
- [ ] **Session supprimée** : Cookie httpOnly supprimé
- [ ] **LocalStorage cleared** : Cache client nettoyé

**Notifications & Activity Logs**
- [ ] **Activity Log** : action=logout, user_id, timestamp
- [ ] **Pas de notification** : Action silencieuse

**UI/UX**
- [ ] **Bouton logout accessible** : Dans header menu dropdown

**Critères d'Acceptation**
- **PASS** : Logout → Session destroyed → Redirect login → Tentative accès page protégée bloquée
- **FAIL** : Si session reste active après logout

---

### 2.1.6 - /auth/unauthorized (Page Accès Refusé)

**Métadonnées**
- **Objectif** : Afficher message erreur accès refusé
- **Rôles autorisés** : Public (page erreur)
- **Préconditions** : Tentative accès non autorisé
- **URL params** : `?reason=no_team|role_mismatch|auth_error`

**Tests Fonctionnels**
- [ ] **Reason=no_team** : Message "Aucune équipe assignée - Contactez administrateur", CTA "Contacter support"
- [ ] **Reason=role_mismatch** : Message "Accès refusé - Rôle insuffisant"
- [ ] **Reason=auth_error** : Message "Session expirée", CTA "Se reconnecter", redirect /auth/login
- [ ] **Bouton retour** : Redirect /auth/login ou /dashboard selon contexte

**UI/UX**
- [ ] **Icon warning** : Icon ⚠️ affiché
- [ ] **Message clair** : Explique pourquoi accès refusé
- [ ] **CTA approprié** : Selon reason, propose action corrective

**Critères d'Acceptation**
- **PASS** : Message correct selon reason, CTA fonctionnel
- **FAIL** : Si message générique sans explication

---

### 2.1.7 - /auth/set-password (Définir Nouveau Password)

**Métadonnées**
- **Objectif** : Définir nouveau password lors première connexion ou depuis email reset
- **Rôles autorisés** : Public (avec token valide)
- **Préconditions** : Token Supabase valide (reset ou initial setup)
- **URL** : `/auth/set-password?token={token}`
- **Jeux de données** :
  - Token valide (généré par Supabase, non expiré)
  - Token expiré (> 1h pour reset, > 24h pour initial setup)
  - Token invalide/inexistant

**Tests Fonctionnels**
- [ ] **Token VALIDE** : Formulaire affiché avec 2 champs (new_password, confirm_password)
- [ ] **Email pré-affiché** : Email utilisateur affiché en lecture seule pour contexte
- [ ] **Token EXPIRÉ** : Alert "Lien expiré", message "Ce lien a expiré. Veuillez en demander un nouveau", CTA "Retour à connexion"
- [ ] **Token INVALIDE** : Alert "Lien invalide", message "Ce lien n'existe pas ou a déjà été utilisé", redirect /auth/login
- [ ] **Validation password strength** : Min 8 caractères, inline error si trop court
- [ ] **Validation passwords match** : Error "Les mots de passe ne correspondent pas" si confirm ≠ password
- [ ] **Password strength indicator** : Barre visuelle (rouge/orange/vert) selon complexité
- [ ] **Submit SUCCESS** : Password défini, toast "Mot de passe créé avec succès", redirect /auth/login, session auto-login
- [ ] **Submit FAIL - Password trop faible** : Inline error "Le mot de passe doit contenir au moins 8 caractères"
- [ ] **Submit FAIL - Passwords différents** : Inline error "Les mots de passe ne correspondent pas"
- [ ] **Submit FAIL - Erreur serveur** : Toast "Erreur lors de la création du mot de passe - Réessayez"

**Sécurité**
- [ ] **Token single-use** : Token invalidé automatiquement après utilisation réussie
- [ ] **Password masqué** : Input type="password" avec toggle "Afficher/Masquer"
- [ ] **Password hashed** : Supabase hash password côté serveur (bcrypt)
- [ ] **Pas de password en URL** : Password transmis via POST uniquement
- [ ] **HTTPS enforced** : Page accessible uniquement en HTTPS (production)

**Notifications & Activity Logs**
- [ ] **Activity Log** : action=password_set, user_id, timestamp
- [ ] **Notification user** : "Votre mot de passe a été défini avec succès"
- [ ] **Pas de notification gestionnaire** : Action privée utilisateur

**UI/UX**
- [ ] **Instructions claires** : Message expliquant "Créez un mot de passe sécurisé pour votre compte"
- [ ] **Requirements visibles** : Liste requirements password (min 8 car, 1 majuscule, 1 chiffre recommandés)
- [ ] **Responsive** : Form centré, adapté mobile (< 640px), tablet, desktop
- [ ] **Focus gestion** : Auto-focus champ new_password au chargement
- [ ] **Tab order** : new_password → confirm_password → toggle show → submit
- [ ] **Enter submit** : Enter dans confirm_password soumet formulaire
- [ ] **Loading state** : Bouton "Création..." (disabled + spinner) pendant requête
- [ ] **Accessibilité** : Labels associés, ARIA labels, contraste WCAG AA

**Critères d'Acceptation**
- **PASS** : Token valide → Form displayed → Submit avec password valide → Password créé + redirect login + login automatique
- **PASS** : Token expiré/invalide → Alert approprié affiché + redirect
- **FAIL** : Si token valide mais password pas créé, ou redirect incorrect, ou pas de session après création

**Bugs à capturer**
- Token exact testé, error messages, screenshots formulaire, console logs, environnement (browser/version)

---

### 2.1.8 - /auth/confirm (Confirmation Email)

**Métadonnées**
- **Objectif** : Confirmer email utilisateur via lien envoyé par email
- **Rôles autorisés** : Public (avec token confirmation Supabase)
- **Préconditions** : Compte créé, email de confirmation envoyé
- **URL** : `/auth/confirm?token={confirmation_token}&type=email`
- **Jeux de données** :
  - Token valide (email non encore confirmé)
  - Token déjà utilisé (email déjà confirmé)
  - Token expiré
  - Token invalide

**Tests Fonctionnels**
- [ ] **Token VALIDE** : Email confirmé automatiquement, toast "Email confirmé avec succès", redirect /auth/login
- [ ] **Token DÉJÀ UTILISÉ** : Message "Email déjà confirmé", toast "Votre email est déjà vérifié", redirect /auth/login
- [ ] **Token EXPIRÉ** : Alert "Lien expiré", CTA "Renvoyer email de confirmation", affiche form email
- [ ] **Token INVALIDE** : Alert "Lien invalide", toast "Ce lien n'est pas valide", redirect /auth/login
- [ ] **Confirmation SUCCESS** : users.email_verified_at mis à jour avec timestamp actuel
- [ ] **Renvoyer confirmation** : Si expiré, form permet entrer email → POST /api/resend-confirmation → Email renvoyé
- [ ] **Rate limiting renvoi** : Max 3 renvois/heure par email, toast "Limite atteinte - Réessayez plus tard"

**Sécurité**
- [ ] **Token single-use** : Token invalidé après première utilisation
- [ ] **Token expiration** : Expire après 24h (configurable Supabase)
- [ ] **Pas de révélation données** : Pas d'infos sensibles dans messages erreur

**Notifications & Activity Logs**
- [ ] **Activity Log** : action=email_confirmed, user_id, timestamp
- [ ] **Notification user** : "Votre email a été confirmé - Vous pouvez maintenant vous connecter"
- [ ] **Pas de notification gestionnaire** : Confirmation silencieuse

**UI/UX**
- [ ] **Loading state** : Spinner pendant vérification token (auto)
- [ ] **Success state** : Icon ✓, message "Email confirmé", redirect auto après 3s
- [ ] **Error state** : Icon ✗, message erreur clair, CTA approprié
- [ ] **Responsive** : Page centrée, adapté tous devices
- [ ] **Accessibilité** : Messages lisibles, contraste suffisant, focus management

**Critères d'Acceptation**
- **PASS** : Token valide → Email confirmé → users.email_verified_at mis à jour → Redirect login → Login possible
- **PASS** : Token expiré → CTA renvoi affiché → Renvoi fonctionnel
- **FAIL** : Si token valide mais email pas confirmé en DB, ou redirect incorrect

**Bugs à capturer**
- Token testé, type param, response API, état DB (email_verified_at), screenshots, console logs

---

### 2.1.9 - /auth/callback (OAuth Callback Handler)

**Métadonnées**
- **Objectif** : Gérer redirections OAuth (Google, Azure AD, etc.) après authentification externe
- **Rôles autorisés** : Public (callback automatique)
- **Préconditions** : Flux OAuth initié depuis page login
- **URL** : `/auth/callback?code={auth_code}&state={state}`
- **Jeux de données** :
  - Code valide (OAuth flow success)
  - Code invalide/expiré
  - State mismatch (attaque CSRF)
  - Error param (OAuth provider error)

**Tests Fonctionnels**
- [ ] **Callback SUCCESS** : Code échangé contre access_token, session créée, redirect /{role}/dashboard
- [ ] **Callback FAIL - Code invalide** : Toast "Erreur authentification - Réessayez", redirect /auth/login
- [ ] **Callback FAIL - State mismatch** : Toast "Erreur sécurité détectée", redirect /auth/login, log security event
- [ ] **Callback FAIL - Provider error** : Toast affiche error description du provider (ex: "access_denied")
- [ ] **User nouveau (OAuth)** : Si email pas en DB → Compte créé auto → Profil pré-rempli depuis OAuth → Redirect onboarding
- [ ] **User existant (OAuth)** : Si email en DB → Link OAuth provider à compte existant → Redirect dashboard
- [ ] **Email conflict** : Si email OAuth déjà utilisé avec password auth → Toast "Connectez-vous avec email/password"

**Sécurité**
- [ ] **State validation** : State param vérifié contre state stocké en session (anti-CSRF)
- [ ] **Code single-use** : Auth code utilisable 1 seule fois
- [ ] **HTTPS only** : Callback URL HTTPS uniquement (production)
- [ ] **Token storage secure** : Access/refresh tokens stockés httpOnly cookies

**Notifications & Activity Logs**
- [ ] **Activity Log SUCCESS** : action=oauth_login, provider=google|azure, user_id
- [ ] **Activity Log FAIL** : action=oauth_login_failed, reason=code_invalid|state_mismatch
- [ ] **Pas de notification** : Login silencieux

**UI/UX**
- [ ] **Loading state** : Spinner "Authentification en cours..." pendant traitement code
- [ ] **Pas d'interaction** : Page auto-process, pas de form
- [ ] **Timeout handling** : Si callback prend > 10s, affiche "Connexion lente - Vérifiez votre réseau"
- [ ] **Responsive** : Loading spinner centré, adapté tous devices

**Critères d'Acceptation**
- **PASS** : OAuth flow complet → Callback SUCCESS → Session créée → Redirect correct dashboard
- **PASS** : State mismatch détecté → Security log créé → Redirect login avec error
- **FAIL** : Si code valide mais session pas créée, ou redirect incorrect

**Bugs à capturer**
- Provider OAuth utilisé, code/state params, error messages, DB state (compte créé?), console logs, network tab

---

### 2.1.10 - /auth/signup-success (Confirmation Inscription)

**Métadonnées**
- **Objectif** : Afficher confirmation réussie création compte
- **Rôles autorisés** : Public (juste après signup)
- **Préconditions** : Compte créé avec succès via /auth/signup
- **URL** : `/auth/signup-success`
- **Jeux de données** : Session vient d'être créée

**Tests Fonctionnels**
- [ ] **Modal bienvenue affiché** : Modal "Bienvenue sur SEIDO" avec animation
- [ ] **Message personnalisé** : "Bonjour {first_name}, votre compte a été créé avec succès"
- [ ] **Informations next steps** : Liste 2-3 étapes suivantes (ex: "Explorez votre dashboard", "Ajoutez vos biens")
- [ ] **CTA principal** : Bouton "Commencer" (redirect /{role}/dashboard)
- [ ] **Auto-redirect** : Si pas de clic après 5s, redirect auto dashboard
- [ ] **Icon success** : Icon ✓ ou animation confetti
- [ ] **Dismiss modal** : Click backdrop ou X ferme modal → redirect dashboard

**Sécurité**
- [ ] **Session vérifiée** : Si pas de session active → redirect /auth/login
- [ ] **One-time view** : Page accessible uniquement juste après signup (flag session ou timestamp)

**Notifications & Activity Logs**
- [ ] **Notification user** : "Bienvenue sur SEIDO! Votre compte est actif"
- [ ] **Notification gestionnaire** : Si invité par gestionnaire → "Invitation acceptée par {email}"
- [ ] **Activity Log** : action=signup_success_viewed, user_id

**UI/UX**
- [ ] **Animation entrée** : Modal slide-in ou fade-in
- [ ] **Design accueillant** : Couleurs brand, typography claire, espacement généreux
- [ ] **Responsive** : Modal adapté mobile (full-screen), tablet (80% width), desktop (max 500px)
- [ ] **Accessibilité** : Focus trap dans modal, ESC key ferme modal, ARIA role="dialog"

**Critères d'Acceptation**
- **PASS** : Après signup → Modal affiché → CTA "Commencer" → Redirect dashboard correct rôle
- **PASS** : Auto-redirect après 5s fonctionne
- **FAIL** : Si modal pas affiché, ou redirect incorrect, ou accessible sans signup récent

**Bugs à capturer**
- Flow complet (signup → success → dashboard), screenshots modal, timing auto-redirect, console logs

---

## 2.2 ADMIN

### 2.2.1 - /admin/dashboard (Dashboard Admin)

**Métadonnées**
- **Objectif** : Vue d'ensemble stats système (multi-tenant)
- **Rôles autorisés** : Admin uniquement
- **Préconditions** : User role=admin, session valide
- **Permissions RLS** : is_admin() = true

**Tests Fonctionnels**
- [ ] **4 Stats Cards affichées** : Utilisateurs, Bâtiments, Interventions, Revenus (simulation)
- [ ] **Stats correctes** : Nombres cohérents avec DB (query all teams)
- [ ] **Croissance affichée** : % croissance mensuelle (calculé ou simulation)
- [ ] **Actions admin disponibles** : Boutons "Gestion données", "Gestion users", "Configuration"
- [ ] **Graphiques** : Charts revenue, users growth (si implémenté)
- [ ] **Refresh data** : Bouton refresh recharge stats (cache invalidation)

**Sécurité**
- [ ] **Access control** : User non-admin → Redirect /auth/unauthorized?reason=role_mismatch
- [ ] **RLS vérifié** : Stats queries incluent toutes teams (admin bypass RLS partiel)

**Notifications & Activity Logs**
- [ ] **Pas de notification** : Consultation dashboard silencieuse
- [ ] **Activity Log** : action=view, entity_type=dashboard_admin (optionnel)

**UI/UX**
- [ ] **Responsive** : Cards empilées mobile, grid 2x2 tablet, 4 colonnes desktop
- [ ] **Loading state** : Skeleton cards pendant chargement stats
- [ ] **Empty state** : Si DB vide, message "Aucune donnée"

**Critères d'Acceptation**
- **PASS** : Stats affichées correctes, actions admin accessibles
- **FAIL** : Si stats incorrectes, ou user non-admin accède

---

### 2.2.2 - /admin/notifications (Notifications Admin)

**Métadonnées**
- **Objectif** : Liste notifications système admin
- **Rôles autorisés** : Admin uniquement
- **Préconditions** : User role=admin
- **Permissions RLS** : is_notification_recipient() pour admin

**Tests Fonctionnels**
- [ ] **Liste notifications affichée** : Table/liste notifications avec type, date, message, status (read/unread)
- [ ] **Filtres** : Type (intervention, chat, document, system), Status (lu/non lu), Date range
- [ ] **Tri** : Par date desc (défaut), ascendant, par type
- [ ] **Pagination** : 20 items/page, navigation pages
- [ ] **Marquer lu** : Clic notification → status=read
- [ ] **Marquer toutes lues** : Bouton bulk action → Toutes notifications read
- [ ] **Archiver** : Clic archive → Notification masquée liste principale
- [ ] **Badge compteur** : Header affiche count notifications non lues

**Sécurité**
- [ ] **Isolation** : Admin voit uniquement ses notifications (is_notification_recipient)

**Notifications & Activity Logs**
- [ ] **Pas de nouvelle notification** : Action consultation
- [ ] **Activity Log update** : action=mark_notification_read (optionnel)

**UI/UX**
- [ ] **Notification non lue** : Background highlight (bleu clair)
- [ ] **Empty state** : "Aucune notification"
- [ ] **Responsive** : Liste adaptée mobile (cards), desktop (table)

**Critères d'Acceptation**
- **PASS** : Notifications affichées, filtres/tri fonctionnent, marquer lu OK
- **FAIL** : Si notifications d'autres users visibles, ou filtres cassés

---

### 2.2.3 - /admin/profile (Profil Admin)

**Métadonnées**
- **Objectif** : Édition profil admin
- **Rôles autorisés** : Admin uniquement
- **Préconditions** : User role=admin, session valide

**Tests Fonctionnels**
- [ ] **Formulaire affiché** : first_name, last_name, email (disabled), phone, address, avatar
- [ ] **Upload avatar** : Drag & drop ou file picker, formats JPG/PNG, max 2MB
- [ ] **Preview avatar** : Thumbnail affiché après upload
- [ ] **Submit SUCCESS** : Toast "Profil mis à jour", data saved DB
- [ ] **Submit FAIL - Validation** : Inline errors si champs invalides
- [ ] **Changement email** : Lien vers /auth/change-email (workflow séparé)
- [ ] **Changement password** : Lien vers /auth/change-password (workflow séparé)

**Sécurité**
- [ ] **User peut modifier uniquement son profil** : can_update_user(user_id)
- [ ] **Avatar upload sécurisé** : Validation type MIME, scan antivirus (si configuré)

**Notifications & Activity Logs**
- [ ] **Activity Log** : action=update, entity_type=user, metadata={ changed_fields }

**UI/UX**
- [ ] **Responsive** : Form adapté mobile/desktop
- [ ] **Optimistic UI** : Avatar preview immédiat, rollback si upload fail

**Critères d'Acceptation**
- **PASS** : Édition profil → Submit → Data saved + toast success
- **FAIL** : Si data pas sauvegardée, ou avatar upload échoue

---

### 2.2.4 - /admin/parametres (Paramètres Admin)

**Métadonnées**
- **Objectif** : Configuration système admin
- **Rôles autorisés** : Admin uniquement
- **Préconditions** : User role=admin

**Tests Fonctionnels**
- [ ] **Sections paramètres** : Général, Notifications, Sécurité, Intégrations
- [ ] **Paramètres généraux** : Langue (fr/en), Timezone, Format date
- [ ] **Paramètres notifications** : Email notifications ON/OFF, Push notifications ON/OFF
- [ ] **Paramètres sécurité** : 2FA (si implémenté), Sessions actives (liste + révocation)
- [ ] **Submit SUCCESS** : Toast "Paramètres enregistrés"
- [ ] **Clear cache** : Bouton "Vider cache" → API /api/admin/clear-cache → Toast "Cache vidé"

**Sécurité**
- [ ] **Actions admin protégées** : Clear cache nécessite role=admin
- [ ] **2FA enforcement** : Si activé, obligatoire pour admin

**UI/UX**
- [ ] **Tabs ou Accordion** : Sections organisées clairement

**Critères d'Acceptation**
- **PASS** : Paramètres sauvegardés, clear cache fonctionne
- **FAIL** : Si paramètres pas appliqués après save

---

## 2.3 GESTIONNAIRE (Sélection Écrans Prioritaires)

### 2.3.1 - /gestionnaire/dashboard (Dashboard Gestionnaire)

**Métadonnées**
- **Objectif** : Vue d'ensemble portefeuille immobilier + interventions
- **Rôles autorisés** : Gestionnaire uniquement
- **Préconditions** : User role=gestionnaire, team_id valide, session active
- **Permissions RLS** : is_team_manager(team_id)

**Tests Fonctionnels**
- [ ] **5 Stats Cards** : Immeubles, Lots, Taux occupation, Contacts, Interventions actives
- [ ] **Stats correctes** : Nombres cohérents avec team_id scope
- [ ] **Taux occupation** : % calculé correct (lots occupés / total lots)
- [ ] **Section Interventions** : Tabs "En cours" / "Terminées", liste interventions avec statuts badges
- [ ] **Actions rapides** : Boutons "Nouvel immeuble", "Nouveau lot", "Nouvelle intervention"
- [ ] **Redirect actions** : Clics boutons → Wizards création respectifs
- [ ] **Interventions cliquables** : Clic intervention → Redirect /gestionnaire/interventions/[id]
- [ ] **Empty states** : Si aucun immeuble/lot → Message + CTA "Créer premier immeuble"

**Sécurité**
- [ ] **Team isolation** : Stats affichées uniquement pour team_id user (RLS)
- [ ] **Access control** : Non-gestionnaire → Redirect unauthorized

**Notifications & Activity Logs**
- [ ] **Pas de notification** : Consultation dashboard silencieuse
- [ ] **Activity Log** : action=view_dashboard (optionnel)

**UI/UX**
- [ ] **Responsive** : Stats cards empilées mobile, grid 3 cols tablet, 5 cols desktop
- [ ] **Loading states** : Skeleton cards pendant chargement
- [ ] **Interventions filtres** : Filtrer par urgence, type, statut (dans section interventions)
- [ ] **Refresh data** : Bouton refresh ou auto-refresh périodique

**Critères d'Acceptation**
- **PASS** : Stats correctes scope team, actions rapides fonctionnelles, interventions listées
- **FAIL** : Si stats incorrectes, ou interventions autres teams visibles

---

### 2.3.2 - /gestionnaire/biens (Liste Biens)

**Métadonnées**
- **Objectif** : Liste immeubles + lots équipe
- **Rôles autorisés** : Gestionnaire uniquement
- **Préconditions** : User role=gestionnaire, team_id
- **Permissions RLS** : buildings.team_id = user.team_id, lots.team_id = user.team_id

**Tests Fonctionnels**
- [ ] **Tabs** : "Immeubles" / "Lots indépendants" / "Tous les lots"
- [ ] **Tab Immeubles** : Table immeubles (nom, adresse, nb lots, interventions actives, actions)
- [ ] **Tab Lots indépendants** : Table lots building_id=NULL (référence, catégorie, adresse, locataire)
- [ ] **Tab Tous les lots** : Table tous lots team (référence, immeuble si rattaché, locataire, statut occupé/vacant)
- [ ] **Recherche** : Champ search filtre par nom immeuble, adresse, référence lot
- [ ] **Filtres** : Par ville, occupé/vacant (lots), nombre lots (immeubles)
- [ ] **Tri** : Par nom, date création, nb interventions
- [ ] **Pagination** : 20 items/page
- [ ] **Actions lignes** : [Voir détail] [Modifier] [Supprimer]
- [ ] **Boutons ajout** : "Nouvel immeuble", "Nouveau lot"
- [ ] **Empty state** : "Aucun bien - Créez votre premier immeuble"
- [ ] **Compteurs** : Total immeubles, total lots affichés

**Sécurité**
- [ ] **Team isolation** : Uniquement biens team_id (RLS vérifié)
- [ ] **Actions protégées** : Modifier/Supprimer → Vérif permissions

**Notifications & Activity Logs**
- [ ] **Pas de notification** : Consultation liste silencieuse

**UI/UX**
- [ ] **Responsive** : Table → Cards mobile, table desktop
- [ ] **Loading states** : Skeleton rows pendant chargement
- [ ] **Badges statuts** : Occupé (vert), Vacant (orange) pour lots
- [ ] **Hover actions** : Actions apparaissent au hover ligne (desktop)

**Critères d'Acceptation**
- **PASS** : Liste affichée correcte scope team, recherche/filtres/tri fonctionnent, actions OK
- **FAIL** : Si biens autres teams visibles, ou recherche cassée

---

### 2.3.3 - /gestionnaire/biens/immeubles/nouveau (Wizard Création Immeuble)

**Référence détaillée** : Voir Section 1.4 - F3.1

**Checklist Rapide**
- [ ] **Étape 1/4 Infos** : Nom*, Adresse*, Ville*, CP*, Pays*, Description (validations OK)
- [ ] **Étape 2/4 Contacts** : Sélection/Création contacts (syndic, concierge, gestionnaire)
- [ ] **Étape 3/4 Lots** : Ajout lots optionnel (répétable)
- [ ] **Étape 4/4 Documents** : Upload docs optionnel (max 10MB, PDF/JPG/PNG)
- [ ] **Navigation wizard** : Précédent/Suivant/Passer/Créer fonctionnels
- [ ] **Validation globale** : Nom unique team vérifié
- [ ] **Submit SUCCESS** : Immeuble créé + redirect /gestionnaire/biens/immeubles/[new_id]
- [ ] **Submit FAIL** : Errors appropriés, wizard revient étape concernée
- [ ] **Cancel** : Annuler → Confirm modal → Redirect /gestionnaire/biens (data perdue)

**Notifications**
- [ ] **Notification team** : "Nouvel immeuble '{name}' créé par {user}"

**Activity Logs**
- [ ] **Log** : action=create, entity_type=building, metadata={ lots_count, docs_count }

**Critères Pass/Fail**
- **PASS** : Wizard complet → Submit → Immeuble créé DB + lots liés + docs uploadés + redirect détail
- **FAIL** : Si immeuble pas créé, ou lots pas liés, ou docs pas uploadés

---

### 2.3.4 - /gestionnaire/biens/immeubles/[id] (Détail Immeuble)

**Métadonnées**
- **Objectif** : Fiche complète immeuble
- **Rôles autorisés** : Gestionnaire (team), Proprietaire (read-only)
- **Préconditions** : Building.id existe, user can_view_building(id)
- **Permissions RLS** : can_view_building() vérifie team ou propriétaire

**Tests Fonctionnels**
- [ ] **Header** : Nom immeuble, adresse complète, badges (nb lots, interventions actives)
- [ ] **Tabs** : Résumé, Lots, Contacts, Documents, Interventions, Activité
- [ ] **Tab Résumé** : Infos générales, description, compteurs (lots total/occupés/vacants)
- [ ] **Tab Lots** : Liste lots rattachés (référence, catégorie, locataire, statut), bouton "Ajouter lot"
- [ ] **Tab Contacts** : Liste contacts assignés (nom, rôle, is_primary, phone, email), boutons Ajouter/Modifier/Retirer
- [ ] **Tab Documents** : Liste docs propriété (titre, type, visibility, date, uploadé par), Upload zone, Download/Delete actions
- [ ] **Tab Interventions** : Liste interventions immeuble (référence, type, statut, date, locataire), filtres statut
- [ ] **Tab Activité** : Timeline activity logs (creation, updates, contacts added, documents uploaded)
- [ ] **Actions header** : [Modifier] [Supprimer] (gestionnaire only)
- [ ] **Modifier** : Redirect wizard édition ou form inline
- [ ] **Supprimer** : Modal confirmation, soft delete, redirect /gestionnaire/biens

**Sécurité**
- [ ] **Team isolation** : RLS can_view_building vérifié
- [ ] **Read-only proprietaire** : Boutons Modifier/Supprimer masqués si role=proprietaire

**Notifications & Activity Logs**
- [ ] **Pas de notification** : Consultation silencieuse
- [ ] **Activity Log view** : action=view, entity_type=building (optionnel)

**UI/UX**
- [ ] **Responsive** : Tabs horizontal desktop, dropdown mobile
- [ ] **Loading tabs** : Skeleton content per tab
- [ ] **Empty states** : Si aucun lot/contact/doc → Message + CTA
- [ ] **Breadcrumb** : Gestionnaire > Biens > {building_name}

**Critères d'Acceptation**
- **PASS** : Détail affiché complet, tabs chargent données correctes, actions fonctionnelles
- **FAIL** : Si données incorrectes, ou tabs vides alors que data existe

---

### 2.3.5 - /gestionnaire/biens/lots/[id] (Détail Lot)

**Métadonnées**
- **Objectif** : Fiche complète lot
- **Rôles autorisés** : Gestionnaire, Locataire (si locataire du lot), Proprietaire (read-only)
- **Préconditions** : Lot.id existe, can_view_lot(id)
- **Permissions RLS** : can_view_lot() vérifie team ou is_tenant_of_lot

**Tests Fonctionnels**
- [ ] **Header** : Référence lot, catégorie, immeuble (si rattaché), adresse, statut Occupé/Vacant
- [ ] **Tabs** : Résumé, Contacts, Documents, Interventions, Activité
- [ ] **Tab Résumé** : Infos générales (étage, numéro apt, description), locataire principal (avatar, nom, contact)
- [ ] **Tab Contacts** : Locataire principal (is_primary=true badge), autres contacts (propriétaire, etc.), actions Ajouter/Modifier/Retirer
- [ ] **Tab Documents** : Docs lot (bail, état lieux, diagnostics), visibility_level respecté (locataire voit docs "locataire")
- [ ] **Tab Interventions** : Historique interventions lot, filtres statut/type/date
- [ ] **Tab Activité** : Timeline activité lot
- [ ] **Actions header** : [Modifier] [Supprimer] [Nouvelle intervention] (gestionnaire), read-only autres

**Sécurité**
- [ ] **RLS** : Locataire voit uniquement son lot, docs visibilité respectée
- [ ] **Read-only** : Locataire/Proprietaire pas de boutons Modifier/Supprimer

**UI/UX**
- [ ] **Badge occupé/vacant** : Couleur appropriée (vert/orange)
- [ ] **Locataire principal highlighted** : Badge "Principal" affiché
- [ ] **Breadcrumb** : Gestionnaire > Biens > {lot_reference}

**Critères d'Acceptation**
- **PASS** : Détail affiché, données correctes, RLS respecté (locataire voit uniquement son lot)
- **FAIL** : Si locataire voit autres lots, ou docs mauvaise visibility affichés

---

### 2.3.6 - /gestionnaire/contacts (Annuaire Contacts)

**Métadonnées**
- **Objectif** : Liste contacts équipe + gestion invitations
- **Rôles autorisés** : Gestionnaire uniquement
- **Préconditions** : User role=gestionnaire, team_id
- **Permissions RLS** : users.team_id = user.team_id, user_invitations.team_id = user.team_id

**Tests Fonctionnels**
- [ ] **Tabs** : "Tous" / "Gestionnaires" / "Prestataires" / "Locataires" / "Proprietaires" / "Invitations"
- [ ] **Liste contacts** : Table (avatar, nom, rôle, email, phone, statut compte, actions)
- [ ] **Statut compte badges** : "Actif" (vert), "Non invité" (gris), "Invitation envoyée" (orange), "Invitation expirée" (rouge)
- [ ] **Recherche** : Filtre par nom, email
- [ ] **Filtres** : Par rôle, statut compte, entreprise (prestataires)
- [ ] **Tri** : Par nom, date ajout, rôle
- [ ] **Actions ligne** : [Voir détail] [Modifier] [Inviter] [Réinviter] [Révoquer] selon statut
- [ ] **Bouton "Ajouter contact"** : Ouvre modal création contact
- [ ] **Tab Invitations** : Liste invitations (email, rôle, status, expires_at, invité par, actions Réinviter/Révoquer)
- [ ] **Compteur invitations pending** : Badge count dans tab header
- [ ] **Empty state** : "Aucun contact - Invitez votre première personne"

**Sécurité**
- [ ] **Team isolation** : Contacts team_id uniquement (RLS)
- [ ] **Actions protégées** : Inviter/Révoquer vérifie is_team_manager

**Notifications & Activity Logs**
- [ ] **Pas de notification** : Consultation liste silencieuse
- [ ] **Logs actions** : Inviter/Révoquer génèrent logs

**UI/UX**
- [ ] **Badges statuts** : Couleurs distinctes par statut
- [ ] **Actions contextuelles** : "Inviter" visible uniquement si statut="Non invité"
- [ ] **Hover tooltips** : Hover "Invitation envoyée" → Tooltip "Envoyée le XX/XX - Expire le YY/YY"
- [ ] **Responsive** : Table → Cards mobile

**Critères d'Acceptation**
- **PASS** : Liste affichée, filtres/recherche/tri fonctionnent, actions contextuelles correctes
- **FAIL** : Si contacts autres teams visibles, ou actions incorrectes

---

### 2.3.7 - /gestionnaire/interventions (Liste Interventions)

**Métadonnées**
- **Objectif** : Liste interventions équipe
- **Rôles autorisés** : Gestionnaire uniquement
- **Préconditions** : User role=gestionnaire, team_id
- **Permissions RLS** : interventions.team_id = user.team_id

**Tests Fonctionnels**
- [ ] **Tabs** : "Actives" (status ≠ terminal), "En attente" (status=demande), "Terminées" (status terminal), "Toutes"
- [ ] **Liste interventions** : Table (référence, titre, type icon, urgence badge, statut badge, lot, locataire, date création, actions)
- [ ] **Badge urgence** : Couleur selon niveau (basse=gris, normale=bleu, haute=orange, urgente=rouge)
- [ ] **Badge statut** : Couleur selon statut (demande=orange, approuvee=vert, en_cours=bleu, cloturee=gris)
- [ ] **Badge "Action requise"** : Affiché si action pending (ex: status=demande → "À approuver")
- [ ] **Recherche** : Filtre par référence, titre, adresse lot
- [ ] **Filtres** : Statut (multi-select), Type (multi-select), Urgence (multi-select), Date range, Lot/Immeuble, Prestataire
- [ ] **Tri** : Par date création desc (défaut), urgence desc, statut, référence
- [ ] **Pagination** : 20 items/page
- [ ] **Actions ligne** : [Voir détail] (toujours), [Approuver] [Rejeter] (si status=demande)
- [ ] **Bouton "Nouvelle intervention"** : Redirect /gestionnaire/interventions/nouvelle-intervention
- [ ] **Compteurs** : Total actives, pending approval, terminées ce mois
- [ ] **Empty state** : "Aucune intervention"

**Sécurité**
- [ ] **Team isolation** : Interventions team_id uniquement (RLS)

**UI/UX**
- [ ] **Responsive** : Table → Cards mobile (empilées)
- [ ] **Loading states** : Skeleton rows
- [ ] **Filtres sidebar** : Desktop sidebar, mobile drawer
- [ ] **Quick actions** : Approuver/Rejeter inline (avec confirmation)

**Critères d'Acceptation**
- **PASS** : Liste affichée scope team, filtres/recherche/tri fonctionnent, badges corrects
- **FAIL** : Si interventions autres teams visibles, ou filtres cassés

---

### 2.3.8 - /gestionnaire/interventions/[id] (Détail Intervention)

**Référence détaillée** : Voir Section 1.6 - F5.2 à F5.10

**Checklist Rapide**
- [ ] **Header** : Référence, Badge statut (couleur dynamique), Urgence badge, Type icon
- [ ] **Tabs** : Résumé, Planning, Devis, Fichiers, Chat, Activité
- [ ] **Tab Résumé** : Infos intervention (titre, description, localisation), Infos logement (lot, adresse), Contacts assignés (locataire, prestataire)
- [ ] **Tab Planning** : Mode planification (flexible/slots/fixed), Calendrier disponibilités, Créneaux proposés, Matching automatique
- [ ] **Tab Devis** : Liste devis soumis (provider, montant, statut), Comparaison devis, Actions Valider/Rejeter
- [ ] **Tab Fichiers** : Photos avant/après, Documents (rapport, factures), Upload zone, Download/Preview actions
- [ ] **Tab Chat** : Threads conversation (group, tenant_to_managers, provider_to_managers), Interface messages, Upload attachments
- [ ] **Tab Activité** : Timeline complète (qui, quoi, quand), Filtres par type action
- [ ] **Actions header** : Contextuelles selon statut (Approuver, Rejeter, Demander devis, Planifier, Clôturer, Annuler)
- [ ] **Transitions statuts** : Workflow 11 statuts respecté (validations backend)

**Sécurité**
- [ ] **RLS** : can_view_intervention(id) vérifié
- [ ] **Actions protégées** : can_manage_intervention(id) pour actions gestionnaire

**UI/UX**
- [ ] **Badge statut dynamique** : Couleur + texte selon statut actuel
- [ ] **Actions disabled** : Si transition impossible (ex: Clôturer si pas cloturee_par_locataire)
- [ ] **Loading states** : Skeleton per tab
- [ ] **Responsive** : Tabs adaptés mobile (dropdown)

**Critères d'Acceptation**
- **PASS** : Détail complet, tabs chargent data, actions workflow fonctionnelles, RLS OK
- **FAIL** : Si actions incorrectes, ou transition statut non respectée

---

### 2.3.9 - /gestionnaire/mail (Messagerie)

**Métadonnées**
- **Objectif** : Inbox threads conversations
- **Rôles autorisés** : Gestionnaire uniquement
- **Préconditions** : User role=gestionnaire, team_id

**Tests Fonctionnels**
- [ ] **Liste threads** : Sidebar threads (titre, participants avatars, dernier message preview, date, unread badge)
- [ ] **Sélection thread** : Clic thread → Main area affiche messages thread
- [ ] **Messages affichés** : Liste messages chronologique (avatar sender, nom, timestamp, content, attachments)
- [ ] **Envoi message** : Textarea + bouton Send, Enter submit, attachments upload
- [ ] **Realtime** : Nouveaux messages apparaissent auto (Supabase Channels subscription)
- [ ] **Unread badge** : Count messages non lus par thread
- [ ] **Mark read** : Thread automatiquement marqué lu lors ouverture
- [ ] **Attachments** : Click attachment → Download ou preview inline
- [ ] **Search** : Recherche dans messages (full-text)
- [ ] **Filtres** : Threads par intervention, par participant

**Sécurité**
- [ ] **RLS** : can_view_conversation(thread_id), can_send_message_in_thread(thread_id)

**UI/UX**
- [ ] **Layout 2 colonnes** : Sidebar threads (30%) + Main messages (70%)
- [ ] **Responsive** : Mobile → Liste threads, clic thread → Full screen messages avec back button
- [ ] **Scroll infini** : Messages chargement progressif (pagination)
- [ ] **Typing indicator** : "X est en train d'écrire..." (si realtime configuré)

**Critères d'Acceptation**
- **PASS** : Threads listés, messages affichés, envoi fonctionne, realtime OK
- **FAIL** : Si threads autres teams visibles, ou envoi échoue

---

### 2.3.10 - /gestionnaire/profile (Profil Gestionnaire)

**Métadonnées**
- **Objectif** : Gérer profil personnel gestionnaire
- **Rôles autorisés** : Gestionnaire uniquement
- **Préconditions** : User logged in, role=gestionnaire
- **Permissions RLS** : user_id = auth.uid()

**Tests Fonctionnels**
- [ ] **Section Informations personnelles** : Fields (first_name, last_name, phone, avatar), bouton "Enregistrer"
- [ ] **Avatar upload** : Zone drop/click, preview image, crop/resize avant upload, formats acceptés (jpg, png, max 2MB)
- [ ] **Avatar affiché** : Si avatar exists → Affiche image, sinon initiales dans cercle coloré
- [ ] **Validation fields** : First_name/last_name requis, phone format international (optionnel)
- [ ] **Submit SUCCESS** : Toast "Profil mis à jour", users table updated, avatar uploadé dans storage
- [ ] **Submit FAIL - Validation** : Inline errors champs invalides
- [ ] **Submit FAIL - Upload** : Toast "Erreur upload avatar - Format invalide ou fichier trop lourd"
- [ ] **Section Sécurité** : Liens "Changer email" (modal), "Changer mot de passe" (modal)
- [ ] **Modal Changer email** : Form (new_email, password actuel), confirmation email envoyé, validation avant changement
- [ ] **Modal Changer password** : Form (current_password, new_password, confirm_password), validations, submit → password changé
- [ ] **Section Équipe** : Affiche team actuelle (nom, logo, membres count), lien "Voir équipe"
- [ ] **Section Compte** : Date création compte, dernière connexion, bouton "Supprimer compte" (confirmatio multiple)

**Sécurité**
- [ ] **Update own profile only** : RLS vérifie user_id = auth.uid()
- [ ] **Password verification** : Changer email requiert current password
- [ ] **Email verification** : Nouvel email doit être confirmé avant activation
- [ ] **Avatar storage secured** : Bucket storage avec RLS (user_id path)

**Notifications & Activity Logs**
- [ ] **Activity Log** : action=profile_updated, fields_changed=[...], user_id
- [ ] **Notification email change** : Email envoyé à ancien + nouvel email
- [ ] **Notification password change** : Email confirmation changement password

**UI/UX**
- [ ] **Layout sections** : Sections visuellement séparées (cards/borders)
- [ ] **Unsaved changes warning** : Si form modifié + tentative navigation → Confirm dialog
- [ ] **Loading states** : Bouton "Enregistrement..." pendant save
- [ ] **Responsive** : Form adapté mobile (fields full-width)
- [ ] **Accessibilité** : Labels associés, focus management, ARIA labels

**Critères d'Acceptation**
- **PASS** : Modifications saved, avatar uploadé, modals email/password fonctionnels
- **FAIL** : Si update échoue, ou avatar pas uploadé, ou email/password modals cassés

---

### 2.3.11 - /gestionnaire/parametres (Paramètres Gestionnaire)

**Métadonnées**
- **Objectif** : Configuration préférences app
- **Rôles autorisés** : Gestionnaire uniquement
- **Préconditions** : User logged in, role=gestionnaire

**Tests Fonctionnels**
- [ ] **Section Notifications** : Toggle "Activer notifications push", toggle "Activer notifications email"
- [ ] **Push notifications** : Si toggle ON + permissions browser pas accordées → Prompt permission
- [ ] **Test notification** : Bouton "Envoyer notification test" → Notification test reçue (si permissions OK)
- [ ] **Section Préférences affichage** : Select "Langue" (fr/en), Toggle "Mode sombre" (si implémenté)
- [ ] **Section PWA** : Card "Installer l'application" avec instructions, bouton "Installer" (si pas déjà installé)
- [ ] **Installation PWA** : Clic "Installer" → Prompt navigateur installation PWA → App installée
- [ ] **PWA déjà installé** : Si installé → Message "Application déjà installée" + icon checkmark
- [ ] **Section Données** : Bouton "Vider cache", bouton "Exporter mes données" (GDPR)
- [ ] **Vider cache** : Clic → Confirmation → Cache invalidé → Toast "Cache vidé"
- [ ] **Exporter données** : Clic → Génère zip (profile, contacts, interventions) → Download auto
- [ ] **Auto-save** : Modifications toggles/selects saved automatiquement (sans bouton save)

**Sécurité**
- [ ] **Permissions browser** : Push notifications requiert permissions explicites
- [ ] **Export GDPR compliant** : Données exportées scope user uniquement (pas données team)

**Notifications & Activity Logs**
- [ ] **Activity Log** : action=settings_updated, changes=[...], user_id
- [ ] **Pas de notification** : Changement settings silencieux

**UI/UX**
- [ ] **Sections cards** : Cards séparées par fonctionnalité
- [ ] **Toggle states clear** : ON/OFF visuellement distinct (couleur, position)
- [ ] **Instructions PWA** : Texte clair expliquant bénéfices installation
- [ ] **Responsive** : Settings adapté mobile (toggles full-width)
- [ ] **Loading states** : Spinner sur actions async (export, test notif)

**Critères d'Acceptation**
- **PASS** : Toggles fonctionnent, PWA installable, export données OK, cache vidé
- **FAIL** : Si toggles pas saved, ou PWA pas installable, ou export échoue

---

### 2.3.12 - /gestionnaire/notifications (Centre Notifications Gestionnaire)

**Métadonnées**
- **Objectif** : Consulter toutes notifications utilisateur
- **Rôles autorisés** : Gestionnaire uniquement
- **Préconditions** : User logged in, role=gestionnaire
- **Permissions RLS** : notifications.user_id = auth.uid()

**Tests Fonctionnels**
- [ ] **Tabs** : "Non lues" (default), "Toutes", "Archivées"
- [ ] **Liste notifications** : Cards (icon type, titre, message, timestamp relative, badge unread si non lu)
- [ ] **Types notifications** : Intervention (nouvelle, approuvée, planifiée, terminée), Contact (invitation acceptée), Document (nouveau doc), Système (update app)
- [ ] **Icon type** : Icon adapté selon type (intervention=wrench, contact=user, doc=file, system=bell)
- [ ] **Badge unread** : Dot bleu si notification.read_at = null
- [ ] **Mark read** : Clic notification → Mark read auto, badge disparaît, compteur header mis à jour
- [ ] **Mark all read** : Bouton "Tout marquer lu" → Toutes notifications tab courant marquées lues
- [ ] **Actions inline** : Selon type, bouton CTA (ex: "Voir intervention", "Consulter document")
- [ ] **Archiver** : Swipe left (mobile) ou bouton (desktop) → Notification archivée → Disparaît de "Toutes", visible dans "Archivées"
- [ ] **Supprimer** : Bouton delete → Confirmation → Notification soft deleted
- [ ] **Filtres** : Par type (multi-select), par date range
- [ ] **Pagination** : 20 notifications/page, infinite scroll
- [ ] **Empty state** : "Aucune notification" avec icon et message encourageant
- [ ] **Realtime** : Nouvelle notification apparaît auto top liste + toast + badge header mis à jour

**Sécurité**
- [ ] **Isolation user** : RLS user_id = auth.uid(), pas de notifications autres users

**Notifications & Activity Logs**
- [ ] **Pas de notification** : Consultation silencieuse
- [ ] **Activity Log** : action=notifications_viewed (optionnel)

**UI/UX**
- [ ] **Compteur header** : Badge count notifications non lues dans header bell icon
- [ ] **Highlight unread** : Background différent notifications non lues (bg-blue-50)
- [ ] **Groupement par date** : "Aujourd'hui", "Hier", "Cette semaine", "Plus ancien"
- [ ] **Timestamp relatif** : "Il y a 5 min", "Il y a 2h", "Hier à 14h30"
- [ ] **Responsive** : Cards empilées mobile, layout compact desktop
- [ ] **Animations** : Smooth transitions mark read, nouvelle notif slide-in

**Critères d'Acceptation**
- **PASS** : Notifications affichées scope user, mark read fonctionne, realtime OK, filtres opérationnels
- **FAIL** : Si notifications autres users visibles, ou mark read échoue, ou realtime cassé

---

### 2.3.13 - /gestionnaire/biens/lots/nouveau (Wizard Création Lot)

**Métadonnées**
- **Objectif** : Création lot via wizard 4 étapes
- **Rôles autorisés** : Gestionnaire uniquement
- **Préconditions** : User role=gestionnaire, team_id exists
- **Permissions RLS** : lots.team_id = user.team_id

**Tests Fonctionnels - STEP 1: Association**
- [ ] **Titre étape** : "Associer le lot" avec step indicator (1/4)
- [ ] **3 Options radio** : "Lier à immeuble existant", "Créer nouvel immeuble", "Lot indépendant (maison)"
- [ ] **Option 1 - Lier existant** : Affiche dropdown immeubles team, recherche immeuble, sélection immeuble
- [ ] **Option 2 - Créer nouveau** : Clic → Redirect /gestionnaire/biens/immeubles/nouveau avec flag returnToLotCreation
- [ ] **Option 3 - Indépendant** : Sélection active champs adresse complète (step 2)
- [ ] **Validation step** : Au moins 1 option sélectionnée requis pour "Suivant"
- [ ] **Bouton "Suivant"** : Enabled si validation OK, clic → Step 2

**Tests Fonctionnels - STEP 2: Détails Lot(s)**
- [ ] **Titre étape** : "Détails du/des lot(s)" (2/4)
- [ ] **Mode multi-lots** : Si lié à immeuble → Permet ajouter plusieurs lots simultanément
- [ ] **Mode single-lot** : Si indépendant → 1 seul lot
- [ ] **Fields par lot** : Référence (auto ou manual), Catégorie (select), Étage, Numéro porte, Description (textarea)
- [ ] **Catégorie options** : appartement, collocation, maison, garage, local_commercial, parking, autre
- [ ] **Référence auto** : Si vide, généré auto format "LOT-{building_id}-{increment}" ou "LOT-IND-{UUID}"
- [ ] **Adresse (si indépendant)** : Fields Rue, Code postal, Ville, Pays
- [ ] **Bouton "Ajouter lot"** : (Si multi-lots) Ajoute card lot vide, max 20 lots
- [ ] **Bouton "Dupliquer"** : Copie lot avec incrémentation auto (ex: Étage 1 → Étage 2)
- [ ] **Bouton "Retirer"** : Supprime lot card (si > 1 lot)
- [ ] **Expand/Collapse** : Cards lots collapsibles, expand pour éditer détails
- [ ] **Validation step** : Au moins 1 lot avec référence + catégorie requis
- [ ] **Bouton "Précédent"** : Retour step 1 (data preserved)
- [ ] **Bouton "Suivant"** : Validation OK → Step 3

**Tests Fonctionnels - STEP 3: Contacts & Managers**
- [ ] **Titre étape** : "Contacts et gestionnaires" (3/4)
- [ ] **Section Gestionnaires** : Multi-select gestionnaires team, au moins 1 requis
- [ ] **Section Contacts** : Liste types (locataire, propriétaire, autre)
- [ ] **Assigner contacts par lot** : Si multi-lots → Tabs per lot, assigner contacts spécifiques
- [ ] **Assigner contacts global** : Si single-lot → Form unique
- [ ] **Recherche contact** : Autocomplete contacts team existants
- [ ] **Bouton "Créer contact"** : Ouvre modal création contact inline, contact créé ajouté auto
- [ ] **Contact principal** : Checkbox "Contact principal" pour locataire (is_primary=true)
- [ ] **Validation step** : Au moins 1 gestionnaire assigné requis
- [ ] **Bouton "Précédent"** : Retour step 2
- [ ] **Bouton "Suivant"** : Validation OK → Step 4

**Tests Fonctionnels - STEP 4: Confirmation**
- [ ] **Titre étape** : "Confirmation" (4/4)
- [ ] **Récapitulatif** : Affiche tous lots avec infos (référence, catégorie, adresse, contacts, managers)
- [ ] **Cards lots** : 1 card per lot, expand pour voir détails complets
- [ ] **Compteurs** : "X lot(s) à créer", "Y contact(s) assignés", "Z gestionnaire(s)"
- [ ] **Bouton "Modifier"** : Sur chaque section → Retour step correspondant (1, 2 ou 3)
- [ ] **Bouton "Précédent"** : Retour step 3
- [ ] **Bouton "Créer le(s) lot(s)"** : Submit final
- [ ] **Submit SUCCESS** : Lots créés DB, lot_contacts créés, managers assignés, toast "X lot(s) créé(s)", redirect /gestionnaire/biens/lots/[first_lot_id]
- [ ] **Submit FAIL - Duplicate référence** : Toast "Référence déjà existante: {ref}", retour step 2
- [ ] **Submit FAIL - Erreur serveur** : Toast "Erreur création lots", wizard reste step 4

**Sécurité**
- [ ] **Team isolation** : lots.team_id = user.team_id automatique
- [ ] **Permissions** : RLS vérifie is_team_manager(team_id) pour création

**Notifications & Activity Logs**
- [ ] **Notification team** : "X lot(s) créé(s) par {user}" (si multi-lots > 3)
- [ ] **Activity Log** : action=create, entity_type=lot, metadata={ count, building_id, refs }

**UI/UX**
- [ ] **Step indicator** : Progress bar + badges steps (1, 2, 3, 4), step actuel highlighted
- [ ] **Breadcrumb** : Gestionnaire > Biens > Créer lot(s)
- [ ] **Navigation buttons** : "Précédent" left, "Suivant"/"Créer" right
- [ ] **Data persistence** : Navigation précédent/suivant preserve data (state/localStorage)
- [ ] **Exit warning** : Tentative close/navigate → Confirm "Modifications non enregistrées"
- [ ] **Responsive** : Wizard adapté mobile (full-width, buttons stacked)
- [ ] **Loading states** : Bouton "Création en cours..." pendant submit

**Critères d'Acceptation**
- **PASS** : Wizard complet (4 steps) → Submit → Lot(s) créé(s) + associations + redirect correct
- **FAIL** : Si lot pas créé, ou associations manquantes, ou redirect incorrect

---

### 2.3.14 - /gestionnaire/biens/immeubles/modifier/[id] (Wizard Édition Immeuble)

**Métadonnées**
- **Objectif** : Édition immeuble via wizard 4 étapes (identique création)
- **Rôles autorisés** : Gestionnaire uniquement
- **Préconditions** : Building.id exists, user can_manage_building(id)
- **Permissions RLS** : buildings.team_id = user.team_id, is_team_manager()

**Tests Fonctionnels - PRÉ-CHARGEMENT**
- [ ] **Loading initial** : Spinner pendant fetch building + lots + contacts + managers
- [ ] **Data pré-remplie** : Tous fields wizard pré-remplis avec data existante
- [ ] **Error 404** : Si building.id inexistant → Redirect /gestionnaire/biens + toast "Immeuble introuvable"
- [ ] **Error 403** : Si user pas manager building → Redirect /gestionnaire/biens + toast "Accès refusé"

**Tests Fonctionnels - STEP 1: Infos Immeuble**
- [ ] **Fields pré-remplis** : Nom, Adresse, Description, Managers
- [ ] **Modification fields** : Tous fields éditables (sauf team_id)
- [ ] **Validation** : Identique création (nom requis, adresse complète)
- [ ] **Bouton "Suivant"** : Validation OK → Step 2

**Tests Fonctionnels - STEP 2: Lots**
- [ ] **Liste lots existants** : Cards lots rattachés building pré-affichées
- [ ] **Éditer lot existant** : Clic card → Expand → Modifier référence/catégorie/étage/description
- [ ] **Supprimer lot** : Bouton "Retirer" → Confirmation → Lot marqué pour suppression (soft delete)
- [ ] **Ajouter nouveau lot** : Bouton "Ajouter lot" → Card lot vide
- [ ] **Lots supprimés** : Badge "À supprimer" rouge, undo possible (retirer badge)
- [ ] **Validation** : Au moins 1 lot (existant ou nouveau) requis
- [ ] **Bouton "Précédent"** : Retour step 1
- [ ] **Bouton "Suivant"** : Validation OK → Step 3

**Tests Fonctionnels - STEP 3: Contacts**
- [ ] **Contacts existants** : Affichés par lot, éditables
- [ ] **Retirer contact** : Bouton X → Contact déassigné (relation supprimée)
- [ ] **Ajouter contact** : Autocomplete + "Créer nouveau"
- [ ] **Modification managers** : Multi-select managers, ajout/retrait
- [ ] **Validation** : Au moins 1 manager requis
- [ ] **Bouton "Précédent"** : Retour step 2
- [ ] **Bouton "Suivant"** : Validation OK → Step 4

**Tests Fonctionnels - STEP 4: Confirmation**
- [ ] **Récapitulatif modifications** : Highlight champs modifiés (badge "Modifié" orange)
- [ ] **Lots ajoutés** : Badge "Nouveau" vert
- [ ] **Lots supprimés** : Badge "À supprimer" rouge
- [ ] **Contacts modifiés** : Badge "Modifié" si changements
- [ ] **Bouton "Enregistrer modifications"** : Submit
- [ ] **Submit SUCCESS** : Building updated, lots created/updated/deleted, contacts updated, toast "Immeuble modifié", redirect /gestionnaire/biens/immeubles/[id]
- [ ] **Submit FAIL** : Toast error, reste step 4

**Sécurité**
- [ ] **RLS updates** : Vérifie can_manage_building(id)
- [ ] **Soft delete lots** : Lots deleted_at updated (pas hard delete)

**Notifications & Activity Logs**
- [ ] **Notification team** : "Immeuble {name} modifié par {user}"
- [ ] **Activity Log** : action=update, entity_type=building, metadata={ fields_changed, lots_added, lots_removed }

**UI/UX**
- [ ] **Breadcrumb** : Gestionnaire > Biens > {building_name} > Modifier
- [ ] **Badges changements** : Visuels clair modifications (highlight jaune)
- [ ] **Undo** : Bouton undo per field (retour valeur originale)
- [ ] **Exit warning** : Confirm si modifications non saved

**Critères d'Acceptation**
- **PASS** : Wizard pré-rempli → Modifications → Submit → Updates DB + redirect
- **FAIL** : Si updates pas appliqués, ou data pré-remplie incorrecte

---

### 2.3.15 - /gestionnaire/biens/lots/modifier/[id] (Édition Lot)

**Métadonnées**
- **Objectif** : Édition lot (form simple ou wizard selon contexte)
- **Rôles autorisés** : Gestionnaire uniquement
- **Préconditions** : Lot.id exists, user can_manage_lot(id)
- **Permissions RLS** : lots.team_id = user.team_id, is_team_manager()

**Tests Fonctionnels - FORM PRINCIPAL**
- [ ] **Loading initial** : Fetch lot + building + contacts + managers
- [ ] **Section Informations** : Fields pré-remplis (référence, catégorie, étage, porte, description)
- [ ] **Section Association** : Affiche immeuble lié (si rattaché), option "Détacher de l'immeuble"
- [ ] **Détacher immeuble** : Checkbox → Confirmation → lot.building_id = null, adresse devient éditable
- [ ] **Rattacher à immeuble** : Si détaché, dropdown "Lier à immeuble" → Sélection immeuble
- [ ] **Section Adresse** : Si indépendant → Fields adresse éditables, si rattaché → Lecture seule (héritée immeuble)
- [ ] **Section Managers** : Multi-select managers team, modification assignments
- [ ] **Section Contacts** : Liste contacts assignés (cards), actions Ajouter/Retirer
- [ ] **Ajouter contact** : Autocomplete + "Créer nouveau" → Modal création inline
- [ ] **Contact principal** : Radio button sélection locataire principal (is_primary=true)
- [ ] **Retirer contact** : Bouton X → Confirmation → lot_contacts deleted
- [ ] **Validation** : Référence unique, catégorie required, au moins 1 manager
- [ ] **Bouton "Enregistrer"** : Submit modifications
- [ ] **Submit SUCCESS** : Lot updated, toast "Lot modifié", redirect /gestionnaire/biens/lots/[id]
- [ ] **Submit FAIL - Référence duplicate** : Inline error "Référence déjà utilisée"
- [ ] **Submit FAIL - Erreur serveur** : Toast "Erreur modification lot"
- [ ] **Bouton "Annuler"** : Confirm si modifications → Redirect /gestionnaire/biens/lots/[id]

**Sécurité**
- [ ] **RLS updates** : Vérifie can_manage_lot(id)
- [ ] **Team isolation** : Impossible modifier team_id

**Notifications & Activity Logs**
- [ ] **Notification team** : "Lot {ref} modifié par {user}" (si changements majeurs)
- [ ] **Activity Log** : action=update, entity_type=lot, metadata={ fields_changed }

**UI/UX**
- [ ] **Sections collapsibles** : Cards sections expand/collapse
- [ ] **Unsaved changes warning** : Prompt confirmation si tentative navigation
- [ ] **Loading states** : Bouton "Enregistrement..." pendant save
- [ ] **Breadcrumb** : Gestionnaire > Biens > {lot_ref} > Modifier
- [ ] **Responsive** : Form adapté mobile

**Critères d'Acceptation**
- **PASS** : Form pré-rempli → Modifications → Submit → Lot updated + redirect
- **FAIL** : Si lot pas updated, ou associations pas modifiées

---

### 2.3.16 - /gestionnaire/interventions/nouvelle-intervention (Création Intervention Manager)

**Métadonnées**
- **Objectif** : Création intervention par gestionnaire
- **Rôles autorisés** : Gestionnaire uniquement
- **Préconditions** : User role=gestionnaire, team_id, au moins 1 lot dans team
- **Permissions RLS** : interventions.team_id = user.team_id

**Tests Fonctionnels - SECTION 1: Sélection Bien**
- [ ] **Titre section** : "Sélection du bien concerné"
- [ ] **2 Options** : "Immeuble" (radio), "Lot indépendant" (radio)
- [ ] **Option Immeuble** : Dropdown immeubles team → Sélection immeuble → Dropdown lots immeuble → Sélection lot
- [ ] **Option Lot indépendant** : Dropdown lots team (filter building_id=null) → Sélection lot
- [ ] **Lot sélectionné** : Affiche card lot (référence, adresse, locataire principal)
- [ ] **Locataire auto-load** : Si lot a locataire principal → Auto-assigné intervention
- [ ] **Validation section** : Lot sélectionné requis pour continuer

**Tests Fonctionnels - SECTION 2: Détails Intervention**
- [ ] **Field Titre** : Input text, requis, placeholder "Ex: Fuite robinet cuisine"
- [ ] **Field Description** : Textarea, requis, placeholder détaillé
- [ ] **Field Catégorie** : Select (plomberie, électricité, chauffage, serrurerie, peinture, autre)
- [ ] **Field Urgence** : Select (basse, normale, haute, urgente)
- [ ] **Upload photos** : Zone drag-drop, max 5 photos, preview thumbnails, delete per photo
- [ ] **Validation section** : Titre + description requis, catégorie + urgence requis

**Tests Fonctionnels - SECTION 3: Contacts & Prestataires**
- [ ] **Locataire** : Pré-affiché (auto-load section 1), option "Changer locataire" (si plusieurs locataires lot)
- [ ] **Gestionnaire responsable** : Select gestionnaires team, défaut = current user
- [ ] **Prestataires** : Multi-select prestataires team (optionnel)
- [ ] **Checkbox "Envoyer demande devis immédiatement"** : Si coché + prestataires sélectionnés → status=demande_de_devis, sinon status=demande
- [ ] **Sélection multi-prestataires** : Permet sélectionner plusieurs prestataires pour comparaison devis
- [ ] **Créer prestataire** : Lien "Ajouter prestataire" → Modal création contact inline

**Tests Fonctionnels - SECTION 4: Options Planification**
- [ ] **Checkbox "Intervention urgente"** : Si coché → urgence=urgente, priorité haute
- [ ] **Checkbox "Planifier immédiatement"** : Si coché → Affiche fields date/heure souhaitées
- [ ] **Fields date/heure** : Si planning immédiat → Datepicker + timepicker
- [ ] **Disponibilités locataire** : Textarea "Disponibilités du locataire" (optionnel)

**Tests Fonctionnels - SUBMIT**
- [ ] **Bouton "Créer intervention"** : Enabled si validations OK
- [ ] **Submit SUCCESS - Sans devis** : Intervention created status=demande, toast "Intervention créée", redirect /gestionnaire/interventions/[id]
- [ ] **Submit SUCCESS - Avec devis** : Intervention created status=demande_de_devis, quote_requests created per prestataire, notifications envoyées prestataires
- [ ] **Submit FAIL - Validation** : Inline errors champs manquants
- [ ] **Submit FAIL - Upload photos** : Toast "Erreur upload photos"
- [ ] **Submit FAIL - Erreur serveur** : Toast "Erreur création intervention"
- [ ] **Bouton "Annuler"** : Confirm si form modifié → Redirect /gestionnaire/interventions

**Sécurité**
- [ ] **Team isolation** : intervention.team_id = user.team_id automatique
- [ ] **RLS** : Vérifie is_team_manager(team_id)

**Notifications & Activity Logs**
- [ ] **Notification locataire** : "Intervention créée pour votre logement - {titre}"
- [ ] **Notification prestataires** : Si devis demandés → "Nouvelle demande de devis - {titre}"
- [ ] **Notification team** : "Nouvelle intervention créée par {user}"
- [ ] **Activity Log** : action=create, entity_type=intervention, metadata={ urgence, prestataires_count }

**UI/UX**
- [ ] **Sections progressives** : Sections numérotées (1, 2, 3, 4)
- [ ] **Validation inline** : Errors affichés temps réel
- [ ] **Preview lot** : Card lot selected toujours visible (sticky sidebar desktop)
- [ ] **Breadcrumb** : Gestionnaire > Interventions > Nouvelle
- [ ] **Loading states** : Bouton "Création..." pendant submit
- [ ] **Responsive** : Form adapté mobile (sections empilées)

**Critères d'Acceptation**
- **PASS** : Form complet → Submit → Intervention created + statut correct + notifications envoyées + redirect
- **FAIL** : Si intervention pas créée, ou statut incorrect, ou notifications pas envoyées

---

### 2.3.17 - /gestionnaire/contacts/details/[id] (Détail Contact)

**Métadonnées**
- **Objectif** : Fiche complète contact
- **Rôles autorisés** : Gestionnaire uniquement
- **Préconditions** : Contact (user) exists, user.team_id = manager.team_id
- **Permissions RLS** : users.team_id = auth.uid().team_id

**Tests Fonctionnels - HEADER**
- [ ] **Avatar** : Grande photo profil (ou initiales)
- [ ] **Nom complet** : First + last name
- [ ] **Badge rôle** : Couleur selon rôle (gestionnaire=blue, prestataire=orange, locataire=green, proprietaire=purple)
- [ ] **Badge statut compte** : "Actif" (compte créé), "Invitation envoyée" (pending), "Non invité"
- [ ] **Actions header** : [Modifier] [Inviter/Réinviter] [Supprimer]

**Tests Fonctionnels - TABS**
- [ ] **Tab Informations** : Sections Coordonnées + Profil + Compte
- [ ] **Section Coordonnées** : Email, Phone, Adresse postale (optionnel)
- [ ] **Section Profil** : Rôle, Entreprise (si prestataire), Spécialité (si prestataire), Notes (textarea)
- [ ] **Section Compte** : Statut compte, Date création, Date dernière connexion, Date invitation (si pending)
- [ ] **Tab Biens associés** : Liste lots/immeubles où contact assigné (référence, adresse, rôle sur bien)
- [ ] **Tab Interventions** : Liste interventions contact impliqué (référence, titre, statut, date, rôle)
- [ ] **Filtres interventions** : Par statut, date range, rôle dans intervention
- [ ] **Tab Activité** : Timeline activity logs contact (création, modifications, interventions, invitations)

**Tests Fonctionnels - ACTIONS**
- [ ] **Modifier** : Redirect /gestionnaire/contacts/modifier/[id]
- [ ] **Inviter** : Si statut="Non invité" → Modal confirmation → POST /api/send-existing-contact-invitation → Toast "Invitation envoyée"
- [ ] **Réinviter** : Si statut="Invitation expirée" → Modal confirmation → POST /api/resend-invitation → Toast "Invitation renvoyée"
- [ ] **Supprimer** : Modal confirmation double ("Êtes-vous sûr?", "Vraiment sûr?") → Soft delete users.is_active=false → Toast "Contact désactivé" → Redirect /gestionnaire/contacts

**Sécurité**
- [ ] **Team isolation** : RLS vérifie users.team_id = auth.uid().team_id
- [ ] **Actions protégées** : Inviter/Supprimer vérifie is_team_manager

**Notifications & Activity Logs**
- [ ] **Pas de notification** : Consultation silencieuse
- [ ] **Notification invitation** : Si invité → Email envoyé contact
- [ ] **Activity Log view** : action=view, entity_type=user, entity_id (optionnel)

**UI/UX**
- [ ] **Layout** : Header sticky top, tabs horizontal desktop (vertical mobile)
- [ ] **Empty states** : Si aucun bien/intervention → Message + illustration
- [ ] **Breadcrumb** : Gestionnaire > Contacts > {first_name} {last_name}
- [ ] **Loading states** : Skeleton per tab
- [ ] **Responsive** : Tabs dropdown mobile, cards empilées

**Critères d'Acceptation**
- **PASS** : Détail complet affiché, tabs chargent data, actions fonctionnelles, RLS respecté
- **FAIL** : Si data incorrecte, ou actions échouent, ou contacts autres teams visibles

---

### 2.3.18 - /gestionnaire/contacts/modifier/[id] (Édition Contact)

**Métadonnées**
- **Objectif** : Modification informations contact
- **Rôles autorisés** : Gestionnaire uniquement
- **Préconditions** : Contact exists, user.team_id = manager.team_id
- **Permissions RLS** : users.team_id = auth.uid().team_id, is_team_manager()

**Tests Fonctionnels - FORM**
- [ ] **Loading initial** : Fetch contact data, fields pré-remplis
- [ ] **Section Identité** : Fields first_name, last_name, avatar upload
- [ ] **Avatar upload** : Zone drop/click, preview, crop, delete, formats (jpg/png max 2MB)
- [ ] **Section Coordonnées** : Fields email (disabled), phone, adresse (rue, CP, ville, pays)
- [ ] **Email disabled** : Email non modifiable (note: "Contactez support pour changer email")
- [ ] **Section Rôle & Profil** : Select rôle (gestionnaire/prestataire/locataire/proprietaire), entreprise (si prestataire), spécialité (si prestataire)
- [ ] **Section Notes** : Textarea notes (visible uniquement gestionnaires team)
- [ ] **Validation fields** : First/last name requis, phone format international, email format
- [ ] **Bouton "Enregistrer"** : Submit modifications
- [ ] **Submit SUCCESS** : Users updated, toast "Contact modifié", redirect /gestionnaire/contacts/details/[id]
- [ ] **Submit FAIL - Validation** : Inline errors
- [ ] **Submit FAIL - Upload avatar** : Toast "Erreur upload avatar"
- [ ] **Submit FAIL - Erreur serveur** : Toast "Erreur modification contact"
- [ ] **Bouton "Annuler"** : Confirm si modifié → Redirect /gestionnaire/contacts/details/[id]

**Sécurité**
- [ ] **RLS updates** : Vérifie users.team_id = auth.uid().team_id + is_team_manager
- [ ] **Email immutable** : Backend rejette tentatives changement email
- [ ] **Rôle change restrictions** : Impossible downgrade propre rôle (manager ne peut pas se retirer manager role)

**Notifications & Activity Logs**
- [ ] **Notification contact** : Si changements majeurs → "Votre profil a été mis à jour par {manager}"
- [ ] **Activity Log** : action=update, entity_type=user, metadata={ fields_changed }

**UI/UX**
- [ ] **Sections cards** : Cards par section, expand/collapse
- [ ] **Conditional fields** : Entreprise/Spécialité visible uniquement si rôle=prestataire
- [ ] **Unsaved warning** : Prompt confirmation si tentative navigation + modifications
- [ ] **Loading states** : Bouton "Enregistrement..." pendant save
- [ ] **Breadcrumb** : Gestionnaire > Contacts > {name} > Modifier
- [ ] **Responsive** : Form adapté mobile

**Critères d'Acceptation**
- **PASS** : Form pré-rempli → Modifications → Submit → Contact updated + redirect
- **FAIL** : Si contact pas updated, ou data pré-remplie incorrecte, ou email modifié (devrait être rejeté)

---

## 2.4 PRESTATAIRE (Sélection Écrans)

### 2.4.1 - /prestataire/dashboard (Dashboard Prestataire)

**Métadonnées**
- **Objectif** : Vue interventions assignées groupées par statut
- **Rôles autorisés** : Prestataire uniquement
- **Préconditions** : User role=prestataire, interventions assignées
- **Permissions RLS** : is_prestataire_of_intervention(id)

**Tests Fonctionnels**
- [ ] **Sections statuts** : "À planifier" (status=planification), "En cours" (status=en_cours), "Terminées" (status terminal)
- [ ] **Cards interventions** : Par section, affiche référence, titre, type, urgence, adresse, date
- [ ] **Badge "Action requise"** : Affiché si action pending (ex: "Devis à soumettre", "Disponibilités à indiquer", "Marquer terminé")
- [ ] **Compteurs** : Total interventions assignées, actives, terminées ce mois
- [ ] **Quick actions** : Boutons context selon statut (Soumettre devis, Indiquer dispos, Démarrer, Terminer)
- [ ] **Empty state** : "Aucune intervention assignée - Contactez gestionnaire"
- [ ] **Clic intervention** : Redirect /prestataire/interventions/[id]

**Sécurité**
- [ ] **Isolation** : Uniquement interventions où user assigné (RLS)

**UI/UX**
- [ ] **Groupement clair** : Sections visuellement séparées (cards grouped)
- [ ] **Loading states** : Skeleton cards
- [ ] **Responsive** : Cards empilées mobile, grid tablet/desktop

**Critères d'Acceptation**
- **PASS** : Interventions assignées affichées groupées, badges actions corrects
- **FAIL** : Si interventions non-assignées visibles

---

### 2.4.2 - /prestataire/interventions/[id] (Détail Intervention Prestataire)

**Référence détaillée** : Voir F5.4, F5.6, F5.7, F5.8

**Checklist Rapide**
- [ ] **Header** : Référence, Badge statut, Type, Urgence
- [ ] **Tabs** : Résumé, Devis, Planning, Fichiers, Chat
- [ ] **Tab Résumé** : Infos intervention, Adresse (lien Google Maps), Contact locataire (clic to call)
- [ ] **Tab Devis** : Formulaire soumission devis (si status=demande_de_devis), Mon devis soumis (status, actions Modifier/Retirer)
- [ ] **Tab Planning** : Mes disponibilités (si mode flexible), Créneaux proposés/votés, Date finale si planifiée
- [ ] **Tab Fichiers** : Photos problème (avant travaux), Mes docs uploadés, Upload zone
- [ ] **Tab Chat** : Threads group + provider_to_managers, Messages, Envoi messages
- [ ] **Actions header** : Contextuelles (Soumettre devis, Indiquer dispos, Démarrer travaux, Marquer terminé)
- [ ] **Workflow prestataire** : Devis → Dispos → Démarrage → Rapport fin travaux

**Sécurité**
- [ ] **RLS** : is_prestataire_of_intervention(id)
- [ ] **Actions limitées** : Prestataire ne peut pas approuver/rejeter/clôturer (gestionnaire only)

**UI/UX**
- [ ] **Badge "Action requise"** : Prominent si action pending
- [ ] **Responsive** : Tabs adaptés mobile

**Critères d'Acceptation**
- **PASS** : Détail affiché, actions prestataire fonctionnelles, workflow respecté
- **FAIL** : Si prestataire accède intervention non-assignée, ou actions gestionnaire visibles

---

### 2.4.3 - /prestataire/profile (Profil Prestataire)

**Métadonnées**
- **Objectif** : Gérer profil personnel prestataire
- **Rôles autorisés** : Prestataire uniquement
- **Préconditions** : User logged in, role=prestataire
- **Permissions RLS** : user_id = auth.uid()

**Tests Fonctionnels**
- [ ] **Section Informations personnelles** : Fields (first_name, last_name, phone, avatar), bouton "Enregistrer"
- [ ] **Avatar upload** : Zone drop/click, preview, crop/resize, formats (jpg/png max 2MB)
- [ ] **Section Professionnel** : Fields entreprise (company name), spécialité (specialty), SIRET (optionnel), adresse entreprise
- [ ] **Section Coordonnées** : Phone professionnel, email pro (optionnel en plus de email compte)
- [ ] **Validation fields** : First/last name requis, phone format international, entreprise requise si prestataire
- [ ] **Submit SUCCESS** : Toast "Profil mis à jour", users table updated, avatar uploadé
- [ ] **Submit FAIL - Validation** : Inline errors
- [ ] **Submit FAIL - Upload** : Toast "Erreur upload avatar"
- [ ] **Section Sécurité** : Liens "Changer email" (modal), "Changer mot de passe" (modal)
- [ ] **Modal Changer email** : Form (new_email, password actuel), confirmation email
- [ ] **Modal Changer password** : Form (current_password, new_password, confirm_password)
- [ ] **Section Activité** : Statistiques (interventions total, en cours, terminées, note moyenne)
- [ ] **Section Compte** : Date création, dernière connexion

**Sécurité**
- [ ] **Update own profile only** : RLS user_id = auth.uid()
- [ ] **Password verification** : Email change requiert password
- [ ] **Email verification** : Nouvel email doit être confirmé

**Notifications & Activity Logs**
- [ ] **Activity Log** : action=profile_updated, fields_changed=[...]
- [ ] **Notification email change** : Emails envoyés ancien + nouvel email
- [ ] **Notification password change** : Email confirmation

**UI/UX**
- [ ] **Layout sections** : Sections cards séparées
- [ ] **Unsaved warning** : Confirm dialog si modifications non saved
- [ ] **Loading states** : Bouton "Enregistrement..." pendant save
- [ ] **Responsive** : Form adapté mobile
- [ ] **Statistics cards** : Compteurs interventions avec icons

**Critères d'Acceptation**
- **PASS** : Modifications saved, avatar uploadé, modals fonctionnels, stats affichées
- **FAIL** : Si update échoue, ou avatar pas uploadé

---

### 2.4.4 - /prestataire/parametres (Paramètres Prestataire)

**Métadonnées**
- **Objectif** : Configuration préférences app prestataire
- **Rôles autorisés** : Prestataire uniquement
- **Préconditions** : User logged in, role=prestataire

**Tests Fonctionnels**
- [ ] **Section Notifications** : Toggle "Notifications push", toggle "Notifications email", toggle "Notifications SMS" (si feature activée)
- [ ] **Préférences notifications** : Checkboxes types (Nouvelle demande devis, Planning confirmé, Validation travaux, Messages)
- [ ] **Push notifications** : Si toggle ON + permissions browser pas accordées → Prompt
- [ ] **Test notification** : Bouton "Envoyer test" → Notification test reçue
- [ ] **Section Disponibilités** : Toggle "Disponible pour nouvelles interventions", textarea "Horaires disponibilité" (ex: "Lun-Ven 8h-18h")
- [ ] **Rayon intervention** : Select "Distance max" (10km, 20km, 50km, 100km, Aucune limite)
- [ ] **Section PWA** : Card "Installer l'application", bouton "Installer"
- [ ] **Installation PWA** : Clic → Prompt navigateur → App installée
- [ ] **PWA déjà installé** : Message "Application déjà installée"
- [ ] **Section Données** : Bouton "Vider cache", bouton "Exporter mes données"
- [ ] **Vider cache** : Confirmation → Cache invalidé → Toast "Cache vidé"
- [ ] **Exporter données** : Génère zip (profile, interventions, devis) → Download
- [ ] **Auto-save** : Toggles/selects saved automatiquement

**Sécurité**
- [ ] **Permissions browser** : Push requiert permissions explicites
- [ ] **Export GDPR** : Données scope user uniquement

**Notifications & Activity Logs**
- [ ] **Activity Log** : action=settings_updated, changes=[...]
- [ ] **Pas de notification** : Changement silencieux

**UI/UX**
- [ ] **Sections cards** : Cards par fonctionnalité
- [ ] **Toggle states** : ON/OFF visuellement distinct
- [ ] **Disponibilité badge** : Badge "Disponible" ou "Indisponible" dans header (sync avec toggle)
- [ ] **Responsive** : Settings adapté mobile
- [ ] **Loading states** : Spinner actions async

**Critères d'Acceptation**
- **PASS** : Toggles fonctionnent, disponibilité updated, PWA installable, export OK
- **FAIL** : Si toggles pas saved, ou disponibilité pas mise à jour

---

### 2.4.5 - /prestataire/notifications (Centre Notifications Prestataire)

**Métadonnées**
- **Objectif** : Consulter toutes notifications prestataire
- **Rôles autorisés** : Prestataire uniquement
- **Préconditions** : User logged in, role=prestataire
- **Permissions RLS** : notifications.user_id = auth.uid()

**Tests Fonctionnels**
- [ ] **Tabs** : "Non lues" (default), "Toutes", "Archivées"
- [ ] **Liste notifications** : Cards (icon, titre, message, timestamp, badge unread)
- [ ] **Types notifications prestataire** : Demande devis (nouvelle, rappel), Planning (créneaux proposés, confirmé), Intervention (démarrée, terminée validée), Message (nouveau message), Système
- [ ] **Icon type** : quote=euro, planning=calendar, intervention=wrench, message=chat, system=bell
- [ ] **Badge unread** : Dot bleu si read_at = null
- [ ] **Badge urgence** : Badge "Urgent" rouge si intervention urgence=urgente
- [ ] **Mark read** : Clic notification → Mark read auto, badge disparaît
- [ ] **Mark all read** : Bouton "Tout marquer lu" → Toutes notifs tab marquées lues
- [ ] **Actions inline** : CTA selon type (ex: "Voir demande", "Soumettre devis", "Voir planning")
- [ ] **Archiver** : Swipe left (mobile) ou bouton → Notification archivée
- [ ] **Supprimer** : Bouton delete → Confirmation → Soft deleted
- [ ] **Filtres** : Par type (multi-select), par urgence, par date range
- [ ] **Pagination** : 20 notifications/page, infinite scroll
- [ ] **Empty state** : "Aucune notification"
- [ ] **Realtime** : Nouvelle notification apparaît auto + toast + badge header mis à jour
- [ ] **Sound notification** : Si demande devis urgente → Son notification (si préférence activée)

**Sécurité**
- [ ] **Isolation user** : RLS user_id = auth.uid()

**Notifications & Activity Logs**
- [ ] **Pas de notification** : Consultation silencieuse
- [ ] **Activity Log** : action=notifications_viewed (optionnel)

**UI/UX**
- [ ] **Compteur header** : Badge count non lues dans bell icon
- [ ] **Highlight unread** : Background bleu clair notifications non lues
- [ ] **Highlight urgent** : Border rouge notifications intervention urgente
- [ ] **Groupement date** : "Aujourd'hui", "Hier", "Cette semaine", "Plus ancien"
- [ ] **Timestamp relatif** : "Il y a 5 min", "Il y a 2h"
- [ ] **Priority sorting** : Urgentes en haut, puis non lues, puis lues
- [ ] **Responsive** : Cards empilées mobile
- [ ] **Animations** : Smooth mark read, nouvelle notif slide-in

**Critères d'Acceptation**
- **PASS** : Notifications scope prestataire affichées, mark read OK, realtime OK, filtres fonctionnels
- **FAIL** : Si notifications autres users visibles, ou mark read échoue

---

## 2.5 LOCATAIRE (Sélection Écrans)

### 2.5.1 - /locataire/dashboard (Dashboard Locataire)

**Métadonnées**
- **Objectif** : Vue interventions locataire + actions pending
- **Rôles autorisés** : Locataire uniquement
- **Préconditions** : User role=locataire, lot assigné
- **Permissions RLS** : is_tenant_of_intervention(id)

**Tests Fonctionnels**
- [ ] **Section interventions récentes** : 3-5 dernières interventions (référence, type, statut, date)
- [ ] **Section actions en attente** : Liste actions requises (Valider travaux, Répondre créneaux, Nouvelle demande suggestion)
- [ ] **Badge "Action requise"** : Count actions pending
- [ ] **Bouton "Nouvelle demande"** : Prominent, redirect /locataire/interventions/new
- [ ] **Empty state** : "Aucune intervention - Créez votre première demande"
- [ ] **Clic intervention** : Redirect /locataire/interventions/[id]

**Sécurité**
- [ ] **Isolation** : Uniquement interventions où locataire assigné (RLS)

**UI/UX**
- [ ] **CTA prominent** : Bouton "Nouvelle demande" visible, couleur primaire
- [ ] **Actions cards** : Cards actions pending highlighted (couleur attention)
- [ ] **Responsive** : Cards empilées mobile

**Critères d'Acceptation**
- **PASS** : Interventions locataire affichées, actions pending correctes
- **FAIL** : Si interventions autres locataires visibles

---

### 2.5.2 - /locataire/interventions/new (Création Demande Locataire)

**Référence détaillée** : Voir F5.1

**Checklist Rapide**
- [ ] **Formulaire** : Lot* (dropdown lots locataire), Titre*, Type*, Description*, Urgence*, Localisation précise, Photos (optionnel), Devis requis? (checkbox)
- [ ] **Validation lot** : Dropdown affiche uniquement lots dont user est locataire (RLS)
- [ ] **Validation titre** : Min 10 car, max 100 car
- [ ] **Validation description** : Min 50 car, max 2000 car
- [ ] **Upload photos** : Max 5 files, 10MB each, JPG/PNG
- [ ] **Submit SUCCESS** : Toast "Demande créée", modal confirmation avec référence, redirect détail intervention
- [ ] **Submit FAIL** : Inline errors, focus premier champ erreur
- [ ] **Cancel** : Redirect /locataire/interventions (confirm si form modifié)

**Notifications**
- [ ] **Notification gestionnaires** : "Nouvelle demande {reference} - {type} ({urgency})"

**Activity Logs**
- [ ] **Log** : action=create, entity_type=intervention, actor_role=locataire

**Critères d'Acceptation**
- **PASS** : Form submit → Intervention créée status=demande → Notification gestionnaire → Redirect détail
- **FAIL** : Si intervention pas créée, ou locataire peut sélectionner lot autre locataire

---

### 2.5.3 - /locataire/interventions/[id] (Détail Intervention Locataire)

**Référence détaillée** : Voir F5.9

**Checklist Rapide**
- [ ] **Header** : Référence, Badge statut, Type, Urgence
- [ ] **Tabs** : Résumé, Planning, Fichiers, Chat
- [ ] **Tab Résumé** : Infos intervention, Statut workflow, Prestataire assigné (si assigné)
- [ ] **Tab Planning** : Mes disponibilités (si demandé), Créneaux proposés, Réponse créneaux, Date finale
- [ ] **Tab Fichiers** : Photos problème (mes uploads), Rapport prestataire (si terminé), Photos avant/après prestataire
- [ ] **Tab Chat** : Threads group + tenant_to_managers, Messages
- [ ] **Actions header** : Contextuelles (Indiquer dispos, Valider travaux si status=cloturee_par_prestataire)
- [ ] **Validation travaux** : Form validation (Satisfaisant? Commentaire, Note prestataire, Photos validation)

**Sécurité**
- [ ] **RLS** : is_tenant_of_intervention(id)
- [ ] **Actions limitées** : Locataire ne peut pas approuver/planifier/clôturer

**Critères d'Acceptation**
- **PASS** : Détail affiché, actions locataire fonctionnelles, validation travaux OK
- **FAIL** : Si locataire accède intervention autre locataire

---

### 2.5.4 - /locataire/interventions (Liste Interventions Locataire)

**Métadonnées**
- **Objectif** : Consulter toutes interventions locataire
- **Rôles autorisés** : Locataire uniquement
- **Préconditions** : User role=locataire, lot assigné
- **Permissions RLS** : is_tenant_of_intervention(id)

**Tests Fonctionnels**
- [ ] **Tabs** : "En cours" (status ≠ terminal), "Terminées" (status terminal), "Toutes"
- [ ] **Liste interventions** : Cards (référence, titre, type icon, statut badge, lot, date création, action requise badge)
- [ ] **Badge statut** : Couleur selon statut (demande=orange, approuvee=vert, en_cours=bleu, cloturee=gris)
- [ ] **Badge "Action requise"** : Affiché si action pending (ex: "Indiquer disponibilités", "Valider travaux")
- [ ] **Recherche** : Filtre par référence, titre
- [ ] **Filtres** : Statut (multi-select), Type (multi-select), Date range
- [ ] **Tri** : Par date création desc (défaut), urgence desc, statut
- [ ] **Pagination** : 10 interventions/page
- [ ] **Clic intervention** : Redirect /locataire/interventions/[id]
- [ ] **Bouton "Nouvelle demande"** : Prominent, redirect /locataire/interventions/new
- [ ] **Compteurs** : Total en cours, actions requises, terminées ce mois
- [ ] **Empty state** : "Aucune intervention - Créez votre première demande" + illustration

**Sécurité**
- [ ] **Isolation** : Uniquement interventions où user est locataire (RLS)

**UI/UX**
- [ ] **CTA prominent** : Bouton "Nouvelle demande" visible, couleur primaire
- [ ] **Cards responsive** : Empilées mobile, grid tablet/desktop
- [ ] **Loading states** : Skeleton cards
- [ ] **Badge action** : Highly visible (couleur attention, animation pulse si urgent)

**Critères d'Acceptation**
- **PASS** : Interventions locataire scope affichées, filtres fonctionnent, CTA visible
- **FAIL** : Si interventions autres locataires visibles, ou filtres cassés

---

### 2.5.5 - /locataire/profile (Profil Locataire)

**Métadonnées**
- **Objectif** : Gérer profil personnel locataire
- **Rôles autorisés** : Locataire uniquement
- **Préconditions** : User logged in, role=locataire
- **Permissions RLS** : user_id = auth.uid()

**Tests Fonctionnels**
- [ ] **Section Informations personnelles** : Fields (first_name, last_name, phone, avatar), bouton "Enregistrer"
- [ ] **Avatar upload** : Zone drop/click, preview, crop/resize, formats (jpg/png max 2MB)
- [ ] **Section Mon logement** : Affiche lot assigné (référence, adresse, immeuble), label "Contact principal" si is_primary=true
- [ ] **Infos logement read-only** : Référence, catégorie, étage, adresse complets
- [ ] **Validation fields** : First/last name requis, phone format international
- [ ] **Submit SUCCESS** : Toast "Profil mis à jour", users table updated, avatar uploadé
- [ ] **Submit FAIL - Validation** : Inline errors
- [ ] **Submit FAIL - Upload** : Toast "Erreur upload avatar"
- [ ] **Section Sécurité** : Liens "Changer email" (modal), "Changer mot de passe" (modal)
- [ ] **Modal Changer email** : Form (new_email, password actuel), confirmation email
- [ ] **Modal Changer password** : Form (current_password, new_password, confirm_password)
- [ ] **Section Compte** : Date création, dernière connexion

**Sécurité**
- [ ] **Update own profile only** : RLS user_id = auth.uid()
- [ ] **Logement read-only** : Locataire ne peut pas modifier assignation lot (gestionnaire only)

**Notifications & Activity Logs**
- [ ] **Activity Log** : action=profile_updated, fields_changed=[...]
- [ ] **Notification email change** : Emails ancien + nouvel email
- [ ] **Notification password change** : Email confirmation

**UI/UX**
- [ ] **Section logement highlighted** : Card logement visuellement distincte (background différent)
- [ ] **Badge principal** : Si contact principal → Badge "Contact principal" affiché
- [ ] **Unsaved warning** : Confirm dialog si modifications
- [ ] **Loading states** : Bouton "Enregistrement..." pendant save
- [ ] **Responsive** : Form adapté mobile

**Critères d'Acceptation**
- **PASS** : Modifications saved, avatar uploadé, logement affiché (read-only), modals fonctionnels
- **FAIL** : Si update échoue, ou locataire peut modifier assignation lot

---

### 2.5.6 - /locataire/parametres (Paramètres Locataire)

**Métadonnées**
- **Objectif** : Configuration préférences app locataire
- **Rôles autorisés** : Locataire uniquement
- **Préconditions** : User logged in, role=locataire

**Tests Fonctionnels**
- [ ] **Section Notifications** : Toggle "Notifications push", toggle "Notifications email"
- [ ] **Préférences notifications** : Checkboxes types (Intervention approuvée, Planning proposé, Travaux terminés, Messages gestionnaire)
- [ ] **Push notifications** : Si toggle ON + permissions browser pas accordées → Prompt
- [ ] **Test notification** : Bouton "Envoyer test" → Notification test reçue
- [ ] **Section Disponibilités** : Textarea "Mes disponibilités habituelles" (ex: "Disponible en soirée après 18h et le weekend")
- [ ] **Checkbox "Envoyer disponibilités automatiquement"** : Si coché, disponibilités envoyées auto lors création intervention
- [ ] **Section PWA** : Card "Installer l'application", bouton "Installer"
- [ ] **Installation PWA** : Clic → Prompt navigateur → App installée
- [ ] **PWA déjà installé** : Message "Application déjà installée"
- [ ] **Section Données** : Bouton "Vider cache", bouton "Exporter mes données"
- [ ] **Vider cache** : Confirmation → Cache invalidé → Toast "Cache vidé"
- [ ] **Exporter données** : Génère zip (profile, interventions) → Download
- [ ] **Auto-save** : Toggles/selects/textareas saved automatiquement

**Sécurité**
- [ ] **Permissions browser** : Push requiert permissions explicites
- [ ] **Export GDPR** : Données scope user uniquement

**Notifications & Activity Logs**
- [ ] **Activity Log** : action=settings_updated, changes=[...]
- [ ] **Pas de notification** : Changement silencieux

**UI/UX**
- [ ] **Sections cards** : Cards par fonctionnalité
- [ ] **Toggle states** : ON/OFF visuellement distinct
- [ ] **Disponibilités preview** : Affiche preview comment disponibilités seront envoyées
- [ ] **Responsive** : Settings adapté mobile
- [ ] **Loading states** : Spinner actions async

**Critères d'Acceptation**
- **PASS** : Toggles fonctionnent, disponibilités saved, PWA installable, export OK
- **FAIL** : Si toggles pas saved, ou disponibilités pas persistées

---

### 2.5.7 - /locataire/notifications (Centre Notifications Locataire)

**Métadonnées**
- **Objectif** : Consulter toutes notifications locataire
- **Rôles autorisés** : Locataire uniquement
- **Préconditions** : User logged in, role=locataire
- **Permissions RLS** : notifications.user_id = auth.uid()

**Tests Fonctionnels**
- [ ] **Tabs** : "Non lues" (default), "Toutes", "Archivées"
- [ ] **Liste notifications** : Cards (icon, titre, message, timestamp, badge unread)
- [ ] **Types notifications locataire** : Intervention (approuvée, rejetée, planifiée, en cours, terminée), Planning (créneaux proposés, date confirmée), Document (nouveau doc partagé), Message (nouveau message gestionnaire), Système
- [ ] **Icon type** : intervention=wrench, planning=calendar, document=file, message=chat, system=bell
- [ ] **Badge unread** : Dot bleu si read_at = null
- [ ] **Badge urgence** : Badge "Urgent" rouge si intervention urgence=urgente
- [ ] **Mark read** : Clic notification → Mark read auto, badge disparaît
- [ ] **Mark all read** : Bouton "Tout marquer lu" → Toutes notifs tab marquées lues
- [ ] **Actions inline** : CTA selon type (ex: "Voir intervention", "Répondre planning", "Consulter document")
- [ ] **Archiver** : Swipe left (mobile) ou bouton → Notification archivée
- [ ] **Supprimer** : Bouton delete → Confirmation → Soft deleted
- [ ] **Filtres** : Par type (multi-select), par date range
- [ ] **Pagination** : 20 notifications/page, infinite scroll
- [ ] **Empty state** : "Aucune notification"
- [ ] **Realtime** : Nouvelle notification apparaît auto + toast + badge header mis à jour
- [ ] **Sound notification** : Si intervention approuvée/rejetée → Son notification (si préférence activée)

**Sécurité**
- [ ] **Isolation user** : RLS user_id = auth.uid()

**Notifications & Activity Logs**
- [ ] **Pas de notification** : Consultation silencieuse
- [ ] **Activity Log** : action=notifications_viewed (optionnel)

**UI/UX**
- [ ] **Compteur header** : Badge count non lues dans bell icon
- [ ] **Highlight unread** : Background bleu clair notifications non lues
- [ ] **Highlight rejet** : Border/background rouge si intervention rejetée
- [ ] **Groupement date** : "Aujourd'hui", "Hier", "Cette semaine", "Plus ancien"
- [ ] **Timestamp relatif** : "Il y a 5 min", "Il y a 2h"
- [ ] **Responsive** : Cards empilées mobile
- [ ] **Animations** : Smooth mark read, nouvelle notif slide-in
- [ ] **Icon action** : Icon CTA visible (ex: flèche right) pour inciter clic

**Critères d'Acceptation**
- **PASS** : Notifications scope locataire affichées, mark read OK, realtime OK, filtres fonctionnels
- **FAIL** : Si notifications autres users visibles, ou mark read échoue

---

## 2.6 PROPRIETAIRE (Écrans Read-Only)

### 2.6.1 - /proprietaire/dashboard (Dashboard Proprietaire)

**Métadonnées**
- **Objectif** : Vue d'ensemble biens propriétaire (read-only)
- **Rôles autorisés** : Proprietaire uniquement
- **Préconditions** : User role=proprietaire, biens assignés (propriétaire)

**Tests Fonctionnels**
- [ ] **Compteurs** : Biens dont propriétaire, Interventions (ses biens)
- [ ] **Liste biens** : Immeubles/lots dont propriétaire (nom, adresse, statut occupé/vacant)
- [ ] **Liste interventions** : Interventions concernant ses biens (référence, type, statut)
- [ ] **Read-only** : Aucun bouton Créer/Modifier/Supprimer
- [ ] **Clic bien** : Redirect /proprietaire/biens/[type]/[id] (read-only)
- [ ] **Clic intervention** : Redirect /proprietaire/interventions/[id] (read-only)

**Sécurité**
- [ ] **Isolation** : Uniquement biens dont user propriétaire (RLS)
- [ ] **Actions masquées** : Aucune action write

**Critères d'Acceptation**
- **PASS** : Biens propriétaire affichés, aucune action write possible
- **FAIL** : Si propriétaire voit biens d'autres propriétaires

---

### 2.6.2 - /proprietaire/biens (Liste Biens Propriétaire - Read-Only)

**Métadonnées**
- **Objectif** : Consulter biens dont user est propriétaire (read-only)
- **Rôles autorisés** : Proprietaire uniquement
- **Préconditions** : User role=proprietaire, biens assignés comme propriétaire
- **Permissions RLS** : building_contacts.contact_id = auth.uid() AND type='proprietaire' (ou lot_contacts)

**Tests Fonctionnels**
- [ ] **Tabs** : "Immeubles", "Lots"
- [ ] **Tab Immeubles** : Liste immeubles dont propriétaire (nom, adresse, nb lots, statut global occupancy)
- [ ] **Tab Lots** : Liste lots dont propriétaire (référence, catégorie, immeuble, adresse, statut occupé/vacant)
- [ ] **Recherche** : Filtre par nom, référence, adresse
- [ ] **Filtres** : Statut occupancy (occupé/vacant/mixte)
- [ ] **Tri** : Par nom, date ajout
- [ ] **Clic immeuble** : Redirect /proprietaire/biens/immeubles/[id] (read-only)
- [ ] **Clic lot** : Redirect /proprietaire/biens/lots/[id] (read-only)
- [ ] **Compteurs** : Total immeubles, total lots, taux occupancy global
- [ ] **Aucun bouton create** : Pas de "Ajouter immeuble/lot" (gestionnaire only)
- [ ] **Empty state** : "Aucun bien assigné - Contactez votre gestionnaire"

**Sécurité**
- [ ] **Isolation** : Uniquement biens où user = propriétaire (RLS complexe via contacts)
- [ ] **Actions write masquées** : Aucun bouton Modifier/Supprimer/Ajouter

**UI/UX**
- [ ] **Badge "Consultation"** : Badge discret "Consultation uniquement" dans header
- [ ] **Tooltips** : Hover immeubles/lots → Tooltip "Contactez gestionnaire pour modifications"
- [ ] **Cards read-only style** : Visuellement distinct (grisé, pas de hover effects actions)
- [ ] **Loading states** : Skeleton cards
- [ ] **Responsive** : Cards empilées mobile, grid tablet/desktop

**Critères d'Acceptation**
- **PASS** : Biens propriétaire scope affichés, aucun bouton write, RLS respecté
- **FAIL** : Si propriétaire voit biens autres propriétaires, ou boutons write visibles

---

### 2.6.3 - /proprietaire/interventions (Liste Interventions Propriétaire - Read-Only)

**Métadonnées**
- **Objectif** : Consulter interventions concernant biens propriétaire (read-only)
- **Rôles autorisés** : Proprietaire uniquement
- **Préconditions** : User role=proprietaire, biens assignés
- **Permissions RLS** : interventions.lot_id IN (lots owned by user)

**Tests Fonctionnels**
- [ ] **Tabs** : "En cours" (status ≠ terminal), "Terminées", "Toutes"
- [ ] **Liste interventions** : Cards (référence, titre, type, statut, bien concerné, date)
- [ ] **Badge statut** : Couleur selon statut (identique autres rôles)
- [ ] **Filtres** : Statut (multi-select), Type (multi-select), Bien (dropdown biens propriétaire), Date range
- [ ] **Recherche** : Par référence, titre
- [ ] **Tri** : Par date desc, statut
- [ ] **Clic intervention** : Redirect /proprietaire/interventions/[id] (read-only)
- [ ] **Compteurs** : Total en cours, terminées ce mois
- [ ] **Aucun bouton create** : Pas de "Nouvelle intervention" (gestionnaire/locataire only)
- [ ] **Empty state** : "Aucune intervention"

**Sécurité**
- [ ] **Isolation** : Uniquement interventions sur biens propriétaire (RLS via lot_id)
- [ ] **Actions write masquées** : Aucune action workflow

**UI/UX**
- [ ] **Badge "Consultation"** : Header badge "Consultation uniquement"
- [ ] **Cards read-only** : Pas d'actions inline
- [ ] **Loading states** : Skeleton cards
- [ ] **Responsive** : Cards empilées mobile

**Critères d'Acceptation**
- **PASS** : Interventions scope propriétaire affichées, aucun bouton action, RLS respecté
- **FAIL** : Si propriétaire voit interventions autres biens, ou actions visibles

---

### 2.6.4 - /proprietaire/profile (Profil Propriétaire)

**Métadonnées**
- **Objectif** : Gérer profil personnel propriétaire
- **Rôles autorisés** : Proprietaire uniquement
- **Préconditions** : User logged in, role=proprietaire
- **Permissions RLS** : user_id = auth.uid()

**Tests Fonctionnels**
- [ ] **Section Informations personnelles** : Fields (first_name, last_name, phone, avatar), bouton "Enregistrer"
- [ ] **Avatar upload** : Zone drop/click, preview, crop/resize, formats (jpg/png max 2MB)
- [ ] **Section Mes biens** : Affiche compteurs (immeubles owned, lots owned, taux occupancy)
- [ ] **Section Coordonnées** : Phone, email (lecture seule), adresse postale
- [ ] **Validation fields** : First/last name requis, phone format international
- [ ] **Submit SUCCESS** : Toast "Profil mis à jour", users table updated
- [ ] **Submit FAIL** : Inline errors ou toast erreur
- [ ] **Section Sécurité** : Liens "Changer email" (modal), "Changer mot de passe" (modal)
- [ ] **Modal Changer email** : Form (new_email, password actuel)
- [ ] **Modal Changer password** : Form (current_password, new_password, confirm_password)
- [ ] **Section Compte** : Date création, dernière connexion

**Sécurité**
- [ ] **Update own profile only** : RLS user_id = auth.uid()

**Notifications & Activity Logs**
- [ ] **Activity Log** : action=profile_updated
- [ ] **Notification email change** : Emails ancien + nouvel email

**UI/UX**
- [ ] **Section biens highlighted** : Card biens visuellement distincte
- [ ] **Compteurs visual** : Icons + chiffres colorés
- [ ] **Unsaved warning** : Confirm dialog si modifications
- [ ] **Responsive** : Form adapté mobile

**Critères d'Acceptation**
- **PASS** : Modifications saved, stats biens affichées
- **FAIL** : Si update échoue

---

### 2.6.5 - /proprietaire/parametres (Paramètres Propriétaire)

**Métadonnées**
- **Objectif** : Configuration préférences app propriétaire
- **Rôles autorisés** : Proprietaire uniquement
- **Préconditions** : User logged in, role=proprietaire

**Tests Fonctionnels**
- [ ] **Section Notifications** : Toggle "Notifications push", toggle "Notifications email"
- [ ] **Préférences notifications** : Checkboxes types (Nouvelle intervention sur mes biens, Intervention terminée, Documents ajoutés)
- [ ] **Push notifications** : Si toggle ON + permissions browser pas accordées → Prompt
- [ ] **Test notification** : Bouton "Envoyer test" → Notification test reçue
- [ ] **Section PWA** : Card "Installer l'application", bouton "Installer"
- [ ] **Installation PWA** : Clic → Prompt navigateur → App installée
- [ ] **Section Données** : Bouton "Vider cache", bouton "Exporter mes données"
- [ ] **Vider cache** : Confirmation → Cache invalidé
- [ ] **Exporter données** : Génère zip (profile, biens, interventions) → Download
- [ ] **Auto-save** : Toggles saved automatiquement

**Sécurité**
- [ ] **Permissions browser** : Push requiert permissions explicites
- [ ] **Export GDPR** : Données scope propriétaire uniquement

**Notifications & Activity Logs**
- [ ] **Activity Log** : action=settings_updated
- [ ] **Pas de notification** : Changement silencieux

**UI/UX**
- [ ] **Sections cards** : Cards par fonctionnalité
- [ ] **Toggle states** : ON/OFF visuellement distinct
- [ ] **Responsive** : Settings adapté mobile

**Critères d'Acceptation**
- **PASS** : Toggles fonctionnent, PWA installable, export OK
- **FAIL** : Si toggles pas saved

---

### 2.6.6 - /proprietaire/notifications (Centre Notifications Propriétaire)

**Métadonnées**
- **Objectif** : Consulter toutes notifications propriétaire
- **Rôles autorisés** : Proprietaire uniquement
- **Préconditions** : User logged in, role=proprietaire
- **Permissions RLS** : notifications.user_id = auth.uid()

**Tests Fonctionnels**
- [ ] **Tabs** : "Non lues" (default), "Toutes", "Archivées"
- [ ] **Liste notifications** : Cards (icon, titre, message, timestamp, badge unread)
- [ ] **Types notifications propriétaire** : Intervention (nouvelle sur bien, terminée), Document (nouveau doc bien), Bien (nouveau locataire assigné), Système
- [ ] **Icon type** : intervention=wrench, document=file, bien=home, system=bell
- [ ] **Badge unread** : Dot bleu si read_at = null
- [ ] **Mark read** : Clic notification → Mark read auto
- [ ] **Mark all read** : Bouton "Tout marquer lu"
- [ ] **Actions inline** : CTA (ex: "Voir intervention", "Consulter document", "Voir bien")
- [ ] **Archiver** : Swipe left (mobile) ou bouton
- [ ] **Supprimer** : Bouton delete → Confirmation
- [ ] **Filtres** : Par type (multi-select), par bien (dropdown), par date
- [ ] **Pagination** : 20/page, infinite scroll
- [ ] **Empty state** : "Aucune notification"
- [ ] **Realtime** : Nouvelle notification apparaît auto

**Sécurité**
- [ ] **Isolation user** : RLS user_id = auth.uid()

**Notifications & Activity Logs**
- [ ] **Pas de notification** : Consultation silencieuse

**UI/UX**
- [ ] **Compteur header** : Badge count non lues
- [ ] **Highlight unread** : Background bleu clair
- [ ] **Groupement date** : "Aujourd'hui", "Hier", etc.
- [ ] **Timestamp relatif** : "Il y a X min/h"
- [ ] **Responsive** : Cards empilées mobile
- [ ] **Animations** : Smooth transitions

**Critères d'Acceptation**
- **PASS** : Notifications scope propriétaire affichées, mark read OK, realtime OK
- **FAIL** : Si notifications autres users visibles

---

## 2.7 MODALS & COMPOSANTS INTERACTIFS

**Note** : Cette section documente les modals/dialogs/composants réutilisables à travers l'application. Chaque modal peut être déclenché depuis plusieurs pages. Les tests vérifient le comportement du modal indépendamment de la page source.

---

### 2.7.1 - Modal Création/Édition Contact

**Déclenchement** :
- `/gestionnaire/contacts` : Bouton "Ajouter contact"
- Wizards création lot/immeuble : Bouton "Créer contact" inline
- Pages détail : Bouton "Ajouter contact"

**Tests Fonctionnels**
- [ ] **Fields** : first_name*, last_name*, email*, phone, adresse (rue, CP, ville), rôle* (select), entreprise (si prestataire), spécialité (si prestataire), notes
- [ ] **Toggle "Inviter à l'app"** : Si coché → Email invitation envoyé après création
- [ ] **Validation email** : Format valide, unicité dans team
- [ ] **Validation phone** : Format international optionnel
- [ ] **Conditional fields** : Entreprise/Spécialité visible si rôle=prestataire
- [ ] **Submit SUCCESS** : Contact créé, toast "Contact créé", modal fermé, contact ajouté à liste/dropdown appelant
- [ ] **Submit FAIL - Email duplicate** : Inline error "Email déjà utilisé dans cette équipe"
- [ ] **Submit FAIL - Validation** : Inline errors fields requis
- [ ] **Fermeture** : Click backdrop/X/Escape → Confirm si form modifié → Modal fermé

**UI/UX**
- [ ] **Form layout** : Sections collapsibles (Identité, Coordonnées, Professionnel, Notes)
- [ ] **Loading state** : Bouton "Création..." pendant save
- [ ] **Responsive** : Modal full-screen mobile, 600px width desktop
- [ ] **Focus trap** : Focus locked dans modal, tab cycling

**Critères d'Acceptation**
- **PASS** : Contact créé + ajouté à context appelant + invitation envoyée si toggle ON
- **FAIL** : Si contact pas créé, ou pas ajouté à liste appelante

---

### 2.7.2 - Modal Confirmation Approbation Intervention

**Déclenchement** :
- `/gestionnaire/interventions/[id]` : Bouton "Approuver"
- `/gestionnaire/interventions` liste : Action inline "Approuver"

**Tests Fonctionnels**
- [ ] **Titre** : "Approuver l'intervention #{référence}"
- [ ] **Résumé intervention** : Affiche titre, type, urgence, locataire
- [ ] **Textarea "Commentaire"** : Optionnel, placeholder "Ajouter un commentaire pour l'équipe"
- [ ] **Checkbox "Envoyer notification locataire"** : Coché par défaut
- [ ] **Boutons** : "Annuler" (secondary), "Approuver" (primary green)
- [ ] **Submit** : POST /api/intervention-approve, status → approuvee, notification locataire si checkbox
- [ ] **Submit SUCCESS** : Toast "Intervention approuvée", modal fermé, page intervention refresh, badge statut mis à jour
- [ ] **Submit FAIL** : Toast "Erreur approbation", modal reste ouvert

**UI/UX**
- [ ] **Icon** : Checkmark vert
- [ ] **Highlight urgence** : Si urgence=urgente → Badge rouge visible
- [ ] **Loading** : Bouton "Approbation..." pendant requête

**Critères d'Acceptation**
- **PASS** : Intervention status updated + notification envoyée + UI refresh
- **FAIL** : Si status pas updated

---

### 2.7.3 - Modal Rejet Intervention

**Déclenchement** :
- `/gestionnaire/interventions/[id]` : Bouton "Rejeter"

**Tests Fonctionnels**
- [ ] **Titre** : "Rejeter l'intervention #{référence}"
- [ ] **Warning** : Alert "Cette action notifiera le locataire"
- [ ] **Textarea "Raison du rejet"** : Requis, min 20 caractères
- [ ] **Checkbox "Proposer alternative"** : Si coché → Affiche textarea "Proposition alternative"
- [ ] **Boutons** : "Annuler", "Rejeter" (danger red)
- [ ] **Submit** : POST /api/intervention-reject, status → rejetee, notification locataire avec raison
- [ ] **Submit SUCCESS** : Toast "Intervention rejetée", modal fermé, redirect /gestionnaire/interventions
- [ ] **Submit FAIL - Raison manquante** : Inline error "Veuillez indiquer une raison"
- [ ] **Submit FAIL - Raison trop courte** : Inline error "Minimum 20 caractères"

**UI/UX**
- [ ] **Icon** : X rouge
- [ ] **Warning style** : Background rouge clair, border rouge
- [ ] **Textarea autogrow** : Height adapté au contenu

**Critères d'Acceptation**
- **PASS** : Intervention rejetée + raison saved + notification locataire + redirect
- **FAIL** : Si status pas updated, ou raison pas saved

---

### 2.7.4 - Modal Annulation Intervention

**Déclenchement** :
- `/gestionnaire/interventions/[id]` : Bouton "Annuler"
- `/locataire/interventions/[id]` : Bouton "Annuler" (si status=demande)

**Tests Fonctionnels**
- [ ] **Titre** : "Annuler l'intervention #{référence}"
- [ ] **Warning** : "Cette action est irréversible. Tous les participants seront notifiés."
- [ ] **Textarea "Raison de l'annulation"** : Requis, min 10 car
- [ ] **Checkbox "Notifier équipe"** : Coché par défaut (gestionnaire), disabled (locataire)
- [ ] **Boutons** : "Annuler" (secondary), "Confirmer l'annulation" (danger red)
- [ ] **Submit** : POST /api/intervention-cancel, status → annulee, notifications envoyées
- [ ] **Submit SUCCESS** : Toast "Intervention annulée", modal fermé, redirect liste interventions
- [ ] **Submit FAIL** : Toast error, modal reste ouvert

**UI/UX**
- [ ] **Double confirmation** : Checkbox "Je confirme vouloir annuler" required pour enable bouton submit
- [ ] **Icon warning** : Triangle exclamation orange
- [ ] **Disabled bouton** : Submit disabled tant que checkbox pas cochée

**Critères d'Acceptation**
- **PASS** : Intervention annulée + raison saved + notifications envoyées + redirect
- **FAIL** : Si status pas annulee

---

### 2.7.5 - Modal Demande Devis (Single)

**Déclenchement** :
- `/gestionnaire/interventions/[id]` : Bouton "Demander devis"

**Tests Fonctionnels**
- [ ] **Titre** : "Demander un devis"
- [ ] **Dropdown "Prestataire"** : Liste prestataires team, recherche, requis
- [ ] **Textarea "Description travaux"** : Détail demande, requis
- [ ] **Date "Date limite réponse"** : Datepicker, défaut +7j, optionnel
- [ ] **Checkbox "Urgent"** : Si coché → Date limite +2j, notification urgente
- [ ] **Boutons** : "Annuler", "Envoyer demande"
- [ ] **Submit** : POST /api/intervention-quote-request, quote_request créée, notification prestataire
- [ ] **Submit SUCCESS** : Toast "Demande envoyée à {prestataire}", modal fermé, tab Devis refresh avec nouvelle demande
- [ ] **Submit FAIL - Prestataire manquant** : Inline error
- [ ] **Submit FAIL - Description manquante** : Inline error

**UI/UX**
- [ ] **Preview prestataire** : Card prestataire sélectionné (avatar, nom, spécialité, note)
- [ ] **Deadline countdown** : Affiche "Réponse attendue dans X jours"

**Critères d'Acceptation**
- **PASS** : Quote request créée + notification prestataire + UI refresh
- **FAIL** : Si quote_request pas créée

---

### 2.7.6 - Modal Demande Multi-Devis

**Déclenchement** :
- `/gestionnaire/interventions/[id]` : Bouton "Comparer devis"

**Tests Fonctionnels**
- [ ] **Titre** : "Demander plusieurs devis"
- [ ] **Multi-select "Prestataires"** : Liste prestataires, recherche, min 2, max 5
- [ ] **Textarea "Description travaux"** : Identique pour tous
- [ ] **Date "Date limite"** : Datepicker, défaut +7j
- [ ] **Checkbox "Notifier individuellement"** : Si coché → Chaque prestataire pense être seul sollicité, sinon → Prestataires voient nombre concurrents
- [ ] **Boutons** : "Annuler", "Envoyer aux X prestataires"
- [ ] **Submit** : POST /api/intervention-quote-request (batch), X quote_requests créées, notifications envoyées
- [ ] **Submit SUCCESS** : Toast "Demandes envoyées à X prestataires", modal fermé, tab Devis refresh
- [ ] **Submit FAIL - < 2 prestataires** : Inline error "Sélectionnez au moins 2 prestataires"
- [ ] **Submit FAIL - > 5 prestataires** : Inline error "Maximum 5 prestataires"

**UI/UX**
- [ ] **Cards prestataires** : Affiche cards sélectionnés avec remove button
- [ ] **Badge count** : "X/5 sélectionnés"
- [ ] **Comparison mode** : Toggle "Mode compétition" visual

**Critères d'Acceptation**
- **PASS** : X quote_requests créées + notifications envoyées + UI refresh
- **FAIL** : Si quote_requests pas créées pour tous

---

### 2.7.7 - Modal Soumission Devis (Prestataire)

**Déclenchement** :
- `/prestataire/interventions/[id]` : Bouton "Soumettre devis" (si status=demande_de_devis)

**Tests Fonctionnels**
- [ ] **Titre** : "Soumettre mon devis - Intervention #{ref}"
- [ ] **Field "Montant TTC"** : Number input (€), requis, min 0
- [ ] **Field "Durée estimée"** : Number + select unit (heures/jours), requis
- [ ] **Field "Date disponibilité"** : Datepicker, "Disponible dès le", requis
- [ ] **Textarea "Description détaillée"** : Détail travaux proposés, requis, min 50 car
- [ ] **Upload "Documents"** : Devis PDF (optionnel), max 5MB
- [ ] **Field "Validité devis"** : Number jours, défaut 30j
- [ ] **Checkbox "Conditions acceptées"** : Requis, lien vers CGV
- [ ] **Boutons** : "Annuler", "Soumettre devis"
- [ ] **Submit** : POST /api/intervention-quote-submit, quote créée, notification gestionnaire
- [ ] **Submit SUCCESS** : Toast "Devis soumis avec succès", modal fermé, tab Devis affiche "Devis soumis" avec status pending
- [ ] **Submit FAIL - Montant invalide** : Inline error "Montant requis"
- [ ] **Submit FAIL - CGV pas acceptées** : Inline error "Veuillez accepter les conditions"

**UI/UX**
- [ ] **Preview montant** : Affiche breakdown (HT/TVA/TTC) si TVA applicable
- [ ] **Estimation auto** : Suggestion durée basée sur type intervention
- [ ] **Loading** : Bouton "Envoi..." + upload progress si document

**Critères d'Acceptation**
- **PASS** : Quote créée + document uploadé + notification gestionnaire + UI refresh
- **FAIL** : Si quote pas créée

---

### 2.7.8 - Modal Validation Devis (Gestionnaire)

**Déclenchement** :
- `/gestionnaire/interventions/[id]` tab Devis : Bouton "Valider" sur devis

**Tests Fonctionnels**
- [ ] **Titre** : "Valider le devis"
- [ ] **Résumé devis** : Affiche prestataire, montant, durée, description
- [ ] **Textarea "Commentaire validation"** : Optionnel
- [ ] **Date "Date début travaux souhaitée"** : Datepicker, optionnel, passe à planification si remplie
- [ ] **Checkbox "Notifier prestataire"** : Coché par défaut
- [ ] **Boutons** : "Annuler", "Valider le devis"
- [ ] **Submit** : POST /api/quotes/[id]/approve, quote.status → approved, intervention status → planification si date fournie
- [ ] **Submit SUCCESS** : Toast "Devis validé", modal fermé, status intervention updated, notification prestataire
- [ ] **Submit FAIL** : Toast error

**UI/UX**
- [ ] **Montant highlighted** : Montant en gros caractères
- [ ] **Comparison** : Si multi-devis → Affiche "X% moins cher que moyenne"

**Critères d'Acceptation**
- **PASS** : Quote approved + intervention status updated + notification prestataire
- **FAIL** : Si quote status pas updated

---

### 2.7.9 - Modal Planification Créneaux

**Déclenchement** :
- `/gestionnaire/interventions/[id]` : Bouton "Planifier"

**Tests Fonctionnels**
- [ ] **Titre** : "Planifier l'intervention"
- [ ] **Select "Mode planning"** : "Flexible" (collecte dispos), "Créneaux fixes" (propose dates), "Date fixe" (impose date)
- [ ] **Mode Flexible** : Form demande disponibilités locataire + prestataire
- [ ] **Mode Créneaux** : Datepicker multi-dates, sélection 2-5 créneaux, durée par créneau
- [ ] **Mode Fixe** : Datepicker single, heure début/fin
- [ ] **Textarea "Instructions"** : Consignes pour locataire/prestataire, optionnel
- [ ] **Boutons** : "Annuler", "Envoyer demandes" ou "Confirmer planning"
- [ ] **Submit Flexible** : POST /api/intervention/[id]/availabilities, status → planification, notifications demandes dispos
- [ ] **Submit Créneaux** : POST /api/intervention/[id]/propose-slots, slots créés, notifications propositions
- [ ] **Submit Fixe** : POST /api/intervention/[id]/schedule, status → planifiee, notifications date confirmée
- [ ] **Submit SUCCESS** : Toast selon mode, modal fermé, tab Planning refresh
- [ ] **Submit FAIL** : Toast error

**UI/UX**
- [ ] **Calendar visual** : Calendrier visuel pour sélection dates
- [ ] **Conflict detection** : Highlight dates si conflit avec autres interventions
- [ ] **Preview participants** : Cards locataire + prestataire

**Critères d'Acceptation**
- **PASS** : Planning créé selon mode + notifications envoyées + status updated
- **FAIL** : Si planning pas créé

---

### 2.7.10 - Modal Fin Travaux (Prestataire)

**Déclenchement** :
- `/prestataire/interventions/[id]` : Bouton "Marquer terminé"

**Tests Fonctionnels**
- [ ] **Titre** : "Travaux terminés"
- [ ] **Textarea "Compte-rendu"** : Description travaux effectués, requis, min 50 car
- [ ] **Upload "Photos avant/après"** : Min 1 photo, max 10, requis
- [ ] **Field "Durée réelle"** : Number heures, comparé à durée estimée
- [ ] **Textarea "Observations"** : Problèmes rencontrés, recommandations, optionnel
- [ ] **Checkbox "Travaux conformes au devis"** : Requis
- [ ] **Upload "Facture"** : PDF facture, optionnel mais recommandé
- [ ] **Boutons** : "Annuler", "Soumettre rapport"
- [ ] **Submit** : POST /api/intervention/[id]/work-completion, status → cloturee_par_prestataire, notification locataire validation
- [ ] **Submit SUCCESS** : Toast "Rapport envoyé", modal fermé, status updated, attente validation locataire
- [ ] **Submit FAIL - Photos manquantes** : Inline error "Au moins 1 photo requise"
- [ ] **Submit FAIL - Compte-rendu court** : Inline error "Minimum 50 caractères"

**UI/UX**
- [ ] **Upload grid** : Photos affichées en grid, drag-drop, preview
- [ ] **Durée comparison** : Affiche "X% plus/moins rapide qu'estimé"
- [ ] **Signature digitale** : Canvas signature prestataire (optionnel)

**Critères d'Acceptation**
- **PASS** : Work completion saved + photos uploadées + status updated + notification locataire
- **FAIL** : Si work completion pas saved

---

### 2.7.11 - Modal Validation Travaux (Locataire)

**Déclenchement** :
- `/locataire/interventions/[id]` : Bouton "Valider travaux" (si status=cloturee_par_prestataire)

**Tests Fonctionnels**
- [ ] **Titre** : "Valider les travaux"
- [ ] **Résumé travaux** : Affiche compte-rendu prestataire, photos avant/après
- [ ] **Radio "Satisfaction"** : "Satisfait", "Partiellement satisfait", "Non satisfait", requis
- [ ] **Si "Partiellement/Non satisfait"** : Affiche textarea "Problèmes constatés", requis
- [ ] **Rating "Note prestataire"** : 1-5 étoiles, requis
- [ ] **Textarea "Commentaire"** : Optionnel
- [ ] **Upload "Photos validation"** : Photos locataire post-travaux, optionnel, max 5
- [ ] **Checkbox "Accepter clôture"** : Si non satisfait, checkbox "J'accepte malgré tout la clôture", sinon auto-coché
- [ ] **Boutons** : "Annuler", "Valider" ou "Signaler problème"
- [ ] **Submit Satisfait** : POST /api/intervention/[id]/tenant-validation, status → cloturee_par_locataire, notification gestionnaire
- [ ] **Submit Non satisfait** : POST /api/intervention/[id]/tenant-validation, status → cloturee_par_locataire mais flag probleme=true, notification urgente gestionnaire
- [ ] **Submit SUCCESS** : Toast "Validation enregistrée", modal fermé, status updated
- [ ] **Submit FAIL** : Toast error

**UI/UX**
- [ ] **Before/After slider** : Slider photos avant/après prestataire
- [ ] **Stars interactive** : Hover stars animation
- [ ] **Warning non satisfait** : Alert rouge si non satisfait sélectionné

**Critères d'Acceptation**
- **PASS** : Validation saved + note prestataire saved + status updated + notification gestionnaire
- **FAIL** : Si validation pas saved

---

### 2.7.12 - Modal Clôture Finale (Gestionnaire)

**Déclenchement** :
- `/gestionnaire/interventions/[id]` : Bouton "Clôturer" (si status=cloturee_par_locataire ou locataire injoignable)

**Tests Fonctionnels**
- [ ] **Titre** : "Clôture définitive"
- [ ] **Résumé** : Affiche timeline complète intervention (dates clés, durée totale, coût final)
- [ ] **Validation checklist** : Checklist items (Travaux terminés ✓, Locataire validé ✓, Facture reçue ?, Paiement effectué ?)
- [ ] **Textarea "Notes finales"** : Notes archivage, optionnel
- [ ] **Upload "Documents finaux"** : Factures, attestations, etc., optionnel
- [ ] **Checkbox "Archiver conversation"** : Si coché → Conversation read-only
- [ ] **Checkbox "Confirmer clôture définitive"** : Requis, action irréversible
- [ ] **Boutons** : "Annuler", "Clôturer définitivement"
- [ ] **Submit** : POST /api/intervention/[id]/finalize, status → cloturee_par_gestionnaire, intervention archived
- [ ] **Submit SUCCESS** : Toast "Intervention clôturée", modal fermé, redirect liste, intervention disparaît de "En cours"
- [ ] **Submit FAIL** : Toast error

**UI/UX**
- [ ] **Timeline visual** : Timeline graphique workflow complet
- [ ] **Stats summary** : Cards (Durée totale, Coût final, Note prestataire, Satisfaction locataire)
- [ ] **Warning irréversible** : Alert orange "Action irréversible"

**Critères d'Acceptation**
- **PASS** : Intervention finalized + status final + archived + redirect
- **FAIL** : Si status pas cloturee_par_gestionnaire

---

### 2.7.13 - Modal Changement Email

**Déclenchement** :
- Pages `/*/profile` : Lien "Changer email" dans section Sécurité

**Tests Fonctionnels**
- [ ] **Titre** : "Changer mon adresse email"
- [ ] **Field "Email actuel"** : Read-only, affiche email actuel
- [ ] **Field "Nouvel email"** : Email input, requis, validation format
- [ ] **Field "Mot de passe actuel"** : Password input, requis pour sécurité
- [ ] **Warning** : "Un email de confirmation sera envoyé à la nouvelle adresse"
- [ ] **Boutons** : "Annuler", "Envoyer confirmation"
- [ ] **Submit** : POST /api/change-email, email confirmation envoyé, email actuel reste jusqu'à confirmation
- [ ] **Submit SUCCESS** : Toast "Email de confirmation envoyé à {new_email}", modal fermé, instructions affichées
- [ ] **Submit FAIL - Email déjà utilisé** : Inline error "Cet email est déjà utilisé"
- [ ] **Submit FAIL - Password incorrect** : Inline error "Mot de passe incorrect"
- [ ] **Submit FAIL - Email invalide** : Inline error "Format email invalide"

**UI/UX**
- [ ] **Steps indicator** : "Étape 1/2 : Demande" (étape 2 = confirmation email)
- [ ] **Email preview** : Affiche preview email qui sera envoyé

**Critères d'Acceptation**
- **PASS** : Email confirmation envoyé + email pas changé immédiatement + instructions claires
- **FAIL** : Si email changé sans confirmation

---

### 2.7.14 - Modal Changement Mot de Passe

**Déclenchement** :
- Pages `/*/profile` : Lien "Changer mot de passe" dans section Sécurité

**Tests Fonctionnels**
- [ ] **Titre** : "Changer mon mot de passe"
- [ ] **Field "Mot de passe actuel"** : Password input, requis
- [ ] **Field "Nouveau mot de passe"** : Password input, requis, min 8 car
- [ ] **Field "Confirmer nouveau"** : Password input, requis, doit match nouveau
- [ ] **Password strength indicator** : Barre visuelle (rouge/orange/vert)
- [ ] **Requirements list** : Checklist (Min 8 car ✓, 1 majuscule ✓, 1 chiffre ✓, 1 spécial ✓)
- [ ] **Toggle "Afficher mots de passe"** : Toggle visibility
- [ ] **Boutons** : "Annuler", "Changer mot de passe"
- [ ] **Submit** : POST /api/change-password, password updated, session maintenue
- [ ] **Submit SUCCESS** : Toast "Mot de passe modifié", email confirmation envoyé, modal fermé
- [ ] **Submit FAIL - Password actuel incorrect** : Inline error "Mot de passe actuel incorrect"
- [ ] **Submit FAIL - Passwords différents** : Inline error "Les mots de passe ne correspondent pas"
- [ ] **Submit FAIL - Password faible** : Inline error "Mot de passe trop faible"

**UI/UX**
- [ ] **Strength meter** : Updates real-time pendant saisie
- [ ] **Requirements check** : Checkmarks dynamiques
- [ ] **Warning session** : "Vous resterez connecté après le changement"

**Critères d'Acceptation**
- **PASS** : Password changed + email confirmation sent + session maintained
- **FAIL** : Si password pas changed, ou session interrompue

---

### 2.7.15 - Modal PWA Installation

**Déclenchement** :
- Pages `/*/parametres` : Bouton "Installer l'application"
- Prompt auto (si beforeinstallprompt event)

**Tests Fonctionnels**
- [ ] **Titre** : "Installer SEIDO sur votre appareil"
- [ ] **Benefits list** : Liste bénéfices (Accès rapide, Mode offline, Notifications push, Icône accueil)
- [ ] **Instructions** : Instructions spécifiques navigateur (Chrome, Safari, Firefox, Edge)
- [ ] **Screenshots** : 2-3 screenshots app installée
- [ ] **Checkbox "Ne plus afficher"** : Mémoriser choix
- [ ] **Boutons** : "Plus tard", "Installer maintenant"
- [ ] **Click "Installer"** : Trigger prompt.prompt() navigateur
- [ ] **Prompt accepté** : App installée, toast "Application installée", modal fermé, bouton "Installer" remplacé par "Application installée ✓"
- [ ] **Prompt refusé** : Modal fermé, bouton reste "Installer"

**UI/UX**
- [ ] **Platform detection** : Instructions adaptées OS (iOS, Android, Desktop)
- [ ] **Icon preview** : Affiche icon app qui sera sur accueil
- [ ] **Video tutoriel** : Lien vers vidéo tuto installation (optionnel)

**Critères d'Acceptation**
- **PASS** : Prompt navigateur déclenché + installation réussie + UI updated
- **FAIL** : Si prompt pas déclenché (vérifier beforeinstallprompt)

---

### 2.7.16 - Modal Confirmation Suppression (Générique)

**Déclenchement** :
- Actions delete partout (biens, contacts, interventions, documents)

**Tests Fonctionnels**
- [ ] **Titre** : "Confirmer la suppression" (dynamique selon entité)
- [ ] **Warning** : "Cette action est irréversible" ou "Cette action déplacera vers corbeille"
- [ ] **Résumé entité** : Affiche nom/référence entité à supprimer
- [ ] **Impact description** : Décrit conséquences (ex: "Les X lots rattachés seront aussi supprimés")
- [ ] **Checkbox "Je comprends"** : Requis pour enable bouton
- [ ] **Field "Taper DELETE"** : Input text, user doit taper "DELETE" pour confirmer (entités critiques uniquement)
- [ ] **Boutons** : "Annuler", "Supprimer" (danger red)
- [ ] **Submit** : DELETE API call, entity soft deleted (ou hard delete selon config)
- [ ] **Submit SUCCESS** : Toast "X supprimé(e)", modal fermé, liste refresh, entité disparaît
- [ ] **Submit FAIL** : Toast error, modal reste ouvert

**UI/UX**
- [ ] **Icon warning** : Triangle exclamation rouge
- [ ] **Red theme** : Modal theme rouge pour danger
- [ ] **Disabled bouton** : Submit disabled jusqu'à validations complètes

**Critères d'Acceptation**
- **PASS** : Entity deleted + UI refresh + toast confirmation
- **FAIL** : Si entity pas deleted

---

### 2.7.17 - Modal Preview Document

**Déclenchement** :
- Pages documents (biens, interventions) : Click sur document image/PDF

**Tests Fonctionnels**
- [ ] **Titre** : Nom fichier document
- [ ] **Content** : Preview selon type (image inline, PDF iframe, autres téléchargement)
- [ ] **Actions header** : [Télécharger] [Ouvrir nouvel onglet] [Supprimer] [Fermer]
- [ ] **Navigation** : Si plusieurs docs → Boutons Précédent/Suivant
- [ ] **Zoom** : Si image → Zoom in/out, pan
- [ ] **Metadata** : Affiche uploadé par, date, taille fichier
- [ ] **Bouton "Télécharger"** : Download file
- [ ] **Bouton "Supprimer"** : Ouvre modal confirmation suppression (si permissions)
- [ ] **Fermeture** : Click backdrop/X/Escape → Modal fermé

**UI/UX**
- [ ] **Fullscreen mode** : Toggle fullscreen
- [ ] **Keyboard nav** : Arrows prev/next, Escape close
- [ ] **Loading state** : Spinner pendant chargement preview
- [ ] **Responsive** : Full-screen mobile, 80% width desktop

**Critères d'Acceptation**
- **PASS** : Document prévisualisé correctement, téléchargement fonctionne, navigation entre docs OK
- **FAIL** : Si preview cassée, ou téléchargement échoue

---

**Note** : Les 17 modals ci-dessus couvrent les modals principaux. D'autres modals mineurs (Success generic, Error generic, Loading) utilisent des patterns similaires et suivent les mêmes principes UI/UX (fermeture backdrop/X/Escape, focus trap, responsive, loading states).

---

## 2.8 FEATURES TRANSVERSALES

**Note** : Cette section documente les systèmes/fonctionnalités qui traversent plusieurs rôles et pages de l'application.

---

### 2.8.1 - Système de Gestion des Documents

**Contexte** : Documents gérés dans 2 contextes : biens (property_documents) et interventions (intervention_documents).

**Tests Fonctionnels - Upload**
- [ ] **Zone drop** : Drag-drop zone active (highlight border bleu on dragover)
- [ ] **Click upload** : Clic zone → File picker ouvert
- [ ] **Formats supportés** : PDF, JPG, PNG, DOCX acceptés (validation côté client + serveur)
- [ ] **Taille max** : 10MB par fichier, inline error si dépassé
- [ ] **Multi-upload** : Sélection multiple fichiers → Uploads simultanés (max 5 parallèles)
- [ ] **Progress bars** : Progress individuel par fichier (0-100%)
- [ ] **Cancel upload** : Bouton X pendant upload → Upload annulé, fichier retiré liste
- [ ] **Success** : Toast "X fichier(s) uploadé(s)", thumbnails affichés, liste refresh
- [ ] **Fail** : Toast error avec raison (format, taille, network), retry possible
- [ ] **Metadata auto** : uploaded_by, uploaded_at, file_size, mime_type saved automatiquement

**Tests Fonctionnels - Visibilité (Property Documents uniquement)**
- [ ] **Select "Visibilité"** : Options "equipe" (managers only), "locataire" (managers + tenant)
- [ ] **Default** : "equipe" par défaut
- [ ] **RLS enforcement** : Locataire voit uniquement docs "locataire", gestionnaire voit tous
- [ ] **Badge visibility** : Badge "Équipe" ou "Locataire" sur chaque document

**Tests Fonctionnels - Preview & Download**
- [ ] **Click document** : Image/PDF → Modal preview (voir 2.7.17), autres → Download direct
- [ ] **Bouton "Télécharger"** : Download file avec nom original
- [ ] **Preview image** : Affiche image inline, zoom in/out fonctionne
- [ ] **Preview PDF** : iframe PDF viewer, scroll pages fonctionne
- [ ] **Preview autres** : Message "Preview non disponible - Télécharger pour ouvrir"

**Tests Fonctionnels - Suppression**
- [ ] **Bouton "Supprimer"** : Modal confirmation (voir 2.7.16)
- [ ] **Permissions** : Uploader ou gestionnaire peut supprimer
- [ ] **Submit** : Soft delete (deleted_at updated), fichier storage conservé (archivage)
- [ ] **Success** : Toast "Document supprimé", doc disparaît liste

**Tests Fonctionnels - Catégorisation (Intervention Documents)**
- [ ] **Select "Type"** : quote, invoice, photo, report, other
- [ ] **Auto-catégorie** : Photos from prestataire → auto "photo", devis PDF → auto "quote"
- [ ] **Filtres** : Filter docs par type dans liste
- [ ] **Icon type** : Icon adapté selon type (€ quote, 📄 invoice, 📷 photo, 📊 report)

**Sécurité**
- [ ] **Storage RLS** : Supabase Storage RLS policies (user_id ou team_id path)
- [ ] **Virus scan** : Files scannés ClamAV (optionnel, si configuré)
- [ ] **Direct URLs expiry** : Signed URLs expirent après 1h

**UI/UX**
- [ ] **Grid layout** : Documents en grid responsive (1 col mobile, 3 cols desktop)
- [ ] **Thumbnails** : Preview thumbnail images, icon PDF/DOC, size displayed
- [ ] **Empty state** : "Aucun document - Glissez vos fichiers ici"
- [ ] **Loading skeleton** : Skeleton cards pendant chargement

**Critères d'Acceptation**
- **PASS** : Upload → Storage + DB + RLS + Preview + Download + Delete fonctionnent
- **FAIL** : Si upload échoue, ou RLS pas respecté, ou preview cassée

---

### 2.8.2 - Système de Conversations (Chat Intervention)

**Contexte** : Conversations liées aux interventions, 4 types de threads.

**Tests Fonctionnels - Threads**
- [ ] **Thread "group"** : Tous participants (gestionnaires, locataire, prestataire) voient messages
- [ ] **Thread "managers_only"** : Uniquement gestionnaires team voient/écrivent
- [ ] **Thread "tenant_to_managers"** : Locataire + gestionnaires, prestataire ne voit pas
- [ ] **Thread "provider_to_managers"** : Prestataire + gestionnaires, locataire ne voit pas
- [ ] **Tabs threads** : UI affiche tabs threads disponibles selon rôle
- [ ] **Badge unread** : Badge count messages non lus par thread
- [ ] **Default thread** : Thread "group" sélectionné par défaut

**Tests Fonctionnels - Messages**
- [ ] **Textarea message** : Input avec placeholder "Écrire un message...", autogrow height
- [ ] **Bouton "Envoyer"** : Enabled si message non vide, disabled si vide
- [ ] **Keyboard submit** : Ctrl+Enter envoie message (Cmd+Enter Mac)
- [ ] **Enter new line** : Enter simple → new line (pas submit)
- [ ] **Submit SUCCESS** : Message ajouté DB, apparaît liste immédiatement, textarea cleared
- [ ] **Submit FAIL** : Toast error, message reste textarea

**Tests Fonctionnels - Affichage**
- [ ] **Liste messages** : Chronologique ascendant (plus ancien en haut), scroll auto vers bas
- [ ] **Message card** : Avatar sender, nom sender, timestamp relative, content, attachments
- [ ] **Own message** : Aligné droite, background différent (bleu clair)
- [ ] **Others message** : Aligné gauche, background gris clair
- [ ] **Timestamp** : "Il y a 5 min", "Hier à 14h30", etc.
- [ ] **Date separators** : Separator "Aujourd'hui", "Hier", "20 Jan 2025" entre groupes dates

**Tests Fonctionnels - Attachments**
- [ ] **Bouton "Joindre"** : Icon paperclip, click → File picker
- [ ] **Upload attachment** : Image/PDF, max 5MB
- [ ] **Preview pending** : Thumbnail attachment pendant upload, cancel possible
- [ ] **Attachment sent** : Thumbnail cliquable dans message
- [ ] **Click attachment** : Modal preview (voir 2.7.17) ou download

**Tests Fonctionnels - Real-time**
- [ ] **New message** : Nouveau message autre user apparaît auto (Supabase Realtime subscription)
- [ ] **Typing indicator** : "X est en train d'écrire..." affiché quand user tape (optionnel)
- [ ] **Read receipts** : Checkmarks ✓ (sent), ✓✓ (delivered), ✓✓ bleu (read) (optionnel)
- [ ] **Online status** : Dot vert users online (optionnel)

**Tests Fonctionnels - Recherche**
- [ ] **Search messages** : Input search, cherche full-text dans messages thread
- [ ] **Highlight results** : Résultats highlighted jaune
- [ ] **Scroll to result** : Click résultat → Scroll vers message

**Sécurité**
- [ ] **RLS threads** : can_view_conversation(thread_id) vérifie rôle + intervention assignment
- [ ] **RLS messages** : Inherited from thread RLS
- [ ] **Attachments RLS** : Storage RLS vérifie thread_id path

**UI/UX**
- [ ] **Auto-scroll** : Scroll vers bas au chargement et nouveau message
- [ ] **Scroll indicators** : "Nouveau messages ↓" si scroll pas en bas + nouveaux messages
- [ ] **Emoji picker** : Bouton emoji → Picker (optionnel)
- [ ] **Markdown support** : **bold**, _italic_, `code` supportés (optionnel)
- [ ] **Loading states** : Skeleton messages pendant chargement

**Critères d'Acceptation**
- **PASS** : Messages envoyés + real-time fonctionne + threads RLS correct + attachments OK
- **FAIL** : Si messages pas envoyés, ou real-time cassé, ou mauvais threads visibles

---

### 2.8.3 - PWA (Progressive Web App)

**Tests Fonctionnels - Installation**
- [ ] **Manifest** : /manifest.json accessible, contient name, icons, theme_color, start_url
- [ ] **Service Worker** : /sw.js registered, installe au chargement page
- [ ] **Icons** : Icons 192x192, 512x512 présentes /public/icons/
- [ ] **Prompt install** : beforeinstallprompt event capturé, bouton "Installer" affiché
- [ ] **Installation Chrome/Edge** : Bouton → Prompt natif → Install → App ajoutée home screen
- [ ] **Installation Safari iOS** : Instructions "Ajouter à l'écran d'accueil" via Share → Add to Home Screen
- [ ] **Post-install** : App ouvre standalone (sans barre navigateur), splash screen affiché

**Tests Fonctionnels - Mode Offline**
- [ ] **Cache stratégie** : Cache-first pour assets statiques (JS, CSS, images)
- [ ] **Cache stratégie** : Network-first pour API calls avec cache fallback
- [ ] **Offline page** : Si pas de network + page pas cached → /offline.html affiché
- [ ] **Sync background** : Requêtes POST queued si offline, re-sent quand online (Background Sync API)
- [ ] **Toast offline** : Toast "Mode hors ligne" affiché quand network perdu
- [ ] **Toast online** : Toast "Connexion rétablie" quand network retour

**Tests Fonctionnels - Push Notifications**
- [ ] **Permission request** : Prompt "Autoriser notifications" au toggle settings
- [ ] **Permission granted** : Token FCM saved DB (push_subscriptions table)
- [ ] **Permission denied** : Toggle disabled, message "Autorisations refusées"
- [ ] **Receive notification** : Notification affichée OS native (titre, body, icon)
- [ ] **Click notification** : Click → App ouvre page correspondante (ex: intervention/[id])
- [ ] **Notification actions** : Actions inline ("Voir", "Ignorer") fonctionnent (optionnel)
- [ ] **Badge count** : Badge app icon affiche count notifications (optionnel)

**Tests Fonctionnels - Update**
- [ ] **New version detection** : Service worker détecte nouvelle version
- [ ] **Update prompt** : Toast "Nouvelle version disponible - Recharger ?" avec CTA
- [ ] **Skip waiting** : Click "Recharger" → skipWaiting() → Page reload → Nouvelle version active
- [ ] **No disruption** : Utilisateur peut continuer utiliser app pendant update

**Tests Multi-Plateformes**
- [ ] **Desktop Chrome** : Install, offline, push OK
- [ ] **Desktop Edge** : Install, offline, push OK
- [ ] **Mobile Chrome Android** : Install, offline, push OK
- [ ] **Mobile Safari iOS** : Install (Add to Home), offline OK, push NON (iOS limitation)
- [ ] **Desktop Firefox** : Offline OK, install partiel (pas de prompt beforeinstallprompt)

**Sécurité**
- [ ] **HTTPS** : PWA nécessite HTTPS (sauf localhost)
- [ ] **Service Worker scope** : Scope limité à / (pas d'override malveillant)

**UI/UX**
- [ ] **Splash screen** : Logo + background theme pendant chargement standalone
- [ ] **Status bar** : Status bar couleur theme (Android)
- [ ] **No browser chrome** : Standalone mode pas de barre URL

**Critères d'Acceptation**
- **PASS** : Install → Standalone OK, Offline → Cache fallback OK, Push → Notifications reçues
- **FAIL** : Si install impossible, ou offline crash, ou push pas reçues

---

### 2.8.4 - Système de Recherche & Filtrage

**Contexte** : Recherche/filtrage présent sur listes (interventions, biens, contacts).

**Tests Fonctionnels - Recherche**
- [ ] **Input search** : Placeholder "Rechercher...", icon magnifier, debounce 300ms
- [ ] **Search query** : Tape requête → Filtre liste real-time (côté client si < 100 items, sinon API)
- [ ] **Search scope** : Cherche dans champs pertinents (nom, référence, adresse, email selon entité)
- [ ] **Highlight results** : Texte match highlighted jaune dans cards
- [ ] **Clear search** : Bouton X dans input → Clear query → Liste full restored
- [ ] **No results** : Si aucun résultat → Message "Aucun résultat pour '{query}'"
- [ ] **Case insensitive** : Recherche insensible casse

**Tests Fonctionnels - Filtres**
- [ ] **Filtres multi-critères** : Dropdowns/checkboxes filtres (statut, type, date, etc.)
- [ ] **Apply filters** : Sélection filtre → Liste filtrée immédiatement
- [ ] **Combine filters** : AND logic entre filtres (ex: status=en_cours AND type=plomberie)
- [ ] **Active filters badges** : Badges filtres actifs affichés (ex: "Status: En cours ✕", "Type: Plomberie ✕")
- [ ] **Remove filter** : Click ✕ badge → Filtre retiré → Liste refresh
- [ ] **Reset filters** : Bouton "Réinitialiser" → Tous filtres cleared
- [ ] **Persist filters** : Filtres persistés session (localStorage) → Refresh page → Filtres restored

**Tests Fonctionnels - Tri**
- [ ] **Select sort** : Dropdown tri (ex: "Date croissante", "Date décroissante", "Nom A-Z")
- [ ] **Apply sort** : Sélection → Liste triée immédiatement
- [ ] **Default sort** : Tri par défaut logique (ex: date desc pour interventions)
- [ ] **Icon sort** : Icon ↑↓ indique sens tri

**Tests Fonctionnels - Pagination**
- [ ] **Items par page** : 10/20/50 items (selon liste)
- [ ] **Boutons pagination** : [Précédent] [1] [2] [3] [...] [10] [Suivant]
- [ ] **Current page** : Page courante highlighted
- [ ] **Click page** : Click numéro → Charge page
- [ ] **Disabled buttons** : Précédent disabled page 1, Suivant disabled dernière page
- [ ] **Infinite scroll** : Alternative pagination → Scroll bas → Charge next page auto (optionnel)
- [ ] **Total count** : Affiche "X résultats" total

**Tests Performance**
- [ ] **Debounce** : Search debounced 300ms (pas de requête chaque keystroke)
- [ ] **Throttle scroll** : Infinite scroll throttled (pas de requête chaque pixel scroll)
- [ ] **Loading states** : Skeleton items pendant fetch data
- [ ] **Cancel requests** : Requêtes annulées si nouvelle recherche avant réponse (AbortController)

**UI/UX**
- [ ] **Filters sidebar** : Desktop → Sidebar gauche filters, mobile → Drawer bottom
- [ ] **Active count** : Badge "X filtres actifs" si filtres appliqués
- [ ] **Clear all** : Bouton "Tout effacer" visible si search + filters actifs
- [ ] **Shortcuts** : Ctrl+F focus search input

**Critères d'Acceptation**
- **PASS** : Search + Filters + Tri + Pagination fonctionnent, performance OK
- **FAIL** : Si search lag, ou filtres combinent mal, ou pagination cassée

---

### 2.8.5 - Système de Real-time Updates

**Contexte** : Supabase Realtime Channels pour updates live.

**Tests Fonctionnels - Subscriptions**
- [ ] **Subscribe interventions** : Page intervention → Subscribe channel "interventions:{id}"
- [ ] **Subscribe conversations** : Page chat → Subscribe channel "conversations:{thread_id}"
- [ ] **Subscribe notifications** : Header notifications → Subscribe channel "notifications:{user_id}"
- [ ] **Subscribe listes** : Liste interventions → Subscribe channel "interventions:team:{team_id}" (optionnel)

**Tests Fonctionnels - Events**
- [ ] **Event INSERT** : Nouveau message → Apparaît liste immédiatement sans refresh
- [ ] **Event UPDATE** : Intervention status updated → Badge statut mis à jour UI immédiatement
- [ ] **Event DELETE** : Document deleted → Card document disparaît UI immédiatement
- [ ] **Event latency** : Latency < 500ms entre action et update UI

**Tests Fonctionnels - Presence**
- [ ] **User presence** : Supabase Presence track users online sur intervention (optionnel)
- [ ] **Online indicators** : Dots verts users online affichés
- [ ] **Offline detection** : User disconnect → Dot devient gris

**Tests Fonctionnels - Reliability**
- [ ] **Reconnection** : Si connection perdue → Auto-reconnect exponential backoff
- [ ] **Sync after reconnect** : Après reconnect → Fetch missed updates (polling fallback)
- [ ] **Multiple tabs** : Updates sync entre tabs (Broadcast Channel API)

**Tests Performance**
- [ ] **Unsubscribe** : Leave page → Unsubscribe channel (cleanup)
- [ ] **Batch updates** : Multiple updates proches → Batched (debounce 100ms)

**UI/UX**
- [ ] **Toast notifications** : Nouveau message → Toast "Nouveau message de {user}"
- [ ] **Badge animations** : Badge count anime (pulse) sur nouvelle notification
- [ ] **Sound notifications** : Son notification si préférence activée (optionnel)

**Critères d'Acceptation**
- **PASS** : Real-time updates < 500ms, reconnect OK, sync multi-tabs OK
- **FAIL** : Si updates > 2s, ou reconnect échoue, ou tabs désynchronisées

---

# 3. MATRICE DE COUVERTURE

## 3.1 Matrice Fonctionnalités × Rôles

| Fonctionnalité | Admin | Gestionnaire | Prestataire | Locataire | Proprietaire | Tests |
|----------------|-------|--------------|-------------|-----------|--------------|-------|
| **Authentification** |
| Login | ✅ | ✅ | ✅ | ✅ | ✅ | □ Chrome □ Firefox □ Safari □ Edge |
| Signup (invitation) | ❌ | ✅ | ✅ | ✅ | ✅ | □ Chrome □ Firefox □ Safari □ Edge |
| Set Password (F1.5) | ✅ | ✅ | ✅ | ✅ | ✅ | □ Chrome □ Firefox □ Safari □ Edge |
| Email Confirmation (F1.6) | ✅ | ✅ | ✅ | ✅ | ✅ | □ Chrome □ Firefox □ Safari □ Edge |
| OAuth Login (F1.7) | ✅ | ✅ | ✅ | ✅ | ✅ | □ Chrome □ Firefox □ Safari □ Edge |
| Signup Success (F1.8) | ✅ | ✅ | ✅ | ✅ | ✅ | □ Chrome □ Firefox □ Safari □ Edge |
| Reset password | ✅ | ✅ | ✅ | ✅ | ✅ | □ Chrome □ Firefox □ Safari □ Edge |
| Logout | ✅ | ✅ | ✅ | ✅ | ✅ | □ Chrome □ Firefox □ Safari □ Edge |
| **Gestion Biens** |
| CRUD Immeubles | ❌ | ✅ | ❌ | ❌ | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| CRUD Lots | ❌ | ✅ | ❌ | ❌ | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Voir Biens | ✅ (all) | ✅ (team) | ✅ (assigned) | ✅ (own lot) | ✅ (owned) | □ Chrome □ Firefox □ Safari □ Edge |
| Upload docs propriété | ❌ | ✅ | ❌ | ❌ | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| **Gestion Contacts** |
| Créer contacts | ❌ | ✅ | ❌ | ❌ | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Inviter contacts | ❌ | ✅ | ❌ | ❌ | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Voir annuaire | ❌ | ✅ (team) | ✅ (team) | ✅ (team) | ✅ (team) | □ Chrome □ Firefox □ Safari □ Edge |
| **Interventions** |
| Créer demande | ❌ | ✅ (all lots) | ❌ | ✅ (own lot) | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Approuver/Rejeter | ❌ | ✅ | ❌ | ❌ | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Demander devis | ❌ | ✅ | ❌ | ❌ | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Soumettre devis | ❌ | ❌ | ✅ (assigned) | ❌ | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Valider devis | ❌ | ✅ | ❌ | ❌ | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Planification | ❌ | ✅ (decision) | ✅ (dispos) | ✅ (dispos) | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Démarrer travaux | ❌ | ❌ | ✅ (assigned) | ❌ | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Marquer terminé | ❌ | ❌ | ✅ (assigned) | ❌ | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Valider travaux | ❌ | ❌ | ❌ | ✅ (assigned) | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Clôturer | ❌ | ✅ | ❌ | ❌ | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Annuler | ❌ | ✅ (always) | ❌ | ✅ (if demande) | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Voir interventions | ✅ (all) | ✅ (team) | ✅ (assigned) | ✅ (assigned) | ✅ (owned biens) | □ Chrome □ Firefox □ Safari □ Edge |
| **Gestion Documents (F7)** |
| Upload document propriété | ❌ | ✅ | ❌ | ❌ | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Preview document | ❌ | ✅ | ❌ | ✅ (si partagé) | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Download document | ❌ | ✅ | ❌ | ✅ (si partagé) | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Delete document | ❌ | ✅ | ❌ | ❌ | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| **Communication & Conversations (F6)** |
| Créer thread conversation | ❌ | ✅ | ✅ (assigned) | ✅ (assigned) | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Envoyer message | ❌ | ✅ | ✅ (assigned) | ✅ (assigned) | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Joindre fichier message | ❌ | ✅ | ✅ (assigned) | ✅ (assigned) | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Voir threads (role-based) | ❌ | ✅ (all 4 types) | ✅ (2 types) | ✅ (2 types) | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Real-time messaging | ❌ | ✅ | ✅ (assigned) | ✅ (assigned) | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| Upload docs intervention | ❌ | ✅ | ✅ (assigned) | ✅ (assigned) | ❌ | □ Chrome □ Firefox □ Safari □ Edge |
| **PWA & Push Notifications (F8)** |
| Installer PWA | ✅ | ✅ | ✅ | ✅ | ✅ | □ Chrome □ Firefox □ Safari □ Edge |
| Activer push notifications | ✅ | ✅ | ✅ | ✅ | ✅ | □ Chrome □ Firefox □ Safari □ Edge |
| Recevoir push notifications | ✅ (pertinentes) | ✅ (pertinentes) | ✅ (pertinentes) | ✅ (pertinentes) | ✅ (pertinentes) | □ Chrome □ Firefox □ Safari □ Edge |
| Cliquer notification (deeplink) | ✅ | ✅ | ✅ | ✅ | ✅ | □ Chrome □ Firefox □ Safari □ Edge |
| **Recherche & Filtrage (F9)** |
| Recherche globale (header) | ✅ (all) | ✅ (team) | ✅ (assigned) | ✅ (own) | ✅ (owned) | □ Chrome □ Firefox □ Safari □ Edge |
| Filtrage interventions | ✅ (all) | ✅ (team) | ✅ (assigned) | ✅ (own) | ✅ (owned) | □ Chrome □ Firefox □ Safari □ Edge |
| Tri colonnes table | ✅ | ✅ | ✅ | ✅ | ✅ | □ Chrome □ Firefox □ Safari □ Edge |
| Pagination résultats | ✅ | ✅ | ✅ | ✅ | ✅ | □ Chrome □ Firefox □ Safari □ Edge |
| **Notifications** |
| Voir notifications | ✅ (all) | ✅ (own) | ✅ (own) | ✅ (own) | ✅ (own) | □ Chrome □ Firefox □ Safari □ Edge |
| Marquer lu/archivé | ✅ | ✅ | ✅ | ✅ | ✅ | □ Chrome □ Firefox □ Safari □ Edge |

**Légende checkboxes** :
- ✅ : Fonctionnalité disponible pour ce rôle
- ❌ : Fonctionnalité indisponible
- □ : Checkbox test navigateur (à cocher après test réussi)

---

## 3.2 Matrice Navigateurs × Devices

| Page Critique | Chrome | Firefox | Safari | Edge | Mobile iOS | Mobile Android | Tablet |
|---------------|--------|---------|--------|------|------------|----------------|--------|
| **Authentification (F1)** |
| /auth/login | □ | □ | □ | □ | □ | □ | □ |
| /auth/signup | □ | □ | □ | □ | □ | □ | □ |
| /auth/set-password (F1.5) | □ | □ | □ | □ | □ | □ | □ |
| /auth/confirm (F1.6) | □ | □ | □ | □ | □ | □ | □ |
| /auth/callback (F1.7) | □ | □ | □ | □ | □ | □ | □ |
| /auth/signup-success (F1.8) | □ | □ | □ | □ | □ | □ | □ |
| **Dashboards & Biens** |
| /gestionnaire/dashboard | □ | □ | □ | □ | □ | □ | □ |
| /gestionnaire/biens/immeubles/nouveau | □ | □ | □ | □ | □ | □ | □ |
| /gestionnaire/biens/lots/nouveau | □ | □ | □ | □ | □ | □ | □ |
| /prestataire/dashboard | □ | □ | □ | □ | □ | □ | □ |
| /locataire/dashboard | □ | □ | □ | □ | □ | □ | □ |
| **Interventions** |
| /gestionnaire/interventions/[id] | □ | □ | □ | □ | □ | □ | □ |
| /gestionnaire/interventions/nouvelle-intervention | □ | □ | □ | □ | □ | □ | □ |
| /locataire/interventions/new | □ | □ | □ | □ | □ | □ | □ |
| /locataire/interventions/[id] | □ | □ | □ | □ | □ | □ | □ |
| **Conversations (F6)** |
| Conversation tab (interventions/[id]) | □ | □ | □ | □ | □ | □ | □ |
| Real-time messaging | □ | □ | □ | □ | □ | □ | □ |
| File upload conversation | □ | □ | □ | □ | □ | □ | □ |
| **Documents (F7)** |
| Upload document modal | □ | □ | □ | □ | □ | □ | □ |
| Preview document modal (PDF/Image) | □ | □ | □ | □ | □ | □ | □ |
| Download document | □ | □ | □ | □ | □ | □ | □ |
| **PWA (F8)** |
| PWA installation prompt | □ | □ | □ | □ | □ | □ | □ |
| PWA installed (standalone mode) | □ | □ | □ | □ | □ | □ | □ |
| Push notification activation | □ | □ | □ | □ | □ | □ | □ |
| Push notification reception | □ | □ | □ | □ | □ | □ | □ |
| Notification deeplink (click) | □ | □ | □ | □ | □ | □ | □ |
| **Recherche (F9)** |
| Recherche globale (header) | □ | □ | □ | □ | □ | □ | □ |
| Filtrage interventions avancé | □ | □ | □ | □ | □ | □ | □ |

**Versions navigateurs supportées** :
- Chrome: Latest stable (v120+)
- Firefox: Latest stable (v120+)
- Safari: Latest stable (v17+, macOS + iOS)
- Edge: Latest stable (v120+)

**Devices prioritaires** :
- Mobile: iPhone 12+ (iOS 16+), Samsung Galaxy S21+ (Android 12+)
- Tablet: iPad Air (iOS 16+), Samsung Tab S8
- Desktop: Windows 10/11, macOS 13+

---

# 4. GABARIT DE RAPPORT DE BUG

## Template Standardisé

```markdown
# BUG-XXXX: [Titre court descriptif]

## 🔴 Sévérité
[ ] **Blocker** - Bloque release, fonctionnalité critique cassée, perte données
[ ] **Major** - Fonctionnalité importante cassée, workaround difficile
[ ] **Minor** - Bug cosmétique, fonctionnalité secondaire, workaround facile
[ ] **Trivial** - Typo, alignement, suggestion amélioration

## 🔁 Fréquence
[ ] **Always** - 100% reproductible
[ ] **Sometimes** - 50-99% reproductible
[ ] **Rare** - < 50% reproductible

## 📋 Environnement
- **URL** : https://...
- **Build/Commit** : [hash commit ou version]
- **Navigateur** : Chrome 120.0.6099.109 (ou Firefox, Safari, Edge)
- **OS** : Windows 11 / macOS 13 / iOS 17 / Android 13
- **Device** : Desktop / iPhone 14 / Samsung Galaxy S22
- **Screen size** : 1920x1080 / 375x812 (mobile)
- **Rôle connecté** : Admin / Gestionnaire / Prestataire / Locataire / Proprietaire
- **Team ID** : [uuid team si pertinent]

## ✅ Préconditions
1. User logged in as [rôle]
2. Building/Lot/Intervention [id] existe
3. [Autres préconditions nécessaires]

## 🔢 Étapes de Reproduction
1. Naviguer vers [URL]
2. Cliquer sur [Bouton/Élément]
3. Remplir champ [Nom] avec valeur "[Valeur]"
4. Soumettre formulaire
5. Observer résultat

## ❌ Résultat Observé
[Description précise du comportement actuel]
- Error message affiché : "[Message exact]"
- UI state : [Description état UI]
- Console errors : [Voir screenshot console]

## ✅ Résultat Attendu
[Description comportement correct attendu]
- Toast success : "[Message attendu]"
- Redirect : /[route attendue]
- Data created : [Données DB attendues]

## 📸 Pièces Jointes
- Screenshot UI : [Lien ou fichier]
- Screenshot console : [Lien ou fichier]
- Video repro : [Lien ou fichier]
- HAR file (Network) : [Si requêtes réseau concernées]
- Logs backend : [Si erreur serveur]

## 🔍 Logs Console
```
[Copier/coller logs console JavaScript]
Error: ...
  at ...
```

## 📊 Impact Utilisateur
[Description impact sur utilisateurs]
- Bloque workflow : Oui/Non
- Nombre users affectés : [Estimation]
- Workaround possible : [Description workaround si existe]

## 🏷️ Labels
- Composant : [Auth / Biens / Interventions / Contacts / Notifications / etc.]
- Rôle : [Admin / Gestionnaire / Prestataire / Locataire / Proprietaire]
- Type : [Bug / Régression / Performance / Sécurité]

## 💡 Notes Supplémentaires
[Informations contextuelles, hypothèses causes, tentatives debug, etc.]
```

---

# 5. QUESTIONS OUVERTES & HYPOTHÈSES

## 5.1 Questions Nécessitant Clarification

### Authentification & Sécurité
1. **Email verification activée ?**
   - ❓ Question : Le workflow signup nécessite-t-il vérification email avant activation compte ?
   - 💡 Hypothèse : NON (basé sur code, pas de vérification email trouvée)
   - 📝 Impact tests : Si OUI, ajouter tests vérification email flow

2. **2FA (Two-Factor Auth) implémenté ?**
   - ❓ Question : 2FA activé pour admin ou tous rôles ?
   - 💡 Hypothèse : NON (pas trouvé dans code)
   - 📝 Impact tests : Si OUI, ajouter tests 2FA flow (TOTP, SMS)

3. **Rate limiting précis**
   - ❓ Question : Limites exactes (login, reset password, invitations) ?
   - 💡 Hypothèse : 5 tentatives login, 3 reset password/h (mentionné docs)
   - 📝 Impact tests : Valider limites exactes, comportement après expiration

4. **OAuth providers supportés ?**
   - ❓ Question : Google, Microsoft, GitHub OAuth activés ?
   - 💡 Hypothèse : Préparé (Supabase Auth) mais pas activé
   - 📝 Impact tests : Si activé, ajouter tests OAuth flow complet

### Workflow Interventions
5. **Devis externe (hors plateforme)**
   - ❓ Question : Flow devis prestataire externe (email) implémenté ?
   - 💡 Hypothèse : Partiellement (code présent, Resend pas configuré)
   - 📝 Impact tests : Tester envoi email externe, magic link temporaire

6. **Annulation intervention règles métier**
   - ❓ Question : Qui peut annuler à quel statut ? Remboursement devis ?
   - 💡 Hypothèse : Gestionnaire toujours, Locataire si demande uniquement (basé code)
   - 📝 Impact tests : Vérifier toutes transitions annulation, impact financier

7. **Intervention de suivi automatique**
   - ❓ Question : Clôture avec follow_up_required crée auto nouvelle intervention ?
   - 💡 Hypothèse : NON auto, gestionnaire redirigé wizard pré-rempli
   - 📝 Impact tests : Tester flow follow-up, data pré-remplie correcte

### Notifications & Communication
8. **Email notifications configuration**
   - ❓ Question : Resend configuré production ? Templates définis ?
   - 💡 Hypothèse : Planifié mais pas encore intégré (basé docs "à configurer")
   - 📝 Impact tests : Si intégré, tester tous templates email (invitation, reset, notifications)

9. **Push notifications Web**
   - ❓ Question : Service Worker enregistré ? Push subscriptions fonctionnent ?
   - 💡 Hypothèse : Code présent (push_subscriptions table) mais pas testé
   - 📝 Impact tests : Tester workflow complet push (subscribe, receive, click notification)

10. **Realtime notifications refresh**
    - ❓ Question : Polling interval ? Supabase Channels utilisé ?
    - 💡 Hypothèse : Supabase Channels pour chat, polling pour notifications dashboard
    - 📝 Impact tests : Vérifier latence notifications, multi-tab sync

### Documents & Upload
11. **Quota stockage**
    - ❓ Question : Limite stockage par team ? Par user ?
    - 💡 Hypothèse : Pas de limite implémentée actuellement (Supabase Storage limites par défaut)
    - 📝 Impact tests : Tester upload si quota atteint (si implémenté)

12. **Antivirus scan**
    - ❓ Question : Upload documents scannés antivirus ?
    - 💡 Hypothèse : NON (pas trouvé dans code)
    - 📝 Impact tests : Si implémenté, tester fichier malveillant bloqué

13. **Document validation gestionnaire**
    - ❓ Question : Documents intervention validés par gestionnaire (is_validated) ?
    - 💡 Hypothèse : Champ présent mais workflow pas implémenté UI
    - 📝 Impact tests : Si workflow ajouté, tester validation/rejet documents

### Permissions & RLS
14. **Admin bypass RLS scope**
    - ❓ Question : Admin voit toutes teams ou limité team assigné ?
    - 💡 Hypothèse : Admin voit toutes teams (multi-tenant admin)
    - 📝 Impact tests : Vérifier admin stats incluent toutes teams

15. **Proprietaire permissions exactes**
    - ❓ Question : Proprietaire peut modifier quoi exactement ? (docs mentions "read-only")
    - 💡 Hypothèse : Read-only complet (aucun write), basé code
    - 📝 Impact tests : Vérifier aucune action write visible/accessible proprietaire

### Performance & Caching
16. **Cache TTL configuration**
    - ❓ Question : TTL cache Redis par type query ?
    - 💡 Hypothèse : 5 min défaut (mentionné docs), configurable
    - 📝 Impact tests : Tester cache hit/miss, invalidation après mutation

17. **Pagination limites**
    - ❓ Question : Nombre items max par page ? Configurable user ?
    - 💡 Hypothèse : 20 items/page fixe (basé convention)
    - 📝 Impact tests : Tester pagination avec 100+ items, performance

### Internationalisation
18. **i18n activée ?**
    - ❓ Question : Multi-langue supporté ? Quelle(s) langue(s) ?
    - 💡 Hypothèse : Français uniquement actuellement, structure préparée i18n
    - 📝 Impact tests : Si multi-langue activée, tester switch langue, traductions complètes

19. **Timezone handling**
    - ❓ Question : Dates affichées timezone user ou UTC ?
    - 💡 Hypothèse : UTC stocké DB, affiché timezone browser user
    - 📝 Impact tests : Tester user différents timezones, consistency dates

### Intégrations Externes
20. **Google Maps integration**
    - ❓ Question : Liens Google Maps fonctionnels ? API key configurée ?
    - 💡 Hypothèse : Liens statiques (pas API embed), ouvrent Google Maps externe
    - 📝 Impact tests : Tester liens adresses, redirect Google Maps correct

---

## 5.2 Hypothèses par Défaut (Si Non Répondu)

Les hypothèses suivantes seront appliquées pendant tests sauf clarification contraire :

1. **Email verification** : Désactivée
2. **2FA** : Désactivé
3. **Rate limiting** : 5 tentatives login, 3 reset password/h
4. **OAuth** : Préparé mais désactivé
5. **Email notifications** : Planifié mais pas configuré (tester uniquement notifications in-app)
6. **Push Web** : Code présent mais pas testé (tests optionnels)
7. **Quota stockage** : Pas de limite implémentée
8. **Antivirus scan** : Non
9. **Admin scope** : Toutes teams (multi-tenant)
10. **Proprietaire** : Read-only complet
11. **Cache TTL** : 5 min défaut
12. **Pagination** : 20 items/page fixe
13. **Langue** : Français uniquement
14. **Timezone** : UTC DB, browser timezone affichage
15. **Google Maps** : Liens statiques externes

---

## 5.3 Points d'Attention Spécifiques

### Sécurité Critique
- ⚠️ **RLS Policies** : Vérifier systématiquement isolation multi-tenant (aucune fuite data entre teams)
- ⚠️ **Upload fichiers** : Tester fichiers malveillants (script injection), types non supportés
- ⚠️ **XSS** : Tester injection scripts dans champs texte (titre intervention, description, commentaires)
- ⚠️ **CSRF** : Vérifier tokens CSRF sur formulaires sensibles (suppression, clôture)

### Performance Critique
- ⚠️ **Chargement dashboard** : Max 3s (desktop), 5s (mobile)
- ⚠️ **API interventions liste** : Max 200ms p95 (20 items)
- ⚠️ **Upload documents** : Progress bar fluide, pas de freeze UI
- ⚠️ **Realtime chat** : Latence max 2s réception message

### UX Critique
- ⚠️ **Mobile navigation** : Tous workflows accessibles mobile (pas de blocage desktop-only)
- ⚠️ **Accessibilité** : Navigation clavier complète, WCAG AA contrast
- ⚠️ **Erreurs claires** : Messages erreur explicites (pas de "Error 500" générique)
- ⚠️ **Loading states** : Jamais d'UI freeze sans feedback visuel

---

**★ Insight ─────────────────────────────────────**
Ce plan de test manuel exhaustif couvre l'intégralité de l'application SEIDO avec une approche systématique : arbres décisionnels pour comprendre les flux, checklists détaillées pour chaque écran, matrices de couverture pour tracer les tests, et gabarit standardisé pour reporter les bugs. L'utilisation de checkboxes permet un suivi précis de l'avancement des tests. Les questions ouvertes identifient les zones d'ambiguïté nécessitant clarification avant exécution complète.
─────────────────────────────────────────────────

---

**FIN DU PLAN DE TEST MANUEL SEIDO**

**Statistiques Document** :
- **Sections** : 5 sections principales
- **Flux détaillés** : 10 flux majeurs (Auth, Biens, Contacts, Interventions complet)
- **Checklists écrans** : 25+ écrans documentés
- **Matrices** : 2 matrices couverture (Fonctionnalités × Rôles, Navigateurs × Devices)
- **Questions ouvertes** : 20 questions + hypothèses par défaut
- **Format** : Markdown structuré, checkboxes exécutables

**Utilisation Recommandée** :
1. **Phase 1 - Auth** : Commencer par tests authentification (critique)
2. **Phase 2 - CRUD Biens** : Tester création immeubles/lots (fondation)
3. **Phase 3 - Workflow Interventions** : Tester workflow complet 11 statuts (métier core)
4. **Phase 4 - Permissions** : Vérifier isolation multi-tenant, RLS policies
5. **Phase 5 - Régression** : Tests navigateurs × devices (matrice complète)

**Maintenance Document** :
- Mettre à jour après chaque release (nouveaux écrans, modifications workflow)
- Compléter matrices après tests (cocher checkboxes)
- Enrichir gabarit bugs avec patterns récurrents
- Résoudre questions ouvertes au fur et à mesure clarifications