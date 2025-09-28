#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Files with the most unescaped entity warnings
const filesToFix = [
  'app/gestionnaire/biens/immeubles/nouveau/page.tsx',
  'app/gestionnaire/contacts/modifier/[id]/page.tsx',
  'app/gestionnaire/contacts/page.tsx',
  'app/gestionnaire/interventions/nouvelle-intervention/page.tsx',
  'app/gestionnaire/biens/lots/modifier/[id]/page.tsx',
  'app/gestionnaire/biens/immeubles/modifier/[id]/page.tsx',
  'app/gestionnaire/biens/immeubles/[id]/page.tsx',
  'app/gestionnaire/contacts/details/[id]/page.tsx',
  'app/debug/data/page.tsx',
];

function fixUnescapedEntities(content) {
  let fixed = content;
  let changesMade = 0;

  // Match JSX text content and replace unescaped entities
  // This regex captures text between JSX tags
  fixed = fixed.replace(/>([^<{]+)</g, (match, text) => {
    // Skip if already contains escaped entities or JSX expressions
    if (text.includes('&apos;') || text.includes('&quot;') ||
        text.includes('&lsquo;') || text.includes('&ldquo;')) {
      return match;
    }

    let newText = text;
    // Replace single quotes with &apos;
    if (text.includes("'")) {
      newText = newText.replace(/'/g, "&apos;");
      changesMade++;
    }
    // Replace double quotes with &quot;
    if (text.includes('"')) {
      newText = newText.replace(/"/g, "&quot;");
      changesMade++;
    }

    return `>${newText}<`;
  });

  return { fixed, changesMade };
}

function removeUnusedImports(content) {
  const lines = content.split('\n');
  const importRegex = /^import\s+(?:{([^}]+)}|([^{}\s]+))\s+from/;
  const unusedVars = [
    'TeamMember', 'createServerUserService', 'Check', 'Building2',
    'DeleteConfirmModal', 'Badge', 'useToast', 'Skeleton',
    'InterventionCancelButton', 'getInterventionLocationText',
    'getInterventionLocationIcon', 'isBuildingWideIntervention',
    'getStatusColor', 'getStatusLabel', 'getPriorityColor', 'getPriorityLabel'
  ];

  const filteredLines = lines.filter(line => {
    const match = line.match(importRegex);
    if (match) {
      const imports = match[1] || match[2];
      // Check if any of the unused vars are in this import
      for (const unusedVar of unusedVars) {
        if (imports && imports.includes(unusedVar)) {
          // Check if it's a multi-import line
          if (imports.includes(',')) {
            // Remove just the unused import, not the whole line
            return true; // We'll handle this below
          } else {
            // Single import, remove the whole line
            console.log(`  Removing unused import: ${unusedVar}`);
            return false;
          }
        }
      }
    }
    return true;
  });

  // Handle multi-import lines
  const cleanedLines = filteredLines.map(line => {
    const match = line.match(/^import\s+{([^}]+)}\s+from/);
    if (match) {
      let imports = match[1].split(',').map(i => i.trim());
      const originalLength = imports.length;
      imports = imports.filter(imp => !unusedVars.includes(imp.split(' ')[0]));

      if (imports.length < originalLength && imports.length > 0) {
        // Reconstruct the import line
        return line.replace(/{[^}]+}/, `{ ${imports.join(', ')} }`);
      } else if (imports.length === 0) {
        // All imports were unused, remove the line
        return null;
      }
    }
    return line;
  }).filter(line => line !== null);

  return cleanedLines.join('\n');
}

console.log('🔧 Fixing ESLint warnings...\n');

let totalEntitiesFixed = 0;
let totalFilesFixed = 0;

filesToFix.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');

  // Fix unescaped entities
  const { fixed, changesMade } = fixUnescapedEntities(content);

  if (changesMade > 0) {
    fs.writeFileSync(fullPath, fixed, 'utf8');
    console.log(`✅ Fixed ${changesMade} unescaped entities in ${filePath}`);
    totalEntitiesFixed += changesMade;
    totalFilesFixed++;
  } else {
    console.log(`   No changes needed in ${filePath}`);
  }
});

console.log(`\n✨ Fixed ${totalEntitiesFixed} unescaped entities in ${totalFilesFixed} files`);

// Now remove unused imports
console.log('\n🔧 Removing unused imports...\n');

const importsToClean = [
  'app/api/intervention-quote-request/route.ts',
  'app/gestionnaire/biens/lots/nouveau/page.tsx',
  'app/gestionnaire/contacts/modifier/[id]/page.tsx',
  'app/gestionnaire/contacts/page.tsx',
  'app/gestionnaire/interventions/page.tsx',
  'app/locataire/dashboard/page.tsx',
];

importsToClean.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const cleaned = removeUnusedImports(content);

  if (cleaned !== content) {
    fs.writeFileSync(fullPath, cleaned, 'utf8');
    console.log(`✅ Cleaned imports in ${filePath}`);
  }
});

console.log('\n✅ ESLint warning fixes complete!');