/**
 * Praetorian-CLI MCP Wrappers - Shared Test Fixtures
 *
 * Provides common test utilities, mock data, and setup functions
 * for per-wrapper unit tests. Import these to avoid repetition.
 *
 * Usage in per-wrapper test files:
 *
 * ```typescript
 * import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
 * import {
 *   setupMCPMock,
 *   createTestContext,
 *   MockAsset,
 *   MCPErrors,
 * } from './test-fixtures';
 *
 * // IMPORTANT: Must call before importing wrapper
 * setupMCPMock();
 *
 * import { assetsList } from './assets-list';
 * import { getMockedMCPClient } from './test-fixtures';
 *
 * describe('assetsList', () => {
 *   const ctx = createTestContext();
 *
 *   beforeEach(() => ctx.beforeEach());
 *   afterEach(() => ctx.afterEach());
 *
 *   it('should work', async () => {
 *     ctx.mcpMock.mockResolvedValue([[MockAsset], null]);
 *     const result = await assetsList.execute({});
 *     expect(result).toBeDefined();
 *   });
 * });
 * ```
 */

import { vi } from 'vitest';
import {
  createMCPMock,
  getAllSecurityScenarios,
  testSecurityScenarios,
  EdgeCaseData,
} from '@claude/testing';

// ============================================================================
// Re-exports from @claude/testing
// ============================================================================

export { createMCPMock, getAllSecurityScenarios, testSecurityScenarios, EdgeCaseData };

// ============================================================================
// MCP Error Factories (defined here to avoid re-export issues)
// ============================================================================

/**
 * Common MCP errors for testing error handling.
 * Defined locally to avoid re-export issues with vitest.
 */
export const MCPErrors = {
  rateLimit: () => new Error('Rate limited due to too many requests'),
  serverError: () => new Error('MCP server internal error'),
  timeout: () => new Error('ETIMEDOUT'),
  notFound: (resource: string) => new Error(`Resource not found: ${resource}`),
  unauthorized: () => new Error('Authentication required'),
  invalidResponse: () => new Error('Invalid response format from MCP server'),
  networkError: () => new Error('Network error: ECONNREFUSED'),
  badRequest: (message: string) => new Error(`Bad request: ${message}`),
};

// ============================================================================
// MCP Client Mock Setup
// ============================================================================

/**
 * Sets up the MCP client mock. MUST be called before importing any wrapper.
 *
 * Factory mock pattern prevents module loading errors by ensuring
 * the mock is in place before the wrapper tries to import mcp-client.
 *
 * @example
 * ```typescript
 * // At top of test file, BEFORE wrapper imports:
 * import { setupMCPMock } from './test-fixtures';
 * setupMCPMock();
 *
 * // Now safe to import wrapper:
 * import { assetsList } from './assets-list';
 * ```
 */
export function setupMCPMock(): void {
  vi.mock('../config/lib/mcp-client.js', () => ({
    callMCPTool: vi.fn(),
  }));
}

/**
 * Gets the mocked MCP client for test assertions.
 * Call this AFTER setupMCPMock() and wrapper imports.
 *
 * @returns The mocked mcpClient module
 */
export async function getMockedMCPClient() {
  const mcpClient = await import('../config/lib/mcp-client.js');
  return mcpClient;
}

// ============================================================================
// Test Context Factory
// ============================================================================

export interface TestContext {
  mcpMock: ReturnType<typeof createMCPMock>;
  beforeEach: () => Promise<void>;
  afterEach: () => void;
}

/**
 * Creates a test context with MCP mock and lifecycle hooks.
 *
 * @example
 * ```typescript
 * describe('myWrapper', () => {
 *   const ctx = createTestContext();
 *
 *   beforeEach(() => ctx.beforeEach());
 *   afterEach(() => ctx.afterEach());
 *
 *   it('should work', async () => {
 *     ctx.mcpMock.mockResolvedValue([[MockAsset], null]);
 *     // ... test
 *   });
 * });
 * ```
 */
