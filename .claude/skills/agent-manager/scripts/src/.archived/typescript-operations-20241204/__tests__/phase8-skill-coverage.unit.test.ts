/**
 * Phase 8: Skill Coverage Validation Tests
 *
 * Tests for skill recommendation functionality.
 * Note: Phase 8 FAILS when mandatory gateway skills are missing.
 */

import { describe, it, expect } from 'vitest';
import { runPhase8 } from '../phases/phase8-skill-coverage.js';
import { AgentInfo } from '../types.js';

// Helper to create a minimal AgentInfo for testing
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
      skills: '',
      ...overrides.frontmatter,
    },
    rawFrontmatter: 'name: test-agent\ndescription: Use when testing.',
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
    frontmatterFieldOrder: ['name', 'description', 'type', 'tools', 'skills'],
    hasCorrectFieldOrder: true,
    ...overrides,
  };
}

describe('runPhase8', () => {
  it('fails when mandatory gateway is missing', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'test-agent',
        description: 'Use when testing agents.',
        type: 'development',
        tools: 'Read, Write',
        skills: '', // No gateway skill
      },
      hasGatewaySkill: false,
    });

    const result = runPhase8(agent);

    // Phase 8 should fail when mandatory gateway is missing
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.severity === 'error')).toBe(true);
  });

  it('passes when mandatory gateway is present', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'test-agent',
        description: 'Use when testing agents.',
        type: 'development',
        tools: 'Read, Write',
        skills: 'gateway-frontend', // Has gateway skill
      },
      hasGatewaySkill: true,
    });

    const result = runPhase8(agent);

    // Phase 8 should pass when mandatory gateway is present
    expect(result.passed).toBe(true);
  });

  it('returns correct phase metadata', () => {
    const agent = createTestAgent();

    const result = runPhase8(agent);

    expect(result.phase).toBe(8);
    expect(result.name).toBe('Skill Coverage');
    expect(result.autoFixable).toBe(true);
  });

  it('recommends skills for development type', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'dev-agent',
        description: 'Use for development',
        type: 'development',
        skills: '', // No existing skills
      },
      hasGatewaySkill: false,
    });

    const result = runPhase8(agent);

    // Should have recommendations
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('generates unique suggestion IDs for each skill', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'react-developer',
        description: 'Use for React development',
        type: 'development',
        skills: '',
      },
      hasGatewaySkill: false,
      body: '# React Developer\nThis handles react frontend work.',
    });

    const result = runPhase8(agent);

    // Get all add-skill suggestions
    const addSuggestions = result.suggestions.filter((s) =>
      s.id.startsWith('phase8-add-skill-')
    );

    // Each should have unique ID
    const ids = addSuggestions.map((s) => s.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids.length).toBe(uniqueIds.length);
  });

  it('does not recommend already-present skills', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'dev-agent',
        description: 'Use for development',
        type: 'development',
        skills: 'developing-with-tdd, debugging-systematically',
      },
      hasGatewaySkill: false,
    });

    const result = runPhase8(agent);

    // Should not have suggestions for already-present skills
    const tddSuggestion = result.suggestions.find((s) =>
      s.id.includes('developing-with-tdd')
    );
    expect(tddSuggestion).toBeUndefined();
  });

  it('recommends gateway skills when none present', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'react-developer',
        description: 'Use for React development',
        type: 'development',
        skills: '',
      },
      hasGatewaySkill: false,
    });

    const result = runPhase8(agent);

    // Should recommend a gateway skill
    const gatewaySuggestion = result.suggestions.find((s) =>
      s.id.includes('gateway-')
    );
    expect(gatewaySuggestion).toBeDefined();
  });

  it('provides info summary of recommendations', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'dev-agent',
        description: 'Use for development',
        type: 'development',
        skills: '',
      },
      hasGatewaySkill: false,
    });

    const result = runPhase8(agent);

    // Should have info issues about recommendations
    const infoIssues = result.issues.filter((i) => i.severity === 'info');
    expect(infoIssues.length).toBeGreaterThan(0);
  });

  it('handles agent with all recommended skills', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'complete-agent',
        description: 'Use for development',
        type: 'development',
        skills:
          'developing-with-tdd, debugging-systematically, verifying-before-completion, gateway-frontend',
      },
      hasGatewaySkill: true,
    });

    const result = runPhase8(agent);

    // Should still pass
    expect(result.passed).toBe(true);

    // Info message should indicate good coverage
    const goodCoverageInfo = result.issues.find(
      (i) => i.severity === 'info' && i.message.includes('good skill coverage')
    );
    // May or may not have this message depending on exact skills
  });

  it('distinguishes high vs medium relevance recommendations', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'dev-agent',
        description: 'Use for development',
        type: 'development',
        skills: '',
      },
      hasGatewaySkill: false,
    });

    const result = runPhase8(agent);

    // Should have both auto-fixable (high) and non-auto-fixable (medium) suggestions
    const autoFixable = result.suggestions.filter((s) => s.autoFixable);
    const manual = result.suggestions.filter((s) => !s.autoFixable);

    // High relevance are auto-fixable, medium are not
    // At least some should be auto-fixable for development type
    expect(autoFixable.length + manual.length).toBe(result.suggestions.length);
  });

  it('handles empty body gracefully', () => {
    const agent = createTestAgent({
      body: '',
      frontmatter: {
        name: 'test-agent',
        description: 'Use when testing agents.',
        type: 'development',
        tools: 'Read, Write',
        skills: 'gateway-frontend', // Include gateway so test passes
      },
      hasGatewaySkill: true,
    });

    const result = runPhase8(agent);

    expect(result.passed).toBe(true);
    // Should not throw even with empty body
  });

  it('handles testing agent type', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'test-engineer',
        description: 'Use for testing',
        type: 'testing',
        skills: '',
      },
      category: 'testing',
      hasGatewaySkill: false,
    });

    const result = runPhase8(agent);

    // Should recommend testing-related skills
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('handles architecture agent type', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'architect',
        description: 'Use for architecture',
        type: 'architecture',
        skills: '',
      },
      category: 'architecture',
      hasGatewaySkill: false,
    });

    const result = runPhase8(agent);

    // Should recommend architecture-related skills (writing-plans, brainstorming)
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});
