#!/usr/bin/env node

/**
 * ESLint Auto-Fix Script - Utilise ESLint directement pour corriger automatiquement
 */

const { execSync } = require('child_process');
const fs = require('fs');

function runEslintAutofix() {
  console.log('🔧 Running ESLint auto-fix...');

  try {
    // Lancer ESLint avec autofix sur tous les fichiers
    console.log('📁 Running ESLint autofix on all TypeScript files...');

    execSync('npx eslint app/**/*.ts app/**/*.tsx components/**/*.ts components/**/*.tsx lib/**/*.ts --fix --quiet', {
      stdio: 'inherit',
      timeout: 300000 // 5 minutes max
    });

    console.log('✅ ESLint autofix completed successfully!');

    // Vérifier les erreurs restantes
    console.log('\n🔍 Checking remaining lint issues...');
    try {
      execSync('npm run lint', { stdio: 'inherit' });
      console.log('\n🎉 All lint issues resolved!');
    } catch (error) {
      console.log('\n⚠️  Some lint issues remain (see output above)');
    }

  } catch (error) {
    console.error('❌ ESLint autofix failed:', error.message);
    console.log('\nTrying alternative approach...');

    // Approche alternative : utiliser ESLint API
    runESLintAPI();
  }
}

function runESLintAPI() {
  console.log('🔧 Using ESLint API for more aggressive fixing...');

  const { ESLint } = require('eslint');

  async function main() {
    const eslint = new ESLint({
      fix: true,
      useEslintrc: true
    });

    const patterns = [
      'app/**/*.ts',
      'app/**/*.tsx',
      'components/**/*.ts',
      'components/**/*.tsx',
      'lib/**/*.ts'
    ];

    for (const pattern of patterns) {
      console.log(`Processing pattern: ${pattern}`);

      try {
        const results = await eslint.lintFiles([pattern]);

        // Apply fixes
        await ESLint.outputFixes(results);

        const fixedCount = results.filter(result => result.output).length;
        console.log(`✅ Fixed ${fixedCount} files in ${pattern}`);

      } catch (error) {
        console.error(`❌ Error with pattern ${pattern}:`, error.message);
      }
    }

    console.log('\n📊 ESLint API fixes applied!');
  }

  main().catch(console.error);
}

// Exécution
runEslintAutofix();