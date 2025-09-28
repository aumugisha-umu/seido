#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Files with remaining unescaped entities
const filesToFix = [
  'app/locataire/interventions/nouvelle-demande/page.tsx',
  'app/test-finalization-mobile/page.tsx',
  'components/availability/availability-manager.tsx',
  'components/building-info-form.tsx',
  'components/contact-form-modal.tsx',
  'components/intervention/finalization-tabs.tsx',
  'components/intervention/modals/success-modal.tsx'
];

console.log('🔧 Fixing remaining unescaped entities...\n');
let totalFixed = 0;

filesToFix.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let original = content;
  let fixCount = 0;

  // Fix unescaped entities in JSX text content
  content = content.replace(/>([^<{]+)</g, (match, text) => {
    // Skip if already contains HTML entities
    if (text.includes('&') && text.includes(';')) {
      return match;
    }

    let newText = text;
    let changed = false;

    // Replace apostrophes
    if (text.includes("'")) {
      newText = newText.replace(/'/g, '&apos;');
      changed = true;
    }

    // Replace double quotes
    if (text.includes('"')) {
      newText = newText.replace(/"/g, '&quot;');
      changed = true;
    }

    if (changed) {
      fixCount++;
    }

    return `>${newText}<`;
  });

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed ${fixCount} unescaped entities in ${file}`);
    totalFixed += fixCount;
  } else {
    console.log(`ℹ️  No changes needed in ${file}`);
  }
});

console.log(`\n✨ Total fixes applied: ${totalFixed}`);
console.log('✅ Remaining unescaped entities fixed!');