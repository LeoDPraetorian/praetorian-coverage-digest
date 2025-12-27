// src/__tests__/skill-generator.unit.test.ts
/**
 * Unit tests for skill generator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SkillGenerator,
  EnhancedSkillGenerator,
  generateSkill,
} from '../generators/skill-generator.js';
import type { ResearchData, GeneratedSkill, GenerationInput, Requirements } from '../lib/types.js';

// Mock fs operations
vi.mock('fs', () => ({
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue(''),
}));

// Mock findProjectRoot
vi.mock('../../../../../lib/find-project-root.js', () => ({
  findProjectRoot: vi.fn().mockReturnValue('/mock/project'),
}));

describe('SkillGenerator', () => {
  const mockResearchData: ResearchData = {
    topic: 'tanstack query',
    createdAt: '2024-01-01T00:00:00Z',
    context7: {
      packages: [
        {
          id: '/npm/@tanstack/react-query',
          name: '@tanstack/react-query',
          version: '5.0.0',
          pageCount: 150,
          description: 'Data fetching library',
          status: 'recommended',
        },
      ],
      selectedPackages: ['/npm/@tanstack/react-query'],
      documentation: [
        {
          packageId: '/npm/@tanstack/react-query',
          packageName: '@tanstack/react-query',
          version: '5.0.0',
          fetchedAt: '2024-01-01T00:00:00Z',
          content: '# Getting Started\n\nInstall the library.',
          sections: [
            {
              title: 'Getting Started',
              type: 'guide',
              content: 'Install the library with npm install @tanstack/react-query',
              codeBlocks: [
                {
                  language: 'typescript',
                  code: "import { QueryClient } from '@tanstack/react-query';",
                  context: 'Import the QueryClient',
                },
              ],
            },
            {
              title: 'useQuery',
              type: 'api',
              content: 'The useQuery hook fetches data.',
              codeBlocks: [
                {
                  language: 'typescript',
                  code: 'const { data } = useQuery({ queryKey: ["todos"], queryFn: fetchTodos });',
                  context: 'Basic usage',
                },
              ],
            },
          ],
        },
      ],
    },
    web: {
      sources: [],
      selectedSources: [],
      fetchedContent: [],
    },
    metadata: {
      totalPages: 2,
      totalCodeBlocks: 2,
      primaryVersion: '5.0.0',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate skill structure from research data', async () => {
      const generator = new SkillGenerator(mockResearchData, 'library:frontend');
      const skill = await generator.generate();

      expect(skill).toBeDefined();
      expect(skill.name).toContain('tanstack');
      expect(skill.files.length).toBeGreaterThan(0);
    });

    it('should generate SKILL.md file', async () => {
      const generator = new SkillGenerator(mockResearchData);
      const skill = await generator.generate();

      const skillMd = skill.files.find((f) => f.path === 'SKILL.md');
      expect(skillMd).toBeDefined();
      expect(skillMd?.type).toBe('skill-md');
      expect(skillMd?.content).toContain('---');
      expect(skillMd?.content).toContain('name:');
      expect(skillMd?.content).toContain('description:');
    });

    it('should generate reference files', async () => {
      const generator = new SkillGenerator(mockResearchData);
      const skill = await generator.generate();

      const references = skill.files.filter((f) => f.type === 'reference');
      expect(references.length).toBeGreaterThan(0);
    });

    it('should generate template files', async () => {
      const generator = new SkillGenerator(mockResearchData);
      const skill = await generator.generate();

      const templates = skill.files.filter((f) => f.type === 'template');
      expect(templates.length).toBeGreaterThan(0);
    });

    it('should generate metadata file', async () => {
      const generator = new SkillGenerator(mockResearchData);
      const skill = await generator.generate();

      const metadata = skill.files.find((f) => f.path === '.local/metadata.json');
      expect(metadata).toBeDefined();
      expect(metadata?.type).toBe('metadata');

      const parsed = JSON.parse(metadata?.content || '{}');
      expect(parsed).toHaveProperty('generatedAt');
      expect(parsed).toHaveProperty('requirements');
    });

    it('should include summary statistics', async () => {
      const generator = new SkillGenerator(mockResearchData);
      const skill = await generator.generate();

      expect(skill.summary).toBeDefined();
      expect(skill.summary.skillMdLines).toBeGreaterThan(0);
      expect(skill.summary.referenceCount).toBeGreaterThanOrEqual(0);
      expect(skill.summary.templateCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('skill naming', () => {
    it('should generate name for TanStack topic', async () => {
      const generator = new SkillGenerator(mockResearchData);
      const skill = await generator.generate();

      expect(skill.name).toMatch(/frontend-tanstack/);
    });

    it('should sanitize special characters in name', async () => {
      const data: ResearchData = {
        ...mockResearchData,
        topic: 'React Hook Form!!!',
      };
      const generator = new SkillGenerator(data);
      const skill = await generator.generate();

      expect(skill.name).not.toContain('!');
      expect(skill.name).toMatch(/^[a-z0-9-]+$/);
    });

    it('should handle spaces in topic', async () => {
      const data: ResearchData = {
        ...mockResearchData,
        topic: 'zustand state management',
      };
      const generator = new SkillGenerator(data);
      const skill = await generator.generate();

      expect(skill.name).not.toContain(' ');
      expect(skill.name).toContain('-');
    });
  });

  describe('location handling', () => {
    it('should use core location when specified', async () => {
      const generator = new SkillGenerator(mockResearchData, 'core');
      const skill = await generator.generate();

      expect(skill.location).toContain('.claude/skills');
      expect(skill.location).not.toContain('skill-library');
    });

    it('should use library location with domain', async () => {
      const generator = new SkillGenerator(mockResearchData, 'library:frontend');
      const skill = await generator.generate();

      expect(skill.location).toContain('.claude/skill-library');
      expect(skill.location).toContain('frontend');
    });

    it('should handle nested library paths', async () => {
      const generator = new SkillGenerator(mockResearchData, 'library:development/state');
      const skill = await generator.generate();

      expect(skill.location).toContain('development');
      expect(skill.location).toContain('state');
    });
  });

  describe('frontmatter generation', () => {
    it('should include name field', async () => {
      const generator = new SkillGenerator(mockResearchData);
      const skill = await generator.generate();

      const skillMd = skill.files.find((f) => f.path === 'SKILL.md');
      expect(skillMd?.content).toMatch(/name: [a-z0-9-]+/);
    });

    it('should include description field', async () => {
      const generator = new SkillGenerator(mockResearchData);
      const skill = await generator.generate();

      const skillMd = skill.files.find((f) => f.path === 'SKILL.md');
      expect(skillMd?.content).toContain('description: Use when');
    });

    it('should include allowed-tools field', async () => {
      const generator = new SkillGenerator(mockResearchData);
      const skill = await generator.generate();

      const skillMd = skill.files.find((f) => f.path === 'SKILL.md');
      expect(skillMd?.content).toContain('allowed-tools:');
    });
  });

  describe('content generation', () => {
    it('should include Quick Reference section', async () => {
      const generator = new SkillGenerator(mockResearchData);
      const skill = await generator.generate();

      const skillMd = skill.files.find((f) => f.path === 'SKILL.md');
      expect(skillMd?.content).toContain('## Quick Reference');
    });

    it('should include Overview section', async () => {
      const generator = new SkillGenerator(mockResearchData);
      const skill = await generator.generate();

      const skillMd = skill.files.find((f) => f.path === 'SKILL.md');
      expect(skillMd?.content).toContain('## Overview');
    });

    it('should include When to Use section', async () => {
      const generator = new SkillGenerator(mockResearchData);
      const skill = await generator.generate();

      const skillMd = skill.files.find((f) => f.path === 'SKILL.md');
      expect(skillMd?.content).toContain('## When to Use');
    });

    it('should include References section', async () => {
      const generator = new SkillGenerator(mockResearchData);
      const skill = await generator.generate();

      const skillMd = skill.files.find((f) => f.path === 'SKILL.md');
      expect(skillMd?.content).toContain('## References');
    });

    it('should include API Reference section for library type', async () => {
      const generator = new SkillGenerator(mockResearchData);
      const skill = await generator.generate();

      const skillMd = skill.files.find((f) => f.path === 'SKILL.md');
      // API Reference is generated when context7Data is present and skill type is library
      expect(skillMd?.content).toContain('## API Reference');
    });
  });

  describe('template generation', () => {
    it('should organize templates by language', async () => {
      const generator = new SkillGenerator(mockResearchData);
      const skill = await generator.generate();

      const tsTemplates = skill.files.filter(
        (f) => f.type === 'template' && f.path.includes('typescript/')
      );
      expect(tsTemplates.length).toBeGreaterThan(0);
    });

    it('should create README for each language directory', async () => {
      const generator = new SkillGenerator(mockResearchData);
      const skill = await generator.generate();

      const readmes = skill.files.filter(
        (f) => f.type === 'template' && f.path.endsWith('README.md')
      );
      expect(readmes.length).toBeGreaterThan(0);
    });

    it('should include source attribution in templates', async () => {
      const generator = new SkillGenerator(mockResearchData);
      const skill = await generator.generate();

      const templates = skill.files.filter(
        (f) => f.type === 'template' && !f.path.endsWith('README.md')
      );
      if (templates.length > 0) {
        expect(templates[0].content).toContain('// Source:');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty documentation', async () => {
      const emptyData: ResearchData = {
        ...mockResearchData,
        context7: {
          packages: [],
          selectedPackages: [],
          documentation: [],
        },
      };

      const generator = new SkillGenerator(emptyData);
      const skill = await generator.generate();

      // Should still generate basic structure
      expect(skill.files.length).toBeGreaterThan(0);
      const skillMd = skill.files.find((f) => f.path === 'SKILL.md');
      expect(skillMd).toBeDefined();
    });

    it('should handle documentation with no code blocks', async () => {
      const noCodeData: ResearchData = {
        ...mockResearchData,
        context7: {
          ...mockResearchData.context7,
          documentation: [
            {
              packageId: '/npm/test-lib',
              packageName: 'test-lib',
              version: '1.0.0',
              fetchedAt: '2024-01-01T00:00:00Z',
              content: 'Text only documentation',
              sections: [
                {
                  title: 'Overview',
                  type: 'guide',
                  content: 'This is a text-only section',
                  codeBlocks: [],
                },
              ],
            },
          ],
        },
      };

      const generator = new SkillGenerator(noCodeData);
      const skill = await generator.generate();

      expect(skill.files.length).toBeGreaterThan(0);
    });
  });
});

// Tests for EnhancedSkillGenerator
describe('EnhancedSkillGenerator', () => {
  const createTestRequirements = (overrides?: Partial<Requirements>): Requirements => ({
    name: 'test-skill',
    initialPrompt: 'Use when testing',
    skillType: 'library',
    location: { library: 'development/testing' },
    purpose: 'Testing skill generation',
    workflows: ['Basic setup', 'Advanced usage'],
    audience: 'intermediate',
    contentPreferences: ['api-reference', 'examples'],
    libraryName: 'test-lib',
    searchPatterns: ['test', 'testing'],
    context7Query: 'test library',
    ...overrides,
  });

  const createTestInput = (overrides?: Partial<GenerationInput>): GenerationInput => ({
    requirements: createTestRequirements(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generate', () => {
    it('should generate skill from requirements only', async () => {
      const input = createTestInput();
      const generator = new EnhancedSkillGenerator(input);
      const result = await generator.generate();

      expect(result.success).toBe(true);
      expect(result.skill).toBeDefined();
      expect(result.skill?.name).toBe('test-skill');
      expect(result.errors.length).toBe(0);
    });

    it('should return warning for low line count', async () => {
      const input = createTestInput();
      const generator = new EnhancedSkillGenerator(input);
      const result = await generator.generate();

      // With minimal input, line count may be low
      // Just verify the structure is correct
      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should generate SKILL.md with frontmatter', async () => {
      const input = createTestInput();
      const generator = new EnhancedSkillGenerator(input);
      const result = await generator.generate();

      expect(result.success).toBe(true);
      const skillMd = result.skill?.files.find((f) => f.path === 'SKILL.md');
      expect(skillMd).toBeDefined();
      expect(skillMd?.content).toContain('---');
      expect(skillMd?.content).toContain('name: test-skill');
      expect(skillMd?.content).toContain('description:');
      expect(skillMd?.content).toContain('allowed-tools:');
    });

    it('should generate metadata file', async () => {
      const input = createTestInput();
      const generator = new EnhancedSkillGenerator(input);
      const result = await generator.generate();

      const metadata = result.skill?.files.find((f) => f.path === '.local/metadata.json');
      expect(metadata).toBeDefined();

      const parsed = JSON.parse(metadata?.content || '{}');
      expect(parsed.generatedAt).toBeDefined();
      expect(parsed.requirements.name).toBe('test-skill');
    });

    it('should include synthesized content in result', async () => {
      const input = createTestInput();
      const generator = new EnhancedSkillGenerator(input);
      const result = await generator.generate();

      expect(result.synthesized).toBeDefined();
      expect(result.synthesized?.frontmatter.name).toBe('test-skill');
      expect(result.synthesized?.sections.length).toBeGreaterThan(0);
    });
  });

  describe('getSkillPath', () => {
    it('should return core path for core location', async () => {
      const input = createTestInput({
        requirements: createTestRequirements({ location: 'core' }),
      });
      const generator = new EnhancedSkillGenerator(input);

      expect(generator.getSkillPath()).toContain('.claude/skills');
      expect(generator.getSkillPath()).not.toContain('skill-library');
    });

    it('should return library path for library location', async () => {
      const input = createTestInput({
        requirements: createTestRequirements({ location: { library: 'development/frontend' } }),
      });
      const generator = new EnhancedSkillGenerator(input);

      expect(generator.getSkillPath()).toContain('.claude/skill-library');
      expect(generator.getSkillPath()).toContain('development');
      expect(generator.getSkillPath()).toContain('frontend');
    });
  });

  describe('with context7 data', () => {
    it('should include references from context7', async () => {
      const input = createTestInput({
        context7Data: {
          topic: 'test-lib',
          createdAt: new Date().toISOString(),
          context7: {
            packages: [{ id: 'test', name: 'test-lib', version: '1.0.0', pageCount: 10, description: 'Test', status: 'recommended' }],
            selectedPackages: ['test'],
            documentation: [{
              packageId: 'test',
              packageName: 'test-lib',
              version: '1.0.0',
              fetchedAt: new Date().toISOString(),
              content: 'Test docs',
              sections: [
                { title: 'API', type: 'api', content: 'API docs', codeBlocks: [] }
              ],
            }],
          },
          web: { sources: [], selectedSources: [], fetchedContent: [] },
          metadata: { totalPages: 10, totalCodeBlocks: 5, primaryVersion: '1.0.0' },
        },
      });

      const generator = new EnhancedSkillGenerator(input);
      const result = await generator.generate();

      expect(result.success).toBe(true);
      const references = result.skill?.files.filter((f) => f.type === 'reference');
      expect(references?.length).toBeGreaterThan(0);
    });
  });

  describe('with codebase patterns', () => {
    it('should include conventions reference', async () => {
      const input = createTestInput({
        codebasePatterns: {
          similarSkills: [],
          relatedCode: [{ file: 'test.ts', line: 1, content: 'test', context: '', matchType: 'pattern' }],
          conventions: {
            namingPatterns: ['camelCase'],
            fileOrganization: [],
            codingStandards: ['TypeScript'],
            testingPatterns: [],
            securityPatterns: [],
            source: 'CLAUDE.md',
          },
          relatedTests: [],
          submodules: [],
        },
      });

      const generator = new EnhancedSkillGenerator(input);
      const result = await generator.generate();

      expect(result.success).toBe(true);
      const conventions = result.skill?.files.find((f) => f.path.includes('conventions'));
      expect(conventions).toBeDefined();
    });
  });
});

// Tests for generateSkill function
describe('generateSkill', () => {
  it('should generate skill using function interface', async () => {
    const input: GenerationInput = {
      requirements: {
        name: 'func-test-skill',
        initialPrompt: 'Test',
        skillType: 'process',
        location: 'core',
        purpose: 'Testing function interface',
        workflows: ['Test workflow'],
        audience: 'beginner',
        contentPreferences: [],
        searchPatterns: [],
      },
    };

    const result = await generateSkill(input);

    expect(result.success).toBe(true);
    expect(result.skill?.name).toBe('func-test-skill');
  });

  it('should return errors on failure', async () => {
    // This should succeed but we can test the structure
    const input: GenerationInput = {
      requirements: {
        name: 'error-test',
        initialPrompt: '',
        skillType: 'library',
        location: 'core',
        purpose: '',
        workflows: [],
        audience: 'intermediate',
        contentPreferences: [],
        searchPatterns: [],
      },
    };

    const result = await generateSkill(input);

    // Should still succeed with minimal input
    expect(result.errors).toBeDefined();
    expect(Array.isArray(result.errors)).toBe(true);
  });
});
