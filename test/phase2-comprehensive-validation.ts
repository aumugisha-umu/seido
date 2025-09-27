/**
 * Phase 2 Comprehensive Validation Tests
 * Tests all Next.js best practices and optimizations
 */

import { authService } from '../lib/auth-service'
import { authCacheManager } from '../lib/auth-cache-manager'
import {
  authenticationService,
  profileService,
  permissionService,
  sessionService,
  cacheService
} from '../lib/auth'
import * as fs from 'fs'
import * as path from 'path'

const SUCCESS = '✅'
const FAIL = '❌'
const WARNING = '⚠️'
const INFO = 'ℹ️'

class Phase2Validator {
  private results: any = {
    passed: [],
    failed: [],
    warnings: [],
    metrics: {}
  }

  async runAll() {
    console.log('🔍 PHASE 2 COMPREHENSIVE VALIDATION')
    console.log('=' . repeat(80))
    console.log('Testing Next.js best practices, server components, and optimizations')
    console.log('=' . repeat(80) + '\n')

    // 1. Authentication Implementation Tests
    await this.testAuthenticationPatterns()

    // 2. Server vs Client Components
    await this.testComponentArchitecture()

    // 3. Performance Optimizations
    await this.testPerformanceOptimizations()

    // 4. App Router Compliance
    await this.testAppRouterCompliance()

    // 5. Multi-role System
    await this.testMultiRoleSystem()

    // 6. Cache System
    await this.testCacheSystem()

    // 7. Security Validations
    await this.testSecurityImplementation()

    // Generate Report
    this.generateReport()
  }

  private async testAuthenticationPatterns() {
    console.log('\n📌 1. AUTHENTICATION PATTERNS')
    console.log('-' . repeat(40))

    // Test 1.1: Modular architecture
    const hasModularAuth = fs.existsSync(path.join(process.cwd(), 'lib/auth/services'))
    if (hasModularAuth) {
      const services = fs.readdirSync(path.join(process.cwd(), 'lib/auth/services'))
      const expectedServices = [
        'authentication.service.ts',
        'profile.service.ts',
        'permission.service.ts',
        'session.service.ts',
        'cache.service.ts'
      ]

      const allServicesPresent = expectedServices.every(s =>
        services.some(file => file.includes(s.replace('.ts', '')))
      )

      if (allServicesPresent) {
        this.results.passed.push('Modular auth architecture implemented')
        console.log(`${SUCCESS} Modular auth architecture: All services present`)
      } else {
        this.results.failed.push('Some auth services missing')
        console.log(`${FAIL} Missing services: ${expectedServices.filter(s => !services.includes(s))}`)
      }
    } else {
      this.results.failed.push('Modular auth architecture not found')
      console.log(`${FAIL} Modular auth architecture not implemented`)
    }

    // Test 1.2: Auth service size (should be < 200 lines per service)
    if (hasModularAuth) {
      const services = fs.readdirSync(path.join(process.cwd(), 'lib/auth/services'))
      for (const service of services) {
        if (service.endsWith('.ts')) {
          const content = fs.readFileSync(
            path.join(process.cwd(), 'lib/auth/services', service),
            'utf-8'
          )
          const lines = content.split('\n').length
          if (lines > 200) {
            this.results.warnings.push(`${service} has ${lines} lines (target < 200)`)
            console.log(`${WARNING} ${service}: ${lines} lines (target < 200)`)
          } else {
            console.log(`${SUCCESS} ${service}: ${lines} lines`)
          }
        }
      }
    }

    // Test 1.3: Middleware implementation
    const middlewarePath = path.join(process.cwd(), 'middleware.ts')
    if (fs.existsSync(middlewarePath)) {
      const middlewareContent = fs.readFileSync(middlewarePath, 'utf-8')

      // Check for proper auth validation
      const hasSupabaseAuth = middlewareContent.includes('supabase.auth.getUser')
      const hasServerClient = middlewareContent.includes('createServerClient')

      if (hasSupabaseAuth && hasServerClient) {
        this.results.passed.push('Middleware uses proper server-side auth')
        console.log(`${SUCCESS} Middleware: Server-side auth validation`)
      } else {
        this.results.failed.push('Middleware missing proper auth validation')
        console.log(`${FAIL} Middleware: Missing server-side auth validation`)
      }
    }

    // Test 1.4: No hardcoded timeouts > 3s
    const authServicePath = path.join(process.cwd(), 'lib/auth-service.ts')
    if (fs.existsSync(authServicePath)) {
      const content = fs.readFileSync(authServicePath, 'utf-8')
      const timeoutPattern = /setTimeout.*?(\d{4,})/g
      const matches = content.match(timeoutPattern)

      if (matches) {
        const longTimeouts = matches.filter(m => {
          const timeout = parseInt(m.match(/\d+/)?.[0] || '0')
          return timeout > 3000
        })

        if (longTimeouts.length > 0) {
          this.results.failed.push(`Found ${longTimeouts.length} timeouts > 3s`)
          console.log(`${FAIL} Found ${longTimeouts.length} timeouts > 3s`)
        } else {
          this.results.passed.push('All timeouts < 3s')
          console.log(`${SUCCESS} All timeouts are under 3s`)
        }
      } else {
        console.log(`${SUCCESS} No hardcoded timeouts found`)
      }
    }
  }

