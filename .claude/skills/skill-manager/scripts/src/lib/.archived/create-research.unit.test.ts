// src/lib/__tests__/create-research.unit.test.ts
/**
 * Unit tests for create.ts research mode integration
 *
 * Tests the skill-manager → researching-skills delegation workflow.
 *
 * TDD: Tests for research mode integration with researching-skills.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import the module under test
import {
  handleResearchMode,
  shouldOfferResearchMode,
  createResearchModeQuestion,
  buildResearchOptions,
  setOrchestrator,
  type ResearchModeResult,
} from '../create-research.js';

// Import types only
import type {
  CreateOptionsWithResearch,
  SkillCategory,
} from '../types.js';

// Create mock function for the orchestrator
const mockOrchestrateInteractive = vi.fn();

// ============================================================================
// Test Fixtures
// ============================================================================

// Define InteractiveState interface locally for testing
interface InteractiveState {
  currentStep: string;
  selectedSources: { codebase: boolean; context7: boolean; web: boolean };
  context7Results?: { highlights?: string[] };
  codebaseResults?: { patterns?: string[] };
  webResults?: { findings?: string[] };
  generatedContent?: {
    quickReference?: string;
    implementation?: string;
    examples?: string[];
    references?: string[];
  };
}

interface OrchestrateResult {
  state: InteractiveState;
  question?: {
    id: string;
    text: string;
    type: string;
    options?: { value: string; label: string; description?: string }[];
    placeholder?: string;
  };
  done: boolean;
}

function createMockInteractiveState(overrides?: Partial<InteractiveState>): InteractiveState {
  return {
    currentStep: 'source-selection',
    selectedSources: { codebase: false, context7: false, web: false },
    ...overrides,
  };
}

function createMockOrchestrateResult(overrides?: Partial<OrchestrateResult>): OrchestrateResult {
  return {
    state: createMockInteractiveState(),
    question: undefined,
    done: false,
    ...overrides,
  };
}

// ============================================================================
// shouldOfferResearchMode Tests
// ============================================================================

describe('shouldOfferResearchMode', () => {
  it('should return true for library skills', () => {
    expect(shouldOfferResearchMode('library')).toBe(true);
  });

  it('should return true for integration skills', () => {
    expect(shouldOfferResearchMode('integration')).toBe(true);
  });

  it('should return true for process skills', () => {
    // Process skills benefit from codebase exploration to find similar patterns
    expect(shouldOfferResearchMode('process')).toBe(true);
  });

  it('should return false for tool-wrapper skills', () => {
    // Tool wrappers follow strict templates, research less useful
    expect(shouldOfferResearchMode('tool-wrapper')).toBe(false);
  });
});

// ============================================================================
// createResearchModeQuestion Tests
// ============================================================================

describe('createResearchModeQuestion', () => {
  it('should return question with quick and research options', () => {
    const question = createResearchModeQuestion();

    expect(question.id).toBe('createMode');
    expect(question.type).toBe('select');
    expect(question.options).toHaveLength(2);
    expect(question.options?.find(o => o.value === 'quick')).toBeDefined();
    expect(question.options?.find(o => o.value === 'research')).toBeDefined();
  });

  it('should have descriptive labels for each option', () => {
    const question = createResearchModeQuestion();

    const quickOption = question.options?.find(o => o.value === 'quick');
    const researchOption = question.options?.find(o => o.value === 'research');

    expect(quickOption?.description).toContain('template');
    expect(researchOption?.description).toContain('research');
  });
});

// ============================================================================
// buildResearchOptions Tests
// ============================================================================

describe('buildResearchOptions', () => {
  it('should convert create options to research orchestrator options', () => {
    const createOptions: CreateOptionsWithResearch = {
      name: 'test-skill',
      description: 'Use when testing features',
      location: 'library',
      category: 'development/integrations',
      skillType: 'integration',
      mode: 'research',
    };

    const result = buildResearchOptions(createOptions);

    expect(result.skillName).toBe('test-skill');
    expect(result.skillDescription).toBe('Use when testing features');
    expect(result.skillType).toBe('integration');
  });

  it('should default to process skill type if not specified', () => {
    const createOptions: CreateOptionsWithResearch = {
      name: 'test-skill',
      description: 'Use when testing',
      location: 'core',
      mode: 'research',
    };

    const result = buildResearchOptions(createOptions);

    expect(result.skillType).toBe('process');
  });

  it('should include category for library skills', () => {
    const createOptions: CreateOptionsWithResearch = {
      name: 'frontend-skill',
      description: 'Use when building UI',
      location: 'library',
      category: 'development/frontend',
      skillType: 'library',
      mode: 'research',
    };

    const result = buildResearchOptions(createOptions);

    expect(result.category).toBe('development/frontend');
  });
});

// ============================================================================
// handleResearchMode Tests
// ============================================================================

describe('handleResearchMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up the mock orchestrator via dependency injection
    setOrchestrator(mockOrchestrateInteractive);
  });

  afterEach(() => {
    vi.resetAllMocks();
    // Reset the orchestrator to null for next test
    setOrchestrator(null);
  });

  it('should return NEEDS_INPUT when research mode not yet selected', async () => {
    const options: CreateOptionsWithResearch = {
      name: 'test-skill',
      description: 'Use when testing',
      location: 'library',
      category: 'development/integrations',
      skillType: 'integration',
      // mode not specified
    };

    const result = await handleResearchMode(options);

    expect(result.status).toBe('NEEDS_INPUT');
    expect(result.questions).toBeDefined();
    expect(result.questions?.[0].id).toBe('createMode');
  });

  it('should delegate to orchestrateInteractive when mode is research', async () => {
    mockOrchestrateInteractive.mockResolvedValue(
      createMockOrchestrateResult({
        done: false,
        question: {
          id: 'sources',
          text: 'Which sources would you like to use?',
          type: 'multiselect',
          options: [
            { value: 'codebase', label: 'Codebase' },
            { value: 'context7', label: 'Context7' },
            { value: 'web', label: 'Web' },
          ],
        },
      })
    );

    const options: CreateOptionsWithResearch = {
      name: 'test-skill',
      description: 'Use when testing',
      location: 'library',
      category: 'development/integrations',
      skillType: 'integration',
      mode: 'research',
    };

    const result = await handleResearchMode(options);

    expect(mockOrchestrateInteractive).toHaveBeenCalled();
    expect(result.status).toBe('RESEARCH_IN_PROGRESS');
    expect(result.questions).toBeDefined();
    expect(result.serializedState).toBeDefined();
  });

  it('should resume research when resumeState is provided', async () => {
    const mockState = createMockInteractiveState({
      currentStep: 'context7-query',
      selectedSources: { codebase: true, context7: true, web: false },
    });

    mockOrchestrateInteractive.mockResolvedValue(
      createMockOrchestrateResult({
        state: mockState,
        done: false,
        question: {
          id: 'context7Query',
          text: 'What would you like to search for?',
          type: 'input',
        },
      })
    );

    const serializedState = JSON.stringify({
      name: 'test-skill',
      description: 'Use when testing',
      location: 'library',
      category: 'development/integrations',
      skillType: 'integration',
      researchPhase: 'in-progress',
      researchState: mockState,
    });

    const options: CreateOptionsWithResearch = {
      name: 'test-skill',
      description: 'Use when testing',
      location: 'library',
      category: 'development/integrations',
      skillType: 'integration',
      mode: 'research',
      resumeState: serializedState,
    };

    const result = await handleResearchMode(options);

    expect(mockOrchestrateInteractive).toHaveBeenCalled();
    expect(result.status).toBe('RESEARCH_IN_PROGRESS');
  });

  it('should return READY when research is complete', async () => {
    const completedState = createMockInteractiveState({
      currentStep: 'complete',
      selectedSources: { codebase: true, context7: true, web: false },
      generatedContent: {
        quickReference: '| Function | Purpose |',
        implementation: '## Implementation steps',
        examples: ['Example 1'],
        references: ['Reference 1'],
      },
    });

    mockOrchestrateInteractive.mockResolvedValue(
      createMockOrchestrateResult({
        state: completedState,
        done: true,
      })
    );

    const options: CreateOptionsWithResearch = {
      name: 'test-skill',
      description: 'Use when testing',
      location: 'library',
      category: 'development/integrations',
      skillType: 'integration',
      mode: 'research',
    };

    const result = await handleResearchMode(options);

    expect(result.status).toBe('READY');
    expect(result.researchSummary).toBeDefined();
    expect(result.researchSummary?.sourcesUsed.context7).toBe(true);
  });

  it('should return READY immediately for quick mode', async () => {
    const options: CreateOptionsWithResearch = {
      name: 'test-skill',
      description: 'Use when testing',
      location: 'library',
      category: 'development/integrations',
      skillType: 'integration',
      mode: 'quick',
    };

    const result = await handleResearchMode(options);

    expect(result.status).toBe('READY');
    expect(mockOrchestrateInteractive).not.toHaveBeenCalled();
  });

  it('should handle orchestrator errors gracefully', async () => {
    mockOrchestrateInteractive.mockRejectedValue(new Error('Orchestrator failed'));

    const options: CreateOptionsWithResearch = {
      name: 'test-skill',
      description: 'Use when testing',
      location: 'library',
      category: 'development/integrations',
      skillType: 'integration',
      mode: 'research',
    };

    const result = await handleResearchMode(options);

    expect(result.status).toBe('ERROR');
    expect(result.error).toContain('Orchestrator failed');
  });

  it('should convert interactive questions to create result questions', async () => {
    mockOrchestrateInteractive.mockResolvedValue(
      createMockOrchestrateResult({
        done: false,
        question: {
          id: 'context7Query',
          text: 'Enter your search query for Context7',
          type: 'input',
          placeholder: 'e.g., TanStack Query hooks',
        },
      })
    );

    const options: CreateOptionsWithResearch = {
      name: 'test-skill',
      description: 'Use when testing',
      location: 'library',
      category: 'development/integrations',
      skillType: 'integration',
      mode: 'research',
    };

    const result = await handleResearchMode(options);

    expect(result.questions).toHaveLength(1);
    expect(result.questions?.[0].id).toBe('context7Query');
    expect(result.questions?.[0].question).toBe('Enter your search query for Context7');
    expect(result.questions?.[0].type).toBe('input');
    expect(result.questions?.[0].placeholder).toBe('e.g., TanStack Query hooks');
  });

  it('should include next step instructions during research', async () => {
    mockOrchestrateInteractive.mockResolvedValue(
      createMockOrchestrateResult({
        done: false,
        state: createMockInteractiveState({
          currentStep: 'context7-results',
        }),
        question: {
          id: 'selectResults',
          text: 'Select relevant results',
          type: 'multiselect',
          options: [
            { value: 'result1', label: 'Result 1' },
            { value: 'result2', label: 'Result 2' },
          ],
        },
      })
    );

    const options: CreateOptionsWithResearch = {
      name: 'test-skill',
      description: 'Use when testing',
      location: 'library',
      category: 'development/integrations',
      skillType: 'integration',
      mode: 'research',
    };

    const result = await handleResearchMode(options);

    expect(result.nextStep).toBeDefined();
    expect(result.nextStep).toContain('context7');
  });
});

// ============================================================================
// Research Summary Generation Tests
// ============================================================================

describe('research summary generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setOrchestrator(mockOrchestrateInteractive);
  });

  afterEach(() => {
    setOrchestrator(null);
  });

  it('should extract sources used from completed state', async () => {
    const completedState = createMockInteractiveState({
      currentStep: 'complete',
      selectedSources: { codebase: true, context7: true, web: false },
    });

    mockOrchestrateInteractive.mockResolvedValue(
      createMockOrchestrateResult({
        state: completedState,
        done: true,
      })
    );

    const options: CreateOptionsWithResearch = {
      name: 'test-skill',
      description: 'Use when testing',
      location: 'library',
      category: 'development/integrations',
      skillType: 'integration',
      mode: 'research',
    };

    const result = await handleResearchMode(options);

    expect(result.researchSummary?.sourcesUsed.codebase).toBe(true);
    expect(result.researchSummary?.sourcesUsed.context7).toBe(true);
    expect(result.researchSummary?.sourcesUsed.web).toBe(false);
  });

  it('should include generated content sections', async () => {
    const completedState = createMockInteractiveState({
      currentStep: 'complete',
      selectedSources: { codebase: true, context7: false, web: false },
      generatedContent: {
        quickReference: '| Function | Purpose |\n|----------|---------|',
        implementation: '## Step 1\nDo this\n## Step 2\nDo that',
        examples: ['```typescript\nconst x = 1;\n```'],
        references: ['docs/api.md', 'docs/guide.md'],
      },
    });

    mockOrchestrateInteractive.mockResolvedValue(
      createMockOrchestrateResult({
        state: completedState,
        done: true,
      })
    );

    const options: CreateOptionsWithResearch = {
      name: 'test-skill',
      description: 'Use when testing',
      location: 'core',
      skillType: 'process',
      mode: 'research',
    };

    const result = await handleResearchMode(options);

    expect(result.researchSummary?.generatedContent.quickReference).toContain('Function');
    expect(result.researchSummary?.generatedContent.implementation).toContain('Step 1');
    expect(result.researchSummary?.generatedContent.examples).toHaveLength(1);
    expect(result.researchSummary?.generatedContent.references).toHaveLength(2);
  });
});
