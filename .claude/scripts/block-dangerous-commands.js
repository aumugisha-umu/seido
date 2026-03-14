// Block dangerous git and file operations
// Input: receives tool_input via stdin from Claude Code hooks
const input = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
const cmd = input.tool_input?.command || '';

const BLOCKED_PATTERNS = [
  /git\s+push\s+--force\s+(origin\s+)?(main|master)/i,
  /git\s+reset\s+--hard/i,
  /rm\s+-rf\s+\//,
  /rm\s+-rf\s+\.\s*$/,
  /git\s+branch\s+-D\s+(main|master)/i,
];

const blocked = BLOCKED_PATTERNS.find(p => p.test(cmd));
if (blocked) {
  console.error(`BLOCKED: Dangerous command detected. Pattern: ${blocked}`);
  process.exit(1);
}

// Check for secret file modifications
const SECRET_FILES = ['.env', '.env.local', '.env.production', 'credentials.json'];
const isSecretWrite = SECRET_FILES.some(f => cmd.includes(f) && (cmd.includes('cat') || cmd.includes('echo') || cmd.includes('>')));
if (isSecretWrite) {
  console.error(`BLOCKED: Potential secret file modification: ${cmd}`);
  process.exit(1);
}

process.exit(0);
