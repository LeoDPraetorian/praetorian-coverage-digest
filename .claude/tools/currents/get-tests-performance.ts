/**
 * Currents Get Tests Performance Tool
 *
 * Retrieves test performance metrics with filtering and sorting.
 * Use to find slow or flaky tests.
 *
 * Token Reduction: Returns only essential metrics vs full test history
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';

const GetTestsPerformanceInputSchema = z.object({
  projectId: z.string().min(1),
  order: z.enum(['duration', 'executions', 'failures', 'flakiness', 'passes', 'title']),
  orderDirection: z.enum(['asc', 'desc']).optional().default('desc'),
  from: z.string().optional(),
  to: z.string().optional(),
  authors: z.array(z.string()).optional().default([]),
  branches: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  testNameFilter: z.string().optional(),
  specNameFilter: z.string().optional(),
  page: z.number().int().min(0).optional().default(0),
  limit: z.number().int().min(1).max(50).optional().default(50),
});

const GetTestsPerformanceOutputSchema = z.object({
  tests: z.array(
    z.object({
      title: z.string(),
      duration: z.number(),
      executions: z.number(),
      failures: z.number(),
      flakiness: z.number(),
      passes: z.number(),
    })
  ),
  totalTests: z.number(),
  page: z.number(),
  hasMore: z.boolean(),
  estimatedTokens: z.number(),
});

export const getTestsPerformance = {
  name: 'currents.get-tests-performance',
  inputSchema: GetTestsPerformanceInputSchema,
  outputSchema: GetTestsPerformanceOutputSchema,

  async execute(input: z.infer<typeof GetTestsPerformanceInputSchema>) {
    const validated = GetTestsPerformanceInputSchema.parse(input);

    const rawData = await callMCPTool<any>('currents', 'currents-get-tests-performance', validated);

    // Filter to essentials only
    const tests = (rawData.tests || []).slice(0, validated.limit).map((t: any) => ({
      title: t.title,
      duration: t.duration,
      executions: t.executions,
      failures: t.failures,
      flakiness: t.flakiness,
      passes: t.passes,
    }));

    const filtered = {
      tests,
      totalTests: (rawData.tests || []).length,
      page: validated.page,
      hasMore: (rawData.tests || []).length > validated.limit,
      estimatedTokens: Math.ceil(JSON.stringify(tests).length / 4),
    };

    return GetTestsPerformanceOutputSchema.parse(filtered);
  },
};

export type GetTestsPerformanceInput = z.infer<typeof GetTestsPerformanceInputSchema>;
export type GetTestsPerformanceOutput = z.infer<typeof GetTestsPerformanceOutputSchema>;
