import { describe, it, expect, vi } from 'vitest';
import { parseFollowUpQuery, expandPathWithTransformations, showFunctionCode, requeryWithSinks } from '../lib/drill-down';
import { TaintGraph } from '../lib/taint-graph';

describe('Integration - Drill-Down Full Chain', () => {
  it('should expand full chain with transformations', () => {
    const query = parseFollowUpQuery('Show full chain for path 1');
    expect(query.type).toBe('show_chain');

    const path = { call_chain: ['recv', 'strcpy'], transformations: ['assignment'] };
    const expanded = expandPathWithTransformations(path);

    expect(expanded).toBeDefined();
    expect(expanded).toContain('recv');
    expect(expanded).toContain('assignment');
    expect(expanded).toContain('strcpy');
  });

  it('should handle complex transformation chains', () => {
    const query = parseFollowUpQuery('expand path 2');
    expect(query.type).toBe('show_chain');
    expect(query.pathIndex).toBe(2);

    const path = {
      call_chain: ['source', 'intermediate1', 'intermediate2', 'sink'],
      transformations: ['cast', 'pointer_arithmetic', 'dereference']
    };

    const expanded = expandPathWithTransformations(path);

    expect(expanded).toContain('[cast]');
    expect(expanded).toContain('[pointer_arithmetic]');
    expect(expanded).toContain('[dereference]');
  });
});

describe('Integration - Drill-Down Code View', () => {
  it('should show decompiled code', async () => {
    const query = parseFollowUpQuery('Show decompiled code at main');
    expect(query.type).toBe('show_code');
    expect(query.functionName).toBe('main');

    const mockDecompile = vi.fn().mockResolvedValue({ code: 'int main() {}' });

    const code = await showFunctionCode('test.exe', query.functionName!, mockDecompile);

    expect(code).toContain('main');
    expect(mockDecompile).toHaveBeenCalledWith('test.exe', 'main');
  });

  it('should handle code view for different functions', async () => {
    const queries = [
      'Show code at recv',
      'decompile at processPacket',
      'Show code for handleInput'
    ];

    const mockDecompile = vi.fn()
      .mockResolvedValueOnce({ code: 'void recv() {}' })
      .mockResolvedValueOnce({ code: 'void processPacket() {}' })
      .mockResolvedValueOnce({ code: 'void handleInput() {}' });

    for (const queryStr of queries) {
      const query = parseFollowUpQuery(queryStr);
      expect(query.type).toBe('show_code');

      const code = await showFunctionCode('binary.exe', query.functionName!, mockDecompile);
      expect(code).toBeDefined();
    }

    expect(mockDecompile).toHaveBeenCalledTimes(3);
  });
});

describe('Integration - Re-Query Custom Sinks', () => {
  it('should re-query with custom sinks', () => {
    const query = parseFollowUpQuery('Are there paths to OpenSSL functions?');
    expect(query.type).toBe('requery_sinks');
    expect(query.sinkPattern).toBe('OpenSSL functions');

    const graph = new TaintGraph();
    graph.addNode({ id: 'recv', type: 'function', function: 'recv', isTainted: true });
    graph.addNode({ id: 'EVP_EncryptInit', type: 'function', function: 'EVP_EncryptInit', isTainted: true });
    graph.addNode({ id: 'EVP_DecryptInit', type: 'function', function: 'EVP_DecryptInit', isTainted: true });

    const matches = requeryWithSinks(graph, ['EVP_EncryptInit']);

    expect(Array.isArray(matches)).toBe(true);
    expect(matches).toHaveLength(1);
    expect(matches[0].sink).toBe('EVP_EncryptInit');
  });

  it('should handle multiple custom sinks', () => {
    const query = parseFollowUpQuery('paths to strcpy');
    expect(query.type).toBe('requery_sinks');

    const graph = new TaintGraph();
    graph.addNode({ id: 'input', type: 'function', function: 'input', isTainted: true });
    graph.addNode({ id: 'strcpy', type: 'function', function: 'strcpy', isTainted: true });
    graph.addNode({ id: 'memcpy', type: 'function', function: 'memcpy', isTainted: true });
    graph.addNode({ id: 'sprintf', type: 'function', function: 'sprintf', isTainted: true });

    const dangerousSinks = ['strcpy', 'memcpy', 'sprintf'];
    const matches = requeryWithSinks(graph, dangerousSinks);

    expect(matches).toHaveLength(3);
    expect(matches.map(m => m.sink)).toEqual(expect.arrayContaining(['strcpy', 'memcpy', 'sprintf']));
  });

  it('should integrate query parsing with graph re-analysis', () => {
    // User asks follow-up question
    const userQuery = 'Are there paths to crypto functions?';
    const query = parseFollowUpQuery(userQuery);

    expect(query.type).toBe('requery_sinks');

    // Build graph with various functions
    const graph = new TaintGraph();
    const functions = [
      { id: 'recv', func: 'recv', tainted: true },
      { id: 'process', func: 'process', tainted: true },
      { id: 'EVP_EncryptInit', func: 'EVP_EncryptInit', tainted: true },
      { id: 'EVP_DecryptInit', func: 'EVP_DecryptInit', tainted: true },
      { id: 'safe_output', func: 'safe_output', tainted: false }
    ];

    functions.forEach(f => {
      graph.addNode({ id: f.id, type: 'function', function: f.func, isTainted: f.tainted });
    });

    // Re-query with crypto-related sinks
    const cryptoSinks = ['EVP_EncryptInit', 'EVP_DecryptInit', 'EVP_CipherInit'];
    const matches = requeryWithSinks(graph, cryptoSinks);

    // Should find the crypto functions that are tainted
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.map(m => m.sink)).toContain('EVP_EncryptInit');
    expect(matches.map(m => m.sink)).toContain('EVP_DecryptInit');
  });
});
