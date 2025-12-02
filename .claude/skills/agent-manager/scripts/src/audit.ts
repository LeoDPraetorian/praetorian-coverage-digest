#!/usr/bin/env node
/**
 * audit.ts - Agent Compliance Audit CLI
 *
 * Uses git-based path resolution via findProjectRoot() for reliable
 * repo root detection from any working directory.
 *
 * Usage:
 *   npm run audit -- <name>              # Single agent
 *   npm run audit -- --all               # All agents
 *   npm run audit -- <name> --phase 1    # Specific phase
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
// Git-based path resolution - used by agent-finder internally
import { findProjectRoot } from '../../../../lib/find-project-root.js';
import { findAgent, findAllAgents } from './lib/agent-finder.js';
import { parseAgent } from './lib/agent-parser.js';
import {
  runAudit,
  formatAuditReport,
  formatBatchAuditSummary,
} from './lib/audit-runner.js';
import { AuditPhaseNumber } from './lib/types.js';

const program = new Command();

program
  .name('audit')
  .description('Run 6-phase compliance audit on agents')
  .argument('[name]', 'Agent name to audit')
  .option('-a, --all', 'Audit all agents')
  .option('-p, --phase <number>', 'Run specific phase only', parseInt)
  .option('-q, --quiet', 'Only show summary')
  .option('--json', 'Output as JSON')
  .action(async (name, options) => {
    try {
      // Determine phases to run
      const phases = options.phase
        ? [options.phase as AuditPhaseNumber]
        : undefined;

      if (options.all) {
        // Batch audit all agents
        const spinner = ora('Finding all agents...').start();
        const agents = findAllAgents();
        spinner.succeed(`Found ${agents.length} agents`);

        const results = [];
        const auditSpinner = ora('Auditing agents...').start();

        for (let i = 0; i < agents.length; i++) {
          const agent = agents[i];
          auditSpinner.text = `Auditing ${i + 1}/${agents.length}: ${agent.frontmatter.name}...`;

          try {
            const result = runAudit(agent, phases);
            results.push(result);
          } catch (err) {
            console.error(
              chalk.red(`\nFailed to audit ${agent.frontmatter.name}: ${err}`)
            );
          }
        }

        auditSpinner.succeed(`Audited ${results.length} agents`);

        if (options.json) {
          console.log(JSON.stringify(results, null, 2));
        } else if (options.quiet) {
          // Summary only
          const passed = results.filter((r) => r.summary.errors === 0).length;
          const failed = results.length - passed;
          console.log(chalk.green(`✅ Passed: ${passed}`));
          console.log(chalk.red(`❌ Failed: ${failed}`));
        } else {
          console.log('\n' + formatBatchAuditSummary(results));
        }
      } else if (name) {
        // Single agent audit
        const spinner = ora(`Finding agent: ${name}...`).start();
        const agent = findAgent(name);

        if (!agent) {
          spinner.fail(`Agent not found: ${name}`);
          console.error(chalk.yellow('\n⚠️  Tool Error - This is a tool failure, not an audit failure.'));
          console.error(chalk.gray('  Check that the agent name is correct and exists in .claude/agents/'));
          process.exit(2);
        }

        spinner.succeed(`Found agent: ${agent.filePath}`);

        const auditSpinner = ora('Running audit...').start();
        const result = runAudit(agent, phases);
        auditSpinner.succeed('Audit complete');

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else if (options.quiet) {
          const status =
            result.summary.errors === 0
              ? chalk.green('✅ PASSED')
              : chalk.red('❌ FAILED');
          console.log(
            `${name}: ${status} (${result.summary.errors} errors, ${result.summary.warnings} warnings)`
          );
        } else {
          console.log('\n' + formatAuditReport(result));

          // Clear visual summary for audit result (not a tool error)
          console.log('');
          if (result.summary.errors > 0) {
            console.log(chalk.red.bold('═══════════════════════════════════════════════════════════════'));
            console.log(chalk.red.bold(`  AUDIT RESULT: FAILED`));
            console.log(chalk.red(`  Agent "${name}" has ${result.summary.errors} error(s) and ${result.summary.warnings} warning(s)`));
            console.log(chalk.red.bold('═══════════════════════════════════════════════════════════════'));
          } else {
            console.log(chalk.green.bold('═══════════════════════════════════════════════════════════════'));
            console.log(chalk.green.bold(`  AUDIT RESULT: PASSED`));
            console.log(chalk.green(`  Agent "${name}" passed all compliance checks`));
            console.log(chalk.green.bold('═══════════════════════════════════════════════════════════════'));
          }
        }

        // Exit 0 for successful audit run (even with violations)
        // Violations are not tool errors - the audit worked correctly
        // Exit 2 is reserved for actual tool errors (file not found, parse errors, etc.)
      } else {
        console.log(chalk.yellow('Usage: npm run audit -- <name> | --all'));
        console.log('\nExamples:');
        console.log('  npm run audit -- react-developer');
        console.log('  npm run audit -- --all');
        console.log('  npm run audit -- react-developer --phase 1');
        process.exit(2);
      }
    } catch (err) {
      console.error(chalk.red(`\n⚠️  Tool Error - This is a tool failure, not an audit failure.`));
      console.error(chalk.gray(`  ${err}`));
      process.exit(2);
    }
  });

program.parse();
