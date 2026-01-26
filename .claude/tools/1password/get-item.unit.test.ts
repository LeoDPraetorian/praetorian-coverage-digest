import { describe, test, expect, vi, beforeEach } from 'vitest';
import { getItem } from './get-item.js';

vi.mock('./lib/op-client.js', () => ({
  execOp: vi.fn(),
  OpClientError: class OpClientError extends Error {
    constructor(message: string, public code: string) {
      super(message);
      this.name = 'OpClientError';
    }
  }
}));

vi.mock('./lib/config.js', () => ({
  getVaultName: vi.fn().mockReturnValue('Claude Code Tools')
}));

const { execOp, OpClientError } = await import('./lib/op-client.js');

describe('getItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns item with id, name, category, fields object', async () => {
    const mockResponse = JSON.stringify({
      id: 'abc123',
      title: 'Database Credentials',
      category: 'DATABASE',
      fields: [
        { id: 'host', label: 'host', value: 'db.example.com' },
        { id: 'port', label: 'port', value: '5432' },
        { id: 'password', label: 'password', value: 'secret123' }
      ]
    });

    vi.mocked(execOp).mockResolvedValue(mockResponse);

    const result = await getItem.execute({ item: 'Database Credentials' });

    expect(result).toEqual({
      id: 'abc123',
      name: 'Database Credentials',
      category: 'DATABASE',
      fields: {
        host: 'db.example.com',
        port: '5432',
        password: 'secret123'
      }
    });

    expect(execOp).toHaveBeenCalledWith([
      'item', 'get', '"Database Credentials"',
      '--vault', '"Claude Code Tools"',
      '--reveal'
    ]);
  });

  test('extracts all field values into fields map', async () => {
    const mockResponse = JSON.stringify({
      id: 'xyz789',
      title: 'Test Item',
      category: 'LOGIN',
      fields: [
        { id: 'username', label: 'username', value: 'admin' },
        { id: 'password', label: 'password', value: 'pass123' },
        { id: 'url', label: 'url', value: 'https://example.com' },
        { id: 'notes', label: 'notes', value: 'Important notes' }
      ]
    });

    vi.mocked(execOp).mockResolvedValue(mockResponse);

    const result = await getItem.execute({ item: 'Test Item' });

    expect(result.fields).toEqual({
      username: 'admin',
      password: 'pass123',
      url: 'https://example.com',
      notes: 'Important notes'
    });
  });

  test('throws OpClientError when item not found', async () => {
    const error = new OpClientError('[ERROR] 2024/01/01 12:00:00 Item not found', 'NOT_FOUND');
    vi.mocked(execOp).mockRejectedValue(error);

    await expect(getItem.execute({ item: 'Nonexistent Item' }))
      .rejects
      .toThrow(OpClientError);
  });

  test('throws OpClientError on biometric timeout', async () => {
    const error = new OpClientError('[ERROR] 2024/01/01 12:00:00 Biometric authentication timeout', 'BIOMETRIC_TIMEOUT');
    vi.mocked(execOp).mockRejectedValue(error);

    await expect(getItem.execute({ item: 'Some Item' }))
      .rejects
      .toThrow(OpClientError);
  });

  test('rejects empty item name', async () => {
    await expect(getItem.execute({ item: '' }))
      .rejects
      .toThrow('Item name is required');
  });

  test('rejects item name with shell metacharacters', async () => {
    const unsafeItems = [
      'test;rm -rf /',
      'test&whoami',
      'test|cat /etc/passwd',
      'test`echo hacked`',
      'test$(whoami)',
      'test()'
    ];

    for (const item of unsafeItems) {
      await expect(getItem.execute({ item }))
        .rejects
        .toThrow('Item name contains unsafe characters');
    }
  });

  test('accepts safe item names', async () => {
    const safeItems = [
      'my-secret',
      'my-secret-123',
      'database_credentials',
      'API-Key-Production'
    ];

    // Mock a successful response
    const mockResponse = JSON.stringify({
      id: 'abc123',
      title: 'Test Item',
      category: 'LOGIN',
      fields: []
    });
    vi.mocked(execOp).mockResolvedValue(mockResponse);

    for (const item of safeItems) {
      await expect(getItem.execute({ item })).resolves.toBeDefined();
    }
  });
});
