#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('📦 Preparing workspace dependencies for Firebase deployment...');

// Paths
const functionsDir = __dirname;
const sharedSrc = path.join(functionsDir, '../shared');
const workspaceDir = path.join(functionsDir, '.firebase-pnpm-workspaces');
const sharedDest = path.join(workspaceDir, '@divergent-teams', 'shared');

// 1. Create workspace directory
fs.mkdirSync(sharedDest, { recursive: true });
console.log('  ✓ Created .firebase-pnpm-workspaces directory');

// 2. Copy shared package.json
fs.copyFileSync(
  path.join(sharedSrc, 'package.json'),
  path.join(sharedDest, 'package.json')
);

// 3. Copy built dist directory
const distSrc = path.join(sharedSrc, 'dist');
const distDest = path.join(sharedDest, 'dist');

if (!fs.existsSync(distSrc)) {
  console.error('  ✗ Error: shared/dist not found. Build the shared package first.');
  process.exit(1);
}

fs.cpSync(distSrc, distDest, { recursive: true });
console.log('  ✓ Copied shared package (dist + package.json)');

// 4. Update functions package.json to use file: protocol
const packageJsonPath = path.join(functionsDir, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

if (packageJson.dependencies['@divergent-teams/shared']) {
  packageJson.dependencies['@divergent-teams/shared'] = 'file:.firebase-pnpm-workspaces/@divergent-teams/shared';
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('  ✓ Updated package.json to use file: protocol');
}

console.log('✅ Workspace prepared for deployment!');
