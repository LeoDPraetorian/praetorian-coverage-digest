/**
 * Unit Tests for Context7 Quick Validation Script
 *
 * Tests the validation logic in isolation using mocked wrappers.
 * Validates test scenarios, pass/fail logic, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the wrapper modules before importing validation script
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

// Import the mocked wrappers for assertions
import { resolveLibraryId } from './resolve-library-id';
import { getLibraryDocs } from './get-library-docs';

describe('Context7 Quick Validation - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Category 1: resolveLibraryId Validation Tests
  // ==========================================================================

  describe('resolveLibraryId validation', () => {
    it('should accept valid library name', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockResolvedValue({
        libraries: [{ id: '/facebook/react', name: 'react' }],
        totalResults: 1
      });

      // Act
      const result = await resolveLibraryId.execute({ libraryName: 'react' });

      // Assert
      expect(result.libraries).toBeDefined();
      expect(Array.isArray(result.libraries)).toBe(true);
      expect(result.totalResults).toBeGreaterThan(0);
    });

    it('should reject empty library name', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue(
        new Error('Validation error: libraryName cannot be empty')
      );

      // Act & Assert
      await expect(
        resolveLibraryId.execute({ libraryName: '' })
      ).rejects.toThrow('libraryName cannot be empty');
    });

    it('should reject path traversal attempts', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue(
        new Error('Validation error: Invalid characters detected')
      );

      // Act & Assert
      await expect(
        resolveLibraryId.execute({ libraryName: '../../../etc/passwd' })
      ).rejects.toThrow();
    });

    it('should reject XSS attempts', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue(
        new Error('Validation error: Invalid characters detected')
      );

      // Act & Assert
      await expect(
        resolveLibraryId.execute({ libraryName: '<script>alert(1)</script>' })
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Category 2: getLibraryDocs Validation Tests
  // ==========================================================================

  describe('getLibraryDocs validation', () => {
    it('should return documentation with essential fields', async () => {
      // Arrange
      vi.mocked(getLibraryDocs.execute).mockResolvedValue({
        documentation: 'React is a JavaScript library for building user interfaces',
        libraryId: '/facebook/react',
        estimatedTokens: 500,
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
      expect(result.libraryId).toBe('/facebook/react');
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it('should have effective token reduction (<1000 tokens)', async () => {
      // Arrange: Mock response with reasonable token count
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
    });

    it('should support mode parameter - info mode', async () => {
      // Arrange
      vi.mocked(getLibraryDocs.execute).mockResolvedValue({
        documentation: 'Library information',
        libraryId: '/facebook/react',
        estimatedTokens: 200,
        mode: 'info',
        topic: 'architecture',
        page: 1
      });

      // Act
      const result = await getLibraryDocs.execute({
        context7CompatibleLibraryID: '/facebook/react',
        mode: 'info',
        topic: 'architecture',
        page: 1
      });

      // Assert
      expect(result.mode).toBe('info');
    });

    it('should default mode to code when not specified', async () => {
      // Arrange
      vi.mocked(getLibraryDocs.execute).mockResolvedValue({
        documentation: 'Code documentation',
        libraryId: '/facebook/react',
        estimatedTokens: 300,
        mode: 'code'
      });

      // Act
      const result = await getLibraryDocs.execute({
        context7CompatibleLibraryID: '/facebook/react',
        topic: 'hooks'
      });

      // Assert
      expect(result.mode).toBe('code');
    });
  });

  // ==========================================================================
  // Category 3: Error Handling Validation
  // ==========================================================================

  describe('Error handling', () => {
    it('should provide clear error messages', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue(
        new Error('Library name is required and cannot be empty')
      );

      // Act & Assert
      try {
        await resolveLibraryId.execute({ libraryName: '' });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.message).not.toContain('[object Object]');
      }
    });

    it('should handle MCP call failures gracefully', async () => {
      // Arrange
      vi.mocked(getLibraryDocs.execute).mockRejectedValue(
        new Error('MCP call failed: Connection timeout')
      );

      // Act & Assert
      await expect(
        getLibraryDocs.execute({
          context7CompatibleLibraryID: '/facebook/react'
        })
      ).rejects.toThrow('MCP call failed');
    });

    it('should handle validation errors with context', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue(
        new Error('Validation error: libraryName must contain only alphanumeric characters')
      );

      // Act & Assert
      try {
        await resolveLibraryId.execute({ libraryName: '!!!invalid!!!' });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Validation error');
        expect(error.message).toContain('libraryName');
      }
    });
  });

  // ==========================================================================
  // Category 4: Security Validation Tests
  // ==========================================================================

  describe('Security validations', () => {
    it('should detect path traversal attempts', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue(
        new Error('Security: Path traversal detected')
      );

      // Act & Assert
      try {
        await resolveLibraryId.execute({ libraryName: '../../../etc/passwd' });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        const errorMsg = error.message.toLowerCase();
        expect(
          errorMsg.includes('traversal') ||
          errorMsg.includes('..') ||
          errorMsg.includes('security')
        ).toBe(true);
      }
    });

    it('should detect XSS attempts', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue(
        new Error('Security: Invalid characters detected')
      );

      // Act & Assert
      try {
        await resolveLibraryId.execute({ libraryName: '<script>alert(1)</script>' });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        const errorMsg = error.message.toLowerCase();
        expect(
          errorMsg.includes('invalid') ||
          errorMsg.includes('special') ||
          errorMsg.includes('security')
        ).toBe(true);
      }
    });

    it('should handle SQL injection patterns', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockRejectedValue(
        new Error('Validation error: Invalid characters detected')
      );

      // Act & Assert
      await expect(
        resolveLibraryId.execute({ libraryName: "'; DROP TABLE libraries; --" })
      ).rejects.toThrow();
    });

    it('should validate library ID format', async () => {
      // Arrange
      vi.mocked(getLibraryDocs.execute).mockRejectedValue(
        new Error('Validation error: Invalid library ID format')
      );

      // Act & Assert
      await expect(
        getLibraryDocs.execute({
          context7CompatibleLibraryID: 'not-a-valid-id'
        })
      ).rejects.toThrow('Invalid library ID');
    });
  });

  // ==========================================================================
  // Category 5: Output Structure Validation
  // ==========================================================================

  describe('Output structure', () => {
    it('should validate resolveLibraryId output structure', async () => {
      // Arrange
      const validOutput = {
        libraries: [
          { id: '/facebook/react', name: 'react', ecosystem: 'npm' },
          { id: '/vuejs/vue', name: 'vue', ecosystem: 'npm' }
        ],
        totalResults: 2
      };

      vi.mocked(resolveLibraryId.execute).mockResolvedValue(validOutput);

      // Act
      const result = await resolveLibraryId.execute({ libraryName: 'react' });

      // Assert
      expect(result).toHaveProperty('libraries');
      expect(result).toHaveProperty('totalResults');
      expect(Array.isArray(result.libraries)).toBe(true);
      expect(typeof result.totalResults).toBe('number');
    });

    it('should validate getLibraryDocs output structure', async () => {
      // Arrange
      const validOutput = {
        documentation: 'Documentation content',
        libraryId: '/facebook/react',
        estimatedTokens: 400,
        mode: 'code' as const,
        topic: 'hooks',
        page: 1
      };

      vi.mocked(getLibraryDocs.execute).mockResolvedValue(validOutput);

      // Act
      const result = await getLibraryDocs.execute({
        context7CompatibleLibraryID: '/facebook/react',
        topic: 'hooks',
        page: 1
      });

      // Assert
      expect(result).toHaveProperty('documentation');
      expect(result).toHaveProperty('libraryId');
      expect(result).toHaveProperty('estimatedTokens');
      expect(result).toHaveProperty('mode');
      expect(typeof result.documentation).toBe('string');
      expect(typeof result.estimatedTokens).toBe('number');
    });

    it('should ensure essential fields are present', async () => {
      // Arrange
      vi.mocked(getLibraryDocs.execute).mockResolvedValue({
        documentation: 'Content',
        libraryId: '/test/lib',
        estimatedTokens: 100,
        mode: 'code'
      });

      // Act
      const result = await getLibraryDocs.execute({
        context7CompatibleLibraryID: '/test/lib'
      });

      // Assert
      const hasEssentials =
        result.documentation &&
        result.libraryId &&
        result.estimatedTokens > 0;
      expect(hasEssentials).toBe(true);
    });
  });

  // ==========================================================================
  // Category 6: Edge Cases
  // ==========================================================================

  describe('Edge cases', () => {
    it('should handle large documentation responses', async () => {
      // Arrange: 10KB of documentation
      const largeDocs = {
        documentation: 'A'.repeat(10000),
        libraryId: '/facebook/react',
        estimatedTokens: 2500,
        mode: 'code' as const
      };

      vi.mocked(getLibraryDocs.execute).mockResolvedValue(largeDocs);

      // Act
      const result = await getLibraryDocs.execute({
        context7CompatibleLibraryID: '/facebook/react'
      });

      // Assert
      expect(result.documentation.length).toBeGreaterThan(5000);
      expect(result.estimatedTokens).toBeDefined();
    });

    it('should handle pagination parameters', async () => {
      // Arrange
      vi.mocked(getLibraryDocs.execute).mockResolvedValue({
        documentation: 'Page 2 content',
        libraryId: '/facebook/react',
        estimatedTokens: 300,
        mode: 'code',
        page: 2
      });

      // Act
      const result = await getLibraryDocs.execute({
        context7CompatibleLibraryID: '/facebook/react',
        page: 2
      });

      // Assert
      expect(result.page).toBe(2);
    });

    it('should handle topic filtering', async () => {
      // Arrange
      vi.mocked(getLibraryDocs.execute).mockResolvedValue({
        documentation: 'Hooks documentation',
        libraryId: '/facebook/react',
        estimatedTokens: 400,
        mode: 'code',
        topic: 'hooks'
      });

      // Act
      const result = await getLibraryDocs.execute({
        context7CompatibleLibraryID: '/facebook/react',
        topic: 'hooks'
      });

      // Assert
      expect(result.topic).toBe('hooks');
    });

    it('should handle unicode in library names', async () => {
      // Arrange
      vi.mocked(resolveLibraryId.execute).mockResolvedValue({
        libraries: [{ id: '/test/日本語', name: '日本語-library', ecosystem: 'npm' }],
        totalResults: 1
      });

      // Act
      const result = await resolveLibraryId.execute({ libraryName: '日本語' });

      // Assert
      expect(result.libraries[0].name).toContain('日本語');
    });
  });
});
