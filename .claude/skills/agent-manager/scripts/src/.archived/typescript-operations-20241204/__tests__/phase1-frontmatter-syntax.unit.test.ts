/**
 * Phase 1: Frontmatter Syntax Validation Tests
 *
 * Tests for new features:
 * - Color field validation (Feature 1)
 * - PermissionMode alignment (Feature 2)
 * - Field ordering (Feature 3)
 * - Alphabetical sorting (Feature 4)
 */

import { describe, it, expect } from 'vitest';
import {
  isAlphabeticallySorted,
  sortAlphabetically,
  reorderFrontmatter,
  runPhase1,
} from '../phases/phase1-frontmatter-syntax.js';
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

describe('isAlphabeticallySorted', () => {
  it('returns true for already sorted list', () => {
    expect(isAlphabeticallySorted('Bash, Edit, Glob, Read, Write')).toBe(true);
  });

  it('returns false for unsorted list', () => {
    expect(isAlphabeticallySorted('Write, Read, Bash')).toBe(false);
  });

  it('returns true for empty string', () => {
    expect(isAlphabeticallySorted('')).toBe(true);
  });

  it('returns true for single item', () => {
    expect(isAlphabeticallySorted('Read')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isAlphabeticallySorted('bash, Edit, read')).toBe(true);
  });

  it('handles whitespace variations', () => {
    expect(isAlphabeticallySorted('Bash,  Edit,   Read')).toBe(true);
  });
});

describe('sortAlphabetically', () => {
  it('sorts unsorted list', () => {
    expect(sortAlphabetically('Write, Read, Bash')).toBe('Bash, Read, Write');
  });

  it('preserves original casing', () => {
    expect(sortAlphabetically('Write, read, BASH')).toBe('BASH, read, Write');
  });

  it('handles empty string', () => {
    expect(sortAlphabetically('')).toBe('');
  });

  it('handles single item', () => {
    expect(sortAlphabetically('Read')).toBe('Read');
  });

  it('normalizes whitespace', () => {
    expect(sortAlphabetically('Write,  Read,   Bash')).toBe('Bash, Read, Write');
  });

  it('filters out empty items from double commas', () => {
    expect(sortAlphabetically('Write, , Read')).toBe('Read, Write');
  });

  it('filters out empty items from trailing commas', () => {
    expect(sortAlphabetically('Write, Read,')).toBe('Read, Write');
  });

  it('filters out empty items from leading commas', () => {
    expect(sortAlphabetically(', Write, Read')).toBe('Read, Write');
  });
});

describe('reorderFrontmatter', () => {
  it('reorders fields to canonical order', () => {
    const input = `tools: Read, Write
name: test-agent
description: Test description
type: development`;

    const result = reorderFrontmatter(input);
    const lines = result.split('\n');

    // Check order: name should come before description, which comes before type, etc.
    const nameIndex = lines.findIndex((l) => l.startsWith('name:'));
    const descIndex = lines.findIndex((l) => l.startsWith('description:'));
    const typeIndex = lines.findIndex((l) => l.startsWith('type:'));
    const toolsIndex = lines.findIndex((l) => l.startsWith('tools:'));

    expect(nameIndex).toBeLessThan(descIndex);
    expect(descIndex).toBeLessThan(typeIndex);
    expect(typeIndex).toBeLessThan(toolsIndex);
  });

  it('preserves field values', () => {
    const input = `tools: Read, Write
name: my-agent
description: My description`;

    const result = reorderFrontmatter(input);

    expect(result).toContain('name: my-agent');
    expect(result).toContain('tools: Read, Write');
    expect(result).toContain('description: My description');
  });

  it('handles missing fields gracefully', () => {
    const input = `name: test-agent
description: Test`;

    const result = reorderFrontmatter(input);

    expect(result).toContain('name: test-agent');
    expect(result).toContain('description: Test');
  });

  it('preserves block scalar values (pipe)', () => {
    const input = `tools: Read
name: test-agent
description: |
  This is a multi-line
  description with indentation.
type: development`;

    const result = reorderFrontmatter(input);

    // Should preserve the block scalar with all its content
    expect(result).toContain('description: |');
    expect(result).toContain('  This is a multi-line');
    expect(result).toContain('  description with indentation.');
    // Order should be correct
    const nameIndex = result.indexOf('name:');
    const descIndex = result.indexOf('description:');
    const toolsIndex = result.indexOf('tools:');
    expect(nameIndex).toBeLessThan(descIndex);
    expect(descIndex).toBeLessThan(toolsIndex);
  });

  it('preserves block scalar values (folded)', () => {
    const input = `tools: Read
name: test-agent
description: >
  This is a folded
  multi-line description.
type: development`;

    const result = reorderFrontmatter(input);

    expect(result).toContain('description: >');
    expect(result).toContain('  This is a folded');
    expect(result).toContain('  multi-line description.');
  });

  it('handles block scalar with examples containing colons', () => {
    const input = `tools: Read
name: test-agent
description: |
  Use when doing X.

  <example>
  user: "Hello"
  </example>
type: development`;

    const result = reorderFrontmatter(input);

    // The block scalar should preserve the "user:" line as content, not as a field
    expect(result).toContain('  user: "Hello"');
    // Should still have type field at end
    expect(result).toContain('type: development');
  });
});

