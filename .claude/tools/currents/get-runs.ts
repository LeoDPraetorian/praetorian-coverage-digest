/**
 * Currents Get Runs Tool
 *
 * Retrieves latest test runs for a project.
 * Supports cursor-based pagination.
 *
 * Token Reduction: Returns only essential run information vs full metadata
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import {
  validateNoPathTraversal,
  validateNoCommandInjection,
  validateNoControlChars,
} from '../config/lib/sanitize.js';

const GetRunsInputSchema = z.object({
  projectId: z
    .string()
    .min(1)
    .refine((val) => validateNoPathTraversal(val), {
      message: 'projectId contains invalid path traversal sequences',
    })
    .refine((val) => validateNoCommandInjection(val), {
      message: 'projectId contains invalid command injection characters',
    })
    .refine((val) => validateNoControlChars(val), {
      message: 'projectId contains invalid control characters',
    }),
  cursor: z
    .string()
    .optional()
    .refine((val) => !val || validateNoPathTraversal(val), {
      message: 'cursor contains invalid path traversal sequences',
    })
    .refine((val) => !val || validateNoCommandInjection(val), {
      message: 'cursor contains invalid command injection characters',
    })
    .refine((val) => !val || validateNoControlChars(val), {
      message: 'cursor contains invalid control characters',
    }),
  limit: z.number().int().min(1).max(50).optional().default(50),
});

// Raw MCP response interface (based on schema discovery)
interface RawRunData {
  id?: string;
  status?: string;
  createdAt?: string;
  specs?: number;
  tests?: number;
  [key: string]: unknown;
}

interface RawMCPResponse {
  runs?: RawRunData[];
  cursor?: string;
  [key: string]: unknown;
}

/**
 * Schema Discovery Results (MCP Response Format: Object with array)
 *
 * Based on analysis of Currents API responses:
 * - Response Format: Object containing 'runs' array + pagination metadata
 * - REQUIRED FIELDS (runs array items): id, status, createdAt, specs, tests
 * - OPTIONAL FIELDS: cursor (pagination token when hasMore is true)
 *
 * Field Type Observations:
 * - All numeric fields are consistently numbers
 * - status is always a string (values: 'running', 'completed', 'failed', 'cancelled', 'timeout')
 * - createdAt is ISO 8601 timestamp string
 * - cursor is opaque pagination token (string)
 */
const GetRunsOutputSchema = z.object({
  runs: z.array(
    z.object({
      id: z.string(),
      status: z.union([
        z.literal('running'),
        z.literal('completed'),
        z.literal('failed'),
        z.literal('cancelled'),
        z.literal('timeout'),
        z.string(), // Fallback for unknown status values
      ]),
      createdAt: z.string(),
      specs: z.number(),
      tests: z.number(),
    })
  ),
  totalRuns: z.number(),
  cursor: z.string().optional(),
  hasMore: z.boolean(),
  estimatedTokens: z.number(),
});

export const getRuns = {
  name: 'currents.get-runs',
  inputSchema: GetRunsInputSchema,
  outputSchema: GetRunsOutputSchema,

  async execute(input: z.infer<typeof GetRunsInputSchema>): Promise<GetRunsOutput> {
    const validated = GetRunsInputSchema.parse(input);

    const rawData = await callMCPTool<RawMCPResponse>('currents', 'currents-get-runs', validated);

    // Handle null/undefined rawData
    const safeData = rawData ?? {};
    const safeRuns = safeData.runs ?? [];

    // Filter to essentials only with type coercion for robustness
    const runs = safeRuns.slice(0, validated.limit).map((r) => ({
      id: r.id || 'unknown',
      status: r.status || 'unknown',
      createdAt: r.createdAt || new Date().toISOString(),
      specs: Number(r.specs) || 0,
      tests: Number(r.tests) || 0,
    }));

    const filtered = {
      runs,
      totalRuns: safeRuns.length,
      cursor: safeData.cursor,
      hasMore: !!safeData.cursor,
      estimatedTokens: Math.ceil(JSON.stringify(runs).length / 4),
    };

    return GetRunsOutputSchema.parse(filtered);
  },
};

export type GetRunsInput = z.infer<typeof GetRunsInputSchema>;
export type GetRunsOutput = z.infer<typeof GetRunsOutputSchema>;
