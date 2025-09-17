"use client"

import { useEffect } from "react"
import { logEnvironmentInfo } from "@/lib/environment"

/**
 * ✅ COMPOSANT CLIENT - INITIALISATION LOGS D'ENVIRONNEMENT
 * 
 * Ce composant s'exécute côté client au démarrage de l'application
 * pour logger les informations d'environnement dans la console.
 */
export default function EnvironmentLogger() {
  useEffect(() => {
    // Logger les informations d'environnement au démarrage
    logEnvironmentInfo()
  }, [])

  // Ce composant n'affiche rien
  return null
}
