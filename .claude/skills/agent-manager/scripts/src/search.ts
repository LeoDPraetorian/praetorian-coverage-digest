#!/usr/bin/env node
/**
 * search.ts - Agent Search CLI
 *
 * Usage:
 *   npm run search -- "<query>"
 *   npm run search -- "<query>" --type <category>
 *   npm run search -- "<query>" --limit 5
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { findAllAgents } from './lib/agent-finder.js';
import { parseAgent } from './lib/agent-parser.js';
import { AgentInfo, AgentCategory, AGENT_CATEGORIES } from './lib/types.js';

const program = new Command();

/**
 * Score an agent against a search query
 *
 * Scoring:
 * - Name exact: 100
 * - Name substring: 50
 * - Description match: 30
 * - Type match: 20
 * - Skills match: 10
 */
function scoreAgent(agent: AgentInfo, query: string): number {
  let score = 0;
  const lowerQuery = query.toLowerCase();
  const name = (agent.frontmatter.name || '').toLowerCase();
  const desc = (agent.frontmatter.description || '').toLowerCase();
  const type = agent.category.toLowerCase();
  const skills = (agent.frontmatter.skills || '').toLowerCase();

  // Name exact match
  if (name === lowerQuery) {
    score += 100;
  }
  // Name substring
  else if (name.includes(lowerQuery)) {
    score += 50;
  }

  // Description match
  if (desc.includes(lowerQuery)) {
    score += 30;
  }

  // Type match
  if (type.includes(lowerQuery)) {
    score += 20;
  }

  // Skills match
  if (skills.includes(lowerQuery)) {
    score += 10;
  }

  // Bonus for valid description (more reliable agent)
  if (agent.descriptionStatus === 'valid') {
    score += 5;
  }

  return score;
}

program
  .name('search')
  .description('Search for agents by name, description, or category')
  .argument('<query>', 'Search query')
  .option('-t, --type <category>', 'Filter by category')
  .option('-l, --limit <number>', 'Limit results', parseInt, 10)
  .option('--json', 'Output as JSON')
  .action(async (query, options) => {
    try {
      const spinner = ora('Searching agents...').start();
      const agentPaths = findAllAgents();

      // Score agents (already parsed by findAllAgents)
      const results: Array<{ agent: AgentInfo; score: number }> = [];

      for (const agent of agentPaths) {
        try {

          // Apply type filter
          if (options.type) {
            const type = options.type as AgentCategory;
            if (!AGENT_CATEGORIES.includes(type)) {
              spinner.fail(`⚠️  Tool Error - Invalid category: ${options.type}`);
              console.log(`Valid categories: ${AGENT_CATEGORIES.join(', ')}`);
              process.exit(2);
            }
            if (agent.category !== type) {
              continue;
            }
          }

          const score = scoreAgent(agent, query);
          if (score > 0) {
            results.push({ agent, score });
          }
        } catch {
          // Skip agents with errors
        }
      }

      // Sort by score descending
      results.sort((a, b) => b.score - a.score);

      // Apply limit
      const limited = results.slice(0, options.limit || 10);

      spinner.succeed(`Found ${results.length} matches`);

      if (limited.length === 0) {
        console.log(chalk.yellow(`\nNo agents found matching: "${query}"`));
        console.log('Try searching for: react, go, test, security, architecture');
        return;
      }

      // Output
      if (options.json) {
        const output = limited.map((r) => ({
          name: r.agent.frontmatter.name,
          score: r.score,
          type: r.agent.category,
          description: r.agent.frontmatter.description?.substring(0, 100),
          descriptionStatus: r.agent.descriptionStatus,
        }));
        console.log(JSON.stringify(output, null, 2));
      } else {
        console.log('\n' + chalk.bold(`Search Results for "${query}":`));
        console.log('─'.repeat(80));

        for (const { agent, score } of limited) {
          const statusIcon =
            agent.descriptionStatus === 'valid'
              ? chalk.green('✓')
              : chalk.red('✗');

          console.log(
            `${statusIcon} ${chalk.cyan(agent.frontmatter.name)} ` +
              chalk.gray(`(${agent.category})`) +
              chalk.yellow(` [Score: ${score}]`)
          );

          // Show truncated description
          const desc = agent.frontmatter.description || '';
          const truncated =
            desc.length > 80 ? desc.substring(0, 80) + '...' : desc;
          console.log(chalk.gray(`   ${truncated}`));
          console.log();
        }

        if (results.length > limited.length) {
          console.log(
            chalk.gray(
              `Showing ${limited.length} of ${results.length} results. Use --limit to see more.`
            )
          );
        }
      }
    } catch (err) {
      console.error(chalk.red(`\n⚠️  Tool Error - This is a tool failure, not a search failure.`));
      console.error(chalk.gray(`  ${err}`));
      process.exit(2);
    }
  });

program.parse();
