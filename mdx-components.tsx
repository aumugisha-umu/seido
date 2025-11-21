import type { MDXComponents } from 'mdx/types'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Permet de customiser les composants MDX (h1, h2, p, etc.)
    // Actuellement on utilise les composants par défaut
    ...components,
  }
}
