/**
 * SEIDO Refactoring Patterns
 *
 * Specialized refactoring patterns for SEIDO real estate management platform:
 * - Multi-role architecture optimization
 * - Intervention workflow simplification
 * - Service layer consolidation
 * - Hook pattern standardization
 * - Dashboard component optimization
 */


/**
 * SEIDO-specific refactoring patterns
 */
export interface SEIDORefactoringPattern {
  name: string
  description: string
  category: 'service' | 'component' | 'hook' | 'workflow' | 'architecture'
  priority: 'low' | 'medium' | 'high' | 'critical'
  complexity: 'simple' | 'moderate' | 'complex'
  files: string[]
  before: string
  after: string
  reasoning: string
  benefits: string[]
  risks: string[]
}

/**
 * SEIDO Refactoring Patterns Library
 */
export class SEIDORefactoringPatterns {
  private patterns: SEIDORefactoringPattern[] = []

  constructor() {
    this.initializePatterns()
  }

  private initializePatterns() {
    // Service Layer Patterns
    this.addServicePatterns()

    // Hook Consolidation Patterns
    this.addHookPatterns()

    // Component Optimization Patterns
    this.addComponentPatterns()

    // Workflow Optimization Patterns
    this.addWorkflowPatterns()

    // Architecture Improvement Patterns
    this.addArchitecturePatterns()
  }

  /**
   * SERVICE LAYER REFACTORING PATTERNS
   */
  private addServicePatterns() {
    // Pattern: Simplify intervention-actions-service.ts
    this.patterns.push({
      name: 'intervention-actions-service-simplification',
      description: 'Break down the monolithic intervention-actions-service.ts (800+ lines) into smaller, focused services',
      category: 'service',
      priority: 'critical',
      complexity: 'complex',
      files: ['lib/intervention-actions-service.ts'],
      before: `
// Single massive service handling all intervention actions
export class InterventionActionsService {
  async handleApproval(data: ApprovalData) { /* 50+ lines */ }
  async handleQuoting(data: QuotingData) { /* 50+ lines */ }
  async handlePlanning(data: PlanningData) { /* 50+ lines */ }
  async handleExecution(data: ExecutionData) { /* 50+ lines */ }
  async handleFinalization(data: FinalizationData) { /* 50+ lines */ }
  // ... 15+ more methods
}`,
      after: `
// Focused services with single responsibilities
export class InterventionApprovalService {
  async approve(data: ApprovalData) { /* focused logic */ }
  async reject(data: ApprovalData) { /* focused logic */ }
}

export class InterventionQuotingService {
  async requestQuotes(data: QuotingData) { /* focused logic */ }
  async validateQuotes(data: QuotingData) { /* focused logic */ }
}

export class InterventionPlanningService {
  async scheduleIntervention(data: PlanningData) { /* focused logic */ }
  async proposeTimeSlots(data: PlanningData) { /* focused logic */ }
}

// Orchestrator service
export class InterventionOrchestrator {
  constructor(
    private approval: InterventionApprovalService,
    private quoting: InterventionQuotingService,
    private planning: InterventionPlanningService
  ) {}
}`,
      reasoning: 'Single Responsibility Principle - each service handles one aspect of intervention workflow',
      benefits: [
        'Easier to test individual workflow steps',
        'Better code organization and maintainability',
        'Reduced cognitive load when working on specific features',
        'Improved parallel development capabilities',
        'Clearer dependencies and interfaces'
      ],
      risks: [
        'Initial refactoring complexity',
        'Need to update all consuming code',
        'Potential for increased coupling if not done carefully'
      ]
    })

    // Pattern: Database service optimization
    this.patterns.push({
      name: 'database-service-optimization',
      description: 'Optimize database-service.ts with better error handling and connection management',
      category: 'service',
      priority: 'high',
      complexity: 'moderate',
      files: ['lib/database-service.ts'],
      before: `
// Inconsistent error handling and connection management
export const userService = {
  async getUser(id: string) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }
}`,
      after: `
// Consistent error handling with retry logic and proper typing
export const userService = {
  async getUser(id: string): Promise<User | null> {
    try {
      return await withRetry(async () => {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single()

        if (error) {
          activityLogger.error('User fetch failed', { id, error: error.message })
          throw new DatabaseError('Failed to fetch user', error)
        }

        return data
      })
    } catch (error) {
      console.error('User service error:', error)
      return null
    }
  }
}`,
      reasoning: 'Consistent error handling pattern with proper logging and typing',
      benefits: [
        'Better error tracking and debugging',
        'Consistent API across all service methods',
        'Improved reliability with retry logic',
        'Better TypeScript integration'
      ],
      risks: [
        'Potential performance impact from retry logic',
        'Need to update error handling throughout app'
      ]
    })
  }

