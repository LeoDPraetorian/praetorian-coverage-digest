/**
 * Phase 2: Description Quality Validation
 *
 * AUTO-FIXABLE: No (requires semantic understanding)
 *
 * Checks:
 * - Starts with "Use when" trigger
 * - Contains <example> blocks (2-4 recommended)
 * - Length < 1024 characters
 * - Includes capabilities list
 */

import {
  AgentInfo,
  AuditPhaseResult,
  AuditIssue,
  FixSuggestion,
  DESCRIPTION_LIMITS,
} from '../types.js';

export const PHASE_NUMBER = 2;
export const PHASE_NAME = 'Description Quality';
export const AUTO_FIXABLE = false;

/**
 * Count example blocks in description
 */
function countExamples(description: string): number {
  const matches = description.match(/<example>/gi);
  return matches ? matches.length : 0;
}

/**
 * Check if description has capabilities list (comma-separated items)
 */
function hasCapabilitiesList(description: string): boolean {
  // Look for pattern like "- feature1, feature2, feature3"
  // or after trigger: "Use when X - feature1, feature2"
  const afterTrigger = description.split(/Use when[^-]+-/i)[1];
  if (afterTrigger) {
    // Check for comma-separated items before first newline or example
    const firstPart = afterTrigger.split(/\\n|<example>/i)[0];
    return firstPart.includes(',');
  }
  return description.includes(',');
}

/**
 * Run Phase 2 audit on an agent
 */
export function runPhase2(agent: AgentInfo): AuditPhaseResult {
  const issues: AuditIssue[] = [];
  const suggestions: FixSuggestion[] = [];

  const description = agent.frontmatter.description || '';

  // Skip if description is broken (Phase 1 issue)
  if (agent.descriptionStatus !== 'valid') {
    issues.push({
      severity: 'info',
      message: 'Skipping description quality check - fix Phase 1 issues first',
    });
    return {
      phase: PHASE_NUMBER,
      name: PHASE_NAME,
      passed: true, // Don't fail for Phase 1 issues
      autoFixable: AUTO_FIXABLE,
      issues,
      suggestions,
    };
  }

  // Check 1: "Use when" trigger
  if (!agent.hasUseWhenTrigger) {
    issues.push({
      severity: 'error',
      message: 'Description must start with "Use when" trigger',
      details: 'This helps Claude match user intent to agent purpose',
    });

    suggestions.push({
      id: 'phase2-trigger',
      phase: 2,
      description: 'Add "Use when" trigger at start of description',
      autoFixable: false,
      currentValue: description.substring(0, 50) + '...',
      suggestedValue: `Use when ${description.substring(0, 50)}...`,
    });
  }

  // Check 2: Example blocks
  const exampleCount = countExamples(description);
  if (!agent.hasExamples) {
    issues.push({
      severity: 'error',
      message: 'Description must contain <example> blocks',
      details: 'Examples help Claude understand when to select this agent',
    });

    suggestions.push({
      id: 'phase2-examples',
      phase: 2,
      description: 'Add 2-4 example blocks showing agent selection',
      autoFixable: false,
      suggestedValue: `\\n\\n<example>\\nContext: [Describe situation]\\nuser: "[User request]"\\nassistant: "I'll use the ${agent.frontmatter.name} agent to [action]."\\n</example>`,
    });
  } else if (exampleCount < 2) {
    issues.push({
      severity: 'warning',
      message: `Only ${exampleCount} example block(s) - recommend 2-4`,
      details: 'More examples improve agent selection accuracy',
    });
  } else if (exampleCount > 4) {
    issues.push({
      severity: 'warning',
      message: `${exampleCount} example blocks - consider reducing to 2-4`,
      details: 'Too many examples increase token cost without proportional benefit',
    });
  }

  // Check 3: Length limits
  if (description.length > DESCRIPTION_LIMITS.maxLength) {
    issues.push({
      severity: 'error',
      message: `Description exceeds ${DESCRIPTION_LIMITS.maxLength} characters (${description.length})`,
      details: 'Long descriptions consume discovery budget and may be truncated',
    });

    suggestions.push({
      id: 'phase2-length',
      phase: 2,
      description: 'Trim description to under 1024 characters',
      autoFixable: false,
      currentValue: `${description.length} characters`,
    });
  } else if (description.length > DESCRIPTION_LIMITS.warningLength) {
    issues.push({
      severity: 'warning',
      message: `Description approaching limit (${description.length}/${DESCRIPTION_LIMITS.maxLength} chars)`,
      details: 'Consider trimming for better performance',
    });
  }

  // Check 4: Capabilities list
  if (!hasCapabilitiesList(description)) {
    issues.push({
      severity: 'warning',
      message: 'Description should include comma-separated capabilities',
      details: 'Pattern: "Use when [trigger] - capability1, capability2, capability3"',
    });
  }

  // Check 5: Example format validation
  if (agent.hasExamples) {
    // Check for proper example structure
    const hasContext = /Context:/i.test(description);
    const hasUser = /user:/i.test(description);
    const hasAssistant = /assistant:/i.test(description);

    if (!hasContext || !hasUser || !hasAssistant) {
      issues.push({
        severity: 'warning',
        message: 'Example blocks should include Context, user, and assistant fields',
        details: 'Format: <example>\\nContext: [situation]\\nuser: "[request]"\\nassistant: "[response]"\\n</example>',
      });
    }
  }

  return {
    phase: PHASE_NUMBER,
    name: PHASE_NAME,
    passed: issues.filter(i => i.severity === 'error').length === 0,
    autoFixable: AUTO_FIXABLE,
    issues,
    suggestions,
  };
}
