/**
 * Sanitize error messages to prevent API key and sensitive data exposure
 *
 * Removes:
 * - Bearer tokens
 * - API keys (various formats)
 * - Secret keys (sk_ prefix)
 * - User file paths
 *
 * @param message - Error message to sanitize
 * @returns Sanitized error message with sensitive data redacted
 *
 * @example
 * ```typescript
 * const safe = sanitizeErrorMessage('Bearer sk_live_abc123 failed');
 * // Returns: 'Bearer [REDACTED] failed'
 * ```
 */
export function sanitizeErrorMessage(message: string): string {
  return message
    // Redact Bearer tokens (e.g., "Bearer sk_live_abc123" → "Bearer [REDACTED]")
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    // Redact API keys in various formats:
    // - api_key=value
    // - api-key: value
    // - apikey=value
    .replace(/api[_-]?key[=:]\s*\S+/gi, 'apiKey=[REDACTED]')
    // Redact secret keys with sk_ prefix (e.g., "sk_live_abc123" → "[API_KEY_REDACTED]")
    .replace(/sk_\w+/gi, '[API_KEY_REDACTED]')
    // Redact user file paths (e.g., "/Users/john/" → "[PATH_REDACTED]/")
    .replace(/\/Users\/[^/\s]+/g, '[PATH_REDACTED]');
}