  /**
   * HOOK CONSOLIDATION PATTERNS
   */
  private addHookPatterns() {
    // Pattern: Consolidate intervention hooks
    this.patterns.push({
      name: 'intervention-hooks-consolidation',
      description: 'Consolidate similar intervention hooks (use-intervention-approval, use-intervention-quoting, etc.) into a unified hook',
      category: 'hook',
      priority: 'high',
      complexity: 'moderate',
      files: [
        'hooks/use-intervention-approval.ts',
        'hooks/use-intervention-quoting.ts',
        'hooks/use-intervention-planning.ts',
        'hooks/use-intervention-execution.ts',
        'hooks/use-intervention-finalization.ts'
      ],
      before: `
// Separate hooks with duplicate logic patterns
export const useInterventionApproval = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleApproval = async (data: ApprovalData) => {
    setLoading(true)
    setError(null)
    try {
      // approval logic
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { handleApproval, loading, error }
}

export const useInterventionQuoting = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleQuoting = async (data: QuotingData) => {
    setLoading(true)
    setError(null)
    try {
      // quoting logic
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { handleQuoting, loading, error }
}`,
      after: `
// Unified intervention action hook with type safety
type InterventionAction = 'approval' | 'quoting' | 'planning' | 'execution' | 'finalization'

interface InterventionActionConfig<T> {
  action: InterventionAction
  handler: (data: T) => Promise<void>
  onSuccess?: (result: any) => void
  onError?: (error: Error) => void
}

export const useInterventionAction = <T>(config: InterventionActionConfig<T>) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (data: T) => {
    setLoading(true)
    setError(null)

    try {
      const result = await config.handler(data)
      config.onSuccess?.(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error.message)
      config.onError?.(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [config])

  return { execute, loading, error, isReady: !loading && !error }
}

// Usage:
const approvalHook = useInterventionAction({
  action: 'approval',
  handler: interventionService.handleApproval,
  onSuccess: () => toast.success('Intervention approved')
})`,
      reasoning: 'DRY principle - eliminate duplicate loading/error state management across hooks',
      benefits: [
        'Significant code reduction (5 hooks → 1 unified hook)',
        'Consistent error handling across all intervention actions',
        'Better TypeScript support with generics',
        'Easier to test and maintain',
        'Standardized success/error callbacks'
      ],
      risks: [
        'Initial complexity in migration',
        'Need to update all hook consumers',
        'Potential over-abstraction if not used carefully'
      ]
    })

    // Pattern: Manager stats hook optimization
    this.patterns.push({
      name: 'manager-stats-hook-optimization',
      description: 'Optimize useManagerStats hook with better caching and error recovery',
      category: 'hook',
      priority: 'medium',
      complexity: 'simple',
      files: ['hooks/use-manager-stats.ts'],
      before: `
export const useManagerStats = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const result = await api.getManagerStats()
      setData(result)
    } catch (err) {
      setError(err)
    }
    setLoading(false)
  }

  return { data, loading, error, refetch: fetchStats }
}`,
      after: `
export const useManagerStats = () => {
  const [data, setData] = useState<ManagerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<number>(0)

  const fetchStats = useCallback(async (force = false) => {
    // Cache for 5 minutes unless forced
    if (!force && Date.now() - lastFetch < 5 * 60 * 1000) {
      return data
    }

    setLoading(true)
    setError(null)

    try {
      const result = await api.getManagerStats()
      setData(result)
      setLastFetch(Date.now())
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stats'
      setError(errorMessage)

      // Keep previous data on error if available
      if (!data) {
        throw err
      }
    } finally {
      setLoading(false)
    }
  }, [data, lastFetch])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    data,
    loading,
    error,
    refetch: fetchStats,
    isStale: Date.now() - lastFetch > 5 * 60 * 1000
  }
}`,
      reasoning: 'Add caching and error resilience to reduce API calls and improve UX',
      benefits: [
        'Reduced API calls with intelligent caching',
        'Better error recovery (keeps previous data)',
        'Improved user experience with stale data indicators',
        'Better TypeScript typing'
      ],
      risks: [
        'Slightly more complex logic',
        'Need to handle cache invalidation properly'
      ]
    })
  }

