#!/usr/bin/env node
/**
 * rename.ts - Safe Agent Renaming CLI
 *
 * Usage:
 *   npm run rename -- <old-name> <new-name>
 *   npm run rename -- <old-name> <new-name> --dry-run
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { findAgent, findAllAgents, getRepoRoot } from './lib/agent-finder.js';
import { parseAgent } from './lib/agent-parser.js';

const program = new Command();

/**
 * Find all references to an agent name across the codebase
 */
function findReferences(
  agentName: string,
  repoRoot: string
): Array<{ file: string; line: number; content: string }> {
  const references: Array<{ file: string; line: number; content: string }> = [];
  const searchDirs = [
    path.join(repoRoot, '.claude', 'agents'),
    path.join(repoRoot, '.claude', 'skills'),
    path.join(repoRoot, '.claude', 'commands'),
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = walkDir(dir, ['.md', '.ts', '.json']);
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        // Look for various reference patterns
        const patterns = [
          new RegExp(`["'\`]${agentName}["'\`]`, 'g'),
          new RegExp(`→\\s*Recommend\\s*\`${agentName}\``, 'g'),
          new RegExp(`subagent_type.*${agentName}`, 'g'),
          new RegExp(`recommended_agent.*${agentName}`, 'g'),
        ];

        for (const pattern of patterns) {
          if (pattern.test(lines[i])) {
            references.push({
              file,
              line: i + 1,
              content: lines[i].trim(),
            });
            break;
          }
        }
      }
    }
  }

  return references;
}

/**
 * Walk directory recursively and return files matching extensions
 */
