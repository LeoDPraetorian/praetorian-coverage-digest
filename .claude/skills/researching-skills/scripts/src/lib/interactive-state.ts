// src/lib/interactive-state.ts
/**
 * State management for interactive research workflow
 *
 * This module provides functions to create, update, and navigate
 * through the interactive workflow state machine.
 */

import type {
  InteractiveState,
  InteractiveStep,
  InteractiveAnswer,
  SelectedSources,
  Context7State,
  CodebaseState,
  WebState,
} from './interactive-types.js';
import { SEARCH_AGAIN_VALUE, SKIP_VALUE } from './interactive-types.js';

// ============================================================================
// State Factory
// ============================================================================

/**
 * Create initial state for a new interactive session
 */
export function createInitialState(): InteractiveState {
  return {
    currentStep: 'source-selection',
    selectedSources: {
      codebase: false,
      context7: false,
      web: false,
    },
    context7State: createInitialContext7State(),
    codebaseState: createInitialCodebaseState(),
    webState: createInitialWebState(),
  };
}

/**
 * Create initial Context7 state
 */
export function createInitialContext7State(): Context7State {
  return {
    query: null,
    searchResults: [],
    selectedPackageIds: [],
    fetchedDocs: [],
    searchHistory: [],
  };
}

/**
 * Create initial codebase state
 */
export function createInitialCodebaseState(): CodebaseState {
  return {
    query: null,
  };
}

/**
 * Create initial web state
 */
export function createInitialWebState(): WebState {
  return {
    query: null,
  };
}

// ============================================================================
// State Transitions
// ============================================================================

/**
 * Process an answer and return updated state
 *
 * @param state - Current state
 * @param answer - User's answer
 * @returns Updated state with new currentStep
 */
export function processAnswer(
  state: InteractiveState,
  answer: InteractiveAnswer
): InteractiveState {
  // Clone state to avoid mutations
  const newState: InteractiveState = {
    ...state,
    selectedSources: { ...state.selectedSources },
    context7State: { ...state.context7State, searchHistory: [...state.context7State.searchHistory] },
    codebaseState: { ...state.codebaseState },
    webState: { ...state.webState },
  };

  switch (answer.step) {
    case 'source-selection':
      return processSourceSelection(newState, answer);

    case 'context7-query':
      return processContext7Query(newState, answer);

    case 'context7-results':
      return processContext7Results(newState, answer);

    default:
      // Unknown step, return unchanged
      return newState;
  }
}

/**
 * Process source selection answer
 */
function processSourceSelection(
  state: InteractiveState,
  answer: InteractiveAnswer
): InteractiveState {
  // Update selected sources
  state.selectedSources = {
    codebase: answer.selectedOptions.includes('codebase'),
    context7: answer.selectedOptions.includes('context7'),
    web: answer.selectedOptions.includes('web'),
  };

  // Determine next step based on selections
  state.currentStep = getNextStepAfterSourceSelection(state.selectedSources);

  return state;
}

/**
 * Process Context7 query answer
 */
function processContext7Query(
  state: InteractiveState,
  answer: InteractiveAnswer
): InteractiveState {
  // Get query from custom input or selected option
  const query = answer.customInput || answer.selectedOptions[0];

  if (query) {
    state.context7State.query = query;
    state.context7State.searchHistory.push(query);
    state.currentStep = 'context7-results';
  }

  return state;
}

/**
 * Process Context7 results answer
 */
function processContext7Results(
  state: InteractiveState,
  answer: InteractiveAnswer
): InteractiveState {
  // Check for special actions
  if (answer.action === 'search-again' || answer.selectedOptions.includes(SEARCH_AGAIN_VALUE)) {
    // Go back to query step
    state.currentStep = 'context7-query';
    return state;
  }

  if (answer.action === 'skip' || answer.selectedOptions.includes(SKIP_VALUE)) {
    // Skip Context7 and move to next source
    state.currentStep = getNextStepAfterContext7(state.selectedSources);
    return state;
  }

  // User selected packages - filter out special values
  const selectedPackages = answer.selectedOptions.filter(
    (opt) => opt !== SEARCH_AGAIN_VALUE && opt !== SKIP_VALUE
  );

  if (selectedPackages.length > 0) {
    state.context7State.selectedPackageIds = selectedPackages;
    state.currentStep = 'context7-fetch';
  }

  return state;
}

