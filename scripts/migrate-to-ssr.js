#!/usr/bin/env node

/**
 * Script de migration automatique vers la nouvelle architecture Supabase SSR
 *
 * Ce script :
 * 1. Identifie toutes les API routes qui utilisent Supabase
 * 2. Les migre pour utiliser la nouvelle structure SSR
 * 3. Met à jour les imports et la création du client
 */

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob').glob;

async function migrateApiRoute(filePath) {
  console.log(`📝 Processing: ${filePath}`);

  let content = await fs.readFile(filePath, 'utf-8');
  let modified = false;

  // Patterns à remplacer
  const replacements = [
    {
      // Import direct de createServerClient depuis @supabase/ssr
      pattern: /import\s*{\s*createServerClient\s*}\s*from\s*['"]@supabase\/ssr['"]/g,
      replacement: "import { createClient } from '@/utils/supabase/server'",
      description: 'Replace direct @supabase/ssr import'
    },
    {
      // Import de cookies depuis next/headers (à supprimer si on utilise notre helper)
      pattern: /import\s*{\s*cookies\s*}\s*from\s*['"]next\/headers['"]/g,
      replacement: '',
      description: 'Remove cookies import (handled by our helper)'
    },
    {
      // Import du type Database depuis lib
      pattern: /import\s+type\s*{\s*Database\s*}\s*from\s*['"]@\/lib\/database\.types['"]/g,
      replacement: '',
      description: 'Remove Database type import (included in server client)'
    },
    {
      // Création manuelle du client Supabase avec cookies
      pattern: /const\s+cookieStore\s*=\s*await?\s*cookies\(\)[\s\S]*?const\s+supabase\s*=\s*createServerClient<Database>\([\s\S]*?\)\s*\)/g,
      replacement: 'const supabase = createClient()',
      description: 'Replace manual client creation with helper'
    },
    {
      // Pattern alternatif pour la création du client
      pattern: /const\s+supabase\s*=\s*createServerClient<Database>\([\s\S]*?process\.env\.NEXT_PUBLIC_SUPABASE_URL[\s\S]*?\)\s*\)/g,
      replacement: 'const supabase = createClient()',
      description: 'Replace alternative client creation pattern'
    }
  ];

  // Appliquer les remplacements
  for (const { pattern, replacement, description } of replacements) {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`  ✅ ${description}`);
      content = content.replace(pattern, replacement);
      modified = true;
    }
  }

  // Nettoyer les imports vides ou les doubles lignes vides
  content = content
    .replace(/\nimport\s*{\s*}\s*from\s*['"][^'"]+['"]\s*\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  if (modified) {
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`  ✨ File migrated successfully`);
    return true;
  } else {
    console.log(`  ⏭️  No changes needed`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting migration to Supabase SSR architecture...\n');

  // Trouver toutes les API routes
  const apiRoutes = await glob('app/api/**/*.ts', {
    cwd: process.cwd(),
    absolute: true
  });

  console.log(`Found ${apiRoutes.length} API route files\n`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const routePath of apiRoutes) {
    const migrated = await migrateApiRoute(routePath);
    if (migrated) {
      migratedCount++;
    } else {
      skippedCount++;
    }
    console.log(''); // Ligne vide pour la lisibilité
  }

  console.log('✅ Migration complete!');
  console.log(`   - Migrated: ${migratedCount} files`);
  console.log(`   - Skipped: ${skippedCount} files`);

  console.log('\n📋 Next steps:');
  console.log('   1. Run "npm run build" to verify compilation');
  console.log('   2. Test authentication flows');
  console.log('   3. Verify database operations');
}

// Exécuter le script
main().catch(console.error);