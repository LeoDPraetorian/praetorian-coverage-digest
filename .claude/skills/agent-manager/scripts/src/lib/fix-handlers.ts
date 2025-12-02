/**
 * Fix Handlers
 *
 * Extracted from fix.ts for testability.
 * Contains the applyFix function that handles various fix operations.
 */

import { FixSuggestion } from './types.js';
import { reorderFrontmatter } from './phases/phase1-frontmatter-syntax.js';

/**
 * Convert block scalar content to single-line format with \n escapes
 *
 * Handles:
 * - Indented YAML block scalar content
 * - Preserves paragraph breaks as \n\n
 * - Converts line breaks within paragraphs to \n
 * - Properly formats <example> blocks
 *
 * @param rawContent - The indented content from a block scalar
 * @returns Single-line string with \n escapes
 */
export function convertBlockScalarToSingleLine(rawContent: string): string {
  // Find the minimum indentation level (excluding empty lines)
  const lines = rawContent.split('\n');
  let minIndent = Infinity;

  for (const line of lines) {
    if (line.trim() === '') continue;
    const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
    if (indent < minIndent) minIndent = indent;
  }

  if (minIndent === Infinity) minIndent = 0;

  // Remove the common indentation from all lines
  const dedentedLines = lines.map((line) => {
    if (line.trim() === '') return '';
    return line.substring(minIndent);
  });

  // Join into single text, then process
  const text = dedentedLines.join('\n');

  // Split into paragraphs (separated by blank lines)
  const paragraphs = text.split(/\n\s*\n/);

  // Process each paragraph
  const processedParagraphs = paragraphs.map((para) => {
    const trimmed = para.trim();
    if (!trimmed) return '';

    // Check if this is an example block
    if (trimmed.startsWith('<example>') || trimmed.includes('<example>')) {
      // For example blocks, preserve structure with \n
      return trimmed.split('\n').map(l => l.trim()).filter(l => l).join('\\n');
    }

    // For regular paragraphs, join lines with space (folded style)
    // but convert to single line
    return trimmed.split('\n').map(l => l.trim()).join(' ');
  });

  // Join paragraphs with \n\n
  return processedParagraphs.filter(p => p).join('\\n\\n');
}

/**
 * Apply a fix to agent content
 *
 * @param content - The raw agent file content
 * @param fixId - The fix identifier (e.g., 'phase1-description', 'phase4-add-tool-Read')
 * @param suggestion - The fix suggestion with current/suggested values
 * @param customValue - Optional custom value to use instead of suggested
 * @returns The modified content
 */
