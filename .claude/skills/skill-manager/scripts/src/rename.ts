#!/usr/bin/env node
// src/rename.ts
import { Command } from 'commander';
import Enquirer from 'enquirer';
const { Confirm } = Enquirer as any;
import chalk from 'chalk';
import ora from 'ora';
import { renameSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import matter from 'gray-matter';
import { findSkill } from './lib/skill-finder.js';
import { dirname, join } from 'path';
import { findProjectRoot } from '../../../../lib/find-project-root.js';

const PROJECT_ROOT = findProjectRoot();

/**
 * Update command references in .claude/commands
 */
function updateCommandReferences(oldName: string, newName: string): number {
  const repoRoot = PROJECT_ROOT;
  const commandsDir = join(repoRoot, '.claude', 'commands');
  let updatedCount = 0;

  if (!existsSync(commandsDir)) return 0;

  const files = readdirSync(commandsDir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const filePath = join(commandsDir, file);
    const content = readFileSync(filePath, 'utf-8');

    // Check for references to the old skill name
    const patterns = [
      new RegExp(`skill:\\s*["']?${oldName}["']?`, 'gi'),
      new RegExp(`skill-manager.*${oldName}`, 'gi'),
      new RegExp(`skills/${oldName}`, 'g'),
    ];

    let updated = content;
    let hasChanges = false;

    for (const pattern of patterns) {
      if (pattern.test(updated)) {
        updated = updated.replace(pattern, (match) => match.replace(oldName, newName));
        hasChanges = true;
      }
    }

    if (hasChanges) {
      writeFileSync(filePath, updated, 'utf-8');
      updatedCount++;
    }
  }

  return updatedCount;
}

/**
 * Update skill references across all .claude directories
 */
function updateSkillReferences(oldName: string, newName: string): number {
  const repoRoot = PROJECT_ROOT;
  const locations = [
    join(repoRoot, '.claude', 'skills'),
    join(repoRoot, '.claude', 'skill-library'),
    join(repoRoot, '.claude', 'agents'),
    join(repoRoot, '.claude', 'hooks'),
    join(repoRoot, '.claude', 'settings'),
  ];
  let updatedCount = 0;

  for (const baseDir of locations) {
    if (!existsSync(baseDir)) continue;
    updatedCount += updateSkillReferencesInDir(baseDir, oldName, newName);
  }

  return updatedCount;
}

/**
 * Recursively update skill references in a directory
 */
function updateSkillReferencesInDir(dir: string, oldName: string, newName: string): number {
  let updatedCount = 0;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const entryPath = join(dir, entry);
    const stat = statSync(entryPath);

    if (stat.isDirectory()) {
      // Skip the skill being renamed
      if (entry === oldName || entry === newName) continue;
      updatedCount += updateSkillReferencesInDir(entryPath, oldName, newName);
    } else if (entry.endsWith('.md')) {
      const content = readFileSync(entryPath, 'utf-8');

      // Check for references to the old skill name
      const patterns = [
        new RegExp(`skill:\\s*["']?${oldName}["']?`, 'gi'),
        new RegExp(`\\b${oldName}\\b`, 'g'), // Word boundary match
        new RegExp(`skills/${oldName}`, 'g'),
        new RegExp(`skill-library/[^/]+/${oldName}`, 'g'),
      ];

      let updated = content;
      let hasChanges = false;

      for (const pattern of patterns) {
        if (pattern.test(updated)) {
          updated = updated.replace(pattern, (match) => match.replace(oldName, newName));
          hasChanges = true;
        }
      }

      if (hasChanges) {
        writeFileSync(entryPath, updated, 'utf-8');
        updatedCount++;
      }
    }
  }

  return updatedCount;
}

/**
 * Update deprecation registry: add old name as deprecated, update any existing references
 */
function updateDeprecationRegistry(oldName: string, newName: string): { added: boolean; updated: boolean } {
  const repoRoot = PROJECT_ROOT;
  const registryPath = join(repoRoot, '.claude', 'deprecated-skills.json');

  // Create registry if it doesn't exist
  let registry: Record<string, unknown> = {};
  if (existsSync(registryPath)) {
    try {
      registry = JSON.parse(readFileSync(registryPath, 'utf-8'));
    } catch {
      registry = {};
    }
  }

  let added = false;
  let updated = false;

  // If old name was already deprecated (pointing somewhere else), update the chain
  if (registry[oldName]) {
    // Old name was already deprecated - update its entry to point to new name
    const existingEntry = registry[oldName] as Record<string, unknown>;
    existingEntry.replacedBy = newName;
    existingEntry.deprecatedOn = new Date().toISOString().split('T')[0];
    updated = true;
  } else {
    // Add new deprecation entry for the old name
    registry[oldName] = {
      type: 'renamed',
      replacedBy: newName,
      deprecatedOn: new Date().toISOString().split('T')[0]
    };
    added = true;
  }

  // Update any entries that point to the old name (chain repair)
  for (const [key, value] of Object.entries(registry)) {
    if (key === oldName) continue; // Skip the entry we just modified
    if (typeof value === 'object' && value !== null) {
      const entry = value as Record<string, unknown>;
      if (entry.replacedBy === oldName) {
        entry.replacedBy = newName;
        updated = true;
      }
    }
  }

  writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8');
  return { added, updated };
}

