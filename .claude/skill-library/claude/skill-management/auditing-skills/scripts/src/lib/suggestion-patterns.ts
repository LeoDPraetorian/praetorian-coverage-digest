/**
 * Suggestion patterns for semantic fixes.
 * These define how each fix type should be presented to users.
 */

import type { SuggestionOption } from './types.js';

/**
 * Standard options for most semantic fixes
 */
export const STANDARD_OPTIONS: SuggestionOption[] = [
  { key: 'accept', label: 'Accept suggestion', description: 'Apply the suggested fix' },
  { key: 'skip', label: 'Skip', description: 'Keep current state, address later' },
  { key: 'custom', label: 'Custom', description: 'Provide your own value' },
];

/**
 * Options for issues that can only be acknowledged (no auto-fix possible)
 */
export const ACKNOWLEDGE_OPTIONS: SuggestionOption[] = [
  { key: 'accept', label: 'Acknowledge', description: 'Mark as reviewed, will address manually' },
  { key: 'skip', label: 'Skip', description: 'Ignore for now' },
];

/**
 * Patterns for generating user-friendly suggestions
 */
export const SUGGESTION_PATTERNS = {
  /**
   * Phase 1: Description quality issues
   */
  'phase1-description-short': {
    title: 'Skill description could be more detailed',
    explanationTemplate: (currentLength: number, targetMin: number, targetMax: number) =>
      `Complex skills benefit from longer descriptions (${targetMin}-${targetMax} chars) for better searchability. Current: ${currentLength} chars.`,
    options: STANDARD_OPTIONS,
  },

  'phase1-description-long': {
    title: 'Skill description exceeds maximum length',
    explanationTemplate: (currentLength: number, maxLength: number) =>
      `Description is ${currentLength} chars, exceeding the ${maxLength} char limit. Consider shortening while keeping key information.`,
    options: STANDARD_OPTIONS,
  },

  'phase1-missing-trigger': {
    title: 'Description missing "Use when" trigger phrase',
    explanationTemplate: () =>
      `Skill descriptions should start with "Use when..." to help Claude know when to activate the skill.`,
    options: STANDARD_OPTIONS,
  },

  /**
   * Phase 2: Allowed-tools field issues (deterministic)
   */
  'phase2-allowed-tools': {
    title: 'Allowed-tools field needs updating',
    explanationTemplate: () =>
      `The allowed-tools field can be automatically fixed to match the tools used in the skill.`,
    options: STANDARD_OPTIONS,
  },

  /**
   * Phase 3: Line count issues (Anthropic recommends <500 lines)
   */
  'phase3-too-long': {
    title: 'SKILL.md exceeds 500 line limit',
    explanationTemplate: (currentLines: number, limitLines: number) =>
      `At ${currentLines} lines, this skill exceeds the ${limitLines} line limit. Extract detailed sections to references/ directory.`,
    options: ACKNOWLEDGE_OPTIONS, // Can't auto-fix, requires manual extraction
  },

  'phase3-approaching-limit': {
    title: 'SKILL.md approaching 500 line limit',
    explanationTemplate: (currentLines: number, limitLines: number) =>
      `At ${currentLines} lines, this skill is approaching the ${limitLines} line limit. Plan extraction before adding more content.`,
    options: ACKNOWLEDGE_OPTIONS,
  },

  /**
   * Phase 4: Broken links (deterministic)
   */
  'phase4-broken-links': {
    title: 'Broken links detected',
    explanationTemplate: () =>
      `Broken file links can be automatically fixed by checking for correct paths.`,
    options: STANDARD_OPTIONS,
  },

  /**
   * Phase 5: File organization (deterministic)
   */
  'phase5-file-organization': {
    title: 'File organization issues',
    explanationTemplate: () =>
      `Files can be automatically moved to the correct locations (scripts/, references/, etc.).`,
    options: STANDARD_OPTIONS,
  },

  /**
   * Phase 6: Script organization (deterministic)
   */
  'phase6-script-organization': {
    title: 'Script organization issues',
    explanationTemplate: () =>
      `Scripts can be automatically organized into the scripts/ directory.`,
    options: STANDARD_OPTIONS,
  },

  /**
   * Phase 7: Output directories (deterministic)
   */
  'phase7-output-directories': {
    title: 'Output directory issues',
    explanationTemplate: () =>
      `Output directories (.local/, .output/) can be automatically created if missing.`,
    options: STANDARD_OPTIONS,
  },

  /**
   * Phase 9: Non-TypeScript script issues
   */
  'phase9-scripts': {
    title: 'Non-TypeScript scripts detected',
    explanationTemplate: (scriptCount: number, scriptList: string) =>
      `Found ${scriptCount} non-TypeScript script(s). TypeScript is preferred for cross-platform compatibility and consistent testing.\n\nScripts: ${scriptList}`,
    options: ACKNOWLEDGE_OPTIONS, // Migration requires manual work
  },

  /**
   * Phase 10: Deprecated references (deterministic)
   */
  'phase10-deprecated-refs': {
    title: 'Deprecated references found',
    explanationTemplate: () =>
      `References to deprecated skills or tools can be automatically updated to current versions.`,
    options: STANDARD_OPTIONS,
  },

  /**
   * Phase 11: Command portability issues
   */
  'phase11-cd-command': {
    title: 'Command may not work in git submodules',
    explanationTemplate: (lineNumber: number, currentCommand: string) =>
      `Line ${lineNumber} uses a path that breaks in git submodules. Should use repo-root detection.`,
    options: STANDARD_OPTIONS,
  },

  /**
   * Phase 12: CLI error handling (deterministic)
   */
  'phase12-cli-error-handling': {
    title: 'CLI error handling issues',
    explanationTemplate: () =>
      `CLI scripts can be automatically updated with proper error handling and exit codes.`,
    options: STANDARD_OPTIONS,
  },

  /**
   * Phase 13: State externalization issues
   */
  'phase13-todowrite': {
    title: 'Complex skill should mandate TodoWrite',
    explanationTemplate: (reasons: string) =>
      `This skill has complexity indicators (${reasons}). TodoWrite helps track progress through complex procedures.`,
    options: [
      { key: 'accept' as const, label: 'Add TodoWrite mandate', description: 'Add principle requiring TodoWrite usage' },
      { key: 'skip' as const, label: 'Skip', description: 'Keep current state' },
    ] as SuggestionOption[],
  },
};

/**
 * Get suggestion pattern by ID
 */
export function getSuggestionPattern(id: string) {
  return SUGGESTION_PATTERNS[id as keyof typeof SUGGESTION_PATTERNS];
}

/**
 * Build apply command for a semantic fix
 */
export function buildApplyCommand(skillName: string, fixId: string, needsValue: boolean): string {
  if (needsValue) {
    return `npm run fix -- ${skillName} --apply ${fixId} --value "$VALUE"`;
  }
  return `npm run fix -- ${skillName} --apply ${fixId}`;
}
