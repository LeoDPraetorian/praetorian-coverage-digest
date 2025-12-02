// src/__tests__/interactive.unit.test.ts
/**
 * Unit tests for interactive research workflow
 *
 * Tests cover:
 * - State management and transitions
 * - Question generation
 * - Smart keyword extraction
 * - Interactive orchestration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// State management
import {
  createInitialState,
  processAnswer,
  getNextStepAfterSourceSelection,
  getNextStepAfterContext7,
  getNextStep,
  isWorkflowComplete,
  isWaitingForInput,
  isProcessingStep,
  getResearchSummary,
} from '../lib/interactive-state.js';

// Question generation
import {
  getSourceSelectionQuestion,
  getContext7QueryQuestion,
  getContext7ResultsQuestion,
  getCodebaseQueryQuestion,
  getWebQueryQuestion,
  toAskUserQuestionFormat,
  parseUserSelection,
} from '../lib/interactive-questions.js';

// Smart keywords
import {
  extractSmartKeywords,
  generateSearchSuggestions,
  extractBasicKeywords,
} from '../lib/smart-keywords.js';

// Types
import type {
  InteractiveState,
  InteractiveAnswer,
  Context7State,
} from '../lib/interactive-types.js';
import { SEARCH_AGAIN_VALUE, SKIP_VALUE } from '../lib/interactive-types.js';
import type { Context7Package, Context7Documentation } from '../lib/types.js';

// ============================================================================
// State Management Tests
// ============================================================================

describe('interactive-state', () => {
  describe('createInitialState', () => {
    it('should create state at source-selection step', () => {
      const state = createInitialState();

      expect(state.currentStep).toBe('source-selection');
      expect(state.selectedSources.codebase).toBe(false);
      expect(state.selectedSources.context7).toBe(false);
      expect(state.selectedSources.web).toBe(false);
    });

    it('should have empty context7 state', () => {
      const state = createInitialState();

      expect(state.context7State.query).toBeNull();
      expect(state.context7State.searchResults).toEqual([]);
      expect(state.context7State.selectedPackageIds).toEqual([]);
      expect(state.context7State.fetchedDocs).toEqual([]);
      expect(state.context7State.searchHistory).toEqual([]);
    });
  });

  describe('processAnswer - source-selection', () => {
    it('should update selectedSources when sources are selected', () => {
      const state = createInitialState();
      const answer: InteractiveAnswer = {
        step: 'source-selection',
        selectedOptions: ['context7', 'codebase'],
      };

      const newState = processAnswer(state, answer);

      expect(newState.selectedSources.context7).toBe(true);
      expect(newState.selectedSources.codebase).toBe(true);
      expect(newState.selectedSources.web).toBe(false);
    });

    it('should transition to context7-query when context7 is selected', () => {
      const state = createInitialState();
      const answer: InteractiveAnswer = {
        step: 'source-selection',
        selectedOptions: ['context7'],
      };

      const newState = processAnswer(state, answer);

      expect(newState.currentStep).toBe('context7-query');
    });

    it('should transition to codebase-query when only codebase is selected', () => {
      const state = createInitialState();
      const answer: InteractiveAnswer = {
        step: 'source-selection',
        selectedOptions: ['codebase'],
      };

      const newState = processAnswer(state, answer);

      expect(newState.currentStep).toBe('codebase-query');
    });

    it('should transition to generation when no sources are selected', () => {
      const state = createInitialState();
      const answer: InteractiveAnswer = {
        step: 'source-selection',
        selectedOptions: [],
      };

      const newState = processAnswer(state, answer);

      expect(newState.currentStep).toBe('generation');
    });
  });

  describe('processAnswer - context7-query', () => {
    it('should update query and add to history', () => {
      const state: InteractiveState = {
        ...createInitialState(),
        currentStep: 'context7-query',
        selectedSources: { context7: true, codebase: false, web: false },
      };
      const answer: InteractiveAnswer = {
        step: 'context7-query',
        selectedOptions: ['jira'],
      };

      const newState = processAnswer(state, answer);

      expect(newState.context7State.query).toBe('jira');
      expect(newState.context7State.searchHistory).toContain('jira');
      expect(newState.currentStep).toBe('context7-results');
    });

    it('should use customInput if provided', () => {
      const state: InteractiveState = {
        ...createInitialState(),
        currentStep: 'context7-query',
        selectedSources: { context7: true, codebase: false, web: false },
      };
      const answer: InteractiveAnswer = {
        step: 'context7-query',
        selectedOptions: [],
        customInput: '@atlassian/jira-api',
      };

      const newState = processAnswer(state, answer);

      expect(newState.context7State.query).toBe('@atlassian/jira-api');
    });
  });

  describe('processAnswer - context7-results', () => {
    it('should go back to query when search-again is selected', () => {
      const state: InteractiveState = {
        ...createInitialState(),
        currentStep: 'context7-results',
        selectedSources: { context7: true, codebase: false, web: false },
        context7State: {
          query: 'jira',
          searchResults: [],
          selectedPackageIds: [],
          fetchedDocs: [],
          searchHistory: ['jira'],
        },
      };
      const answer: InteractiveAnswer = {
        step: 'context7-results',
        selectedOptions: [SEARCH_AGAIN_VALUE],
      };

      const newState = processAnswer(state, answer);

      expect(newState.currentStep).toBe('context7-query');
    });

    it('should skip to next source when skip is selected', () => {
      const state: InteractiveState = {
        ...createInitialState(),
        currentStep: 'context7-results',
        selectedSources: { context7: true, codebase: true, web: false },
        context7State: {
          query: 'jira',
          searchResults: [],
          selectedPackageIds: [],
          fetchedDocs: [],
          searchHistory: ['jira'],
        },
      };
      const answer: InteractiveAnswer = {
        step: 'context7-results',
        selectedOptions: [SKIP_VALUE],
      };

      const newState = processAnswer(state, answer);

      expect(newState.currentStep).toBe('codebase-query');
    });

    it('should store selected packages and go to fetch', () => {
      const state: InteractiveState = {
        ...createInitialState(),
        currentStep: 'context7-results',
        selectedSources: { context7: true, codebase: false, web: false },
        context7State: {
          query: 'jira',
          searchResults: [],
          selectedPackageIds: [],
          fetchedDocs: [],
          searchHistory: ['jira'],
        },
      };
      const answer: InteractiveAnswer = {
        step: 'context7-results',
        selectedOptions: ['/npm/jira-api', '/npm/jira-client'],
      };

      const newState = processAnswer(state, answer);

      expect(newState.context7State.selectedPackageIds).toEqual(['/npm/jira-api', '/npm/jira-client']);
      expect(newState.currentStep).toBe('context7-fetch');
    });
  });

  describe('getNextStepAfterSourceSelection', () => {
    it('should return context7-query if context7 is selected', () => {
      expect(getNextStepAfterSourceSelection({ context7: true, codebase: false, web: false }))
        .toBe('context7-query');
    });

    it('should return codebase-query if only codebase is selected', () => {
      expect(getNextStepAfterSourceSelection({ context7: false, codebase: true, web: false }))
        .toBe('codebase-query');
    });

    it('should return web-query if only web is selected', () => {
      expect(getNextStepAfterSourceSelection({ context7: false, codebase: false, web: true }))
        .toBe('web-query');
    });

    it('should return generation if nothing selected', () => {
      expect(getNextStepAfterSourceSelection({ context7: false, codebase: false, web: false }))
        .toBe('generation');
    });
  });

  describe('getNextStepAfterContext7', () => {
    it('should return codebase-query if codebase is selected', () => {
      expect(getNextStepAfterContext7({ context7: true, codebase: true, web: false }))
        .toBe('codebase-query');
    });

    it('should return web-query if only web is selected', () => {
      expect(getNextStepAfterContext7({ context7: true, codebase: false, web: true }))
        .toBe('web-query');
    });

    it('should return generation if no more sources', () => {
      expect(getNextStepAfterContext7({ context7: true, codebase: false, web: false }))
        .toBe('generation');
    });
  });

  describe('state queries', () => {
    it('isWorkflowComplete should return true only for complete step', () => {
      expect(isWorkflowComplete({ ...createInitialState(), currentStep: 'complete' })).toBe(true);
      expect(isWorkflowComplete({ ...createInitialState(), currentStep: 'generation' })).toBe(false);
    });

    it('isWaitingForInput should return true for input steps', () => {
      expect(isWaitingForInput({ ...createInitialState(), currentStep: 'source-selection' })).toBe(true);
      expect(isWaitingForInput({ ...createInitialState(), currentStep: 'context7-query' })).toBe(true);
      expect(isWaitingForInput({ ...createInitialState(), currentStep: 'context7-results' })).toBe(true);
    });

    it('isProcessingStep should return true for processing steps', () => {
      expect(isProcessingStep({ ...createInitialState(), currentStep: 'context7-fetch' })).toBe(true);
      expect(isProcessingStep({ ...createInitialState(), currentStep: 'generation' })).toBe(true);
      expect(isProcessingStep({ ...createInitialState(), currentStep: 'source-selection' })).toBe(false);
    });
  });

  describe('getResearchSummary', () => {
    it('should count packages and docs', () => {
      const mockDoc: Context7Documentation = {
        packageId: '/npm/test',
        packageName: 'test',
        version: '1.0.0',
        fetchedAt: new Date().toISOString(),
        content: 'test content',
        sections: [
          {
            title: 'API',
            type: 'api',
            content: 'api content',
            codeBlocks: [
              { language: 'typescript', code: 'const x = 1;', context: 'example' },
              { language: 'typescript', code: 'const y = 2;', context: 'example' },
            ],
          },
          {
            title: 'Guide',
            type: 'guide',
            content: 'guide content',
            codeBlocks: [{ language: 'typescript', code: 'const z = 3;', context: 'example' }],
          },
        ],
      };

      const state: InteractiveState = {
        ...createInitialState(),
        context7State: {
          query: 'test',
          searchResults: [],
          selectedPackageIds: ['/npm/test'],
          fetchedDocs: [mockDoc],
          searchHistory: ['test'],
        },
      };

      const summary = getResearchSummary(state);

      expect(summary.context7Packages).toBe(1);
      expect(summary.context7Docs).toBe(1);
      expect(summary.totalSections).toBe(2);
      expect(summary.totalCodeBlocks).toBe(3);
    });
  });
});

// ============================================================================
// Question Generation Tests
// ============================================================================

describe('interactive-questions', () => {
  describe('getSourceSelectionQuestion', () => {
    it('should return multi-select question with 3 source options', () => {
      const question = getSourceSelectionQuestion();

      expect(question.step).toBe('source-selection');
      expect(question.multiSelect).toBe(true);
      expect(question.options).toHaveLength(3);
      expect(question.options.map(o => o.value)).toContain('codebase');
      expect(question.options.map(o => o.value)).toContain('context7');
      expect(question.options.map(o => o.value)).toContain('web');
    });
  });

  describe('getContext7QueryQuestion', () => {
    it('should extract hint from skill name', () => {
      const question = getContext7QueryQuestion('jira-integration', []);

      expect(question.step).toBe('context7-query');
      expect(question.multiSelect).toBe(false);
      expect(question.allowCustomInput).toBe(true);
      // Should have 'jira' as hint from skill name
      expect(question.options.some(o => o.value === 'jira')).toBe(true);
    });

    it('should filter out hint if already in search history', () => {
      const question = getContext7QueryQuestion('jira-integration', ['jira']);

      // 'jira' should be filtered out since it's in search history
      const jiraOptions = question.options.filter(o => o.value === 'jira');
      expect(jiraOptions).toHaveLength(0);
    });

    it('should show retry message if search history exists', () => {
      const question = getContext7QueryQuestion('jira-integration', ['jira-api']);

      expect(question.question).toContain('didn\'t find what you needed');
    });

    it('should always include Enter search term option', () => {
      const question = getContext7QueryQuestion('fastly-integration', []);

      expect(question.options.some(o => o.value === '__custom__')).toBe(true);
    });

    it('should handle skill names with multiple generic suffixes', () => {
      const question = getContext7QueryQuestion('aws-sdk-client-integration', []);

      // Should extract 'aws' (first meaningful part)
      expect(question.options.some(o => o.value === 'aws')).toBe(true);
    });
  });

  describe('getContext7ResultsQuestion', () => {
    const mockPackages: Context7Package[] = [
      {
        id: '/npm/jira-api',
        name: 'jira-api',
        version: '1.0.0',
        pageCount: 10,
        description: 'Jira API client',
        status: 'recommended',
      },
      {
        id: '/npm/jira-deprecated',
        name: 'jira-deprecated',
        version: '0.5.0',
        pageCount: 5,
        description: 'Old Jira client',
        status: 'deprecated',
      },
    ];

    it('should create options from packages', () => {
      const question = getContext7ResultsQuestion(mockPackages, 'jira');

      expect(question.step).toBe('context7-results');
      expect(question.multiSelect).toBe(true);
      // Should have package options plus action options
      expect(question.options.length).toBeGreaterThan(2);
    });

    it('should include search-again and skip actions', () => {
      const question = getContext7ResultsQuestion(mockPackages, 'jira');

      const hasSearchAgain = question.options.some(o => o.value === SEARCH_AGAIN_VALUE);
      const hasSkip = question.options.some(o => o.value === SKIP_VALUE);

      expect(hasSearchAgain).toBe(true);
      expect(hasSkip).toBe(true);
    });

    it('should show deprecated status in label', () => {
      const question = getContext7ResultsQuestion(mockPackages, 'jira');

      const deprecatedOption = question.options.find(o => o.value === '/npm/jira-deprecated');
      expect(deprecatedOption?.label).toContain('DEPRECATED');
    });

    it('should handle empty results', () => {
      const question = getContext7ResultsQuestion([], 'unknown-query');

      expect(question.question).toContain('No packages found');
    });
  });

  describe('toAskUserQuestionFormat', () => {
    it('should convert to AskUserQuestion format', () => {
      const question = getSourceSelectionQuestion();
      const formatted = toAskUserQuestionFormat(question);

      expect(formatted.question).toBe(question.question);
      expect(formatted.header).toBe(question.header);
      expect(formatted.multiSelect).toBe(question.multiSelect);
      expect(formatted.options).toHaveLength(question.options.length);
    });
  });

  describe('parseUserSelection', () => {
    it('should map labels back to values', () => {
      const question = getSourceSelectionQuestion();
      const selectedLabels = ['Context7 (library docs)', 'Codebase research'];

      const result = parseUserSelection(question, selectedLabels);

      expect(result.selectedValues).toContain('context7');
      expect(result.selectedValues).toContain('codebase');
    });

    it('should include custom input if provided', () => {
      const question = getContext7QueryQuestion('test-integration', []);

      const result = parseUserSelection(question, [], '@custom/package');

      expect(result.customInput).toBe('@custom/package');
    });
  });
});

// ============================================================================
// Smart Keywords Tests
// ============================================================================

describe('smart-keywords', () => {
  describe('extractSmartKeywords', () => {
    it('should filter out action words', () => {
      const keywords = extractSmartKeywords('Create a skill for jira integration');

      expect(keywords).not.toContain('create');
      expect(keywords).not.toContain('skill');
      expect(keywords).not.toContain('integration');
    });

    it('should keep library/service names', () => {
      const keywords = extractSmartKeywords('Create a skill for jira cloud integration');

      expect(keywords).toContain('jira');
      expect(keywords).toContain('cloud');
    });

    it('should prioritize known service names', () => {
      const keywords = extractSmartKeywords('Build slack notification system');

      // 'slack' should be early in the list since it's a known service
      const slackIndex = keywords.indexOf('slack');
      expect(slackIndex).toBeLessThan(3);
    });

    it('should handle TanStack Query prompt', () => {
      const keywords = extractSmartKeywords('Create a skill for TanStack Query state management');

      expect(keywords).toContain('tanstack');
      expect(keywords).toContain('query');
      expect(keywords).not.toContain('create');
      expect(keywords).not.toContain('skill');
    });

    it('should filter out project-specific words', () => {
      const keywords = extractSmartKeywords('Build chariot integration for jira');

      expect(keywords).not.toContain('chariot');
      expect(keywords).toContain('jira');
    });

    it('should handle hyphenated names', () => {
      const keywords = extractSmartKeywords('Create react-query wrapper');

      expect(keywords.some(k => k.includes('react-query') || (k.includes('react') && keywords.includes('query')))).toBe(true);
    });
  });

  describe('generateSearchSuggestions', () => {
    it('should return 1-4 suggestions', () => {
      const suggestions = generateSearchSuggestions('Create jira integration skill');

      expect(suggestions.length).toBeGreaterThanOrEqual(1);
      expect(suggestions.length).toBeLessThanOrEqual(4);
    });

    it('should prioritize main keyword', () => {
      const suggestions = generateSearchSuggestions('Build slack integration');

      expect(suggestions[0]).toBe('slack');
    });

    it('should include combined terms', () => {
      const suggestions = generateSearchSuggestions('Create jira cloud api');

      // Should have a combined suggestion
      const hasCombined = suggestions.some(s => s.includes(' '));
      expect(hasCombined).toBe(true);
    });

    it('should add api variant for known services', () => {
      const suggestions = generateSearchSuggestions('Build github connector');

      // For known services, should suggest -api variant
      expect(suggestions.some(s => s.includes('github'))).toBe(true);
    });

    it('should return empty for no useful keywords', () => {
      const suggestions = generateSearchSuggestions('create build make install');

      // All words are filtered out
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('extractBasicKeywords', () => {
    it('should only filter stop words', () => {
      const keywords = extractBasicKeywords('Create a skill for jira cloud');

      // Basic extraction keeps more words but filters stop words (including 'integration')
      expect(keywords).toContain('create');
      expect(keywords).toContain('skill');
      expect(keywords).toContain('jira');
      expect(keywords).toContain('cloud');
      expect(keywords).not.toContain('a');
      expect(keywords).not.toContain('for');
    });
  });
});

// ============================================================================
// Integration Flow Tests
// ============================================================================

describe('interactive workflow integration', () => {
  it('should complete full context7-only workflow', () => {
    // Start
    let state = createInitialState();
    expect(state.currentStep).toBe('source-selection');

    // Select only context7
    state = processAnswer(state, {
      step: 'source-selection',
      selectedOptions: ['context7'],
    });
    expect(state.currentStep).toBe('context7-query');
    expect(state.selectedSources.context7).toBe(true);

    // Enter query
    state = processAnswer(state, {
      step: 'context7-query',
      selectedOptions: ['jira'],
    });
    expect(state.currentStep).toBe('context7-results');
    expect(state.context7State.query).toBe('jira');

    // Select packages
    state = processAnswer(state, {
      step: 'context7-results',
      selectedOptions: ['/npm/jira-api'],
    });
    expect(state.currentStep).toBe('context7-fetch');
    expect(state.context7State.selectedPackageIds).toContain('/npm/jira-api');
  });

  it('should handle search-again flow', () => {
    let state = createInitialState();

    // Select context7
    state = processAnswer(state, {
      step: 'source-selection',
      selectedOptions: ['context7'],
    });

    // Enter query
    state = processAnswer(state, {
      step: 'context7-query',
      selectedOptions: ['jira'],
    });

    // Choose to search again
    state = processAnswer(state, {
      step: 'context7-results',
      selectedOptions: [SEARCH_AGAIN_VALUE],
    });

    expect(state.currentStep).toBe('context7-query');
    expect(state.context7State.searchHistory).toContain('jira');
  });

  it('should handle skip flow', () => {
    let state = createInitialState();

    // Select context7 and codebase
    state = processAnswer(state, {
      step: 'source-selection',
      selectedOptions: ['context7', 'codebase'],
    });

    // Enter query
    state = processAnswer(state, {
      step: 'context7-query',
      selectedOptions: ['unknown-lib'],
    });

    // Skip context7
    state = processAnswer(state, {
      step: 'context7-results',
      selectedOptions: [SKIP_VALUE],
    });

    // Should move to codebase since it was selected
    expect(state.currentStep).toBe('codebase-query');
  });

  it('should go to generation when all sources skipped', () => {
    let state = createInitialState();

    // Select only context7
    state = processAnswer(state, {
      step: 'source-selection',
      selectedOptions: ['context7'],
    });

    state = processAnswer(state, {
      step: 'context7-query',
      selectedOptions: ['unknown'],
    });

    // Skip context7
    state = processAnswer(state, {
      step: 'context7-results',
      selectedOptions: [SKIP_VALUE],
    });

    // Should go to generation since no more sources
    expect(state.currentStep).toBe('generation');
  });
});
