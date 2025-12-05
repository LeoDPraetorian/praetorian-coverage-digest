/**
 * Phase 3: Prompt Efficiency Validation
 *
 * AUTO-FIXABLE: No (requires content extraction to skills)
 *
 * Checks:
 * - Line count < 300 (warning at 250)
 * - Line count < 400 for complex agents (hard fail)
 * - No duplicated patterns (detect common blocks)
 * - Skills delegation present (not embedded patterns)
 */

import {
  AgentInfo,
  AuditPhaseResult,
  AuditIssue,
  FixSuggestion,
  LINE_COUNT_LIMITS,
} from '../types.js';
import { hasUnformattedTables } from '../format-tables.js';

export const PHASE_NUMBER = 3;
export const PHASE_NAME = 'Prompt Efficiency';
export const AUTO_FIXABLE = false;

/**
 * Common patterns that should be in skills, not agents
 */
const EMBEDDED_PATTERN_SIGNATURES = [
  {
    name: 'TDD Workflow',
    pattern: /RED.*GREEN.*REFACTOR/is,
    skill: 'developing-with-tdd',
  },
  {
    name: 'Debugging Steps',
    pattern: /Reproduce.*Isolate.*Fix.*Verify/is,
    skill: 'debugging-systematically',
  },
  {
    name: 'Verification Checklist',
    pattern: /Before completing.*verify:?\s*\n(\s*-\s*\[?\s*\]?.*\n){5,}/i,
    skill: 'verifying-before-completion',
  },
  {
    name: 'Import Order Rules',
    pattern: /import order|import.*first.*second.*third/i,
    threshold: 200, // Only flag if > 200 chars of import rules
  },
  {
    name: 'Code Style Rules',
    pattern: /```typescript[\s\S]{500,}```/i,
    threshold: 500, // Large code blocks should be in skills
  },
];

/**
 * Check for duplicated/common sections
 */
const DUPLICATED_SECTION_PATTERNS = [
  /##\s*Prerequisites/i,
  /##\s*Setup\s+Instructions/i,
  /##\s*Common\s+Patterns/i,
  /##\s*Best\s+Practices/i,
  /##\s*Code\s+Examples/i,
];

/**
 * Check if body has skill delegation pattern
 */
function hasSkillDelegation(body: string): boolean {
  // Look for skill reference patterns
  const patterns = [
    /Skill References/i,
    /Load On-Demand/i,
    /gateway-\w+/i,
    /\.claude\/skill-library\//i,
    /Read.*SKILL\.md/i,
    /consult the.*skill/i,
  ];

  return patterns.some(p => p.test(body));
}

/**
 * Find embedded patterns that should be in skills
 */
function findEmbeddedPatterns(body: string): Array<{ name: string; skill?: string }> {
  const found: Array<{ name: string; skill?: string }> = [];

  for (const sig of EMBEDDED_PATTERN_SIGNATURES) {
    if (sig.pattern.test(body)) {
      // Check threshold if defined
      if (sig.threshold) {
        const match = body.match(sig.pattern);
        if (match && match[0].length > sig.threshold) {
          found.push({ name: sig.name, skill: (sig as any).skill });
        }
      } else {
        found.push({ name: sig.name, skill: (sig as any).skill });
      }
    }
  }

  return found;
}

/**
 * Find potentially duplicated sections
 */
function findDuplicatedSections(body: string): string[] {
  const found: string[] = [];

  for (const pattern of DUPLICATED_SECTION_PATTERNS) {
    if (pattern.test(body)) {
      const match = body.match(pattern);
      if (match) {
        found.push(match[0]);
      }
    }
  }

  return found;
}

/**
 * Estimate complexity based on agent type
 */
function isComplexAgent(agent: AgentInfo): boolean {
  // Orchestrators and architects get higher limits
  const complexCategories = ['orchestrator', 'architecture'];
  return complexCategories.includes(agent.category);
}

/**
 * Run Phase 3 audit on an agent
 */
