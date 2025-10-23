const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files with HTML entity issues identified
const filesToFix = [
  'components/intervention/finalization-tabs.tsx',
  'components/contact-form-modal.tsx',
  'app/gestionnaire/contacts/modifier/[id]/page.tsx',
  'app/gestionnaire/biens/immeubles/[id]/page.tsx',
  'app/gestionnaire/contacts/details/[id]/page.tsx',
  'app/debug/data/page.tsx',
  'app/test-finalization-mobile/page.tsx',
  'app/locataire/interventions/nouvelle-demande/page.tsx',
  'app/gestionnaire/interventions/nouvelle-intervention/page.tsx',
  'app/gestionnaire/contacts/page.tsx',
  'app/gestionnaire/biens/lots/nouveau/page.tsx',
  'app/debug/page.tsx',
  'components/quotes/quote-approval-modal.tsx',
  'components/quotes/integrated-quotes-card.tsx',
  'components/intervention/tenant-slot-confirmation-modal.tsx',
  'components/intervention/tenant-availability-input.tsx',
  'components/intervention/modals/quote-request-success-modal.tsx',
  'components/intervention/modals/quote-request-modal.tsx',
  'components/availability/availability-manager.tsx'
];

function fixHtmlEntities(content) {
  // Replace HTML entities with actual characters
  return content
    .replace(/"/g, '"')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/&/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

let totalFixed = 0;

filesToFix.forEach(file => {
  const filePath = path.join(process.cwd(), file);

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const originalLength = content.length;
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