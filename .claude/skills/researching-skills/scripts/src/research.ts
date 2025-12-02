#!/usr/bin/env npx tsx
// src/research.ts
/**
 * Research CLI - Main entry point for library research workflow
 *
 * Usage:
 *   npm run research -- "<topic>"
 *   npm run research -- "tanstack query" --context7-only
 *   npm run research -- "zustand" --include-web
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { searchContext7, fetchContext7Docs, formatPackagesForDisplay } from './phases/context7.js';
import { searchWebSources, formatSourcesForDisplay } from './phases/web.js';
import type { ResearchData, Context7Package, WebSource } from './lib/types.js';
import { ResearchOptionsSchema } from './lib/types.js';
import { findProjectRoot } from '../../../../lib/find-project-root.js';

const PROJECT_ROOT = findProjectRoot();

const program = new Command();

program
  .name('research')
  .description('Research libraries for skill generation')
  .argument('<topic>', 'Topic to research (e.g., "tanstack query", "zustand")')
  .option('--context7-only', 'Only search Context7, skip web research', false)
  .option('--include-web', 'Include web research (GitHub, docs, articles)', false)
  .option('-o, --output <path>', 'Output path for research data JSON')
  .action(async (topic: string, options: Record<string, unknown>) => {
    try {
      await runResearch(topic, options);
    } catch (error) {
      console.error(chalk.red('Research failed:'), error);
      process.exit(1);
    }
  });

program.parse();

/**
 * Main research workflow
 */
async function runResearch(topic: string, options: Record<string, unknown>): Promise<void> {
  // Validate options
  const validated = ResearchOptionsSchema.parse({
    topic,
    context7Only: options.context7Only,
    includeWeb: options.includeWeb,
    output: options.output,
  });

  console.log(chalk.blue.bold('\n📚 Library Research Workflow'));
  console.log(chalk.gray(`Topic: ${validated.topic}\n`));

  // Initialize research data
  const researchData: ResearchData = {
    topic: validated.topic,
    createdAt: new Date().toISOString(),
    context7: {
      packages: [],
      selectedPackages: [],
      documentation: [],
    },
    web: {
      sources: [],
      selectedSources: [],
      fetchedContent: [],
    },
    metadata: {
      totalPages: 0,
      totalCodeBlocks: 0,
      primaryVersion: 'latest',
    },
  };

  // Phase 1: Context7 Search
  const spinner = ora('Searching Context7...').start();

  try {
    const packages = await searchContext7(validated.topic);
    researchData.context7.packages = packages;
    spinner.succeed(`Found ${packages.length} packages in Context7`);

    if (packages.length > 0) {
      console.log(chalk.yellow('\n📦 Context7 Packages Found:\n'));
      console.log(formatPackagesForDisplay(packages));

      // In interactive mode, we'd ask user to select
      // For CLI, we auto-select recommended packages
      const recommended = packages.filter((p) => p.status === 'recommended');
      researchData.context7.selectedPackages = recommended.map((p) => p.id);

      console.log(chalk.green(`\n✅ Auto-selected ${recommended.length} recommended packages`));

      // Fetch documentation for selected packages
      if (recommended.length > 0) {
        const docsSpinner = ora('Fetching documentation...').start();

        for (const pkg of recommended) {
          const docs = await fetchContext7Docs(pkg.id);
          if (docs) {
            researchData.context7.documentation.push(docs);
            researchData.metadata.totalPages += docs.sections.length;
            researchData.metadata.totalCodeBlocks += docs.sections.reduce(
              (sum, s) => sum + s.codeBlocks.length,
              0
            );
          }
        }

        docsSpinner.succeed(
          `Fetched documentation: ${researchData.metadata.totalPages} sections, ${researchData.metadata.totalCodeBlocks} code blocks`
        );
      }
    } else {
      console.log(chalk.yellow('\n⚠️  No packages found in Context7'));
    }
  } catch (error) {
    spinner.fail('Context7 search failed');
    console.error(chalk.red('Error:'), error);
  }

  // Phase 2: Web Research (if enabled)
  if (validated.includeWeb && !validated.context7Only) {
    console.log(chalk.blue('\n🌐 Web Research Phase\n'));

    const webSpinner = ora('Searching web sources...').start();

    try {
      const sources = await searchWebSources(validated.topic);
      researchData.web.sources = sources;
      webSpinner.succeed(`Found ${sources.length} web sources`);

      if (sources.length > 0) {
        console.log(chalk.yellow('\n📄 Web Sources Found:\n'));
        console.log(formatSourcesForDisplay(sources));

        // Auto-select high-quality sources (score >= 70)
        const highQuality = sources.filter((s) => s.score >= 70);
        researchData.web.selectedSources = highQuality.map((s) => s.url);

        console.log(chalk.green(`\n✅ Auto-selected ${highQuality.length} high-quality sources`));
      }
    } catch (error) {
      webSpinner.fail('Web search failed');
      console.error(chalk.red('Error:'), error);
    }
  }

  // Phase 3: Output Research Data
  const outputPath = validated.output || getDefaultOutputPath(validated.topic);

  // Ensure output directory exists
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(outputPath, JSON.stringify(researchData, null, 2));
  console.log(chalk.green(`\n✅ Research data saved to: ${outputPath}`));

  // Summary
  console.log(chalk.blue.bold('\n📊 Research Summary'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log(`Topic: ${researchData.topic}`);
  console.log(`Context7 packages: ${researchData.context7.packages.length}`);
  console.log(`Selected packages: ${researchData.context7.selectedPackages.length}`);
  console.log(`Documentation sections: ${researchData.metadata.totalPages}`);
  console.log(`Code blocks: ${researchData.metadata.totalCodeBlocks}`);
  console.log(`Web sources: ${researchData.web.sources.length}`);
  console.log(`Selected web sources: ${researchData.web.selectedSources.length}`);
  console.log(chalk.gray('─'.repeat(40)));
  console.log(chalk.green('\n✨ Research complete! Run generate to create skill.'));
  console.log(chalk.gray(`  npm run generate -- --from-research "${outputPath}"`));
}

/**
 * Get default output path for research data
 */
function getDefaultOutputPath(topic: string): string {
  const safeName = topic.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const timestamp = new Date().toISOString().split('T')[0];
  return join(PROJECT_ROOT, '.claude/skills/researching-skills/scripts/.output', `${safeName}-${timestamp}.json`);
}