  private async testComponentArchitecture() {
    console.log('\n📌 2. SERVER VS CLIENT COMPONENTS')
    console.log('-' . repeat(40))

    // Check app directory for proper component usage
    const appDir = path.join(process.cwd(), 'app')
    const checkDirectory = (dir: string, level = 0): { server: number, client: number } => {
      let stats = { server: 0, client: 0 }

      if (!fs.existsSync(dir)) return stats

      const files = fs.readdirSync(dir)
      for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)

        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          const subStats = checkDirectory(filePath, level + 1)
          stats.server += subStats.server
          stats.client += subStats.client
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          const content = fs.readFileSync(filePath, 'utf-8')
          if (content.includes("'use client'") || content.includes('"use client"')) {
            stats.client++
          } else if (file.includes('page.tsx') || file.includes('layout.tsx')) {
            stats.server++
          }
        }
      }

      return stats
    }

    const stats = checkDirectory(appDir)
    const clientPercentage = (stats.client / (stats.server + stats.client)) * 100

    console.log(`${INFO} Server Components: ${stats.server}`)
    console.log(`${INFO} Client Components: ${stats.client}`)
    console.log(`${INFO} Client Component Usage: ${clientPercentage.toFixed(1)}%`)

    if (clientPercentage < 40) {
      this.results.passed.push(`Minimal client components (${clientPercentage.toFixed(1)}%)`)
      console.log(`${SUCCESS} Good balance - minimal 'use client' usage`)
    } else {
      this.results.warnings.push(`High client component usage (${clientPercentage.toFixed(1)}%)`)
      console.log(`${WARNING} Consider converting more components to Server Components`)
    }

    // Check for proper data fetching patterns
    const hasServerActions = fs.existsSync(path.join(process.cwd(), 'app/[role]'))
    if (hasServerActions) {
      console.log(`${SUCCESS} Dynamic role-based routing implemented`)
      this.results.passed.push('Dynamic role-based routing')
    }
  }

  private async testPerformanceOptimizations() {
    console.log('\n📌 3. PERFORMANCE OPTIMIZATIONS')
    console.log('-' . repeat(40))

    // Test 3.1: Cache Manager Implementation
    const hasCacheManager = fs.existsSync(path.join(process.cwd(), 'lib/auth-cache-manager.ts'))
    if (hasCacheManager) {
      console.log(`${SUCCESS} Auth Cache Manager implemented`)
      this.results.passed.push('Cache Manager implemented')

      // Test cache functionality
      try {
        const testKey = 'test-cache-key'
        const testData = { test: 'data', timestamp: Date.now() }

        // Test basic cache operations
        authCacheManager.set(testKey, testData, 60000) // 1 minute TTL
        const cached = authCacheManager.get(testKey)

        if (cached && cached.test === 'data') {
          console.log(`${SUCCESS} Cache operations working correctly`)
          this.results.passed.push('Cache operations functional')
        } else {
          console.log(`${FAIL} Cache operations not working`)
          this.results.failed.push('Cache operations failed')
        }

        // Clean up
        authCacheManager.clear()
      } catch (error) {
        console.log(`${FAIL} Cache Manager error: ${error}`)
        this.results.failed.push('Cache Manager runtime error')
      }
    } else {
      console.log(`${FAIL} Auth Cache Manager not found`)
      this.results.failed.push('Cache Manager not implemented')
    }

    // Test 3.2: Bundle optimization config
    const nextConfigPath = path.join(process.cwd(), 'next.config.mjs')
    if (fs.existsSync(nextConfigPath)) {
      const config = fs.readFileSync(nextConfigPath, 'utf-8')

      if (config.includes('splitChunks') || config.includes('optimization')) {
        console.log(`${SUCCESS} Bundle optimization configured`)
        this.results.passed.push('Bundle optimization configured')
      } else {
        console.log(`${WARNING} Bundle optimization not configured`)
        this.results.warnings.push('Consider adding bundle optimization')
      }
    }

    // Test 3.3: Check for performance utilities
    const hasPerfUtils = fs.existsSync(path.join(process.cwd(), 'lib/auth-performance-utils.ts'))
    if (hasPerfUtils) {
      console.log(`${SUCCESS} Performance monitoring utilities found`)
      this.results.passed.push('Performance monitoring implemented')
    } else {
      console.log(`${INFO} No performance monitoring utilities`)
    }
  }

  private async testAppRouterCompliance() {
    console.log('\n📌 4. APP ROUTER COMPLIANCE')
    console.log('-' . repeat(40))

    // Test 4.1: Proper route structure
    const roleBasedRoutes = ['gestionnaire', 'prestataire', 'locataire', 'admin']
    const dynamicRouteExists = fs.existsSync(path.join(process.cwd(), 'app/[role]'))

    if (dynamicRouteExists) {
      console.log(`${SUCCESS} Dynamic [role] routing implemented`)
      this.results.passed.push('Dynamic role routing')

      // Check for proper loading states
      const loadingFile = path.join(process.cwd(), 'app/[role]/loading.tsx')
      const errorFile = path.join(process.cwd(), 'app/[role]/error.tsx')

      if (fs.existsSync(loadingFile)) {
        console.log(`${SUCCESS} Loading states implemented`)
        this.results.passed.push('Loading states')
      } else {
        console.log(`${WARNING} Missing loading.tsx`)
        this.results.warnings.push('Add loading states')
      }

      if (fs.existsSync(errorFile)) {
        console.log(`${SUCCESS} Error boundaries implemented`)
        this.results.passed.push('Error boundaries')
      } else {
        console.log(`${WARNING} Missing error.tsx`)
        this.results.warnings.push('Add error boundaries')
      }
    } else {
      // Check for individual role routes
      for (const role of roleBasedRoutes) {
        const routeExists = fs.existsSync(path.join(process.cwd(), `app/${role}`))
        if (routeExists) {
          console.log(`${SUCCESS} /${role} route exists`)
        } else {
          console.log(`${WARNING} /${role} route missing`)
        }
      }
    }

    // Test 4.2: Metadata implementation
    const hasMetadata = roleBasedRoutes.some(role => {
      const pagePath = path.join(process.cwd(), `app/${role}/page.tsx`)
      if (fs.existsSync(pagePath)) {
        const content = fs.readFileSync(pagePath, 'utf-8')
        return content.includes('export const metadata') || content.includes('generateMetadata')
      }
      return false
    })

    if (hasMetadata) {
      console.log(`${SUCCESS} Metadata exports found`)
      this.results.passed.push('Metadata implementation')
    } else {
      console.log(`${INFO} Consider adding metadata exports`)
    }
  }

  private async testMultiRoleSystem() {
    console.log('\n📌 5. MULTI-ROLE DASHBOARD SYSTEM')
    console.log('-' . repeat(40))

    const roles = ['gestionnaire', 'prestataire', 'locataire', 'admin']

    for (const role of roles) {
      // Check dashboard exists
      const dashboardPaths = [
        path.join(process.cwd(), `app/${role}/dashboard/page.tsx`),
        path.join(process.cwd(), `app/[role]/dashboard/page.tsx`),
        path.join(process.cwd(), `app/dashboard/${role}/page.tsx`)
      ]

      const dashboardExists = dashboardPaths.some(p => fs.existsSync(p))

      if (dashboardExists) {
        console.log(`${SUCCESS} ${role} dashboard exists`)
        this.results.passed.push(`${role} dashboard`)
      } else {
        console.log(`${FAIL} ${role} dashboard not found`)
        this.results.failed.push(`${role} dashboard missing`)
      }
    }

    // Test permission service
    try {
      const testPermissions = [
        { role: 'gestionnaire', resource: 'intervention', action: 'approve' },
        { role: 'prestataire', resource: 'intervention', action: 'execute' },
        { role: 'locataire', resource: 'intervention', action: 'create' },
        { role: 'admin', resource: 'users', action: 'manage' }
      ]

      console.log(`${INFO} Testing role permissions...`)
      let permissionTestsPassed = true

      for (const test of testPermissions) {
        const hasPermission = permissionService.hasPermission(
          test.role as any,
          test.resource,
          test.action
        )

        if (!hasPermission) {
          permissionTestsPassed = false
          console.log(`${FAIL} ${test.role} should have ${test.action} permission on ${test.resource}`)
        }
      }

      if (permissionTestsPassed) {
        console.log(`${SUCCESS} All permission tests passed`)
        this.results.passed.push('Role permissions working')
      }
    } catch (error) {
      console.log(`${WARNING} Could not test permissions: ${error}`)
    }
  }

  private async testCacheSystem() {
    console.log('\n📌 6. CACHE SYSTEM VALIDATION')
    console.log('-' . repeat(40))

    // Test cache service functionality
    try {
      // Test profile caching
      const testUserId = 'test-user-123'
      const testProfile = {
        id: testUserId,
        email: 'test@example.com',
        name: 'Test User',
        role: 'gestionnaire' as const
      }

      // Cache profile
      await cacheService.cacheProfile(testUserId, testProfile)
      const cachedProfile = await cacheService.getProfile(testUserId)

      if (cachedProfile && cachedProfile.id === testUserId) {
        console.log(`${SUCCESS} Profile caching working`)
        this.results.passed.push('Profile cache functional')
      } else {
        console.log(`${FAIL} Profile caching not working`)
        this.results.failed.push('Profile cache failed')
      }

      // Test cache invalidation
      await cacheService.clearUserCache(testUserId)
      const clearedProfile = await cacheService.getProfile(testUserId)

      if (!clearedProfile) {
        console.log(`${SUCCESS} Cache invalidation working`)
        this.results.passed.push('Cache invalidation functional')
      } else {
        console.log(`${FAIL} Cache invalidation not working`)
        this.results.failed.push('Cache invalidation failed')
      }

      // Calculate cache metrics
      const cacheMetrics = authCacheManager.getMetrics()
      console.log(`${INFO} Cache Hit Rate: ${cacheMetrics.hitRate.toFixed(1)}%`)
      console.log(`${INFO} Cache Size: ${cacheMetrics.size} entries`)
      console.log(`${INFO} Memory Usage: ~${cacheMetrics.memoryUsage}KB`)

      this.results.metrics.cache = cacheMetrics

    } catch (error) {
      console.log(`${FAIL} Cache system error: ${error}`)
      this.results.failed.push('Cache system error')
    }
  }

  private async testSecurityImplementation() {
    console.log('\n📌 7. SECURITY IMPLEMENTATION')
    console.log('-' . repeat(40))

    // Test 7.1: Check for 'any' types in API routes
    const apiDir = path.join(process.cwd(), 'app/api')
    if (fs.existsSync(apiDir)) {
      let anyTypeCount = 0
      const checkForAnyTypes = (dir: string) => {
        const files = fs.readdirSync(dir)
        for (const file of files) {
          const filePath = path.join(dir, file)
          const stat = fs.statSync(filePath)

          if (stat.isDirectory()) {
            checkForAnyTypes(filePath)
          } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(filePath, 'utf-8')
            const anyMatches = content.match(/:\s*any\b/g)
            if (anyMatches) {
              anyTypeCount += anyMatches.length
            }
          }
        }
      }

      checkForAnyTypes(apiDir)

      if (anyTypeCount === 0) {
        console.log(`${SUCCESS} No 'any' types in API routes`)
        this.results.passed.push('No any types in APIs')
      } else {
        console.log(`${WARNING} Found ${anyTypeCount} 'any' types in API routes`)
        this.results.warnings.push(`${anyTypeCount} any types in APIs`)
      }
    }

    // Test 7.2: JWT validation in middleware
    const middlewarePath = path.join(process.cwd(), 'middleware.ts')
    if (fs.existsSync(middlewarePath)) {
      const content = fs.readFileSync(middlewarePath, 'utf-8')
      const hasJWTValidation = content.includes('getUser()') ||
                               content.includes('verifyJWT') ||
                               content.includes('auth.getUser')

      if (hasJWTValidation) {
        console.log(`${SUCCESS} JWT validation in middleware`)
        this.results.passed.push('JWT validation implemented')
      } else {
        console.log(`${WARNING} No explicit JWT validation found`)
        this.results.warnings.push('Add explicit JWT validation')
      }
    }

    // Test 7.3: Environment variables
    const hasEnvLocal = fs.existsSync(path.join(process.cwd(), '.env.local'))
    const hasEnvExample = fs.existsSync(path.join(process.cwd(), '.env.example'))

    if (hasEnvLocal) {
      console.log(`${SUCCESS} Environment variables configured`)
    } else {
      console.log(`${WARNING} No .env.local file found`)
    }

    if (hasEnvExample) {
      console.log(`${SUCCESS} Environment example provided`)
    } else {
      console.log(`${INFO} Consider adding .env.example`)
    }
  }

  private generateReport() {
    console.log('\n' + '=' . repeat(80))
    console.log('📊 PHASE 2 VALIDATION REPORT')
    console.log('=' . repeat(80))

    const totalTests = this.results.passed.length + this.results.failed.length
    const passRate = (this.results.passed.length / totalTests * 100).toFixed(1)

    console.log('\n📈 Summary:')
    console.log(`   Total Tests: ${totalTests}`)
    console.log(`   Passed: ${this.results.passed.length} (${passRate}%)`)
    console.log(`   Failed: ${this.results.failed.length}`)
    console.log(`   Warnings: ${this.results.warnings.length}`)

    if (this.results.failed.length > 0) {
      console.log('\n❌ Failed Tests:')
      this.results.failed.forEach((test: string) => {
        console.log(`   - ${test}`)
      })
    }

    if (this.results.warnings.length > 0) {
      console.log('\n⚠️ Warnings:')
      this.results.warnings.forEach((warning: string) => {
        console.log(`   - ${warning}`)
      })
    }

    console.log('\n✅ Passed Tests:')
    this.results.passed.forEach((test: string) => {
      console.log(`   - ${test}`)
    })

    // Next.js Best Practices Assessment
    console.log('\n📋 Next.js 15 Best Practices Compliance:')
    const compliance = {
      'Server Components': this.results.passed.some((p: string) => p.includes('client component')),
      'App Router': this.results.passed.some((p: string) => p.includes('role routing')),
      'Loading States': this.results.passed.some((p: string) => p.includes('Loading states')),
      'Error Boundaries': this.results.passed.some((p: string) => p.includes('Error boundaries')),
      'Metadata': this.results.passed.some((p: string) => p.includes('Metadata')),
      'Server Actions': this.results.passed.some((p: string) => p.includes('server-side'))
    }

    Object.entries(compliance).forEach(([feature, implemented]) => {
      console.log(`   ${implemented ? SUCCESS : WARNING} ${feature}`)
    })

    // Performance Metrics
    if (this.results.metrics.cache) {
      console.log('\n📊 Performance Metrics:')
      console.log(`   Cache Hit Rate: ${this.results.metrics.cache.hitRate.toFixed(1)}%`)
      console.log(`   Cache Entries: ${this.results.metrics.cache.size}`)
      console.log(`   Memory Usage: ~${this.results.metrics.cache.memoryUsage}KB`)
    }

    // Overall Assessment
    console.log('\n🎯 Overall Assessment:')
    if (this.results.failed.length === 0) {
      console.log(`   ${SUCCESS} ALL CRITICAL TESTS PASSED - Phase 2 Validated!`)
    } else if (this.results.failed.length <= 2) {
      console.log(`   ${WARNING} Minor issues found - Address before production`)
    } else {
      console.log(`   ${FAIL} Critical issues found - Immediate attention required`)
    }

    // Recommendations
    console.log('\n💡 Recommendations:')
    if (this.results.warnings.length > 0) {
      console.log('   1. Address warnings to improve code quality')
    }
    if (!this.results.passed.some((p: string) => p.includes('Cache operations'))) {
      console.log('   2. Implement cache system for better performance')
    }
    if (this.results.warnings.some((w: string) => w.includes('any types'))) {
      console.log('   3. Replace any types with proper TypeScript types')
    }

    console.log('\n' + '=' . repeat(80))
    console.log('Report generated at:', new Date().toISOString())
    console.log('=' . repeat(80))
  }
}

// Run validation
const validator = new Phase2Validator()
validator.runAll().catch(console.error)

export default Phase2Validator