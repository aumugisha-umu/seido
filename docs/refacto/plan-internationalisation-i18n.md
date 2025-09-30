# Plan d'Action Détaillé - Internationalisation (i18n) SEIDO App

## 📋 Vue d'ensemble

Ce document présente le plan d'action complet pour rendre l'application SEIDO multilingue avec support pour **Français**, **Néerlandais** et **Anglais**.

---

## 🎯 Objectifs

1. Implémenter un système d'internationalisation robuste compatible avec Next.js 15 App Router
2. Supporter 3 langues : Français (défaut), Néerlandais, Anglais
3. Permettre le changement de langue dynamique avec persistance
4. Assurer la traduction de tous les éléments UI, messages, erreurs et notifications
5. Maintenir les performances et le SEO

---

## 📊 Analyse de l'existant

### Structure actuelle
- **Framework**: Next.js 15.2.4 avec App Router
- **Architecture**: Server Components + Client Components
- **State Management**: React Hooks (useAuth, useTeamStatus)
- **UI Components**: Shadcn/ui + Radix UI
- **Backend**: Supabase
- **Langue actuelle**: Français (hardcodée dans le code)

### Points d'impact identifiés
- 4 rôles utilisateurs : admin, gestionnaire, locataire, prestataire
- ~160+ composants UI à traduire
- Messages d'erreur et de succès
- Emails et notifications
- Metadata SEO
- Formulaires et validations

---

## 🏗️ Architecture Recommandée

### Choix de la bibliothèque : **next-intl**

**Pourquoi next-intl ?**
- ✅ Optimisé pour Next.js 15 App Router
- ✅ Support natif des Server Components
- ✅ Excellentes performances (pas de bundle client lourd)
- ✅ Type-safe avec TypeScript
- ✅ Formatage des dates, nombres et devises
- ✅ Support du routage par locale
- ✅ Middleware intégré

**Alternatives évaluées**
- ❌ `react-intl`: Plus lourd, moins optimisé pour App Router
- ❌ `react-i18next`: Configuration complexe avec Server Components
- ❌ `next-translate`: Moins maintenu

---

## 📁 Structure des fichiers

```
/workspace
├── middleware.ts                    # À modifier pour i18n routing
├── next.config.mjs                  # Configuration i18n
├── i18n.ts                          # Configuration next-intl
├── messages/                        # NOUVEAU - Fichiers de traduction
│   ├── fr.json                      # Français (défaut)
│   ├── nl.json                      # Néerlandais
│   └── en.json                      # Anglais
├── app/
│   ├── [locale]/                    # NOUVEAU - Segment dynamique pour locale
│   │   ├── layout.tsx               # Layout avec NextIntlClientProvider
│   │   ├── page.tsx                 # Page d'accueil
│   │   ├── admin/
│   │   ├── gestionnaire/
│   │   ├── locataire/
│   │   ├── prestataire/
│   │   └── auth/
│   └── api/                         # API routes (hors locale)
├── components/
│   ├── language-switcher.tsx        # NOUVEAU - Sélecteur de langue
│   └── ...
├── lib/
│   ├── i18n/
│   │   ├── request.ts               # Helper pour Server Components
│   │   ├── client.ts                # Helper pour Client Components
│   │   └── config.ts                # Configuration partagée
│   └── ...
└── types/
    └── i18n.d.ts                    # Types TypeScript pour i18n
```

---

## 🔧 Plan d'implémentation par phases

### **Phase 1 : Configuration & Setup (Jour 1-2)**

#### 1.1 Installation des dépendances
```bash
npm install next-intl
```

#### 1.2 Configuration de base

**a) Créer `/workspace/i18n.ts`**
```typescript
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const locales = ['fr', 'nl', 'en'] as const;
export const defaultLocale = 'fr' as const;

export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  // Valider que la locale est supportée
  if (!locales.includes(locale as Locale)) notFound();

  return {
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
```

**b) Modifier `/workspace/next.config.mjs`**
```javascript
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default withNextIntl(nextConfig);
```

