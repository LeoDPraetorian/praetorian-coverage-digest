/**
 * Skill Recommender
 *
 * Suggests relevant skills based on agent type, tools, and body keywords.
 */

import {
  AgentInfo,
  AgentCategory,
  SkillRecommendation,
  SKILLS_BY_TYPE,
  SKILLS_BY_KEYWORD,
  GatewayRecommendation,
  TYPE_TO_PRIMARY_GATEWAY,
  TYPE_TO_SECONDARY_GATEWAYS,
  KEYWORD_TO_GATEWAY_MAP,
} from './types.js';

/**
 * Get skills recommended by agent type
 *
 * @param type - Agent category/type
 * @returns Array of recommended skill names
 */
export function getSkillsByType(type: AgentCategory): string[] {
  return SKILLS_BY_TYPE[type] || [];
}

/**
 * Get skills recommended by keywords in agent NAME only
 *
 * NOTE: We only search the agent NAME, not body, for gateway recommendations.
 * Body searching produces too many false positives:
 * - "backend" in "Recommend backend-unit-test-engineer" → false match
 * - "integration" in "CI/CD integration" → false match
 * - "security" in "security-focused platform" → false match
 *
 * @param agentName - Agent name to search for keywords
 * @returns Array of recommended skill names (deduplicated)
 */
export function getSkillsByKeywords(agentName: string): string[] {
  const skills: Set<string> = new Set();
  const lowerName = agentName.toLowerCase();

  for (const [keyword, skillList] of Object.entries(SKILLS_BY_KEYWORD)) {
    // Only match keywords that appear as distinct parts of the agent name
    // e.g., "frontend-unit-test-engineer" contains "frontend"
    const nameParts = lowerName.split('-');
    if (nameParts.includes(keyword.toLowerCase())) {
      for (const skill of skillList) {
        skills.add(skill);
      }
    }
  }

  return [...skills];
}

/**
 * Parse existing skills from frontmatter
 *
 * @param skills - Skills string from frontmatter
 * @returns Array of skill names
 */
