import { describe, it, expect } from 'vitest';
import { formatRiskBadge, formatTaintPathDescription, generateInteractiveCommands } from '../lib/summary-formatter';

describe('Summary Formatter - Risk Badges', () => {
  it('should format risk level badges', () => {
    expect(formatRiskBadge('critical')).toContain('🔴');
    expect(formatRiskBadge('high')).toContain('🟠');
    expect(formatRiskBadge('medium')).toContain('🟡');
    expect(formatRiskBadge('low')).toContain('🟢');
  });

  it('should include risk level text', () => {
    expect(formatRiskBadge('critical')).toContain('CRITICAL');
    expect(formatRiskBadge('high')).toContain('HIGH');
    expect(formatRiskBadge('medium')).toContain('MEDIUM');
    expect(formatRiskBadge('low')).toContain('LOW');
  });

  it('should handle uppercase risk levels', () => {
    expect(formatRiskBadge('CRITICAL')).toContain('🔴');
    expect(formatRiskBadge('HIGH')).toContain('🟠');
  });

  it('should handle unknown risk level', () => {
    const result = formatRiskBadge('unknown');
    expect(result).toContain('UNKNOWN');
    expect(result).not.toContain('🔴');
  });
});

describe('Summary Formatter - Path Descriptions', () => {
  it('should format taint path description', () => {
    const path = {
      source: 'recv',
      sink: 'strcpy',
      call_chain: ['recv', 'process', 'strcpy'],
      risk_level: 'high'
    };

    const desc = formatTaintPathDescription(path);

    expect(desc).toContain('recv');
    expect(desc).toContain('strcpy');
    expect(desc).toContain('→');
  });

  it('should include risk level badge', () => {
    const path = {
      source: 'input',
      sink: 'memcpy',
      call_chain: ['input', 'memcpy'],
      risk_level: 'critical'
    };

    const desc = formatTaintPathDescription(path);

    expect(desc).toContain('🔴');
    expect(desc).toContain('CRITICAL');
  });

  it('should handle short paths', () => {
    const path = {
      source: 'source',
      sink: 'sink',
      call_chain: ['source', 'sink'],
      risk_level: 'medium'
    };

    const desc = formatTaintPathDescription(path);

    expect(desc).toContain('source');
    expect(desc).toContain('sink');
  });

  it('should handle long paths with ellipsis', () => {
    const path = {
      source: 'recv',
      sink: 'strcpy',
      call_chain: ['recv', 'func1', 'func2', 'func3', 'func4', 'func5', 'strcpy'],
      risk_level: 'high'
    };

    const desc = formatTaintPathDescription(path);

    expect(desc).toContain('recv');
    expect(desc).toContain('strcpy');
    expect(desc).toContain('...');
  });
});

describe('Summary Formatter - Commands List', () => {
  it('should generate interactive commands', () => {
    const commands = generateInteractiveCommands(5);

    expect(commands).toContain('show full chain for path');
    expect(commands).toContain('show decompiled code');
    expect(commands).toContain('paths to');
  });

  it('should reference path count in commands', () => {
    const commands = generateInteractiveCommands(3);

    expect(commands).toContain('3');
  });

  it('should work with zero paths', () => {
    const commands = generateInteractiveCommands(0);

    expect(commands).toBeDefined();
    expect(commands.length).toBeGreaterThan(0);
  });

  it('should include all query types', () => {
    const commands = generateInteractiveCommands(10);

    // Should mention all three query types
    expect(commands.toLowerCase()).toContain('chain');
    expect(commands.toLowerCase()).toContain('code');
    expect(commands.toLowerCase()).toContain('paths');
  });
});
