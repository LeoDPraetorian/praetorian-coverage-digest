import { describe, it, expect } from 'vitest';
import { formatSummary, generatePathDescription } from '../lib/phases/phase5-output-generation';

describe('Phase 5 - Output Generation', () => {
  describe('formatSummary', () => {
    it('should format summary with correct counts', () => {
      const paths = [
        { risk_level: 'critical' as const },
        { risk_level: 'high' as const },
        { risk_level: 'high' as const }
      ];

      const summary = formatSummary(5, 12, paths, 127, 45);

      expect(summary.total_sources).toBe(5);
      expect(summary.total_sinks).toBe(12);
      expect(summary.vulnerabilities.critical).toBe(1);
      expect(summary.vulnerabilities.high).toBe(2);
      expect(summary.total_functions).toBe(127);
      expect(summary.analysis_time_ms).toBe(45);
    });

    it('should count all risk levels correctly', () => {
      const paths = [
        { risk_level: 'critical' as const },
        { risk_level: 'critical' as const },
        { risk_level: 'high' as const },
        { risk_level: 'medium' as const },
        { risk_level: 'low' as const }
      ];

      const summary = formatSummary(3, 5, paths, 100, 30);

      expect(summary.vulnerabilities.critical).toBe(2);
      expect(summary.vulnerabilities.high).toBe(1);
      expect(summary.vulnerabilities.medium).toBe(1);
      expect(summary.vulnerabilities.low).toBe(1);
    });

    it('should handle empty paths', () => {
      const summary = formatSummary(0, 0, [], 50, 10);

      expect(summary.total_sources).toBe(0);
      expect(summary.vulnerabilities.critical).toBe(0);
      expect(summary.vulnerabilities.high).toBe(0);
    });
  });

  describe('generatePathDescription', () => {
    it('should generate detailed path chain', () => {
      const path = {
        source: 'recv',
        sink: 'strcpy',
        call_chain: ['recv', 'process', 'strcpy'],
        risk_level: 'critical' as const
      };

      const description = generatePathDescription(path);

      expect(description).toContain('recv');
      expect(description).toContain('strcpy');
      expect(description).toMatch(/network|input/i);
    });

    it('should identify network sources', () => {
      const path = {
        source: 'recvfrom',
        sink: 'system',
        call_chain: ['recvfrom', 'system'],
        risk_level: 'critical' as const
      };

      const description = generatePathDescription(path);

      expect(description).toMatch(/network/i);
    });

    it('should identify command execution sinks', () => {
      const path = {
        source: 'getenv',
        sink: 'system',
        call_chain: ['getenv', 'system'],
        risk_level: 'high' as const
      };

      const description = generatePathDescription(path);

      expect(description).toMatch(/command|execution|system/i);
    });

    it('should show call chain length', () => {
      const path = {
        source: 'recv',
        sink: 'strcpy',
        call_chain: ['recv', 'a', 'b', 'c', 'strcpy'],
        risk_level: 'medium' as const
      };

      const description = generatePathDescription(path);

      expect(description).toContain('5');
    });
  });
});
