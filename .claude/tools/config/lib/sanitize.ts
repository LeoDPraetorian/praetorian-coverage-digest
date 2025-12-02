/**
 * Input Sanitization Utilities for MCP Wrappers
 *
 * Provides validation and sanitization functions to prevent common security
 * vulnerabilities in MCP wrapper inputs.
 *
 * Usage in wrappers:
 * ```typescript
 * import { validateNoPathTraversal, validateNoCommandInjection, sanitizeString } from '../config/lib/sanitize';
 *
 * const InputSchema = z.object({
 *   path: z.string().refine(validateNoPathTraversal, 'Path traversal detected'),
 *   query: z.string().transform(sanitizeString),
 * });
 * ```
 */

/**
 * Path traversal patterns to detect
 */
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,              // Unix path traversal ../
  /\.\.\\/,              // Windows path traversal ..\
  /\.\.$/,               // Ends with ..
  /^\.\.$/,              // Just ..
  /~\//,                 // Home directory expansion ~/
];

/**
 * Command injection patterns to detect
 */
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$]/,             // Shell metacharacters
  /\$\(/,                // Command substitution $(
  /`[^`]*`/,             // Backtick command substitution
  /\|\|/,                // OR operator
  /&&/,                  // AND operator
  />\s*\/|>>/,           // Output redirection
  /<\s*\//,              // Input redirection
];

/**
 * XSS patterns to detect
 */
const XSS_PATTERNS = [
  /<script/i,            // Script tags
  /javascript:/i,        // JavaScript protocol
  /on\w+\s*=/i,          // Event handlers (onclick, onerror, etc.)
  /<iframe/i,            // Iframe injection
  /<object/i,            // Object injection
  /<embed/i,             // Embed injection
];

/**
 * Control character range (ASCII 0-31 and 127)
 */
const CONTROL_CHAR_PATTERN = /[\x00-\x1F\x7F]/;

/**
 * Validate that a string does not contain path traversal sequences
 *
 * @param input - String to validate
 * @returns true if safe, false if path traversal detected
 *
 * @example
 * ```typescript
 * const schema = z.string().refine(validateNoPathTraversal, 'Path traversal not allowed');
 * ```
 */
export function validateNoPathTraversal(input: string): boolean {
  return !PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Validate that a string does not contain command injection patterns
 *
 * @param input - String to validate
 * @returns true if safe, false if command injection detected
 *
 * @example
 * ```typescript
 * const schema = z.string().refine(validateNoCommandInjection, 'Invalid characters');
 * ```
 */
export function validateNoCommandInjection(input: string): boolean {
  return !COMMAND_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Validate that a string does not contain XSS patterns
 *
 * @param input - String to validate
 * @returns true if safe, false if XSS pattern detected
 */
export function validateNoXSS(input: string): boolean {
  return !XSS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Validate that a string does not contain control characters
 *
 * @param input - String to validate
 * @returns true if safe, false if control characters detected
 */
export function validateNoControlChars(input: string): boolean {
  return !CONTROL_CHAR_PATTERN.test(input);
}

/**
 * Combined validation for all security checks
 *
 * @param input - String to validate
 * @returns Object with validation result and specific failure reasons
 *
 * @example
 * ```typescript
 * const result = validateInput(userInput);
 * if (!result.valid) {
 *   throw new Error(`Invalid input: ${result.reasons.join(', ')}`);
 * }
 * ```
 */
export function validateInput(input: string): {
  valid: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (!validateNoPathTraversal(input)) {
    reasons.push('Path traversal detected');
  }
  if (!validateNoCommandInjection(input)) {
    reasons.push('Invalid characters detected');
  }
  if (!validateNoXSS(input)) {
    reasons.push('XSS pattern detected');
  }
  if (!validateNoControlChars(input)) {
    reasons.push('Control characters detected');
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}

/**
 * Sanitize a string by removing dangerous characters
 *
 * Use when you need to accept input but clean it, rather than reject it.
 * Removes control characters and trims whitespace.
 *
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  return input
    .replace(CONTROL_CHAR_PATTERN, '') // Remove control characters
    .trim();                            // Trim whitespace
}

/**
 * Validate string length within bounds
 *
 * @param input - String to validate
 * @param maxLength - Maximum allowed length
 * @param minLength - Minimum required length (default: 1)
 * @returns true if within bounds
 */
export function validateLength(
  input: string,
  maxLength: number,
  minLength: number = 1
): boolean {
  return input.length >= minLength && input.length <= maxLength;
}

/**
 * Create a Zod refinement for secure string validation
 *
 * Combines all security checks into a single refinement function
 * for use with Zod schemas.
 *
 * @param fieldName - Name of the field (for error messages)
 * @param options - Validation options
 * @returns Refinement function for Zod
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   libraryId: z.string().superRefine(createSecureStringValidator('libraryId', { maxLength: 256 })),
 * });
 * ```
 */
export function createSecureStringValidator(
  fieldName: string,
  options: {
    maxLength?: number;
    minLength?: number;
    allowEmpty?: boolean;
  } = {}
) {
  const { maxLength = 1000, minLength = 1, allowEmpty = false } = options;

  return (input: string, ctx: { addIssue: (issue: { code: 'custom'; message: string }) => void }) => {
    // Length check
    if (!allowEmpty && input.length < minLength) {
      ctx.addIssue({
        code: 'custom' as const,
        message: `${fieldName} is required`,
      });
      return;
    }

    if (input.length > maxLength) {
      ctx.addIssue({
        code: 'custom' as const,
        message: `${fieldName} is too long (max ${maxLength} characters)`,
      });
      return;
    }

    // Security checks
    if (!validateNoControlChars(input)) {
      ctx.addIssue({
        code: 'custom' as const,
        message: `Control characters not allowed in ${fieldName}`,
      });
      return;
    }

    if (!validateNoPathTraversal(input)) {
      ctx.addIssue({
        code: 'custom' as const,
        message: `Path traversal not allowed in ${fieldName}`,
      });
      return;
    }

    if (!validateNoCommandInjection(input)) {
      ctx.addIssue({
        code: 'custom' as const,
        message: `Invalid characters in ${fieldName}`,
      });
      return;
    }
  };
}

/**
 * Pre-built validators for common field types
 */
export const validators = {
  /**
   * Validate library/package IDs (e.g., "/user/react", "@types/node")
   */
  libraryId: (input: string) => {
    const result = validateInput(input);
    if (!result.valid) return false;
    // Allow alphanumeric, slashes, @, hyphens, underscores, dots
    return /^[\w@/.+-]+$/.test(input);
  },

  /**
   * Validate issue IDs (e.g., "ENG-1234", "abc-123-def")
   */
  issueId: (input: string) => {
    const result = validateInput(input);
    if (!result.valid) return false;
    // Allow alphanumeric and hyphens
    return /^[\w-]+$/.test(input);
  },

  /**
   * Validate search queries (more permissive, but no injection)
   */
  searchQuery: (input: string) => {
    return validateNoControlChars(input) && validateNoCommandInjection(input);
  },

  /**
   * Validate file paths (no traversal, reasonable characters)
   */
  filePath: (input: string) => {
    const result = validateInput(input);
    if (!result.valid) return false;
    // Allow path-like characters but no traversal
    return /^[\w./-]+$/.test(input);
  },
};