describe('runPhase1 - Color Validation (Feature 1)', () => {
  it('warns when color field is missing', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'test-agent',
        description: 'Use when testing.',
        type: 'development',
        // No color field
      },
    });

    const result = runPhase1(agent);
    const colorIssue = result.issues.find((i) =>
      i.message.includes('Missing color field')
    );

    expect(colorIssue).toBeDefined();
    expect(colorIssue?.severity).toBe('warning');
  });

  it('passes when color is correct for type', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'test-agent',
        description: 'Use when testing.',
        type: 'development',
        color: 'green', // Correct for development
      },
      hasCorrectColor: true,
    });

    const result = runPhase1(agent);
    const colorError = result.issues.find(
      (i) =>
        i.severity === 'error' && i.message.includes('does not match expected')
    );

    expect(colorError).toBeUndefined();
  });

  it('errors when color is incorrect for type', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'test-agent',
        description: 'Use when testing.',
        type: 'development',
        color: 'blue', // Wrong - should be green for development
      },
    });

    const result = runPhase1(agent);
    const colorError = result.issues.find(
      (i) => i.severity === 'error' && i.message.includes('does not match')
    );

    expect(colorError).toBeDefined();
    expect(colorError?.details).toContain('green');
  });

  it('suggests correct color in fix suggestion', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'test-agent',
        description: 'Use when testing.',
        type: 'architecture',
        // Missing color
      },
    });

    const result = runPhase1(agent);
    const colorSuggestion = result.suggestions.find((s) =>
      s.id.includes('phase1-color')
    );

    expect(colorSuggestion).toBeDefined();
    expect(colorSuggestion?.suggestedValue).toBe('blue'); // architecture = blue
  });

  it('errors when color is not a valid AGENT_COLOR', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'test-agent',
        description: 'Use when testing.',
        type: 'development',
        color: 'magenta' as any, // Invalid - not in AGENT_COLORS (type assertion to test runtime validation)
      },
    });

    const result = runPhase1(agent);
    const colorError = result.issues.find(
      (i) => i.severity === 'error' && i.message.includes('Invalid color')
    );

    expect(colorError).toBeDefined();
    expect(colorError?.message).toContain('magenta');
    expect(colorError?.details).toContain('Valid colors');
  });

  it('suggests valid color when invalid color provided', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'test-agent',
        description: 'Use when testing.',
        type: 'development',
        color: 'magenta' as any, // Invalid (type assertion to test runtime validation)
      },
    });

    const result = runPhase1(agent);
    const colorSuggestion = result.suggestions.find(
      (s) => s.id === 'phase1-color-invalid'
    );

    expect(colorSuggestion).toBeDefined();
    expect(colorSuggestion?.currentValue).toBe('magenta');
    expect(colorSuggestion?.suggestedValue).toBe('green'); // development = green
    expect(colorSuggestion?.autoFixable).toBe(true);
  });
});

