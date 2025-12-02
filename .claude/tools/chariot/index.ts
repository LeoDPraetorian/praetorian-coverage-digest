/**
 * Chariot MCP Progressive Loading Wrapper
 *
 * Provides intelligent wrappers for Chariot graph database queries with:
 * - Zod validation for type safety
 * - Intelligent filtering to reduce token usage
 * - Common query patterns as helpers
 * - Secure sandbox execution support
 *
 * Token Reduction:
 * - Before: 6,000-8,000 tokens (MCP tool definitions + documentation)
 * - After: 500-1,000 tokens (filtered results)
 * - Savings: 85-90%
 *
 * Usage:
 * ```typescript
 * import { query, schema, commonQueries } from '.claude/tools/chariot';
 *
 * // Execute a query
 * const results = await query.execute({
 *   query: JSON.stringify(commonQueries.activeAssetsByClass('ipv4')),
 *   stack: 'your-stack',
 *   username: 'user@example.com',
 * });
 *
 * // Get schema information
 * const schemaInfo = await schema.execute();
 * console.log('Allowed columns:', schemaInfo.allowedColumns);
 * ```
 */

export { query, commonQueries } from './query';
export type {
  ChariotQueryInput,
  ChariotQueryOutput,
  QueryStructure,
} from './query';

export { schema, schemaHelpers } from './schema';
export type {
  ChariotSchemaInput,
  ChariotSchemaOutput,
  EntityType,
} from './schema';
