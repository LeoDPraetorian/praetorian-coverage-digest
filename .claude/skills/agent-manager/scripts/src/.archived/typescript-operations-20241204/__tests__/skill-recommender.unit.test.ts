/**
 * Skill Recommender Tests
 *
 * Tests for skill recommendation functionality.
 */

import { describe, it, expect } from 'vitest';
import {
  getSkillsByType,
  getSkillsByKeywords,
  recommendSkills,
  scoreRecommendation,
  getHighRelevanceRecommendations,
  getMediumRelevanceRecommendations,
} from '../skill-recommender.js';
import { AgentInfo } from '../types.js';

// Helper to create test agent
function createTestAgent(overrides: Partial<AgentInfo> = {}): AgentInfo {
  return {
    filePath: '.claude/agents/development/test-agent.md',
    fileName: 'test-agent.md',
    category: 'development',
    frontmatter: {
      name: 'test-agent',
      description: 'Use when testing agents.',
      type: 'development',
      tools: 'Read, Write',
      skills: '', // No existing skills
      ...overrides.frontmatter,
    },
    rawFrontmatter: 'name: test-agent',
    body: '# Test Agent\n\nBody content',
    lineCount: 10,
    bodyLineCount: 5,
    descriptionStatus: 'valid',
    hasExamples: false,
    hasUseWhenTrigger: true,
    hasGatewaySkill: false,
    hasOutputFormat: false,
    hasEscalationProtocol: false,
    hasCorrectColor: false,
    frontmatterFieldOrder: ['name', 'description'],
    hasCorrectFieldOrder: true,
    ...overrides,
  };
}

describe('getSkillsByType', () => {
  it('returns skills for development type', () => {
    const skills = getSkillsByType('development');

    expect(skills).toContain('developing-with-tdd');
    expect(skills).toContain('debugging-systematically');
    expect(skills).toContain('verifying-before-completion');
  });

  it('returns skills for testing type', () => {
    const skills = getSkillsByType('testing');

    expect(skills).toContain('developing-with-tdd');
    expect(skills).toContain('verifying-before-completion');
  });

  it('returns skills for architecture type', () => {
    const skills = getSkillsByType('architecture');

    expect(skills).toContain('writing-plans');
    expect(skills).toContain('brainstorming');
  });

  it('returns empty array for unknown type', () => {
    const skills = getSkillsByType('unknown-type' as any);

    expect(skills).toEqual([]);
  });
});

describe('getSkillsByKeywords', () => {
  // NOTE: getSkillsByKeywords expects hyphenated agent names, not sentence strings.
  // It splits by '-' and checks for keyword matches in the parts.
  // Uses actual agent names from .claude/agents/

  it('recommends gateway-frontend for frontend keyword in agent name', () => {
    const skills = getSkillsByKeywords('frontend-developer');

    expect(skills).toContain('gateway-frontend');
  });

  it('recommends gateway-backend for go keyword in agent name', () => {
    const skills = getSkillsByKeywords('go-developer');

    expect(skills).toContain('gateway-backend');
  });

  it('recommends gateway-testing for test keyword in agent name', () => {
    const skills = getSkillsByKeywords('frontend-unit-test-engineer');

    expect(skills).toContain('gateway-testing');
  });

  it('recommends gateway-security for security keyword in agent name', () => {
    const skills = getSkillsByKeywords('security-architect');

    expect(skills).toContain('gateway-security');
  });

  it('returns multiple skills for multiple keywords in agent name', () => {
    const skills = getSkillsByKeywords('frontend-unit-test-engineer');

    // 'frontend' matches gateway-frontend, 'test' matches gateway-testing
    expect(skills).toContain('gateway-frontend');
    expect(skills).toContain('gateway-testing');
  });

  it('returns empty array for no keyword matches', () => {
    const skills = getSkillsByKeywords('uiux-designer');

    expect(skills).toEqual([]);
  });

  it('is case-insensitive for agent names', () => {
    const skills = getSkillsByKeywords('FRONTEND-DEVELOPER');

    expect(skills).toContain('gateway-frontend');
  });
});

