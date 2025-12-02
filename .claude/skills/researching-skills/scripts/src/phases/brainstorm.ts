// src/phases/brainstorm.ts
/**
 * Brainstorming Phase - Extract requirements through guided Q&A
 *
 * This phase guides users through a series of questions to extract detailed
 * requirements for skill creation. The output feeds into all subsequent phases.
 *
 * Key principles:
 * - One question at a time
 * - Multiple choice where possible
 * - Dynamic options from filesystem
 * - JSON output mode for Claude-mediated flow
 */

import type {
  BrainstormQuestion,
  BrainstormAnswer,
  BrainstormResult,
  Requirements,
  SkillType,
  SkillAudience,
  ContentPreference,
  SkillLocation,
  QuestionOption,
} from '../lib/types.js';
import {
  discoverLibraryCategories,
  getCategoryOptions,
  suggestCategory,
} from '../lib/categories.js';
import { extractKeywords } from '../lib/submodule-discovery.js';

/**
 * Static brainstorm question definitions
 */
export const BRAINSTORM_QUESTIONS: BrainstormQuestion[] = [
  {
    id: 'skillType',
    type: 'select',
    question: 'What type of skill is this?',
    description: 'Select the category that best describes this skill',
    options: [
      { value: 'process', label: 'Process', description: 'Methodology, workflow, or procedure' },
      { value: 'library', label: 'Library', description: 'npm package, API, or framework' },
      { value: 'integration', label: 'Integration', description: 'Connecting multiple tools or services' },
      { value: 'tool-wrapper', label: 'Tool Wrapper', description: 'CLI tool or MCP wrapper' },
    ],
    required: true,
  },
  {
    id: 'location',
    type: 'select',
    question: 'Where should this skill live?',
    description: 'Core skills are always-loaded; library skills load on-demand',
    options: [
      { value: 'core', label: 'Core Skills', description: 'High-frequency, always loaded (~25 slots)' },
      { value: 'library', label: 'Skill Library', description: 'Specialized, on-demand loading' },
    ],
    required: true,
  },
  {
    id: 'category',
    type: 'select',
    question: 'Which category should this skill be in?',
    description: 'Select an existing category or leave blank to suggest new location',
    options: 'dynamic', // Will be populated from filesystem
    dependsOn: { questionId: 'location', values: ['library'] },
  },
  {
    id: 'purpose',
    type: 'text',
    question: 'What is the main purpose of this skill?',
    description: 'Describe what this skill helps users accomplish (1-2 sentences)',
    required: true,
  },
  {
    id: 'workflows',
    type: 'multiselect',
    question: 'What key workflows should this skill cover?',
    description: 'Select all that apply, or type custom workflows',
    options: 'dynamic', // Will be populated based on skill type
  },
  {
    id: 'audience',
    type: 'select',
    question: 'Who is the target audience?',
    options: [
      { value: 'beginner', label: 'Beginners', description: 'New to the topic, need foundational guidance' },
      { value: 'intermediate', label: 'Intermediate', description: 'Familiar with basics, need patterns and best practices' },
      { value: 'expert', label: 'Experts', description: 'Deep knowledge, need advanced techniques and edge cases' },
    ],
    default: 'intermediate',
  },
  {
    id: 'contentPreferences',
    type: 'multiselect',
    question: 'What types of content should be included?',
    options: [
      { value: 'templates', label: 'Code Templates', description: 'Reusable code snippets' },
      { value: 'troubleshooting', label: 'Troubleshooting', description: 'Common errors and fixes' },
      { value: 'testing', label: 'Testing Patterns', description: 'How to test this topic' },
      { value: 'examples', label: 'Examples', description: 'Complete working examples' },
      { value: 'api-reference', label: 'API Reference', description: 'Detailed API documentation' },
      { value: 'best-practices', label: 'Best Practices', description: 'Recommended approaches' },
      { value: 'anti-patterns', label: 'Anti-Patterns', description: 'What to avoid' },
      { value: 'migration-guides', label: 'Migration Guides', description: 'Upgrading from other solutions' },
    ],
    default: ['templates', 'examples', 'best-practices'],
  },
  {
    id: 'libraryName',
    type: 'text',
    question: 'What is the library/package name?',
    description: 'The npm package or library name for Context7 lookup',
    dependsOn: { questionId: 'skillType', values: ['library', 'integration'] },
  },
];

/**
 * Generate dynamic options for a question based on context
 *
 * @param questionId - Question to generate options for
 * @param answers - Previous answers for context
 * @param prompt - Initial user prompt for keyword extraction
 * @returns Array of question options
 */
