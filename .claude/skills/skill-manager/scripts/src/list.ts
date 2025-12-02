#!/usr/bin/env node
// src/list.ts
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { listAllSkills, SkillLocation } from './lib/skill-finder.js';

const program = new Command();

program
  .name('skill-manager-list')
  .description('List all skills (both core and library)')
  .option('--location <location>', 'Filter by location (core or library)')
  .action(async (options?: any) => {
    try {
      // Load all skills
      const spinner = ora('Loading skills...').start();
      const locationFilter = options.location as SkillLocation | undefined;
      const skills = listAllSkills(locationFilter);
      spinner.succeed(`Loaded ${skills.length} skills`);

      // Display as table
      console.log(chalk.blue('\n📋 Skills:\n'));
      console.log(chalk.blue('┌─────────────────────────────────┬──────────┬─────────────────────────┐'));
      console.log(chalk.blue('│ Skill Name                      │ Location │ Path                    │'));
      console.log(chalk.blue('├─────────────────────────────────┼──────────┼─────────────────────────┤'));

      skills.forEach(skill => {
        const name = skill.name.padEnd(30);
        const location = skill.location === 'core'
          ? chalk.green('CORE    ')
          : chalk.cyan('LIBRARY ');
        const pathShort = skill.path.replace(process.cwd(), '.').substring(0, 22);
        console.log(`│ ${name} │ ${location} │ ${pathShort.padEnd(22)} │`);
      });

      console.log(chalk.blue('└─────────────────────────────────┴──────────┴─────────────────────────┘'));
      console.log(chalk.blue(`\nTotal: ${skills.length} skills\n`));

      // Show location distribution
      const coreCount = skills.filter(s => s.location === 'core').length;
      const libraryCount = skills.filter(s => s.location === 'library').length;

      console.log(chalk.blue('Location Distribution:'));
      console.log(`  ${chalk.green('Core')}: ${coreCount}`);
      console.log(`  ${chalk.cyan('Library')}: ${libraryCount}`);
      console.log();

    } catch (error) {
      console.error(chalk.red('\n⚠️  Tool Error - This is a tool failure, not a list failure.'));
      console.error(chalk.gray(`  ${error}`));
      process.exit(2);
    }
  });

program.parse();
