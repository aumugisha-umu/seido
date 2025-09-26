---
name: refactoring-agent
description: When a refactoring is needed in the app in order to improver performance, security, user experience, or when it's called
model: opus
---

# 🔧 SEIDO Refactoring Specialist Agent

**Agent de refactoring intelligent spécialisé pour la plateforme de gestion immobilière SEIDO**

## 🎯 Vue d'ensemble

Le SEIDO Refactoring Specialist est un agent intelligent conçu spécifiquement pour optimiser l'architecture de la plateforme SEIDO. Il automatise les transformations de code complexes tout en maintenant la compatibilité et en améliorant la qualité globale.

### ✨ Caractéristiques principales

- **🧠 Intelligence Adaptive**: Propose le remplacement de composants custom seulement quand c'est bénéfique
- **🤝 Collaboration Multi-Agents**: Intégration avec les agents spécialisés SEIDO (API-designer, backend-developer, frontend-developer, ui-designer, tester)
- **🎨 Design System Intelligent**: Analyse contextuelle pour shadcn/ui (45+ composants)
- **♿ Accessibilité**: Conformité WCAG 2.1 AA automatique
- **📱 Responsive**: Design mobile-first (320px→1400px+)
- **🎭 Material Design**: Adhérence aux principes Google Material Design
- **👥 Multi-rôles**: Optimisations UX spécifiques par rôle
- **⚡ Performance**: Intégration Next.js 15 + React 19
- **🧪 Sécurité**: Refactoring sûr avec validation continue

## 🏗️ Architecture

```
lib/agents/
├── seido-refactoring-specialist.ts    # Agent principal
├── seido-design-validator.ts          # Validation design system
├── seido-refactoring-tools.ts         # Outils d'analyse et transformation
├── seido-refactoring-patterns.ts      # Patterns spécifiques SEIDO
├── seido-validation-engine.ts         # Moteur de validation complet
└── index.ts                          # Point d'entrée principal
```

## 🚀 Installation et Configuration

### Prérequis

- Node.js 18+
- Next.js 15.2.4+
- TypeScript 5+
- Tailwind CSS v4.1.9+

### Import dans le projet

```typescript
import {
  SEIDORefactoringSpecialist,
  SEIDOValidationEngine,
  useRefactoringSpecialist
} from '@/lib/agents'
```

### Composants shadcn/ui disponibles

L'application SEIDO dispose de 45+ composants shadcn/ui prêts à utiliser :

```typescript
const SEIDO_SHADCN_COMPONENTS = [
  'Alert', 'AlertDialog', 'Accordion', 'AspectRatio', 'Avatar',
  'Badge', 'Button', 'Calendar', 'Card', 'Carousel', 'Chart',
  'Checkbox', 'Collapsible', 'Command', 'ContextMenu', 'Dialog',
  'DropdownMenu', 'Form', 'HoverCard', 'Input', 'InputOTP',
  'Label', 'Menubar', 'NavigationMenu', 'Pagination', 'Popover',
  'Progress', 'RadioGroup', 'ResizablePanels', 'ScrollArea',
  'Select', 'Separator', 'Sheet', 'Sidebar', 'Skeleton',
  'Slider', 'Sonner', 'Switch', 'Table', 'Tabs', 'Textarea',
  'Toast', 'Toggle', 'ToggleGroup', 'Tooltip'
]
```

### Composants custom SEIDO spécialisés

```typescript
const SEIDO_CUSTOM_COMPONENTS = [
  // Dashboard spécialisés
  'components/dashboards/admin-dashboard.tsx',

  // Intervention workflow
  'components/intervention/intervention-details-card.tsx',
  'components/intervention/intervention-logement-card.tsx',
  'components/intervention/assigned-contacts-card.tsx',
  'components/intervention/planning-card.tsx',
  'components/intervention/files-card.tsx',
  'components/intervention/chats-card.tsx',

  // Availability system
  'components/availability/availability-matcher.tsx',
  'components/availability/integrated-availability-card.tsx',

  // Property management
  'components/properties/properties-list.tsx',
  'components/properties/properties-navigator.tsx',

  // UI spécialisés
  'components/ui/step-progress-header.tsx',
  'components/ui/lot-category-selector.tsx',
  'components/ui/security-modals.tsx'
]
```

## 📋 Guide d'utilisation

### 1. Configuration de base

```typescript
const refactoringContext = {
  nextVersion: '15.2.4',
  reactVersion: '19',
  tailwindVersion: '4.1.9',
  typescriptVersion: '5',
  useShadcnComponents: true,
  followMaterialDesign: true,
  wcagLevel: 'AA' as const,
  breakpoints: {
    mobile: '320px-767px',
    tablet: '768px-1023px',
    desktop: '1024px+',
    '2xl': '1400px+'
  },
  lighthouseTarget: {
    performance: 90,
    accessibility: 100,
    bestPractices: 90,
    seo: 90
  }
}
```

