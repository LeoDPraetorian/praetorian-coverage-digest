/**
 * Currents Get Run Details Tool
 *
 * Retrieves detailed information about a specific test run.
 * Includes test counts, status, and duration.
 *
 * Token Reduction: Returns only essential run details vs full configuration
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import {
  validateNoPathTraversal,
  validateNoCommandInjection,
  validateNoControlChars,
} from '../config/lib/sanitize.js';

const GetRunDetailsInputSchema = z.object({
  runId: z
    .string()
    .min(1)
    .refine((val) => validateNoPathTraversal(val), {
      message: 'runId contains invalid path traversal sequences',
    })
    .refine((val) => validateNoCommandInjection(val), {
      message: 'runId contains invalid command injection characters',
    })
    .refine((val) => validateNoControlChars(val), {
      message: 'runId contains invalid control characters',
    }),
});

// Raw MCP response interface (based on schema discovery)
interface RawMCPResponse {
  id?: string;
  status?: string;
  createdAt?: string;
  specs?: number;
  tests?: number;
  passed?: number;
  failed?: number;
  skipped?: number;
  pending?: number;
  duration?: number;
  [key: string]: unknown; // Allow additional fields
}

/**
 * Schema Discovery Results (MCP Response Format: Object)
 *
 * Based on analysis of Currents API responses:
 * - Response Format: Single object (not array)
 * - REQUIRED FIELDS (100%): id, status, createdAt, specs, tests, passed, failed, skipped, pending
 * - OPTIONAL FIELDS: duration (only present when run is completed)
 *
 * Field Type Observations:
 * - All numeric fields are consistently numbers
 * - status is always a string (values: 'running', 'completed', 'failed', 'cancelled', 'timeout')
 * - createdAt is ISO 8601 timestamp string
 * - duration is milliseconds (number) when present
 */
const GetRunDetailsOutputSchema = z.object({
  run: z.object({
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
    passed: z.number(),
    failed: z.number(),
    skipped: z.number(),
    pending: z.number(),
    duration: z.number().optional(),
  }),
  estimatedTokens: z.number(),
});

export const getRunDetails = {
  name: 'currents.get-run-details',
  inputSchema: GetRunDetailsInputSchema,
  outputSchema: GetRunDetailsOutputSchema,

  async execute(input: z.infer<typeof GetRunDetailsInputSchema>): Promise<GetRunDetailsOutput> {
    const validated = GetRunDetailsInputSchema.parse(input);

    const rawData = await callMCPTool<RawMCPResponse>('currents', 'currents-get-run-details', validated);

    // Handle null/undefined rawData
    const safeData = rawData ?? {};

    // Filter to essentials with type coercion for robustness
    const run = {
      id: safeData.id || validated.runId,
      status: safeData.status || 'unknown',
      createdAt: safeData.createdAt || new Date().toISOString(),
      specs: Number(safeData.specs) || 0,
      tests: Number(safeData.tests) || 0,
      passed: Number(safeData.passed) || 0,
      failed: Number(safeData.failed) || 0,
      skipped: Number(safeData.skipped) || 0,
      pending: Number(safeData.pending) || 0,
      duration: safeData.duration !== undefined ? Number(safeData.duration) : undefined,
    };

    const filtered = {
      run,
      estimatedTokens: Math.ceil(JSON.stringify(run).length / 4),
    };

    return GetRunDetailsOutputSchema.parse(filtered);
  },
};

export type GetRunDetailsInput = z.infer<typeof GetRunDetailsInputSchema>;
export type GetRunDetailsOutput = z.infer<typeof GetRunDetailsOutputSchema>;
