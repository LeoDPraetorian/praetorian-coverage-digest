import { describe, it, expect } from 'vitest';
import { rankPaths, detectSanitization } from '../lib/phases/phase4-path-ranking';

describe('Phase 4 - Path Ranking', () => {
  describe('rankPaths', () => {
    it('should rank paths by risk level', () => {
      const paths = [
        { source: 'recv', sink: 'system', path: ['recv', 'system'] },
        { source: 'fread', sink: 'strcpy', path: ['fread', 'strcpy'] }
      ];

      const ranked = rankPaths(paths);

      expect(ranked[0].risk_level).toBe('critical'); // recv -> system
      expect(ranked[1].risk_level).toBe('high'); // fread -> strcpy
    });

    it('should sort by risk level (critical first)', () => {
      const paths = [
        { source: 'fread', sink: 'strcpy', path: ['fread', 'strcpy'] },
        { source: 'recv', sink: 'system', path: ['recv', 'system'] }
      ];

      const ranked = rankPaths(paths);

      expect(ranked[0].source).toBe('recv');
      expect(ranked[0].risk_level).toBe('critical');
    });

    it('should assign medium risk for low-criticality sinks', () => {
      const paths = [
        { source: 'getenv', sink: 'printf', path: ['getenv', 'printf'] }
      ];

      const ranked = rankPaths(paths);

      expect(ranked[0].risk_level).toBe('medium');
    });
  });

  describe('detectSanitization', () => {
    it('should detect bounds checks with sizeof', () => {
      const code = 'if (len < sizeof(buffer)) { strcpy(dest, src); }';
      const hasSanitization = detectSanitization(code);
      expect(hasSanitization).toBe(true);
    });

    it('should detect length checks', () => {
      const code = 'if (strlen(src) < MAX_SIZE) { strcpy(dest, src); }';
      const hasSanitization = detectSanitization(code);
      expect(hasSanitization).toBe(true);
    });

    it('should return false for unsafe code', () => {
      const unsafeCode = 'strcpy(dest, src);';
      const hasSanitization = detectSanitization(unsafeCode);
      expect(hasSanitization).toBe(false);
    });

    it('should detect comparison operators', () => {
      const code = 'if (x <= MAX) { process(x); }';
      const hasSanitization = detectSanitization(code);
      expect(hasSanitization).toBe(true);
    });
  });
});
