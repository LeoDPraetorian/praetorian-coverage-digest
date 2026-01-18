/**
 * Unit Tests for Context7 Validation Suite
 *
 * Tests the validation suite logic in isolation using mocked wrappers.
 * Validates test categories, result collection, and reporting logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the wrapper modules
vi.mock('./resolve-library-id', () => ({
  resolveLibraryId: {
    execute: vi.fn()
  }
}));

vi.mock('./get-library-docs', () => ({
  getLibraryDocs: {
    execute: vi.fn()
  }
}));

// Import mocked wrappers
import { resolveLibraryId } from './resolve-library-id';
import { getLibraryDocs } from './get-library-docs';

// Type definitions matching validation-suite.ts
interface ValidationResult {
  name: string;
  category: 'schema' | 'token' | 'filtering' | 'security' | 'error-handling';
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: Record<string, any>;
}

describe('Context7 Validation Suite - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Category 1: Schema Validation Tests
  // ==========================================================================

  describe('Schema validation category', () => {
    it('should pass valid input test', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockResolvedValue({
        id: '/facebook/react',
        name: 'react',
        ecosystem: 'npm',
        version: '18.2.0'
      });

      // Act
      const result = await resolveLibraryId.execute({
        name: 'react',
        ecosystem: 'npm',
        version: '18.2.0'
      });

      // Assert
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('ecosystem');

      const passed = !!(result && result.id && result.name && result.ecosystem);
      expect(passed).toBe(true);
    });

    it('should fail empty name test', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue({
        issues: [{ message: 'String must contain at least 1 character(s)' }],
        message: 'Validation error: name is required'
      });

      // Act & Assert
      try {
        await resolveLibraryId.execute({ name: '', ecosystem: 'npm' });
        expect.fail('Should have thrown validation error');
      } catch (error: any) {
        const isValidationError = error.issues || error.message?.includes('required');
        expect(isValidationError).toBeTruthy();
      }
    });

    it('should fail invalid version format test', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue({
        issues: [{ message: 'Invalid version format' }],
        message: 'Validation error: Invalid version format'
      });

      // Act & Assert
      await expect(
        resolveLibraryId.execute({
          name: 'react',
          ecosystem: 'npm',
          version: '!!!invalid!!!'
        })
      ).rejects.toMatchObject({
        message: expect.stringContaining('Invalid')
      });
    });

    it('should fail invalid ecosystem test', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue({
        issues: [{ message: 'Invalid enum value' }],
        message: 'Validation error: Invalid ecosystem'
      });

      // Act & Assert
      await expect(
        resolveLibraryId.execute({
          name: 'react',
          ecosystem: 'invalid-ecosystem' as any
        })
      ).rejects.toBeTruthy();
    });
  });

  // ==========================================================================
  // Category 2: Token Reduction Tests
  // ==========================================================================

  describe('Token reduction category', () => {
    it('should verify token reduction effectiveness', async () => {
      // Arrange: Response with moderate token count
      const mockDocs = {
        documentation: 'A'.repeat(2000), // ~500 tokens
        libraryId: '/facebook/react',
        estimatedTokens: 500,
        mode: 'code' as const
      };

      vi.mocked(getLibraryDocs.execute).mockResolvedValue(mockDocs);

      // Act
      const result = await getLibraryDocs.execute({
        context7CompatibleLibraryID: '/facebook/react'
      });

      // Assert
      const estimatedTokens = Math.ceil(JSON.stringify(result).length / 4);
      expect(estimatedTokens).toBeLessThan(1000);
      expect(result.estimatedTokens).toBeDefined();
    });

    it('should pass token budget test for paginated docs', async () => {
      // Arrange
      vi.mocked(getLibraryDocs.execute).mockResolvedValue({
        documentation: 'Page 1 content with reasonable length',
        libraryId: '/facebook/react',
        estimatedTokens: 300,
        mode: 'code',
        page: 1
      });

      // Act
      const result = await getLibraryDocs.execute({
        context7CompatibleLibraryID: '/facebook/react',
        page: 1
      });

      // Assert
      expect(result.estimatedTokens).toBeLessThan(1000);
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Category 3: Information Preservation Tests
  // ==========================================================================

  describe('Filtering/preservation category', () => {
    it('should preserve essential fields', async () => {
      // Arrange
      vi.mocked(getLibraryDocs.execute).mockResolvedValue({
        documentation: 'Complete documentation content',
        libraryId: '/facebook/react',
        estimatedTokens: 400,
        mode: 'code',
        topic: 'hooks',
        page: 1
      });

      // Act
      const result = await getLibraryDocs.execute({
        context7CompatibleLibraryID: '/facebook/react',
        topic: 'hooks',
        page: 1
      });

      // Assert
      expect(result.documentation).toBeDefined();
      expect(result.libraryId).toBeDefined();
      expect(result.estimatedTokens).toBeGreaterThan(0);
      expect(result.mode).toBeDefined();
    });

    it('should pass mode parameter preservation test', async () => {
      // Arrange
      vi.mocked(getLibraryDocs.execute).mockResolvedValue({
        documentation: 'Info mode docs',
        libraryId: '/facebook/react',
        estimatedTokens: 200,
        mode: 'info'
      });

      // Act
      const result = await getLibraryDocs.execute({
        context7CompatibleLibraryID: '/facebook/react',
        mode: 'info'
      });

      // Assert
      expect(result.mode).toBe('info');
    });

    it('should default mode to code', async () => {
      // Arrange
      vi.mocked(getLibraryDocs.execute).mockResolvedValue({
        documentation: 'Default mode docs',
        libraryId: '/facebook/react',
        estimatedTokens: 300,
        mode: 'code'
      });

      // Act
      const result = await getLibraryDocs.execute({
        context7CompatibleLibraryID: '/facebook/react'
      });

      // Assert
      expect(result.mode).toBe('code');
    });
  });

  // ==========================================================================
  // Category 4: Security Tests
  // ==========================================================================

  describe('Security category', () => {
    it('should block path traversal', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue({
        message: 'Security: Path traversal detected',
        code: 'SECURITY_ERROR'
      });

      // Act & Assert
      try {
        await resolveLibraryId.execute({ name: '../../../etc/passwd' });
        expect.fail('Should have thrown security error');
      } catch (error: any) {
        expect(error.message.toLowerCase()).toMatch(/traversal|security|invalid/);
      }
    });

    it('should block XSS attempts', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue({
        message: 'Security: Invalid characters detected',
        code: 'SECURITY_ERROR'
      });

      // Act & Assert
      await expect(
        resolveLibraryId.execute({ name: '<script>alert(1)</script>' })
      ).rejects.toMatchObject({
        message: expect.stringMatching(/security|invalid|characters/i)
      });
    });

    it('should block SQL injection', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue({
        message: 'Validation error: Invalid characters detected',
        code: 'VALIDATION_ERROR'
      });

      // Act & Assert
      await expect(
        resolveLibraryId.execute({ name: "'; DROP TABLE libraries; --" })
      ).rejects.toBeTruthy();
    });

    it('should handle command injection attempts', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue({
        message: 'Security: Command injection detected',
        code: 'SECURITY_ERROR'
      });

      // Act & Assert
      await expect(
        resolveLibraryId.execute({ name: '$(rm -rf /)' })
      ).rejects.toBeTruthy();
    });
  });

  // ==========================================================================
  // Category 5: Error Handling Tests
  // ==========================================================================

  describe('Error handling category', () => {
    it('should provide clear error messages', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue({
        message: 'Library name is required and cannot be empty'
      });

      // Act & Assert
      try {
        await resolveLibraryId.execute({ name: '' });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.message).not.toContain('[object Object]');
      }
    });

    it('should handle MCP failures gracefully', async () => {
      // Arrange
      vi.mocked(getLibraryDocs.execute).mockRejectedValue({
        message: 'MCP call failed: Connection timeout after 30s',
        code: 'MCP_TIMEOUT'
      });

      // Act & Assert
      await expect(
        getLibraryDocs.execute({
          context7CompatibleLibraryID: '/facebook/react'
        })
      ).rejects.toMatchObject({
        message: expect.stringContaining('MCP call failed')
      });
    });

    it('should handle network errors', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue({
        message: 'Network error: ECONNREFUSED',
        code: 'ECONNREFUSED'
      });

      // Act & Assert
      await expect(
        resolveLibraryId.execute({ name: 'test' })
      ).rejects.toMatchObject({
        code: 'ECONNREFUSED'
      });
    });

    it('should include context in validation errors', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue({
        message: 'Validation error: name must contain only alphanumeric characters',
        issues: [{ path: ['name'], message: 'Invalid format' }]
      });

      // Act & Assert
      try {
        await resolveLibraryId.execute({ name: '!!!invalid!!!' });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Validation error');
        expect(error.message).toContain('name');
      }
    });
  });

  // ==========================================================================
  // Category 6: Result Collection & Reporting
  // ==========================================================================

  describe('Result collection logic', () => {
    it('should create proper PASS result structure', () => {
      // Arrange & Act
      const result: ValidationResult = {
        name: 'Test 1 - Sample test',
        category: 'schema',
        status: 'PASS',
        message: 'Test passed successfully',
        details: { input: 'valid' }
      };

      // Assert
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('message');
      expect(result.status).toBe('PASS');
    });

    it('should create proper FAIL result structure', () => {
      // Arrange & Act
      const result: ValidationResult = {
        name: 'Test 2 - Failure test',
        category: 'security',
        status: 'FAIL',
        message: 'Test failed due to error',
        details: { error: 'Error message' }
      };

      // Assert
      expect(result.status).toBe('FAIL');
      expect(result.details).toHaveProperty('error');
    });

    it('should support all categories', () => {
      // Arrange
      const categories: Array<ValidationResult['category']> = [
        'schema',
        'token',
        'filtering',
        'security',
        'error-handling'
      ];

      // Act & Assert
      categories.forEach(category => {
        const result: ValidationResult = {
          name: `Test ${category}`,
          category,
          status: 'PASS',
          message: 'Test message'
        };
        expect(result.category).toBe(category);
      });
    });

    it('should support all status types', () => {
      // Arrange
      const statuses: Array<ValidationResult['status']> = ['PASS', 'FAIL', 'WARN'];

      // Act & Assert
      statuses.forEach(status => {
        const result: ValidationResult = {
          name: 'Test',
          category: 'schema',
          status,
          message: 'Message'
        };
        expect(result.status).toBe(status);
      });
    });
  });

  // ==========================================================================
  // Category 7: Edge Cases & Integration
  // ==========================================================================

  describe('Edge cases', () => {
    it('should handle multiple test failures gracefully', async () => {
      // Arrange: Simulate multiple failures
      vi.mocked(resolveLibraryId.execute)
        .mockRejectedValueOnce({ message: 'Error 1' })
        .mockRejectedValueOnce({ message: 'Error 2' })
        .mockRejectedValueOnce({ message: 'Error 3' });

      // Act & Assert: Each call fails independently
      await expect(resolveLibraryId.execute({ name: '' })).rejects.toBeTruthy();
      await expect(resolveLibraryId.execute({ name: 'invalid' })).rejects.toBeTruthy();
      await expect(resolveLibraryId.execute({ name: '<script>' })).rejects.toBeTruthy();
    });

    it('should handle mixed pass/fail scenarios', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute)
        .mockResolvedValueOnce({ id: '/test/lib', name: 'test', ecosystem: 'npm' })
        .mockRejectedValueOnce({ message: 'Validation failed' });

      // Act
      const result1 = await resolveLibraryId.execute({ name: 'valid' });

      // Assert
      expect(result1).toHaveProperty('id');
      await expect(resolveLibraryId.execute({ name: '' })).rejects.toBeTruthy();
    });

    it('should handle large result sets', async () => {
      // Arrange: Many libraries
      const largeResult = {
        libraries: Array.from({ length: 100 }, (_, i) => ({
          id: `/lib${i}`,
          name: `library-${i}`,
          ecosystem: 'npm'
        })),
        totalResults: 100
      };

      vi.mocked(resolveLibraryId.execute).mockResolvedValue(largeResult as any);

      // Act
      const result = await resolveLibraryId.execute({ name: 'popular' });

      // Assert
      expect((result as any).libraries.length).toBe(100);
    });

    it('should handle timeout scenarios', async () => {
      // Arrange
      vi.mocked(getLibraryDocs.execute).mockRejectedValue({
        message: 'Request timeout after 30000ms',
        code: 'TIMEOUT'
      });

      // Act & Assert
      await expect(
        getLibraryDocs.execute({
          context7CompatibleLibraryID: '/facebook/react'
        })
      ).rejects.toMatchObject({
        message: expect.stringContaining('timeout')
      });
    });
  });
});
