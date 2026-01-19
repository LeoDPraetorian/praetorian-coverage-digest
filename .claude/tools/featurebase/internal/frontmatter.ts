/**
 * Frontmatter utilities using gray-matter with safe YAML parsing
 *
 * Security: Uses js-yaml SAFE_SCHEMA to prevent prototype pollution attacks
 */

import matter from 'gray-matter';
import yaml from 'js-yaml';

/**
 * Serialize frontmatter data and content to markdown with YAML frontmatter
 *
 * @param data - Frontmatter data object (will be serialized to YAML)
 * @param content - Markdown content body
 * @returns Complete markdown file with YAML frontmatter
 *
 * @example
 * ```typescript
 * const markdown = serializeFrontmatter(
 *   { title: 'Post Title', status: 'in-progress' },
 *   'Content here'
 * );
 * ```
 */
export function serializeFrontmatter(data: Record<string, unknown>, content: string): string {
  return matter.stringify(content, data);
}

/**
 * Validate parsed YAML data for dangerous keys
 *
 * Rejects keys commonly used in prototype pollution attacks
 *
 * @param data - Parsed YAML data
 * @throws {Error} If dangerous keys are detected
 */
function validateNoPrototypePollution(data: unknown): void {
  if (data === null || typeof data !== 'object') {
    return;
  }

  const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

  for (const key of Object.keys(data)) {
    if (DANGEROUS_KEYS.includes(key)) {
      throw new Error(`Dangerous key detected in YAML frontmatter: "${key}". Possible prototype pollution attack.`);
    }

    // Recursively check nested objects
    const value = (data as Record<string, unknown>)[key];
    if (value !== null && typeof value === 'object') {
      validateNoPrototypePollution(value);
    }
  }
}

/**
 * Validate parsed YAML data is not a billion laughs bomb
 *
 * Detects YAML bombs by checking serialized size
 *
 * @param data - Parsed YAML data
 * @throws {Error} If data structure is suspiciously large (likely YAML bomb)
 */
function validateNoYAMLBomb(data: unknown): void {
  // YAML bombs use aliases to create exponentially expanding structures
  // Detect by checking if serialized size is excessive
  const MAX_FRONTMATTER_SIZE = 10 * 1024; // 10KB limit for frontmatter

  const serialized = JSON.stringify(data);
  if (serialized.length > MAX_FRONTMATTER_SIZE) {
    throw new Error(
      `YAML frontmatter too large (${serialized.length} bytes > ${MAX_FRONTMATTER_SIZE} bytes limit). Possible billion laughs attack.`
    );
  }
}

/**
 * Parse frontmatter from markdown with security protections
 *
 * Uses js-yaml SAFE_SCHEMA to prevent:
 * - Prototype pollution (__proto__, constructor.prototype)
 * - Billion laughs attacks (YAML bombs)
 * - Code execution vulnerabilities
 *
 * Additionally validates parsed data to reject dangerous keys
 *
 * @param markdown - Markdown string with YAML frontmatter
 * @returns Object containing parsed data and content
 * @throws {Error} If YAML contains malicious content
 *
 * @example
 * ```typescript
 * const { data, content } = parseFrontmatter(markdownString);
 * console.log(data.title); // Safe access to frontmatter
 * ```
 */
export function parseFrontmatter(markdown: string): {
  data: Record<string, unknown>;
  content: string;
} {
  const { data, content } = matter(markdown, {
    engines: {
      yaml: {
        parse: (str: string) => yaml.load(str, {
          json: true  // Prevent prototype pollution (safe schema is default in js-yaml 4.x)
        }) as object
      }
    }
  });

  // Validate no dangerous keys are present
  validateNoPrototypePollution(data);

  // Validate not a YAML bomb
  validateNoYAMLBomb(data);

  return { data, content };
}