**c) Modifier `/workspace/middleware.ts`**
```typescript
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { locales, defaultLocale } from './i18n';

// Créer le middleware i18n
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed' // Ne pas préfixer la locale par défaut (fr)
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Routes à exclure de i18n (API, static files, etc.)
  const shouldSkipI18n = [
    '/api',
    '/_next',
    '/favicon.ico',
  ].some(path => pathname.startsWith(path));

  if (shouldSkipI18n) {
    return NextResponse.next();
  }

  // 2. Appliquer le middleware i18n
  const intlResponse = intlMiddleware(request);

  // 3. Routes publiques (accessible sans authentification)
  const publicRoutes = [
    '/auth/login',
    '/auth/signup',
    '/auth/signup-success',
    '/auth/reset-password',
    '/auth/update-password',
    '/auth/callback',
    '/auth/unauthorized',
    '/'
  ];

  // Extraire la locale du pathname
  const pathnameWithoutLocale = pathname.replace(/^\/(fr|nl|en)/, '') || '/';
  
  if (publicRoutes.includes(pathnameWithoutLocale)) {
    return intlResponse;
  }

  // 4. Routes protégées - authentification requise
  const protectedPrefixes = ['/admin', '/gestionnaire', '/locataire', '/prestataire'];
  const isProtectedRoute = protectedPrefixes.some(prefix => 
    pathnameWithoutLocale.startsWith(prefix)
  );

  if (isProtectedRoute) {
    let response = intlResponse || NextResponse.next();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user || !user.email_confirmed_at) {
        console.log('🚫 [MIDDLEWARE] Authentication failed');
        return NextResponse.redirect(
          new URL('/auth/login?reason=session_expired', request.url)
        );
      }

      return response;
    } catch (middlewareError) {
      console.error('❌ [MIDDLEWARE] Authentication error:', middlewareError);
      return NextResponse.redirect(
        new URL('/auth/login?reason=auth_error', request.url)
      );
    }
  }

  return intlResponse || NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

#### 1.3 Créer les fichiers de traduction de base

**Créer `/workspace/messages/fr.json`**
```json
{
  "common": {
    "loading": "Chargement...",
    "save": "Enregistrer",
    "cancel": "Annuler",
    "delete": "Supprimer",
    "edit": "Modifier",
    "confirm": "Confirmer",
    "back": "Retour",
    "next": "Suivant",
    "previous": "Précédent",
    "search": "Rechercher",
    "filter": "Filtrer",
    "actions": "Actions",
    "close": "Fermer",
    "submit": "Soumettre"
  },
  "navigation": {
    "dashboard": "Tableau de bord",
    "properties": "Propriétés",
    "interventions": "Interventions",
    "contacts": "Contacts",
    "profile": "Profil",
    "settings": "Paramètres",
    "logout": "Se déconnecter"
  },
  "auth": {
    "login": "Connexion",
    "signup": "Inscription",
    "email": "Email",
    "password": "Mot de passe",
    "forgotPassword": "Mot de passe oublié ?",
    "resetPassword": "Réinitialiser le mot de passe",
    "loginSuccess": "Connexion réussie",
    "loginError": "Échec de la connexion"
  },
  "errors": {
    "generic": "Une erreur est survenue",
    "networkError": "Erreur de connexion",
    "unauthorized": "Non autorisé",
    "notFound": "Page non trouvée"
  }
}
```

**Créer `/workspace/messages/nl.json`**
```json
{
  "common": {
    "loading": "Laden...",
    "save": "Opslaan",
    "cancel": "Annuleren",
    "delete": "Verwijderen",
    "edit": "Bewerken",
    "confirm": "Bevestigen",
    "back": "Terug",
    "next": "Volgende",
    "previous": "Vorige",
    "search": "Zoeken",
    "filter": "Filteren",
    "actions": "Acties",
    "close": "Sluiten",
    "submit": "Indienen"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "properties": "Eigenschappen",
    "interventions": "Interventies",
    "contacts": "Contacten",
    "profile": "Profiel",
    "settings": "Instellingen",
    "logout": "Uitloggen"
  },
  "auth": {
    "login": "Inloggen",
    "signup": "Registreren",
    "email": "E-mail",
    "password": "Wachtwoord",
    "forgotPassword": "Wachtwoord vergeten?",
    "resetPassword": "Wachtwoord resetten",
    "loginSuccess": "Login succesvol",
    "loginError": "Login mislukt"
  },
  "errors": {
    "generic": "Er is een fout opgetreden",
    "networkError": "Verbindingsfout",
    "unauthorized": "Niet geautoriseerd",
    "notFound": "Pagina niet gevonden"
  }
}
```

**Créer `/workspace/messages/en.json`**
```json
{
  "common": {
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "confirm": "Confirm",
    "back": "Back",
    "next": "Next",
    "previous": "Previous",
    "search": "Search",
    "filter": "Filter",
    "actions": "Actions",
    "close": "Close",
    "submit": "Submit"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "properties": "Properties",
    "interventions": "Interventions",
    "contacts": "Contacts",
    "profile": "Profile",
    "settings": "Settings",
    "logout": "Logout"
  },
  "auth": {
    "login": "Login",
    "signup": "Sign up",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot password?",
    "resetPassword": "Reset password",
    "loginSuccess": "Login successful",
    "loginError": "Login failed"
  },
  "errors": {
    "generic": "An error occurred",
    "networkError": "Network error",
    "unauthorized": "Unauthorized",
    "notFound": "Page not found"
  }
}
```

#### 1.4 Créer les helpers i18n

**Créer `/workspace/lib/i18n/request.ts`**
```typescript
import { getRequestConfig } from 'next-intl/server';

