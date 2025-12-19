#!/usr/bin/env node
/**
 * MCP Manager CLI
 * Unified MCP wrapper lifecycle management with TDD enforcement
 *
 * TDD Workflow (enforced order):
 *   npm run create -- <service> <tool>           # 1. Generate test file ONLY
 *   npm run verify-red -- <service>/<tool>       # 2. Verify tests fail
 *   npm run generate-wrapper -- <service>/<tool> # 3. Generate wrapper (blocked until RED)
 *   npm run verify-green -- <service>/<tool>     # 4. Verify tests pass (≥80%)
 *
 * Other operations:
 *   npm run update -- <service> <tool>
 *   npm run audit -- [name] [--phase N] [--all]
 *   npm run fix -- <name> [--dry-run] [--phase N]
 *   npm run test -- <name> [--unit] [--integration] [--coverage]
 */

import { EXIT_ERROR, EXIT_ISSUES, EXIT_SUCCESS, type CLIOptions } from './types.js';
import { createWrapper } from './operations/create.js';
import { updateWrapper } from './operations/update.js';
import { auditWrapper } from './operations/audit.js';
import { fixWrapper } from './operations/fix.js';
import { testWrapper } from './operations/test.js';
import { verifyRed } from './operations/verify-red.js';
import { generateWrapper } from './operations/generate-wrapper.js';
import { verifyGreen } from './operations/verify-green.js';
import { generateSkill } from './operations/generate-skill.js';

function showHelp(): void {
  console.log(`
MCP Manager CLI - Complete Wrapper Lifecycle with TDD

USAGE:
  npm run <operation> -- [options]

OPERATIONS:
  create <service> <tool>     Create test file (RED phase)
  verify-red <service>/<tool> Verify RED phase (tests fail)
  generate-wrapper <s>/<t>    Generate wrapper (after RED verified)
  verify-green <service>/<tool> Verify GREEN phase (tests pass)
  update <service> <tool>     Update existing wrapper (tests guard changes)
  audit [name]                Audit compliance (10 phases)
                              - Accepts service name (e.g., '<service>')
                              - Or service/tool (e.g., '<service>/<tool>')
  fix <name>                  Fix compliance issues
  test <name>                 Run tests (unit/integration/coverage)
  generate-skill <service>    Generate/update service-specific skill
                              - Creates mcp-tools-{service} in skill-library
                              - Enables granular agent access control

OPTIONS:
  --phase N                   Target specific phase (audit/fix)
  --all                       Process all wrappers (audit)
  --service <name>            Filter by service (audit)
  --dry-run                   Preview changes without applying (fix)
  --unit                      Run unit tests only (test)
  --integration               Run integration tests only (test)
  --coverage                  Generate coverage report (test)
  --verbose                   Verbose output

EXAMPLES:
  # TDD Workflow (in order):
  npm run create -- <service> <tool>         # 1. Generate test file
  npm run verify-red -- <service>/<tool>     # 2. Verify tests fail
  npm run generate-wrapper -- <service>/<tool> # 3. Generate wrapper
  npm run verify-green -- <service>/<tool>   # 4. Verify tests pass

  # Other operations:
  npm run update -- <service> <tool>
  npm run audit -- <service>                 # Audit all wrappers in service
  npm run audit -- <service>/<tool>          # Audit specific wrapper
  npm run audit -- --all                     # Audit all services
  npm run fix -- <service>/<tool> --dry-run
  npm run test -- <service>/<tool> --coverage
  npm run generate-skill -- <service>        # Generate mcp-tools-{service} skill

EXIT CODES:
  0   Success (all checks passed)
  1   Issues found (warnings or failures)
  2   Tool error (invalid arguments, file not found)

DOCUMENTATION:
  Skill: .claude/skills/managing-mcp-wrappers/SKILL.md
  References: .claude/skills/managing-mcp-wrappers/references/
`);
}

