/**
 * Phase 6: Escalation Protocol Validation
 *
 * AUTO-FIXABLE: No (requires context understanding)
 *
 * Checks:
 * - Has "Escalation Protocol" section
 * - Lists stopping conditions
 * - Recommends specific agents for handoff
 * - Not just generic "ask user"
 */

import {
  AgentInfo,
  AuditPhaseResult,
  AuditIssue,
  FixSuggestion,
} from '../types.js';

export const PHASE_NUMBER = 6;
export const PHASE_NAME = 'Escalation Protocol';
export const AUTO_FIXABLE = false;

/**
 * Escalation template
 */
const ESCALATION_TEMPLATE = `## Escalation Protocol

**Stop and escalate if**:
- [Condition 1] → Recommend \`agent-name\`
- [Condition 2] → Recommend \`agent-name\`
- Blocked by unclear requirements → Use AskUserQuestion tool
- Architecture decision needed → Recommend \`[domain]-architect\``;

/**
 * Common agents to recommend based on category
 */
const ESCALATION_RECOMMENDATIONS: Record<string, string[]> = {
  development: ['security-architect', 'go-code-reviewer', 'react-code-reviewer'],
  testing: ['backend-unit-test-engineer', 'frontend-browser-test-engineer'],
  architecture: ['go-architect', 'react-architect', 'security-architect'],
  quality: ['security-risk-assessor', 'complexity-assessor'],
  analysis: ['security-architect', 'go-architect'],
  research: ['web-research-specialist', 'code-pattern-analyzer'],
  orchestrator: ['universal-coordinator', 'hierarchical-coordinator'],
  'mcp-tools': ['praetorian-cli-expert'],
};

/**
 * Check if escalation section has specific agent recommendations
 */
function hasAgentRecommendations(body: string): boolean {
  // Look for patterns like "→ Recommend `agent-name`" or "→ `agent-name`"
  const recommendPattern = /→\s*(Recommend\s*)?\`[\w-]+\`/i;
  return recommendPattern.test(body);
}

/**
 * Check if escalation section has stopping conditions
 */
function hasStoppingConditions(body: string): boolean {
  const patterns = [
    /Stop\s+and\s+escalate\s+if/i,
    /Stop\s+if/i,
    /Escalate\s+when/i,
    /Hand\s*off\s+if/i,
    /conditions?:/i,
  ];

  return patterns.some(p => p.test(body));
}

/**
 * Check for generic escalation patterns (less useful)
 */
function hasOnlyGenericEscalation(body: string): boolean {
  const genericPatterns = [
    /ask\s+the\s+user/i,
    /consult\s+user/i,
    /check\s+with\s+user/i,
  ];

  // Has generic patterns but no specific agent recommendations
  const hasGeneric = genericPatterns.some(p => p.test(body));
  const hasSpecific = hasAgentRecommendations(body);

  return hasGeneric && !hasSpecific;
}

/**
 * Extract escalation section from body
 */
function extractEscalationSection(body: string): string | null {
  // Find escalation section
  const match = body.match(/##\s*Escalation\s+Protocol([\s\S]*?)(?=##|$)/i);
  if (match) {
    return match[1].trim();
  }
  return null;
}

/**
 * Run Phase 6 audit on an agent
 */
export function runPhase6(agent: AgentInfo): AuditPhaseResult {
  const issues: AuditIssue[] = [];
  const suggestions: FixSuggestion[] = [];

  // Check 1: Escalation Protocol section exists
  if (!agent.hasEscalationProtocol) {
    issues.push({
      severity: 'error',
      message: 'Missing "Escalation Protocol" section',
      details: 'Agents need clear boundaries and handoff recommendations',
    });

    // Suggest based on category
    const recommendedAgents = ESCALATION_RECOMMENDATIONS[agent.category] || [];

    suggestions.push({
      id: 'phase6-escalation',
      phase: 6,
      description: 'Add Escalation Protocol section',
      autoFixable: false,
      suggestedValue: ESCALATION_TEMPLATE.replace(
        /\[domain\]-architect/g,
        recommendedAgents[0] || 'relevant-architect'
      ),
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

  const escalationSection = extractEscalationSection(agent.body);

  // Check 2: Stopping conditions
  if (!hasStoppingConditions(agent.body)) {
    issues.push({
      severity: 'warning',
      message: 'No explicit stopping conditions found',
      details: 'Escalation section should list when to stop and hand off',
    });

    suggestions.push({
      id: 'phase6-conditions',
      phase: 6,
      description: 'Add stopping conditions',
      autoFixable: false,
      suggestedValue: '**Stop and escalate if**:\n- [Condition] → Recommend `agent-name`',
    });
  }

  // Check 3: Agent recommendations
  if (!hasAgentRecommendations(agent.body)) {
    issues.push({
      severity: 'error',
      message: 'No specific agent recommendations in escalation',
      details: 'Should recommend specific agents for handoff, not just "ask user"',
    });

    const recommendedAgents = ESCALATION_RECOMMENDATIONS[agent.category] || [];

    suggestions.push({
      id: 'phase6-agents',
      phase: 6,
      description: 'Add specific agent recommendations',
      autoFixable: false,
      suggestedValue: recommendedAgents.length > 0
        ? `Example: → Recommend \`${recommendedAgents[0]}\``
        : '→ Recommend `relevant-agent`',
    });
  }

  // Check 4: Only generic escalation
  if (hasOnlyGenericEscalation(agent.body)) {
    issues.push({
      severity: 'warning',
      message: 'Escalation is too generic (only "ask user" patterns)',
      details: 'Add specific agent recommendations for better coordination',
    });
  }

  // Check 5: AskUserQuestion mentioned
  if (escalationSection && !escalationSection.includes('AskUserQuestion')) {
    issues.push({
      severity: 'info',
      message: 'Consider mentioning AskUserQuestion tool for unclear requirements',
      details: 'Blocked by unclear requirements → Use AskUserQuestion tool',
    });
  }

  // Check 6: Multiple escalation paths
  if (escalationSection) {
    const arrowCount = (escalationSection.match(/→/g) || []).length;
    if (arrowCount < 2) {
      issues.push({
        severity: 'info',
        message: 'Consider adding more escalation paths',
        details: 'Multiple conditions help maintain clear boundaries',
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