// ============================================================================
// Step Navigation
// ============================================================================

/**
 * Determine next step after source selection
 */
export function getNextStepAfterSourceSelection(sources: SelectedSources): InteractiveStep {
  if (sources.context7) {
    return 'context7-query';
  }
  if (sources.codebase) {
    return 'codebase-query';
  }
  if (sources.web) {
    return 'web-query';
  }
  // No sources selected, go straight to generation
  return 'generation';
}

/**
 * Determine next step after Context7 is complete
 */
export function getNextStepAfterContext7(sources: SelectedSources): InteractiveStep {
  if (sources.codebase) {
    return 'codebase-query';
  }
  if (sources.web) {
    return 'web-query';
  }
  return 'generation';
}

/**
 * Determine next step after codebase is complete
 */
export function getNextStepAfterCodebase(sources: SelectedSources): InteractiveStep {
  if (sources.web) {
    return 'web-query';
  }
  return 'generation';
}

/**
 * Determine next step after web is complete
 */
export function getNextStepAfterWeb(): InteractiveStep {
  return 'generation';
}

/**
 * Get the next step in the workflow based on current state
 *
 * This is a general-purpose function that determines what comes next
 * based on where we are and what sources are selected.
 */
export function getNextStep(state: InteractiveState): InteractiveStep {
  const { currentStep, selectedSources } = state;

  switch (currentStep) {
    case 'source-selection':
      return getNextStepAfterSourceSelection(selectedSources);

    case 'context7-query':
      return 'context7-results';

    case 'context7-results':
      return 'context7-fetch';

    case 'context7-fetch':
      return getNextStepAfterContext7(selectedSources);

    case 'codebase-query':
      return 'codebase-results';

    case 'codebase-results':
      return getNextStepAfterCodebase(selectedSources);

    case 'web-query':
      return 'web-results';

    case 'web-results':
      return getNextStepAfterWeb();

    case 'generation':
      return 'complete';

    case 'complete':
      return 'complete';

    default:
      return 'generation';
  }
}

// ============================================================================
// State Queries
// ============================================================================

/**
 * Check if the workflow is complete
 */
export function isWorkflowComplete(state: InteractiveState): boolean {
  return state.currentStep === 'complete';
}

/**
 * Check if we're waiting for user input
 */
export function isWaitingForInput(state: InteractiveState): boolean {
  const inputSteps: InteractiveStep[] = [
    'source-selection',
    'context7-query',
    'context7-results',
    'codebase-query',
    'codebase-results',
    'web-query',
    'web-results',
  ];
  return inputSteps.includes(state.currentStep);
}

/**
 * Check if we're in a processing step (no user input needed)
 */
export function isProcessingStep(state: InteractiveState): boolean {
  const processingSteps: InteractiveStep[] = ['context7-fetch', 'generation'];
  return processingSteps.includes(state.currentStep);
}

/**
 * Get a summary of what research has been collected
 */
export function getResearchSummary(state: InteractiveState): {
  context7Packages: number;
  context7Docs: number;
  totalSections: number;
  totalCodeBlocks: number;
} {
  const { context7State } = state;

  let totalSections = 0;
  let totalCodeBlocks = 0;

  for (const doc of context7State.fetchedDocs) {
    totalSections += doc.sections.length;
    for (const section of doc.sections) {
      totalCodeBlocks += section.codeBlocks.length;
    }
  }

  return {
    context7Packages: context7State.selectedPackageIds.length,
    context7Docs: context7State.fetchedDocs.length,
    totalSections,
    totalCodeBlocks,
  };
}
