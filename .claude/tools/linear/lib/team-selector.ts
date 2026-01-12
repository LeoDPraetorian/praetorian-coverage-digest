/**
 * Team Selector - Team Hierarchy and Preference Management
 *
 * Provides functions for managing Linear team preferences and organizing
 * team hierarchies (parent teams and sub-teams).
 *
 * Key Features:
 * - Default team preference management
 * - Team hierarchy organization (parents and sub-teams)
 * - Clock injection for testable timestamps
 * - Result types with explicit error codes
 * - Comprehensive error handling
 *
 * @example
 * ```typescript
 * import { getDefaultTeam, setDefaultTeam } from './team-selector.js';
 * import { PreferenceManager } from '../../config/lib/preference-manager.js';
 *
 * const manager = new PreferenceManager('linear');
 *
 * // Get default team
 * const result = await getDefaultTeam(manager);
 * if (result.ok) {
 *   console.log('Default team:', result.value);
 * }
 *
 * // Set default team
 * const setResult = await setDefaultTeam(manager, { id: 'team-123', name: 'Engineering' });
 * if (setResult.ok) {
 *   console.log('Default team saved');
 * }
 * ```
 */

import type { PreferenceManager, LoadError } from '../../config/lib/preference-manager.js';
import {
  TeamPreference,
  TeamFromAPI,
  PreferencesFileSchema,
  PreferencesFile,
  TeamPreferenceSchema,
} from './schemas.js';

/**
 * Result type for successful operations
 */
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Error codes for getDefaultTeam
 */
export type GetError =
  | { code: 'NOT_FOUND' }
  | { code: 'CORRUPTED'; message: string }
  | { code: 'SCHEMA_INVALID'; message: string };

/**
 * Error codes for setDefaultTeam
 */
export type SetError =
  | { code: 'VALIDATION_ERROR'; message: string }
  | { code: 'SAVE_FAILED'; message: string };

/**
 * Error codes for API operations
 */
export type APIError = { code: 'API_ERROR'; message: string };

/**
 * Clock interface for time-dependent operations
 * Allows injection of custom clock for testing
 */
export interface Clock {
  now(): Date;
}

/**
 * Default clock implementation using Date.now()
 */
const defaultClock: Clock = {
  now: () => new Date(),
};

/**
 * Team hierarchy structure
 * Separates parent teams from sub-teams for UI rendering
 */
export interface TeamHierarchy {
  parents: TeamFromAPI[];
  subTeams: Map<string, TeamFromAPI[]>;
}

/**
 * List teams function type
 * Used for dependency injection in fetchTeamsWithHierarchy
 */
export type ListTeamsFunction = () => Promise<{
  teams: TeamFromAPI[];
  totalTeams: number;
  estimatedTokens: number;
}>;

/**
 * Retrieves the default team preference from storage
 *
 * Returns undefined if no default team is set or preferences file doesn't exist.
 * Returns error if preferences are corrupted or schema validation fails.
 *
 * @param manager - PreferenceManager instance for loading preferences
 * @returns Result containing TeamPreference or undefined
 *
 * @example
 * ```typescript
 * const result = await getDefaultTeam(manager);
 * if (result.ok) {
 *   if (result.value) {
 *     console.log('Default team:', result.value.name);
 *   } else {
 *     console.log('No default team set');
 *   }
 * } else {
 *   console.error('Error:', result.error.code);
 * }
 * ```
 */
export async function getDefaultTeam(
  manager: PreferenceManager
): Promise<Result<TeamPreference | undefined, GetError>> {
  const result = await manager.load(PreferencesFileSchema);

  if (!result.ok) {
    // Map PreferenceManager errors to GetError codes
    // Use type assertion since we know result.ok is false
    const error = (result as { ok: false; error: LoadError }).error;
    if (error.code === 'NOT_FOUND') {
      // No preferences file = no default team (not an error)
      return { ok: true, value: undefined };
    }
    if (error.code === 'CORRUPTED') {
      return { ok: false, error: { code: 'CORRUPTED', message: error.message } };
    }
    if (error.code === 'SCHEMA_INVALID') {
      return { ok: false, error: { code: 'SCHEMA_INVALID', message: error.message } };
    }
    // Other errors (e.g., PERMISSION_DENIED) treated as corrupted
    return { ok: false, error: { code: 'CORRUPTED', message: 'message' in error ? error.message : 'Unknown error' } };
  }

  // Return default team (or undefined if not set)
  return { ok: true, value: result.value.linear?.defaultTeam };
}

