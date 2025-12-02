// src/lib/synthesizer.ts
/**
 * Content Synthesizer - Combines all research sources into generation-ready content
 *
 * Responsibilities:
 * - Select similar skill as structural template
 * - Combine content from requirements, codebase, context7, web
 * - Deduplicate and prioritize content
 * - Return synthesized content ready for generators
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { findProjectRoot } from '../../../../../lib/find-project-root.js';
import type {
  GenerationInput,
  SynthesizedContent,
  GeneratedSection,
  GeneratedFile,
  GenerationMetadata,
  SkillTemplate,
  SimilarSkill,
  CodebasePatterns,
  ResearchData,
  Requirements,
  ContentPreference,
} from './types.js';

const PROJECT_ROOT = findProjectRoot();

/**
 * Synthesize content from all research sources
 */
export function synthesizeContent(input: GenerationInput): SynthesizedContent {
  const { requirements, codebasePatterns, context7Data, webResearch } = input;

  // Select structural template from similar skills
  const template = selectTemplate(codebasePatterns?.similarSkills);

  // Generate frontmatter from requirements
  const frontmatter = generateFrontmatter(requirements);

  // Build sections from all sources
  const sections = buildSections(requirements, codebasePatterns, context7Data, webResearch, template);

  // Deduplicate and prioritize
  const deduplicatedSections = deduplicateSections(sections);
  const prioritizedSections = prioritizeSections(deduplicatedSections, requirements.contentPreferences);

  // Generate references, templates, examples
  const references = buildReferences(requirements, codebasePatterns, context7Data, webResearch);
  const templates = buildTemplates(requirements, codebasePatterns, context7Data);
  const examples = buildExamples(requirements, codebasePatterns);

  // Build metadata
  const metadata = buildMetadata(
    requirements,
    codebasePatterns,
    context7Data,
    webResearch,
    template,
    prioritizedSections,
    references,
    templates,
    examples
  );

  return {
    frontmatter,
    sections: prioritizedSections,
    references,
    templates,
    examples,
    metadata,
  };
}

/**
 * Select the best similar skill as a structural template
 */
export function selectTemplate(similarSkills?: SimilarSkill[]): SkillTemplate | null {
  if (!similarSkills || similarSkills.length === 0) {
    return null;
  }

  // Sort by similarity score
  const sorted = [...similarSkills].sort((a, b) => b.similarity - a.similarity);
  const best = sorted[0];

  // Read the skill to extract structure
  const skillPath = join(PROJECT_ROOT, best.path, 'SKILL.md');
  if (!existsSync(skillPath)) {
    return null;
  }

  try {
    const content = readFileSync(skillPath, 'utf-8');
    const sections = extractSectionHeadings(content);
    const frontmatterFields = extractFrontmatterFields(content);

    return {
      sourceName: best.name,
      sourcePath: best.path,
      sections,
      hasReferences: best.structure.hasReferences,
      hasTemplates: best.structure.hasTemplates,
      hasExamples: best.structure.hasExamples,
      frontmatterFields,
    };
  } catch {
    return null;
  }
}

/**
 * Generate frontmatter from requirements
 */
export function generateFrontmatter(requirements: Requirements): SynthesizedContent['frontmatter'] {
  // Build description from purpose
  const description = `Use when ${requirements.purpose.toLowerCase().replace(/^use when /i, '')}`;

  // Determine allowed tools based on skill type
  const allowedTools = determineAllowedTools(requirements.skillType);

  // Determine skills based on content preferences
  const skills = determineSkills(requirements);

  return {
    name: requirements.name,
    description: description.length > 120 ? description.slice(0, 117) + '...' : description,
    allowedTools,
    skills: skills.length > 0 ? skills : undefined,
  };
}

/**
 * Determine allowed tools based on skill type
 */
export function determineAllowedTools(skillType: Requirements['skillType']): string[] {
  const baseTools = ['Read', 'Grep', 'Glob'];

  switch (skillType) {
    case 'process':
      return [...baseTools, 'Write', 'Edit', 'Bash', 'TodoWrite'];
    case 'library':
      return [...baseTools, 'Write', 'Edit', 'Bash'];
    case 'integration':
      return [...baseTools, 'Write', 'Edit', 'Bash', 'WebFetch'];
    case 'tool-wrapper':
      return [...baseTools, 'Bash'];
    default:
      return baseTools;
  }
}

/**
 * Determine skills to reference based on requirements
 */
export function determineSkills(requirements: Requirements): string[] {
  const skills: string[] = [];

  // Add gateway skills based on content
  if (requirements.searchPatterns.some((p) => p.match(/react|frontend|component|hook/i))) {
    skills.push('gateway-frontend');
  }
  if (requirements.searchPatterns.some((p) => p.match(/go|backend|api|lambda/i))) {
    skills.push('gateway-backend');
  }
  if (requirements.contentPreferences.includes('testing')) {
    skills.push('gateway-testing');
  }

  return [...new Set(skills)];
}

/**
 * Build sections from all sources
 */
export function buildSections(
  requirements: Requirements,
  codebasePatterns?: CodebasePatterns,
  context7Data?: ResearchData,
  webResearch?: GenerationInput['webResearch'],
  template?: SkillTemplate | null
): GeneratedSection[] {
  const sections: GeneratedSection[] = [];

  // Overview section (always first)
  sections.push({
    title: 'Overview',
    content: buildOverviewContent(requirements, context7Data),
    source: 'requirements',
    priority: 100,
  });

  // When to Use section
  sections.push({
    title: 'When to Use',
    content: buildWhenToUseContent(requirements),
    source: 'requirements',
    priority: 95,
  });

  // Quick Reference section
  if (context7Data || codebasePatterns) {
    sections.push({
      title: 'Quick Reference',
      content: buildQuickReferenceContent(requirements, codebasePatterns, context7Data),
      source: context7Data ? 'context7' : 'codebase',
      priority: 90,
    });
  }

  // Workflow sections from requirements
  for (const workflow of requirements.workflows) {
    sections.push({
      title: formatWorkflowTitle(workflow),
      content: buildWorkflowContent(workflow, codebasePatterns, context7Data),
      source: 'requirements',
      priority: 80,
    });
  }

  // Codebase patterns section
  if (codebasePatterns && codebasePatterns.relatedCode.length > 0) {
    sections.push({
      title: 'Codebase Patterns',
      content: buildCodebasePatternsContent(codebasePatterns),
      source: 'codebase',
      priority: 70,
    });
  }

  // Conventions section
  if (codebasePatterns) {
    sections.push({
      title: 'Project Conventions',
      content: buildConventionsContent(codebasePatterns.conventions),
      source: 'codebase',
      priority: 65,
    });
  }

  // API Reference section (if library type and context7 available)
  if (requirements.skillType === 'library' && context7Data) {
    sections.push({
      title: 'API Reference',
      content: buildApiReferenceContent(context7Data),
      source: 'context7',
      priority: 60,
    });
  }

  // Troubleshooting section (if preference)
  if (requirements.contentPreferences.includes('troubleshooting')) {
    sections.push({
      title: 'Troubleshooting',
      content: buildTroubleshootingContent(webResearch),
      source: webResearch ? 'web' : 'requirements',
      priority: 50,
    });
  }

  // Anti-patterns section (if preference)
  if (requirements.contentPreferences.includes('anti-patterns')) {
    sections.push({
      title: 'Anti-Patterns',
      content: buildAntiPatternsContent(codebasePatterns, webResearch),
      source: codebasePatterns ? 'codebase' : 'requirements',
      priority: 45,
    });
  }

  // References section (always last)
  sections.push({
    title: 'References',
    content: buildReferencesSectionContent(codebasePatterns, context7Data, webResearch),
    source: 'requirements',
    priority: 10,
  });

  return sections;
}

