/**
 * Phase 7: Body References Validation
 *
 * AUTO-FIXABLE: No (phantom skills require manual review)
 *
 * Checks:
 * - Each skill reference in body exists (phantom skill detection)
 * - No deprecated skill references
 */

import {
  AgentInfo,
  AuditPhaseResult,
  AuditIssue,
  FixSuggestion,
} from '../types.js';
import {
  findSkillReferencesInBody,
  findPhantomSkills,
  findDeprecatedSkillReferences,
  findBrokenSkillPaths,
  findSkillPathsInBody,
} from '../skill-checker.js';

export const PHASE_NUMBER = 7;
export const PHASE_NAME = 'Body References';
export const AUTO_FIXABLE = false;

/**
 * Run Phase 7 audit on an agent
 */
export function runPhase7(agent: AgentInfo): AuditPhaseResult {
  const issues: AuditIssue[] = [];
  const suggestions: FixSuggestion[] = [];

  // Check 1: Phantom skills (referenced but don't exist)
  const phantomSkills = findPhantomSkills(agent.body);
  for (const phantom of phantomSkills) {
    issues.push({
      severity: 'error',
      message: `Phantom skill reference: "${phantom}"`,
      details: 'This skill is referenced in the body but does not exist',
    });

    suggestions.push({
      id: `phase7-phantom-skill-${phantom}`,
      phase: 7,
      description: `Remove or fix reference to non-existent skill "${phantom}"`,
      autoFixable: false,
      currentValue: phantom,
      suggestedValue: '(remove reference or create the skill)',
    });
  }

  // Check 2: Deprecated skills
  const deprecatedRefs = findDeprecatedSkillReferences(agent.body);
  for (const { skill, replacement } of deprecatedRefs) {
    issues.push({
      severity: 'warning',
      message: `Deprecated skill reference: "${skill}"`,
      details: `This skill is deprecated. ${replacement}`,
    });

    suggestions.push({
      id: `phase7-deprecated-skill-${skill}`,
      phase: 7,
      description: `Update deprecated skill reference "${skill}"`,
      autoFixable: false,
      currentValue: skill,
      suggestedValue: replacement,
    });
  }

  // Check 3: Broken skill library paths (file paths that don't exist)
  const brokenPaths = findBrokenSkillPaths(agent.body);
  for (const { path } of brokenPaths) {
    issues.push({
      severity: 'error',
      message: `Broken skill library path: "${path}"`,
      details: 'This file path is referenced but does not exist on the filesystem',
    });

    suggestions.push({
      id: `phase7-broken-path-${path.replace(/[^a-z0-9-]/gi, '-')}`,
      phase: 7,
      description: `Fix or remove broken path "${path}"`,
      autoFixable: false,
      currentValue: path,
      suggestedValue: '(verify the correct path in .claude/skill-library/)',
    });
  }

  // Info: Show all skill library paths found
  const allPaths = findSkillPathsInBody(agent.body);
  if (allPaths.length > 0) {
    const validCount = allPaths.length - brokenPaths.length;
    issues.push({
      severity: 'info',
      message: `Found ${allPaths.length} skill library paths (${validCount} valid, ${brokenPaths.length} broken)`,
      details: `Paths: ${allPaths.join(', ')}`,
    });
  }

  // Info: Show all skill references found
  const allRefs = findSkillReferencesInBody(agent.body);
  if (allRefs.length > 0) {
    issues.push({
      severity: 'info',
      message: `Found ${allRefs.length} skill references in body`,
      details: `Skills: ${allRefs.join(', ')}`,
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
