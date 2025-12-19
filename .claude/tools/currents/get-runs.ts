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

// Raw MCP response interface (based on actual API response)
interface RawGroupData {
  instances?: {
    overall?: number;
    claimed?: number;
    complete?: number;
    passes?: number;
    failures?: number;
  };
  tests?: {
    overall?: number;
    tests?: number;
    passes?: number;
    failures?: number;
    pending?: number;
    skipped?: number;
    flaky?: number;
  };
  groupId?: string;
}

interface RawRunData {
  runId?: string;
  projectId?: string;
  status?: string;
  completionState?: string;
  createdAt?: string;
  durationMs?: number;
  timeout?: {
    isTimeout?: boolean;
    timeoutValueMs?: number;
  };
  groups?: RawGroupData[];
  tags?: string[];
  cursor?: string;
  meta?: {
    ciBuildId?: string;
    commit?: {
      branch?: string;
      sha?: string;
      message?: string;
      authorName?: string;
    };
  };
  [key: string]: unknown;
}

interface RawMCPResponse {
  status?: string;
  data?: RawRunData[];
  has_more?: boolean;
  [key: string]: unknown;
}

/**
 * Schema Discovery Results (MCP Response Format: Object with data array)
 *
 * Based on actual API response analysis:
 * - Response Format: { status: "OK", data: [...], has_more: boolean }
 * - Run fields: runId, status, completionState, createdAt, groups[], tags[], meta
 * - Groups contain instances (specs) and tests counts
 *
 * Status values: 'RUNNING', 'FAILED', 'PASSED', 'CANCELLED'
 * CompletionState values: 'TIMEOUT', 'COMPLETE', 'CANCELLED'
 */
const GetRunsOutputSchema = z.object({
  runs: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      completionState: z.string(),
      createdAt: z.string(),
      durationMs: z.number(),
      isTimeout: z.boolean(),
      specs: z.object({
        total: z.number(),
        complete: z.number(),
        passes: z.number(),
        failures: z.number(),
      }),
      tests: z.object({
        total: z.number(),
        passes: z.number(),
        failures: z.number(),
        pending: z.number(),
        flaky: z.number(),
      }),
      branch: z.string().optional(),
      commit: z.string().optional(),
      ciBuildId: z.string().optional(),
      tags: z.array(z.string()),
    })
  ),
  totalRuns: z.number(),
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

    // Handle null/undefined rawData - API returns { status, data, has_more }
    const safeData = rawData ?? {};
    const safeRuns = safeData.data ?? [];

    // Transform API response to our schema
    const runs = safeRuns.slice(0, validated.limit).map((r) => {
      // Aggregate stats across all groups (chromium, slow, etc.)
      const aggregatedSpecs = {
        total: 0,
        complete: 0,
        passes: 0,
        failures: 0,
      };
      const aggregatedTests = {
        total: 0,
        passes: 0,
        failures: 0,
        pending: 0,
        flaky: 0,
      };

      for (const group of r.groups ?? []) {
        if (group.instances) {
          aggregatedSpecs.total += group.instances.overall ?? 0;
          aggregatedSpecs.complete += group.instances.complete ?? 0;
          aggregatedSpecs.passes += group.instances.passes ?? 0;
          aggregatedSpecs.failures += group.instances.failures ?? 0;
        }
        if (group.tests) {
          aggregatedTests.total += group.tests.overall ?? 0;
          aggregatedTests.passes += group.tests.passes ?? 0;
          aggregatedTests.failures += group.tests.failures ?? 0;
          aggregatedTests.pending += group.tests.pending ?? 0;
          aggregatedTests.flaky += group.tests.flaky ?? 0;
        }
      }

      return {
        id: r.runId || 'unknown',
        status: r.status || 'unknown',
        completionState: r.completionState || 'unknown',
        createdAt: r.createdAt || new Date().toISOString(),
        durationMs: r.durationMs ?? 0,
        isTimeout: r.timeout?.isTimeout ?? false,
        specs: aggregatedSpecs,
        tests: aggregatedTests,
        branch: r.meta?.commit?.branch,
        commit: r.meta?.commit?.sha,
        ciBuildId: r.meta?.ciBuildId,
        tags: r.tags ?? [],
      };
    });

    const filtered = {
      runs,
      totalRuns: safeRuns.length,
      hasMore: safeData.has_more ?? false,
      estimatedTokens: Math.ceil(JSON.stringify(runs).length / 4),
    };

    return GetRunsOutputSchema.parse(filtered);
  },
};

export type GetRunsInput = z.infer<typeof GetRunsInputSchema>;
export type GetRunsOutput = z.infer<typeof GetRunsOutputSchema>;
