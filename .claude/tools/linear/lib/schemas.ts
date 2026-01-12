/**
 * Zod Validation Schemas for Linear Team Selector
 *
 * Provides type-safe validation for team preferences and API responses
 * with security validation to prevent injection attacks.
 *
 * Key Features:
 * - Reuses sanitize.ts utilities (DRY principle)
 * - Length constraints (ID: 64 chars, Name: 256 chars)
 * - Security validation (no path traversal, command injection, control chars)
 * - DateTime validation for timestamps
 * - Optional fields handled correctly
 *
 * @example
 * ```typescript
 * import { TeamPreferenceSchema } from './schemas.js';
 *
 * const result = TeamPreferenceSchema.safeParse(data);
 * if (result.success) {
 *   console.log('Valid:', result.data);
 * } else {
 *   console.error('Invalid:', result.error);
 * }
 * ```
 */

import { z } from 'zod';
import {
  validateNoControlChars,
  validateNoPathTraversal,
  validateNoCommandInjection,
} from '../../config/lib/sanitize.js';

/**
 * Maximum length constraints
 */
const MAX_ID_LENGTH = 64;
const MAX_NAME_LENGTH = 256;

/**
 * Reusable sanitized string validator
 * Combines length constraints with security validation
 *
 * @param maxLen - Maximum string length
 * @returns Zod string schema with validation
 */
const sanitizedString = (maxLen: number) =>
  z
    .string()
    .min(1, { message: 'Field cannot be empty' })
    .max(maxLen, { message: `Field exceeds maximum length of ${maxLen} characters` })
    .refine(validateNoControlChars, { message: 'Field contains control characters' })
    .refine(validateNoPathTraversal, { message: 'Field contains path traversal sequence' })
    .refine(validateNoCommandInjection, { message: 'Field contains shell metacharacters' });

/**
 * Team Preference Schema
 *
 * Represents a user's saved team preference with timestamps.
 * Used for default team and recent teams list.
 */
export const TeamPreferenceSchema = z.object({
  id: sanitizedString(MAX_ID_LENGTH),
  name: sanitizedString(MAX_NAME_LENGTH),
  setAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().optional(),
});

export type TeamPreference = z.infer<typeof TeamPreferenceSchema>;

/**
 * Team From API Schema
 *
 * Represents a team as returned from Linear's GraphQL API.
 * Includes optional parent field for hierarchical team structures.
 */
export const TeamFromAPISchema = z.object({
  id: sanitizedString(MAX_ID_LENGTH),
  name: sanitizedString(MAX_NAME_LENGTH),
  parent: z
    .object({
      id: sanitizedString(MAX_ID_LENGTH),
      name: sanitizedString(MAX_NAME_LENGTH),
    })
    .optional(),
});

export type TeamFromAPI = z.infer<typeof TeamFromAPISchema>;

/**
 * Linear Preferences Schema
 *
 * User preferences specific to Linear integration.
 * Contains default team and recent teams list.
 */
export const LinearPreferencesSchema = z.object({
  defaultTeam: TeamPreferenceSchema.optional(),
  recentTeams: z.array(TeamPreferenceSchema).max(5).optional(),
});

export type LinearPreferences = z.infer<typeof LinearPreferencesSchema>;

/**
 * Preferences File Schema
 *
 * Top-level preferences file structure.
 * Version 1 format with optional Linear-specific preferences.
 */
export const PreferencesFileSchema = z.object({
  version: z.literal(1),
  linear: LinearPreferencesSchema.optional(),
});

export type PreferencesFile = z.infer<typeof PreferencesFileSchema>;