// Helper pour utiliser dans les Server Components
export { getTranslations, getFormatter } from 'next-intl/server';
```

**Créer `/workspace/lib/i18n/client.ts`**
```typescript
'use client';

// Helper pour utiliser dans les Client Components
export { useTranslations, useLocale, useFormatter } from 'next-intl';
```

**Créer `/workspace/lib/i18n/config.ts`**
```typescript
export const locales = ['fr', 'nl', 'en'] as const;
export const defaultLocale = 'fr' as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  fr: 'Français',
  nl: 'Nederlands',
  en: 'English',
};

export const localeFlags: Record<Locale, string> = {
  fr: '🇫🇷',
  nl: '🇳🇱',
  en: '🇬🇧',
};
```

---

### **Phase 2 : Restructuration des routes (Jour 3-4)**

#### 2.1 Créer le segment dynamique [locale]

**Actions à réaliser :**

1. Créer le dossier `/workspace/app/[locale]`
2. Déplacer tous les dossiers de routes existants dans `[locale]`
   - `admin/` → `[locale]/admin/`
   - `gestionnaire/` → `[locale]/gestionnaire/`
   - `locataire/` → `[locale]/locataire/`
   - `prestataire/` → `[locale]/prestataire/`
   - `auth/` → `[locale]/auth/`
   - `dashboard/` → `[locale]/dashboard/`
   - `page.tsx` → `[locale]/page.tsx`
3. **NE PAS déplacer** le dossier `api/` (reste à la racine)

#### 2.2 Créer le nouveau layout avec locale

**Créer `/workspace/app/[locale]/layout.tsx`**
```typescript
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  // Valider que la locale est supportée
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Charger les messages pour la locale actuelle
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
```

#### 2.3 Adapter le RootLayout

**Modifier `/workspace/app/layout.tsx`**
```typescript
import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { TeamStatusProvider } from "@/hooks/use-team-status";
import { ConnectionStatus } from "@/components/connection-status";
import { Toaster } from "@/components/ui/toaster";
import EnvironmentLogger from "@/components/environment-logger";
import { initializeLogging } from "@/lib/react-logger";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEIDO - Gestion Immobilière",
  description: "Plateforme de gestion immobilière multi-rôles pour propriétaires, locataires et prestataires",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialiser le système de logging
  if (typeof window !== 'undefined') {
    initializeLogging();
  }

  return (
    <html suppressHydrationWarning>
      <body 
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}
        suppressHydrationWarning={true}
      >
        <EnvironmentLogger />
        <AuthProvider>
          <TeamStatusProvider>
            <Suspense fallback={null}>{children}</Suspense>
            <ConnectionStatus />
            <Toaster />
          </TeamStatusProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
