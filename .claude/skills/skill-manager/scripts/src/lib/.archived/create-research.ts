// src/lib/create-research.ts
/**
 * Research mode integration for skill-manager create workflow
 *
 * This module handles the delegation to researching-skills orchestrator
 * for interactive research workflows during skill creation.
 *
 * Exports:
 * - handleResearchMode: Main handler for research workflow
 * - shouldOfferResearchMode: Check if skill type supports research
 * - createResearchModeQuestion: Generate mode selection question
 * - buildResearchOptions: Convert create options to orchestrator options
 */

import type {
  CreateOptionsWithResearch,
  CreateResultWithResearch,
  ResearchQuestion,
  ResearchSummary,
  SkillCategory,
} from './types.js';
import {
  createResearchWorkflowState,
  deserializeResearchState,
  serializeResearchState,
  mergeInteractiveState,
  type CreateWithResearchState,
} from './research-state.js';

// Import real types from researching-skills for proper integration
import type {
  InteractiveState as RealInteractiveState,
  InteractiveOrchestrateOptions as RealOrchestrateOptions,
  InteractiveOrchestrateResult as RealOrchestrateResult,
} from '../../../../researching-skills/scripts/src/lib/interactive-types.js';

// Simplified types for testing/mock interface (used by tests via setOrchestrator)
interface InteractiveState {
  currentStep: string;
  selectedSources?: { codebase: boolean; context7: boolean; web: boolean };
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

interface InteractiveQuestion {
  id: string;
  text: string;
  type: string;
  options?: { value: string; label: string; description?: string }[];
  placeholder?: string;
}

interface OrchestrateOptions {
  skillName: string;
  skillDescription: string;
  skillType: SkillCategory;
  state?: InteractiveState;
  answer?: { questionId: string; value: string | string[] };
}

interface OrchestrateResult {
  state: InteractiveState;
  // Store the real state for merging if available
  realState?: RealInteractiveState;
  question?: InteractiveQuestion;
  done: boolean;
}

// Orchestrator function type for dependency injection
type OrchestratorFn = (options: OrchestrateOptions) => Promise<OrchestrateResult>;

// Default orchestrator - dynamically imports the real one with adapter
let _orchestrator: OrchestratorFn | null = null;

/**
 * Adapter that wraps the real orchestrateInteractive to match our simplified types.
 * This allows tests to use mocks while production uses the real orchestrator.
 */
async function createOrchestratorAdapter(): Promise<OrchestratorFn> {
  const module = await import('../../../../researching-skills/scripts/src/orchestrator.js');
  const realOrchestrator = module.orchestrateInteractive;

  // Return adapter that converts between type systems
  return async (options: OrchestrateOptions): Promise<OrchestrateResult> => {
    // Convert our options to the real orchestrator's options
    const realOptions = {
      name: options.skillName,
      prompt: options.skillDescription,
      interactive: true as const,
      interactiveState: options.state ? {
        currentStep: options.state.currentStep as import('../../../../researching-skills/scripts/src/lib/interactive-types.js').InteractiveStep,
        selectedSources: options.state.selectedSources ?? { codebase: false, context7: false, web: false },
        context7State: {
          query: null,
          searchResults: [],
          selectedPackageIds: [],
          fetchedDocs: [],
          searchHistory: [],
        },
        codebaseState: { query: null },
        webState: { query: null },
      } : undefined,
      interactiveAnswer: options.answer ? {
        step: options.state?.currentStep as import('../../../../researching-skills/scripts/src/lib/interactive-types.js').InteractiveStep ?? 'source-selection',
        selectedOptions: Array.isArray(options.answer.value) ? options.answer.value : [options.answer.value],
      } : undefined,
    };

    // Call real orchestrator
    const realResult = await realOrchestrator(realOptions);

    // Convert result back to our simplified type, but preserve real state for merging
    return {
      state: {
        currentStep: realResult.currentState?.currentStep ?? 'complete',
        selectedSources: realResult.currentState?.selectedSources,
        context7Results: realResult.currentState?.context7State?.fetchedDocs?.length
          ? { highlights: realResult.currentState.context7State.fetchedDocs.map(d => d.content.substring(0, 200)) }
          : undefined,
      },
      // Preserve the real state for mergeInteractiveState
      realState: realResult.currentState,
      question: realResult.nextQuestion ? {
        id: realResult.nextQuestion.step,
        text: realResult.nextQuestion.question,
        type: realResult.nextQuestion.multiSelect ? 'multiselect' : 'select',
        options: realResult.nextQuestion.options.map(opt => ({
          value: opt.value ?? opt.label,
          label: opt.label,
          description: opt.description,
        })),
      } : undefined,
      done: realResult.isComplete,
    };
  };
}

async function getOrchestrator(): Promise<OrchestratorFn> {
  if (!_orchestrator) {
    _orchestrator = await createOrchestratorAdapter();
  }
  return _orchestrator;
}

/**
 * Set orchestrator for testing (dependency injection)
 */
export function setOrchestrator(fn: OrchestratorFn | null): void {
  _orchestrator = fn;
}

// ============================================================================
// Types
// ============================================================================

/**
 * Options passed to researching-skills orchestrator
 */
export interface ResearchOrchestratorOptions {
  skillName: string;
  skillDescription: string;
  skillType: SkillCategory;
  category?: string;
}

/**
 * Result type for handleResearchMode
 */
export type ResearchModeResult = CreateResultWithResearch;

// ============================================================================
// Mode Selection
// ============================================================================

/**
 * Determine if research mode should be offered for this skill type
 *
 * - library: Yes - can search Context7 for docs
 * - integration: Yes - can explore codebase for patterns
 * - process: Yes - can find similar process skills
 * - tool-wrapper: No - follows strict MCP wrapper templates
 */
export function shouldOfferResearchMode(skillType: SkillCategory): boolean {
  return skillType !== 'tool-wrapper';
}

/**
 * Create the mode selection question
 */
export function createResearchModeQuestion(): ResearchQuestion {
  return {
    id: 'createMode',
    question: 'How would you like to create this skill?',
    type: 'select',
    options: [
      {
        value: 'quick',
        label: 'Quick',
        description: 'Generate from template immediately - fill in details manually',
      },
      {
        value: 'research',
        label: 'Research',
        description: 'Interactive research workflow - explore codebase, Context7 docs, web resources',
      },
    ],
    required: true,
  };
}

// ============================================================================
// Option Conversion
// ============================================================================

/**
 * Convert create options to orchestrator options
 */
export function buildResearchOptions(
  options: CreateOptionsWithResearch
): ResearchOrchestratorOptions {
  return {
    skillName: options.name,
    skillDescription: options.description,
    skillType: options.skillType ?? 'process',
    category: options.category,
  };
}

/**
 * Build OrchestrateOptions for the researching-skills orchestrator
 */
function buildOrchestrateOptions(
  options: CreateOptionsWithResearch,
  state?: InteractiveState,
  answer?: { questionId: string; value: string | string[] }
): OrchestrateOptions {
  return {
    skillName: options.name,
    skillDescription: options.description,
    skillType: options.skillType ?? 'process',
    state,
    answer,
  };
}

// ============================================================================
// Question Conversion
// ============================================================================

/**
 * Convert orchestrator question to create result question
 */
function convertQuestion(question: InteractiveQuestion): ResearchQuestion {
  return {
    id: question.id,
    question: question.text,
    type: question.type as 'select' | 'input' | 'multiselect',
    options: question.options?.map(opt => ({
      value: opt.value,
      label: opt.label,
      description: opt.description,
    })),
    placeholder: question.placeholder,
    required: true,
  };
}

/**
 * Get next step instructions based on current step
 */
function getNextStepInstructions(currentStep: string): string {
  const stepInstructions: Record<string, string> = {
    'source-selection': 'Select which research sources to use',
    'context7-query': 'Enter your search query for context7 documentation',
    'context7-results': 'Review and select relevant context7 results',
    'context7-fetch': 'Fetching selected documentation...',
    'codebase-query': 'Enter keywords to search the codebase',
    'codebase-results': 'Review codebase patterns found',
    'web-query': 'Enter web search query',
    'web-results': 'Review web research findings',
    'generation': 'Generating skill content from research...',
    'complete': 'Research complete - ready to create skill',
  };

  return stepInstructions[currentStep] ?? `Current step: ${currentStep}`;
}

// ============================================================================
// Research Summary Generation
// ============================================================================

/**
 * Generate research summary from completed interactive state
 */
function generateResearchSummary(state: InteractiveState): ResearchSummary {
  return {
    sourcesUsed: {
      codebase: state.selectedSources?.codebase ?? false,
      context7: state.selectedSources?.context7 ?? false,
      web: state.selectedSources?.web ?? false,
    },
    codebasePatterns: state.codebaseResults?.patterns,
    context7Highlights: state.context7Results?.highlights,
    webFindings: state.webResults?.findings,
    generatedContent: {
      quickReference: state.generatedContent?.quickReference,
      implementation: state.generatedContent?.implementation,
      examples: state.generatedContent?.examples,
      references: state.generatedContent?.references,
    },
  };
}

// ============================================================================
// Main Handler
// ============================================================================

/**
 * Handle research mode workflow
 *
 * This is the main entry point for research mode in skill creation.
 * It manages the state machine and delegates to researching-skills.
 */
export async function handleResearchMode(
  options: CreateOptionsWithResearch
): Promise<ResearchModeResult> {
  try {
    // Case 1: Mode not yet selected - ask user
    if (!options.mode) {
      if (!options.skillType || shouldOfferResearchMode(options.skillType)) {
        return {
          status: 'NEEDS_INPUT',
          questions: [createResearchModeQuestion()],
          nextStep: 'Select creation mode',
        };
      }
      // For tool-wrapper, default to quick mode
      options.mode = 'quick';
    }

    // Case 2: Quick mode - skip research, return READY immediately
    if (options.mode === 'quick') {
      return {
        status: 'READY',
        nextStep: 'Ready to create skill from template',
      };
    }

    // Case 3: Research mode - delegate to orchestrator
    let workflowState: CreateWithResearchState;
    let interactiveState: InteractiveState | undefined;

    // Check if resuming from previous state
    if (options.resumeState) {
      workflowState = deserializeResearchState(options.resumeState);
      interactiveState = workflowState.researchState;
    } else {
      // Create initial workflow state
      workflowState = createResearchWorkflowState({
        name: options.name,
        description: options.description,
        location: options.location,
        category: options.category,
        skillType: options.skillType,
      });
    }

    // Call orchestrator (uses dependency injection for testing)
    const orchestrator = await getOrchestrator();
    const orchestrateOptions = buildOrchestrateOptions(options, interactiveState);
    const result: OrchestrateResult = await orchestrator(orchestrateOptions);

    // Update workflow state with interactive state
    // Use realState if available (from adapter), otherwise fall back to simplified state
    const stateToMerge = result.realState ?? (result.state as unknown as RealInteractiveState);
    workflowState = mergeInteractiveState(workflowState, stateToMerge);

    // Case 3a: Research complete
    if (result.done) {
      return {
        status: 'READY',
        serializedState: serializeResearchState(workflowState),
        researchSummary: generateResearchSummary(result.state),
        nextStep: 'Research complete - ready to generate skill',
      };
    }

    // Case 3b: Research in progress - return question
    if (result.question) {
      return {
        status: 'RESEARCH_IN_PROGRESS',
        serializedState: serializeResearchState(workflowState),
        questions: [convertQuestion(result.question)],
        nextStep: getNextStepInstructions(result.state.currentStep),
      };
    }

    // Unexpected state
    return {
      status: 'ERROR',
      error: 'Unexpected orchestrator state: no question and not done',
    };

  } catch (error) {
    return {
      status: 'ERROR',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