/**
 * Build overview content - comprehensive introduction to the skill
 */
function buildOverviewContent(requirements: Requirements, context7Data?: ResearchData): string {
  let content = `**${requirements.purpose}**\n\n`;

  // Core description based on skill type
  switch (requirements.skillType) {
    case 'library':
      content += `This skill provides patterns, best practices, and ready-to-use templates for working with **${requirements.libraryName || 'this library'}**.\n\n`;
      content += `### Key Features\n\n`;
      content += `- **API Reference**: Complete documentation of commonly-used APIs\n`;
      content += `- **Code Templates**: Production-ready code snippets and patterns\n`;
      content += `- **Best Practices**: Curated guidelines for optimal usage\n`;
      content += `- **Troubleshooting**: Common issues and their solutions\n`;
      content += `- **Integration Patterns**: How to integrate with existing codebases\n\n`;
      break;
    case 'process':
      content += `This skill defines a structured workflow for ${requirements.purpose.toLowerCase()}.\n\n`;
      content += `### Key Features\n\n`;
      content += `- **Step-by-Step Guide**: Clear instructions for each phase\n`;
      content += `- **Checklists**: Verification points to ensure completeness\n`;
      content += `- **Templates**: Ready-to-use artifacts and documents\n`;
      content += `- **Decision Trees**: Guidance for handling edge cases\n`;
      content += `- **Quality Gates**: Criteria for moving between phases\n\n`;
      break;
    case 'integration':
      content += `This skill provides patterns for integrating with external services and APIs.\n\n`;
      content += `### Key Features\n\n`;
      content += `- **Authentication Patterns**: Secure credential handling\n`;
      content += `- **API Wrappers**: Type-safe interface definitions\n`;
      content += `- **Error Handling**: Robust retry and fallback strategies\n`;
      content += `- **Rate Limiting**: Proper throttling implementation\n`;
      content += `- **Data Mapping**: Transform external data to internal models\n\n`;
      break;
    case 'tool-wrapper':
      content += `This skill wraps CLI tools with type-safe interfaces and consistent patterns.\n\n`;
      content += `### Key Features\n\n`;
      content += `- **Type-Safe Inputs**: Zod validation for all parameters\n`;
      content += `- **Filtered Outputs**: Token-optimized response handling\n`;
      content += `- **Error Handling**: Graceful failure with actionable messages\n`;
      content += `- **Timeout Management**: Prevent hanging operations\n`;
      content += `- **Audit Logging**: Track tool invocations for debugging\n\n`;
      break;
  }

  // Statistics from research
  if (context7Data) {
    const stats = context7Data.metadata;
    content += `### Research Sources\n\n`;
    content += `This skill was generated from:\n`;
    content += `- **${stats.totalPages}** documentation sections analyzed\n`;
    content += `- **${stats.totalCodeBlocks}** code examples extracted\n`;
    content += `- **${context7Data.context7.packages.length}** packages researched\n\n`;
  }

  // Target audience with detail
  content += `### Target Audience\n\n`;
  switch (requirements.audience) {
    case 'beginner':
      content += `This skill is designed for **beginners** who are:\n`;
      content += `- New to ${requirements.libraryName || 'this technology'}\n`;
      content += `- Learning fundamental concepts\n`;
      content += `- Need step-by-step guidance\n`;
      content += `- Want clear explanations of "why" not just "how"\n\n`;
      break;
    case 'intermediate':
      content += `This skill is designed for **intermediate** developers who:\n`;
      content += `- Have basic familiarity with ${requirements.libraryName || 'this technology'}\n`;
      content += `- Want to improve their implementation patterns\n`;
      content += `- Need production-ready code templates\n`;
      content += `- Are looking for best practices and optimization tips\n\n`;
      break;
    case 'expert':
      content += `This skill is designed for **expert** developers who:\n`;
      content += `- Are deeply familiar with ${requirements.libraryName || 'this technology'}\n`;
      content += `- Need edge case handling and optimization\n`;
      content += `- Want architectural patterns and advanced techniques\n`;
      content += `- Are building complex, production-scale systems\n\n`;
      break;
  }

  return content;
}

/**
 * Build "When to Use" content - comprehensive triggers and decision criteria
 */
