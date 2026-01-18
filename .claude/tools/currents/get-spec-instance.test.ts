/**
 * Get Spec Instance Tool Tests
 *
 * Tests the getSpecInstance tool wrapper with validation.
 */

import { getSpecInstance } from './get-spec-instance';
import { isMCPAvailable } from '../config/lib/mcp-client';

describe('getSpecInstance', () => {
  beforeAll(async () => {
    const mcpAvailable = await isMCPAvailable('currents', 'currents-get-spec-instance');
    if (!mcpAvailable) {
      throw new Error('Currents MCP server not available');
    }
  });

  it('should require instanceId', async () => {
    await expect(
      getSpecInstance.execute({
        instanceId: '',
      } as any)
    ).rejects.toThrow();
  });

  it('should return proper schema', async () => {
    const result = await getSpecInstance.execute({
      instanceId: 'test-instance-id',
    });

    expect(typeof result.instance).toBe('object');
    expect(typeof result.estimatedTokens).toBe('number');
  });

  it('should return instance with correct properties', async () => {
    const result = await getSpecInstance.execute({
      instanceId: 'test-instance-id',
    });

    const { instance } = result;
    expect(typeof instance.id).toBe('string');
    expect(typeof instance.spec).toBe('string');
    expect(typeof instance.status).toBe('string');
    expect(typeof instance.duration).toBe('number');
    expect(typeof instance.tests).toBe('number');
    expect(typeof instance.passed).toBe('number');
    expect(typeof instance.failed).toBe('number');
  });

  it('should have correct tool name', () => {
    expect(getSpecInstance.name).toBe('currents.get-spec-instance');
  });

  it('should truncate error messages to 300 chars', async () => {
    const result = await getSpecInstance.execute({
      instanceId: 'test-instance-id',
    });

    if (result.instance.error) {
      expect(result.instance.error.length).toBeLessThanOrEqual(300);
    }
  });

  it('should handle missing error gracefully', async () => {
    const result = await getSpecInstance.execute({
      instanceId: 'test-instance-id',
    });

    // error is optional
    if (result.instance.error !== undefined) {
      expect(typeof result.instance.error).toBe('string');
    }
  });
});
