# 🎯 PLAN D'ACTION TECHNIQUE - APPLICATION SEIDO

## 🚨 SITUATION CRITIQUE ACTUELLE

L'application SEIDO est dans un **état de fragilité critique** nécessitant une **intervention immédiate**. Ce plan d'action technique priorise les corrections par **niveau de criticité** et **impact business**.

### ⚠️ RISQUES ACTUELS MAJEURS
- **🔴 SÉCURITÉ**: Exposition totale des données (RLS désactivé)
- **🔴 PRODUCTION**: 1699 logs debug + configuration dangereuse Next.js
- **🟡 PERFORMANCE**: Architecture non optimisée, timeouts inadéquats
- **🟡 MAINTENABILITÉ**: Code complexe, logique métier dispersée

---

## 🎯 STRATÉGIE D'INTERVENTION

### APPROCHE PHASED ROLLOUT
1. **PHASE CRITIQUE**: Sécurisation immédiate (24-48h)
2. **PHASE STABILISATION**: Correction des problèmes majeurs (1-2 sem)
3. **PHASE OPTIMISATION**: Performance et UX (3-4 sem)
4. **PHASE ÉVOLUTION**: Fonctionnalités et architecture (5-12 sem)

### MÉTHODOLOGIE
- **Hotfixes** en production pour les problèmes critiques
- **Feature flags** pour déploiements progressifs
- **Rollback plan** pour chaque changement majeur
- **Monitoring** renforcé pendant la transition

---

## 🚨 PHASE 1: SÉCURITÉ CRITIQUE (24-48H)

### 🔥 ACTION IMMÉDIATE - 0-4H

#### 1.1 Réactivation RLS - URGENCE MAXIMALE
```sql
-- Migration de sécurité immédiate
-- supabase/migrations/emergency_rls_fix.sql

-- 1. RÉACTIVER RLS SUR TOUTES LES TABLES SENSIBLES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- 2. POLITIQUE D'ISOLATION PAR ÉQUIPE (PROTECTION MINIMALE)
CREATE POLICY "emergency_team_isolation_users" ON users
FOR ALL TO authenticated
USING (
  team_id IN (
    SELECT team_id FROM users
    WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY "emergency_team_isolation_interventions" ON interventions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u1
    JOIN lots l ON l.id = interventions.lot_id
    JOIN buildings b ON b.id = l.building_id
    JOIN users u2 ON u2.auth_user_id = auth.uid()
    WHERE u1.team_id = u2.team_id
    AND (
      u1.id = interventions.tenant_id OR
      u1.id = interventions.assigned_provider_id
    )
  )
);

-- 3. POLITIQUE POUR AUTRES TABLES
CREATE POLICY "emergency_team_isolation_buildings" ON buildings
FOR ALL TO authenticated
USING (
  manager_id IN (
    SELECT id FROM users
    WHERE team_id IN (
      SELECT team_id FROM users WHERE auth_user_id = auth.uid()
    )
  )
);

-- 4. AUDIT IMMÉDIAT DES ACCÈS
CREATE TABLE security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT,
  table_name TEXT,
  row_id UUID,
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address INET
);
```

**⏱️ Temps estimé**: 2-4 heures
**👥 Ressources**: 1 dev senior + 1 DBA
**🎯 Résultat**: Isolation complète des données par équipe

#### 1.2 Correction Configuration Next.js - CRITIQUE
```javascript
// next.config.mjs - VERSION SÉCURISÉE IMMÉDIATE
const nextConfig = {
  // ✅ RÉACTIVER LES CONTRÔLES DE QUALITÉ
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['app', 'components', 'lib', 'hooks']
  },
  typescript: {
    ignoreBuildErrors: false
  },

  // ✅ HEADERS DE SÉCURITÉ
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
          key: 'X-XSS-Protection',
          value: '1; mode=block'
        },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
        }
      ]
    }
  ],

  // ✅ OPTIMISATIONS SÉCURISÉES
  experimental: {
    optimizePackageImports: ['@radix-ui/react-*', 'lucide-react']
  },

  // ✅ CONFIGURATION BUILD STRICTE
  webpack: (config, { dev }) => {
    if (!dev) {
      // Production uniquement - optimisations sans compromettre la sécurité
      config.optimization.minimize = true
    }
    return config
  }
}

export default nextConfig
```

**⏱️ Temps estimé**: 30 minutes
**👥 Ressources**: 1 dev senior
**🎯 Résultat**: Build sécurisé avec contrôles qualité

### 🔥 ACTION CRITIQUE - 4-8H

