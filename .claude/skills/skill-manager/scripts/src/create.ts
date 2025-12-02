#!/usr/bin/env node
// src/create.ts
/**
 * Skill Manager - Create CLI
 *
 * Multi-stage workflow for skill creation:
 * Stage 1: Location (core vs library)
 * Stage 2: Category (if library) - dynamically discovers folders
 * Stage 3: Skill type (process, library, integration, tool-wrapper)
 * Stage 4: Context7 (if library/integration type)
 * Stage 5: Ready - all inputs collected
 *
 * Modes:
 * 1. --suggest: Output JSON for Claude to gather inputs via AskUserQuestion
 * 2. Default: Create skill with provided flags
 * 3. --context7-data: Create library skill from context7 documentation
 */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { findProjectRoot } from '../../../../lib/find-project-root.js';
import { findSkill } from './lib/skill-finder.js';
import {
  TOOL_SETS,
  SKILL_TYPE_OPTIONS,
  SkillCategory,
  CreateSuggestionWithContext7,
  CreateStage,
} from './lib/types.js';
import {
  parseContext7Data,
  generateApiReference,
  generatePatterns,
  generateExamples,
  generateLibrarySkillTemplate,
  createContext7SourceMetadata,
} from './lib/context7-integration.js';
import {
  discoverLibraryCategories,
  LibraryCategoryOption,
} from './lib/library-discovery.js';
import {
  detectGatewayForCategory,
  addSkillToGateway,
} from './lib/gateway-updater.js';

const PROJECT_ROOT = findProjectRoot();

const program = new Command();