function parseArgs(args: string[]): CLIOptions | null {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return null;
  }

  const operation = args[0] as CLIOptions['operation'];

  const validOperations = ['create', 'verify-red', 'generate-wrapper', 'verify-green', 'update', 'audit', 'fix', 'test', 'generate-skill'];
  if (!validOperations.includes(operation)) {
    console.error(`❌ Invalid operation: ${operation}`);
    console.error('   Valid operations: ' + validOperations.join(', '));
    console.error('   Run with --help for usage');
    return null;
  }

  const options: CLIOptions = {
    operation,
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    all: args.includes('--all'),
  };

  // Parse --phase N
  const phaseIndex = args.indexOf('--phase');
  if (phaseIndex !== -1 && args[phaseIndex + 1]) {
    options.phase = parseInt(args[phaseIndex + 1], 10);
    if (isNaN(options.phase) || options.phase < 1 || options.phase > 11) {
      console.error('❌ Invalid phase number. Must be 1-11');
      return null;
    }
  }

  // Parse --service
  const serviceIndex = args.indexOf('--service');
  if (serviceIndex !== -1 && args[serviceIndex + 1]) {
    options.service = args[serviceIndex + 1];
  }

  // Parse positional arguments
  const positional = args.filter(arg => !arg.startsWith('--'));
  if (positional.length > 1) {
    if (operation === 'create' || operation === 'update') {
      // Expect: <service> <tool>
      options.service = positional[1];
      options.tool = positional[2];
    } else if (operation === 'generate-skill') {
      // Expect: <service>
      options.service = positional[1];
    } else if (operation === 'verify-red' || operation === 'generate-wrapper' || operation === 'verify-green') {
      // Expect: <service>/<tool> format
      const parts = positional[1].split('/');
      if (parts.length === 2) {
        options.service = parts[0];
        options.tool = parts[1];
      } else {
        console.error(`❌ ${operation} requires <service>/<tool> format`);
        console.error(`   Example: npm run ${operation} -- <service>/<tool>`);
        return null;
      }
    } else {
      // Expect: [name]
      options.name = positional[1];
    }
  }

  return options;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (!options) {
    process.exit(EXIT_ERROR);
  }

  try {
    let exitCode: number;

    switch (options.operation) {
      case 'create':
        if (!options.service || !options.tool) {
          console.error('❌ CREATE requires service and tool name');
          console.error('   Usage: npm run create -- <service> <tool>');
          exitCode = EXIT_ERROR;
        } else {
          exitCode = await createWrapper(options);
        }
        break;

      case 'verify-red':
        if (!options.service || !options.tool) {
          console.error('❌ VERIFY-RED requires service/tool');
          console.error('   Usage: npm run verify-red -- <service>/<tool>');
          exitCode = EXIT_ERROR;
        } else {
          exitCode = await verifyRed(options);
        }
        break;

      case 'generate-wrapper':
        if (!options.service || !options.tool) {
          console.error('❌ GENERATE-WRAPPER requires service/tool');
          console.error('   Usage: npm run generate-wrapper -- <service>/<tool>');
          exitCode = EXIT_ERROR;
        } else {
          exitCode = await generateWrapper(options);
        }
        break;

      case 'verify-green':
        if (!options.service || !options.tool) {
          console.error('❌ VERIFY-GREEN requires service/tool');
          console.error('   Usage: npm run verify-green -- <service>/<tool>');
          exitCode = EXIT_ERROR;
        } else {
          exitCode = await verifyGreen(options);
        }
        break;

      case 'update':
        if (!options.service || !options.tool) {
          console.error('❌ UPDATE requires service and tool name');
          console.error('   Usage: npm run update -- <service> <tool>');
          exitCode = EXIT_ERROR;
        } else {
          exitCode = await updateWrapper(options);
        }
        break;

      case 'audit':
        exitCode = await auditWrapper(options);
        break;

      case 'fix':
        if (!options.name) {
          console.error('❌ FIX requires wrapper name');
          console.error('   Usage: npm run fix -- <name> [--dry-run]');
          exitCode = EXIT_ERROR;
        } else {
          exitCode = await fixWrapper(options);
        }
        break;

      case 'test':
        if (!options.name) {
          console.error('❌ TEST requires wrapper name');
          console.error('   Usage: npm run test -- <name> [--unit] [--integration] [--coverage]');
          exitCode = EXIT_ERROR;
        } else {
          // Parse test-specific flags
          const testOptions = {
            ...options,
            unit: args.includes('--unit'),
            integration: args.includes('--integration'),
            coverage: args.includes('--coverage'),
          };
          exitCode = await testWrapper(testOptions);
        }
        break;

      case 'generate-skill':
        if (!options.service) {
          console.error('❌ GENERATE-SKILL requires service name');
          console.error('   Usage: npm run generate-skill -- <service>');
          exitCode = EXIT_ERROR;
        } else {
          exitCode = await generateSkill(options);
        }
        break;

      default:
        console.error(`❌ Unknown operation: ${options.operation}`);
        exitCode = EXIT_ERROR;
    }

    process.exit(exitCode);
  } catch (error) {
    console.error('⚠️ Tool Error - Fatal error:', error instanceof Error ? error.message : error);
    console.error('\nThis is a tool failure, not a compliance violation.');
    console.error('The MCP Manager CLI encountered an unexpected error during execution.');
    if (options.verbose && error instanceof Error) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(2); // Exit code 2 for tool errors
  }
}

main();