#### 1.3 Système de Logging Structuré
```typescript
// lib/logger.ts - REMPLACEMENT DES console.log
import winston from 'winston'

interface LogContext {
  userId?: string
  sessionId?: string
  requestId?: string
  component?: string
}

class SecureLogger {
  private logger: winston.Logger

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          // ✅ SANITISATION AUTOMATIQUE DES DONNÉES SENSIBLES
          const sanitized = this.sanitizeLogData(meta)
          return JSON.stringify({
            timestamp,
            level,
            message,
            ...sanitized
          })
        })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        }),
        new winston.transports.File({
          filename: 'logs/app.log',
          maxsize: 10485760, // 10MB
          maxFiles: 5
        })
      ]
    })
  }

  private sanitizeLogData(data: any): any {
    const sensitiveKeys = [
      'password', 'token', 'auth', 'secret', 'key',
      'email', 'phone', 'address', 'cookie'
    ]

    const sanitized = { ...data }

    const sanitizeObject = (obj: any, path: string = ''): any => {
      if (typeof obj !== 'object' || obj === null) return obj

      const result = Array.isArray(obj) ? [] : {}

      for (const key in obj) {
        const keyLower = key.toLowerCase()
        const currentPath = path ? `${path}.${key}` : key

        if (sensitiveKeys.some(sensitive => keyLower.includes(sensitive))) {
          result[key] = '[REDACTED]'
        } else if (typeof obj[key] === 'object') {
          result[key] = sanitizeObject(obj[key], currentPath)
        } else {
          result[key] = obj[key]
        }
      }

      return result
    }

    return sanitizeObject(sanitized)
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, context)
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.logger.error(message, {
      error: error?.message,
      stack: error?.stack,
      ...context
    })
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, context)
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, context)
  }
}

export const logger = new SecureLogger()

// Migration script pour remplacer tous les console.log
// scripts/replace-console-logs.js
const fs = require('fs')
const path = require('path')
const glob = require('glob')

const files = glob.sync('**/*.{ts,tsx}', {
  ignore: ['node_modules/**', 'dist/**', '.next/**']
})

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8')

  // Remplacer console.log par logger.info
  content = content.replace(
    /console\.log\((.*?)\)/g,
    'logger.info($1)'
  )

  // Remplacer console.error par logger.error
  content = content.replace(
    /console\.error\((.*?)\)/g,
    'logger.error($1)'
  )

  // Ajouter import si nécessaire
  if (content.includes('logger.') && !content.includes('import { logger }')) {
    content = `import { logger } from '@/lib/logger'\n${content}`
  }

  fs.writeFileSync(file, content)
})

console.log(`Migrated ${files.length} files`)
```

**⏱️ Temps estimé**: 3-4 heures
**👥 Ressources**: 1 dev senior
**🎯 Résultat**: Logs sécurisés, données sensibles protégées

### ⚡ ACTION RAPIDE - 8-12H

#### 1.4 Middleware Sécurité Renforcé
```typescript
// middleware.ts - VERSION SÉCURISÉE
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJWT } from '@/lib/security/jwt-validator'
import { logger } from '@/lib/logger'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const requestId = crypto.randomUUID()

  logger.info('Middleware request', {
    requestId,
    pathname,
    userAgent: request.headers.get('user-agent'),
    ip: request.ip
  })

  // Routes publiques
  const publicRoutes = [
    '/auth/login',
    '/auth/signup',
    '/auth/reset-password',
    '/auth/callback',
    '/'
  ]

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Routes protégées - validation JWT complète
  const protectedPrefixes = ['/admin', '/gestionnaire', '/locataire', '/prestataire']
  const isProtectedRoute = protectedPrefixes.some(prefix => pathname.startsWith(prefix))

  if (isProtectedRoute) {
    try {
      // ✅ EXTRACTION ET VALIDATION TOKEN JWT
      const token = extractTokenFromRequest(request)

      if (!token) {
        logger.warn('Missing authentication token', { requestId, pathname })
        return redirectToLogin(request, 'missing_token')
      }

      // ✅ VÉRIFICATION JWT COMPLÈTE
      const payload = await verifyJWT(token)

      // ✅ VÉRIFICATIONS SÉCURITÉ
      if (!payload.sub || !payload.email_confirmed_at) {
        logger.warn('Invalid or unconfirmed user', { requestId, userId: payload.sub })
        return redirectToLogin(request, 'invalid_user')
      }

      if (payload.exp && payload.exp < Date.now() / 1000) {
        logger.warn('Expired token', { requestId, userId: payload.sub })
        return redirectToLogin(request, 'expired_token')
      }

      // ✅ VÉRIFICATION PERMISSIONS RÔLE
      const requiredRole = extractRequiredRole(pathname)
      const userRole = payload.user_metadata?.role

      if (requiredRole && userRole !== requiredRole) {
        logger.warn('Role mismatch', {
          requestId,
          userId: payload.sub,
          requiredRole,
          userRole
        })
        return NextResponse.redirect(new URL(`/${userRole}/dashboard`, request.url))
      }

      // ✅ RATE LIMITING BASIQUE
      const rateLimitResult = await checkRateLimit(payload.sub, pathname)
      if (rateLimitResult.exceeded) {
        logger.warn('Rate limit exceeded', {
          requestId,
          userId: payload.sub,
          limit: rateLimitResult.limit
        })
        return NextResponse.json(
          { error: 'Too many requests' },
          { status: 429 }
        )
      }

      // ✅ HEADERS SÉCURITÉ POUR REQUÊTES AUTHENTIFIÉES
      const response = NextResponse.next()
      response.headers.set('x-user-id', payload.sub)
      response.headers.set('x-request-id', requestId)
      response.headers.set('x-authenticated', 'true')

      return response

    } catch (error) {
      logger.error('Authentication error', error, { requestId, pathname })
      return redirectToLogin(request, 'auth_error')
    }
  }

  return NextResponse.next()
}

// Helpers sécurisés
function extractTokenFromRequest(request: NextRequest): string | null {
  // Recherche dans les cookies Supabase
  const cookies = request.cookies

  for (const cookie of cookies.getAll()) {
    if (cookie.name.includes('auth-token') && cookie.value) {
      try {
        let tokenData = cookie.value

        // Décodage base64 si nécessaire
        if (tokenData.startsWith('base64-')) {
          tokenData = atob(tokenData.substring(7))
        }

        const authData = JSON.parse(tokenData)
        return authData.access_token
      } catch {
        continue
      }
    }
  }

  return null
}

function redirectToLogin(request: NextRequest, reason: string): NextResponse {
  const redirectUrl = new URL('/auth/login', request.url)
  redirectUrl.searchParams.set('redirect_reason', reason)
  redirectUrl.searchParams.set('return_to', request.nextUrl.pathname)

  return NextResponse.redirect(redirectUrl)
}

async function checkRateLimit(userId: string, endpoint: string): Promise<RateLimitResult> {
  // Implémentation Redis ou en mémoire pour le rate limiting
  // Limites par endpoint et par utilisateur
  const limits = {
    '/api/': { requests: 100, window: 60 * 1000 }, // 100 req/min pour APIs
    default: { requests: 300, window: 60 * 1000 }  // 300 req/min par défaut
  }

  // TODO: Implémentation complète avec Redis
  return { exceeded: false, limit: limits.default.requests }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
```

