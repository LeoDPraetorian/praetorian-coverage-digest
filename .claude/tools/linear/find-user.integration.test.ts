/**
 * Integration Tests for find-user Wrapper
 *
 * These tests run against the REAL Linear MCP server.
 *
 * Prerequisites:
 * - Linear OAuth configured (~/.mcp-auth/linear)
 * - Network access to Linear API
 * - Access to Praetorian workspace
 *
 * Usage:
 * npx vitest run find-user.integration.test.ts
 *
 * Note: These tests are SKIPPED by default in CI.
 * Set INTEGRATION_TESTS=true to run them.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { findUser } from './find-user';
import { listUsers } from './list-users';

// Skip integration tests unless explicitly enabled
const runIntegration = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegration)('findUser - Integration Tests', () => {
  let testUserQuery: string | undefined;

  beforeAll(async () => {
    console.log('Running integration tests against real Linear MCP');

    // Find a user to search for
    const users = await listUsers.execute({});
    if (users.users.length > 0) {
      testUserQuery = users.users[0].email || users.users[0].name;
      console.log(`Using test user query: ${testUserQuery}`);
    }
  });

  // ==========================================================================
  // Real MCP Server Tests
  // ==========================================================================

  it('Real MCP Server: should find user by query', async () => {
    if (!testUserQuery) {
      console.log('Skipping: No test user available');
      return;
    }

    const result = await findUser.execute({ query: testUserQuery });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.name).toBeDefined();
    expect(result.email).toBeDefined();

    console.log('Found user:', {
      id: result.id,
      name: result.name,
      email: result.email,
    });
  });

  // ==========================================================================
  // Token Reduction - Real Data Tests
  // ==========================================================================

  it('Token Reduction - Real Data: should return filtered response', async () => {
    if (!testUserQuery) {
      console.log('Skipping: No test user available');
      return;
    }

    const result = await findUser.execute({ query: testUserQuery });

    const keys = Object.keys(result);
    const allowedKeys = ['id', 'name', 'email', 'displayName', 'avatarUrl', 'active', 'admin', 'createdAt'];

    keys.forEach(key => {
      expect(allowedKeys).toContain(key);
    });

    // Verbose fields should NOT be present
    expect(result).not.toHaveProperty('lastSeen');
    expect(result).not.toHaveProperty('timezone');
    expect(result).not.toHaveProperty('guest');
    expect(result).not.toHaveProperty('organization');
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  it('should validate security constraints on real input', async () => {
    await expect(
      findUser.execute({ query: '../../../etc/passwd' })
    ).rejects.toThrow(/traversal/i);

    await expect(
      findUser.execute({ query: '; rm -rf /' })
    ).rejects.toThrow(/invalid characters/i);

    await expect(
      findUser.execute({ query: 'test\x00null' })
    ).rejects.toThrow(/control characters/i);
  });

  it('should throw for non-existent user', async () => {
    await expect(
      findUser.execute({ query: 'nonexistent-user-12345-xyz@example.com' })
    ).rejects.toThrow(/not found/i);
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  it('Performance: should complete within reasonable time', async () => {
    if (!testUserQuery) {
      console.log('Skipping: No test user available');
      return;
    }

    const start = Date.now();
    await findUser.execute({ query: testUserQuery });
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10000);
    console.log(`API call completed in ${duration}ms`);
  });

  // ==========================================================================
  // Schema Compatibility Tests
  // ==========================================================================

  describe('Schema Compatibility: Response format validation', () => {
    it('should return proper response structure', async () => {
      if (!testUserQuery) {
        console.log('Skipping: No test user available');
        return;
      }

      const result = await findUser.execute({ query: testUserQuery });

      expect(typeof result.id).toBe('string');
      expect(typeof result.name).toBe('string');
      expect(typeof result.email).toBe('string');
    });

    it('should return UUID format for user id', async () => {
      if (!testUserQuery) {
        console.log('Skipping: No test user available');
        return;
      }

      const result = await findUser.execute({ query: testUserQuery });

      expect(result.id).toMatch(/^[a-f0-9-]{36}$/i);
    });
  });
});
