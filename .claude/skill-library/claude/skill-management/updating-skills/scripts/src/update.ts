#!/usr/bin/env node
// src/update.ts
/**
 * Skill Manager - Update CLI
 *
 * Modes:
 * 1. Default: Update skill with changelog entry
 * 2. --suggest: Output JSON for Claude-mediated input gathering
 * 3. --refresh-context7: Refresh context7 documentation for library skills
 */
import { Command } from 'commander';
import Enquirer from 'enquirer';
const { Confirm } = Enquirer as any;
import chalk from 'chalk';
import ora from 'ora';
import { spawn } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { findSkill } from '../../../auditing-skills/scripts/src/lib/skill-finder.js';
import {
  Context7SourceMetadata,
  UpdateSuggestionWithContext7,
} from '../../../auditing-skills/scripts/src/lib/types.js';
import {
  parseContext7Data,
  generateApiReference,
  generatePatterns,
  generateExamples,
  createContext7SourceMetadata,
  compareContext7Data,
  hashContent,
} from '../../../auditing-skills/scripts/src/lib/context7-integration.js';

const program = new Command();

/**
 * Create backup in .local directory with timestamp
 */
function createBackup(skillPath: string, skillName: string): string {
  const skillDir = dirname(skillPath);
  const localDir = join(skillDir, '.local');

  if (!existsSync(localDir)) {
    mkdirSync(localDir, { recursive: true });
  }

  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/T/, '-')
    .replace(/:/g, '-')
    .replace(/\..+/, '');  // YYYY-MM-DD-HH-MM-SS

  const backupPath = join(localDir, `${timestamp}-${skillName}.bak`);
  const content = readFileSync(skillPath, 'utf-8');
  writeFileSync(backupPath, content, 'utf-8');

  return backupPath;
}

/**
 * Append changelog entry to .history/CHANGELOG
 */
