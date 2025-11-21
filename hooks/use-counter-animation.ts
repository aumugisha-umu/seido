/**
 * 🎯 Hook: useCounterAnimation
 *
 * Anime un compteur de 0 (ou start) vers une valeur cible
 * Utilisé pour les stats avec effet "count-up" au scroll
 *
 * @param end - Valeur cible finale
 * @param duration - Durée de l'animation en ms (défaut: 2000ms)
 * @param start - Valeur de départ (défaut: 0)
 * @param isVisible - Déclenche l'animation quand true (défaut: true)
 * @returns number - Valeur actuelle du compteur
 *
 * @example
 * const count = useCounterAnimation(500, 2000, 0, isVisible)
 * return <span>{count}+</span>
 */

import { useEffect, useState } from 'react'

export function useCounterAnimation(
  end: number,
  duration: number = 2000,
  start: number = 0,
  isVisible: boolean = true
): number {
  const [count, setCount] = useState(start)

  useEffect(() => {
    if (!isVisible) return

    let startTime: number | null = null

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)

      // Easing function: ease-out (décélération progressive)
      const easeOutQuad = 1 - (1 - progress) * (1 - progress)

      setCount(Math.floor(easeOutQuad * (end - start) + start))

      if (progress < 1) {
        requestAnimationFrame(step)
      }
    }

    requestAnimationFrame(step)
  }, [end, duration, start, isVisible])

  return count
}
