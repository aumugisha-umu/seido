/**
 * API Route - Téléchargement direct de document d'intervention
 *
 * Cette route gère le téléchargement direct des pièces jointes d'intervention.
 * Utilisée principalement dans les liens d'emails.
 *
 * Comportement:
 * 1. Génère une URL signée Supabase
 * 2. Affiche une page HTML qui déclenche le téléchargement
 * 3. Redirige l'utilisateur vers son dashboard après 2 secondes
 *
 * URL: /api/download-intervention-document/[documentId]
 *
 * @note Pour les appels programmatiques qui ont besoin du JSON,
 * utiliser /api/download-intervention-document?documentId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'

/**
 * Security headers pour les réponses HTML
 * - X-Content-Type-Options: Empêche le navigateur d'interpréter le type MIME différemment
 * - X-Frame-Options: Protège contre le clickjacking
 * - Referrer-Policy: Contrôle les informations Referer envoyées
 */
const SECURITY_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

/**
 * Sanitize le nom de fichier pour éviter les injections et path traversal
 * - Supprime les caractères dangereux (< > : " | ? * et caractères de contrôle)
 * - Supprime les points en début de nom (fichiers cachés)
 * - Supprime les tentatives de path traversal (../)
 * - Limite à 255 caractères
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"|?*\x00-\x1F]/g, '')  // Caractères dangereux
    .replace(/^\.+/, '')                   // Points en début
    .replace(/\.\.\//g, '')                // Path traversal
    .replace(/\\/g, '')                    // Backslashes Windows
    .substring(0, 255)                     // Limite longueur
    || 'document'                          // Fallback si vide après sanitization
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params

  logger.info({ documentId }, '📥 [DOWNLOAD-DOC] Direct download request')

  try {
    // Utiliser service role pour bypasser RLS (les liens d'email doivent fonctionner sans auth)
    // La sécurité est assurée par:
    // 1. L'UUID du document est non-guessable
    // 2. L'URL signée de Supabase Storage expire après 1h
    const supabase = createServiceRoleSupabaseClient()

    // Récupérer les infos du document
    const { data: document, error: docError } = await supabase
      .from('intervention_documents')
      .select('id, storage_path, storage_bucket, original_filename, mime_type, deleted_at')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      logger.error({ documentId, error: docError }, '❌ [DOWNLOAD-DOC] Document not found')
      return new NextResponse(
        generateErrorPage('Document non trouvé', 'Ce document n\'existe pas ou a été supprimé.'),
        { status: 404, headers: SECURITY_HEADERS }
      )
    }

    // Vérifier que le document n'est pas supprimé
    if (document.deleted_at) {
      logger.warn({ documentId }, '⚠️ [DOWNLOAD-DOC] Document has been deleted')
      return new NextResponse(
        generateErrorPage('Document supprimé', 'Ce document a été supprimé et n\'est plus disponible.'),
        { status: 410, headers: SECURITY_HEADERS }
      )
    }

    // Générer l'URL signée pour le téléchargement (valide 1h)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(document.storage_bucket || 'intervention-documents')
      .createSignedUrl(document.storage_path, 3600, {
        download: document.original_filename || 'document' // Force download avec le nom original
      })

    if (signedUrlError || !signedUrlData?.signedUrl) {
      logger.error({ documentId, error: signedUrlError }, '❌ [DOWNLOAD-DOC] Failed to generate signed URL')
      return new NextResponse(
        generateErrorPage('Erreur de téléchargement', 'Impossible de générer le lien de téléchargement. Veuillez réessayer.'),
        { status: 500, headers: SECURITY_HEADERS }
      )
    }

    // 🔒 Valider que l'URL signée est bien une URL valide avant de l'inclure dans le HTML
    try {
      new URL(signedUrlData.signedUrl)
    } catch {
      logger.error({ documentId, signedUrl: signedUrlData.signedUrl }, '❌ [DOWNLOAD-DOC] Invalid signed URL generated')
      return new NextResponse(
        generateErrorPage('Erreur technique', 'URL de téléchargement invalide. Veuillez contacter le support.'),
        { status: 500, headers: SECURITY_HEADERS }
      )
    }

    // 🔒 Sanitize le nom de fichier pour éviter path traversal et XSS
    const safeFilename = sanitizeFilename(document.original_filename || 'document')

    logger.info({
      documentId,
      filename: safeFilename,
      originalFilename: document.original_filename,
      mimeType: document.mime_type
    }, '✅ [DOWNLOAD-DOC] Generating download page with redirect')

    // Retourner une page HTML qui déclenche le téléchargement et redirige vers login
    const html = generateDownloadPage(signedUrlData.signedUrl, safeFilename)

    return new NextResponse(html, {
      status: 200,
      headers: SECURITY_HEADERS
    })

  } catch (error) {
    logger.error({
      documentId,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, '❌ [DOWNLOAD-DOC] Unexpected error')

    return new NextResponse(
      generateErrorPage('Erreur inattendue', 'Une erreur est survenue. Veuillez réessayer plus tard.'),
      { status: 500, headers: SECURITY_HEADERS }
    )
  }
}

/**
 * Génère une page HTML qui déclenche le téléchargement et redirige vers login
 * Style cohérent avec les pages auth de SEIDO
 *
 * 🔒 Sécurité: Utilise des URLs relatives pour éviter les open redirect
 */
