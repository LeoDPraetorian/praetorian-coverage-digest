/**
 * Currents Get Test Results Tool
 *
 * Retrieves test execution results for debugging failed tests.
 * Filters by signature, status, authors, branches, and tags.
 *
 * Token Reduction: Truncates error messages to 200 chars vs full stack traces
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import { estimateTokens } from '../config/lib/response-utils.js';

const GetTestResultsInputSchema = z.object({
  signature: z.string().min(1),
  status: z.enum(['failed', 'passed', 'skipped', 'pending']).optional(),
  authors: z.array(z.string()).optional().default([]),
  branches: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).optional().default(50),
});

const GetTestResultsOutputSchema = z.object({
  results: z.array(
    z.object({
      status: z.string(),
      duration: z.number(),
      error: z.string().optional(),
    })
  ),
  totalResults: z.number(),
  cursor: z.string().optional(),
  hasMore: z.boolean(),
  estimatedTokens: z.number(),
});

export const getTestResults = {
  name: 'currents.get-test-results',
  inputSchema: GetTestResultsInputSchema,
  outputSchema: GetTestResultsOutputSchema,

  async execute(input: z.infer<typeof GetTestResultsInputSchema>) {
    const validated = GetTestResultsInputSchema.parse(input);

    const rawData = await callMCPTool<any>('currents', 'currents-get-test-results', validated);

    // Filter to essentials, remove full stack traces
    const results = (rawData.results || []).slice(0, validated.limit).map((r: any) => ({
      status: r.status,
      duration: r.duration,
      error: r.error ? r.error.substring(0, 200) : undefined, // Truncate errors
    }));

    const filtered = {
      results,
      totalResults: (rawData.results || []).length,
      cursor: rawData.cursor,
      hasMore: !!(rawData.cursor),
      estimatedTokens: estimateTokens(results),
    };

    return GetTestResultsOutputSchema.parse(filtered);
  },
};

export type GetTestResultsInput = z.infer<typeof GetTestResultsInputSchema>;
export type GetTestResultsOutput = z.infer<typeof GetTestResultsOutputSchema>;
