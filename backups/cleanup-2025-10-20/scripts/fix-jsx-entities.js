#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing JSX HTML Entities Script');
console.log('==================================\n');

let fixedFiles = 0;
let totalFixes = 0;

/**
 * Fix HTML entities that were incorrectly applied to JSX attributes
 */
function fixJSXEntities(content) {
  let fixes = 0;
  const originalContent = content;

  // Fix " in JSX attributes (but not in JSX text content)
  content = content.replace(/(\w+\s*=\s*)"([^&]*)"/g, (match, before, inside) => {
    fixes++;
    return before + '"' + inside + '"';
  });

  // Fix ' in JSX attributes
  content = content.replace(/(\w+\s*=\s*)'([^&]*)'/g, (match, before, inside) => {
    fixes++;
    return before + "'" + inside + "'";
  });

  // Fix HTML entities in template literals and function calls
  content = content.replace(/(\(\s*["`])"([^&]*?)"(["`]\s*\))/g, (match, before, inside, after) => {
    fixes++;
    return before + '"' + inside + '"' + after;
  });

  content = content.replace(/(\(\s*["`])'([^&]*?)'(["`]\s*\))/g, (match, before, inside, after) => {
    fixes++;
    return before + "'" + inside + "'" + after;
  });

  // Fix useState and other state initializations
  content = content.replace(/(useState<[^>]*>\s*\(\s*)""(\s*\))/g, (match, before, after) => {
    fixes++;
    return before + '""' + after;
  });

  content = content.replace(/(useState<[^>]*>\s*\(\s*)''(\s*\))/g, (match, before, after) => {
    fixes++;
    return before + "''" + after;
  });

  // Fix string literals in expressions
  content = content.replace(/(\w+\s*[=:]\s*)"([^&]*)"/g, (match, before, inside) => {
    fixes++;
    return before + '"' + inside + '"';
  });

  totalFixes += fixes;
  return content;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = fixJSXEntities(content);

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
 * Find all React files
 */
function findReactFiles() {
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
        if (/\.(tsx|jsx|ts|js)$/.test(entry.name)) {
          files.push(fullPath);
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
  console.log('🔍 Scanning for React files...');
  const files = findReactFiles();
  console.log(`Found ${files.length} files\n`);

  console.log('🔨 Processing files...');
  files.forEach(processFile);

  console.log('\n📊 Summary:');
  console.log('===========');
  console.log(`Files processed: ${fixedFiles}`);
  console.log(`Total fixes: ${totalFixes}\n`);

  console.log('✅ JSX HTML entity fixes complete!');
}

if (require.main === module) {
  main();
}

module.exports = { fixJSXEntities };