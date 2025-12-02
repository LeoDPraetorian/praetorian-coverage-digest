// src/__tests__/types.unit.test.ts
/**
 * Unit tests for types and schema validation
 */

import { describe, it, expect } from 'vitest';
import {
  ResearchOptionsSchema,
  GenerateOptionsSchema,
  SOURCE_WEIGHTS,
  TRUSTED_DOMAINS,
  MODULE_KEYWORD_MAP,
  type Submodule,
  type SimilarSkill,
  type CodebasePatterns,
  type CodeMatch,
  type TestMatch,
  type ProjectConventions,
  type SkillStructure,
  type SkillFrontmatter,
} from '../lib/types.js';

describe('ResearchOptionsSchema', () => {
  it('should validate valid research options', () => {
    const valid = {
      topic: 'tanstack query',
      context7Only: false,
      includeWeb: true,
      output: '/tmp/output.json',
    };

    const result = ResearchOptionsSchema.parse(valid);
    expect(result.topic).toBe('tanstack query');
    expect(result.context7Only).toBe(false);
    expect(result.includeWeb).toBe(true);
  });

  it('should apply defaults for optional fields', () => {
    const minimal = {
      topic: 'zustand',
    };

    const result = ResearchOptionsSchema.parse(minimal);
    expect(result.topic).toBe('zustand');
    expect(result.context7Only).toBe(false);
    expect(result.includeWeb).toBe(false);
    expect(result.output).toBeUndefined();
  });

  it('should reject empty topic', () => {
    const invalid = {
      topic: '',
    };

    expect(() => ResearchOptionsSchema.parse(invalid)).toThrow();
  });

  it('should reject missing topic', () => {
    const invalid = {
      context7Only: true,
    };

    expect(() => ResearchOptionsSchema.parse(invalid)).toThrow();
  });
});

describe('GenerateOptionsSchema', () => {
  it('should validate valid generate options', () => {
    const valid = {
      fromResearch: '/path/to/research.json',
      location: 'library:frontend',
      dryRun: false,
    };

    const result = GenerateOptionsSchema.parse(valid);
    expect(result.fromResearch).toBe('/path/to/research.json');
    expect(result.location).toBe('library:frontend');
    expect(result.dryRun).toBe(false);
  });

  it('should apply defaults for optional fields', () => {
    const minimal = {
      fromResearch: '/path/to/research.json',
    };

    const result = GenerateOptionsSchema.parse(minimal);
    expect(result.fromResearch).toBe('/path/to/research.json');
    expect(result.location).toBeUndefined();
    expect(result.dryRun).toBe(false);
  });

  it('should reject empty fromResearch', () => {
    const invalid = {
      fromResearch: '',
    };

    expect(() => GenerateOptionsSchema.parse(invalid)).toThrow();
  });
});

describe('SOURCE_WEIGHTS', () => {
  it('should have correct base scores', () => {
    expect(SOURCE_WEIGHTS['official-docs'].base).toBe(100);
    expect(SOURCE_WEIGHTS['github-repo'].base).toBe(95);
    expect(SOURCE_WEIGHTS['maintainer-blog'].base).toBe(85);
    expect(SOURCE_WEIGHTS['article'].base).toBe(50);
  });

  it('should have all source types defined', () => {
    const expectedTypes = [
      'official-docs',
      'github-repo',
      'github-examples',
      'maintainer-blog',
      'quality-blog',
      'article',
    ];

    for (const type of expectedTypes) {
      expect(SOURCE_WEIGHTS[type as keyof typeof SOURCE_WEIGHTS]).toBeDefined();
    }
  });
});

describe('TRUSTED_DOMAINS', () => {
  it('should have correct boost values', () => {
    expect(TRUSTED_DOMAINS['tanstack.com']).toBe(20);
    expect(TRUSTED_DOMAINS['react.dev']).toBe(18);
    expect(TRUSTED_DOMAINS['tkdodo.eu']).toBe(15);
  });

  it('should include common trusted domains', () => {
    expect(TRUSTED_DOMAINS).toHaveProperty('tanstack.com');
    expect(TRUSTED_DOMAINS).toHaveProperty('github.com/tanstack');
    expect(TRUSTED_DOMAINS).toHaveProperty('kentcdodds.com');
  });
});

// ============================================================================
// Phase 2: Codebase Research Types Tests
// ============================================================================

