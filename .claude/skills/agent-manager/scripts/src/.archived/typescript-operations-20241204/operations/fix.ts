#!/usr/bin/env node
/**
 * fix.ts - Agent Compliance Remediation CLI
 *
 * Usage:
 *   npm run fix -- <name> --dry-run
 *   npm run fix -- <name>
 *   npm run fix -- <name> --suggest
 *   npm run fix -- <name> --apply <fix-id> --value "<value>"
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import { findAgent, findAllAgents } from './lib/agent-finder.js';
import { parseAgent } from './lib/agent-parser.js';
import { runAudit, formatAuditReport } from './lib/audit-runner.js';
import { applyFix } from './lib/fix-handlers.js';
import { formatMarkdownTables } from './lib/format-tables.js';
import { FixSuggestionOutput, FixQuestion } from './lib/types.js';

const program = new Command();

program
  .name('fix')
  .description('Fix agent compliance issues')
  .argument('[name]', 'Agent name (or --batch for all)')
  .option('-d, --dry-run', 'Show what would be fixed without writing')
  .option('-s, --suggest', 'Show all suggestions with details')
  .option('-a, --apply <fix-id>', 'Apply a specific fix')
  .option('-v, --value <value>', 'Custom value for the fix')
  .option('--all-auto', 'Apply all auto-fixable fixes')
  .option('-b, --batch', 'Apply fix to all agents')
  .action(async (name, options) => {
    try {
      // Handle batch mode
      if (options.batch) {
        if (!options.apply) {
          console.error(chalk.red('\n⚠️  Tool Error - Batch mode requires --apply <fix-id>'));
          console.log('Example: npm run fix -- --batch --apply phase1-description');
          process.exit(2);
        }

        const fixId = options.apply;
        const spinner = ora('Finding all agents...').start();
        const agents = findAllAgents();
        spinner.succeed(`Found ${agents.length} agents`);

        let fixed = 0;
        let skipped = 0;
        let errors = 0;

        for (const agent of agents) {
          const agentName = agent.fileName.replace(/\.md$/, '');
          try {
            const content = fs.readFileSync(agent.filePath, 'utf-8');
            const auditResult = runAudit(agent);
            const suggestion = auditResult.phases.flatMap(p => p.suggestions).find(s => s.id === fixId);

            if (!suggestion) {
              skipped++;
              continue;
            }

            const fixedContent = applyFix(content, fixId, suggestion, options.value);

            if (fixedContent === content) {
              skipped++;
              continue;
            }

            if (!options.dryRun) {
              const formatted = formatMarkdownTables(fixedContent);
              fs.writeFileSync(agent.filePath, formatted);
            }
            console.log(chalk.green(`✅ ${agentName}`));
            fixed++;
          } catch (err) {
            console.log(chalk.red(`❌ ${agentName}: ${err}`));
            errors++;
          }
        }

        console.log('');
        console.log(chalk.cyan('═══ Batch Fix Summary ═══'));
        console.log(`Fixed: ${chalk.green(fixed)}`);
        console.log(`Skipped: ${chalk.gray(skipped)}`);
        console.log(`Errors: ${chalk.red(errors)}`);
        if (options.dryRun) {
          console.log(chalk.yellow('(dry run - no changes written)'));
        }
        return;
      }

      // Find agent
      const spinner = ora(`Finding agent: ${name}...`).start();
      const agent = findAgent(name);

      if (!agent) {
        spinner.fail(`Agent not found: ${name}`);
        console.error(chalk.yellow('\n⚠️  Tool Error - This is a tool failure, not a fix failure.'));
        console.error(chalk.gray('  Check that the agent name is correct and exists in .claude/agents/'));
        process.exit(2);
      }

      spinner.succeed(`Found: ${agent.filePath}`);
      const auditResult = runAudit(agent);

      // Collect all suggestions
      const allSuggestions = auditResult.phases.flatMap(p => p.suggestions);
      const autoFixable = allSuggestions.filter(s => s.autoFixable);
      const manual = allSuggestions.filter(s => !s.autoFixable);

      // Handle --suggest mode (JSON output for Claude interception)
      if (options.suggest) {
        const output = handleSuggestMode(name, autoFixable, manual);
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      // Handle --apply mode (supports comma-separated fix IDs)
      if (options.apply) {
        const fixIds = options.apply.split(',').map((id: string) => id.trim());
        const suggestions = fixIds.map((fixId: string) => {
          const suggestion = allSuggestions.find(s => s.id === fixId);
          if (!suggestion) {
            console.error(chalk.red(`\n⚠️  Tool Error - Fix not found: ${fixId}`));
            console.log('Available fixes:', allSuggestions.map(s => s.id).join(', '));
            process.exit(2);
          }
          return { fixId, suggestion };
        });

        // Check for manual fixes without value
        for (const { fixId, suggestion } of suggestions) {
          if (!suggestion.autoFixable && !options.value) {
            console.error(chalk.red(`\n⚠️  Tool Error - Fix ${fixId} requires manual review or --value`));
            console.log(chalk.gray('Suggested value:'));
            console.log(suggestion.suggestedValue);
            process.exit(2);
          }
        }

        // Apply all fixes sequentially
        let content = fs.readFileSync(agent.filePath, 'utf-8');
        const applied: string[] = [];

        for (const { fixId, suggestion } of suggestions) {
          const before = content;
          content = applyFix(content, fixId, suggestion, options.value);
          if (content !== before) {
            applied.push(fixId);
          }
        }

        if (options.dryRun) {
          console.log(chalk.yellow('\n[DRY RUN] Would apply:'));
          console.log(`Fixes: ${applied.join(', ')}`);
          console.log('─'.repeat(60));
          // Show diff-like output
          const oldLines = fs.readFileSync(agent.filePath, 'utf-8').split('\n');
          const newLines = content.split('\n');
          for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
            if (oldLines[i] !== newLines[i]) {
              if (oldLines[i]) console.log(chalk.red(`- ${oldLines[i]}`));
              if (newLines[i]) console.log(chalk.green(`+ ${newLines[i]}`));
            }
          }
          return;
        }

        const formatted = formatMarkdownTables(content);
        fs.writeFileSync(agent.filePath, formatted, 'utf-8');
        console.log(chalk.green(`✅ Applied ${applied.length} fix(es):`));
        applied.forEach(f => console.log(`  - ${f}`));

        // Re-audit
        const reAgent = parseAgent(agent.filePath);
        const reAudit = runAudit(reAgent);
        console.log(`\nRemaining issues: ${reAudit.summary.errors} errors, ${reAudit.summary.warnings} warnings`);

        return;
      }

      // Handle --all-auto mode
      if (options.allAuto) {
        if (autoFixable.length === 0) {
          console.log(chalk.green('✅ No auto-fixable issues'));
          return;
        }

        let content = fs.readFileSync(agent.filePath, 'utf-8');
        const applied: string[] = [];

        for (const suggestion of autoFixable) {
          const before = content;
          content = applyFix(content, suggestion.id, suggestion);
          if (content !== before) {
            applied.push(suggestion.id);
          }
        }

        if (options.dryRun) {
          console.log(chalk.yellow('\n[DRY RUN] Would apply:'));
          console.log(applied.join(', '));
          console.log('─'.repeat(60));
          console.log(content);
          return;
        }

        const formatted = formatMarkdownTables(content);
        fs.writeFileSync(agent.filePath, formatted, 'utf-8');
        console.log(chalk.green(`✅ Applied ${applied.length} auto-fixes:`));
        applied.forEach(f => console.log(`  - ${f}`));

        // Re-audit
        const reAgent = parseAgent(agent.filePath);
        const reAudit = runAudit(reAgent);
        console.log(`\nRemaining issues: ${reAudit.summary.errors} errors, ${reAudit.summary.warnings} warnings`);

        return;
      }

      // Default: show audit report with fix hints
      console.log('\n' + formatAuditReport(auditResult));

      if (autoFixable.length > 0) {
        console.log(chalk.cyan('\n═══ Quick Fix Commands ═══\n'));
        console.log(`npm run fix -- ${name} --all-auto     # Apply all auto-fixes`);
        for (const s of autoFixable.slice(0, 3)) {
          console.log(`npm run fix -- ${name} --apply ${s.id}`);
        }
        if (autoFixable.length > 3) {
          console.log(chalk.gray(`  ... and ${autoFixable.length - 3} more`));
        }
      }

    } catch (err) {
      console.error(chalk.red(`\n⚠️  Tool Error - This is a tool failure, not a fix failure.`));
      console.error(chalk.gray(`  ${err}`));
      process.exit(2);
    }
  });

/**
 * Handle suggest mode with JSON output for Claude interception
 * Follows skill-manager create.ts pattern for interactive workflows
 */
function handleSuggestMode(
  agentName: string,
  autoFixable: any[],
  manual: any[]
): FixSuggestionOutput {
  // No fixes needed
  if (autoFixable.length === 0 && manual.length === 0) {
    return {
      agent: agentName,
      status: 'READY',
      autoFixable: [],
      manual: [],
      applyCommand: `# No fixes needed - agent is compliant`,
    };
  }

  // Build question for fix selection
  const question: FixQuestion = {
    id: 'selectedFixes',
    question: 'Which fixes would you like to apply?',
    header: 'Fix Selection',
    multiSelect: true,
    options: [
      // Auto-fixable fixes first
      ...autoFixable.map(fix => ({
        label: `[AUTO] ${fix.id}`,
        description: fix.description,
      })),
      // Manual fixes second
      ...manual.map(fix => ({
        label: `[MANUAL] ${fix.id}`,
        description: fix.description + ' (requires manual review)',
      })),
    ],
  };

  return {
    agent: agentName,
    status: 'NEEDS_INPUT',
    autoFixable,
    manual,
    questions: [question],
    collectedAnswers: {
      selectedFixes: [],
    },
    applyCommand: `npm run fix -- ${agentName} --apply $SELECTED_FIXES`,
  };
}

program.parse();