/**
 * Sets the default team preference in storage
 *
 * Validates the team data before saving. Creates preferences file if it doesn't exist.
 * Uses provided clock for timestamp (defaults to current time).
 *
 * @param manager - PreferenceManager instance for saving preferences
 * @param team - Team to set as default (id and name required)
 * @param clock - Clock for generating timestamps (defaults to Date.now())
 * @returns Result indicating success or validation/save error
 *
 * @example
 * ```typescript
 * const result = await setDefaultTeam(manager, { id: 'team-123', name: 'Engineering' });
 * if (result.ok) {
 *   console.log('Default team saved');
 * } else {
 *   console.error('Failed:', result.error.code);
 * }
 * ```
 */
export async function setDefaultTeam(
  manager: PreferenceManager,
  team: { id: string; name: string },
  clock: Clock = defaultClock
): Promise<Result<void, SetError>> {
  // Validate team data before saving
  const timestamp = clock.now().toISOString();
  const teamPreference: TeamPreference = {
    id: team.id,
    name: team.name,
    setAt: timestamp,
  };

  const validation = TeamPreferenceSchema.safeParse(teamPreference);
  if (!validation.success) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: validation.error.message,
      },
    };
  }

  // Load existing preferences (or create new)
  const existing = await manager.load(PreferencesFileSchema);
  const prefs: PreferencesFile = existing.ok
    ? existing.value
    : { version: 1 };

  // Update with new default team
  prefs.linear = {
    ...prefs.linear,
    defaultTeam: teamPreference,
  };

  // Save back to storage
  const saveResult = await manager.save(prefs, PreferencesFileSchema);
  if (!saveResult.ok) {
    const error = (saveResult as { ok: false; error: Error }).error;
    return {
      ok: false,
      error: {
        code: 'SAVE_FAILED',
        message: error.message,
      },
    };
  }

  return { ok: true, value: undefined };
}

/**
 * Clears the default team preference from storage
 *
 * Removes the default team while preserving other preferences (e.g., recent teams).
 * Succeeds even if no default team is set or preferences file doesn't exist.
 *
 * @param manager - PreferenceManager instance
 * @returns Result indicating success or error
 *
 * @example
 * ```typescript
 * const result = await clearDefaultTeam(manager);
 * if (result.ok) {
 *   console.log('Default team cleared');
 * }
 * ```
 */
export async function clearDefaultTeam(
  manager: PreferenceManager
): Promise<Result<void, SetError>> {
  // Load existing preferences
  const existing = await manager.load(PreferencesFileSchema);

  // If no preferences or corrupted, delete file (auto-recovery)
  if (!existing.ok) {
    const error = (existing as { ok: false; error: LoadError }).error;
    if (error.code === 'NOT_FOUND') {
      return { ok: true, value: undefined };
    }
    if (error.code === 'SCHEMA_INVALID' || error.code === 'CORRUPTED') {
      // Preferences corrupted - delete file for auto-recovery
      const deleteResult = await manager.delete();
      if (!deleteResult.ok) {
        const deleteError = (deleteResult as { ok: false; error: Error }).error;
        return {
          ok: false,
          error: {
            code: 'SAVE_FAILED',
            message: deleteError.message,
          },
        };
      }
      return { ok: true, value: undefined };
    }
    // Other errors (e.g., PERMISSION_DENIED) are save failures
    return {
      ok: false,
      error: {
        code: 'SAVE_FAILED',
        message: 'message' in error ? error.message : 'Unknown error',
      },
    };
  }

  // Remove defaultTeam while preserving other linear preferences
  const prefs: PreferencesFile = {
    version: 1,
    linear: existing.value.linear
      ? {
          ...existing.value.linear,
          defaultTeam: undefined,
        }
      : undefined,
  };

  // Save back (undefined defaultTeam will be omitted by JSON.stringify)
  const saveResult = await manager.save(prefs, PreferencesFileSchema);
  if (!saveResult.ok) {
    const error = (saveResult as { ok: false; error: Error }).error;
    return {
      ok: false,
      error: {
        code: 'SAVE_FAILED',
        message: error.message,
      },
    };
  }

  return { ok: true, value: undefined };
}

