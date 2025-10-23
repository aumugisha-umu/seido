#!/usr/bin/env node

/**
 * Quick Lint Fix - Cible uniquement les imports inutilisés des services
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Fichiers avec imports inutilisés identifiés
const problemFiles = [
  'app/api/create-contact/route.ts',
  'app/api/create-intervention/route.ts',
  'app/api/create-manager-intervention/route.ts',
  'app/api/create-provider-account/route.ts',
  'app/api/generate-intervention-magic-links/route.ts',
  'app/api/intervention/[id]/availabilities/route.ts',
  'app/api/intervention/[id]/finalization-context/route.ts',
  'app/api/intervention/[id]/manager-finalization/route.ts',
  'app/api/intervention/[id]/quote-requests/route.ts',
  'app/api/intervention/[id]/quotes/route.ts',
  'app/api/intervention/[id]/select-slot/route.ts',
  'app/api/intervention/[id]/simple-work-completion/route.ts',
  'app/api/intervention/[id]/tenant-availability/route.ts',
  'app/api/intervention/[id]/tenant-validation/route.ts',
  'app/api/intervention/[id]/user-availability/route.ts',
  'app/api/intervention/[id]/work-completion/route.ts'
];

function removeUnusedServiceImports(content) {
  let result = content;
  let removedCount = 0;

  // Pattern pour les imports de services
  const importRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@\/lib\/services['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const fullImport = match[0];
    const imports = match[1].split(',').map(imp => imp.trim());

    // Vérifier quels imports sont réellement utilisés
    const usedImports = [];

    for (const imp of imports) {
      const importName = imp.trim();

      // Vérifier si cet import est utilisé dans le fichier (hors ligne d'import)
      const contentWithoutImports = result.replace(/import.*from.*@\/lib\/services.*;?\n?/g, '');
      const usageRegex = new RegExp(`\\b${importName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);

      if (usageRegex.test(contentWithoutImports)) {
        usedImports.push(importName);
      } else {
        removedCount++;
        console.log(`  🗑️  Removing unused import: ${importName}`);
      }
    }

    // Remplacer la ligne d'import
    if (usedImports.length === 0) {
      // Supprimer toute la ligne d'import
      result = result.replace(fullImport + '\n', '');
      result = result.replace(fullImport, '');
    } else if (removedCount > 0) {
      // Garder seulement les imports utilisés
      const newImport = `import { ${usedImports.join(', ')} } from '@/lib/services'`;
      result = result.replace(fullImport, newImport);
    }
  }

  return { content: result, removedCount };
}

function processFile(filePath) {
  console.log(`🔄 Processing: ${filePath}`);

  try {
    const fullPath = path.resolve(filePath);

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return 0;
    }

    const originalContent = fs.readFileSync(fullPath, 'utf8');
    const result = removeUnusedServiceImports(originalContent);

    if (result.removedCount > 0) {
      fs.writeFileSync(fullPath, result.content, 'utf8');
      console.log(`✅ Fixed ${result.removedCount} unused imports in ${filePath}`);
      return result.removedCount;
    } else {
      console.log(`⏩ No unused imports found in ${filePath}`);
      return 0;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
    return 0;
  }
}

function main() {
  console.log('🧹 Quick Lint Fix - Removing unused service imports...\n');

  let totalFixed = 0;
  let filesFixed = 0;

  for (const file of problemFiles) {
    const fixed = processFile(file);
    if (fixed > 0) {
      filesFixed++;
      totalFixed += fixed;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`- Files processed: ${problemFiles.length}`);
  console.log(`- Files fixed: ${filesFixed}`);
  console.log(`- Total unused imports removed: ${totalFixed}`);

  // Vérifier le lint après nettoyage
  console.log('\n🔍 Running lint check...');
  try {
    execSync('npm run lint', { stdio: 'inherit' });
    console.log('\n✅ Lint check completed!');
  } catch (error) {
    console.log('\n⚠️  Some lint issues remain (check output above)');
  }
}

main();