```

**Note importante :** Retirer l'attribut `lang="fr"` du `<html>` car il sera géré dynamiquement par le layout de locale.

---

### **Phase 3 : Composant de changement de langue (Jour 5)**

#### 3.1 Créer le Language Switcher

**Créer `/workspace/components/language-switcher.tsx`**
```typescript
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Languages } from 'lucide-react';
import { locales, localeNames, localeFlags, type Locale } from '@/lib/i18n/config';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: Locale) => {
    // Remplacer la locale dans le pathname
    const segments = pathname.split('/');
    const currentLocale = segments[1];
    
    if (locales.includes(currentLocale as Locale)) {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    
    const newPathname = segments.join('/');
    router.push(newPathname);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Languages className="h-4 w-4" />
          <span className="hidden md:inline">
            {localeFlags[locale as Locale]} {localeNames[locale as Locale]}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={locale === loc ? 'bg-accent' : ''}
          >
            <span className="mr-2">{localeFlags[loc]}</span>
            {localeNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

#### 3.2 Intégrer le Language Switcher

Ajouter le composant `<LanguageSwitcher />` dans :
- Header de l'admin
- Header du gestionnaire
- Header du locataire
- Header du prestataire
- Page de login/signup

---

### **Phase 4 : Migration des composants (Jour 6-15)**

#### 4.1 Stratégie de migration

**Ordre de priorité :**
1. **P1 - Critique** : Auth, Navigation, Erreurs
2. **P2 - Important** : Dashboards, Listings
3. **P3 - Normal** : Formulaires, Modals
4. **P4 - Basse** : Tooltips, Labels secondaires

#### 4.2 Pattern de migration pour Server Components

**Avant :**
```typescript
export default async function DashboardPage() {
  return (
    <div>
      <h1>Tableau de bord</h1>
      <p>Bienvenue sur votre tableau de bord</p>
    </div>
  );
}
```

**Après :**
```typescript
import { getTranslations } from 'next-intl/server';

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('welcome')}</p>
    </div>
  );
}
```

#### 4.3 Pattern de migration pour Client Components

**Avant :**
```typescript
'use client';

export function MyButton() {
  return <button>Enregistrer</button>;
}
```

**Après :**
```typescript
'use client';

import { useTranslations } from 'next-intl';

export function MyButton() {
  const t = useTranslations('common');
  
  return <button>{t('save')}</button>;
}
```

#### 4.4 Migration des messages de toast/notifications

**Avant :**
```typescript
toast({
  title: "Succès",
  description: "L'intervention a été créée",
});
```

**Après :**
```typescript
const t = useTranslations('interventions');

toast({
  title: t('createSuccess.title'),
  description: t('createSuccess.description'),
});
```

#### 4.5 Liste des composants à migrer

**Phase 4.1 - Auth & Navigation (P1)**
- [ ] `/app/[locale]/auth/login/page.tsx`
- [ ] `/app/[locale]/auth/signup/page.tsx`
- [ ] `/app/[locale]/auth/reset-password/page.tsx`
- [ ] `/components/ui/navigation-menu.tsx`
- [ ] Headers de chaque rôle

**Phase 4.2 - Dashboards (P2)**
- [ ] `/app/[locale]/admin/dashboard/page.tsx`
- [ ] `/app/[locale]/gestionnaire/dashboard/page.tsx`
- [ ] `/app/[locale]/locataire/dashboard/page.tsx`
- [ ] `/app/[locale]/prestataire/dashboard/page.tsx`

**Phase 4.3 - Interventions (P2)**
- [ ] `/components/intervention/intervention-card.tsx`
- [ ] `/components/intervention/intervention-action-panel.tsx`
- [ ] `/components/intervention/intervention-details-card.tsx`
- [ ] Tous les modals d'intervention (15+ fichiers)

**Phase 4.4 - Propriétés & Lots (P2)**
- [ ] `/components/properties/properties-list.tsx`
- [ ] `/components/lot-card.tsx`
- [ ] Property creation wizard (5+ composants)

**Phase 4.5 - Quotes & Devis (P3)**
- [ ] `/components/quotes/quotes-list.tsx`
- [ ] `/components/quotes/quote-card.tsx`
- [ ] `/components/quotes/quote-validation-modal.tsx`

**Phase 4.6 - UI Components (P4)**
- [ ] Tous les composants Shadcn customisés
- [ ] Tooltips, badges, alerts

---

### **Phase 5 : Traduction complète des fichiers JSON (Jour 16-18)**

#### 5.1 Structure complète des fichiers de traduction

Organiser les traductions par domaine fonctionnel :

```json
{
  "common": { ... },
  "navigation": { ... },
  "auth": { ... },
  "dashboard": { ... },
  "interventions": {
    "title": "Interventions",
    "create": "Créer une intervention",
    "status": {
      "draft": "Brouillon",
      "pending": "En attente",
      "scheduled": "Planifiée",
      "in_progress": "En cours",
      "completed": "Terminée",
      "cancelled": "Annulée"
    },
    "actions": { ... },
    "modals": { ... }
  },
  "properties": { ... },
  "contacts": { ... },
  "quotes": { ... },
  "profile": { ... },
  "errors": { ... },
  "validations": { ... },
  "notifications": { ... }
}
```

#### 5.2 Outils de traduction recommandés

1. **Traduction automatique initiale** :
   - DeepL API (meilleure qualité pour FR ↔ NL ↔ EN)
   - Google Translate API (alternative)

2. **Révision manuelle obligatoire** :
   - Termes métier immobilier
   - Contexte belge/français/néerlandais
   - Conventions typographiques

3. **Script de détection des clés manquantes** :
```bash
# Créer un script pour valider la cohérence
npm run i18n:check
```

---

### **Phase 6 : Adaptation de Supabase (Jour 19-20)**

#### 6.1 Emails transactionnels

**Problème** : Les emails Supabase Auth sont en anglais par défaut.

**Solutions** :

1. **Custom Email Templates** :
   - Aller dans Supabase Dashboard → Auth → Email Templates
   - Personnaliser les templates :
     - Confirmation email
     - Magic link
     - Password reset
   - Utiliser des variables conditionnelles selon la locale

2. **Trigger DB pour locale** :
```sql
-- Ajouter une colonne locale à la table user_metadata
ALTER TABLE auth.users 
ADD COLUMN locale VARCHAR(2) DEFAULT 'fr';

-- Créer une fonction pour mettre à jour la locale
CREATE OR REPLACE FUNCTION public.update_user_locale(
  new_locale VARCHAR(2)
)
RETURNS void AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{locale}',
      to_jsonb(new_locale)
    )
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 6.2 Données de la base de données

**Contenu multilingue dans les tables** :

Option 1 - Colonnes dédiées (simple mais verbeux) :
```sql
ALTER TABLE interventions
ADD COLUMN title_fr TEXT,
ADD COLUMN title_nl TEXT,
ADD COLUMN title_en TEXT;
```

Option 2 - Colonne JSONB (recommandé) :
```sql
ALTER TABLE interventions
ADD COLUMN title_i18n JSONB DEFAULT '{"fr": "", "nl": "", "en": ""}'::jsonb;
```

**Fonctions helper** :
```typescript
// /lib/i18n/db-helpers.ts
export function getLocalizedField(
  obj: any,
  fieldName: string,
  locale: string,
  fallbackLocale = 'fr'
): string {
  const i18nField = `${fieldName}_i18n`;
  
  if (obj[i18nField]) {
    return obj[i18nField][locale] || obj[i18nField][fallbackLocale] || '';
  }
  
  // Fallback sur le champ non-i18n
  return obj[fieldName] || '';
}
```

---

### **Phase 7 : SEO & Metadata (Jour 21)**

#### 7.1 Metadata par langue

**Pattern à appliquer dans chaque page :**

```typescript
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ 
  params: { locale } 
}: { 
  params: { locale: string } 
}) {
  const t = await getTranslations({ locale, namespace: 'metadata' });
  
  return {
    title: t('dashboard.title'),
    description: t('dashboard.description'),
    alternates: {
      canonical: `/${locale}/dashboard`,
      languages: {
        'fr': '/fr/dashboard',
        'nl': '/nl/dashboard',
        'en': '/en/dashboard',
      },
    },
  };
}
```

#### 7.2 Sitemap multilingue

**Créer `/workspace/app/sitemap.ts`**
```typescript
import { MetadataRoute } from 'next';
import { locales } from '@/i18n';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seido.app';
  
  const routes = [
    '',
    '/dashboard',
    '/interventions',
    '/properties',
    '/contacts',
  ];
  
  const sitemap: MetadataRoute.Sitemap = [];
  
  routes.forEach(route => {
    locales.forEach(locale => {
      sitemap.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: route === '' ? 1 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            locales.map(loc => [loc, `${baseUrl}/${loc}${route}`])
          ),
        },
      });
    });
  });
  
  return sitemap;
}
```

---

### **Phase 8 : Testing & Validation (Jour 22-25)**

#### 8.1 Tests unitaires i18n

**Créer `/test/i18n/translations.test.ts`**
```typescript
import { describe, it, expect } from 'vitest';
import frMessages from '@/messages/fr.json';
import nlMessages from '@/messages/nl.json';
import enMessages from '@/messages/en.json';

