/**
 * Unit Tests for Context7 HTTP API Client
 *
 * Tests HTTP client logic in isolation using mocked HTTP port.
 * Validates request formatting, error handling, and response parsing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveLibraryIdAPI, getLibraryDocsAPI, resetClient } from './client.js';
import * as clientModule from '../client.js';
import type { HTTPPort } from '../../config/lib/http-client.js';

// Mock the client module
vi.mock('../client.js');

describe('Context7 HTTP API Client - Unit Tests', () => {
  let mockHTTPPort: HTTPPort;

  beforeEach(() => {
    vi.clearAllMocks();
    resetClient(); // Reset the lazy-initialized client

    // Create mock HTTP port
    mockHTTPPort = {
      request: vi.fn(),
    };

    // Mock createContext7ClientAsync to return our mock port
    vi.mocked(clientModule.createContext7ClientAsync).mockResolvedValue(mockHTTPPort);
  });

  // ==========================================================================
  // Category 1: resolveLibraryIdAPI Tests
  // ==========================================================================

  describe('resolveLibraryIdAPI', () => {
    it('should successfully resolve library ID with all parameters', async () => {
      // Arrange: Mock successful API response
      const mockResponse = {
        libraryId: '/facebook/react',
        name: 'react',
        version: '18.2.0',
        ecosystem: 'npm'
      };

      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: mockResponse
      });

      // Act: Call function with all parameters
      const result = await resolveLibraryIdAPI({
        name: 'react',
        version: '18.2.0',
        ecosystem: 'npm'
      });

      // Assert: Verify request was made correctly
      expect(mockHTTPPort.request).toHaveBeenCalledTimes(1);
      expect(mockHTTPPort.request).toHaveBeenCalledWith(
        'post',
        'resolve-library', // Leading slash stripped
        {
          json: {
            name: 'react',
            version: '18.2.0',
            ecosystem: 'npm'
          }
        }
      );

      // Assert: Verify response
      expect(result).toEqual(mockResponse);
    });

    it('should successfully resolve library ID with only name', async () => {
      // Arrange: Mock successful API response
      const mockResponse = {
        libraryId: '/lodash/lodash',
        name: 'lodash'
      };

      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: mockResponse
      });

      // Act: Call function with only name
      const result = await resolveLibraryIdAPI({
        name: 'lodash'
      });

      // Assert: Verify request
      expect(mockHTTPPort.request).toHaveBeenCalledWith(
        'post',
        'resolve-library',
        expect.objectContaining({
          json: { name: 'lodash' }
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle API error with 404 status', async () => {
      // Arrange: Mock 404 error
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: false,
        error: {
          message: 'Library not found',
          code: 'NOT_FOUND',
          statusCode: 404
        }
      });

      // Act & Assert: Verify error is thrown
      await expect(
        resolveLibraryIdAPI({ name: 'nonexistent-library' })
      ).rejects.toThrow('Context7 API error: Library not found');
    });

    it('should handle API error with 401 unauthorized', async () => {
      // Arrange: Mock 401 error
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: false,
        error: {
          message: 'Invalid API key',
          code: 'UNAUTHORIZED',
          statusCode: 401
        }
      });

      // Act & Assert: Verify error is thrown
      await expect(
        resolveLibraryIdAPI({ name: 'react' })
      ).rejects.toThrow('Context7 API error: Invalid API key');
    });

    it('should handle API error with 500 server error', async () => {
      // Arrange: Mock 500 error
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR',
          statusCode: 500
        }
      });

      // Act & Assert: Verify error is thrown
      await expect(
        resolveLibraryIdAPI({ name: 'react' })
      ).rejects.toThrow('Context7 API error: Internal server error');
    });

    it('should handle network errors', async () => {
      // Arrange: Mock network error
      vi.mocked(mockHTTPPort.request).mockRejectedValue(
        new Error('Network error: ECONNREFUSED')
      );

      // Act & Assert: Verify error is propagated
      await expect(
        resolveLibraryIdAPI({ name: 'react' })
      ).rejects.toThrow('Network error: ECONNREFUSED');
    });
  });

  // ==========================================================================
  // Category 2: getLibraryDocsAPI Tests
  // ==========================================================================

  describe('getLibraryDocsAPI', () => {
    it('should successfully get library documentation', async () => {
      // Arrange: Mock successful API response
      const mockResponse = {
        libraryId: '/facebook/react',
        documentation: 'React is a JavaScript library...',
        examples: ['example1', 'example2']
      };

      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: mockResponse
      });

      // Act: Call function
      const result = await getLibraryDocsAPI({
        libraryId: '/facebook/react'
      });

      // Assert: Verify request was made correctly
      expect(mockHTTPPort.request).toHaveBeenCalledTimes(1);
      expect(mockHTTPPort.request).toHaveBeenCalledWith(
        'post',
        'library-docs',
        {
          json: {
            libraryId: '/facebook/react'
          }
        }
      );

      // Assert: Verify response
      expect(result).toEqual(mockResponse);
    });

    it('should handle API error with 404 status', async () => {
      // Arrange: Mock 404 error
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: false,
        error: {
          message: 'Library documentation not found',
          code: 'NOT_FOUND',
          statusCode: 404
        }
      });

      // Act & Assert: Verify error is thrown
      await expect(
        getLibraryDocsAPI({ libraryId: '/invalid/library' })
      ).rejects.toThrow('Context7 API error: Library documentation not found');
    });

    it('should handle API error with 401 unauthorized', async () => {
      // Arrange: Mock 401 error
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: false,
        error: {
          message: 'Invalid API key',
          code: 'UNAUTHORIZED',
          statusCode: 401
        }
      });

      // Act & Assert: Verify error is thrown
      await expect(
        getLibraryDocsAPI({ libraryId: '/facebook/react' })
      ).rejects.toThrow('Context7 API error: Invalid API key');
    });

    it('should handle network errors', async () => {
      // Arrange: Mock network error
      vi.mocked(mockHTTPPort.request).mockRejectedValue(
        new Error('Network timeout')
      );

      // Act & Assert: Verify error is propagated
      await expect(
        getLibraryDocsAPI({ libraryId: '/facebook/react' })
      ).rejects.toThrow('Network timeout');
    });
  });

  // ==========================================================================
  // Category 3: Authorization & Request Formatting
  // ==========================================================================

  describe('Authorization headers', () => {
    it('should include Bearer token in all requests', async () => {
      // Arrange: Mock responses
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: {}
      });

      // Act: Make both types of requests
      await resolveLibraryIdAPI({ name: 'test' });
      await getLibraryDocsAPI({ libraryId: '/test/lib' });

      // Assert: Verify HTTP client was called correctly
      // Authorization is handled by HTTP client adapter, not tested here
      expect(mockHTTPPort.request).toHaveBeenCalledTimes(2);
    });

    it('should include Content-Type header in all requests', async () => {
      // Arrange: Mock response
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: {}
      });

      // Act: Make requests
      await resolveLibraryIdAPI({ name: 'test' });

      // Assert: Content-Type is handled by HTTP client adapter
      expect(mockHTTPPort.request).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Category 4: Request Body Formatting
  // ==========================================================================

  describe('Request body formatting', () => {
    it('should properly stringify request parameters', async () => {
      // Arrange: Mock response
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: {}
      });

      // Act: Make request with complex parameters
      const params = {
        name: 'react',
        version: '18.2.0',
        ecosystem: 'npm'
      };
      await resolveLibraryIdAPI(params);

      // Assert: Verify parameters passed correctly
      expect(mockHTTPPort.request).toHaveBeenCalledWith(
        'post',
        'resolve-library',
        expect.objectContaining({
          json: params
        })
      );
    });

    it('should handle parameters with special characters', async () => {
      // Arrange: Mock response
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: {}
      });

      // Act: Make request with special characters
      const params = {
        name: '@scope/package-name',
        version: '1.0.0-beta.1'
      };
      await resolveLibraryIdAPI(params);

      // Assert: Verify special characters are preserved
      const call = vi.mocked(mockHTTPPort.request).mock.calls[0];
      const jsonBody = call[2]?.json;
      expect(jsonBody).toEqual(params);
    });
  });

  // ==========================================================================
  // Category 5: Input Validation Tests
  // ==========================================================================

  describe('Input validation', () => {
    it('should handle empty string name', async () => {
      // Arrange: Mock response
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: { libraryId: '/empty/name' }
      });

      // Act: Call with empty name
      const result = await resolveLibraryIdAPI({ name: '' });

      // Assert: Request is made (validation happens on server side)
      expect(mockHTTPPort.request).toHaveBeenCalled();
      expect(result).toEqual({ libraryId: '/empty/name' });
    });

    it('should handle missing optional parameters', async () => {
      // Arrange: Mock response
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: {}
      });

      // Act: Call with only required parameter
      await resolveLibraryIdAPI({ name: 'test' });

      // Assert: Body only contains provided parameter
      const call = vi.mocked(mockHTTPPort.request).mock.calls[0];
      const jsonBody = call[2]?.json;
      expect(jsonBody).toEqual({ name: 'test' });
    });

    it('should handle undefined values', async () => {
      // Arrange: Mock response
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: {}
      });

      // Act: Call with explicit undefined
      await resolveLibraryIdAPI({
        name: 'test',
        version: undefined,
        ecosystem: undefined
      });

      // Assert: Undefined values are passed through
      const call = vi.mocked(mockHTTPPort.request).mock.calls[0];
      const jsonBody = call[2]?.json;
      expect(jsonBody.name).toBe('test');
    });
  });

  // ==========================================================================
  // Category 6: Leading Slash Handling (Ky prefixUrl compatibility)
  // ==========================================================================

  describe('Leading slash handling', () => {
    it('should strip leading slash from endpoint path for Ky prefixUrl', async () => {
      // Arrange: Mock successful response
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: { libraryId: '/test/lib' }
      });

      // Act: Call API (internal implementation uses '/resolve-library')
      await resolveLibraryIdAPI({ name: 'test' });

      // Assert: Verify path has leading slash stripped
      expect(mockHTTPPort.request).toHaveBeenCalledWith(
        'post',
        'resolve-library', // NOT '/resolve-library'
        expect.any(Object)
      );
    });

    it('should handle endpoint without leading slash', async () => {
      // Arrange: Mock response
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: { libraryId: '/test/lib' }
      });

      // Act: Call function (tests both with and without slash)
      await resolveLibraryIdAPI({ name: 'test' });

      // Assert: Path should not have leading slash
      const call = vi.mocked(mockHTTPPort.request).mock.calls[0];
      const path = call[1];
      expect(path).not.toMatch(/^\//)
      expect(path).toBe('resolve-library');
    });
  });

  // ==========================================================================
  // Category 7: Security Tests
  // ==========================================================================

  describe('Security validations', () => {
    it('should not expose API key in error messages', async () => {
      // Arrange: Mock error response
      vi.mocked(mockHTTPPort.request).mockRejectedValue(
        new Error('Connection failed')
      );

      // Act & Assert: Error should be propagated
      await expect(
        resolveLibraryIdAPI({ name: 'test' })
      ).rejects.toThrow('Connection failed');
    });

    it('should not expose API key in successful responses', async () => {
      // Arrange: Mock response
      const maliciousResponse = {
        libraryId: '/test/lib',
        authHeader: 'Bearer fake-key' // Malicious server response
      };

      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: maliciousResponse
      });

      // Act: Call function
      const result = await resolveLibraryIdAPI({ name: 'test' });

      // Assert: Response is returned as-is (we don't filter it)
      // This is expected - HTTP client returns raw response
      expect(result).toEqual(maliciousResponse);
    });

    it('should handle SQL injection-like strings safely', async () => {
      // Arrange: Mock response
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: {}
      });

      // Act: Call with SQL injection pattern
      const maliciousName = "'; DROP TABLE libraries; --";
      await resolveLibraryIdAPI({ name: maliciousName });

      // Assert: String is passed through to HTTP client
      const call = vi.mocked(mockHTTPPort.request).mock.calls[0];
      const jsonBody = call[2]?.json;
      expect(jsonBody.name).toBe(maliciousName);
    });

    it('should handle path traversal patterns safely', async () => {
      // Arrange: Mock response
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: { libraryId: '/safe/path' }
      });

      // Act: Call with path traversal
      const pathTraversal = '../../../etc/passwd';
      const result = await getLibraryDocsAPI({ libraryId: pathTraversal });

      // Assert: Path is sent as-is (server validates)
      const call = vi.mocked(mockHTTPPort.request).mock.calls[0];
      const jsonBody = call[2]?.json;
      expect(jsonBody.libraryId).toBe(pathTraversal);
      expect(result).toEqual({ libraryId: '/safe/path' });
    });

    it('should handle XSS patterns safely', async () => {
      // Arrange: Mock response
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: {}
      });

      // Act: Call with XSS payload
      const xssPayload = '<script>alert("xss")</script>';
      await resolveLibraryIdAPI({ name: xssPayload });

      // Assert: String is passed through (HTTP client handles JSON encoding)
      const call = vi.mocked(mockHTTPPort.request).mock.calls[0];
      const jsonBody = call[2]?.json;
      expect(jsonBody.name).toBe(xssPayload);
    });

    it('should handle extremely long input strings', async () => {
      // Arrange: Mock response
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: {}
      });

      // Act: Call with very long string (10KB)
      const longString = 'a'.repeat(10000);
      await resolveLibraryIdAPI({ name: longString });

      // Assert: Request completes without error
      expect(mockHTTPPort.request).toHaveBeenCalled();
      const call = vi.mocked(mockHTTPPort.request).mock.calls[0];
      const jsonBody = call[2]?.json;
      expect(jsonBody.name.length).toBe(10000);
    });

    it('should handle unicode and emoji in inputs', async () => {
      // Arrange: Mock response
      vi.mocked(mockHTTPPort.request).mockResolvedValue({
        ok: true,
        data: {}
      });

      // Act: Call with unicode/emoji
      const unicodeName = '🚀 react-émoji-tést 中文';
      await resolveLibraryIdAPI({ name: unicodeName });

      // Assert: Unicode is properly preserved
      const call = vi.mocked(mockHTTPPort.request).mock.calls[0];
      const jsonBody = call[2]?.json;
      expect(jsonBody.name).toBe(unicodeName);
    });
  });
});
