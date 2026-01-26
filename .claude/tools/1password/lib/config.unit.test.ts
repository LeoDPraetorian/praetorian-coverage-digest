import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getAccount, getAccountArgs, getVaultName, buildSecretReference, getItemName, getAuthMode } from './config';

describe('config', () => {
  describe('getAccount', () => {
    const originalEnv = process.env.OP_ACCOUNT;

    afterEach(() => {
      // Restore original env
      if (originalEnv === undefined) {
        delete process.env.OP_ACCOUNT;
      } else {
        process.env.OP_ACCOUNT = originalEnv;
      }
    });

    it('returns default account when OP_ACCOUNT not set', () => {
      delete process.env.OP_ACCOUNT;
      expect(getAccount()).toBe('praetorianlabs.1password.com');
    });

    it('returns the env value when OP_ACCOUNT is set', () => {
      process.env.OP_ACCOUNT = 'my.1password.com';
      expect(getAccount()).toBe('my.1password.com');
    });
  });

  describe('getAccountArgs', () => {
    const originalEnv = process.env.OP_ACCOUNT;

    afterEach(() => {
      // Restore original env
      if (originalEnv === undefined) {
        delete process.env.OP_ACCOUNT;
      } else {
        process.env.OP_ACCOUNT = originalEnv;
      }
    });

    it('returns default account args when OP_ACCOUNT not set', () => {
      delete process.env.OP_ACCOUNT;
      expect(getAccountArgs()).toEqual(['--account', 'praetorianlabs.1password.com']);
    });

    it('returns ["--account", value] when account is set', () => {
      process.env.OP_ACCOUNT = 'my.1password.com';
      expect(getAccountArgs()).toEqual(['--account', 'my.1password.com']);
    });
  });

  describe('getVaultName', () => {
    const originalEnv = process.env.OP_VAULT_NAME;

    afterEach(() => {
      // Restore original env
      if (originalEnv === undefined) {
        delete process.env.OP_VAULT_NAME;
      } else {
        process.env.OP_VAULT_NAME = originalEnv;
      }
    });

    it('returns "Claude Code Tools" by default', () => {
      delete process.env.OP_VAULT_NAME;
      expect(getVaultName()).toBe('Claude Code Tools');
    });

    it('reads from OP_VAULT_NAME env var if set', () => {
      process.env.OP_VAULT_NAME = 'My Custom Vault';
      expect(getVaultName()).toBe('My Custom Vault');
    });
  });

  describe('buildSecretReference', () => {
    const originalEnv = process.env.OP_VAULT_NAME;

    afterEach(() => {
      // Restore original env
      if (originalEnv === undefined) {
        delete process.env.OP_VAULT_NAME;
      } else {
        process.env.OP_VAULT_NAME = originalEnv;
      }
    });

    it('constructs proper op:// reference with quotes', () => {
      delete process.env.OP_VAULT_NAME;
      const result = buildSecretReference('GitHub', 'token');
      expect(result).toBe('"op://Claude Code Tools/GitHub/token"');
    });

    it('uses default field name "password" when not specified', () => {
      delete process.env.OP_VAULT_NAME;
      const result = buildSecretReference('GitHub');
      expect(result).toBe('"op://Claude Code Tools/GitHub/password"');
    });

    it('handles spaces in vault name', () => {
      process.env.OP_VAULT_NAME = 'My Custom Vault';
      const result = buildSecretReference('GitHub', 'token');
      expect(result).toBe('"op://My Custom Vault/GitHub/token"');
    });

    it('handles spaces in item name', () => {
      delete process.env.OP_VAULT_NAME;
      const result = buildSecretReference('GitHub Personal Token', 'token');
      expect(result).toBe('"op://Claude Code Tools/GitHub Personal Token/token"');
    });

    it('handles spaces in field name', () => {
      delete process.env.OP_VAULT_NAME;
      const result = buildSecretReference('GitHub', 'api token');
      expect(result).toBe('"op://Claude Code Tools/GitHub/api token"');
    });

    it('handles special characters in item name', () => {
      delete process.env.OP_VAULT_NAME;
      const result = buildSecretReference('GitHub (Personal)', 'token');
      expect(result).toBe('"op://Claude Code Tools/GitHub (Personal)/token"');
    });
  });

  describe('getItemName', () => {
    it('returns correct item name for currents service', () => {
      expect(getItemName('currents')).toBe('Currents API Key');
    });

    it('returns correct item name for context7 service', () => {
      expect(getItemName('context7')).toBe('Context7 API Key');
    });

    it('returns correct item name for perplexity service', () => {
      expect(getItemName('perplexity')).toBe('Perplexity API Key');
    });

    it('returns correct item name for shodan service', () => {
      expect(getItemName('shodan')).toBe('Shodan API Key');
    });

    it('returns correct item name for featurebase service', () => {
      expect(getItemName('featurebase')).toBe('Featurebase API Key');
    });

    it('throws Error with descriptive message for unknown service', () => {
      expect(() => getItemName('unknown-service')).toThrow(Error);
      expect(() => getItemName('unknown-service')).toThrow('Unknown service: unknown-service');
    });

    it('error message includes list of available services', () => {
      try {
        getItemName('nonexistent');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toContain('Available services:');
        expect(message).toContain('currents');
        expect(message).toContain('context7');
        expect(message).toContain('perplexity');
        expect(message).toContain('shodan');
        expect(message).toContain('featurebase');
      }
    });

    it('error message includes file path hint for adding new services', () => {
      try {
        getItemName('newservice');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toContain('.claude/tools/1password/lib/config.ts');
      }
    });
  });

  describe('getAuthMode', () => {
    const originalEnv = process.env.OP_SERVICE_ACCOUNT_TOKEN;

    afterEach(() => {
      // Restore original env
      if (originalEnv === undefined) {
        delete process.env.OP_SERVICE_ACCOUNT_TOKEN;
      } else {
        process.env.OP_SERVICE_ACCOUNT_TOKEN = originalEnv;
      }
    });

    it('returns "biometric" when OP_SERVICE_ACCOUNT_TOKEN is not set', () => {
      delete process.env.OP_SERVICE_ACCOUNT_TOKEN;
      expect(getAuthMode()).toBe('biometric');
    });

    it('returns "service-account" when OP_SERVICE_ACCOUNT_TOKEN is set', () => {
      process.env.OP_SERVICE_ACCOUNT_TOKEN = 'ops_token_abc123';
      expect(getAuthMode()).toBe('service-account');
    });

    it('returns "biometric" when OP_SERVICE_ACCOUNT_TOKEN is empty string', () => {
      process.env.OP_SERVICE_ACCOUNT_TOKEN = '';
      expect(getAuthMode()).toBe('biometric');
    });

    it('returns "service-account" for any truthy token value', () => {
      process.env.OP_SERVICE_ACCOUNT_TOKEN = 'any-non-empty-value';
      expect(getAuthMode()).toBe('service-account');
    });
  });
});
