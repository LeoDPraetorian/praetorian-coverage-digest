/**
 * VERIFY-GREEN operation
 * Validates GREEN phase of TDD cycle
 *
 * GREEN Phase Requirements:
 * 1. Wrapper file MUST exist
 * 2. Tests MUST pass
 * 3. Coverage MUST be ≥80%
 *
 * Usage: npm run verify-green -- <service>/<tool>
 */

import * as path from 'path';
import type { CLIOptions } from '../types.js';
import { EXIT_SUCCESS, EXIT_ERROR } from '../types.js';
import { getToolsDir } from '../utils.js';
import { enforceGreenPhase } from '../tdd-enforcer.js';

export async function verifyGreen(options: CLIOptions): Promise<number> {
  if (!options.service || !options.tool) {
    console.error('❌ VERIFY-GREEN requires <service> and <tool>');
    console.error('   Usage: npm run verify-green -- <service>/<tool>');
    return EXIT_ERROR;
  }

  const { service, tool } = options;
  const toolsDir = getToolsDir();
  const wrapperPath = path.join(toolsDir, service, `${tool}.ts`);

  console.log(`\n🟢 Verifying GREEN Phase: ${service}/${tool}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const passed = await enforceGreenPhase(wrapperPath);

  if (passed) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ GREEN PHASE VERIFIED\n');
    console.log('TDD cycle complete! Your wrapper is ready.\n');
    console.log('Optional next steps:');
    console.log(`  1. Run full audit: npm run audit -- ${service}/${tool}`);
    console.log(`  2. Integration test: RUN_INTEGRATION_TESTS=true npm run test -- ${service}/${tool}`);
    console.log('  3. Refactor while staying green\n');
    return EXIT_SUCCESS;
  } else {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ GREEN PHASE FAILED\n');
    console.log('Fix the issues above before proceeding.');
    console.log('Common issues:');
    console.log('  - Missing wrapper implementation');
    console.log('  - Tests still failing');
    console.log('  - Coverage below 80%\n');
    return EXIT_ERROR;
  }
}
