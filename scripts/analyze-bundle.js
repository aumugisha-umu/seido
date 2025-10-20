#!/usr/bin/env node

/**
 * Script d'analyse du bundle SEIDO pour Phase 2
 * Objectif: Réduire le bundle size de 45% (2.4MB → 1.3MB)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 SEIDO Bundle Analysis - Phase 2 Optimization');
console.log('================================================\n');

// Fonction pour analyser la taille d'un fichier
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (e) {
    return 0;
  }
}

// Fonction pour formater la taille
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Analyser le dossier .next/static
function analyzeStaticBundle() {
  const staticDir = path.join(process.cwd(), '.next', 'static');
  const results = {
    chunks: [],
    css: [],
    media: [],
    total: 0
  };

  if (!fs.existsSync(staticDir)) {
    console.log('❌ Build directory not found. Run `npm run build` first.');
    return results;
  }

  // Parcourir les chunks
  const chunksDir = path.join(staticDir, 'chunks');
  if (fs.existsSync(chunksDir)) {
    const files = fs.readdirSync(chunksDir);
    files.forEach(file => {
      const filePath = path.join(chunksDir, file);
      const size = getFileSize(filePath);
      if (size > 0) {
        results.chunks.push({ name: file, size, path: filePath });
        results.total += size;
      }
    });
  }

  // Parcourir les CSS
  const cssDir = path.join(staticDir, 'css');
  if (fs.existsSync(cssDir)) {
    const files = fs.readdirSync(cssDir);
    files.forEach(file => {
      const filePath = path.join(cssDir, file);
      const size = getFileSize(filePath);
      if (size > 0) {
        results.css.push({ name: file, size, path: filePath });
        results.total += size;
      }
    });
  }

  return results;
}

// Analyser les pages
function analyzePages() {
  const serverDir = path.join(process.cwd(), '.next', 'server', 'app');
  const results = {
    pages: [],
    totalSize: 0
  };

  if (!fs.existsSync(serverDir)) {
    return results;
  }

  function walkDir(dir, prefix = '') {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        walkDir(filePath, path.join(prefix, file));
      } else if (file.endsWith('.html') || file.endsWith('.js')) {
        const size = stats.size;
        results.pages.push({
          name: path.join(prefix, file),
          size,
          path: filePath
        });
        results.totalSize += size;
      }
    });
  }

  walkDir(serverDir);
  return results;
}

// Analyser les dépendances node_modules utilisées
function analyzeDependencies() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = packageJson.dependencies || {};

  const heavyDeps = [];
  const radixPackages = [];

  Object.keys(deps).forEach(dep => {
    if (dep.startsWith('@radix-ui/')) {
      radixPackages.push(dep);
    }

    // Identifier les dépendances potentiellement lourdes
    if (['recharts', 'date-fns', '@supabase/supabase-js', 'react-hook-form'].includes(dep)) {
      heavyDeps.push({
        name: dep,
        version: deps[dep]
      });
    }
  });

  return { heavyDeps, radixPackages, totalDeps: Object.keys(deps).length };
}

// Rapport principal
console.log('📊 Bundle Analysis Report\n');

// 1. Analyser le bundle statique
const staticAnalysis = analyzeStaticBundle();
console.log('📦 Static Bundle Analysis:');
console.log('-------------------------');

// Trier les chunks par taille
staticAnalysis.chunks.sort((a, b) => b.size - a.size);

// Afficher les 10 plus gros chunks
console.log('\n🔹 Top 10 Largest Chunks:');
staticAnalysis.chunks.slice(0, 10).forEach((chunk, i) => {
  const isVendor = chunk.name.includes('vendor');
  const isUI = chunk.name.includes('ui-components');
  const marker = isVendor ? '⚠️' : isUI ? '🎨' : '  ';
  console.log(`${marker} ${i + 1}. ${chunk.name}: ${formatSize(chunk.size)}`);
});

console.log(`\n📈 Total Static Size: ${formatSize(staticAnalysis.total)}`);

// 2. Analyser les pages
const pagesAnalysis = analyzePages();
console.log('\n📄 Pages Analysis:');
console.log('------------------');

// Trier les pages par taille
pagesAnalysis.pages.sort((a, b) => b.size - a.size);

// Afficher les 5 plus grosses pages
console.log('Top 5 Largest Pages:');
pagesAnalysis.pages.slice(0, 5).forEach((page, i) => {
  console.log(`   ${i + 1}. ${page.name}: ${formatSize(page.size)}`);
});

console.log(`\nTotal Pages Size: ${formatSize(pagesAnalysis.totalSize)}`);

// 3. Analyser les dépendances
const depsAnalysis = analyzeDependencies();
console.log('\n📚 Dependencies Analysis:');
console.log('------------------------');
console.log(`Total dependencies: ${depsAnalysis.totalDeps}`);
console.log(`Radix UI packages: ${depsAnalysis.radixPackages.length}`);

console.log('\n⚠️ Potentially Heavy Dependencies:');
depsAnalysis.heavyDeps.forEach(dep => {
  console.log(`   - ${dep.name} (${dep.version})`);
});

// 4. Recommandations d'optimisation
console.log('\n\n🎯 Optimization Recommendations:');
console.log('================================\n');

const recommendations = [];

// Check vendor bundle
const vendorChunk = staticAnalysis.chunks.find(c => c.name.includes('vendor'));
if (vendorChunk && vendorChunk.size > 300000) {
  recommendations.push({
    priority: 'HIGH',
    issue: `Vendor bundle too large (${formatSize(vendorChunk.size)})`,
    solution: 'Split vendor chunks by frequency of use, lazy load heavy libraries'
  });
}

// Check UI components bundle
const uiChunk = staticAnalysis.chunks.find(c => c.name.includes('ui-components'));
if (uiChunk && uiChunk.size > 150000) {
  recommendations.push({
    priority: 'MEDIUM',
    issue: `UI components bundle large (${formatSize(uiChunk.size)})`,
    solution: 'Tree-shake unused Radix components, use dynamic imports for heavy UI'
  });
}

// Check Radix packages
if (depsAnalysis.radixPackages.length > 20) {
  recommendations.push({
    priority: 'MEDIUM',
    issue: `Too many Radix packages (${depsAnalysis.radixPackages.length})`,
    solution: 'Review and remove unused Radix UI packages'
  });
}

// Check for recharts
if (depsAnalysis.heavyDeps.find(d => d.name === 'recharts')) {
  recommendations.push({
    priority: 'HIGH',
    issue: 'Recharts is very heavy (~500KB)',
    solution: 'Consider lighter alternatives like visx or chart.js for simple charts'
  });
}

// Check for date-fns
if (depsAnalysis.heavyDeps.find(d => d.name === 'date-fns')) {
  recommendations.push({
    priority: 'LOW',
    issue: 'date-fns can be optimized',
    solution: 'Import only needed functions, not entire library'
  });
}

// Afficher les recommandations
recommendations.sort((a, b) => {
  const priority = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return priority[a.priority] - priority[b.priority];
});

recommendations.forEach((rec, i) => {
  const icon = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
  console.log(`${icon} ${i + 1}. [${rec.priority}] ${rec.issue}`);
  console.log(`      Solution: ${rec.solution}\n`);
});

// 5. Estimated savings
console.log('\n💰 Estimated Savings:');
console.log('--------------------');

let potentialSavings = 0;

// Vendor optimization
if (vendorChunk && vendorChunk.size > 300000) {
  const saving = vendorChunk.size * 0.3; // 30% reduction possible
  potentialSavings += saving;
  console.log(`   Vendor optimization: -${formatSize(saving)}`);
}

// UI components optimization
if (uiChunk && uiChunk.size > 150000) {
  const saving = uiChunk.size * 0.4; // 40% reduction possible
  potentialSavings += saving;
  console.log(`   UI tree-shaking: -${formatSize(saving)}`);
}

// Recharts replacement
if (depsAnalysis.heavyDeps.find(d => d.name === 'recharts')) {
  const saving = 450000; // ~450KB saving
  potentialSavings += saving;
  console.log(`   Recharts replacement: -${formatSize(saving)}`);
}

// Dynamic imports
const dynamicImportSaving = staticAnalysis.total * 0.15; // 15% via dynamic imports
potentialSavings += dynamicImportSaving;
console.log(`   Dynamic imports: -${formatSize(dynamicImportSaving)}`);

console.log('\n📊 Summary:');
console.log(`   Current total size: ${formatSize(staticAnalysis.total)}`);
console.log(`   Potential savings: -${formatSize(potentialSavings)}`);
console.log(`   Target size: ${formatSize(staticAnalysis.total - potentialSavings)}`);
console.log(`   Reduction: ${Math.round((potentialSavings / staticAnalysis.total) * 100)}%`);

// 6. Action plan
console.log('\n\n📋 Immediate Action Plan:');
console.log('========================\n');

const actions = [
  '1. Install and configure @next/bundle-analyzer for detailed visualization',
  '2. Replace recharts with lightweight chart library (visx or chart.js)',
  '3. Implement dynamic imports for all dashboard components',
  '4. Tree-shake Radix UI - remove unused packages',
  '5. Configure Webpack SplitChunks for better code splitting',
  '6. Optimize Supabase imports - use modular imports',
  '7. Enable SWC minification and compression',
  '8. Review and remove unused dependencies'
];

actions.forEach(action => {
  console.log(`   ✅ ${action}`);
});

console.log('\n✨ Run this script after each optimization to track progress!');
console.log('   Usage: node scripts/analyze-bundle.js\n');