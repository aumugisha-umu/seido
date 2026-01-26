#!/usr/bin/env node
/**
 * PostToolUse Hook : Track les fichiers modifiés silencieusement
 *
 * QUAND : Après chaque utilisation des outils Edit ou Write
 * INPUT : JSON depuis stdin contenant tool_input.file_path
 * OUTPUT : Ajoute une entrée dans dirty-files (coût: 0 tokens)
 *
 * Source: Inspiré de claude-code-auto-memory
 * https://deepwiki.com/severity1/claude-code-auto-memory
 */
const fs = require('fs');
const path = require('path');

// Chemin vers la queue des fichiers modifiés
const DIRTY_FILES_PATH = path.join(__dirname, '..', 'auto-memory', 'dirty-files');

// Patterns des fichiers "critiques" qui nécessitent attention
// Ces fichiers sont importants pour l'architecture SEIDO et devraient
// déclencher une mise à jour du memory bank
const CRITICAL_PATTERNS = [
  'lib/services/',           // Services et repositories
  'supabase/migrations/',    // Migrations DB
  'app/api/',                // Routes API
  'app/actions/',            // Server Actions
  'components/',             // Composants UI
  'hooks/',                  // Hooks React
  'lib/database.types.ts',   // Types Supabase générés
  'app/globals.css',         // Design tokens
  'lib/server-context.ts',   // Auth context
  'contexts/'                // React contexts
];

// Lecture du JSON depuis stdin (format Claude Code)
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    // Parse le JSON envoyé par Claude Code
    // Format: { tool_input: { file_path: "..." } }
    const data = JSON.parse(input);
    const filePath = data.tool_input?.file_path;

    // Si pas de chemin de fichier, on sort silencieusement
    if (!filePath) {
      process.exit(0);  // Exit code 0 = succès
    }

    // Normalise le chemin (remplace les backslashes Windows)
    const normalizedPath = filePath.replace(/\\/g, '/');

    // Vérifie si le fichier est "critique"
    const isCritical = CRITICAL_PATTERNS.some(pattern =>
      normalizedPath.includes(pattern)
    );

    // Crée l'entrée avec timestamp et sévérité
    const timestamp = new Date().toISOString();
    const severity = isCritical ? 'CRITICAL' : 'NORMAL';
    const entry = `${timestamp}|${severity}|${normalizedPath}\n`;

    // Ajoute à la queue (append, pas overwrite)
    fs.appendFileSync(DIRTY_FILES_PATH, entry);

    // Exit code 0 = succès, l'action continue
    process.exit(0);

  } catch (error) {
    // En cas d'erreur, on échoue silencieusement
    // (on ne veut pas bloquer le workflow de l'utilisateur)
    process.exit(0);
  }
});
