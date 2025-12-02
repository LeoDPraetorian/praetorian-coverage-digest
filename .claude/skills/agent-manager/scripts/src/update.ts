#!/usr/bin/env node
/**
 * update.ts - TDD Agent Update CLI
 *
 * Usage:
 *   npm run update -- <name> "<changes>"
 *   npm run update -- <name> --suggest
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import { findAgent } from './lib/agent-finder.js';
import { parseAgent } from './lib/agent-parser.js';
import { runAudit, formatAuditReport } from './lib/audit-runner.js';

const program = new Command();

program
  .name('update')
  .description('Update an existing agent using TDD workflow')
  .argument('<name>', 'Agent name')
  .argument('[changes]', 'Description of changes to make')
  .option('--suggest', 'Show suggested improvements based on audit')
  .option('--backup', 'Create backup before updating')
  .action(async (name, changes, options) => {
    try {
      // Find agent
      const spinner = ora(`Finding agent: ${name}...`).start();
      const agent = findAgent(name);

      if (!agent) {
        spinner.fail(`Agent not found: ${name}`);
        console.error(chalk.yellow('\n⚠️  Tool Error - This is a tool failure, not an update failure.'));
        console.error(chalk.gray('  Check that the agent name is correct and exists in .claude/agents/'));
        process.exit(2);
      }

      spinner.succeed(`Found: ${agent.filePath}`);

      // Handle --suggest mode
      if (options.suggest) {
        console.log(chalk.cyan('\n═══ Suggested Improvements ═══'));

        // Run audit to find issues
        const auditResult = runAudit(agent);

        if (auditResult.summary.totalIssues === 0) {
          console.log(chalk.green('✅ Agent is fully compliant. No suggestions.'));
          return;
        }

        console.log(chalk.yellow(`Found ${auditResult.summary.totalIssues} potential improvements:\n`));

        for (const phase of auditResult.phases) {
          if (phase.suggestions.length > 0) {
            console.log(chalk.cyan(`Phase ${phase.phase}: ${phase.name}`));
            for (const suggestion of phase.suggestions) {
              const autoTag = suggestion.autoFixable ? chalk.green('[AUTO]') : chalk.yellow('[MANUAL]');
              console.log(`  ${autoTag} ${suggestion.id}: ${suggestion.description}`);
              if (suggestion.suggestedValue) {
                const preview = suggestion.suggestedValue.substring(0, 100);
                console.log(chalk.gray(`    → ${preview}${suggestion.suggestedValue.length > 100 ? '...' : ''}`));
              }
            }
            console.log('');
          }
        }

        console.log(chalk.gray('Use "npm run fix -- ' + name + '" to apply auto-fixable suggestions'));
        return;
      }

      // Require changes description
      if (!changes) {
        console.error(chalk.red('\n⚠️  Tool Error - Changes description required'));
        console.log('Usage: npm run update -- <name> "<changes>"');
        console.log('');
        console.log('Use --suggest to see recommended improvements');
        process.exit(2);
      }

      // TDD Phase 1: RED - Document current state
      console.log(chalk.cyan('\n═══ TDD Phase: RED ═══'));
      console.log(chalk.gray('Current agent state:'));
      console.log(`  Lines: ${agent.lineCount}`);
      console.log(`  Description Status: ${agent.descriptionStatus}`);
      console.log(`  Has Gateway Skill: ${agent.hasGatewaySkill ? '✅' : '❌'}`);
      console.log(`  Has Output Format: ${agent.hasOutputFormat ? '✅' : '❌'}`);
      console.log(`  Has Escalation: ${agent.hasEscalationProtocol ? '✅' : '❌'}`);
      console.log('');
      console.log(chalk.white(`Requested changes: ${changes}`));
      console.log('');

      // Create backup if requested
      if (options.backup) {
        const backupPath = agent.filePath.replace('.md', `.backup-${Date.now()}.md`);
        fs.copyFileSync(agent.filePath, backupPath);
        console.log(chalk.gray(`Backup created: ${backupPath}`));
      }

      // Show current content and guidance
      console.log(chalk.cyan('\n═══ TDD Phase: GREEN ═══'));
      console.log(chalk.gray('To implement changes:'));
      console.log('');
      console.log('1. Open the agent file:');
      console.log(chalk.white(`   ${agent.filePath}`));
      console.log('');
      console.log('2. Make the requested changes:');
      console.log(chalk.white(`   ${changes}`));
      console.log('');
      console.log('3. Verify compliance:');
      console.log(chalk.white(`   npm run audit -- ${name}`));
      console.log('');
      console.log('4. Test discovery in new Claude Code session');
      console.log('');

      // Show current audit state
      console.log(chalk.cyan('\n═══ Current Compliance State ═══'));
      const auditResult = runAudit(agent);

      if (auditResult.summary.errors > 0) {
        console.log(chalk.red(`❌ ${auditResult.summary.errors} errors, ${auditResult.summary.warnings} warnings`));
        console.log(chalk.gray('Existing issues should be fixed along with the update.'));
      } else if (auditResult.summary.warnings > 0) {
        console.log(chalk.yellow(`⚠️ ${auditResult.summary.warnings} warnings`));
      } else {
        console.log(chalk.green('✅ Currently compliant'));
      }

      // Remind about lean agent pattern
      if (agent.lineCount > 250) {
        console.log(chalk.yellow(`\n⚠️ Agent is ${agent.lineCount} lines (target: <300)`));
        console.log(chalk.gray('Consider extracting patterns to skills.'));
      }

    } catch (err) {
      console.error(chalk.red(`\n⚠️  Tool Error - This is a tool failure, not an update failure.`));
      console.error(chalk.gray(`  ${err}`));
      process.exit(2);
    }
  });

program.parse();
