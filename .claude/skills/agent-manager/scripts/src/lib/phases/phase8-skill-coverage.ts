/**
 * Phase 8: Skill Coverage Validation
 *
 * AUTO-FIXABLE: Yes (can auto-add high-relevance skills)
 *
 * Checks:
 * - Mandatory gateway skills (score 9, source 'category') → ERROR (blocks audit)
 * - Recommended skills (score 7-8, other sources) → WARNING
 * - Optional skills (score 4-6) → INFO
 *
 * Gateway skills are determined by agent type:
 * - quality → gateway-testing
 * - development → gateway-frontend or gateway-backend (based on name)
 * - testing → gateway-testing
 * - architecture → gateway-backend
 * - analysis → gateway-security
 * - orchestrator → gateway-mcp-tools
 */

import {
  AgentInfo,
  AuditPhaseResult,
  AuditIssue,
  FixSuggestion,
} from '../types.js';
import {
  recommendSkills,
  getHighRelevanceRecommendations,
  getMediumRelevanceRecommendations,
} from '../skill-recommender.js';

export const PHASE_NUMBER = 8;
export const PHASE_NAME = 'Skill Coverage';
export const AUTO_FIXABLE = true;

/**
 * Run Phase 8 audit on an agent
 */
export function runPhase8(agent: AgentInfo): AuditPhaseResult {
  const issues: AuditIssue[] = [];
  const suggestions: FixSuggestion[] = [];

  // Get all recommendations
  const highRecs = getHighRelevanceRecommendations(agent);
  const mediumRecs = getMediumRelevanceRecommendations(agent);

  // Check 1: High relevance skills missing
  // Mandatory gateway (score 9, source 'category') → ERROR
  // Recommended skills (score 7-8, other sources) → WARNING
  let hasMandatoryGatewayMissing = false;
  for (const rec of highRecs) {
    // Check if this is the mandatory gateway for this agent type
    const isMandatoryGateway = rec.relevanceScore === 9 && rec.source === 'category';

    issues.push({
      severity: isMandatoryGateway ? 'error' : 'warning',
      message: isMandatoryGateway
        ? `Missing mandatory gateway skill: "${rec.skillName}" (required for ${agent.frontmatter.type || agent.category} agents)`
        : `Missing high-relevance skill: "${rec.skillName}" (score: ${rec.relevanceScore}/10)`,
      details: rec.reason,
    });

    if (isMandatoryGateway) {
      hasMandatoryGatewayMissing = true;
    }

    // Current skills or empty
    const currentSkills = agent.frontmatter.skills || '';
    const newSkills = currentSkills
      ? `${currentSkills}, ${rec.skillName}`
      : rec.skillName;

    suggestions.push({
      id: `phase8-add-skill-${rec.skillName}`,
      phase: 8,
      description: isMandatoryGateway
        ? `Add mandatory gateway skill "${rec.skillName}"`
        : `Add recommended skill "${rec.skillName}"`,
      autoFixable: true,
      currentValue: currentSkills || '(empty)',
      suggestedValue: newSkills,
    });
  }

  // Check 2: Medium relevance skills missing (INFO)
  for (const rec of mediumRecs) {
    issues.push({
      severity: 'info',
      message: `Consider skill: "${rec.skillName}" (score: ${rec.relevanceScore}/10)`,
      details: rec.reason,
    });

    // Don't auto-fix medium relevance, just suggest
    suggestions.push({
      id: `phase8-suggest-skill-${rec.skillName}`,
      phase: 8,
      description: `Consider adding skill "${rec.skillName}"`,
      autoFixable: false, // Manual decision for medium relevance
      currentValue: agent.frontmatter.skills || '(empty)',
      suggestedValue: rec.skillName,
    });
  }

  // Summary info
  const allRecs = recommendSkills(agent);
  if (allRecs.length === 0) {
    issues.push({
      severity: 'info',
      message: 'Agent has good skill coverage',
      details: 'No additional skills recommended',
    });
  } else {
    issues.push({
      severity: 'info',
      message: `${allRecs.length} skill recommendations available`,
      details: `High: ${highRecs.length}, Medium: ${mediumRecs.length}`,
    });
  }

  // Fail if mandatory gateway skill is missing
  return {
    phase: PHASE_NUMBER,
    name: PHASE_NAME,
    passed: !hasMandatoryGatewayMissing, // Fail if mandatory gateway missing
    autoFixable: AUTO_FIXABLE,
    issues,
    suggestions,
  };
}
