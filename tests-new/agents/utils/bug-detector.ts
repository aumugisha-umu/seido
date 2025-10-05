/**
 * 🔍 BUG DETECTOR - Détection de boucles infinies et patterns d'erreurs
 *
 * Détecte :
 * - Boucles infinies (même bug répété > 5 fois)
 * - Patterns d'erreurs récurrentes
 * - Dégradations de performance
 */

import { TEST_CONFIG } from '../../config/test-config'
import { LogEntry } from './log-collector'

export interface BugReport {
  bugId: string
  errorMessage: string
  firstOccurrence: string
  occurrences: number
  stack?: string
  metadata?: Record<string, unknown>
}

export interface InfiniteLoopDetection {
  detected: boolean
  bug: BugReport | null
  recommendation: string
}

export class BugDetector {
  private bugHistory: BugReport[] = []
  private maxIterations = TEST_CONFIG.autoHealing.maxIterations

  /**
   * Enregistrer une erreur de test
   */
  recordBug(error: Error, metadata?: Record<string, unknown>): BugReport {
    const bugId = this.generateBugId(error.message)

    // Chercher si ce bug existe déjà
    const existingBug = this.bugHistory.find((b) => b.bugId === bugId)

    if (existingBug) {
      // Incrémenter le compteur
      existingBug.occurrences++
      existingBug.metadata = { ...existingBug.metadata, ...metadata }
      return existingBug
    }

    // Créer un nouveau rapport de bug
    const newBug: BugReport = {
      bugId,
      errorMessage: error.message,
      firstOccurrence: new Date().toISOString(),
      occurrences: 1,
      stack: error.stack,
      metadata,
    }

    this.bugHistory.push(newBug)
    return newBug
  }

  /**
   * Vérifier si on est dans une boucle infinie
   */
  detectInfiniteLoop(): InfiniteLoopDetection {
    // Trouver le bug le plus fréquent
    const mostFrequentBug = this.bugHistory.reduce(
      (max, bug) => (bug.occurrences > max.occurrences ? bug : max),
      this.bugHistory[0]
    )

    if (!mostFrequentBug) {
      return {
        detected: false,
        bug: null,
        recommendation: '',
      }
    }

    // Vérifier si le bug est répété >= maxIterations
    if (mostFrequentBug.occurrences >= this.maxIterations) {
      return {
        detected: true,
        bug: mostFrequentBug,
        recommendation: this.generateRecommendation(mostFrequentBug),
      }
    }

    return {
      detected: false,
      bug: mostFrequentBug,
      recommendation: '',
    }
  }

  /**
   * Générer un ID unique pour un bug basé sur le message d'erreur
   */
  private generateBugId(errorMessage: string): string {
    // Nettoyer le message pour extraire la partie stable
    const cleaned = errorMessage
      .replace(/\d+/g, 'N') // Remplacer les nombres par N
      .replace(/[\w-]+@[\w-]+\.[\w-]+/g, 'EMAIL') // Remplacer les emails
      .replace(/http:\/\/\S+/g, 'URL') // Remplacer les URLs
      .trim()

    // Générer un hash simple
    let hash = 0
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convertir en 32bit integer
    }

