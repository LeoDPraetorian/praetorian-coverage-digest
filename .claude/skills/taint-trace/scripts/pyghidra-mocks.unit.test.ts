import { describe, it, expect } from 'vitest';
import { mockListExports, mockDecompileFunction, mockListCrossReferences } from '../lib/mocks/pyghidra-mocks.js';

describe('Mock PyGhidra - list-exports', () => {
  it('should return mock function list', async () => {
    const result = await mockListExports('test.exe');
    expect(result.items).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.summary).toBeDefined();
  });

  it('should include common source functions', async () => {
    const result = await mockListExports('test.exe');
    const names = result.items.map(i => i.name);
    expect(names).toContain('recv');
    expect(names).toContain('main');
  });
});

describe('Mock PyGhidra - decompile-function', () => {
  it('should return mock decompiled code', async () => {
    const result = await mockDecompileFunction('test.exe', 'main');
    expect(result.code).toBeDefined();
    expect(result.code.length).toBeGreaterThan(0);
    expect(result.summary.function_name).toBe('main');
  });
});

describe('Mock PyGhidra - list-cross-references', () => {
  it('should return mock xrefs', async () => {
    const result = await mockListCrossReferences('test.exe', 'recv');
    expect(result.items).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);
  });
});