**⏱️ Temps estimé**: 4 heures
**👥 Ressources**: 1 dev senior + 1 dev sécurité
**🎯 Résultat**: Authentification sécurisée, protection contre les attaques

### 🔒 ACTION VALIDATION - 12-24H

#### 1.5 Validation API avec Zod
```typescript
// lib/validation/schemas.ts - SCHÉMAS DE VALIDATION COMPLETS
import { z } from 'zod'

// Schémas de base réutilisables
export const UserIdSchema = z.string().uuid('ID utilisateur invalide')
export const EmailSchema = z.string().email('Email invalide')
export const PhoneSchema = z.string()
  .regex(/^(?:\+33|0)[1-9](?:[0-9]{8})$/, 'Numéro de téléphone français invalide')
  .optional()

// Schéma intervention complet
export const CreateInterventionSchema = z.object({
  title: z.string()
    .min(5, 'Le titre doit contenir au moins 5 caractères')
    .max(200, 'Le titre ne peut pas dépasser 200 caractères')
    .regex(/^[a-zA-Z0-9\s\-\.,:!?()]+$/, 'Caractères non autorisés dans le titre'),

  description: z.string()
    .min(20, 'La description doit contenir au moins 20 caractères')
    .max(2000, 'La description ne peut pas dépasser 2000 caractères'),

  urgency: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'Niveau d\'urgence invalide' })
  }),

  type: z.enum([
    'plumbing', 'electrical', 'heating', 'locksmith',
    'painting', 'cleaning', 'gardening', 'other'
  ]),

  lotId: UserIdSchema,
  tenantId: UserIdSchema,

  expectedDate: z.string()
    .datetime('Date attendue invalide')
    .optional(),

  providerId: UserIdSchema.optional(),

  documents: z.array(z.object({
    filename: z.string().min(1),
    size: z.number().max(10 * 1024 * 1024), // 10MB max
    type: z.string().regex(/^(image|application)\//),
  })).max(10, 'Maximum 10 documents').optional()
})

// Middleware de validation API
export function withValidation<T>(schema: z.ZodSchema<T>) {
  return function(handler: (data: T, request: Request) => Promise<Response>) {
    return async function(request: Request): Promise<Response> {
      try {
        const body = await request.json()
        const validatedData = schema.parse(body)

        return await handler(validatedData, request)

      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.warn('Validation error', {
            errors: error.errors,
            path: request.url
          })

          return NextResponse.json({
            error: 'Données invalides',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            }))
          }, { status: 400 })
        }

        logger.error('Unexpected validation error', error)
        return NextResponse.json(
          { error: 'Erreur interne du serveur' },
          { status: 500 }
        )
      }
    }
  }
}

// Migration des API routes
// app/api/create-intervention/route.ts - VERSION SÉCURISÉE
import { withValidation } from '@/lib/validation/schemas'

export const POST = withValidation(CreateInterventionSchema)(
  async (validatedData, request) => {
    // Les données sont déjà validées et sécurisées
    const {
      title,
      description,
      urgency,
      type,
      lotId,
      tenantId,
      expectedDate,
      providerId,
      documents
    } = validatedData

    try {
      // Vérifications business
      const lot = await supabase
        .from('lots')
        .select('*, buildings(*)')
        .eq('id', lotId)
        .single()

      if (!lot.data) {
        return NextResponse.json(
          { error: 'Lot non trouvé' },
          { status: 404 }
        )
      }

      // Vérification permissions
      const hasPermission = await checkUserPermission(tenantId, lotId)
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Permission refusée' },
          { status: 403 }
        )
      }

      // Création intervention sécurisée
      const { data: intervention, error } = await supabase
        .from('interventions')
        .insert({
          title,
          description,
          urgency,
          type,
          lot_id: lotId,
          tenant_id: tenantId,
          expected_date: expectedDate,
          assigned_provider_id: providerId,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        logger.error('Database error creating intervention', error)
        return NextResponse.json(
          { error: 'Erreur lors de la création' },
          { status: 500 }
        )
      }

      logger.info('Intervention created successfully', {
        interventionId: intervention.id,
        tenantId,
        lotId
      })

      return NextResponse.json({
        success: true,
        intervention: {
          id: intervention.id,
          title: intervention.title,
          status: intervention.status,
          createdAt: intervention.created_at
        }
      })

    } catch (error) {
      logger.error('Unexpected error creating intervention', error)
      return NextResponse.json(
        { error: 'Erreur interne du serveur' },
        { status: 500 }
      )
    }
  }
)
```

