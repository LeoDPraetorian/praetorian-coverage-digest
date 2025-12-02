#!/usr/bin/env node
// src/migrate.ts
import { Command } from 'commander';
import Enquirer from 'enquirer';
const { Confirm } = Enquirer as any;
import chalk from 'chalk';
import ora from 'ora';
import { cpSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { findSkill } from './lib/skill-finder.js';
import { findProjectRoot } from '../../../../lib/find-project-root.js';
import {
  detectGatewayForCategory,
  updateSkillPathInGateway,
  removeSkillFromGateway,
  addSkillToGateway,
  getAllGateways,
} from './lib/gateway-updater.js';

const PROJECT_ROOT = findProjectRoot();

/**
 * Extract category from skill path
 * e.g., ".claude/skill-library/development/frontend/state/my-skill" -> "development/frontend/state"
 */
function extractCategoryFromPath(skillPath: string): string | null {
  const libraryPattern = /\.claude\/skill-library\/([^/]+(?:\/[^/]+)*)\//;
  const match = skillPath.match(libraryPattern);
  return match ? match[1] : null;
}

/**
 * Update path references in all skills when a skill is migrated
 */
function updatePathReferences(oldPath: string, newPath: string): number {
  const locations = [
    join(PROJECT_ROOT, '.claude', 'skills'),
    join(PROJECT_ROOT, '.claude', 'skill-library'),
    join(PROJECT_ROOT, '.claude', 'commands'),
  ];
  let updatedCount = 0;

  // Get relative paths from repo root for matching
  const oldRelative = relative(PROJECT_ROOT, oldPath);
  const newRelative = relative(PROJECT_ROOT, newPath);

  for (const baseDir of locations) {
    if (!existsSync(baseDir)) continue;
    updatedCount += updatePathReferencesInDir(baseDir, oldRelative, newRelative, oldPath, newPath);
  }

  return updatedCount;
}

/**
 * Recursively update path references in a directory
 */
function updatePathReferencesInDir(
  dir: string,
  oldRelative: string,
  newRelative: string,
  oldAbsolute: string,
  newAbsolute: string
): number {
  let updatedCount = 0;

  // Skip the old and new skill directories themselves
  if (dir === oldAbsolute || dir === newAbsolute) return 0;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const entryPath = join(dir, entry);
    const stat = statSync(entryPath);

    if (stat.isDirectory()) {
      if (entryPath === oldAbsolute || entryPath === newAbsolute) continue;
      updatedCount += updatePathReferencesInDir(entryPath, oldRelative, newRelative, oldAbsolute, newAbsolute);
    } else if (entry.endsWith('.md')) {
      const content = readFileSync(entryPath, 'utf-8');

      // Build patterns for various path formats
      const patterns = [
        // Relative paths like .claude/skills/foo
        new RegExp(oldRelative.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        // Just the directory name pattern for path-like references
        new RegExp(`(?<=/|^)${dirname(oldRelative).split('/').pop()}/${entry}(?=/|$|\\s|\\))`, 'g'),
      ];

      let updated = content;
      let hasChanges = false;

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          // Reset lastIndex since we're reusing the same content
          pattern.lastIndex = 0;
          updated = updated.replace(pattern, (match) => match.replace(oldRelative, newRelative));
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

const program = new Command();

program
  .name('skill-manager-migrate')
  .description('Migrate skill between core and library locations')
  .argument('<name>', 'Skill name')
  .argument('<target>', 'Target location (to-core, to-library:category)')
  .action(async (name: string, target: string) => {
    try {
      // Find source skill
      const spinner = ora(`Finding skill '${name}'...`).start();
      const sourceSkill = findSkill(name);

      if (!sourceSkill) {
        spinner.fail(chalk.red(`Skill '${name}' not found`));
        console.error(chalk.yellow('\n⚠️  Tool Error - This is a tool failure, not a migration failure.'));
        console.error(chalk.gray('  Check that the skill name is correct'));
        process.exit(2);
      }

      spinner.succeed(`Found skill at ${sourceSkill.path}`);

      // Parse target
      let targetDir: string;
      if (target === 'to-core') {
        targetDir = join(PROJECT_ROOT, '.claude/skills', name);
      } else if (target.startsWith('to-library:')) {
        const category = target.replace('to-library:', '');
        targetDir = join(PROJECT_ROOT, '.claude/skill-library', category, name);
      } else {
        console.error(chalk.red('\n⚠️  Tool Error - Invalid target. Use "to-core" or "to-library:category"'));
        process.exit(2);
      }

      // Confirm migration
      console.log(chalk.blue(`\n📦 Migration plan:`));
      console.log(`  From: ${dirname(sourceSkill.path)}`);
      console.log(`  To:   ${targetDir}\n`);

      const confirmPrompt = new Confirm({
        message: 'Proceed with migration?',
        initial: true,
      });
      const proceed = await confirmPrompt.run() as boolean;

      if (!proceed) {
        console.log(chalk.yellow('Migration cancelled'));
        process.exit(0);
      }

      // Copy skill
      spinner.start('Copying skill...');
      cpSync(dirname(sourceSkill.path), targetDir, { recursive: true });
      spinner.succeed('Skill copied');

      // Remove source
      spinner.start('Removing source...');
      const sourcePath = dirname(sourceSkill.path);
      rmSync(sourcePath, { recursive: true });
      spinner.succeed('Source removed');

      // Update path references in all skills
      spinner.start('Updating path references...');
      const refsUpdated = updatePathReferences(sourcePath, targetDir);
      if (refsUpdated > 0) {
        spinner.succeed(`Updated ${refsUpdated} file(s) with new paths`);
      } else {
        spinner.succeed('No path references found to update');
      }

      // Update gateway skills
      spinner.start('Updating gateway skills...');
      let gatewaysUpdated = 0;
      try {
        const oldRelativePath = relative(PROJECT_ROOT, join(sourcePath, 'SKILL.md'));
        const newRelativePath = relative(PROJECT_ROOT, join(targetDir, 'SKILL.md'));

        // Determine source and target categories
        const sourceCategory = extractCategoryFromPath(sourcePath);
        const targetCategory = extractCategoryFromPath(targetDir);

        if (sourceCategory && targetCategory) {
          const sourceGateway = detectGatewayForCategory(sourceCategory);
          const targetGateway = detectGatewayForCategory(targetCategory);

          // Case 1: Same gateway - just update path
          if (sourceGateway === targetGateway && sourceGateway) {
            updateSkillPathInGateway(sourceGateway, oldRelativePath, newRelativePath);
            gatewaysUpdated = 1;
          }
          // Case 2: Different gateways - remove from old, add to new
          else if (sourceGateway && targetGateway) {
            removeSkillFromGateway(sourceGateway, name);

            // Get description from SKILL.md
            const skillMd = readFileSync(join(targetDir, 'SKILL.md'), 'utf-8');
            const descMatch = skillMd.match(/^description:\s*(.+)$/m);
            const description = descMatch ? descMatch[1] : 'No description available';

            addSkillToGateway(targetGateway, name, newRelativePath, description);
            gatewaysUpdated = 2;
          }
          // Case 3: Moving to/from core (no gateway for source or target)
          else if (sourceGateway) {
            removeSkillFromGateway(sourceGateway, name);
            gatewaysUpdated = 1;
          } else if (targetGateway) {
            const skillMd = readFileSync(join(targetDir, 'SKILL.md'), 'utf-8');
            const descMatch = skillMd.match(/^description:\s*(.+)$/m);
            const description = descMatch ? descMatch[1] : 'No description available';

            addSkillToGateway(targetGateway, name, newRelativePath, description);
            gatewaysUpdated = 1;
          }
        }

        if (gatewaysUpdated > 0) {
          spinner.succeed(`Updated ${gatewaysUpdated} gateway skill(s)`);
        } else {
          spinner.info('No gateway updates needed');
        }
      } catch (error) {
        spinner.warn(`Failed to update gateways: ${error}`);
        console.log(chalk.yellow('  You may need to manually update gateway skills'));
      }

      console.log(chalk.green('\n✅ Skill migrated successfully!\n'));
      console.log(chalk.blue('Summary:'));
      console.log(chalk.gray(`  • From: ${sourcePath}`));
      console.log(chalk.gray(`  • To: ${targetDir}`));
      console.log(chalk.gray(`  • Files updated: ${refsUpdated}`));
      console.log(chalk.gray(`  • Gateways updated: ${gatewaysUpdated}`));
      console.log(chalk.blue(`\nNext: npm run audit -- ${name}\n`));

    } catch (error) {
      console.error(chalk.red('\n⚠️  Tool Error - This is a tool failure, not a migration failure.'));
      console.error(chalk.gray(`  ${error}`));
      process.exit(2);
    }
  });

program.parse();