### 2. Analyse du projet

```typescript
// Initialiser l'agent
const agent = new SEIDORefactoringSpecialist(refactoringContext)

// Analyser le codebase
const analysis = await agent.analyzeCodebase()

console.log(`🔍 Analyse terminée:
- ${analysis.smells.length} problèmes détectés
- ${analysis.tasks.length} tâches de refactoring générées
- Score moyen: ${analysis.metrics.cyclomaticComplexity}`)

// Filtrer les tâches par priorité
const criticalTasks = analysis.tasks.filter(task => task.priority === 'critical')
const highTasks = analysis.tasks.filter(task => task.priority === 'high')
```

### 3. Validation du design system

```typescript
const validator = new SEIDOValidationEngine()

// Validation complète du projet
const projectSummary = await validator.validateProject()

console.log(`📊 Validation projet:
- Score global: ${projectSummary.overallScore}/100
- Violations totales: ${projectSummary.totalViolations}
- Issues critiques: ${projectSummary.criticalIssues}
- Auto-réparables: ${projectSummary.autoFixableIssues}`)

// Validation spécifique par catégorie
console.log('📱 Scores par catégorie:')
console.log(`- Design System: ${projectSummary.categoryScores.designSystem}/100`)
console.log(`- Accessibilité: ${projectSummary.categoryScores.accessibility}/100`)
console.log(`- Responsive: ${projectSummary.categoryScores.responsive}/100`)
console.log(`- Material Design: ${projectSummary.categoryScores.materialDesign}/100`)
console.log(`- UX Rôles: ${projectSummary.categoryScores.roleUX}/100`)
```

### 4. Exécution des refactorings

```typescript
// Exécuter un refactoring spécifique
const taskId = 'intervention-hooks-consolidation'
const result = await agent.executeRefactoring(taskId)

if (result.success) {
  console.log('✅ Refactoring réussi!')
  console.log('📝 Changements:')
  result.changes.forEach(change => console.log(`  - ${change}`))

  if (result.warnings.length > 0) {
    console.log('⚠️ Avertissements:')
    result.warnings.forEach(warning => console.log(`  - ${warning}`))
  }
} else {
  console.error('❌ Échec du refactoring')
}
```

### 5. Utilisation avec React Hook

```typescript
const RefactoringDashboard = () => {
  const {
    specialist,
    analyzeCodebase,
    executeRefactoring,
    isAnalyzing,
    isRefactoring
  } = useRefactoringSpecialist(refactoringContext)

  const [analysis, setAnalysis] = useState(null)
  const [selectedRole, setSelectedRole] = useState('gestionnaire')

  const handleAnalyze = async () => {
    const result = await analyzeCodebase()
    setAnalysis(result)
  }

  const handleExecuteTask = async (taskId: string) => {
    try {
      const result = await executeRefactoring(taskId)
      toast.success('Refactoring terminé avec succès!')

      // Réanalyser pour mettre à jour les métriques
      await handleAnalyze()
    } catch (error) {
      toast.error('Erreur lors du refactoring: ' + error.message)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">SEIDO Refactoring Dashboard</h1>

        <div className="flex space-x-2">
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
              <SelectItem value="locataire">Locataire</SelectItem>
              <SelectItem value="prestataire">Prestataire</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="min-w-[120px]"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyse...
              </>
            ) : (
              'Analyser le code'
            )}
          </Button>
        </div>
      </div>

      {analysis && (
        <>
          {/* Métriques globales */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Complexité</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analysis.metrics.cyclomaticComplexity}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Duplication</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analysis.metrics.codeduplicationPercentage}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">shadcn/ui</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analysis.metrics.shadcnComponentUsage}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">WCAG</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analysis.metrics.wcagViolations}
                </div>
                <p className="text-xs text-muted-foreground">violations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Bundle</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(analysis.metrics.bundleSize / 1024)}KB
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tâches de refactoring */}
          <Card>
            <CardHeader>
              <CardTitle>Tâches de refactoring</CardTitle>
              <p className="texttedEffort}</Badge>
         ing}
                        size="sm"
                      >
                        {isRefactoring ? 'En cours...' : 'Exécuter'}
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
```

## 🎯 Patterns de refactoring SEIDO avec collaboration multi-agents

### 1. Collaboration Multi-Agents pour optimisation holistique