program
  .name('skill-manager-create')
  .description('Create new skill with TDD workflow and progressive disclosure')
  .argument('<name>', 'Skill name (kebab-case)')
  .argument('[description]', 'Skill description')
  .option('--location <location>', 'Location: "core" or "library"')
  .option('--category <category>', 'Library category path (e.g., "development/integrations")')
  .option('--skill-type <type>', 'Skill type (process, library, integration, tool-wrapper)')
  .option('--query-context7 <value>', 'Query context7 for docs: "yes" or "no"')
  .option('--context7-data <path>', 'Path to JSON file containing context7 query results')
  .option('--suggest', 'Output JSON for Claude-mediated input gathering')
  .configureHelp({
    helpWidth: 100,
  })
  .showHelpAfterError('(use --help for available options)')
  .action(async (
    name: string,
    description?: string,
    options?: {
      location?: string;
      category?: string;
      skillType?: string;
      queryContext7?: string;
      context7Data?: string;
      suggest?: boolean;
    }
  ) => {
    try {
      // Step 1: Validate skill name
      const nameRegex = /^[a-z][a-z0-9-]*$/;
      if (!nameRegex.test(name)) {
        if (options?.suggest) {
          const output: CreateSuggestionWithContext7 = {
            skill: name,
            status: 'ERROR',
            error: 'Skill name must be kebab-case (lowercase letters, numbers, and hyphens only)',
          };
          console.log(JSON.stringify(output, null, 2));
          return;
        }
        console.error(chalk.red('\n⚠️  Tool Error - Skill name must be kebab-case (lowercase, hyphens only)'));
        process.exit(2);
      }

      // Step 2: Check if skill already exists
      const existingSkill = findSkill(name);

      if (existingSkill) {
        if (options?.suggest) {
          const output: CreateSuggestionWithContext7 = {
            skill: name,
            status: 'ERROR',
            error: `Skill '${name}' already exists at ${existingSkill.path}`,
          };
          console.log(JSON.stringify(output, null, 2));
          return;
        }
        console.error(chalk.red(`\n⚠️  Tool Error - Skill '${name}' already exists at ${existingSkill.path}`));
        process.exit(2);
      }

      // Step 3: Suggest mode - multi-stage workflow
      if (options?.suggest) {
        const output = handleSuggestMode(name, description, options);
        console.log(JSON.stringify(output, null, 2));
        return;
      }

      // Step 4: Validate required inputs for non-suggest mode
      if (!description) {
        console.error(chalk.red('\n⚠️  Tool Error - Description is required. Use --suggest mode or provide description as argument.'));
        console.log(chalk.gray('  Example: npm run create -- my-skill "Use when developing features"'));
        process.exit(2);
      }

      if (!options?.location) {
        console.error(chalk.red('\n⚠️  Tool Error - Location is required. Use --suggest mode or provide --location flag.'));
        console.log(chalk.gray('  Example: npm run create -- my-skill "description" --location core'));
        console.log(chalk.gray('  Example: npm run create -- my-skill "description" --location library --category development/frontend'));
        process.exit(2);
      }

      // Validate library requires category
      if (options.location === 'library' && !options.category) {
        console.error(chalk.red('\n⚠️  Tool Error - Category is required for library skills. Use --category flag.'));
        console.log(chalk.gray('  Example: npm run create -- my-skill "description" --location library --category development/integrations'));
        process.exit(2);
      }

      const location = options.location;
      const category = options.category;
      const skillType = (options.skillType || 'process') as SkillCategory;
      const spinner = ora(`Creating skill '${name}'...`).start();

      // Step 5: Determine skill directory
      let skillDir: string;
      if (location === 'core') {
        skillDir = join(PROJECT_ROOT, '.claude/skills', name);
      } else {
        skillDir = join(PROJECT_ROOT, '.claude/skill-library', category!, name);
      }

      // Step 6: Create directory structure
      mkdirSync(join(skillDir, 'references'), { recursive: true });
      mkdirSync(join(skillDir, 'examples'), { recursive: true });
      mkdirSync(join(skillDir, 'templates'), { recursive: true });
      mkdirSync(join(skillDir, '.local'), { recursive: true });
      spinner.succeed('Skill structure created');

      // Step 7: Handle context7 data if provided
      if (options.context7Data && (skillType === 'library' || skillType === 'integration')) {
        spinner.start('Processing context7 data...');

        try {
          const context7Data = parseContext7Data(options.context7Data);

          // Generate SKILL.md from library template
          const skillContent = generateLibrarySkillTemplate(name, description, context7Data);
          writeFileSync(join(skillDir, 'SKILL.md'), skillContent, 'utf-8');
          spinner.succeed('SKILL.md created from context7 data');

          // Generate references/api-reference.md
          spinner.start('Generating API reference...');
          const apiRef = generateApiReference(context7Data);
          writeFileSync(join(skillDir, 'references/api-reference.md'), apiRef, 'utf-8');
          spinner.succeed('API reference generated');

          // Generate references/patterns.md
          spinner.start('Generating patterns documentation...');
          const patterns = generatePatterns(context7Data);
          writeFileSync(join(skillDir, 'references/patterns.md'), patterns, 'utf-8');
          spinner.succeed('Patterns documentation generated');

          // Generate examples/basic-usage.md
          spinner.start('Generating examples...');
          const examples = generateExamples(context7Data);
          writeFileSync(join(skillDir, 'examples/basic-usage.md'), examples, 'utf-8');
          spinner.succeed('Examples generated');

          // Store context7 metadata
          spinner.start('Storing context7 metadata...');
          const metadata = createContext7SourceMetadata(context7Data);
          writeFileSync(
            join(skillDir, '.local/context7-source.json'),
            JSON.stringify(metadata, null, 2),
            'utf-8'
          );
          spinner.succeed('Context7 metadata stored');

        } catch (error) {
          spinner.fail(`Failed to process context7 data: ${error}`);
          console.error(chalk.yellow('\n⚠️  Tool Error - This is a tool failure, not a skill creation failure.'));
          process.exit(2);
        }
      } else {
        // Generate standard SKILL.md based on skill type
        const skillContent = generateStandardSkillTemplate(name, description, skillType);
        writeFileSync(join(skillDir, 'SKILL.md'), skillContent, 'utf-8');
        spinner.succeed(`SKILL.md created at ${skillDir}/SKILL.md`);
      }

      // Step 8: Update gateway skill (if library skill)
      if (location === 'library' && category) {
        spinner.start('Updating gateway skill...');
        try {
          const gateway = detectGatewayForCategory(category);
          if (gateway) {
            const skillPath = join('.claude/skill-library', category, name, 'SKILL.md');
            addSkillToGateway(gateway, name, skillPath, description);
            spinner.succeed(`Updated ${gateway} with new skill entry`);
          } else {
            spinner.info(`No gateway found for category '${category}' - skipping gateway update`);
          }
        } catch (error) {
          spinner.warn(`Failed to update gateway: ${error}`);
          console.log(chalk.yellow('  You may need to manually add this skill to the appropriate gateway'));
        }
      }

      // Step 9: Next steps
      console.log(chalk.green('\n✅ Skill created successfully!\n'));
      console.log(chalk.blue('Next steps (TDD workflow):'));
      console.log(chalk.blue('1. RED: Document the gap this skill addresses'));
      console.log(chalk.blue('2. GREEN: Fill in SKILL.md with minimal content'));
      console.log(chalk.blue('3. REFACTOR: Test with subagents and close loopholes'));
      console.log(chalk.blue(`4. Add detailed docs to ${skillDir}/references/`));
      console.log(chalk.blue(`5. Add examples to ${skillDir}/examples/`));
      console.log(chalk.blue(`6. Run: npm run audit -- ${name}\n`));

      if (skillType === 'library' && !options.context7Data) {
        console.log(chalk.yellow('\n💡 Tip: For library skills, you can use context7 to populate documentation:'));
        console.log(chalk.yellow('   1. Query context7 for the library documentation'));
        console.log(chalk.yellow('   2. Save to a JSON file'));
        console.log(chalk.yellow(`   3. Re-run: npm run create -- ${name} "${description}" --location ${location} --category ${category} --skill-type library --context7-data /path/to/data.json\n`));
      }

    } catch (error) {
      console.error(chalk.red('\n⚠️  Tool Error - This is a tool failure, not a skill creation failure.'));
      console.error(chalk.gray(`  ${error}`));
      process.exit(2);
    }
  });

