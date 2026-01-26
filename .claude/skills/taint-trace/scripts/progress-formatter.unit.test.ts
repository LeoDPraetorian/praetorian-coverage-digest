import { describe, it, expect } from 'vitest';
import { formatPhaseStatus, formatCounter } from '../lib/progress-formatter.js';

describe('Progress Formatter - Phase Status', () => {
  it('should format phase header with number', () => {
    const result = formatPhaseStatus(1, 5, 'Finding input sources');
    expect(result).toContain('[Phase 1/5]');
    expect(result).toContain('Finding input sources');
  });

  it('should format phase with checkmarks for completed items', () => {
    const result = formatPhaseStatus(1, 5, 'Finding input sources', [
      '✓ Listed 203 functions',
      '✓ Filtered to 8 network I/O candidates'
    ]);
    expect(result).toContain('✓ Listed 203 functions');
    expect(result).toContain('✓ Filtered to 8 network I/O candidates');
  });

  it('should format phase with in-progress items', () => {
    const result = formatPhaseStatus(2, 5, 'Tracing data flow', [
      '→ Analyzed 45/203 functions',
      '→ Traced 340 cross-references'
    ]);
    expect(result).toContain('→ Analyzed 45/203 functions');
  });
});

describe('Progress Formatter - Detailed Counters', () => {
  it('should format function analysis counter', () => {
    const result = formatCounter('functions_analyzed', 45, 203);
    expect(result).toBe('→ Analyzed 45/203 functions');
  });

  it('should format xref traced counter', () => {
    const result = formatCounter('xrefs_traced', 340);
    expect(result).toBe('→ Traced 340 cross-references');
  });

  it('should format call depth counter', () => {
    const result = formatCounter('call_depth', 5);
    expect(result).toBe('→ Current depth: 5 call levels');
  });

  it('should format completed item', () => {
    const result = formatCounter('functions_listed', 203, null, true);
    expect(result).toBe('✓ Listed 203 functions');
  });
});
