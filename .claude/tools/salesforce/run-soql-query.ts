/**
 * run_soql_query - Salesforce MCP Wrapper
 *
 * Executes SOQL queries against a Salesforce org.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~600 tokens (filtered response)
 * - vs MCP: ~50,000 tokens
 * - Reduction: 99%
 *
 * Security:
 * - Risk Level: HIGH
 * - Validation: SOQL injection prevention (15 patterns), row limits
 */

import { z } from 'zod';
import { salesforceSoqlQuery, optionalOrgIdentifier, paginationSchema } from './schemas/common.js';
import { defaultMCPClient } from '../config/lib/mcp-client.js';
import { estimateTokens, paginate } from '../config/lib/response-utils.js';
import type { Result, MCPPort } from './types.js';
import { mapMCPError, SalesforceErrors } from './errors.js';
import type { SalesforceError } from './errors.js';
import { resolveOrgUsername } from './org-resolver.js';

// ============================================
// SECTION 1: Input Schema
// ============================================
export const runSoqlQueryParams = z.object({
  query: salesforceSoqlQuery,
  targetOrg: optionalOrgIdentifier,
  ...paginationSchema.shape
});

export type RunSoqlQueryInput = z.infer<typeof runSoqlQueryParams>;

// ============================================
// SECTION 2: Output Schema
// ============================================
export const runSoqlQueryOutput = z.object({
  summary: z.object({
    total_count: z.number(),
    returned_count: z.number(),
    has_more: z.boolean()
  }),
  records: z.array(z.record(z.unknown())),
  estimatedTokens: z.number()
});

export type RunSoqlQueryOutput = z.infer<typeof runSoqlQueryOutput>;

// ============================================
// SECTION 3: Implementation
// ============================================
export const runSoqlQuery = {
  name: 'salesforce.run_soql_query',
  description: 'Execute a SOQL query against a Salesforce org',
  parameters: runSoqlQueryParams,

  async execute(
    input: RunSoqlQueryInput,
    mcpPort: MCPPort = defaultMCPClient
  ): Promise<Result<RunSoqlQueryOutput, SalesforceError>> {
    try {
      // Validate input
      const validated = runSoqlQueryParams.parse(input);

      // Security: Check for SOQL injection patterns
      for (const pattern of SOQL_INJECTION_PATTERNS) {
        if (pattern.test(validated.query)) {
          return {
            success: false,
            error: SalesforceErrors.soqlInjection(pattern.source)
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
        query: validated.query,
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

      const output: RunSoqlQueryOutput = {
        summary: {
          total_count: totalCount,
          returned_count: returnedCount,
          has_more: offset + returnedCount < totalCount
        },
        records: paginatedRecords,
        estimatedTokens: estimateTokens(rawData)
      };

      return { success: true, data: output };
    } catch (error) {
      return { success: false, error: mapMCPError(error) };
    }
  },

  tokenEstimate: {
    withoutCustomTool: 50000,
    withCustomTool: 0,
    whenUsed: 600,
    reduction: '99%'
  }
};

// SOQL Injection patterns to block
export const SOQL_INJECTION_PATTERNS = [
  /--/,                           // SQL comment
  /;/,                            // Statement terminator
  /\/\*/,                         // Block comment start
  /\*\//,                         // Block comment end
  /\bUNION\b/i,                   // UNION injection
  /\bDROP\b/i,                    // DROP statement
  /\bDELETE\b/i,                  // DELETE statement
  /\bINSERT\b/i,                  // INSERT statement
  /\bUPDATE\b/i,                  // UPDATE statement
  /\bEXEC\b/i,                    // EXEC/EXECUTE
  /\bEXECUTE\b/i,
  /\bTRUNCATE\b/i,                // TRUNCATE
  /\bALTER\b/i,                   // ALTER
  /\bCREATE\b/i,                  // CREATE
  /\bGRANT\b/i,                   // GRANT permissions
  /\bREVOKE\b/i,                  // REVOKE permissions
];

export const MAX_SOQL_LIMIT = 200;
