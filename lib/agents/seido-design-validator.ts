/**
 * SEIDO Design System Validator
 *
 * Validates adherence to DESIGN/ guidelines, shadcn/ui component usage,
 * Material Design principles, and WCAG 2.1 AA accessibility standards.
 */

// Available shadcn/ui components in the SEIDO codebase
export const AVAILABLE_SHADCN_COMPONENTS = [
  'alert',
  'alert-dialog',
  'accordion',
  'avatar',
  'badge',
  'aspect-ratio',
  'breadcrumb',
  'calendar',
  'button',
  'card',
  'chart',
  'carousel',
  'collapsible',
  'command',
  'checkbox',
  'context-menu',
  'dropdown-menu',
  'form',
  'hover-card',
  'input-otp',
  'input',
  'label',
  'menubar',
  'navigation-menu',
  'pagination',
  'popover',
  'radio-group',
  'progress',
  'resizable',
  'scroll-area',
  'select',
  'separator',
  'sidebar',
  'sheet',
  'skeleton',
  'switch',
  'sonner',
  'slider',
  'table',
  'textarea',
  'toggle-group',
  'toggle',
  'tooltip',
  'use-mobile',
  'dialog',
  'toast',
  'tabs',
  'step-progress-header',
  'security-modals',
  'lot-category-selector',
  'contact-selector',
  'toaster'
] as const

export type ShadcnComponent = typeof AVAILABLE_SHADCN_COMPONENTS[number]

// SEIDO Design Guidelines from DESIGN/ folder
export const SEIDO_DESIGN_GUIDELINES = {
  // From DESIGN/00-general.md - Material Design Reference
  materialDesign: {
    reference: 'Google Material Design as main reference',
    visualHierarchy: 'Clear visual hierarchy to guide user attention',
    colorPalette: 'Cohesive color palette reflecting brand',
    typography: 'Effective typography for readability and emphasis',
    contrast: 'WCAG 2.1 AA standard (4.5:1 minimum)',
    consistency: 'Consistent style across application'
  },

  // Responsive Design Requirements
  responsive: {
    approach: 'Mobile-first design, then scale up',
    breakpoints: {
      mobile: '320px-767px',
      tablet: '768px-1023px',
      desktop: '1024px+'
    },
    touchTargets: '44px×44px minimum on mobile',
    fluidLayouts: 'Use relative units (%, em, rem) instead of fixed pixels',
    mediaQueries: 'Focus on content needs rather than specific devices'
  },

  // Accessibility Standards (WCAG 2.1 AA)
  accessibility: {
    level: 'WCAG 2.1 AA',
    contrast: 'Minimum 4.5:1 for normal text, 3:1 for large text',
    keyboardNav: 'All interactive elements keyboard navigable',
    ariaLabels: 'Proper ARIA labels and descriptions',
    semanticHTML: 'Use semantic HTML elements',
    focusManagement: 'Clear focus indicators and logical focus order'
  },

  // Role-specific UX Guidelines
  roleUX: {
    admin: {
      principle: 'Efficiency & Control',
      interface: 'Dense but organized interface',
      navigation: 'Compact navigation',
      actions: 'Actions grouped logically',
      information: 'Maximum information display'
    },
    gestionnaire: {
      principle: 'Business Clarity',
      kpis: 'KPIs prominently displayed',
      insights: 'Clear business insights',
      decisions: 'Support informed decision making',
      context: 'Contextual business actions'
    },
    locataire: {
      principle: 'Simplicity & Guidance',
      interface: 'Welcoming interface',
      guidance: 'Clear guidance and help',
      actions: 'Guided actions with large buttons',
      simplicity: 'Maximum simplification'
    },
    prestataire: {
      principle: 'Action & Efficiency',
      orientation: 'Action-oriented interface',
      information: 'Essential information only',
      workflow: 'Efficient workflow design',
      mobile: 'Mobile-optimized for field work'
    }
  }
} as const

/**
 * Design Violation Types
 */
export interface DesignViolation {
  type: 'component' | 'accessibility' | 'responsive' | 'material-design' | 'role-ux'
  severity: 'error' | 'warning' | 'info'
  message: string
  file: string
  line?: number
  suggestion: string
  autoFixable: boolean
}

