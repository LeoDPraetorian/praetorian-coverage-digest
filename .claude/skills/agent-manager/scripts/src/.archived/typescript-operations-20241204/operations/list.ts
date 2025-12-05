#!/usr/bin/env node
/**
 * list.ts - Agent Listing CLI
 *
 * Usage:
 *   npm run list
 *   npm run list -- --type development
 *   npm run list -- --status broken
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { findAllAgents, getAgentStats } from './lib/agent-finder.js';
import { parseAgent } from './lib/agent-parser.js';
import { AgentCategory, AGENT_CATEGORIES } from './lib/types.js';

const program = new Command();

program
  .name('list')
  .description('List all agents with status')
  .option('-t, --type <category>', 'Filter by category')
  .option(
    '-s, --status <status>',
    'Filter by description status (valid|broken|all)'
  )
  .option('--json', 'Output as JSON')
  .option('-q, --quiet', 'Only show names')
  .action(async (options) => {
    try {
      const spinner = ora('Finding agents...').start();
      const agentPaths = findAllAgents();
      spinner.succeed(`Found ${agentPaths.length} agents`);

      // Agents are already parsed by findAllAgents
      const agents = agentPaths;
      console.log(chalk.gray(`Parsed ${agents.length} agents`));

      // Apply filters
      let filtered = agents;

      if (options.type) {
        const type = options.type as AgentCategory;
        if (!AGENT_CATEGORIES.includes(type)) {
          console.error(chalk.red(`\n⚠️  Tool Error - Invalid category: ${options.type}`));
          console.log(`Valid categories: ${AGENT_CATEGORIES.join(', ')}`);
          process.exit(2);
        }
        filtered = filtered.filter((a) => a.category === type);
      }

      if (options.status) {
        if (options.status === 'broken') {
          filtered = filtered.filter((a) => a.descriptionStatus !== 'valid');
        } else if (options.status === 'valid') {
          filtered = filtered.filter((a) => a.descriptionStatus === 'valid');
        }
      }

      // Output
      if (options.json) {
        const output = filtered.map((a) => ({
          name: a.frontmatter.name,
          type: a.category,
          lines: a.lineCount,
          descriptionStatus: a.descriptionStatus,
          hasGatewaySkill: a.hasGatewaySkill,
          hasOutputFormat: a.hasOutputFormat,
          hasEscalationProtocol: a.hasEscalationProtocol,
        }));
        console.log(JSON.stringify(output, null, 2));
      } else if (options.quiet) {
        for (const agent of filtered) {
          console.log(agent.frontmatter.name);
        }
      } else {
        // Table output
        console.log('\n' + chalk.bold('Agents:'));
        console.log('─'.repeat(100));
        console.log(
          chalk.bold(
            padEnd('Name', 35) +
              padEnd('Category', 14) +
              padEnd('Lines', 7) +
              padEnd('Description', 22) +
              padEnd('Gateway', 9) +
              'Output'
          )
        );
        console.log('─'.repeat(100));

        for (const agent of filtered) {
          const descStatus = formatDescStatus(agent.descriptionStatus);
          const gateway = agent.hasGatewaySkill
            ? chalk.green('✓')
            : chalk.red('✗');
          const output = agent.hasOutputFormat
            ? chalk.green('✓')
            : chalk.red('✗');
          const lineColor =
            agent.lineCount > 300
              ? chalk.red
              : agent.lineCount > 250
                ? chalk.yellow
                : chalk.white;

          console.log(
            padEnd(agent.frontmatter.name || 'unknown', 35) +
              padEnd(agent.category, 14) +
              lineColor(padEnd(String(agent.lineCount), 7)) +
              padEnd(descStatus, 22) +
              padEnd(gateway, 9) +
              output
          );
        }

        console.log('─'.repeat(100));

        // Summary
        const valid = filtered.filter(
          (a) => a.descriptionStatus === 'valid'
        ).length;
        const broken = filtered.length - valid;

        console.log(
          `\nTotal: ${filtered.length} | ${chalk.green(`Valid: ${valid}`)} | ${chalk.red(`Broken: ${broken}`)}`
        );

        // Category breakdown
        const stats = getAgentStats();
        console.log(
          `\nBy category: ${Object.entries(stats.byCategory)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')}`
        );
      }
    } catch (err) {
      console.error(chalk.red(`\n⚠️  Tool Error - This is a tool failure, not a listing failure.`));
      console.error(chalk.gray(`  ${err}`));
      process.exit(2);
    }
  });

function padEnd(str: string, len: number): string {
  // Handle ANSI codes in string
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, '');
  const padding = Math.max(0, len - stripped.length);
  return str + ' '.repeat(padding);
}

function formatDescStatus(status: string): string {
  switch (status) {
    case 'valid':
      return chalk.green('✓ valid');
    case 'block-scalar-pipe':
      return chalk.red('✗ block |');
    case 'block-scalar-folded':
      return chalk.red('✗ block >');
    case 'missing':
      return chalk.red('✗ missing');
    case 'empty':
      return chalk.yellow('⚠ empty');
    default:
      return chalk.gray(status);
  }
}

program.parse();