function buildWhenToUseContent(requirements: Requirements): string {
  let content = '### Triggers\n\n';
  content += 'Use this skill when:\n\n';

  // Add based on workflows
  for (const workflow of requirements.workflows) {
    content += `- ${workflow}\n`;
  }

  // Add based on skill type with comprehensive triggers
  switch (requirements.skillType) {
    case 'library':
      content += `- Implementing ${requirements.libraryName || 'this library'} in a new or existing project\n`;
      content += `- Following best practices for ${requirements.libraryName || 'this library'}\n`;
      content += `- Debugging issues related to ${requirements.libraryName || 'this library'}\n`;
      content += `- Optimizing performance of ${requirements.libraryName || 'this library'} usage\n`;
      content += `- Reviewing code that uses ${requirements.libraryName || 'this library'}\n`;
      content += `- Teaching others how to use ${requirements.libraryName || 'this library'}\n`;
      break;
    case 'process':
      content += '- Following a structured workflow for consistency\n';
      content += '- Ensuring team-wide adherence to practices\n';
      content += '- Onboarding new team members to established processes\n';
      content += '- Auditing existing work against defined standards\n';
      content += '- Creating documentation for repeatable processes\n';
      break;
    case 'integration':
      content += '- Connecting external services to the platform\n';
      content += '- Implementing API integrations with third parties\n';
      content += '- Handling authentication and authorization flows\n';
      content += '- Mapping external data models to internal structures\n';
      content += '- Implementing retry logic and error handling\n';
      break;
    case 'tool-wrapper':
      content += '- Interacting with CLI tools programmatically\n';
      content += '- Automating tool operations in workflows\n';
      content += '- Building type-safe interfaces around shell commands\n';
      content += '- Filtering and processing tool output\n';
      content += '- Handling tool errors gracefully\n';
      break;
  }

  // Decision criteria section
  content += '\n### Decision Criteria\n\n';
  content += 'This skill is the right choice when:\n\n';

  switch (requirements.skillType) {
    case 'library':
      content += `| Criterion | This Skill | Alternative |\n`;
      content += `|-----------|------------|-------------|\n`;
      content += `| Need ${requirements.libraryName || 'library'} patterns | ✅ Yes | Use manual implementation |\n`;
      content += `| Want production-ready code | ✅ Yes | Prototype from scratch |\n`;
      content += `| Following project standards | ✅ Yes | Create new patterns |\n`;
      content += `| Integrating with existing code | ✅ Yes | Start fresh |\n\n`;
      break;
    case 'process':
      content += `| Criterion | This Skill | Alternative |\n`;
      content += `|-----------|------------|-------------|\n`;
      content += `| Need consistent workflow | ✅ Yes | Ad-hoc approach |\n`;
      content += `| Want quality gates | ✅ Yes | Trust-based review |\n`;
      content += `| Team alignment needed | ✅ Yes | Individual discretion |\n`;
      content += `| Reproducible outcomes | ✅ Yes | One-off solutions |\n\n`;
      break;
    case 'integration':
      content += `| Criterion | This Skill | Alternative |\n`;
      content += `|-----------|------------|-------------|\n`;
      content += `| External API access | ✅ Yes | Use internal services |\n`;
      content += `| Need robust error handling | ✅ Yes | Basic implementation |\n`;
      content += `| Type-safe integration | ✅ Yes | Dynamic typing |\n`;
      content += `| Production resilience | ✅ Yes | Prototype-level |\n\n`;
      break;
    case 'tool-wrapper':
      content += `| Criterion | This Skill | Alternative |\n`;
      content += `|-----------|------------|-------------|\n`;
      content += `| CLI tool automation | ✅ Yes | Manual execution |\n`;
      content += `| Type-safe inputs | ✅ Yes | String concatenation |\n`;
      content += `| Filtered outputs | ✅ Yes | Parse raw output |\n`;
      content += `| Reusable across agents | ✅ Yes | Inline bash |\n\n`;
      break;
  }

  // When NOT to use
  content += '### When NOT to Use\n\n';
  content += 'This skill may not be appropriate when:\n\n';

  switch (requirements.skillType) {
    case 'library':
      content += `- Building a quick prototype that won\'t go to production\n`;
      content += `- The ${requirements.libraryName || 'library'} is being replaced or deprecated\n`;
      content += `- Requirements are highly custom and don\'t fit standard patterns\n`;
      content += `- Performance-critical code needs hand-optimized implementation\n\n`;
      break;
    case 'process':
      content += `- Working on one-off exploratory tasks\n`;
      content += `- The process itself is being redesigned\n`;
      content += `- Emergency situations requiring immediate action\n`;
      content += `- Solo work with no need for team consistency\n\n`;
      break;
    case 'integration':
      content += `- Using internal services that don\'t need this overhead\n`;
      content += `- One-time data migrations with no ongoing sync\n`;
      content += `- Mock/test integrations that won\'t go to production\n`;
      content += `- APIs that are too simple to warrant wrappers\n\n`;
      break;
    case 'tool-wrapper':
      content += `- One-off manual tool invocations\n`;
      content += `- Tools with excellent existing TypeScript SDKs\n`;
      content += `- Interactive tools requiring user input\n`;
      content += `- GUI-based tools without CLI interfaces\n\n`;
      break;
  }

  return content;
}

/**
 * Build Quick Reference content - essential commands and patterns at a glance
 */
function buildQuickReferenceContent(
  requirements: Requirements,
  codebasePatterns?: CodebasePatterns,
  context7Data?: ResearchData
): string {
  let content = '';

  // Add common commands/operations table based on skill type
  content += '### Common Operations\n\n';

  switch (requirements.skillType) {
    case 'library':
      content += '| Operation | Command/Pattern | Notes |\n';
      content += '|-----------|-----------------|-------|\n';
      content += `| Install | \`npm install ${requirements.libraryName || 'package'}\` | Add to dependencies |\n`;
      content += `| Import | \`import { ... } from '${requirements.libraryName || 'package'}'\` | ES6 module import |\n`;
      content += `| Initialize | See templates/ | Project-specific setup |\n`;
      content += `| Configure | See references/ | Configuration options |\n\n`;
      break;
    case 'process':
      content += '| Phase | Action | Verification |\n';
      content += '|-------|--------|---------------|\n';
      for (let i = 0; i < Math.min(requirements.workflows.length, 5); i++) {
        content += `| ${i + 1}. ${requirements.workflows[i]} | See workflow section | Checklist complete |\n`;
      }
      content += '\n';
      break;
    case 'integration':
      content += '| Step | Action | Notes |\n';
      content += '|------|--------|-------|\n';
      content += '| Authentication | Configure credentials | See security section |\n';
      content += '| Connection | Initialize client | Singleton pattern |\n';
      content += '| Request | Call API method | With retry logic |\n';
      content += '| Response | Map to internal model | Validate schema |\n';
      content += '| Error | Handle gracefully | Log and notify |\n\n';
      break;
    case 'tool-wrapper':
      content += '| Operation | Pattern | Example |\n';
      content += '|-----------|---------|--------|\n';
      content += '| Execute | `npx tsx .claude/tools/service/tool.ts` | See templates/ |\n';
      content += '| Input | Zod schema validation | Typed parameters |\n';
      content += '| Output | Filtered JSON response | Token-optimized |\n';
      content += '| Error | Graceful failure | Actionable message |\n\n';
      break;
  }

  // Build API table from context7 API sections
  if (context7Data) {
    const apiSections = context7Data.context7.documentation
      .flatMap((d) => d.sections)
      .filter((s) => s.type === 'api')
      .slice(0, 10);

    if (apiSections.length > 0) {
      content += '### API Quick Reference\n\n';
      content += '| API | Description |\n';
      content += '|-----|-------------|\n';
      for (const section of apiSections) {
        const desc = section.content.split('\n')[0].slice(0, 60);
        content += `| \`${section.title}\` | ${desc}... |\n`;
      }
      content += '\n';
    }
  }

  // Add codebase patterns summary
  if (codebasePatterns) {
    content += '### Codebase Statistics\n\n';
    content += `| Metric | Count |\n`;
    content += `|--------|-------|\n`;
    content += `| Related patterns | ${codebasePatterns.relatedCode.length} |\n`;
    content += `| Similar skills | ${codebasePatterns.similarSkills.length} |\n`;
    content += `| Related tests | ${codebasePatterns.relatedTests.length} |\n`;
    content += `| Submodules | ${codebasePatterns.submodules.length} |\n\n`;
  }

  // File locations
  content += '### Key Locations\n\n';
  content += '| Content | Path |\n';
  content += '|---------|------|\n';
  content += '| API Reference | `references/*.md` |\n';
  content += '| Code Templates | `templates/` |\n';
  content += '| Examples | `examples/` |\n';
  content += '| This Skill | `SKILL.md` |\n\n';

  return content;
}

