// src/lib/interactive-types.ts
/**
 * Type definitions for interactive research workflow
 *
 * This module defines the types needed for step-by-step user interaction
 * during skill research and creation.
 */

import type { Context7Package, Context7Documentation } from './types.js';

// ============================================================================
// Flow State Types
// ============================================================================

/**
 * Steps in the interactive workflow
 */
export type InteractiveStep =
  | 'source-selection'
  | 'context7-query'
  | 'context7-results'
  | 'context7-fetch'
  | 'codebase-query' // Future
  | 'codebase-results' // Future
  | 'web-query' // Future
  | 'web-results' // Future
  | 'generation'
  | 'complete';

/**
 * Which research sources the user has selected
 */
export interface SelectedSources {
  codebase: boolean;
  context7: boolean;
  web: boolean;
}

/**
 * State for Context7 research phase
 */
export interface Context7State {
  /** Current search query */
  query: string | null;
  /** Results from last search */
  searchResults: Context7Package[];
  /** Package IDs selected by user */
  selectedPackageIds: string[];
  /** Documentation fetched for selected packages */
  fetchedDocs: Context7Documentation[];
  /** History of queries tried (for suggestions) */
  searchHistory: string[];
}

/**
 * State for codebase research phase (future)
 */
export interface CodebaseState {
  query: string | null;
  // Results will be added when implementing codebase interactive flow
}

/**
 * State for web research phase (future)
 */
export interface WebState {
  query: string | null;
  // Results will be added when implementing web interactive flow
}

/**
 * Complete state for the interactive workflow
 */
export interface InteractiveState {
  /** Current step in the workflow */
  currentStep: InteractiveStep;
  /** Which research sources are enabled */
  selectedSources: SelectedSources;
  /** Context7 research state */
  context7State: Context7State;
  /** Codebase research state (future) */
  codebaseState: CodebaseState;
  /** Web research state (future) */
  webState: WebState;
}

// ============================================================================
// Question Types (for AskUserQuestion integration)
// ============================================================================

/**
 * An option in a question
 */
export interface QuestionOption {
  /** Display label shown to user */
  label: string;
  /** Description/help text */
  description: string;
  /** Programmatic value (defaults to label if not specified) */
  value?: string;
}

/**
 * A question to present to the user
 */
export interface InteractiveQuestion {
  /** Which step this question is for */
  step: InteractiveStep;
  /** The question text */
  question: string;
  /** Short header/label for the question */
  header: string;
  /** Available options */
  options: QuestionOption[];
  /** Whether multiple options can be selected */
  multiSelect: boolean;
  /** Whether user can type a custom value */
  allowCustomInput?: boolean;
  /** Placeholder for custom input field */
  customInputPlaceholder?: string;
}

/**
 * User's answer to a question
 */
export interface InteractiveAnswer {
  /** Which step this answer is for */
  step: InteractiveStep;
  /** Selected option values (labels or explicit values) */
  selectedOptions: string[];
  /** Custom input if user typed their own value */
  customInput?: string;
  /** Special action (for results screens) */
  action?: 'select' | 'search-again' | 'skip';
}

// ============================================================================
// Special Values for Results Questions
// ============================================================================

/** Special value indicating user wants to search again */
export const SEARCH_AGAIN_VALUE = '__search_again__';

/** Special value indicating user wants to skip this source */
export const SKIP_VALUE = '__skip__';

// ============================================================================
// Orchestrator Integration Types
// ============================================================================

/**
 * Options for interactive orchestration
 */
export interface InteractiveOrchestrateOptions {
  /** Skill name */
  name: string;
  /** Initial prompt describing the skill */
  prompt: string;
  /** Enable interactive mode */
  interactive: true;
  /** Current state (for continuing a flow) */
  interactiveState?: InteractiveState;
  /** Answer from previous question */
  interactiveAnswer?: InteractiveAnswer;
  /** Preview without writing files */
  dryRun?: boolean;
  /** Show detailed output */
  verbose?: boolean;
}

/**
 * Result from interactive orchestration
 */
export interface InteractiveOrchestrateResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Any errors that occurred */
  errors: string[];
  /** Any warnings */
  warnings: string[];
  /** Next question to present (if not complete) */
  nextQuestion?: InteractiveQuestion;
  /** Current state (for continuing the flow) */
  currentState?: InteractiveState;
  /** Whether the workflow is complete */
  isComplete: boolean;
  /** Output path (when complete) */
  outputPath?: string;
}
