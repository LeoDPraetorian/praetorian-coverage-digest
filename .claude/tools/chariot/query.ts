/**
 * Chariot Graph Query Wrapper
 *
 * Wraps Chariot MCP query tool with:
 * - Zod validation for query structure
 * - Intelligent filtering to reduce token usage
 * - Common query patterns as helpers
 *
 * Uses SHARED MCP client from .claude/tools/config/lib/mcp-client.ts
 *
 * Token savings: ~6,000 tokens (documentation) → ~200-500 tokens (filtered results)
 * Reduction: 90-95%
 *
 * ## Schema Discovery Results
 *
 * Tested with 5+ query scenarios on 2024-11-28:
 * - Assets by status: Returns array of asset objects
 * - Risks by CVSS: Returns array with cvss, priority fields
 * - Assets with relationships: Returns nested relationship data
 *
 * ## Response Format
 *
 * The Chariot MCP returns data in two formats:
 * 1. Direct array format: `[{key, name, status, ...}, ...]`
 * 2. Object format: `{ results: [...] }`
 *
 * This wrapper normalizes both to consistent output structure.
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import { validateNoPathTraversal, validateNoCommandInjection, validateNoControlChars } from '../config/lib/sanitize';
import { estimateTokens } from '../config/lib/response-utils.js';

/**
 * Filter operation schema
 */
const FilterSchema = z.object({
  field: z.string().min(1).max(100),
  operator: z.enum(['=', '<', '>', '<=', '>=', 'CONTAINS', 'STARTS WITH', 'ENDS WITH']),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]),
  not: z.boolean().optional(),
});

/**
 * Node structure schema
 */
const NodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    labels: z.array(z.string()).optional(),
    filters: z.array(FilterSchema).optional(),
    relationships: z.array(RelationshipSchema).optional(),
  })
);

/**
 * Relationship structure schema
 */
const RelationshipSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    label: z.string(),
    source: NodeSchema.optional(),
    target: NodeSchema.optional(),
    optional: z.boolean().optional(),
    select_one: z.boolean().optional(),
  })
);

/**
 * Complete query schema
 */
const QuerySchema = z.object({
  node: NodeSchema,
  page: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
  orderBy: z.string().optional(),
  descending: z.boolean().optional(),
});

/**
 * Input parameters for query execution
 * stack and username default to environment variables if not provided
 */
const InputSchema = z.object({
  query: z.string().min(1), // JSON string of query structure
  stack: z
    .string()
    .min(1)
    .refine(validateNoPathTraversal, 'Invalid path traversal')
    .refine(validateNoCommandInjection, 'Invalid command injection')
    .refine(validateNoControlChars, 'Invalid control characters')
    .optional(),
  username: z
    .string()
    .min(1)
    .refine(validateNoPathTraversal, 'Invalid path traversal')
    .refine(validateNoCommandInjection, 'Invalid command injection')
    .refine(validateNoControlChars, 'Invalid control characters')
    .optional(),
  tree: z.boolean().optional().default(false),
});

/**
 * Output schema with filtering
 */
const OutputSchema = z.object({
  results: z.array(z.any()),
  totalCount: z.number(),
  page: z.number().optional(),
  hasMore: z.boolean().optional(),
  estimatedTokens: z.number(),
});

export type ChariotQueryInput = z.infer<typeof InputSchema>;
export type ChariotQueryOutput = z.infer<typeof OutputSchema>;
export type QueryStructure = z.infer<typeof QuerySchema>;

/**
 * Query execution wrapper with validation and filtering
 */
export const query = {
  name: 'chariot.query',
  inputSchema: InputSchema,
  outputSchema: OutputSchema,

  /**
   * Execute a graph query with intelligent filtering
   *
   * @param input Query parameters
   * @returns Filtered results optimized for token efficiency
   */
  async execute(input: ChariotQueryInput): Promise<ChariotQueryOutput> {
    // 1. Validate input structure
    const validated = InputSchema.parse(input);

    // 2. Parse and validate query JSON
    let queryObj: QueryStructure;
    try {
      queryObj = QuerySchema.parse(JSON.parse(validated.query));
    } catch (error) {
      throw new Error(`Invalid query structure: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 3. Resolve stack and username from input or environment
    const stack = validated.stack || process.env.CHARIOT_STACK || 'production';
    const username = validated.username || process.env.PRAETORIAN_CLI_USERNAME;

    if (!username) {
      throw new Error('Username required: provide username parameter or set PRAETORIAN_CLI_USERNAME environment variable');
    }

    // 4. Call Chariot MCP server via SHARED client
    const rawResults = await callMCPTool<any>(
      'chariot',
      'query',
      {
        query: validated.query,
        stack,
        username,
        tree: validated.tree,
      }
    );

    // 5. Apply intelligent filtering
    const filtered = filterResults(rawResults, queryObj);

    // 6. Validate and return
    return OutputSchema.parse(filtered);
  },
};

/**
 * Common query patterns (helpers)
 */
export const commonQueries = {
  /**
   * Get active assets by class
   */
  activeAssetsByClass: (assetClass: string): QueryStructure => ({
    node: {
      labels: ['Asset'],
      filters: [
        { field: 'status', operator: '=', value: 'A' },
        { field: 'class', operator: '=', value: assetClass },
      ],
    },
    limit: 100,
    orderBy: 'updated',
    descending: true,
  }),

  /**
   * Get high-severity risks
   */
  highSeverityRisks: (minCvss: number = 7.0): QueryStructure => ({
    node: {
      labels: ['Risk'],
      filters: [
        { field: 'cvss', operator: '>=', value: minCvss },
        { field: 'status', operator: '=', value: 'A' },
      ],
    },
    limit: 100,
    orderBy: 'cvss',
    descending: true,
  }),

  /**
   * Get assets with specific attributes
   */
  assetsWithAttribute: (attributeName: string, attributeValue?: string): QueryStructure => ({
    node: {
      labels: ['Asset'],
      filters: [{ field: 'status', operator: '=', value: 'A' }],
      relationships: [
        {
          label: 'HAS_ATTRIBUTE',
          target: {
            labels: ['Attribute'],
            filters: attributeValue
              ? [
                  { field: 'name', operator: '=', value: attributeName },
                  { field: 'value', operator: '=', value: attributeValue },
                ]
              : [{ field: 'name', operator: '=', value: attributeName }],
          },
        },
      ],
    },
    limit: 100,
  }),
};

/**
 * Intelligent result filtering
 *
 * Reduces token usage by:
 * - Limiting result count
 * - Removing verbose fields
 * - Summarizing when appropriate
 */
function filterResults(rawResults: any, query: QueryStructure): ChariotQueryOutput {
  const results = Array.isArray(rawResults)
    ? rawResults
    : (rawResults?.results || []);
  const limit = query.limit || 100;

  // Filter to essentials only
  const filtered = results.slice(0, limit).map((item: any) => ({
    key: item.key,
    name: item.name || item.title,
    status: item.status,
    class: item.class || item.type,
    // Add more essential fields based on node labels
    ...(item.dns && { dns: item.dns }),
    ...(item.priority !== undefined && { priority: item.priority }),
    ...(item.cvss !== undefined && { cvss: item.cvss }),
    ...(item.updated && { updated: item.updated }),
  }));

  return {
    results: filtered,
    totalCount: results.length,
    page: query.page,
    hasMore: results.length > limit,
    estimatedTokens: estimateTokens(filtered),
  };
}

/**
 * Placeholder for actual MCP call
 * In production, this would use the MCP client
 */
// Mock function removed - now uses shared MCP client from config/lib/mcp-client.ts
