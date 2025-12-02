#!/usr/bin/env npx tsx
// src/orchestrator.ts
/**
 * Skill Creation Orchestrator - Unified workflow for creating skills
 *
 * This orchestrator combines all research phases:
 * 1. Brainstorming - Extract requirements through guided Q&A
 * 2. Codebase Research - Find similar skills, patterns, conventions
 * 3. Context7 Research - Fetch library documentation (for library skills)
 * 4. Web Research - Find articles, tutorials (optional)
 * 5. Generation - Create skill structure from all sources
 *
 * Usage:
 *   npm run orchestrate -- --name "my-skill" --prompt "Create a skill for TanStack Query"
 *   npm run orchestrate -- --name "my-skill" --prompt "..." --interactive
 *   npm run orchestrate -- --name "my-skill" --prompt "..." --dry-run
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// Import phases
import {
  runBrainstormingWithAnswers,
  buildRequirements,
  suggestWorkflows,
  getAllQuestionsAsJson,
  getNextQuestion,
  questionToJson,
} from './phases/brainstorm.js';
import { runCodebaseResearch } from './phases/codebase.js';
import { searchContext7, fetchContext7Docs } from './phases/context7.js';
import { searchWebSources, fetchSourceContent } from './phases/web.js';

// Import generator
import { EnhancedSkillGenerator, generateSkill } from './generators/skill-generator.js';

// Import types
import type {
  BrainstormAnswer,
  Requirements,
  CodebasePatterns,
  ResearchData,
  GenerationInput,
  GenerationResult,
} from './lib/types.js';

// Import interactive workflow types and functions
import type {
  InteractiveState,
  InteractiveAnswer,
  InteractiveQuestion,
  InteractiveOrchestrateOptions,
  InteractiveOrchestrateResult,
} from './lib/interactive-types.js';
import {
  createInitialState,
  processAnswer,
  getNextStepAfterContext7,
} from './lib/interactive-state.js';
import {
  getSourceSelectionQuestion,
  getContext7QueryQuestion,
  getContext7ResultsQuestion,
  toAskUserQuestionFormat,
} from './lib/interactive-questions.js';

import { findProjectRoot } from '../../../../lib/find-project-root.js';

const PROJECT_ROOT = findProjectRoot();

/**
 * Orchestration options
 */
export interface OrchestrateOptions {
  name: string;
  prompt: string;
  answers?: BrainstormAnswer[];
  includeWeb?: boolean;
  dryRun?: boolean;
  outputPath?: string;
  verbose?: boolean;
}

/**
 * Orchestration result
 */
export interface OrchestrateResult {
  success: boolean;
  requirements?: Requirements;
  codebasePatterns?: CodebasePatterns;
  context7Data?: ResearchData;
  generation?: GenerationResult;
  errors: string[];
  warnings: string[];
  outputPath?: string;
}

/**
 * Run the complete skill creation workflow
 *
 * @param options - Orchestration options
 * @returns Complete orchestration result
 */
