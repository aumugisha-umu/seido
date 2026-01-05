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
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-white/10',
        'bg-[#0f172a]/70 backdrop-blur-xl',
        'supports-[backdrop-filter]:bg-[#0f172a]/40',
        className
      )}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity flex-shrink-0">
            <Image
              src="/images/Logo/Logo_Seido_White.png"
              alt="SEIDO"
              width={96}
              height={36}
              sizes="96px"
              className="h-9 w-auto"
              priority
            />
          </Link>

          {/* Navigation - Landing page */}
          {showNav && (
            <nav className="hidden md:flex items-center gap-6 lg:gap-8 flex-1 justify-center">
              <a
                href="#features"
                className="text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap leading-9"
              >
                Fonctionnalités
              </a>
              <a
                href="#pricing"
                className="text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap leading-9"
              >
                Tarifs
              </a>
              <a
                href="#contact"
                className="text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap leading-9"
              >
                Contact
              </a>
              <a
                href="#faq"
                className="text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap leading-9"
              >
                FAQ
              </a>
            </nav>
          )}

          {/* Navigation - Legal pages */}
          {showLegalNav && (
            <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
              {legalNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'text-sm font-medium transition-colors whitespace-nowrap leading-9',
                      isActive
                        ? 'text-white border-b-2 border-blue-500 pb-1'
                        : 'text-white/70 hover:text-white'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          )}

          {/* Auth Buttons */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <Link href="/auth/login" className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 hover:text-white"
              >
                Se connecter
              </Button>
            </Link>
            <Link href="/auth/signup" className="flex items-center">
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 border-0 shadow-lg shadow-blue-500/25"
              >
                Commencer <Sparkles className="w-3 h-3 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
