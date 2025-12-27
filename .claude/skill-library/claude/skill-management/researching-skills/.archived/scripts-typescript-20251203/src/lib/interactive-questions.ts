// src/lib/interactive-questions.ts
/**
 * Question generators for interactive research workflow
 *
 * This module creates questions for each step of the interactive flow,
 * formatted for use with Claude's AskUserQuestion tool.
 */

import type { InteractiveQuestion, QuestionOption } from './interactive-types.js';
import { SEARCH_AGAIN_VALUE, SKIP_VALUE } from './interactive-types.js';
import type { Context7Package } from './types.js';

// ============================================================================
// Source Selection Question
// ============================================================================

/**
 * Generate the source selection question
 *
 * This is the first question in the interactive flow, asking the user
 * which research sources they want to use.
 */
export function getSourceSelectionQuestion(): InteractiveQuestion {
  return {
    step: 'source-selection',
    question: 'Which research sources would you like to use for this skill?',
    header: 'Research Sources',
    options: [
      {
        label: 'Codebase research',
        description: 'Find similar skills, code patterns, and project conventions',
        value: 'codebase',
      },
      {
        label: 'Context7 (library docs)',
        description: 'Search library/framework documentation from Context7',
        value: 'context7',
      },
      {
        label: 'Web research',
        description: 'Search official docs, tutorials, and articles',
        value: 'web',
      },
    ],
    multiSelect: true,
  };
}

// ============================================================================
// Context7 Questions
// ============================================================================

/**
 * Generate the Context7 query question
 *
 * User-driven: asks user to enter their search term directly.
 * No keyword extraction from prompt - user controls the search.
 *
 * @param skillName - The skill name (used as a hint)
 * @param searchHistory - Previous queries tried in this session
 */
export function getContext7QueryQuestion(skillName: string, searchHistory: string[] = []): InteractiveQuestion {
  // Extract a simple hint from skill name: "fastly-integration" → "fastly"
  const skillHint = extractSkillNameHint(skillName);

  // Build minimal options - user should type their own query
  const options: QuestionOption[] = [];

  // If we have a hint from skill name and it wasn't tried before, show it
  if (skillHint && !searchHistory.includes(skillHint)) {
    options.push({
      label: skillHint,
      description: `Search for "${skillHint}" (from skill name)`,
      value: skillHint,
    });
  }

  // Always show option to enter custom query
  options.push({
    label: 'Enter search term',
    description: 'Type the library or service name you want to search for',
    value: '__custom__',
  });

  return {
    step: 'context7-query',
    question:
      searchHistory.length > 0
        ? `Previous search "${searchHistory[searchHistory.length - 1]}" didn't find what you needed. Enter a different search term:`
        : 'What library or service do you want to search for in Context7?',
    header: 'Context7 Search',
    options,
    multiSelect: false,
    allowCustomInput: true,
    customInputPlaceholder: 'Type library name (e.g., "fastly", "jira", "@atlassian/jira-api")',
  };
}

/**
 * Extract a simple hint from skill name
 *
 * "fastly-integration" → "fastly"
 * "jira-cloud-api" → "jira"
 */
function extractSkillNameHint(skillName: string): string | null {
  // Generic suffixes to remove
  const genericSuffixes = ['integration', 'skill', 'plugin', 'api', 'client', 'sdk', 'lib', 'tool', 'service'];

  const parts = skillName.toLowerCase().split('-');

  // Filter out generic parts
  const meaningfulParts = parts.filter((p) => !genericSuffixes.includes(p) && p.length > 2);

  // Return first meaningful part, or null if none
  return meaningfulParts.length > 0 ? meaningfulParts[0] : null;
}

/**
 * Generate the Context7 results question
 *
 * Shows search results and allows the user to select packages,
 * search again, or skip.
 *
 * @param packages - Search results from Context7
 * @param query - The query that was searched
 */
