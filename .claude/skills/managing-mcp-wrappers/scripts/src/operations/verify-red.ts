/**
 * VERIFY-RED operation
 * Validates RED phase of TDD cycle before allowing wrapper generation
 *
 * RED Phase Requirements:
 * 1. Test file MUST exist
 * 2. Wrapper file MUST NOT exist
 * 3. Tests MUST fail (proving they test something)
 *
 * Usage: npm run verify-red -- <service>/<tool>
 */

import * as path from 'path';
import type { CLIOptions } from '../types.js';
import { EXIT_SUCCESS, EXIT_ERROR } from '../types.js';
import { getToolsDir } from '../utils.js';
import { enforceRedPhase } from '../tdd-enforcer.js';

export async function verifyRed(options: CLIOptions): Promise<number> {
  if (!options.service || !options.tool) {
    console.error('❌ VERIFY-RED requires <service> and <tool>');
    console.error('   Usage: npm run verify-red -- <service>/<tool>');
    return EXIT_ERROR;
  }

  const { service, tool } = options;
  const toolsDir = getToolsDir();
  const wrapperPath = path.join(toolsDir, service, `${tool}.ts`);

  console.log(`\n🔴 Verifying RED Phase: ${service}/${tool}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const passed = await enforceRedPhase(wrapperPath);

  if (passed) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ RED PHASE VERIFIED\n');
    console.log('Next step: Generate wrapper implementation');
    console.log(`   npm run generate-wrapper -- ${service}/${tool}\n`);
    return EXIT_SUCCESS;
  } else {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ RED PHASE FAILED\n');
    console.log('Fix the issues above before proceeding.');
    console.log('Run `npm run create` again if needed.\n');
    return EXIT_ERROR;
  }
}
