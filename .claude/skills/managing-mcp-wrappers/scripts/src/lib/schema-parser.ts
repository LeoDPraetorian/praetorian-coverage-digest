/**
 * Schema Parser - Extract Zod schema definitions from wrapper files
 *
 * Parses InputSchema and OutputSchema from MCP wrapper TypeScript files
 * using regex extraction (simple, fast, good enough for our use case).
 *
 * Future: Could use TypeScript AST (ts-morph) for more robust parsing
 * if regex approach proves insufficient.
 */

import * as fs from 'fs';
import type { SchemaField } from '../types.js';

/**
 * Parse Zod schema from wrapper file content
 *
 * Extracts fields from:
 * ```typescript
 * const InputSchema = z.object({
 *   fieldName: z.string().describe('description'),
 *   optionalField: z.number().optional().describe('desc'),
 * });
 * ```
 */
export function parseZodSchema(content: string, schemaName: 'InputSchema' | 'OutputSchema'): SchemaField[] {
  // Find the schema definition
  const schemaRegex = new RegExp(
    `const\\s+${schemaName}\\s*=\\s*z\\.object\\(\\{([^}]+)\\}\\)`,
    's'  // Dot matches newlines
  );

  const match = content.match(schemaRegex);
  if (!match) {
    return [];
  }

  const schemaBody = match[1];
  const fields: SchemaField[] = [];

  // Parse each field definition
  // Matches patterns like:
  // - fieldName: z.string().describe('desc'),
  // - optionalField: z.number().optional().describe('desc'),
  // - enumField: z.enum(['a', 'b']).optional(),
  const fieldRegex = /(\w+):\s*z\.(\w+)\(([^)]*)\)([\s\S]*?)(?:,|\})/g;

  let fieldMatch;
  while ((fieldMatch = fieldRegex.exec(schemaBody)) !== null) {
    const [, name, baseType, args, modifiers] = fieldMatch;

    // Check if field is optional
    const optional = modifiers.includes('.optional()');

    // Extract description if present
    const descMatch = modifiers.match(/\.describe\(['"](.+?)['"]\)/);
    const description = descMatch ? descMatch[1] : undefined;

    // Determine full type (handle special cases)
    let type = baseType;
    if (baseType === 'enum') {
      // Extract enum values
      const enumMatch = modifiers.match(/z\.enum\(\[(.+?)\]\)/);
      if (enumMatch) {
        type = `enum(${enumMatch[1]})`;
      }
    } else if (baseType === 'union') {
      type = 'union';
    } else if (baseType === 'array') {
      type = 'array';
    }

    fields.push({
      name,
      type,
      optional,
      description,
    });
  }

  return fields;
}

/**
 * Extract both InputSchema and OutputSchema from wrapper file
 */
export function extractSchemasFromWrapper(wrapperPath: string): {
  inputFields: SchemaField[];
  outputFields: SchemaField[];
} {
  const content = fs.readFileSync(wrapperPath, 'utf-8');

  return {
    inputFields: parseZodSchema(content, 'InputSchema'),
    outputFields: parseZodSchema(content, 'OutputSchema'),
  };
}

/**
 * Format schema fields as TypeScript interface documentation
 *
 * Example output:
 * ```typescript
 * interface GetLibraryDocsInput {
 *   context7CompatibleLibraryID: string;
 *   mode?: 'code' | 'info';
 *   topic?: string;
 *   page?: number;
 * }
 * ```
 */
export function formatSchemaAsInterface(fields: SchemaField[], interfaceName: string): string {
  const lines = fields.map(field => {
    const optionalMark = field.optional ? '?' : '';
    const comment = field.description ? ` // ${field.description}` : '';
    return `  ${field.name}${optionalMark}: ${field.type};${comment}`;
  });

  return `interface ${interfaceName} {\n${lines.join('\n')}\n}`;
}
