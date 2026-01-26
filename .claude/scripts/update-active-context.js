#!/usr/bin/env node
/**
 * Stop Hook : Met à jour activeContext.md avec les changements de session
 *
 * QUAND : Quand Claude finit de répondre (événement Stop)
 * INPUT : Lit la queue dirty-files
 * OUTPUT : Met à jour activeContext.md, feedback si fichiers critiques
 *
 * Source: Basé sur les bonnes pratiques Claude Code hooks
 * https://code.claude.com/docs/en/hooks
 */
const fs = require('fs');
const path = require('path');

// Chemins vers les fichiers
const DIRTY_FILES_PATH = path.join(__dirname, '..', 'auto-memory', 'dirty-files');
const ACTIVE_CONTEXT_PATH = path.join(__dirname, '..', 'memory-bank', 'activeContext.md');
const LAST_SYNC_PATH = path.join(__dirname, '..', 'auto-memory', 'last-sync');

function main() {
  // Si le fichier dirty-files n'existe pas, on sort
  if (!fs.existsSync(DIRTY_FILES_PATH)) {
    process.exit(0);
  }

  // Lire le contenu de la queue
  const dirtyContent = fs.readFileSync(DIRTY_FILES_PATH, 'utf-8');
  const lines = dirtyContent.trim().split('\n').filter(Boolean);

  // Si pas de fichiers modifiés, on sort
  if (lines.length === 0) {
    process.exit(0);
  }

  // Parse et déduplique les fichiers
  // Format de chaque ligne: timestamp|severity|filePath
  const files = new Map();
  lines.forEach(line => {
    const [timestamp, severity, filePath] = line.split('|');
    if (filePath && !files.has(filePath)) {
      files.set(filePath, { timestamp, severity });
    }
  });

  // Compte les fichiers critiques
  const criticalCount = [...files.values()]
    .filter(f => f.severity === 'CRITICAL')
    .length;

  // Lire ou créer activeContext.md
  let content = fs.existsSync(ACTIVE_CONTEXT_PATH)
    ? fs.readFileSync(ACTIVE_CONTEXT_PATH, 'utf-8')
    : '# SEIDO Active Context\n\n## Files Recently Modified\n';

  // Préparer la nouvelle section
  const today = new Date().toISOString().split('T')[0];
  const time = new Date().toISOString().split('T')[1].split('.')[0];
  const filesList = [...files.keys()]
    .slice(0, 20)  // Limite à 20 fichiers
    .map(f => `- \`${f}\``)
    .join('\n');

  const newSection = `\n### ${today} ${time} (Auto-updated)\n${filesList}\n`;

  // Mettre à jour la section "Files Recently Modified"
  const marker = '## Files Recently Modified';
  if (content.includes(marker)) {
    const idx = content.indexOf(marker);
    const nextSection = content.indexOf('\n## ', idx + marker.length);
    const insertPoint = nextSection > 0 ? nextSection : content.length;
    content = content.slice(0, idx + marker.length) + newSection + content.slice(insertPoint);
  } else {
    content += `\n${marker}${newSection}`;
  }

  // Écrire le fichier mis à jour
  fs.writeFileSync(ACTIVE_CONTEXT_PATH, content);

  // Vider la queue et mettre à jour last-sync
  fs.writeFileSync(DIRTY_FILES_PATH, '');
  fs.writeFileSync(LAST_SYNC_PATH, new Date().toISOString());

  // Si des fichiers critiques ont été modifiés, donner du feedback
  // Le feedback est envoyé via stdout en JSON
  if (criticalCount > 0) {
    // Format de feedback officiel Claude Code
    // Source: https://code.claude.com/docs/en/hooks#hook-output
    console.log(JSON.stringify({
      continue: true,  // Continue normalement
      systemMessage: `Memory Bank: ${files.size} fichiers trackés (${criticalCount} critiques). activeContext.md mis à jour.`
    }));
  }

  process.exit(0);
}

main();
