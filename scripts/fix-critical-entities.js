#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CRITICAL HTML ENTITY FIX SCRIPT');
console.log('=====================================\n');

let fixedFiles = 0;
let totalFixes = 0;

/**
 * Fix critical HTML entities that break JavaScript/TypeScript compilation
 */
function fixCriticalEntities(content) {
  let fixes = 0;
  let newContent = content;

  // Fix ' (') in JavaScript/TypeScript code
  newContent = newContent.replace(/'/g, () => {
    fixes++;
    return "'";
  });

  // Fix " (") in JavaScript/TypeScript code
  newContent = newContent.replace(/"/g, () => {
    fixes++;
    return '"';
  });

  // Fix & (&) in JavaScript/TypeScript code
  newContent = newContent.replace(/&/g, () => {
    fixes++;
    return '&';
  });

  // Fix < (<) in JavaScript/TypeScript code
  newContent = newContent.replace(/</g, () => {
    fixes++;
    return '<';
  });

  // Fix > (>) in JavaScript/TypeScript code
  newContent = newContent.replace(/>/g, () => {
    fixes++;
    return '>';
  });

  totalFixes += fixes;
  return newContent;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = fixCriticalEntities(content);

    if (content !== fixedContent) {
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      fixedFiles++;
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

/**
 * Find TypeScript/JavaScript files that might have HTML entities
 */
function findSourceFiles() {
  const files = [];

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walkDir(fullPath);
        }
      } else if (entry.isFile()) {
        if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          // Check if file contains any HTML entities first
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (/&(apos|quot|amp|lt|gt);/.test(content)) {
              files.push(fullPath);
            }
          } catch (error) {
            // Skip files we can't read
          }
        }
      }
    }
  }

  walkDir(process.cwd());
  return files;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Scanning for files with HTML entities...');
  const files = findSourceFiles();
  console.log(`Found ${files.length} files with HTML entities\n`);

  console.log('🔨 Processing files...');
  files.forEach(processFile);

  console.log('\n📊 Summary:');
  console.log('===========');
  console.log(`Files processed: ${fixedFiles}`);
  console.log(`Total fixes: ${totalFixes}\n`);

  if (fixedFiles > 0) {
    console.log('✅ Critical HTML entity fixes complete!');
    console.log('🏃‍♂️ Testing build...');

    const { execSync } = require('child_process');
    try {
      execSync('npm run build', { stdio: 'inherit', timeout: 120000 });
      console.log('\n✅ Build successful after fixes!');
    } catch (error) {
      console.log('\n⚠️ Some issues remain. Check build output above.');
    }
  } else {
    console.log('No files needed fixing!');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixCriticalEntities };