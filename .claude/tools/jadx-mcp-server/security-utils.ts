/**
 * Security validation utilities for JADX MCP wrappers
 *
 * Defense-in-depth security functions for high-risk operations.
 */

import { JadxWrapperError } from './errors.js';
import {
  validateNoPathTraversal,
  validateNoControlChars,
  validateNoCommandInjection,
} from '../config/lib/sanitize.js';
import { JAVA_RESERVED_WORDS } from './shared-schemas.js';

// ============================================================================
// Resource Path Security
// ============================================================================

/**
 * Whitelist of allowed resource directories in Android APKs
 */
const ALLOWED_RESOURCE_PREFIXES = [
  'res/',
  'assets/',
  'AndroidManifest.xml',
] as const;

/**
 * Validate that resource path starts with an allowed prefix
 */
export function isAllowedResourcePath(resourceName: string): boolean {
  const normalized = resourceName.startsWith('/') ? resourceName.slice(1) : resourceName;
  return ALLOWED_RESOURCE_PREFIXES.some(prefix =>
    normalized.startsWith(prefix) || normalized === prefix.replace('/', '')
  );
}

/**
 * Validate resource name with comprehensive security checks
 */
export function validateResourceName(resourceName: string, tool: string): void {
  if (!validateNoPathTraversal(resourceName)) {
    throw new JadxWrapperError(
      { type: 'validation', message: 'Path traversal detected in resource name', retryable: false },
      tool
    );
  }

  if (!validateNoControlChars(resourceName)) {
    throw new JadxWrapperError(
      { type: 'validation', message: 'Control characters not allowed in resource name', retryable: false },
      tool
    );
  }

  if (!isAllowedResourcePath(resourceName)) {
    throw new JadxWrapperError(
      {
        type: 'validation',
        message: `Resource must be in allowed directories: ${ALLOWED_RESOURCE_PREFIXES.join(', ')}`,
        retryable: false
      },
      tool
    );
  }

  if (resourceName.includes('%2e') || resourceName.includes('%2E') ||
      resourceName.includes('%2f') || resourceName.includes('%2F')) {
    throw new JadxWrapperError(
      { type: 'validation', message: 'URL-encoded path characters not allowed', retryable: false },
      tool
    );
  }
}

// ============================================================================
// Rename Operation Security
// ============================================================================

/**
 * Validate rename-field inputs with defense-in-depth security
 *
 * Layer 2: Security function validation (after Zod schema validation)
 * Layer 3: Semantic validation (Java reserved words, length sanity)
 *
 * @param className - Fully qualified Java class name
 * @param fieldName - Current field name
 * @param newName - New field name
 * @param tool - Tool name for error context
 * @throws JadxWrapperError if validation fails
 */
export function validateRenameFieldInputs(
  className: string,
  fieldName: string,
  newName: string,
  tool: string
): void {
  // Layer 2: Path traversal in class_name
  if (!validateNoPathTraversal(className)) {
    throw new JadxWrapperError(
      { type: 'validation', message: 'Path traversal detected in class name', retryable: false },
      tool
    );
  }

  // Layer 2: Command injection in field_name
  if (!validateNoCommandInjection(fieldName)) {
    throw new JadxWrapperError(
      { type: 'validation', message: 'Invalid characters in field name', retryable: false },
      tool
    );
  }

  // Layer 2: Command injection in new_name
  if (!validateNoCommandInjection(newName)) {
    throw new JadxWrapperError(
      { type: 'validation', message: 'Invalid characters in new name', retryable: false },
      tool
    );
  }

  // Layer 3: Java reserved words
  if (JAVA_RESERVED_WORDS.has(newName)) {
    throw new JadxWrapperError(
      { type: 'validation', message: `'${newName}' is a Java reserved word`, retryable: false },
      tool
    );
  }

  // Layer 3: Length sanity
  if (newName.length > 256) {
    throw new JadxWrapperError(
      { type: 'validation', message: 'New name too long (max 256 chars)', retryable: false },
      tool
    );
  }
}

/**
 * Validate rename-method inputs with defense-in-depth security
 *
 * CRITICAL: Write operations require maximum validation
 *
 * @param methodName - Full method path to rename (package.class.method)
 * @param newName - New method name (simple identifier)
 * @param tool - Tool name for error context
 * @throws JadxWrapperError if validation fails
 */
export function validateRenameMethodInputs(
  methodName: string,
  newName: string,
  tool: string
): void {
  // Layer 2: Extra path traversal check (defense-in-depth)
  if (!validateNoPathTraversal(methodName)) {
    throw new JadxWrapperError(
      { type: 'validation', message: 'Path traversal detected in method name', retryable: false },
      tool
    );
  }

  // Layer 2: Extra control character check
  if (!validateNoControlChars(methodName) || !validateNoControlChars(newName)) {
    throw new JadxWrapperError(
      { type: 'validation', message: 'Control characters not allowed', retryable: false },
      tool
    );
  }

  // Layer 3: Java reserved word check
  if (JAVA_RESERVED_WORDS.has(newName)) {
    throw new JadxWrapperError(
      { type: 'validation', message: `'${newName}' is a Java reserved word`, retryable: false },
      tool
    );
  }

  // Layer 3: URL-encoded path traversal check
  if (methodName.includes('%2e') || methodName.includes('%2E') ||
      methodName.includes('%2f') || methodName.includes('%2F')) {
    throw new JadxWrapperError(
      { type: 'validation', message: 'URL-encoded characters not allowed', retryable: false },
      tool
    );
  }
}

/**
 * Validate rename-class inputs with defense-in-depth security
 *
 * Layer 2: Security function validation (after Zod schema validation)
 * Layer 3: Semantic validation (Java reserved words, length sanity)
 *
 * @param className - Fully qualified Java class name
 * @param newName - New class name (simple name, not qualified)
 * @param tool - Tool name for error context
 * @throws JadxWrapperError if validation fails
 */
export function validateRenameInputs(
  className: string,
  newName: string,
  tool: string
): void {
  // Layer 2: Path traversal in class_name
  if (!validateNoPathTraversal(className)) {
    throw new JadxWrapperError(
      { type: 'validation', message: 'Path traversal detected in class name', retryable: false },
      tool
    );
  }

  // Layer 2: Command injection in new_name
  if (!validateNoCommandInjection(newName)) {
    throw new JadxWrapperError(
      { type: 'validation', message: 'Invalid characters in new name', retryable: false },
      tool
    );
  }

  // Layer 3: Java reserved words
  if (JAVA_RESERVED_WORDS.has(newName)) {
    throw new JadxWrapperError(
      { type: 'validation', message: `'${newName}' is a Java reserved word`, retryable: false },
      tool
    );
  }

  // Layer 3: Length sanity
  if (newName.length > 256) {
    throw new JadxWrapperError(
      { type: 'validation', message: 'New name too long (max 256 chars)', retryable: false },
      tool
    );
  }
}

// ============================================================================
// Write Operation Audit Logging
// ============================================================================

export interface AuditLogEntry {
  timestamp: string;       // ISO 8601
  tool: string;            // Tool name (e.g., 'rename-field')
  operation: string;       // Operation type (e.g., 'rename')
  oldValue: string;        // Original value
  newValue: string;        // New value
  success: boolean;        // Operation success/failure
  error?: string;          // Error message if failed
}

/**
 * Log write operations for audit trail
 *
 * Outputs structured audit logs to console with [JADX-AUDIT] prefix.
 * Future: Could append to file or send to logging service.
 */
export function logWriteOperation(entry: AuditLogEntry): void {
  const log = {
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString(),
  };

  // Console log for debugging and audit trail
  console.info('[JADX-AUDIT]', JSON.stringify(log));
}
