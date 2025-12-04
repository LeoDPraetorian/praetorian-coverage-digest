// src/lib/__tests__/research-state.unit.test.ts
/**
 * Unit tests for research state management
 *
 * This module handles state serialization/deserialization and workflow
 * tracking for the skill-manager → researching-skills integration.
 *
 * TDD: RED Phase - these tests should FAIL until implementation exists.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the module under test (will fail until implemented)
import {
  createResearchWorkflowState,
  serializeResearchState,
  deserializeResearchState,
  isResearchInProgress,
  isResearchComplete,
  updateResearchPhase,
  mergeInteractiveState,
  type CreateWithResearchState,
  type ResearchPhase,
} from '../research-state.js';

// Import interactive types from researching-skills for testing
import type { InteractiveState } from '../../../../../researching-skills/scripts/src/lib/interactive-types.js';

// ============================================================================
// State Creation Tests
// ============================================================================

describe('createResearchWorkflowState', () => {
  it('should create initial state with skill metadata', () => {
    const state = createResearchWorkflowState({
      name: 'test-skill',
      description: 'Use when testing features',
      location: 'library',
      category: 'development/integrations',
      skillType: 'integration',
    });

    expect(state.name).toBe('test-skill');
    expect(state.description).toBe('Use when testing features');
    expect(state.location).toBe('library');
    expect(state.category).toBe('development/integrations');
    expect(state.skillType).toBe('integration');
    expect(state.researchPhase).toBe('not-started');
    expect(state.researchState).toBeUndefined();
  });

  it('should create state for core skill without category', () => {
    const state = createResearchWorkflowState({
      name: 'core-skill',
      description: 'Use when doing core tasks',
      location: 'core',
      skillType: 'process',
    });

    expect(state.location).toBe('core');
    expect(state.category).toBeUndefined();
    expect(state.researchPhase).toBe('not-started');
  });

  it('should default skillType to process if not provided', () => {
    const state = createResearchWorkflowState({
      name: 'simple-skill',
      description: 'Simple skill',
      location: 'core',
    });

    expect(state.skillType).toBe('process');
  });
});

// ============================================================================
// Serialization Tests
// ============================================================================

describe('serializeResearchState', () => {
  it('should serialize state to JSON string', () => {
    const state: CreateWithResearchState = {
      name: 'test-skill',
      description: 'Test description',
      location: 'library',
      category: 'development/frontend',
      skillType: 'library',
      researchPhase: 'in-progress',
    };

    const serialized = serializeResearchState(state);

    expect(typeof serialized).toBe('string');
    expect(() => JSON.parse(serialized)).not.toThrow();
  });

  it('should include all properties in serialized output', () => {
    const state: CreateWithResearchState = {
      name: 'full-skill',
      description: 'Full description',
      location: 'library',
      category: 'testing',
      skillType: 'integration',
      researchPhase: 'complete',
    };

    const serialized = serializeResearchState(state);
    const parsed = JSON.parse(serialized);

    expect(parsed.name).toBe('full-skill');
    expect(parsed.description).toBe('Full description');
    expect(parsed.location).toBe('library');
    expect(parsed.category).toBe('testing');
    expect(parsed.skillType).toBe('integration');
    expect(parsed.researchPhase).toBe('complete');
  });

  it('should handle state with research state object', () => {
    const mockInteractiveState: Partial<InteractiveState> = {
      currentStep: 'context7-query',
      selectedSources: { codebase: true, context7: true, web: false },
    };

    const state: CreateWithResearchState = {
      name: 'researched-skill',
      description: 'With research',
      location: 'library',
      category: 'development',
      skillType: 'library',
      researchPhase: 'in-progress',
      researchState: mockInteractiveState as InteractiveState,
    };

    const serialized = serializeResearchState(state);
    const parsed = JSON.parse(serialized);

    expect(parsed.researchState).toBeDefined();
    expect(parsed.researchState.currentStep).toBe('context7-query');
  });
});

describe('deserializeResearchState', () => {
  it('should deserialize valid JSON string', () => {
    const json = JSON.stringify({
      name: 'test-skill',
      description: 'Test',
      location: 'core',
      skillType: 'process',
      researchPhase: 'not-started',
    });

    const state = deserializeResearchState(json);

    expect(state.name).toBe('test-skill');
    expect(state.location).toBe('core');
    expect(state.researchPhase).toBe('not-started');
  });

  it('should throw on invalid JSON', () => {
    expect(() => deserializeResearchState('not valid json')).toThrow();
  });

  it('should throw on missing required fields', () => {
    const json = JSON.stringify({ name: 'incomplete' });

    expect(() => deserializeResearchState(json)).toThrow(/description/i);
  });

  it('should throw on invalid location value', () => {
    const json = JSON.stringify({
      name: 'bad-skill',
      description: 'Bad location',
      location: 'invalid',
      skillType: 'process',
      researchPhase: 'not-started',
    });

    expect(() => deserializeResearchState(json)).toThrow(/location/i);
  });

  it('should throw on invalid research phase', () => {
    const json = JSON.stringify({
      name: 'bad-skill',
      description: 'Bad phase',
      location: 'core',
      skillType: 'process',
      researchPhase: 'invalid-phase',
    });

    expect(() => deserializeResearchState(json)).toThrow(/researchPhase/i);
  });

  it('should preserve research state object', () => {
    const json = JSON.stringify({
      name: 'with-research',
      description: 'Has research',
      location: 'library',
      category: 'dev',
      skillType: 'library',
      researchPhase: 'in-progress',
      researchState: {
        currentStep: 'context7-results',
        selectedSources: { codebase: false, context7: true, web: false },
      },
    });

    const state = deserializeResearchState(json);

    expect(state.researchState).toBeDefined();
    expect(state.researchState?.currentStep).toBe('context7-results');
  });
});

// ============================================================================
// State Query Tests
// ============================================================================

describe('isResearchInProgress', () => {
  it('should return true when phase is in-progress', () => {
    const state: CreateWithResearchState = {
      name: 'test',
      description: 'test',
      location: 'core',
      skillType: 'process',
      researchPhase: 'in-progress',
    };

    expect(isResearchInProgress(state)).toBe(true);
  });

  it('should return false when phase is not-started', () => {
    const state: CreateWithResearchState = {
      name: 'test',
      description: 'test',
      location: 'core',
      skillType: 'process',
      researchPhase: 'not-started',
    };

    expect(isResearchInProgress(state)).toBe(false);
  });

  it('should return false when phase is complete', () => {
    const state: CreateWithResearchState = {
      name: 'test',
      description: 'test',
      location: 'core',
      skillType: 'process',
      researchPhase: 'complete',
    };

    expect(isResearchInProgress(state)).toBe(false);
  });

  it('should return false when phase is skipped', () => {
    const state: CreateWithResearchState = {
      name: 'test',
      description: 'test',
      location: 'core',
      skillType: 'process',
      researchPhase: 'skipped',
    };

    expect(isResearchInProgress(state)).toBe(false);
  });
});

describe('isResearchComplete', () => {
  it('should return true when phase is complete', () => {
    const state: CreateWithResearchState = {
      name: 'test',
      description: 'test',
      location: 'core',
      skillType: 'process',
      researchPhase: 'complete',
    };

    expect(isResearchComplete(state)).toBe(true);
  });

  it('should return true when phase is skipped', () => {
    const state: CreateWithResearchState = {
      name: 'test',
      description: 'test',
      location: 'core',
      skillType: 'process',
      researchPhase: 'skipped',
    };

    expect(isResearchComplete(state)).toBe(true);
  });

  it('should return false when phase is in-progress', () => {
    const state: CreateWithResearchState = {
      name: 'test',
      description: 'test',
      location: 'core',
      skillType: 'process',
      researchPhase: 'in-progress',
    };

    expect(isResearchComplete(state)).toBe(false);
  });

  it('should return false when phase is not-started', () => {
    const state: CreateWithResearchState = {
      name: 'test',
      description: 'test',
      location: 'core',
      skillType: 'process',
      researchPhase: 'not-started',
    };

    expect(isResearchComplete(state)).toBe(false);
  });
});

// ============================================================================
// State Update Tests
// ============================================================================

describe('updateResearchPhase', () => {
  it('should update phase to in-progress', () => {
    const state: CreateWithResearchState = {
      name: 'test',
      description: 'test',
      location: 'core',
      skillType: 'process',
      researchPhase: 'not-started',
    };

    const updated = updateResearchPhase(state, 'in-progress');

    expect(updated.researchPhase).toBe('in-progress');
    // Should not mutate original
    expect(state.researchPhase).toBe('not-started');
  });

  it('should update phase to complete', () => {
    const state: CreateWithResearchState = {
      name: 'test',
      description: 'test',
      location: 'core',
      skillType: 'process',
      researchPhase: 'in-progress',
    };

    const updated = updateResearchPhase(state, 'complete');

    expect(updated.researchPhase).toBe('complete');
  });

  it('should update phase to skipped', () => {
    const state: CreateWithResearchState = {
      name: 'test',
      description: 'test',
      location: 'core',
      skillType: 'process',
      researchPhase: 'not-started',
    };

    const updated = updateResearchPhase(state, 'skipped');

    expect(updated.researchPhase).toBe('skipped');
  });

  it('should preserve all other state properties', () => {
    const state: CreateWithResearchState = {
      name: 'preserve-test',
      description: 'preserve description',
      location: 'library',
      category: 'my-category',
      skillType: 'integration',
      researchPhase: 'not-started',
    };

    const updated = updateResearchPhase(state, 'in-progress');

    expect(updated.name).toBe('preserve-test');
    expect(updated.description).toBe('preserve description');
    expect(updated.location).toBe('library');
    expect(updated.category).toBe('my-category');
    expect(updated.skillType).toBe('integration');
  });
});

describe('mergeInteractiveState', () => {
  it('should merge interactive state into workflow state', () => {
    const workflowState: CreateWithResearchState = {
      name: 'test',
      description: 'test',
      location: 'core',
      skillType: 'process',
      researchPhase: 'in-progress',
    };

    const interactiveState: Partial<InteractiveState> = {
      currentStep: 'context7-query',
      selectedSources: { codebase: true, context7: true, web: false },
    };

    const merged = mergeInteractiveState(
      workflowState,
      interactiveState as InteractiveState
    );

    expect(merged.researchState).toBeDefined();
    expect(merged.researchState?.currentStep).toBe('context7-query');
    expect(merged.researchState?.selectedSources.codebase).toBe(true);
  });

  it('should not mutate original workflow state', () => {
    const workflowState: CreateWithResearchState = {
      name: 'test',
      description: 'test',
      location: 'core',
      skillType: 'process',
      researchPhase: 'in-progress',
    };

    const interactiveState: Partial<InteractiveState> = {
      currentStep: 'generation',
    };

    mergeInteractiveState(workflowState, interactiveState as InteractiveState);

    expect(workflowState.researchState).toBeUndefined();
  });

  it('should auto-update phase to complete when interactive step is complete', () => {
    const workflowState: CreateWithResearchState = {
      name: 'test',
      description: 'test',
      location: 'core',
      skillType: 'process',
      researchPhase: 'in-progress',
    };

    const interactiveState: Partial<InteractiveState> = {
      currentStep: 'complete',
    };

    const merged = mergeInteractiveState(
      workflowState,
      interactiveState as InteractiveState
    );

    expect(merged.researchPhase).toBe('complete');
  });

  it('should preserve existing phase when interactive step is not complete', () => {
    const workflowState: CreateWithResearchState = {
      name: 'test',
      description: 'test',
      location: 'core',
      skillType: 'process',
      researchPhase: 'in-progress',
    };

    const interactiveState: Partial<InteractiveState> = {
      currentStep: 'context7-results',
    };

    const merged = mergeInteractiveState(
      workflowState,
      interactiveState as InteractiveState
    );

    expect(merged.researchPhase).toBe('in-progress');
  });
});

// ============================================================================
// Type Guard Tests
// ============================================================================

describe('type guards', () => {
  it('ResearchPhase should only accept valid values', () => {
    // These should compile (type checking)
    const validPhases: ResearchPhase[] = [
      'not-started',
      'in-progress',
      'complete',
      'skipped',
    ];

    expect(validPhases).toHaveLength(4);
  });
});
