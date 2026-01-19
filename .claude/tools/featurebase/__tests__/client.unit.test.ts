import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createFeaturebaseClient, featurebaseConfig } from '../client.js';

// Mock the config loader to control credential resolution
vi.mock('../../config/config-loader.js', () => ({
  getToolConfig: vi.fn(),
}));

import { getToolConfig } from '../../config/config-loader.js';
const mockedGetToolConfig = vi.mocked(getToolConfig);

describe('createFeaturebaseClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates HTTPPort with X-API-Key auth', () => {
    const client = createFeaturebaseClient({ apiKey: 'test-key' });

    expect(client).toBeDefined();
    expect(client.request).toBeInstanceOf(Function);
  });

  it('throws error if credentials missing', () => {
    mockedGetToolConfig.mockImplementation(() => {
      throw new Error('Environment variable FEATUREBASE_API_KEY not set.');
    });
    expect(() => createFeaturebaseClient()).toThrow('FEATUREBASE_API_KEY');
  });

  it('falls back to getToolConfig when no credentials provided', () => {
    mockedGetToolConfig.mockReturnValue({ apiKey: 'fallback-key' });
    const client = createFeaturebaseClient();
    expect(mockedGetToolConfig).toHaveBeenCalledWith('featurebase');
    expect(client).toBeDefined();
  });
});

describe('featurebaseConfig', () => {
  it('has correct base URL', () => {
    expect(featurebaseConfig.baseUrl).toBe('https://do.featurebase.app');
  });

  it('uses X-API-Key header authentication', () => {
    expect(featurebaseConfig.auth.type).toBe('header');
    expect(featurebaseConfig.auth.keyName).toBe('X-API-Key');
  });

  it('has retry configuration', () => {
    expect(featurebaseConfig.retry).toBeDefined();
    expect(featurebaseConfig.retry.limit).toBe(3);
  });
});
