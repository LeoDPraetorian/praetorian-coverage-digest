/**
 * Get Run Details Tool Tests
 *
 * Tests the getRunDetails tool wrapper with validation.
 */

import { getRunDetails } from './get-run-details';
import { isMCPAvailable } from '../config/lib/mcp-client';

describe('getRunDetails', () => {
  beforeAll(async () => {
    const mcpAvailable = await isMCPAvailable('currents', 'currents-get-run-details');
    if (!mcpAvailable) {
      throw new Error('Currents MCP server not available');
    }
  });

  it('should require runId', async () => {
    await expect(
      getRunDetails.execute({
        runId: '',
      } as any)
    ).rejects.toThrow();
  });

  it('should return proper schema', async () => {
    const result = await getRunDetails.execute({
      runId: 'test-run-id',
    });

    expect(typeof result.run).toBe('object');
    expect(typeof result.estimatedTokens).toBe('number');
  });

  it('should return run with correct properties', async () => {
    const result = await getRunDetails.execute({
      runId: 'test-run-id',
    });

    const { run } = result;
    expect(typeof run.id).toBe('string');
    expect(typeof run.status).toBe('string');
    expect(typeof run.createdAt).toBe('string');
    expect(typeof run.specs).toBe('number');
    expect(typeof run.tests).toBe('number');
    expect(typeof run.passed).toBe('number');
    expect(typeof run.failed).toBe('number');
    expect(typeof run.skipped).toBe('number');
    expect(typeof run.pending).toBe('number');
  });

  it('should have correct tool name', () => {
    expect(getRunDetails.name).toBe('currents.get-run-details');
  });

  it('should handle missing duration gracefully', async () => {
    const result = await getRunDetails.execute({
      runId: 'test-run-id',
    });

    // duration is optional
    if (result.run.duration !== undefined) {
      expect(typeof result.run.duration).toBe('number');
    }
  });
});