/**
 * Build workflow content - step-by-step instructions with context
 */
function buildWorkflowContent(
  workflow: string,
  codebasePatterns?: CodebasePatterns,
  context7Data?: ResearchData
): string {
  let content = '';

  // Add workflow description
  content += `This section covers how to ${workflow.toLowerCase()}.\n\n`;

  // Add generic step structure
  content += `#### Steps\n\n`;
  content += `1. **Preparation**: Ensure prerequisites are met\n`;
  content += `2. **Implementation**: Follow the patterns below\n`;
  content += `3. **Verification**: Confirm expected behavior\n`;
  content += `4. **Documentation**: Update relevant docs if needed\n\n`;

  // Find related code examples
  const workflowKeywords = workflow.toLowerCase().split(/\s+/);

  if (context7Data) {
    const relevantBlocks = context7Data.context7.documentation
      .flatMap((d) => d.sections.flatMap((s) => s.codeBlocks))
      .filter((block) =>
        workflowKeywords.some(
          (kw) => block.context.toLowerCase().includes(kw) || block.code.toLowerCase().includes(kw)
        )
      )
      .slice(0, 3);

    if (relevantBlocks.length > 0) {
      content += '#### Code Examples\n\n';
      for (const block of relevantBlocks) {
        if (block.context) {
          content += `**${block.context}**\n\n`;
        }
        content += `\`\`\`${block.language}\n${block.code}\n\`\`\`\n\n`;
      }
    }
  }

  if (codebasePatterns) {
    const relevantMatches = codebasePatterns.relatedCode
      .filter((match) => workflowKeywords.some((kw) => match.content.toLowerCase().includes(kw)))
      .slice(0, 3);

    if (relevantMatches.length > 0) {
      content += '#### Codebase Examples\n\n';
      content += 'Patterns from the existing codebase:\n\n';
      for (const match of relevantMatches) {
        content += `**From \`${match.file}:${match.line}\`:**\n`;
        content += `\`\`\`\n${match.content}\n\`\`\`\n\n`;
      }
    }
  }

  // Add checklist
  content += '#### Checklist\n\n';
  content += `- [ ] Prerequisites verified\n`;
  content += `- [ ] Implementation complete\n`;
  content += `- [ ] Tests passing\n`;
  content += `- [ ] Documentation updated\n\n`;

  // Add tips section
  content += '#### Tips\n\n';
  content += `- Review similar implementations in the codebase first\n`;
  content += `- Follow established patterns from \`references/\`\n`;
  content += `- Run tests after each significant change\n`;
  content += `- Commit incremental progress with clear messages\n\n`;

  return content;
}

/**
 * Build codebase patterns content
 */
function buildCodebasePatternsContent(patterns: CodebasePatterns): string {
  let content = 'Patterns found in the codebase:\n\n';

  // Group by match type
  const byType: Record<string, typeof patterns.relatedCode> = {};
  for (const match of patterns.relatedCode) {
    if (!byType[match.matchType]) byType[match.matchType] = [];
    byType[match.matchType].push(match);
  }

  for (const [type, matches] of Object.entries(byType)) {
    content += `### ${type.charAt(0).toUpperCase() + type.slice(1)} Patterns\n\n`;
    for (const match of matches.slice(0, 5)) {
      content += `**${match.file}:${match.line}**\n`;
      content += `\`\`\`\n${match.content}\n\`\`\`\n\n`;
    }
  }

  return content;
}

/**
 * Build conventions content - comprehensive project standards
 */
function buildConventionsContent(conventions: CodebasePatterns['conventions']): string {
  let content = '';

  // Always add a base conventions section
  content += 'Follow these project conventions for consistency:\n\n';

  // Naming conventions
  content += '### Naming Conventions\n\n';
  if (conventions.namingPatterns.length > 0) {
    for (const pattern of conventions.namingPatterns.slice(0, 5)) {
      content += `- ${pattern}\n`;
    }
  } else {
    // Default naming conventions
    content += '- **Files**: `kebab-case.ts` for utilities, `PascalCase.tsx` for React components\n';
    content += '- **Variables**: `camelCase` for variables and functions\n';
    content += '- **Constants**: `SCREAMING_SNAKE_CASE` for constants\n';
    content += '- **Types/Interfaces**: `PascalCase` with descriptive names\n';
    content += '- **Test files**: `*.unit.test.ts` or `*.integration.test.ts`\n';
  }
  content += '\n';

  // Coding standards
  content += '### Coding Standards\n\n';
  if (conventions.codingStandards.length > 0) {
    for (const standard of conventions.codingStandards.slice(0, 5)) {
      content += `- ${standard}\n`;
    }
  } else {
    // Default coding standards
    content += '- **TypeScript**: Use strict mode, avoid `any` types\n';
    content += '- **Exports**: Prefer named exports over default exports\n';
    content += '- **Error Handling**: Always handle errors explicitly, no silent catches\n';
    content += '- **Comments**: Explain "why" not "what", use JSDoc for public APIs\n';
    content += '- **Functions**: Keep functions focused, under 50 lines ideally\n';
  }
  content += '\n';

  // Testing patterns
  content += '### Testing Patterns\n\n';
  if (conventions.testingPatterns.length > 0) {
    for (const pattern of conventions.testingPatterns.slice(0, 5)) {
      content += `- ${pattern}\n`;
    }
  } else {
    // Default testing patterns
    content += '- **TDD**: Write tests first when implementing new features\n';
    content += '- **Unit tests**: 80%+ coverage for business logic\n';
    content += '- **Mocking**: Use vitest mocks, avoid testing implementation details\n';
    content += '- **Naming**: `describe` blocks for context, `it` blocks for behavior\n';
    content += '- **Assertions**: Prefer specific assertions over generic truthy checks\n';
  }
  content += '\n';

  // Security patterns if available
  if (conventions.securityPatterns.length > 0) {
    content += '### Security Patterns\n\n';
    for (const pattern of conventions.securityPatterns.slice(0, 5)) {
      content += `- ${pattern}\n`;
    }
    content += '\n';
  } else {
    content += '### Security Patterns\n\n';
    content += '- **Input Validation**: Validate all inputs with Zod schemas\n';
    content += '- **Secrets**: Never hardcode credentials, use environment variables\n';
    content += '- **Dependencies**: Audit dependencies regularly for vulnerabilities\n';
    content += '- **Logging**: Never log sensitive data (passwords, tokens, PII)\n';
    content += '- **Sanitization**: Sanitize user input before display or storage\n\n';
  }

  // File organization
  content += '### File Organization\n\n';
  if (conventions.fileOrganization.length > 0) {
    for (const pattern of conventions.fileOrganization.slice(0, 5)) {
      content += `- ${pattern}\n`;
    }
  } else {
    content += '- **Colocation**: Keep related files together\n';
    content += '- **Index files**: Use for re-exports, not logic\n';
    content += '- **Tests**: Place next to source files, not in separate tree\n';
    content += '- **Types**: Colocate types or use shared `types.ts`\n';
    content += '- **Constants**: Extract to dedicated files when shared\n';
  }
  content += '\n';

  // Reference to project docs
  content += '### Project Documentation\n\n';
  content += 'For comprehensive project conventions, see:\n\n';
  content += '- `CLAUDE.md` - Project-specific instructions\n';
  content += '- `docs/DESIGN-PATTERNS.md` - Architectural patterns\n';
  content += '- `docs/TECH-STACK.md` - Technology choices and versions\n\n';

  return content;
}

