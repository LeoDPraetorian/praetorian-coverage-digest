/**
 * Shared Zod schemas for JADX MCP wrappers
 *
 * Implements OWASP allowlist patterns with defense-in-depth:
 * - Layer 1: Zod structural validation
 * - Layer 2: Security function validation (sanitize.ts)
 * - Layer 3: Semantic validation in execute()
 * - Layer 4: Response filtering
 */

import { z } from 'zod';
import {
  validateNoPathTraversal,
  validateNoControlChars,
  validateNoCommandInjection,
} from '../config/lib/sanitize.js';

// ============================================================================
// Common Parameter Schemas
// ============================================================================

/**
 * Java class name validation (fully qualified)
 * Example: "com.example.app.MainActivity"
 *
 * Security: HIGH - prevents path traversal, command injection
 */
export const JavaClassNameSchema = z
  .string()
  .min(1, 'Class name cannot be empty')
  .max(500, 'Class name too long (max 500 chars)')
  .regex(
    /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*(\$[a-zA-Z_$][a-zA-Z0-9_$]*)*$/,
    'Invalid Java class name format'
  )
  .refine(
    (val) => validateNoControlChars(val),
    { message: 'Control characters not allowed in class name' }
  )
  .refine(
    (val) => validateNoPathTraversal(val),
    { message: 'Path traversal not allowed in class name' }
  );

/**
 * Resource file name validation
 * Example: "res/layout/activity_main.xml", "assets/config.json"
 *
 * CRITICAL SECURITY: Allows forward slashes (/) for directory paths
 * but prevents path traversal attacks (../)
 */
export const ResourceNameSchema = z
  .string()
  .min(1, 'Resource name is required')
  .max(500, 'Resource name too long (max 500 chars)')
  .regex(
    /^[a-zA-Z0-9_\-./]+$/,
    'Resource name can only contain alphanumeric, underscore, hyphen, dot, and forward slash'
  )
  .refine(
    (val) => validateNoPathTraversal(val),
    { message: 'Path traversal not allowed in resource name' }
  )
  .refine(
    (val) => validateNoControlChars(val),
    { message: 'Control characters not allowed in resource name' }
  );

// ============================================================================
// Pagination Schemas
// ============================================================================

/**
 * Pagination: count parameter
 * Controls number of items returned
 */
export const CountSchema = z
  .number()
  .int('count must be an integer')
  .min(0, 'count cannot be negative')
  .max(10000, 'count exceeds maximum (10000)')
  .default(100)
  .describe('Number of items to return (default: 100, max: 10000)');

/**
 * Pagination: offset parameter
 * Controls starting position for pagination
 */
export const OffsetSchema = z
  .number()
  .int('offset must be an integer')
  .min(0, 'offset cannot be negative')
  .default(0)
  .describe('Number of items to skip (default: 0)');

/**
 * Combined pagination schema for paginated tools
 * Used by: paginated_list, search patterns
 */
export const PaginationSchema = z.object({
  count: CountSchema,
  offset: OffsetSchema,
});

// ============================================================================
// Search Schemas
// ============================================================================

/**
 * Validate search term for command injection with Java method name allowances
 *
 * Allows:
 * - $lambda (lambda methods)
 * - <init> (constructors)
 * - Standalone $ for partial searches
 *
 * Blocks:
 * - $( command substitution
 * - ; | & ` (shell metacharacters)
 * - && || (boolean operators)
 * - > < (redirection)
 */
