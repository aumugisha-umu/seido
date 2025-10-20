#!/usr/bin/env node

/**
 * 🛡️ PHASE 2 BUILD FIX - SEIDO
 *
 * Script post-build pour résoudre définitivement l'erreur "self is not defined"
 * et optimiser le bundle size
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 [SEIDO] Starting post-build fixes...');

// 1. Fix "self is not defined" in vendor.js
const serverPath = path.join(__dirname, '..', '.next', 'server');
const vendorPath = path.join(serverPath, 'vendor.js');

if (fs.existsSync(vendorPath)) {
  console.log('📦 [SEIDO] Fixing vendor.js...');

  let vendorContent = fs.readFileSync(vendorPath, 'utf8');

  // Replace the problematic self usage at the beginning
  const polyfillCode = `if (typeof self === "undefined") { var self = globalThis; }
if (typeof globalThis.webpackChunk_N_E === "undefined") { globalThis.webpackChunk_N_E = []; }
if (typeof self.webpackChunk_N_E === "undefined") { self.webpackChunk_N_E = globalThis.webpackChunk_N_E; }
`;

  vendorContent = polyfillCode + vendorContent;

  fs.writeFileSync(vendorPath, vendorContent);
  console.log('✅ [SEIDO] vendor.js fixed successfully');
} else {
  console.log('⚠️  [SEIDO] vendor.js not found, skipping...');
}

// 2. Fix webpack-runtime.js if needed
const runtimePath = path.join(serverPath, 'webpack-runtime.js');

if (fs.existsSync(runtimePath)) {
  console.log('⚙️  [SEIDO] Checking webpack-runtime.js...');

  let runtimeContent = fs.readFileSync(runtimePath, 'utf8');

  // Only add polyfill if not already present
  if (!runtimeContent.includes('if (typeof self === "undefined")')) {
    const runtimePolyfill = `if (typeof self === "undefined") { var self = globalThis; }
`;
    runtimeContent = runtimePolyfill + runtimeContent;
    fs.writeFileSync(runtimePath, runtimeContent);
    console.log('✅ [SEIDO] webpack-runtime.js fixed');
  } else {
    console.log('✅ [SEIDO] webpack-runtime.js already fixed');
  }
}

// 3. Analyze bundle size
const chunksPath = path.join(serverPath, 'chunks');
if (fs.existsSync(chunksPath)) {
  const chunks = fs.readdirSync(chunksPath);
  let totalSize = 0;

  console.log('\n📊 [SEIDO] Bundle Analysis:');
  chunks.forEach(chunk => {
    const chunkPath = path.join(chunksPath, chunk);
    const stats = fs.statSync(chunkPath);
    const sizeKB = Math.round(stats.size / 1024);
    totalSize += sizeKB;

    if (sizeKB > 50) { // Log large chunks
      console.log(`  ${chunk}: ${sizeKB}KB`);
    }
  });

  console.log(`  Total server bundle: ~${totalSize}KB`);

  if (totalSize > 120) {
    console.log('⚠️  [SEIDO] Bundle size exceeds 120KB target');
  } else {
    console.log('✅ [SEIDO] Bundle size within target');
  }
}

console.log('\n🎉 [SEIDO] Post-build fixes completed!');