/**
 * Handle suggest mode with multi-stage workflow
 */
function handleSuggestMode(
  name: string,
  description: string | undefined,
  options: {
    location?: string;
    category?: string;
    skillType?: string;
    queryContext7?: string;
    context7Data?: string;
  }
): CreateSuggestionWithContext7 {
  // Build collected answers from provided options
  const collectedAnswers: CreateSuggestionWithContext7['collectedAnswers'] = {};

  if (description) collectedAnswers.description = description;
  if (options.location === 'core' || options.location === 'library') {
    collectedAnswers.location = options.location;
  }
  if (options.category) collectedAnswers.category = options.category;
  if (options.skillType) collectedAnswers.skillType = options.skillType as SkillCategory;
  if (options.queryContext7 === 'yes') collectedAnswers.queryContext7 = true;
  if (options.queryContext7 === 'no') collectedAnswers.queryContext7 = false;

  // Determine current stage based on what's missing
  const { stage, stagesRemaining } = determineStage(collectedAnswers);

  // Generate question for current stage
  const question = generateStageQuestion(stage, collectedAnswers);

  // If we have a question, return NEEDS_INPUT
  if (question) {
    return {
      skill: name,
      status: 'NEEDS_INPUT',
      stage,
      stagesRemaining,
      collectedAnswers,
      questions: [question],
      nextStageCommand: buildNextStageCommand(name, description, collectedAnswers),
      createCommand: buildFinalCreateCommand(name, description, collectedAnswers),
    };
  }

  // All inputs collected - check if context7 is needed
  if (
    collectedAnswers.queryContext7 === true &&
    !options.context7Data
  ) {
    return {
      skill: name,
      status: 'NEEDS_CONTEXT7',
      stage: 5,
      stagesRemaining: 0,
      collectedAnswers,
      context7Instructions: {
        libraryName: name,
        steps: [
          'Query context7 MCP tool "resolve-library-id" with the library name',
          'Query context7 MCP tool "get-library-docs" with the resolved ID',
          'Save the result to a JSON file',
          `Re-run: ${buildFinalCreateCommand(name, description, collectedAnswers)} --context7-data /path/to/docs.json`,
        ],
      },
      createCommand: buildFinalCreateCommand(name, description, collectedAnswers),
    };
  }

  // All inputs collected and ready
  return {
    skill: name,
    status: 'READY',
    stage: 5,
    stagesRemaining: 0,
    collectedAnswers,
    createCommand: buildFinalCreateCommand(name, description, collectedAnswers),
  };
}

/**
 * Determine current stage based on collected answers
 */
