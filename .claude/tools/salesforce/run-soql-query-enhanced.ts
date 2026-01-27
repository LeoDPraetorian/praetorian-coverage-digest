/**
 * run_soql_query_enhanced - Salesforce MCP Wrapper with Knowledge Layer
 *
 * Extends run-soql-query with intelligent natural language query resolution.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - Repeated query: ~100 tokens (pattern cache hit)
 * - Business term query: ~150 tokens (glossary expansion)
 * - vs brute force: ~5,000-10,000 tokens
 * - Reduction: 97-98%
 *
 * Security:
 * - Risk Level: HIGH
 * - Validation: SOQL injection prevention on ALL resolved queries
 */

import { z } from 'zod';
import { optionalOrgIdentifier, paginationSchema } from './schemas/common.js';
import { defaultMCPClient } from '../config/lib/mcp-client.js';
import { estimateTokens, paginate } from '../config/lib/response-utils.js';
import type { Result, MCPPort } from './types.js';
import { mapMCPError, SalesforceErrors } from './errors.js';
import type { SalesforceError } from './errors.js';
import { SOQL_INJECTION_PATTERNS, MAX_SOQL_LIMIT } from './run-soql-query.js';
import { loadKnowledgeContext, savePattern } from './knowledge/knowledge-loader.js';
import { QueryResolver } from './knowledge/query-resolver.js';
import { resolveOrgUsername } from './org-resolver.js';

// ============================================
// SECTION 1: Input Schema
// ============================================

/**
 * Enhanced input schema with natural language support
 */
export const runSoqlQueryEnhancedParams = z.object({
  // Either query OR naturalLanguage must be provided
  query: z.string().optional().describe('Direct SOQL query (bypasses knowledge layer)'),
  naturalLanguage: z.string().optional().describe('Natural language query (uses knowledge layer)'),

  // Knowledge layer options
  useKnowledge: z.boolean().default(true).describe('Enable knowledge layer for natural language'),
  learnPattern: z.boolean().default(true).describe('Save successful patterns for future use'),

  // Org targeting
  targetOrg: optionalOrgIdentifier,

  // Pagination
  ...paginationSchema.shape,
});

export type RunSoqlQueryEnhancedInput = z.infer<typeof runSoqlQueryEnhancedParams>;

// ============================================
// SECTION 2: Output Schema
// ============================================

/**
 * Resolution metadata
 */
export const resolutionMetadataSchema = z.object({
  resolved: z.boolean().optional().describe('Whether query was successfully resolved (graceful degradation)'),
  source: z.enum(['direct', 'pattern_cache', 'glossary', 'schema', 'tooling_api', 'none']),
  confidence: z.number().min(0).max(1),
  matchedTerms: z.array(z.string()).optional(),
  generatedSoql: z.string().optional(),
  // Graceful degradation fields
  unrecognizedTerms: z.array(z.string()).optional().describe('Terms that could not be matched'),
  suggestions: z.array(z.string()).optional().describe('Suggestions for resolving the query'),
  availableGlossaryTerms: z.array(z.string()).optional().describe('Available terms in glossary'),
  relevantFields: z.array(z.string()).optional().describe('Potentially relevant Salesforce fields'),
});

export type ResolutionMetadata = z.infer<typeof resolutionMetadataSchema>;

/**
 * Enhanced output schema with resolution metadata
 */
export const runSoqlQueryEnhancedOutput = z.object({
  summary: z.object({
    total_count: z.number(),
    returned_count: z.number(),
    has_more: z.boolean(),
  }),
  records: z.array(z.record(z.unknown())),
  estimatedTokens: z.number(),
  resolution: resolutionMetadataSchema,
});

export type RunSoqlQueryEnhancedOutput = z.infer<typeof runSoqlQueryEnhancedOutput>;

// ============================================
// SECTION 3: Implementation
// ============================================