/**
 * Build API reference content - comprehensive API documentation summary
 */
function buildApiReferenceContent(context7Data: ResearchData): string {
  let content = '';

  // Introduction
  content += 'This section provides a summary of the most commonly used APIs. ';
  content += 'For complete documentation, see the `references/` directory.\n\n';

  // API overview table
  const allApiSections = context7Data.context7.documentation
    .flatMap((d) => d.sections)
    .filter((s) => s.type === 'api');

  if (allApiSections.length > 0) {
    content += '### API Overview\n\n';
    content += '| API | Category | Description |\n';
    content += '|-----|----------|-------------|\n';
    for (const section of allApiSections.slice(0, 15)) {
      const desc = section.content.split('\n')[0].slice(0, 50);
      content += `| \`${section.title}\` | ${section.type} | ${desc}... |\n`;
    }
    content += '\n';
    if (allApiSections.length > 15) {
      content += `*...and ${allApiSections.length - 15} more APIs. See references/ for complete list.*\n\n`;
    }
  }

  // Detailed sections for top APIs
  const apiSections = allApiSections.slice(0, 5);

  for (const section of apiSections) {
    content += `### ${section.title}\n\n`;

    // Description
    const paragraphs = section.content.split('\n\n');
    content += `${paragraphs[0]}\n\n`;

    // Signature/usage if available in second paragraph
    if (paragraphs.length > 1 && paragraphs[1].includes('(')) {
      content += `**Signature:**\n\n`;
      content += `\`\`\`typescript\n${paragraphs[1]}\n\`\`\`\n\n`;
    }

    // Code example
    if (section.codeBlocks.length > 0) {
      const block = section.codeBlocks[0];
      content += `**Example:**\n\n`;
      content += `\`\`\`${block.language}\n${block.code}\n\`\`\`\n\n`;
    }

    // Parameters if mentioned
    if (section.content.toLowerCase().includes('param')) {
      content += `**Parameters:** See \`references/\` for complete parameter documentation.\n\n`;
    }

    // Return value note
    content += `**Returns:** See type definitions in \`references/\`.\n\n`;
  }

  // Links to detailed references
  content += '### Detailed Documentation\n\n';
  content += 'For complete API documentation with all parameters, types, and examples:\n\n';
  for (const doc of context7Data.context7.documentation) {
    const filename = doc.packageName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    content += `- [\`${doc.packageName}\`](references/${filename}.md)\n`;
  }
  content += '\n';

  return content;
}

/**
 * Build troubleshooting content - comprehensive issue resolution guide
 */
function buildTroubleshootingContent(webResearch?: GenerationInput['webResearch']): string {
  let content = '';

  // Common issues from web research
  content += '### Common Issues\n\n';

  if (webResearch && webResearch.fetchedContent.length > 0) {
    // Extract troubleshooting info from web content
    let hasWebIssues = false;
    for (const source of webResearch.fetchedContent.slice(0, 3)) {
      const issues = extractTroubleshootingInfo(source.content);
      for (const issue of issues.slice(0, 2)) {
        content += `#### ${issue.title}\n\n`;
        content += `**Symptom**: ${issue.title}\n\n`;
        content += `**Solution**: ${issue.solution}\n\n`;
        hasWebIssues = true;
      }
    }
    if (!hasWebIssues) {
      content += 'No specific issues found in research. See generic issues below.\n\n';
    }
  }

  // Generic troubleshooting patterns
  content += '### Generic Troubleshooting Patterns\n\n';

  content += '#### "Module not found" or Import Errors\n\n';
  content += '**Symptom**: TypeScript or Node.js cannot resolve imports.\n\n';
  content += '**Solutions**:\n';
  content += '1. Check file extension matches import (`.js` vs `.ts`)\n';
  content += '2. Verify `tsconfig.json` module resolution settings\n';
  content += '3. Run `npm install` to ensure dependencies are installed\n';
  content += '4. Check for circular dependencies\n\n';

  content += '#### Type Errors\n\n';
  content += '**Symptom**: TypeScript compilation fails with type mismatches.\n\n';
  content += '**Solutions**:\n';
  content += '1. Run `tsc --noEmit` to see all type errors\n';
  content += '2. Check if types are up to date with `npm update @types/*`\n';
  content += '3. Use type assertions sparingly: `value as ExpectedType`\n';
  content += '4. Consider if `unknown` is more appropriate than `any`\n\n';

  content += '#### Test Failures\n\n';
  content += '**Symptom**: Tests that previously passed now fail.\n\n';
  content += '**Solutions**:\n';
  content += '1. Check for race conditions in async tests\n';
  content += '2. Verify mocks are properly reset between tests\n';
  content += '3. Look for global state modifications\n';
  content += '4. Run single test in isolation to verify\n\n';

  content += '#### Performance Issues\n\n';
  content += '**Symptom**: Slow execution or high memory usage.\n\n';
  content += '**Solutions**:\n';
  content += '1. Profile with `console.time()` / `console.timeEnd()`\n';
  content += '2. Check for N+1 query patterns\n';
  content += '3. Review loops and recursive functions\n';
  content += '4. Consider memoization for expensive computations\n\n';

  // Debugging tools
  content += '### Debugging Tools\n\n';
  content += '| Tool | Purpose | Command |\n';
  content += '|------|---------|--------|\n';
  content += '| TypeScript | Type checking | `npx tsc --noEmit` |\n';
  content += '| Vitest | Run tests | `npm run test:unit` |\n';
  content += '| Node Inspector | Debug Node.js | `node --inspect` |\n';
  content += '| VS Code | Interactive debugging | F5 with launch.json |\n\n';

  // Getting help
  content += '### Getting Help\n\n';
  content += 'If these solutions don\'t resolve your issue:\n\n';
  content += '1. Search existing issues in the repository\n';
  content += '2. Check the `references/` directory for detailed documentation\n';
  content += '3. Review similar implementations in the codebase\n';
  content += '4. Ask the team with specific error messages and context\n\n';

  return content;
}

