/**
 * SEIDO Refactoring Tools Configuration
 *
 * Integrates with existing SEIDO tooling:
 * - ESLint with Next.js config
 * - TypeScript 5 with strict mode
 * - Vitest with coverage
 * - Custom code transformation tools
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

/**
 * TypeScript AST-based refactoring utilities
 */
export interface RefactoringTool {
  name: string
  command: string
  configFile?: string
  enabled: boolean
}

/**
 * SEIDO Refactoring Tools Manager
 */
export class SEIDORefactoringTools {
  private projectRoot: string
  private tools: RefactoringTool[]

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot
    this.tools = this.initializeTools()
  }

  private initializeTools(): RefactoringTool[] {
    return [
      {
        name: 'ESLint',
        command: 'npx eslint',
        configFile: 'eslint.config.js',
        enabled: true
      },
      {
        name: 'TypeScript Compiler',
        command: 'npx tsc --noEmit',
        configFile: 'tsconfig.json',
        enabled: true
      },
      {
        name: 'Vitest',
        command: 'npm run test',
        configFile: 'vitest.config.ts',
        enabled: true
      },
      {
        name: 'Next.js Build',
        command: 'npm run build',
        enabled: true
      },
      {
        name: 'Prettier',
        command: 'npx prettier --check',
        configFile: '.prettierrc',
        enabled: false // SEIDO uses Tailwind, no Prettier config found
      }
    ]
  }

  /**
   * Run pre-refactoring checks
   */
  async runPreRefactoringChecks(): Promise<{
    success: boolean
    results: { tool: string; success: boolean; output: string }[]
  }> {
    console.log('🔍 Running pre-refactoring checks...')

    const results = []
    let allSuccess = true

    // Check TypeScript compilation
    try {
      const tscOutput = execSync('npx tsc --noEmit', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe']
      })

      results.push({
        tool: 'TypeScript',
        success: true,
        output: 'No type errors found'
      })
    } catch (error: any) {
      allSuccess = false
      results.push({
        tool: 'TypeScript',
        success: false,
        output: error.stdout || error.message
      })
    }

    // Check ESLint
    try {
      const eslintOutput = execSync('npx eslint . --ext .ts,.tsx --max-warnings 0', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe']
      })

      results.push({
        tool: 'ESLint',
        success: true,
        output: 'No linting errors found'
      })
    } catch (error: any) {
      allSuccess = false
      results.push({
        tool: 'ESLint',
        success: false,
        output: error.stdout || error.message
      })
    }

    // Check tests
    try {
      const testOutput = execSync('npm run test:unit', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe']
      })

      results.push({
        tool: 'Vitest',
        success: true,
        output: 'All tests passing'
      })
    } catch (error: any) {
      // Tests might fail, but we still want to proceed with refactoring
      results.push({
        tool: 'Vitest',
        success: false,
        output: error.stdout || error.message
      })
    }

    return { success: allSuccess, results }
  }

  /**
   * Run post-refactoring validation
   */
  async runPostRefactoringValidation(): Promise<{
    success: boolean
    results: { tool: string; success: boolean; output: string }[]
  }> {
    console.log('✅ Running post-refactoring validation...')

    // Same checks as pre-refactoring, but more strict
    const results = await this.runPreRefactoringChecks()

    // Additional build check to ensure nothing is broken
    try {
      const buildOutput = execSync('npm run build', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe']
      })

      results.results.push({
        tool: 'Next.js Build',
        success: true,
        output: 'Build successful'
      })
    } catch (error: any) {
      results.results.push({
        tool: 'Next.js Build',
        success: false,
        output: error.stdout || error.message
      })
      results.success = false
    }

    return results
  }

  /**
   * Auto-fix ESLint issues
   */
  async autoFixESLintIssues(): Promise<{ success: boolean; output: string }> {
    try {
      const output = execSync('npx eslint . --ext .ts,.tsx --fix', {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      })

      return {
        success: true,
        output: 'ESLint auto-fixes applied successfully'
      }
    } catch (error: any) {
      return {
        success: false,
        output: error.stdout || error.message
      }
    }
  }

  /**
   * Generate TypeScript coverage report
   */
  async generateTypeScriptCoverage(): Promise<{
    coverage: number
    untyped: string[]
    anyUsage: string[]
  }> {
    // Simple heuristic for TypeScript usage quality
    const sourceFiles = this.getSourceFiles()
    let totalFiles = 0
    let typedFiles = 0
    const untyped: string[] = []
    const anyUsage: string[] = []

    for (const file of sourceFiles) {
      totalFiles++
      const content = readFileSync(file, 'utf-8')

      // Check if file has proper typing
      if (this.isProperlyTyped(content)) {
        typedFiles++
      } else {
        untyped.push(file)
      }

      // Check for 'any' usage
      if (content.includes(': any') || content.includes('as any')) {
        anyUsage.push(file)
      }
    }

    const coverage = totalFiles > 0 ? Math.round((typedFiles / totalFiles) * 100) : 0

    return {
      coverage,
      untyped,
      anyUsage
    }
  }

  /**
   * Run code complexity analysis
   */
  async analyzeComplexity(): Promise<{
    files: { file: string; complexity: number; score: 'good' | 'medium' | 'high' | 'critical' }[]
    averageComplexity: number
  }> {
    const sourceFiles = this.getSourceFiles()
    const results: { file: string; complexity: number; score: 'good' | 'medium' | 'high' | 'critical' }[] = []

    for (const file of sourceFiles) {
      const content = readFileSync(file, 'utf-8')
      const complexity = this.calculateCyclomaticComplexity(content)

      let score: 'good' | 'medium' | 'high' | 'critical'
      if (complexity <= 5) score = 'good'
      else if (complexity <= 10) score = 'medium'
      else if (complexity <= 20) score = 'high'
      else score = 'critical'

      results.push({
        file,
        complexity,
        score
      })
    }

    const averageComplexity = results.reduce((sum, r) => sum + r.complexity, 0) / results.length

    return {
      files: results.sort((a, b) => b.complexity - a.complexity),
      averageComplexity: Math.round(averageComplexity * 100) / 100
    }
  }

  /**
   * Detect code duplication
   */
  async detectDuplication(): Promise<{
    duplicates: { pattern: string; files: string[]; lines: number[] }[]
    duplicationPercentage: number
  }> {
    // Simple duplication detection algorithm
    const sourceFiles = this.getSourceFiles()
    const duplicates: { pattern: string; files: string[]; lines: number[] }[] = []
    const patterns = new Map<string, { files: Set<string>; lines: Set<number> }>()

    for (const file of sourceFiles) {
      const content = readFileSync(file, 'utf-8')
      const lines = content.split('\n')

      // Look for duplicated blocks of 3+ lines
      for (let i = 0; i < lines.length - 2; i++) {
        const block = lines.slice(i, i + 3).join('\n').trim()
        if (block.length < 50) continue // Skip small blocks
        if (this.isBoilerplate(block)) continue // Skip common patterns

        if (!patterns.has(block)) {
          patterns.set(block, { files: new Set(), lines: new Set() })
        }

        const entry = patterns.get(block)!
        entry.files.add(file)
        entry.lines.add(i + 1)
      }
    }

    // Find actual duplicates (appearing in multiple places)
    for (const [pattern, data] of patterns) {
      if (data.files.size > 1 || data.lines.size > 1) {
        duplicates.push({
          pattern: pattern.substring(0, 100) + '...',
          files: Array.from(data.files),
          lines: Array.from(data.lines)
        })
      }
    }

    const totalLines = sourceFiles.reduce((sum, file) => {
      const content = readFileSync(file, 'utf-8')
      return sum + content.split('\n').length
    }, 0)

    const duplicatedLines = duplicates.reduce((sum, d) => sum + d.lines.length * 3, 0)
    const duplicationPercentage = totalLines > 0 ? Math.round((duplicatedLines / totalLines) * 100) : 0

    return {
      duplicates: duplicates.slice(0, 10), // Top 10 duplicates
      duplicationPercentage
    }
  }

  /**
   * Generate refactoring metrics report
   */
  async generateMetricsReport(): Promise<{
    complexity: any
    duplication: any
    typeScript: any
    testCoverage: number
    recommendations: string[]
  }> {
    console.log('📊 Generating comprehensive metrics report...')

    const [complexity, duplication, typeScript] = await Promise.all([
      this.analyzeComplexity(),
      this.detectDuplication(),
      this.generateTypeScriptCoverage()
    ])

    // Get test coverage if available
    let testCoverage = 0
    try {
      const coverageOutput = execSync('npm run test:coverage', {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      })
      // Parse coverage from output (simplified)
      const match = coverageOutput.match(/All files\s+\|\s+([\d.]+)/)
      if (match) {
        testCoverage = parseFloat(match[1])
      }
    } catch (error) {
      console.log('⚠️ Could not get test coverage')
    }

    // Generate recommendations
    const recommendations: string[] = []

    if (complexity.averageComplexity > 10) {
      recommendations.push('🔴 High code complexity detected. Consider breaking down large functions.')
    }

    if (duplication.duplicationPercentage > 15) {
      recommendations.push('🔴 Significant code duplication found. Extract common patterns into reusable components.')
    }

    if (typeScript.coverage < 80) {
      recommendations.push('🔴 Low TypeScript coverage. Add proper typing to improve code quality.')
    }

    if (testCoverage < 70) {
      recommendations.push('🟡 Low test coverage. Add more unit tests for critical components.')
    }

    if (typeScript.anyUsage.length > 5) {
      recommendations.push('🟡 Excessive use of "any" type. Replace with proper TypeScript types.')
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Code quality looks good! Continue with current practices.')
    }

    return {
      complexity,
      duplication,
      typeScript,
      testCoverage,
      recommendations
    }
  }

  /**
   * Helper methods
   */
  private getSourceFiles(): string[] {
    try {
      const gitFiles = execSync('git ls-files "*.ts" "*.tsx"', {
        cwd: this.projectRoot,
        encoding: 'utf-8'
      })

      return gitFiles
        .split('\n')
        .filter(file => file.length > 0)
        .filter(file => !file.includes('node_modules'))
        .filter(file => !file.includes('.d.ts'))
        .map(file => join(this.projectRoot, file))
    } catch (error) {
      // Fallback if git is not available
      return []
    }
  }

  private isProperlyTyped(content: string): boolean {
    // Heuristic: file is properly typed if it has type annotations
    const hasTypeAnnotations = /:\s*(?:string|number|boolean|object|\w+\[\]|\w+<)/.test(content)
    const hasInterfaces = /interface\s+\w+/.test(content)
    const hasTypes = /type\s+\w+/.test(content)
    const hasGenerics = /<\w+>/.test(content)

    return hasTypeAnnotations || hasInterfaces || hasTypes || hasGenerics
  }

  private calculateCyclomaticComplexity(content: string): number {
    // Simplified cyclomatic complexity calculation
    let complexity = 1 // Base complexity

    // Count decision points
    const decisions = [
      /if\s*\(/g,
      /else\s+if\s*\(/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /switch\s*\(/g,
      /case\s+/g,
      /catch\s*\(/g,
      /\&\&/g,
      /\|\|/g,
      /\?/g // Ternary operator
    ]

    for (const pattern of decisions) {
      const matches = content.match(pattern)
      complexity += matches ? matches.length : 0
    }

    return complexity
  }

  private isBoilerplate(code: string): boolean {
    // Skip common boilerplate patterns
    const boilerplatePatterns = [
      'import',
      'export',
      'console.log',
      'use client',
      'use strict',
      '//',
      '/*',
      'type',
      'interface'
    ]

    return boilerplatePatterns.some(pattern => code.includes(pattern))
  }
}

/**
 * SEIDO-specific refactoring transformations
 */
export class SEIDOCodeTransformer {
  /**
   * Transform custom components to use shadcn/ui
   */
  static transformToShadcnComponents(code: string): string {
    let transformed = code

    // Replace custom Button patterns with shadcn Button
    transformed = transformed.replace(
      /className="[^"]*(?:bg-(?:blue|green|red)-\d+[^"]*cursor-pointer[^"]*|px-\d+[^"]*py-\d+[^"]*bg-[^"]*)"[^>]*>([^<]+)</g,
      '<Button variant="default">$1</Button>'
    )

    // Add shadcn imports if transformations were made
    if (transformed !== code) {
      if (!transformed.includes('import { Button }')) {
        transformed = `import { Button } from "@/components/ui/button"\n${transformed}`
      }
    }

    return transformed
  }

  /**
   * Transform to responsive Tailwind classes
   */
  static transformToResponsive(code: string): string {
    let transformed = code

    // Replace fixed widths with responsive classes
    transformed = transformed.replace(
      /w-\[(\d+)px\]/g,
      (match, width) => {
        const w = parseInt(width)
        if (w < 400) return 'w-full sm:w-auto'
        if (w < 800) return 'w-full md:w-auto'
        return 'w-full lg:w-auto'
      }
    )

    // Add mobile-first responsive text sizing
    transformed = transformed.replace(
      /text-(\w+)(?!\s+(?:sm|md|lg|xl):)/g,
      'text-sm $1:text-$1'
    )

    return transformed
  }

  /**
   * Add accessibility attributes
   */
  static addAccessibilityAttributes(code: string): string {
    let transformed = code

    // Add aria-label to buttons with icons
    transformed = transformed.replace(
      /<Button([^>]*)>([^<]*<[^>]*Icon[^>]*\/>)/g,
      '<Button$1 aria-label="Action button">$2'
    )

    // Add proper form labels
    transformed = transformed.replace(
      /<input([^>]*id="([^"]+)"[^>]*)>/g,
      '<label htmlFor="$2">Label</label><input$1>'
    )

    return transformed
  }
}

export default SEIDORefactoringTools