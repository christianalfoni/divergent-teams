#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Restore workspace:* protocol for shared package
if (packageJson.dependencies && packageJson.dependencies['@divergent-teams/shared']) {
  packageJson.dependencies['@divergent-teams/shared'] = 'workspace:*';
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log('✓ Restored workspace:* protocol in package.json');
}

// Remove .firebase-pnpm-workspaces directory
const workspaceDir = path.join(__dirname, '.firebase-pnpm-workspaces');
if (fs.existsSync(workspaceDir)) {
  fs.rmSync(workspaceDir, { recursive: true, force: true });
  console.log('✓ Removed .firebase-pnpm-workspaces directory');
}