export function generateDynamicOptions(
  questionId: string,
  answers: BrainstormAnswer[],
  prompt: string
): QuestionOption[] {
  switch (questionId) {
    case 'category':
      return getCategoryOptions();

    case 'workflows': {
      const skillType = getAnswer(answers, 'skillType');
      return generateWorkflowOptions(skillType as SkillType | undefined, prompt);
    }

    default:
      return [];
  }
}

/**
 * Generate workflow options based on skill type and prompt
 */
function generateWorkflowOptions(
  skillType: SkillType | undefined,
  prompt: string
): QuestionOption[] {
  const baseOptions: QuestionOption[] = [];

  // Add skill-type-specific workflows
  switch (skillType) {
    case 'process':
      baseOptions.push(
        { value: 'setup', label: 'Initial Setup', description: 'Getting started' },
        { value: 'execution', label: 'Execution Steps', description: 'Main workflow' },
        { value: 'verification', label: 'Verification', description: 'Checking results' },
        { value: 'troubleshooting', label: 'Troubleshooting', description: 'Fixing issues' }
      );
      break;

    case 'library':
      baseOptions.push(
        { value: 'installation', label: 'Installation', description: 'Installing the library' },
        { value: 'basic-usage', label: 'Basic Usage', description: 'Getting started' },
        { value: 'advanced-patterns', label: 'Advanced Patterns', description: 'Complex use cases' },
        { value: 'integration', label: 'Integration', description: 'Using with other tools' },
        { value: 'testing', label: 'Testing', description: 'Testing patterns' }
      );
      break;

    case 'integration':
      baseOptions.push(
        { value: 'setup', label: 'Setup', description: 'Configuring integration' },
        { value: 'authentication', label: 'Authentication', description: 'Auth setup' },
        { value: 'data-flow', label: 'Data Flow', description: 'Moving data between systems' },
        { value: 'error-handling', label: 'Error Handling', description: 'Handling failures' },
        { value: 'monitoring', label: 'Monitoring', description: 'Tracking health' }
      );
      break;

    case 'tool-wrapper':
      baseOptions.push(
        { value: 'installation', label: 'Installation', description: 'Installing the tool' },
        { value: 'commands', label: 'Commands', description: 'Available commands' },
        { value: 'configuration', label: 'Configuration', description: 'Tool settings' },
        { value: 'automation', label: 'Automation', description: 'Scripting patterns' }
      );
      break;
  }

  // Add custom option for user-defined workflows
  baseOptions.push({
    value: 'custom',
    label: 'Custom Workflow',
    description: 'Define your own workflow',
  });

  return baseOptions;
}

/**
 * Get answer value for a question
 */
export function getAnswer(
  answers: BrainstormAnswer[],
  questionId: string
): string | string[] | undefined {
  const answer = answers.find(a => a.questionId === questionId);
  return answer?.value;
}

/**
 * Check if a question should be shown based on dependencies
 *
 * @param question - Question to check
 * @param answers - Current answers
 * @returns True if question should be shown
 */
export function shouldShowQuestion(
  question: BrainstormQuestion,
  answers: BrainstormAnswer[]
): boolean {
  if (!question.dependsOn) return true;

  const dependencyAnswer = getAnswer(answers, question.dependsOn.questionId);
  if (!dependencyAnswer) return false;

  const answerValue = Array.isArray(dependencyAnswer)
    ? dependencyAnswer
    : [dependencyAnswer];

  return answerValue.some(v => question.dependsOn!.values.includes(v));
}

/**
 * Get the next question to ask
 *
 * @param answers - Current answers
 * @returns Next question or null if complete
 */
export function getNextQuestion(
  answers: BrainstormAnswer[]
): BrainstormQuestion | null {
  const answeredIds = new Set(answers.map(a => a.questionId));

  for (const question of BRAINSTORM_QUESTIONS) {
    // Skip if already answered
    if (answeredIds.has(question.id)) continue;

    // Skip if dependency not met
    if (!shouldShowQuestion(question, answers)) continue;

    return question;
  }

  return null;
}

/**
 * Generate search patterns from answers for codebase research
 *
 * @param answers - Brainstorm answers
 * @param prompt - Initial prompt
 * @returns Array of search patterns/keywords
 */
