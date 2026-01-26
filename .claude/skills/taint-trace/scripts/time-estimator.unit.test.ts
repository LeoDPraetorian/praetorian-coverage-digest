// time-estimator.unit.test.ts
import { describe, it, expect } from 'vitest';
import { estimateAnalysisTime } from '../lib/time-estimator.js';

describe('Time Estimator', () => {
  it('should estimate fast for small binaries (< 500KB)', () => {
    const estimate = estimateAnalysisTime(400 * 1024); // 400KB
    expect(estimate.seconds).toBeLessThanOrEqual(60);
    expect(estimate.message).toContain('~30 seconds');
  });

  it('should estimate medium for mid-size binaries (500KB-5MB)', () => {
    const estimate = estimateAnalysisTime(2 * 1024 * 1024); // 2MB
    expect(estimate.seconds).toBeGreaterThan(60);
    expect(estimate.seconds).toBeLessThanOrEqual(600);
    expect(estimate.message).toContain('~5 minutes');
  });

  it('should estimate slow for large binaries (> 5MB)', () => {
    const estimate = estimateAnalysisTime(10 * 1024 * 1024); // 10MB
    expect(estimate.seconds).toBeGreaterThan(600);
    expect(estimate.message).toContain('~15+ minutes');
  });
});
