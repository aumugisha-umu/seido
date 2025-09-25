/**
 * SEIDO Refactoring Specialist Agent - Main Export
 *
 * Complete refactoring solution for SEIDO real estate management platform
 *
 * Features:
 * ✅ Next.js 15 + React 19 optimized refactoring
 * ✅ shadcn/ui component standardization (50+ components)
 * ✅ WCAG 2.1 AA accessibility compliance
 * ✅ Mobile-first responsive design (320px→1024px+)
 * ✅ Material Design principles adherence
 * ✅ Multi-role UX optimization (Admin, Owner, Tenant, Provider)
 * ✅ TypeScript + Supabase integration improvements
 * ✅ Comprehensive metrics and validation
 */

// Main agent
export { default as SEIDORefactoringSpecialist, useRefactoringSpecialist } from './seido-refactoring-specialist'

// Core validation and design system
export { default as SEIDODesignValidator, AVAILABLE_SHADCN_COMPONENTS, SEIDO_DESIGN_GUIDELINES } from './seido-design-validator'
export type { DesignViolation, ShadcnComponent } from './seido-design-validator'

// Refactoring tools and utilities
export { default as SEIDORefactoringTools, SEIDOCodeTransformer } from './seido-refactoring-tools'

// Specialized patterns library
export { default as SEIDORefactoringPatterns } from './seido-refactoring-patterns'
export type { SEIDORefactoringPattern } from './seido-refactoring-patterns'

// Comprehensive validation engine
export { default as SEIDOValidationEngine } from './seido-validation-engine'
export type { ValidationResult, ProjectValidationSummary } from './seido-validation-engine'

// Type exports
export type {
  SEIDORefactoringContext,
  SEIDOCodeSmell,
  SEIDORefactoringTask,
  SEIDORefactoringMetrics
} from './seido-refactoring-specialist'

/**
 * Quick Start Guide for SEIDO Refactoring Agent
 */
export const SEIDO_REFACTORING_GUIDE = {
  quickStart: {
    title: "🚀 Quick Start - SEIDO Refactoring Agent",
    steps: [
      "1. Import: `import { SEIDORefactoringSpecialist } from '@/lib/agents'`",
      "2. Initialize: `const agent = new SEIDORefactoringSpecialist(context)`",
      "3. Analyze: `const analysis = await agent.analyzeCodebase()`",
      "4. Execute: `await agent.executeRefactoring(taskId)`"
    ]
  },

  examples: {
    basicUsage: `
// Basic usage example
import { SEIDORefactoringSpecialist, SEIDOValidationEngine } from '@/lib/agents'

const context = {
  nextVersion: '15.2.4',
  reactVersion: '19',
  tailwindVersion: '4.1.9',
  useShadcnComponents: true,
  followMaterialDesign: true,
  wcagLevel: 'AA'
}

const agent = new SEIDORefactoringSpecialist(context)
const validator = new SEIDOValidationEngine()

// Analyze codebase
const analysis = await agent.analyzeCodebase()
console.log('Found', analysis.tasks.length, 'refactoring opportunities')

// Validate entire project
const projectSummary = await validator.validateProject()
console.log('Project score:', projectSummary.overallScore + '/100')

// Execute high-priority refactoring
const highPriorityTasks = analysis.tasks.filter(t => t.priority === 'high')
for (const task of highPriorityTasks) {
  await agent.executeRefactoring(task.id)
}`,

    hookUsage: `
// React hook usage
import { useRefactoringSpecialist } from '@/lib/agents'

const RefactoringDashboard = () => {
  const { specialist, analyzeCodebase, executeRefactoring, isAnalyzing } = useRefactoringSpecialist(context)

  const [analysis, setAnalysis] = useState(null)

  const handleAnalyze = async () => {
    const result = await analyzeCodebase()
    setAnalysis(result)
  }

  return (
    <div>
      <Button onClick={handleAnalyze} disabled={isAnalyzing}>
        {isAnalyzing ? 'Analyzing...' : 'Analyze Codebase'}
      </Button>

      {analysis && (
        <div>
          <h3>Found {analysis.tasks.length} refactoring opportunities</h3>
          {analysis.tasks.map(task => (
            <Card key={task.id}>
              <CardHeader>
                <CardTitle>{task.description}</CardTitle>
                <Badge variant={task.priority}>{task.priority}</Badge>
              </CardHeader>
              <CardContent>
                <Button onClick={() => executeRefactoring(task.id)}>
                  Execute Refactoring
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}`
  },

  bestPractices: {
    title: "📋 Best Practices",
    guidelines: [
      "🔄 Always run analysis before executing refactoring tasks",
      "✅ Prioritize critical and high-priority tasks first",
      "🧪 Ensure tests pass before and after refactoring",
      "📱 Validate responsive design across all breakpoints",
      "♿ Verify WCAG 2.1 AA compliance after changes",
      "🎨 Leverage shadcn/ui components instead of custom ones",
      "📊 Monitor metrics to track refactoring progress",
      "🔍 Use validation engine to catch regressions"
    ]
  },

  integrations: {
    title: "🔧 Tool Integrations",
    tools: [
      "ESLint: Automatic linting and fixing",
      "TypeScript: Type checking and compilation",
      "Vitest: Unit test execution and coverage",
      "Next.js: Build validation and optimization",
      "shadcn/ui: Component standardization",
      "Tailwind CSS: Responsive design validation",
      "WCAG: Accessibility compliance checking"
    ]
  }
} as const

