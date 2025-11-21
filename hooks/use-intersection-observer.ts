/**
 * 🎯 Hook: useIntersectionObserver
 *
 * Détecte quand un élément devient visible dans le viewport
 * Utilisé pour les animations scroll-reveal performantes
 *
 * @param ref - Référence React vers l'élément à observer
 * @param options - Options IntersectionObserver (threshold, rootMargin, etc.)
 * @returns boolean - true quand l'élément est visible
 */

import { useEffect, useState, RefObject } from 'react'

export function useIntersectionObserver(
  ref: RefObject<HTMLElement>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect() // Fire once only (performance)
        }
      },
      {
        threshold: 0.1, // Trigger when 10% visible
        rootMargin: '-50px', // Trigger slightly before entering viewport
        ...options
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [ref, options])

  return isVisible
}