/**
 * SEIDO Design System Validator Class
 */
export class SEIDODesignValidator {
  private violations: DesignViolation[] = []

  /**
   * Validate shadcn/ui component usage with intelligent replacement suggestions
   */
  validateShadcnUsage(fileContent: string, fileName: string): DesignViolation[] {
    const violations: DesignViolation[] = []

    // Analyze custom components and suggest shadcn/ui replacements when beneficial
    const customComponents = this.analyzeCustomComponents(fileContent)

    customComponents.forEach(component => {
      const shadcnEquivalent = this.findShadcnEquivalent(component)

      if (shadcnEquivalent) {
        const benefit = this.assessReplacementBenefit(component, shadcnEquivalent)

        if (benefit.shouldReplace) {
          violations.push({
            type: 'component',
            severity: benefit.severity,
            message: `Custom ${component.name} component could be replaced with shadcn/ui equivalent`,
            file: fileName,
            suggestion: `Replace with ${shadcnEquivalent.name}: ${benefit.reason}. Benefits: ${benefit.benefits.join(', ')}`,
            autoFixable: benefit.autoFixable
          })
        }
      }
    })

    // Check for missing shadcn/ui opportunities
    const potentialUpgrades = this.identifyUpgradeOpportunities(fileContent)
    potentialUpgrades.forEach(upgrade => {
      violations.push({
        type: 'component',
        severity: 'info',
        message: `Opportunity to enhance with shadcn/ui: ${upgrade.component}`,
        file: fileName,
        suggestion: `${upgrade.suggestion}. This would improve: ${upgrade.benefits.join(', ')}`,
        autoFixable: false
      })
    })

    return violations
  }

  /**
   * Validate WCAG 2.1 AA accessibility compliance
   */
  validateAccessibility(fileContent: string, fileName: string): DesignViolation[] {
    const violations: DesignViolation[] = []

    // Check for buttons without proper accessibility attributes
    if (this.hasButtonsWithoutAriaLabel(fileContent)) {
      violations.push({
        type: 'accessibility',
        severity: 'error',
        message: 'Buttons with icons missing aria-label',
        file: fileName,
        suggestion: 'Add aria-label to buttons with icons: <Button aria-label="Delete intervention">',
        autoFixable: false
      })
    }

    // Check for insufficient color contrast
    if (this.hasLowContrastColors(fileContent)) {
      violations.push({
        type: 'accessibility',
        severity: 'error',
        message: 'Potential color contrast issues detected',
        file: fileName,
        suggestion: 'Ensure color contrast meets WCAG 2.1 AA standard (4.5:1 minimum)',
        autoFixable: false
      })
    }

    // Check for missing form labels
    if (this.hasInputsWithoutLabels(fileContent)) {
      violations.push({
        type: 'accessibility',
        severity: 'error',
        message: 'Input elements missing proper labels',
        file: fileName,
        suggestion: 'Associate labels with inputs: <label htmlFor="email">Email</label><input id="email" />',
        autoFixable: false
      })
    }

    return violations
  }

  /**
   * Validate responsive design implementation
   */
  validateResponsive(fileContent: string, fileName: string): DesignViolation[] {
    const violations: DesignViolation[] = []

    // Check for fixed widths instead of responsive classes
    if (this.hasFixedWidths(fileContent)) {
      violations.push({
        type: 'responsive',
        severity: 'warning',
        message: 'Fixed width detected, may not be responsive',
        file: fileName,
        suggestion: 'Use responsive Tailwind classes: w-full, max-w-md, etc.',
        autoFixable: true
      })
    }

    // Check for missing mobile-first classes
    if (this.lacksMobileFirstApproach(fileContent)) {
      violations.push({
        type: 'responsive',
        severity: 'info',
        message: 'Consider mobile-first responsive design',
        file: fileName,
        suggestion: 'Use mobile-first classes: text-sm md:text-base lg:text-lg',
        autoFixable: false
      })
    }

    // Check for touch target size compliance
    if (this.hasSmallTouchTargets(fileContent)) {
      violations.push({
        type: 'responsive',
        severity: 'error',
        message: 'Touch targets smaller than 44px detected',
        file: fileName,
        suggestion: 'Ensure minimum touch target size: p-3 min-h-[44px] min-w-[44px]',
        autoFixable: true
      })
    }

    return violations
  }