**⏱️ Temps estimé**: 6-8 heures
**👥 Ressources**: 2 dev senior
**🎯 Résultat**: APIs sécurisées, validation complète des données

---

## 🛠️ PHASE 2: STABILISATION (SEMAINE 1-2)

### 🔧 REFACTORING AUTH SERVICE

#### 2.1 Simplification Architecture Auth
```typescript
// lib/auth/SecureAuthService.ts - VERSION SIMPLIFIÉE ET SÛRE
export class SecureAuthService {
  private readonly supabase: SupabaseClient
  private readonly logger: Logger

  constructor() {
    this.supabase = createSupabaseClient()
    this.logger = logger.child({ service: 'auth' })
  }

  async signIn(credentials: SignInCredentials): Promise<AuthResult> {
    try {
      const { email, password } = credentials

      // 1. Validation
      const validation = this.validateCredentials(credentials)
      if (!validation.isValid) {
        throw new ValidationException(validation.errors)
      }

      // 2. Authentification Supabase
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error || !data.user) {
        this.logger.warn('Sign in failed', { email, error: error?.message })
        throw new AuthenticationException('Identifiants incorrects')
      }

      // 3. Récupération profil utilisateur (ARCHITECTURE SIMPLIFIÉE)
      const userProfile = await this.getUserProfile(data.user.id)

      if (!userProfile) {
        this.logger.error('User profile not found', { authUserId: data.user.id })
        throw new ProfileNotFoundException()
      }

      // 4. Session établie
      this.logger.info('User signed in successfully', {
        userId: userProfile.id,
        email: userProfile.email,
        role: userProfile.role
      })

      return {
        success: true,
        user: {
          id: userProfile.id,           // ✅ ID COHÉRENT de la table users
          authUserId: data.user.id,     // ✅ Référence auth pour debugging
          email: userProfile.email,
          name: userProfile.name,
          role: userProfile.role,
          teamId: userProfile.team_id
        }
      }

    } catch (error) {
      this.logger.error('Sign in error', error)

      if (error instanceof ValidationException ||
          error instanceof AuthenticationException) {
        return { success: false, error: error.message }
      }

      return { success: false, error: 'Erreur interne' }
    }
  }

  private async getUserProfile(authUserId: string): Promise<UserProfile | null> {
    // REQUÊTE SIMPLE ET SÛRE
    const { data, error } = await this.supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        first_name,
        last_name,
        role,
        team_id,
        avatar_url,
        created_at,
        updated_at
      `)
      .eq('auth_user_id', authUserId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Profile not found
      }
      throw new DatabaseException('Error fetching user profile')
    }

    return data
  }

  // ✅ MÉTHODE UNIQUE DE REDIRECTION (PLUS DE CONFLITS)
  async handleAuthRedirect(
    userRole: string,
    reason: 'login' | 'callback' | 'refresh' = 'login'
  ): Promise<void> {
    const dashboardPath = `/${userRole}/dashboard`

    this.logger.info('Auth redirect initiated', {
      userRole,
      reason,
      targetPath: dashboardPath
    })

    // Délai pour garantir la synchronisation des cookies
    await new Promise(resolve => setTimeout(resolve, 500))

    // ✅ UNE SEULE MÉTHODE DE REDIRECTION
    window.location.href = dashboardPath
  }
}

// Exception classes pour gestion d'erreurs claire
export class ValidationException extends Error {
  constructor(public readonly errors: string[]) {
    super('Validation failed')
    this.name = 'ValidationException'
  }
}

export class AuthenticationException extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthenticationException'
  }
}

