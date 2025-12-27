#!/usr/bin/env npx tsx
// src/generate.ts
/**
 * Generate CLI - Creates skill structure from research data
 *
 * Usage:
 *   npm run generate -- --from-research "./research-data.json"
 *   npm run generate -- --from-research "./data.json" --location library:frontend
 *   npm run generate -- --from-research "./data.json" --dry-run
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFileSync, existsSync } from 'fs';
import { SkillGenerator } from './generators/skill-generator.js';
import type { ResearchData, GeneratedSkill } from './lib/types.js';
import { GenerateOptionsSchema } from './lib/types.js';

const program = new Command();

program
  .name('generate')
  .description('Generate skill from research data')
  .requiredOption('--from-research <path>', 'Path to research data JSON')
  .option('--location <loc>', 'Skill location (core, library:domain)', 'library:development')
  .option('--dry-run', 'Preview generated files without writing', false)
  .action(async (options: Record<string, unknown>) => {
    try {
      await runGenerate(options);
    } catch (error) {
      console.error(chalk.red('Generation failed:'), error);
      process.exit(1);
    }
  });

program.parse();

/**
 * Main generation workflow
 */
async function runGenerate(options: Record<string, unknown>): Promise<void> {
  // Validate options
  const validated = GenerateOptionsSchema.parse({
    fromResearch: options.fromResearch,
    location: options.location,
    dryRun: options.dryRun,
  });

  console.log(chalk.blue.bold('\n🔨 Skill Generation Workflow'));
  console.log(chalk.gray(`Research data: ${validated.fromResearch}`));
  console.log(chalk.gray(`Location: ${validated.location || 'library:development'}`));
  if (validated.dryRun) {
    console.log(chalk.yellow('(Dry run - no files will be written)'));
  }
  console.log('');

  // Load research data
  if (!existsSync(validated.fromResearch)) {
    throw new Error(`Research data not found: ${validated.fromResearch}`);
  }

  const researchData: ResearchData = JSON.parse(readFileSync(validated.fromResearch, 'utf-8'));

  console.log(chalk.gray(`Topic: ${researchData.topic}`));
  console.log(
    chalk.gray(
      `Sources: ${researchData.context7.documentation.length} Context7, ${researchData.web.selectedSources.length} web`
    )
  );
  console.log('');

  // Initialize generator
  const generator = new SkillGenerator(researchData, validated.location);

  // Generate skill structure
  const spinner = ora('Generating skill structure...').start();

  try {
    const skill = await generator.generate();
    spinner.succeed('Skill structure generated');

    // Display summary
    displaySkillSummary(skill);

    // Write files (unless dry run)
    if (!validated.dryRun) {
      const writeSpinner = ora('Writing files...').start();
      await generator.writeFiles(skill);
      writeSpinner.succeed(`Wrote ${skill.files.length} files`);

      console.log(chalk.green(`\n✅ Skill created at: ${skill.location}`));
      console.log(chalk.gray('\nNext steps:'));
      console.log(chalk.gray('  1. Review generated SKILL.md'));
      console.log(chalk.gray('  2. Run skill-manager audit'));
      console.log(chalk.gray('  3. Customize templates as needed'));
    } else {
      console.log(chalk.yellow('\n📋 Dry run - files would be created:'));
      for (const file of skill.files) {
        console.log(chalk.gray(`  ${file.path} (${file.type})`));
      }
    }
  } catch (error) {
    spinner.fail('Generation failed');
    throw error;
  }
}

/**
 * Display skill generation summary
 */
function displaySkillSummary(skill: GeneratedSkill): void {
  console.log(chalk.blue.bold('\n📊 Generation Summary'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`Skill name: ${skill.name}`);
  console.log(`Location: ${skill.location}`);
  console.log(`Files generated: ${skill.files.length}`);
  console.log(`  - SKILL.md: ${skill.summary.skillMdLines} lines`);
  console.log(`  - References: ${skill.summary.referenceCount} files`);
  console.log(`  - Templates: ${skill.summary.templateCount} files`);
  console.log(chalk.gray('─'.repeat(40)));

  // Show file breakdown
  console.log(chalk.blue('\n📁 Generated Files:'));
  const byType: Record<string, number> = {};
  for (const file of skill.files) {
    byType[file.type] = (byType[file.type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(byType)) {
    console.log(`  ${type}: ${count}`);
  }
}