export function generateSearchPatterns(
  answers: BrainstormAnswer[],
  prompt: string
): string[] {
  const patterns: string[] = [];

  // Extract keywords from prompt
  patterns.push(...extractKeywords(prompt));

  // Extract from purpose
  const purpose = getAnswer(answers, 'purpose');
  if (typeof purpose === 'string') {
    patterns.push(...extractKeywords(purpose));
  }

  // Add library name if present
  const libraryName = getAnswer(answers, 'libraryName');
  if (typeof libraryName === 'string' && libraryName) {
    patterns.push(libraryName);
  }

  // Extract from workflows
  const workflows = getAnswer(answers, 'workflows');
  if (Array.isArray(workflows)) {
    for (const workflow of workflows) {
      patterns.push(...extractKeywords(workflow));
    }
  }

  // Deduplicate and filter
  const unique = [...new Set(patterns.map(p => p.toLowerCase()))];
  return unique.filter(p => p.length >= 2);
}

/**
 * Generate Context7 query from answers
 *
 * @param answers - Brainstorm answers
 * @param prompt - Initial prompt
 * @returns Context7 query string or null if not applicable
 */
export function generateContext7Query(
  answers: BrainstormAnswer[],
  prompt: string
): string | null {
  const skillType = getAnswer(answers, 'skillType');

  // Only generate for library and integration types
  if (skillType !== 'library' && skillType !== 'integration') {
    return null;
  }

  const libraryName = getAnswer(answers, 'libraryName');
  if (typeof libraryName === 'string' && libraryName) {
    return libraryName;
  }

  // Fall back to extracting from prompt
  const keywords = extractKeywords(prompt);
  return keywords[0] || null;
}

/**
 * Build Requirements object from completed answers
 *
 * @param name - Skill name
 * @param prompt - Initial prompt
 * @param answers - All brainstorm answers
 * @returns Complete Requirements object
 */
export function buildRequirements(
  name: string,
  prompt: string,
  answers: BrainstormAnswer[]
): Requirements {
  const skillType = (getAnswer(answers, 'skillType') as SkillType) || 'process';
  const locationChoice = getAnswer(answers, 'location') as string || 'library';
  const category = getAnswer(answers, 'category') as string;

  let location: SkillLocation;
  if (locationChoice === 'core') {
    location = 'core';
  } else {
    // Use suggested category or default to 'development'
    const effectiveCategory = category || suggestCategory(name, skillType) || 'development';
    location = { library: effectiveCategory };
  }

  const workflows = (getAnswer(answers, 'workflows') as string[]) || [];
  const contentPrefs = (getAnswer(answers, 'contentPreferences') as ContentPreference[]) ||
    ['templates', 'examples', 'best-practices'];

  return {
    name,
    initialPrompt: prompt,
    skillType,
    location,
    purpose: (getAnswer(answers, 'purpose') as string) || prompt,
    workflows,
    audience: (getAnswer(answers, 'audience') as SkillAudience) || 'intermediate',
    contentPreferences: contentPrefs,
    libraryName: getAnswer(answers, 'libraryName') as string | undefined,
    searchPatterns: generateSearchPatterns(answers, prompt),
    context7Query: generateContext7Query(answers, prompt) || undefined,
  };
}

/**
 * Generate suggested workflows based on prompt analysis
 *
 * @param prompt - User's initial prompt
 * @param skillType - Selected skill type
 * @returns Array of suggested workflow names
 */
export function suggestWorkflows(
  prompt: string,
  skillType: SkillType
): string[] {
  const keywords = extractKeywords(prompt);
  const suggestions: string[] = [];

  // Keyword to workflow mapping
  const keywordWorkflows: Record<string, string[]> = {
    'test': ['testing', 'verification'],
    'debug': ['troubleshooting', 'debugging'],
    'setup': ['setup', 'installation'],
    'config': ['configuration', 'setup'],
    'api': ['api-reference', 'integration'],
    'auth': ['authentication', 'setup'],
    'error': ['error-handling', 'troubleshooting'],
    'performance': ['optimization', 'monitoring'],
    'migrate': ['migration', 'upgrading'],
    'deploy': ['deployment', 'automation'],
  };

  for (const keyword of keywords) {
    const lowerKw = keyword.toLowerCase();
    for (const [trigger, workflows] of Object.entries(keywordWorkflows)) {
      if (lowerKw.includes(trigger)) {
        suggestions.push(...workflows);
      }
    }
  }

  // Add base workflows for skill type
  const options = generateWorkflowOptions(skillType, prompt);
  const baseWorkflows = options.slice(0, 3).map(o => o.value);

  return [...new Set([...baseWorkflows, ...suggestions])];
}

