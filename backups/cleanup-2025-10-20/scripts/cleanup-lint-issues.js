#!/usr/bin/env node

/**
 * Script de nettoyage automatique des erreurs ESLint
 * Nettoie les imports inutilisés et autres problèmes de lint post-migration
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const config = {
  // Directories to scan
  scanPaths: [
    'app/**/*.ts',
    'app/**/*.tsx',
    'components/**/*.ts',
    'components/**/*.tsx',
    'lib/**/*.ts'
  ],

  // Files to exclude
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/lib/services/**' // Don't touch our new services
  ],

  // Backup directory
  backupDir: './lint-cleanup-backup',

  // Service imports patterns to check
  serviceImports: [
    'createServerUserService',
    'createServerBuildingService',
    'createServerLotService',
    'createServerInterventionService',
    'createServerContactService',
    'createServerTeamService',
    'createServerTenantService',
    'createServerContactInvitationService',
    'createServerStatsService',
    'createServerCompositeService',
    'createUserService',
    'createBuildingService',
    'createLotService',
    'createInterventionService',
    'createContactService',
    'createTeamService',
    'createTenantService',
    'createContactInvitationService',
    'createStatsService',
    'createCompositeService'
  ]
};

class LintCleaner {
  constructor() {
    this.cleanupReport = {
      filesScanned: 0,
      filesCleaned: 0,
      unusedImportsRemoved: 0,
      anyTypesFixed: 0,
      errors: [],
      warnings: []
    };
  }

  /**
   * Main cleanup function
   */
  async cleanup() {
    console.log('🧹 Starting ESLint cleanup...');
    console.log(`📁 Scanning paths: ${config.scanPaths.join(', ')}`);

    // Create backup directory
    this.createBackupDirectory();

    // Get all files to process
    const files = this.getFilesToProcess();
    console.log(`📄 Found ${files.length} files to process`);

    // Process each file
    for (const file of files) {
      await this.processFile(file);
    }

    // Generate report
    this.generateReport();
  }

  /**
   * Create backup directory
   */
  createBackupDirectory() {
    if (!fs.existsSync(config.backupDir)) {
      fs.mkdirSync(config.backupDir, { recursive: true });
      console.log(`📁 Created backup directory: ${config.backupDir}`);
    }
  }

  /**
   * Get all files that need processing
   */
  getFilesToProcess() {
    const files = [];

    for (const pattern of config.scanPaths) {
      const matches = glob.sync(pattern, {
        ignore: config.excludePatterns,
        absolute: true
      });
      files.push(...matches);
    }

    return [...new Set(files)]; // Remove duplicates
  }

  /**
   * Process a single file
   */
  async processFile(filePath) {
    this.cleanupReport.filesScanned++;

    try {
      console.log(`🔄 Processing: ${path.relative(process.cwd(), filePath)}`);

      const originalContent = fs.readFileSync(filePath, 'utf8');
      let newContent = originalContent;
      let hasChanges = false;

      // Create backup
      this.createFileBackup(filePath, originalContent);

      // Remove unused service imports
      const cleanedImports = this.removeUnusedServiceImports(newContent, filePath);
      if (cleanedImports.content !== newContent) {
        newContent = cleanedImports.content;
        hasChanges = true;
        this.cleanupReport.unusedImportsRemoved += cleanedImports.removedCount;
      }

      // Fix basic any types
      const cleanedTypes = this.fixBasicAnyTypes(newContent);
      if (cleanedTypes.content !== newContent) {
        newContent = cleanedTypes.content;
        hasChanges = true;
        this.cleanupReport.anyTypesFixed += cleanedTypes.fixedCount;
      }

      // Remove unused variables
      const cleanedVars = this.removeUnusedVariables(newContent);
      if (cleanedVars !== newContent) {
        newContent = cleanedVars;
        hasChanges = true;
      }

      // Only write if content changed
      if (hasChanges) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        this.cleanupReport.filesCleaned++;
        console.log(`✅ Cleaned: ${path.relative(process.cwd(), filePath)}`);
      } else {
        console.log(`⏩ No changes needed: ${path.relative(process.cwd(), filePath)}`);
      }

    } catch (error) {
      this.cleanupReport.errors.push({
        file: filePath,
        error: error.message
      });
      console.error(`❌ Error processing ${filePath}: ${error.message}`);
    }
  }

  /**
   * Create backup of original file
   */
  createFileBackup(filePath, content) {
    const relativePath = path.relative(process.cwd(), filePath);
    const backupPath = path.join(config.backupDir, relativePath);
    const backupDir = path.dirname(backupPath);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    fs.writeFileSync(backupPath, content, 'utf8');
  }

  /**
   * Remove unused service imports
   */
  removeUnusedServiceImports(content, filePath) {
    let result = content;
    let removedCount = 0;

    // Find all service imports
    const importRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@\/lib\/services['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const fullImport = match[0];
      const imports = match[1].split(',').map(imp => imp.trim());

      // Check which imports are actually used
      const usedImports = [];
      const unusedImports = [];

      for (const imp of imports) {
        const importName = imp.trim();

        // Check if this import is used in the file (excluding the import line itself)
        const contentWithoutImports = result.replace(importRegex, '');
        const usageRegex = new RegExp(`\\b${importName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');

        if (usageRegex.test(contentWithoutImports)) {
          usedImports.push(importName);
        } else {
          unusedImports.push(importName);
          removedCount++;
        }
      }

      // Replace the import line
      if (usedImports.length === 0) {
        // Remove the entire import line
        result = result.replace(fullImport, '');
      } else if (unusedImports.length > 0) {
        // Keep only used imports
        const newImport = `import { ${usedImports.join(', ')} } from '@/lib/services'`;
        result = result.replace(fullImport, newImport);
      }
    }

    return { content: result, removedCount };
  }

  /**
   * Fix basic any types with common patterns
   */
  fixBasicAnyTypes(content) {
    let result = content;
    let fixedCount = 0;

    // Common any type fixes
    const anyFixes = [
      // Array of any -> unknown[]
      { pattern: /:\s*any\[\]/g, replacement: ': unknown[]', description: 'Array of any to unknown[]' },

      // Function parameters that are clearly objects
      { pattern: /\(([^)]*?):\s*any\)/g, replacement: '($1: unknown)', description: 'Function parameter any to unknown' },

      // Variable declarations with any
      { pattern: /:\s*any\s*=/g, replacement: ': unknown =', description: 'Variable any to unknown' },

      // Return types that are any
      { pattern: /\):\s*any\s*{/g, replacement: '): unknown {', description: 'Return type any to unknown' }
    ];

    for (const fix of anyFixes) {
      const matches = result.match(fix.pattern);
      if (matches) {
        result = result.replace(fix.pattern, fix.replacement);
        fixedCount += matches.length;
      }
    }

    return { content: result, fixedCount };
  }

  /**
   * Remove obvious unused variables
   */
  removeUnusedVariables(content) {
    let result = content;

    // Remove unused const declarations that are clearly not used
    // This is a simple version - only removes very obvious cases
    const lines = result.split('\n');
    const filteredLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for unused const declarations (very conservative)
      const unusedConstMatch = line.match(/^\s*const\s+(\w+)\s*=\s*.*\/\/\s*unused/i);
      if (unusedConstMatch) {
        // Skip this line as it's marked as unused
        continue;
      }

      filteredLines.push(line);
    }

    return filteredLines.join('\n');
  }

  /**
   * Generate cleanup report
   */
  generateReport() {
    const report = `
# ESLint Cleanup Report

## Summary
- Files Scanned: ${this.cleanupReport.filesScanned}
- Files Cleaned: ${this.cleanupReport.filesCleaned}
- Unused Imports Removed: ${this.cleanupReport.unusedImportsRemoved}
- Any Types Fixed: ${this.cleanupReport.anyTypesFixed}
- Errors: ${this.cleanupReport.errors.length}
- Warnings: ${this.cleanupReport.warnings.length}

## Errors
${this.cleanupReport.errors.map(err => `- ${err.file}: ${err.error}`).join('\n')}

## Warnings
${this.cleanupReport.warnings.map(warn => `- ${warn.message}`).join('\n')}

## Next Steps
1. Run 'npm run lint' to verify remaining issues
2. Run 'npm run build' to ensure everything compiles
3. Manually review any remaining complex any types
4. Remove backup files when satisfied: rm -rf ${config.backupDir}

## Backup Location
Original files backed up to: ${config.backupDir}
`;

    fs.writeFileSync('./lint-cleanup-report.md', report, 'utf8');
    console.log('\n📊 Cleanup Report Generated: ./lint-cleanup-report.md');
    console.log(`\n✅ Cleanup completed: ${this.cleanupReport.filesCleaned}/${this.cleanupReport.filesScanned} files cleaned`);

    if (this.cleanupReport.errors.length > 0) {
      console.log(`❌ ${this.cleanupReport.errors.length} errors encountered - check lint-cleanup-report.md`);
    }

    console.log(`🧹 Removed ${this.cleanupReport.unusedImportsRemoved} unused imports`);
    console.log(`🔧 Fixed ${this.cleanupReport.anyTypesFixed} any types`);
  }
}

// Run cleanup if called directly
if (require.main === module) {
  const cleaner = new LintCleaner();
  cleaner.cleanup().catch(console.error);
}

module.exports = LintCleaner;