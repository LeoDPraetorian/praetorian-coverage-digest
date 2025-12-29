/**
 * Unit tests for Phase 13: Complexity Detection
 */

import { Phase13StateExternalization } from '../phase13-state-externalization.js';
import type { SkillFile } from '../../types.js';

/** Helper to create test skill fixtures */
function createSkillFixture(overrides: Partial<SkillFile> & { name: string; content: string }): SkillFile {
  return {
    path: '/test',
    directory: '/test',
    frontmatter: { name: overrides.name, description: 'test' },
    wordCount: 100,
    lineCount: 10,  // Default line count for tests
    skillType: 'reasoning',
    ...overrides,
  };
}

describe('Phase13StateExternalization - Complexity Detection', () => {
  test('detects complex skill with 5+ sections', () => {
    // Need 2+ criteria: 6 sections + workflow keyword
    const skill = createSkillFixture({
      name: 'test-skill',
      content: '## Section1\n## Section2\n## Section3\n## Section4\n## Section5\n## Section6\nThis is a systematic approach.',
    });

    // Access private method via type casting
    const complexity = (Phase13StateExternalization as any).detectComplexity(skill);
    expect(complexity.isComplex).toBe(true);
    expect(complexity.sectionCount).toBe(6);
    expect(complexity.reasons).toContain('6 sections (≥5 threshold)');
  });

  test('detects complex skill with workflow keywords', () => {
    // Need 2+ criteria: workflow keyword + high word count
    // Word count is computed from content.split(/\s+/), not from skill.wordCount
    const skill = createSkillFixture({
      name: 'test-skill',
      content: 'This is a systematic protocol with multiple phases. ' + 'word '.repeat(1600),
      wordCount: 2000,
    });

    const complexity = (Phase13StateExternalization as any).detectComplexity(skill);
    expect(complexity.isComplex).toBe(true);
    expect(complexity.hasKeywords).toBe(true);
    expect(complexity.reasons).toContain('Contains workflow keywords (systematic/protocol/phase)');
  });

  test('detects complex skill with high word count', () => {
    // Need 2+ criteria: high word count + workflow keyword
    // Word count is computed from content.split(/\s+/)
    const skill = createSkillFixture({
      name: 'test-skill',
      content: '## Overview\nThis is a systematic approach.\n' + 'word '.repeat(1600), // 1600+ words
      wordCount: 1601,
    });

    const complexity = (Phase13StateExternalization as any).detectComplexity(skill);
    expect(complexity.isComplex).toBe(true);
    expect(complexity.wordCount).toBeGreaterThan(1500);
    expect(complexity.reasons.some((r: string) => r.includes('words (>1500 threshold)'))).toBe(true);
  });

  test('requires 2 of 3 criteria for complexity', () => {
    // Only 1 criterion met - not complex
    const simpleSkill = createSkillFixture({
      name: 'simple-skill',
      content: '## Section1\n## Section2\n## Section3\n## Section4\n' + 'word '.repeat(100),
      wordCount: 104,
    });

    const simpleComplexity = (Phase13StateExternalization as any).detectComplexity(simpleSkill);
    expect(simpleComplexity.isComplex).toBe(false);

    // 2 criteria met - complex
    const complexSkill = createSkillFixture({
      name: 'complex-skill',
      content: '## S1\n## S2\n## S3\n## S4\n## S5\nThis is a systematic workflow',
      wordCount: 50,
    });

    const complexComplexity = (Phase13StateExternalization as any).detectComplexity(complexSkill);
    expect(complexComplexity.isComplex).toBe(true);
    expect(complexComplexity.reasons.length).toBe(2);
  });

  test('does not flag simple skill', () => {
    const skill = createSkillFixture({
      name: 'simple-skill',
      content: '## Overview\n## Usage\n\nSimple skill with 2 sections and 200 words.',
      wordCount: 200,
    });

    const complexity = (Phase13StateExternalization as any).detectComplexity(skill);
    expect(complexity.isComplex).toBe(false);
    expect(complexity.reasons.length).toBe(0);
  });

  test('respects frontmatter override - complexity: high', () => {
    const skill = createSkillFixture({
      name: 'override-skill',
      content: 'Short content with no indicators',
      frontmatter: {
        name: 'override-skill',
        description: 'test',
        complexity: 'high'
      },
      wordCount: 50,
    });

    const complexity = (Phase13StateExternalization as any).detectComplexity(skill);
    expect(complexity.isComplex).toBe(true);
    expect(complexity.frontmatterOverride).toBe(true);
    expect(complexity.reasons).toContain('Frontmatter declares complexity: high');
  });

  test('respects frontmatter override - requires-state-tracking: true', () => {
    const skill = createSkillFixture({
      name: 'override-skill',
      content: 'Short content',
      frontmatter: {
        name: 'override-skill',
        description: 'test',
        'requires-state-tracking': true
      },
      wordCount: 50,
    });

    const complexity = (Phase13StateExternalization as any).detectComplexity(skill);
    expect(complexity.isComplex).toBe(true);
    expect(complexity.frontmatterOverride).toBe(true);
  });

  test('respects opt-out - complexity: low', () => {
    const skill = createSkillFixture({
      name: 'opt-out-skill',
      content: '## S1\n## S2\n## S3\n## S4\n## S5\n## S6\n' + 'word '.repeat(2000),
      frontmatter: {
        name: 'opt-out-skill',
        description: 'test',
        complexity: 'low'
      },
      wordCount: 2006,
    });

    const complexity = (Phase13StateExternalization as any).detectComplexity(skill);
    expect(complexity.isComplex).toBe(false);
    expect(complexity.frontmatterOverride).toBe(true);
  });

  test('detects all workflow keywords', () => {
    const keywords = ['systematic', 'protocol', 'workflow', 'phase', 'checklist', 'step-by-step'];

    // Need 2+ criteria: keyword + actual high word count in content
    // (skill.wordCount is not used - implementation computes from content.split)
    keywords.forEach(keyword => {
      const skill = createSkillFixture({
        name: 'test-skill',
        content: `This skill uses a ${keyword} approach with multiple steps. ` + 'word '.repeat(1600),
        wordCount: 2000,
      });

      const complexity = (Phase13StateExternalization as any).detectComplexity(skill);
      expect(complexity.hasKeywords).toBe(true);
      expect(complexity.isComplex).toBe(true); // word count + keyword = 2 criteria
    });
  });
});
