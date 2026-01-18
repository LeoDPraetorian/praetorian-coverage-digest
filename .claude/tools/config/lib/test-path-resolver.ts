/**
 * Test path-resolver from different locations
 */

import { getSuperRepoRoot, resolveSuperRepoPath, isInSubmodule, getCurrentSubmoduleName } from './path-resolver';
import { existsSync } from 'fs';

console.log('🧪 Testing Path Resolver\n');
console.log('=' .repeat(60));

// Test 1: Get super-repo root
console.log('\n📍 Test 1: Super-repo root detection');
console.log('-'.repeat(60));
const superRepoRoot = getSuperRepoRoot();
console.log(`Super-repo root: ${superRepoRoot}`);

// Test 2: Check if in submodule
console.log('\n📍 Test 2: Submodule detection');
console.log('-'.repeat(60));
const inSubmodule = isInSubmodule();
console.log(`In submodule: ${inSubmodule}`);

if (inSubmodule) {
  const submoduleName = getCurrentSubmoduleName();
  console.log(`Submodule name: ${submoduleName}`);
}

// Test 3: Resolve paths
console.log('\n📍 Test 3: Path resolution');
console.log('-'.repeat(60));
const linearToolPath = resolveSuperRepoPath('.claude', 'tools', 'linear', 'get-issue.ts');
console.log(`Linear tool path: ${linearToolPath}`);

if (existsSync(linearToolPath)) {
  console.log('✓ Path exists and is accessible');
} else {
  console.log('✗ Path does not exist');
}

// Test 4: Credentials path
console.log('\n📍 Test 4: Credentials resolution');
console.log('-'.repeat(60));
const credentialsPath = resolveSuperRepoPath('.claude', 'tools', 'config', 'credentials.json');
console.log(`Credentials path: ${credentialsPath}`);

if (existsSync(credentialsPath)) {
  console.log('✓ Credentials file exists');
} else {
  console.log('✗ Credentials file not found');
}

console.log('\n' + '='.repeat(60));
console.log('✅ Path resolver tests complete\n');
