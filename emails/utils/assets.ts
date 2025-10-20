/**
 * 📧 Email Assets Utility - SEIDO
 *
 * Gère les assets (images, logos) pour les templates email
 * Encode les images en base64 pour garantir leur affichage dans tous les clients email
 */

import fs from 'fs'
import path from 'path'

/**
 * Cache en mémoire pour éviter de réencoder les images à chaque email
 */
const imageCache = new Map<string, string>()

/**
 * Encode une image en base64 avec data URL
 * @param imagePath - Chemin relatif depuis le dossier public
 * @returns Data URL de l'image (data:image/png;base64,...)
 */
function encodeImageToBase64(imagePath: string): string {
  try {
    // Chemin absolu vers le fichier dans public/
    const fullPath = path.join(process.cwd(), 'public', imagePath)

    // Vérifier que le fichier existe
    if (!fs.existsSync(fullPath)) {
      console.error(`[EMAIL-ASSETS] Image not found: ${fullPath}`)
      return '' // Fallback : retourner une chaîne vide si le fichier n'existe pas
    }

    // Lire le fichier
    const imageBuffer = fs.readFileSync(fullPath)

    // Encoder en base64
    const base64Image = imageBuffer.toString('base64')

    // Détecter le type MIME depuis l'extension
    const ext = path.extname(imagePath).toLowerCase()
    const mimeType = ext === '.png' ? 'image/png' :
                     ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                     ext === '.svg' ? 'image/svg+xml' :
                     'image/png' // Fallback

    // Retourner le data URL
    return `data:${mimeType};base64,${base64Image}`
  } catch (error) {
    console.error('[EMAIL-ASSETS] Error encoding image:', error)
    return '' // Fallback en cas d'erreur
  }
}

/**
 * Récupère le logo SEIDO encodé en base64 (version blanche pour fond coloré)
 *
 * @returns Data URL du logo SEIDO blanc (data:image/png;base64,...)
 *
 * @example
 * ```tsx
 * const logoUrl = getLogoBase64()
 * <Img src={logoUrl} alt="SEIDO" width="100" height="32" />
 * ```
 */
export function getLogoBase64(): string {
  const cacheKey = 'logo-white'

  // Vérifier le cache
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!
  }

  // Encoder l'image
  const base64Logo = encodeImageToBase64('images/Logo/Logo_Seido_White.png')

  // Mettre en cache
  if (base64Logo) {
    imageCache.set(cacheKey, base64Logo)
  }

  return base64Logo
}

/**
 * Récupère le picto SEIDO encodé en base64 (version blanche pour fond coloré)
 *
 * @returns Data URL du picto SEIDO blanc (data:image/png;base64,...)
 *
 * @example
 * ```tsx
 * const pictoUrl = getPictoBase64()
 * <Img src={pictoUrl} alt="SEIDO Icon" width="32" height="32" />
 * ```
 */
export function getPictoBase64(): string {
  const cacheKey = 'picto-white'

  // Vérifier le cache
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!
  }

  // Encoder l'image
  const base64Picto = encodeImageToBase64('images/Logo/Picto_Seido_White.png')

  // Mettre en cache
  if (base64Picto) {
    imageCache.set(cacheKey, base64Picto)
  }

  return base64Picto
}

/**
 * Récupère le logo SEIDO en couleur encodé en base64 (pour fond blanc)
 *
 * @returns Data URL du logo SEIDO coloré (data:image/png;base64,...)
 */
export function getLogoColorBase64(): string {
  const cacheKey = 'logo-color'

  // Vérifier le cache
  if (imageCache.has(cacheKey)) {
    return imageCache.get(cacheKey)!
  }

  // Encoder l'image
  const base64Logo = encodeImageToBase64('images/Logo/Logo_Seido_Color.png')

  // Mettre en cache
  if (base64Logo) {
    imageCache.set(cacheKey, base64Logo)
  }

  return base64Logo
}

/**
 * Vide le cache des images (utile en développement si les images changent)
 */
export function clearImageCache(): void {
  imageCache.clear()
  console.log('[EMAIL-ASSETS] Image cache cleared')
}

/**
 * Affiche les statistiques du cache (debugging)
 */
export function getImageCacheStats() {
  return {
    size: imageCache.size,
    keys: Array.from(imageCache.keys())
  }
}
