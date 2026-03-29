/**
 * Utilitaires de rendu des templates email - SEIDO
 */

import { render } from '@react-email/render'
import type { ReactElement } from 'react'

/**
 * Rendre HTML et texte en une fois
 */
export const renderEmail = async (component: ReactElement): Promise<{ html: string; text: string }> => {
  const [html, text] = await Promise.all([
    render(component, { pretty: false }),
    render(component, { plainText: true })
  ])

  return { html, text }
}
