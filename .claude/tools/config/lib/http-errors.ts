/**
 * Error types for HTTP operations
 *
 * Following Result/Either pattern from implementing-result-either-pattern skill.
 */

export type HTTPErrorType =
  | 'network' // Connection failures, DNS errors
  | 'timeout' // Request timeout
  | 'rate_limit' // HTTP 429
  | 'auth' // HTTP 401, 403
  | 'client' // HTTP 4xx (non-retryable)
  | 'server'; // HTTP 5xx (retryable)

/**
 * Structured HTTP error
 */
export interface HTTPError {
  type: HTTPErrorType;
  status?: number;
  message: string;
  retryable: boolean;
}

export const ERROR_RETRYABILITY: Record<HTTPErrorType, boolean> = {
  network: true,
  timeout: true,
  rate_limit: true, // After Retry-After delay
  auth: false,
  client: false,
  server: true,
};

/**
 * Check if an error should trigger a retry
 */
export function isRetryable(error: HTTPError): boolean {
  return error.retryable;
}

/**
 * Extract Retry-After header value in milliseconds
 */
export function getRetryAfterMs(response: Response): number | null {
  const retryAfter = response.headers.get('Retry-After');
  if (!retryAfter) return null;

  // Seconds format
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) return seconds * 1000;

  // Date format
  const date = Date.parse(retryAfter);
  if (!isNaN(date)) return Math.max(0, date - Date.now());

  return null;
}
