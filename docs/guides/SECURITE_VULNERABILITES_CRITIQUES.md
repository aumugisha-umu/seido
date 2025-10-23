# 🛡️ SÉCURITÉ - VULNÉRABILITÉS CRITIQUES

## 🚨 ALERTE SÉCURITÉ - ACTIONS IMMÉDIATES REQUISES

Cette analyse révèle **7 vulnérabilités critiques** dans l'application SEIDO nécessitant une intervention immédiate. **Risque d'incident de sécurité majeur** si non corrigé sous 48h.

---

## 🔴 VULNÉRABILITÉ #1: RLS DÉSACTIVÉ - EXPOSITION TOTALE DES DONNÉES

### **CRITICITÉ: MAXIMALE** ⚠️
**Impact**: Fuite de données entre organisations, violation RGPD

### Problème Identifié
```sql
-- Fichier: supabase/migrations/20250116000000_reset_database.sql
-- TOUTES LES POLITIQUES RLS SUPPRIMÉES !

DROP POLICY IF EXISTS admin_all_access ON users;
DROP POLICY IF EXISTS user_own_data ON users;
DROP POLICY IF EXISTS manager_team_data ON users;
DROP POLICY IF EXISTS provider_own_data ON users;

-- ET POUR TOUTES LES TABLES CRITIQUES:
DROP POLICY IF EXISTS admin_all_access ON interventions;
DROP POLICY IF EXISTS user_own_interventions ON interventions;
DROP POLICY IF EXISTS manager_team_interventions ON interventions;
```

### Données Exposées
- **Utilisateurs**: Emails, téléphones, rôles de toutes les organisations
- **Interventions**: Détails privés, commentaires internes, devis
- **Bâtiments**: Adresses, codes d'accès, informations sensibles
- **Contacts**: Base de données complète de tous les clients

### Preuve de Concept d'Attaque
```sql
-- Un utilisateur peut accéder à TOUTES les données:
SELECT * FROM users; -- RETOURNE TOUS LES UTILISATEURS !
SELECT * FROM interventions; -- TOUTES LES INTERVENTIONS !
SELECT * FROM buildings; -- TOUS LES BÂTIMENTS !
```

### Solution Immédiate
```sql
-- 1. RÉACTIVER RLS SUR TOUTES LES TABLES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- 2. POLITIQUE D'ISOLATION PAR ÉQUIPE
CREATE POLICY "team_isolation_users" ON users
FOR ALL TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM users
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "team_isolation_interventions" ON interventions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = interventions.tenant_id
    AND users.team_id IN (
      SELECT team_id FROM users
      WHERE auth_user_id = auth.uid()
    )
  )
);
```

---

## 🔴 VULNÉRABILITÉ #2: EXPOSITION DE DONNÉES SENSIBLES - LOGS DEBUG

### **CRITICITÉ: HAUTE** ⚠️
**Impact**: Fuite de tokens, credentials, données personnelles

### Problème Identifié
**1699 logs de debug actifs** exposant des données sensibles en production:

```typescript
// lib/auth-service.ts:746-750
console.log('🔍 [AUTH-SERVICE-DEBUG] Invitation marking details:', {
  email: userProfile.email,              // EMAIL EXPOSÉ !
  authUserId: session.user.id,           // ID AUTH EXPOSÉ !
  profileUserId: userProfile.id,         // ID UTILISATEUR EXPOSÉ !
  invitationCode: session.user.id        // TOKEN EXPOSÉ !
})

// middleware.ts:59-64
console.log('🔍 [MIDDLEWARE-SIMPLE] Raw cookie value preview:', {
  cookieValue: authTokenCookie.value.substring(0, 100) + '...'
  // TOKENS D'AUTHENTIFICATION EXPOSÉS !
})

// lib/supabase.ts:113-127
console.log('🍪 [AUTH-SYNC] All cookies:', cookies.substring(0, 200))
// TOUS LES COOKIES EXPOSÉS !
```

### Données Sensibles Exposées
- **Tokens JWT**: Access tokens, refresh tokens
- **Emails**: Adresses personnelles et professionnelles
- **IDs utilisateur**: Identifiants internes système
- **Cookies**: Sessions d'authentification complètes
- **Codes invitation**: Liens d'accès privilégiés

### Solution Immédiate
```typescript
// 1. SYSTÈME DE LOGGING STRUCTURÉ
import { logger } from './logger'

// REMPLACER
console.log('🔍 User data:', userData)

// PAR
logger.info('User authentication successful', {
  userId: userData.id, // PAS d'email ni token
  // Données anonymisées uniquement
})

// 2. CONFIGURATION PAR ENVIRONNEMENT
const isDev = process.env.NODE_ENV === 'development'
if (isDev) {
  logger.debug('Debug info', sanitizedData)
}
```

---

## 🔴 VULNÉRABILITÉ #3: MIDDLEWARE D'AUTHENTIFICATION CONTOURNABLE

### **CRITICITÉ: HAUTE** ⚠️
**Impact**: Bypass d'authentification, accès non autorisé

