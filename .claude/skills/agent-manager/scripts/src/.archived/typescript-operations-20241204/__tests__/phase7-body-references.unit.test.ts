/**
 * Phase 7: Body References Validation Tests
 *
 * Tests for phantom skill detection in agent bodies.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { runPhase7 } from '../phases/phase7-body-references.js';
import { AgentInfo } from '../types.js';
import { clearSkillCache } from '../skill-checker.js';

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
      skills: 'gateway-frontend',
      ...overrides.frontmatter,
    },
    rawFrontmatter: 'name: test-agent\ndescription: Use when testing.',
    body: '# Test Agent\n\nBody content',
    lineCount: 10,
    bodyLineCount: 5,
    descriptionStatus: 'valid',
    hasExamples: false,
    hasUseWhenTrigger: true,
    hasGatewaySkill: true,
    hasOutputFormat: false,
    hasEscalationProtocol: false,
    hasCorrectColor: false,
    frontmatterFieldOrder: ['name', 'description', 'type', 'tools', 'skills'],
    hasCorrectFieldOrder: true,
    ...overrides,
  };
}

describe('runPhase7', () => {
  beforeEach(() => {
    clearSkillCache();
  });

  it('passes when no skill references in body', () => {
    const agent = createTestAgent({
      body: '# Simple Agent\n\nNo skill references here.',
    });

    const result = runPhase7(agent);

    expect(result.phase).toBe(7);
    expect(result.name).toBe('Body References');
    expect(result.passed).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('detects phantom skills (non-existent)', () => {
    const agent = createTestAgent({
      body: 'Use the `totally-fake-nonexistent-skill-xyz` skill for this task.',
    });

    const result = runPhase7(agent);

    expect(result.passed).toBe(false);
    const errorIssues = result.issues.filter((i) => i.severity === 'error');
    expect(errorIssues.length).toBeGreaterThan(0);
    expect(errorIssues[0].message).toContain('totally-fake-nonexistent-skill-xyz');
  });

  it('generates unique suggestion IDs for each phantom skill', () => {
    const agent = createTestAgent({
      body: `
        Use the \`fake-skill-one\` skill for task A.
        Use the \`fake-skill-two\` skill for task B.
      `,
    });

    const result = runPhase7(agent);

    const phantomSuggestions = result.suggestions.filter((s) =>
      s.id.startsWith('phase7-phantom-skill-')
    );

    // Each phantom skill should have a unique ID
    const ids = phantomSuggestions.map((s) => s.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids.length).toBe(uniqueIds.length);

    // Verify IDs contain skill names
    expect(ids.some((id) => id.includes('fake-skill-one'))).toBe(true);
    expect(ids.some((id) => id.includes('fake-skill-two'))).toBe(true);
  });

  it('reports info for found skill references', () => {
    const agent = createTestAgent({
      body: 'Use the `some-skill` skill for debugging.',
    });

    const result = runPhase7(agent);

    const infoIssues = result.issues.filter((i) => i.severity === 'info');
    expect(infoIssues.some((i) => i.message.includes('skill references'))).toBe(
      true
    );
  });

  it('does not flag existing skills as phantom', () => {
    // This test uses skills that actually exist in the project
    // If no skills exist, test will be skipped
    const agent = createTestAgent({
      body: 'Use the `gateway-frontend` skill for React patterns.',
    });

    const result = runPhase7(agent);

    // gateway-frontend exists, so no error for it
    const errorIssues = result.issues.filter((i) => i.severity === 'error');
    const gatewayErrors = errorIssues.filter((i) =>
      i.message.includes('gateway-frontend')
    );
    expect(gatewayErrors).toHaveLength(0);
  });

  it('handles body with no text', () => {
    const agent = createTestAgent({
      body: '',
    });

    const result = runPhase7(agent);

    expect(result.passed).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('returns correct phase metadata', () => {
    const agent = createTestAgent();

    const result = runPhase7(agent);

    expect(result.phase).toBe(7);
    expect(result.name).toBe('Body References');
    expect(result.autoFixable).toBe(false);
  });

  it('handles multiple skill reference patterns', () => {
    const agent = createTestAgent({
      body: `
        Use the \`nonexistent-skill-a\` skill.
        Also use nonexistent-skill-b skill for other tasks.
        skill: "nonexistent-skill-c"
      `,
    });

    const result = runPhase7(agent);

    // Should find multiple phantom skills
    const errors = result.issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBeGreaterThanOrEqual(1);
  });
});