export class ProfileNotFoundException extends Error {
  constructor() {
    super('User profile not found')
    this.name = 'ProfileNotFoundException'
  }
}
```

**⏱️ Temps estimé**: 12 heures
**👥 Ressources**: 1 dev senior + 1 dev junior
**🎯 Résultat**: Auth stable, plus de conflits de redirection

#### 2.2 Gestion d'Erreurs Centralisée
```typescript
// lib/error-handling/ErrorBoundary.tsx
export class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorId: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = crypto.randomUUID()

    // Log l'erreur immédiatement
    logger.error('React error boundary caught error', error, {
      errorId,
      componentStack: error.stack
    })

    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Envoi vers service de monitoring externe
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo)
    }
  }

  private async reportError(error: Error, errorInfo: React.ErrorInfo) {
    try {
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          errorInfo,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      })
    } catch (reportError) {
      logger.error('Failed to report error', reportError)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorId={this.state.errorId}
          onRetry={() => this.setState({ hasError: false })}
        />
      )
    }

    return this.props.children
  }
}

// Hook pour gestion d'erreurs async
export function useErrorHandler() {
  const handleError = useCallback((error: Error, context?: any) => {
    const errorId = crypto.randomUUID()

    logger.error('Async error handled', error, {
      errorId,
      context
    })

    // Notification utilisateur
    toast.error(`Une erreur est survenue (${errorId.slice(0, 8)})`, {
      action: {
        label: 'Signaler',
        onClick: () => reportError(error, context)
      }
    })

    return errorId
  }, [])

  return { handleError }
}
```

**⏱️ Temps estimé**: 8 heures
**👥 Ressources**: 1 dev senior
**🎯 Résultat**: Erreurs capturées et tracées, UX préservée

---

## ⚡ PHASE 3: PERFORMANCE (SEMAINE 3-4)

### 🚀 OPTIMISATIONS IMMÉDIATES

#### 3.1 Bundle Splitting et Code Splitting
```typescript
// Implementation lazy loading systématique
// components/LazyComponents.ts
import { lazy } from 'react'

// Dashboards par rôle
export const AdminDashboard = lazy(() =>
  import('./dashboards/admin-dashboard').then(module => ({
    default: module.AdminDashboard
  }))
)

export const GestionnaireDashboard = lazy(() =>
  import('./dashboards/gestionnaire-dashboard').then(module => ({
    default: module.GestionnaireDashboard
  }))
)

// Pages d'intervention
export const InterventionDetails = lazy(() =>
  import('./interventions/intervention-details')
)

export const InterventionForm = lazy(() =>
  import('./interventions/intervention-form')
)

// Configuration webpack optimisée
// next.config.mjs
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-*',
      'lucide-react',
      'date-fns'
    ]
  },

  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Split vendors par taille
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 200000,
        cacheGroups: {
          react: {
            name: 'react',
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            priority: 40
          },
          radix: {
            name: 'radix-ui',
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            priority: 30
          },
          vendor: {
            name: 'vendor',
            test: /[\\/]node_modules[\\/]/,
            priority: 10
          }
        }
      }
    }

    return config
  }
}
```

**⏱️ Temps estimé**: 8 heures
**👥 Ressources**: 1 dev senior
**🎯 Résultat**: -35% bundle size, +40% vitesse de chargement

#### 3.2 Optimisation Requêtes Database
```typescript
// services/OptimizedDataService.ts
export class OptimizedDataService {
  // Requête optimisée avec jointures
  async getInterventionsWithDetails(
    teamId: string,
    pagination: Pagination,
    filters: Filters
  ): Promise<InterventionsResult> {

    // ✅ UNE SEULE REQUÊTE AVEC TOUS LES DÉTAILS
    let query = supabase
      .from('interventions')
      .select(`
        id,
        title,
        description,
        status,
        urgency,
        created_at,
        scheduled_date,
        completed_at,

        tenant:tenant_id (
          id,
          name,
          email,
          phone
        ),

        provider:assigned_provider_id (
          id,
          name,
          email,
          phone,
          category:provider_category
        ),

        lot:lot_id (
          id,
          lot_number,
          floor,
          surface_area,

          building:building_id (
            id,
            name,
            address,
            city,
            postal_code
          )
        ),

        documents:intervention_documents (
          id,
          filename,
          file_type,
          file_size,
          uploaded_at
        )
      `, { count: 'exact' })

    // Filtres optimisés
    if (filters.status?.length) {
      query = query.in('status', filters.status)
    }

    if (filters.urgency?.length) {
      query = query.in('urgency', filters.urgency)
    }

    if (filters.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end)
    }

    // Pagination avec performance optimale
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(pagination.offset, pagination.offset + pagination.limit - 1)

    if (error) {
      throw new DatabaseException(`Failed to fetch interventions: ${error.message}`)
    }

