// Block writes to sensitive files
const input = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
const filePath = input.tool_input?.file_path || '';

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
  process.exit(1);
}

process.exit(0);