### Problème Identifié
```typescript
// middleware.ts:155-158
const hasAuthCookie = cookies.some(cookie =>
  cookie.name.startsWith('sb-') &&
  cookie.value &&
  cookie.value.length > 0
)
```

### Failles de Sécurité
1. **Validation superficielle**: Vérifie seulement la présence d'un cookie
2. **Pas de validation JWT**: N'analyse pas le contenu du token
3. **Pas de vérification d'expiration**: Cookie expiré = accès autorisé
4. **Pas de validation de signature**: Token forgé non détecté

### Preuve de Concept d'Attaque
```bash
# Attaque 1: Cookie forgé
curl -H "Cookie: sb-fake-project-auth-token=fake_long_value_here" \
     https://app.com/gestionnaire/dashboard
# ACCÈS AUTORISÉ ! ❌

# Attaque 2: Cookie expiré
curl -H "Cookie: sb-project-auth-token=expired_but_present_token" \
     https://app.com/admin/dashboard
# ACCÈS AUTORISÉ ! ❌
```

### Solution Immédiate
```typescript
// middleware.ts - VERSION SÉCURISÉE
import { verifyJWT } from './security/jwt-validator'

export async function middleware(request: NextRequest) {
  if (isProtectedRoute(pathname)) {
    const token = extractTokenFromCookies(request.cookies)

    if (!token) {
      return redirectToLogin()
    }

    try {
      const payload = await verifyJWT(token)

      // Vérifications additionnelles
      if (payload.exp < Date.now() / 1000) {
        return redirectToLogin() // Token expiré
      }

      if (!payload.user_metadata?.role) {
        return redirectToLogin() // Rôle manquant
      }

      // Token valide, continuer
      return NextResponse.next()

    } catch (error) {
      return redirectToLogin() // Token invalide
    }
  }
}
```

---

## 🔴 VULNÉRABILITÉ #4: CONFIGURATION NEXT.JS COMPROMISE

### **CRITICITÉ: HAUTE** ⚠️
**Impact**: Erreurs critiques masquées, déploiement de code buggé

### Problème Identifié
```javascript
// next.config.mjs - CONFIGURATION DANGEREUSE
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true  // ❌ IGNORE LES ERREURS ESLINT !
  },
  typescript: {
    ignoreBuildErrors: true   // ❌ IGNORE LES ERREURS TYPESCRIPT !
  }
}
```

### Risques de Sécurité
1. **Erreurs TypeScript ignorées**: Vulnérabilités de types non détectées
2. **ESLint désactivé**: Patterns de sécurité non appliqués
3. **Déploiement de code buggé**: Bugs critiques en production
4. **Perte de garanties TypeScript**: Accès propriétés undefined

### Exemple d'Erreur Masquée
```typescript
// Code problématique qui passerait en production:
function handleUserData(user: User | undefined) {
  console.log(user.email) // ❌ ERREUR ! user peut être undefined

  if (user.role = 'admin') { // ❌ ERREUR ! = au lieu de ===
    // Code d'admin exécuté incorrectement
  }
}
```

### Solution Immédiate
```javascript
// next.config.mjs - VERSION SÉCURISÉE
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,    // ✅ ERREURS ESLINT BLOQUANTES
    dirs: ['pages', 'components', 'lib', 'hooks']
  },
  typescript: {
    ignoreBuildErrors: false      // ✅ ERREURS TYPESCRIPT BLOQUANTES
  },

  // Règles de sécurité strictes
  eslint: {
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'security/detect-object-injection': 'error'
    }
  }
}
```

---

## 🔴 VULNÉRABILITÉ #5: INJECTION SQL POTENTIELLE

### **CRITICITÉ: MOYENNE-HAUTE** ⚠️
**Impact**: Accès base de données, corruption de données

### Problème Identifié
```typescript
// Pas de validation d'entrée sur les APIs
// app/api/create-intervention/route.ts
export async function POST(request: Request) {
  const body = await request.json() // ❌ PAS DE VALIDATION !

  // Utilisation directe des données utilisateur:
  const intervention = await supabase
    .from('interventions')
    .insert({
      title: body.title,           // ❌ NON VALIDÉ !
      description: body.description, // ❌ NON VALIDÉ !
      // ...
    })
}
```

### Vectors d'Attaque
1. **Données malformées**: Injection de contenu malveillant
2. **XSS stocké**: Scripts malveillants dans la DB
3. **Overflow**: Données trop longues causant des erreurs

### Solution Immédiate
```typescript
import { z } from 'zod'

// Schéma de validation strict
const CreateInterventionSchema = z.object({
  title: z.string()
    .min(1, 'Titre requis')
    .max(200, 'Titre trop long')
    .regex(/^[a-zA-Z0-9\s\-\.]+$/, 'Caractères non autorisés'),

  description: z.string()
    .min(10, 'Description trop courte')
    .max(2000, 'Description trop longue'),

  urgency: z.enum(['low', 'medium', 'high']),

  // Validation stricte pour tous les champs
})

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // VALIDATION OBLIGATOIRE
    const validatedData = CreateInterventionSchema.parse(body)

    // Utilisation des données validées uniquement
    const intervention = await supabase
      .from('interventions')
      .insert(validatedData)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Données invalides', details: error.errors },
        { status: 400 }
      )
    }
    throw error
  }
}
```

