import { describe, it, expect, vi } from 'vitest';
import { detectSources, confirmSourceUsage } from '../lib/phases/phase1-source-detection.js';

describe('Phase 1 - Source Detection', () => {
  it('should filter functions matching source patterns', async () => {
    // Mock list-exports response
    const mockListExports = vi.fn().mockResolvedValue({
      items: [
        { name: 'recv', address: '0x401000', type: 'function' },
        { name: 'main', address: '0x402000', type: 'function' },
        { name: 'printf', address: '0x403000', type: 'function' }
      ]
    });

    const sources = ['recv', 'main'];
    const result = await detectSources('binary.exe', sources, mockListExports);

    expect(result).toHaveLength(2);
    expect(result[0].function).toBe('recv');
    expect(result[1].function).toBe('main');
  });
});

describe('Phase 1 - Confirm Source Usage', () => {
  it('should decompile sources to confirm usage', async () => {
    const mockDecompile = vi.fn().mockResolvedValue({
      code: 'int recv(int sockfd, void *buf, size_t len, int flags) { ... }',
      summary: { function_name: 'recv' }
    });

    const sources = [
      { function: 'recv', address: '0x401000', paramIndex: 1 }
    ];

    const confirmed = await confirmSourceUsage(sources, 'binary.exe', mockDecompile);
    expect(confirmed).toHaveLength(1);
    expect(mockDecompile).toHaveBeenCalledWith('binary.exe', 'recv');
  });
});