function appendChangelog(skillPath: string, changes: string): void {
  const skillDir = dirname(skillPath);
  const historyDir = join(skillDir, '.history');
  const changelogPath = join(historyDir, 'CHANGELOG');

  // Ensure .history directory exists
  if (!existsSync(historyDir)) {
    mkdirSync(historyDir, { recursive: true });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const changeEntry = `- **${dateStr}**: ${changes}\n`;

  // Check if CHANGELOG exists
  if (existsSync(changelogPath)) {
    // Read existing content
    const content = readFileSync(changelogPath, 'utf-8');
    // Prepend new entry (most recent first)
    writeFileSync(changelogPath, changeEntry + content, 'utf-8');
  } else {
    // Create new CHANGELOG with header
    const header = `# Changelog\n\nAll notable changes to this skill.\n\n`;
    writeFileSync(changelogPath, header + changeEntry, 'utf-8');
  }
}

/**
 * Check if skill has context7 source metadata
 */
function getContext7Metadata(skillDir: string): Context7SourceMetadata | null {
  const metadataPath = join(skillDir, '.local/context7-source.json');

  if (!existsSync(metadataPath)) {
    return null;
  }

  try {
    const content = readFileSync(metadataPath, 'utf-8');
    return JSON.parse(content) as Context7SourceMetadata;
  } catch {
    return null;
  }
}

/**
 * Format date for display
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

program
  .name('skill-manager-update')
  .description('Update existing skill with TDD workflow')
  .argument('<name>', 'Skill name')
  .argument('[changes]', 'Brief description of changes')
  .option('--no-edit', 'Skip opening editor')
  .option('--no-changelog', 'Skip changelog entry')
  .option('--suggest', 'Output JSON for Claude-mediated input gathering')
  .option('--refresh-context7', 'Refresh context7 documentation (requires new data file)')
  .option('--context7-data <path>', 'Path to new context7 JSON data for refresh')
  .action(async (
    name: string,
    changes?: string,
    options?: {
      edit?: boolean;
      changelog?: boolean;
      suggest?: boolean;
      refreshContext7?: boolean;
      context7Data?: string;
    }
  ) => {
    try {
      // Find skill
      const spinner = ora(`Finding skill '${name}'...`).start();
      const skill = findSkill(name);

      if (!skill) {
        if (options?.suggest) {
          console.log(JSON.stringify({
            skill: name,
            status: 'ERROR',
            error: `Skill '${name}' not found`,
          }, null, 2));
          return;
        }
        spinner.fail(chalk.red(`Skill '${name}' not found`));
        console.error(chalk.yellow('\n⚠️  Tool Error - This is a tool failure, not an update failure.'));
        console.error(chalk.gray('  Check that the skill name is correct'));
        process.exit(2);
      }

      spinner.succeed(`Found skill at ${skill.path}`);
      const skillDir = dirname(skill.path);

      // Check for context7 metadata
      const context7Metadata = getContext7Metadata(skillDir);

      // Suggest mode - output JSON for Claude
      if (options?.suggest) {
        const output: UpdateSuggestionWithContext7 = {
          skill: name,
          skillPath: skill.path,
          hasContext7Source: !!context7Metadata,
          questions: [],
        };

        // Add context7 metadata if present
        if (context7Metadata) {
          output.context7Metadata = {
            libraryName: context7Metadata.libraryName,
            fetchedAt: context7Metadata.fetchedAt,
            version: context7Metadata.version,
          };

          // Add refresh question
          output.questions = output.questions || [];
          output.questions.push({
            id: 'refreshContext7',
            question: `This skill uses context7 docs (fetched ${formatDate(context7Metadata.fetchedAt)}). Would you like to check for documentation updates?`,
            type: 'select',
            options: [
              { value: 'yes', label: 'Yes', description: 'Re-fetch docs and show what changed' },
              { value: 'no', label: 'No', description: 'Proceed with manual update only' },
            ],
            required: false,
          });
        }

        // Add changes question if not provided
        if (!changes) {
          output.questions = output.questions || [];
          output.questions.push({
            id: 'changes',
            question: 'What changes are you making to this skill?',
            type: 'input',
            placeholder: 'Brief description of changes...',
            required: true,
          });
        }

        console.log(JSON.stringify(output, null, 2));
        return;
      }

      // Handle context7 refresh
      if (options?.refreshContext7) {
        if (!context7Metadata) {
          console.error(chalk.red('\n⚠️  Tool Error - This skill does not have context7 source metadata.'));
          console.log(chalk.gray('  Only skills created with --context7-data can be refreshed.'));
          process.exit(2);
        }

        if (!options.context7Data) {
          console.error(chalk.red('\n⚠️  Tool Error - --context7-data <path> is required for refresh.'));
          console.log(chalk.gray('  Steps to refresh:'));
          console.log(chalk.gray(`    1. Query context7 for '${context7Metadata.libraryName}' documentation`));
          console.log(chalk.gray('    2. Save results to a JSON file'));
          console.log(chalk.gray(`    3. Run: npm run update -- ${name} --refresh-context7 --context7-data /path/to/new-data.json`));
          process.exit(2);
        }

        spinner.start('Processing new context7 data...');

        try {
          const newData = parseContext7Data(options.context7Data);

          // Compare with old data
          spinner.start('Comparing documentation versions...');
          const diff = compareContext7Data(context7Metadata, newData);

          if (!diff.hasChanges) {
            spinner.succeed('No changes detected in documentation.');
            console.log(chalk.green('\n✅ Documentation is up to date!\n'));
            return;
          }

          spinner.succeed('Changes detected in documentation');
          console.log(chalk.blue('\n📊 Documentation Diff:\n'));
          console.log(chalk.gray(diff.summary));

          if (diff.newApis.length > 0) {
            console.log(chalk.green(`  New APIs: ${diff.newApis.slice(0, 5).join(', ')}${diff.newApis.length > 5 ? '...' : ''}`));
          }
          if (diff.deprecatedApis.length > 0) {
            console.log(chalk.yellow(`  Deprecated: ${diff.deprecatedApis.join(', ')}`));
          }
          if (diff.changedSignatures.length > 0) {
            console.log(chalk.cyan(`  Changed signatures: ${diff.changedSignatures.length}`));
          }
          console.log('');

          // Update files
          spinner.start('Updating API reference...');
          const apiRef = generateApiReference(newData);
          writeFileSync(join(skillDir, 'references/api-reference.md'), apiRef, 'utf-8');
          spinner.succeed('API reference updated');

          spinner.start('Updating patterns...');
          const patterns = generatePatterns(newData);
          writeFileSync(join(skillDir, 'references/patterns.md'), patterns, 'utf-8');
          spinner.succeed('Patterns updated');

          spinner.start('Updating examples...');
          const examples = generateExamples(newData);
          writeFileSync(join(skillDir, 'examples/basic-usage.md'), examples, 'utf-8');
          spinner.succeed('Examples updated');

          // Update metadata
          spinner.start('Updating context7 metadata...');
          const newMetadata = createContext7SourceMetadata(newData);
          writeFileSync(
            join(skillDir, '.local/context7-source.json'),
            JSON.stringify(newMetadata, null, 2),
            'utf-8'
          );
          spinner.succeed('Context7 metadata updated');

          // Add changelog entry
          if (options?.changelog !== false) {
            appendChangelog(skill.path, `Refreshed context7 documentation (${newMetadata.version || 'latest'})`);
          }

          console.log(chalk.green('\n✅ Context7 documentation refreshed successfully!\n'));
          console.log(chalk.blue('Next steps:'));
          console.log(chalk.blue('1. Review the updated references/ and examples/'));
          console.log(chalk.blue('2. Update SKILL.md if needed'));
          console.log(chalk.blue(`3. Run: npm run audit -- ${name}\n`));
          return;

        } catch (error) {
          spinner.fail(`Failed to refresh context7 data: ${error}`);
          console.error(chalk.yellow('\n⚠️  Tool Error - This is a tool failure, not an update failure.'));
          process.exit(2);
        }
      }

      // Regular update flow
      if (!changes) {
        console.error(chalk.red('\n⚠️  Tool Error - Changes description is required.'));
        console.log(chalk.gray('  Example: npm run update -- my-skill "Add new pattern for X"'));
        process.exit(2);
      }

      // Create backup
      spinner.start('Creating backup...');
      const backupPath = createBackup(skill.path, name);
      spinner.succeed(`Backup created: ${backupPath}`);

      // Append changelog entry if not disabled
      if (options?.changelog !== false) {
        spinner.start('Adding changelog entry...');
        appendChangelog(skill.path, changes);
        spinner.succeed('Changelog entry added');
      }

      // Show what was done
      console.log(chalk.blue('\n📝 Update Summary:\n'));
      console.log(chalk.gray(`  Skill: ${name}`));
      console.log(chalk.gray(`  Backup: ${backupPath}`));
      console.log(chalk.gray(`  Changes: ${changes}\n`));

      // Show context7 info if available
      if (context7Metadata) {
        console.log(chalk.cyan('📚 Context7 Source:'));
        console.log(chalk.gray(`  Library: ${context7Metadata.libraryName}`));
        console.log(chalk.gray(`  Fetched: ${formatDate(context7Metadata.fetchedAt)}`));
        if (context7Metadata.version) {
          console.log(chalk.gray(`  Version: ${context7Metadata.version}`));
        }
        console.log(chalk.gray(`  To refresh: npm run update -- ${name} --refresh-context7 --context7-data /path/to/new-data.json\n`));
      }

      // Open in editor if not disabled
      if (options?.edit !== false) {
        const confirmPrompt = new Confirm({
          message: 'Open skill in editor?',
          initial: true,
        });
        const openEditor = await confirmPrompt.run();

        if (openEditor) {
          const editor = process.env.EDITOR || 'code';
          console.log(chalk.gray(`\nOpening in ${editor}...`));

          const child = spawn(editor, [skill.path], {
            stdio: 'inherit',
            detached: true,
          });

          child.unref();
        }
      }

      // TDD workflow guidance
      console.log(chalk.blue('\n📋 Next Steps (TDD Workflow):\n'));
      console.log(chalk.blue('1. Make your changes in SKILL.md'));
      console.log(chalk.blue('2. Test the skill with a subagent'));
      console.log(chalk.blue(`3. Run: npm run audit -- ${name}`));
      console.log(chalk.blue(`4. Fix issues: npm run fix -- ${name}`));
      console.log(chalk.yellow('\n⚠️  Remember: Update minimally - only add what closes the gap\n'));

    } catch (error) {
      console.error(chalk.red('\n⚠️  Tool Error - This is a tool failure, not an update failure.'));
      console.error(chalk.gray(`  ${error}`));
      process.exit(2);
    }
  });

program.parse();
