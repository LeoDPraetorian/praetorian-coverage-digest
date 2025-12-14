/**
 * Agent Parser
 *
 * Parses agent markdown files, extracts frontmatter, and detects
 * block scalar descriptions that break Claude Code discovery.
 *
 * CRITICAL: Block scalar detection is the primary function of this module.
 * YAML block scalars (| and >) cause Claude Code to see the literal character
 * instead of the description content.
 */

import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import {
  AgentInfo,
  AgentFrontmatter,
  AgentCategory,
  AgentColor,
  DescriptionStatus,
  AGENT_CATEGORIES,
  COLOR_BY_TYPE,
  FRONTMATTER_FIELD_ORDER,
} from './types.js';

/**
 * Detect if a YAML field uses block scalar syntax
 *
 * Block scalars in YAML:
 * - Literal block scalar: |
 * - Folded block scalar: >
 * - With chomping indicators: |- |+ >- >+
 *
 * These cause Claude Code's parser to return the literal | or > character
 * instead of the actual description content.
 *
 * @param rawYaml - The raw YAML frontmatter string
 * @param fieldName - The field to check (e.g., 'description')
 * @returns 'pipe' | 'folded' | null
 */
export function detectBlockScalar(
  rawYaml: string,
  fieldName: string = 'description'
): 'pipe' | 'folded' | null {
  // Split into lines for analysis
  const lines = rawYaml.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match field declaration with block scalar
    // Patterns: "description: |", "description: >", "description: |-", etc.
    const pipePattern = new RegExp(`^${fieldName}:\\s*\\|[+-]?\\s*$`);
    const foldedPattern = new RegExp(`^${fieldName}:\\s*>[+-]?\\s*$`);

    if (pipePattern.test(line)) {
      return 'pipe';
    }

    if (foldedPattern.test(line)) {
      return 'folded';
    }
  }

  return null;
}

/**
 * Determine the description status
 *
 * @param rawYaml - Raw YAML frontmatter
 * @param parsedDescription - The parsed description value from gray-matter
 * @returns DescriptionStatus
 */
export function getDescriptionStatus(
  rawYaml: string,
  parsedDescription: string | undefined
): DescriptionStatus {
  // Check for missing
  if (parsedDescription === undefined) {
    return 'missing';
  }

  // Check for empty
  if (parsedDescription.trim() === '') {
    return 'empty';
  }

  // Check for block scalars
  const blockType = detectBlockScalar(rawYaml, 'description');

  if (blockType === 'pipe') {
    return 'block-scalar-pipe';
  }

  if (blockType === 'folded') {
    return 'block-scalar-folded';
  }

  return 'valid';
}

/**
 * Extract raw frontmatter YAML from file content
 *
 * @param content - Full file content
 * @returns Raw YAML string between --- markers
 */
export function extractRawFrontmatter(content: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : '';
}

/**
 * Count lines in content (excluding empty trailing lines)
 *
 * @param content - String content
 * @returns Number of lines
 */
export function countLines(content: string): number {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n');

  // Split and filter trailing empty lines
  const lines = normalized.split('\n');

  // Find last non-empty line
  let lastNonEmpty = lines.length - 1;
  while (lastNonEmpty >= 0 && lines[lastNonEmpty].trim() === '') {
    lastNonEmpty--;
  }

  return lastNonEmpty + 1;
}

/**
 * Check if description contains "Use when" trigger
 *
 * @param description - Description string
 * @returns true if contains trigger
 */
export function hasUseWhenTrigger(description: string): boolean {
  return /^Use when\b/i.test(description.trim());
}

/**
 * Check if description contains example blocks
 *
 * @param description - Description string
 * @returns true if contains <example> blocks
 */
export function hasExamples(description: string): boolean {
  return /<example>[\s\S]*?<\/example>/i.test(description);
}

/**
 * Check if frontmatter uses gateway skills (not direct library paths)
 *
 * @param skills - Skills string from frontmatter
 * @returns true if uses gateway pattern
 */
export function hasGatewaySkill(skills: string | undefined): boolean {
  if (!skills) {
    return false;
  }

  // Check for gateway-* pattern
  return /gateway-[\w-]+/.test(skills);
}

/**
 * Check if body contains output format section
 *
 * @param body - Agent body content
 * @returns true if contains output format
 */
export function hasOutputFormat(body: string): boolean {
  // Look for output format section with JSON structure
  const hasSection = /##\s*Output\s+Format/i.test(body);
  const hasJsonBlock = /```json[\s\S]*?status[\s\S]*?```/i.test(body);

  return hasSection && hasJsonBlock;
}

/**
 * Check if body contains escalation protocol section
 *
 * @param body - Agent body content
 * @returns true if contains escalation protocol
 */