  /**
   * Validate Material Design principles
   */
  validateMaterialDesign(fileContent: string, fileName: string): DesignViolation[] {
    const violations: DesignViolation[] = []

    // Check for proper elevation/shadow usage
    if (this.lacksProperElevation(fileContent)) {
      violations.push({
        type: 'material-design',
        severity: 'info',
        message: 'Consider using Material Design elevation',
        file: fileName,
        suggestion: 'Use Tailwind shadow classes: shadow-sm, shadow-md, shadow-lg',
        autoFixable: true
      })
    }

    // Check for proper spacing using 8dp grid
    if (this.inconsistentSpacing(fileContent)) {
      violations.push({
        type: 'material-design',
        severity: 'warning',
        message: 'Inconsistent spacing detected',
        file: fileName,
        suggestion: 'Use consistent spacing based on 8dp grid: p-2, p-4, p-6, p-8',
        autoFixable: true
      })
    }

    return violations
  }

  /**
   * Validate role-specific UX guidelines
   */
  validateRoleUX(fileContent: string, fileName: string, role?: string): DesignViolation[] {
    const violations: DesignViolation[] = []

    if (!role) return violations

    switch (role) {
      case 'admin':
        if (this.lacksInformationDensity(fileContent)) {
          violations.push({
            type: 'role-ux',
            severity: 'info',
            message: 'Admin interface could be more information-dense',
            file: fileName,
            suggestion: 'Consider displaying more information per screen for admin efficiency',
            autoFixable: false
          })
        }
        break

      case 'locataire':
        if (this.lacksSimplicity(fileContent)) {
          violations.push({
            type: 'role-ux',
            severity: 'warning',
            message: 'Tenant interface could be simplified',
            file: fileName,
            suggestion: 'Simplify interface and provide clear guidance for tenant users',
            autoFixable: false
          })
        }
        break

      case 'prestataire':
        if (this.lacksActionOrientation(fileContent)) {
          violations.push({
            type: 'role-ux',
            severity: 'info',
            message: 'Provider interface could be more action-oriented',
            file: fileName,
            suggestion: 'Focus on primary actions and mobile-friendly design for field work',
            autoFixable: false
          })
        }
        break
    }

    return violations
  }

  /**
   * Generate auto-fix suggestions for violations
   */
  generateAutoFixes(violations: DesignViolation[]): { [file: string]: string[] } {
    const fixes: { [file: string]: string[] } = {}

    violations.filter(v => v.autoFixable).forEach(violation => {
      if (!fixes[violation.file]) {
        fixes[violation.file] = []
      }

      switch (violation.type) {
        case 'component':
          if (violation.message.includes('Custom button')) {
            fixes[violation.file].push('Replace custom button with: import { Button } from "@/components/ui/button"')
          }
          break

        case 'responsive':
          if (violation.message.includes('Fixed width')) {
            fixes[violation.file].push('Replace fixed width with responsive classes: w-full, max-w-*')
          }
          if (violation.message.includes('Touch targets')) {
            fixes[violation.file].push('Add minimum touch target classes: p-3 min-h-[44px] min-w-[44px]')
          }
          break
      }
    })

    return fixes
  }

  /**
   * Helper methods for pattern detection
   */
  /**
   * Analyze custom components in the code
   */
  private analyzeCustomComponents(content: string): Array<{
    name: string
    pattern: string
    complexity: 'simple' | 'moderate' | 'complex'
    functionality: string[]
    styling: string[]
  }> {
    const components = []

    // Detect custom button patterns
    if (this.hasCustomButton(content)) {
      components.push({
        name: 'CustomButton',
        pattern: 'button with custom styling',
        complexity: 'simple',
        functionality: ['onClick', 'disabled states', 'variants'],
        styling: ['background colors', 'padding', 'hover states']
      })
    }

    // Detect custom card patterns
    if (this.hasCustomCard(content)) {
      components.push({
        name: 'CustomCard',
        pattern: 'card with custom layout',
        complexity: 'moderate',
        functionality: ['content layout', 'header/footer'],
        styling: ['shadows', 'borders', 'spacing']
      })
    }

    // Detect custom form patterns
    if (this.hasCustomForm(content)) {
      components.push({
        name: 'CustomForm',
        pattern: 'form with custom validation',
        complexity: 'complex',
        functionality: ['validation', 'error handling', 'submission'],
        styling: ['input styling', 'error messages', 'labels']
      })
    }

    // Detect custom modal patterns
    if (this.hasCustomModal(content)) {
      components.push({
        name: 'CustomModal',
        pattern: 'modal with custom overlay',
        complexity: 'complex',
        functionality: ['overlay', 'close handling', 'focus management'],
        styling: ['backdrop', 'animation', 'positioning']
      })
    }

    return components
  }