    return `BUG-${Math.abs(hash).toString(36).toUpperCase()}`
  }

  /**
   * Générer une recommandation pour sortir de la boucle
   */
  private generateRecommendation(bug: BugReport): string {
    const recommendations: string[] = [
      '## 🔄 Boucle Infinie Détectée',
      '',
      `**Bug ID**: ${bug.bugId}`,
      `**Occurrences**: ${bug.occurrences}/${this.maxIterations}`,
      `**Première occurrence**: ${bug.firstOccurrence}`,
      '',
      '### Message d\'erreur',
      '```',
      bug.errorMessage,
      '```',
      '',
      '### Stack Trace',
      '```',
      bug.stack || 'N/A',
      '```',
      '',
      '### Recommandations pour débloquer',
      '',
    ]

    // Analyser le type d'erreur et suggérer des solutions
    const errorPatterns = [
      {
        pattern: /timeout|timed out/i,
        solution: `1. Vérifier que le serveur de dev est démarré
2. Augmenter les timeouts dans \`test-config.ts\`
3. Vérifier les logs réseau pour identifier le blocage
4. Désactiver temporairement l'auto-healing pour debug manuel`,
      },
      {
        pattern: /element not found|locator.*not found/i,
        solution: `1. Vérifier que le sélecteur CSS/XPath est correct
2. Ajouter des \`waitFor\` avant les interactions
3. Vérifier que la page est complètement chargée
4. Capturer un screenshot pour voir l'état de la page`,
      },
      {
        pattern: /navigation|redirect/i,
        solution: `1. Vérifier les logs serveur pour les redirections
2. Vérifier middleware.ts pour les règles de redirection
3. Ajouter des logs dans les Server Actions
4. Vérifier l'état de l'authentification`,
      },
      {
        pattern: /database|supabase|rls/i,
        solution: `1. Vérifier les logs Supabase pour erreurs SQL
2. Vérifier les Row Level Security (RLS) policies
3. Vérifier que l'utilisateur de test existe dans la DB
4. Nettoyer la base de données de test`,
      },
      {
        pattern: /email|resend/i,
        solution: `1. Vérifier que RESEND_API_KEY est configuré
2. Vérifier les logs d'envoi d'email
3. Activer le mode mock email dans test-config.ts
4. Vérifier que l'email de test est valide`,
      },
    ]

    // Trouver le pattern correspondant
    const matchedPattern = errorPatterns.find((p) =>
      p.pattern.test(bug.errorMessage)
    )

    if (matchedPattern) {
      recommendations.push(matchedPattern.solution)
    } else {
      recommendations.push(`1. Analyser les logs dans \`${TEST_CONFIG.logging.logDir}\`
2. Vérifier la stack trace ci-dessus
3. Exécuter le test en mode headed pour observer le comportement
4. Ajouter des logs de debug supplémentaires
5. Désactiver temporairement l'auto-healing (\`DISABLE_AUTO_HEALING=true\`)`)
    }

    recommendations.push(
      '',
      '### Métadonnées',
      '```json',
      JSON.stringify(bug.metadata || {}, null, 2),
      '```',
      '',
      '### Prochaines étapes',
      '',
      '1. **Pause manuelle** : Le test s\'est arrêté pour éviter une boucle infinie',
      '2. **Analyser les logs** : Consulter les logs détaillés dans le dossier de test',
      '3. **Corriger le problème** : Appliquer les recommandations ci-dessus',
      '4. **Relancer le test** : Une fois le problème corrigé',
      '',
      '**Action requise** : Intervention manuelle nécessaire pour débloquer le test.'
    )

    return recommendations.join('\n')
  }

  /**
   * Analyser les logs pour détecter des patterns
   */
  analyzeLogPatterns(logs: LogEntry[]): {
    patterns: string[]
    severity: 'low' | 'medium' | 'high'
  } {
    const patterns: string[] = []
    let severity: 'low' | 'medium' | 'high' = 'low'

    // Compter les erreurs par type
    const errorCounts: Record<string, number> = {}

    logs
      .filter((log) => log.level === 'error')
      .forEach((log) => {
        const key = log.message.substring(0, 50) // Premier 50 caractères
        errorCounts[key] = (errorCounts[key] || 0) + 1
      })

    // Détecter les patterns répétitifs
    Object.entries(errorCounts).forEach(([error, count]) => {
      if (count >= 3) {
        patterns.push(`Erreur répétée ${count} fois: ${error}`)
        severity = 'high'
      } else if (count >= 2) {
        patterns.push(`Erreur doublée: ${error}`)
        severity = severity === 'high' ? 'high' : 'medium'
      }
    })

    // Détecter les timeouts
    const timeouts = logs.filter((log) =>
      /timeout|timed out/i.test(log.message)
    )
    if (timeouts.length > 0) {
      patterns.push(`${timeouts.length} timeout(s) détecté(s)`)
      severity = 'high'
    }

    // Détecter les erreurs réseau
    const networkErrors = logs.filter(
      (log) => log.source === 'network' && log.level === 'error'
    )
    if (networkErrors.length > 0) {
      patterns.push(`${networkErrors.length} erreur(s) réseau`)
      severity = severity === 'high' ? 'high' : 'medium'
    }

    return { patterns, severity }
  }

  /**
   * Obtenir l'historique complet des bugs
   */
  getBugHistory(): BugReport[] {
    return [...this.bugHistory]
  }

  /**
   * Réinitialiser l'historique
   */
  reset(): void {
    this.bugHistory = []
  }

  /**
   * Générer un rapport de tous les bugs
   */
  generateBugReport(): string {
    if (this.bugHistory.length === 0) {
      return '✅ Aucun bug détecté'
    }

    const report = [
      '# Bug Report',
      '',
      `**Total unique bugs**: ${this.bugHistory.length}`,
      `**Total occurrences**: ${this.bugHistory.reduce((sum, b) => sum + b.occurrences, 0)}`,
      '',
      '## Bugs par fréquence',
      '',
    ]

    // Trier par nombre d'occurrences
    const sortedBugs = [...this.bugHistory].sort(
      (a, b) => b.occurrences - a.occurrences
    )

    sortedBugs.forEach((bug, index) => {
      report.push(`### ${index + 1}. ${bug.bugId} (${bug.occurrences}x)`)
      report.push('')
      report.push('**Message**:')
      report.push('```')
      report.push(bug.errorMessage)
      report.push('```')
      report.push('')
      report.push(`**Première occurrence**: ${bug.firstOccurrence}`)
      report.push('')
    })

    return report.join('\n')
  }
}

/**
 * Factory pour créer un BugDetector
 */
export const createBugDetector = (): BugDetector => {
  return new BugDetector()
}

export default BugDetector