export async function orchestrate(options: OrchestrateOptions): Promise<OrchestrateResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const log = options.verbose ? console.log : () => {};

  log(chalk.blue.bold('\n🚀 Skill Creation Orchestrator'));
  log(chalk.gray(`Name: ${options.name}`));
  log(chalk.gray(`Prompt: ${options.prompt.slice(0, 100)}${options.prompt.length > 100 ? '...' : ''}`));
  log('');

  // Phase 1: Brainstorming
  log(chalk.cyan('📝 Phase 1: Brainstorming'));

  let requirements: Requirements;

  if (options.answers && options.answers.length > 0) {
    // Use provided answers
    try {
      const brainstormResult = runBrainstormingWithAnswers(
        options.name,
        options.prompt,
        options.answers
      );
      requirements = brainstormResult.requirements;
      log(chalk.green(`  ✓ Requirements extracted from ${options.answers.length} answers`));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Brainstorming failed: ${message}`);
      return { success: false, errors, warnings };
    }
  } else {
    // Generate defaults from prompt
    const defaultAnswers: BrainstormAnswer[] = inferDefaultAnswers(options.name, options.prompt);
    const brainstormResult = runBrainstormingWithAnswers(options.name, options.prompt, defaultAnswers);
    requirements = brainstormResult.requirements;
    log(chalk.yellow(`  ⚠ Using inferred defaults (no answers provided)`));
    warnings.push('Using inferred defaults - consider providing explicit answers for better results');
  }

  // Phase 2: Codebase Research
  log(chalk.cyan('\n🔍 Phase 2: Codebase Research'));

  let codebasePatterns: CodebasePatterns | undefined;

  try {
    codebasePatterns = await runCodebaseResearch(requirements.searchPatterns.join(' '));
    log(chalk.green(`  ✓ Found ${codebasePatterns.similarSkills.length} similar skills`));
    log(chalk.green(`  ✓ Found ${codebasePatterns.relatedCode.length} code patterns`));
    log(chalk.green(`  ✓ Extracted project conventions`));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`Codebase research failed: ${message}`);
    log(chalk.yellow(`  ⚠ Codebase research failed: ${message}`));
  }

  // Phase 3: Context7 Research (for library/integration skills)
  log(chalk.cyan('\n📚 Phase 3: Context7 Research'));

  let context7Data: ResearchData | undefined;

  if (requirements.skillType === 'library' || requirements.skillType === 'integration') {
    const query = requirements.context7Query || requirements.libraryName;

    if (query) {
      try {
        const packages = await searchContext7(query);

        if (packages.length > 0) {
          log(chalk.green(`  ✓ Found ${packages.length} packages in Context7`));

          // Initialize research data
          context7Data = {
            topic: query,
            createdAt: new Date().toISOString(),
            context7: {
              packages,
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

          // Fetch docs for recommended packages
          const recommended = packages.filter((p) => p.status === 'recommended');
          context7Data.context7.selectedPackages = recommended.map((p) => p.id);

          for (const pkg of recommended.slice(0, 3)) {
            const docs = await fetchContext7Docs(pkg.id);
            if (docs) {
              context7Data.context7.documentation.push(docs);
              context7Data.metadata.totalPages += docs.sections.length;
              context7Data.metadata.totalCodeBlocks += docs.sections.reduce(
                (sum, s) => sum + s.codeBlocks.length,
                0
              );
              context7Data.metadata.primaryVersion = docs.version;
            }
          }

          log(
            chalk.green(
              `  ✓ Fetched ${context7Data.metadata.totalPages} sections, ${context7Data.metadata.totalCodeBlocks} code blocks`
            )
          );
        } else {
          log(chalk.yellow(`  ⚠ No packages found for "${query}"`));
          warnings.push(`No Context7 packages found for "${query}"`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warnings.push(`Context7 research failed: ${message}`);
        log(chalk.yellow(`  ⚠ Context7 research failed: ${message}`));
      }
    } else {
      log(chalk.gray(`  ⊘ Skipped (no library name specified)`));
    }
  } else {
    log(chalk.gray(`  ⊘ Skipped (not a library/integration skill)`));
  }

  // Phase 4: Web Research (optional)
  if (options.includeWeb) {
    log(chalk.cyan('\n🌐 Phase 4: Web Research'));

    try {
      const query = requirements.libraryName || requirements.searchPatterns.join(' ');
      const sources = await searchWebSources(query);

      if (sources.length > 0) {
        log(chalk.green(`  ✓ Found ${sources.length} web sources`));

        // Fetch top sources
        const highQuality = sources.filter((s) => s.score >= 70).slice(0, 5);
        const fetchedContent: Array<{ url: string; content: string }> = [];

        for (const source of highQuality) {
          const content = await fetchSourceContent(source);
          if (content) {
            fetchedContent.push({ url: source.url, content });
          }
        }

        // Add to context7Data if exists, otherwise create new
        if (context7Data) {
          context7Data.web.sources = sources;
          context7Data.web.selectedSources = highQuality.map((s) => s.url);
          context7Data.web.fetchedContent = fetchedContent;
        }

        log(chalk.green(`  ✓ Fetched ${fetchedContent.length} articles`));
      } else {
        log(chalk.yellow(`  ⚠ No web sources found`));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Web research failed: ${message}`);
      log(chalk.yellow(`  ⚠ Web research failed: ${message}`));
    }
  } else {
    log(chalk.cyan('\n🌐 Phase 4: Web Research'));
    log(chalk.gray(`  ⊘ Skipped (use --include-web to enable)`));
  }

  // Phase 5: Generation
  log(chalk.cyan('\n🔨 Phase 5: Generation'));

  const input: GenerationInput = {
    requirements,
    codebasePatterns,
    context7Data,
    webResearch: context7Data?.web.sources.length
      ? {
          sources: context7Data.web.sources,
          fetchedContent: context7Data.web.fetchedContent,
        }
      : undefined,
  };

  const generation = await generateSkill(input);

  if (!generation.success) {
    errors.push(...generation.errors);
    log(chalk.red(`  ✗ Generation failed: ${generation.errors.join(', ')}`));
    return {
      success: false,
      requirements,
      codebasePatterns,
      context7Data,
      generation,
      errors,
      warnings: [...warnings, ...generation.warnings],
    };
  }

  log(chalk.green(`  ✓ Generated ${generation.skill!.files.length} files`));
  log(chalk.green(`  ✓ SKILL.md: ${generation.skill!.summary.skillMdLines} lines`));
  log(chalk.green(`  ✓ References: ${generation.skill!.summary.referenceCount} files`));
  log(chalk.green(`  ✓ Templates: ${generation.skill!.summary.templateCount} files`));

  // Write files (unless dry run)
  let outputPath: string | undefined;

  if (!options.dryRun) {
    const generator = new EnhancedSkillGenerator(input);
    try {
      await generator.writeFiles(generation);
      outputPath = generation.skill!.location;
      log(chalk.green(`\n✅ Skill created at: ${outputPath}`));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to write files: ${message}`);
      log(chalk.red(`  ✗ Failed to write files: ${message}`));
    }
  } else {
    log(chalk.yellow('\n📋 Dry run - files would be created:'));
    for (const file of generation.skill!.files) {
      log(chalk.gray(`  ${file.path} (${file.type})`));
    }
    outputPath = generation.skill!.location;
  }

  // Add generation warnings
  warnings.push(...generation.warnings);

  return {
    success: true,
    requirements,
    codebasePatterns,
    context7Data,
    generation,
    errors,
    warnings,
    outputPath,
  };
}

// ============================================================================
// Interactive Orchestration (Step-by-Step User-Controlled Flow)
// ============================================================================

/**
 * Run interactive skill creation workflow
 *
 * This function handles a single step of the interactive workflow.
 * Call repeatedly with user answers until isComplete is true.
 *
 * @param options - Interactive orchestration options
 * @returns Result with next question or completion status
 */
export async function orchestrateInteractive(
  options: InteractiveOrchestrateOptions
): Promise<InteractiveOrchestrateResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Initialize or continue state
  let state = options.interactiveState || createInitialState();

  // Process answer if provided
  if (options.interactiveAnswer) {
    state = processAnswer(state, options.interactiveAnswer);
  }

  // Handle each step
  switch (state.currentStep) {
    case 'source-selection':
      // Return the source selection question
      return {
        success: true,
        errors: [],
        warnings: [],
        nextQuestion: getSourceSelectionQuestion(),
        currentState: state,
        isComplete: false,
      };

    case 'context7-query':
      // Return the Context7 query question with smart suggestions
      return {
        success: true,
        errors: [],
        warnings: [],
        nextQuestion: getContext7QueryQuestion(options.name, state.context7State.searchHistory),
        currentState: state,
        isComplete: false,
      };

    case 'context7-results':
      // Execute the search and show results
      if (state.context7State.query) {
        try {
          const packages = await searchContext7(state.context7State.query);
          state.context7State.searchResults = packages;

          return {
            success: true,
            errors: [],
            warnings: packages.length === 0 ? [`No packages found for "${state.context7State.query}"`] : [],
            nextQuestion: getContext7ResultsQuestion(packages, state.context7State.query),
            currentState: state,
            isComplete: false,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          errors.push(`Context7 search failed: ${message}`);
          return {
            success: false,
            errors,
            warnings,
            currentState: state,
            isComplete: false,
          };
        }
      }
      break;

    case 'context7-fetch':
      // Fetch documentation for selected packages
      if (state.context7State.selectedPackageIds.length > 0) {
        const docs = [];

        for (const packageId of state.context7State.selectedPackageIds) {
          const doc = await fetchContext7Docs(packageId);
          if (doc) {
            docs.push(doc);
          } else {
            warnings.push(`Failed to fetch docs for ${packageId}`);
          }
        }

        state.context7State.fetchedDocs = docs;

        // Move to next step
        state.currentStep = getNextStepAfterContext7(state.selectedSources);
      } else {
        // No packages selected, move on
        state.currentStep = getNextStepAfterContext7(state.selectedSources);
      }

      // Continue to next step (codebase, web, or generation)
      return orchestrateInteractive({
        ...options,
        interactiveState: state,
        interactiveAnswer: undefined, // Clear the answer
      });

    case 'codebase-query':
    case 'codebase-results':
      // TODO: Implement codebase interactive flow
      // For now, skip to next phase
      if (state.selectedSources.web) {
        state.currentStep = 'web-query';
      } else {
        state.currentStep = 'generation';
      }
      return orchestrateInteractive({
        ...options,
        interactiveState: state,
        interactiveAnswer: undefined,
      });

    case 'web-query':
    case 'web-results':
      // TODO: Implement web interactive flow
      // For now, skip to generation
      state.currentStep = 'generation';
      return orchestrateInteractive({
        ...options,
        interactiveState: state,
        interactiveAnswer: undefined,
      });

    case 'generation':
      // Run the full generation with collected research
      const result = await runGenerationFromInteractiveState(options, state);
      return {
        success: result.success,
        errors: result.errors,
        warnings: result.warnings,
        currentState: state,
        isComplete: true,
        outputPath: result.outputPath,
      };

    case 'complete':
      return {
        success: true,
        errors: [],
        warnings: [],
        currentState: state,
        isComplete: true,
      };
  }

  // Shouldn't reach here
  return {
    success: false,
    errors: ['Unknown workflow state'],
    warnings: [],
    currentState: state,
    isComplete: false,
  };
}

/**
 * Run generation phase using data collected from interactive workflow
 */
async function runGenerationFromInteractiveState(
  options: InteractiveOrchestrateOptions,
  state: InteractiveState
): Promise<{ success: boolean; errors: string[]; warnings: string[]; outputPath?: string }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Build requirements from prompt (simplified for interactive flow)
  const defaultAnswers = inferDefaultAnswers(options.name, options.prompt);
  const brainstormResult = runBrainstormingWithAnswers(options.name, options.prompt, defaultAnswers);
  const requirements = brainstormResult.requirements;

  // Build Context7 research data from state
  let context7Data: ResearchData | undefined;

  if (state.context7State.fetchedDocs.length > 0) {
    context7Data = {
      topic: state.context7State.query || options.prompt,
      createdAt: new Date().toISOString(),
      context7: {
        packages: state.context7State.searchResults,
        selectedPackages: state.context7State.selectedPackageIds,
        documentation: state.context7State.fetchedDocs,
      },
      web: {
        sources: [],
        selectedSources: [],
        fetchedContent: [],
      },
      metadata: {
        totalPages: state.context7State.fetchedDocs.reduce((sum, d) => sum + d.sections.length, 0),
        totalCodeBlocks: state.context7State.fetchedDocs.reduce(
          (sum, d) => sum + d.sections.reduce((s, sec) => s + sec.codeBlocks.length, 0),
          0
        ),
        primaryVersion:
          state.context7State.fetchedDocs[0]?.version || 'latest',
      },
    };
  }

  // Run codebase research if selected
  let codebasePatterns: CodebasePatterns | undefined;

  if (state.selectedSources.codebase) {
    try {
      codebasePatterns = await runCodebaseResearch(requirements.searchPatterns.join(' '));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Codebase research failed: ${message}`);
    }
  }

  // Generate the skill
  const input: GenerationInput = {
    requirements,
    codebasePatterns,
    context7Data,
  };

  const generation = await generateSkill(input);

  if (!generation.success) {
    return {
      success: false,
      errors: [...errors, ...generation.errors],
      warnings: [...warnings, ...generation.warnings],
    };
  }

  // Write files (unless dry run)
  let outputPath: string | undefined;

  if (!options.dryRun) {
    const generator = new EnhancedSkillGenerator(input);
    try {
      await generator.writeFiles(generation);
      outputPath = generation.skill!.location;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to write files: ${message}`);
      return { success: false, errors, warnings };
    }
  } else {
    outputPath = generation.skill!.location;
  }

  return {
    success: true,
    errors,
    warnings: [...warnings, ...generation.warnings],
    outputPath,
  };
}

/**
 * Infer default brainstorm answers from skill name and prompt
 */
function inferDefaultAnswers(name: string, prompt: string): BrainstormAnswer[] {
  const answers: BrainstormAnswer[] = [];
  const promptLower = prompt.toLowerCase();

  // Infer skill type
  let skillType = 'process';
  if (
    promptLower.includes('library') ||
    promptLower.includes('tanstack') ||
    promptLower.includes('zustand') ||
    promptLower.includes('npm') ||
    promptLower.includes('package')
  ) {
    skillType = 'library';
  } else if (
    promptLower.includes('integration') ||
    promptLower.includes('connect') ||
    promptLower.includes('api')
  ) {
    skillType = 'integration';
  } else if (promptLower.includes('cli') || promptLower.includes('tool') || promptLower.includes('wrapper')) {
    skillType = 'tool-wrapper';
  }

  answers.push({ questionId: 'skillType', value: skillType });

  // Default to library location
  answers.push({ questionId: 'location', value: 'library' });

  // Infer category from name/prompt
  let category = 'development';
  if (promptLower.includes('react') || promptLower.includes('frontend') || promptLower.includes('ui')) {
    category = 'development/frontend';
  } else if (promptLower.includes('backend') || promptLower.includes('api') || promptLower.includes('go')) {
    category = 'development/backend';
  } else if (promptLower.includes('test') || promptLower.includes('testing')) {
    category = 'testing';
  }

  answers.push({ questionId: 'category', value: category });

  // Purpose from prompt
  answers.push({ questionId: 'purpose', value: prompt });

  // Default workflows
  const workflows = skillType === 'library' ? ['basic-usage', 'advanced-patterns'] : ['setup', 'execution'];
  answers.push({ questionId: 'workflows', value: workflows });

  // Default audience
  answers.push({ questionId: 'audience', value: 'intermediate' });

  // Default content preferences
  answers.push({ questionId: 'contentPreferences', value: ['templates', 'examples', 'best-practices'] });

  // Try to infer library name
  const libraryMatches = prompt.match(/(?:tanstack\s+)?([\w-]+)(?:\s+library)?/i);
  if (libraryMatches && skillType === 'library') {
    answers.push({ questionId: 'libraryName', value: libraryMatches[1] });
  }

  return answers;
}

/**
 * Get questions for interactive/Claude-mediated flow
 */
export function getQuestionsForInteractiveFlow(
  currentAnswers: BrainstormAnswer[],
  prompt: string
): Array<{
  id: string;
  question: string;
  header: string;
  options: Array<{ label: string; description: string }>;
  multiSelect: boolean;
}> {
  return getAllQuestionsAsJson(currentAnswers, prompt);
}

/**
 * Get next question for step-by-step flow
 */
export function getNextQuestionForFlow(
  currentAnswers: BrainstormAnswer[],
  prompt: string
): {
  id: string;
  question: string;
  header: string;
  options: Array<{ label: string; description: string }>;
  multiSelect: boolean;
} | null {
  const question = getNextQuestion(currentAnswers);
  if (!question) return null;

  return {
    id: question.id,
    ...questionToJson(question, currentAnswers, prompt),
  };
}

// CLI interface - only run when executed directly
function runCli(): void {
  const program = new Command();

  program
    .name('orchestrate')
    .description('Unified skill creation workflow')
    .requiredOption('-n, --name <name>', 'Skill name (kebab-case)')
    .requiredOption('-p, --prompt <prompt>', 'Initial prompt describing the skill')
    .option('--include-web', 'Include web research phase', false)
    .option('--dry-run', 'Preview without writing files', false)
    .option('-v, --verbose', 'Show detailed output', true)
    .option('--answers <json>', 'JSON string of brainstorm answers')
    .option('-i, --interactive', 'Run in interactive mode (step-by-step with Claude)', false)
    .option('--state <json>', 'Current interactive state (JSON)')
    .option('--answer <json>', 'Answer to previous question (JSON)')
    .action(async (options) => {
      try {
        // Interactive mode - step-by-step with state management
        if (options.interactive) {
          await runInteractiveMode(options);
          return;
        }

        // Standard mode - full automated workflow
        const answers = options.answers ? JSON.parse(options.answers) : undefined;

        const result = await orchestrate({
          name: options.name,
          prompt: options.prompt,
          answers,
          includeWeb: options.includeWeb,
          dryRun: options.dryRun,
          verbose: options.verbose,
        });

        if (!result.success) {
          console.error(chalk.red('\n❌ Orchestration failed:'));
          for (const error of result.errors) {
            console.error(chalk.red(`  - ${error}`));
          }
          process.exit(1);
        }

        if (result.warnings.length > 0) {
          console.log(chalk.yellow('\n⚠️  Warnings:'));
          for (const warning of result.warnings) {
            console.log(chalk.yellow(`  - ${warning}`));
          }
        }

        console.log(chalk.blue.bold('\n📊 Summary'));
        console.log(chalk.gray('─'.repeat(40)));
        console.log(`Skill: ${result.requirements?.name}`);
        console.log(`Type: ${result.requirements?.skillType}`);
        console.log(`Similar skills found: ${result.codebasePatterns?.similarSkills.length || 0}`);
        console.log(`Context7 sections: ${result.context7Data?.metadata.totalPages || 0}`);
        console.log(`SKILL.md lines: ${result.generation?.skill?.summary.skillMdLines || 0}`);
        console.log(chalk.gray('─'.repeat(40)));

        if (result.outputPath && !options.dryRun) {
          console.log(chalk.green(`\n✨ Skill created at: ${result.outputPath}`));
          console.log(chalk.gray('\nNext steps:'));
          console.log(chalk.gray('  1. Review generated SKILL.md'));
          console.log(chalk.gray('  2. Run: npm run audit -- skill-manager'));
          console.log(chalk.gray('  3. Customize templates as needed'));
        }
      } catch (error) {
        console.error(chalk.red('Orchestration failed:'), error);
        process.exit(1);
      }
    });

  program.parse();
}

/**
 * Run interactive mode - outputs JSON for each step
 *
 * This mode is designed for Claude to call step-by-step:
 * 1. First call: Returns first question
 * 2. Subsequent calls: Pass --state and --answer to continue
 * 3. Final call: Returns completion with outputPath
 */
async function runInteractiveMode(options: {
  name: string;
  prompt: string;
  state?: string;
  answer?: string;
  dryRun?: boolean;
}): Promise<void> {
  try {
    // Parse state and answer if provided
    const interactiveState = options.state ? JSON.parse(options.state) : undefined;
    const interactiveAnswer = options.answer ? JSON.parse(options.answer) : undefined;

    // Run interactive step
    const result = await orchestrateInteractive({
      name: options.name,
      prompt: options.prompt,
      interactive: true,
      interactiveState,
      interactiveAnswer,
      dryRun: options.dryRun,
    });

    // Output result as JSON for Claude to parse
    const output = {
      success: result.success,
      isComplete: result.isComplete,
      currentStep: result.currentState?.currentStep,
      errors: result.errors,
      warnings: result.warnings,
      // Include next question if not complete
      nextQuestion: result.nextQuestion
        ? toAskUserQuestionFormat(result.nextQuestion)
        : undefined,
      // Include state for next call
      state: result.currentState,
      // Include output path when complete
      outputPath: result.outputPath,
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(
      JSON.stringify({
        success: false,
        isComplete: false,
        errors: [message],
        warnings: [],
      })
    );
    process.exit(1);
  }
}

// Only run CLI when executed directly (not when imported)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runCli();
}
