"use client"

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Composant pour afficher un indicateur de chargement global lors des navigations
export function GlobalLoadingIndicator() {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('Chargement...')

  useEffect(() => {
    // Personnaliser le texte selon la section
    if (pathname.includes('/dashboard')) {
      setLoadingText('Chargement du tableau de bord...')
    } else if (pathname.includes('/biens')) {
      setLoadingText('Chargement des biens...')
    } else if (pathname.includes('/interventions')) {
      setLoadingText('Chargement des interventions...')
    } else if (pathname.includes('/contacts')) {
      setLoadingText('Chargement des contacts...')
    } else {
      setLoadingText('Chargement de la page...')
    }

    // OPTIMISATION: N'afficher le spinner qu'après 500ms (si la navigation est lente)
    // Évite le clignotement sur les navigations rapides
    let isMounted = true

    const showTimer = setTimeout(() => {
      // Ne montrer le spinner que si le composant est toujours monté après 500ms
      if (isMounted) {
        setIsLoading(true)
      }
    }, 500)

    // AUTO-HIDE: Cacher le spinner après 2.5s max (la page devrait être chargée)
    // Cela évite que le spinner reste bloqué indéfiniment
    const hideTimer = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false)
      }
    }, 2500)

    // Cleanup quand le pathname change (nouvelle navigation)
    return () => {
      isMounted = false
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
      setIsLoading(false)
    }
  }, [pathname])

  if (!isLoading) return null

  return (
    <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 flex items-center space-x-2 min-w-[220px]">
        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        <span className="text-sm text-slate-700 font-medium">{loadingText}</span>
      </div>
    </div>
  )
}

// Hook pour contrôler manuellement l'état de chargement global
export function useGlobalLoading() {
  const [isLoading, setIsLoading] = useState(false)
  const [text, setText] = useState('Chargement...')

  const startLoading = (customText?: string) => {
    if (customText) setText(customText)
    setIsLoading(true)
  }

  const stopLoading = () => {
    setIsLoading(false)
  }

  return {
    isLoading,
    text,
    startLoading,
    stopLoading,
    GlobalLoadingIndicator: () => (
      isLoading ? (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 flex items-center space-x-2 min-w-[220px]">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm text-slate-700 font-medium">{text}</span>
          </div>
        </div>
      ) : null
    )
  }
}

// Composant de feedback pour informer l'utilisateur que les données se rafraîchissent
interface DataRefreshIndicatorProps {
  isRefreshing: boolean
  className?: string
}

export function DataRefreshIndicator({ isRefreshing, className }: DataRefreshIndicatorProps) {
  if (!isRefreshing) return null

  return (
    <div className={cn(
      "flex items-center space-x-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200",
      className
    )}>
      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      <span>Actualisation des données...</span>
    </div>
  )
}

export default GlobalLoadingIndicator
