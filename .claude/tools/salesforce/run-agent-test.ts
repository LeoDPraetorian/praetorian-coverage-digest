/**
 * run_agent_test - Salesforce MCP Wrapper
 *
 * Runs agent tests in the org.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~400 tokens (filtered response)
 * - vs MCP: ~10,000 tokens
 * - Reduction: 96%
 *
 * Security:
 * - Risk Level: MEDIUM
 * - Validation: Command injection, test name allowlist
 */

import { z } from 'zod';
import { salesforceTestName, optionalOrgIdentifier } from './schemas/common.js';
import { defaultMCPClient } from '../config/lib/mcp-client.js';
import { estimateTokens } from '../config/lib/response-utils.js';
import type { Result, MCPPort } from './types.js';
import { mapMCPError } from './errors.js';
import type { SalesforceError } from './errors.js';

// ============================================
// SECTION 1: Input Schema
// ============================================
export const runAgentTestParams = z.object({
  targetOrg: optionalOrgIdentifier,
  agentName: salesforceTestName,
  testSetName: salesforceTestName.optional(),
  synchronous: z.boolean().default(false)
});

export type RunAgentTestInput = z.infer<typeof runAgentTestParams>;

// ============================================
// SECTION 2: Output Schema
// ============================================
export const runAgentTestOutput = z.object({
  summary: z.object({
    testsRan: z.number(),
    passing: z.number(),
    failing: z.number(),
    testRunId: z.string().optional()
  }),
  results: z.array(z.object({
    testName: z.string(),
    outcome: z.enum(['Pass', 'Fail', 'Skip']),
    message: z.string().optional()
  })).optional(),
  estimatedTokens: z.number()
});

export type RunAgentTestOutput = z.infer<typeof runAgentTestOutput>;

// ============================================
// SECTION 3: Implementation
// ============================================
export const runAgentTest = {
  name: 'salesforce.run_agent_test',
  description: 'Run agent tests in a Salesforce org',
  parameters: runAgentTestParams,

  async execute(
    input: RunAgentTestInput,
    mcpPort: MCPPort = defaultMCPClient
  ): Promise<Result<RunAgentTestOutput, SalesforceError>> {
    try {
      // Validate input
      const validated = runAgentTestParams.parse(input);

      // Build params for MCP call
      const params: Record<string, unknown> = {
        agentName: validated.agentName,
        synchronous: validated.synchronous
      };
      if (validated.targetOrg) {
        params.targetOrg = validated.targetOrg;
      }
      if (validated.testSetName) {
        params.testSetName = validated.testSetName;
      }

      // Call Salesforce MCP
      const rawData = await mcpPort.callTool('salesforce', 'run_agent_test', params);

      // Extract result from response
      const data = rawData as Record<string, unknown>;
      const result = data.result as Record<string, unknown> | undefined;
      const summary = (data.summary || result?.summary || data) as Record<string, unknown>;

      // Extract test results
      const rawResults = (data.results || result?.results || []) as Array<Record<string, unknown>>;
      const results = rawResults.length > 0 ? rawResults.map(r => {
        const outcomeMap: Record<string, 'Pass' | 'Fail' | 'Skip'> = {
          'pass': 'Pass', 'fail': 'Fail', 'skip': 'Skip'
        };
        const rawOutcome = String(r.outcome || 'Skip').toLowerCase();
        return {
          testName: String(r.testName || r.name || ''),
          outcome: outcomeMap[rawOutcome] || 'Skip',
          message: r.message ? String(r.message) : undefined
        };
      }) : undefined;

      const output: RunAgentTestOutput = {
        summary: {
          testsRan: Number(summary.testsRan || summary.numTestsRun || 0),
          passing: Number(summary.passing || summary.numTestsPassed || 0),
          failing: Number(summary.failing || summary.numTestsFailed || 0),
          testRunId: summary.testRunId ? String(summary.testRunId) : undefined
        },
        results,
        estimatedTokens: estimateTokens(rawData)
      };

      return { success: true, data: output };
    } catch (error) {
      return { success: false, error: mapMCPError(error) };
    }
  },

  tokenEstimate: {
    withoutCustomTool: 10000,
    withCustomTool: 0,
    whenUsed: 400,
    reduction: '96%'
  }
};
