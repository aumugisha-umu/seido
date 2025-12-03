'use client'

/**
 * LandingHeader - Header réutilisable pour la landing et les pages légales
 *
 * @example
 * <LandingHeader showNav={true} />           // Landing page
 * <LandingHeader showLegalNav={true} />      // Pages légales avec navigation
 */

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'

// Navigation items for legal pages
const legalNavItems = [
  { href: '/conditions-generales', label: 'CGU' },
  { href: '/confidentialite', label: 'Confidentialité' },
  { href: '/cookies', label: 'Cookies' },
]

export interface LandingHeaderProps {
  /** Afficher la navigation landing (Fonctionnalités, Pour qui, Tarifs) */
  showNav?: boolean
  /** Afficher la navigation légale (CGU, Confidentialité, Cookies) */
  showLegalNav?: boolean
  /** Classes CSS additionnelles */
  className?: string
}

export function LandingHeader({
  showNav = true,
  showLegalNav = false,
  className
}: LandingHeaderProps) {
  const pathname = usePathname()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Logo adaptatif selon le thème
  const logoSrc = mounted && resolvedTheme === 'dark'
    ? '/images/Logo/Logo_Seido_White.png'
    : '/images/Logo/Logo_Seido_Color.png'

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b',
        // Light mode: frosted glass effect with lavender tint
        'border-outline-variant/30 bg-surface/70 backdrop-blur-xl',
        'supports-[backdrop-filter]:bg-surface/40',
        // Dark mode: original glassmorphism
        'dark:border-white/10 dark:bg-[#0f172a]/70',
        'dark:supports-[backdrop-filter]:dark:bg-[#0f172a]/40',
        className
      )}
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo - adaptatif selon le thème */}
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <Image
            src={logoSrc}
            alt="SEIDO"
            width={120}
            height={36}
            className="h-9 w-auto"
            priority
          />
        </Link>

        {/* Navigation - Landing page */}
        {showNav && (
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium text-on-surface-variant hover:text-on-surface dark:text-white/70 dark:hover:text-white transition-colors"
            >
              Fonctionnalités
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-on-surface-variant hover:text-on-surface dark:text-white/70 dark:hover:text-white transition-colors"
            >
              Tarifs
            </a>
            <a
              href="#contact"
              className="text-sm font-medium text-on-surface-variant hover:text-on-surface dark:text-white/70 dark:hover:text-white transition-colors"
            >
              Contact
            </a>
            <a
              href="#faq"
              className="text-sm font-medium text-on-surface-variant hover:text-on-surface dark:text-white/70 dark:hover:text-white transition-colors"
            >
              FAQ
            </a>
          </nav>
        )}

        {/* Navigation - Legal pages */}
        {showLegalNav && (
          <nav className="hidden md:flex items-center gap-6">
            {legalNavItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'text-sm font-medium transition-colors',
                    isActive
                      ? 'text-on-surface border-b-2 border-primary pb-1 dark:text-white dark:border-purple-500'
                      : 'text-on-surface-variant hover:text-on-surface dark:text-white/70 dark:hover:text-white'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        )}

        {/* Theme Toggle + Auth Buttons */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <ThemeToggle
            variant="toggle"
            className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container dark:text-white/70 dark:hover:text-white dark:hover:bg-white/10"
          />

          <Link href="/auth/login">
            <Button
              variant="ghost"
              size="sm"
              className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
            >
              Se connecter
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-0 shadow-lg shadow-purple-500/25"
            >
              Commencer <Sparkles className="w-3 h-3 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
