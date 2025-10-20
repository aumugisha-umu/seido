#!/usr/bin/env node

/**
 * Script ultra-simple pour supprimer tous les imports inutilisés des services
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Liste de tous les services qui peuvent être inutilisés
const serviceImports = [
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
  'createCompositeService',
  'determineAssignmentType'
];

// Autres imports souvent inutilisés
const otherImports = [
  'CardDescription', 'CardTitle', 'Select', 'SelectContent', 'SelectItem',
  'SelectTrigger', 'SelectValue', 'Building', 'Search', 'Edit', 'Trash2',
  'getLotCategoryConfig', 'useManagerStats', 'CheckCircle', 'Building2',
  'Link', 'getDashboardPath'
];

const allImports = [...serviceImports, ...otherImports];

function removeUnusedImports(content) {
  let result = content;
  let removedCount = 0;

  // Pour chaque import des services
  const serviceImportRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@\/lib\/services['"]/g;

  result = result.replace(serviceImportRegex, (match, imports) => {
    const importList = imports.split(',').map(imp => imp.trim());
    const usedImports = [];

    for (const imp of importList) {
      const importName = imp.trim();

      // Vérifier si cet import est utilisé dans le fichier
      const contentWithoutImports = result.replace(/import.*from.*@\/lib\/services.*;?\n?/g, '');
      const usageRegex = new RegExp(`\\b${importName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);

      if (usageRegex.test(contentWithoutImports)) {
        usedImports.push(importName);
      } else {
        removedCount++;
        console.log(`  🗑️ Removing unused service: ${importName}`);
      }
    }

    if (usedImports.length === 0) {
      return ''; // Supprimer toute la ligne
    } else {
      return `import { ${usedImports.join(', ')} } from '@/lib/services'`;
    }
  });

  // Pour les autres imports
  for (const importName of otherImports) {
    const importRegex = new RegExp(`,\\s*${importName}\\s*(?=,|})`, 'g');
    const singleImportRegex = new RegExp(`{\\s*${importName}\\s*}`, 'g');

    // Vérifier si utilisé
    const usageRegex = new RegExp(`\\b${importName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    const contentWithoutImports = result.replace(/import.*from.*;?\n?/g, '');

    if (!usageRegex.test(contentWithoutImports)) {
      const before = result;
      result = result.replace(importRegex, ''); // Supprimer de la liste
      result = result.replace(singleImportRegex, '{}'); // Si c'était le seul import

      if (result !== before) {
        removedCount++;
        console.log(`  🗑️ Removing unused import: ${importName}`);
      }
    }
  }

  // Nettoyer les lignes d'import vides
  result = result.replace(/import\s*{\s*}\s*from\s*['""][^'"]*['"];?\n?/g, '');
  result = result.replace(/import\s*{\s*,\s*}\s*from\s*['""][^'"]*['"];?\n?/g, '');

  return { content: result, removedCount };
}

function removeUnusedVariables(content) {
  let result = content;

  // Variables clairement marquées comme inutilisées
  const patterns = [
    /const\s+\w+\s*=\s*[^;]+;\s*\/\/\s*unused/gi,
    /let\s+\w+\s*=\s*[^;]+;\s*\/\/\s*unused/gi
  ];

  for (const pattern of patterns) {
    result = result.replace(pattern, '');
  }

  return result;
}

function processFile(filePath) {
  console.log(`🔄 Processing: ${path.relative(process.cwd(), filePath)}`);

  try {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    let result = removeUnusedImports(originalContent);
    let newContent = removeUnusedVariables(result.content);

    if (result.removedCount > 0 || newContent !== originalContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Fixed ${result.removedCount} imports in ${path.relative(process.cwd(), filePath)}`);
      return result.removedCount;
    } else {
      console.log(`⏩ No unused imports in ${path.relative(process.cwd(), filePath)}`);
      return 0;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}: ${error.message}`);
    return 0;
  }
}

function main() {
  console.log('🧹 Removing ALL unused imports...\n');

  // Obtenir tous les fichiers
  const patterns = ['app/**/*.ts', 'app/**/*.tsx', 'components/**/*.ts', 'components/**/*.tsx'];
  const files = [];

  for (const pattern of patterns) {
    const matches = glob.sync(pattern, {
      ignore: ['**/node_modules/**', '**/lib/services/**'],
      absolute: true
    });
    files.push(...matches);
  }

  console.log(`📄 Found ${files.length} files to process\n`);

  let totalFixed = 0;
  let filesFixed = 0;

  for (const file of files) {
    const fixed = processFile(file);
    if (fixed > 0) {
      filesFixed++;
      totalFixed += fixed;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`- Files processed: ${files.length}`);
  console.log(`- Files fixed: ${filesFixed}`);
  console.log(`- Total unused imports removed: ${totalFixed}`);

  // Vérifier le lint après
  console.log('\n🔍 Running lint check...');
  const { execSync } = require('child_process');
  try {
    execSync('npm run lint', { stdio: 'inherit' });
    console.log('\n🎉 Lint check completed!');
  } catch (error) {
    console.log('\n⚠️ Some issues remain - but much cleaner now!');
  }
}

main();