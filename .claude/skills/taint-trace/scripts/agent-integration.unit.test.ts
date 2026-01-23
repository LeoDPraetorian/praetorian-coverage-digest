import { describe, it, expect } from 'vitest';
import { buildAgentPrompt, parseAgentOutput } from '../lib/agent-integration.js';
import fs from 'fs';

describe('Agent Integration - Build Prompt', () => {
  it('should substitute variables in template', () => {
    const params = {
      binary_path: '/bin/server.exe',
      sources: ['recv', 'fread'],
      sinks: ['strcpy', 'system'],
      cache_file: '.cache/analysis.json'
    };

    const prompt = buildAgentPrompt(params);

    expect(prompt).toContain('/bin/server.exe');
    expect(prompt).toContain('recv');
    expect(prompt).toContain('strcpy');
    expect(prompt).toContain('.cache/analysis.json');
  });

  it('should load template from orchestrator-prompt.md', () => {
    const params = {
      binary_path: '/test.exe',
      sources: ['main'],
      sinks: ['default'],
      cache_file: '.cache/test.json'
    };

    const prompt = buildAgentPrompt(params);

    // Should contain template structure
    expect(prompt).toContain('Taint Analysis Orchestrator Agent');
    expect(prompt).toContain('Phase 1');
    expect(prompt).toContain('Phase 2');
  });
});

describe('Agent Integration - Parse Output', () => {
  it('should parse valid JSON output', () => {
    const agentOutput = JSON.stringify({
      sources: [{ function: 'recv', param_index: 1, type: 'network' }],
      paths: [{ source: 'recv', sink: 'strcpy', risk_level: 'high' }],
      summary: { total_sources: 1, vulnerabilities: { high: 1 } }
    });

    const parsed = parseAgentOutput(agentOutput);

    expect(parsed.sources).toHaveLength(1);
    expect(parsed.paths).toHaveLength(1);
    expect(parsed.summary.total_sources).toBe(1);
  });

  it('should handle parsing errors', () => {
    const invalidOutput = 'Not JSON';

    expect(() => parseAgentOutput(invalidOutput)).toThrow('Failed to parse');
  });

  it('should validate required fields', () => {
    const incompleteOutput = JSON.stringify({
      sources: [],
      // Missing paths and summary
    });

    expect(() => parseAgentOutput(incompleteOutput)).toThrow('Missing required');
  });
});
