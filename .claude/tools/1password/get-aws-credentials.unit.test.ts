/**
 * Unit tests for get-aws-credentials
 * Tests 1Password CLI wrapper (not MCP)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';

// Mock child_process exec for 1Password CLI
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

import { getAwsCredentials } from './get-aws-credentials';
import { OpClientError } from './lib/op-client';

type ExecCallback = (error: Error | null, stdout: string, stderr: string) => void;

describe('get-aws-credentials - Unit Tests', () => {
  const mockExec = vi.mocked(exec);

  beforeEach(() => {
    mockExec.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // MANDATORY CATEGORY 1: Schema validation
  describe('Schema validation', () => {
    it('should accept valid input with default item', async () => {
      // Mock execOp for get-item call (static credentials)
      mockExec.mockImplementation((cmd: string, options: any, callback: ExecCallback) => {
        callback(null, JSON.stringify({
          id: 'item-123',
          title: 'AWS Credentials',
          category: 'PASSWORD',
          fields: [
            { label: 'AccessKeyId', value: 'AKIAIOSFODNN7EXAMPLE' },
            { label: 'SecretAccessKey', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' }
          ]
        }), '');
        return {} as any;
      });

      const result = await getAwsCredentials.execute({});
      expect(result).toBeDefined();
      expect(result.Version).toBe(1);
      expect(result.AccessKeyId).toBe('AKIAIOSFODNN7EXAMPLE');
      expect(result.SecretAccessKey).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
      expect(result.SessionToken).toBeUndefined();
    });

    it('should reject invalid item name', async () => {
      await expect(
        getAwsCredentials.execute({ item: '; rm -rf /' })
      ).rejects.toThrow(/unsafe characters/i);
    });

    it('should handle custom sessionDuration', async () => {
      const validInputs = [
        { item: 'AWS Credentials', sessionDuration: 900 },    // 15 minutes
        { item: 'AWS Credentials', sessionDuration: 3600 },   // 1 hour (default)
        { item: 'AWS Credentials', sessionDuration: 129600 }, // 36 hours (max)
      ];

      for (const input of validInputs) {
        mockExec.mockClear();
        mockExec.mockImplementation((cmd: string, options: any, callback: ExecCallback) => {
          callback(null, JSON.stringify({
            id: 'item-123',
            title: 'AWS Credentials',
            category: 'PASSWORD',
            fields: [
              { label: 'AccessKeyId', value: 'AKIAIOSFODNN7EXAMPLE' },
              { label: 'SecretAccessKey', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' }
            ]
          }), '');
          return {} as any;
        });

        const result = await getAwsCredentials.execute(input);
        expect(result.AccessKeyId).toBeDefined();
      }
    });
  });

  // MANDATORY CATEGORY 2: Security testing
  describe('Security testing', () => {
    it('should block command injection in item name', async () => {
      const commandInjectionInputs = [
        '; rm -rf /',
        '| cat /etc/passwd',
        '$(whoami)',
        '`id`',
      ];

      for (const malicious of commandInjectionInputs) {
        await expect(
          getAwsCredentials.execute({ item: malicious })
        ).rejects.toThrow(/unsafe characters/i);
      }
    });

    it('should allow spaces in item names', async () => {
      mockExec.mockImplementation((cmd: string, options: any, callback: ExecCallback) => {
        callback(null, JSON.stringify({
          id: 'item-123',
          title: 'AWS Production Credentials',
          category: 'PASSWORD',
          fields: [
            { label: 'AccessKeyId', value: 'AKIAIOSFODNN7EXAMPLE' },
            { label: 'SecretAccessKey', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' }
          ]
        }), '');
        return {} as any;
      });

      const result = await getAwsCredentials.execute({ item: 'AWS Production Credentials' });
      expect(result.AccessKeyId).toBeDefined();
    });
  });

  // MANDATORY CATEGORY 3: Response format
  describe('Response format - AWS credential_process JSON', () => {
    it('should return static credentials format', async () => {
      mockExec.mockImplementation((cmd: string, options: any, callback: ExecCallback) => {
        callback(null, JSON.stringify({
          id: 'item-123',
          title: 'AWS Credentials',
          category: 'PASSWORD',
          fields: [
            { label: 'AccessKeyId', value: 'AKIAIOSFODNN7EXAMPLE' },
            { label: 'SecretAccessKey', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' }
          ]
        }), '');
        return {} as any;
      });

      const result = await getAwsCredentials.execute({});

      expect(result.Version).toBe(1);
      expect(result.AccessKeyId).toBe('AKIAIOSFODNN7EXAMPLE');
      expect(result.SecretAccessKey).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
      expect(result.SessionToken).toBeUndefined();
      expect(result.Expiration).toBeUndefined();
    });

    it('should return MFA session token format', async () => {
      let callCount = 0;
      mockExec.mockImplementation((cmd: string, options: any, callback: ExecCallback) => {
        callCount++;

        if (callCount === 1) {
          // First call: get-item with MFA field
          callback(null, JSON.stringify({
            id: 'item-123',
            title: 'AWS Credentials',
            category: 'PASSWORD',
            fields: [
              { label: 'AccessKeyId', value: 'AKIAIOSFODNN7EXAMPLE' },
              { label: 'SecretAccessKey', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
              { label: 'mfa serial', value: 'arn:aws:iam::123456789012:mfa/user' }
            ]
          }), '');
        } else if (callCount === 2) {
          // Second call: read TOTP
          callback(null, '123456', '');
        } else if (cmd.includes('aws sts get-session-token')) {
          // Third call: AWS STS
          callback(null, JSON.stringify({
            Credentials: {
              AccessKeyId: 'ASIATEMP',
              SecretAccessKey: 'tempSecret',
              SessionToken: 'tempToken',
              Expiration: '2026-01-26T00:00:00Z'
            }
          }), '');
        }
        return {} as any;
      });

      const result = await getAwsCredentials.execute({});

      expect(result.Version).toBe(1);
      expect(result.AccessKeyId).toBe('ASIATEMP');
      expect(result.SecretAccessKey).toBe('tempSecret');
      expect(result.SessionToken).toBe('tempToken');
      expect(result.Expiration).toBe('2026-01-26T00:00:00Z');
    });
  });

  // MANDATORY CATEGORY 4: Token reduction (N/A for credential_process)
  describe('Token reduction (not applicable)', () => {
    it('should return minimal AWS credential_process format', async () => {
      mockExec.mockImplementation((cmd: string, options: any, callback: ExecCallback) => {
        callback(null, JSON.stringify({
          id: 'item-123',
          title: 'AWS Credentials',
          category: 'PASSWORD',
          fields: [
            { label: 'AccessKeyId', value: 'AKIAIOSFODNN7EXAMPLE' },
            { label: 'SecretAccessKey', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' }
          ]
        }), '');
        return {} as any;
      });

      const result = await getAwsCredentials.execute({});

      // AWS credential_process has a fixed schema - cannot reduce further
      expect(Object.keys(result)).toContain('Version');
      expect(Object.keys(result)).toContain('AccessKeyId');
      expect(Object.keys(result)).toContain('SecretAccessKey');
    });
  });

  // MANDATORY CATEGORY 5: Error handling
  describe('Error handling', () => {
    it('should handle item not found', async () => {
      mockExec.mockImplementation((cmd: string, options: any, callback: ExecCallback) => {
        callback(new Error('[ERROR] 2024/01/25 11:00:00 item not found') as any, '', '[ERROR] 2024/01/25 11:00:00 item not found');
        return {} as any;
      });

      await expect(getAwsCredentials.execute({ item: 'NonExistent' })).rejects.toThrow(OpClientError);
      await expect(getAwsCredentials.execute({ item: 'NonExistent' })).rejects.toThrow(/not found/i);
    });

    it('should handle missing required fields', async () => {
      mockExec.mockImplementation((cmd: string, options: any, callback: ExecCallback) => {
        callback(null, JSON.stringify({
          id: 'item-123',
          title: 'AWS Credentials',
          category: 'PASSWORD',
          fields: [
            { label: 'AccessKeyId', value: 'AKIAIOSFODNN7EXAMPLE' }
            // Missing SecretAccessKey
          ]
        }), '');
        return {} as any;
      });

      await expect(getAwsCredentials.execute({})).rejects.toThrow(/SecretAccessKey.*required/i);
    });

    it('should handle AWS STS failure', async () => {
      let callCount = 0;
      mockExec.mockImplementation((cmd: string, options: any, callback: ExecCallback) => {
        callCount++;

        if (callCount === 1) {
          callback(null, JSON.stringify({
            id: 'item-123',
            title: 'AWS Credentials',
            category: 'PASSWORD',
            fields: [
              { label: 'AccessKeyId', value: 'AKIAIOSFODNN7EXAMPLE' },
              { label: 'SecretAccessKey', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
              { label: 'mfa serial', value: 'arn:aws:iam::123456789012:mfa/user' }
            ]
          }), '');
        } else if (callCount === 2) {
          callback(null, '123456', '');
        } else if (cmd.includes('aws sts get-session-token')) {
          callback(new Error('InvalidClientTokenId') as any, '', 'InvalidClientTokenId');
        }
        return {} as any;
      });

      await expect(getAwsCredentials.execute({})).rejects.toThrow(/AWS STS error/i);
    });
  });

  // RECOMMENDED: Edge cases
  describe('Edge cases', () => {
    it('should detect MFA with various field names', async () => {
      const mfaFieldNames = ['mfa serial', 'mfa device', 'MFA Serial'];

      for (const fieldName of mfaFieldNames) {
        mockExec.mockClear();
        let callCount = 0;
        mockExec.mockImplementation((cmd: string, options: any, callback: ExecCallback) => {
          callCount++;

          if (callCount === 1) {
            callback(null, JSON.stringify({
              id: 'item-123',
              title: 'AWS Credentials',
              category: 'PASSWORD',
              fields: [
                { label: 'AccessKeyId', value: 'AKIAIOSFODNN7EXAMPLE' },
                { label: 'SecretAccessKey', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
                { label: fieldName, value: 'arn:aws:iam::123456789012:mfa/user' }
              ]
            }), '');
          } else if (callCount === 2) {
            callback(null, '123456', '');
          } else if (cmd.includes('aws sts get-session-token')) {
            callback(null, JSON.stringify({
              Credentials: {
                AccessKeyId: 'ASIATEMP',
                SecretAccessKey: 'tempSecret',
                SessionToken: 'tempToken',
                Expiration: '2026-01-26T00:00:00Z'
              }
            }), '');
          }
          return {} as any;
        });

        const result = await getAwsCredentials.execute({});
        expect(result.SessionToken).toBeDefined();
      }
    });

    it('should handle underscore field names (aws_access_key_id)', async () => {
      mockExec.mockImplementation((cmd: string, options: any, callback: ExecCallback) => {
        callback(null, JSON.stringify({
          id: 'item-123',
          title: 'AWS Credentials',
          category: 'PASSWORD',
          fields: [
            { label: 'aws_access_key_id', value: 'AKIAIOSFODNN7EXAMPLE' },
            { label: 'aws_secret_access_key', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' }
          ]
        }), '');
        return {} as any;
      });

      const result = await getAwsCredentials.execute({});
      expect(result.AccessKeyId).toBe('AKIAIOSFODNN7EXAMPLE');
      expect(result.SecretAccessKey).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    });

    it('should handle mixed case and underscore field names', async () => {
      mockExec.mockImplementation((cmd: string, options: any, callback: ExecCallback) => {
        callback(null, JSON.stringify({
          id: 'item-123',
          title: 'AWS Credentials',
          category: 'PASSWORD',
          fields: [
            { label: 'Access Key ID', value: 'AKIAIOSFODNN7EXAMPLE' },
            { label: 'Secret Access Key', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' }
          ]
        }), '');
        return {} as any;
      });

      const result = await getAwsCredentials.execute({});
      expect(result.AccessKeyId).toBe('AKIAIOSFODNN7EXAMPLE');
      expect(result.SecretAccessKey).toBe('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
    });

    it('should detect MFA with underscore field names (mfa_serial, mfa_device)', async () => {
      const underscoreMfaFields = ['mfa_serial', 'mfa_device'];

      for (const fieldName of underscoreMfaFields) {
        mockExec.mockClear();
        let callCount = 0;
        mockExec.mockImplementation((cmd: string, options: any, callback: ExecCallback) => {
          callCount++;

          if (callCount === 1) {
            callback(null, JSON.stringify({
              id: 'item-123',
              title: 'AWS Credentials',
              category: 'PASSWORD',
              fields: [
                { label: 'aws_access_key_id', value: 'AKIAIOSFODNN7EXAMPLE' },
                { label: 'aws_secret_access_key', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' },
                { label: fieldName, value: 'arn:aws:iam::123456789012:mfa/user' }
              ]
            }), '');
          } else if (callCount === 2) {
            callback(null, '123456', '');
          } else if (cmd.includes('aws sts get-session-token')) {
            callback(null, JSON.stringify({
              Credentials: {
                AccessKeyId: 'ASIATEMP',
                SecretAccessKey: 'tempSecret',
                SessionToken: 'tempToken',
                Expiration: '2026-01-26T00:00:00Z'
              }
            }), '');
          }
          return {} as any;
        });

        const result = await getAwsCredentials.execute({});
        expect(result.SessionToken).toBeDefined();
      }
    });
  });
});
