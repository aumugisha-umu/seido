/**
 * Session Startup Hook
 * Runs on every Claude Code session start.
 * Reads project context and prints a visible summary.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');

function readFileSafe(filePath, fallback = null) {
  try {
    return fs.readFileSync(path.resolve(ROOT, filePath), 'utf-8');
  } catch {
    return fallback;
  }
}

function execSafe(cmd, fallback = '') {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', timeout: 5000 }).trim();
  } catch {
    return fallback;
  }
}

function getFeatureStatus() {
  const prdRaw = readFileSafe('tasks/prd.json');
  if (!prdRaw) return null;

  try {
    const prd = JSON.parse(prdRaw);
    const stories = prd.userStories || [];
    const done = stories.filter(s => s.passes === true).length;
    const total = stories.length;
    const allDone = done === total;
    const nextStory = stories.find(s => !s.passes);

    return {
      name: prd.featureName || 'Unknown',
      status: prd.status || 'unknown',
      done,
      total,
      allDone,
      nextStory: nextStory ? `${nextStory.id}: ${nextStory.title}` : null,
    };
  } catch {
    return null;
  }
}

function getProgressTail() {
  const progress = readFileSafe('tasks/progress.txt');
  if (!progress) return null;

  const lines = progress.split('\n').filter(l => l.trim() && !l.startsWith('#') && l !== '---');
  return lines.slice(-3).join('\n');
}

function getActiveContext() {
  const ctx = readFileSafe('.claude/memory-bank/activeContext.md');
  if (!ctx) return null;

  // Extract first meaningful section (skip frontmatter)
  const lines = ctx.split('\n');
  const meaningful = [];
  let started = false;

  for (const line of lines) {
    if (line.startsWith('##') || line.startsWith('- ') || line.startsWith('* ')) {
      started = true;
    }
    if (started && meaningful.length < 5) {
      meaningful.push(line);
    }
  }

  return meaningful.length > 0 ? meaningful.join('\n') : null;
}

// Gather context
const branch = execSafe('git branch --show-current', 'unknown');
const commits = execSafe('git log --oneline -5', 'No commits');
const feature = getFeatureStatus();
const progressTail = getProgressTail();
const activeCtx = getActiveContext();

// Build summary
const lines = [];
lines.push('');
lines.push('━━━ SEIDO Session Context ━━━━━━━━━━━━━━━━━━━━');
lines.push(`Branch: ${branch}`);

if (feature) {
  const statusIcon = feature.allDone ? 'COMPLETE' : `${feature.done}/${feature.total}`;
  lines.push(`Feature: ${feature.name} [${statusIcon}]`);
  if (!feature.allDone && feature.nextStory) {
    lines.push(`Next story: ${feature.nextStory}`);
  }
  if (feature.allDone) {
    lines.push(`All stories passed — ready for git* or /compound`);
  }
} else {
  lines.push('Feature: No active prd.json');
}

lines.push('');
lines.push('Recent commits:');
commits.split('\n').slice(0, 3).forEach(c => {
  lines.push(`  ${c}`);
});

if (progressTail) {
  lines.push('');
  lines.push('Latest progress:');
  progressTail.split('\n').forEach(l => {
    lines.push(`  ${l.substring(0, 100)}`);
  });
}

if (activeCtx) {
  lines.push('');
  lines.push('Active context:');
  activeCtx.split('\n').slice(0, 3).forEach(l => {
    lines.push(`  ${l.substring(0, 100)}`);
  });
}

lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
lines.push('');

// Output to stdout — Claude Code captures this as hook message
console.log(lines.join('\n'));