export function createTestContext(): TestContext {
  let mcpMock: ReturnType<typeof createMCPMock>;

  return {
    get mcpMock() {
      return mcpMock;
    },
    async beforeEach() {
      mcpMock = createMCPMock();
      const mcpClient = await getMockedMCPClient();
      vi.mocked(mcpClient.callMCPTool).mockImplementation(mcpMock);
    },
    afterEach() {
      vi.clearAllMocks();
    },
  };
}

// ============================================================================
// Mock Data Builders - Assets
// ============================================================================

export const MockAsset = {
  key: '#asset#example.com#192.168.1.1',
  dns: 'example.com',
  name: 'example.com',
  status: 'A',
  class: 'ipv4',
  created: '2025-01-15T00:00:00Z',
  source: 'seed',
  updated: '2025-01-15T12:00:00Z',
  metadata: { verbose: 'data', extra: 'fields' },
} as const;

export function createMockAsset(overrides: Partial<typeof MockAsset> = {}): typeof MockAsset {
  return { ...MockAsset, ...overrides };
}

export function createMockAssets(count: number, overrides: Partial<typeof MockAsset> = []) {
  return Array(count)
    .fill(null)
    .map((_, i) => ({
      ...MockAsset,
      key: `#asset#example${i}.com#192.168.1.${i}`,
      ...overrides,
    }));
}

export function createVerboseAssets(count: number) {
  return Array(count)
    .fill(null)
    .map((_, i) => ({
      ...MockAsset,
      key: `#asset#example${i}.com#192.168.1.${i}`,
      metadata: { verbose: 'A'.repeat(500) },
      extraField1: 'data',
      extraField2: 'more data',
    }));
}

// ============================================================================
// Mock Data Builders - Risks
// ============================================================================

export const MockRisk = {
  key: '#risk#example.com#sql-injection',
  name: 'SQL Injection',
  status: 'OC', // Open Critical
  dns: 'example.com',
  created: '2025-01-15T00:00:00Z',
  description: 'SQL injection vulnerability found',
  cvss: 9.8,
  metadata: { verbose: 'data' },
} as const;

export function createMockRisk(overrides: Partial<typeof MockRisk> = {}): typeof MockRisk {
  return { ...MockRisk, ...overrides };
}

export function createMockRisks(count: number, overrides: Partial<typeof MockRisk> = {}) {
  return Array(count)
    .fill(null)
    .map((_, i) => ({
      ...MockRisk,
      key: `#risk#example.com#vuln-${i}`,
      ...overrides,
    }));
}

export function createVerboseRisks(count: number) {
  return Array(count)
    .fill(null)
    .map((_, i) => ({
      ...MockRisk,
      key: `#risk#example.com#vuln-${i}`,
      description: 'A'.repeat(1000),
      metadata: { verbose: 'data'.repeat(100) },
    }));
}

/** Create risks with different severity levels */
export function createRisksBySeverity() {
  return [
    { ...MockRisk, status: 'OC', key: '#risk#example.com#critical' }, // Critical
    { ...MockRisk, status: 'OH', key: '#risk#example.com#high' }, // High
    { ...MockRisk, status: 'OM', key: '#risk#example.com#medium' }, // Medium
    { ...MockRisk, status: 'OL', key: '#risk#example.com#low' }, // Low
  ];
}

// ============================================================================
// Mock Data Builders - Capabilities
// ============================================================================

export const MockCapability = {
  name: 'nuclei',
  title: 'Nuclei Scanner',
  target: 'asset',
  executor: 'chariot',
  surface: 'external',
  description: 'Vulnerability scanner',
} as const;

export function createMockCapability(
  overrides: Partial<typeof MockCapability> = {}
): typeof MockCapability {
  return { ...MockCapability, ...overrides };
}

export function createMockCapabilities(count: number, overrides: Partial<typeof MockCapability> = {}) {
  return Array(count)
    .fill(null)
    .map((_, i) => ({
      ...MockCapability,
      name: `capability-${i}`,
      ...overrides,
    }));
}

// ============================================================================
// Mock Data Builders - Jobs
// ============================================================================

export const MockJob = {
  key: '#job#12345',
  capability: 'nuclei',
  status: 'completed',
  target: 'example.com',
  created: '2025-01-15T00:00:00Z',
} as const;

