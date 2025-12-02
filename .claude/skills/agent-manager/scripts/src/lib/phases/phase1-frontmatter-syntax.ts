/**
 * Phase 1: Frontmatter Syntax Validation
 *
 * AUTO-FIXABLE: Yes
 *
 * Checks:
 * 1-6: Existing checks (block scalar, name, required fields, type, kebab-case, length)
 * 7: Color field present
 * 8: Color matches type
 * 9: PermissionMode matches type
 * 10: Frontmatter field ordering
 * 11: Tools field alphabetically sorted
 * 12: Skills field alphabetically sorted
 */

import * as path from 'path';
import {
  AgentInfo,
  AuditPhaseResult,
  AuditIssue,
  FixSuggestion,
  AGENT_CATEGORIES,
  AGENT_COLORS,
  COLOR_BY_TYPE,
  PERMISSION_MODE_BY_TYPE,
  FRONTMATTER_FIELD_ORDER,
} from '../types.js';
import { convertToSingleLine } from '../agent-parser.js';

export const PHASE_NUMBER = 1;
export const PHASE_NAME = 'Frontmatter Syntax';
export const AUTO_FIXABLE = true;

/**
 * Check if a comma-separated list is alphabetically sorted (case-insensitive)
 */
export function isAlphabeticallySorted(commaSeparatedList: string | undefined | null): boolean {
  if (!commaSeparatedList || typeof commaSeparatedList !== 'string' || commaSeparatedList.trim() === '') {
    return true;
  }

  const items = commaSeparatedList.split(',').map((s) => s.trim().toLowerCase());
  const sorted = [...items].sort();

  return items.every((item, i) => item === sorted[i]);
}

/**
 * Sort a comma-separated list alphabetically (preserving original casing)
 */
export function sortAlphabetically(commaSeparatedList: string | undefined | null): string {
  if (!commaSeparatedList || typeof commaSeparatedList !== 'string' || commaSeparatedList.trim() === '') {
    return commaSeparatedList || '';
  }

  const items = commaSeparatedList
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0); // Filter out empty items from "A, , B" or trailing commas
  return items.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).join(', ');
}

/**
 * Reorder frontmatter fields to canonical order
 *
 * This function handles:
 * - Single-line field values (fieldName: value)
 * - Block scalars (| and >)
 * - Multi-line values with indentation
 *
 * Limitation: Values containing patterns like `fieldName:` at start of line
 * may be incorrectly parsed as new fields. For complex YAML, manual editing
 * is recommended.
 */
export function reorderFrontmatter(rawYaml: string): string {
  const lines = rawYaml.split('\n');
  const fields: Map<string, string[]> = new Map();
  let currentField: string | null = null;
  let currentLines: string[] = [];
  let inBlockScalar = false;
  let blockIndent = 0;

  // Parse fields and their content
  for (const line of lines) {
    // Check if this is a new top-level field (not indented, contains colon)
    const fieldMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);

    // If we're in a block scalar, check if we should exit
    if (inBlockScalar) {
      // Block scalar continues while line is indented more than block indent
      // or is empty
      const lineIndent = line.match(/^(\s*)/)?.[1].length ?? 0;
      const isIndented = lineIndent > blockIndent && line.trim() !== '';
      const isEmpty = line.trim() === '';

      if (isIndented || isEmpty) {
        currentLines.push(line);
        continue;
      } else {
        // Exit block scalar
        inBlockScalar = false;
      }
    }

    if (fieldMatch && !line.startsWith(' ')) {
      // Save previous field
      if (currentField) {
        fields.set(currentField, currentLines);
      }
      currentField = fieldMatch[1];
      currentLines = [line];

      // Check if this field starts a block scalar
      const blockMatch = line.match(/:\s*[|>][-+]?\s*$/);
      if (blockMatch) {
        inBlockScalar = true;
        blockIndent = 0; // Will be determined by first content line
      }
    } else if (currentField) {
      // Continuation of current field
      currentLines.push(line);

      // Update block indent from first non-empty content line
      if (inBlockScalar && blockIndent === 0 && line.trim() !== '') {
        blockIndent = (line.match(/^(\s*)/)?.[1].length ?? 0) - 1;
      }
    }
  }

  // Save last field
  if (currentField) {
    fields.set(currentField, currentLines);
  }

  // Rebuild in canonical order
  const result: string[] = [];
  const canonicalOrder = FRONTMATTER_FIELD_ORDER as readonly string[];

  // Add fields in canonical order
  for (const field of canonicalOrder) {
    if (fields.has(field)) {
      result.push(...fields.get(field)!);
      fields.delete(field);
    }
  }

  // Add any remaining fields (not in canonical order) at the end
  for (const [, fieldLines] of fields) {
    result.push(...fieldLines);
  }

  return result.join('\n');
}

/**
 * Run Phase 1 audit on an agent
 */
