const fs = require('fs');
const path = require('path');

// Files with HTML entity issues identified
const filesToFix = [
  'app/gestionnaire/contacts/modifier/[id]/page.tsx',
  'app/gestionnaire/interventions/nouvelle-intervention/page.tsx'
];

function fixHtmlEntities(content) {
  // Replace HTML entities with actual characters
  return content
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

let totalFixed = 0;

filesToFix.forEach(file => {
  const filePath = path.join(process.cwd(), file);

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixed = fixHtmlEntities(content);

    if (content !== fixed) {
      fs.writeFileSync(filePath, fixed, 'utf8');
      console.log(`✅ Fixed HTML entities in: ${file}`);
      totalFixed++;
    } else {
      console.log(`⏭️  No entities to fix in: ${file}`);
    }
  } else {
    console.log(`❌ File not found: ${file}`);
  }
});

console.log(`\n✨ Fixed ${totalFixed} files with HTML entities`);