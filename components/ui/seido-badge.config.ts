/**
 * SeidoBadge Configuration
 *
 * Configuration centralisée pour le composant SeidoBadge.
 * Les COULEURS sont définies dans tailwind.config.js (badge-*)
 * Ce fichier contient uniquement les MAPPINGS (type/value -> color/label/icon)
 *
 * @see tailwind.config.js - badge-* colors
 * @see seido-badge.tsx - composant principal
 */

import type { LucideIcon } from 'lucide-react'
import {
  Clock,
  XCircle,
  CheckCircle,
  CheckCircle2,
  FileText,
  Calendar,
  Play,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Minus,
  ArrowDown,
  UserCog,
  Wrench,
  Home,
  RefreshCw,
  Send,
  User,
  Users,
  UserMinus,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

/**
 * Types de badge sémantiques
 */
export type BadgeType =
  | 'status'    // Statut d'intervention
  | 'urgency'   // Niveau d'urgence
  | 'role'      // Rôle utilisateur
  | 'contract'  // Statut de contrat
  | 'quote'     // Statut de devis
  | 'slot'      // Statut de créneau
  | 'mode'      // Mode d'assignation
  | 'custom'    // Badge personnalisé

/**
 * Couleurs de badge (correspondent aux tokens badge-* dans tailwind.config.js)
 */
export type BadgeColor =
  | 'red'
  | 'green'
  | 'blue'
  | 'amber'
  | 'purple'
  | 'orange'
  | 'gray'
  | 'emerald'
  | 'indigo'
  | 'yellow'
  | 'slate'

/**
 * Tailles de badge (Material Design compliant)
 */
export type BadgeSize = 'sm' | 'md' | 'lg'

/**
 * Forme du badge
 */
export type BadgeShape = 'rounded' | 'pill'

/**
 * Configuration d'une valeur de badge
 */
export interface BadgeValueConfig {
  color: BadgeColor
  label: string
  icon?: LucideIcon
}

// ============================================================================
// Tailles Material Design
// ============================================================================

/**
 * Classes Tailwind pour chaque taille de badge
 * Material Design guidelines:
 * - Minimum 20dp height pour les petits éléments
 * - 24dp height recommandé pour les badges
 * - 12sp minimum pour le texte lisible
 */
export const BADGE_SIZES: Record<BadgeSize, string> = {
  sm: 'text-xs px-2 py-0.5 h-5 gap-1',      // 20px height
  md: 'text-xs px-2.5 py-1 h-6 gap-1.5',    // 24px height (MD minimum)
  lg: 'text-sm px-3 py-1.5 h-7 gap-2',      // 28px height
}

/**
 * Tailles d'icônes correspondant aux tailles de badge
 */
export const BADGE_ICON_SIZES: Record<BadgeSize, string> = {
  sm: 'h-3 w-3',      // 12px
  md: 'h-3.5 w-3.5',  // 14px
  lg: 'h-4 w-4',      // 16px
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Mapping explicite des classes Tailwind par couleur
 * Utilise les couleurs Tailwind natives (bg-*-100, text-*-800, border-*-200)
 * pour garantir la compatibilité avec le système existant
 */
const BADGE_COLOR_CLASSES: Record<BadgeColor, string> = {
  red: 'bg-red-100 text-red-800 border-red-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  gray: 'bg-gray-100 text-gray-800 border-gray-200',
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  slate: 'bg-slate-100 text-slate-800 border-slate-200',
}

/**
 * Retourne les classes Tailwind pour une couleur de badge
 * Utilise les couleurs Tailwind natives (bg-*-100, text-*-800, border-*-200)
 *
 * @example
 * getBadgeColorClasses('green')
 * // Returns: 'bg-green-100 text-green-800 border-green-200'
 */
export const getBadgeColorClasses = (color: BadgeColor): string => {
  return BADGE_COLOR_CLASSES[color] || BADGE_COLOR_CLASSES.gray
}

/**
 * Génère les classes pour la forme du badge
 */
export const getBadgeShapeClasses = (shape: BadgeShape): string => {
  return shape === 'pill' ? 'rounded-full' : 'rounded-md'
}

// ============================================================================
// Configuration par type
// ============================================================================

/**
 * Mapping complet type/value -> color/label/icon
 *
 * Usage:
 * const config = BADGE_CONFIG.status['demande']
 * // { color: 'red', label: 'Demande', icon: Clock }
 */
export const BADGE_CONFIG: Record<BadgeType, Record<string, BadgeValueConfig>> = {
  // Statuts d'intervention (français, snake_case)
  status: {
    demande:                    { color: 'red',     label: 'Demande',           icon: Clock },
    rejetee:                    { color: 'red',     label: 'Rejetée',           icon: XCircle },
    approuvee:                  { color: 'green',   label: 'Approuvée',         icon: CheckCircle },
    demande_de_devis:           { color: 'blue',    label: 'Devis demandé',     icon: FileText },
    planification:              { color: 'yellow',  label: 'Planification',     icon: Calendar },
    planifiee:                  { color: 'purple',  label: 'Planifiée',         icon: Calendar },
    en_cours:                   { color: 'indigo',  label: 'En cours',          icon: Play },
    cloturee_par_prestataire:   { color: 'orange',  label: 'Clôturée (prest.)', icon: CheckCircle2 },
    cloturee_par_locataire:     { color: 'emerald', label: 'Clôturée (loc.)',   icon: CheckCircle2 },
    cloturee_par_gestionnaire:  { color: 'green',   label: 'Clôturée',          icon: CheckCircle2 },
    annulee:                    { color: 'gray',    label: 'Annulée',           icon: XCircle },
  },

  // Niveaux d'urgence
  urgency: {
    urgente:  { color: 'red',    label: 'Urgente',  icon: AlertTriangle },
    haute:    { color: 'orange', label: 'Haute',    icon: TrendingUp },
    normale:  { color: 'blue',   label: 'Normale',  icon: Minus },
    basse:    { color: 'gray',   label: 'Basse',    icon: ArrowDown },
  },

  // Rôles utilisateur (anglais + français pour compatibilité)
  role: {
    manager:      { color: 'blue',   label: 'Gestionnaire', icon: UserCog },
    provider:     { color: 'amber',  label: 'Prestataire',  icon: Wrench },
    tenant:       { color: 'green',  label: 'Locataire',    icon: Home },
    gestionnaire: { color: 'blue',   label: 'Gestionnaire', icon: UserCog },
    prestataire:  { color: 'amber',  label: 'Prestataire',  icon: Wrench },
    locataire:    { color: 'green',  label: 'Locataire',    icon: Home },
    admin:        { color: 'purple', label: 'Admin',        icon: UserCog },
  },

  // Statuts de contrat
  contract: {
    brouillon: { color: 'gray',   label: 'Brouillon', icon: FileText },
    actif:     { color: 'green',  label: 'Actif',     icon: CheckCircle },
    expire:    { color: 'red',    label: 'Expiré',    icon: AlertCircle },
    resilie:   { color: 'slate',  label: 'Résilié',   icon: XCircle },
    renouvele: { color: 'blue',   label: 'Renouvelé', icon: RefreshCw },
  },

  // Statuts de devis
  quote: {
    pending:  { color: 'amber',  label: 'En attente', icon: Clock },
    sent:     { color: 'blue',   label: 'Envoyé',     icon: Send },
    approved: { color: 'green',  label: 'Validé',     icon: CheckCircle2 },
    rejected: { color: 'red',    label: 'Refusé',     icon: XCircle },
  },

  // Statuts de créneau
  slot: {
    pending:   { color: 'amber',  label: 'En attente',  icon: Clock },
    requested: { color: 'blue',   label: 'Demandé',     icon: Calendar },
    proposed:  { color: 'blue',   label: 'Proposé',     icon: Calendar },
    selected:  { color: 'green',  label: 'Sélectionné', icon: CheckCircle2 },
    confirmed: { color: 'green',  label: 'Confirmé',    icon: CheckCircle2 },
    rejected:  { color: 'red',    label: 'Rejeté',      icon: XCircle },
    cancelled: { color: 'gray',   label: 'Annulé',      icon: XCircle },
  },

  // Modes d'assignation
  mode: {
    single:   { color: 'slate',  label: 'Unique',  icon: User },
    group:    { color: 'blue',   label: 'Groupe',  icon: Users },
    separate: { color: 'amber',  label: 'Séparé',  icon: UserMinus },
  },

  // Custom badges (pas de valeurs prédéfinies)
  custom: {},
}

/**
 * Récupère la configuration d'un badge par type et valeur
 * Retourne undefined si non trouvé
 */
export const getBadgeConfig = (
  type: BadgeType,
  value: string
): BadgeValueConfig | undefined => {
  return BADGE_CONFIG[type]?.[value]
}

/**
 * Récupère toutes les valeurs disponibles pour un type de badge
 */
export const getBadgeValues = (type: BadgeType): string[] => {
  return Object.keys(BADGE_CONFIG[type] || {})
}
