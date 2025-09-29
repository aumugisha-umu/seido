#!/usr/bin/env node

/**
 * Migration Script: Database Service Imports
 * Automatically replaces legacy database-service imports with new modular architecture
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
    '**/lib/database-service.ts', // Don't migrate the source file
    '**/lib/services/**' // Don't migrate our new services
  ],

  // Backup directory
  backupDir: './migration-backup',

  // Service mappings from legacy to new architecture
  serviceMappings: {
    userService: {
      import: "import { createServerUserService } from '@/lib/services'",
      clientImport: "import { createUserService } from '@/lib/services'",
      initialization: "const userService = await createServerUserService()",
      clientInitialization: "const userService = createUserService()"
    },
    buildingService: {
      import: "import { createServerBuildingService } from '@/lib/services'",
      clientImport: "import { createBuildingService } from '@/lib/services'",
      initialization: "const _buildingService = await createServerBuildingService()",
      clientInitialization: "const buildingService = createBuildingService()"
    },
    lotService: {
      import: "import { createServerLotService } from '@/lib/services'",
      clientImport: "import { createLotService } from '@/lib/services'",
      initialization: "const lotService = await createServerLotService()",
      clientInitialization: "const lotService = createLotService()"
    },
    interventionService: {
      import: "import { createServerInterventionService } from '@/lib/services'",
      clientImport: "import { createInterventionService } from '@/lib/services'",
      initialization: "const interventionService = await createServerInterventionService()",
      clientInitialization: "const interventionService = createInterventionService()"
    },
    contactService: {
      import: "import { createServerContactService } from '@/lib/services'",
      clientImport: "import { createContactService } from '@/lib/services'",
      initialization: "const contactService = await createServerContactService()",
      clientInitialization: "const contactService = createContactService()"
    },
    teamService: {
      import: "import { createServerTeamService } from '@/lib/services'",
      clientImport: "import { createTeamService } from '@/lib/services'",
      initialization: "const teamService = await createServerTeamService()",
      clientInitialization: "const teamService = createTeamService()"
    },
    contactInvitationService: {
      import: "import { createServerContactInvitationService } from '@/lib/services'",
      clientImport: "import { createContactInvitationService } from '@/lib/services'",
      initialization: "const contactInvitationService = await createServerContactInvitationService()",
      clientInitialization: "const contactInvitationService = createContactInvitationService()"
    },
    tenantService: {
      import: "import { createServerTenantService } from '@/lib/services'",
      clientImport: "import { createTenantService } from '@/lib/services'",
      initialization: "const tenantService = await createServerTenantService()",
      clientInitialization: "const tenantService = createTenantService()"
    },
    compositeService: {
      import: "import { createServerCompositeService } from '@/lib/services'",
      clientImport: "import { createCompositeService } from '@/lib/services'",
      initialization: "const compositeService = await createServerCompositeService()",
      clientInitialization: "const compositeService = createCompositeService()"
    },
    determineAssignmentType: {
      import: "import { determineAssignmentType } from '@/lib/services'",
      clientImport: "import { determineAssignmentType } from '@/lib/services'",
      initialization: "",
      clientInitialization: ""
    }
  }
};

class DatabaseServiceMigrator {
  constructor() {
    this.migrationReport = {
      filesScanned: 0,
      filesMigrated: 0,
      errors: [],
      warnings: [],
      summary: {}
    };
  }

