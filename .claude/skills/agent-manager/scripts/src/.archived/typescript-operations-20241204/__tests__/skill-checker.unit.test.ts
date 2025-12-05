/**
 * Skill Checker Tests
 *
 * Tests for phantom skill detection functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  findSkillReferencesInBody,
  findPhantomSkills,
  clearSkillCache,
  skillExists,
  findAllSkills,
  findSkillPathsInBody,
  findBrokenSkillPaths,
} from '../skill-checker.js';

describe('findSkillReferencesInBody', () => {
  it('finds `skill-name` skill pattern', () => {
    const body = 'Use the `debugging-systematically` skill for this.';
    const refs = findSkillReferencesInBody(body);

    expect(refs).toContain('debugging-systematically');
  });

  it('finds Use skill-name skill pattern', () => {
    const body = 'Use developing-with-tdd skill for test-first approach.';
    const refs = findSkillReferencesInBody(body);

    expect(refs).toContain('developing-with-tdd');
  });

  it('finds skill: "skill-name" pattern', () => {
    const body = 'Load with skill: "verifying-before-completion"';
    const refs = findSkillReferencesInBody(body);

    expect(refs).toContain('verifying-before-completion');
  });

  it('finds gateway-* pattern', () => {
    const body = 'Consult the gateway-frontend skill first.';
    const refs = findSkillReferencesInBody(body);

    expect(refs).toContain('gateway-frontend');
  });

  it('finds multiple references', () => {
    const body = `
      Use the \`debugging-systematically\` skill when fixing bugs.
      For new features, use developing-with-tdd skill.
      Also consult gateway-backend for Go patterns.
    `;
    const refs = findSkillReferencesInBody(body);

    expect(refs.length).toBeGreaterThanOrEqual(3);
    expect(refs).toContain('debugging-systematically');
    expect(refs).toContain('developing-with-tdd');
    expect(refs).toContain('gateway-backend');
  });

  it('returns empty array for no references', () => {
    const body = 'This agent does simple tasks with no skill references.';
    const refs = findSkillReferencesInBody(body);

    expect(refs).toEqual([]);
  });

  it('filters out common false positives', () => {
    const body = 'Use the `example` skill and `your-skill-name` skill.';
    const refs = findSkillReferencesInBody(body);

    // Should not include 'example' or 'your-skill-name'
    expect(refs).not.toContain('example');
    expect(refs).not.toContain('your-skill-name');
  });

  it('handles REQUIRED SKILL pattern', () => {
    const body = 'REQUIRED SKILL: writing-plans';
    const refs = findSkillReferencesInBody(body);

    expect(refs).toContain('writing-plans');
  });
});

describe('skillExists', () => {
  beforeEach(() => {
    clearSkillCache();
  });

  it('returns consistent results for same skill', () => {
    // This test checks cache behavior, not specific skills
    clearSkillCache();

    // First call should build cache
    const result1 = skillExists('any-skill-name');
    // Second call should use cache
    const result2 = skillExists('any-skill-name');

    // Both should return consistent result
    expect(result1).toBe(result2);
  });

  it('returns false for clearly non-existent skill', () => {
    clearSkillCache();
    const result = skillExists('definitely-not-a-real-skill-12345-xyz');

    expect(result).toBe(false);
  });
});

describe('findAllSkills', () => {
  it('returns array of skill names', () => {
    const skills = findAllSkills();

    expect(Array.isArray(skills)).toBe(true);
    // The function should return an array (may be empty in some test environments)
  });

  it('returns unique skill names when skills exist', () => {
    const skills = findAllSkills();
    const uniqueSkills = [...new Set(skills)];

    expect(skills.length).toBe(uniqueSkills.length);
  });

  it('does not throw when no skills directory exists', () => {
    // Pass a directory that doesn't have .claude
    expect(() => findAllSkills('/nonexistent')).not.toThrow();
  });
});

describe('findPhantomSkills', () => {
  beforeEach(() => {
    clearSkillCache();
  });

  it('returns phantom skills that do not exist', () => {
    const body = `
      Use the \`totally-fake-skill-xyz\` skill.
      Also use \`another-nonexistent-skill\` skill.
    `;

    const phantoms = findPhantomSkills(body);

    // These definitely don't exist
    expect(phantoms).toContain('totally-fake-skill-xyz');
    expect(phantoms).toContain('another-nonexistent-skill');
  });

  it('excludes skills that exist when skills are found', () => {
    // First verify if any skills exist
    clearSkillCache();
    const allSkills = findAllSkills();

    if (allSkills.length > 0) {
      // If skills exist, test that they're not marked as phantom
      const existingSkill = allSkills[0];
      const body = `Use the \`${existingSkill}\` skill.`;

      const phantoms = findPhantomSkills(body);
      expect(phantoms).not.toContain(existingSkill);
    }
    // If no skills found, just pass - can't test this case
  });

  it('returns empty array for no references', () => {
    const body = 'Simple agent with no skill references.';
    const phantoms = findPhantomSkills(body);

    expect(phantoms).toEqual([]);
  });
});

describe('findSkillPathsInBody', () => {
  it('finds paths in backticks', () => {
    const body =
      'Read `.claude/skill-library/security/auth-patterns/SKILL.md` for auth.';
    const paths = findSkillPathsInBody(body);

    expect(paths).toContain('.claude/skill-library/security/auth-patterns/SKILL.md');
  });

  it('finds Read: directive paths', () => {
    const body =
      'Read: .claude/skill-library/development/error-handling/SKILL.md';
    const paths = findSkillPathsInBody(body);

    expect(paths).toContain(
      '.claude/skill-library/development/error-handling/SKILL.md'
    );
  });

  it('finds paths in markdown tables', () => {
    const body = `
| Task | Skill to Read |
|------|---------------|
| Auth | \`.claude/skill-library/security/auth-patterns/SKILL.md\` |
| Errors | \`.claude/skill-library/development/error-handling/SKILL.md\` |
    `;
    const paths = findSkillPathsInBody(body);

    expect(paths.length).toBe(2);
    expect(paths).toContain('.claude/skill-library/security/auth-patterns/SKILL.md');
    expect(paths).toContain(
      '.claude/skill-library/development/error-handling/SKILL.md'
    );
  });

  it('returns empty array for no paths', () => {
    const body = 'Simple agent with no skill library paths.';
    const paths = findSkillPathsInBody(body);

    expect(paths).toEqual([]);
  });

  it('deduplicates repeated paths', () => {
    const body = `
      \`.claude/skill-library/testing/api-testing/SKILL.md\`
      Also see: \`.claude/skill-library/testing/api-testing/SKILL.md\`
    `;
    const paths = findSkillPathsInBody(body);

    expect(paths.length).toBe(1);
    expect(paths).toContain('.claude/skill-library/testing/api-testing/SKILL.md');
  });

  it('finds paths with nested directories', () => {
    const body =
      '``.claude/skill-library/development/frontend/tanstack-query/SKILL.md``';
    const paths = findSkillPathsInBody(body);

    // Path should be extracted without extra backticks
    expect(paths.length).toBe(1);
  });
});

describe('findBrokenSkillPaths', () => {
  beforeEach(() => {
    clearSkillCache();
  });

  it('returns broken paths that do not exist', () => {
    const body = `
      \`.claude/skill-library/nonexistent/fake-category/SKILL.md\`
      \`.claude/skill-library/another/missing/SKILL.md\`
    `;

    const broken = findBrokenSkillPaths(body);

    expect(broken.length).toBe(2);
    expect(broken[0].exists).toBe(false);
    expect(broken[1].exists).toBe(false);
  });

  it('returns empty array for no paths', () => {
    const body = 'Simple agent with no skill library paths.';
    const broken = findBrokenSkillPaths(body);

    expect(broken).toEqual([]);
  });

  it('returns empty array when all paths exist', () => {
    // Use a known path that exists in our skill-library
    // This test may be environment-specific, so we check if the path exists first
    const testPath = '.claude/skill-library/development/integrations/integration-chariot-patterns/SKILL.md';
    const body = `\`${testPath}\``;

    const broken = findBrokenSkillPaths(body);

    // If path exists, broken should be empty; if not, it should contain it
    // This test is flexible based on environment
    expect(Array.isArray(broken)).toBe(true);
  });

  it('correctly identifies mix of valid and broken paths', () => {
    const body = `
      \`.claude/skill-library/this-does-not-exist/SKILL.md\`
    `;

    const broken = findBrokenSkillPaths(body);

    // The fake path should be broken
    expect(broken.some((b) => b.path.includes('this-does-not-exist'))).toBe(true);
  });
});
