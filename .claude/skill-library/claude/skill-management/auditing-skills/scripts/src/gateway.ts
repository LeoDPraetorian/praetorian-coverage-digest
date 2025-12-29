#!/usr/bin/env node
/**
 * Gateway Management CLI
 *
 * Exposes gateway-updater.ts functionality for syncing gateway routing tables.
 *
 * Usage:
 *   npm run gateway -- sync [--dry-run]
 *   npm run gateway -- add --skill <name> --path <path> --description <desc> [--gateway <name>]
 *   npm run gateway -- remove --skill <name> --gateway <name>
 *   npm run gateway -- validate [--gateway <name>]
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  addSkillToGateway,
  removeSkillFromGateway,
  updateSkillPathInGateway,
  validateGatewayEntries,
  findMissingGatewayEntries,
  detectGatewayForCategory,
  getAllGateways,
  parseGatewaySkill,
  type GatewayEntry,
} from './lib/gateway-updater.js';
import * as fs from 'fs';
import * as path from 'path';
import { findProjectRoot } from '@chariot/lib';

const program = new Command();
const PROJECT_ROOT = findProjectRoot();

program
  .name('gateway')
  .description('Manage gateway routing tables')
  .version('1.0.0');

/**
 * Sync command - discover library skills and update all gateways
 */
program
  .command('sync')
  .description('Synchronize all gateway routing tables with library skills')
  .option('--dry-run', 'Preview changes without applying them')
  .action(async (options) => {
    console.log(chalk.bold('\n🔄 Gateway Sync\n'));

    if (options.dryRun) {
      console.log(chalk.yellow('DRY RUN MODE - No changes will be applied\n'));
    }

    // Step 1: Discover all library skills
    console.log(chalk.blue('📂 Discovering library skills...'));
    const libraryDir = path.join(PROJECT_ROOT, '.claude/skill-library');
    const librarySkills = findAllLibrarySkills(libraryDir);
    console.log(chalk.green(`   Found ${librarySkills.length} library skills\n`));

    // Step 2: Map skills to gateways
    console.log(chalk.blue('🗺️  Mapping skills to gateways...'));
    const gatewayMap = new Map<string, GatewayEntry[]>();

    for (const skillPath of librarySkills) {
      const relativePath = path.relative(PROJECT_ROOT, skillPath);
      const category = extractCategory(relativePath);
      const gateway = detectGatewayForCategory(category);

      if (gateway) {
        if (!gatewayMap.has(gateway)) {
          gatewayMap.set(gateway, []);
        }

        const skillName = path.basename(path.dirname(skillPath));
        const description = extractDescription(skillPath);

        gatewayMap.get(gateway)!.push({
          title: formatTitle(skillName),
          path: relativePath,
          description: description || 'No description available',
        });
      }
    }

    // Step 3: Compare and update each gateway
    let totalAdded = 0;
    let totalRemoved = 0;

    for (const gateway of getAllGateways()) {
      console.log(chalk.blue(`\n📋 Processing ${gateway}...`));

      try {
        // Get current entries
        const currentEntries = parseGatewaySkill(gateway);
        const currentPaths = new Set(currentEntries.map((e) => e.path));

        // Get desired entries
        const desiredEntries = gatewayMap.get(gateway) || [];
        const desiredPaths = new Set(desiredEntries.map((e) => e.path));

        // Find additions (in desired, not in current)
        const toAdd = desiredEntries.filter((e) => !currentPaths.has(e.path));

        // Find removals (in current, path doesn't exist)
        const toRemove = currentEntries.filter((e) => {
          const fullPath = path.join(PROJECT_ROOT, e.path);
          return !fs.existsSync(fullPath);
        });

        if (toAdd.length === 0 && toRemove.length === 0) {
          console.log(chalk.gray('   No changes needed'));
          continue;
        }

        // Report changes
        if (toAdd.length > 0) {
          console.log(chalk.green(`   Would ADD ${toAdd.length} skills:`));
          toAdd.forEach((e) => console.log(chalk.gray(`     - ${e.title}`)));
          totalAdded += toAdd.length;
        }

        if (toRemove.length > 0) {
          console.log(chalk.red(`   Would REMOVE ${toRemove.length} broken paths:`));
          toRemove.forEach((e) => console.log(chalk.gray(`     - ${e.title}`)));
          totalRemoved += toRemove.length;
        }

        // Apply changes if not dry-run
        if (!options.dryRun) {
          // Add new skills
          for (const entry of toAdd) {
            const skillName = path.basename(path.dirname(entry.path));
            addSkillToGateway(gateway, skillName, entry.path, entry.description);
          }

          // Remove broken paths
          for (const entry of toRemove) {
            const skillName = entry.title.toLowerCase().replace(/\s+/g, '-');
            removeSkillFromGateway(gateway, skillName);
          }

          console.log(chalk.green('   ✓ Changes applied'));
        }
      } catch (error) {
        console.log(chalk.yellow(`   ⚠️  Gateway not found or parse error: ${error}`));
      }
    }

    // Summary
    console.log(chalk.bold('\n📊 Summary:'));
    console.log(chalk.green(`   Skills to add: ${totalAdded}`));
    console.log(chalk.red(`   Broken paths to remove: ${totalRemoved}`));

    if (options.dryRun) {
      console.log(chalk.yellow('\n   Run without --dry-run to apply changes\n'));
    } else {
      console.log(chalk.green('\n   ✓ Sync completed\n'));
    }
  });

/**
 * Add command - add a skill to a gateway
 */
