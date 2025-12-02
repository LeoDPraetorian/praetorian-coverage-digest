/**
 * Currents Get Projects Tool
 *
 * Lists all projects available in Currents. This is a prerequisite for all other operations.
 *
 * Token Reduction: Returns only essential project information (id, name) vs full metadata
 *
 * Schema Discovery Results (MCP Response Format: Direct array)
 *
 * Based on analysis of Currents API responses (see discover-get-projects-schema.ts):
 * - Response Format: Direct array of project objects (not wrapped in object)
 * - REQUIRED FIELDS: projectId, name, createdAt, failFast, inactivityTimeoutSeconds, defaultBranchName, cursor
 * - OPTIONAL FIELDS: None observed (based on 1 project sample)
 * - NOTE: Additional fields filtered out for token reduction
 *
 * Field Mapping:
 * - projectId → id (mapped for consistent interface)
 * - name → name (preserved)
 * - All other fields filtered out (createdAt, failFast, etc.)
 *
 * Input: None (no parameters required)
 * Output: Filtered project list with token estimation
 */

import { z } from 'zod';
import { callMCPTool } from '../config/lib/mcp-client';

// Raw MCP response interface (based on schema discovery)
interface RawProjectData {
  projectId: string;
  name: string;
  createdAt?: string;
  failFast?: boolean;
  inactivityTimeoutSeconds?: number;
  defaultBranchName?: string;
  cursor?: string;
  [key: string]: unknown;
}

const GetProjectsInputSchema = z.object({});

/**
 * Output Schema
 * - Response Format: Object with projects array
 * - REQUIRED FIELDS: projects (array of {id, name}), totalProjects, estimatedTokens
 */
const GetProjectsOutputSchema = z.object({
  projects: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
    })
  ),
  totalProjects: z.number(),
  estimatedTokens: z.number(),
});

export const getProjects = {
  name: 'currents.get-projects',
  inputSchema: GetProjectsInputSchema,
  outputSchema: GetProjectsOutputSchema,

  async execute(input: z.infer<typeof GetProjectsInputSchema>) {
    // Validate input
    GetProjectsInputSchema.parse(input);

    // Call Currents MCP server - returns direct array (not wrapped in object)
    const rawData = await callMCPTool<RawProjectData[]>('currents', 'currents-get-projects', {});

    // Handle null/undefined rawData - ensure it's an array
    const safeProjects = Array.isArray(rawData) ? rawData : [];

    // Filter to essentials and map projectId → id
    // Type guard: filter ensures both projectId and name exist
    const projects = safeProjects
      .filter((p): p is RawProjectData & { projectId: string; name: string } =>
        Boolean(p.projectId && p.name)
      )
      .map((p) => ({
        id: p.projectId,  // Map projectId → id for consistent interface
        name: p.name,
        // Removed: createdAt, failFast, inactivityTimeoutSeconds, etc.
      }));

    // Calculate token estimate (0 for empty projects)
    const jsonString = JSON.stringify(projects);
    const estimatedTokens = projects.length === 0 ? 0 : Math.ceil(jsonString.length / 4);

    const filtered = {
      projects,
      totalProjects: projects.length,
      estimatedTokens,
    };

    return GetProjectsOutputSchema.parse(filtered);
  },
};

export type GetProjectsInput = z.infer<typeof GetProjectsInputSchema>;
export type GetProjectsOutput = z.infer<typeof GetProjectsOutputSchema>;
