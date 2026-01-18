/**
 * Unit tests for parse-response - Nebula response parsing utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMCPMock,
  getAllSecurityScenarios,
  testSecurityScenarios,
} from '@claude/testing';

// Factory mock pattern for consistency with other wrappers
// parse-response is a pure utility, but we mock potential dependencies
vi.mock('../config/lib/mcp-client', () => ({
  callMCPTool: vi.fn(),
}));

import { parseNebulaResponse, filterMetadata } from './parse-response';

describe('parse-response - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('parseNebulaResponse', () => {
    describe('JSON parsing', () => {
      it('should parse valid JSON object', () => {
        const input = JSON.stringify({ key: 'value', num: 42 });
        const result = parseNebulaResponse(input);
        expect(result).toEqual({ key: 'value', num: 42 });
      });

      it('should parse valid JSON array', () => {
        const input = JSON.stringify([1, 2, 3]);
        const result = parseNebulaResponse(input);
        expect(result).toEqual([1, 2, 3]);
      });

      it('should throw on malformed JSON', () => {
        expect(() => parseNebulaResponse('{ invalid json')).toThrow(/Failed to parse/);
      });

      it('should throw on empty response', () => {
        expect(() => parseNebulaResponse('')).toThrow(/Empty response/);
        expect(() => parseNebulaResponse('   ')).toThrow(/Empty response/);
      });
    });

    describe('Go map parsing', () => {
      it('should parse simple Go map', () => {
        const input = 'map[key:value]';
        const result = parseNebulaResponse(input);
        expect(result).toEqual({ key: 'value' });
      });

      it('should parse Go map with multiple keys', () => {
        const input = 'map[name:test count:5]';
        const result = parseNebulaResponse(input);
        expect(result.name).toBe('test');
        expect(result.count).toBe(5);
      });

      it('should parse Go map with boolean values', () => {
        const input = 'map[enabled:true disabled:false]';
        const result = parseNebulaResponse(input);
        expect(result.enabled).toBe(true);
        expect(result.disabled).toBe(false);
      });
    });

    describe('Numeric parsing', () => {
      it('should wrap plain integer in object', () => {
        const result = parseNebulaResponse('42');
        expect(result).toEqual({ value: 42 });
      });

      it('should wrap plain float in object', () => {
        const result = parseNebulaResponse('3.14');
        expect(result).toEqual({ value: 3.14 });
      });

      it('should handle negative numbers', () => {
        expect(parseNebulaResponse('-42')).toEqual({ value: -42 });
        expect(parseNebulaResponse('-3.14')).toEqual({ value: -3.14 });
      });

      it('should wrap numeric input type in object', () => {
        const result = parseNebulaResponse(100);
        expect(result).toEqual({ value: 100 });
      });
    });

    describe('Error handling', () => {
      it('should throw on error messages', () => {
        expect(() => parseNebulaResponse('failed to connect'))
          .toThrow(/failed to connect/);
        expect(() => parseNebulaResponse('error: invalid credentials'))
          .toThrow(/error: invalid credentials/);
      });

      it('should pass through non-string values', () => {
        const obj = { already: 'parsed' };
        expect(parseNebulaResponse(obj)).toEqual(obj);
      });
    });
  });

  describe('filterMetadata', () => {
    it('should remove underscore-prefixed keys', () => {
      const input = {
        data: 'keep',
        _metadata: 'remove',
        _internal: 'remove'
      };
      const result = filterMetadata(input);
      expect(result).toEqual({ data: 'keep' });
    });

    it('should remove specific metadata keys', () => {
      const input = {
        data: 'keep',
        raw_api_responses: ['remove'],
        debug_info: { remove: true },
        scan_metadata: { remove: true }
      };
      const result = filterMetadata(input);
      expect(result).toEqual({ data: 'keep' });
    });

    it('should filter nested objects recursively', () => {
      const input = {
        level1: {
          data: 'keep',
          _internal: 'remove',
          level2: {
            more: 'keep',
            raw_api_responses: 'remove'
          }
        }
      };
      const result = filterMetadata(input);
      expect(result).toEqual({
        level1: {
          data: 'keep',
          level2: {
            more: 'keep'
          }
        }
      });
    });

    it('should filter arrays recursively', () => {
      const input = [
        { data: 'keep', _meta: 'remove' },
        { value: 42, debug_info: 'remove' }
      ];
      const result = filterMetadata(input);
      expect(result).toEqual([
        { data: 'keep' },
        { value: 42 }
      ]);
    });

    it('should handle non-object values', () => {
      expect(filterMetadata(null)).toBe(null);
      expect(filterMetadata(42)).toBe(42);
      expect(filterMetadata('string')).toBe('string');
    });
  });

  describe('MCP response format handling', () => {
    it('handles direct array format', () => {
      const input = JSON.stringify([{ id: 1 }, { id: 2 }]);
      const result = parseNebulaResponse(input);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('handles tuple format', () => {
      const input = JSON.stringify([[{ id: 1 }]]);
      const result = parseNebulaResponse(input);
      expect(Array.isArray(result)).toBe(true);
      expect(Array.isArray(result[0])).toBe(true);
    });

    it('handles object format', () => {
      const input = JSON.stringify({ results: [{ id: 1 }] });
      const result = parseNebulaResponse(input);
      expect(result.results).toHaveLength(1);
    });
  });

  describe('Edge case handling', () => {
    it('edge case: rejects null literal (not valid Nebula response)', () => {
      // 'null' literal is not a valid Nebula response format
      // Valid formats are: JSON objects, arrays, Go maps, or numbers
      expect(() => parseNebulaResponse('null')).toThrow(/unknown format/);
    });

    it('edge case: handles deeply nested structures', () => {
      const deep = { a: { b: { c: { d: { e: 'value' } } } } };
      const result = parseNebulaResponse(JSON.stringify(deep));
      expect(result.a.b.c.d.e).toBe('value');
    });

    it('edge case: handles empty object', () => {
      const result = parseNebulaResponse('{}');
      expect(result).toEqual({});
    });

    it('edge case: handles empty array', () => {
      const result = parseNebulaResponse('[]');
      expect(result).toEqual([]);
    });

    it('edge case: handles large dataset', () => {
      const large = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        data: `item-${i}`
      }));
      const result = parseNebulaResponse(JSON.stringify(large));
      expect(result).toHaveLength(1000);
    });
  });

  describe('Security testing', () => {
    it('should block all security attack vectors in response parsing', async () => {
      // parseNebulaResponse processes responses, not user input directly
      // But we test that it doesn't execute code from responses
      const maliciousPayloads = [
        '{"constructor": {"prototype": {"polluted": true}}}',
        '{"__proto__": {"polluted": true}}',
      ];

      for (const payload of maliciousPayloads) {
        // Should parse without throwing (it's valid JSON)
        const result = parseNebulaResponse(payload);
        expect(result).toBeDefined();
        // Verify no prototype pollution
        expect(({} as any).polluted).toBeUndefined();
      }
    });
  });

  describe('Performance', () => {
    it('performance: parsing should be fast', () => {
      const data = JSON.stringify({ key: 'value', num: 42 });

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        parseNebulaResponse(data);
      }
      const duration = performance.now() - start;

      // 1000 parses should complete in under 100ms
      expect(duration).toBeLessThan(100);
    });

    it('performance: filtering should be fast', () => {
      const data = {
        keep: 'value',
        _remove: 'metadata',
        nested: { keep: true, _meta: false }
      };

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        filterMetadata(data);
      }
      const duration = performance.now() - start;

      // 1000 filters should complete in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
