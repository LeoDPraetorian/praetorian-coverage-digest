import { describe, it, expect } from 'vitest';
import { linearConfig, createLinearClient } from '../client';

describe('Linear GraphQL Client', () => {
  it('should have correct base URL', () => {
    expect(linearConfig.baseUrl).toBe('https://api.linear.app');
  });

  it('should use header auth with Authorization key', () => {
    expect(linearConfig.auth.type).toBe('header');
    expect(linearConfig.auth.keyName).toBe('Authorization');
  });

  it('should create client with injected credentials', () => {
    const client = createLinearClient({ apiKey: 'test-key' });
    expect(client).toBeDefined();
    expect(client.request).toBeDefined();
  });
});
