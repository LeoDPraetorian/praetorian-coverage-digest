#!/usr/bin/env node
/**
 * Command Manager CLI
 * Unified command lifecycle management with Router Pattern enforcement
 *
 * Usage:
 *   npm run create -- <name> [description]
 *   npm run audit -- [name] [--phase N]
 *   npm run fix -- <name> [--dry-run]
 *   npm run list
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { auditCommand, findCommands, formatAuditReport } from './audit.js';
import { createCommand, formatCreateReport } from './create.js';
import { fixCommand, formatFixReport } from './fix.js';
import { formatListReport, listCommands } from './list.js';
import { EXIT_ERROR, EXIT_ISSUES, EXIT_SUCCESS } from './types.js';

function findRepoRoot(): string {
  try {
    // Use git rev-parse for reliable repo root detection
    const root = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return root;
  } catch {
    // Fallback: walk up directory tree looking for .git
    let current = process.cwd();
    while (current !== '/') {
      if (fs.existsSync(path.join(current, '.git'))) {
        return current;
      }
      current = path.dirname(current);
    }
    return process.cwd();
  }
}

function getCommandsDir(): string {
  const repoRoot = findRepoRoot();
  return path.join(repoRoot, '.claude', 'commands');
}

function showHelp(): void {
  console.log(`
Command Manager CLI - Router Pattern Enforcement

USAGE:
  npm run create -- <name> [description]    Create new command
  npm run audit -- [name]                   Audit command(s)
  npm run fix -- <name> [--dry-run]         Fix command issues
  npm run list                              List all commands

OPTIONS:
  --dry-run     Preview changes without applying (fix)
  --phase N     Run specific audit phase (1-8)
  --help        Show this help message

EXAMPLES:
  npm run create -- my-command "Brief description"
  npm run audit -- agent-manager
  npm run audit                            # Audit all commands
  npm run fix -- agent-manager --dry-run
  npm run list

EXIT CODES:
  0 - Success
  1 - Issues found (audit failed)
  2 - Tool error
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(EXIT_SUCCESS);
  }

  const operation = args[0];
  const commandsDir = getCommandsDir();

  try {
    switch (operation) {
      case 'create': {
        const name = args[1];
        if (!name) {
          console.error('Error: Command name required');
          console.error('Usage: npm run create -- <name> [description]');
          process.exit(EXIT_ERROR);
        }

        const description = args[2];

        // Check if a backing skill exists
        const repoRoot = findRepoRoot();
        const skillPath = path.join(repoRoot, '.claude', 'skills', name, 'SKILL.md');
        const skillLibPath = path.join(repoRoot, '.claude', 'skill-library', '**', name, 'SKILL.md');
        const hasBackingSkill = fs.existsSync(skillPath);

        const result = createCommand(commandsDir, {
          name,
          description,
          backingSkill: hasBackingSkill ? name : undefined,
          useRouterPattern: hasBackingSkill,
        });

        console.log(formatCreateReport(result, {
          name,
          description,
          backingSkill: hasBackingSkill ? name : undefined,
          useRouterPattern: hasBackingSkill,
        }));

        process.exit(result.success ? EXIT_SUCCESS : EXIT_ERROR);
        break;
      }

      case 'audit': {
        const name = args[1];

        if (name && !name.startsWith('--')) {
          // Audit specific command
          const commandPath = path.join(commandsDir, `${name}.md`);

          if (!fs.existsSync(commandPath)) {
            console.error(`Error: Command not found: ${commandPath}`);
            process.exit(EXIT_ERROR);
          }

          const result = auditCommand(commandPath);
          console.log(formatAuditReport(result));

          process.exit(result.passed ? EXIT_SUCCESS : EXIT_ISSUES);
        } else {
          // Audit all commands
          const commandPaths = findCommands(commandsDir);

          if (commandPaths.length === 0) {
            console.log('No commands found in', commandsDir);
            process.exit(EXIT_SUCCESS);
          }

          let hasFailures = false;
          const results: string[] = [];

          for (const cmdPath of commandPaths) {
            const result = auditCommand(cmdPath);
            if (!result.passed) hasFailures = true;
            results.push(formatAuditReport(result));
          }

          // Summary
          console.log('# Bulk Command Audit\n');
          console.log(`Audited ${commandPaths.length} commands\n`);
          console.log('---\n');

          for (const report of results) {
            console.log(report);
            console.log('\n---\n');
          }

          process.exit(hasFailures ? EXIT_ISSUES : EXIT_SUCCESS);
        }
        break;
      }

      case 'fix': {
        const name = args[1];
        if (!name || name.startsWith('--')) {
          console.error('Error: Command name required');
          console.error('Usage: npm run fix -- <name> [--dry-run]');
          process.exit(EXIT_ERROR);
        }

        const dryRun = args.includes('--dry-run');
        const commandPath = path.join(commandsDir, `${name}.md`);

        if (!fs.existsSync(commandPath)) {
          console.error(`Error: Command not found: ${commandPath}`);
          process.exit(EXIT_ERROR);
        }

        const result = fixCommand(commandPath, dryRun);
        console.log(formatFixReport(result));

        process.exit(result.changes.length > 0 ? EXIT_ISSUES : EXIT_SUCCESS);
        break;
      }

      case 'list': {
        const result = listCommands(commandsDir);
        console.log(formatListReport(result));

        process.exit(result.summary.fail > 0 ? EXIT_ISSUES : EXIT_SUCCESS);
        break;
      }

      default:
        console.error(`Unknown operation: ${operation}`);
        showHelp();
        process.exit(EXIT_ERROR);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(EXIT_ERROR);
  }
}

main().catch(console.error);
