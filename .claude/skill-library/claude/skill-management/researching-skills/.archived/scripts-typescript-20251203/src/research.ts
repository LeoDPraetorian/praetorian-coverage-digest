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
import * as p from '@clack/prompts';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { searchContext7, fetchContext7Docs, formatPackagesForDisplay } from './phases/context7.js';
import { searchWebSources, formatSourcesForDisplay } from './phases/web.js';
import type { ResearchData, Context7Package, WebSource } from './lib/types.js';
import { ResearchOptionsSchema } from './lib/types.js';
import { findProjectRoot } from '../../../../lib/find-project-root.js';
import {
  promptContext7Query,
  promptContext7PackageSelection,
  promptIncludeWebResearch,
  isInteractiveSupported,
} from './lib/interactive-prompts.js';

const PROJECT_ROOT = findProjectRoot();

const program = new Command();

program
  .name('research')
  .description('Research libraries for skill generation')
  .argument('<topic>', 'Topic to research (e.g., "tanstack query", "zustand")')
  .option('--context7-only', 'Only search Context7, skip web research', false)
  .option('--include-web', 'Include web research (GitHub, docs, articles)', false)
  .option('--non-interactive', 'Skip prompts and auto-select (for CI/automation)', false)
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

  // Determine if interactive mode is supported and not disabled
  const isInteractive = isInteractiveSupported() && !options.nonInteractive;

  if (isInteractive) {
    p.intro(chalk.blue.bold('📚 Library Research Workflow'));
    p.log.info(`Topic: ${validated.topic}`);
  } else {
    console.log(chalk.blue.bold('\n📚 Library Research Workflow'));
    console.log(chalk.gray(`Topic: ${validated.topic}\n`));
  }

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
  if (isInteractive) {
    await runContext7PhaseInteractive(validated.topic, researchData);
  } else {
    await runContext7PhaseBatch(validated.topic, researchData);
  }

  // Phase 2: Web Research
  let shouldIncludeWeb = validated.includeWeb;

  // In interactive mode, ask user if not already specified
  if (isInteractive && !validated.context7Only && !validated.includeWeb) {
    shouldIncludeWeb = await promptIncludeWebResearch();
  }

  if (shouldIncludeWeb && !validated.context7Only) {
    if (isInteractive) {
      p.log.step('🌐 Web Research');
    } else {
      console.log(chalk.blue('\n🌐 Web Research Phase\n'));
    }

    const webSpinner = isInteractive ? p.spinner() : ora('Searching web sources...');
    if (isInteractive) {
      webSpinner.start('Searching web sources...');
    } else {
      (webSpinner as any).start();
    }

    try {
      const sources = await searchWebSources(validated.topic);
      researchData.web.sources = sources;

      if (isInteractive) {
        webSpinner.stop(`Found ${sources.length} web sources`);
      } else {
        (webSpinner as any).succeed(`Found ${sources.length} web sources`);
      }

      if (sources.length > 0) {
        if (!isInteractive) {
          console.log(chalk.yellow('\n📄 Web Sources Found:\n'));
          console.log(formatSourcesForDisplay(sources));
        }

        // Auto-select high-quality sources (score >= 70)
        const highQuality = sources.filter((s) => s.score >= 70);
        researchData.web.selectedSources = highQuality.map((s) => s.url);

        if (isInteractive) {
          p.log.success(`Selected ${highQuality.length} high-quality sources`);
        } else {
          console.log(chalk.green(`\n✅ Auto-selected ${highQuality.length} high-quality sources`));
        }
      }
    } catch (error) {
      if (isInteractive) {
        webSpinner.stop('Web search failed');
        p.log.error(`Error: ${error}`);
      } else {
        (webSpinner as any).fail('Web search failed');
        console.error(chalk.red('Error:'), error);
      }
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

  if (isInteractive) {
    p.log.success(`Research data saved to: ${outputPath}`);

    p.outro(chalk.green('✨ Research complete!'));
    console.log(chalk.gray(`\nNext: npm run generate -- --from-research "${outputPath}"`));
  } else {
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
}

/**
 * Run Context7 phase in interactive mode with user prompts
 */
async function runContext7PhaseInteractive(topic: string, researchData: ResearchData): Promise<void> {
  let shouldRetry = true;
  let searchQuery = topic;

  while (shouldRetry) {
    shouldRetry = false;

    // Ask user for search query
    const query = await promptContext7Query(searchQuery);
    if (!query) {
      p.log.warn('Context7 search skipped');
      return;
    }

    searchQuery = query;

    // Search Context7
    const s = p.spinner();
    s.start('Searching Context7...');

    try {
      const packages = await searchContext7(searchQuery);
      researchData.context7.packages = packages;
      s.stop(`Found ${packages.length} packages`);

      // Prompt for package selection
      const selection = await promptContext7PackageSelection(packages);

      if (selection.action === 'skip') {
        p.log.info('Context7 skipped');
        return;
      }

      if (selection.action === 'retry') {
        shouldRetry = true;
        continue;
      }

      // User selected packages
      researchData.context7.selectedPackages = selection.packageIds;

      if (selection.packageIds.length > 0) {
        // Fetch documentation
        s.start(`Fetching documentation for ${selection.packageIds.length} packages...`);

        for (const pkgId of selection.packageIds) {
          const docs = await fetchContext7Docs(pkgId);
          if (docs) {
            researchData.context7.documentation.push(docs);
            researchData.metadata.totalPages += docs.sections.length;
            researchData.metadata.totalCodeBlocks += docs.sections.reduce(
              (sum, s) => sum + s.codeBlocks.length,
              0
            );
          }
        }

        s.stop(
          `Fetched ${researchData.metadata.totalPages} sections, ${researchData.metadata.totalCodeBlocks} code blocks`
        );
      }
    } catch (error) {
      s.stop('Context7 search failed');
      p.log.error(`Error: ${error}`);
    }
  }
}

/**
 * Run Context7 phase in batch mode (auto-select)
 */
async function runContext7PhaseBatch(topic: string, researchData: ResearchData): Promise<void> {
  const spinner = ora('Searching Context7...').start();

  try {
    const packages = await searchContext7(topic);
    researchData.context7.packages = packages;
    spinner.succeed(`Found ${packages.length} packages in Context7`);

    if (packages.length > 0) {
      console.log(chalk.yellow('\n📦 Context7 Packages Found:\n'));
      console.log(formatPackagesForDisplay(packages));

      // Auto-select recommended packages
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
}

/**
 * Get default output path for research data
 */
function getDefaultOutputPath(topic: string): string {
  const safeName = topic.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const timestamp = new Date().toISOString().split('T')[0];
  return join(PROJECT_ROOT, '.claude/skills/researching-skills/scripts/.output', `${safeName}-${timestamp}.json`);
}
