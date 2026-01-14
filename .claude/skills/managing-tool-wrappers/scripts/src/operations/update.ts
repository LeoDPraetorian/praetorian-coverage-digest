/**
 * UPDATE operation
 * Updates existing MCP wrapper with TDD enforcement (tests guard changes)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CLIOptions } from '../types.js';
import { EXIT_SUCCESS, EXIT_ERROR, EXIT_ISSUES } from '../types.js';
import { findWrapperFile, getToolsDir, findRepoRoot } from '../utils.js';
import { auditPhase11 } from '../phases/phase11-skill-schema-sync.js';

const ROOT = findRepoRoot();
const CLAUDE_DIR = path.join(ROOT, '.claude');

export async function updateWrapper(options: CLIOptions): Promise<number> {
  if (!options.service || !options.tool) {
    console.error('❌ UPDATE requires <service> and <tool>');
    console.error('   Usage: npm run update -- <service> <tool>');
    return EXIT_ERROR;
  }

  const { service, tool } = options;
  const toolsDir = getToolsDir();
  const wrapperPath = path.join(toolsDir, service, `${tool}.ts`);
  const testPath = path.join(toolsDir, service, `${tool}.unit.test.ts`);

  console.log(`📝 Updating MCP wrapper: ${service}/${tool}\n`);

  // Check if wrapper exists
  if (!fs.existsSync(wrapperPath)) {
    console.error(`❌ Wrapper not found: ${wrapperPath}`);
    console.error('   Use CREATE operation to create new wrappers');
    return EXIT_ERROR;
  }
  console.log(`✓ Wrapper exists: ${wrapperPath}`);

  // Check if tests exist
  if (!fs.existsSync(testPath)) {
    console.error(`❌ Test file not found: ${testPath}`);
    console.error('   Cannot update without existing tests');
    console.error('   Use CREATE to regenerate wrapper with tests');
    return EXIT_ERROR;
  }
  console.log(`✓ Test file exists: ${testPath}`);

  // TDD-Guarded Update Workflow
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 TDD-Guarded Update Workflow\n');

  // Step 1: Verify current tests pass
  console.log('🟢 STEP 1: Verify Current Tests Pass\n');
  console.log('Run existing tests to establish baseline:');
  console.log(`
  cd "${CLAUDE_DIR}" && npm run test:unit -- ${testPath}
  `);
  console.log('All tests MUST pass before making changes.\n');

  // Step 2: Add new tests (RED)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔴 STEP 2: Add New Tests (RED)\n');
  console.log('Before modifying the wrapper, add tests for new behavior:');
  console.log(`
  // In ${testPath}, add tests for the new feature:

  describe('New Feature', () => {
    it('should handle new field', async () => {
      // Test expected behavior
    });

    it('should validate new input format', async () => {
      // Test validation
    });
  });
  `);
  console.log('Run tests → New tests MUST FAIL (not implemented yet)\n');

  // Step 3: Schema discovery for new fields
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📡 STEP 3: Schema Discovery (New Fields)\n');
  console.log('If adding new fields, run schema discovery:');
  console.log(`
  npx tsx .claude/skills/managing-tool-wrappers/templates/discover-schema.ts \\
    --mcp ${service} \\
    --tool ${tool} \\
    --cases 3
  `);
  console.log('Document response format for new fields.\n');

  // Step 4: Update implementation (GREEN)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🟢 STEP 4: Update Implementation (GREEN)\n');
  console.log(`Modify: ${wrapperPath}`);
  console.log(`
  Changes to make:
  1. Update Zod schemas for new fields
  2. Add token reduction for new data
  3. Update response formatting
  4. Handle new response formats defensively
  `);
  console.log('Run tests → All tests (old AND new) MUST pass\n');

  // Step 5: Verify no regressions
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ STEP 5: Verify No Regressions\n');
  console.log('Run full test suite to verify no regressions:');
  console.log(`
  cd "${CLAUDE_DIR}" && npm run test:unit -- ${testPath}

  # Check coverage hasn't decreased
  npm run test:coverage -- ${testPath}
  `);

  // Step 6: Integration test
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔵 STEP 6: Integration Test\n');
  console.log('Test with real MCP server:');
  console.log(`
  # Update integration tests if they exist
  RUN_INTEGRATION_TESTS=true npm run test:integration -- ${service}/${tool}
  `);

  // Step 7: Re-audit
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 STEP 7: Re-Audit\n');
  console.log('Run 10-phase compliance audit:');
  console.log(`
  npm run audit -- ${service}/${tool}
  `);

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 UPDATE CHECKLIST\n');
  console.log('□ 1. Current tests pass (baseline)');
  console.log('□ 2. Add tests for new behavior (RED)');
  console.log('□ 3. New tests fail (prove they test something)');
  console.log('□ 4. Schema discovery for new fields');
  console.log('□ 5. Update implementation (GREEN)');
  console.log('□ 6. ALL tests pass (old + new)');
  console.log('□ 7. Coverage maintained (≥80%)');
  console.log('□ 8. Integration tests pass');
  console.log('□ 9. Audit passes (11 phases)');
  console.log('\nDocumentation:');
  console.log('  .claude/skills/managing-tool-wrappers/references/update-workflow.md\n');

  // Check skill-schema synchronization (Phase 11)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 STEP 8: Skill-Schema Synchronization Check\n');
  console.log('Checking if service skill needs regeneration...\n');

  const syncResult = await auditPhase11(wrapperPath);

  if (syncResult.issues.length > 0) {
    console.log('⚠️  Skill-schema mismatches detected:\n');
    for (const issue of syncResult.issues) {
      console.log(`  ${issue.message}`);
    }
    console.log('\n💡 Recommendation:');
    console.log(`   Run: npm run fix -- ${service}/${tool} --apply phase11-regenerate-skill`);
    console.log('   This will regenerate the service skill with current wrapper schemas.\n');
  } else {
    console.log('✅ Service skill is in sync with wrapper schemas.\n');
  }

  return EXIT_SUCCESS;
}