    return {
      interventions: data || [],
      total: count || 0,
      hasMore: (count || 0) > pagination.offset + pagination.limit
    }
  }

  // Cache intelligent avec React Query
  getInterventionsQuery(teamId: string, filters: Filters) {
    return {
      queryKey: ['interventions', teamId, filters],
      queryFn: () => this.getInterventionsWithDetails(teamId, { offset: 0, limit: 20 }, filters),
      staleTime: 2 * 60 * 1000,    // 2 minutes
      cacheTime: 10 * 60 * 1000,   // 10 minutes
      keepPreviousData: true,       // Pour pagination fluide
    }
  }
}
```

**⏱️ Temps estimé**: 12 heures
**👥 Ressources**: 1 dev senior + 1 spécialiste DB
**🎯 Résultat**: -70% requêtes DB, -2s temps de chargement

---

## 🏗️ PHASE 4: ARCHITECTURE (SEMAINE 5-8)

### 🎯 REFACTORING PROGRESSIF

#### 4.1 Domain-Driven Design Implementation
```typescript
// core/domain/Intervention.ts - Entité métier
export class Intervention {
  private constructor(
    private readonly id: InterventionId,
    private title: Title,
    private description: Description,
    private status: InterventionStatus,
    private urgency: Urgency,
    private readonly createdAt: Date,
    private readonly tenantId: UserId,
    private readonly lotId: LotId,
    private assignedProviderId?: ProviderId
  ) {}

  static create(props: CreateInterventionProps): Intervention {
    // Validation métier
    if (!props.title.trim()) {
      throw new InvalidTitleException('Le titre ne peut pas être vide')
    }

    if (props.description.length < 10) {
      throw new InvalidDescriptionException('Description trop courte')
    }

    return new Intervention(
      InterventionId.generate(),
      Title.fromString(props.title),
      Description.fromString(props.description),
      InterventionStatus.PENDING,
      Urgency.fromString(props.urgency),
      new Date(),
      UserId.fromString(props.tenantId),
      LotId.fromString(props.lotId)
    )
  }

  approve(managerId: UserId): DomainEvent[] {
    if (!this.canBeApproved()) {
      throw new CannotApproveInterventionException(this.status.value)
    }

    this.status = InterventionStatus.APPROVED

    return [
      new InterventionApprovedEvent(this.id, managerId, new Date()),
      new NotificationEvent.forTenant(
        this.tenantId,
        'Intervention approuvée',
        `Votre demande "${this.title.value}" a été approuvée`
      )
    ]
  }

  private canBeApproved(): boolean {
    return this.status.equals(InterventionStatus.PENDING)
  }

  // Getters pour accès contrôlé
  get getId(): string { return this.id.value }
  get getTitle(): string { return this.title.value }
  get getStatus(): string { return this.status.value }
  get getUrgency(): string { return this.urgency.value }
}
```

**⏱️ Temps estimé**: 20 heures
**👥 Ressources**: 1 architect + 1 dev senior
**🎯 Résultat**: Logique métier centralisée et testable

#### 4.2 Event-Driven Architecture
```typescript
// infrastructure/events/EventBus.ts
export class ProductionEventBus implements EventBus {
  private handlers = new Map<string, EventHandler[]>()
  private readonly logger: Logger

  constructor() {
    this.logger = logger.child({ service: 'event-bus' })
  }

  subscribe<T extends DomainEvent>(
    eventType: new (...args: any[]) => T,
    handler: EventHandler<T>
  ): void {
    const eventName = eventType.name
    const existing = this.handlers.get(eventName) || []
    this.handlers.set(eventName, [...existing, handler])

    this.logger.info('Event handler registered', {
      eventName,
      handlerName: handler.constructor.name,
      totalHandlers: existing.length + 1
    })
  }

  async publish(event: DomainEvent): Promise<void> {
    const eventName = event.constructor.name
    const handlers = this.handlers.get(eventName) || []

    this.logger.info('Event published', {
      eventName,
      eventId: event.eventId,
      handlersCount: handlers.length
    })

    // Exécution parallèle des handlers
    const results = await Promise.allSettled(
      handlers.map(async handler => {
        try {
          await handler.handle(event)
          this.logger.debug('Event handled successfully', {
            eventName,
            handlerName: handler.constructor.name
          })
        } catch (error) {
          this.logger.error('Event handler failed', error, {
            eventName,
            handlerName: handler.constructor.name,
            eventId: event.eventId
          })
          throw error
        }
      })
    )

    // Vérification des échecs
    const failures = results.filter(r => r.status === 'rejected')
    if (failures.length > 0) {
      this.logger.warn('Some event handlers failed', {
        eventName,
        failuresCount: failures.length,
        totalHandlers: handlers.length
      })
    }
  }
}

// Event handlers spécialisés
export class NotificationEventHandler implements EventHandler<InterventionApprovedEvent> {
  constructor(
    private notificationService: NotificationService,
    private logger: Logger
  ) {}