program
  .command('add')
  .description('Add a skill to a gateway routing table')
  .requiredOption('--skill <name>', 'Skill name (kebab-case)')
  .requiredOption('--path <path>', 'Relative path to SKILL.md')
  .requiredOption('--description <desc>', 'One-line description')
  .option('--gateway <name>', 'Target gateway (auto-detected from path if omitted)')
  .action((options) => {
    console.log(chalk.bold('\n➕ Adding skill to gateway\n'));

    let gateway = options.gateway;

    // Auto-detect gateway from path if not provided
    if (!gateway) {
      const category = extractCategory(options.path);
      gateway = detectGatewayForCategory(category);

      if (!gateway) {
        console.error(chalk.red(`❌ Could not detect gateway for path: ${options.path}`));
        console.error(chalk.yellow('   Please specify --gateway explicitly'));
        process.exit(1);
      }

      console.log(chalk.blue(`   Auto-detected gateway: ${gateway}`));
    }

    try {
      addSkillToGateway(gateway, options.skill, options.path, options.description);
      console.log(chalk.green(`\n   ✓ Added ${options.skill} to ${gateway}\n`));
    } catch (error) {
      console.error(chalk.red(`\n   ❌ Failed to add skill: ${error}\n`));
      process.exit(1);
    }
  });

/**
 * Remove command - remove a skill from a gateway
 */
program
  .command('remove')
  .description('Remove a skill from a gateway routing table')
  .requiredOption('--skill <name>', 'Skill name (kebab-case)')
  .requiredOption('--gateway <name>', 'Gateway name')
  .action((options) => {
    console.log(chalk.bold('\n➖ Removing skill from gateway\n'));

    try {
      removeSkillFromGateway(options.gateway, options.skill);
      console.log(chalk.green(`\n   ✓ Removed ${options.skill} from ${options.gateway}\n`));
    } catch (error) {
      console.error(chalk.red(`\n   ❌ Failed to remove skill: ${error}\n`));
      process.exit(1);
    }
  });

/**
 * Validate command - check gateway consistency
 */
program
  .command('validate')
  .description('Validate gateway routing tables')
  .option('--gateway <name>', 'Validate specific gateway (all if omitted)')
  .action((options) => {
    console.log(chalk.bold('\n🔍 Validating gateways\n'));

    const gateways = options.gateway ? [options.gateway] : getAllGateways();
    let totalBroken = 0;
    let totalOrphaned = 0;

    for (const gateway of gateways) {
      console.log(chalk.blue(`📋 ${gateway}:`));

      try {
        const { valid, broken } = validateGatewayEntries(gateway);

        if (broken.length > 0) {
          console.log(chalk.red(`   ❌ ${broken.length} broken paths:`));
          broken.forEach((e) => console.log(chalk.gray(`      - ${e.title}: ${e.path}`)));
          totalBroken += broken.length;
        } else {
          console.log(chalk.green(`   ✓ All ${valid.length} entries valid`));
        }
      } catch (error) {
        console.log(chalk.yellow(`   ⚠️  Could not validate: ${error}`));
      }
    }

    // Check for orphaned skills
    console.log(chalk.blue('\n📂 Checking for orphaned skills...'));
    const orphaned = findMissingGatewayEntries();

    if (orphaned.length > 0) {
      console.log(chalk.yellow(`\n   ⚠️  ${orphaned.length} skills not in any gateway:`));
      orphaned.forEach((p) => console.log(chalk.gray(`      - ${p}`)));
      totalOrphaned = orphaned.length;
    } else {
      console.log(chalk.green('   ✓ No orphaned skills'));
    }

    // Summary
    console.log(chalk.bold('\n📊 Summary:'));
    console.log(chalk.red(`   Broken paths: ${totalBroken}`));
    console.log(chalk.yellow(`   Orphaned skills: ${totalOrphaned}`));

    if (totalBroken > 0 || totalOrphaned > 0) {
      console.log(chalk.blue('\n   Run "npm run gateway -- sync" to fix issues\n'));
      process.exit(1);
    } else {
      console.log(chalk.green('\n   ✓ All gateways valid\n'));
    }
  });

/**
 * Update command - update skill path in gateway (for migrations)
 */
program
  .command('update')
  .description('Update skill path in gateway (for migrations)')
  .requiredOption('--old-path <path>', 'Old skill path')
  .requiredOption('--new-path <path>', 'New skill path')
  .requiredOption('--gateway <name>', 'Gateway name')
  .action((options) => {
    console.log(chalk.bold('\n🔄 Updating skill path in gateway\n'));

    try {
      updateSkillPathInGateway(options.gateway, options.oldPath, options.newPath);
      console.log(chalk.green(`\n   ✓ Updated path in ${options.gateway}\n`));
    } catch (error) {
      console.error(chalk.red(`\n   ❌ Failed to update path: ${error}\n`));
      process.exit(1);
    }
  });

// Helper functions

function findAllLibrarySkills(dir: string): string[] {
  const skills: string[] = [];

  if (!fs.existsSync(dir)) {
    return skills;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      skills.push(...findAllLibrarySkills(fullPath));
    } else if (entry.name === 'SKILL.md') {
      skills.push(fullPath);
    }
  }

  return skills;
}

function extractCategory(skillPath: string): string {
  // Extract category from path like ".claude/skill-library/development/frontend/skill-name/SKILL.md"
  // Returns "development/frontend"
  const match = skillPath.match(/skill-library\/(.+?)\/[^/]+\/SKILL\.md/);
  return match ? match[1] : '';
}

function extractDescription(skillPath: string): string | null {
  try {
    const content = fs.readFileSync(skillPath, 'utf-8');
    // Extract description from frontmatter
    const match = content.match(/^description:\s*(.+)$/m);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

function formatTitle(skillName: string): string {
  return skillName
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

program.parse();
