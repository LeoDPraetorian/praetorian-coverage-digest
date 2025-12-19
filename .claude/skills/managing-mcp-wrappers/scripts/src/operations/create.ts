/**
 * CREATE operation
 * Creates new MCP wrapper TEST FILE with TDD enforcement
 *
 * IMPORTANT: This operation ONLY generates the test file.
 * The wrapper implementation is generated separately via generate-wrapper
 * after the RED phase is verified.
 *
 * TDD Workflow:
 * 1. create         → generates test file only
 * 2. verify-red     → confirms tests fail (no implementation)
 * 3. generate-wrapper → generates implementation
 * 4. verify-green   → confirms tests pass
 */

import * as fs from 'fs';
import * as path from 'path';
import type { CLIOptions } from '../types.js';
import { EXIT_SUCCESS, EXIT_ERROR } from '../types.js';
import { findRepoRoot, getToolsDir } from '../utils.js';

const REPO_ROOT = findRepoRoot();
const CLAUDE_DIR = path.join(REPO_ROOT, '.claude');

export async function createWrapper(options: CLIOptions): Promise<number> {
  if (!options.service || !options.tool) {
    console.error('❌ CREATE requires <service> and <tool>');
    console.error('   Usage: npm run create -- <service> <tool>');
    return EXIT_ERROR;
  }

  const { service, tool } = options;
  const repoRoot = findRepoRoot();
  const toolsDir = getToolsDir();
  const serviceDir = path.join(toolsDir, service);
  const wrapperPath = path.join(serviceDir, `${tool}.ts`);
  const testPath = path.join(serviceDir, `${tool}.unit.test.ts`);

  console.log(`🔨 Creating MCP wrapper test file: ${service}/${tool}\n`);
  console.log('📋 TDD Workflow: RED → GREEN → REFACTOR\n');

  // Check if wrapper already exists
  if (fs.existsSync(wrapperPath)) {
    console.error(`❌ Wrapper already exists: ${wrapperPath}`);
    console.error('   Use UPDATE operation to modify existing wrappers');
    return EXIT_ERROR;
  }

  // Check if test file already exists
  if (fs.existsSync(testPath)) {
    console.error(`❌ Test file already exists: ${testPath}`);
    console.error('   If starting fresh, delete existing files first');
    return EXIT_ERROR;
  }

  // Ensure service directory exists
  if (!fs.existsSync(serviceDir)) {
    console.log(`📁 Creating service directory: ${serviceDir}`);
    fs.mkdirSync(serviceDir, { recursive: true });
  }

  // Ensure tsconfig.json exists for service
  const tsconfigPath = path.join(serviceDir, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    // Create new tsconfig.json from template
    const tsconfigTemplatePath = path.join(repoRoot, '.claude', 'skills', 'managing-mcp-wrappers', 'templates', 'tsconfig.json.tmpl');
    if (fs.existsSync(tsconfigTemplatePath)) {
      let tsconfigContent = fs.readFileSync(tsconfigTemplatePath, 'utf-8');
      tsconfigContent = tsconfigContent.replace(/\{\{TOOL_NAME\}\}/g, tool);
      fs.writeFileSync(tsconfigPath, tsconfigContent);
      console.log(`📄 Created tsconfig.json: ${tsconfigPath}`);
    }
  } else {
    // Update existing tsconfig.json to include new tool
    try {
      const tsconfigContent = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
      const toolEntry = `${tool}.ts`;
      if (tsconfigContent.include && !tsconfigContent.include.includes(toolEntry)) {
        // Insert tool at the beginning of includes (before shared deps)
        const sharedDeps = tsconfigContent.include.filter((i: string) => i.startsWith('../') || i.startsWith('../../'));
        const existingTools = tsconfigContent.include.filter((i: string) => !i.startsWith('../') && !i.startsWith('../../'));
        tsconfigContent.include = [...existingTools, toolEntry, ...sharedDeps];
        fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfigContent, null, 2) + '\n');
        console.log(`📄 Updated tsconfig.json to include: ${toolEntry}`);
      }
    } catch (e) {
      console.warn(`⚠️  Could not update tsconfig.json: ${e}`);
    }
  }

  // STEP 1: Schema Discovery (instructions only)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📡 STEP 1: Schema Discovery\n');
  console.log('Run the schema discovery script with 3+ test cases:');
  console.log(`
  npx tsx .claude/skills/managing-mcp-wrappers/templates/discover-schema.ts \\
    --mcp ${service} \\
    --tool ${tool} \\
    --cases 3
  `);
  console.log('This will:');
  console.log('  1. Start the MCP server');
  console.log('  2. Run test cases against real MCP');
  console.log('  3. Capture response schemas');
  console.log('  4. Generate discovery documentation\n');

  // STEP 2: Generate Tests (RED)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔴 STEP 2: Generate Tests (RED Phase)\n');

  // Read template and generate test file
  const templatePath = path.join(repoRoot, '.claude', 'skills', 'managing-mcp-wrappers', 'templates', 'unit-test.ts.tmpl');
  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Test template not found: ${templatePath}`);
    return EXIT_ERROR;
  }

  let testTemplate = fs.readFileSync(templatePath, 'utf-8');

  // Replace placeholders
  const toolNameCamel = tool.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  testTemplate = testTemplate.replace(/\{\{TOOL_NAME\}\}/g, tool);
  testTemplate = testTemplate.replace(/\{\{TOOL_NAME_CAMEL\}\}/g, toolNameCamel);
  testTemplate = testTemplate.replace(/\{\{SERVICE\}\}/g, service);

  // Write test file ONLY
  fs.writeFileSync(testPath, testTemplate);
  console.log(`✅ Generated test file: ${testPath}`);

  // Summary and next steps
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 CREATED\n');
  console.log(`  ✅ ${testPath}`);
  console.log(`  ✅ ${tsconfigPath}`);

  console.log('\n⚠️  STOP: Complete these steps before generating wrapper:\n');
  console.log('  1. Customize tests based on schema discovery results:');
  console.log('     - Update valid/invalid input examples');
  console.log('     - Add expected response fields');
  console.log('     - Configure token reduction targets\n');

  console.log('  2. Verify RED phase (tests must fail):');
  console.log(`     npm run verify-red -- ${service}/${tool}\n`);

  console.log('  3. Generate wrapper implementation:');
  console.log(`     npm run generate-wrapper -- ${service}/${tool}\n`);

  console.log('  4. Verify GREEN phase (tests must pass):');
  console.log(`     npm run verify-green -- ${service}/${tool}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔴 TDD ENFORCEMENT ACTIVE\n');
  console.log('Wrapper file will NOT be generated until RED phase is verified.');
  console.log('This ensures tests are written and failing before implementation.\n');

  console.log('Documentation:');
  console.log('  .claude/skills/managing-mcp-wrappers/references/new-workflow.md\n');

  return EXIT_SUCCESS;
}
