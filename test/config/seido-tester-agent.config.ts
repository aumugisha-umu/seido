/**
 * Configuration de l'Agent Tester Spécialisé pour SEIDO
 * Agent de test multi-rôles avec focus sur performance et workflows complexes
 */

import { TestAccountsHelper } from '../utils/test-accounts-helper'

export interface SeidoRole {
  name: 'admin' | 'gestionnaire' | 'prestataire' | 'locataire'
  email: string
  password: string
  capabilities: string[]
  dashboardUrl: string
  criticalActions: string[]
  expectedElements: string[]
}

export interface CriticalWorkflow {
  name: string
  description: string
  roles: string[]
  steps: WorkflowStep[]
  estimatedDuration: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  validationCriteria: string[]
}

export interface WorkflowStep {
  role: string
  action: string
  expectedResult: string
  selectors: string[]
}

export interface PerformanceMetric {
  name: string
  maxTime?: number
  maxSize?: number
  baseline: number
  target: number
  improvementTarget: number // % improvement expected
}

export interface TestPhase {
  name: string
  description: string
  focus: string[]
  requiredPassing: number
  performanceImprovement?: number
  criticalTests: string[]
  regressionTests: string[]
}

export const SeidoTesterConfig = {
  // Configuration multi-rôles avec comptes réels
  roles: [
    {
      name: 'admin',
      email: 'arthur+003@seido.pm',
      password: 'Wxcvbn123',
      capabilities: ['users', 'teams', 'properties', 'interventions', 'reports', 'system-settings'],
      dashboardUrl: '/dashboard/admin',
      criticalActions: [
        'manage-users',
        'manage-teams',
        'view-reports',
        'system-configuration',
        'audit-logs'
      ],
      expectedElements: [
        '[data-testid="admin-dashboard"]',
        '[data-testid="users-management"]',
        '[data-testid="teams-management"]',
        '[data-testid="system-stats"]',
        '[data-testid="audit-logs"]'
      ]
    },
    {
      name: 'gestionnaire',
      email: 'arthur+000@seido.pm',
      password: 'Wxcvbn123',
      capabilities: ['interventions', 'properties', 'providers', 'tenants', 'planning', 'quotes-approval'],
      dashboardUrl: '/dashboard/gestionnaire',
      criticalActions: [
        'create-intervention',
        'approve-intervention',
        'manage-properties',
        'assign-provider',
        'approve-quote',
        'schedule-intervention'
      ],
      expectedElements: [
        '[data-testid="gestionnaire-dashboard"]',
        '[data-testid="interventions-list"]',
        '[data-testid="properties-list"]',
        '[data-testid="providers-list"]',
        '[data-testid="planning-calendar"]'
      ]
    },
    {
      name: 'prestataire',
      email: 'arthur+001@seido.pm',
      password: 'Wxcvbn123',
      capabilities: ['my-interventions', 'quotes', 'availability', 'documents', 'execution'],
      dashboardUrl: '/dashboard/prestataire',
      criticalActions: [
        'view-assigned-interventions',
        'submit-quote',
        'manage-availability',
        'upload-documents',
        'start-intervention',
        'complete-intervention'
      ],
      expectedElements: [
        '[data-testid="prestataire-dashboard"]',
        '[data-testid="my-interventions"]',
        '[data-testid="quotes-form"]',
        '[data-testid="availability-calendar"]',
        '[data-testid="documents-upload"]'
      ]
    },
    {
      name: 'locataire',
      email: 'arthur+002@seido.pm',
      password: 'Wxcvbn123',
      capabilities: ['my-requests', 'new-request', 'history', 'my-housing', 'notifications'],
      dashboardUrl: '/dashboard/locataire',
      criticalActions: [
        'create-intervention-request',
        'view-request-status',
        'add-comments',
        'view-history',
        'update-contact-info'
      ],
      expectedElements: [
        '[data-testid="locataire-dashboard"]',
        '[data-testid="new-request-button"]',
        '[data-testid="my-requests-list"]',
        '[data-testid="request-history"]',
        '[data-testid="housing-info"]'
      ]
    }
  ] as SeidoRole[],

  // Workflows critiques SEIDO
  criticalWorkflows: [
    {
      name: 'intervention-complete-workflow',
      description: 'Workflow complet d\'une intervention du début à la fin',
      roles: ['locataire', 'gestionnaire', 'prestataire'],
      steps: [
        {
          role: 'locataire',
          action: 'Créer demande d\'intervention',
          expectedResult: 'Demande créée avec statut "nouvelle-demande"',
          selectors: [
            '[data-testid="new-request-button"]',
            '[name="title"]',
            '[name="description"]',
            '[name="urgency"]',
            'button[type="submit"]'
          ]
        },
        {
          role: 'gestionnaire',
          action: 'Valider et approuver la demande',
          expectedResult: 'Demande approuvée, statut "approuvée"',
          selectors: [
            '[data-testid="interventions-list"]',
            '[data-testid="intervention-details"]',
            '[data-testid="approve-button"]',
            '[name="internal_comment"]'
          ]
        },
        {
          role: 'prestataire',
          action: 'Soumettre un devis',
          expectedResult: 'Devis soumis en attente de validation',
          selectors: [
            '[data-testid="my-interventions"]',
            '[data-testid="create-quote-button"]',
            '[name="amount"]',
            '[name="description"]',
            'button[type="submit"]'
          ]
        },
        {
          role: 'gestionnaire',
          action: 'Approuver le devis',
          expectedResult: 'Devis approuvé, intervention planifiable',
          selectors: [
            '[data-testid="quote-details"]',
            '[data-testid="approve-quote-button"]'
          ]
        },
        {
          role: 'prestataire',
          action: 'Planifier et exécuter l\'intervention',
          expectedResult: 'Intervention planifiée puis marquée comme terminée',
          selectors: [
            '[data-testid="schedule-button"]',
            '[name="date"]',
            '[name="time"]',
            '[data-testid="start-intervention"]',
            '[data-testid="complete-intervention"]'
          ]
        }
      ],
      estimatedDuration: '5min',
      priority: 'critical',
      validationCriteria: [
        'Tous les statuts doivent être correctement mis à jour',
        'Les notifications doivent être envoyées à chaque étape',
        'Les droits d\'accès doivent être respectés',
        'L\'historique doit être complet'
      ]
    },
    {
      name: 'quote-approval-workflow',
      description: 'Processus d\'approbation des devis',
      roles: ['prestataire', 'gestionnaire'],
      steps: [
        {
          role: 'prestataire',
          action: 'Créer et soumettre un devis',
          expectedResult: 'Devis créé avec détails et montant',
          selectors: [
            '[data-testid="create-quote-button"]',
            '[name="amount"]',
            '[name="description"]',
            '[name="validity_days"]'
          ]
        },
        {
          role: 'gestionnaire',
          action: 'Examiner et approuver/rejeter le devis',
          expectedResult: 'Devis traité avec décision enregistrée',
          selectors: [
            '[data-testid="quotes-pending"]',
            '[data-testid="quote-details"]',
            '[data-testid="approve-quote"]',
            '[data-testid="reject-quote"]'
          ]
        }
      ],
      estimatedDuration: '3min',
      priority: 'high',
      validationCriteria: [
        'Le devis doit contenir toutes les informations requises',
        'La décision doit être tracée dans l\'historique',
        'Les notifications doivent être envoyées'
      ]
    },
    {
      name: 'availability-management',
      description: 'Gestion des disponibilités prestataires',
      roles: ['prestataire', 'gestionnaire'],
      steps: [
        {
          role: 'prestataire',
          action: 'Définir ses disponibilités',
          expectedResult: 'Créneaux de disponibilité enregistrés',
          selectors: [
            '[data-testid="availability-calendar"]',
            '[data-testid="add-availability"]',
            '[name="start_date"]',
            '[name="end_date"]'
          ]
        },
        {
          role: 'gestionnaire',
          action: 'Consulter et utiliser les disponibilités',
          expectedResult: 'Planning visible pour assignation',
          selectors: [
            '[data-testid="provider-availability"]',
            '[data-testid="schedule-intervention"]'
          ]
        }
      ],
      estimatedDuration: '2min',
      priority: 'medium',
      validationCriteria: [
        'Les disponibilités doivent être correctement sauvegardées',
        'Les conflits de planning doivent être détectés',
        'L\'interface doit être responsive'
      ]
    }
  ] as CriticalWorkflow[],

  // Métriques de performance à surveiller
  performanceTargets: {
    authentication: {
      name: 'Authentication Time',
      maxTime: 3000,
      baseline: 14000,
      target: 3000,
      improvementTarget: 78
    },
    dashboardLoad: {
      name: 'Dashboard Load Time',
      maxTime: 2000,
      baseline: 5000,
      target: 2000,
      improvementTarget: 60
    },
    bundleSize: {
      name: 'Bundle Size (MB)',
      maxSize: 1.5,
      baseline: 5.0,
      target: 1.5,
      improvementTarget: 70
    },
    firstContentfulPaint: {
      name: 'FCP',
      maxTime: 1000,
      baseline: 3200,
      target: 1000,
      improvementTarget: 69
    },
    largestContentfulPaint: {
      name: 'LCP',
      maxTime: 2500,
      baseline: 4500,
      target: 2500,
      improvementTarget: 44
    },
    timeToInteractive: {
      name: 'TTI',
      maxTime: 3000,
      baseline: 8500,
      target: 3000,
      improvementTarget: 65
    },
    firstInputDelay: {
      name: 'FID',
      maxTime: 100,
      baseline: 300,
      target: 100,
      improvementTarget: 67
    },
    cumulativeLayoutShift: {
      name: 'CLS',
      maxSize: 0.1,
      baseline: 0.3,
      target: 0.1,
      improvementTarget: 67
    },
    apiResponseTime: {
      name: 'API Response Time',
      maxTime: 200,
      baseline: 500,
      target: 200,
      improvementTarget: 60
    }
  } as Record<string, PerformanceMetric>,

  // Configuration tests par phase
  testPhases: {
    baseline: {
      name: 'Baseline',
      description: 'Tests baseline avant optimisation',
      focus: ['accessibility', 'functionality', 'performance-measurement'],
      requiredPassing: 100,
      criticalTests: [
        'role-accessibility',
        'dashboard-loading',
        'navigation-completeness',
        'core-actions'
      ],
      regressionTests: []
    },
    phase2: {
      name: 'Server Components Migration',
      description: 'Post Server Components migration',
      focus: ['performance-improvement', 'bundle-reduction', 'functionality'],
      requiredPassing: 95,
      performanceImprovement: 30,
      criticalTests: [
        'server-components-functionality',
        'data-fetching-optimization',
        'bundle-size-reduction',
        'hydration-performance'
      ],
      regressionTests: [
        'role-accessibility',
        'dashboard-functionality',
        'navigation-integrity'
      ]
    },
    phase3: {
      name: 'Database & Cache Optimization',
      description: 'Post Database optimization',
      focus: ['cache-validation', 'query-performance', 'stability'],
      requiredPassing: 95,
      performanceImprovement: 50,
      criticalTests: [
        'cache-effectiveness',
        'cache-invalidation',
        'query-optimization',
        'connection-pooling'
      ],
      regressionTests: [
        'data-integrity',
        'role-isolation',
        'workflow-functionality'
      ]
    },
    final: {
      name: 'Production Readiness',
      description: 'Final validation before production',
      focus: ['all-targets', 'cross-browser', 'error-handling', 'security'],
      requiredPassing: 100,
      performanceImprovement: 70,
      criticalTests: [
        'performance-targets-validation',
        'bundle-size-validation',
        'authentication-performance',
        'cross-browser-compatibility',
        'error-boundaries',
        'security-validation'
      ],
      regressionTests: [
        'complete-workflow-validation',
        'multi-role-interaction',
        'data-persistence',
        'notification-system'
      ]
    }
  } as Record<string, TestPhase>,

  // Configuration des environnements
  environments: {
    local: {
      baseUrl: 'http://localhost:3000',
      apiUrl: 'http://localhost:3000/api',
      supabaseUrl: 'http://localhost:54321'
    },
    staging: {
      baseUrl: 'https://staging.seido.app',
      apiUrl: 'https://staging.seido.app/api',
      supabaseUrl: process.env.STAGING_SUPABASE_URL
    },
    production: {
      baseUrl: 'https://seido.app',
      apiUrl: 'https://seido.app/api',
      supabaseUrl: process.env.PRODUCTION_SUPABASE_URL
    }
  },

  // Seuils d'acceptation
  acceptanceCriteria: {
    coverage: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    },
    performance: {
      lighthouse: {
        performance: 90,
        accessibility: 95,
        bestPractices: 90,
        seo: 85
      }
    },
    errors: {
      maxErrorRate: 0.1, // 0.1% error rate maximum
      maxWarnings: 10
    }
  },

  // Configuration des rapports
  reporting: {
    outputDir: './test/reports',
    formats: ['html', 'json', 'junit'],
    screenshots: {
      enabled: true,
      onFailure: true,
      fullPage: true
    },
    videos: {
      enabled: true,
      onFailure: true
    },
    traces: {
      enabled: true,
      onFirstRetry: true
    }
  }
}

