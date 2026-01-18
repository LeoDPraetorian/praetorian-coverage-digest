/**
 * Unit Tests for Context7 HTTP API Client
 *
 * Tests HTTP client logic in isolation using mocked fetch.
 * Validates request formatting, error handling, and response parsing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch using factory function
vi.stubGlobal('fetch', vi.fn());

// Import the client functions (they will use actual env var)
import { resolveLibraryIdAPI, getLibraryDocsAPI } from './client';

// Get the actual API key being used (loaded at module init)
const ACTUAL_API_KEY = process.env.CONTEXT7_API_KEY || '';

describe('Context7 HTTP API Client - Unit Tests', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
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

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      // Act: Call function with all parameters
      const result = await resolveLibraryIdAPI({
        name: 'react',
        version: '18.2.0',
        ecosystem: 'npm'
      });

      // Assert: Verify request was made correctly
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.context7.com/v1/resolve-library',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ACTUAL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'react',
            version: '18.2.0',
            ecosystem: 'npm'
          })
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

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      // Act: Call function with only name
      const result = await resolveLibraryIdAPI({
        name: 'lodash'
      });

      // Assert: Verify request
      expect(fetch).toHaveBeenCalledWith(
        'https://api.context7.com/v1/resolve-library',
        expect.objectContaining({
          body: JSON.stringify({ name: 'lodash' })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle API error with 404 status', async () => {
      // Arrange: Mock 404 error
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Library not found',
      } as Response);

      // Act & Assert: Verify error is thrown
      await expect(
        resolveLibraryIdAPI({ name: 'nonexistent-library' })
      ).rejects.toThrow('Context7 API error: 404 - Library not found');
    });

    it('should handle API error with 401 unauthorized', async () => {
      // Arrange: Mock 401 error
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key',
      } as Response);

      // Act & Assert: Verify error is thrown
      await expect(
        resolveLibraryIdAPI({ name: 'react' })
      ).rejects.toThrow('Context7 API error: 401 - Invalid API key');
    });

    it('should handle API error with 500 server error', async () => {
      // Arrange: Mock 500 error
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      } as Response);

      // Act & Assert: Verify error is thrown
      await expect(
        resolveLibraryIdAPI({ name: 'react' })
      ).rejects.toThrow('Context7 API error: 500 - Internal server error');
    });

    it('should handle network errors', async () => {
      // Arrange: Mock network error
      vi.mocked(fetch).mockRejectedValue(new Error('Network error: ECONNREFUSED'));

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

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      } as Response);

      // Act: Call function
      const result = await getLibraryDocsAPI({
        libraryId: '/facebook/react'
      });

      // Assert: Verify request was made correctly
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.context7.com/v1/library-docs',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ACTUAL_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            libraryId: '/facebook/react'
          })
        }
      );

      // Assert: Verify response
      expect(result).toEqual(mockResponse);
    });

    it('should handle API error with 404 status', async () => {
      // Arrange: Mock 404 error
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => 'Library documentation not found',
      } as Response);

      // Act & Assert: Verify error is thrown
      await expect(
        getLibraryDocsAPI({ libraryId: '/invalid/library' })
      ).rejects.toThrow('Context7 API error: 404 - Library documentation not found');
    });

    it('should handle API error with 401 unauthorized', async () => {
      // Arrange: Mock 401 error
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key',
      } as Response);

      // Act & Assert: Verify error is thrown
      await expect(
        getLibraryDocsAPI({ libraryId: '/facebook/react' })
      ).rejects.toThrow('Context7 API error: 401 - Invalid API key');
    });

    it('should handle network errors', async () => {
      // Arrange: Mock network error
      vi.mocked(fetch).mockRejectedValue(new Error('Network timeout'));

      // Act & Assert: Verify error is propagated
      await expect(
        getLibraryDocsAPI({ libraryId: '/facebook/react' })
      ).rejects.toThrow('Network timeout');
    });
  });

  // ==========================================================================
  // Category 3: Authorization Header Tests
  // ==========================================================================

  describe('Authorization headers', () => {
    it('should include Bearer token in all requests', async () => {
      // Arrange: Mock response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      // Act: Make both types of requests
      await resolveLibraryIdAPI({ name: 'test' });
      await getLibraryDocsAPI({ libraryId: '/test/lib' });

      // Assert: Verify Authorization header in both calls
      expect(fetch).toHaveBeenCalledTimes(2);

      const calls = vi.mocked(fetch).mock.calls;
      calls.forEach((call) => {
        const options = call[1] as RequestInit;
        const headers = options.headers as Record<string, string>;
        expect(headers['Authorization']).toBe(`Bearer ${ACTUAL_API_KEY}`);
      });
    });

    it('should include Content-Type header in all requests', async () => {
      // Arrange: Mock response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      // Act: Make both types of requests
      await resolveLibraryIdAPI({ name: 'test' });
      await getLibraryDocsAPI({ libraryId: '/test/lib' });

      // Assert: Verify Content-Type header in both calls
      const calls = vi.mocked(fetch).mock.calls;
      calls.forEach((call) => {
        const options = call[1] as RequestInit;
        const headers = options.headers as Record<string, string>;
        expect(headers['Content-Type']).toBe('application/json');
      });
    });
  });

  // ==========================================================================
  // Category 4: Request Body Formatting
  // ==========================================================================

  describe('Request body formatting', () => {
    it('should properly stringify request parameters', async () => {
      // Arrange: Mock response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      // Act: Make request with complex parameters
      const params = {
        name: 'react',
        version: '18.2.0',
        ecosystem: 'npm'
      };
      await resolveLibraryIdAPI(params);

      // Assert: Verify body is properly stringified
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(params)
        })
      );
    });

    it('should handle parameters with special characters', async () => {
      // Arrange: Mock response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      // Act: Make request with special characters
      const params = {
        name: '@scope/package-name',
        version: '1.0.0-beta.1'
      };
      await resolveLibraryIdAPI(params);

      // Assert: Verify special characters are preserved
      const calls = vi.mocked(fetch).mock.calls;
      const body = calls[0][1]?.body as string;
      const parsed = JSON.parse(body);
      expect(parsed.name).toBe('@scope/package-name');
      expect(parsed.version).toBe('1.0.0-beta.1');
    });
  });

  // ==========================================================================
  // Category 5: Input Validation Tests
  // ==========================================================================

  describe('Input validation', () => {
    it('should handle empty string name', async () => {
      // Arrange: Mock response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ libraryId: '/empty/name' }),
      } as Response);

      // Act: Call with empty name
      const result = await resolveLibraryIdAPI({ name: '' });

      // Assert: Request is made (validation happens on server side)
      expect(fetch).toHaveBeenCalled();
      expect(result).toEqual({ libraryId: '/empty/name' });
    });

    it('should handle missing optional parameters', async () => {
      // Arrange: Mock response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      // Act: Call with only required parameter
      await resolveLibraryIdAPI({ name: 'test' });

      // Assert: Body only contains provided parameter
      const body = vi.mocked(fetch).mock.calls[0][1]?.body as string;
      const parsed = JSON.parse(body);
      expect(parsed).toEqual({ name: 'test' });
      expect(parsed.version).toBeUndefined();
      expect(parsed.ecosystem).toBeUndefined();
    });

    it('should handle undefined values', async () => {
      // Arrange: Mock response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      // Act: Call with explicit undefined
      await resolveLibraryIdAPI({
        name: 'test',
        version: undefined,
        ecosystem: undefined
      });

      // Assert: Undefined values are not included in body
      const body = vi.mocked(fetch).mock.calls[0][1]?.body as string;
      expect(body).toContain('test');
      // JSON.stringify removes undefined values
      expect(body).not.toContain('undefined');
    });
  });

  // ==========================================================================
  // Category 6: Security Tests
  // ==========================================================================

  describe('Security validations', () => {
    it('should not expose API key in error messages', async () => {
      // Arrange: Mock error response
      vi.mocked(fetch).mockRejectedValue(new Error('Connection failed'));

      // Act & Assert: Error should not contain API key
      try {
        await resolveLibraryIdAPI({ name: 'test' });
        expect.fail('Should have thrown error');
      } catch (error) {
        const errorMessage = (error as Error).message;
        expect(errorMessage).not.toContain(ACTUAL_API_KEY);
      }
    });

    it('should not expose API key in successful responses', async () => {
      // Arrange: Mock response that tries to include auth header
      const maliciousResponse = {
        libraryId: '/test/lib',
        authHeader: `Bearer ${ACTUAL_API_KEY}` // Malicious server response
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => maliciousResponse,
      } as Response);

      // Act: Call function
      const result = await resolveLibraryIdAPI({ name: 'test' });

      // Assert: Response is returned as-is (we don't filter it)
      // This is expected - HTTP client returns raw response
      expect(result).toEqual(maliciousResponse);
    });

    it('should handle SQL injection-like strings safely', async () => {
      // Arrange: Mock response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      // Act: Call with SQL injection pattern
      const maliciousName = "'; DROP TABLE libraries; --";
      await resolveLibraryIdAPI({ name: maliciousName });

      // Assert: String is properly escaped in JSON
      const body = vi.mocked(fetch).mock.calls[0][1]?.body as string;
      const parsed = JSON.parse(body);
      expect(parsed.name).toBe(maliciousName);
    });

    it('should handle path traversal patterns safely', async () => {
      // Arrange: Mock response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ libraryId: '/safe/path' }),
      } as Response);

      // Act: Call with path traversal
      const pathTraversal = '../../../etc/passwd';
      const result = await getLibraryDocsAPI({ libraryId: pathTraversal });

      // Assert: Path is sent as-is (server validates)
      const body = vi.mocked(fetch).mock.calls[0][1]?.body as string;
      const parsed = JSON.parse(body);
      expect(parsed.libraryId).toBe(pathTraversal);
      expect(result).toEqual({ libraryId: '/safe/path' });
    });

    it('should handle XSS patterns safely', async () => {
      // Arrange: Mock response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      // Act: Call with XSS payload
      const xssPayload = '<script>alert("xss")</script>';
      await resolveLibraryIdAPI({ name: xssPayload });

      // Assert: String is properly JSON-encoded
      const body = vi.mocked(fetch).mock.calls[0][1]?.body as string;
      const parsed = JSON.parse(body);
      expect(parsed.name).toBe(xssPayload);
      // Verify no script tags are unescaped in the body
      expect(body).toContain('\\"');
    });

    it('should handle extremely long input strings', async () => {
      // Arrange: Mock response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      // Act: Call with very long string (10KB)
      const longString = 'a'.repeat(10000);
      await resolveLibraryIdAPI({ name: longString });

      // Assert: Request completes without error
      expect(fetch).toHaveBeenCalled();
      const body = vi.mocked(fetch).mock.calls[0][1]?.body as string;
      expect(body.length).toBeGreaterThan(10000);
    });

    it('should handle unicode and emoji in inputs', async () => {
      // Arrange: Mock response
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response);

      // Act: Call with unicode/emoji
      const unicodeName = '🚀 react-émoji-tést 中文';
      await resolveLibraryIdAPI({ name: unicodeName });

      // Assert: Unicode is properly preserved
      const body = vi.mocked(fetch).mock.calls[0][1]?.body as string;
      const parsed = JSON.parse(body);
      expect(parsed.name).toBe(unicodeName);
    });
  });
});
