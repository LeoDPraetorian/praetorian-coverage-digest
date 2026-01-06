/**
 * Shared Response Utilities (Core Domain Layer)
 *
 * Reusable business logic for response transformation across all MCP wrappers.
 * Extracts common patterns: truncation, pagination, field filtering.
 *
 * Part of hexagonal architecture - these are domain rules, not infrastructure.
 */

// =============================================================================
// Truncation Utilities
// =============================================================================

/**
 * Standard truncation limits for token efficiency
 * Centralizes magic numbers that were scattered across wrappers
 */
export const TruncationLimits = {
  /** Short descriptions in list views */
  SHORT: 200,
  /** Medium descriptions in detail views */
  MEDIUM: 300,
  /** Long descriptions in single-item views */
  LONG: 500,
  /** Error messages */
  ERROR: 300,
  /** Full content (Perplexity responses) */
  CONTENT: 3000,
  /** Research content (extended) */
  RESEARCH: 8000,
} as const;

export type TruncationLimit = keyof typeof TruncationLimits;

/**
 * Truncate a string for token efficiency
 *
 * @param value - String to truncate (handles null/undefined)
 * @param limit - Max length or preset name
 * @param suffix - Optional suffix when truncated (default: none)
 * @returns Truncated string or undefined if input was nullish
 *
 * @example
 * ```typescript
 * // Using preset
 * truncate(description, 'SHORT')  // 200 chars
 * truncate(error, 'ERROR')        // 300 chars
 *
 * // Using custom limit
 * truncate(content, 150)
 *
 * // With suffix
 * truncate(content, 'CONTENT', '... [truncated]')
 * ```
 */
export function truncate(
  value: string | null | undefined,
  limit: TruncationLimit | number,
  suffix?: string
): string | undefined {
  if (value == null) return undefined;

  const maxLength = typeof limit === 'number' ? limit : TruncationLimits[limit];

  if (value.length <= maxLength) return value;

  const truncated = value.substring(0, maxLength);
  return suffix ? truncated + suffix : truncated;
}

/**
 * Truncate with standard suffix indicating content was cut
 */
export function truncateWithIndicator(
  value: string | null | undefined,
  limit: TruncationLimit | number
): string | undefined {
  return truncate(value, limit, '...');
}

// =============================================================================
// Pagination Utilities
// =============================================================================

/**
 * Standard pagination limits
 */
export const PaginationLimits = {
  /** Default list size */
  DEFAULT: 20,
  /** Small lists (samples, previews) */
  SMALL: 5,
  /** Medium lists */
  MEDIUM: 50,
  /** Large lists */
  LARGE: 100,
  /** Maximum allowed */
  MAX: 250,
} as const;

/**
 * Paginate an array with limit and optional offset
 *
 * @param items - Array to paginate
 * @param limit - Max items to return
 * @param offset - Items to skip (default: 0)
 * @returns Paginated array
 *
 * @example
 * ```typescript
 * const page1 = paginate(issues, 20);
 * const page2 = paginate(issues, 20, 20);
 * ```
 */
export function paginate<T>(
  items: T[],
  limit: number,
  offset: number = 0
): T[] {
  return items.slice(offset, offset + limit);
}

/**
 * Paginate and transform items in one pass
 *
 * @example
 * ```typescript
 * const result = paginateAndTransform(
 *   rawIssues,
 *   20,
 *   issue => ({
 *     id: issue.id,
 *     title: issue.title,
 *     description: truncate(issue.description, 'SHORT')
 *   })
 * );
 * ```
 */
export function paginateAndTransform<T, U>(
  items: T[],
  limit: number,
  transform: (item: T, index: number) => U,
  offset: number = 0
): U[] {
  return items
    .slice(offset, offset + limit)
    .map(transform);
}

// =============================================================================
// Field Filtering Utilities
// =============================================================================

/**
 * Pick specific fields from an object (type-safe)
 *
 * @example
 * ```typescript
 * const filtered = pickFields(rawIssue, ['id', 'title', 'status']);
 * ```
 */
export function pickFields<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific fields from an object (type-safe)
 *
 * @example
 * ```typescript
 * const filtered = omitFields(rawIssue, ['__typename', 'internalId']);
 * ```
 */
export function omitFields<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}

// =============================================================================
// Response Transformation Helpers
// =============================================================================

/**
 * Safely extract a nested value with optional transform
 *
 * @example
 * ```typescript
 * const name = extract(issue, 'assignee.name', v => v.toUpperCase());
 * const status = extract(issue, 'state.name');
 * ```
 */
export function extract<T>(
  obj: unknown,
  path: string,
  transform?: (value: unknown) => T
): T | undefined {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  if (current === undefined) return undefined;
  return transform ? transform(current) : (current as T);
}

/**
 * Create a response with metadata
 *
 * @example
 * ```typescript
 * return withMetadata(issues, {
 *   total: rawData.length,
 *   truncated: rawData.length > limit
 * });
 * ```
 */
export function withMetadata<T, M extends Record<string, unknown>>(
  data: T,
  metadata: M
): T & { _meta: M } {
  return { ...data as object, _meta: metadata } as T & { _meta: M };
}

// =============================================================================
// Null Safety Utilities
// =============================================================================

/**
 * Coerce nullish values to undefined (for consistent API responses)
 */
export function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}

/**
 * Ensure array (handles null, undefined, single item)
 */
export function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

// =============================================================================
// Aggregation Utilities
// =============================================================================

