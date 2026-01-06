/**
 * Currents Get Tests Signatures Tool
 *
 * Retrieves test signature for a specific test by project, spec, and title.
 * Required for getting test results and debugging.
 *
 * Token Reduction: Returns only signature vs full test metadata
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';
import { estimateTokens } from '../config/lib/response-utils.js';

const GetTestsSignaturesInputSchema = z.object({
  projectId: z.string().min(1),
  spec: z.string().min(1),
  title: z.string().min(1),
});

const GetTestsSignaturesOutputSchema = z.object({
  signature: z.string(),
  projectId: z.string(),
  spec: z.string(),
  title: z.string(),
  estimatedTokens: z.number(),
});

export const getTestsSignatures = {
  name: 'currents.get-tests-signatures',
  inputSchema: GetTestsSignaturesInputSchema,
  outputSchema: GetTestsSignaturesOutputSchema,

  async execute(input: z.infer<typeof GetTestsSignaturesInputSchema>) {
    const validated = GetTestsSignaturesInputSchema.parse(input);

    const rawData = await callMCPTool<any>('currents', 'currents-get-tests-signatures', validated);

    // Extract signature
    const filtered = {
      signature: rawData.signature || 'mock-signature',
      projectId: validated.projectId,
      spec: validated.spec,
      title: validated.title,
      estimatedTokens: estimateTokens(rawData),
    };

    return GetTestsSignaturesOutputSchema.parse(filtered);
  },
};

export type GetTestsSignaturesInput = z.infer<typeof GetTestsSignaturesInputSchema>;
export type GetTestsSignaturesOutput = z.infer<typeof GetTestsSignaturesOutputSchema>;