export function getContext7ResultsQuestion(packages: Context7Package[], query: string): InteractiveQuestion {
  // Build options from packages
  const packageOptions: QuestionOption[] = packages.slice(0, 10).map((pkg) => ({
    label: formatPackageLabel(pkg),
    description: pkg.description || 'No description available',
    value: pkg.id,
  }));

  // Add action options
  const actionOptions: QuestionOption[] = [
    {
      label: '🔄 Search with different query',
      description: 'Try a different search term',
      value: SEARCH_AGAIN_VALUE,
    },
    {
      label: '⏭️ Skip Context7',
      description: 'Continue without Context7 documentation',
      value: SKIP_VALUE,
    },
  ];

  const allOptions = [...packageOptions, ...actionOptions];

  // Different message based on results
  const question =
    packages.length > 0
      ? `Found ${packages.length} package${packages.length === 1 ? '' : 's'} for "${query}". Select packages to include:`
      : `No packages found for "${query}". You can try a different query or skip Context7.`;

  return {
    step: 'context7-results',
    question,
    header: 'Context7 Results',
    options: allOptions,
    multiSelect: true,
  };
}

/**
 * Format a package for display in the options list
 */
function formatPackageLabel(pkg: Context7Package): string {
  const pageCount = pkg.pageCount > 0 ? ` (${pkg.pageCount} pages)` : '';
  const status = pkg.status === 'deprecated' ? ' [DEPRECATED]' : pkg.status === 'caution' ? ' [CAUTION]' : '';
  return `${pkg.name}${pageCount}${status}`;
}

// ============================================================================
// Codebase Questions (Future)
// ============================================================================

/**
 * Generate the codebase query question
 *
 * @param prompt - The user's original prompt
 */
export function getCodebaseQueryQuestion(prompt: string): InteractiveQuestion {
  const suggestions = generateSearchSuggestions(prompt);

  const options: QuestionOption[] = suggestions.slice(0, 3).map((suggestion) => ({
    label: suggestion,
    description: `Search codebase for "${suggestion}" patterns`,
    value: suggestion,
  }));

  if (options.length === 0) {
    options.push({
      label: 'Search all patterns',
      description: 'Find all relevant code patterns',
      value: '*',
    });
  }

  return {
    step: 'codebase-query',
    question: 'What patterns would you like to search for in the codebase?',
    header: 'Codebase Search',
    options,
    multiSelect: false,
    allowCustomInput: true,
    customInputPlaceholder: 'Or type a custom search pattern',
  };
}

// ============================================================================
// Web Questions (Future)
// ============================================================================

/**
 * Generate the web research query question
 *
 * @param prompt - The user's original prompt
 */
export function getWebQueryQuestion(prompt: string): InteractiveQuestion {
  const suggestions = generateSearchSuggestions(prompt);

  // Add common documentation suffixes
  const webSuggestions: string[] = [];
  if (suggestions.length > 0) {
    webSuggestions.push(`${suggestions[0]} documentation`);
    webSuggestions.push(`${suggestions[0]} API reference`);
    if (suggestions.length > 1) {
      webSuggestions.push(`${suggestions[0]} ${suggestions[1]} tutorial`);
    }
    webSuggestions.push(suggestions[0]);
  }

  const options: QuestionOption[] = webSuggestions.slice(0, 4).map((suggestion) => ({
    label: suggestion,
    description: `Search web for "${suggestion}"`,
    value: suggestion,
  }));

  return {
    step: 'web-query',
    question: 'What would you like to search for on the web?',
    header: 'Web Search',
    options,
    multiSelect: false,
    allowCustomInput: true,
    customInputPlaceholder: 'Or type a custom web search query',
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert an InteractiveQuestion to the format expected by AskUserQuestion
 *
 * This transforms our internal question format to match Claude's
 * AskUserQuestion tool schema.
 */
export function toAskUserQuestionFormat(question: InteractiveQuestion): {
  question: string;
  header: string;
  options: Array<{ label: string; description: string }>;
  multiSelect: boolean;
} {
  return {
    question: question.question,
    header: question.header,
    options: question.options.map((opt) => ({
      label: opt.label,
      description: opt.description,
    })),
    multiSelect: question.multiSelect,
  };
}

/**
 * Parse user selection from AskUserQuestion response
 *
 * Maps selected labels back to their values.
 *
 * @param question - The question that was asked
 * @param selectedLabels - Labels selected by the user
 * @param customInput - Custom input if provided
 */
export function parseUserSelection(
  question: InteractiveQuestion,
  selectedLabels: string[],
  customInput?: string
): { selectedValues: string[]; customInput?: string } {
  const selectedValues = selectedLabels.map((label) => {
    const option = question.options.find((opt) => opt.label === label);
    return option?.value ?? label;
  });

  return {
    selectedValues,
    customInput,
  };
}