export function applyFix(
  content: string,
  fixId: string,
  suggestion: FixSuggestion,
  customValue?: string
): string {
  const value = customValue || suggestion.suggestedValue || '';

  // Handle dynamic IDs by extracting the base pattern
  // e.g., 'phase4-add-tool-Read' -> 'phase4-add-tool'
  // e.g., 'phase8-add-skill-gateway-frontend' -> 'phase8-add-skill'
  const baseId = getBaseFixId(fixId);

  switch (baseId) {
    case 'phase1-description': {
      // Convert block scalar to single-line with proper \n escapes
      // Pattern matches: description: | or > followed by indented content until next field
      const blockScalarPattern =
        /^(description:\s*)[|>][-+]?\s*\n([\s\S]*?)(?=^[a-z]+:\s)/m;
      const match = content.match(blockScalarPattern);

      if (match) {
        const rawContent = match[2];
        const singleLine = convertBlockScalarToSingleLine(rawContent);
        return content.replace(blockScalarPattern, `$1${singleLine}\n`);
      }

      // Fallback: try looser pattern (until ---)
      const loosePattern = /^(description:\s*)[|>][-+]?\s*\n([\s\S]*?)(?=\n---)/m;
      const looseMatch = content.match(loosePattern);
      if (looseMatch) {
        const rawContent = looseMatch[2];
        const singleLine = convertBlockScalarToSingleLine(rawContent);
        return content.replace(loosePattern, `$1${singleLine}\n`);
      }

      return content;
    }

    case 'phase1-name': {
      // Fix name mismatch
      return content.replace(/^name:\s*.+$/m, `name: ${value}`);
    }

    case 'phase1-color':
    case 'phase1-color-missing':
    case 'phase1-color-mismatch':
    case 'phase1-color-invalid': {
      // Add or fix color field
      const colorMatch = content.match(/^color:\s*.+$/m);
      if (colorMatch) {
        // Replace existing color
        return content.replace(/^color:\s*.+$/m, `color: ${value}`);
      } else {
        // Add color field before closing ---
        return content.replace(
          /^(---\n[\s\S]*?)(\n---)/m,
          `$1\ncolor: ${value}$2`
        );
      }
    }

    case 'phase1-permission-mode': {
      // Add or fix permissionMode field
      const modeMatch = content.match(/^permissionMode:\s*.+$/m);
      if (modeMatch) {
        // Replace existing
        return content.replace(
          /^permissionMode:\s*.+$/m,
          `permissionMode: ${value}`
        );
      } else {
        // Add after type field or before tools
        if (content.match(/^type:\s*.+$/m)) {
          return content.replace(
            /^(type:\s*.+)$/m,
            `$1\npermissionMode: ${value}`
          );
        } else {
          return content.replace(
            /^(---\n[\s\S]*?)(\n---)/m,
            `$1\npermissionMode: ${value}$2`
          );
        }
      }
    }

    case 'phase1-ordering': {
      // Reorder frontmatter fields
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontmatterMatch) {
        const reordered = reorderFrontmatter(frontmatterMatch[1]);
        return content.replace(/^---\n[\s\S]*?\n---/, `---\n${reordered}\n---`);
      }
      return content;
    }

    case 'phase1-tools-sort': {
      // Sort tools alphabetically
      return content.replace(/^tools:\s*.+$/m, `tools: ${value}`);
    }

    case 'phase1-skills-sort': {
      // Sort skills alphabetically
      return content.replace(/^skills:\s*.+$/m, `skills: ${value}`);
    }

    case 'phase4-gateway': {
      // Add or replace gateway skill
      const skillsMatch = content.match(/^skills:\s*(.*)$/m);
      if (skillsMatch) {
        // Get current skills, strip quotes if empty string ''
        let currentSkills = skillsMatch[1].trim();
        // Handle empty quotes like '' or ""
        if (currentSkills === "''" || currentSkills === '""') {
          currentSkills = '';
        }

        if (currentSkills && !currentSkills.includes('gateway-')) {
          // Add gateway to existing skills
          return content.replace(
            /^skills:\s*.+$/m,
            `skills: ${currentSkills}, ${value}`
          );
        } else if (!currentSkills) {
          // Handle empty skills field - replace the line
          return content.replace(/^skills:\s*.*$/m, `skills: ${value}`);
        }
      } else {
        // Add skills field to frontmatter (before the closing ---)
        return content.replace(
          /^(---\n[\s\S]*?)(\n---)/m,
          `$1\nskills: ${value}$2`
        );
      }
      return content;
    }

    case 'phase4-replace-path': {
      // Replace library path with gateway
      if (suggestion.currentValue) {
        return content.replace(suggestion.currentValue, value);
      }
      return content;
    }

    case 'phase4-add-tool':
    case 'phase4-recommend-tool': {
      // Add tool to tools field
      const toolsMatch = content.match(/^tools:\s*(.*)$/m);
      if (toolsMatch) {
        const currentTools = toolsMatch[1].trim();
        if (currentTools) {
          return content.replace(/^tools:\s*.+$/m, `tools: ${value}`);
        } else {
          return content.replace(/^tools:\s*$/m, `tools: ${value}`);
        }
      } else {
        // Add tools field to frontmatter (before the closing ---)
        return content.replace(
          /^(---\n[\s\S]*?)(\n---)/m,
          `$1\ntools: ${value}$2`
        );
      }
    }

    case 'phase4-remove-tool': {
      // Remove tool from tools field
      return content.replace(/^tools:\s*.+$/m, `tools: ${value}`);
    }

    case 'phase4-remove-library-skill': {
      // Remove library skill from skills field
      // The 'value' is the new skills string with the library skill removed
      const skillsMatch = content.match(/^skills:\s*(.*)$/m);
      if (skillsMatch) {
        // Handle empty result - if value is '(empty)' or empty, remove the skills field entirely
        if (!value || value === '(empty)' || value.trim() === '') {
          // Remove the skills line entirely
          return content.replace(/^skills:\s*.*\n?/m, '');
        }
        return content.replace(/^skills:\s*.+$/m, `skills: ${value}`);
      }
      return content;
    }

    case 'phase8-add-skill': {
      // Add skill to skills field
      const skillsMatch = content.match(/^skills:\s*(.*)$/m);
      if (skillsMatch) {
        return content.replace(/^skills:\s*.+$/m, `skills: ${value}`);
      } else {
        // Add skills field to frontmatter (before the closing ---)
        return content.replace(
          /^(---\n[\s\S]*?)(\n---)/m,
          `$1\nskills: ${value}$2`
        );
      }
    }

    default:
      // Unknown fix ID - return content unchanged
      return content;
  }
}

/**
 * Extract the base fix ID from a dynamic ID
 *
 * e.g., 'phase4-add-tool-Read' -> 'phase4-add-tool'
 * e.g., 'phase8-add-skill-gateway-frontend' -> 'phase8-add-skill'
 * e.g., 'phase1-color-missing' -> 'phase1-color-missing' (kept as is)
 */
export function getBaseFixId(fixId: string): string {
  // Known fix ID patterns that have dynamic suffixes
  const dynamicPatterns = [
    'phase4-add-tool',
    'phase4-remove-tool',
    'phase4-recommend-tool',
    'phase4-replace-path',
    'phase4-remove-library-skill',
    'phase8-add-skill',
    'phase8-suggest-skill',
    'phase7-phantom-skill',
    'phase7-deprecated-skill',
  ];

  for (const pattern of dynamicPatterns) {
    if (fixId.startsWith(pattern + '-')) {
      return pattern;
    }
  }

  // Return as-is for static IDs
  return fixId;
}
