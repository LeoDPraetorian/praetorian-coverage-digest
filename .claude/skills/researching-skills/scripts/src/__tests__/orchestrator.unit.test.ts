// src/__tests__/orchestrator.unit.test.ts
/**
 * Unit tests for skill creation orchestrator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  orchestrate,
  getQuestionsForInteractiveFlow,
  getNextQuestionForFlow,
  type OrchestrateOptions,
  type OrchestrateResult,
} from '../orchestrator.js';
import type { BrainstormAnswer } from '../lib/types.js';

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

// Mock phases to avoid actual external calls
vi.mock('../phases/context7.js', () => ({
  searchContext7: vi.fn().mockResolvedValue([
    {
      id: '/npm/@tanstack/react-query',
      name: '@tanstack/react-query',
      version: '5.0.0',
      pageCount: 150,
      description: 'Data fetching library',
      status: 'recommended',
    },
  ]),
  fetchContext7Docs: vi.fn().mockResolvedValue({
    packageId: '/npm/@tanstack/react-query',
    packageName: '@tanstack/react-query',
    version: '5.0.0',
    fetchedAt: new Date().toISOString(),
    content: '# Getting Started',
    sections: [
      {
        title: 'Getting Started',
        type: 'guide',
        content: 'Install the library',
        codeBlocks: [{ language: 'typescript', code: 'import { useQuery }', context: 'example' }],
      },
    ],
  }),
}));

vi.mock('../phases/web.js', () => ({
  searchWebSources: vi.fn().mockResolvedValue([
    {
      url: 'https://tanstack.com/query',
      title: 'TanStack Query',
      type: 'official-docs',
      score: 90,
      modifiers: [],
    },
  ]),
  fetchWebContent: vi.fn().mockResolvedValue('Documentation content here'),
}));

vi.mock('../phases/codebase.js', () => ({
  runCodebaseResearch: vi.fn().mockResolvedValue({
    similarSkills: [
      {
        name: 'frontend-tanstack-query',
        path: '.claude/skill-library/frontend/frontend-tanstack-query',
        location: 'library',
        similarity: 0.8,
        structure: {
          hasReferences: true,
          hasTemplates: true,
          hasExamples: false,
          hasScripts: false,
          referenceFiles: [],
          templateFiles: [],
          exampleFiles: [],
          lineCount: 200,
        },
        frontmatter: {
          name: 'frontend-tanstack-query',
          description: 'Use when working with TanStack Query',
        },
      },
    ],
    relatedCode: [],
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
  }),
}));

describe('orchestrate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('with default answers', () => {
    it('should complete orchestration with inferred defaults', async () => {
      const options: OrchestrateOptions = {
        name: 'test-skill',
        prompt: 'Create a skill for TanStack Query library',
        dryRun: true,
        verbose: false,
      };

      const result = await orchestrate(options);

      expect(result.success).toBe(true);
      expect(result.requirements).toBeDefined();
      expect(result.requirements?.name).toBe('test-skill');
      expect(result.requirements?.skillType).toBe('library');
      expect(result.errors.length).toBe(0);
    });

    it('should include warning when using inferred defaults', async () => {
      const options: OrchestrateOptions = {
        name: 'test-skill',
        prompt: 'Create a skill for testing',
        dryRun: true,
        verbose: false,
      };

      const result = await orchestrate(options);

      expect(result.warnings).toContain(
        'Using inferred defaults - consider providing explicit answers for better results'
      );
    });
  });

  describe('with provided answers', () => {
    it('should use provided brainstorm answers', async () => {
      const answers: BrainstormAnswer[] = [
        { questionId: 'skillType', value: 'process' },
        { questionId: 'location', value: 'core' },
        { questionId: 'purpose', value: 'Testing workflow skill' },
        { questionId: 'workflows', value: ['setup', 'execution'] },
        { questionId: 'audience', value: 'intermediate' },
        { questionId: 'contentPreferences', value: ['templates', 'examples'] },
      ];

      const options: OrchestrateOptions = {
        name: 'test-process-skill',
        prompt: 'Create a process skill',
        answers,
        dryRun: true,
        verbose: false,
      };

      const result = await orchestrate(options);

      expect(result.success).toBe(true);
      expect(result.requirements?.skillType).toBe('process');
      expect(result.requirements?.location).toBe('core');
    });

    it('should fail if required answers are missing', async () => {
      const answers: BrainstormAnswer[] = [
        { questionId: 'skillType', value: 'library' },
        // Missing required 'purpose' answer
      ];

      const options: OrchestrateOptions = {
        name: 'incomplete-skill',
        prompt: 'Test',
        answers,
        dryRun: true,
        verbose: false,
      };

      const result = await orchestrate(options);

      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.includes('Missing required answer'))).toBe(true);
    });
  });

  describe('phase execution', () => {
    it('should run codebase research', async () => {
      const { runCodebaseResearch } = await import('../phases/codebase.js');

      const options: OrchestrateOptions = {
        name: 'test-skill',
        prompt: 'Create a skill',
        dryRun: true,
        verbose: false,
      };

      await orchestrate(options);

      expect(runCodebaseResearch).toHaveBeenCalled();
    });

    it('should run Context7 research for library skills', async () => {
      const { searchContext7 } = await import('../phases/context7.js');

      const answers: BrainstormAnswer[] = [
        { questionId: 'skillType', value: 'library' },
        { questionId: 'location', value: 'library' },
        { questionId: 'purpose', value: 'TanStack Query skill' },
        { questionId: 'libraryName', value: 'tanstack query' },
        { questionId: 'workflows', value: ['basic-usage'] },
        { questionId: 'audience', value: 'intermediate' },
        { questionId: 'contentPreferences', value: ['examples'] },
      ];

      const options: OrchestrateOptions = {
        name: 'tanstack-query-skill',
        prompt: 'Create a skill for TanStack Query',
        answers,
        dryRun: true,
        verbose: false,
      };

      await orchestrate(options);

      expect(searchContext7).toHaveBeenCalled();
    });

    it('should skip Context7 for process skills', async () => {
      const { searchContext7 } = await import('../phases/context7.js');

      // Clear mock calls from previous tests
      vi.mocked(searchContext7).mockClear();

      const answers: BrainstormAnswer[] = [
        { questionId: 'skillType', value: 'process' },
        { questionId: 'location', value: 'core' },
        { questionId: 'purpose', value: 'Process skill' },
        { questionId: 'workflows', value: ['setup'] },
        { questionId: 'audience', value: 'intermediate' },
        { questionId: 'contentPreferences', value: ['templates'] },
      ];

      const options: OrchestrateOptions = {
        name: 'process-skill',
        prompt: 'Create a process skill',
        answers,
        dryRun: true,
        verbose: false,
      };

      await orchestrate(options);

      expect(searchContext7).not.toHaveBeenCalled();
    });

    it('should run web research when includeWeb is true', async () => {
      const { searchWebSources } = await import('../phases/web.js');

      const options: OrchestrateOptions = {
        name: 'test-skill',
        prompt: 'Create a skill',
        includeWeb: true,
        dryRun: true,
        verbose: false,
      };

      await orchestrate(options);

      expect(searchWebSources).toHaveBeenCalled();
    });
  });

  describe('generation result', () => {
    it('should include generation result on success', async () => {
      const options: OrchestrateOptions = {
        name: 'test-skill',
        prompt: 'Create a test skill',
        dryRun: true,
        verbose: false,
      };

      const result = await orchestrate(options);

      expect(result.generation).toBeDefined();
      expect(result.generation?.success).toBe(true);
      expect(result.generation?.skill).toBeDefined();
      expect(result.generation?.skill?.files.length).toBeGreaterThan(0);
    });

    it('should include output path on success', async () => {
      const options: OrchestrateOptions = {
        name: 'test-skill',
        prompt: 'Create a test skill',
        dryRun: true,
        verbose: false,
      };

      const result = await orchestrate(options);

      expect(result.outputPath).toBeDefined();
      expect(result.outputPath).toContain('test-skill');
    });
  });
});

describe('getQuestionsForInteractiveFlow', () => {
  it('should return questions for Claude-mediated flow', () => {
    const questions = getQuestionsForInteractiveFlow([], 'Create a library skill');

    expect(questions.length).toBeGreaterThan(0);
    expect(questions[0]).toHaveProperty('id');
    expect(questions[0]).toHaveProperty('question');
    expect(questions[0]).toHaveProperty('options');
    expect(questions[0]).toHaveProperty('multiSelect');
  });

  it('should respect dependencies based on current answers', () => {
    const answers: BrainstormAnswer[] = [{ questionId: 'location', value: 'core' }];

    const questions = getQuestionsForInteractiveFlow(answers, 'Test');

    // Category question depends on location=library, so should not appear
    const categoryQuestion = questions.find((q) => q.id === 'category');
    expect(categoryQuestion).toBeUndefined();
  });

  it('should show category when location is library', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'library' },
      { questionId: 'location', value: 'library' },
    ];

    const questions = getQuestionsForInteractiveFlow(answers, 'Test');

    const categoryQuestion = questions.find((q) => q.id === 'category');
    expect(categoryQuestion).toBeDefined();
  });
});

describe('getNextQuestionForFlow', () => {
  it('should return first question when no answers provided', () => {
    const question = getNextQuestionForFlow([], 'Test prompt');

    expect(question).not.toBeNull();
    expect(question?.id).toBe('skillType');
  });

  it('should return next unanswered question', () => {
    const answers: BrainstormAnswer[] = [{ questionId: 'skillType', value: 'library' }];

    const question = getNextQuestionForFlow(answers, 'Test');

    expect(question).not.toBeNull();
    expect(question?.id).toBe('location');
  });

  it('should return null when all questions are answered', () => {
    const answers: BrainstormAnswer[] = [
      { questionId: 'skillType', value: 'process' },
      { questionId: 'location', value: 'core' },
      { questionId: 'purpose', value: 'Test purpose' },
      { questionId: 'workflows', value: ['setup'] },
      { questionId: 'audience', value: 'intermediate' },
      { questionId: 'contentPreferences', value: ['templates'] },
    ];

    const question = getNextQuestionForFlow(answers, 'Test');

    expect(question).toBeNull();
  });
});

describe('inferDefaultAnswers', () => {
  it('should infer library type from prompt keywords', async () => {
    const options: OrchestrateOptions = {
      name: 'test-skill',
      prompt: 'Create a skill for TanStack library',
      dryRun: true,
      verbose: false,
    };

    const result = await orchestrate(options);

    expect(result.requirements?.skillType).toBe('library');
  });

  it('should infer integration type from prompt keywords', async () => {
    const options: OrchestrateOptions = {
      name: 'test-skill',
      prompt: 'Create a skill to integrate with external API',
      dryRun: true,
      verbose: false,
    };

    const result = await orchestrate(options);

    expect(result.requirements?.skillType).toBe('integration');
  });

  it('should infer frontend category from prompt keywords', async () => {
    const options: OrchestrateOptions = {
      name: 'react-skill',
      prompt: 'Create a React frontend skill',
      dryRun: true,
      verbose: false,
    };

    const result = await orchestrate(options);

    expect(result.requirements?.location).toEqual({ library: 'development/frontend' });
  });

  it('should infer backend category from prompt keywords', async () => {
    const options: OrchestrateOptions = {
      name: 'go-skill',
      prompt: 'Create a Go backend API skill',
      dryRun: true,
      verbose: false,
    };

    const result = await orchestrate(options);

    expect(result.requirements?.location).toEqual({ library: 'development/backend' });
  });
});