const program = new Command();

program
  .name('skill-manager-rename')
  .description('Rename skill and update all references')
  .argument('<old-name>', 'Current skill name')
  .argument('<new-name>', 'New skill name')
  .action(async (oldName: string, newName: string) => {
    try {
      // Validate names
      const nameRegex = /^[a-z][a-z0-9-]*$/;
      if (!nameRegex.test(newName)) {
        console.error(chalk.red('\n⚠️  Tool Error - New skill name must be kebab-case'));
        process.exit(2);
      }

      // Find old skill
      const spinner = ora(`Finding skill '${oldName}'...`).start();
      const oldSkill = findSkill(oldName);

      if (!oldSkill) {
        spinner.fail(chalk.red(`Skill '${oldName}' not found`));
        console.error(chalk.yellow('\n⚠️  Tool Error - This is a tool failure, not a rename failure.'));
        console.error(chalk.gray('  Check that the skill name is correct'));
        process.exit(2);
      }

      spinner.succeed(`Found skill at ${oldSkill.path}`);

      // Check new name doesn't exist
      spinner.start(`Checking if '${newName}' is available...`);
      const newSkill = findSkill(newName);

      if (newSkill) {
        spinner.fail(chalk.red(`Skill '${newName}' already exists`));
        console.error(chalk.yellow('\n⚠️  Tool Error - This is a tool failure, not a rename failure.'));
        console.error(chalk.gray('  Choose a different name or delete the existing skill'));
        process.exit(2);
      }

      spinner.succeed(`Name '${newName}' is available`);

      // Confirm rename
      const confirmPrompt = new Confirm({
        message: `Rename '${oldName}' to '${newName}'?`,
        initial: true,
      });
      const proceed = await confirmPrompt.run() as boolean;

      if (!proceed) {
        console.log(chalk.yellow('Rename cancelled'));
        process.exit(0);
      }

      // Update frontmatter
      spinner.start('Updating frontmatter...');
      const content = readFileSync(oldSkill.path, 'utf-8');
      const { data, content: body } = matter(content);
      data.name = newName;
      const updated = matter.stringify(body, data);
      writeFileSync(oldSkill.path, updated, 'utf-8');
      spinner.succeed('Frontmatter updated');

      // Step 4: Rename directory
      spinner.start('Renaming directory...');
      const oldDir = dirname(oldSkill.path);
      const newDir = oldDir.replace(new RegExp(`/${oldName}$`), `/${newName}`);
      renameSync(oldDir, newDir);
      spinner.succeed(`Renamed to ${newDir}`);

      // Step 5: Update command references
      spinner.start('Updating command references...');
      const commandsUpdated = updateCommandReferences(oldName, newName);
      if (commandsUpdated > 0) {
        spinner.succeed(`Updated ${commandsUpdated} command file(s)`);
      } else {
        spinner.succeed('No command references found');
      }

      // Step 6: Update skill references in other skills
      spinner.start('Updating skill references...');
      const skillRefsUpdated = updateSkillReferences(oldName, newName);
      if (skillRefsUpdated > 0) {
        spinner.succeed(`Updated ${skillRefsUpdated} skill file(s)`);
      } else {
        spinner.succeed('No skill references found');
      }

      // Step 7: Update deprecation registry (add old name as deprecated)
      spinner.start('Updating deprecation registry...');
      const registryResult = updateDeprecationRegistry(oldName, newName);
      if (registryResult.added) {
        spinner.succeed(`Added '${oldName}' to deprecation registry → '${newName}'`);
      } else if (registryResult.updated) {
        spinner.succeed('Deprecation registry entries updated');
      } else {
        spinner.succeed('Deprecation registry unchanged');
      }

      console.log(chalk.green('\n✅ Skill renamed successfully!\n'));
      console.log(chalk.blue('Summary:'));
      console.log(chalk.gray(`  • Directory: ${oldDir} → ${newDir}`));
      console.log(chalk.gray(`  • Command files updated: ${commandsUpdated}`));
      console.log(chalk.gray(`  • Skill files updated: ${skillRefsUpdated}`));
      console.log(chalk.gray(`  • Deprecation registry: ${registryResult.added ? 'entry added' : registryResult.updated ? 'entries updated' : 'no changes'}`));
      console.log(chalk.blue(`\nNext: npm run audit -- ${newName}\n`));

    } catch (error) {
      console.error(chalk.red('\n⚠️  Tool Error - This is a tool failure, not a rename failure.'));
      console.error(chalk.gray(`  ${error}`));
      process.exit(2);
    }
  });

program.parse();