describe('MODULE_KEYWORD_MAP', () => {
  it('should have keywords for main chariot module', () => {
    expect(MODULE_KEYWORD_MAP['chariot']).toContain('backend');
    expect(MODULE_KEYWORD_MAP['chariot']).toContain('api');
    expect(MODULE_KEYWORD_MAP['chariot']).toContain('lambda');
  });

  it('should have keywords for chariot/ui module', () => {
    expect(MODULE_KEYWORD_MAP['chariot/ui']).toContain('react');
    expect(MODULE_KEYWORD_MAP['chariot/ui']).toContain('typescript');
    expect(MODULE_KEYWORD_MAP['chariot/ui']).toContain('frontend');
  });

  it('should have keywords for security-related modules', () => {
    expect(MODULE_KEYWORD_MAP['nebula']).toContain('security');
    expect(MODULE_KEYWORD_MAP['aegiscli']).toContain('velociraptor');
    expect(MODULE_KEYWORD_MAP['chariot-aegis-capabilities']).toContain('vql');
  });

  it('should have all expected module entries', () => {
    const expectedModules = [
      'chariot',
      'chariot/ui',
      'chariot/e2e',
      'chariot-ui-components',
      'nebula',
      'janus',
      'janus-framework',
      'tabularium',
      'aegiscli',
      'chariot-aegis-capabilities',
      'praetorian-cli',
      'nuclei-templates',
      'chariot-devops',
      'praetorian-agent-workflows',
    ];

    for (const module of expectedModules) {
      expect(MODULE_KEYWORD_MAP).toHaveProperty(module);
      expect(MODULE_KEYWORD_MAP[module].length).toBeGreaterThan(0);
    }
  });
});

describe('Phase 2 Type Interfaces', () => {
  it('should create valid Submodule objects', () => {
    const submodule: Submodule = {
      name: 'chariot',
      path: '/modules/chariot',
      purpose: 'Core platform backend',
      keywords: ['api', 'backend', 'lambda'],
      languages: ['go', 'typescript'],
      hasClaudeMd: true,
    };

    expect(submodule.name).toBe('chariot');
    expect(submodule.languages).toContain('go');
    expect(submodule.hasClaudeMd).toBe(true);
  });

  it('should create valid SkillFrontmatter objects', () => {
    const frontmatter: SkillFrontmatter = {
      name: 'test-skill',
      description: 'Use when testing',
      allowedTools: ['Read', 'Write', 'Bash'],
      skills: ['gateway-frontend'],
    };

    expect(frontmatter.name).toBe('test-skill');
    expect(frontmatter.allowedTools).toContain('Read');
  });

  it('should create valid SkillStructure objects', () => {
    const structure: SkillStructure = {
      hasReferences: true,
      hasTemplates: true,
      hasExamples: false,
      hasScripts: true,
      referenceFiles: ['api-reference.md', 'patterns.md'],
      templateFiles: ['basic-usage.tsx'],
      exampleFiles: [],
      lineCount: 450,
    };

    expect(structure.hasReferences).toBe(true);
    expect(structure.referenceFiles.length).toBe(2);
    expect(structure.lineCount).toBe(450);
  });

  it('should create valid SimilarSkill objects', () => {
    const skill: SimilarSkill = {
      name: 'frontend-tanstack',
      path: '.claude/skill-library/development/frontend/state/frontend-tanstack/SKILL.md',
      location: 'library',
      similarity: 78,
      structure: {
        hasReferences: true,
        hasTemplates: true,
        hasExamples: true,
        hasScripts: true,
        referenceFiles: ['api.md'],
        templateFiles: ['query.tsx'],
        exampleFiles: ['pagination.md'],
        lineCount: 724,
      },
      frontmatter: {
        name: 'frontend-tanstack',
        description: 'Use when using TanStack Query',
      },
    };

    expect(skill.similarity).toBe(78);
    expect(skill.location).toBe('library');
    expect(skill.structure.lineCount).toBe(724);
  });

  it('should create valid CodeMatch objects', () => {
    const match: CodeMatch = {
      file: 'modules/chariot/ui/src/hooks/useQuery.ts',
      line: 42,
      content: 'const { data } = useQuery({ queryKey: ["assets"] })',
      context: 'Fetching assets list from API',
      matchType: 'usage',
    };

    expect(match.line).toBe(42);
    expect(match.matchType).toBe('usage');
  });

  it('should create valid TestMatch objects', () => {
    const testMatch: TestMatch = {
      file: 'modules/chariot/ui/src/__tests__/useQuery.test.ts',
      testName: 'should fetch data correctly',
      testType: 'unit',
      relevance: 85,
    };

    expect(testMatch.testType).toBe('unit');
    expect(testMatch.relevance).toBe(85);
  });

  it('should create valid ProjectConventions objects', () => {
    const conventions: ProjectConventions = {
      namingPatterns: ['kebab-case for files', 'PascalCase for components'],
      fileOrganization: ['Feature-based organization', 'Co-locate tests'],
      codingStandards: ['TypeScript strict mode', 'ESLint rules'],
      testingPatterns: ['80% coverage minimum', 'Page Object Model for E2E'],
      securityPatterns: ['Input validation', 'RBAC authorization'],
      source: 'DESIGN-PATTERNS.md',
    };

    expect(conventions.namingPatterns.length).toBe(2);
    expect(conventions.source).toBe('DESIGN-PATTERNS.md');
  });

  it('should create valid CodebasePatterns objects', () => {
    const patterns: CodebasePatterns = {
      similarSkills: [],
      relatedCode: [],
      conventions: {
        namingPatterns: [],
        fileOrganization: [],
        codingStandards: [],
        testingPatterns: [],
        securityPatterns: [],
        source: 'CLAUDE.md',
      },
      relatedTests: [],
      submodules: [],
    };

    expect(patterns.similarSkills).toEqual([]);
    expect(patterns.conventions.source).toBe('CLAUDE.md');
  });
});
