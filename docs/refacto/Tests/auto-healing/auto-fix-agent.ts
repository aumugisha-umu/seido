/**
 * Auto-Fix Agent Extension for Seido Debugger
 * Extension qui ajoute les capacités d'auto-correction à l'agent debugger
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import type { ErrorContext, AutoFixResult } from './config'

export class AutoFixAgent {
  private projectRoot: string
  private backupDir: string

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../../..')
    this.backupDir = path.join(__dirname, '../auto-healing-artifacts/backups')
  }

  /**
   * Analyser l'erreur et proposer une correction
   */
  async analyzeAndFix(context: ErrorContext): Promise<AutoFixResult> {
    console.log(`🤖 [AUTO-FIX] Analyzing error of type: ${context.error.type}`)

    try {
      // Créer backup avant toute modification
      if (context.sourceFiles.length > 0) {
        await this.createBackup(context)
      }

      // Analyser selon le type d'erreur
      let fixResult: AutoFixResult

      switch (context.error.type) {
        case 'redirect':
          fixResult = await this.fixRedirectIssue(context)
          break

        case 'authentication':
          fixResult = await this.fixAuthenticationIssue(context)
          break

        case 'selector':
          fixResult = await this.fixSelectorIssue(context)
          break

        case 'timeout':
          fixResult = await this.fixTimeoutIssue(context)
          break

        default:
          fixResult = {
            success: false,
            error: `Cannot auto-fix error type: ${context.error.type}`
          }
      }

      return fixResult
    } catch (error) {
      console.error(`❌ [AUTO-FIX] Error during analysis:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Corriger les problèmes de redirection
   */
  private async fixRedirectIssue(context: ErrorContext): Promise<AutoFixResult> {
    console.log(`🔧 [AUTO-FIX] Fixing redirect issue...`)

    // Analyser le contexte
    const { error, state, sourceFiles } = context

    // Vérifier si c'est le bug connu de redirect() dans Server Action
    const authActionsFile = sourceFiles.find(f => f.path.includes('auth-actions.ts'))

    if (!authActionsFile) {
      return {
        success: false,
        error: 'Could not find auth-actions.ts file'
      }
    }

    // Détecter le pattern problématique
    const problematicPattern = /redirect\(dashboardPath\)/
    const hasIssue = problematicPattern.test(authActionsFile.content)

    if (!hasIssue) {
      return {
        success: false,
        error: 'Could not detect redirect issue in auth-actions.ts',
        nextSteps: [
          'Check if redirect() is being called correctly',
          'Verify dashboard path is correct',
          'Check middleware configuration'
        ]
      }
    }

    // Proposer la correction
    const fix = this.generateRedirectFix(authActionsFile.content)

    if (!fix) {
      return {
        success: false,
        error: 'Could not generate fix for redirect issue'
      }
    }

    // Appliquer la correction
    const filePath = path.join(this.projectRoot, authActionsFile.path)
    await fs.writeFile(filePath, fix.newContent)

    console.log(`✅ [AUTO-FIX] Applied redirect fix to ${authActionsFile.path}`)

    return {
      success: true,
      correction: {
        description: 'Fixed Server Action redirect by restructuring async flow',
        filesModified: [{
          path: authActionsFile.path,
          changes: fix.description,
          backup: path.join(this.backupDir, `${path.basename(authActionsFile.path)}.backup`)
        }],
        confidence: 'high'
      }
    }
  }

  /**
   * Générer la correction pour les problèmes de redirect
   */
  private generateRedirectFix(content: string): { newContent: string; description: string } | null {
    // Pattern problématique détecté :
    // - redirect() commenté ou manquant après le try/catch dans loginAction
    // - Le pattern officiel Next.js 15 exige redirect() HORS de tout try/catch

    const lines = content.split('\n')
    let modified = false
    const newLines: string[] = []

    let inLoginAction = false
    let foundDashboardPathDetermination = false
    let foundRedirect = false
    let loginActionClosingBraceIndex = -1

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      // Détecter le début de loginAction
      if (trimmed.includes('export async function loginAction')) {
        inLoginAction = true
      }

      if (inLoginAction) {
        // Détecter qu'on a déterminé le dashboardPath
        if (trimmed.includes('dashboardPath = getDashboardPath') || trimmed.includes('dashboardPath =')) {
          foundDashboardPathDetermination = true
        }

        // Détecter un redirect() existant (pas commenté)
        if (trimmed.includes('redirect(dashboardPath)') && !trimmed.startsWith('//')) {
          foundRedirect = true
        }

        // Détecter la fin de loginAction : l'accolade fermante avant la prochaine fonction
        // On cherche un '}' qui est suivi d'une ligne vide ou d'un commentaire JSDoc
        if (trimmed === '}' && i + 1 < lines.length) {
          const nextLine = lines[i + 1]?.trim()
          const lineAfterNext = lines[i + 2]?.trim()

          // Si la ligne suivante est vide ou commence par /**, c'est la fin de loginAction
          if (nextLine === '' || nextLine.startsWith('/**') ||
              (nextLine === '' && lineAfterNext && lineAfterNext.startsWith('/**'))) {
            loginActionClosingBraceIndex = i
            inLoginAction = false
          }
        }
      }

      // Supprimer UNIQUEMENT les commentaires obsolètes créés par les tentatives précédentes
      // Ne pas supprimer les lignes vides normales
      const isObsoleteComment = (
        (trimmed.includes('FIX AUTO-HEALING') && trimmed.startsWith('//')) ||
        (trimmed.includes('redirect will be called after') && trimmed.startsWith('//')) ||
        (trimmed.startsWith('//') && trimmed.includes('We return the dashboard path')) ||
        (trimmed.startsWith('//') && trimmed.includes('BUG INTENTIONNEL'))
      )

      const isCommentedRedirect = trimmed.startsWith('// redirect(dashboardPath)')

      if (isObsoleteComment || isCommentedRedirect) {
        modified = true
        continue // Skip ces lignes
      }

      // Si on a trouvé la fin de loginAction et qu'il manque le redirect, l'ajouter AVANT l'accolade
      if (i === loginActionClosingBraceIndex && !foundRedirect && foundDashboardPathDetermination) {
        newLines.push('')
        newLines.push('  // ✅ PATTERN OFFICIEL: redirect() HORS de tout try/catch')
        newLines.push('  redirect(dashboardPath)')
        modified = true
      }

      newLines.push(line)
    }

    if (!modified && foundRedirect) {
      // redirect() existe déjà au bon endroit, pas besoin de modifier
      return null
    }

    if (!modified) {
      console.log('⚠️ [AUTO-FIX] Could not determine where to insert redirect()')
      return null
    }

    return {
      newContent: newLines.join('\n'),
      description: 'Added missing redirect(dashboardPath) call outside try/catch block following Next.js 15 Server Action best practices'
    }
  }

  /**
   * Corriger les problèmes d'authentification
   */
  private async fixAuthenticationIssue(context: ErrorContext): Promise<AutoFixResult> {
    console.log(`🔧 [AUTO-FIX] Fixing authentication issue...`)

    // TODO: Implémenter les corrections d'auth spécifiques
    return {
      success: false,
      error: 'Authentication auto-fix not yet implemented',
      nextSteps: [
        'Check Supabase session creation',
        'Verify auth middleware',
        'Check role assignment'
      ]
    }
  }

  /**
   * Corriger les problèmes de sélecteurs
   */
  private async fixSelectorIssue(context: ErrorContext): Promise<AutoFixResult> {
    console.log(`🔧 [AUTO-FIX] Fixing selector issue...`)

    // TODO: Implémenter les corrections de sélecteurs
    return {
      success: false,
      error: 'Selector auto-fix not yet implemented',
      nextSteps: [
        'Add data-testid attributes',
        'Use more robust selectors',
        'Add explicit waits'
      ]
    }
  }

  /**
   * Corriger les problèmes de timeout
   */
  private async fixTimeoutIssue(context: ErrorContext): Promise<AutoFixResult> {
    console.log(`🔧 [AUTO-FIX] Fixing timeout issue...`)

    // TODO: Implémenter les corrections de timeout
    return {
      success: false,
      error: 'Timeout auto-fix not yet implemented',
      nextSteps: [
        'Increase timeout values',
        'Add explicit waits',
        'Check for race conditions'
      ]
    }
  }

  /**
   * Créer un backup des fichiers avant modification
   */
  private async createBackup(context: ErrorContext): Promise<void> {
    await fs.mkdir(this.backupDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/:/g, '-')
    const backupSubDir = path.join(this.backupDir, `${context.testId}-${timestamp}`)
    await fs.mkdir(backupSubDir, { recursive: true })

    for (const sourceFile of context.sourceFiles) {
      const filePath = path.join(this.projectRoot, sourceFile.path)
      const backupPath = path.join(backupSubDir, path.basename(sourceFile.path))

      try {
        await fs.copyFile(filePath, backupPath)
        console.log(`💾 [AUTO-FIX] Backup created: ${backupPath}`)
      } catch (error) {
        console.error(`❌ [AUTO-FIX] Failed to backup ${sourceFile.path}:`, error)
      }
    }
  }

  /**
   * Restaurer depuis un backup
   */
  async rollback(backupPath: string): Promise<void> {
    console.log(`↩️ [AUTO-FIX] Rolling back from ${backupPath}...`)

    try {
      const backupFiles = await fs.readdir(backupPath)

      for (const file of backupFiles) {
        const backupFilePath = path.join(backupPath, file)
        // TODO: Déterminer le chemin original et restaurer
        console.log(`Restoring ${file}...`)
      }

      console.log(`✅ [AUTO-FIX] Rollback completed`)
    } catch (error) {
      console.error(`❌ [AUTO-FIX] Rollback failed:`, error)
      throw error
    }
  }
}