function determineStage(
  answers: CreateSuggestionWithContext7['collectedAnswers']
): { stage: CreateStage; stagesRemaining: number } {
  // Stage 1: Need location
  if (!answers?.location) {
    return { stage: 1, stagesRemaining: 4 };
  }

  // Stage 2: Need category (if library selected)
  if (answers.location === 'library' && !answers.category) {
    return { stage: 2, stagesRemaining: 3 };
  }

  // Stage 3: Need skill type
  if (!answers.skillType) {
    return { stage: 3, stagesRemaining: 2 };
  }

  // Stage 4: Need context7 decision (only for library/integration types)
  if (
    (answers.skillType === 'library' || answers.skillType === 'integration') &&
    answers.queryContext7 === undefined
  ) {
    return { stage: 4, stagesRemaining: 1 };
  }

  // Stage 5: Ready
  return { stage: 5, stagesRemaining: 0 };
}

/**
 * Generate question for a specific stage
 */
function generateStageQuestion(
  stage: CreateStage,
  answers: CreateSuggestionWithContext7['collectedAnswers']
): NonNullable<CreateSuggestionWithContext7['questions']>[0] | null {
  switch (stage) {
    case 1:
      return {
        id: 'location',
        question: 'Where should this skill be created?',
        type: 'select',
        options: [
          {
            value: 'core',
            label: 'Core Skills',
            description: '.claude/skills/ - High-frequency, always-loaded skills (~25 skills)',
          },
          {
            value: 'library',
            label: 'Skill Library',
            description: '.claude/skill-library/ - Specialized skills loaded on-demand (~120 skills)',
          },
        ],
        required: true,
      };

    case 2:
      // Dynamically discover library categories
      const categories = discoverLibraryCategories();
      return {
        id: 'category',
        question: 'Which folder should this skill be placed in?',
        type: 'select',
        options: categories.map((cat: LibraryCategoryOption) => ({
          value: cat.value,
          label: cat.label,
          description: cat.description,
        })),
        required: true,
      };

    case 3:
      return {
        id: 'skillType',
        question: 'What type of skill is this?',
        type: 'select',
        options: SKILL_TYPE_OPTIONS.map(opt => ({
          value: opt.value,
          label: opt.label,
          description: opt.description,
        })),
        required: true,
      };

    case 4:
      return {
        id: 'queryContext7',
        question: 'Would you like to query context7 for official documentation?',
        type: 'select',
        options: [
          {
            value: 'yes',
            label: 'Yes',
            description: 'Fetch latest docs from context7 to populate references and examples',
          },
          {
            value: 'no',
            label: 'No',
            description: "Skip - I'll write documentation manually",
          },
        ],
        required: true,
      };

    case 5:
      // All inputs collected
      return null;

    default:
      return null;
  }
}

/**
 * Build command for next stage with current answers
 */
function buildNextStageCommand(
  name: string,
  description: string | undefined,
  answers: CreateSuggestionWithContext7['collectedAnswers']
): string {
  let cmd = `npm run create -- ${name}`;
  if (description) {
    cmd += ` "${description}"`;
  }
  cmd += ' --suggest';

  // Add collected answers as flags
  if (answers?.location) {
    cmd += ` --location ${answers.location}`;
  }
  if (answers?.category) {
    cmd += ` --category ${answers.category}`;
  }
  if (answers?.skillType) {
    cmd += ` --skill-type ${answers.skillType}`;
  }
  if (answers?.queryContext7 !== undefined) {
    cmd += ` --query-context7 ${answers.queryContext7 ? 'yes' : 'no'}`;
  }

  return cmd;
}

/**
 * Build final create command with all answers
 */
function buildFinalCreateCommand(
  name: string,
  description: string | undefined,
  answers: CreateSuggestionWithContext7['collectedAnswers']
): string {
  let cmd = `npm run create -- ${name}`;
  if (description) {
    cmd += ` "${description}"`;
  } else {
    cmd += ' "$DESCRIPTION"';
  }

  if (answers?.location) {
    cmd += ` --location ${answers.location}`;
  } else {
    cmd += ' --location $LOCATION';
  }

  if (answers?.location === 'library') {
    if (answers?.category) {
      cmd += ` --category ${answers.category}`;
    } else {
      cmd += ' --category $CATEGORY';
    }
  }

  if (answers?.skillType) {
    cmd += ` --skill-type ${answers.skillType}`;
  }

  return cmd;
}

/**
 * Generate standard SKILL.md template based on skill type
 */
