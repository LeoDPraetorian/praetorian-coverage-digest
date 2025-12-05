/**
 * Phase 5: Output Standardization Validation
 *
 * AUTO-FIXABLE: No (requires template generation)
 *
 * Checks:
 * - Has "Output Format" section
 * - JSON structure present with required fields:
 *   - status: complete|blocked|needs_review
 *   - summary: string
 *   - files_modified: array
 *   - verification: object
 *   - handoff: object with recommended_agent
 */

import {
  AgentInfo,
  AuditPhaseResult,
  AuditIssue,
  FixSuggestion,
} from '../types.js';

export const PHASE_NUMBER = 5;
export const PHASE_NAME = 'Output Standardization';
export const AUTO_FIXABLE = false;

/**
 * Required fields in output JSON
 */
const REQUIRED_OUTPUT_FIELDS = [
  'status',
  'summary',
  'files_modified',
  'verification',
  'handoff',
];

/**
 * Standard output template
 */
const OUTPUT_TEMPLATE = `## Output Format (Standardized)

Return results as structured JSON:

\`\`\`json
{
  "status": "complete|blocked|needs_review",
  "summary": "1-2 sentence description of what was done",
  "files_modified": ["path/to/file1.ts", "path/to/file2.ts"],
  "verification": {
    "tests_passed": true,
    "build_success": true,
    "command_output": "relevant output snippet"
  },
  "handoff": {
    "recommended_agent": "agent-name-if-needed",
    "context": "what the next agent should know/do"
  }
}
\`\`\``;

/**
 * Extract JSON block from body
 */
function findOutputJsonBlock(body: string): string | null {
  // Look for JSON block in Output Format section
  const outputSectionMatch = body.match(/##\s*Output\s+Format[\s\S]*?```json([\s\S]*?)```/i);
  if (outputSectionMatch) {
    return outputSectionMatch[1].trim();
  }

  // Look for any JSON block with status field
  const jsonBlockMatch = body.match(/```json([\s\S]*?status[\s\S]*?)```/i);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }

  return null;
}

/**
 * Check which required fields are present in JSON
 */
function checkRequiredFields(jsonStr: string): {
  present: string[];
  missing: string[];
} {
  const present: string[] = [];
  const missing: string[] = [];

  for (const field of REQUIRED_OUTPUT_FIELDS) {
    // Check for field as a key in JSON
    const pattern = new RegExp(`["']${field}["']\\s*:`);
    if (pattern.test(jsonStr)) {
      present.push(field);
    } else {
      missing.push(field);
    }
  }

  return { present, missing };
}

/**
 * Run Phase 5 audit on an agent
 */
export function runPhase5(agent: AgentInfo): AuditPhaseResult {
  const issues: AuditIssue[] = [];
  const suggestions: FixSuggestion[] = [];

  // Check 1: Output Format section exists
  if (!agent.hasOutputFormat) {
    issues.push({
      severity: 'error',
      message: 'Missing "Output Format" section',
      details: 'Agents should define standardized JSON output for coordination',
    });

    suggestions.push({
      id: 'phase5-output',
      phase: 5,
      description: 'Add standardized Output Format section',
      autoFixable: false,
      suggestedValue: OUTPUT_TEMPLATE,
    });

    // Can't check further without the section
    return {
      phase: PHASE_NUMBER,
      name: PHASE_NAME,
      passed: false,
      autoFixable: AUTO_FIXABLE,
      issues,
      suggestions,
    };
  }

  // Check 2: JSON block structure
  const jsonBlock = findOutputJsonBlock(agent.body);
  if (!jsonBlock) {
    issues.push({
      severity: 'error',
      message: 'No JSON block found in Output Format section',
      details: 'Output format must include a JSON code block with structure',
    });

    suggestions.push({
      id: 'phase5-json-block',
      phase: 5,
      description: 'Add JSON output structure',
      autoFixable: false,
      suggestedValue: OUTPUT_TEMPLATE,
    });

    return {
      phase: PHASE_NUMBER,
      name: PHASE_NAME,
      passed: false,
      autoFixable: AUTO_FIXABLE,
      issues,
      suggestions,
    };
  }

  // Check 3: Required fields
  const { present, missing } = checkRequiredFields(jsonBlock);

  if (missing.length > 0) {
    issues.push({
      severity: 'error',
      message: `Missing required output fields: ${missing.join(', ')}`,
      details: `Present: ${present.join(', ') || 'none'}`,
    });

    suggestions.push({
      id: 'phase5-fields',
      phase: 5,
      description: 'Add missing output fields',
      autoFixable: false,
      currentValue: `Missing: ${missing.join(', ')}`,
      suggestedValue: OUTPUT_TEMPLATE,
    });
  }

  // Check 4: Status values
  if (present.includes('status')) {
    const hasStatusValues = /complete|blocked|needs_review/i.test(jsonBlock);
    if (!hasStatusValues) {
      issues.push({
        severity: 'warning',
        message: 'Status field should document valid values',
        details: 'Valid values: complete, blocked, needs_review',
      });
    }
  }

  // Check 5: Handoff structure
  if (present.includes('handoff')) {
    const hasRecommendedAgent = /recommended_agent/i.test(jsonBlock);
    const hasContext = /"context":/i.test(jsonBlock);

    if (!hasRecommendedAgent) {
      issues.push({
        severity: 'warning',
        message: 'Handoff should include "recommended_agent" field',
        details: 'Specifies which agent should continue if work is incomplete',
      });
    }

    if (!hasContext) {
      issues.push({
        severity: 'warning',
        message: 'Handoff should include "context" field',
        details: 'Provides context for the next agent',
      });
    }
  }

  // Check 6: Verification structure
  if (present.includes('verification')) {
    const hasTestsPassed = /tests_passed/i.test(jsonBlock);
    const hasBuildSuccess = /build_success/i.test(jsonBlock);

    if (!hasTestsPassed && !hasBuildSuccess) {
      issues.push({
        severity: 'info',
        message: 'Verification section could include tests_passed and build_success',
        details: 'These fields help confirm work was validated',
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
