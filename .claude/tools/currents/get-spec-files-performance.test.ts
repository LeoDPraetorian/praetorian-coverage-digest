/**
 * Get Spec Files Performance Tool Tests
 *
 * Tests the getSpecFilesPerformance tool wrapper with validation.
 */

import { getSpecFilesPerformance } from './get-spec-files-performance';
import { isMCPAvailable } from '../config/lib/mcp-client';

describe('getSpecFilesPerformance', () => {
  beforeAll(async () => {
    const mcpAvailable = await isMCPAvailable('currents', 'currents-get-spec-files-performance');
    if (!mcpAvailable) {
      throw new Error('Currents MCP server not available');
    }
  });

  it('should require projectId', async () => {
    await expect(
      getSpecFilesPerformance.execute({
        projectId: '',
        order: 'avgDuration',
      } as any)
    ).rejects.toThrow();
  });

  it('should validate order enum', async () => {
    await expect(
      getSpecFilesPerformance.execute({
        projectId: 'test-project',
        order: 'invalid_order' as any,
      })
    ).rejects.toThrow();
  });

  it('should enforce pagination limits (max 50)', async () => {
    await expect(
      getSpecFilesPerformance.execute({
        projectId: 'test-project',
        order: 'avgDuration',
        limit: 100,
      })
    ).rejects.toThrow();
  });

  it('should return proper schema', async () => {
    const result = await getSpecFilesPerformance.execute({
      projectId: 'test-project',
      order: 'avgDuration',
    });

    expect(Array.isArray(result.specFiles)).toBe(true);
    expect(typeof result.totalSpecs).toBe('number');
    expect(typeof result.hasMore).toBe('boolean');
    expect(typeof result.estimatedTokens).toBe('number');
  });

  it('should have correct tool name', () => {
    expect(getSpecFilesPerformance.name).toBe('currents.get-spec-files-performance');
  });

  it('should support all order options', async () => {
    const validOrders = [
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
    ];

    for (const order of validOrders) {
      const result = await getSpecFilesPerformance.execute({
        projectId: 'test-project',
        order: order as any,
      });
      expect(result).toBeDefined();
    }
  });
});