export function hasEscalationProtocol(body: string): boolean {
  // Look for escalation section with stopping conditions
  const hasSection = /##\s*Escalation\s+Protocol/i.test(body);
  const hasConditions = /Stop and escalate if/i.test(body) ||
                       /→\s*Recommend\s+`[\w-]+`/i.test(body);

  return hasSection && hasConditions;
}

/**
 * Determine agent category from file path
 *
 * @param filePath - Full file path
 * @returns AgentCategory or throws
 */
export function getCategoryFromPath(filePath: string): AgentCategory {
  const parts = filePath.split(path.sep);
  const agentsIndex = parts.indexOf('agents');

  if (agentsIndex === -1 || agentsIndex >= parts.length - 2) {
    throw new Error(`Invalid agent path: ${filePath}`);
  }

  const categoryStr = parts[agentsIndex + 1];

  // Check for .archived first (special case)
  if (categoryStr === '.archived') {
    // Return development as default for archived agents
    return 'development';
  }

  // Validate it's a known category
  if (!AGENT_CATEGORIES.includes(categoryStr as AgentCategory)) {
    throw new Error(`Unknown agent category: ${categoryStr}`);
  }

  return categoryStr as AgentCategory;
}

/**
 * Manually extract a field value from YAML frontmatter
 * Handles cases where gray-matter fails due to colons in values
 *
 * @param yaml - Raw YAML string
 * @param fieldName - Field to extract
 * @returns Field value or undefined
 */
function extractFieldManually(yaml: string, fieldName: string): string | undefined {
  const lines = yaml.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line starts the field
    if (line.startsWith(`${fieldName}:`)) {
      // Get the rest after "fieldName: "
      const afterColon = line.substring(fieldName.length + 1).trim();

      // Check for block scalar
      if (afterColon === '|' || afterColon === '>' ||
          afterColon === '|-' || afterColon === '>-' ||
          afterColon === '|+' || afterColon === '>+') {
        // Collect multi-line content
        const contentLines: string[] = [];
        let j = i + 1;
        while (j < lines.length) {
          const nextLine = lines[j];
          // Block scalar content is indented
          if (nextLine.match(/^[ \t]+/) && !nextLine.match(/^[a-z]+:/i)) {
            contentLines.push(nextLine.replace(/^[ \t]+/, ''));
            j++;
          } else {
            break;
          }
        }
        return contentLines.join('\n');
      }

      // Single-line value - might extend to end of line
      return afterColon;
    }
  }

  return undefined;
}

/**
 * Parse an agent file and extract all metadata
 *
 * @param filePath - Full path to agent .md file
 * @returns AgentInfo with all parsed data
 */
export function parseAgent(filePath: string): AgentInfo {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Agent file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const category = getCategoryFromPath(filePath);

  // Extract raw frontmatter before gray-matter parsing
  const rawFrontmatter = extractRawFrontmatter(content);

  // Try to parse with gray-matter, fall back to manual extraction if it fails
  let frontmatter: AgentFrontmatter;
  let body: string;

  try {
    const parsed = matter(content);
    frontmatter = parsed.data as AgentFrontmatter;
    body = parsed.content;
  } catch (error) {
    // Gray-matter failed (likely due to colons in description)
    // Fall back to manual field extraction
    frontmatter = {
      name: extractFieldManually(rawFrontmatter, 'name') || fileName.replace(/\.md$/, ''),
      description: extractFieldManually(rawFrontmatter, 'description') || '',
      type: extractFieldManually(rawFrontmatter, 'type') as AgentCategory | undefined,
      permissionMode: extractFieldManually(rawFrontmatter, 'permissionMode') as any,
      tools: extractFieldManually(rawFrontmatter, 'tools'),
      skills: extractFieldManually(rawFrontmatter, 'skills'),
      model: extractFieldManually(rawFrontmatter, 'model'),
      color: extractFieldManually(rawFrontmatter, 'color') as AgentColor | undefined,
    };

    // Extract body (content after closing ---)
    const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
    body = match ? match[1] : '';
  }

  // Get description status (critical for block scalar detection)
  const descriptionStatus = getDescriptionStatus(
    rawFrontmatter,
    frontmatter.description
  );

  // Count lines
  const totalLineCount = countLines(content);
  const bodyLineCount = countLines(body);

  // Extract field order and validate
  const fieldOrder = extractFieldOrder(rawFrontmatter);
  const correctFieldOrder = hasCorrectFieldOrder(fieldOrder);

  // Normalize array fields to comma-separated strings
  const normalizeArrayField = (value: unknown): string | undefined => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'string') {
      return value;
    }
    return undefined;
  };

  // Build AgentInfo
  return {
    filePath,
    fileName,
    category,
    frontmatter: {
      name: frontmatter.name || fileName.replace(/\.md$/, ''),
      description: frontmatter.description || '',
      type: frontmatter.type,
      permissionMode: frontmatter.permissionMode,
      tools: normalizeArrayField(frontmatter.tools),
      skills: normalizeArrayField(frontmatter.skills),
      model: frontmatter.model,
      color: frontmatter.color as AgentColor | undefined,
    },
    rawFrontmatter,
    body,
    lineCount: totalLineCount,
    bodyLineCount,
    descriptionStatus,
    hasExamples: hasExamples(frontmatter.description || ''),
    hasUseWhenTrigger: hasUseWhenTrigger(frontmatter.description || ''),
    hasGatewaySkill: hasGatewaySkill(frontmatter.skills),
    hasOutputFormat: hasOutputFormat(body),
    hasEscalationProtocol: hasEscalationProtocol(body),
    hasCorrectColor: hasCorrectColor(frontmatter.type, frontmatter.color as AgentColor | undefined),
    frontmatterFieldOrder: fieldOrder,
    hasCorrectFieldOrder: correctFieldOrder,
  };
}