function parseExistingSkills(skills: string | undefined): string[] {
  if (!skills) {
    return [];
  }
  return skills
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

/**
 * Calculate relevance score for a skill recommendation
 *
 * @param skill - Skill name
 * @param agent - Agent info
 * @param source - How the skill was identified
 * @returns Score from 1-10
 */
export function scoreRecommendation(
  skill: string,
  agent: AgentInfo,
  source: SkillRecommendation['source']
): number {
  let score = 5; // Base score

  // Type-based recommendations are highly relevant
  if (source === 'type') {
    score = 8;
  }

  // Category-based recommendations
  if (source === 'category') {
    score = 7;
  }

  // Keyword matches
  if (source === 'body-keywords') {
    score = 6;
  }

  // Tool-based is less reliable
  if (source === 'tools') {
    score = 5;
  }

  // Boost score for gateway skills (always useful)
  if (skill.startsWith('gateway-')) {
    score = Math.min(10, score + 1);
  }

  // Boost for core development skills
  const coreSkills = [
    'developing-with-tdd',
    'debugging-systematically',
    'verifying-before-completion',
  ];
  if (coreSkills.includes(skill)) {
    score = Math.min(10, score + 1);
  }

  return score;
}

/**
 * Generate skill recommendations for an agent
 *
 * @param agent - Agent info to analyze
 * @returns Array of skill recommendations sorted by relevance
 */
export function recommendSkills(agent: AgentInfo): SkillRecommendation[] {
  const recommendations: Map<string, SkillRecommendation> = new Map();
  const existingSkills = parseExistingSkills(agent.frontmatter.skills);
  const agentType = agent.frontmatter.type || agent.category;

  // 1. Get type-based recommendations
  const typeSkills = getSkillsByType(agentType);
  for (const skill of typeSkills) {
    if (!existingSkills.includes(skill.toLowerCase())) {
      const score = scoreRecommendation(skill, agent, 'type');
      recommendations.set(skill, {
        skillName: skill,
        relevanceScore: score,
        reason: `Recommended for ${agentType} agents`,
        source: 'type',
      });
    }
  }

  // 2. Get keyword-based recommendations from agent NAME only
  // NOTE: We no longer search body - too many false positives (see getSkillsByKeywords docs)
  const keywordSkills = getSkillsByKeywords(agent.frontmatter.name);
  for (const skill of keywordSkills) {
    if (!existingSkills.includes(skill.toLowerCase())) {
      // Don't override higher-scoring type recommendation
      const existing = recommendations.get(skill);
      if (!existing || existing.relevanceScore < 6) {
        const score = scoreRecommendation(skill, agent, 'body-keywords');
        recommendations.set(skill, {
          skillName: skill,
          relevanceScore: score,
          reason: `Keyword match in agent name`,
          source: 'body-keywords',
        });
      }
    }
  }

  // 3. Gateway skill based on category if none present
  if (!agent.hasGatewaySkill) {
    const gatewayMap: Partial<Record<AgentCategory, string>> = {
      development: 'gateway-frontend', // or gateway-backend based on name
      architecture: 'gateway-backend', // Architecture focuses on system design
      testing: 'gateway-testing',
      quality: 'gateway-testing', // Reviewers need testing patterns
      analysis: 'gateway-security',
      research: 'gateway-backend', // Research may need API patterns
      orchestrator: 'gateway-mcp-tools', // Orchestrators often use MCP tools
      'mcp-tools': 'gateway-mcp-tools',
    };

    // Refine gateway selection based on name
    let gateway = gatewayMap[agentType];
    if (agentType === 'development' || agentType === 'architecture') {
      const name = agent.frontmatter.name.toLowerCase();
      if (
        name.includes('go') ||
        name.includes('backend') ||
        name.includes('api')
      ) {
        gateway = 'gateway-backend';
      } else if (
        name.includes('react') ||
        name.includes('frontend') ||
        name.includes('ui')
      ) {
        gateway = 'gateway-frontend';
      }
    }

    if (gateway && !existingSkills.includes(gateway.toLowerCase())) {
      recommendations.set(gateway, {
        skillName: gateway,
        relevanceScore: 9,
        reason: `Gateway skill for ${agentType} type`,
        source: 'category',
      });
    }
  }

  // Sort by relevance score (descending)
  const sorted = [...recommendations.values()].sort(
    (a, b) => b.relevanceScore - a.relevanceScore
  );

  return sorted;
}

/**
 * Get high-relevance recommendations (score >= 7)
 */
export function getHighRelevanceRecommendations(
  agent: AgentInfo
): SkillRecommendation[] {
  return recommendSkills(agent).filter((r) => r.relevanceScore >= 7);
}

/**
 * Get medium-relevance recommendations (score 4-6)
 */
export function getMediumRelevanceRecommendations(
  agent: AgentInfo
): SkillRecommendation[] {
  return recommendSkills(agent).filter(
    (r) => r.relevanceScore >= 4 && r.relevanceScore < 7
  );
}

// =============================================================================
// Gateway Recommendation (Multi-Gateway Support)
// =============================================================================

/**
 * Patterns that should NOT trigger gateway recommendations
 * These are compound words or agent name references that contain domain keywords
 * but don't indicate the agent needs that domain's gateway
 */
const EXCLUDE_KEYWORD_PATTERNS = [
  // Agent name references in escalation sections (e.g., "Recommend backend-unit-test-engineer")
  /\b[a-z]+-(?:unit|browser|integration)-test-engineer\b/i,
  /\b[a-z]+-developer\b/i,
  /\b[a-z]+-architect\b/i,
  /\b[a-z]+-reviewer\b/i,
  // Compound technical terms
  /ci\/cd\s+integration/i,
  /test\s+integration/i,
  /continuous\s+integration/i,
  /vite\s+integration/i,
  // Security as modifier (not domain)
  /security[- ]focused/i,
  /security[- ]platform/i,
  /security[- ]considerations/i,
];

/**
 * Extract keywords from agent name ONLY for gateway matching
 *
 * IMPORTANT: We only extract from the agent NAME, not body.
 * Body keyword matching produces too many false positives because:
 * - Escalation sections mention other agents ("Recommend backend-unit-test-engineer")
 * - Technical descriptions use domain words in compound terms ("CI/CD integration")
 * - General text mentions domains without implying the agent needs that gateway
 *
 * The agent name is the primary signal for which domain gateway is needed:
 * - frontend-unit-test-engineer → needs gateway-frontend
 * - go-developer → needs gateway-backend
 * - security-architect → needs gateway-security
 */
export function extractKeywords(agent: AgentInfo): string[] {
  const keywords: Set<string> = new Set();

  // Extract ONLY from agent name - this is the reliable signal
  const nameParts = agent.frontmatter.name.toLowerCase().split('-');
  for (const part of nameParts) {
    // Only add meaningful domain keywords, not generic words
    if (part.length > 2 && !['the', 'and', 'for', 'test', 'unit', 'browser', 'engineer'].includes(part)) {
      keywords.add(part);
    }
  }

  // We intentionally do NOT extract from body to avoid false positives
  // Body keywords should be handled by skill references in the body, not gateway auto-recommendation

  return [...keywords];
}

/**
 * Get primary gateway for agent type
 */
export function getPrimaryGatewayForType(type: AgentCategory): string {
  return TYPE_TO_PRIMARY_GATEWAY[type] || 'gateway-frontend';
}

/**
 * Recommend multiple gateways for an agent (primary + secondary)
 *
 * Algorithm:
 * 1. Determine primary gateway by type
 * 2. Refine primary gateway based on agent name (e.g., "go" → gateway-backend)
 * 3. Add secondary gateways from TYPE_TO_SECONDARY_GATEWAYS
 * 4. Add keyword-based gateways from agent name/body
 * 5. Deduplicate and sort by relevance
 *
 * @param agent - Agent info to analyze
 * @returns Array of gateway recommendations sorted by relevance
 */
export function recommendGateways(agent: AgentInfo): GatewayRecommendation[] {
  const recommendations: Map<string, GatewayRecommendation> = new Map();
  const agentType = agent.frontmatter.type || agent.category;

  // 1. Primary gateway by type
  let primaryGateway = getPrimaryGatewayForType(agentType);

  // 2. Refine primary gateway based on name
  if (agentType === 'development' || agentType === 'architecture') {
    const name = agent.frontmatter.name.toLowerCase();
    if (
      name.includes('go') ||
      name.includes('backend') ||
      name.includes('api')
    ) {
      primaryGateway = 'gateway-backend';
    } else if (
      name.includes('react') ||
      name.includes('frontend') ||
      name.includes('ui')
    ) {
      primaryGateway = 'gateway-frontend';
    }
  }

  recommendations.set(primaryGateway, {
    gateway: primaryGateway,
    isPrimary: true,
    reason: `Required for ${agentType} agents`,
    relevanceScore: 10,
  });

  // 3. Secondary gateways by type
  const secondaryGateways = TYPE_TO_SECONDARY_GATEWAYS[agentType] || [];
  for (const gateway of secondaryGateways) {
    if (gateway !== primaryGateway) {
      recommendations.set(gateway, {
        gateway,
        isPrimary: false,
        reason: `Common for ${agentType} agents`,
        relevanceScore: 7,
      });
    }
  }

  // 4. Keyword-based gateways
  const keywords = extractKeywords(agent);
  for (const [keyword, gateway] of KEYWORD_TO_GATEWAY_MAP) {
    if (keywords.includes(keyword) && gateway !== primaryGateway) {
      // Only add if not already present or if we can upgrade the reason
      const existing = recommendations.get(gateway);
      if (!existing || existing.relevanceScore < 7) {
        recommendations.set(gateway, {
          gateway,
          isPrimary: false,
          reason: `Keyword "${keyword}" found in agent`,
          relevanceScore: 7,
        });
      }
    }
  }

  // Sort by relevance score (descending)
  const sorted = [...recommendations.values()].sort(
    (a, b) => b.relevanceScore - a.relevanceScore
  );

  return sorted;
}

/**
 * Get all recommended gateways (primary + secondary)
 */
export function getAllRecommendedGateways(agent: AgentInfo): string[] {
  return recommendGateways(agent).map((r) => r.gateway);
}

/**
 * Get primary gateway recommendation only
 */
export function getPrimaryGateway(agent: AgentInfo): string {
  const recommendations = recommendGateways(agent);
  const primary = recommendations.find((r) => r.isPrimary);
  return primary?.gateway || 'gateway-frontend';
}

/**
 * Get secondary gateway recommendations only
 */
export function getSecondaryGateways(agent: AgentInfo): string[] {
  return recommendGateways(agent)
    .filter((r) => !r.isPrimary)
    .map((r) => r.gateway);
}