  /**
   * Find the best shadcn/ui equivalent for a custom component
   */
  private findShadcnEquivalent(customComponent: { name: string; complexity?: string }): {
    name: string
    features: string[]
    accessibility: string[]
    maintenance: string
  } | null {
    const equivalents = {
      'CustomButton': {
        name: 'Button',
        features: ['multiple variants', 'size options', 'loading states', 'icon support'],
        accessibility: ['keyboard navigation', 'screen reader support', 'focus management'],
        maintenance: 'maintained by shadcn/ui team'
      },
      'CustomCard': {
        name: 'Card + CardHeader + CardContent',
        features: ['semantic structure', 'flexible layout', 'consistent spacing'],
        accessibility: ['proper heading hierarchy', 'landmark roles'],
        maintenance: 'consistent with design system'
      },
      'CustomForm': {
        name: 'Form + FormField + FormItem',
        features: ['react-hook-form integration', 'zod validation', 'error handling'],
        accessibility: ['proper labels', 'error announcements', 'fieldset grouping'],
        maintenance: 'integrated validation system'
      },
      'CustomModal': {
        name: 'Dialog + DialogContent',
        features: ['focus trap', 'escape handling', 'backdrop click'],
        accessibility: ['ARIA dialogs', 'focus management', 'screen reader support'],
        maintenance: 'tested accessibility implementation'
      }
    }

    return equivalents[customComponent.name] || null
  }

  /**
   * Assess if replacement would be beneficial
   */
  private assessReplacementBenefit(customComponent: { complexity?: string; name: string }, shadcnEquivalent: { accessibility: string[]; name: string }): {
    shouldReplace: boolean
    severity: 'error' | 'warning' | 'info'
    reason: string
    benefits: string[]
    autoFixable: boolean
  } {
    const benefits = []
    let shouldReplace = false
    let severity: 'error' | 'warning' | 'info' = 'info'
    let reason = ''
    let autoFixable = false

    // Analyze benefits of replacement
    if (shadcnEquivalent.accessibility.length > 0) {
      benefits.push('better accessibility')
      shouldReplace = true
      severity = 'warning'
    }

    if (customComponent.complexity === 'complex') {
      benefits.push('reduced maintenance burden')
      benefits.push('tested implementation')
      shouldReplace = true
      severity = 'error'
      reason = 'Complex custom component could benefit from battle-tested shadcn/ui equivalent'
    } else if (customComponent.complexity === 'moderate') {
      benefits.push('consistency with design system')
      shouldReplace = true
      reason = 'Moderate complexity component has good shadcn/ui alternative'
    } else {
      benefits.push('design system consistency')
      reason = 'Simple component could use standard shadcn/ui version'
      autoFixable = true
    }

    if (benefits.includes('better accessibility')) {
      reason += ' with improved accessibility'
    }

    return {
      shouldReplace,
      severity,
      reason,
      benefits,
      autoFixable
    }
  }

  /**
   * Identify opportunities to enhance existing components with shadcn/ui
   */
  private identifyUpgradeOpportunities(content: string): Array<{
    component: string
    suggestion: string
    benefits: string[]
  }> {
    const opportunities = []

    // Look for components that could benefit from shadcn/ui enhancements
    if (content.includes('input') && !content.includes('@/components/ui/input')) {
      opportunities.push({
        component: 'input fields',
        suggestion: 'Use shadcn/ui Input component for consistent styling and validation',
        benefits: ['consistent focus states', 'error styling', 'accessibility']
      })
    }

    if (content.includes('select') && !content.includes('@/components/ui/select')) {
      opportunities.push({
        component: 'select dropdowns',
        suggestion: 'Use shadcn/ui Select component for better UX',
        benefits: ['keyboard navigation', 'search functionality', 'mobile-friendly']
      })
    }

    if (content.includes('tooltip') && !content.includes('@/components/ui/tooltip')) {
      opportunities.push({
        component: 'tooltips',
        suggestion: 'Use shadcn/ui Tooltip for accessible help text',
        benefits: ['screen reader support', 'proper positioning', 'timing control']
      })
    }

    return opportunities
  }

