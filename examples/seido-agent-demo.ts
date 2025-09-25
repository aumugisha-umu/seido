/**
 * SEIDO Refactoring Agent - Démonstration pratique
 *
 * Ce fichier démontre l'utilisation de l'agent SEIDO Refactoring Specialist
 * sur des exemples concrets du projet SEIDO.
 */

import {
  SEIDORefactoringSpecialist,
  SEIDOValidationEngine,
  SEIDORefactoringPatterns,
  createRefactoringMetrics,
  analyzeComponentUsage
} from '@/lib/agents'

/**
 * Configuration pour la démonstration
 */
const demoConfig = {
  nextVersion: '15.2.4' as const,
  reactVersion: '19' as const,
  tailwindVersion: '4.1.9' as const,
  typescriptVersion: '5' as const,
  useShadcnComponents: true,
  followMaterialDesign: true,
  wcagLevel: 'AA' as const,
  breakpoints: {
    mobile: '320px-767px' as const,
    tablet: '768px-1023px' as const,
    desktop: '1024px+' as const
  },
  lighthouseTarget: {
    performance: 90,
    accessibility: 100,
    bestPractices: 90,
    seo: 90
  }
}

/**
 * Démonstration 1: Analyse du gestionnaire dashboard
 */
export const demoGestionnaireDashboardAnalysis = async () => {
  console.log('🔍 === DEMO 1: Analyse du Gestionnaire Dashboard ===')

  const agent = new SEIDORefactoringSpecialist(demoConfig)
  const validator = new SEIDOValidationEngine()

  // Analyser le fichier dashboard gestionnaire
  const dashboardPath = 'components/dashboards/gestionnaire-dashboard.tsx'

  try {
    const fileValidation = await validator.validateFile(dashboardPath)

    console.log('📊 Résultats d\'analyse:')
    console.log(`- Score global: ${fileValidation.score}/100`)
    console.log(`- Violations trouvées: ${fileValidation.violations.length}`)
    console.log('- Métriques par catégorie:')
    console.log(`  • Accessibilité: ${fileValidation.metrics.accessibility}/100`)
    console.log(`  • Responsive: ${fileValidation.metrics.responsive}/100`)
    console.log(`  • Design System: ${fileValidation.metrics.designSystem}/100`)
    console.log(`  • Material Design: ${fileValidation.metrics.materialDesign}/100`)

    // Afficher les violations les plus importantes
    const criticalViolations = fileValidation.violations.filter(v => v.severity === 'error')
    if (criticalViolations.length > 0) {
      console.log('\n🔴 Violations critiques:')
      criticalViolations.slice(0, 3).forEach(violation => {
        console.log(`  • ${violation.message}`)
        console.log(`    💡 Suggestion: ${violation.suggestion}`)
      })
    }

    // Recommendations
    console.log('\n💡 Recommendations:')
    fileValidation.recommendations.forEach(rec => {
      console.log(`  • ${rec}`)
    })

    return fileValidation
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error)
    return null
  }
}

/**
 * Démonstration 2: Analyse de l'utilisation des composants shadcn/ui
 */
export const demoShadcnUsageAnalysis = async () => {
  console.log('\n🎨 === DEMO 2: Analyse utilisation shadcn/ui ===')

  try {
    const componentAnalysis = await analyzeComponentUsage()

    console.log('📈 Statistiques shadcn/ui:')
    console.log(`- Taux d'adoption: ${componentAnalysis.adoptionRate}%`)
    console.log(`- Composants utilisés: ${componentAnalysis.utilisedComponents.length}/50+`)
    console.log(`- Composants custom détectés: ${componentAnalysis.customComponents.length}`)

    console.log('\n✅ Composants shadcn/ui utilisés:')
    componentAnalysis.utilisedComponents.slice(0, 10).forEach(comp => {
      console.log(`  • ${comp}`)
    })

    console.log('\n🔄 Opportunités de migration:')
    componentAnalysis.customComponents.slice(0, 5).forEach(comp => {
      console.log(`  • ${comp.file}: ${comp.component}`)
      console.log(`    💡 ${comp.suggestion}`)
    })

    console.log('\n💡 Recommandations:')
    componentAnalysis.recommendations.forEach(rec => {
      console.log(`  • ${rec}`)
    })

    return componentAnalysis
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse shadcn/ui:', error)
    return null
  }
}

/**
 * Démonstration 3: Patterns de refactoring spécifiques SEIDO
 */
