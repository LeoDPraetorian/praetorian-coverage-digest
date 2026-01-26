/**
 * Unit tests for search_strings wrapper
 *
 * Test Plan: 23 tests across 6 categories
 * _ Input Validation (6 tests)
 * _ MCP Integration & Pagination (4 tests)
 * _ Credential Visibility (3 tests)
 * _ Response Filtering (3 tests)
 * _ Security (4 tests)
 * _ Edge Cases & Error Handling (3 tests)
 *
 * Coverage Target: ≥80% line/branch/function
 *
 * CRITICAL: This tool does NOT redact credentials _ reverse engineering requires full visibility
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest';
import { z } from 'zod';

// Mock MCP client before any imports
vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { callMCPTool } from '../config/lib/mcp-client.js';

// Test data helpers
interface RawStringResult {
  value: string;
  address: string;
  section?: string;
  length?: number;
}

interface RawSearchStringsResponse {
  results?: RawStringResult[];
  strings?: RawStringResult[];
  total?: number;
  binary_name?: string;
  search_query?: string;
  internal_id?: string;
}

/**
 * Create a mock string result with defaults
 */
function createMockStringResult(overrides?: Partial<RawStringResult>): RawStringResult {
  return {
    value: 'default_string',
    address: '0x00401000',
    section: '.rodata',
    length: 14,
    ...overrides,
  };
}

/**
 * Create a mock response with multiple strings
 */
function createMockStringsResponse(count: number, offset: number = 0): RawSearchStringsResponse {
  return {
    strings: Array.from({ length: count }, (_, i) =>
      createMockStringResult({
        value: `string_${offset + i}`,
        address: `0x${(0x401000 + (offset + i) * 0x20).toString(16)}`,
      })
    ),
    total: 500, // Assume larger result set for pagination tests
  };
}

/**
 * Create sensitive credential strings (NOT redacted _ critical for test)
 */
function createSensitiveString(type: 'password' | 'api_key' | 'token'): RawStringResult {
  const values = {
    password: 'password=admin123',
    api_key: 'api_key=sk_1234567890abcdef',
    token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  };
  return createMockStringResult({ value: values[type] });
}

// =============================================================================
// 1. Input Validation Tests (6 tests)
// =============================================================================

describe('search_strings _ Input Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1.1: rejects empty query', async () => {
    const { execute } = await import('./search-strings.js');

    const result = await execute({
      binary_name: 'test.bin',
      query: '',
      limit: 100,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/Query is required|Query.*required/i);
    }
  });

  it('1.2: rejects path traversal in binary_name', async () => {
    const { execute } = await import('./search-strings.js');

    const result = await execute({
      binary_name: '../etc/passwd',
      query: 'test',
      limit: 100,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/Path traversal|traversal not allowed/i);
    }
  });

  it('1.3: rejects control characters in query', async () => {
    const { execute } = await import('./search-strings.js');

    const result = await execute({
      binary_name: 'test.bin',
      query: 'password\x00test',
      limit: 100,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/Control characters|control.*not allowed/i);
    }
  });

  it('1.4: enforces limit maximum (500)', async () => {
    const { execute } = await import('./search-strings.js');

    const result = await execute({
      binary_name: 'test.bin',
      query: 'test',
      limit: 1000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/Limit too large|max.*500/i);
    }
  });

  it('1.5: applies default limit (100)', async () => {
    const { execute } = await import('./search-strings.js');
    const mockCallMCPTool = vi.mocked(callMCPTool);

    mockCallMCPTool.mockResolvedValue({
      strings: [createMockStringResult()],
      total: 1,
    });

    await execute({
      binary_name: 'test.bin',
      query: 'test',
      // No limit specified
    });

    // Verify MCP was called with default limit of 100
    expect(mockCallMCPTool).toHaveBeenCalledWith(
      'pyghidra',
      'search_strings',
      expect.objectContaining({
        limit: 100,
      }),
      expect.any(Object)
    );
  });

  it('1.6: validates offset parameter (rejects negative)', async () => {
    const { execute } = await import('./search-strings.js');

    const result = await execute({
      binary_name: 'test.bin',
      query: 'test',
      limit: 100,
      offset: -10,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/Offset.*non_negative|Offset.*must be/i);
    }
  });
});

// =============================================================================
// 2. MCP Integration & Pagination Tests (4 tests)
// =============================================================================

