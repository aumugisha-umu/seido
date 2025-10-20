/**
 * 📧 Utilitaires de rendu des templates email - SEIDO
 */

import { render } from '@react-email/render'
import type { ReactElement } from 'react'

/**
 * Rendu d'un composant React en HTML email
 *
 * @param component - Composant React à rendre
 * @returns HTML optimisé pour les clients email
 */
export const renderEmailHtml = async (component: ReactElement): Promise<string> => {
  // ✅ render() retourne une Promise dans @react-email/render@1.3.1+
  const result = await render(component, {
    // Utiliser des attributs inline pour compatibilité max
    pretty: false,
  })

  return result
}

/**
 * Rendu d'un composant React en texte brut (fallback)
 *
 * @param component - Composant React à rendre
 * @returns Version texte brut
 */
export const renderEmailText = async (component: ReactElement): Promise<string> => {
  // ✅ render() retourne une Promise
  const result = await render(component, {
    plainText: true,
  })

  return result
}

/**
 * Raccourci: rendre HTML et texte en une fois
 */
export const renderEmail = async (component: ReactElement): Promise<{ html: string; text: string }> => {
  // ✅ Exécuter les deux renders en parallèle
  const [html, text] = await Promise.all([
    renderEmailHtml(component),
    renderEmailText(component)
  ])

  return { html, text }
}