export const demoSEIDOPatterns = async () => {
  console.log('\n🔧 === DEMO 3: Patterns de refactoring SEIDO ===')

  const patternsLib = new SEIDORefactoringPatterns()
  const allPatterns = patternsLib.getAllPatternsSorted()

  console.log('🎯 Plan de refactoring par priorité:')

  const plan = patternsLib.generateRefactoringPlan()

  console.log('\n🔴 Phase 1 - Critique:')
  plan.phase1.forEach(pattern => {
    console.log(`  • ${pattern.name}`)
    console.log(`    Description: ${pattern.description}`)
    console.log(`    Complexité: ${pattern.complexity}`)
    console.log(`    Bénéfices: ${pattern.benefits.slice(0, 2).join(', ')}`)
  })

  console.log('\n🟡 Phase 2 - Haute priorité:')
  plan.phase2.forEach(pattern => {
    console.log(`  • ${pattern.name}`)
    console.log(`    Catégorie: ${pattern.category}`)
    console.log(`    Fichiers: ${pattern.files.slice(0, 2).join(', ')}`)
  })

  console.log('\n📊 Statistiques patterns:')
  console.log(`- Total patterns: ${allPatterns.length}`)
  console.log(`- Critiques: ${plan.phase1.length}`)
  console.log(`- Haute priorité: ${plan.phase2.length}`)
  console.log(`- Moyenne priorité: ${plan.phase3.length}`)

  // Patterns spécifiques aux services
  const servicePatterns = patternsLib.getPatternsByCategory('service')
  console.log(`\n⚙️ Patterns services (${servicePatterns.length}):`)
  servicePatterns.forEach(pattern => {
    console.log(`  • ${pattern.name} - ${pattern.priority}`)
  })

  return { patterns: allPatterns, plan }
}

/**
 * Démonstration 4: Validation accessibilité WCAG 2.1 AA
 */
export const demoAccessibilityValidation = async () => {
  console.log('\n♿ === DEMO 4: Validation Accessibilité WCAG 2.1 AA ===')

  const validator = new SEIDOValidationEngine()

  // Tester sur le dashboard gestionnaire
  const dashboardPath = 'components/dashboards/gestionnaire-dashboard.tsx'

  try {
    const a11yResults = await validator.validateAccessibility(dashboardPath)

    console.log('📊 Résultats accessibilité:')
    console.log(`- Score: ${a11yResults.score}/100`)
    console.log(`- Conformité: ${a11yResults.compliance}`)
    console.log(`- Violations: ${a11yResults.violations.length}`)

    if (a11yResults.violations.length > 0) {
      console.log('\n🔍 Détail des violations:')
      a11yResults.violations.slice(0, 5).forEach(violation => {
        console.log(`  🔴 ${violation.rule}: ${violation.description}`)
        console.log(`     💡 Suggestion: ${violation.suggestion}`)
      })
    }

    // Recommandations spécifiques
    console.log('\n✅ Recommandations WCAG 2.1 AA:')
    if (a11yResults.score < 100) {
      console.log('  • Ajouter aria-label aux boutons avec icônes')
      console.log('  • Vérifier les ratios de contraste (4.5:1 minimum)')
      console.log('  • Assurer la navigation clavier complète')
      console.log('  • Utiliser des éléments HTML sémantiques')
    } else {
      console.log('  • ✨ Conformité WCAG 2.1 AA atteinte!')
    }

    return a11yResults
  } catch (error) {
    console.error('❌ Erreur lors de la validation accessibilité:', error)
    return null
  }
}

/**
 * Démonstration 5: Validation responsive mobile-first
 */
export const demoResponsiveValidation = async () => {
  console.log('\n📱 === DEMO 5: Validation Responsive Mobile-First ===')

  const validator = new SEIDOValidationEngine()
  const dashboardPath = 'components/dashboards/gestionnaire-dashboard.tsx'

  try {
    const responsiveResults = await validator.validateResponsiveDesign(dashboardPath)

    console.log('📊 Résultats responsive:')
    console.log(`- Score global: ${responsiveResults.overall}/100`)

    console.log('\n📱 Par breakpoint:')
    console.log(`- Mobile (320-767px): ${responsiveResults.mobile.score}/100`)
    if (responsiveResults.mobile.issues.length > 0) {
      responsiveResults.mobile.issues.forEach(issue => {
        console.log(`    ⚠️ ${issue}`)
      })
    }

    console.log(`- Tablet (768-1023px): ${responsiveResults.tablet.score}/100`)
    if (responsiveResults.tablet.issues.length > 0) {
      responsiveResults.tablet.issues.forEach(issue => {
        console.log(`    ⚠️ ${issue}`)
      })
    }

    console.log(`- Desktop (1024px+): ${responsiveResults.desktop.score}/100`)
    if (responsiveResults.desktop.issues.length > 0) {
      responsiveResults.desktop.issues.forEach(issue => {
        console.log(`    ⚠️ ${issue}`)
      })
    }

    console.log('\n💡 Recommandations responsive:')
    console.log('  • Utiliser mobile-first: text-sm md:text-base lg:text-lg')
    console.log('  • Zones tactiles minimum 44px×44px')
    console.log('  • Tester sur vrais appareils, pas seulement émulateurs')
    console.log('  • Grid responsive: grid-cols-1 md:grid-cols-2 lg:grid-cols-4')

    return responsiveResults
  } catch (error) {
    console.error('❌ Erreur lors de la validation responsive:', error)
    return null
  }
}