  /**
   * COMPONENT OPTIMIZATION PATTERNS
   */
  private addComponentPatterns() {
    // Pattern: Dashboard component consolidation
    this.patterns.push({
      name: 'dashboard-component-consolidation',
      description: 'Consolidate duplicate patterns across role-based dashboards',
      category: 'component',
      priority: 'high',
      complexity: 'moderate',
      files: [
        'components/dashboards/admin-dashboard.tsx',
        'components/dashboards/gestionnaire-dashboard.tsx',
        'components/dashboards/locataire-dashboard.tsx',
        'components/dashboards/prestataire-dashboard.tsx'
      ],
      before: `
// Duplicate KPI card logic across dashboards
const AdminDashboard = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Total Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
        </CardContent>
      </Card>
      {/* Duplicate pattern for each metric */}
    </div>
  )
}

const GestionnaireDashboard = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Total Buildings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalBuildings}</div>
        </CardContent>
      </Card>
      {/* Duplicate pattern for each metric */}
    </div>
  )
}`,
      after: `
// Reusable KPI components with role-specific configurations
interface KPICardProps {
  title: string
  value: string | number
  trend?: string
  icon?: React.ComponentType<any>
  variant?: 'default' | 'success' | 'warning' | 'error'
  onClick?: () => void
}

const KPICard: React.FC<KPICardProps> = ({ title, value, trend, icon: Icon, variant = 'default', onClick }) => (
  <Card className={cn('cursor-pointer transition-colors', onClick && 'hover:bg-muted/50')} onClick={onClick}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {trend && (
        <p className="text-xs text-muted-foreground">
          <span className={cn(
            trend.startsWith('+') ? 'text-green-600' : trend.startsWith('-') ? 'text-red-600' : 'text-gray-600'
          )}>
            {trend}
          </span>
          {' from last month'}
        </p>
      )}
    </CardContent>
  </Card>
)

// Role-specific dashboard configurations
const DASHBOARD_CONFIGS = {
  admin: [
    { title: 'Total Users', field: 'totalUsers', icon: Users, trend: '+12%' },
    { title: 'Active Buildings', field: 'activeBuildings', icon: Building2, trend: '+5%' },
    { title: 'Monthly Revenue', field: 'monthlyRevenue', icon: Euro, trend: '+18%' },
    { title: 'Open Tickets', field: 'openTickets', icon: AlertTriangle, trend: '-8%' }
  ],
  gestionnaire: [
    { title: 'Total Buildings', field: 'totalBuildings', icon: Building2 },
    { title: 'Total Lots', field: 'totalLots', icon: Home },
    { title: 'Active Interventions', field: 'activeInterventions', icon: Wrench },
    { title: 'Monthly Revenue', field: 'monthlyRevenue', icon: Euro }
  ]
  // ... other roles
} as const

// Unified dashboard component
interface DashboardProps {
  role: 'admin' | 'gestionnaire' | 'locataire' | 'prestataire'
  stats: any
  onKPIClick?: (metric: string) => void
}

const UnifiedDashboard: React.FC<DashboardProps> = ({ role, stats, onKPIClick }) => {
  const config = DASHBOARD_CONFIGS[role]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {config.map(({ title, field, icon, trend }) => (
        <KPICard
          key={field}
          title={title}
          value={stats[field] || 0}
          trend={trend}
          icon={icon}
          onClick={() => onKPIClick?.(field)}
        />
      ))}
    </div>
  )
}`,
      reasoning: 'Extract common patterns while maintaining role-specific customization',
      benefits: [
        'Significantly reduced code duplication across dashboards',
        'Consistent KPI card styling and behavior',
        'Easier to add new metrics or roles',
        'Better maintainability and testing',
        'Type-safe role configurations'
      ],
      risks: [
        'Potential over-abstraction if roles diverge significantly',
        'Need to carefully manage role-specific requirements'
      ]
    })

    // Pattern: shadcn/ui component standardization
    this.patterns.push({
      name: 'shadcn-component-standardization',
      description: 'Replace custom UI components with shadcn/ui equivalents',
      category: 'component',
      priority: 'critical',
      complexity: 'moderate',
      files: ['components/**/*.tsx'],
      before: `
// Custom button with Tailwind classes
const CustomButton = ({ children, onClick, variant = 'primary' }) => {
  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors'
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    destructive: 'bg-red-600 text-white hover:bg-red-700'
  }

  return (
    <button
      className={\`\${baseClasses} \${variantClasses[variant]}\`}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

// Custom card component
const CustomCard = ({ title, children }) => (
  <div className="bg-white rounded-lg border shadow-sm">
    <div className="p-6 border-b">
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
    <div className="p-6">{children}</div>
  </div>
)`,
      after: `
// Use shadcn/ui components directly
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// No need for custom components - use shadcn/ui directly
<Button variant="default" onClick={onClick}>
  {children}
</Button>

<Button variant="secondary" onClick={onClick}>
  {children}
</Button>

<Button variant="destructive" onClick={onClick}>
  {children}
</Button>

<Card>
  <CardHeader>
    <CardTitle>{title}</CardTitle>
  </CardHeader>
  <CardContent>{children}</CardContent>
</Card>`,
      reasoning: 'Leverage the comprehensive shadcn/ui library for consistent design and accessibility',
      benefits: [
        'Consistent design system across the entire app',
        'Built-in accessibility features',
        'Better TypeScript support',
        'Reduced custom component maintenance',
        'Automatic theme support',
        'Better testing with established patterns'
      ],
      risks: [
        'Learning curve for shadcn/ui APIs',
        'Potential design constraints',
        'Migration effort for existing components'
      ]
    })
  }

