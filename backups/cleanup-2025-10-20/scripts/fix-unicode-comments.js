const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files that are known to have build issues
const problematicFiles = [
  'app/gestionnaire/biens/immeubles/[id]/page.tsx',
  'app/gestionnaire/biens/immeubles/nouveau/page.tsx'
];

function cleanComments(content) {
  // Replace accented characters in comments with ASCII equivalents
  return content
    // Replace in single-line comments
    .replace(/(\/\/[^\n]*)/g, (match) => {
      return match
        .replace(/é/g, 'e')
        .replace(/è/g, 'e')
        .replace(/ê/g, 'e')
        .replace(/à/g, 'a')
        .replace(/ù/g, 'u')
        .replace(/ô/g, 'o')
        .replace(/î/g, 'i')
        .replace(/ç/g, 'c')
        .replace(/É/g, 'E')
        .replace(/È/g, 'E')
        .replace(/À/g, 'A');
    })
    // Replace in multi-line comments
    .replace(/(\/\*[\s\S]*?\*\/)/g, (match) => {
      return match
        .replace(/é/g, 'e')
        .replace(/è/g, 'e')
        .replace(/ê/g, 'e')
        .replace(/à/g, 'a')
        .replace(/ù/g, 'u')
        .replace(/ô/g, 'o')
        .replace(/î/g, 'i')
        .replace(/ç/g, 'c')
        .replace(/É/g, 'E')
        .replace(/È/g, 'E')
        .replace(/À/g, 'A');
    })
    // Replace in JSX comments
    .replace(/(\{\/\*[\s\S]*?\*\/\})/g, (match) => {
      return match
        .replace(/é/g, 'e')
        .replace(/è/g, 'e')
        .replace(/ê/g, 'e')
        .replace(/à/g, 'a')
        .replace(/ù/g, 'u')
        .replace(/ô/g, 'o')
        .replace(/î/g, 'i')
        .replace(/ç/g, 'c')
        .replace(/É/g, 'E')
        .replace(/È/g, 'E')
        .replace(/À/g, 'A');
    });
}

let totalFixed = 0;

problematicFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixed = cleanComments(content);

    if (content !== fixed) {
      fs.writeFileSync(filePath, fixed, 'utf8');
      console.log(`✅ Cleaned comments in: ${file}`);
      totalFixed++;
    } else {
      console.log(`⏭️  No problematic comments in: ${file}`);
    }
  } else {
    console.log(`❌ File not found: ${file}`);
  }
});

console.log(`\n✨ Fixed ${totalFixed} files with problematic comments`);