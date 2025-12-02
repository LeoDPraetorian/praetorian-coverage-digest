#!/usr/bin/env node
// src/sync-gateways.ts
/**
 * Sync Gateway Command
 *
 * Validates that all gateway skill entries point to existing skills
 * and that all library skills are referenced in appropriate gateways.
 *
 * Modes:
 * 1. Default: Report discrepancies
 * 2. --fix: Automatically repair broken/missing entries
 */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Enquirer from 'enquirer';
const { Confirm } = Enquirer as any;
import { readFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import { findProjectRoot } from '../../../../lib/find-project-root.js';
import {
  getAllGateways,
  validateGatewayEntries,
  findMissingGatewayEntries,
  removeSkillFromGateway,
  addSkillToGateway,
  detectGatewayForCategory,
  GatewayEntry,
} from './lib/gateway-updater.js';

const PROJECT_ROOT = findProjectRoot();

const program = new Command();

program
  .name('skill-manager-sync-gateways')
  .description('Validate and sync gateway skills with library skills')
  .option('--fix', 'Automatically repair broken/missing entries')
  .option('--dry-run', 'Show what would be fixed without making changes')
  .action(async (options?: { fix?: boolean; dryRun?: boolean }) => {
    try {
      console.log(chalk.blue('\n🔍 Scanning gateway skills...\n'));

      const allGateways = getAllGateways();
      const spinner = ora('Validating gateway entries...').start();

      // Step 1: Find broken gateway entries (point to non-existent skills)
      const brokenEntries: Array<{ gateway: string; entry: GatewayEntry }> = [];

      for (const gateway of allGateways) {
        try {
          const { valid, broken } = validateGatewayEntries(gateway);

          for (const entry of broken) {
            brokenEntries.push({ gateway, entry });
          }
        } catch (error) {
          spinner.warn(`Failed to validate ${gateway}: ${error}`);
        }
      }

      spinner.succeed(`Validated ${allGateways.length} gateway skill(s)`);

      // Step 2: Find missing gateway entries (library skills not in any gateway)
      spinner.start('Checking for missing gateway entries...');
      const missingPaths = findMissingGatewayEntries();
      spinner.succeed(`Found ${missingPaths.length} skill(s) missing from gateways`);

      // Step 3: Report findings
      console.log(chalk.blue('\n📊 Validation Results:\n'));

      if (brokenEntries.length === 0 && missingPaths.length === 0) {
        console.log(chalk.green('✅ All gateway entries are valid!'));
        console.log(chalk.green('✅ All library skills are referenced in gateways!\n'));
        return;
      }

      // Report broken entries
      if (brokenEntries.length > 0) {
        console.log(chalk.red(`❌ Found ${brokenEntries.length} broken gateway entry(ies):\n`));

        for (const { gateway, entry } of brokenEntries) {
          console.log(chalk.gray(`  Gateway: ${gateway}`));
          console.log(chalk.gray(`  Title: ${entry.title}`));
          console.log(chalk.red(`  Path: ${entry.path} (does not exist)`));
          console.log();
        }
      }

      // Report missing entries
      if (missingPaths.length > 0) {
        console.log(chalk.yellow(`⚠️  Found ${missingPaths.length} library skill(s) not in any gateway:\n`));

        for (const path of missingPaths) {
          console.log(chalk.gray(`  ${path}`));
        }
        console.log();
      }

      // Step 4: Offer to fix (if --fix or --dry-run)
      if (options?.fix || options?.dryRun) {
        const mode = options.dryRun ? 'DRY RUN' : 'FIX';
        console.log(chalk.blue(`\n🔧 ${mode} Mode:\n`));

        let fixCount = 0;

        // Fix broken entries (remove them)
        if (brokenEntries.length > 0) {
          console.log(chalk.blue('Removing broken gateway entries:\n'));

          for (const { gateway, entry } of brokenEntries) {
            const skillName = extractSkillNameFromPath(entry.path);

            if (options.dryRun) {
              console.log(chalk.gray(`  [DRY RUN] Would remove from ${gateway}: ${skillName}`));
            } else {
              try {
                removeSkillFromGateway(gateway, skillName);
                console.log(chalk.green(`  ✓ Removed from ${gateway}: ${skillName}`));
                fixCount++;
              } catch (error) {
                console.log(chalk.red(`  ✗ Failed to remove ${skillName}: ${error}`));
              }
            }
          }
          console.log();
        }

        // Add missing entries
        if (missingPaths.length > 0) {
          console.log(chalk.blue('Adding missing gateway entries:\n'));

          for (const path of missingPaths) {
            const category = extractCategoryFromPath(path);
            const gateway = category ? detectGatewayForCategory(category) : null;

            if (!gateway) {
              console.log(chalk.yellow(`  ⚠  No gateway found for ${path} (category: ${category || 'none'})`));
              continue;
            }

            const skillName = extractSkillNameFromPath(path);
            const description = extractDescriptionFromSkill(path);

            if (options.dryRun) {
              console.log(chalk.gray(`  [DRY RUN] Would add to ${gateway}: ${skillName}`));
            } else {
              try {
                addSkillToGateway(gateway, skillName, path, description);
                console.log(chalk.green(`  ✓ Added to ${gateway}: ${skillName}`));
                fixCount++;
              } catch (error) {
                console.log(chalk.red(`  ✗ Failed to add ${skillName}: ${error}`));
              }
            }
          }
          console.log();
        }

        if (options.dryRun) {
          console.log(chalk.blue(`\n📝 Dry run complete. ${fixCount} change(s) would be made.`));
          console.log(chalk.gray('   Run with --fix to apply changes.\n'));
        } else {
          console.log(chalk.green(`\n✅ Fixed ${fixCount} issue(s)!\n`));
        }
      } else {
        // Offer to fix
        console.log(chalk.blue('\n💡 To fix these issues, run:'));
        console.log(chalk.gray('   npm run sync-gateways -- --dry-run  (preview fixes)'));
        console.log(chalk.gray('   npm run sync-gateways -- --fix      (apply fixes)\n'));
      }

    } catch (error) {
      console.error(chalk.red('\n⚠️  Tool Error - This is a tool failure, not a sync failure.'));
      console.error(chalk.gray(`  ${error}`));
      process.exit(2);
    }
  });

/**
 * Extract skill name from path
 * e.g., ".claude/skill-library/development/frontend/state/my-skill/SKILL.md" -> "my-skill"
 */
function extractSkillNameFromPath(path: string): string {
  const parts = path.split('/');
  const skillMdIndex = parts.indexOf('SKILL.md');

  if (skillMdIndex > 0) {
    return parts[skillMdIndex - 1];
  }

  // Fallback: last directory before file
  return parts[parts.length - 2] || 'unknown';
}

/**
 * Extract category from skill path
 * e.g., ".claude/skill-library/development/frontend/state/my-skill/SKILL.md" -> "development/frontend/state"
 */
function extractCategoryFromPath(path: string): string | null {
  const libraryPattern = /\.claude\/skill-library\/([^/]+(?:\/[^/]+)*)\/[^/]+\/SKILL\.md/;
  const match = path.match(libraryPattern);
  return match ? match[1] : null;
}

/**
 * Extract description from SKILL.md frontmatter
 */
function extractDescriptionFromSkill(relativePath: string): string {
  try {
    const absolutePath = join(PROJECT_ROOT, relativePath);
    const content = readFileSync(absolutePath, 'utf-8');
    const descMatch = content.match(/^description:\s*(.+)$/m);
    return descMatch ? descMatch[1] : 'No description available';
  } catch (error) {
    return 'Failed to read skill description';
  }
}

program.parse();