function generateDownloadPage(downloadUrl: string, filename: string): string {
  // 🔒 URLs relatives pour éviter les open redirects
  // Toujours same-origin, aucun risque de redirection vers un site malveillant
  const loginUrl = '/auth/login'
  const logoUrl = '/images/Logo/Logo_Seido_Color.png'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Téléchargement - SEIDO</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #0f172a;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      position: relative;
      overflow: hidden;
    }
    /* Background gradients - style auth SEIDO */
    .bg-gradient-1 {
      position: fixed;
      top: -10%;
      left: -10%;
      width: 500px;
      height: 500px;
      background: rgba(99, 102, 241, 0.3);
      border-radius: 50%;
      filter: blur(120px);
      pointer-events: none;
    }
    .bg-gradient-2 {
      position: fixed;
      bottom: -10%;
      right: -10%;
      width: 500px;
      height: 500px;
      background: rgba(168, 85, 247, 0.3);
      border-radius: 50%;
      filter: blur(120px);
      pointer-events: none;
    }
    .bg-gradient-3 {
      position: fixed;
      top: 40%;
      left: 50%;
      transform: translateX(-50%);
      width: 800px;
      height: 800px;
      background: rgba(67, 56, 202, 0.2);
      border-radius: 50%;
      filter: blur(100px);
      pointer-events: none;
    }
    .container {
      position: relative;
      z-index: 10;
      max-width: 28rem;
      width: 100%;
      text-align: center;
    }
    .logo {
      height: 64px;
      width: auto;
      margin-bottom: 32px;
    }
    .card {
      background: rgba(30, 41, 59, 0.5);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 32px;
    }
    .icon {
      width: 64px;
      height: 64px;
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      animation: pulse 2s infinite;
    }
    .icon svg {
      width: 32px;
      height: 32px;
      color: #10b981;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.9; }
    }
    h1 {
      color: white;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
      letter-spacing: -0.025em;
    }
    .filename {
      color: rgba(255, 255, 255, 0.6);
      font-size: 14px;
      margin-bottom: 20px;
      word-break: break-all;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      font-family: monospace;
    }
    .message {
      color: rgba(255, 255, 255, 0.7);
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .redirect-text {
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
      margin-top: 16px;
    }
    .redirect-text span {
      color: #6366f1;
      font-weight: 600;
    }
    .links {
      margin-top: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .manual-link {
      color: rgba(255, 255, 255, 0.6);
      text-decoration: none;
      font-size: 14px;
      transition: color 0.2s;
    }
    .manual-link:hover {
      color: #6366f1;
      text-decoration: underline;
    }
    .primary-link {
      color: #6366f1;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <div class="bg-gradient-1"></div>
  <div class="bg-gradient-2"></div>
  <div class="bg-gradient-3"></div>

  <div class="container">
    <img src="${logoUrl}" alt="SEIDO" class="logo" />

    <div class="card">
      <div class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </div>

      <h1>Téléchargement en cours</h1>
      <p class="filename">${escapeHtml(filename)}</p>

      <p class="message">
        Votre fichier est en cours de téléchargement.<br>
        Vous allez être redirigé vers la page de connexion.
      </p>

      <div class="spinner"></div>
      <p class="redirect-text">Redirection dans <span id="countdown">4</span> secondes...</p>

      <div class="links">
        <a href="${escapeHtml(downloadUrl)}" class="manual-link" id="manual-download" target="_blank" rel="noopener">
          Si le téléchargement ne démarre pas, cliquez ici
        </a>
        <a href="${loginUrl}" class="manual-link primary-link">
          Se connecter maintenant
        </a>
      </div>
    </div>
  </div>

  <script>
    // Télécharger le fichier via fetch + blob (évite les problèmes de popup bloqué et CORS)
    (async function() {
      const downloadUrl = '${escapeHtml(downloadUrl)}';
      const filename = '${escapeHtml(filename)}';
      const manualLink = document.getElementById('manual-download');

      try {
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error('Erreur de téléchargement');

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.URL.revokeObjectURL(blobUrl);
        console.log('Téléchargement déclenché avec succès');
      } catch (error) {
        console.error('Erreur lors du téléchargement:', error);
        manualLink.style.color = '#ef4444';
        manualLink.style.fontWeight = 'bold';
        manualLink.textContent = '⚠️ Cliquez ici pour télécharger le fichier';
      }
    })();

    // Compte à rebours et redirection vers login
    let countdown = 4;
    const countdownEl = document.getElementById('countdown');

    const interval = setInterval(() => {
      countdown--;
      countdownEl.textContent = countdown;

      if (countdown <= 0) {
        clearInterval(interval);
        window.location.href = '${loginUrl}';
      }
    }, 1000);
  </script>
</body>
</html>`
}

/**
 * Génère une page d'erreur HTML
 * Style cohérent avec les pages auth de SEIDO
 *
 * 🔒 Sécurité: Utilise des URLs relatives pour éviter les open redirect
 */
function generateErrorPage(title: string, message: string): string {
  // 🔒 URLs relatives pour éviter les open redirects
  const loginUrl = '/auth/login'
  const logoUrl = '/images/Logo/Logo_Seido_Color.png'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - SEIDO</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #0f172a;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      position: relative;
      overflow: hidden;
    }
    .bg-gradient-1 {
      position: fixed;
      top: -10%;
      left: -10%;
      width: 500px;
      height: 500px;
      background: rgba(99, 102, 241, 0.3);
      border-radius: 50%;
      filter: blur(120px);
      pointer-events: none;
    }
    .bg-gradient-2 {
      position: fixed;
      bottom: -10%;
      right: -10%;
      width: 500px;
      height: 500px;
      background: rgba(168, 85, 247, 0.3);
      border-radius: 50%;
      filter: blur(120px);
      pointer-events: none;
    }
    .bg-gradient-3 {
      position: fixed;
      top: 40%;
      left: 50%;
      transform: translateX(-50%);
      width: 800px;
      height: 800px;
      background: rgba(67, 56, 202, 0.2);
      border-radius: 50%;
      filter: blur(100px);
      pointer-events: none;
    }
    .container {
      position: relative;
      z-index: 10;
      max-width: 28rem;
      width: 100%;
      text-align: center;
    }
    .logo {
      height: 64px;
      width: auto;
      margin-bottom: 32px;
    }
    .card {
      background: rgba(30, 41, 59, 0.5);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 32px;
    }
    .icon {
      width: 64px;
      height: 64px;
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
    }
    .icon svg {
      width: 32px;
      height: 32px;
      color: #ef4444;
    }
    h1 {
      color: white;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 12px;
      letter-spacing: -0.025em;
    }
    .message {
      color: rgba(255, 255, 255, 0.7);
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .button {
      display: inline-block;
      background: #6366f1;
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 500;
      font-size: 14px;
      transition: all 0.2s;
      border: 1px solid transparent;
    }
    .button:hover {
      background: #4f46e5;
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
  <div class="bg-gradient-1"></div>
  <div class="bg-gradient-2"></div>
  <div class="bg-gradient-3"></div>

  <div class="container">
    <img src="${logoUrl}" alt="SEIDO" class="logo" />

    <div class="card">
      <div class="icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <h1>${escapeHtml(title)}</h1>
      <p class="message">${escapeHtml(message)}</p>

      <a href="${loginUrl}" class="button">Se connecter</a>
    </div>
  </div>
</body>
</html>`
}

/**
 * Échappe les caractères HTML pour éviter les injections XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}
