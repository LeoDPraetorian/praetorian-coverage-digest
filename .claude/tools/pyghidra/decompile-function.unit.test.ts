/**
 * Unit tests for decompile_function wrapper
 *
 * Updated to match actual implementation API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the local client module used by decompile-function
vi.mock('./lib/client.js', () => ({
  callMcpTool: vi.fn(),
}));

describe('decompile-function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('input validation', () => {
    it('rejects empty binary_name', async () => {
      const { decompileFunction } = await import('./decompile-function.js');

      await expect(
        decompileFunction.execute({ binary_name: '', name: 'main' })
      ).rejects.toThrow(/binary.*name.*required/i);
    });

    it('rejects empty name', async () => {
      const { decompileFunction } = await import('./decompile-function.js');

      await expect(
        decompileFunction.execute({ binary_name: 'test.bin', name: '' })
      ).rejects.toThrow(/symbol.*name.*required|name.*required/i);
    });

    it('accepts hex address as name', async () => {
      const { decompileFunction } = await import('./decompile-function.js');
      const { callMcpTool } = await import('./lib/client.js');
      const mockCallMcpTool = vi.mocked(callMcpTool);

      mockCallMcpTool.mockResolvedValue({
        decompiled_code: 'void sub_401000(void) {\n  return;\n}',
      });

      const result = await decompileFunction.execute({
        binary_name: 'test.bin',
        name: '0x401000',
      });

      expect(result).toHaveProperty('code');
    });

    it('accepts function name', async () => {
      const { decompileFunction } = await import('./decompile-function.js');
      const { callMcpTool } = await import('./lib/client.js');
      const mockCallMcpTool = vi.mocked(callMcpTool);

      mockCallMcpTool.mockResolvedValue({
        decompiled_code: 'int main(int argc, char** argv) {\n  return 0;\n}',
      });

      const result = await decompileFunction.execute({
        binary_name: 'test.bin',
        name: 'main',
      });

      expect(result).toHaveProperty('code');
      expect(result.code).toContain('main');
    });
  });

  describe('token optimization', () => {
    it('returns truncated code for large functions', async () => {
      const { decompileFunction } = await import('./decompile-function.js');
      const { callMcpTool } = await import('./lib/client.js');
      const mockCallMcpTool = vi.mocked(callMcpTool);

      const longCode = Array.from({ length: 300 }, (_, i) => `  line ${i};`).join('\n');

      mockCallMcpTool.mockResolvedValue({
        decompiled_code: longCode,
      });

      const result = await decompileFunction.execute({
        binary_name: 'test.bin',
        name: 'large_func',
      });

      expect(result.summary.total_lines).toBe(300);
      expect(result.summary.was_truncated).toBe(true);
      expect(result.summary.returned_lines).toBeLessThan(300);
    });

    it('returns full code for small functions', async () => {
      const { decompileFunction } = await import('./decompile-function.js');
      const { callMcpTool } = await import('./lib/client.js');
      const mockCallMcpTool = vi.mocked(callMcpTool);

      const code = 'int main() {\n  printf("test");\n  return 0;\n}';

      mockCallMcpTool.mockResolvedValue({
        decompiled_code: code,
      });

      const result = await decompileFunction.execute({
        binary_name: 'test.bin',
        name: 'main',
      });

      expect(result.summary.was_truncated).toBe(false);
      expect(result.code).toBe(code);
    });

    it('includes estimatedTokens in response', async () => {
      const { decompileFunction } = await import('./decompile-function.js');
      const { callMcpTool } = await import('./lib/client.js');
      const mockCallMcpTool = vi.mocked(callMcpTool);

      mockCallMcpTool.mockResolvedValue({
        decompiled_code: 'void simple() {\n  return;\n}',
      });

      const result = await decompileFunction.execute({
        binary_name: 'test.bin',
        name: 'simple',
      });

      expect(result).toHaveProperty('estimatedTokens');
      expect(typeof result.estimatedTokens).toBe('number');
    });
  });

  describe('error handling', () => {
    it('handles function not found', async () => {
      const { decompileFunction } = await import('./decompile-function.js');
      const { callMcpTool } = await import('./lib/client.js');
      const mockCallMcpTool = vi.mocked(callMcpTool);

      mockCallMcpTool.mockRejectedValue(new Error('Function not found: missing'));

      await expect(
        decompileFunction.execute({ binary_name: 'test.bin', name: 'missing' })
      ).rejects.toThrow(/function.*not.*found|symbol.*not.*found/i);
    });

    it('handles empty decompilation result', async () => {
      const { decompileFunction } = await import('./decompile-function.js');
      const { callMcpTool } = await import('./lib/client.js');
      const mockCallMcpTool = vi.mocked(callMcpTool);

      mockCallMcpTool.mockResolvedValue({
        decompiled_code: '',
      });

      await expect(
        decompileFunction.execute({ binary_name: 'test.bin', name: 'empty_func' })
      ).rejects.toThrow(/empty.*result/i);
    });
  });
});
