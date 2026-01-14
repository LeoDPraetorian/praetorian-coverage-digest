/**
 * FIX operation
 * Auto-fixes deterministic compliance issues, provides guidance for manual fixes
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CLIOptions } from '../types.js';
import { EXIT_SUCCESS, EXIT_ISSUES, EXIT_ERROR } from '../types.js';
import { findWrapperFile, formatSeverity } from '../utils.js';
import { generateSkill } from './generate-skill.js';

// Import fixers
import { fixPhase2 } from '../fixers/phase2-fixer.js';
import { fixPhase3 } from '../fixers/phase3-fixer.js';
import { fixPhase4 } from '../fixers/phase4-fixer.js';

interface FixerConfig {
  num: number;
  name: string;
  autoFixable: boolean;
  fn: (wrapperPath: string, dryRun: boolean) => { fixed: boolean; changes: string[] };
}

/**
 * Phase 11 fixer: Regenerate service skill with current wrapper schemas
 */
function fixPhase11(wrapperPath: string, dryRun: boolean): { fixed: boolean; changes: string[] } {
  // Extract service from wrapper path
  const parts = wrapperPath.split(path.sep);
  const toolsIndex = parts.indexOf('tools');
  if (toolsIndex === -1 || toolsIndex + 1 >= parts.length) {
    return {
      fixed: false,
      changes: ['ERROR: Could not extract service from wrapper path'],
    };
  }

  const service = parts[toolsIndex + 1];

  if (dryRun) {
    return {
      fixed: true,
      changes: [
        `Would regenerate service skill: mcp-tools-${service}`,
        'Skill will include updated Parameters and Returns documentation',
        'All wrapper schemas will be synchronized',
      ],
    };
  }

  // Call generate-skill to regenerate the service skill
  try {
    const result = generateSkill({
      operation: 'generate-skill',
      service,
      dryRun: false,
      verbose: false,
    });

    return {
      fixed: true,
      changes: [
        `Regenerated service skill: mcp-tools-${service}`,
        'Updated Parameters and Returns documentation',
        'All wrapper schemas are now synchronized',
      ],
    };
  } catch (error) {
    return {
      fixed: false,
      changes: [
        `ERROR: Failed to regenerate skill: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

const FIXERS: FixerConfig[] = [
  { num: 1, name: 'Schema Discovery', autoFixable: false, fn: () => ({ fixed: false, changes: ['MANUAL: Run schema discovery with 3+ test cases'] }) },
  { num: 2, name: 'Optional Fields', autoFixable: true, fn: fixPhase2 },
  { num: 3, name: 'Type Unions', autoFixable: false, fn: fixPhase3 },
  { num: 4, name: 'Nested Access Safety', autoFixable: true, fn: fixPhase4 },
  { num: 5, name: 'Reference Validation', autoFixable: false, fn: () => ({ fixed: false, changes: ['MANUAL: Update deprecated references'] }) },
  { num: 6, name: 'Unit Test Coverage', autoFixable: false, fn: () => ({ fixed: false, changes: ['MANUAL: Add missing test categories to unit test file'] }) },
  { num: 7, name: 'Integration Tests', autoFixable: false, fn: () => ({ fixed: false, changes: ['MANUAL: Create integration test file with real MCP tests'] }) },
  { num: 8, name: 'Test Quality', autoFixable: false, fn: () => ({ fixed: false, changes: ['MANUAL: Add factory mocks, response format tests, edge cases'] }) },
  { num: 9, name: 'Security Validation', autoFixable: false, fn: () => ({ fixed: false, changes: [
    'MANUAL: Remove eval() or new Function() if present',
    'MANUAL: Move hardcoded credentials to credentials.json or environment variables',
    "MANUAL: Add import { validators } from '../config/lib/sanitize.js'",
    'MANUAL: Add security validation to string inputs using validators or .refine()',
  ] }) },
  { num: 10, name: 'TypeScript Validation', autoFixable: false, fn: () => ({ fixed: false, changes: [
    'MANUAL: Fix TypeScript errors reported by tsc --noEmit',
    'MANUAL: Add proper type annotations for parameters and return types',
    'MANUAL: Add null checks for potentially undefined values',
    'MANUAL: Ensure imports match exported types',
  ] }) },
  { num: 11, name: 'Skill-Schema Synchronization', autoFixable: true, fn: fixPhase11 },
];

export async function fixWrapper(options: CLIOptions): Promise<number> {
  if (!options.name) {
    console.error('❌ FIX requires wrapper name');
    console.error('   Usage: npm run fix -- <name> [--dry-run] [--phase N]');
    return EXIT_ERROR;
  }

  const wrapperPath = findWrapperFile(options.name);
  if (!wrapperPath) {
    console.error(`❌ Wrapper not found: ${options.name}`);
    return EXIT_ERROR;
  }

  const dryRun = options.dryRun ?? false;

  console.log(`🔧 Fixing: ${wrapperPath}`);
  if (dryRun) {
    console.log('   (dry-run mode - no changes will be applied)\n');
  } else {
    console.log('');
  }

  // Determine which fixers to run
  const fixersToRun = options.phase
    ? FIXERS.filter(f => f.num === options.phase)
    : FIXERS;

  let totalFixed = 0;
  let totalManual = 0;

  for (const fixer of fixersToRun) {
    console.log(`━━━ Phase ${fixer.num}: ${fixer.name} ━━━`);

    if (fixer.autoFixable) {
      console.log('🤖 Auto-fixable\n');
    } else {
      console.log('📝 Manual fix required\n');
    }

    const result = fixer.fn(wrapperPath, dryRun);

    if (result.changes.length > 0) {
      for (const change of result.changes) {
        if (change.startsWith('MANUAL')) {
          console.log(`  📝 ${change}`);
        } else {
          console.log(`  ${fixer.autoFixable ? '✅' : 'ℹ️'} ${change}`);
        }
      }
      console.log('');

      if (result.fixed) {
        totalFixed++;
      } else if (!fixer.autoFixable) {
        totalManual++;
      }
    } else {
      console.log('  ✅ No issues to fix\n');
    }
  }

  // Summary with clear visual banner
  console.log('');
  if (dryRun) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  FIX RESULT: DRY RUN');
    console.log(`  Would fix: ${totalFixed} phases (auto), ${totalManual} phases (manual)`);
    console.log('  Run without --dry-run to apply fixes');
    console.log('═══════════════════════════════════════════════════════════════');
  } else if (totalManual > 0) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  FIX RESULT: PARTIAL');
    console.log(`  Fixed: ${totalFixed} phases (auto), ${totalManual} phases require manual fixes`);
    console.log(`  Run: npm run --silent audit -- ${options.name}`);
    console.log('═══════════════════════════════════════════════════════════════');
  } else if (totalFixed > 0) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  FIX RESULT: COMPLETE');
    console.log(`  Fixed: ${totalFixed} phases (auto)`);
    console.log(`  Run: npm run --silent audit -- ${options.name}`);
    console.log('═══════════════════════════════════════════════════════════════');
  } else {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  FIX RESULT: NO ISSUES');
    console.log('  No issues to fix');
    console.log('═══════════════════════════════════════════════════════════════');
  }

  // Exit 0 for successful fix run (even with manual fixes needed)
  // Manual fixes are not tool errors - the fix tool worked correctly
  return EXIT_SUCCESS;
}