/**
 * Démonstration 6: Métriques de projet complètes
 */
export const demoProjectMetrics = async () => {
  console.log('\n📊 === DEMO 6: Métriques Projet Complètes ===')

  try {
    const metrics = await createRefactoringMetrics()

    console.log('🎯 Vue d\'ensemble qualité:')
    console.log(`- Score global: ${metrics.overallScore}/100 (${metrics.grade})`)

    console.log('\n📈 Scores par catégorie:')
    metrics.categories.forEach(category => {
      const status = category.score >= 90 ? '✅' : category.score >= 70 ? '🟡' : '🔴'
      console.log(`  ${status} ${category.icon} ${category.name}: ${category.score}/100`)
    })

    console.log('\n📊 Statistiques:')
    metrics.stats.forEach(stat => {
      console.log(`  • ${stat.label}: ${stat.value}`)
    })

    console.log('\n🔴 Top 3 problèmes:')
    metrics.topIssues.slice(0, 3).forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue.type} (${issue.count} occurrences)`)
      console.log(`     Fichiers: ${issue.examples.join(', ')}`)
    })

    console.log('\n💡 Actions prioritaires:')
    metrics.recommendations.slice(0, 5).forEach(rec => {
      console.log(`  • ${rec}`)
    })

    console.log('\n📈 Progression:')
    const total = metrics.progress.completed + metrics.progress.inProgress + metrics.progress.remaining
    const completedPercent = Math.round((metrics.progress.completed / total) * 100)
    console.log(`  • Terminé: ${metrics.progress.completed} (${completedPercent}%)`)
    console.log(`  • En cours: ${metrics.progress.inProgress}`)
    console.log(`  • Restant: ${metrics.progress.remaining}`)

    return metrics
  } catch (error) {
    console.error('❌ Erreur lors des métriques projet:', error)
    return null
  }
}

/**
 * Démonstration complète - Exécuter tous les exemples
 */
export const runFullDemo = async () => {
  console.log('🚀 ==========================================')
  console.log('🚀 SEIDO Refactoring Agent - Démonstration')
  console.log('🚀 ==========================================')

  const results: any = {}

  try {
    // Demo 1: Analyse dashboard
    results.dashboard = await demoGestionnaireDashboardAnalysis()

    // Demo 2: shadcn/ui usage
    results.shadcn = await demoShadcnUsageAnalysis()

    // Demo 3: Patterns SEIDO
    results.patterns = await demoSEIDOPatterns()

    // Demo 4: Accessibilité
    results.accessibility = await demoAccessibilityValidation()

    // Demo 5: Responsive
    results.responsive = await demoResponsiveValidation()

    // Demo 6: Métriques projet
    results.metrics = await demoProjectMetrics()

    console.log('\n🎉 ==========================================')
    console.log('🎉 Démonstration terminée avec succès!')
    console.log('🎉 ==========================================')

    // Résumé final
    console.log('\n📋 RÉSUMÉ EXÉCUTIF:')

    if (results.metrics) {
      console.log(`- Score projet: ${results.metrics.overallScore}/100`)
      console.log(`- Temps correction estimé: ${results.metrics.stats.find(s => s.label === 'Est. Fix Time')?.value || 'N/A'}`)
    }

    if (results.shadcn) {
      console.log(`- Adoption shadcn/ui: ${results.shadcn.adoptionRate}%`)
    }

    if (results.patterns) {
      console.log(`- Patterns de refactoring: ${results.patterns.patterns.length} identifiés`)
    }

    console.log('\n✅ L\'agent SEIDO Refactoring Specialist est prêt à optimiser votre codebase!')

    return results
  } catch (error) {
    console.error('❌ Erreur lors de la démonstration:', error)
    return null
  }
}

// Exporter pour utilisation
export default {
  demoGestionnaireDashboardAnalysis,
  demoShadcnUsageAnalysis,
  demoSEIDOPatterns,
  demoAccessibilityValidation,
  demoResponsiveValidation,
  demoProjectMetrics,
  runFullDemo
}

/**
 * Exemple d'utilisation pour tester l'agent
 *
 * Utiliser dans la console ou dans un script:
 *
 * ```typescript
 * import demo from './examples/seido-agent-demo'
 *
 * // Tester un aspect spécifique
 * await demo.demoShadcnUsageAnalysis()
 *
 * // Ou exécuter la démonstration complète
 * await demo.runFullDemo()
 * ```
 */