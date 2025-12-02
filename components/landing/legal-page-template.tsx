'use client'

/**
 * LegalPageTemplate - Template BEM réutilisable pour les pages légales
 *
 * Architecture BEM:
 * - Block: legal-page
 * - Elements: __container, __header, __title, __nav, __content, __section, __text, __list
 * - Modifiers: --highlight, --card
 *
 * @example
 * <LegalPageTemplate title="CGU" lastUpdated="Septembre 2025">
 *   <LegalSection title="Article 1">
 *     <LegalText>Contenu...</LegalText>
 *   </LegalSection>
 * </LegalPageTemplate>
 */

import { cn } from '@/lib/utils'
import { LandingHeader } from './landing-header'

// ============================================================================
// Types
// ============================================================================

export interface LegalPageTemplateProps {
  /** Titre principal (H1) */
  title: string
  /** Date de dernière mise à jour */
  lastUpdated?: string
  /** Contenu formaté */
  children: React.ReactNode
  /** Classes CSS additionnelles */
  className?: string
}

export interface LegalSectionProps {
  /** Titre de la section (H2) */
  title: string
  /** ID pour les ancres */
  id?: string
  /** Contenu de la section */
  children: React.ReactNode
  /** Classes CSS additionnelles */
  className?: string
}

export interface LegalSubsectionProps {
  /** Titre de la sous-section (H3) */
  title: string
  /** Contenu de la sous-section */
  children: React.ReactNode
  /** Classes CSS additionnelles */
  className?: string
}

export interface LegalTextProps {
  /** Contenu du paragraphe */
  children: React.ReactNode
  /** Classes CSS additionnelles */
  className?: string
}

export interface LegalListProps {
  /** Items de la liste */
  items: (string | React.ReactNode)[]
  /** Type de liste */
  ordered?: boolean
  /** Classes CSS additionnelles */
  className?: string
}

export interface LegalHighlightProps {
  /** Contenu à mettre en évidence */
  children: React.ReactNode
  /** Classes CSS additionnelles */
  className?: string
}

export interface LegalCardProps {
  /** Titre de la carte (optionnel) */
  title?: string
  /** Contenu de la carte */
  children: React.ReactNode
  /** Classes CSS additionnelles */
  className?: string
}

// ============================================================================
// Styles BEM (Tailwind)
// ============================================================================

const styles = {
  // Block
  page: 'min-h-screen',

  // Container
  container: 'container mx-auto px-4 py-6 md:py-10',

  // Header
  header: 'mb-8',
  headerInner: 'max-w-4xl mx-auto',
  title: 'text-3xl md:text-4xl font-bold text-white mb-4',
  subtitle: 'text-white/60 text-sm',

  // Content
  content: 'max-w-4xl mx-auto',

  // Section
  section: 'mb-10',
  sectionTitle: 'text-2xl font-bold text-white mb-6',

  // Subsection
  subsection: 'mb-6',
  subsectionTitle: 'text-xl font-semibold text-white mb-4',

  // Text
  text: 'text-white/80 mb-4 leading-relaxed',

  // List
  list: 'space-y-2 text-white/80 mb-4 ml-6',
  listItem: 'leading-relaxed',
  listBullet: 'list-disc',
  listOrdered: 'list-decimal',

  // Highlight
  highlight: 'font-semibold text-white',

  // Card (glassmorphism)
  card: cn(
    'p-6 md:p-8 rounded-2xl mb-8',
    'border border-white/10',
    'bg-white/5 backdrop-blur-sm'
  ),
  cardTitle: 'text-lg font-semibold text-white mb-4',

  // Footer
  footer: cn(
    'mt-16 pt-8 border-t border-white/10',
    'text-center text-sm text-white/40'
  ),
}

// ============================================================================
// Main Template Component
// ============================================================================

export function LegalPageTemplate({
  title,
  lastUpdated,
  children,
  className
}: LegalPageTemplateProps) {
  return (
    <div className={cn(styles.page, className)}>
      {/* Shared Header with legal navigation */}
      <LandingHeader showNav={false} showLegalNav={true} />

      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <h1 className={styles.title}>{title}</h1>
            {lastUpdated && (
              <p className={styles.subtitle}>
                Dernière mise à jour : {lastUpdated}
              </p>
            )}
          </div>
        </header>

        {/* Content */}
        <div className={styles.content}>
          {children}
        </div>

        {/* Footer */}
        <footer className={styles.footer}>
          <p>
            <strong className="text-white/60">UMUMENTUM SRL</strong> - SEIDO
          </p>
          <p className="mt-1">
            Rue de Grand-Bigard 14, 1082 Berchem-Sainte-Agathe, Belgique
          </p>
          <p className="mt-1">
            BCE : 0775.691.974 | TVA : BE0775691974
          </p>
        </footer>
      </div>
    </div>
  )
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Section avec titre H2
 */
export function LegalSection({
  title,
  id,
  children,
  className
}: LegalSectionProps) {
  const sectionId = id || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  return (
    <section id={sectionId} className={cn(styles.section, className)}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  )
}

/**
 * Sous-section avec titre H3
 */
export function LegalSubsection({
  title,
  children,
  className
}: LegalSubsectionProps) {
  return (
    <div className={cn(styles.subsection, className)}>
      <h3 className={styles.subsectionTitle}>{title}</h3>
      {children}
    </div>
  )
}

/**
 * Paragraphe stylisé
 */
export function LegalText({
  children,
  className
}: LegalTextProps) {
  return (
    <p className={cn(styles.text, className)}>
      {children}
    </p>
  )
}

/**
 * Liste stylisée
 */
export function LegalList({
  items,
  ordered = false,
  className
}: LegalListProps) {
  const ListTag = ordered ? 'ol' : 'ul'
  const listStyle = ordered ? styles.listOrdered : styles.listBullet

  return (
    <ListTag className={cn(styles.list, listStyle, className)}>
      {items.map((item, index) => (
        <li key={index} className={styles.listItem}>
          {item}
        </li>
      ))}
    </ListTag>
  )
}

/**
 * Mise en évidence (bold, important)
 */
export function LegalHighlight({
  children,
  className
}: LegalHighlightProps) {
  return (
    <strong className={cn(styles.highlight, className)}>
      {children}
    </strong>
  )
}

/**
 * Carte avec effet glassmorphism
 */
export function LegalCard({
  title,
  children,
  className
}: LegalCardProps) {
  return (
    <div className={cn(styles.card, className)}>
      {title && <h4 className={styles.cardTitle}>{title}</h4>}
      {children}
    </div>
  )
}
