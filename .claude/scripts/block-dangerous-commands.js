#!/usr/bin/env node
// Block dangerous git and file operations
// Input: receives tool_input via stdin from Claude Code hooks
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const cmd = data.tool_input?.command || '';

    const BLOCKED_PATTERNS = [
      /git\s+push\s+--force\s+(origin\s+)?(main|master|preview)/i,
      /git\s+reset\s+--hard/i,
      /rm\s+-rf\s+\//,
      /rm\s+-rf\s+\.\s*$/,
      /git\s+branch\s+-D\s+(main|master|preview)/i,
    ];

    const blocked = BLOCKED_PATTERNS.find(p => p.test(cmd));
    if (blocked) {
      console.error(`BLOCKED: Dangerous command detected. Pattern: ${blocked}`);
      process.exit(2); // exit 2 = block action (Claude Code spec)
    }

    // Check for secret file modifications via bash
    const SECRET_FILES = ['.env', '.env.local', '.env.production', '.env.production.local', 'credentials.json'];
    const isSecretWrite = SECRET_FILES.some(f => cmd.includes(f) && (cmd.includes('cat') || cmd.includes('echo') || cmd.includes('>')));
    if (isSecretWrite) {
      console.error(`BLOCKED: Potential secret file modification: ${cmd}`);
      process.exit(2);
    }

    process.exit(0);
  } catch {
    process.exit(0);
  }
});
