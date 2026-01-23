/**
 * Unit tests for time estimation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  estimateAnalysisTime,
  estimateOperationTime,
  formatDuration,
} from './time-estimator.js';

describe('time-estimator', () => {
  describe('estimateOperationTime', () => {
    it('should have constant import time', () => {
      const sizes = [1024, 1048576, 10485760]; // 1KB, 1MB, 10MB

      for (const size of sizes) {
        const timing = estimateOperationTime(size);
        expect(timing.importMs).toBe(2000); // Always 2 seconds
      }
    });

    it('should scale analysis time with binary size', () => {
      // Small binary (100KB)
      const small = estimateOperationTime(102400);
      expect(small.analysisMs).toBe(5000); // Min bound (5s)

      // Medium binary (1MB)
      const medium = estimateOperationTime(1048576);
      expect(medium.analysisMs).toBe(5000); // ~0.5s per MB, min bound applies

      // Large binary (10MB)
      const large = estimateOperationTime(10485760);
      expect(large.analysisMs).toBe(5000); // ~5s, exactly at formula

      // Very large binary (20MB)
      const veryLarge = estimateOperationTime(20971520);
      expect(veryLarge.analysisMs).toBe(10000); // ~10s

      // Enormous binary (4GB) - should hit max bound
      const enormous = estimateOperationTime(4294967296);
      expect(enormous.analysisMs).toBe(1800000); // Max bound (30 minutes)
    });

    it('should enforce minimum analysis time (5s)', () => {
      // Very small binary (1 byte)
      const tiny = estimateOperationTime(1);
      expect(tiny.analysisMs).toBeGreaterThanOrEqual(5000);

      // Small binary (1KB)
      const small = estimateOperationTime(1024);
      expect(small.analysisMs).toBeGreaterThanOrEqual(5000);
    });

    it('should enforce maximum analysis time (30 minutes)', () => {
      // Gigantic binary (10GB)
      const gigantic = estimateOperationTime(10737418240);
      expect(gigantic.analysisMs).toBeLessThanOrEqual(1800000);
    });

    it('should calculate total time correctly', () => {
      const timing = estimateOperationTime(5242880); // 5MB
      expect(timing.totalMs).toBe(timing.importMs + timing.analysisMs);
    });

    it('should assign high confidence for small binaries (<1MB)', () => {
      const small = estimateOperationTime(524288); // 512KB
      expect(small.confidence).toBe('high');
    });

    it('should assign medium confidence for medium binaries (1-10MB)', () => {
      const medium1 = estimateOperationTime(1048576); // 1MB
      expect(medium1.confidence).toBe('medium');

      const medium2 = estimateOperationTime(5242880); // 5MB
      expect(medium2.confidence).toBe('medium');
    });

    it('should assign low confidence for large binaries (>10MB)', () => {
      const large = estimateOperationTime(20971520); // 20MB
      expect(large.confidence).toBe('low');

      const veryLarge = estimateOperationTime(104857600); // 100MB
      expect(veryLarge.confidence).toBe('low');
    });
  });

  describe('estimateAnalysisTime', () => {
    it('should return time in both seconds and minutes', () => {
      const estimate = estimateAnalysisTime(1048576); // 1MB

      expect(estimate.estimatedSeconds).toBeGreaterThan(0);
      expect(estimate.estimatedMinutes).toBeGreaterThan(0);
      // Minutes is rounded to 1 decimal place, so use approximate comparison
      expect(estimate.estimatedMinutes).toBeCloseTo(estimate.estimatedSeconds / 60, 1);
    });

    it('should round seconds to integer', () => {
      const estimate = estimateAnalysisTime(1048576);
      expect(estimate.estimatedSeconds).toBe(Math.round(estimate.estimatedSeconds));
    });

    it('should round minutes to 1 decimal place', () => {
      const estimate = estimateAnalysisTime(1048576);
      const decimalPart = estimate.estimatedMinutes.toString().split('.')[1];

      if (decimalPart) {
        expect(decimalPart.length).toBeLessThanOrEqual(1);
      }
    });

    it('should include human-readable string', () => {
      const estimate = estimateAnalysisTime(1048576);
      expect(estimate.humanReadable).toBeTruthy();
      expect(typeof estimate.humanReadable).toBe('string');
    });

    it('should include confidence level', () => {
      const estimate = estimateAnalysisTime(1048576);
      expect(['low', 'medium', 'high']).toContain(estimate.confidence);
    });

    it('should have consistent values across fields', () => {
      const estimate = estimateAnalysisTime(5242880); // 5MB

      // Minutes should match seconds/60
      expect(estimate.estimatedMinutes).toBeCloseTo(estimate.estimatedSeconds / 60, 1);
    });
  });

  describe('formatDuration', () => {
    it('should format seconds for durations under 60s', () => {
      expect(formatDuration(30)).toBe('30 seconds');
      expect(formatDuration(45)).toBe('45 seconds');
      expect(formatDuration(59)).toBe('59 seconds');
    });

    it('should format minutes for durations 60s-3600s', () => {
      expect(formatDuration(60)).toBe('1.0 minutes');
      expect(formatDuration(90)).toBe('1.5 minutes');
      expect(formatDuration(120)).toBe('2.0 minutes');
      expect(formatDuration(150)).toBe('2.5 minutes');
      expect(formatDuration(3599)).toBe('60.0 minutes');
    });

    it('should format hours for durations >= 3600s', () => {
      expect(formatDuration(3600)).toBe('1.0 hours');
      expect(formatDuration(5400)).toBe('1.5 hours');
      expect(formatDuration(7200)).toBe('2.0 hours');
    });

    it('should round seconds to nearest integer', () => {
      expect(formatDuration(30.4)).toBe('30 seconds');
      expect(formatDuration(30.6)).toBe('31 seconds');
    });

    it('should format minutes to 1 decimal place', () => {
      const result = formatDuration(93); // 1.55 minutes
      expect(result).toMatch(/^\d+\.\d minutes$/);

      const minutes = parseFloat(result.split(' ')[0]);
      const decimalPart = minutes.toString().split('.')[1];
      expect(decimalPart?.length).toBe(1);
    });

    it('should format hours to 1 decimal place', () => {
      const result = formatDuration(5580); // 1.55 hours
      expect(result).toMatch(/^\d+\.\d hours$/);

      const hours = parseFloat(result.split(' ')[0]);
      const decimalPart = hours.toString().split('.')[1];
      expect(decimalPart?.length).toBe(1);
    });
  });

  describe('integration scenarios', () => {
    it('should provide reasonable estimates for typical binaries', () => {
      // Small executable (~100KB)
      const smallExe = estimateAnalysisTime(102400);
      expect(smallExe.estimatedSeconds).toBeGreaterThan(0);
      expect(smallExe.estimatedSeconds).toBeLessThan(60); // Under 1 minute
      expect(smallExe.confidence).toBe('high');

      // Medium library (~5MB)
      const mediumLib = estimateAnalysisTime(5242880);
      expect(mediumLib.estimatedSeconds).toBeGreaterThan(0);
      expect(mediumLib.estimatedSeconds).toBeLessThan(300); // Under 5 minutes
      expect(mediumLib.confidence).toBe('medium');

      // Large binary (~50MB)
      const largeBin = estimateAnalysisTime(52428800);
      expect(largeBin.estimatedSeconds).toBeGreaterThan(0);
      expect(largeBin.confidence).toBe('low');
    });

    it('should format durations appropriately for binary sizes', () => {
      // Small binary - seconds
      const small = estimateAnalysisTime(102400);
      expect(small.humanReadable).toContain('seconds');

      // Medium binary - likely seconds or minutes
      const medium = estimateAnalysisTime(5242880);
      expect(small.humanReadable).toMatch(/(seconds|minutes)/);
    });

    it('should be consistent between estimation functions', () => {
      const sizeBytes = 5242880; // 5MB

      const operationTiming = estimateOperationTime(sizeBytes);
      const analysisTiming = estimateAnalysisTime(sizeBytes);

      // Total time in estimateAnalysisTime should match operationTiming.totalMs
      const totalSeconds = operationTiming.totalMs / 1000;
      expect(analysisTiming.estimatedSeconds).toBe(Math.round(totalSeconds));

      // Confidence should match
      expect(analysisTiming.confidence).toBe(operationTiming.confidence);
    });
  });
});
