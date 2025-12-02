/**
 * GENERATE-WRAPPER operation
 * Generates wrapper implementation ONLY after RED phase is verified
 *
 * TDD Enforcement:
 * 1. Verifies RED phase first (tests exist, fail, no wrapper)
 * 2. Only then generates wrapper file
 * 3. Instructs user to verify GREEN phase
 *
 * Usage: npm run generate-wrapper -- <service>/<tool>
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CLIOptions } from '../types.js';
import { EXIT_SUCCESS, EXIT_ERROR } from '../types.js';
import { findRepoRoot, getToolsDir } from '../utils.js';
import { enforceRedPhase } from '../tdd-enforcer.js';

export async function generateWrapper(options: CLIOptions): Promise<number> {
  if (!options.service || !options.tool) {
    console.error('❌ GENERATE-WRAPPER requires <service> and <tool>');
    console.error('   Usage: npm run generate-wrapper -- <service>/<tool>');
    return EXIT_ERROR;
  }

  const { service, tool } = options;
  const repoRoot = findRepoRoot();
  const toolsDir = getToolsDir();
  const serviceDir = path.join(toolsDir, service);
  const wrapperPath = path.join(serviceDir, `${tool}.ts`);
  const testPath = path.join(serviceDir, `${tool}.unit.test.ts`);

  console.log(`\n🔨 Generate Wrapper: ${service}/${tool}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // STEP 1: Verify RED phase first
  console.log('📋 STEP 1: Verify RED Phase\n');
  const redPassed = await enforceRedPhase(wrapperPath);

  if (!redPassed) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ CANNOT GENERATE WRAPPER\n');
    console.log('RED phase must pass before generating wrapper.');
    console.log('Fix the issues above and try again.\n');
    return EXIT_ERROR;
  }

  // STEP 2: Generate wrapper from template
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🟢 STEP 2: Generate Wrapper Implementation\n');

  const templatePath = path.join(
    repoRoot,
    '.claude',
    'skills',
    'mcp-manager',
    'templates',
    'tool-wrapper.ts.tmpl'
  );

  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Wrapper template not found: ${templatePath}`);
    return EXIT_ERROR;
  }

  let wrapperTemplate = fs.readFileSync(templatePath, 'utf-8');

  // Replace placeholders
  const toolNameCamel = tool.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  wrapperTemplate = wrapperTemplate.replace(/\{tool-name\}/g, tool);
  wrapperTemplate = wrapperTemplate.replace(/toolName/g, toolNameCamel);
  wrapperTemplate = wrapperTemplate.replace(/\{mcp-name\}/g, service);
  wrapperTemplate = wrapperTemplate.replace(/\{mcp-server-name\}/g, service);

  // Write wrapper file
  fs.writeFileSync(wrapperPath, wrapperTemplate);
  console.log(`✅ Generated wrapper: ${wrapperPath}`);

  // STEP 3: Next steps
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 GENERATED\n');
  console.log(`  ✅ ${wrapperPath}\n`);

  console.log('⚠️  NEXT STEPS:\n');
  console.log('  1. Implement the wrapper (customize the generated code):');
  console.log('     - Update InputSchema with actual fields');
  console.log('     - Update OutputSchema with expected response');
  console.log('     - Implement callMCPTool with real MCP client');
  console.log('     - Customize filterResult for token reduction\n');

  console.log('  2. Verify GREEN phase (tests must pass):');
  console.log(`     npm run verify-green -- ${service}/${tool}\n`);

  console.log('  3. Run 10-phase compliance audit:');
  console.log(`     npm run audit -- ${service}/${tool}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🟢 TDD: GREEN PHASE NEXT\n');
  console.log('Implement the wrapper to make tests pass.');
  console.log('Run verify-green when ready.\n');

  return EXIT_SUCCESS;
}
