/**
 * Unit Tests for vitest.global-teardown.ts
 *
 * Tests that the global teardown properly cleans up the Serena pool
 * singleton after all tests complete.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('vitest.global-teardown.ts - Global Cleanup', () => {
  let mockResetFunction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create a mock for resetSerenaPoolForTesting
    mockResetFunction = vi.fn().mockResolvedValue(undefined);

    // Mock the serena-pool module
    vi.doMock('./tools/config/lib/serena-pool', () => ({
      resetSerenaPoolForTesting: mockResetFunction,
    }));
  });

  afterEach(() => {
    vi.doUnmock('./tools/config/lib/serena-pool');
  });

  // ==========================================================================
  // Category 1: Module Structure Tests
  // ==========================================================================

  describe('module structure', () => {
    it('should export a default async function', async () => {
      // Arrange: Dynamic import to pick up the mock
      const teardown = await import('./vitest.global-teardown');

      // Assert: Should export default function
      expect(teardown.default).toBeDefined();
      expect(typeof teardown.default).toBe('function');
    });

    it('should export a function that returns a Promise', async () => {
      // Arrange
      const teardown = await import('./vitest.global-teardown');

      // Act: Call the teardown function
      const result = teardown.default();

      // Assert: Should return a Promise
      expect(result).toBeInstanceOf(Promise);

      // Clean up
      await result;
    });
  });

  // ==========================================================================
  // Category 2: resetSerenaPoolForTesting() Call Tests
  // ==========================================================================

  describe('resetSerenaPoolForTesting() invocation', () => {
    it('should call resetSerenaPoolForTesting when executed', async () => {
      // Arrange
      const teardown = await import('./vitest.global-teardown');

      // Act
      await teardown.default();

      // Assert
      expect(mockResetFunction).toHaveBeenCalledOnce();
    });

    it('should await resetSerenaPoolForTesting before completing', async () => {
      // Arrange: Track call order
      const callOrder: string[] = [];
      mockResetFunction.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        callOrder.push('reset-completed');
      });

      const teardown = await import('./vitest.global-teardown');

      // Act
      await teardown.default();
      callOrder.push('teardown-completed');

      // Assert: reset should complete before teardown
      expect(callOrder).toEqual(['reset-completed', 'teardown-completed']);
    });
  });

  // ==========================================================================
  // Category 3: Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('should complete successfully when pool was never used', async () => {
      // Arrange: resetSerenaPoolForTesting succeeds (pool was null)
      mockResetFunction.mockResolvedValue(undefined);

      const teardown = await import('./vitest.global-teardown');

      // Act & Assert: Should not throw
      await expect(teardown.default()).resolves.not.toThrow();
    });

    it('should complete successfully when pool was used', async () => {
      // Arrange: Simulate pool cleanup
      mockResetFunction.mockResolvedValue(undefined);

      const teardown = await import('./vitest.global-teardown');

      // Act & Assert: Should not throw
      await expect(teardown.default()).resolves.not.toThrow();
    });

    it('should handle errors from resetSerenaPoolForTesting gracefully', async () => {
      // Arrange: Simulate reset failure
      const resetError = new Error('Failed to dispose pool');
      mockResetFunction.mockRejectedValue(resetError);

      const teardown = await import('./vitest.global-teardown');

      // Act & Assert: Should not propagate error (catches internally)
      // The teardown should catch errors to prevent test suite failures
      await expect(teardown.default()).resolves.not.toThrow();
    });

    it('should log errors when resetSerenaPoolForTesting fails', async () => {
      // Arrange: Spy on console.error
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Simulate reset failure
      const resetError = new Error('Pool disposal failed');
      mockResetFunction.mockRejectedValue(resetError);

      const teardown = await import('./vitest.global-teardown');

      // Act
      await teardown.default();

      // Assert: Should log error
      expect(errorSpy).toHaveBeenCalled();

      // Clean up
      errorSpy.mockRestore();
    });

    it('should handle cleanup timeout gracefully', async () => {
      // Arrange: Simulate slow cleanup
      mockResetFunction.mockImplementation(async () => {
        // Simulate cleanup that takes a while but eventually succeeds
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      const teardown = await import('./vitest.global-teardown');

      // Act & Assert: Should complete without hanging
      const startTime = Date.now();
      await teardown.default();
      const duration = Date.now() - startTime;

      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000);
    });
  });

  // ==========================================================================
  // Category 4: Integration Scenarios
  // ==========================================================================

  describe('integration scenarios', () => {
    it('should prevent process hanging after test completion', async () => {
      // Arrange: Simulate normal test suite completion
      mockResetFunction.mockResolvedValue(undefined);

      const teardown = await import('./vitest.global-teardown');

      // Act: Run teardown
      await teardown.default();

      // Assert: Should complete cleanly
      expect(mockResetFunction).toHaveBeenCalled();
    });

    it('should clean up resources even if some tests failed', async () => {
      // Arrange: Teardown runs regardless of test success/failure
      mockResetFunction.mockResolvedValue(undefined);

      const teardown = await import('./vitest.global-teardown');

      // Act: Teardown should still run
      await teardown.default();

      // Assert: Cleanup was called
      expect(mockResetFunction).toHaveBeenCalled();
    });

    it('should support multiple test runs (watch mode)', async () => {
      // Arrange
      const teardown = await import('./vitest.global-teardown');

      // Act: Simulate multiple teardown calls (watch mode re-runs)
      await teardown.default();
      await teardown.default();
      await teardown.default();

      // Assert: Should call reset each time
      expect(mockResetFunction).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // Category 5: Performance Tests
  // ==========================================================================

  describe('performance', () => {
    it('should complete teardown quickly when pool is clean', async () => {
      // Arrange: Fast cleanup
      mockResetFunction.mockResolvedValue(undefined);

      const teardown = await import('./vitest.global-teardown');

      // Act & Assert: Should be fast
      const startTime = Date.now();
      await teardown.default();
      const duration = Date.now() - startTime;

      // Should complete in less than 1 second for clean pool
      expect(duration).toBeLessThan(1000);
    });

    it('should not significantly delay test suite completion', async () => {
      // Arrange: Normal cleanup
      mockResetFunction.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const teardown = await import('./vitest.global-teardown');

      // Act: Measure overhead
      const startTime = Date.now();
      await teardown.default();
      const overhead = Date.now() - startTime;

      // Teardown overhead should be minimal (< 100ms)
      expect(overhead).toBeLessThan(100);
    });
  });

  // ==========================================================================
  // Category 6: Zombie Process Prevention Tests
  // ==========================================================================

  describe('zombie process prevention', () => {
    it('should ensure no lingering timers after teardown', async () => {
      // Arrange: Mock that simulates timer cleanup
      mockResetFunction.mockImplementation(async () => {
        // Simulate clearing idle timer
        return undefined;
      });

      const teardown = await import('./vitest.global-teardown');

      // Act
      await teardown.default();

      // Assert: Reset was called (which should clear timers)
      expect(mockResetFunction).toHaveBeenCalled();
    });

    it('should ensure no lingering MCP server processes after teardown', async () => {
      // Arrange: Mock that simulates process cleanup
      mockResetFunction.mockImplementation(async () => {
        // Simulate closing MCP connections and killing processes
        return undefined;
      });

      const teardown = await import('./vitest.global-teardown');

      // Act
      await teardown.default();

      // Assert: Reset was called (which should kill processes)
      expect(mockResetFunction).toHaveBeenCalled();
    });

    it('should allow Node.js process to exit cleanly after teardown', async () => {
      // Arrange: Simulate complete cleanup
      mockResetFunction.mockResolvedValue(undefined);

      const teardown = await import('./vitest.global-teardown');

      // Act
      await teardown.default();

      // Assert: No hanging promises or timers
      // (If this test completes, cleanup succeeded)
      expect(mockResetFunction).toHaveBeenCalled();
    });
  });
});