describe('Translations completeness', () => {
  const getKeys = (obj: any, prefix = ''): string[] => {
    return Object.entries(obj).flatMap(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        return getKeys(value, fullKey);
      }
      return [fullKey];
    });
  };

  it('should have same keys in all locales', () => {
    const frKeys = getKeys(frMessages).sort();
    const nlKeys = getKeys(nlMessages).sort();
    const enKeys = getKeys(enMessages).sort();
    
    expect(nlKeys).toEqual(frKeys);
    expect(enKeys).toEqual(frKeys);
  });
  
  it('should not have empty translations', () => {
    const checkEmpty = (obj: any, locale: string, path = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof value === 'string') {
          expect(value.trim(), `Empty translation at ${locale}:${currentPath}`).not.toBe('');
        } else if (typeof value === 'object') {
          checkEmpty(value, locale, currentPath);
        }
      });
    };
    
    checkEmpty(frMessages, 'fr');
    checkEmpty(nlMessages, 'nl');
    checkEmpty(enMessages, 'en');
  });
});
```

#### 8.2 Tests E2E multilingues

**Créer `/test/e2e/i18n.spec.ts`**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Internationalization', () => {
  test('should display content in French by default', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/fr/);
    await expect(page.locator('h1')).toContainText('Tableau de bord');
  });
  
  test('should switch to Dutch', async ({ page }) => {
    await page.goto('/fr/dashboard');
    
    // Ouvrir le sélecteur de langue
    await page.click('[aria-label="Language switcher"]');
    await page.click('text=Nederlands');
    
    // Vérifier le changement
    await expect(page).toHaveURL(/\/nl\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
  
  test('should persist language preference', async ({ page, context }) => {
    await page.goto('/fr/dashboard');
    
    // Changer de langue
    await page.click('[aria-label="Language switcher"]');
    await page.click('text=English');
    
    // Naviguer vers une autre page
    await page.click('text=Interventions');
    
    // Vérifier que la langue est conservée
    await expect(page).toHaveURL(/\/en\/interventions/);
  });
});
```

