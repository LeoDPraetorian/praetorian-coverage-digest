/**
 * Currents MCP Progressive Loading Wrapper
 *
 * Token Reduction: 2,400 tokens at session start → 0 tokens (100%)
 *                  + ~300-500 tokens per tool when imported (98%+ total reduction)
 *
 * CRITICAL: This implementation calls the Currents MCP server INDEPENDENTLY
 * via MCP SDK, allowing you to DISABLE Currents in Claude Code settings.
 *
 * Setup:
 * 1. DISABLE Currents MCP in .claude/settings.json:
 *    { "enabledMcpjsonServers": [] }  // Remove "currents"
 *
 * 2. Install dependencies:
 *    cd .claude/tools/currents && npm install
 *
 * 3. Verify Currents MCP server is available:
 *    npx -y @modelcontextprotocol/server-currents --version
 *
 * Core wrappers implemented:
 * - getProjects: List all projects (prerequisite)
 * - getTestsPerformance: Test metrics with filtering
 * - getSpecFilesPerformance: Spec metrics with filtering
 * - getTestResults: Test debugging data
 * - getRuns: Latest test runs
 * - getRunDetails: Specific run details
 * - getSpecInstance: Spec debugging data
 * - getTestsSignatures: Test signatures
 *
 * Usage:
 * ```typescript
 * // Import specific tools (progressive loading)
 * import { getProjects } from '.claude/tools/currents/get-projects';
 * import { getTestsPerformance } from '.claude/tools/currents/get-tests-performance';
 *
 * // Or import from index (backward compatibility)
 * import { getProjects, getTestsPerformance } from '.claude/tools/currents';
 *
 * const projects = await getProjects.execute({});
 * const projectId = projects.projects[0].id;
 *
 * const flakyTests = await getTestsPerformance.execute({
 *   projectId,
 *   order: 'flakiness',
 *   orderDirection: 'desc',
 *   limit: 10,
 * });
 * ```
 */

// ============================================================================
// Re-export all tools from individual files
// This maintains backward compatibility while enabling progressive loading
// ============================================================================

export { getProjects } from './get-projects';
export { getTestsPerformance } from './get-tests-performance';
export { getSpecFilesPerformance } from './get-spec-files-performance';
export { getTestResults } from './get-test-results';
export { getRuns } from './get-runs';
export { getRunDetails } from './get-run-details';
export { getSpecInstance } from './get-spec-instance';
export { getTestsSignatures } from './get-tests-signatures';

// ============================================================================
// Re-export types
// ============================================================================

export type {
  GetProjectsInput,
  GetProjectsOutput,
} from './get-projects';

export type {
  GetTestsPerformanceInput,
  GetTestsPerformanceOutput,
} from './get-tests-performance';

export type {
  GetSpecFilesPerformanceInput,
  GetSpecFilesPerformanceOutput,
} from './get-spec-files-performance';

export type {
  GetTestResultsInput,
  GetTestResultsOutput,
} from './get-test-results';

export type {
  GetRunsInput,
  GetRunsOutput,
} from './get-runs';

export type {
  GetRunDetailsInput,
  GetRunDetailsOutput,
} from './get-run-details';

export type {
  GetSpecInstanceInput,
  GetSpecInstanceOutput,
} from './get-spec-instance';

export type {
  GetTestsSignaturesInput,
  GetTestsSignaturesOutput,
} from './get-tests-signatures';