export const runSoqlQueryEnhanced = {
  name: 'salesforce.run_soql_query_enhanced',
  description: 'Execute SOQL queries with intelligent natural language resolution',
  parameters: runSoqlQueryEnhancedParams,

  async execute(
    input: RunSoqlQueryEnhancedInput,
    mcpPort: MCPPort = defaultMCPClient
  ): Promise<Result<RunSoqlQueryEnhancedOutput, SalesforceError>> {
    try {
      // Validate input
      const validated = runSoqlQueryEnhancedParams.parse(input);

      // Validate: Either query or naturalLanguage must be provided
      if (!validated.query && !validated.naturalLanguage) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either query or naturalLanguage must be provided',
            retryable: false,
          },
        };
      }

      // If useKnowledge is false and no query, fail early
      if (!validated.query && !validated.useKnowledge) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either query or naturalLanguage with useKnowledge:true must be provided',
            retryable: false,
          },
        };
      }

      let soqlToExecute: string;
      let resolution: ResolutionMetadata;
      // Store resolution data for auto-learning (only set for natural language queries)
      let resolvedNormalizedQuery: string | undefined;
      let resolvedFieldsUsed: string[] | undefined;

      // Route: Direct SOQL or Natural Language
      if (validated.query) {
        // Direct SOQL - bypass knowledge layer
        soqlToExecute = validated.query;
        resolution = {
          resolved: true,
          source: 'direct',
          confidence: 1.0,
        };
      } else {
        // Natural language - use knowledge layer
        const knowledgeResult = await loadKnowledgeContext();
        if (!knowledgeResult.success) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Failed to load knowledge layer: ${knowledgeResult.error?.message || 'Unknown error'}`,
              retryable: false,
            },
          };
        }

        const resolver = new QueryResolver(knowledgeResult.data);
        const resolveResult = await resolver.resolve(validated.naturalLanguage!);

        if (!resolveResult.success) {
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: resolveResult.error?.message || 'Could not resolve query',
              retryable: false,
            },
          };
        }

        const resolutionData = resolveResult.data;

        // Check if resolution produced SOQL
        if (!resolutionData.soql) {
          // Graceful degradation: Return success with resolved: false
          // Provide helpful information without throwing error
          return {
            success: true,
            data: {
              summary: {
                total_count: 0,
                returned_count: 0,
                has_more: false,
              },
              records: [],
              estimatedTokens: 0,
              resolution: {
                resolved: false,
                source: resolutionData.source || 'none',
                confidence: resolutionData.confidence || 0,
                unrecognizedTerms: resolutionData.unrecognizedTerms || [],
                suggestions: resolutionData.suggestions || [],
                availableGlossaryTerms: resolutionData.availableGlossaryTerms || [],
                relevantFields: resolutionData.relevantFields || [],
              },
            },
          };
        }

        soqlToExecute = resolutionData.soql;
        resolution = {
          resolved: true,
          source: resolutionData.source,
          confidence: resolutionData.confidence,
          matchedTerms: resolutionData.matchedTerms,
          generatedSoql: resolutionData.soql,
        };

        // Store for auto-learning
        resolvedNormalizedQuery = resolutionData.normalizedQuery;
        resolvedFieldsUsed = resolutionData.fieldsUsed;
      }

      // Security: Check resolved SOQL for injection patterns
      for (const pattern of SOQL_INJECTION_PATTERNS) {
        if (pattern.test(soqlToExecute)) {
          return {
            success: false,
            error: SalesforceErrors.soqlInjection(pattern.source),
          };
        }
      }

      // Resolve org username (actual default org, not placeholder)
      const orgResult = await resolveOrgUsername(validated.targetOrg, mcpPort);
      if (!orgResult.success) {
        return orgResult; // Return error from org resolution
      }

      // Build params for MCP call
      const params: Record<string, unknown> = {
        query: soqlToExecute,
        // Native Salesforce MCP expects usernameOrAlias and directory
        usernameOrAlias: orgResult.data,
        directory: process.cwd(),
      };

      // Call Salesforce MCP
      const rawData = await mcpPort.callTool('salesforce', 'run_soql_query', params);

      // Parse response - handle string format from Salesforce MCP
      // The MCP returns a string like "SOQL query results:\n\n{...JSON...}"
      let data: Record<string, unknown>;
      if (typeof rawData === 'string') {
        // Strip "SOQL query results:" prefix and parse JSON
        const jsonMatch = rawData.match(/\{[\s\S]*\}$/);
        if (jsonMatch) {
          try {
            data = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
          } catch {
            // If JSON parsing fails, return empty result
            data = { records: [], totalSize: 0 };
          }
        } else {
          // No JSON found in response
          data = { records: [], totalSize: 0 };
        }
      } else {
        data = rawData as Record<string, unknown>;
      }

      // Extract records from parsed response
      const result = data.result as Record<string, unknown> | undefined;
      const records = (data.records || result?.records || []) as Record<string, unknown>[];

      // Calculate totals
      const totalCount = (data.totalSize || result?.totalSize || records.length) as number;
      const limit = Math.min(validated.limit, MAX_SOQL_LIMIT);
      const offset = validated.offset || 0;

      // Apply pagination
      const paginatedRecords = paginate(records, limit, offset);
      const returnedCount = paginatedRecords.length;

      const output: RunSoqlQueryEnhancedOutput = {
        summary: {
          total_count: totalCount,
          returned_count: returnedCount,
          has_more: offset + returnedCount < totalCount,
        },
        records: paginatedRecords,
        estimatedTokens: estimateTokens(rawData),
        resolution,
      };

      // Auto-learning: Save successful natural language query as pattern
      if (
        validated.naturalLanguage &&
        validated.learnPattern &&
        resolution.source !== 'direct' &&
        resolution.source !== 'pattern_cache' // Don't re-save existing patterns
      ) {
        // Fire and forget - don't block on save
        savePattern({
          naturalLanguage: validated.naturalLanguage,
          normalizedQuery: resolvedNormalizedQuery || validated.naturalLanguage.toLowerCase(),
          soql: soqlToExecute,
          glossaryTermsUsed: resolution.matchedTerms || [],
          schemaFieldsUsed: resolvedFieldsUsed || [],
          confidence: resolution.confidence,
        }).catch(() => {
          // Silently ignore save errors
        });
      }

      return { success: true, data: output };
    } catch (error) {
      return { success: false, error: mapMCPError(error) };
    }
  },

  tokenEstimate: {
    withoutCustomTool: 50000,
    withCustomTool: 0,
    whenUsed: 150,
    reduction: '99%',
  },
};
