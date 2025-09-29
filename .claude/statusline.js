const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Read JSON input from stdin
let input = '';
process.stdin.on('data', chunk => {
    input += chunk;
});

// Git utilities
function getGitInfo(workingDir) {
    try {
        const branch = execSync('git rev-parse --abbrev-ref HEAD', {
            cwd: workingDir,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore']
        }).trim();

        const status = execSync('git status --porcelain', {
            cwd: workingDir,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore']
        }).trim();

        const lines = status.split('\n').filter(line => line.trim());

        // Count files by category
        let stagedCount = 0;
        let modifiedCount = 0;
        let untrackedCount = 0;

        lines.forEach(line => {
            const indexStatus = line[0];
            const workingTreeStatus = line[1];

            if (indexStatus && indexStatus !== ' ' && indexStatus !== '?') {
                stagedCount++;
            } else if (workingTreeStatus && workingTreeStatus !== ' ' && workingTreeStatus !== '?') {
                modifiedCount++;
            } else if (line.startsWith('??')) {
                untrackedCount++;
            }
        });

        const modifiedFiles = lines.length;
        const hasUntracked = untrackedCount > 0;
        const hasModified = modifiedCount > 0;
        const hasStaged = stagedCount > 0;

        // Check if ahead/behind remote
        let aheadBehind = '';
        try {
            const tracking = execSync('git status -b --porcelain', {
                cwd: workingDir,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore']
            });

            const branchLine = tracking.split('\n')[0];
            if (branchLine.includes('[ahead')) {
                const match = branchLine.match(/\[ahead (\d+)/);
                if (match) aheadBehind += `↑${match[1]}`;
            }
            if (branchLine.includes('[behind')) {
                const match = branchLine.match(/behind (\d+)/);
                if (match) aheadBehind += `↓${match[1]}`;
            }
        } catch (e) {}

        return {
            branch,
            modifiedFiles,
            stagedCount,
            modifiedCount,
            untrackedCount,
            hasUntracked,
            hasModified,
            hasStaged,
            aheadBehind,
            isClean: modifiedFiles === 0
        };
    } catch (error) {
        return null;
    }
}

// Check development processes
function getDevProcesses() {
    try {
        // Count Node.js processes
        const nodeProcesses = execSync('tasklist /fi "imagename eq node.exe" /fo csv', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore']
        });
        const nodeCount = Math.max(0, nodeProcesses.split('\n').length - 2); // minus header and empty line

        // Count Bash processes (cmd.exe, powershell.exe, bash.exe)
        let bashCount = 0;
        try {
            const cmdProcesses = execSync('tasklist /fi "imagename eq cmd.exe" /fo csv', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore']
            });
            bashCount += Math.max(0, cmdProcesses.split('\n').length - 2);

            const powershellProcesses = execSync('tasklist /fi "imagename eq powershell.exe" /fo csv', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore']
            });
            bashCount += Math.max(0, powershellProcesses.split('\n').length - 2);

            const bashProcesses = execSync('tasklist /fi "imagename eq bash.exe" /fo csv', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore']
            });
            bashCount += Math.max(0, bashProcesses.split('\n').length - 2);
        } catch (e) {}

        return {
            nodeCount,
            bashCount,
            nodeRunning: nodeCount > 0,
            bashRunning: bashCount > 0
        };
    } catch (error) {
        return { nodeCount: 0, bashCount: 0, nodeRunning: false, bashRunning: false };
    }
}

// Check if TypeScript/build has errors
function getBuildStatus(workingDir) {
    // Check for common error indicators
    const tsConfigExists = fs.existsSync(path.join(workingDir, 'tsconfig.json'));
    const packageJson = path.join(workingDir, 'package.json');

    if (!fs.existsSync(packageJson)) {
        return { hasTypeScript: false, buildable: false };
    }

    try {
        const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
        const hasTestScript = !!pkg.scripts?.test;
        const hasLintScript = !!pkg.scripts?.lint;
        const hasBuildScript = !!pkg.scripts?.build;

        return {
            hasTypeScript: tsConfigExists,
            buildable: hasBuildScript,
            testable: hasTestScript,
            lintable: hasLintScript,
            isNextApp: !!pkg.dependencies?.next,
            hasSupabase: !!(pkg.dependencies?.['@supabase/supabase-js'] || pkg.dependencies?.['@supabase/ssr'])
        };
    } catch (error) {
        return { hasTypeScript: false, buildable: false };
    }
}

