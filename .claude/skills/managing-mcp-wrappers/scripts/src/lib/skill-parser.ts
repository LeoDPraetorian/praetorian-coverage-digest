/**
 * Skill Parser - Extract field documentation from service skill files
 *
 * Parses "Parameters:" and "Returns:" sections from skill markdown files
 * to extract documented field names, types, and optionality.
 *
 * Example skill format:
 * ```markdown
 * ### get-library-docs
 * - **Purpose:** Fetch library documentation
 * - **Import:** `import { getLibraryDocs } from './.claude/tools/context7/get-library-docs.ts'`
 * - **Token cost:** ~1400 tokens
 *
 * **Parameters:**
 * ```typescript
 * interface GetLibraryDocsInput {
 *   context7CompatibleLibraryID: string;
 *   mode?: 'code' | 'info';
 *   topic?: string;
 *   page?: number;
 * }
 * ```
 *
 * **Returns:**
 * ```typescript
 * interface GetLibraryDocsOutput {
 *   libraryName: string;
 *   libraryId: string;
 *   content: string;
 *   fetchedAt: string;
 *   mode: 'code' | 'info';
 *   topic?: string;
 *   page: number;
 *   estimatedTokens: number;
 *   version?: string;
 * }
 * ```
 * ```
 */

import * as fs from 'fs';
import type { SchemaField } from '../types.js';

/**
 * Parse TypeScript interface from skill documentation
 *
 * Extracts field definitions from code blocks like:
 * ```typescript
 * interface SomeInterface {
 *   fieldName: string;
 *   optionalField?: number;
 * }
 * ```
 */
export function parseInterfaceFromSkill(skillContent: string, sectionName: 'Parameters' | 'Returns'): SchemaField[] {
  // Find the section (Parameters or Returns)
  const sectionRegex = new RegExp(
    `\\*\\*${sectionName}:\\*\\*[\\s\\S]*?\`\`\`typescript([\\s\\S]*?)\`\`\``,
    'i'
  );

  const match = skillContent.match(sectionRegex);
  if (!match) {
    return [];
  }

  const interfaceBody = match[1];
  const fields: SchemaField[] = [];

  // Parse each field definition
  // Matches patterns like:
  // - fieldName: string;
  // - optionalField?: number;
  // - enumField: 'a' | 'b';
  const fieldRegex = /(\w+)(\?)?:\s*([^;]+);(?:\s*\/\/\s*(.+))?/g;

  let fieldMatch;
  while ((fieldMatch = fieldRegex.exec(interfaceBody)) !== null) {
    const [, name, optionalMark, type, comment] = fieldMatch;

    fields.push({
      name,
      type: type.trim(),
      optional: !!optionalMark,
      description: comment?.trim(),
    });
  }

  return fields;
}

/**
 * Extract tool documentation from service skill file
 *
 * Returns fields for both Parameters and Returns sections
 * for a specific tool.
 */
export function extractToolFieldsFromSkill(
  skillPath: string,
  toolName: string
): {
  inputFields: SchemaField[];
  outputFields: SchemaField[];
} {
  if (!fs.existsSync(skillPath)) {
    return { inputFields: [], outputFields: [] };
  }

  const content = fs.readFileSync(skillPath, 'utf-8');

  // Find the tool section (### tool-name)
  const toolSectionRegex = new RegExp(
    `###\\s+${toolName}([\\s\\S]*?)(?=###|$)`,
    'i'
  );

  const toolMatch = content.match(toolSectionRegex);
  if (!toolMatch) {
    return { inputFields: [], outputFields: [] };
  }

  const toolSection = toolMatch[1];

  return {
    inputFields: parseInterfaceFromSkill(toolSection, 'Parameters'),
    outputFields: parseInterfaceFromSkill(toolSection, 'Returns'),
  };
}

/**
 * Get service skill path from service name
 */
export function getServiceSkillPath(service: string): string {
  const repoRoot = process.cwd().split('/.claude')[0];
  return `${repoRoot}/.claude/skill-library/claude/mcp-tools/mcp-tools-${service}/SKILL.md`;
}
