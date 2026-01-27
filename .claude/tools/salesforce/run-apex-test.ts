/**
 * run_apex_test - Salesforce MCP Wrapper
 *
 * Executes Apex tests in the org.
 *
 * Token Optimization:
 * - Session start: 0 tokens (filesystem discovery)
 * - When used: ~500 tokens (filtered response)
 * - vs MCP: ~15,000 tokens
 * - Reduction: 97%
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
export const runApexTestParams = z.object({
  targetOrg: optionalOrgIdentifier,
  tests: z.array(salesforceTestName).optional(),
  classNames: z.array(salesforceTestName).optional(),
  suiteNames: z.array(salesforceTestName).optional(),
  testLevel: z.enum(['RunSpecifiedTests', 'RunLocalTests', 'RunAllTestsInOrg'])
    .default('RunSpecifiedTests'),
  synchronous: z.boolean().default(false),
  codeCoverage: z.boolean().default(false)
});

export type RunApexTestInput = z.infer<typeof runApexTestParams>;

// ============================================
// SECTION 2: Output Schema
// ============================================
export const testResult = z.object({
  name: z.string(),
  methodName: z.string().optional(),
  outcome: z.enum(['Pass', 'Fail', 'Skip', 'CompileFail']),
  message: z.string().optional(),
  runTime: z.number().optional()
});

export const runApexTestOutput = z.object({
  summary: z.object({
    testsRan: z.number(),
    passing: z.number(),
    failing: z.number(),
    skipped: z.number(),
    passRate: z.string().optional(),
    testRunId: z.string().optional()
  }),
  tests: z.array(testResult).optional(),
  coverage: z.object({
    orgWideCoverage: z.string().optional(),
    classes: z.array(z.object({
      name: z.string(),
      coverage: z.number()
    })).optional()
  }).optional(),
  estimatedTokens: z.number()
});

export type RunApexTestOutput = z.infer<typeof runApexTestOutput>;

// ============================================
// SECTION 3: Implementation
// ============================================
export const runApexTest = {
  name: 'salesforce.run_apex_test',
  description: 'Run Apex tests in a Salesforce org',
  parameters: runApexTestParams,

  async execute(
    input: RunApexTestInput,
    mcpPort: MCPPort = defaultMCPClient
  ): Promise<Result<RunApexTestOutput, SalesforceError>> {
    try {
      // Validate input
      const validated = runApexTestParams.parse(input);

      // Build params for MCP call
      const params: Record<string, unknown> = {
        testLevel: validated.testLevel,
        synchronous: validated.synchronous,
        codeCoverage: validated.codeCoverage
      };
      if (validated.targetOrg) {
        params.targetOrg = validated.targetOrg;
      }
      if (validated.tests && validated.tests.length > 0) {
        params.tests = validated.tests;
      }
      if (validated.classNames && validated.classNames.length > 0) {
        params.classNames = validated.classNames;
      }
      if (validated.suiteNames && validated.suiteNames.length > 0) {
        params.suiteNames = validated.suiteNames;
      }

      // Call Salesforce MCP
      const rawData = await mcpPort.callTool('salesforce', 'run_apex_test', params);

      // Extract result from response
      const data = rawData as Record<string, unknown>;
      const result = data.result as Record<string, unknown> | undefined;
      const summary = (data.summary || result?.summary || data) as Record<string, unknown>;

      // Extract test results
      const rawTests = (data.tests || result?.tests || []) as Array<Record<string, unknown>>;
      const tests = rawTests.length > 0 ? rawTests.map(t => {
        const outcomeMap: Record<string, 'Pass' | 'Fail' | 'Skip' | 'CompileFail'> = {
          'pass': 'Pass', 'fail': 'Fail', 'skip': 'Skip', 'compilefail': 'CompileFail'
        };
        const rawOutcome = String(t.outcome || t.Outcome || 'Skip').toLowerCase();
        return {
          name: String(t.name || t.ApexClass?.Name || ''),
          methodName: t.methodName ? String(t.methodName) : undefined,
          outcome: outcomeMap[rawOutcome] || 'Skip',
          message: t.message ? String(t.message) : undefined,
          runTime: typeof t.runTime === 'number' ? t.runTime : undefined
        };
      }) : undefined;

      // Extract coverage if available
      const rawCoverage = (data.coverage || result?.coverage) as Record<string, unknown> | undefined;
      const coverage = rawCoverage ? {
        orgWideCoverage: rawCoverage.orgWideCoverage ? String(rawCoverage.orgWideCoverage) : undefined,
        classes: Array.isArray(rawCoverage.classes) ? rawCoverage.classes.map((c: Record<string, unknown>) => ({
          name: String(c.name || c.apexClassOrTriggerName || ''),
          coverage: typeof c.coverage === 'number' ? c.coverage :
                    typeof c.percentCovered === 'number' ? c.percentCovered : 0
        })) : undefined
      } : undefined;

      const output: RunApexTestOutput = {
        summary: {
          testsRan: Number(summary.testsRan || summary.numTestsRun || 0),
          passing: Number(summary.passing || summary.numTestsPassed || 0),
          failing: Number(summary.failing || summary.numTestsFailed || 0),
          skipped: Number(summary.skipped || summary.numTestsSkipped || 0),
          passRate: summary.passRate ? String(summary.passRate) : undefined,
          testRunId: summary.testRunId ? String(summary.testRunId) : undefined
        },
        tests,
        coverage,
        estimatedTokens: estimateTokens(rawData)
      };

      return { success: true, data: output };
    } catch (error) {
      return { success: false, error: mapMCPError(error) };
    }
  },

  tokenEstimate: {
    withoutCustomTool: 15000,
    withCustomTool: 0,
    whenUsed: 500,
    reduction: '97%'
  }
};