process.stdin.on('end', () => {
    try {
        const data = JSON.parse(input);

        // Extract information from the JSON
        const username = os.userInfo().username;
        const workingDir = data.workspace?.current_dir || process.cwd();
        const currentDir = path.basename(workingDir);
        const model = data.model?.display_name || 'Claude';
        const style = data.output_style?.name || 'Default';

        // Get comprehensive project info
        const gitInfo = getGitInfo(workingDir);
        const devProcesses = getDevProcesses();
        const buildStatus = getBuildStatus(workingDir);

        // Color codes - Vivid and saturated
        const dim = '\x1b[2m';
        const bright = '\x1b[1m';
        const cyan = '\x1b[38;5;51m';        // Electric blue/cyan
        const magenta = '\x1b[38;5;201m';    // Hot pink/magenta
        const yellow = '\x1b[38;5;226m';     // Bright yellow
        const green = '\x1b[38;5;46m';       // Electric green
        const red = '\x1b[38;5;196m';        // Bright red
        const blue = '\x1b[38;5;33m';        // Vivid blue
        const orange = '\x1b[38;5;208m';     // Orange
        const reset = '\x1b[0m';

        // Build enhanced status line
        let statusLine = `${dim}${username}${reset} ${cyan}${currentDir}${reset}`;

        // Git information with enhanced details
        if (gitInfo) {
            const branchColor = gitInfo.isClean ? green : (gitInfo.hasStaged ? yellow : red);
            statusLine += ` ${dim}(${reset}${branchColor}${gitInfo.branch}${reset}`;

            // Git status indicators
            if (gitInfo.aheadBehind) {
                statusLine += `${blue}${gitInfo.aheadBehind}${reset}`;
            }

            if (!gitInfo.isClean) {
                const indicators = [];
                if (gitInfo.stagedCount > 0) indicators.push(`${green}${gitInfo.stagedCount} staged${reset}`);
                if (gitInfo.modifiedCount > 0) indicators.push(`${yellow}${gitInfo.modifiedCount} edit${reset}`);
                if (gitInfo.untrackedCount > 0) indicators.push(`${red}${gitInfo.untrackedCount} new${reset}`);

                if (indicators.length > 0) {
                    statusLine += `${dim}: ${reset}${indicators.join(`${dim} x ${reset}`)}`;
                }
            } else {
                statusLine += `${green}✓${reset}`;
            }

            statusLine += `${dim})${reset}`;
        }

        // Development environment indicators with proper spacing
        const indicators = [];

        // Process count indicators with clear labels
        if (devProcesses.nodeCount > 0) {
            indicators.push(`${green}⚡node${reset}${dim}:${reset}${green}${devProcesses.nodeCount}${reset}`);
        }

        if (devProcesses.bashCount > 0) {
            indicators.push(`${blue}$bash${reset}${dim}:${reset}${blue}${devProcesses.bashCount}${reset}`);
        }

        // Add indicators to status line with proper spacing
        if (indicators.length > 0) {
            statusLine += ` ${dim}[${reset}${indicators.join(`${dim} | ${reset}`)}${dim}]${reset}`;
        }

        // Model and style info
        statusLine += ` ${dim}|${reset} ${magenta}${model}${reset} ${dim}|${reset} ${yellow}${style}${reset}`;

        process.stdout.write(statusLine);
    } catch (error) {
        // Enhanced fallback
        const username = os.userInfo().username;
        const workingDir = process.cwd();
        const currentDir = path.basename(workingDir);
        const gitInfo = getGitInfo(workingDir);
        const devProcesses = getDevProcesses();

        let fallbackStatus = `${username} ${currentDir}`;

        if (gitInfo) {
            fallbackStatus += ` (${gitInfo.branch}`;
            if (!gitInfo.isClean) {
                const indicators = [];
                if (gitInfo.stagedCount > 0) indicators.push(`${gitInfo.stagedCount} staged`);
                if (gitInfo.modifiedCount > 0) indicators.push(`${gitInfo.modifiedCount} edit`);
                if (gitInfo.untrackedCount > 0) indicators.push(`${gitInfo.untrackedCount} new`);

                if (indicators.length > 0) {
                    fallbackStatus += `: ${indicators.join(' x ')}`;
                }
            } else {
                fallbackStatus += ' ✓';
            }
            fallbackStatus += ')';
        }

        const fallbackIndicators = [];

        if (devProcesses.nodeRunning) {
            fallbackIndicators.push(`⚡node:${devProcesses.nodeCount}`);
        }

        if (devProcesses.bashRunning) {
            fallbackIndicators.push(`$bash:${devProcesses.bashCount}`);
        }

        if (fallbackIndicators.length > 0) {
            fallbackStatus += ` [${fallbackIndicators.join(' | ')}]`;
        }

        process.stdout.write(fallbackStatus);
    }
});