function generateStandardSkillTemplate(
  name: string,
  description: string,
  skillType: SkillCategory
): string {
  const title = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const tools = TOOL_SETS['default'].join(', ');

  // Common header
  let content = `---
name: ${name}
description: ${description}
allowed-tools: ${tools}
skill-type: ${skillType}
---

# ${title}

`;

  // Type-specific templates
  switch (skillType) {
    case 'library':
      content += `## Version & Dependencies

| Package | Version | Docs Source |
|---------|---------|-------------|
| [package-name] | [version] | [manual/context7] |

## Overview

[Library overview and purpose]

## API Quick Reference

| Function | Purpose | Example |
|----------|---------|---------|
| [func1] | [purpose] | \`[example]\` |

## When to Use

Use this skill when:
- Working with [library-name]
- [Scenario 2]
- [Scenario 3]

## Common Patterns

See [references/patterns.md](references/patterns.md) for detailed patterns.

### Pattern 1: [Name]
[Brief description]

## Examples

See [examples/basic-usage.md](examples/basic-usage.md) for complete examples.

## API Reference

See [references/api-reference.md](references/api-reference.md) for full API documentation.

## Troubleshooting

[Common issues and solutions]

## References

- [Official Documentation](https://...)
- [API Reference](references/api-reference.md)
- [Patterns](references/patterns.md)
`;
      break;

    case 'integration':
      content += `## Overview

[Integration purpose - what systems/tools does this connect?]

## Prerequisites

- [Prerequisite 1]
- [Prerequisite 2]

## Configuration

[Configuration steps and environment variables]

## Quick Reference

| Operation | Command/Pattern | Notes |
|-----------|-----------------|-------|
| [op1] | [command] | [notes] |

## When to Use

Use this skill when:
- Connecting [System A] with [System B]
- [Scenario 2]
- [Scenario 3]

## Implementation

### Step 1: [Setup]

[Instructions]

### Step 2: [Integration]

[Instructions]

## Error Handling

[Common errors and solutions]

## References

- [references/api-reference.md](references/api-reference.md)
- [examples/basic-usage.md](examples/basic-usage.md)
`;
      break;

    case 'tool-wrapper':
      content += `## Overview

[Tool wrapper purpose - what CLI/MCP does this wrap?]

## Prerequisites

- [Tool installation]
- [Required permissions]

## Quick Reference

| Command | Description | Example |
|---------|-------------|---------|
| [cmd1] | [desc] | \`[example]\` |

## When to Use

Use this skill when:
- Running [tool-name] commands
- [Scenario 2]
- [Scenario 3]

## Commands

### [Command 1]

\`\`\`bash
[command example]
\`\`\`

**Parameters:**
- \`--param1\`: [description]

### [Command 2]

\`\`\`bash
[command example]
\`\`\`

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| [error1] | [cause] | [solution] |

## References

- [references/commands.md](references/commands.md)
- [examples/workflows.md](examples/workflows.md)
`;
      break;

    case 'process':
    default:
      content += `## Overview

[Skill purpose and core principle]

## Quick Reference

| Pattern | Solution | Example |
|---------|----------|---------|
| [Pattern 1] | [Solution 1] | [Example 1] |

## When to Use

Use this skill when:
- [Scenario 1]
- [Scenario 2]
- [Scenario 3]

## Implementation

### Step 1: [Action]

[Instructions]

### Step 2: [Action]

[Instructions]

## Examples

See [examples/example-1.md](examples/example-1.md) for complete workflow.

## References

- [references/detailed-guide.md](references/detailed-guide.md) - Deep dive into patterns
`;
      break;
  }

  return content;
}

// Custom error handler for better error messages
program.exitOverride((err) => {
  if (err.code === 'commander.unknownOption') {
    const unknownOption = err.message.match(/error: unknown option '([^']+)'/)?.[1];
    if (unknownOption === '--type') {
      console.error(chalk.red('\n❌ Error: Use --skill-type instead of --type'));
      console.error(chalk.yellow('Example: npm run create -- my-skill "description" --skill-type integration\n'));
    } else {
      console.error(chalk.red(`\n⚠️  Tool Error - ${err.message}`));
      console.error(chalk.gray('  Run with --help to see available options'));
    }
    process.exit(2);
  }
  throw err; // Re-throw other errors
});

program.parse();
