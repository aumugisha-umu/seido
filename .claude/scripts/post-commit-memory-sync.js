#!/usr/bin/env node
/**
 * PostToolUse Hook : Trigger memory bank sync after git commit
 *
 * WHEN: After Bash tool use containing "git commit"
 * INPUT: JSON from stdin with tool_input.command
 * OUTPUT: systemMessage reminding Claude to sync memory bank
 *
 * This hook detects git commits and signals Claude to update
 * the memory bank files (activeContext, progress, techContext, productContext)
 */
const fs = require('fs');
const path = require('path');

const LAST_SYNC_PATH = path.join(__dirname, '..', 'auto-memory', 'last-sync');
const DIRTY_FILES_PATH = path.join(__dirname, '..', 'auto-memory', 'dirty-files');

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const command = data.tool_input?.command || '';

    // Only trigger on actual git commit commands (not git commit --amend checks, etc.)
    if (!command.includes('git commit') || command.includes('git commit --dry-run')) {
      process.exit(0);
    }

    // Check if the tool execution was successful (exit code 0)
    const exitCode = data.tool_result?.exit_code;
    if (exitCode !== undefined && exitCode !== 0) {
      process.exit(0);
    }

    // Read dirty files to see what was changed
    let changedFiles = [];
    if (fs.existsSync(DIRTY_FILES_PATH)) {
      const content = fs.readFileSync(DIRTY_FILES_PATH, 'utf-8').trim();
      if (content) {
        changedFiles = content.split('\n')
          .filter(Boolean)
          .map(line => {
            const parts = line.split('|');
            return { severity: parts[1], path: parts[2] };
          });
      }
    }

    const criticalCount = changedFiles.filter(f => f.severity === 'CRITICAL').length;
    const totalCount = changedFiles.length;

    // Update last-sync timestamp
    fs.writeFileSync(LAST_SYNC_PATH, new Date().toISOString());

    // Clear dirty files queue (committed = synced)
    fs.writeFileSync(DIRTY_FILES_PATH, '');

    // Output systemMessage to remind Claude to sync memory bank
    if (criticalCount > 0 || totalCount >= 5) {
      console.log(JSON.stringify({
        continue: true,
        systemMessage: `[Memory Bank Auto-Sync] Commit detected with ${totalCount} tracked files (${criticalCount} critical). Update memory bank files if significant changes were made: activeContext.md, progress.md, techContext.md, productContext.md.`
      }));
    }

    process.exit(0);
  } catch {
    process.exit(0);
  }
});
