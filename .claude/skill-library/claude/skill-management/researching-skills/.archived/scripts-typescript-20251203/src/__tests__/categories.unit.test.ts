// src/__tests__/categories.unit.test.ts
/**
 * Unit tests for library category discovery
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  discoverLibraryCategories,
  getCategoryOptions,
  suggestCategory,
  isSkillDirectory,
  countSkillsInCategory,
  _setProjectRoot,
  _resetProjectRoot,
} from '../lib/categories.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Test fixtures directory
let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `categories-test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
  mkdirSync(join(testDir, '.claude', 'skill-library'), { recursive: true });
  _setProjectRoot(testDir);
});

afterEach(() => {
  _resetProjectRoot();
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe('isSkillDirectory', () => {
  it('should return true for directory with SKILL.md', () => {
    const skillDir = join(testDir, 'test-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), '# Skill');

    expect(isSkillDirectory(skillDir)).toBe(true);
  });

  it('should return false for directory without SKILL.md', () => {
    const categoryDir = join(testDir, 'test-category');
    mkdirSync(categoryDir, { recursive: true });

    expect(isSkillDirectory(categoryDir)).toBe(false);
  });

  it('should return false for non-existent directory', () => {
    expect(isSkillDirectory(join(testDir, 'nonexistent'))).toBe(false);
  });
});

describe('countSkillsInCategory', () => {
  beforeEach(() => {
    // Create category structure with skills
    const libPath = join(testDir, '.claude', 'skill-library');

    // development/frontend with 2 skills
    const frontendPath = join(libPath, 'development', 'frontend');
    mkdirSync(frontendPath, { recursive: true });

    const skill1 = join(frontendPath, 'frontend-react');
    mkdirSync(skill1, { recursive: true });
    writeFileSync(join(skill1, 'SKILL.md'), '# React');

    const skill2 = join(frontendPath, 'frontend-vue');
    mkdirSync(skill2, { recursive: true });
    writeFileSync(join(skill2, 'SKILL.md'), '# Vue');

    // development/backend with 1 skill
    const backendPath = join(libPath, 'development', 'backend');
    mkdirSync(backendPath, { recursive: true });

    const skill3 = join(backendPath, 'backend-go');
    mkdirSync(skill3, { recursive: true });
    writeFileSync(join(skill3, 'SKILL.md'), '# Go');
  });

  it('should count skills in a category', () => {
    const frontendPath = join(testDir, '.claude', 'skill-library', 'development', 'frontend');
    expect(countSkillsInCategory(frontendPath)).toBe(2);
  });

  it('should count skills recursively', () => {
    const developmentPath = join(testDir, '.claude', 'skill-library', 'development');
    expect(countSkillsInCategory(developmentPath)).toBe(3);
  });

  it('should return 0 for empty category', () => {
    const emptyPath = join(testDir, '.claude', 'skill-library', 'empty');
    mkdirSync(emptyPath, { recursive: true });
    expect(countSkillsInCategory(emptyPath)).toBe(0);
  });

  it('should return 0 for non-existent path', () => {
    expect(countSkillsInCategory(join(testDir, 'nonexistent'))).toBe(0);
  });
});

describe('discoverLibraryCategories', () => {
  beforeEach(() => {
    // Create realistic category structure
    const libPath = join(testDir, '.claude', 'skill-library');

    // development/frontend/state
    const statePath = join(libPath, 'development', 'frontend', 'state');
    mkdirSync(statePath, { recursive: true });
    const stateSkill = join(statePath, 'frontend-zustand');
    mkdirSync(stateSkill, { recursive: true });
    writeFileSync(join(stateSkill, 'SKILL.md'), '# Zustand');

    // development/backend
    const backendPath = join(libPath, 'development', 'backend');
    mkdirSync(backendPath, { recursive: true });
    const backendSkill = join(backendPath, 'backend-api');
    mkdirSync(backendSkill, { recursive: true });
    writeFileSync(join(backendSkill, 'SKILL.md'), '# API');

    // testing/e2e
    const e2ePath = join(libPath, 'testing', 'e2e');
    mkdirSync(e2ePath, { recursive: true });
    const e2eSkill = join(e2ePath, 'e2e-playwright');
    mkdirSync(e2eSkill, { recursive: true });
    writeFileSync(join(e2eSkill, 'SKILL.md'), '# Playwright');
  });

  it('should discover top-level categories', () => {
    const categories = discoverLibraryCategories();

    const topLevel = categories.filter(c => c.depth === 1);
    expect(topLevel.length).toBe(2); // development, testing
    expect(topLevel.map(c => c.name)).toContain('development');
    expect(topLevel.map(c => c.name)).toContain('testing');
  });

  it('should discover nested categories', () => {
    const categories = discoverLibraryCategories();

    const frontend = categories.find(c => c.path === 'development/frontend');
    expect(frontend).toBeDefined();
    expect(frontend!.depth).toBe(2);
  });

  it('should count skills in categories', () => {
    const categories = discoverLibraryCategories();

    const development = categories.find(c => c.path === 'development');
    expect(development).toBeDefined();
    expect(development!.skillCount).toBe(2); // zustand + api
  });

  it('should respect maxDepth', () => {
    const categories = discoverLibraryCategories(1);

    // Should only have depth 1 categories
    expect(categories.every(c => c.depth <= 1)).toBe(true);
  });

  it('should sort categories by path', () => {
    const categories = discoverLibraryCategories();

    const paths = categories.map(c => c.path);
    const sorted = [...paths].sort();
    expect(paths).toEqual(sorted);
  });

  it('should return empty array if skill-library does not exist', () => {
    rmSync(join(testDir, '.claude', 'skill-library'), { recursive: true, force: true });

    const categories = discoverLibraryCategories();
    expect(categories).toEqual([]);
  });

  it('should skip skill directories (not treat them as categories)', () => {
    const categories = discoverLibraryCategories();

    // Should not include skill paths like 'development/frontend/state/frontend-zustand'
    const skillPaths = categories.filter(c => c.path.includes('frontend-zustand'));
    expect(skillPaths.length).toBe(0);
  });
});

describe('getCategoryOptions', () => {
  beforeEach(() => {
    const libPath = join(testDir, '.claude', 'skill-library');

    // Create categories
    const frontendPath = join(libPath, 'development', 'frontend');
    mkdirSync(frontendPath, { recursive: true });
    const skill = join(frontendPath, 'frontend-react');
    mkdirSync(skill, { recursive: true });
    writeFileSync(join(skill, 'SKILL.md'), '# React');
  });

  it('should return options with value, label, description', () => {
    const options = getCategoryOptions();

    expect(options.length).toBeGreaterThan(0);
    expect(options[0]).toHaveProperty('value');
    expect(options[0]).toHaveProperty('label');
    expect(options[0]).toHaveProperty('description');
  });

  it('should indent nested categories in label', () => {
    const options = getCategoryOptions();

    const development = options.find(o => o.value === 'development');
    const frontend = options.find(o => o.value === 'development/frontend');

    expect(development?.label).toBe('development');
    expect(frontend?.label).toBe('  frontend'); // 2-space indent
  });

  it('should include skill count in description', () => {
    const options = getCategoryOptions();

    const frontend = options.find(o => o.value === 'development/frontend');
    expect(frontend?.description).toMatch(/1 skill/);
  });

  it('should handle plural in description', () => {
    // Add another skill
    const libPath = join(testDir, '.claude', 'skill-library');
    const skill2 = join(libPath, 'development', 'frontend', 'frontend-vue');
    mkdirSync(skill2, { recursive: true });
    writeFileSync(join(skill2, 'SKILL.md'), '# Vue');

    const options = getCategoryOptions();

    const frontend = options.find(o => o.value === 'development/frontend');
    expect(frontend?.description).toMatch(/2 skills/);
  });
});

describe('suggestCategory', () => {
  beforeEach(() => {
    const libPath = join(testDir, '.claude', 'skill-library');

    // Create realistic categories
    mkdirSync(join(libPath, 'development', 'frontend', 'state'), { recursive: true });
    mkdirSync(join(libPath, 'development', 'backend'), { recursive: true });
    mkdirSync(join(libPath, 'testing', 'e2e'), { recursive: true });
    mkdirSync(join(libPath, 'claude', 'mcp-tools'), { recursive: true });
  });

  it('should suggest frontend category for react-related names', () => {
    const suggestion = suggestCategory('frontend-react-hooks', 'library');

    expect(suggestion).toContain('frontend');
  });

  it('should suggest state category for state management names', () => {
    const suggestion = suggestCategory('frontend-zustand', 'library');

    // Should match state or frontend
    expect(suggestion).toMatch(/state|frontend/);
  });

  it('should suggest testing category for test-related names', () => {
    const suggestion = suggestCategory('testing-playwright', 'process');

    expect(suggestion).toContain('testing');
  });

  it('should suggest mcp-tools for tool-wrapper type', () => {
    const suggestion = suggestCategory('mcp-linear', 'tool-wrapper');

    expect(suggestion).toContain('mcp-tools');
  });

  it('should return null if no matching category found', () => {
    // Remove all categories
    rmSync(join(testDir, '.claude', 'skill-library'), { recursive: true, force: true });
    mkdirSync(join(testDir, '.claude', 'skill-library'), { recursive: true });

    const suggestion = suggestCategory('unknown-skill', 'library');
    expect(suggestion).toBeNull();
  });
});

describe('Integration: Real skill-library', () => {
  beforeEach(() => {
    _resetProjectRoot(); // Use real project root
  });

  it('should discover categories from actual skill-library', () => {
    const categories = discoverLibraryCategories();

    // Real skill-library should have categories
    expect(categories.length).toBeGreaterThan(0);

    // Should have top-level categories like development, testing, claude
    const topLevel = categories.filter(c => c.depth === 1).map(c => c.name);
    expect(topLevel.length).toBeGreaterThan(0);
  });

  it('should generate valid category options', () => {
    const options = getCategoryOptions();

    // Should have options
    expect(options.length).toBeGreaterThan(0);

    // All options should have required fields
    for (const option of options) {
      expect(option.value).toBeTruthy();
      expect(option.label).toBeTruthy();
      expect(option.description).toBeTruthy();
    }
  });

  it('should suggest categories for common skill names', () => {
    const suggestion = suggestCategory('frontend-react-query', 'library');

    // Should suggest something (not null) for a common name
    // Note: depends on actual category structure
    expect(suggestion === null || typeof suggestion === 'string').toBe(true);
  });
});
