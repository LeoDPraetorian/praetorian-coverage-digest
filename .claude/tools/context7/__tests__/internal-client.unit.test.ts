/**
 * Context7 Internal Client Unit Tests
 *
 * Tests lazy initialization and API call routing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callContext7API, resolveLibraryIdAPI, getLibraryDocsAPI, resetClient } from '../internal/client.js';
import * as client from '../client.js';

vi.mock('../client.js');

describe('Context7 Internal Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetClient();
  });

  describe('callContext7API', () => {
    it('initializes client lazily on first call', async () => {
      const mockHTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: true,
          data: { result: 'success' },
        }),
      };
      vi.mocked(client.createContext7ClientAsync).mockResolvedValue(mockHTTPPort as any);

      const result = await callContext7API('/test-endpoint', { param: 'value' });

      expect(client.createContext7ClientAsync).toHaveBeenCalledTimes(1);
      expect(mockHTTPPort.request).toHaveBeenCalledWith('post', 'test-endpoint', {
        json: { param: 'value' },
      });
      expect(result).toEqual({ result: 'success' });
    });

    it('reuses client on subsequent calls', async () => {
      const mockHTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: true,
          data: { result: 'success' },
        }),
      };
      vi.mocked(client.createContext7ClientAsync).mockResolvedValue(mockHTTPPort as any);

      await callContext7API('/endpoint1', {});
      await callContext7API('/endpoint2', {});

      expect(client.createContext7ClientAsync).toHaveBeenCalledTimes(1);
      expect(mockHTTPPort.request).toHaveBeenCalledTimes(2);
    });

    it('throws error when HTTP request fails', async () => {
      const mockHTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: false,
          error: { message: 'API error' },
        }),
      };
      vi.mocked(client.createContext7ClientAsync).mockResolvedValue(mockHTTPPort as any);

      await expect(callContext7API('/endpoint', {})).rejects.toThrow('Context7 API error: API error');
    });
  });

  describe('resolveLibraryIdAPI', () => {
    it('calls Context7 API with correct endpoint', async () => {
      const mockHTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: true,
          data: { libraryId: 'lib-123' },
        }),
      };
      vi.mocked(client.createContext7ClientAsync).mockResolvedValue(mockHTTPPort as any);

      const result = await resolveLibraryIdAPI({ name: 'react', version: '18.0.0', ecosystem: 'npm' });

      expect(mockHTTPPort.request).toHaveBeenCalledWith('post', 'resolve-library', {
        json: { name: 'react', version: '18.0.0', ecosystem: 'npm' },
      });
      expect(result).toEqual({ libraryId: 'lib-123' });
    });
  });

  describe('getLibraryDocsAPI', () => {
    it('calls Context7 API with correct endpoint', async () => {
      const mockHTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: true,
          data: { docs: 'Documentation content' },
        }),
      };
      vi.mocked(client.createContext7ClientAsync).mockResolvedValue(mockHTTPPort as any);

      const result = await getLibraryDocsAPI({ libraryId: 'lib-123' });

      expect(mockHTTPPort.request).toHaveBeenCalledWith('post', 'library-docs', {
        json: { libraryId: 'lib-123' },
      });
      expect(result).toEqual({ docs: 'Documentation content' });
    });
  });

  describe('resetClient', () => {
    it('clears cached client', async () => {
      const mockHTTPPort = {
        request: vi.fn().mockResolvedValue({
          ok: true,
          data: {},
        }),
      };
      vi.mocked(client.createContext7ClientAsync).mockResolvedValue(mockHTTPPort as any);

      await callContext7API('/endpoint1', {});
      expect(client.createContext7ClientAsync).toHaveBeenCalledTimes(1);

      resetClient();

      await callContext7API('/endpoint2', {});
      expect(client.createContext7ClientAsync).toHaveBeenCalledTimes(2);
    });
  });
});