  async handle(event: InterventionApprovedEvent): Promise<void> {
    try {
      // Notification au locataire
      await this.notificationService.sendNotification({
        recipientId: event.tenantId,
        type: 'intervention_approved',
        title: 'Intervention approuvée',
        message: `Votre demande d'intervention a été approuvée`,
        data: {
          interventionId: event.interventionId.value,
          approvedBy: event.managerId.value,
          approvedAt: event.approvedAt.toISOString()
        }
      })

      this.logger.info('Approval notification sent', {
        interventionId: event.interventionId.value,
        tenantId: event.tenantId.value
      })

    } catch (error) {
      this.logger.error('Failed to send approval notification', error, {
        interventionId: event.interventionId.value
      })
      throw error
    }
  }
}
```

**⏱️ Temps estimé**: 16 heures
**👥 Ressources**: 1 architect + 1 dev senior
**🎯 Résultat**: Architecture découplée et évolutive

---

## 📊 PHASE 5: FONCTIONNALITÉS (SEMAINE 9-12)

### 🔧 IMPLÉMENTATION FONCTIONNALITÉS CRITIQUES

#### 5.1 Système de Fichiers Complet
```typescript
// services/FileManagementService.ts
export class FileManagementService {
  constructor(
    private storage: StorageService,
    private validator: FileValidator,
    private processor: FileProcessor,
    private logger: Logger
  ) {}

  async uploadInterventionDocument(
    interventionId: string,
    file: File,
    category: DocumentCategory,
    uploadedBy: string
  ): Promise<UploadResult> {

    const uploadId = crypto.randomUUID()

    try {
      this.logger.info('File upload started', {
        uploadId,
        interventionId,
        filename: file.name,
        size: file.size,
        category,
        uploadedBy
      })

      // 1. Validation complète
      const validation = await this.validator.validateFile(file, category)
      if (!validation.isValid) {
        throw new FileValidationException(validation.errors)
      }

      // 2. Traitement du fichier (compression, etc.)
      const processedFile = await this.processor.processFile(file, category)

      // 3. Upload vers stockage sécurisé
      const storagePath = this.generateStoragePath(interventionId, category, file.name)
      const uploadResult = await this.storage.upload(storagePath, processedFile)

      // 4. Enregistrement métadonnées
      const document = await this.saveDocumentMetadata({
        id: crypto.randomUUID(),
        interventionId,
        filename: file.name,
        originalFilename: file.name,
        category,
        fileType: file.type,
        fileSize: processedFile.size,
        storagePath,
        uploadedBy,
        uploadedAt: new Date(),
        checksum: await this.calculateChecksum(processedFile)
      })

      this.logger.info('File upload completed', {
        uploadId,
        documentId: document.id,
        storagePath,
        finalSize: processedFile.size
      })

      return {
        success: true,
        documentId: document.id,
        url: uploadResult.publicUrl,
        metadata: {
          size: processedFile.size,
          type: file.type,
          category
        }
      }

    } catch (error) {
      this.logger.error('File upload failed', error, {
        uploadId,
        interventionId,
        filename: file.name
      })

      throw error
    }
  }

  async generatePreview(documentId: string): Promise<PreviewResult> {
    // Génération de preview selon le type de fichier
    // Images: thumbnails
    // PDFs: première page
    // Documents: conversion en image
  }

  private generateStoragePath(
    interventionId: string,
    category: string,
    filename: string
  ): string {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')

    return `interventions/${interventionId}/${category}/${year}/${month}/${filename}`
  }
}
```

**⏱️ Temps estimé**: 24 heures
**👥 Ressources**: 1 dev senior + 1 dev junior
**🎯 Résultat**: Gestion fichiers complète et sécurisée

#### 5.2 Notifications Temps Réel
```typescript
// services/RealtimeNotificationService.ts
export class RealtimeNotificationService {
  private connections = new Map<string, WebSocket>()
  private subscriptions = new Map<string, Set<string>>()

  async initializeForUser(userId: string): Promise<void> {
    // 1. Connexion WebSocket
    await this.establishWebSocketConnection(userId)

    // 2. Configuration Service Worker pour notifications offline
    await this.registerServiceWorker()

    // 3. Demande permissions navigateur
    await this.requestNotificationPermissions()

    // 4. Souscription aux événements utilisateur
    await this.subscribeToUserEvents(userId)
  }