export function runPhase1(agent: AgentInfo): AuditPhaseResult {
  const issues: AuditIssue[] = [];
  const suggestions: FixSuggestion[] = [];

  // Check 1: Block scalar detection (CRITICAL)
  if (agent.descriptionStatus === 'block-scalar-pipe') {
    issues.push({
      severity: 'error',
      message: 'Description uses pipe block scalar (|) - breaks Claude Code discovery',
      details: 'Claude Code parser returns literal "|" instead of description content',
    });

    suggestions.push({
      id: 'phase1-description',
      phase: 1,
      description: 'Convert block scalar to single-line with \\n escapes',
      autoFixable: true,
      currentValue: agent.frontmatter.description.substring(0, 100) + '...',
      suggestedValue: convertToSingleLine(agent.frontmatter.description).substring(0, 100) + '...',
    });
  }

  if (agent.descriptionStatus === 'block-scalar-folded') {
    issues.push({
      severity: 'error',
      message: 'Description uses folded block scalar (>) - breaks Claude Code discovery',
      details: 'Claude Code parser returns literal ">" instead of description content',
    });

    suggestions.push({
      id: 'phase1-description',
      phase: 1,
      description: 'Convert block scalar to single-line with \\n escapes',
      autoFixable: true,
      currentValue: agent.frontmatter.description.substring(0, 100) + '...',
      suggestedValue: convertToSingleLine(agent.frontmatter.description).substring(0, 100) + '...',
    });
  }

  if (agent.descriptionStatus === 'missing') {
    issues.push({
      severity: 'error',
      message: 'Missing description field',
      details: 'Description is required for agent discovery',
    });
  }

  if (agent.descriptionStatus === 'empty') {
    issues.push({
      severity: 'error',
      message: 'Empty description field',
      details: 'Description cannot be empty',
    });
  }

  // Check 2: Name matches filename
  const expectedName = path.basename(agent.filePath, '.md');
  if (agent.frontmatter.name !== expectedName) {
    issues.push({
      severity: 'error',
      message: `Name field "${agent.frontmatter.name}" does not match filename "${expectedName}"`,
      details: 'Name must match filename for consistent discovery',
    });

    suggestions.push({
      id: 'phase1-name',
      phase: 1,
      description: 'Update name field to match filename',
      autoFixable: true,
      currentValue: agent.frontmatter.name,
      suggestedValue: expectedName,
    });
  }

  // Check 3: Required fields
  if (!agent.frontmatter.name) {
    issues.push({
      severity: 'error',
      message: 'Missing required field: name',
    });
  }

  if (!agent.frontmatter.tools) {
    issues.push({
      severity: 'warning',
      message: 'Missing tools field',
      details: 'Tools field specifies which tools the agent can use',
    });
  }

  // Check 4: Type is valid category
  if (agent.frontmatter.type) {
    const validCategories = [...AGENT_CATEGORIES];
    if (!validCategories.includes(agent.frontmatter.type)) {
      issues.push({
        severity: 'warning',
        message: `Invalid type "${agent.frontmatter.type}"`,
        details: `Valid types: ${validCategories.join(', ')}`,
      });
    }
  }

  // Check 5: Name format (kebab-case)
  if (agent.frontmatter.name && !/^[a-z0-9-]+$/.test(agent.frontmatter.name)) {
    issues.push({
      severity: 'error',
      message: 'Name must be kebab-case (lowercase letters, numbers, hyphens only)',
      details: `Current: "${agent.frontmatter.name}"`,
    });
  }

  // Check 6: Name length
  if (agent.frontmatter.name && agent.frontmatter.name.length > 64) {
    issues.push({
      severity: 'error',
      message: `Name exceeds 64 characters (${agent.frontmatter.name.length})`,
    });
  }

  // Check 7: Color field present
  if (!agent.frontmatter.color) {
    const expectedColor = agent.frontmatter.type ? COLOR_BY_TYPE[agent.frontmatter.type] : undefined;
    issues.push({
      severity: 'warning',
      message: 'Missing color field',
      details: expectedColor
        ? `Expected color for type "${agent.frontmatter.type}": ${expectedColor}`
        : 'Add color field for visual consistency',
    });

    if (expectedColor) {
      suggestions.push({
        id: 'phase1-color-missing',
        phase: 1,
        description: `Add color field with value "${expectedColor}"`,
        autoFixable: true,
        currentValue: '(missing)',
        suggestedValue: expectedColor,
      });
    }
  }

  // Check 7b: Color value is valid (one of AGENT_COLORS)
  if (agent.frontmatter.color) {
    const validColors = AGENT_COLORS as readonly string[];
    if (!validColors.includes(agent.frontmatter.color)) {
      const expectedColor = agent.frontmatter.type
        ? COLOR_BY_TYPE[agent.frontmatter.type]
        : 'green';
      issues.push({
        severity: 'error',
        message: `Invalid color "${agent.frontmatter.color}"`,
        details: `Valid colors: ${AGENT_COLORS.join(', ')}`,
      });

      suggestions.push({
        id: 'phase1-color-invalid',
        phase: 1,
        description: `Change invalid color "${agent.frontmatter.color}" to "${expectedColor}"`,
        autoFixable: true,
        currentValue: agent.frontmatter.color,
        suggestedValue: expectedColor,
      });
    }
  }

  // Check 8: Color matches type
  if (agent.frontmatter.color && agent.frontmatter.type) {
    const validColors = AGENT_COLORS as readonly string[];
    // Only check mismatch if color is valid
    if (validColors.includes(agent.frontmatter.color)) {
      const expectedColor = COLOR_BY_TYPE[agent.frontmatter.type];
      if (agent.frontmatter.color !== expectedColor) {
        issues.push({
          severity: 'error',
          message: `Color "${agent.frontmatter.color}" does not match expected color for type "${agent.frontmatter.type}"`,
          details: `Expected: ${expectedColor}`,
        });

        suggestions.push({
          id: 'phase1-color-mismatch',
          phase: 1,
          description: `Change color to "${expectedColor}" for type "${agent.frontmatter.type}"`,
          autoFixable: true,
          currentValue: agent.frontmatter.color,
          suggestedValue: expectedColor,
        });
      }
    }
  }

  // Check 9: PermissionMode matches type
  if (agent.frontmatter.type) {
    const expectedMode = PERMISSION_MODE_BY_TYPE[agent.frontmatter.type];
    if (agent.frontmatter.permissionMode && agent.frontmatter.permissionMode !== expectedMode) {
      issues.push({
        severity: 'warning',
        message: `PermissionMode "${agent.frontmatter.permissionMode}" differs from expected for type "${agent.frontmatter.type}"`,
        details: `Expected: ${expectedMode} (may be intentional)`,
      });

      suggestions.push({
        id: 'phase1-permission-mode',
        phase: 1,
        description: `Consider changing permissionMode to "${expectedMode}"`,
        autoFixable: true,
        currentValue: agent.frontmatter.permissionMode,
        suggestedValue: expectedMode,
      });
    } else if (!agent.frontmatter.permissionMode) {
      issues.push({
        severity: 'info',
        message: `Missing permissionMode field`,
        details: `Recommended for type "${agent.frontmatter.type}": ${expectedMode}`,
      });

      suggestions.push({
        id: 'phase1-permission-mode',
        phase: 1,
        description: `Add permissionMode field with value "${expectedMode}"`,
        autoFixable: true,
        currentValue: '(missing)',
        suggestedValue: expectedMode,
      });
    }
  }

  // Check 10: Frontmatter field ordering
  if (!agent.hasCorrectFieldOrder) {
    issues.push({
      severity: 'info',
      message: 'Frontmatter fields not in canonical order',
      details: `Current: ${agent.frontmatterFieldOrder.join(', ')}. Expected: ${FRONTMATTER_FIELD_ORDER.join(', ')}`,
    });

    suggestions.push({
      id: 'phase1-ordering',
      phase: 1,
      description: 'Reorder frontmatter fields to canonical order',
      autoFixable: true,
      currentValue: agent.frontmatterFieldOrder.join(', '),
      suggestedValue: FRONTMATTER_FIELD_ORDER.join(', '),
    });
  }

  // Check 11: Tools field alphabetically sorted
  if (agent.frontmatter.tools && !isAlphabeticallySorted(agent.frontmatter.tools)) {
    const sorted = sortAlphabetically(agent.frontmatter.tools);
    issues.push({
      severity: 'info',
      message: 'Tools field not alphabetically sorted',
      details: `Current: ${agent.frontmatter.tools}`,
    });

    suggestions.push({
      id: 'phase1-tools-sort',
      phase: 1,
      description: 'Sort tools field alphabetically',
      autoFixable: true,
      currentValue: agent.frontmatter.tools,
      suggestedValue: sorted,
    });
  }

  // Check 12: Skills field alphabetically sorted
  if (agent.frontmatter.skills && !isAlphabeticallySorted(agent.frontmatter.skills)) {
    const sorted = sortAlphabetically(agent.frontmatter.skills);
    issues.push({
      severity: 'info',
      message: 'Skills field not alphabetically sorted',
      details: `Current: ${agent.frontmatter.skills}`,
    });

    suggestions.push({
      id: 'phase1-skills-sort',
      phase: 1,
      description: 'Sort skills field alphabetically',
      autoFixable: true,
      currentValue: agent.frontmatter.skills,
      suggestedValue: sorted,
    });
  }

  return {
    phase: PHASE_NUMBER,
    name: PHASE_NAME,
    passed: issues.filter((i) => i.severity === 'error').length === 0,
    autoFixable: AUTO_FIXABLE,
    issues,
    suggestions,
  };
}
