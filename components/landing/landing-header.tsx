'use client'

/**
 * LandingHeader - Header reutilisable pour la landing et les pages legales
 *
 * @example
 * <LandingHeader showNav={true} />           // Landing page
 * <LandingHeader showLegalNav={true} />      // Pages legales avec navigation
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Sparkles, LogIn, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Navigation items for landing page
const landingNavItems = [
  { href: '#features', label: 'Fonctionnalités' },
  { href: '#pricing', label: 'Tarifs' },
  { href: '#contact', label: 'Contact' },
  { href: '#faq', label: 'FAQ' },
]

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleCloseMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  // Scroll-spy: observe section visibility using IntersectionObserver
  useEffect(() => {
    if (!showNav) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
            return
          }
        }
      },
      {
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

  // Close mobile menu on scroll
  useEffect(() => {
    if (!mobileMenuOpen) return
    window.addEventListener('scroll', handleCloseMobileMenu, { passive: true })
    return () => window.removeEventListener('scroll', handleCloseMobileMenu)
  }, [mobileMenuOpen, handleCloseMobileMenu])

  const getLandingNavClass = (sectionId: string) =>
    cn(
      'text-sm font-medium transition-colors whitespace-nowrap leading-9 relative pb-1',
      activeSection === sectionId
        ? 'text-white font-semibold border-b-2 border-blue-500'
        : 'text-white/80 hover:text-white border-b-2 border-transparent'
    )

  // Determine which nav items to show in mobile menu
  const mobileNavItems = showNav
    ? landingNavItems
    : showLegalNav
      ? legalNavItems
      : showBlogNav
        ? [{ href: '/', label: 'Accueil' }, { href: '/blog', label: 'Tous les articles' }]
        : []

  const hasMobileNav = mobileNavItems.length > 0

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-white/10',
        'bg-slate-950/70 backdrop-blur-xl',
        'supports-[backdrop-filter]:bg-slate-950/40',
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

          {/* Navigation - Landing page (desktop) */}
          {showNav && (
            <nav className="hidden md:flex items-center gap-6 lg:gap-8 flex-1 justify-center">
              {landingNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={getLandingNavClass(item.href.replace('#', ''))}
                >
                  {item.label}
                </a>
              ))}
              <Link
                href="/blog"
                className="text-sm font-medium text-white/80 hover:text-white transition-colors whitespace-nowrap leading-9 pb-1 border-b-2 border-transparent"
              >
                Blog
              </Link>
            </nav>
          )}

          {/* Navigation - Legal pages (desktop) */}
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
                        : 'text-white/80 hover:text-white'
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          )}

          {/* Navigation - Blog pages (desktop) */}
          {showBlogNav && (
            <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
              <Link
                href="/"
                className="text-sm font-medium text-white/80 hover:text-white transition-colors whitespace-nowrap leading-9"
              >
                Accueil
              </Link>
              <Link
                href="/blog"
                className={cn(
                  'text-sm font-medium transition-colors whitespace-nowrap leading-9',
                  pathname === '/blog'
                    ? 'text-white border-b-2 border-blue-500 pb-1'
                    : 'text-white/80 hover:text-white'
                )}
              >
                Tous les articles
              </Link>
            </nav>
          )}

          {/* Auth Buttons + Hamburger */}
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

            {/* Hamburger menu button (mobile only) */}
            {hasMobileNav && (
              <button
                className="md:hidden p-2 text-white/80 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {hasMobileNav && (
        <div
          className={cn(
            'md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-out',
            mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <nav className="px-4 pb-4 pt-2 space-y-1 border-t border-white/10">
            {mobileNavItems.map((item) => {
              const isAnchor = item.href.startsWith('#')
              const isActive = !isAnchor && pathname === item.href

              if (isAnchor) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block py-3 px-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    onClick={handleCloseMobileMenu}
                  >
                    {item.label}
                  </a>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block py-3 px-3 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'text-white bg-white/10'
                      : 'text-white/80 hover:text-white hover:bg-white/5'
                  )}
                  onClick={handleCloseMobileMenu}
                >
                  {item.label}
                </Link>
              )
            })}

            {/* Blog link for landing nav */}
            {showNav && (
              <Link
                href="/blog"
                className="block py-3 px-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                onClick={handleCloseMobileMenu}
              >
                Blog
              </Link>
            )}

            {/* Auth buttons */}
            <div className="pt-3 mt-3 border-t border-white/10 flex flex-col gap-2">
              <Link href="/auth/login" onClick={handleCloseMobileMenu}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-white hover:bg-white/10 hover:text-white"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Se connecter
                </Button>
              </Link>
              <Link href="/auth/signup" onClick={handleCloseMobileMenu}>
                <Button
                  size="sm"
                  className="w-full justify-center bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 border-0 shadow-lg shadow-blue-500/25"
                >
                  Essayer gratuitement
                  <Sparkles className="w-3 h-3 ml-2" />
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