/**
 * Build anti-patterns content - comprehensive mistakes to avoid
 */
function buildAntiPatternsContent(
  codebasePatterns?: CodebasePatterns,
  webResearch?: GenerationInput['webResearch']
): string {
  let content = 'Understanding what NOT to do is as important as knowing what to do.\n\n';

  // Code quality anti-patterns
  content += '### Code Quality Anti-Patterns\n\n';
  content += '#### ❌ Skipping Input Validation\n\n';
  content += '**Problem**: Trusting external input without validation.\n\n';
  content += '```typescript\n';
  content += '// ❌ WRONG: No validation\n';
  content += 'function processData(data: any) {\n';
  content += '  return data.value.toUpperCase();\n';
  content += '}\n\n';
  content += '// ✅ CORRECT: Validate with Zod\n';
  content += 'const DataSchema = z.object({ value: z.string() });\n';
  content += 'function processData(input: unknown) {\n';
  content += '  const data = DataSchema.parse(input);\n';
  content += '  return data.value.toUpperCase();\n';
  content += '}\n';
  content += '```\n\n';

  content += '#### ❌ Silent Error Swallowing\n\n';
  content += '**Problem**: Catching errors without handling or logging them.\n\n';
  content += '```typescript\n';
  content += '// ❌ WRONG: Silent catch\n';
  content += 'try { await riskyOperation(); } catch { /* nothing */ }\n\n';
  content += '// ✅ CORRECT: Log and handle\n';
  content += 'try {\n';
  content += '  await riskyOperation();\n';
  content += '} catch (error) {\n';
  content += '  console.error("Operation failed:", error);\n';
  content += '  throw new OperationError("Failed to complete", { cause: error });\n';
  content += '}\n';
  content += '```\n\n';

  content += '#### ❌ Using `any` Type\n\n';
  content += '**Problem**: Defeats TypeScript\'s type safety.\n\n';
  content += '```typescript\n';
  content += '// ❌ WRONG: any bypasses all checks\n';
  content += 'function process(data: any) { ... }\n\n';
  content += '// ✅ CORRECT: Use proper types or unknown\n';
  content += 'function process(data: unknown) {\n';
  content += '  if (isValidData(data)) { ... }\n';
  content += '}\n';
  content += '```\n\n';

  // Architecture anti-patterns
  content += '### Architecture Anti-Patterns\n\n';
  content += '#### ❌ God Objects/Functions\n\n';
  content += '**Problem**: Single component doing too many things.\n\n';
  content += '**Signs**:\n';
  content += '- Function over 50 lines\n';
  content += '- File over 500 lines\n';
  content += '- Too many imports\n';
  content += '- Hard to name concisely\n\n';
  content += '**Solution**: Break into focused, single-responsibility units.\n\n';

  content += '#### ❌ Premature Optimization\n\n';
  content += '**Problem**: Optimizing before measuring.\n\n';
  content += '**Signs**:\n';
  content += '- Complex caching without profiling\n';
  content += '- Micro-optimizations in non-hot paths\n';
  content += '- Sacrificing readability for "performance"\n\n';
  content += '**Solution**: Write clear code first, profile, then optimize bottlenecks.\n\n';

  content += '#### ❌ Tight Coupling\n\n';
  content += '**Problem**: Components depend on implementation details of others.\n\n';
  content += '**Signs**:\n';
  content += '- Changing one file breaks many others\n';
  content += '- Hard to test in isolation\n';
  content += '- Circular dependencies\n\n';
  content += '**Solution**: Depend on abstractions (interfaces), not implementations.\n\n';

  // Testing anti-patterns
  content += '### Testing Anti-Patterns\n\n';
  content += '#### ❌ Testing Implementation Details\n\n';
  content += '**Problem**: Tests break when refactoring internals.\n\n';
  content += '```typescript\n';
  content += '// ❌ WRONG: Testing private method behavior\n';
  content += 'expect(component._internalState).toBe(...);\n\n';
  content += '// ✅ CORRECT: Test public behavior\n';
  content += 'expect(component.getOutput()).toBe(...);\n';
  content += '```\n\n';

  content += '#### ❌ Flaky Tests\n\n';
  content += '**Problem**: Tests that sometimes pass, sometimes fail.\n\n';
  content += '**Common Causes**:\n';
  content += '- Race conditions with async code\n';
  content += '- Shared mutable state between tests\n';
  content += '- Date/time dependencies\n';
  content += '- Network calls in unit tests\n\n';
  content += '**Solution**: Isolate tests, mock externals, use `beforeEach` reset.\n\n';

  // Process anti-patterns
  content += '### Process Anti-Patterns\n\n';
  content += '#### ❌ Skipping Code Review\n\n';
  content += '**Problem**: Rushing changes without peer review.\n\n';
  content += '**Why it matters**: Fresh eyes catch bugs, improve design, share knowledge.\n\n';

  content += '#### ❌ Large PRs\n\n';
  content += '**Problem**: Pull requests with 1000+ lines of changes.\n\n';
  content += '**Why it matters**: Hard to review thoroughly, high risk of bugs.\n\n';
  content += '**Solution**: Break into smaller, focused PRs (< 400 lines ideal).\n\n';

  content += '#### ❌ Documentation Debt\n\n';
  content += '**Problem**: Code without comments, outdated docs.\n\n';
  content += '**Why it matters**: Future developers (including future you) suffer.\n\n';
  content += '**Solution**: Document as you code, update docs in same PR.\n\n';

  return content;
}

/**
 * Build references section content - comprehensive resource links
 */