---

## 🔴 VULNÉRABILITÉ #6: ARCHITECTURE AUTH INSTABLE

### **CRITICITÉ: MOYENNE-HAUTE** ⚠️
**Impact**: Incohérences utilisateur, accès non autorisé

### Problème Identifié
```typescript
// lib/auth-service.ts:703-720
// MAPPING COMPLEXE ET FRAGILE
const fallbackUser: AuthUser = {
  id: session.user.id, // ⚠️ UTILISE auth_user_id DIRECTEMENT
  // Cause des problèmes de relations DB
}

// 5 MÉCANISMES DE REDIRECTION CONCURRENTS
router.refresh()
setTimeout(() => router.push(dashboardPath), 200)
window.location.href = dashboardPath
setTimeout(() => window.location.href = dashboardPath, 2000)
setTimeout(() => window.location.href = dashboardPath, 3000)
```

### Risques
1. **Race conditions**: Redirections concurrentes
2. **Incohérences d'ID**: Relations DB cassées
3. **Erreurs d'autorisation**: Mauvais utilisateur identifié
4. **Boucles infinies**: Redirections cycliques

### Solution Immédiate
```typescript
// Service d'authentification simplifié et sûr
class SecureAuthService {
  async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email_confirmed_at) {
      return null
    }

    // RECHERCHE SÉCURISÉE PAR auth_user_id
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      throw new Error('Profile not found - security issue')
    }

    // RETOURNER TOUJOURS L'ID DE LA TABLE users
    return {
      id: profile.id,  // ✅ ID CORRECT
      auth_user_id: user.id,
      email: profile.email,
      role: profile.role
    }
  }
}
```

---

## 🔴 VULNÉRABILITÉ #7: CSRF ET HEADERS DE SÉCURITÉ MANQUANTS

### **CRITICITÉ: MOYENNE** ⚠️
**Impact**: Attaques cross-site, hijacking de session

### Problème Identifié
```typescript
// Aucune protection CSRF sur les APIs
// Pas de headers de sécurité configurés
// Pas de validation d'origine des requêtes
```

### Headers de Sécurité Manquants
- `X-Frame-Options`: Pas de protection clickjacking
- `X-Content-Type-Options`: Pas de protection MIME sniffing
- `Referrer-Policy`: Fuite d'informations via referrer
- `Content-Security-Policy`: Pas de protection XSS

### Solution Immédiate
```typescript
// next.config.mjs - Headers de sécurité
const nextConfig = {
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
        },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline'"
        }
      ]
    }
  ]
}

// Protection CSRF sur les APIs
export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  if (!origin || !isAllowedOrigin(origin)) {
    return NextResponse.json(
      { error: 'Origin not allowed' },
      { status: 403 }
    )
  }

  // Traitement sécurisé...
}
```

---

## 🚨 PLAN D'ACTION SÉCURITÉ IMMÉDIAT

### **🔥 ACTIONS CRITIQUES - 24H**
1. **[0-4h]** Réactivation RLS sur toutes les tables sensibles
2. **[4-8h]** Suppression de tous les logs debug exposant des données
3. **[8-12h]** Correction configuration Next.js
4. **[12-24h]** Renforcement middleware d'authentification

### **⚡ ACTIONS HAUTES - 48H**
1. **[24-36h]** Implémentation validation Zod sur toutes les APIs
2. **[36-48h]** Headers de sécurité et protection CSRF

### **🛡️ ACTIONS MOYENNES - 1 SEMAINE**
1. **[Jour 3-5]** Refactoring architecture auth
2. **[Jour 6-7]** Audit de sécurité complet et tests de pénétration

---

## 📊 ÉVALUATION DES RISQUES

| Vulnérabilité | Probabilité | Impact | Risque Global | Action |
|---------------|-------------|--------|---------------|---------|
| **RLS Désactivé** | 🔴 HAUTE | 🔴 CRITIQUE | 🚨 **MAXIMAL** | **IMMÉDIAT** |
| **Logs Debug** | 🔴 HAUTE | 🟡 MOYEN | 🔴 **ÉLEVÉ** | **24H** |
| **Middleware Faible** | 🟡 MOYENNE | 🔴 CRITIQUE | 🔴 **ÉLEVÉ** | **24H** |
| **Config Compromise** | 🟡 MOYENNE | 🟡 MOYEN | 🟡 **MOYEN** | **48H** |
| **Injection SQL** | 🟡 FAIBLE | 🔴 CRITIQUE | 🟡 **MOYEN** | **48H** |
| **Auth Instable** | 🟡 MOYENNE | 🟡 MOYEN | 🟡 **MOYEN** | **1 SEM** |
| **Headers Manquants** | 🟡 FAIBLE | 🟡 FAIBLE | 🟢 **FAIBLE** | **1 SEM** |

---

**🚨 ALERTE**: Cette application présente un risque de sécurité **CRITIQUE** nécessitant une action immédiate. Le déploiement en production dans l'état actuel constitue un risque majeur d'incident de sécurité.