/**
 * Count items by a key function
 *
 * @example
 * ```typescript
 * const byType = countBy(assets, a => a.class || 'unknown');
 * // { 'ipv4': 10, 'domain': 5, 'unknown': 2 }
 *
 * const byStatus = countBy(issues, i => i.state?.name || 'none');
 * // { 'In Progress': 3, 'Done': 7, 'none': 1 }
 * ```
 */
export function countBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

/**
 * Group items by a key function
 *
 * @example
 * ```typescript
 * const byTeam = groupBy(issues, i => i.team?.name || 'unassigned');
 * // { 'Engineering': [issue1, issue2], 'Design': [issue3] }
 * ```
 */
export function groupBy<T>(
  items: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

// =============================================================================
// Summary Builders
// =============================================================================

/**
 * Build a standard list response with summary metadata
 *
 * Common pattern across all list wrappers - centralizes the structure.
 *
 * @example
 * ```typescript
 * return buildListResponse(assets, 20, asset => ({
 *   key: asset.key,
 *   name: asset.name,
 *   status: asset.status,
 * }), {
 *   byType: a => a.class || 'unknown',
 *   byStatus: a => a.status || 'unknown',
 * });
 * ```
 */
export function buildListResponse<T, U>(
  items: T[],
  limit: number,
  transform: (item: T) => U,
  countFields?: Record<string, (item: T) => string>
): {
  items: U[];
  summary: {
    total: number;
    returned: number;
    hasMore: boolean;
    counts?: Record<string, Record<string, number>>;
  };
} {
  const transformed = items.slice(0, limit).map(transform);

  const summary: {
    total: number;
    returned: number;
    hasMore: boolean;
    counts?: Record<string, Record<string, number>>;
  } = {
    total: items.length,
    returned: transformed.length,
    hasMore: items.length > limit,
  };

  if (countFields) {
    summary.counts = {};
    for (const [name, keyFn] of Object.entries(countFields)) {
      summary.counts[name] = countBy(items, keyFn);
    }
  }

  return { items: transformed, summary };
}

// =============================================================================
// Response Normalization
// =============================================================================

/**
 * Normalize MCP responses that may come in different formats
 *
 * Many MCP servers return data inconsistently:
 * - Direct array: [item1, item2]
 * - Wrapped: { data: [item1, item2] }
 * - Tuple: [[item1, item2], nextOffset]
 * - Named: { issues: [item1, item2] }
 *
 * @example
 * ```typescript
 * const items = normalizeArrayResponse(rawData, 'issues');
 * // Handles: [], { issues: [] }, [[], offset], { data: { issues: [] } }
 * ```
 */
export function normalizeArrayResponse<T>(
  rawData: unknown,
  fieldName?: string
): T[] {
  if (rawData == null) return [];

  // Direct array
  if (Array.isArray(rawData)) {
    // Check if it's a tuple [items, metadata]
    if (rawData.length === 2 && Array.isArray(rawData[0])) {
      return rawData[0] as T[];
    }
    return rawData as T[];
  }

  // Object with named field
  if (typeof rawData === 'object') {
    const obj = rawData as Record<string, unknown>;

    // Try specified field name
    if (fieldName && Array.isArray(obj[fieldName])) {
      return obj[fieldName] as T[];
    }

    // Try common field names
    for (const key of ['data', 'items', 'results', 'records']) {
      if (Array.isArray(obj[key])) {
        return obj[key] as T[];
      }
    }

    // Nested data object
    if (obj.data && typeof obj.data === 'object') {
      return normalizeArrayResponse(obj.data, fieldName);
    }
  }

  return [];
}

/**
 * Extract pagination info from various response formats
 *
 * @example
 * ```typescript
 * const { items, nextOffset, hasMore } = extractPaginatedResponse(rawData, 'issues');
 * ```
 */
export function extractPaginatedResponse<T>(
  rawData: unknown,
  fieldName?: string
): {
  items: T[];
  nextOffset: string | number | null;
  hasMore: boolean;
} {
  const items = normalizeArrayResponse<T>(rawData, fieldName);

  let nextOffset: string | number | null = null;

  if (rawData && typeof rawData === 'object') {
    const obj = rawData as Record<string, unknown>;

    // Check various pagination field names
    nextOffset = (obj.nextOffset ?? obj.next_offset ?? obj.cursor ?? obj.nextCursor ?? null) as string | number | null;

    // Tuple format: [items, offset]
    if (Array.isArray(rawData) && rawData.length === 2 && !Array.isArray(rawData[1])) {
      nextOffset = rawData[1] as string | number | null;
    }
  }

  return {
    items,
    nextOffset,
    hasMore: nextOffset != null,
  };
}

// =============================================================================
// Token Estimation
// =============================================================================

/**
 * Estimates the number of tokens in a data structure
 *
 * Uses the common heuristic of ~4 characters per token for LLM context estimation.
 * This is useful for tracking token usage in MCP wrapper responses.
 *
 * @param data - Any data structure (object, array, string, etc.)
 * @returns Estimated token count (4 characters ≈ 1 token)
 *
 * @example
 * ```typescript
 * // String input
 * estimateTokens('hello world')  // 3 tokens
 *
 * // Object input (gets stringified)
 * estimateTokens({ id: 1, name: 'test' })  // 6 tokens
 *
 * // Array input
 * estimateTokens([1, 2, 3])  // 3 tokens
 * ```
 */
export function estimateTokens(data: unknown): number {
  const json = typeof data === 'string' ? data : JSON.stringify(data);
  return Math.ceil(json.length / 4);
}
