#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Extract file paths and line numbers from lint warnings
const lintWarnings = fs.readFileSync('lint-warnings.txt', 'utf8');
const lines = lintWarnings.split('\n');

const entitiesToFix = [];

lines.forEach(line => {
  // Match pattern like: ./app/auth/callback/page.tsx
  // 172:37  Warning: `'` can be escaped with `&apos;`, `&lsquo;`, `&#39;`, `&rsquo;`.
  const match = line.match(/^\.\/(.+)$/);
  if (match) {
    const filePath = match[1];
    const nextLine = lines[lines.indexOf(line) + 1];
    if (nextLine) {
      const posMatch = nextLine.match(/^(\d+):(\d+)\s+Warning:\s+`(.)` can be escaped with/);
      if (posMatch) {
        entitiesToFix.push({
          file: filePath,
          line: parseInt(posMatch[1]),
          column: parseInt(posMatch[2]),
          char: posMatch[3]
        });
      }
    }
  }
});

// Group by file
const fileGroups = {};
entitiesToFix.forEach(item => {
  if (!fileGroups[item.file]) {
    fileGroups[item.file] = [];
  }
  fileGroups[item.file].push(item);
});

// Process each file
Object.entries(fileGroups).forEach(([relPath, warnings]) => {
  const filePath = path.join(process.cwd(), relPath);

  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Sort warnings by line and column in reverse order (process from end to start)
  warnings.sort((a, b) => {
    if (b.line === a.line) {
      return b.column - a.column;
    }
    return b.line - a.line;
  });

  warnings.forEach(warning => {
    const lineIndex = warning.line - 1;
    if (lines[lineIndex]) {
      let line = lines[lineIndex];
      const charIndex = warning.column - 1;

      // Check if this is inside JSX
      if (line.includes('>') && line.includes('<')) {
        // Replace the character with its escaped version
        if (warning.char === "'") {
          line = line.substring(0, charIndex) + '&apos;' + line.substring(charIndex + 1);
        } else if (warning.char === '"') {
          line = line.substring(0, charIndex) + '&quot;' + line.substring(charIndex + 1);
        }
        lines[lineIndex] = line;
      }
    }
  });

  const newContent = lines.join('\n');
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Fixed ${warnings.length} unescaped entities in ${relPath}`);
  }
});

console.log('Unescaped entities fix complete!');