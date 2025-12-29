#!/usr/bin/env node
// src/search.ts
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { listAllSkills } from './lib/skill-finder.js';
import { searchSkills } from './lib/skill-searcher.js';

const program = new Command();

program
  .name('skill-manager-search')
  .description('Search skills by keyword (searches both core and library)')
  .argument('<query>', 'Search query')
  .option('--location <location>', 'Filter by location (core or library)')
  .option('--limit <number>', 'Limit results', '10')
  .action(async (query: string, options?: any) => {
    try {
      // Load all skills (both core and library)
      const spinner = ora('Loading skills from both core and library...').start();
      const allSkills = listAllSkills(options.location);
      spinner.succeed(`Loaded ${allSkills.length} skills`);

      // Show breakdown
      const coreCount = allSkills.filter(s => s.location === 'core').length;
      const libraryCount = allSkills.filter(s => s.location === 'library').length;
      console.log(chalk.blue(`  Core: ${coreCount} skills`));
      console.log(chalk.blue(`  Library: ${libraryCount} skills\n`));

      // Search skills
      spinner.start('Searching...');
      const results = searchSkills(query, allSkills, {
        location: options.location,
        limit: parseInt(options.limit),
      });
      spinner.succeed(`Found ${results.length} matching skills`);

      // Display results
      if (results.length === 0) {
        console.log(chalk.yellow('\nNo skills found matching your query.\n'));
        return;
      }

      console.log(chalk.blue('\n📋 Search Results:\n'));

      results.forEach((skill, index) => {
        const locationBadge = skill.location === 'core'
          ? chalk.green('[CORE]')
          : chalk.cyan('[LIB]');

        const stalenessWarning = skill.stalenessWarning
          ? chalk.yellow(` ${skill.stalenessWarning}`)
          : '';

        console.log(chalk.green(`${index + 1}. ${skill.name} ${locationBadge} (Score: ${skill.score})${stalenessWarning}`));
        console.log(`   Location: ${skill.location}`);
        console.log(`   Path: ${skill.path}`);
        console.log(`   Matches: ${skill.matchReasons.join(', ')}`);
        console.log(`   Description: ${skill.frontmatter.description?.substring(0, 100)}...`);
        console.log();
      });

    } catch (error) {
      console.error(chalk.red('\n⚠️  Tool Error - This is a tool failure, not a search failure.'));
      console.error(chalk.gray(`  ${error}`));
      process.exit(2);
    }
  });

program.parse();