function validateSearchTermNoCommandInjection(input: string): boolean {
  // Block command substitution patterns
  if (/\$\(/.test(input)) return false;
  // Block shell metacharacters (except $ which is allowed standalone)
  if (/[;&|`]/.test(input)) return false;
  // Block boolean operators
  if (/(\|\||&&)/.test(input)) return false;
  // Block redirection
  if (/(>\s*\/|>>|<\s*\/)/.test(input)) return false;

  return true;
}

/**
 * Search term validation for method name searches
 *
 * Security: MEDIUM
 * - Min length 1 (prevent empty searches returning everything)
 * - Max length 100 (prevent memory issues with large inputs)
 * - Control character prevention
 * - Limited command injection prevention (allows $lambda, <init>)
 *
 * NOTE: This is MORE permissive than JavaIdentifierSchema because:
 * - Users may search for partial names ("get", "set")
 * - Lambda methods contain special chars ($lambda)
 * - Constructor methods are <init>
 */
export const SearchTermSchema = z
  .string()
  .min(1, 'Search term cannot be empty')
  .max(100, 'Search term too long (max 100 chars)')
  .refine(
    (val) => val.trim().length > 0,
    { message: 'Search term cannot be only whitespace' }
  )
  .refine(
    (val) => validateNoControlChars(val),
    { message: 'Control characters not allowed in search term' }
  )
  .refine(
    (val) => validateSearchTermNoCommandInjection(val),
    { message: 'Invalid characters in search term' }
  );

/**
 * Method name validation for JADX
 *
 * Allows standard Java method names PLUS special cases:
 * - <init> for constructors
 * - <clinit> for static initializers
 * - lambda$name$N for lambda methods
 * - Obfuscated single-letter names (a, b, c)
 *
 * Security: HIGH - prevents injection attacks with 4-layer defense
 */
export const MethodNameSchema = z
  .string()
  .min(1, 'Method name cannot be empty')
  .max(256, 'Method name too long (max 256 chars)')
  .regex(
    /^(<init>|<clinit>|[a-zA-Z_$][a-zA-Z0-9_$]*|lambda\$[a-zA-Z_$][a-zA-Z0-9_$]*\$\d+)$/,
    'Invalid Java method name format'
  )
  .refine(
    (val) => validateNoControlChars(val),
    { message: 'Control characters not allowed in method name' }
  )
  .refine(
    (val) => validateNoPathTraversal(val),
    { message: 'Path traversal not allowed in method name' }
  );

// ============================================================================
// Rename Operation Schemas
// ============================================================================

/**
 * Java Reserved Words Blacklist
 *
 * All Java reserved keywords that cannot be used as identifiers.
 * Used in NewNameSchema to prevent invalid renames.
 */
export const JAVA_RESERVED_WORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
  'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
  'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
  'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new',
  'package', 'private', 'protected', 'public', 'return', 'short', 'static',
  'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
  'transient', 'try', 'void', 'volatile', 'while', 'true', 'false', 'null'
]);

/**
 * Java identifier validation (field name, variable name)
 *
 * Valid Java identifier rules:
 * - Must start with letter, underscore, or dollar sign
 * - Subsequent characters can be letters, digits, underscores, or dollar signs
 * - Cannot be a reserved word
 *
 * Security: HIGH - prevents injection attacks
 */
export const JavaIdentifierSchema = z
  .string()
  .min(1, 'Identifier cannot be empty')
  .max(256, 'Identifier too long (max 256 chars)')
  .regex(
    /^[a-zA-Z_$][a-zA-Z0-9_$]*$/,
    'Invalid Java identifier format'
  )
  .refine(
    (val) => validateNoControlChars(val),
    { message: 'Control characters not allowed' }
  )
  .refine(
    (val) => validateNoCommandInjection(val),
    { message: 'Invalid characters' }
  );

/**
 * New name for rename operations (STRICT validation)
 * Must be valid Java identifier AND not a reserved word
 *
 * Security: CRITICAL - prevents invalid Java code generation
 * NOTE: We reject $ for safety even though technically valid in Java
 */
export const NewNameSchema = z
  .string()
  .min(1, 'New name cannot be empty')
  .max(256, 'New name too long (max 256 chars)')
  .regex(
    /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    'Invalid Java identifier (must start with letter/underscore, alphanumeric only)'
  )
  .refine(
    (val) => !JAVA_RESERVED_WORDS.has(val),
    { message: 'Cannot use Java reserved word as name' }
  )
  .refine(
    (val) => !val.startsWith('_') || val.length > 1,
    { message: 'Name cannot be just underscore' }
  )
  .refine(
    (val) => validateNoControlChars(val),
    { message: 'Control characters not allowed' }
  )
  .refine(
    (val) => validateNoCommandInjection(val),
    { message: 'Invalid characters' }
  );

/**
 * Full method path validation for rename-method operations
 *
 * Format: package.class.method (e.g., "com.example.MyClass.myMethod")
 *
 * CRITICAL: This is MORE strict than MethodNameSchema (for search)
 * because it requires full qualification with package path.
 *
 * Security layers:
 * - Layer 1: Regex for Java identifier format (package.class.method)
 * - Layer 2: No path traversal (..)
 * - Layer 3: No control characters
 * - Layer 4: No command injection
 */
export const FullMethodPathSchema = z
  .string()
  .min(1, 'Method name cannot be empty')
  .max(500, 'Method name too long (max 500 chars)')
  .regex(
    /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*(\$[a-zA-Z_$][a-zA-Z0-9_$]*)?\.(<init>|<clinit>|[a-zA-Z_$][a-zA-Z0-9_$]*)$/,
    'Invalid method path format. Expected: package.class.method (e.g., com.example.MyClass.myMethod)'
  )
  .refine(
    (val) => validateNoPathTraversal(val),
    { message: 'Path traversal not allowed in method name' }
  )
  .refine(
    (val) => validateNoControlChars(val),
    { message: 'Control characters not allowed in method name' }
  )
  .refine(
    (val) => validateNoCommandInjection(val),
    { message: 'Invalid characters in method name' }
  );
