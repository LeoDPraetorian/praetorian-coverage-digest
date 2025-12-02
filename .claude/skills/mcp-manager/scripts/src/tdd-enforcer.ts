/**
 * TDD Phase Enforcement
 * Validates RED-GREEN-REFACTOR cycle for MCP wrapper development
 */

import * as fs from 'fs';
import { execSync } from 'child_process';
import type { TestResult } from './types.js';
import { findProjectRoot } from '../../../../lib/find-project-root.js';

const PROJECT_ROOT = findProjectRoot();
const CLAUDE_DIR = `${PROJECT_ROOT}/.claude`;

export async function enforceRedPhase(wrapperPath: string): Promise<boolean> {
  const testFile = wrapperPath.replace('.ts', '.unit.test.ts');

  console.log('🔴 RED PHASE: Validating tests exist and fail...\n');

  // 1. Check test file exists
  if (!fs.existsSync(testFile)) {
    console.error('❌ RED PHASE FAILED: No test file found');
    console.error(`   Expected: ${testFile}`);
    console.error('   Action: Generate tests BEFORE implementation\n');
    return false;
  }
  console.log(`✓ Test file exists: ${testFile}`);

  // 2. Check implementation file does NOT exist yet
  if (fs.existsSync(wrapperPath)) {
    console.error('❌ RED PHASE FAILED: Implementation already exists');
    console.error('   TDD requires tests BEFORE code');
    console.error(`   Found: ${wrapperPath}\n`);
    return false;
  }
  console.log('✓ Implementation does not exist yet');

  // 3. Run tests → MUST FAIL
  try {
    execSync(`cd "${CLAUDE_DIR}" && npm run test:unit -- ${testFile}`, {
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    // If we get here, tests passed (BAD)
    console.error('❌ RED PHASE FAILED: Tests passing without implementation');
    console.error('   Tests must fail to prove they test something\n');
    return false;
  } catch (error) {
    // Tests failed (GOOD)
    console.log('✓ Tests failing (expected without implementation)\n');
  }

  console.log('✅ RED PHASE VALIDATED');
  console.log('   → Tests exist, implementation missing, tests failing');
  console.log('   → Ready for GREEN phase (implement to make tests pass)\n');
  return true;
}

export async function enforceGreenPhase(wrapperPath: string): Promise<boolean> {
  const testFile = wrapperPath.replace('.ts', '.unit.test.ts');

  console.log('🟢 GREEN PHASE: Validating implementation passes tests...\n');

  // 1. Check implementation exists
  if (!fs.existsSync(wrapperPath)) {
    console.error('❌ GREEN PHASE FAILED: Implementation missing');
    console.error(`   Expected: ${wrapperPath}\n`);
    return false;
  }
  console.log(`✓ Implementation exists: ${wrapperPath}`);

  // 2. Run tests → MUST PASS
  let testOutput: string;
  try {
    testOutput = execSync(`cd "${CLAUDE_DIR}" && npm run test:unit -- ${testFile}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
  } catch (error: any) {
    console.error('❌ GREEN PHASE FAILED: Tests still failing');
    console.error('   Action: Fix implementation until tests pass\n');
    if (error.stdout) {
      console.error(error.stdout);
    }
    return false;
  }
  console.log('✓ All tests passing');

  // 3. Check coverage ≥ 80%
  const coverageMatch = testOutput.match(/Statements\s*:\s*(\d+\.?\d*)%/);
  if (coverageMatch) {
    const coverage = parseFloat(coverageMatch[1]);
    console.log(`✓ Coverage: ${coverage}%`);

    if (coverage < 80) {
      console.error(`⚠️  GREEN PHASE WARNING: Coverage ${coverage}% < 80%`);
      console.error('   Action: Add tests to cover edge cases\n');
      return false;
    }
  }

  console.log('\n✅ GREEN PHASE VALIDATED');
  console.log(`   → All tests passing, coverage ≥80%`);
  console.log('   → Ready for REFACTOR phase (optimize while staying green)\n');
  return true;
}

export async function enforceRefactorPhase(wrapperPath: string): Promise<boolean> {
  const testFile = wrapperPath.replace('.ts', '.unit.test.ts');

  console.log('🔵 REFACTOR PHASE: Validating optimizations maintain quality...\n');

  // 1. Tests must still pass
  try {
    const testOutput = execSync(`cd "${CLAUDE_DIR}" && npm run test:unit -- ${testFile}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    console.log('✓ Tests still passing after refactor');

    // 2. Coverage must not decrease
    const coverageMatch = testOutput.match(/Statements\s*:\s*(\d+\.?\d*)%/);
    if (coverageMatch) {
      const coverage = parseFloat(coverageMatch[1]);
      console.log(`✓ Coverage maintained: ${coverage}%`);
    }
  } catch (error) {
    console.error('❌ REFACTOR PHASE FAILED: Tests broke during refactor');
    console.error('   Action: Revert changes, tests must stay green\n');
    return false;
  }

  console.log('\n✅ REFACTOR PHASE VALIDATED');
  console.log('   → Tests still passing, coverage maintained');
  console.log('   → Ready for production\n');
  return true;
}