#### 8.3 Checklist de validation manuelle

- [ ] Tous les textes sont traduits (pas de FR dans version NL/EN)
- [ ] Le changement de langue fonctionne sur toutes les pages
- [ ] Les URLs sont correctement préfixées
- [ ] Les formats de date/heure sont adaptés
- [ ] Les formats de nombres/devises sont adaptés
- [ ] Les emails Supabase sont personnalisés
- [ ] Les messages d'erreur sont traduits
- [ ] Les notifications toast sont traduites
- [ ] Les metadata SEO sont adaptées
- [ ] Le sitemap inclut toutes les langues
- [ ] Les performances sont maintenues
- [ ] Aucun texte n'est coupé dans l'UI (problème de longueur)
- [ ] L'expérience mobile est fluide

---

### **Phase 9 : Performance & Optimisation (Jour 26-27)**

#### 9.1 Lazy loading des traductions

```typescript
// Charger uniquement les namespaces nécessaires
const t = await getTranslations('interventions');
// Au lieu de charger toutes les traductions
```

#### 9.2 Mise en cache

```typescript
// next.config.mjs
export default withNextIntl({
  // ... autres configs
  experimental: {
    optimizePackageImports: ['next-intl'],
  },
});
```

#### 9.3 Bundle size analysis

```bash
npm run analyze:bundle
# Vérifier que next-intl n'impacte pas trop le bundle
```

---

### **Phase 10 : Documentation & Formation (Jour 28)**

#### 10.1 Documentation développeur

**Créer `/docs/i18n/DEVELOPER_GUIDE.md`**
- Comment ajouter une nouvelle traduction
- Comment migrer un composant
- Bonnes pratiques
- Patterns à suivre

#### 10.2 Guide utilisateur

**Créer `/docs/i18n/USER_GUIDE.md`**
- Comment changer de langue
- Langues disponibles
- FAQ

---

## 🎯 Métriques de succès

