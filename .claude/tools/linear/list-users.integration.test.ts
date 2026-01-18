/**
 * Integration Tests for list-users Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Access to Praetorian workspace
 *
 * Usage:
 * npx vitest run list-users.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { listUsers } from './list-users';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('listUsers - Integration Tests', () => {
  beforeAll(() => {
    console.log('Running integration tests against real Linear MCP');
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should list users', async () => {
    const result = await listUsers.execute({});

    expect(result).toBeDefined();
    expect(result.totalUsers).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(result.users)).toBe(true);

    console.log(`Found ${result.totalUsers} users`);
    if (result.users.length > 0) {
      console.log('First user:', {
        id: result.users[0].id,
        name: result.users[0].name,
        email: result.users[0].email,
      });
    }
  });

  it('Real MCP Server: should search users by query', async () => {
    const result = await listUsers.execute({ query: 'nathan' });

    expect(result).toBeDefined();
    expect(Array.isArray(result.users)).toBe(true);

    console.log(`Found ${result.totalUsers} users matching 'nathan'`);
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    const result = await listUsers.execute({});

    if (result.users.length > 0) {
      const user = result.users[0];
      const keys = Object.keys(user);
      const allowedKeys = ['id', 'name', 'email', 'active', 'createdAt'];

      keys.forEach(key => {
        expect(allowedKeys).toContain(key);
      });

      // Verbose fields should NOT be present
      expect(user).not.toHaveProperty('displayName');
      expect(user).not.toHaveProperty('avatarUrl');
      expect(user).not.toHaveProperty('admin');
      expect(user).not.toHaveProperty('organization');
    }
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    await expect(
      listUsers.execute({ query: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    await expect(
      listUsers.execute({ query: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    await expect(
      listUsers.execute({ query: 'test\x00null' })
    ).rejects.toThrow(/control characters/i);
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    const start = Date.now();
    await listUsers.execute({});
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10000);
    console.log(`API call completed in ${duration}ms`);
  });

  // ==========================================================================
  // Schema Compatibility Tests
  // ==========================================================================

  describe('Schema Compatibility: Response format validation', () => {
    it('should return proper response structure', async () => {
      const result = await listUsers.execute({});

      expect(typeof result.totalUsers).toBe('number');
      expect(Array.isArray(result.users)).toBe(true);

      if (result.users.length > 0) {
        const user = result.users[0];
        expect(typeof user.id).toBe('string');
        expect(typeof user.name).toBe('string');
        expect(typeof user.email).toBe('string');
      }
    });

    it('should return UUID format for user ids', async () => {
      const result = await listUsers.execute({});

      result.users.forEach(user => {
        expect(user.id).toMatch(/^[a-f0-9-]{36}$/i);
      });
    });

    it('should return valid email format', async () => {
      const result = await listUsers.execute({});

      result.users.forEach(user => {
        expect(user.email).toMatch(/@/);
      });
    });
  });
});