export function runPhase3(agent: AgentInfo): AuditPhaseResult {
  const issues: AuditIssue[] = [];
  const suggestions: FixSuggestion[] = [];

  const isComplex = isComplexAgent(agent);
  const targetLimit = isComplex ? LINE_COUNT_LIMITS.complexMax : LINE_COUNT_LIMITS.target;
  const warningLimit = isComplex ? LINE_COUNT_LIMITS.target : LINE_COUNT_LIMITS.warning;

  // Check 1: Line count
  if (agent.lineCount > LINE_COUNT_LIMITS.complexMax) {
    issues.push({
      severity: 'error',
      message: `Agent exceeds maximum line count (${agent.lineCount}/${LINE_COUNT_LIMITS.complexMax})`,
      details: 'Extract detailed patterns to skill library',
    });

    suggestions.push({
      id: 'phase3-trim',
      phase: 3,
      description: 'Extract verbose sections to skill files',
      autoFixable: false,
      currentValue: `${agent.lineCount} lines`,
      suggestedValue: `<${targetLimit} lines`,
    });
  } else if (agent.lineCount > targetLimit) {
    issues.push({
      severity: 'error',
      message: `Agent exceeds target line count (${agent.lineCount}/${targetLimit})`,
      details: isComplex
        ? 'Complex agents should be under 400 lines'
        : 'Standard agents should be under 300 lines',
    });

    suggestions.push({
      id: 'phase3-trim',
      phase: 3,
      description: 'Extract patterns to skills',
      autoFixable: false,
      currentValue: `${agent.lineCount} lines`,
      suggestedValue: `<${targetLimit} lines`,
    });
  } else if (agent.lineCount > warningLimit) {
    issues.push({
      severity: 'warning',
      message: `Agent approaching line limit (${agent.lineCount}/${targetLimit})`,
      details: 'Consider extracting some patterns to skills',
    });
  }

  // Check 2: Embedded patterns
  const embeddedPatterns = findEmbeddedPatterns(agent.body);
  if (embeddedPatterns.length > 0) {
    for (const pattern of embeddedPatterns) {
      issues.push({
        severity: 'warning',
        message: `Embedded pattern detected: ${pattern.name}`,
        details: pattern.skill
          ? `Should delegate to "${pattern.skill}" skill`
          : 'Consider extracting to a skill',
      });
    }
  }

  // Check 3: Skill delegation
  if (!hasSkillDelegation(agent.body)) {
    issues.push({
      severity: 'warning',
      message: 'No skill delegation detected',
      details: 'Agents should reference skills for detailed patterns (via gateway or direct paths)',
    });

    suggestions.push({
      id: 'phase3-delegation',
      phase: 3,
      description: 'Add skill references section',
      autoFixable: false,
      suggestedValue: '## Skill References (Load On-Demand via Gateway)\n| Task | Skill to Read |\n|------|---------------|',
    });
  }

  // Check 4: Duplicated sections
  const duplicatedSections = findDuplicatedSections(agent.body);
  if (duplicatedSections.length > 0) {
    issues.push({
      severity: 'info',
      message: `Found ${duplicatedSections.length} sections that may be duplicated across agents`,
      details: `Sections: ${duplicatedSections.join(', ')}`,
    });
  }

  // Check 5: Code block density
  const codeBlocks = agent.body.match(/```[\s\S]*?```/g) || [];
  const totalCodeLines = codeBlocks.reduce((sum, block) => {
    return sum + block.split('\n').length;
  }, 0);

  if (totalCodeLines > 100) {
    issues.push({
      severity: 'warning',
      message: `High code block density (${totalCodeLines} lines in code blocks)`,
      details: 'Consider moving code examples to skill files for progressive loading',
    });
  }

  // Check 6: Table formatting
  const fullContent = agent.rawFrontmatter + '\n---\n\n' + agent.body;
  if (hasUnformattedTables(fullContent)) {
    issues.push({
      severity: 'warning',
      message: 'Agent contains unformatted markdown tables',
      details: 'Run fix command to auto-format tables with aligned columns',
    });
    suggestions.push({
      id: 'format-tables',
      phase: PHASE_NUMBER,
      description: 'Format markdown tables to align columns',
      autoFixable: true,
    });
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