export function createMockJob(overrides: Partial<typeof MockJob> = {}): typeof MockJob {
  return { ...MockJob, ...overrides };
}

export function createMockJobs(count: number, overrides: Partial<typeof MockJob> = {}) {
  return Array(count)
    .fill(null)
    .map((_, i) => ({
      ...MockJob,
      key: `#job#${12345 + i}`,
      ...overrides,
    }));
}

// ============================================================================
// Mock Data Builders - Attributes
// ============================================================================

export const MockAttribute = {
  key: '#attribute#example.com#port-80',
  name: 'port-80',
  value: '80',
  class: 'port',
  source: 'portscan',
} as const;

export function createMockAttribute(
  overrides: Partial<typeof MockAttribute> = {}
): typeof MockAttribute {
  return { ...MockAttribute, ...overrides };
}

export function createMockAttributes(count: number, overrides: Partial<typeof MockAttribute> = {}) {
  return Array(count)
    .fill(null)
    .map((_, i) => ({
      ...MockAttribute,
      key: `#attribute#example.com#port-${80 + i}`,
      name: `port-${80 + i}`,
      value: `${80 + i}`,
      ...overrides,
    }));
}

// ============================================================================
// Mock Data Builders - Seeds
// ============================================================================

export const MockSeed = {
  key: '#seed#example.com',
  dns: 'example.com',
  status: 'A',
  created: '2025-01-01T00:00:00Z',
} as const;

export function createMockSeed(overrides: Partial<typeof MockSeed> = {}): typeof MockSeed {
  return { ...MockSeed, ...overrides };
}

export function createMockSeeds(count: number, overrides: Partial<typeof MockSeed> = {}) {
  return Array(count)
    .fill(null)
    .map((_, i) => ({
      ...MockSeed,
      key: `#seed#example${i}.com`,
      dns: `example${i}.com`,
      ...overrides,
    }));
}

// ============================================================================
// Mock Data Builders - Integrations
// ============================================================================

export const MockIntegration = {
  key: '#integration#slack',
  name: 'slack',
  status: 'A',
  config: { webhook: 'https://...' },
} as const;

export function createMockIntegration(
  overrides: Partial<typeof MockIntegration> = {}
): typeof MockIntegration {
  return { ...MockIntegration, ...overrides };
}

export function createMockIntegrations(
  count: number,
  overrides: Partial<typeof MockIntegration> = {}
) {
  return Array(count)
    .fill(null)
    .map((_, i) => ({
      ...MockIntegration,
      key: `#integration#integration-${i}`,
      name: `integration-${i}`,
      ...overrides,
    }));
}

// ============================================================================
// Mock Data Builders - Preseeds
// ============================================================================

export const MockPreseed = {
  key: '#preseed#192.168.1.0/24',
  value: '192.168.1.0/24',
  type: 'cidr',
  status: 'A',
} as const;

export function createMockPreseed(overrides: Partial<typeof MockPreseed> = {}): typeof MockPreseed {
  return { ...MockPreseed, ...overrides };
}

export function createMockPreseeds(count: number, overrides: Partial<typeof MockPreseed> = {}) {
  return Array(count)
    .fill(null)
    .map((_, i) => ({
      ...MockPreseed,
      key: `#preseed#192.168.${i}.0/24`,
      value: `192.168.${i}.0/24`,
      ...overrides,
    }));
}

// ============================================================================
// Mock Data Builders - Aegis Agents
// ============================================================================

export const MockAegis = {
  client_id: 'agent-123',
  hostname: 'server-001',
  os: 'linux',
  is_online: true,
  has_tunnel: true,
} as const;

export function createMockAegis(overrides: Partial<typeof MockAegis> = {}): typeof MockAegis {
  return { ...MockAegis, ...overrides };
}

export function createMockAegisAgents(count: number, overrides: Partial<typeof MockAegis> = {}) {
  return Array(count)
    .fill(null)
    .map((_, i) => ({
      ...MockAegis,
      client_id: `agent-${i}`,
      hostname: `server-${String(i).padStart(3, '0')}`,
      ...overrides,
    }));
}