/**
 * Convert question to JSON format for Claude-mediated flow
 *
 * @param question - Question to convert
 * @param answers - Previous answers for dynamic options
 * @param prompt - Initial prompt
 * @returns JSON-compatible object for AskUserQuestion tool
 */
export function questionToJson(
  question: BrainstormQuestion,
  answers: BrainstormAnswer[],
  prompt: string
): {
  question: string;
  header: string;
  options: Array<{ label: string; description: string }>;
  multiSelect: boolean;
} {
  const options =
    question.options === 'dynamic'
      ? generateDynamicOptions(question.id, answers, prompt)
      : question.options || [];

  return {
    question: question.question,
    header: question.id.slice(0, 12), // Max 12 chars for header
    options: options.map(o => ({
      label: o.label,
      description: o.description || '',
    })),
    multiSelect: question.type === 'multiselect',
  };
}

/**
 * Run brainstorming phase with provided answers (non-interactive)
 *
 * Used when answers are provided externally (e.g., from Claude-mediated flow).
 *
 * @param name - Skill name
 * @param prompt - Initial prompt
 * @param providedAnswers - Pre-filled answers
 * @returns Brainstorm result with requirements
 */
export function runBrainstormingWithAnswers(
  name: string,
  prompt: string,
  providedAnswers: BrainstormAnswer[]
): BrainstormResult {
  // Validate all required answers are present
  const requiredQuestions = BRAINSTORM_QUESTIONS.filter(q => q.required);

  for (const question of requiredQuestions) {
    if (!shouldShowQuestion(question, providedAnswers)) continue;

    const answer = providedAnswers.find(a => a.questionId === question.id);
    if (!answer) {
      throw new Error(`Missing required answer for question: ${question.id}`);
    }
  }

  // Build requirements
  const requirements = buildRequirements(name, prompt, providedAnswers);

  // Get suggested workflows
  const suggestedWorkflows = suggestWorkflows(prompt, requirements.skillType);

  return {
    requirements,
    session: {
      answers: providedAnswers,
      currentQuestionIndex: BRAINSTORM_QUESTIONS.length,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    suggestedWorkflows,
  };
}

/**
 * Get all questions as JSON for Claude-mediated flow
 *
 * Returns questions that should be shown (respecting dependencies),
 * formatted for the AskUserQuestion tool.
 *
 * @param answers - Current answers
 * @param prompt - Initial prompt
 * @returns Array of JSON-formatted questions
 */
export function getAllQuestionsAsJson(
  answers: BrainstormAnswer[],
  prompt: string
): Array<{
  id: string;
  question: string;
  header: string;
  options: Array<{ label: string; description: string }>;
  multiSelect: boolean;
  dependsOn?: { questionId: string; values: string[] };
}> {
  return BRAINSTORM_QUESTIONS
    .filter(q => shouldShowQuestion(q, answers))
    .map(q => ({
      id: q.id,
      ...questionToJson(q, answers, prompt),
      dependsOn: q.dependsOn,
    }));
}

/**
 * Validate an answer against question constraints
 *
 * @param questionId - Question being answered
 * @param value - Answer value
 * @param answers - Previous answers for context
 * @param prompt - Initial prompt
 * @returns True if valid, throws error if invalid
 */
export function validateAnswer(
  questionId: string,
  value: string | string[],
  answers: BrainstormAnswer[],
  prompt: string
): boolean {
  const question = BRAINSTORM_QUESTIONS.find(q => q.id === questionId);
  if (!question) {
    throw new Error(`Unknown question: ${questionId}`);
  }

  // Check required
  if (question.required) {
    if (Array.isArray(value) && value.length === 0) {
      throw new Error(`Question "${questionId}" requires an answer`);
    }
    if (typeof value === 'string' && !value.trim()) {
      throw new Error(`Question "${questionId}" requires an answer`);
    }
  }

  // Validate against options for select/multiselect
  if (question.type === 'select' || question.type === 'multiselect') {
    const options =
      question.options === 'dynamic'
        ? generateDynamicOptions(question.id, answers, prompt)
        : question.options || [];

    const validValues = new Set(options.map(o => o.value));
    const valuesToCheck = Array.isArray(value) ? value : [value];

    for (const v of valuesToCheck) {
      if (v && !validValues.has(v) && v !== 'custom') {
        // Allow custom values for multiselect
        if (question.type !== 'multiselect') {
          throw new Error(`Invalid value "${v}" for question "${questionId}"`);
        }
      }
    }
  }

  return true;
}
