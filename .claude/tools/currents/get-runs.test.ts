/**
 * Get Runs Tool Tests
 *
 * Tests the getRuns tool wrapper with validation.
 */

import { getRuns } from './get-runs';
import { isMCPAvailable } from '../config/lib/mcp-client';

describe('getRuns', () => {
  beforeAll(async () => {
    const mcpAvailable = await isMCPAvailable('currents', 'currents-get-runs');
    if (!mcpAvailable) {
      throw new Error('Currents MCP server not available');
    }
  });

  it('should require projectId', async () => {
    await expect(
      getRuns.execute({
        projectId: '',
      } as any)
    ).rejects.toThrow();
  });

  it('should enforce pagination limits (max 50)', async () => {
    await expect(
      getRuns.execute({
        projectId: 'test-project',
        limit: 100,
      })
    ).rejects.toThrow();
  });

  it('should return proper schema', async () => {
    const result = await getRuns.execute({
      projectId: 'test-project',
    });

    expect(Array.isArray(result.runs)).toBe(true);
    expect(typeof result.totalRuns).toBe('number');
    expect(typeof result.hasMore).toBe('boolean');
    expect(typeof result.estimatedTokens).toBe('number');
  });

  it('should return runs with correct properties', async () => {
    const result = await getRuns.execute({
      projectId: 'test-project',
    });

    if (result.runs.length > 0) {
      const run = result.runs[0];
      expect(typeof run.id).toBe('string');
      expect(typeof run.status).toBe('string');
      expect(typeof run.createdAt).toBe('string');
      expect(typeof run.specs).toBe('number');
      expect(typeof run.tests).toBe('number');
    }
  });

  it('should have correct tool name', () => {
    expect(getRuns.name).toBe('currents.get-runs');
  });

  it('should support cursor-based pagination', async () => {
    const result = await getRuns.execute({
      projectId: 'test-project',
      cursor: 'test-cursor',
    });

    expect(result).toBeDefined();
    expect(typeof result.hasMore).toBe('boolean');
  });
});
