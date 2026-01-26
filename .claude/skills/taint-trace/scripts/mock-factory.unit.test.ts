import { describe, it, expect } from 'vitest';
import { createMockPyghidraClient, createBufferOverflowScenario, MockScenario } from '../lib/mocks/mock-factory.js';

describe('Mock Factory - Integration Test Setup', () => {
  it('should create mock client with default scenario', async () => {
    const client = createMockPyghidraClient();

    const exports = await client.listExports('test.exe');
    expect(exports.items).toBeDefined();
    expect(exports.items.length).toBeGreaterThan(0);
  });

  it('should create mock client with custom scenario', async () => {
    const scenario: MockScenario = {
      functions: [
        { name: 'customFunc', address: '0x500000', type: 'function' }
      ],
      decompileResults: {
        'customFunc': 'void customFunc() { return; }'
      },
      xrefs: {
        'customFunc': []
      }
    };

    const client = createMockPyghidraClient(scenario);
    const exports = await client.listExports('test.exe');

    expect(exports.items).toHaveLength(1);
    expect(exports.items[0].name).toBe('customFunc');
  });

  it('should return mock decompile results', async () => {
    const client = createMockPyghidraClient();

    const result = await client.decompileFunction('test.exe', 'main');
    expect(result.code).toBeDefined();
    expect(result.summary.function_name).toBe('main');
  });

  it('should return mock cross-references', async () => {
    const client = createMockPyghidraClient();

    const result = await client.listCrossReferences('test.exe', 'recv');
    expect(result.items).toBeDefined();
  });
});

describe('Mock Factory - Pre-built Scenarios', () => {
  it('should create buffer overflow scenario', () => {
    const scenario = createBufferOverflowScenario();

    expect(scenario.functions).toHaveLength(3);
    expect(scenario.functions?.map(f => f.name)).toContain('recv');
    expect(scenario.functions?.map(f => f.name)).toContain('strcpy');
  });

  it('should use buffer overflow scenario in client', async () => {
    const scenario = createBufferOverflowScenario();
    const client = createMockPyghidraClient(scenario);

    const exports = await client.listExports('test.exe');
    expect(exports.items).toHaveLength(3);

    const decompiled = await client.decompileFunction('test.exe', 'main');
    expect(decompiled.code).toContain('recv');
  });
});
