/**
 * Agent Parser Tests
 *
 * Tests for block scalar detection and agent parsing.
 */

import { describe, it, expect } from 'vitest';
import {
  detectBlockScalar,
  getDescriptionStatus,
  hasUseWhenTrigger,
  hasExamples,
  hasGatewaySkill,
  countLines,
  convertToSingleLine,
} from '../agent-parser.js';

describe('detectBlockScalar', () => {
  it('detects pipe block scalar', () => {
    const yaml = `name: test-agent
description: |
  This is a multi-line
  description using pipe.
tools: Read, Write`;

    expect(detectBlockScalar(yaml, 'description')).toBe('pipe');
  });

  it('detects folded block scalar', () => {
    const yaml = `name: test-agent
description: >
  This is a folded
  description using >.
tools: Read, Write`;

    expect(detectBlockScalar(yaml, 'description')).toBe('folded');
  });

  it('detects pipe with chomping indicator', () => {
    const yaml = `name: test-agent
description: |-
  This is a multi-line
  description with chomping.
tools: Read, Write`;

    expect(detectBlockScalar(yaml, 'description')).toBe('pipe');
  });

  it('detects folded with chomping indicator', () => {
    const yaml = `name: test-agent
description: >-
  This is a folded
  description with chomping.
tools: Read, Write`;

    expect(detectBlockScalar(yaml, 'description')).toBe('folded');
  });

  it('returns null for single-line description', () => {
    const yaml = `name: test-agent
description: Use when developing React apps - components, UI, testing.
tools: Read, Write`;

    expect(detectBlockScalar(yaml, 'description')).toBeNull();
  });

  it('returns null for quoted single-line description', () => {
    const yaml = `name: test-agent
description: "Use when developing React apps.\\n\\n<example>...</example>"
tools: Read, Write`;

    expect(detectBlockScalar(yaml, 'description')).toBeNull();
  });
});

describe('getDescriptionStatus', () => {
  it('returns valid for single-line description', () => {
    const yaml = `description: Use when testing agents.`;
    expect(getDescriptionStatus(yaml, 'Use when testing agents.')).toBe('valid');
  });

  it('returns block-scalar-pipe for pipe description', () => {
    const yaml = `description: |
  Multi-line content.`;
    expect(getDescriptionStatus(yaml, 'Multi-line content.')).toBe('block-scalar-pipe');
  });

  it('returns block-scalar-folded for folded description', () => {
    const yaml = `description: >
  Folded content.`;
    expect(getDescriptionStatus(yaml, 'Folded content.')).toBe('block-scalar-folded');
  });

  it('returns missing for undefined description', () => {
    const yaml = `name: test`;
    expect(getDescriptionStatus(yaml, undefined)).toBe('missing');
  });

  it('returns empty for empty description', () => {
    const yaml = `description: ""`;
    expect(getDescriptionStatus(yaml, '')).toBe('empty');
  });
});

describe('hasUseWhenTrigger', () => {
  it('returns true for description starting with Use when', () => {
    expect(hasUseWhenTrigger('Use when developing React apps.')).toBe(true);
  });

  it('returns true for case-insensitive match', () => {
    expect(hasUseWhenTrigger('use when developing...')).toBe(true);
  });

  it('returns false for description without trigger', () => {
    expect(hasUseWhenTrigger('This agent helps with React development.')).toBe(false);
  });

  it('returns false if Use when is not at start', () => {
    expect(hasUseWhenTrigger('Agent to use when developing.')).toBe(false);
  });
});

describe('hasExamples', () => {
  it('returns true for description with example blocks', () => {
    const desc = 'Use when testing.\\n\\n<example>\\nContext: Test\\n</example>';
    expect(hasExamples(desc)).toBe(true);
  });

  it('returns false for description without examples', () => {
    const desc = 'Use when testing agents.';
    expect(hasExamples(desc)).toBe(false);
  });

  it('handles multiple examples', () => {
    const desc = '<example>First</example>\\n<example>Second</example>';
    expect(hasExamples(desc)).toBe(true);
  });
});

describe('hasGatewaySkill', () => {
  it('returns true for gateway-frontend', () => {
    expect(hasGatewaySkill('gateway-frontend')).toBe(true);
  });

  it('returns true for multiple skills including gateway', () => {
    expect(hasGatewaySkill('gateway-frontend, debugging-systematically')).toBe(true);
  });

  it('returns false for undefined', () => {
    expect(hasGatewaySkill(undefined)).toBe(false);
  });

  it('returns false for non-gateway skills', () => {
    expect(hasGatewaySkill('debugging-systematically, developing-with-tdd')).toBe(false);
  });
});

describe('countLines', () => {
  it('counts lines correctly', () => {
    expect(countLines('line1\nline2\nline3')).toBe(3);
  });

  it('ignores trailing empty lines', () => {
    expect(countLines('line1\nline2\n\n\n')).toBe(2);
  });

  it('handles single line', () => {
    expect(countLines('single line')).toBe(1);
  });

  it('handles empty string', () => {
    expect(countLines('')).toBe(0);
  });
});

describe('convertToSingleLine', () => {
  it('converts multi-line to single-line with escaped newlines', () => {
    const multiline = 'First paragraph.\n\nSecond paragraph.';
    const result = convertToSingleLine(multiline);
    // Should convert actual newlines to \\n\\n escape sequences
    expect(result).toContain('\\n\\n');
  });

  it('preserves single-line content', () => {
    const singleLine = 'Use when testing.';
    expect(convertToSingleLine(singleLine)).toBe('Use when testing.');
  });
});
