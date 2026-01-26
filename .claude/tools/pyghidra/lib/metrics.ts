/**
 * PyGhidra HTTP Client Metrics
 *
 * Tracks performance and reliability metrics for PyGhidra operations.
 */

export interface MetricsSummary {
  /** Total number of requests made */
  totalRequests: number;
  /** Number of successful requests */
  successfulRequests: number;
  /** Number of failed requests */
  failedRequests: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Number of session resets */
  sessionResets: number;
  /** Response time statistics in milliseconds */
  responseTimes: {
    min: number;
    max: number;
    average: number;
    count: number;
  };
}

/**
 * Simple metrics collector for PyGhidra HTTP client
 */
export class PyGhidraMetrics {
  private requestCount = 0;
  private successCount = 0;
  private failureCount = 0;
  private sessionResetCount = 0;
  private responseTimes: number[] = [];
  private minResponseTime = Infinity;
  private maxResponseTime = -Infinity;
  private totalResponseTime = 0;

  /**
   * Record a successful request with its response time
   */
  recordSuccess(responseTimeMs: number): void {
    this.requestCount++;
    this.successCount++;
    this.recordResponseTime(responseTimeMs);
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    this.requestCount++;
    this.failureCount++;
  }

  /**
   * Record a session reset
   */
  recordSessionReset(): void {
    this.sessionResetCount++;
  }

  /**
   * Record response time
   */
  private recordResponseTime(timeMs: number): void {
    this.responseTimes.push(timeMs);
    this.totalResponseTime += timeMs;
    this.minResponseTime = Math.min(this.minResponseTime, timeMs);
    this.maxResponseTime = Math.max(this.maxResponseTime, timeMs);
  }

  /**
   * Get metrics summary
   */
  getMetrics(): MetricsSummary {
    const count = this.responseTimes.length;
    const average = count > 0 ? this.totalResponseTime / count : 0;

    return {
      totalRequests: this.requestCount,
      successfulRequests: this.successCount,
      failedRequests: this.failureCount,
      successRate: this.requestCount > 0 ? this.successCount / this.requestCount : 0,
      sessionResets: this.sessionResetCount,
      responseTimes: {
        min: count > 0 ? this.minResponseTime : 0,
        max: count > 0 ? this.maxResponseTime : 0,
        average,
        count,
      },
    };
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.requestCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.sessionResetCount = 0;
    this.responseTimes = [];
    this.minResponseTime = Infinity;
    this.maxResponseTime = -Infinity;
    this.totalResponseTime = 0;
  }
}

/**
 * Create a new metrics collector
 */
export function createMetrics(): PyGhidraMetrics {
  return new PyGhidraMetrics();
}
