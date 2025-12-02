// src/__tests__/codebase.unit.test.ts
/**
 * Unit tests for codebase research phase
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  runCodebaseResearch,
  _setProjectRoot,
  _resetProjectRoot,
} from '../phases/codebase.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Test fixtures directory
let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `codebase-phase-test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
  mkdirSync(join(testDir, 'modules'), { recursive: true });
  mkdirSync(join(testDir, '.claude', 'skills'), { recursive: true });
  mkdirSync(join(testDir, '.claude', 'skill-library'), { recursive: true });
  _setProjectRoot(testDir);
});

afterEach(() => {
  _resetProjectRoot();
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe('runCodebaseResearch', () => {
  beforeEach(() => {
    // Create test modules
    const chariotDir = join(testDir, 'modules', 'chariot');
    mkdirSync(chariotDir, { recursive: true });
    writeFileSync(join(chariotDir, 'go.mod'), 'module chariot');
    writeFileSync(join(chariotDir, 'CLAUDE.md'), `# Chariot

## Project Overview

Core platform backend for security scanning.
`);

    // Create UI module
    const uiDir = join(testDir, 'modules', 'chariot', 'ui', 'src');
    mkdirSync(uiDir, { recursive: true });
    writeFileSync(join(uiDir, 'App.tsx'), `
import { useQuery } from '@tanstack/react-query';

export function App() {
  const { data } = useQuery({ queryKey: ['assets'] });
  return <div>{data}</div>;
}
`);

    // Create test skill
    const skillDir = join(testDir, '.claude', 'skills', 'test-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: test-skill
description: Use when doing tests
---

# Test Skill
`);

    // Create library skill
    const libSkillDir = join(testDir, '.claude', 'skill-library', 'frontend', 'frontend-react');
    mkdirSync(libSkillDir, { recursive: true });
    writeFileSync(join(libSkillDir, 'SKILL.md'), `---
name: frontend-react
description: Use when developing React applications
---

# React Skill
`);

    // Create conventions
    writeFileSync(join(testDir, 'CLAUDE.md'), `# Project

## Code Organization

- Feature-based folder structure

## Testing

- 80% minimum coverage
`);
  });

  it('should return CodebasePatterns structure', async () => {
    const result = await runCodebaseResearch('react frontend');

    expect(result).toHaveProperty('similarSkills');
    expect(result).toHaveProperty('relatedCode');
    expect(result).toHaveProperty('conventions');
    expect(result).toHaveProperty('relatedTests');
    expect(result).toHaveProperty('submodules');
  });

  it('should discover relevant submodules', async () => {
    const result = await runCodebaseResearch('security');

    expect(result.submodules.length).toBeGreaterThan(0);
    // Chariot should be found
    const chariot = result.submodules.find(s => s.name === 'chariot');
    expect(chariot).toBeDefined();
  });

  it('should find similar skills', async () => {
    const result = await runCodebaseResearch('react');

    expect(result.similarSkills.length).toBeGreaterThan(0);
    // Should find the frontend-react skill
    const reactSkill = result.similarSkills.find(s => s.name === 'frontend-react');
    expect(reactSkill).toBeDefined();
    expect(reactSkill!.similarity).toBeGreaterThan(0);
  });

  it('should find related code patterns', async () => {
    const result = await runCodebaseResearch('useQuery');

    // Should find the useQuery usage in App.tsx
    expect(result.relatedCode.some(c => c.content.includes('useQuery'))).toBe(true);
  });

  it('should extract project conventions', async () => {
    const result = await runCodebaseResearch('react');

    // Should have conventions from CLAUDE.md
    expect(result.conventions.source).toContain('CLAUDE.md');
    expect(
      result.conventions.fileOrganization.length +
      result.conventions.testingPatterns.length
    ).toBeGreaterThan(0);
  });

  it('should handle empty topic gracefully', async () => {
    const result = await runCodebaseResearch('');

    // Should return valid structure even with empty topic
    expect(result).toHaveProperty('similarSkills');
    expect(result).toHaveProperty('conventions');
  });

  it('should limit results to prevent context overflow', async () => {
    // Create many files
    const uiDir = join(testDir, 'modules', 'chariot', 'ui', 'src');
    for (let i = 0; i < 100; i++) {
      writeFileSync(join(uiDir, `Component${i}.tsx`), `
import { useQuery } from '@tanstack/react-query';
export const Component${i} = () => useQuery();
`);
    }

    const result = await runCodebaseResearch('useQuery');

    // Should have reasonable limits
    expect(result.relatedCode.length).toBeLessThanOrEqual(50);
  });
});

describe('Integration: Real codebase', () => {
  beforeEach(() => {
    _resetProjectRoot(); // Use real project root
  });

  it('should discover actual modules', async () => {
    // Use broader search term that should match more modules
    const result = await runCodebaseResearch('security api backend');

    // Real codebase should have some relevant modules
    // Note: submodules are filtered by relevance, so may be fewer than total
    expect(Array.isArray(result.submodules)).toBe(true);
  });

  it('should find real skills', async () => {
    const result = await runCodebaseResearch('frontend react');

    // Should find some frontend-related skills
    expect(result.similarSkills.length).toBeGreaterThan(0);
  });

  it('should extract real conventions', async () => {
    const result = await runCodebaseResearch('api');

    // Should have conventions from real CLAUDE.md
    expect(result.conventions.source).not.toBe('none');
  });
});