describe('search_strings _ MCP Integration & Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('2.1: successful MCP call with correct parameters including offset', async () => {
    const { execute } = await import('./search-strings.js');
    const mockCallMCPTool = vi.mocked(callMCPTool);

    mockCallMCPTool.mockResolvedValue({
      strings: [
        createMockStringResult({ value: 'test_string' }),
      ],
      total: 100,
    });

    const result = await execute({
      binary_name: 'test.bin',
      query: 'test',
      limit: 50,
      offset: 20,
    });

    // Verify MCP call parameters
    expect(mockCallMCPTool).toHaveBeenCalledWith(
      'pyghidra',
      'search_strings',
      {
        binary_name: 'test.bin',
        query: 'test',
        limit: 50,
        offset: 20,
      },
      expect.any(Object)
    );

    // Verify response structure
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveProperty('strings');
      expect(result.data).toHaveProperty('summary');
      expect(result.data).toHaveProperty('estimatedTokens');
      expect(result.data.summary).toHaveProperty('offset');
      expect(result.data.summary.offset).toBe(20);
    }
  });

  it('2.2: propagates BinaryNotFoundError with suggestions', async () => {
    const { execute } = await import('./search-strings.js');
    const mockCallMCPTool = vi.mocked(callMCPTool);

    const error: any = new Error('Binary not found: firmware.bin. Did you mean: firmware_v1.bin, firmware_v2.bin?');
    error.code = 'BINARY_NOT_FOUND';
    error.suggestions = ['firmware_v1.bin', 'firmware_v2.bin'];

    mockCallMCPTool.mockRejectedValue(error);

    const result = await execute({
      binary_name: 'firmware.bin',
      query: 'test',
      limit: 100,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('BINARY_NOT_FOUND');
      expect(result.error.message).toMatch(/Binary not found|firmware\.bin/i);
      expect(result.error.message).toMatch(/Did you mean|firmware_v1\.bin/i);
    }
  });

  it('2.3: pagination with offset=0 (first page)', async () => {
    const { execute } = await import('./search-strings.js');
    const mockCallMCPTool = vi.mocked(callMCPTool);

    mockCallMCPTool.mockResolvedValue({
      strings: Array.from({ length: 100 }, (_, i) =>
        createMockStringResult({
          value: `string_${i}`,
          address: `0x${(0x401000 + i * 0x20).toString(16)}`,
        })
      ),
      total: 500,
    });

    const result = await execute({
      binary_name: 'test.bin',
      query: 'test',
      limit: 100,
      offset: 0,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Verify summary metadata
      expect(result.data.summary.total).toBe(500);
      expect(result.data.summary.returned).toBe(100);
      expect(result.data.summary.hasMore).toBe(true); // 500 > 100
      expect(result.data.summary.offset).toBe(0);
    }
  });

  it('2.4: pagination with offset=200 (middle page)', async () => {
    const { execute } = await import('./search-strings.js');
    const mockCallMCPTool = vi.mocked(callMCPTool);

    mockCallMCPTool.mockResolvedValue({
      strings: Array.from({ length: 100 }, (_, i) =>
        createMockStringResult({
          value: `string_${200 + i}`,
          address: `0x${(0x401000 + (200 + i) * 0x20).toString(16)}`,
        })
      ),
      total: 500,
    });

    const result = await execute({
      binary_name: 'test.bin',
      query: 'test',
      limit: 100,
      offset: 200,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Verify offset and pagination state
      expect(result.data.summary.offset).toBe(200);
      expect(result.data.summary.returned).toBe(100);
      expect(result.data.summary.hasMore).toBe(true); // More results after offset 200 + limit 100

      // Verify results correspond to correct offset range
      expect(result.data.strings[0].value).toBe('string_200');
    }
  });
});

// =============================================================================
// 3. Credential Visibility Tests (3 tests)
// =============================================================================

describe('search_strings _ Credential Visibility (NO REDACTION)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('3.1: returns passwords as_is (NOT redacted)', async () => {
    const { execute } = await import('./search-strings.js');
    const mockCallMCPTool = vi.mocked(callMCPTool);

    mockCallMCPTool.mockResolvedValue({
      strings: [
        createSensitiveString('password'),
      ],
      total: 1,
    });

    const result = await execute({
      binary_name: 'test.bin',
      query: 'password',
      limit: 100,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // CRITICAL: Verify full credential visible
      expect(result.data.strings[0].value).toBe('password=admin123');

      // CRITICAL: Verify NO redaction markers
      expect(result.data.strings[0].value).not.toContain('[REDACTED]');
      expect(result.data.strings[0].value).not.toContain('***');
      expect(result.data.strings[0].value).not.toContain('<PASSWORD>');
      expect(result.data.strings[0].value).not.toContain('••••');
    }
  });

  it('3.2: returns API keys as_is (NOT redacted)', async () => {
    const { execute } = await import('./search-strings.js');
    const mockCallMCPTool = vi.mocked(callMCPTool);

    mockCallMCPTool.mockResolvedValue({
      strings: [
        createSensitiveString('api_key'),
      ],
      total: 1,
    });

    const result = await execute({
      binary_name: 'test.bin',
      query: 'api_key',
      limit: 100,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // CRITICAL: Verify full API key visible
      expect(result.data.strings[0].value).toBe('api_key=sk_1234567890abcdef');

      // CRITICAL: Verify NO redaction
      expect(result.data.strings[0].value).not.toContain('[REDACTED]');
      expect(result.data.strings[0].value).not.toContain('***');
    }
  });

  it('3.3: returns multiple sensitive strings unredacted', async () => {
    const { execute } = await import('./search-strings.js');
    const mockCallMCPTool = vi.mocked(callMCPTool);

    mockCallMCPTool.mockResolvedValue({
      strings: [
        createSensitiveString('password'),
        createSensitiveString('api_key'),
        createSensitiveString('token'),
      ],
      total: 3,
    });

    const result = await execute({
      binary_name: 'test.bin',
      query: 'secret',
      limit: 100,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Verify ALL sensitive values returned in full
      expect(result.data.strings).toHaveLength(3);
      expect(result.data.strings[0].value).toContain('admin123');
      expect(result.data.strings[1].value).toContain('sk_1234567890abcdef');
      expect(result.data.strings[2].value).toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');

      // Verify NO automatic redaction logic
      const allValues = result.data.strings.map(s => s.value).join(' ');
      expect(allValues).not.toContain('[REDACTED]');
      expect(allValues).not.toContain('***');

      // Verify estimatedTokens accounts for full strings
      expect(result.data.estimatedTokens).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// 4. Response Filtering Tests (3 tests)
// =============================================================================

describe('search_strings _ Response Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('4.1: omits redundant fields from response', async () => {
    const { execute } = await import('./search-strings.js');
    const mockCallMCPTool = vi.mocked(callMCPTool);

    mockCallMCPTool.mockResolvedValue({
      strings: [createMockStringResult()],
      total: 1,
      // Redundant fields that should be filtered out
      binary_name: 'test.bin', // Caller knows this
      search_query: 'test', // Caller provided this
      internal_id: 'abc123', // Internal metadata
      large_metadata: { /* large object */ },
    });

    const result = await execute({
      binary_name: 'test.bin',
      query: 'test',
      limit: 100,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Verify redundant fields NOT present in response
      expect(result.data).not.toHaveProperty('binary_name');
      expect(result.data).not.toHaveProperty('search_query');
      expect(result.data).not.toHaveProperty('internal_id');
      expect(result.data).not.toHaveProperty('large_metadata');

      // Verify essential data IS present
      expect(result.data).toHaveProperty('strings');
      expect(result.data).toHaveProperty('summary');
    }
  });

  it('4.2: includes summary metadata with correct pagination values', async () => {
    const { execute } = await import('./search-strings.js');
    const mockCallMCPTool = vi.mocked(callMCPTool);

    mockCallMCPTool.mockResolvedValue({
      strings: Array.from({ length: 100 }, (_, i) =>
        createMockStringResult({ value: `string_${i}` })
      ),
      total: 450,
    });

    const result = await execute({
      binary_name: 'test.bin',
      query: 'test',
      limit: 100,
      offset: 150,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Verify summary metadata structure
      expect(result.data.summary).toEqual({
        total: 450,
        returned: 100,
        hasMore: true, // 450 > (150 + 100)
        offset: 150,
        query: 'test',
      });
    }
  });

  it('4.3: includes token estimate for filtered response', async () => {
    const { execute } = await import('./search-strings.js');
    const mockCallMCPTool = vi.mocked(callMCPTool);

    mockCallMCPTool.mockResolvedValue({
      strings: Array.from({ length: 100 }, (_, i) =>
        createMockStringResult({ value: `string_value_${i}` })
      ),
      total: 100,
    });

    const result = await execute({
      binary_name: 'test.bin',
      query: 'test',
      limit: 100,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Verify estimatedTokens field present and reasonable
      expect(result.data.estimatedTokens).toBeDefined();
      expect(result.data.estimatedTokens).toBeGreaterThan(0);

      // Estimate: 100 strings * ~15 chars * 0.3 tokens/char = ~450 tokens
      // Plus overhead for JSON structure = ~1000_2000 tokens
      expect(result.data.estimatedTokens).toBeGreaterThan(500);
      expect(result.data.estimatedTokens).toBeLessThan(5000);
    }
  });
});

// =============================================================================
// 5. Security Tests (4 tests)
// =============================================================================

describe('search_strings _ Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('5.1: rejects path traversal sequences (../)', async () => {
    const { execute } = await import('./search-strings.js');

    const result = await execute({
      binary_name: '../../../etc/passwd',
      query: 'test',
      limit: 100,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/Path traversal|traversal not allowed/i);
    }
  });

  it('5.2: rejects control characters in binary_name', async () => {
    const { execute } = await import('./search-strings.js');

    const result = await execute({
      binary_name: 'test\x00.bin',
      query: 'test',
      limit: 100,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/Control characters|control.*not allowed/i);
    }
  });

  it('5.3: enforces binary_name length limit (255)', async () => {
    const { execute } = await import('./search-strings.js');

    const longName = 'a'.repeat(256);
    const result = await execute({
      binary_name: longName,
      query: 'test',
      limit: 100,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/Binary name too long|max.*255/i);
    }
  });

  it('5.4: enforces query length limit (500)', async () => {
    const { execute } = await import('./search-strings.js');

    const longQuery = 'a'.repeat(501);
    const result = await execute({
      binary_name: 'test.bin',
      query: longQuery,
      limit: 100,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/Query too long|max.*500/i);
    }
  });
});

// =============================================================================
// 6. Edge Cases & Error Handling (3 tests)
// =============================================================================

describe('search_strings _ Edge Cases & Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('6.1: handles empty results (no matches)', async () => {
    const { execute } = await import('./search-strings.js');
    const mockCallMCPTool = vi.mocked(callMCPTool);

    mockCallMCPTool.mockResolvedValue({
      strings: [],
      total: 0,
    });

    const result = await execute({
      binary_name: 'test.bin',
      query: 'nonexistent_string',
      limit: 100,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.strings).toHaveLength(0);
      expect(result.data.summary).toEqual({
        total: 0,
        returned: 0,
        hasMore: false,
        offset: 0,
        query: 'nonexistent_string',
      });
      expect(result.data.estimatedTokens).toBeGreaterThan(0); // Small value for empty response
    }
  });

  it('6.2: handles offset beyond result set', async () => {
    const { execute } = await import('./search-strings.js');
    const mockCallMCPTool = vi.mocked(callMCPTool);

    // Mock MCP returning empty results for offset beyond total
    mockCallMCPTool.mockResolvedValue({
      strings: [],
      total: 100,
    });

    const result = await execute({
      binary_name: 'test.bin',
      query: 'test',
      limit: 100,
      offset: 500, // Beyond total of 100
    });

    // Should handle gracefully with empty results
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.strings).toHaveLength(0);
      expect(result.data.summary.hasMore).toBe(false);
    }
  });

  it('6.3: propagates binary not found error with suggestions', async () => {
    const { execute } = await import('./search-strings.js');
    const mockCallMCPTool = vi.mocked(callMCPTool);

    const error: any = new Error('Binary not found: firmware.bin. Did you mean: firmware_v1.bin, firmware_v2.bin?');
    error.code = 'BINARY_NOT_FOUND';
    error.suggestions = ['firmware_v1.bin', 'firmware_v2.bin'];

    mockCallMCPTool.mockRejectedValue(error);

    const result = await execute({
      binary_name: 'firmware.bin',
      query: 'test',
      limit: 100,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('BINARY_NOT_FOUND');
      expect(result.error.message).toContain('firmware.bin');
      expect(result.error.message).toMatch(/Did you mean.*firmware_v1\.bin.*firmware_v2\.bin/i);
    }
  });
});
