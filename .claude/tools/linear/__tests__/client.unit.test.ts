import { describe, it, expect } from 'vitest';
import { linearConfig, createLinearClient } from '../client';

describe('Linear GraphQL Client', () => {
  it('should have correct base URL', () => {
    expect(linearConfig.baseUrl).toBe('https://api.linear.app');
  });

  it('should use bearer auth with Authorization key', () => {
    expect(linearConfig.auth.type).toBe('bearer');
    expect(linearConfig.auth.keyName).toBe('Authorization');
  });

  it('should create client with injected credentials', async () => {
    const client = await createLinearClient('test-key');
    expect(client).toBeDefined();
    expect(client.request).toBeDefined();
  });
});