/**
 * Fetches teams from Linear API with hierarchy information
 *
 * Wrapper around listTeams that handles errors and returns Result type.
 * Uses dependency injection for testing.
 *
 * @param listTeams - Function to fetch teams from Linear API
 * @returns Result containing array of teams with parent information
 *
 * @example
 * ```typescript
 * import { listTeams } from '../list-teams.js';
 *
 * const result = await fetchTeamsWithHierarchy(() => listTeams.execute({}));
 * if (result.ok) {
 *   console.log('Fetched', result.value.length, 'teams');
 * } else {
 *   console.error('API error:', result.error.message);
 * }
 * ```
 */
export async function fetchTeamsWithHierarchy(
  listTeams: ListTeamsFunction
): Promise<Result<TeamFromAPI[], APIError>> {
  try {
    const response = await listTeams();
    return { ok: true, value: response.teams };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'API_ERROR',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

/**
 * Organizes teams into hierarchical structure
 *
 * Separates teams into parent teams (no parent field) and sub-teams (with parent field).
 * Maps sub-teams by parent ID for efficient lookup.
 *
 * @param teams - Array of teams from API
 * @returns TeamHierarchy with parents array and subTeams map
 *
 * @example
 * ```typescript
 * const hierarchy = organizeTeamHierarchy(teams);
 *
 * // Render parent teams
 * for (const parent of hierarchy.parents) {
 *   console.log('Parent:', parent.name);
 *
 *   // Get sub-teams for this parent
 *   const subTeams = hierarchy.subTeams.get(parent.id) || [];
 *   for (const sub of subTeams) {
 *     console.log('  Sub-team:', sub.name);
 *   }
 * }
 * ```
 */
export function organizeTeamHierarchy(teams: TeamFromAPI[]): TeamHierarchy {
  const parents: TeamFromAPI[] = [];
  const subTeams = new Map<string, TeamFromAPI[]>();

  for (const team of teams) {
    if (team.parent) {
      // Sub-team: add to parent's sub-team list
      const parentId = team.parent.id;
      if (!subTeams.has(parentId)) {
        subTeams.set(parentId, []);
      }
      subTeams.get(parentId)!.push(team);
    } else {
      // Parent team
      parents.push(team);
    }
  }

  return { parents, subTeams };
}

/**
 * Gets all sub-teams for a specific parent team
 *
 * Helper function to retrieve sub-teams from organized hierarchy.
 * Returns empty array if parent has no sub-teams or parent not found.
 *
 * @param parentId - ID of the parent team
 * @param hierarchy - Organized team hierarchy
 * @returns Array of sub-teams (empty if none)
 *
 * @example
 * ```typescript
 * const hierarchy = organizeTeamHierarchy(teams);
 * const engineeringSubTeams = getSiblingSubTeams('parent-eng', hierarchy);
 *
 * console.log('Engineering has', engineeringSubTeams.length, 'sub-teams');
 * ```
 */
export function getSiblingSubTeams(parentId: string, hierarchy: TeamHierarchy): TeamFromAPI[] {
  return hierarchy.subTeams.get(parentId) || [];
}

/**
 * Gets flat list of all teams (parents and sub-teams)
 *
 * Combines parents and all sub-teams into a single flat array.
 * Useful for search/filter operations across all teams.
 *
 * @param hierarchy - Organized team hierarchy
 * @returns Flat array of all teams
 *
 * @example
 * ```typescript
 * const hierarchy = organizeTeamHierarchy(teams);
 * const allTeams = getAllTeams(hierarchy);
 *
 * // Search across all teams
 * const matches = allTeams.filter(t => t.name.includes(query));
 * ```
 */
export function getAllTeams(hierarchy: TeamHierarchy): TeamFromAPI[] {
  const all: TeamFromAPI[] = [...hierarchy.parents];

  // Add all sub-teams
  for (const subTeamList of Array.from(hierarchy.subTeams.values())) {
    all.push(...subTeamList);
  }

  return all;
}
