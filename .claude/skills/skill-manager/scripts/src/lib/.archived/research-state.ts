// src/lib/research-state.ts
/**
 * Research state management for skill-manager → researching-skills integration
 *
 * This module handles:
 * - State creation for the create-with-research workflow
 * - Serialization/deserialization for passing state between CLI calls
 * - State queries (isInProgress, isComplete)
 * - State updates (phase transitions, merging interactive state)
 */

import { z } from 'zod';
import type { InteractiveState } from '../../../../researching-skills/scripts/src/lib/interactive-types.js';
import type { SkillCategory } from './types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Research workflow phases
 */
export type ResearchPhase = 'not-started' | 'in-progress' | 'complete' | 'skipped';

/**
 * Complete state for the create-with-research workflow
 */
export interface CreateWithResearchState {
  /** Skill name (kebab-case) */
  name: string;
  /** Skill description ("Use when...") */
  description: string;
  /** Location: core or library */
  location: 'core' | 'library';
  /** Category path (e.g., "development/integrations") - only for library skills */
  category?: string;
  /** Skill type (process, library, integration, tool-wrapper) */
  skillType: SkillCategory;
  /** Current research phase */
  researchPhase: ResearchPhase;
  /** Interactive state from researching-skills (when in-progress) */
  researchState?: InteractiveState;
}

/**
 * Options for creating a new research workflow state
 */
export interface CreateResearchStateOptions {
  name: string;
  description: string;
  location: 'core' | 'library';
  category?: string;
  skillType?: SkillCategory;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

const ResearchPhaseSchema = z.enum(['not-started', 'in-progress', 'complete', 'skipped']);

const LocationSchema = z.enum(['core', 'library']);

const SkillTypeSchema = z.enum(['process', 'library', 'integration', 'tool-wrapper']);

const CreateWithResearchStateSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1, 'description is required'),
  location: LocationSchema,
  category: z.string().optional(),
  skillType: SkillTypeSchema,
  researchPhase: ResearchPhaseSchema,
  researchState: z.any().optional(), // InteractiveState is complex, validate loosely
});

// ============================================================================
// State Creation
// ============================================================================

/**
 * Create initial state for the research workflow
 */
export function createResearchWorkflowState(
  options: CreateResearchStateOptions
): CreateWithResearchState {
  return {
    name: options.name,
    description: options.description,
    location: options.location,
    category: options.category,
    skillType: options.skillType ?? 'process',
    researchPhase: 'not-started',
    researchState: undefined,
  };
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serialize state to JSON string for passing between CLI calls
 */
export function serializeResearchState(state: CreateWithResearchState): string {
  return JSON.stringify(state);
}

/**
 * Deserialize state from JSON string
 *
 * @throws {Error} If JSON is invalid or missing required fields
 */
export function deserializeResearchState(json: string): CreateWithResearchState {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON string');
  }

  const result = CreateWithResearchStateSchema.safeParse(parsed);

  if (!result.success) {
    // Extract first error for readable message
    const firstError = result.error.issues[0];
    const fieldName = firstError.path.join('.');
    throw new Error(`Invalid ${fieldName}: ${firstError.message}`);
  }

  return result.data as CreateWithResearchState;
}

// ============================================================================
// State Queries
// ============================================================================

/**
 * Check if research is currently in progress
 */
export function isResearchInProgress(state: CreateWithResearchState): boolean {
  return state.researchPhase === 'in-progress';
}

/**
 * Check if research is complete (either finished or skipped)
 */
export function isResearchComplete(state: CreateWithResearchState): boolean {
  return state.researchPhase === 'complete' || state.researchPhase === 'skipped';
}

// ============================================================================
// State Updates
// ============================================================================

/**
 * Update the research phase (immutable - returns new state)
 */
export function updateResearchPhase(
  state: CreateWithResearchState,
  phase: ResearchPhase
): CreateWithResearchState {
  return {
    ...state,
    researchPhase: phase,
  };
}

/**
 * Merge interactive state from researching-skills into workflow state
 *
 * Auto-updates researchPhase to 'complete' if interactive step is 'complete'
 */
export function mergeInteractiveState(
  workflowState: CreateWithResearchState,
  interactiveState: InteractiveState
): CreateWithResearchState {
  const newPhase =
    interactiveState.currentStep === 'complete'
      ? 'complete'
      : workflowState.researchPhase;

  return {
    ...workflowState,
    researchState: interactiveState,
    researchPhase: newPhase,
  };
}