/**
 * Convert a block scalar description to single-line format
 *
 * This function takes a multi-line description (from a block scalar)
 * and converts it to a single-line format with \n escapes.
 *
 * @param multilineDesc - The multi-line description
 * @returns Single-line description with \n escapes
 */
export function convertToSingleLine(multilineDesc: string): string {
  // Normalize line endings
  const normalized = multilineDesc.replace(/\r\n/g, '\n');

  // Replace actual newlines with \n escape sequence
  // Preserve intentional paragraph breaks as \n\n
  const singleLine = normalized
    .split('\n\n')
    .map((paragraph) => paragraph.replace(/\n/g, ' ').trim())
    .join('\\n\\n');

  return singleLine;
}

/**
 * Validate agent frontmatter
 *
 * @param frontmatter - Parsed frontmatter
 * @returns Array of validation errors
 */
export function validateFrontmatter(frontmatter: AgentFrontmatter): string[] {
  const errors: string[] = [];

  // Required fields
  if (!frontmatter.name || frontmatter.name.trim() === '') {
    errors.push('Missing required field: name');
  }

  if (!frontmatter.description || frontmatter.description.trim() === '') {
    errors.push('Missing required field: description');
  }

  // Name format (kebab-case, max 64 chars)
  if (frontmatter.name && !/^[a-z0-9-]+$/.test(frontmatter.name)) {
    errors.push('Name must be kebab-case (lowercase letters, numbers, hyphens)');
  }

  if (frontmatter.name && frontmatter.name.length > 64) {
    errors.push(`Name exceeds 64 characters (${frontmatter.name.length})`);
  }

  // Description length
  if (frontmatter.description && frontmatter.description.length > 2048) {
    errors.push(
      `Description exceeds 2048 characters (${frontmatter.description.length})`
    );
  }

  return errors;
}

/**
 * Check if color matches expected color for agent type
 *
 * @param type - Agent category/type
 * @param color - Color from frontmatter
 * @returns true if color matches expected for type
 */
export function hasCorrectColor(
  type: AgentCategory | undefined,
  color: AgentColor | undefined
): boolean {
  if (!type || !color) {
    return false;
  }

  const expectedColor = COLOR_BY_TYPE[type];
  return color === expectedColor;
}

/**
 * Extract field order from raw YAML frontmatter
 *
 * @param rawYaml - Raw YAML string
 * @returns Array of field names in order they appear
 */
export function extractFieldOrder(rawYaml: string): string[] {
  const lines = rawYaml.split('\n');
  const fieldOrder: string[] = [];

  for (const line of lines) {
    // Match field declarations (name at start of line followed by colon)
    const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/);
    if (match) {
      fieldOrder.push(match[1]);
    }
  }

  return fieldOrder;
}

/**
 * Check if fields are in canonical order
 *
 * @param fieldOrder - Current field order
 * @returns true if fields are in canonical order
 */
export function hasCorrectFieldOrder(fieldOrder: string[]): boolean {
  const canonicalOrder = FRONTMATTER_FIELD_ORDER as readonly string[];

  // Filter to only known fields and compare positions
  const knownFields = fieldOrder.filter((f) =>
    canonicalOrder.includes(f)
  );

  // Check if they're in the right relative order
  let lastIndex = -1;
  for (const field of knownFields) {
    const currentIndex = canonicalOrder.indexOf(field);
    if (currentIndex < lastIndex) {
      return false; // Out of order
    }
    lastIndex = currentIndex;
  }

  return true;
}