  /**
   * Main migration function
   */
  async migrate() {
    console.log('🚀 Starting Database Service Migration...');
    console.log(`📁 Scanning paths: ${config.scanPaths.join(', ')}`);

    // Create backup directory
    this.createBackupDirectory();

    // Get all files to migrate
    const files = this.getFilesToMigrate();
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
   * Get all files that need migration
   */
  getFilesToMigrate() {
    const files = [];

    for (const pattern of config.scanPaths) {
      const matches = glob.sync(pattern, {
        ignore: config.excludePatterns,
        absolute: true
      });
      files.push(...matches);
    }

    // Filter files that actually import from database-service
    return files.filter(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        return content.includes("from '@/lib/database-service'") ||
               content.includes('from "@/lib/database-service"');
      } catch (error) {
        return false;
      }
    });
  }

  /**
   * Process a single file
   */
  async processFile(filePath) {
    this.migrationReport.filesScanned++;

    try {
      console.log(`🔄 Processing: ${path.relative(process.cwd(), filePath)}`);

      const originalContent = fs.readFileSync(filePath, 'utf8');
      let newContent = originalContent;

      // Create backup
      this.createFileBackup(filePath, originalContent);

      // Detect if this is a server component/API route or client component
      const isServerFile = this.isServerFile(filePath, originalContent);

      // Replace imports
      newContent = this.replaceImports(newContent, isServerFile);

      // Replace service initializations if needed
      newContent = this.replaceServiceInitializations(newContent, isServerFile);

      // Only write if content changed
      if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        this.migrationReport.filesMigrated++;
        console.log(`✅ Migrated: ${path.relative(process.cwd(), filePath)}`);
      } else {
        console.log(`⏩ No changes needed: ${path.relative(process.cwd(), filePath)}`);
      }

    } catch (error) {
      this.migrationReport.errors.push({
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
   * Determine if file is server-side (API route, server component)
   */
  isServerFile(filePath, content) {
    // API routes are always server-side
    if (filePath.includes('/api/')) {
      return true;
    }

    // Check for server component indicators
    if (content.includes('export default async function') ||
        content.includes('await ') ||
        content.includes('NextRequest') ||
        content.includes('NextResponse')) {
      return true;
    }

    // Check for 'use client' directive
    if (content.includes("'use client'") || content.includes('"use client"')) {
      return false;
    }

    // Default to server for .ts files in app directory
    if (filePath.includes('/app/') && filePath.endsWith('.tsx')) {
      return true;
    }

    return false;
  }

  /**
   * Replace import statements
   */
  replaceImports(content, isServerFile) {
    // Match database-service imports
    const importRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@\/lib\/database-service['"]/g;

    return content.replace(importRegex, (match, imports) => {
      const importList = imports.split(',').map(imp => imp.trim());
      const newImports = [];

      for (const imp of importList) {
        const serviceName = imp.trim();
        const mapping = config.serviceMappings[serviceName];

        if (mapping) {
          const importStatement = isServerFile ? mapping.import : mapping.clientImport;
          if (importStatement && !newImports.includes(importStatement)) {
            newImports.push(importStatement);
          }
        } else {
          // Handle types and other exports
          if (serviceName.startsWith('type ')) {
            newImports.push(`import { ${serviceName} } from '@/lib/services'`);
          } else {
            this.migrationReport.warnings.push({
              service: serviceName,
              message: `Unknown service mapping for: ${serviceName}`
            });
          }
        }
      }

      return newImports.join('\n');
    });
  }

  /**
   * Replace service initializations (for API routes that directly use services)
   */
  replaceServiceInitializations(content, isServerFile) {
    // This is more complex and would require parsing the actual usage patterns
    // For now, we'll add a comment to guide manual migration

    if (isServerFile && content.includes('userService.') && !content.includes('const userService =')) {
      // Add service initialization guidance
      const guidanceComment = `
// TODO: Initialize services for new architecture
// Example: const userService = await createServerUserService()
// Remember to make your function async if it isn't already
`;

      // Insert guidance after imports
      const lines = content.split('\n');
      const lastImportIndex = lines.findLastIndex(line => line.trim().startsWith('import'));

      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, guidanceComment);
        return lines.join('\n');
      }
    }

    return content;
  }

  /**
   * Generate migration report
   */
  generateReport() {
    const report = `
# Database Service Migration Report

## Summary
- Files Scanned: ${this.migrationReport.filesScanned}
- Files Migrated: ${this.migrationReport.filesMigrated}
- Errors: ${this.migrationReport.errors.length}
- Warnings: ${this.migrationReport.warnings.length}

## Errors
${this.migrationReport.errors.map(err => `- ${err.file}: ${err.error}`).join('\n')}

## Warnings
${this.migrationReport.warnings.map(warn => `- ${warn.service}: ${warn.message}`).join('\n')}

## Next Steps
1. Review migrated files for any syntax errors
2. Update service initializations in API routes (look for TODO comments)
3. Test the application thoroughly
4. Remove the legacy database-service.ts file when ready

## Backup Location
Original files backed up to: ${config.backupDir}
`;

    fs.writeFileSync('./migration-report.md', report, 'utf8');
    console.log('\n📊 Migration Report Generated: ./migration-report.md');
    console.log(`\n✅ Migration completed: ${this.migrationReport.filesMigrated}/${this.migrationReport.filesScanned} files migrated`);

    if (this.migrationReport.errors.length > 0) {
      console.log(`❌ ${this.migrationReport.errors.length} errors encountered - check migration-report.md`);
    }

    if (this.migrationReport.warnings.length > 0) {
      console.log(`⚠️ ${this.migrationReport.warnings.length} warnings - manual review needed`);
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migrator = new DatabaseServiceMigrator();
  migrator.migrate().catch(console.error);
}

module.exports = DatabaseServiceMigrator;