describe('scoreRecommendation', () => {
  const agent = createTestAgent();

  it('gives high score for type-based recommendations', () => {
    const score = scoreRecommendation('developing-with-tdd', agent, 'type');

    expect(score).toBeGreaterThanOrEqual(8);
  });

  it('gives medium score for keyword-based recommendations', () => {
    const score = scoreRecommendation('gateway-frontend', agent, 'body-keywords');

    expect(score).toBeGreaterThanOrEqual(6);
    expect(score).toBeLessThan(8);
  });

  it('boosts score for gateway skills', () => {
    const gatewayScore = scoreRecommendation('gateway-frontend', agent, 'body-keywords');
    const regularScore = scoreRecommendation('some-skill', agent, 'body-keywords');

    expect(gatewayScore).toBeGreaterThanOrEqual(regularScore);
  });

  it('boosts score for core skills', () => {
    const coreScore = scoreRecommendation('developing-with-tdd', agent, 'type');

    expect(coreScore).toBeGreaterThanOrEqual(9);
  });
});

describe('recommendSkills', () => {
  it('recommends type-based skills', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'dev-agent',
        description: 'Use for development',
        type: 'development',
        skills: '', // No existing skills
      },
    });

    const recs = recommendSkills(agent);
    const skillNames = recs.map((r) => r.skillName);

    expect(skillNames).toContain('developing-with-tdd');
    expect(skillNames).toContain('debugging-systematically');
  });

  it('does not recommend already-present skills', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'dev-agent',
        description: 'Use for development',
        type: 'development',
        skills: 'developing-with-tdd, debugging-systematically', // Already present
      },
    });

    const recs = recommendSkills(agent);
    const skillNames = recs.map((r) => r.skillName);

    // Should not recommend skills that are already present
    expect(skillNames).not.toContain('developing-with-tdd');
    expect(skillNames).not.toContain('debugging-systematically');
  });

  it('recommends gateway skill when none present', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'react-developer',
        description: 'Use for React development',
        type: 'development',
        skills: '', // No gateway
      },
      hasGatewaySkill: false,
    });

    const recs = recommendSkills(agent);
    const skillNames = recs.map((r) => r.skillName);

    expect(skillNames).toContain('gateway-frontend');
  });

  it('recommends gateway-backend for go agents', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'go-developer',
        description: 'Use for Go development',
        type: 'development',
        skills: '',
      },
      hasGatewaySkill: false,
    });

    const recs = recommendSkills(agent);
    const skillNames = recs.map((r) => r.skillName);

    expect(skillNames).toContain('gateway-backend');
  });

  it('sorts recommendations by relevance score', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'test-agent',
        description: 'Use for testing with react',
        type: 'development',
        skills: '',
      },
      hasGatewaySkill: false,
      body: '# Test Agent\nThis handles react frontend testing.',
    });

    const recs = recommendSkills(agent);

    // Should be sorted in descending order of relevance
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].relevanceScore).toBeGreaterThanOrEqual(
        recs[i].relevanceScore
      );
    }
  });
});

describe('getHighRelevanceRecommendations', () => {
  it('returns only high relevance (>=7) recommendations', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'dev-agent',
        description: 'Use for development',
        type: 'development',
        skills: '',
      },
      hasGatewaySkill: false,
    });

    const highRecs = getHighRelevanceRecommendations(agent);

    for (const rec of highRecs) {
      expect(rec.relevanceScore).toBeGreaterThanOrEqual(7);
    }
  });
});

describe('getMediumRelevanceRecommendations', () => {
  it('returns only medium relevance (4-6) recommendations', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'dev-agent',
        description: 'Use for development',
        type: 'development',
        skills: '',
      },
      hasGatewaySkill: false,
      body: '# Dev Agent\nThis handles frontend and testing.',
    });

    const mediumRecs = getMediumRelevanceRecommendations(agent);

    for (const rec of mediumRecs) {
      expect(rec.relevanceScore).toBeGreaterThanOrEqual(4);
      expect(rec.relevanceScore).toBeLessThan(7);
    }
  });
});