// Helper functions pour l'agent tester
export const TestingHelpers = {
  getRoleConfig(roleName: string): SeidoRole | undefined {
    return SeidoTesterConfig.roles.find(r => r.name === roleName)
  },

  getWorkflow(workflowName: string): CriticalWorkflow | undefined {
    return SeidoTesterConfig.criticalWorkflows.find(w => w.name === workflowName)
  },

  getPhaseConfig(phaseName: string): TestPhase | undefined {
    return SeidoTesterConfig.testPhases[phaseName]
  },

  getPerformanceTarget(metricName: string): PerformanceMetric | undefined {
    return SeidoTesterConfig.performanceTargets[metricName]
  },

  calculateImprovement(baseline: number, current: number): number {
    return Math.round(((baseline - current) / baseline) * 100)
  },

  isPerformanceTargetMet(metric: string, value: number): boolean {
    const target = SeidoTesterConfig.performanceTargets[metric]
    if (!target) return false

    if (target.maxTime) {
      return value <= target.maxTime
    }
    if (target.maxSize) {
      return value <= target.maxSize
    }
    return false
  },

  generateTestReport(phase: string, results: any): string {
    const phaseConfig = SeidoTesterConfig.testPhases[phase]
    const timestamp = new Date().toISOString()

    return `
# SEIDO Test Report - ${phase}
Generated: ${timestamp}

## Phase: ${phaseConfig?.name}
Description: ${phaseConfig?.description}

## Results Summary
- Tests Run: ${results.totalTests}
- Tests Passed: ${results.passed}
- Tests Failed: ${results.failed}
- Pass Rate: ${(results.passed / results.totalTests * 100).toFixed(2)}%
- Required Pass Rate: ${phaseConfig?.requiredPassing}%

## Performance Metrics
${Object.entries(results.performance || {}).map(([key, value]) =>
  `- ${key}: ${value} (Target: ${SeidoTesterConfig.performanceTargets[key]?.target})`
).join('\n')}

## Status: ${results.passed / results.totalTests * 100 >= (phaseConfig?.requiredPassing || 100) ? 'PASS' : 'FAIL'}
    `.trim()
  }
}

export default SeidoTesterConfig
