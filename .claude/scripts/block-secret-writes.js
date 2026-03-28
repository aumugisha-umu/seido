#!/usr/bin/env node
// Block writes to sensitive files
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path || '';

    const BLOCKED_PATTERNS = [
      /\.env($|\.)/,
      /credentials\.json$/,
      /\.pem$/,
      /\.key$/,
      /secrets?\./i,
    ];

    const blocked = BLOCKED_PATTERNS.find(p => p.test(filePath));
    if (blocked) {
      console.error(`BLOCKED: Write to sensitive file: ${filePath}`);
      process.exit(2); // exit 2 = block action (Claude Code spec)
    }

    process.exit(0);
  } catch {
    process.exit(0);
  }
});
