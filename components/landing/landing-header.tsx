'use client'

/**
 * LandingHeader - Header reutilisable pour la landing et les pages legales
 *
 * @example
 * <LandingHeader showNav={true} />           // Landing page
 * <LandingHeader showLegalNav={true} />      // Pages legales avec navigation
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Sparkles, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Navigation items for legal pages
const legalNavItems = [
  { href: '/conditions-generales', label: 'CGU' },
  { href: '/confidentialite', label: 'Confidentialite' },
  { href: '/cookies', label: 'Cookies' },
]

// Section IDs for scroll-spy (must match href anchors)
const SCROLL_SPY_SECTIONS = ['features', 'pricing', 'contact', 'faq']

export interface LandingHeaderProps {
  /** Afficher la navigation landing (Fonctionnalites, Pour qui, Tarifs) */
  showNav?: boolean
  /** Afficher la navigation legale (CGU, Confidentialite, Cookies) */
  showLegalNav?: boolean
  /** Afficher la navigation blog (Accueil, Tous les articles) */
  showBlogNav?: boolean
  /** Classes CSS additionnelles */
  className?: string
}

export function LandingHeader({
  showNav = true,
  showLegalNav = false,
  showBlogNav = false,
  className
}: LandingHeaderProps) {
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState<string | null>(null)

  // Scroll-spy: observe section visibility using IntersectionObserver
  useEffect(() => {
    if (!showNav) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first intersecting section (top-most visible)
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
            return
          }
        }
      },
      {
        // rootMargin: negative top to account for sticky header, large bottom to detect early
        rootMargin: '-80px 0px -40% 0px',
        threshold: 0.1,
      }
    )

    const elements: Element[] = []
    for (const sectionId of SCROLL_SPY_SECTIONS) {
      const el = document.getElementById(sectionId)
      if (el) {
        observer.observe(el)
        elements.push(el)
      }
    }

    return () => {
      for (const el of elements) {
        observer.unobserve(el)
      }
    }
  }, [showNav])

  const getLandingNavClass = (sectionId: string) =>
    cn(
      'text-sm font-medium transition-colors whitespace-nowrap leading-9 relative pb-1',
      activeSection === sectionId
        ? 'text-white font-semibold border-b-2 border-blue-500'
        : 'text-white/70 hover:text-white border-b-2 border-transparent'
    )

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-white/10',
        'bg-[#0f172a]/70 backdrop-blur-xl',
        'supports-[backdrop-filter]:bg-[#0f172a]/40',
        className
      )}
    >
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center hover:opacity-80 transition-opacity flex-shrink-0">
            <Image
              src="/images/Logo/Logo_Seido_White.png"
              alt="SEIDO"
              width={96}
              height={36}
              sizes="96px"
              className="h-7 sm:h-9 w-auto"
              priority
            />
          </Link>

          {/* Navigation - Landing page */}
          {showNav && (
            <nav className="hidden md:flex items-center gap-6 lg:gap-8 flex-1 justify-center">
              <a
                href="#features"
                className={getLandingNavClass('features')}
              >
                Fonctionnalites
              </a>
              <a
                href="#pricing"
                className={getLandingNavClass('pricing')}
              >
                Tarifs
              </a>
              <a
                href="#contact"
                className={getLandingNavClass('contact')}
              >
                Contact
              </a>
              <a
                href="#faq"
                className={getLandingNavClass('faq')}
              >
                FAQ
              </a>
              <Link
                href="/blog"
                className="text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap leading-9 pb-1 border-b-2 border-transparent"
              >
                Blog
              </Link>
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

          {/* Navigation - Blog pages */}
          {showBlogNav && (
            <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
              <Link
                href="/"
                className="text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap leading-9"
              >
                Accueil
              </Link>
              <Link
                href="/blog"
                className={cn(
                  'text-sm font-medium transition-colors whitespace-nowrap leading-9',
                  pathname === '/blog'
                    ? 'text-white border-b-2 border-blue-500 pb-1'
                    : 'text-white/70 hover:text-white'
                )}
              >
                Tous les articles
              </Link>
            </nav>
          )}

          {/* Auth Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
            <Link href="/auth/login" className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 hover:text-white px-2 sm:px-3"
                aria-label="Se connecter"
              >
                <LogIn className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Se connecter</span>
              </Button>
            </Link>
            <Link href="/auth/signup" className="flex items-center">
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 border-0 shadow-lg shadow-blue-500/25 px-2.5 sm:px-3"
              >
                <span className="hidden sm:inline">Essayer gratuitement</span>
                <span className="sm:hidden text-xs">Essai gratuit</span>
                <Sparkles className="w-3 h-3 ml-1 sm:ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
