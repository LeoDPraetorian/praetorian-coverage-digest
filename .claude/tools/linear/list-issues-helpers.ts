/**
 * list-issues Helper Functions
 *
 * Utilities for UUID detection and filter building with automatic ID vs name detection
 */

import type { ListIssuesInput } from './list-issues';

/**
 * Detects if a string is a Linear ID (UUID or short hex ID)
 *
 * Linear uses two ID formats:
 * 1. Standard UUID: 8-4-4-4-12 format (e.g., 550e8400-e29b-41d4-a716-446655440000)
 * 2. Short hex IDs: 12+ hexadecimal characters (e.g., 86966439caf5)
 *
 * @param value - String to check
 * @returns true if value is a Linear ID, false otherwise
 */
export function isLinearId(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();

  // Empty or whitespace-only strings are not IDs
  if (trimmed.length === 0) {
    return false;
  }

  // Standard UUID format: 8-4-4-4-12
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(trimmed)) {
    return true;
  }

  // Linear short ID format: 12+ hexadecimal characters (no dashes)
  // Must be at least 12 chars to avoid false positives with short hex strings
  const shortIdRegex = /^[0-9a-f]{12,}$/i;
  return shortIdRegex.test(trimmed);
}

/**
 * Builds GraphQL filter object from input parameters with automatic ID vs name detection
 *
 * Detects whether filter values are UUIDs or names and constructs appropriate filter:
 * - UUIDs: { id: { eq: value } }
 * - Names: { name: { eq: value } }
 *
 * @param input - List issues input parameters
 * @returns GraphQL filter object or undefined if no filters
 */
export function buildIssueFilterWithIdDetection(input: ListIssuesInput): Record<string, any> | undefined {
  const filter: Record<string, any> = {};

  // Assignee filter
  if (input.assignee) {
    if (isLinearId(input.assignee)) {
      filter.assignee = { id: { eq: input.assignee } };
    } else {
      filter.assignee = { name: { eq: input.assignee } };
    }
  }

  // Team filter
  if (input.team) {
    if (isLinearId(input.team)) {
      filter.team = { id: { eq: input.team } };
    } else {
      filter.team = { name: { eq: input.team } };
    }
  }

  // State filter
  if (input.state) {
    if (isLinearId(input.state)) {
      filter.state = { id: { eq: input.state } };
    } else {
      filter.state = { name: { eq: input.state } };
    }
  }

  // Project filter
  if (input.project) {
    if (isLinearId(input.project)) {
      filter.project = { id: { eq: input.project } };
    } else {
      filter.project = { name: { eq: input.project } };
    }
  }

  // Label filter
  if (input.label) {
    if (isLinearId(input.label)) {
      filter.labels = { some: { id: { eq: input.label } } };
    } else {
      filter.labels = { some: { name: { eq: input.label } } };
    }
  }

  // Query filter (unchanged - searches both title and description)
  if (input.query) {
    filter.or = [
      { title: { contains: input.query } },
      { description: { contains: input.query } }
    ];
  }

  // Include archived filter (unchanged)
  if (input.includeArchived !== undefined && !input.includeArchived) {
    filter.archived = { eq: false };
  }

  // Return undefined if no filters (Linear API expects this for "all issues")
  return Object.keys(filter).length > 0 ? filter : undefined;
}
