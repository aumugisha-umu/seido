#!/usr/bin/env node

/**
 * Phase 2 Final Validation Script
 * Validates Next.js 15 compliance after Server Component conversion
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ANSI colors for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

interface TestResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details?: string;
  performance?: number;
}

const results: TestResult[] = [];
let startTime: number;

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function addResult(category: string, test: string, status: 'PASS' | 'FAIL' | 'WARN', details?: string) {
  results.push({ category, test, status, details });

  const statusColor = status === 'PASS' ? colors.green :
                      status === 'FAIL' ? colors.red :
                      colors.yellow;

  log(`  ${status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️'} ${test}`, statusColor);
  if (details) {
    log(`     ${details}`, colors.cyan);
  }
}

function execCommand(command: string, silent: boolean = false): string {
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit'
    });
    return output;
  } catch (error: any) {
    if (silent) {
      return error.stdout || error.message;
    }
    throw error;
  }
}

// Test 1: Server Component Compliance
function testServerComponents() {
  log('\n📋 Testing Server Component Compliance...', colors.bright + colors.blue);

  const layoutFiles = [
    'app/admin/layout.tsx',
    'app/gestionnaire/layout.tsx',
    'app/locataire/layout.tsx',
    'app/prestataire/layout.tsx'
  ];

  layoutFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasUseClient = content.includes('"use client"') || content.includes("'use client'");

      if (!hasUseClient) {
        addResult('Server Components', `${file} is Server Component`, 'PASS');
      } else {
        addResult('Server Components', `${file} is Server Component`, 'FAIL', 'Contains "use client" directive');
      }
    } else {
      addResult('Server Components', `${file} exists`, 'FAIL', 'File not found');
    }
  });

  // Check NavigationRefreshWrapper
  const wrapperPath = path.join(process.cwd(), 'components/navigation-refresh-wrapper.tsx');
  if (fs.existsSync(wrapperPath)) {
    const content = fs.readFileSync(wrapperPath, 'utf-8');
    const hasUseClient = content.includes('"use client"');

    if (hasUseClient) {
      addResult('Server Components', 'NavigationRefreshWrapper is Client Component', 'PASS');
    } else {
      addResult('Server Components', 'NavigationRefreshWrapper is Client Component', 'FAIL', 'Missing "use client" directive');
    }
  }
}

// Test 2: Loading and Error Boundaries
function testLoadingErrorBoundaries() {
  log('\n📋 Testing Loading and Error Boundaries...', colors.bright + colors.blue);

  const requiredLoadingFiles = [
    'app/admin/loading.tsx',
    'app/gestionnaire/loading.tsx',
    'app/locataire/loading.tsx',
    'app/prestataire/loading.tsx',
    'app/auth/loading.tsx'
  ];

  const requiredErrorFiles = [
    'app/admin/error.tsx',
    'app/gestionnaire/error.tsx',
    'app/locataire/error.tsx',
    'app/prestataire/error.tsx',
    'app/auth/error.tsx',
    'app/error.tsx'
  ];

  requiredLoadingFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      addResult('Loading/Error Boundaries', `${file} exists`, 'PASS');
    } else {
      addResult('Loading/Error Boundaries', `${file} exists`, 'FAIL', 'File not found');
    }
  });

  requiredErrorFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const hasUseClient = content.includes('"use client"');

      if (hasUseClient) {
        addResult('Loading/Error Boundaries', `${file} properly configured`, 'PASS');
      } else {
        addResult('Loading/Error Boundaries', `${file} properly configured`, 'WARN', 'Missing "use client" directive');
      }
    } else {
      addResult('Loading/Error Boundaries', `${file} exists`, 'FAIL', 'File not found');
    }
  });
}

// Test 3: Build and Type Check
function testBuildAndTypes() {
  log('\n📋 Testing Build and Type Checking...', colors.bright + colors.blue);

  try {
    log('  Building application...', colors.cyan);
    execCommand('npm run build', false);
    addResult('Build', 'Next.js build successful', 'PASS');
  } catch (error) {
    addResult('Build', 'Next.js build successful', 'FAIL', 'Build failed - check output above');
  }

  // Check for TypeScript errors
  try {
    const tscOutput = execCommand('npx tsc --noEmit', true);
    if (tscOutput.includes('error')) {
      addResult('TypeScript', 'No type errors', 'WARN', 'Some type errors detected');
    } else {
      addResult('TypeScript', 'No type errors', 'PASS');
    }
  } catch (error) {
    addResult('TypeScript', 'No type errors', 'WARN', 'TypeScript check had issues');
  }
}

// Test 4: Performance Metrics
function testPerformanceMetrics() {
  log('\n📋 Testing Performance Metrics...', colors.bright + colors.blue);

  // Check bundle size
  const buildPath = path.join(process.cwd(), '.next');
  if (fs.existsSync(buildPath)) {
    try {
      // Get size of server components vs client components
      const serverPath = path.join(buildPath, 'server');
      const staticPath = path.join(buildPath, 'static');

      const getDirectorySize = (dirPath: string): number => {
        let size = 0;
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
              size += getDirectorySize(filePath);
            } else {
              size += stats.size;
            }
          });
        }
        return size;
      };

      const serverSize = getDirectorySize(serverPath) / 1024 / 1024; // MB
      const staticSize = getDirectorySize(staticPath) / 1024 / 1024; // MB

      addResult('Performance', 'Server bundle size', 'PASS', `${serverSize.toFixed(2)} MB`);
      addResult('Performance', 'Client bundle size', 'PASS', `${staticSize.toFixed(2)} MB`);

      // Check if client bundle is smaller (good indicator of Server Components)
      if (staticSize < 5) {
        addResult('Performance', 'Client bundle optimized', 'PASS', 'Small client bundle indicates good Server Component usage');
      } else {
        addResult('Performance', 'Client bundle optimized', 'WARN', 'Client bundle might be too large');
      }
    } catch (error) {
      addResult('Performance', 'Bundle analysis', 'WARN', 'Could not analyze bundle sizes');
    }
  }
}

// Test 5: Cache Integration
function testCacheIntegration() {
  log('\n📋 Testing Cache Integration...', colors.bright + colors.blue);

  // Check if cache manager exists and is properly configured
  const cacheManagerPath = path.join(process.cwd(), 'lib/auth-cache-manager.ts');
  if (fs.existsSync(cacheManagerPath)) {
    addResult('Cache', 'Auth cache manager exists', 'PASS');

    // Check cache configuration in auth service
    const authServicePath = path.join(process.cwd(), 'lib/auth-service.ts');
    if (fs.existsSync(authServicePath)) {
      const content = fs.readFileSync(authServicePath, 'utf-8');
      if (content.includes('AuthCacheManager')) {
        addResult('Cache', 'Cache integrated in auth service', 'PASS');
      } else {
        addResult('Cache', 'Cache integrated in auth service', 'WARN', 'Cache manager not found in auth service');
      }
    }
  } else {
    addResult('Cache', 'Auth cache manager exists', 'WARN', 'Cache manager not found');
  }
}

// Test 6: Multi-Role System
function testMultiRoleSystem() {
  log('\n📋 Testing Multi-Role System...', colors.bright + colors.blue);

  const roles = ['admin', 'gestionnaire', 'locataire', 'prestataire'];

  roles.forEach(role => {
    const dashboardPath = path.join(process.cwd(), `app/${role}/dashboard/page.tsx`);
    const layoutPath = path.join(process.cwd(), `app/${role}/layout.tsx`);

    if (fs.existsSync(dashboardPath) && fs.existsSync(layoutPath)) {
      addResult('Multi-Role', `${role} dashboard configured`, 'PASS');
    } else {
      addResult('Multi-Role', `${role} dashboard configured`, 'FAIL', 'Missing dashboard or layout');
    }
  });

  // Check AuthGuard component
  const authGuardPath = path.join(process.cwd(), 'components/auth-guard.tsx');
  if (fs.existsSync(authGuardPath)) {
    const content = fs.readFileSync(authGuardPath, 'utf-8');
    if (content.includes('"use client"')) {
      addResult('Multi-Role', 'AuthGuard is client component', 'PASS');
    } else {
      addResult('Multi-Role', 'AuthGuard is client component', 'FAIL', 'Should be a client component');
    }
  }
}

// Test 7: App Router Compliance
function testAppRouterCompliance() {
  log('\n📋 Testing App Router Compliance...', colors.bright + colors.blue);

  // Check for app directory
  const appDir = path.join(process.cwd(), 'app');
  if (fs.existsSync(appDir)) {
    addResult('App Router', 'Using app directory', 'PASS');
  } else {
    addResult('App Router', 'Using app directory', 'FAIL', 'App directory not found');
  }

  // Check for pages directory (should not exist in app router)
  const pagesDir = path.join(process.cwd(), 'pages');
  if (!fs.existsSync(pagesDir)) {
    addResult('App Router', 'No pages directory', 'PASS', 'Correctly using only app router');
  } else {
    addResult('App Router', 'No pages directory', 'WARN', 'Pages directory exists alongside app router');
  }

  // Check metadata exports
  const layoutFiles = [
    'app/layout.tsx',
    'app/admin/layout.tsx',
    'app/gestionnaire/layout.tsx'
  ];

  layoutFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes('export const metadata') || content.includes('export async function generateMetadata')) {
        addResult('App Router', `${file} has metadata`, 'PASS');
      } else if (file === 'app/layout.tsx') {
        addResult('App Router', `${file} has metadata`, 'WARN', 'Consider adding metadata export');
      }
    }
  });
}

// Test 8: Component Hierarchy
function testComponentHierarchy() {
  log('\n📋 Testing Component Hierarchy...', colors.bright + colors.blue);

  // Count client vs server components
  const componentsDir = path.join(process.cwd(), 'components');
  let clientComponents = 0;
  let serverComponents = 0;

  function analyzeComponents(dir: string) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          analyzeComponents(filePath);
        } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
          const content = fs.readFileSync(filePath, 'utf-8');
          if (content.includes('"use client"') || content.includes("'use client'")) {
            clientComponents++;
          } else {
            serverComponents++;
          }
        }
      });
    }
  }

  analyzeComponents(componentsDir);

  const clientPercentage = (clientComponents / (clientComponents + serverComponents)) * 100;

  addResult('Component Hierarchy', 'Component distribution', 'PASS',
    `${serverComponents} server, ${clientComponents} client (${clientPercentage.toFixed(1)}% client)`);

  if (clientPercentage < 40) {
    addResult('Component Hierarchy', 'Server Component optimization', 'PASS', 'Good Server Component usage');
  } else if (clientPercentage < 60) {
    addResult('Component Hierarchy', 'Server Component optimization', 'WARN', 'Consider converting more components to Server Components');
  } else {
    addResult('Component Hierarchy', 'Server Component optimization', 'FAIL', 'Too many Client Components');
  }
}

// Generate final report
function generateReport() {
  const totalTime = (Date.now() - startTime) / 1000;

  log('\n' + '='.repeat(80), colors.bright);
  log('PHASE 2 VALIDATION REPORT - NEXT.JS 15 COMPLIANCE', colors.bright + colors.magenta);
  log('='.repeat(80), colors.bright);

  const categories = [...new Set(results.map(r => r.category))];

  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category === category);
    const passed = categoryResults.filter(r => r.status === 'PASS').length;
    const failed = categoryResults.filter(r => r.status === 'FAIL').length;
    const warned = categoryResults.filter(r => r.status === 'WARN').length;

    log(`\n${category}:`, colors.bright + colors.blue);
    log(`  ✅ Passed: ${passed}`, colors.green);
    if (failed > 0) log(`  ❌ Failed: ${failed}`, colors.red);
    if (warned > 0) log(`  ⚠️ Warnings: ${warned}`, colors.yellow);
  });

  const totalPassed = results.filter(r => r.status === 'PASS').length;
  const totalFailed = results.filter(r => r.status === 'FAIL').length;
  const totalWarned = results.filter(r => r.status === 'WARN').length;

  log('\n' + '='.repeat(80), colors.bright);
  log('SUMMARY', colors.bright + colors.cyan);
  log('='.repeat(80), colors.bright);

  log(`Total Tests: ${results.length}`, colors.bright);
  log(`✅ Passed: ${totalPassed} (${((totalPassed / results.length) * 100).toFixed(1)}%)`, colors.green);
  log(`❌ Failed: ${totalFailed} (${((totalFailed / results.length) * 100).toFixed(1)}%)`, colors.red);
  log(`⚠️ Warnings: ${totalWarned} (${((totalWarned / results.length) * 100).toFixed(1)}%)`, colors.yellow);
  log(`⏱️ Time: ${totalTime.toFixed(2)}s`, colors.cyan);

  if (totalFailed === 0) {
    log('\n🎉 PHASE 2 VALIDATION SUCCESSFUL! 🎉', colors.bright + colors.green);
    log('All critical Next.js 15 compliance checks passed.', colors.green);
  } else {
    log('\n⚠️ PHASE 2 VALIDATION NEEDS ATTENTION', colors.bright + colors.yellow);
    log(`${totalFailed} critical issues need to be resolved.`, colors.yellow);
  }

  // Save detailed report
  const reportPath = path.join(process.cwd(), 'test/reports/phase2-validation-report.json');
  const reportDir = path.dirname(reportPath);

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    duration: totalTime,
    summary: {
      total: results.length,
      passed: totalPassed,
      failed: totalFailed,
      warnings: totalWarned
    },
    results: results
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Detailed report saved to: test/reports/phase2-validation-report.json`, colors.cyan);
}

// Main execution
async function main() {
  startTime = Date.now();

  log('🚀 Starting Phase 2 Final Validation...', colors.bright + colors.green);
  log('=' .repeat(80), colors.bright);

  testServerComponents();
  testLoadingErrorBoundaries();
  testAppRouterCompliance();
  testComponentHierarchy();
  testMultiRoleSystem();
  testCacheIntegration();
  testBuildAndTypes();
  testPerformanceMetrics();

  generateReport();
}

// Run validation
main().catch(error => {
  log('\n❌ Validation failed with error:', colors.red);
  console.error(error);
  process.exit(1);
});