/**
 * Context7 Client Unit Tests
 *
 * Tests async client factory and lazy initialization.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createContext7ClientAsync } from '../client.js';
import * as httpClient from '../../config/lib/http-client.js';

vi.mock('../../config/lib/http-client.js');

describe('Context7 Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createContext7ClientAsync', () => {
    it('resolves credentials and creates HTTP client', async () => {
      const mockHTTPPort = { request: vi.fn() };
      vi.mocked(httpClient.createHTTPClientAsync).mockResolvedValue(mockHTTPPort as any);

      const client = await createContext7ClientAsync();

      expect(httpClient.createHTTPClientAsync).toHaveBeenCalledWith(
        'context7',
        expect.objectContaining({
          baseUrl: 'https://api.context7.com/v1',
          auth: {
            type: 'bearer',
            keyName: 'Authorization',
            credentialKey: 'apiKey',
          },
        })
      );
      expect(client).toBe(mockHTTPPort);
    });
  });
});
