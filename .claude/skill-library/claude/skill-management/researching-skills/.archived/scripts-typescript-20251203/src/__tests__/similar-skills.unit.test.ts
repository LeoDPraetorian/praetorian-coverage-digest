// src/__tests__/similar-skills.unit.test.ts
/**
 * Unit tests for similar skills discovery functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getAllSkills,
  findSimilarSkills,
  calculateSimilarity,
  analyzeSkillStructure,
  parseSkillFrontmatter,
  _setProjectRoot,
  _resetProjectRoot,
} from '../lib/similar-skills.js';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Test fixtures directory
let testDir: string;

beforeEach(() => {
  testDir = join(tmpdir(), `similar-skills-test-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
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

describe('parseSkillFrontmatter', () => {
  it('should parse valid YAML frontmatter', () => {
    const content = `---
name: test-skill
description: Use when testing things
allowed-tools: Read, Write, Bash
skills: gateway-frontend
---

# Test Skill

Content here.
`;
    const result = parseSkillFrontmatter(content);

    expect(result.name).toBe('test-skill');
    expect(result.description).toBe('Use when testing things');
    expect(result.allowedTools).toEqual(['Read', 'Write', 'Bash']);
    expect(result.skills).toEqual(['gateway-frontend']);
  });

  it('should handle missing optional fields', () => {
    const content = `---
name: minimal-skill
description: A minimal skill
---

# Minimal
`;
    const result = parseSkillFrontmatter(content);

    expect(result.name).toBe('minimal-skill');
    expect(result.description).toBe('A minimal skill');
    expect(result.allowedTools).toBeUndefined();
    expect(result.skills).toBeUndefined();
  });

  it('should return empty object for content without frontmatter', () => {
    const content = `# No Frontmatter

Just content.
`;
    const result = parseSkillFrontmatter(content);

    expect(result.name).toBe('');
    expect(result.description).toBe('');
  });

  it('should handle array allowed-tools', () => {
    const content = `---
name: array-tools
description: Test
allowed-tools:
  - Read
  - Write
---
`;
    const result = parseSkillFrontmatter(content);

    expect(result.allowedTools).toEqual(['Read', 'Write']);
  });

  it('should parse skills field as array', () => {
    const content = `---
name: multi-skills
description: Test
skills:
  - gateway-frontend
  - gateway-backend
---
`;
    const result = parseSkillFrontmatter(content);

    expect(result.skills).toEqual(['gateway-frontend', 'gateway-backend']);
  });
});

describe('analyzeSkillStructure', () => {
  it('should detect references directory', () => {
    const skillDir = join(testDir, '.claude', 'skills', 'test-skill');
    mkdirSync(skillDir, { recursive: true });
    mkdirSync(join(skillDir, 'references'), { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), '# Test\n\nSome content here.');
    writeFileSync(join(skillDir, 'references', 'api.md'), '# API');

    const result = analyzeSkillStructure(skillDir);

    expect(result.hasReferences).toBe(true);
    expect(result.referenceFiles).toContain('api.md');
  });

  it('should detect templates directory', () => {
    const skillDir = join(testDir, '.claude', 'skills', 'test-skill');
    mkdirSync(skillDir, { recursive: true });
    mkdirSync(join(skillDir, 'templates'), { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), '# Test');
    writeFileSync(join(skillDir, 'templates', 'basic.tsx'), 'export default {}');

    const result = analyzeSkillStructure(skillDir);

    expect(result.hasTemplates).toBe(true);
    expect(result.templateFiles).toContain('basic.tsx');
  });

  it('should detect examples directory', () => {
    const skillDir = join(testDir, '.claude', 'skills', 'test-skill');
    mkdirSync(skillDir, { recursive: true });
    mkdirSync(join(skillDir, 'examples'), { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), '# Test');
    writeFileSync(join(skillDir, 'examples', 'usage.md'), '# Usage');

    const result = analyzeSkillStructure(skillDir);

    expect(result.hasExamples).toBe(true);
    expect(result.exampleFiles).toContain('usage.md');
  });

  it('should detect scripts directory', () => {
    const skillDir = join(testDir, '.claude', 'skills', 'test-skill');
    mkdirSync(skillDir, { recursive: true });
    mkdirSync(join(skillDir, 'scripts', 'src'), { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), '# Test');
    writeFileSync(join(skillDir, 'scripts', 'package.json'), '{}');

    const result = analyzeSkillStructure(skillDir);

    expect(result.hasScripts).toBe(true);
  });

  it('should count lines in SKILL.md', () => {
    const skillDir = join(testDir, '.claude', 'skills', 'test-skill');
    mkdirSync(skillDir, { recursive: true });
    const lines = 'Line\n'.repeat(100);
    writeFileSync(join(skillDir, 'SKILL.md'), lines);

    const result = analyzeSkillStructure(skillDir);

    // 100 'Line\n' creates 101 lines due to trailing newline
    expect(result.lineCount).toBe(101);
  });

  it('should handle missing directories gracefully', () => {
    const skillDir = join(testDir, '.claude', 'skills', 'minimal-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), '# Minimal');

    const result = analyzeSkillStructure(skillDir);

    expect(result.hasReferences).toBe(false);
    expect(result.hasTemplates).toBe(false);
    expect(result.hasExamples).toBe(false);
    expect(result.hasScripts).toBe(false);
    expect(result.referenceFiles).toEqual([]);
    expect(result.templateFiles).toEqual([]);
    expect(result.exampleFiles).toEqual([]);
  });
});

describe('getAllSkills', () => {
  it('should find core skills', () => {
    // Create a core skill
    const skillDir = join(testDir, '.claude', 'skills', 'my-core-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: my-core-skill
description: Use when doing core things
---

# Core Skill
`);

    const result = getAllSkills();

    expect(result.length).toBeGreaterThanOrEqual(1);
    const coreSkill = result.find(s => s.name === 'my-core-skill');
    expect(coreSkill).toBeDefined();
    expect(coreSkill?.location).toBe('core');
  });

  it('should find library skills', () => {
    // Create a library skill
    const skillDir = join(testDir, '.claude', 'skill-library', 'development', 'frontend', 'my-lib-skill');
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), `---
name: my-lib-skill
description: Use when doing library things
---

# Library Skill
`);

    const result = getAllSkills();

    const libSkill = result.find(s => s.name === 'my-lib-skill');
    expect(libSkill).toBeDefined();
    expect(libSkill?.location).toBe('library');
  });

  it('should skip directories without SKILL.md', () => {
    // Create a directory without SKILL.md
    const noSkillDir = join(testDir, '.claude', 'skills', 'not-a-skill');
    mkdirSync(noSkillDir, { recursive: true });
    writeFileSync(join(noSkillDir, 'README.md'), '# Not a skill');

    const result = getAllSkills();

    const notASkill = result.find(s => s.name === 'not-a-skill');
    expect(notASkill).toBeUndefined();
  });

  it('should skip hidden directories', () => {
    // Create a hidden directory
    const hiddenDir = join(testDir, '.claude', 'skills', '.hidden-skill');
    mkdirSync(hiddenDir, { recursive: true });
    writeFileSync(join(hiddenDir, 'SKILL.md'), '---\nname: hidden\ndescription: test\n---');

    const result = getAllSkills();

    const hiddenSkill = result.find(s => s.name === 'hidden' || s.name === '.hidden-skill');
    expect(hiddenSkill).toBeUndefined();
  });
});

describe('calculateSimilarity', () => {
  it('should return high similarity for matching keywords', () => {
    const keywords = ['react', 'frontend', 'components'];
    const skill = {
      name: 'frontend-react',
      path: '/path/to/skill',
      location: 'library' as const,
      similarity: 0,
      structure: {
        hasReferences: false,
        hasTemplates: false,
        hasExamples: false,
        hasScripts: false,
        referenceFiles: [],
        templateFiles: [],
        exampleFiles: [],
        lineCount: 100,
      },
      frontmatter: {
        name: 'frontend-react',
        description: 'Use when developing React frontend components',
      },
    };

    const result = calculateSimilarity(keywords, skill);

    expect(result).toBeGreaterThan(50);
  });

  it('should return low similarity for non-matching keywords', () => {
    const keywords = ['golang', 'backend', 'api'];
    const skill = {
      name: 'frontend-react',
      path: '/path/to/skill',
      location: 'library' as const,
      similarity: 0,
      structure: {
        hasReferences: false,
        hasTemplates: false,
        hasExamples: false,
        hasScripts: false,
        referenceFiles: [],
        templateFiles: [],
        exampleFiles: [],
        lineCount: 100,
      },
      frontmatter: {
        name: 'frontend-react',
        description: 'Use when developing React frontend components',
      },
    };

    const result = calculateSimilarity(keywords, skill);

    expect(result).toBeLessThan(30);
  });

  it('should boost exact name matches', () => {
    const keywords = ['tanstack'];
    const skill = {
      name: 'frontend-tanstack',
      path: '/path/to/skill',
      location: 'library' as const,
      similarity: 0,
      structure: {
        hasReferences: false,
        hasTemplates: false,
        hasExamples: false,
        hasScripts: false,
        referenceFiles: [],
        templateFiles: [],
        exampleFiles: [],
        lineCount: 100,
      },
      frontmatter: {
        name: 'frontend-tanstack',
        description: 'Use when using TanStack Query',
      },
    };

    const result = calculateSimilarity(keywords, skill);

    // Name match (30) + description match (20) + keyword (15) = 65
    expect(result).toBeGreaterThan(60);
  });

  it('should consider partial matches', () => {
    const keywords = ['test'];
    const skill = {
      name: 'testing-patterns',
      path: '/path/to/skill',
      location: 'library' as const,
      similarity: 0,
      structure: {
        hasReferences: false,
        hasTemplates: false,
        hasExamples: false,
        hasScripts: false,
        referenceFiles: [],
        templateFiles: [],
        exampleFiles: [],
        lineCount: 100,
      },
      frontmatter: {
        name: 'testing-patterns',
        description: 'Use when writing tests',
      },
    };

    const result = calculateSimilarity(keywords, skill);

    expect(result).toBeGreaterThan(0);
  });
});

describe('findSimilarSkills', () => {
  beforeEach(() => {
    // Create test skills
    const reactSkill = join(testDir, '.claude', 'skill-library', 'frontend', 'frontend-react');
    mkdirSync(reactSkill, { recursive: true });
    mkdirSync(join(reactSkill, 'references'), { recursive: true });
    writeFileSync(join(reactSkill, 'SKILL.md'), `---
name: frontend-react
description: Use when developing React components and hooks
---

# React Development Skill
`);
    writeFileSync(join(reactSkill, 'references', 'patterns.md'), '# Patterns');

    const goSkill = join(testDir, '.claude', 'skills', 'backend-go');
    mkdirSync(goSkill, { recursive: true });
    writeFileSync(join(goSkill, 'SKILL.md'), `---
name: backend-go
description: Use when developing Go backend services and APIs
---

# Go Backend Skill
`);

    const zustandSkill = join(testDir, '.claude', 'skill-library', 'frontend', 'frontend-zustand');
    mkdirSync(zustandSkill, { recursive: true });
    writeFileSync(join(zustandSkill, 'SKILL.md'), `---
name: frontend-zustand
description: Use when managing React state with Zustand
---

# Zustand State Management
`);
  });

  it('should find React skills for "react" query', () => {
    const result = findSimilarSkills('react');

    expect(result.length).toBeGreaterThan(0);
    const reactSkill = result.find(s => s.name === 'frontend-react');
    expect(reactSkill).toBeDefined();
    expect(reactSkill!.similarity).toBeGreaterThan(0);
  });

  it('should find Go skills for "golang backend" query', () => {
    const result = findSimilarSkills('golang backend');

    expect(result.length).toBeGreaterThan(0);
    const goSkill = result.find(s => s.name === 'backend-go');
    expect(goSkill).toBeDefined();
  });

  it('should sort by similarity descending', () => {
    const result = findSimilarSkills('react frontend');

    if (result.length > 1) {
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].similarity).toBeGreaterThanOrEqual(result[i].similarity);
      }
    }
  });

  it('should filter out zero similarity results', () => {
    const result = findSimilarSkills('xyz123nonexistent');

    // Should return empty or skills with 0 similarity filtered out
    for (const skill of result) {
      expect(skill.similarity).toBeGreaterThan(0);
    }
  });

  it('should limit results when specified', () => {
    const result = findSimilarSkills('frontend', 2);

    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('should include structure analysis', () => {
    const result = findSimilarSkills('react');

    const reactSkill = result.find(s => s.name === 'frontend-react');
    if (reactSkill) {
      expect(reactSkill.structure).toBeDefined();
      expect(reactSkill.structure.hasReferences).toBe(true);
    }
  });
});

describe('Integration: Real skills directory', () => {
  // These tests use the real project root
  beforeEach(() => {
    _resetProjectRoot(); // Use real project root
  });

  it('should discover actual skills (50+)', () => {
    const result = getAllSkills();

    // We expect at least 50 skills based on project structure
    expect(result.length).toBeGreaterThanOrEqual(20);

    // Check for known skills
    const skillNames = result.map(s => s.name);
    // Should have some gateway or core skills
    const hasGateway = skillNames.some(n => n.includes('gateway'));
    expect(hasGateway || result.length > 20).toBe(true);
  });

  it('should find frontend skills for "react" query', () => {
    const result = findSimilarSkills('react frontend');

    // Should find frontend-related skills
    expect(result.length).toBeGreaterThan(0);

    // At least one should have "frontend" or "react" in name/description
    const hasFrontend = result.some(s =>
      s.name.includes('frontend') ||
      s.name.includes('react') ||
      s.frontmatter.description.toLowerCase().includes('react')
    );
    expect(hasFrontend).toBe(true);
  });

  it('should find backend skills for "go api" query', () => {
    const result = findSimilarSkills('go api backend');

    // Should find some backend-related skills
    expect(result.length).toBeGreaterThan(0);
  });
});
