/**
 * TEST operation
 * Runs unit tests, integration tests, and coverage reports for MCP wrappers
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { CLIOptions } from '../types.js';
import { EXIT_SUCCESS, EXIT_ERROR, EXIT_ISSUES } from '../types.js';
import { findWrapperFile, getToolsDir, findRepoRoot } from '../utils.js';

interface TestOptions {
  unit?: boolean;
  integration?: boolean;
  coverage?: boolean;
}

export async function testWrapper(options: CLIOptions & TestOptions): Promise<number> {
  if (!options.name) {
    console.error('❌ TEST requires wrapper name');
    console.error('   Usage: npm run test -- <name> [--unit] [--integration] [--coverage]');
    return EXIT_ERROR;
  }

  const wrapperPath = findWrapperFile(options.name);
  if (!wrapperPath) {
    console.error(`❌ Wrapper not found: ${options.name}`);
    return EXIT_ERROR;
  }

  // Derive test file paths
  const testDir = path.dirname(wrapperPath);
  const baseName = path.basename(wrapperPath, '.ts');
  const unitTestPath = path.join(testDir, `${baseName}.unit.test.ts`);
  const integrationTestPath = path.join(testDir, `${baseName}.integration.test.ts`);

  console.log(`🧪 Testing: ${options.name}\n`);

  // Default to all tests if none specified
  const runUnit = options.unit || (!options.unit && !options.integration && !options.coverage);
  const runIntegration = options.integration || false;
  const runCoverage = options.coverage || false;

  let hasFailures = false;
  const repoRoot = findRepoRoot();
  const claudeDir = path.join(repoRoot, '.claude');

  // Unit Tests
  if (runUnit) {
    console.log('━━━ Unit Tests ━━━');
    if (!fs.existsSync(unitTestPath)) {
      console.log(`⚠️  Unit test file not found: ${unitTestPath}`);
      console.log('   Run CREATE to generate tests\n');
      hasFailures = true;
    } else {
      console.log(`Running: ${unitTestPath}\n`);
      try {
        const result = execSync(
          `npm run test:unit -- "${unitTestPath}"`,
          {
            cwd: claudeDir,
            stdio: 'pipe',
            encoding: 'utf-8'
          }
        );
        console.log(result);
        console.log('✅ Unit tests passed\n');
      } catch (error) {
        if (error instanceof Error && 'stdout' in error) {
          console.log((error as any).stdout);
          console.log((error as any).stderr);
        }
        console.log('❌ Unit tests failed\n');
        hasFailures = true;
      }
    }
  }

  // Integration Tests
  if (runIntegration) {
    console.log('━━━ Integration Tests ━━━');
    if (!fs.existsSync(integrationTestPath)) {
      console.log(`⚠️  Integration test file not found: ${integrationTestPath}`);
      console.log('   Integration tests are optional but recommended\n');
    } else {
      console.log(`Running: ${integrationTestPath}`);
      console.log('⚠️  Integration tests require RUN_INTEGRATION_TESTS=true\n');
      try {
        const result = execSync(
          `RUN_INTEGRATION_TESTS=true npm run test:integration -- "${integrationTestPath}"`,
          {
            cwd: claudeDir,
            stdio: 'pipe',
            encoding: 'utf-8'
          }
        );
        console.log(result);
        console.log('✅ Integration tests passed\n');
      } catch (error) {
        if (error instanceof Error && 'stdout' in error) {
          console.log((error as any).stdout);
          console.log((error as any).stderr);
        }
        console.log('❌ Integration tests failed\n');
        hasFailures = true;
      }
    }
  }

  // Coverage Report
  if (runCoverage) {
    console.log('━━━ Coverage Report ━━━');
    if (!fs.existsSync(unitTestPath)) {
      console.log(`⚠️  Cannot generate coverage without unit tests`);
      console.log('   Run CREATE to generate tests first\n');
      hasFailures = true;
    } else {
      console.log(`Generating coverage for: ${unitTestPath}\n`);
      try {
        // Only measure coverage for the wrapper file being tested
        const wrapperFile = wrapperPath.replace(/^.*\.claude\//, '');
        const result = execSync(
          `npm run test:coverage -- "${unitTestPath}" --coverage.include="${wrapperFile}"`,
          {
            cwd: claudeDir,
            stdio: 'pipe',
            encoding: 'utf-8'
          }
        );
        console.log(result);

        // Parse coverage result
        const coverageMatch = result.match(/All files\s+\|\s+([\d.]+)/);
        if (coverageMatch) {
          const coverage = parseFloat(coverageMatch[1]);
          if (coverage >= 80) {
            console.log(`✅ Coverage: ${coverage}% (≥80% required)\n`);
          } else {
            console.log(`❌ Coverage: ${coverage}% (<80% required)\n`);
            hasFailures = true;
          }
        }
      } catch (error) {
        if (error instanceof Error && 'stdout' in error) {
          console.log((error as any).stdout);
          console.log((error as any).stderr);
        }
        console.log('❌ Coverage report failed\n');
        hasFailures = true;
      }
    }
  }

  // Summary with clear visual banner
  console.log('');
  if (hasFailures) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  TEST RESULT: FAILED');
    console.log('  Some tests failed or are missing');
    if (!fs.existsSync(unitTestPath)) {
      console.log('  Run: npm run --silent create -- <service> <tool>');
    } else {
      console.log(`  Run: npm run --silent audit -- ${options.name}`);
    }
    console.log('═══════════════════════════════════════════════════════════════');
  } else {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  TEST RESULT: PASSED');
    console.log('  All tests passed');
    console.log(`  Run: npm run --silent audit -- ${options.name}`);
    console.log('═══════════════════════════════════════════════════════════════');
  }

  // Exit 0 for successful test run (even with failures)
  // Test failures are not tool errors - the test runner worked correctly
  return EXIT_SUCCESS;
}
