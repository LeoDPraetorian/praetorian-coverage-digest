/**
 * Unit tests for decompile_function wrapper
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execute } from './decompile_function.js';

vi.mock('../config/lib/mcp-client.js', () => ({
  callMCPTool: vi.fn(),
}));

import { callMCPTool } from '../config/lib/mcp-client.js';
const mockCallMCPTool = vi.mocked(callMCPTool);

describe('decompile-function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('rejects empty binary_name', async () => {
      const result = await execute({ binary_name: '', name_or_address: 'main' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/binary_name/i);
      }
    });

    it('rejects empty name_or_address', async () => {
      const result = await execute({ binary_name: 'test.bin', name_or_address: '' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toMatch(/address or name/i);
      }
    });

    it('accepts hex address', async () => {
      mockCallMCPTool.mockResolvedValue({
        name: 'sub_401000',
        signature: 'void sub_401000(void)',
        code: 'void sub_401000(void) {\n  return;\n}',
      });

      const result = await execute({ binary_name: 'test.bin', name_or_address: '0x401000' });

      expect(result.ok).toBe(true);
    });

    it('accepts function name', async () => {
      mockCallMCPTool.mockResolvedValue({
        name: 'main',
        signature: 'int main(int argc, char** argv)',
        code: 'int main(int argc, char** argv) {\n  return 0;\n}',
      });

      const result = await execute({ binary_name: 'test.bin', name_or_address: 'main' });

      expect(result.ok).toBe(true);
    });
  });

  describe('token optimization', () => {
    it('returns truncated code by default', async () => {
      const longCode = Array.from({ length: 200 }, (_, i) => `  line ${i};`).join('\n');

      mockCallMCPTool.mockResolvedValue({
        name: 'large_func',
        signature: 'void large_func(void)',
        code: longCode,
      });

      const result = await execute({
        binary_name: 'test.bin',
        name_or_address: 'large_func',
        max_code_lines: 50,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.total_lines).toBe(200);
        expect(result.data.included_lines).toBe(50);
        expect(result.data.code).toContain('[truncated]');
        expect(result.data.complexity).toBe('complex');
      }
    });

    it('returns full code when include_full_code is true', async () => {
      const code = 'int main() {\n  printf("test");\n  return 0;\n}';

      mockCallMCPTool.mockResolvedValue({
        name: 'main',
        signature: 'int main()',
        code,
      });

      const result = await execute({
        binary_name: 'test.bin',
        name_or_address: 'main',
        include_full_code: true,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.code).toBe(code);
        expect(result.data.included_lines).toBe(result.data.total_lines);
      }
    });

    it('calculates complexity correctly', async () => {
      mockCallMCPTool.mockResolvedValue({
        name: 'simple',
        signature: 'void simple()',
        code: 'void simple() {\n  return;\n}',
      });

      const result = await execute({ binary_name: 'test.bin', name_or_address: 'simple' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.complexity).toBe('simple');
      }
    });
  });

  describe('error handling', () => {
    it('handles function not found', async () => {
      mockCallMCPTool.mockRejectedValue(new Error('Function not found'));

      const result = await execute({ binary_name: 'test.bin', name_or_address: 'missing' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('handles timeout', async () => {
      mockCallMCPTool.mockRejectedValue(new Error('timeout'));

      const result = await execute({ binary_name: 'test.bin', name_or_address: 'large' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('TIMEOUT');
      }
    });
  });
});