function walkDir(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

program
  .name('rename')
  .description('Safely rename an agent with reference updates')
  .argument('<old-name>', 'Current agent name')
  .argument('<new-name>', 'New agent name')
  .option('-d, --dry-run', 'Show what would be changed without writing')
  .option('--no-refs', 'Skip reference updates')
  .option('--archive', 'Archive old agent instead of deleting')
  .action(async (oldName, newName, options) => {
    try {
      const repoRoot = getRepoRoot();

      // Step 1: Validate old name exists
      console.log(chalk.cyan('\n═══ Step 1: Validate Old Name ═══'));
      const oldAgent = findAgent(oldName);

      if (!oldAgent) {
        console.error(chalk.red(`\n⚠️  Tool Error - Agent not found: ${oldName}`));
        console.error(chalk.gray('  Check that the agent name is correct and exists in .claude/agents/'));
        process.exit(2);
      }

      console.log(chalk.green(`✓ Found: ${oldAgent.filePath}`));

      // Step 2: Validate new name is available
      console.log(chalk.cyan('\n═══ Step 2: Validate New Name ═══'));
      const existingNew = findAgent(newName);

      if (existingNew) {
        console.error(chalk.red(`\n⚠️  Tool Error - Agent already exists: ${existingNew.filePath}`));
        console.log(chalk.yellow('Use a different name or delete the existing agent first'));
        process.exit(2);
      }

      // Validate new name format
      if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(newName)) {
        console.error(chalk.red('\n⚠️  Tool Error - Invalid name format. Must be kebab-case (e.g., my-agent)'));
        process.exit(2);
      }

      console.log(chalk.green(`✓ Name available: ${newName}`));

      // Step 3: Find references
      console.log(chalk.cyan('\n═══ Step 3: Find References ═══'));
      const references = findReferences(oldName, repoRoot);
      console.log(`Found ${references.length} references to "${oldName}"`);

      if (references.length > 0) {
        for (const ref of references.slice(0, 10)) {
          const relPath = path.relative(repoRoot, ref.file);
          console.log(chalk.gray(`  ${relPath}:${ref.line}`));
        }
        if (references.length > 10) {
          console.log(chalk.gray(`  ... and ${references.length - 10} more`));
        }
      }

      // Step 4: Update frontmatter
      console.log(chalk.cyan('\n═══ Step 4: Update Frontmatter ═══'));
      const content = fs.readFileSync(oldAgent.filePath, 'utf-8');
      const updated = content.replace(
        /^name:\s*.+$/m,
        `name: ${newName}`
      );
      console.log(`Will update: name: ${oldName} → name: ${newName}`);

      // Step 5: Determine new path
      console.log(chalk.cyan('\n═══ Step 5: Rename File ═══'));
      const newPath = oldAgent.filePath.replace(`${oldName}.md`, `${newName}.md`);
      console.log(`Will rename:`);
      console.log(chalk.gray(`  ${oldAgent.filePath}`));
      console.log(chalk.gray(`  → ${newPath}`));

      // Step 6: Update cross-references
      console.log(chalk.cyan('\n═══ Step 6: Update References ═══'));
      const updatedFiles: string[] = [];

      if (!options.noRefs && references.length > 0) {
        for (const ref of references) {
          if (ref.file === oldAgent.filePath) continue; // Skip the agent file itself

          const fileContent = fs.readFileSync(ref.file, 'utf-8');
          const updatedContent = fileContent
            .replace(new RegExp(`["'\`]${oldName}["'\`]`, 'g'), (match) =>
              match.replace(oldName, newName)
            )
            .replace(
              new RegExp(`→\\s*Recommend\\s*\`${oldName}\``, 'g'),
              `→ Recommend \`${newName}\``
            )
            .replace(
              new RegExp(`subagent_type.*${oldName}`, 'g'),
              (match) => match.replace(oldName, newName)
            )
            .replace(
              new RegExp(`recommended_agent.*${oldName}`, 'g'),
              (match) => match.replace(oldName, newName)
            );

          if (updatedContent !== fileContent) {
            updatedFiles.push(ref.file);
            if (!options.dryRun) {
              fs.writeFileSync(ref.file, updatedContent, 'utf-8');
            }
          }
        }

        console.log(`Will update ${updatedFiles.length} files with references`);
      } else {
        console.log(chalk.gray('Skipping reference updates (--no-refs or no references)'));
      }

      // Step 7: Execute rename
      console.log(chalk.cyan('\n═══ Step 7: Execute Rename ═══'));

      if (options.dryRun) {
        console.log(chalk.yellow('\n[DRY RUN] Would perform:'));
        console.log(`1. Update frontmatter name to "${newName}"`);
        console.log(`2. Rename file to ${path.basename(newPath)}`);
        if (updatedFiles.length > 0) {
          console.log(`3. Update ${updatedFiles.length} reference files`);
        }
        if (options.archive) {
          console.log(`4. Archive old agent to .archived/`);
        }
        return;
      }

      // Archive if requested
      if (options.archive) {
        const archiveDir = path.join(repoRoot, '.claude', 'agents', '.archived');
        if (!fs.existsSync(archiveDir)) {
          fs.mkdirSync(archiveDir, { recursive: true });
        }
        const archivePath = path.join(archiveDir, `${oldName}.md`);
        fs.copyFileSync(oldAgent.filePath, archivePath);
        console.log(chalk.gray(`Archived: ${archivePath}`));
      }

      // Write updated content
      fs.writeFileSync(oldAgent.filePath, updated, 'utf-8');

      // Rename file
      fs.renameSync(oldAgent.filePath, newPath);

      console.log(chalk.green(`\n✅ Renamed: ${oldName} → ${newName}`));
      console.log(`New location: ${newPath}`);

      if (updatedFiles.length > 0) {
        console.log(`Updated ${updatedFiles.length} reference files`);
      }

      // Verification reminder
      console.log(chalk.cyan('\n═══ Verification Steps ═══'));
      console.log('1. Run: npm run audit -- ' + newName);
      console.log('2. Search for any remaining references: git grep "' + oldName + '"');
      console.log('3. Test discovery in new Claude Code session');

    } catch (err) {
      console.error(chalk.red(`\n⚠️  Tool Error - This is a tool failure, not a rename failure.`));
      console.error(chalk.gray(`  ${err}`));
      process.exit(2);
    }
  });

program.parse();