  private async establishWebSocketConnection(userId: string): Promise<void> {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/notifications/${userId}`

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      this.logger.info('WebSocket connected', { userId })
      this.connections.set(userId, ws)
    }

    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data)
      this.handleRealtimeNotification(notification)
    }

    ws.onclose = () => {
      this.logger.warn('WebSocket disconnected', { userId })
      // Reconnexion automatique après 5s
      setTimeout(() => this.establishWebSocketConnection(userId), 5000)
    }

    ws.onerror = (error) => {
      this.logger.error('WebSocket error', error, { userId })
    }
  }

  private handleRealtimeNotification(notification: RealtimeNotification): void {
    // 1. Affichage toast dans l'application
    toast.info(notification.message, {
      duration: notification.priority === 'high' ? 0 : 5000,
      action: notification.actionUrl ? {
        label: 'Voir',
        onClick: () => window.location.href = notification.actionUrl
      } : undefined
    })

    // 2. Notification navigateur si app en arrière-plan
    if (document.hidden && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icons/notification.png',
        badge: '/icons/badge.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'high'
      })
    }

    // 3. Mise à jour du store de notifications
    useNotificationStore.getState().addNotification(notification)

    // 4. Déclenchement d'événements custom si nécessaire
    window.dispatchEvent(new CustomEvent('seido:notification', {
      detail: notification
    }))
  }
}
```

**⏱️ Temps estimé**: 20 heures
**👥 Ressources**: 1 dev senior spécialisé WebSocket
**🎯 Résultat**: Notifications temps réel complètes

---

## 📈 MONITORING ET DÉPLOIEMENT

### 🔍 MONITORING INTÉGRÉ
```typescript
// lib/monitoring/ApplicationMonitoring.ts
export class ApplicationMonitoring {
  async trackPerformanceMetrics(): Promise<void> {
    // Core Web Vitals
    this.trackWebVitals()

    // Métriques business
    this.trackBusinessMetrics()

    // Erreurs et exceptions
    this.trackErrors()

    // Sécurité
    this.trackSecurityEvents()
  }

  private trackWebVitals(): void {
    // First Contentful Paint
    // Largest Contentful Paint
    // Cumulative Layout Shift
    // First Input Delay
  }

  private trackBusinessMetrics(): void {
    // Interventions créées/h
    // Temps de résolution moyen
    // Taux de satisfaction
    // Utilisation par rôle
  }
}
```

### 🚀 STRATÉGIE DE DÉPLOIEMENT
```yaml
# .github/workflows/deploy.yml
name: Deploy SEIDO Application

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  security-check:
    runs-on: ubuntu-latest
    steps:
      - name: Security Audit
        run: |
          npm audit --audit-level=moderate
          npm run security:scan

  test:
    runs-on: ubuntu-latest
    steps:
      - name: Run Tests
        run: |
          npm run test:unit
          npm run test:integration
          npm run test:e2e

  deploy:
    needs: [security-check, test]
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Production
        run: |
          npm run build
          npm run deploy:production
```

---

## 📊 TIMELINE ET RESSOURCES

### 🎯 PLANNING GLOBAL

| Phase | Durée | Effort | Priorité | Status |
|-------|-------|---------|----------|---------|
| **Sécurité Critique** | 24-48h | 32h | 🔴 CRITIQUE | TO START |
| **Stabilisation** | 1-2 sem | 80h | 🔴 HAUTE | PENDING |
| **Performance** | 2-3 sem | 60h | 🟡 MOYENNE | PENDING |
| **Architecture** | 3-4 sem | 120h | 🟡 MOYENNE | PENDING |
| **Fonctionnalités** | 4-5 sem | 160h | 🟢 BASSE | PENDING |
| **TOTAL** | **12 semaines** | **452h** | | |

### 👥 ÉQUIPE RECOMMANDÉE

**Core Team (Permanent)**
- **1 Tech Lead/Architect** (full-time)
- **2 Développeurs Senior** (full-time)
- **1 Développeur Junior** (50%)

**Specialists (Ponctuel)**
- **1 Expert Sécurité** (Phase 1, 1 semaine)
- **1 Spécialiste Performance** (Phase 3, 2 semaines)
- **1 DBA** (Migration RLS, 3 jours)

### 💰 BUDGET ESTIMÉ

**Ressources Humaines**: 452h × 80€/h = **36,160€**
**Outils et Infrastructure**: **5,000€**
**Tests et Audit Externe**: **8,000€**
**Contingence (20%)**: **9,832€**

**TOTAL BUDGET**: **59,000€**

### 🎯 ROI ATTENDU

**Gains Immédiats**
- **Sécurité**: Évite incident majeur (~100k€)
- **Performance**: +40% satisfaction utilisateur
- **Maintenabilité**: -60% temps de debugging

**Gains Long Terme**
- **Évolutivité**: +50% vélocité développement
- **Qualité**: -80% bugs en production
- **Business**: +25% rétention clients

**ROI Estimé**: **320%** sur 24 mois

---

## ⚡ ACTIONS IMMÉDIATES RECOMMANDÉES

### 🚨 AUJOURD'HUI (4H MAX)
1. **Backup complet** de la base de données
2. **Création branche hotfix** pour corrections critiques
3. **Audit RLS** sur tables sensibles
4. **Plan de rollback** documenté

### 🔥 DEMAIN (8H MAX)
1. **Réactivation RLS** avec politiques de base
2. **Correction next.config.mjs**
3. **Déploiement logging sécurisé**
4. **Tests de non-régression**

### 📅 CETTE SEMAINE
1. **Middleware sécurisé** complet
2. **Validation API Zod** sur endpoints critiques
3. **Monitoring** des métriques de sécurité
4. **Documentation** des changements

Ce plan d'action garantit une évolution sécurisée et contrôlée de l'application SEIDO vers un état production-ready, avec un ROI élevé et des risques maîtrisés.