const fs = require('fs');

const content = fs.readFileSync('./app/gestionnaire/interventions/[id]/page.tsx', 'utf8');
const lines = content.split('\n');
const line = lines[460]; // Line 461 (0-indexed)

console.log('Line 461 full:');
console.log(JSON.stringify(line));
console.log('\nCharacters around position 89-103:');

for(let i = 80; i < Math.min(line.length, 110); i++) {
  const char = line[i];
  const code = line.charCodeAt(i);
  console.log(`${i}: '${char}' (code: ${code})`);
}