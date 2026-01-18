/**
 * Tests for Config Loader
 *
 * Tests credential isolation and validation functionality:
 * - Service A cannot access Service B credentials
 * - Zod schema validation
 * - Environment variable resolution
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { getToolConfig, hasToolConfig, CredentialsValidationError } from './config-loader';

// Mock fs and resolveProjectPath
vi.mock('fs');
vi.mock('../../lib/find-project-root.js', () => ({
  resolveProjectPath: vi.fn((...parts: string[]) => `/mock/path/${parts.join('/')}`),
}));

describe('Config Loader', () => {
  const mockCredentialsPath = '/mock/path/.claude/tools/config/credentials.json';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: file exists
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Credential Isolation', () => {
    it('should return ONLY the requested service credentials', () => {
      const mockCredentials = {
        linear: { apiKey: 'linear-secret', endpoint: 'https://linear.api' },
        currents: { apiKey: 'currents-secret' },
        github: { apiKey: 'github-secret', org: 'myorg' },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCredentials));

      const result = getToolConfig('linear');

      // Should only contain linear's credentials
      expect(result).toHaveProperty('apiKey', 'linear-secret');
      expect(result).toHaveProperty('endpoint', 'https://linear.api');

      // Should NOT contain other services' credentials
      expect(result).not.toHaveProperty('currents');
      expect(result).not.toHaveProperty('github');
      expect(Object.keys(result)).toEqual(['apiKey', 'endpoint']);
    });

    it('should NOT expose other services credentials when requesting linear', () => {
      const mockCredentials = {
        linear: { apiKey: 'linear-secret' },
        currents: { apiKey: 'currents-super-secret-key' },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCredentials));

      const linearConfig = getToolConfig('linear');

      // Verify currents credentials are NOT in the result
      expect(JSON.stringify(linearConfig)).not.toContain('currents-super-secret-key');
      expect(linearConfig.apiKey).toBe('linear-secret');
    });

    it('should NOT expose other services credentials when requesting currents', () => {
      const mockCredentials = {
        linear: { apiKey: 'linear-super-secret-key' },
        currents: { apiKey: 'currents-secret' },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCredentials));

      const currentsConfig = getToolConfig('currents');

      // Verify linear credentials are NOT in the result
      expect(JSON.stringify(currentsConfig)).not.toContain('linear-super-secret-key');
      expect(currentsConfig.apiKey).toBe('currents-secret');
    });

    it('should return different credentials for different services', () => {
      const mockCredentials = {
        serviceA: { apiKey: 'secret-A', extra: 'A-only' },
        serviceB: { apiKey: 'secret-B', extra: 'B-only' },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCredentials));

      const configA = getToolConfig('serviceA');
      const configB = getToolConfig('serviceB');

      expect(configA.apiKey).toBe('secret-A');
      expect(configB.apiKey).toBe('secret-B');
      expect(configA.extra).toBe('A-only');
      expect(configB.extra).toBe('B-only');
    });
  });

  describe('Schema Validation', () => {
    it('should accept valid credentials.json structure', () => {
      const validCredentials = {
        linear: { apiKey: 'test-key', endpoint: 'https://api.linear.app' },
        currents: { apiKey: 'another-key' },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(validCredentials));

      expect(() => getToolConfig('linear')).not.toThrow();
    });

    it('should reject credentials.json with non-string values', () => {
      const invalidCredentials = {
        linear: { apiKey: 12345 }, // Number instead of string
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidCredentials));

      expect(() => getToolConfig('linear')).toThrow(CredentialsValidationError);
    });

    it('should reject credentials.json with nested objects', () => {
      const invalidCredentials = {
        linear: {
          apiKey: 'valid',
          nested: { deep: 'value' }, // Nested object not allowed
        },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidCredentials));

      expect(() => getToolConfig('linear')).toThrow(CredentialsValidationError);
    });

    it('should reject credentials.json with array values', () => {
      const invalidCredentials = {
        linear: { apiKey: ['array', 'not', 'allowed'] },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidCredentials));

      expect(() => getToolConfig('linear')).toThrow(CredentialsValidationError);
    });

    it('should reject credentials.json that is an array', () => {
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([{ apiKey: 'test' }]));

      expect(() => getToolConfig('linear')).toThrow(CredentialsValidationError);
    });

    it('should include validation issues in error message', () => {
      const invalidCredentials = {
        linear: { apiKey: 12345 },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidCredentials));

      try {
        getToolConfig('linear');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CredentialsValidationError);
        expect((error as CredentialsValidationError).issues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Environment Variable Resolution', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should resolve ${ENV_VAR} syntax', () => {
      process.env.TEST_API_KEY = 'resolved-secret-value';
      const mockCredentials = {
        test: { apiKey: '${TEST_API_KEY}' },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCredentials));

      const config = getToolConfig('test');

      expect(config.apiKey).toBe('resolved-secret-value');
    });

    it('should throw when environment variable is not set', () => {
      delete process.env.MISSING_VAR;
      const mockCredentials = {
        test: { apiKey: '${MISSING_VAR}' },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCredentials));

      expect(() => getToolConfig('test')).toThrow(/Environment variable MISSING_VAR not set/);
    });

    it('should resolve multiple environment variables', () => {
      process.env.API_KEY = 'key-123';
      process.env.API_SECRET = 'secret-456';
      const mockCredentials = {
        test: { apiKey: '${API_KEY}', apiSecret: '${API_SECRET}' },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCredentials));

      const config = getToolConfig('test');

      expect(config.apiKey).toBe('key-123');
      expect(config.apiSecret).toBe('secret-456');
    });

    it('should pass through literal strings without ${} syntax', () => {
      const mockCredentials = {
        test: { endpoint: 'https://api.example.com', version: 'v1' },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCredentials));

      const config = getToolConfig('test');

      expect(config.endpoint).toBe('https://api.example.com');
      expect(config.version).toBe('v1');
    });
  });

  describe('Error Handling', () => {
    it('should throw when credentials.json does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(() => getToolConfig('linear')).toThrow(/Configuration file not found/);
    });

    it('should throw when tool not found in credentials.json', () => {
      const mockCredentials = {
        linear: { apiKey: 'test' },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCredentials));

      expect(() => getToolConfig('nonexistent')).toThrow(/Tool 'nonexistent' not found/);
    });

    it('should list available tools when tool not found', () => {
      const mockCredentials = {
        linear: { apiKey: 'test' },
        currents: { apiKey: 'test' },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCredentials));

      expect(() => getToolConfig('missing')).toThrow(/Available tools: linear, currents/);
    });

    it('should throw on invalid JSON', () => {
      vi.mocked(fs.readFileSync).mockReturnValue('not valid json {');

      expect(() => getToolConfig('linear')).toThrow(/Failed to parse credentials.json/);
    });
  });

  describe('hasToolConfig', () => {
    it('should return true when tool exists', () => {
      const mockCredentials = {
        linear: { apiKey: 'test' },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCredentials));

      expect(hasToolConfig('linear')).toBe(true);
    });

    it('should return false when tool does not exist', () => {
      const mockCredentials = {
        linear: { apiKey: 'test' },
      };
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockCredentials));

      expect(hasToolConfig('nonexistent')).toBe(false);
    });

    it('should return false when config file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      expect(hasToolConfig('linear')).toBe(false);
    });
  });
});