function buildReferencesSectionContent(
  codebasePatterns?: CodebasePatterns,
  context7Data?: ResearchData,
  webResearch?: GenerationInput['webResearch']
): string {
  let content = '';

  // Introduction
  content += 'This section provides links to all reference materials for this skill.\n\n';

  // Internal documentation
  content += '### Internal Documentation\n\n';
  content += 'Reference files included with this skill:\n\n';
  content += '| File | Description |\n';
  content += '|------|-------------|\n';

  if (context7Data) {
    for (const doc of context7Data.context7.documentation) {
      const filename = sanitizeFilename(doc.packageName);
      content += `| [${doc.packageName}](references/${filename}.md) | API documentation and guides |\n`;
    }
  }

  content += '| [project-conventions.md](references/project-conventions.md) | Project coding standards |\n';
  content += '\n';

  // Related skills in the codebase
  if (codebasePatterns && codebasePatterns.similarSkills.length > 0) {
    content += '### Related Skills\n\n';
    content += 'Skills in this codebase that relate to this topic:\n\n';
    content += '| Skill | Similarity | Description |\n';
    content += '|-------|------------|-------------|\n';
    for (const skill of codebasePatterns.similarSkills.slice(0, 5)) {
      const simPercent = Math.round(skill.similarity * 100);
      const desc = skill.frontmatter?.description?.slice(0, 40) || 'Related skill';
      content += `| [${skill.name}](${skill.path}) | ${simPercent}% | ${desc}... |\n`;
    }
    content += '\n';
  }

  // External resources
  content += '### External Resources\n\n';

  if (webResearch && webResearch.sources.length > 0) {
    content += 'Resources from the web:\n\n';
    for (const source of webResearch.sources.slice(0, 5)) {
      content += `- [${source.title}](${source.url}) - ${source.type}\n`;
    }
    content += '\n';
  }

  // Always include some generic resources
  content += 'General resources:\n\n';
  content += '- [TypeScript Documentation](https://www.typescriptlang.org/docs/)\n';
  content += '- [MDN Web Docs](https://developer.mozilla.org/)\n';
  content += '- [Node.js Documentation](https://nodejs.org/docs/latest/api/)\n\n';

  // Project documentation
  content += '### Project Documentation\n\n';
  content += 'Key project files for reference:\n\n';
  content += '| Document | Purpose |\n';
  content += '|----------|--------|\n';
  content += '| `CLAUDE.md` | Project-specific instructions for Claude |\n';
  content += '| `docs/DESIGN-PATTERNS.md` | Architectural patterns and guidelines |\n';
  content += '| `docs/TECH-STACK.md` | Technology stack and versions |\n';
  content += '| `docs/SKILLS-ARCHITECTURE.md` | Skills system architecture |\n\n';

  // How to contribute
  content += '### Contributing\n\n';
  content += 'To improve this skill:\n\n';
  content += '1. Update reference files with new patterns or corrections\n';
  content += '2. Add examples to the `examples/` directory\n';
  content += '3. Update templates with improved code snippets\n';
  content += '4. Submit changes via the `/skill-manager update` command\n\n';

  return content;
}

/**
 * Deduplicate sections with similar content
 */
export function deduplicateSections(sections: GeneratedSection[]): GeneratedSection[] {
  const seen = new Map<string, GeneratedSection>();

  for (const section of sections) {
    const existing = seen.get(section.title);
    if (!existing || section.priority > existing.priority) {
      seen.set(section.title, section);
    }
  }

  return Array.from(seen.values());
}

/**
 * Prioritize sections based on content preferences
 */
export function prioritizeSections(
  sections: GeneratedSection[],
  preferences: ContentPreference[]
): GeneratedSection[] {
  // Boost priority for preferred content
  const preferenceMap: Record<ContentPreference, string[]> = {
    templates: ['Quick Reference', 'API Reference'],
    troubleshooting: ['Troubleshooting', 'Common Issues'],
    testing: ['Testing', 'Test Patterns'],
    examples: ['Examples', 'Codebase Patterns'],
    'api-reference': ['API Reference', 'Quick Reference'],
    'best-practices': ['Project Conventions', 'Codebase Patterns'],
    'anti-patterns': ['Anti-Patterns'],
    'migration-guides': ['Migration'],
  };

  const boosted = sections.map((section) => {
    let boost = 0;
    for (const pref of preferences) {
      const keywords = preferenceMap[pref];
      if (keywords?.some((kw) => section.title.toLowerCase().includes(kw.toLowerCase()))) {
        boost += 10;
      }
    }
    return { ...section, priority: section.priority + boost };
  });

  return boosted.sort((a, b) => b.priority - a.priority);
}

/**
 * Build reference files from all sources
 */
export function buildReferences(
  requirements: Requirements,
  codebasePatterns?: CodebasePatterns,
  context7Data?: ResearchData,
  webResearch?: GenerationInput['webResearch']
): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // Context7 documentation as references
  if (context7Data) {
    for (const doc of context7Data.context7.documentation) {
      const filename = sanitizeFilename(doc.packageName);
      files.push({
        path: `references/${filename}.md`,
        content: formatDocumentationReference(doc),
        type: 'reference',
      });

      // API reference file if large
      const apiSections = doc.sections.filter((s) => s.type === 'api');
      if (apiSections.length > 5) {
        files.push({
          path: `references/${filename}-api.md`,
          content: formatApiReference(apiSections, doc.packageName),
          type: 'reference',
        });
      }
    }
  }

  // Codebase conventions as reference
  if (codebasePatterns) {
    files.push({
      path: 'references/project-conventions.md',
      content: formatConventionsReference(codebasePatterns.conventions),
      type: 'reference',
    });
  }

  return files;
}

/**
 * Build template files from code blocks
 */
export function buildTemplates(
  requirements: Requirements,
  codebasePatterns?: CodebasePatterns,
  context7Data?: ResearchData
): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // Context7 code blocks as templates
  if (context7Data) {
    const allBlocks = context7Data.context7.documentation.flatMap((d) =>
      d.sections.flatMap((s) => s.codeBlocks.map((b) => ({ block: b, source: s.title })))
    );

    // Group by language
    const byLang: Record<string, Array<{ block: typeof allBlocks[0]['block']; source: string }>> =
      {};
    for (const item of allBlocks) {
      const lang = item.block.language || 'text';
      if (!byLang[lang]) byLang[lang] = [];
      byLang[lang].push(item);
    }

    for (const [lang, blocks] of Object.entries(byLang)) {
      // Create index for this language
      let indexContent = `# ${lang.toUpperCase()} Templates\n\n`;
      indexContent += `${blocks.length} code templates for ${lang}.\n\n`;

      const examples = blocks.slice(0, 10);
      let num = 1;
      for (const { block, source } of examples) {
        const templateName = `${num.toString().padStart(2, '0')}-${sanitizeFilename(source)}`;
        indexContent += `## ${num}. ${source}\n\n`;
        indexContent += `\`\`\`${lang}\n${block.code}\n\`\`\`\n\n`;

        files.push({
          path: `templates/${lang}/${templateName}.${getExtension(lang)}`,
          content: formatTemplateFile(block, source),
          type: 'template',
        });
        num++;
      }

      files.push({
        path: `templates/${lang}/README.md`,
        content: indexContent,
        type: 'template',
      });
    }
  }

  return files;
}

