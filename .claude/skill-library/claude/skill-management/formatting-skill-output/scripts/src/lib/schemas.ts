/**
 * JSON Schemas for skill management output.
 *
 * These schemas define the structure that Claude must output
 * so the CLI can format deterministically.
 */

import { Finding, Severity } from './table-formatter';

/**
 * Semantic finding criteria for auditing-skills.
 */
export type SemanticCriterion =
  | 'Description Quality'
  | 'Skill Categorization'
  | 'Gateway Membership'
  | 'Tool Appropriateness'
  | 'Content Density'
  | 'External Documentation';

/**
 * Semantic finding from Claude's semantic review.
 */
export interface SemanticFinding {
  severity: Severity;
  criterion: SemanticCriterion;
  issue: string;
  recommendation: string;
}

/**
 * Semantic findings JSON structure.
 */
export interface SemanticFindingsJson {
  findings: SemanticFinding[];
}

/**
 * Current agent (already uses skill).
 */
export interface CurrentAgent {
  agentName: string;
  agentDescription: string;
}

/**
 * Agent recommendation from finding-agents-for-skills.
 */
export interface AgentRecommendation {
  relevance: number; // 0-100 percentage (PRIMARY sort key)
  agentName: string;
  agentDescription: string;
  reasoning: string; // Claude's semantic explanation
  integrationAction: string; // How to add this skill
}

/**
 * Agent recommendations JSON structure.
 */
export interface AgentRecommendationsJson {
  skillName: string;
  skillPath: string;
  currentAgents: CurrentAgent[];
  recommendations: AgentRecommendation[];
}

/**
 * Validate semantic findings JSON.
 */
export function validateSemanticFindings(json: unknown): SemanticFindingsJson {
  if (typeof json !== 'object' || json === null) {
    throw new Error('Invalid JSON: expected object');
  }

  const obj = json as Record<string, unknown>;

  if (!Array.isArray(obj.findings)) {
    throw new Error('Invalid JSON: expected findings array');
  }

  const validSeverities = ['CRITICAL', 'WARNING', 'INFO'];
  const validCriteria = [
    'Description Quality',
    'Skill Categorization',
    'Gateway Membership',
    'Tool Appropriateness',
    'Content Density',
    'External Documentation',
  ];

  for (const finding of obj.findings) {
    if (typeof finding !== 'object' || finding === null) {
      throw new Error('Invalid finding: expected object');
    }

    const f = finding as Record<string, unknown>;

    if (!validSeverities.includes(f.severity as string)) {
      throw new Error(`Invalid severity: ${f.severity}`);
    }

    if (!validCriteria.includes(f.criterion as string)) {
      throw new Error(`Invalid criterion: ${f.criterion}`);
    }

    if (typeof f.issue !== 'string' || f.issue.length === 0) {
      throw new Error('Invalid issue: expected non-empty string');
    }

    if (typeof f.recommendation !== 'string' || f.recommendation.length === 0) {
      throw new Error('Invalid recommendation: expected non-empty string');
    }
  }

  return obj as unknown as SemanticFindingsJson;
}

/**
 * Convert semantic findings to generic Finding format.
 */
export function semanticFindingsToFindings(json: SemanticFindingsJson): Finding[] {
  return json.findings.map((f) => ({
    severity: f.severity,
    phase: `Semantic: ${f.criterion}`,
    issue: f.issue,
    recommendation: f.recommendation,
    source: 'semantic' as const,
  }));
}

/**
 * Convert agent recommendations to generic Finding format.
 */
export function agentRecommendationsToFindings(json: AgentRecommendationsJson): Finding[] {
  return json.recommendations.map((r) => {
    // Map relevance to severity for table formatting
    let severity: Severity;
    if (r.relevance >= 90) {
      severity = 'CRITICAL' as const;
    } else if (r.relevance >= 70) {
      severity = 'WARNING' as const;
    } else {
      severity = 'INFO' as const;
    }

    return {
      severity,
      phase: r.agentName,
      issue: r.agentDescription,
      recommendation: r.reasoning,
      source: 'agent-analysis' as const,
    };
  });
}