/**
 * SEIDO Refactoring Metrics Dashboard Data
 */
export const createRefactoringMetrics = async (projectRoot: string = process.cwd()) => {
  const validator = new SEIDOValidationEngine(projectRoot)
  const summary = await validator.validateProject()

  return {
    // Overall health
    overallScore: summary.overallScore,
    grade: summary.overallScore >= 90 ? 'A' : summary.overallScore >= 80 ? 'B' : summary.overallScore >= 70 ? 'C' : 'D',

    // Category breakdown
    categories: [
      { name: 'Design System', score: summary.categoryScores.designSystem, icon: '🎨' },
      { name: 'Accessibility', score: summary.categoryScores.accessibility, icon: '♿' },
      { name: 'Responsive', score: summary.categoryScores.responsive, icon: '📱' },
      { name: 'Material Design', score: summary.categoryScores.materialDesign, icon: '🎭' },
      { name: 'Role UX', score: summary.categoryScores.roleUX, icon: '👥' }
    ],

    // Quick stats
    stats: [
      { label: 'Total Files', value: summary.totalFiles },
      { label: 'Total Issues', value: summary.totalViolations },
      { label: 'Critical Issues', value: summary.criticalIssues },
      { label: 'Auto-fixable', value: summary.autoFixableIssues },
      { label: 'Est. Fix Time', value: summary.estimatedFixTime }
    ],

    // Top issues
    topIssues: summary.topViolations.slice(0, 5),

    // Recommendations
    recommendations: summary.recommendations,

    // Progress tracking
    progress: {
      completed: 0, // Would be tracked over time
      inProgress: summary.criticalIssues,
      remaining: summary.totalViolations - summary.criticalIssues
    }
  }
}

/**
 * SEIDO Component Usage Analysis
 */
export const analyzeComponentUsage = async (projectRoot: string = process.cwd()) => {
  const validator = new SEIDOValidationEngine(projectRoot)
  const shadcnAnalysis = await validator.validateShadcnUsage()

  return {
    adoptionRate: shadcnAnalysis.adoptionRate,
    utilisedComponents: shadcnAnalysis.utilisedComponents,
    availableComponents: shadcnAnalysis.availableComponents,
    missingComponents: shadcnAnalysis.availableComponents.filter(
      comp => !shadcnAnalysis.utilisedComponents.includes(comp)
    ),
    customComponents: shadcnAnalysis.customComponents,

    recommendations: [
      ...(shadcnAnalysis.adoptionRate < 70 ?
        [`🎨 Low shadcn/ui adoption (${shadcnAnalysis.adoptionRate}%). Consider standardizing components.`] : []
      ),
      ...(shadcnAnalysis.customComponents.length > 10 ?
        [`🔄 ${shadcnAnalysis.customComponents.length} custom components could use shadcn/ui equivalents.`] : []
      ),
      ...shadcnAnalysis.customComponents.slice(0, 3).map(comp =>
        `💡 Replace ${comp.component} in ${comp.file} with ${comp.suggestion}`
      )
    ]
  }
}

/**
 * Export everything for easy consumption
 */
export * from './seido-refactoring-specialist'
export * from './seido-design-validator'
export * from './seido-refactoring-tools'
export * from './seido-refactoring-patterns'
export * from './seido-validation-engine'

export default SEIDORefactoringSpecialist