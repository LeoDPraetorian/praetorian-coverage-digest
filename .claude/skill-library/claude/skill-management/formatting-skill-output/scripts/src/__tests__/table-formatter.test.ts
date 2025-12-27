import { describe, it, expect } from 'vitest';
import {
  formatFindingsTable,
  formatCompletionMessage,
  countFindings,
  Finding,
} from '../lib/table-formatter';

describe('table-formatter', () => {
  describe('formatFindingsTable', () => {
    it('returns "No issues found" for empty findings', () => {
      const result = formatFindingsTable([]);
      expect(result).toContain('No issues found');
    });

    it('produces deterministic output for same input', () => {
      const findings: Finding[] = [
        {
          severity: 'WARNING',
          phase: 'Semantic: Gateway Membership',
          issue: 'Frontend skill missing from gateway',
          recommendation: 'Add to gateway-frontend',
        },
        {
          severity: 'CRITICAL',
          phase: 'P1: Description Format',
          issue: 'Description too long',
          recommendation: 'Shorten to under 120 chars',
        },
      ];

      // Run multiple times - output must be identical
      const result1 = formatFindingsTable(findings);
      const result2 = formatFindingsTable(findings);
      const result3 = formatFindingsTable(findings);

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('sorts findings by severity (CRITICAL first)', () => {
      const findings: Finding[] = [
        { severity: 'INFO', phase: 'Phase A', issue: 'Info issue', recommendation: 'Info rec' },
        { severity: 'CRITICAL', phase: 'Phase B', issue: 'Critical issue', recommendation: 'Critical rec' },
        { severity: 'WARNING', phase: 'Phase C', issue: 'Warning issue', recommendation: 'Warning rec' },
      ];

      const result = formatFindingsTable(findings);

      // CRITICAL should appear before WARNING before INFO
      const criticalIndex = result.indexOf('CRITICAL');
      const warningIndex = result.indexOf('WARNING');
      const infoIndex = result.indexOf('INFO');

      expect(criticalIndex).toBeLessThan(warningIndex);
      expect(warningIndex).toBeLessThan(infoIndex);
    });

    it('truncates long strings with ellipsis', () => {
      const findings: Finding[] = [
        {
          severity: 'WARNING',
          phase: 'A very long phase name that exceeds the column width limit',
          issue: 'A very long issue description that should be truncated because it exceeds the maximum allowed width for this column',
          recommendation: 'Truncate it',
        },
      ];

      const result = formatFindingsTable(findings);

      // Should contain ellipsis (…) for truncated content
      expect(result).toContain('…');
    });

    it('includes correct severity symbols', () => {
      const findings: Finding[] = [
        { severity: 'CRITICAL', phase: 'P1', issue: 'Issue', recommendation: 'Rec' },
        { severity: 'WARNING', phase: 'P2', issue: 'Issue', recommendation: 'Rec' },
        { severity: 'INFO', phase: 'P3', issue: 'Issue', recommendation: 'Rec' },
      ];

      const result = formatFindingsTable(findings);

      expect(result).toContain('●'); // CRITICAL symbol
      expect(result).toContain('▲'); // WARNING symbol
      expect(result).toContain('○'); // INFO symbol
    });

    it('includes table borders', () => {
      const findings: Finding[] = [
        { severity: 'WARNING', phase: 'Test', issue: 'Issue', recommendation: 'Rec' },
      ];

      const result = formatFindingsTable(findings);

      // Check for box-drawing characters
      expect(result).toContain('╔');
      expect(result).toContain('╗');
      expect(result).toContain('╚');
      expect(result).toContain('╝');
      expect(result).toContain('║');
      expect(result).toContain('═');
    });
  });

  describe('countFindings', () => {
    it('counts findings by severity and source', () => {
      const findings: Finding[] = [
        { severity: 'CRITICAL', phase: 'P1', issue: 'Issue', recommendation: 'Rec', source: 'structural' },
        { severity: 'WARNING', phase: 'P2', issue: 'Issue', recommendation: 'Rec', source: 'structural' },
        { severity: 'WARNING', phase: 'S1', issue: 'Issue', recommendation: 'Rec', source: 'semantic' },
        { severity: 'INFO', phase: 'S2', issue: 'Issue', recommendation: 'Rec', source: 'semantic' },
      ];

      const counts = countFindings(findings);

      expect(counts.structural.critical).toBe(1);
      expect(counts.structural.warning).toBe(1);
      expect(counts.structural.info).toBe(0);
      expect(counts.semantic.critical).toBe(0);
      expect(counts.semantic.warning).toBe(1);
      expect(counts.semantic.info).toBe(1);
    });

    it('treats undefined source as structural', () => {
      const findings: Finding[] = [
        { severity: 'WARNING', phase: 'Test', issue: 'Issue', recommendation: 'Rec' },
      ];

      const counts = countFindings(findings);

      expect(counts.structural.warning).toBe(1);
      expect(counts.semantic.warning).toBe(0);
    });
  });

  describe('formatCompletionMessage', () => {
    it('shows PASSED for zero critical issues', () => {
      const counts = {
        structural: { critical: 0, warning: 2, info: 1 },
        semantic: { critical: 0, warning: 1, info: 0 },
      };

      const result = formatCompletionMessage(counts);

      expect(result).toContain('PASSED');
    });

    it('shows FAILED for critical issues', () => {
      const counts = {
        structural: { critical: 1, warning: 0, info: 0 },
        semantic: { critical: 0, warning: 0, info: 0 },
      };

      const result = formatCompletionMessage(counts);

      expect(result).toContain('FAILED');
    });

    it('produces deterministic output', () => {
      const counts = {
        structural: { critical: 0, warning: 2, info: 1 },
        semantic: { critical: 0, warning: 1, info: 0 },
      };

      const result1 = formatCompletionMessage(counts);
      const result2 = formatCompletionMessage(counts);

      expect(result1).toBe(result2);
    });
  });
});
