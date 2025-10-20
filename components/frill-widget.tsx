/**
 * 📣 FRILL WIDGET - Feedback & Feature Requests
 *
 * Intégration du widget Frill (https://frill.co) pour collecter
 * les retours utilisateurs et gérer la roadmap produit.
 *
 * Fonctionnement :
 * - Chargement automatique pour utilisateurs authentifiés
 * - Identification automatique (email + nom)
 * - Widget disponible sur toutes les pages
 * - Cleanup au logout
 */

'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'

// TypeScript global declaration pour Frill
declare global {
  interface Window {
    Frill: ((type: string, config: FrillConfig | FrillWidgetConfig) => Promise<FrillInstance>) & {
      q?: Record<number, FrillQueueItem>
    }
  }
}

interface FrillConfig {
  key: string
  user?: {
    email: string
    name: string
  }
}

interface FrillWidgetConfig {
  key: string
  callbacks?: {
    onReady?: (widget: FrillInstance) => void
  }
}

interface FrillInstance {
  destroy?: () => void
}

interface FrillQueueItem {
  params: [string, FrillConfig]
  resolve: (instance: FrillInstance) => void
  reject: (error: Error) => void
}

export function FrillWidget() {
  const { user, loading } = useAuth()

  useEffect(() => {
    // ✅ Ne charger que si utilisateur authentifié
    if (!user || loading) {
      return
    }

    // ✅ Vérifier que les clés API sont configurées
    const containerKey = process.env.NEXT_PUBLIC_FRILL_CONTAINER_KEY
    const widgetKey = process.env.NEXT_PUBLIC_FRILL_WIDGET_KEY

    if (!containerKey || !widgetKey) {
      return
    }

    // ✅ Éviter le double chargement si script déjà présent
    if (window.Frill && document.querySelector('script[src*="frill.co"]')) {
      // Reconfigurer le container avec le nouvel utilisateur
      window.Frill('container', {
        key: containerKey,
        user: {
          email: user.email,
          name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Utilisateur'
        }
      })

      // Charger explicitement le widget
      window.Frill('widget', {
        key: widgetKey
      }).catch((error) => {
        console.error('[FRILL] Widget loading error:', error)
      })

      return
    }

    // ✅ Injection du script Frill complet (fourni par Frill)
    const scriptContainer = document.createElement('script')
    scriptContainer.type = 'text/javascript'
    scriptContainer.innerHTML = `
      (function(t,r){function s(){var a=r.getElementsByTagName("script")[0],e=r.createElement("script");e.type="text/javascript",e.async=!0,e.src="https://widget.frill.co/v2/container.js",a.parentNode.insertBefore(e,a)}if(!t.Frill){var o=0,i={};t.Frill=function(e,p){var n,l=o++,c=new Promise(function(v,d){i[l]={params:[e,p],resolve:function(f){n=f,v(f)},reject:d}});return c.destroy=function(){delete i[l],n&&n.destroy()},c},t.Frill.q=i;}r.readyState==="complete"||r.readyState==="interactive"?s():r.addEventListener("DOMContentLoaded",s)})(window,document);
    `

    document.head.appendChild(scriptContainer)

    // ✅ Configuration du container + chargement explicite du widget
    const configScript = document.createElement('script')
    configScript.type = 'text/javascript'
    configScript.innerHTML = `
      // 1. Initialiser le container avec l'utilisateur
      window.Frill('container', {
        key: '${containerKey}',
        user: {
          email: '${user.email}',
          name: '${user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Utilisateur'}'
        }
      });

      // 2. Charger explicitement le widget
      window.Frill('widget', {
        key: '${widgetKey}'
      }).catch(function(error) {
        console.error('[FRILL] Widget loading error:', error);
      });
    `

    document.head.appendChild(configScript)

    // ✅ Cleanup : Retirer les scripts au démontage du composant
    return () => {
      // Retirer les scripts injectés
      if (scriptContainer.parentNode) {
        scriptContainer.parentNode.removeChild(scriptContainer)
      }
      if (configScript.parentNode) {
        configScript.parentNode.removeChild(configScript)
      }

      // Nettoyer l'instance Frill (si disponible)
      if (window.Frill && window.Frill.q) {
        // Détruire toutes les instances en queue
        Object.values(window.Frill.q).forEach((item) => {
          if (item && typeof item === 'object') {
            // Cleanup minimal sans accès direct à destroy
            delete window.Frill.q![Object.keys(window.Frill.q!).find(k => window.Frill.q![k as any] === item) as any]
          }
        })
      }

      // Retirer le script externe si présent
      const externalScript = document.querySelector('script[src*="frill.co"]')
      if (externalScript && externalScript.parentNode) {
        externalScript.parentNode.removeChild(externalScript)
      }
    }
  }, [user, loading])

  // ✅ Composant invisible (le widget Frill s'affiche automatiquement)
  return null
}
