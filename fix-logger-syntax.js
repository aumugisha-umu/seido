const fs = require('fs');
const path = require('path');

// Files to fix based on TypeScript errors
const filesToFix = [
  'app/api/generate-intervention-magic-links/route.ts',
  'app/api/intervention-quote-request/route.ts',
  'app/api/intervention-quote-validate/route.ts',
  'app/api/intervention-reject/route.ts',
  'app/api/intervention-schedule/route.ts',
  'app/api/intervention-validate-tenant/route.ts',
  'app/api/intervention/[id]/availability-response/route.ts',
  'app/api/intervention/[id]/finalization-context/route.ts'
];

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern 1: Fix { error: error } → { error }
  const pattern1 = /\{\s*error:\s*error\s*\}/g;
  if (pattern1.test(content)) {
    content = content.replace(pattern1, '{ error }');
    modified = true;
  }

  // Pattern 2: Fix JSON.stringify(..., null, 2 } → JSON.stringify(..., null, 2) }
  const pattern2 = /JSON\.stringify\(([^)]+)\s*,\s*null\s*,\s*2\s*}/g;
  if (pattern2.test(content)) {
    content = content.replace(pattern2, 'JSON.stringify($1, null, 2) }');
    modified = true;
  }

  // Pattern 3: Fix .trim(, 'message') → .trim(), 'message'
  const pattern3 = /\.trim\(\s*,\s*'([^']+)'\)/g;
  if (pattern3.test(content)) {
    content = content.replace(pattern3, ".trim(), '$1'");
    modified = true;
  }

  // Pattern 4: Fix duplicate object keys in logger calls
  // This is more complex - we'll handle specific cases

  // Pattern 5: Fix logger.error/info with missing second param
  // logger.info({ data }, without message) → logger.info({ data }, 'Message')

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
  } else {
    console.log(`ℹ️  No changes: ${file}`);
  }
});

console.log('\n🎉 All files processed!');