describe('runPhase1 - PermissionMode Alignment (Feature 2)', () => {
  it('warns when permissionMode differs from expected', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'test-agent',
        description: 'Use when testing.',
        type: 'architecture',
        permissionMode: 'default', // Wrong - should be 'plan' for architecture
      },
    });

    const result = runPhase1(agent);
    const modeIssue = result.issues.find((i) =>
      i.message.includes('PermissionMode')
    );

    expect(modeIssue).toBeDefined();
    expect(modeIssue?.severity).toBe('warning');
    expect(modeIssue?.details).toContain('plan');
  });

  it('passes when permissionMode is correct', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'test-agent',
        description: 'Use when testing.',
        type: 'development',
        permissionMode: 'default', // Correct for development
      },
    });

    const result = runPhase1(agent);
    const modeError = result.issues.find(
      (i) => i.severity === 'error' && i.message.includes('PermissionMode')
    );

    expect(modeError).toBeUndefined();
  });

  it('suggests permissionMode when missing', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'test-agent',
        description: 'Use when testing.',
        type: 'quality',
        // No permissionMode
      },
    });

    const result = runPhase1(agent);
    const modeSuggestion = result.suggestions.find((s) =>
      s.id.includes('phase1-permission-mode')
    );

    expect(modeSuggestion).toBeDefined();
    expect(modeSuggestion?.suggestedValue).toBe('plan'); // quality = plan
  });
});

describe('runPhase1 - Field Ordering (Feature 3)', () => {
  it('reports info when fields are out of order', () => {
    const agent = createTestAgent({
      frontmatterFieldOrder: ['tools', 'name', 'description', 'type'],
      hasCorrectFieldOrder: false,
    });

    const result = runPhase1(agent);
    const orderIssue = result.issues.find((i) =>
      i.message.includes('not in canonical order')
    );

    expect(orderIssue).toBeDefined();
    expect(orderIssue?.severity).toBe('info');
  });

  it('passes when fields are in correct order', () => {
    const agent = createTestAgent({
      frontmatterFieldOrder: ['name', 'description', 'type', 'tools', 'skills'],
      hasCorrectFieldOrder: true,
    });

    const result = runPhase1(agent);
    const orderIssue = result.issues.find((i) =>
      i.message.includes('not in canonical order')
    );

    expect(orderIssue).toBeUndefined();
  });

  it('suggests reordering fix', () => {
    const agent = createTestAgent({
      frontmatterFieldOrder: ['tools', 'name', 'description'],
      hasCorrectFieldOrder: false,
    });

    const result = runPhase1(agent);
    const orderSuggestion = result.suggestions.find((s) =>
      s.id.includes('phase1-ordering')
    );

    expect(orderSuggestion).toBeDefined();
    expect(orderSuggestion?.autoFixable).toBe(true);
  });
});

describe('runPhase1 - Alphabetical Sorting (Feature 4)', () => {
  it('reports info when tools are not sorted', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'test-agent',
        description: 'Use when testing.',
        tools: 'Write, Read, Bash', // Not sorted
      },
    });

    const result = runPhase1(agent);
    const sortIssue = result.issues.find((i) =>
      i.message.includes('Tools field not alphabetically sorted')
    );

    expect(sortIssue).toBeDefined();
    expect(sortIssue?.severity).toBe('info');
  });

  it('passes when tools are sorted', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'test-agent',
        description: 'Use when testing.',
        tools: 'Bash, Read, Write', // Sorted
      },
    });

    const result = runPhase1(agent);
    const sortIssue = result.issues.find((i) =>
      i.message.includes('Tools field not alphabetically sorted')
    );

    expect(sortIssue).toBeUndefined();
  });

  it('reports info when skills are not sorted', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'test-agent',
        description: 'Use when testing.',
        skills: 'gateway-frontend, debugging-systematically', // Not sorted
      },
    });

    const result = runPhase1(agent);
    const sortIssue = result.issues.find((i) =>
      i.message.includes('Skills field not alphabetically sorted')
    );

    expect(sortIssue).toBeDefined();
    expect(sortIssue?.severity).toBe('info');
  });

  it('suggests sorted value in fix', () => {
    const agent = createTestAgent({
      frontmatter: {
        name: 'test-agent',
        description: 'Use when testing.',
        tools: 'Write, Read, Bash',
      },
    });

    const result = runPhase1(agent);
    const sortSuggestion = result.suggestions.find((s) =>
      s.id.includes('phase1-tools-sort')
    );

    expect(sortSuggestion).toBeDefined();
    expect(sortSuggestion?.suggestedValue).toBe('Bash, Read, Write');
  });
});