  // Existing detection methods
  private hasCustomButton(content: string): boolean {
    return /className.*(?:bg-(?:blue|green|red|gray)-\d+.*cursor-pointer|px-\d+.*py-\d+.*bg-)/gm.test(content)
  }

  private hasCustomCard(content: string): boolean {
    return /className.*(?:bg-white.*shadow|border.*rounded.*p-\d+)/.test(content)
  }

  private hasCustomForm(content: string): boolean {
    return /<form/.test(content) && !/import.*Form.*from.*@\/components\/ui\/form/.test(content)
  }

  private hasCustomModal(content: string): boolean {
    return /(?:modal|overlay|backdrop)/.test(content) && !/import.*Dialog.*from.*@\/components\/ui\/dialog/.test(content)
  }

  private hasButtonsWithoutAriaLabel(content: string): boolean {
    // Check for buttons with icons but no aria-label
    return /<[Bb]utton[^>]*>[^<]*<[^>]*Icon[^>]*\/>[^<]*<\/[Bb]utton>/.test(content) &&
           !/aria-label/.test(content)
  }

  private hasLowContrastColors(content: string): boolean {
    // Check for potentially low contrast color combinations
    return /text-(?:gray|slate)-(?:300|400)/.test(content) ||
           /text-yellow-\d+.*bg-white/.test(content)
  }

  private hasInputsWithoutLabels(content: string): boolean {
    return /<input[^>]*id=(?!.*htmlFor)/.test(content)
  }

  private hasFixedWidths(content: string): boolean {
    return /w-\[\d+px\]/.test(content) || /width:\s*\d+px/.test(content)
  }

  private lacksMobileFirstApproach(content: string): boolean {
    // Check if responsive classes start with mobile-first approach
    return /(?:md|lg|xl):(?!.*(?:sm|base))/.test(content) && !/text-sm.*md:text-base/.test(content)
  }

  private hasSmallTouchTargets(content: string): boolean {
    // Check for potentially small touch targets (less than 44px)
    return /p-1(?![0-9])/.test(content) || /min-h-\[(?:[1-3][0-9]|[1-9])px\]/.test(content)
  }

  private lacksProperElevation(content: string): boolean {
    return /bg-white.*border(?!.*shadow)/.test(content)
  }

  private inconsistentSpacing(content: string): boolean {
    // Check for spacing that doesn't follow 8dp grid (p-1, p-3, p-5, p-7, etc.)
    return /p-[1357](?![0-9])/.test(content) || /m-[1357](?![0-9])/.test(content)
  }

  private lacksInformationDensity(content: string): boolean {
    // Admin interfaces should be more dense
    return /space-y-8/.test(content) || /p-8/.test(content) || /gap-8/.test(content)
  }

  private lacksSimplicity(content: string): boolean {
    // Tenant interfaces should be simpler
    return /grid-cols-[4-9]/.test(content) || /flex.*space-x-1(?![0-9])/.test(content)
  }

  private lacksActionOrientation(content: string): boolean {
    // Provider interfaces should focus on actions
    return !/Button.*(?:primary|size="lg")/.test(content) || !/(?:w-full|flex-1).*Button/.test(content)
  }

  /**
   * Main validation method
   */
  validateFile(fileContent: string, fileName: string, role?: string): DesignViolation[] {
    const violations = [
      ...this.validateShadcnUsage(fileContent, fileName),
      ...this.validateAccessibility(fileContent, fileName),
      ...this.validateResponsive(fileContent, fileName),
      ...this.validateMaterialDesign(fileContent, fileName),
      ...this.validateRoleUX(fileContent, fileName, role)
    ]

    return violations
  }
}

export default SEIDODesignValidator