  /**
   * WORKFLOW OPTIMIZATION PATTERNS
   */
  private addWorkflowPatterns() {
    // Pattern: Intervention workflow state management
    this.patterns.push({
      name: 'intervention-workflow-optimization',
      description: 'Optimize intervention workflow state management with better state machines',
      category: 'workflow',
      priority: 'high',
      complexity: 'complex',
      files: ['lib/intervention-utils.ts', 'components/intervention/**/*.tsx'],
      before: `
// Complex state management with manual transitions
const handleInterventionAction = async (action: string, data: any) => {
  switch (action) {
    case 'approve':
      if (intervention.status !== 'pending') {
        throw new Error('Cannot approve intervention')
      }
      // Manual state transition logic
      break
    case 'reject':
      if (intervention.status !== 'pending') {
        throw new Error('Cannot reject intervention')
      }
      // Manual state transition logic
      break
    // ... many more cases
  }
}`,
      after: `
// State machine-based workflow management
interface InterventionStateMachine {
  states: {
    created: { approve: 'approved', reject: 'rejected', edit: 'created' }
    approved: { quote: 'quoted', schedule: 'scheduled' }
    quoted: { accept_quote: 'scheduled', request_new_quote: 'quoted' }
    scheduled: { start: 'in_progress', reschedule: 'scheduled' }
    in_progress: { complete: 'completed', pause: 'paused' }
    paused: { resume: 'in_progress', cancel: 'cancelled' }
    completed: { validate: 'validated', request_changes: 'in_progress' }
    validated: {}
    rejected: { resubmit: 'created' }
    cancelled: { reopen: 'created' }
  }
}

class InterventionWorkflowManager {
  private stateMachine: InterventionStateMachine

  canTransition(currentState: string, action: string): boolean {
    return action in (this.stateMachine.states[currentState] || {})
  }

  getNextState(currentState: string, action: string): string {
    if (!this.canTransition(currentState, action)) {
      throw new Error(\`Invalid transition: \${action} from \${currentState}\`)
    }
    return this.stateMachine.states[currentState][action]
  }

  getAvailableActions(currentState: string): string[] {
    return Object.keys(this.stateMachine.states[currentState] || {})
  }

  async executeAction(intervention: Intervention, action: string, data: any): Promise<Intervention> {
    const nextState = this.getNextState(intervention.status, action)

    // Execute action-specific logic
    const result = await this.actionHandlers[action](intervention, data)

    // Update state
    return {
      ...result,
      status: nextState,
      last_action: action,
      last_action_at: new Date().toISOString()
    }
  }
}`,
      reasoning: 'Use state machines to prevent invalid state transitions and simplify workflow logic',
      benefits: [
        'Prevents invalid state transitions',
        'Clear visualization of possible workflow paths',
        'Easier testing of workflow logic',
        'Better error handling with invalid transitions',
        'Simplified UI logic (only show valid actions)'
      ],
      risks: [
        'Initial complexity in defining state machine',
        'Need to handle edge cases and error states',
        'Potential over-engineering for simple workflows'
      ]
    })
  }