### Techniques
- ✅ 0 erreur de build
- ✅ 100% des clés de traduction présentes dans les 3 langues
- ✅ Bundle size < +50KB par rapport à avant
- ✅ Lighthouse score maintenu (>90)
- ✅ Tous les tests E2E passent

### Fonctionnelles
- ✅ Changement de langue instantané
- ✅ Persistance de la préférence utilisateur
- ✅ URLs SEO-friendly avec locale
- ✅ Emails Supabase personnalisés

### Business
- ✅ Support complet FR/NL/EN
- ✅ UX cohérente dans toutes les langues
- ✅ Prêt pour ajout de nouvelles langues

---

## 🚨 Risques & Mitigations

| Risque | Impact | Probabilité | Mitigation |
|--------|--------|-------------|------------|
| Traductions incomplètes | Élevé | Moyen | Script de validation automatique |
| Régression fonctionnelle | Élevé | Moyen | Tests E2E complets + review |
| Performance dégradée | Moyen | Faible | Bundle analysis + lazy loading |
| Problème de routage | Élevé | Faible | Tests middleware exhaustifs |
| Conflit middleware auth/i18n | Élevé | Moyen | Ordre d'exécution bien défini |

---

## 📝 Checklist de déploiement

### Pré-déploiement
- [ ] Toutes les phases terminées
- [ ] Tests unitaires OK
- [ ] Tests E2E OK
- [ ] Review code complet
- [ ] Documentation à jour

### Configuration production
- [ ] Variables d'environnement
- [ ] Templates emails Supabase
- [ ] Redirections configurées
- [ ] Sitemap soumis

### Post-déploiement
- [ ] Smoke tests en production
- [ ] Monitoring activé
- [ ] Feedback utilisateurs collecté
- [ ] Performance monitoring

---

## 🔮 Évolutions futures

### Phase 11 - Contenu dynamique (Optionnel)
- Traduction du contenu utilisateur (descriptions, etc.)
- Interface d'admin pour gérer les traductions
- API de traduction automatique

### Phase 12 - Langues supplémentaires (Optionnel)
- Allemand (DE)
- Espagnol (ES)
- Italien (IT)

---

## 📚 Ressources

### Documentation
- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Next.js i18n Routing](https://nextjs.org/docs/app/building-your-application/routing/internationalization)
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)

### Outils
- [DeepL API](https://www.deepl.com/pro-api) - Traduction de qualité
- [i18n Ally](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally) - Extension VS Code
- [Translation Manager](https://github.com/amannn/next-intl/tree/main/packages/next-intl#translation-manager) - Gestion des traductions

---

## 👥 Équipe & Responsabilités

| Rôle | Responsabilité | Phases |
|------|---------------|--------|
| Lead Dev | Architecture, setup, review | 1-2, 10 |
| Dev Frontend | Migration composants | 4-5 |
| Dev Backend | Supabase, API | 6 |
| QA | Tests, validation | 8 |
| UX/UI | Révision traductions, ergonomie | 5, 8 |
| DevOps | Déploiement, monitoring | 9-10 |

---

## ⏱️ Timeline récapitulatif

**Total estimé : 28 jours (5-6 semaines)**

| Phase | Durée | Dates estimées |
|-------|-------|----------------|
| Phase 1 : Setup | 2 jours | J1-J2 |
| Phase 2 : Restructuration | 2 jours | J3-J4 |
| Phase 3 : Language Switcher | 1 jour | J5 |
| Phase 4 : Migration composants | 10 jours | J6-J15 |
| Phase 5 : Traductions complètes | 3 jours | J16-J18 |
| Phase 6 : Supabase | 2 jours | J19-J20 |
| Phase 7 : SEO | 1 jour | J21 |
| Phase 8 : Testing | 4 jours | J22-J25 |
| Phase 9 : Optimisation | 2 jours | J26-J27 |
| Phase 10 : Documentation | 1 jour | J28 |

---

## 📞 Support & Questions

Pour toute question sur l'implémentation i18n :
1. Consulter d'abord ce document
2. Vérifier la documentation next-intl
3. Créer une issue GitHub avec le tag `i18n`

---

**Document créé le :** 30 septembre 2025  
**Dernière mise à jour :** 30 septembre 2025  
**Version :** 1.0  
**Auteur :** Claude (AI Assistant)