// ============================================================================
// Mock Data Builders - API Keys
// ============================================================================

export const MockKey = {
  key: '#key#api-key-1',
  name: 'api-key-1',
  expires: '2025-12-31',
  creator: 'user@example.com',
  status: 'A',
} as const;

export function createMockKey(overrides: Partial<typeof MockKey> = {}): typeof MockKey {
  return { ...MockKey, ...overrides };
}

export function createMockKeys(count: number, overrides: Partial<typeof MockKey> = {}) {
  return Array(count)
    .fill(null)
    .map((_, i) => ({
      ...MockKey,
      key: `#key#api-key-${i}`,
      name: `api-key-${i}`,
      ...overrides,
    }));
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Calculate token reduction percentage between raw MCP response and filtered result.
 *
 * @param rawResponse - The raw MCP response (array, tuple, or object)
 * @param filteredResult - The filtered wrapper output
 * @returns Reduction percentage (0-100)
 *
 * @example
 * ```typescript
 * const raw = [verboseAssets, null];
 * const result = await assetsList.execute({});
 * expect(calculateReduction(raw, result)).toBeGreaterThanOrEqual(80);
 * ```
 */
export function calculateReduction(rawResponse: unknown, filteredResult: unknown): number {
  const inputSize = JSON.stringify(rawResponse).length;
  const outputSize = JSON.stringify(filteredResult).length;
  return ((inputSize - outputSize) / inputSize) * 100;
}

/**
 * Create a graph query JSON string for search_by_query tests.
 *
 * @param labels - Node labels (e.g., ['Asset'], ['Risk'])
 * @param filters - Optional filters
 * @returns JSON string suitable for search_by_query input
 */
export function createGraphQuery(
  labels: string[],
  filters: Array<{ field: string; operator: string; value: string }> = []
): string {
  return JSON.stringify({
    node: { labels, filters },
  });
}

/**
 * Edge case inputs for security and robustness testing.
 */
export const EdgeCaseInputs = {
  empty: '',
  whitespace: '   ',
  tab: '\t',
  newline: '\n',
  nullChar: '\0',
  unicode: '日本語',
  emoji: '🔥💀',
  sqlInjection: "'; DROP TABLE assets; --",
  xss: '<script>alert("xss")</script>',
  pathTraversal: '../../../etc/passwd',
  commandInjection: '$(whoami)',
} as const;

/**
 * Test that a wrapper handles edge case inputs without crashing.
 *
 * @param wrapper - The wrapper execute function
 * @param inputField - The field name to test
 * @param edgeCases - Array of edge case values to test
 */
export async function testEdgeCaseInputs(
  wrapper: { execute: (input: Record<string, unknown>) => Promise<unknown> },
  inputField: string,
  edgeCases: string[] = Object.values(EdgeCaseInputs)
): Promise<void> {
  for (const edge of edgeCases) {
    try {
      await wrapper.execute({ [inputField]: edge });
    } catch {
      // Schema rejection is acceptable - we're testing it doesn't crash
    }
  }
}

// ============================================================================
// Performance Testing Utilities
// ============================================================================

/**
 * Measure average execution time over multiple iterations.
 *
 * @param fn - Async function to measure
 * @param iterations - Number of iterations (default 50)
 * @returns Average time in milliseconds
 */
export async function measureAvgExecutionTime(
  fn: () => Promise<unknown>,
  iterations = 50
): Promise<number> {
  const start = Date.now();

  for (let i = 0; i < iterations; i++) {
    await fn();
  }

  return (Date.now() - start) / iterations;
}

// ============================================================================
// Type Exports
// ============================================================================

export type MockAssetType = typeof MockAsset;
export type MockRiskType = typeof MockRisk;
export type MockCapabilityType = typeof MockCapability;
export type MockJobType = typeof MockJob;
export type MockAttributeType = typeof MockAttribute;
export type MockSeedType = typeof MockSeed;
export type MockIntegrationType = typeof MockIntegration;
export type MockPreseedType = typeof MockPreseed;
export type MockAegisType = typeof MockAegis;
export type MockKeyType = typeof MockKey;
