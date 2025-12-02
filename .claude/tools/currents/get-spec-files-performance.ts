/**
 * Currents Get Spec Files Performance Tool
 *
 * Retrieves spec file performance metrics with filtering and sorting.
 * Use to find slow or flaky spec files.
 *
 * Token Reduction: Returns only essential metrics vs full spec history
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import {
  validateNoPathTraversal,
  validateNoCommandInjection,
  validateNoControlChars,
} from '../config/lib/sanitize.js';

const GetSpecFilesPerformanceInputSchema = z.object({
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
  order: z.enum([
    'failedExecutions',
    'failureRate',
    'flakeRate',
    'flakyExecutions',
    'fullyReported',
    'overallExecutions',
    'suiteSize',
    'timeoutExecutions',
    'timeoutRate',
    'avgDuration',
  ]),
  orderDirection: z.enum(['asc', 'desc']).optional().default('desc'),
  from: z
    .string()
    .optional()
    .refine((val) => !val || validateNoPathTraversal(val), {
      message: 'from contains invalid path traversal sequences',
    })
    .refine((val) => !val || validateNoCommandInjection(val), {
      message: 'from contains invalid command injection characters',
    })
    .refine((val) => !val || validateNoControlChars(val), {
      message: 'from contains invalid control characters',
    }),
  to: z
    .string()
    .optional()
    .refine((val) => !val || validateNoPathTraversal(val), {
      message: 'to contains invalid path traversal sequences',
    })
    .refine((val) => !val || validateNoCommandInjection(val), {
      message: 'to contains invalid command injection characters',
    })
    .refine((val) => !val || validateNoControlChars(val), {
      message: 'to contains invalid control characters',
    }),
  authors: z
    .array(
      z
        .string()
        .refine((val) => validateNoPathTraversal(val), {
          message: 'author contains invalid path traversal sequences',
        })
        .refine((val) => validateNoCommandInjection(val), {
          message: 'author contains invalid command injection characters',
        })
        .refine((val) => validateNoControlChars(val), {
          message: 'author contains invalid control characters',
        })
    )
    .optional()
    .default([]),
  branches: z
    .array(
      z
        .string()
        .refine((val) => validateNoPathTraversal(val), {
          message: 'branch contains invalid path traversal sequences',
        })
        .refine((val) => validateNoCommandInjection(val), {
          message: 'branch contains invalid command injection characters',
        })
        .refine((val) => validateNoControlChars(val), {
          message: 'branch contains invalid control characters',
        })
    )
    .optional()
    .default([]),
  tags: z
    .array(
      z
        .string()
        .refine((val) => validateNoPathTraversal(val), {
          message: 'tag contains invalid path traversal sequences',
        })
        .refine((val) => validateNoCommandInjection(val), {
          message: 'tag contains invalid command injection characters',
        })
        .refine((val) => validateNoControlChars(val), {
          message: 'tag contains invalid control characters',
        })
    )
    .optional()
    .default([]),
  specNameFilter: z
    .string()
    .optional()
    .refine((val) => !val || validateNoPathTraversal(val), {
      message: 'specNameFilter contains invalid path traversal sequences',
    })
    .refine((val) => !val || validateNoCommandInjection(val), {
      message: 'specNameFilter contains invalid command injection characters',
    })
    .refine((val) => !val || validateNoControlChars(val), {
      message: 'specNameFilter contains invalid control characters',
    }),
  page: z.number().int().min(0).optional().default(0),
  limit: z.number().int().min(1).max(50).optional().default(50),
});

// Raw MCP response interface (based on schema discovery)
interface RawSpecFileData {
  name?: string;
  avgDuration?: number;
  failureRate?: number;
  flakeRate?: number;
  overallExecutions?: number;
  [key: string]: unknown;
}

interface RawMCPResponse {
  specFiles?: RawSpecFileData[];
  [key: string]: unknown;
}

/**
 * Schema Discovery Results (MCP Response Format: Object with array)
 *
 * Based on analysis of Currents API responses:
 * - Response Format: Object containing 'specFiles' array
 * - REQUIRED FIELDS (specFiles array items): name, avgDuration, failureRate, flakeRate, overallExecutions
 * - OPTIONAL FIELDS: Additional performance metrics
 *
 * Field Type Observations:
 * - All numeric fields are consistently numbers
 * - name is always a string (spec file path)
 * - Rates are decimals between 0 and 1
 * - Durations are in milliseconds (numbers)
 */
const GetSpecFilesPerformanceOutputSchema = z.object({
  specFiles: z.array(
    z.object({
      name: z.string(),
      avgDuration: z.number(),
      failureRate: z.number(),
      flakeRate: z.number(),
      overallExecutions: z.number(),
    })
  ),
  totalSpecs: z.number(),
  page: z.number(),
  hasMore: z.boolean(),
  estimatedTokens: z.number(),
});

export const getSpecFilesPerformance = {
  name: 'currents.get-spec-files-performance',
  inputSchema: GetSpecFilesPerformanceInputSchema,
  outputSchema: GetSpecFilesPerformanceOutputSchema,

  async execute(
    input: z.infer<typeof GetSpecFilesPerformanceInputSchema>
  ): Promise<GetSpecFilesPerformanceOutput> {
    const validated = GetSpecFilesPerformanceInputSchema.parse(input);

    const rawData = await callMCPTool<RawMCPResponse>(
      'currents',
      'currents-get-spec-files-performance',
      validated
    );

    // Handle null/undefined rawData
    const safeData = rawData ?? {};
    const safeSpecFiles = safeData.specFiles ?? [];

    // Filter to essentials with type coercion for robustness
    const specFiles = safeSpecFiles.slice(0, validated.limit).map((s) => ({
      name: s.name || 'unknown',
      avgDuration: Number(s.avgDuration) || 0,
      failureRate: Number(s.failureRate) || 0,
      flakeRate: Number(s.flakeRate) || 0,
      overallExecutions: Number(s.overallExecutions) || 0,
    }));

    const filtered = {
      specFiles,
      totalSpecs: safeSpecFiles.length,
      page: validated.page,
      hasMore: safeSpecFiles.length > validated.limit,
      estimatedTokens: Math.ceil(JSON.stringify(specFiles).length / 4),
    };

    return GetSpecFilesPerformanceOutputSchema.parse(filtered);
  },
};

export type GetSpecFilesPerformanceInput = z.infer<typeof GetSpecFilesPerformanceInputSchema>;
export type GetSpecFilesPerformanceOutput = z.infer<typeof GetSpecFilesPerformanceOutputSchema>;