```typescript
// L'agent prixSuggestions = await collaborateWithUIDesigner('intervention-workflow')
  // Suggestion: "Simplify intervention creation flow for tenants"
  // Suggestion: "Optimize provider mobile interface for field work"

  // 📈 Plan de refactoring collaboratif
  return createCollaborativeRefactoringPlan({
    api: apiSuggestions,
    backend: backendSuggestions,
    frontend: frontendSuggestions,
    ux: uxSuggestions
  })
}
```

### 2. Consolidation des services

```typescript
// AVANT: Service monolithique
export class InterventionActionsService {
  async handleApproval(data: ApprovalData) { /* 50+ lignes */ }
  async handleQuoting(data: QuotingData) { /* 50+ lignes */ }
  // ... 15+ méthodes
}

// APRÈS: Services focalisés
export class InterventionApprovalService {
  async approve(data: ApprovalData) { /* logique focalisée */ }
  asynénéfique - Composant simple
// AVANT: Bouton custom basique
const CustomButton = ({ variant, children }) => (
  <button className={`px-4 py-2 ${variantStyles[variant]}`}>
    {children}
  </button>
)

// APRÈS: shadcn/ui (plus d'accessibilité, maintenance réduite)
import { Button } from "@/components/ui/button"
<Button variant="default">{children}</Button>

// ✅ Remplacement recommandé: Améliore l'accessibilité, réduit la maintenance

// CAS 2: Conservation recommandée - Composant spécialisé
// GARDE: InterventionCard avec logique métier complexe
const InterventionCard = ({ intervention, onStatusChange, workflowState }) => {
  // Logique spécifique aux interventions SEIDO
  const handleWorkflowTransition = () => {
    // Logique métier complexe pas disponible dans shadcn Card
   validation

- **Score global**: 0-100 basé sur toutes les catégories
- **Design System**: Utilisation shadcn/ui vs composants custom
- **Accessibilité**: Conformité WCAG 2.1 AA
- **Responsive**: Design mobile-first et breakpoints
- **Material Design**: Adhérence aux principes Google
- **UX Rôles**: Optimisations spécifiques par rôle utilisateur

### Métriques de code

```typescript
interface SEIDORefactoringMetrics {
  // Qualité code
  cyclomaticComplexity: number        // <10 recommandé
  codeduplicationPercentage: number   // <15% recommandé
  testCoverage: number                // >70% recommandé

  // Design system
  shadcnComponentUsage: number        // >80% recommandé
  customComillante
- Guidage clair et aide contextuelle
- Actions principales bien visibles
- Simplification maximum

### ⚡ Prestataire - Action & Efficacité
- Interface orientée action
- Informations essentielles seulement
- Optimisé mobile pour terrain
- Workflow efficace

## 🔧 Outils et intégrations

### Outils supportés
- **ESLint**: Linting automatique avec règles Next.js 15.5.3
- **TypeScript**: Vérification de types stricte v5
- **Vitest**: Tests unitaires et couverture v2.0.0
- **Playwright**: Tests E2E v1.45.0
- **Next.js**: Validation build et optimisations
- **Lighthouse**: Métriques de performance v12.0.0

### Commandes CLI intégrées

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Lint code with ESLint

# Testing
npm run test             # Run Vitest tests
npm run test:unit        # Unit tests in lib/
npm run test:components  # Component testsPerformance
npm run lighthouse       # Run lighthouse audit

# Supabase
npm run supabase:types   # Generate TypeScript types
npm run supabase:push    # Push schema changes
```

## 📊 Reporting et monitoring

### Dashboard de métriques

Le agent génère des rapports détaillés incluant:

- **Score global**: Vue d'ensemble de la qualité
- **Tendances**: Évolution des métriques dans le temps
- **Top violations**: Issues les plus fréquentes
- **Temps de correction estimé**: Planning des refactorings
- **Recommandations**: Actions prioritaires

### Intégration CI/CD

```yaml
# .github/workflows/seido-quality.yml
name: SEIDO Quality Check

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run SEIDO analysis
        run: npm run seido:analyze

      - name: Check qua✅ Intégration shadcn/ui
- ✅ Conformité WCAG 2.1 AA

### Version 1.1 (Q2 2025)
- 🔄 Support Supabase RLS optimizations
- 🔄 Refactoring assisté par IA
- 🔄 Métriques temps réel
- 🔄 Dashboard web intégré

### Version 1.2 (Q3 2025)
- 🔄 Integration tests automatiques avec Playwright
- 🔄 Performance budgets
- 🔄 Multi-theme support avec next-themes
- 🔄 Plugin VS Code

---

**🎯 L'agent SEIDO Refactoring Specialist transforme votre codebase en respectant les standards les plus élevés de qualité, accessibilité et performance.**