  /**
   * ARCHITECTURE IMPROVEMENT PATTERNS
   */
  private addArchitecturePatterns() {
    // Pattern: Dependency injection for services
    this.patterns.push({
      name: 'service-dependency-injection',
      description: 'Implement dependency injection pattern for better service testability and modularity',
      category: 'architecture',
      priority: 'medium',
      complexity: 'complex',
      files: ['lib/**/*-service.ts'],
      before: `
// Hard-coded dependencies
export class InterventionService {
  async createIntervention(data: any) {
    // Direct imports and usage
    const user = await userService.getCurrentUser()
    const building = await buildingService.getBuilding(data.buildingId)
    await notificationService.sendNotification(...)
    // ...
  }
}`,
      after: `
// Dependency injection with interfaces
interface IUserService {
  getCurrentUser(): Promise<User>
}

interface IBuildingService {
  getBuilding(id: string): Promise<Building>
}

interface INotificationService {
  sendNotification(notification: Notification): Promise<void>
}

export class InterventionService {
  constructor(
    private userService: IUserService,
    private buildingService: IBuildingService,
    private notificationService: INotificationService
  ) {}

  async createIntervention(data: any) {
    const user = await this.userService.getCurrentUser()
    const building = await this.buildingService.getBuilding(data.buildingId)
    await this.notificationService.sendNotification(...)
    // ...
  }
}

// Service container
export class ServiceContainer {
  private static instance: ServiceContainer
  private services = new Map<string, any>()

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer()
    }
    return ServiceContainer.instance
  }

  register<T>(name: string, service: T): void {
    this.services.set(name, service)
  }

  resolve<T>(name: string): T {
    return this.services.get(name)
  }
}`,
      reasoning: 'Improve testability and reduce coupling between services',
      benefits: [
        'Much easier unit testing with mock services',
        'Better separation of concerns',
        'Easier to swap implementations',
        'Clearer dependencies and interfaces',
        'Better support for different environments'
      ],
      risks: [
        'Increased initial complexity',
        'Learning curve for dependency injection',
        'Potential over-engineering for simple services'
      ]
    })
  }

  /**
   * Get patterns by category
   */
  getPatternsByCategory(category: SEIDORefactoringPattern['category']): SEIDORefactoringPattern[] {
    return this.patterns.filter(p => p.category === category)
  }

  /**
   * Get patterns by priority
   */
  getPatternsByPriority(priority: SEIDORefactoringPattern['priority']): SEIDORefactoringPattern[] {
    return this.patterns.filter(p => p.priority === priority)
  }

  /**
   * Get all patterns sorted by priority
   */
  getAllPatternsSorted(): SEIDORefactoringPattern[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return this.patterns.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  }

  /**
   * Get patterns applicable to specific files
   */
  getPatternsForFile(filePath: string): SEIDORefactoringPattern[] {
    return this.patterns.filter(p =>
      p.files.some(f => f.includes('**') ? this.matchGlob(filePath, f) : filePath.includes(f))
    )
  }

  /**
   * Generate refactoring plan
   */
  generateRefactoringPlan(): {
    phase1: SEIDORefactoringPattern[] // Critical items
    phase2: SEIDORefactoringPattern[] // High priority
    phase3: SEIDORefactoringPattern[] // Medium priority
    phase4: SEIDORefactoringPattern[] // Low priority
  } {
    return {
      phase1: this.getPatternsByPriority('critical'),
      phase2: this.getPatternsByPriority('high'),
      phase3: this.getPatternsByPriority('medium'),
      phase4: this.getPatternsByPriority('low')
    }
  }

  private matchGlob(filePath: string, pattern: string): boolean {
    // Simple glob matching for ** patterns
    if (pattern.includes('**')) {
      const regex = pattern.replace('**', '.*').replace('*', '[^/]*')
      return new RegExp(regex).test(filePath)
    }
    return filePath.includes(pattern)
  }
}

export default SEIDORefactoringPatterns