/**
 * Build example files from tests and patterns
 */
export function buildExamples(
  requirements: Requirements,
  codebasePatterns?: CodebasePatterns
): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  if (codebasePatterns && codebasePatterns.relatedTests.length > 0) {
    let content = '# Test Examples\n\n';
    content += 'Examples from related tests in the codebase:\n\n';

    for (const test of codebasePatterns.relatedTests.slice(0, 10)) {
      content += `## ${test.testName}\n\n`;
      content += `File: \`${test.file}\`\n`;
      content += `Type: ${test.testType}\n\n`;
    }

    files.push({
      path: 'examples/test-examples.md',
      content,
      type: 'template', // Using template type for examples
    });
  }

  // Workflow examples
  if (requirements.workflows.length > 0) {
    let content = '# Workflow Examples\n\n';

    for (const workflow of requirements.workflows) {
      content += `## ${workflow}\n\n`;
      content += `TODO: Add example for ${workflow}\n\n`;
    }

    files.push({
      path: 'examples/workflow-examples.md',
      content,
      type: 'template',
    });
  }

  return files;
}

/**
 * Build generation metadata
 */
function buildMetadata(
  requirements: Requirements,
  codebasePatterns: CodebasePatterns | undefined,
  context7Data: ResearchData | undefined,
  webResearch: GenerationInput['webResearch'] | undefined,
  template: SkillTemplate | null,
  sections: GeneratedSection[],
  references: GeneratedFile[],
  templates: GeneratedFile[],
  examples: GeneratedFile[]
): GenerationMetadata {
  const skillMdContent = sections.map((s) => s.content).join('\n\n');

  return {
    generatedAt: new Date().toISOString(),
    requirements,
    sources: {
      similarSkill: template?.sourceName,
      context7Packages: context7Data?.context7.packages.map((p) => p.id) || [],
      webSources: webResearch?.sources.map((s) => s.url) || [],
      codebaseModules: codebasePatterns?.submodules.map((m) => m.name) || [],
    },
    stats: {
      skillMdLines: skillMdContent.split('\n').length,
      referenceCount: references.length,
      templateCount: templates.length,
      exampleCount: examples.length,
      totalCodeBlocks:
        context7Data?.context7.documentation.reduce(
          (sum, d) => sum + d.sections.reduce((s, sec) => s + sec.codeBlocks.length, 0),
          0
        ) || 0,
    },
  };
}

// Helper functions

function extractSectionHeadings(content: string): string[] {
  const headings: string[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/^#{1,3}\s+(.+)$/);
    if (match) {
      headings.push(match[1]);
    }
  }

  return headings;
}

function extractFrontmatterFields(content: string): string[] {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return [];

  const fields: string[] = [];
  const lines = match[1].split('\n');

  for (const line of lines) {
    const fieldMatch = line.match(/^([a-z-]+):/);
    if (fieldMatch) {
      fields.push(fieldMatch[1]);
    }
  }

  return fields;
}

function formatWorkflowTitle(workflow: string): string {
  return workflow
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function extractTroubleshootingInfo(
  content: string
): Array<{ title: string; solution: string }> {
  // Simple extraction - look for common patterns
  const issues: Array<{ title: string; solution: string }> = [];

  // Look for "Error:", "Issue:", "Problem:" patterns
  const patterns = [
    /(?:Error|Issue|Problem):\s*([^\n]+)\n+(?:Solution|Fix|Answer):\s*([^\n]+)/gi,
    /##\s*([^\n]+Error[^\n]*)\n+([\s\S]*?)(?=\n##|\n*$)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      issues.push({
        title: match[1].trim(),
        solution: match[2].trim().slice(0, 200),
      });
    }
  }

  return issues;
}

function formatDocumentationReference(
  doc: ResearchData['context7']['documentation'][0]
): string {
  let content = `# ${doc.packageName}\n\n`;
  content += `Version: ${doc.version}\n`;
  content += `Fetched: ${doc.fetchedAt}\n\n`;

  for (const section of doc.sections) {
    content += `## ${section.title}\n\n`;
    content += `${section.content}\n\n`;
  }

  return content;
}

function formatApiReference(
  sections: ResearchData['context7']['documentation'][0]['sections'],
  packageName: string
): string {
  let content = `# ${packageName} API Reference\n\n`;

  for (const section of sections) {
    content += `## ${section.title}\n\n`;
    content += `${section.content}\n\n`;

    for (const block of section.codeBlocks) {
      content += `\`\`\`${block.language}\n${block.code}\n\`\`\`\n\n`;
    }
  }

  return content;
}

function formatConventionsReference(conventions: CodebasePatterns['conventions']): string {
  let content = '# Project Conventions\n\n';
  content += `Source: ${conventions.source}\n\n`;

  if (conventions.namingPatterns.length > 0) {
    content += '## Naming Patterns\n\n';
    for (const p of conventions.namingPatterns) {
      content += `- ${p}\n`;
    }
    content += '\n';
  }

  if (conventions.fileOrganization.length > 0) {
    content += '## File Organization\n\n';
    for (const p of conventions.fileOrganization) {
      content += `- ${p}\n`;
    }
    content += '\n';
  }

  if (conventions.codingStandards.length > 0) {
    content += '## Coding Standards\n\n';
    for (const p of conventions.codingStandards) {
      content += `- ${p}\n`;
    }
    content += '\n';
  }

  if (conventions.testingPatterns.length > 0) {
    content += '## Testing Patterns\n\n';
    for (const p of conventions.testingPatterns) {
      content += `- ${p}\n`;
    }
    content += '\n';
  }

  if (conventions.securityPatterns.length > 0) {
    content += '## Security Patterns\n\n';
    for (const p of conventions.securityPatterns) {
      content += `- ${p}\n`;
    }
    content += '\n';
  }

  return content;
}

function formatTemplateFile(
  block: { code: string; context: string; language: string },
  source: string
): string {
  let content = `// Source: ${source}\n`;
  if (block.context) {
    content += `// Context: ${block.context.replace(/\n/g, '\n// ')}\n`;
  }
  content += `\n${block.code}\n`;
  return content;
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50);
}

function getExtension(lang: string): string {
  const extensions: Record<string, string> = {
    typescript: 'ts',
    javascript: 'js',
    tsx: 'tsx',
    jsx: 'jsx',
    python: 'py',
    go: 'go',
    rust: 'rs',
    bash: 'sh',
    shell: 'sh',
    json: 'json',
    yaml: 'yaml',
    css: 'css',
    html: 'html',
  };
  return extensions[lang.toLowerCase()] || 'txt';
}
