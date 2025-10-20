#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 PHASE 1 - QUICK VALIDATION TEST');
console.log('=====================================\n');
console.log('Testing with Chrome only on port 3005\n');

const testProcess = spawn('npx', [
  'playwright',
  'test',
  'test/e2e/phase1-final-validation.spec.ts',
  '--config=playwright.config.phase1.ts',
  '--grep', 'Complete auth flow for Gestionnaire'
], {
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, '..')
});

testProcess.on('close', (code) => {
  console.log('\n' + '='.repeat(50));

  if (code === 0) {
    console.log('🎉 TEST PASSED!');
    console.log('Run full suite with: node test/run-phase1-final.js');
  } else {
    console.log('❌ Test failed. Check the output above.');
  }

  console.log('='.repeat(50));
  process.exit(code);
});