#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Fix unused variables by removing them
const fixes = [
  // Remove unused variables assignments
  {
    file: 'app/gestionnaire/biens/immeubles/nouveau/page.tsx',
    replacements: [
      { old: 'const _removeContact = ', new: '// const _removeContact = ' },
      { old: 'const _assignContactToLot = ', new: '// const _assignContactToLot = ' },
      { old: 'const _getContactsByType = ', new: '// const _getContactsByType = ' },
      { old: 'const _getTotalStats = ', new: '// const _getTotalStats = ' },
      { old: 'const _getProgressPercentage = ', new: '// const _getProgressPercentage = ' }
    ]
  },
  {
    file: 'app/gestionnaire/biens/lots/modifier/[id]/page.tsx',
    replacements: [
      { old: 'const _hasTeam = ', new: '// const hasTeam = ' },
      { old: 'const [selectedManagerId, setSelectedManagerId] = ', new: '// const [selectedManagerId, setSelectedManagerId] = ' }
    ]
  },
  {
    file: 'app/gestionnaire/contacts/modifier/[id]/page.tsx',
    replacements: [
      { old: 'const getRoleLabel = ', new: '// const getRoleLabel = ' },
      { old: 'const getSpecialityLabel = ', new: '// const getSpecialityLabel = ' },
      { old: 'let result = ', new: 'const result = ' }
    ]
  },
  {
    file: 'app/gestionnaire/contacts/page.tsx',
    replacements: [
      { old: 'const handleDeleteContact = ', new: '// const handleDeleteContact = ' }
    ]
  },
  {
    file: 'app/gestionnaire/interventions/nouvelle-intervention/page.tsx',
    replacements: [
      { old: 'const [countdown, setCountdown] = ', new: 'const [countdown] = ' },
      { old: 'const [createdInterventionId, setCreatedInterventionId] = ', new: 'const [createdInterventionId] = ' },
      { old: 'const { toast } = ', new: '// const { toast } = ' },
      { old: 'const addAvailability = ', new: '// const addAvailability = ' },
      { old: 'const handleSubmit = ', new: '// const handleSubmit = ' },
      { old: 'const { createServerStatsService } = ', new: '// const { createServerStatsService } = ' },
      { old: 'const getRelatedContacts = ', new: '// const getRelatedContacts = ' }
    ]
  },
  {
    file: 'app/locataire/interventions/nouvelle-demande/page.tsx',
    replacements: [
      { old: 'const selectedLotData = ', new: '// const selectedLotData = ' }
    ]
  }
];

// Fix React hooks dependencies
const hooksFixes = [
  {
    file: 'app/gestionnaire/biens/immeubles/modifier/[id]/page.tsx',
    replacements: [
      {
        old: '}, [])',
        new: '}, [loadBuildingData])',
        context: 'useEffect(() => {'
      }
    ]
  },
  {
    file: 'app/gestionnaire/biens/immeubles/[id]/page.tsx',
    replacements: [
      {
        old: '}, [id])',
        new: '}, [id, loadBuildingData])',
        context: 'loadBuildingData'
      },
      {
        old: '}, [building?.id])',
        new: '}, [building?.id, loadInterventionsWithDocuments])',
        context: 'loadInterventionsWithDocuments'
      }
    ]
  },
  {
    file: 'app/gestionnaire/contacts/modifier/[id]/page.tsx',
    replacements: [
      {
        old: '}, [id])',
        new: '}, [id, loadContact, loadInvitationStatus])',
        context: 'loadContact'
      }
    ]
  }
];

// Process unused variables fixes
console.log('🔧 Removing unused variables...\n');
let totalFixed = 0;

fixes.forEach(({ file, replacements }) => {
  const fullPath = path.join(__dirname, '..', file);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changesMade = 0;

  replacements.forEach(({ old, new: newValue }) => {
    if (content.includes(old)) {
      content = content.replace(old, newValue);
      changesMade++;
      totalFixed++;
    }
  });

  if (changesMade > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed ${changesMade} issues in ${file}`);
  }
});

// Remove completely unused imports
const unusedImports = [
  {
    file: 'app/api/intervention-quote-request/route.ts',
    imports: ['createServerUserService']
  },
  {
    file: 'app/gestionnaire/biens/lots/nouveau/page.tsx',
    imports: ['TeamMember']
  },
  {
    file: 'app/locataire/interventions/nouvelle-demande/page.tsx',
    imports: ['useToast']
  },
  {
    file: 'app/locataire/interventions/[id]/page.tsx',
    imports: ['Badge']
  }
];

console.log('\n🔧 Removing completely unused imports...\n');

unusedImports.forEach(({ file, imports }) => {
  const fullPath = path.join(__dirname, '..', file);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  const filteredLines = lines.filter(line => {
    // Check if this line contains any of the unused imports
    for (const imp of imports) {
      if (line.includes(`import`) && line.includes(imp)) {
        console.log(`  Removing import: ${imp} from ${file}`);
        totalFixed++;
        return false;
      }
    }
    return true;
  });

  const newContent = filteredLines.join('\n');
  if (newContent !== content) {
    fs.writeFileSync(fullPath, newContent, 'utf8');
    console.log(`✅ Cleaned imports in ${file}`);
  }
});

console.log(`\n✨ Total fixes applied: ${totalFixed}`);
console.log('\n✅ Remaining warnings cleanup complete!');