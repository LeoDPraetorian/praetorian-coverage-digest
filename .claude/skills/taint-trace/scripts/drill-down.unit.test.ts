import { describe, it, expect, vi } from 'vitest';
import { parseFollowUpQuery, expandPathWithTransformations, showFunctionCode, requeryWithSinks } from '../lib/drill-down';
import { TaintGraph } from '../lib/taint-graph';

describe('Drill-Down - Parse Follow-Up Query', () => {
  it('should parse "show full chain" query', () => {
    const query = parseFollowUpQuery('Show full chain for path 1');

    expect(query.type).toBe('show_chain');
    expect(query.pathIndex).toBe(1);
  });

  it('should parse "show code" query', () => {
    const query = parseFollowUpQuery('Show decompiled code at main');

    expect(query.type).toBe('show_code');
    expect(query.functionName).toBe('main');
  });

  it('should parse "paths to X" query', () => {
    const query = parseFollowUpQuery('Are there paths to EVP_EncryptInit?');

    expect(query.type).toBe('requery_sinks');
    expect(query.sinkPattern).toBe('EVP_EncryptInit');
  });

  it('should parse case-insensitive queries', () => {
    const query = parseFollowUpQuery('SHOW FULL CHAIN FOR PATH 2');

    expect(query.type).toBe('show_chain');
    expect(query.pathIndex).toBe(2);
  });

  it('should handle queries with extra whitespace', () => {
    const query = parseFollowUpQuery('  Show   code   at   processPacket  ');

    expect(query.type).toBe('show_code');
    expect(query.functionName).toBe('processPacket');
  });

  it('should return unknown type for unrecognized queries', () => {
    const query = parseFollowUpQuery('What is the meaning of life?');

    expect(query.type).toBe('unknown');
  });

  it('should extract path index from various formats', () => {
    const queries = [
      'Show full chain for path 1',
      'full chain path 3',
      'expand path 5'
    ];

    expect(parseFollowUpQuery(queries[0]).pathIndex).toBe(1);
    expect(parseFollowUpQuery(queries[1]).pathIndex).toBe(3);
    expect(parseFollowUpQuery(queries[2]).pathIndex).toBe(5);
  });

  it('should extract function name after "at" or "for"', () => {
    const queries = [
      'Show code at recv',
      'Show code for processData',
      'decompile at handleInput'
    ];

    expect(parseFollowUpQuery(queries[0]).functionName).toBe('recv');
    expect(parseFollowUpQuery(queries[1]).functionName).toBe('processData');
    expect(parseFollowUpQuery(queries[2]).functionName).toBe('handleInput');
  });

  it('should extract sink pattern from "paths to" queries', () => {
    const queries = [
      'Are there paths to strcpy?',
      'paths to OpenSSL functions',
      'show paths to memcpy'
    ];

    expect(parseFollowUpQuery(queries[0]).sinkPattern).toBe('strcpy');
    expect(parseFollowUpQuery(queries[1]).sinkPattern).toBe('OpenSSL functions');
    expect(parseFollowUpQuery(queries[2]).sinkPattern).toBe('memcpy');
  });
});

describe('Drill-Down - Expand Path', () => {
  it('should expand path with transformations', () => {
    const path = {
      call_chain: ['recv', 'process', 'strcpy'],
      transformations: ['assignment', 'pointer_arithmetic']
    };

    const expanded = expandPathWithTransformations(path);

    expect(expanded).toContain('recv');
    expect(expanded).toContain('assignment');
    expect(expanded).toContain('pointer_arithmetic');
    expect(expanded).toContain('strcpy');
  });

  it('should handle path without transformations', () => {
    const path = {
      call_chain: ['main', 'handleRequest', 'memcpy'],
      transformations: []
    };

    const expanded = expandPathWithTransformations(path);

    expect(expanded).toContain('main');
    expect(expanded).toContain('handleRequest');
    expect(expanded).toContain('memcpy');
    expect(expanded).toBe('main → handleRequest → memcpy');
  });

  it('should include transformation arrows between functions', () => {
    const path = {
      call_chain: ['source', 'intermediate', 'sink'],
      transformations: ['cast', 'dereference']
    };

    const expanded = expandPathWithTransformations(path);

    // Should have function → transformation → function pattern
    expect(expanded).toMatch(/source.*→/);
    expect(expanded).toContain('cast');
    expect(expanded).toContain('dereference');
  });

  it('should handle single function in chain', () => {
    const path = {
      call_chain: ['dangerousFunc'],
      transformations: []
    };

    const expanded = expandPathWithTransformations(path);

    expect(expanded).toContain('dangerousFunc');
  });
});

describe('Drill-Down - Show Code', () => {
  it('should call decompile for code view', async () => {
    const mockDecompile = vi.fn().mockResolvedValue({
      code: 'void processPacket() { ... }',
      summary: { function_name: 'processPacket' }
    });

    const code = await showFunctionCode('binary.exe', 'processPacket', mockDecompile);

    expect(code).toContain('processPacket');
    expect(mockDecompile).toHaveBeenCalledWith('binary.exe', 'processPacket');
  });

  it('should return error message if decompile fails', async () => {
    const mockDecompile = vi.fn().mockRejectedValue(new Error('Decompilation failed'));

    const code = await showFunctionCode('binary.exe', 'badFunction', mockDecompile);

    expect(code).toContain('Error');
    expect(code).toContain('badFunction');
  });

  it('should handle empty code result', async () => {
    const mockDecompile = vi.fn().mockResolvedValue({
      code: '',
      summary: {}
    });

    const code = await showFunctionCode('binary.exe', 'emptyFunc', mockDecompile);

    expect(code).toContain('No code');
  });
});

describe('Drill-Down - Re-Query Sinks', () => {
  it('should re-query graph with custom sinks', () => {
    const graph = new TaintGraph();
    graph.addNode({ id: 'recv', type: 'function', function: 'recv', isTainted: true });
    graph.addNode({ id: 'EVP_EncryptInit', type: 'function', function: 'EVP_EncryptInit', isTainted: true });
    graph.addNode({ id: 'safe_func', type: 'function', function: 'safe_func', isTainted: false });

    const newSinks = ['EVP_EncryptInit'];
    const matches = requeryWithSinks(graph, newSinks);

    expect(matches).toHaveLength(1);
    expect(matches[0].sink).toBe('EVP_EncryptInit');
  });

  it('should return empty array when no matches', () => {
    const graph = new TaintGraph();
    graph.addNode({ id: 'recv', type: 'function', function: 'recv', isTainted: true });

    const newSinks = ['strcpy', 'memcpy'];
    const matches = requeryWithSinks(graph, newSinks);

    expect(matches).toHaveLength(0);
  });

  it('should handle multiple sink matches', () => {
    const graph = new TaintGraph();
    graph.addNode({ id: 'recv', type: 'function', function: 'recv', isTainted: true });
    graph.addNode({ id: 'strcpy', type: 'function', function: 'strcpy', isTainted: true });
    graph.addNode({ id: 'memcpy', type: 'function', function: 'memcpy', isTainted: true });

    const newSinks = ['strcpy', 'memcpy'];
    const matches = requeryWithSinks(graph, newSinks);

    expect(matches).toHaveLength(2);
    expect(matches.map(m => m.sink)).toContain('strcpy');
    expect(matches.map(m => m.sink)).toContain('memcpy');
  });
});
