/**
 * Currents Get Spec Instance Tool
 *
 * Retrieves debugging data for a specific spec instance.
 * Includes test counts, status, duration, and error messages.
 *
 * Token Reduction: Truncates error messages to 300 chars vs full stack traces
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import {
  validateNoPathTraversal,
  validateNoCommandInjection,
  validateNoControlChars,
} from '../config/lib/sanitize.js';

const GetSpecInstanceInputSchema = z.object({
  instanceId: z
    .string()
    .min(1)
    .refine((val) => validateNoPathTraversal(val), {
      message: 'instanceId contains invalid path traversal sequences',
    })
    .refine((val) => validateNoCommandInjection(val), {
      message: 'instanceId contains invalid command injection characters',
    })
    .refine((val) => validateNoControlChars(val), {
      message: 'instanceId contains invalid control characters',
    }),
});

// Raw MCP response interface (based on schema discovery)
interface RawMCPResponse {
  id?: string;
  spec?: string;
  status?: string;
  duration?: number;
  tests?: number;
  passed?: number;
  failed?: number;
  error?: string;
  [key: string]: unknown;
}

/**
 * Schema Discovery Results (MCP Response Format: Object)
 *
 * Based on analysis of Currents API responses:
 * - Response Format: Single object (not array)
 * - REQUIRED FIELDS: id, spec, status, duration, tests, passed, failed
 * - OPTIONAL FIELDS: error (only present when spec instance has failures)
 *
 * Field Type Observations:
 * - All numeric fields are consistently numbers
 * - status is always a string (values: 'passed', 'failed', 'pending', 'running', 'skipped')
 * - spec is the spec file name/path (string)
 * - error is truncated to 300 chars for token reduction
 * - duration is milliseconds (number)
 */
const GetSpecInstanceOutputSchema = z.object({
  instance: z.object({
    id: z.string(),
    spec: z.string(),
    status: z.union([
      z.literal('passed'),
      z.literal('failed'),
      z.literal('pending'),
      z.literal('running'),
      z.literal('skipped'),
      z.string(), // Fallback for unknown status values
    ]),
    duration: z.number(),
    tests: z.number(),
    passed: z.number(),
    failed: z.number(),
    error: z.string().optional(),
  }),
  estimatedTokens: z.number(),
});

export const getSpecInstance = {
  name: 'currents.get-spec-instance',
  inputSchema: GetSpecInstanceInputSchema,
  outputSchema: GetSpecInstanceOutputSchema,

  async execute(
    input: z.infer<typeof GetSpecInstanceInputSchema>
  ): Promise<GetSpecInstanceOutput> {
    const validated = GetSpecInstanceInputSchema.parse(input);

    const rawData = await callMCPTool<RawMCPResponse>(
      'currents',
      'currents-get-spec-instance',
      validated
    );

    // Handle null/undefined rawData
    const safeData = rawData ?? {};

    // Filter to essentials, truncate error messages, with type coercion for robustness
    const instance = {
      id: safeData.id || validated.instanceId,
      spec: safeData.spec || 'unknown',
      status: safeData.status || 'unknown',
      duration: Number(safeData.duration) || 0,
      tests: Number(safeData.tests) || 0,
      passed: Number(safeData.passed) || 0,
      failed: Number(safeData.failed) || 0,
      error: safeData.error ? safeData.error.substring(0, 300) : undefined, // Truncate errors
    };

    const filtered = {
      instance,
      estimatedTokens: Math.ceil(JSON.stringify(instance).length / 4),
    };

    return GetSpecInstanceOutputSchema.parse(filtered);
  },
};

export type GetSpecInstanceInput = z.infer<typeof GetSpecInstanceInputSchema>;
export type GetSpecInstanceOutput = z.infer<typeof GetSpecInstanceOutputSchema>;
