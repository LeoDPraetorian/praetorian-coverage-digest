/**
 * Context7 Integration Helpers
 *
 * Functions for parsing context7 documentation and generating skill content
 */

import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import {
  Context7Data,
  Context7DocsContent,
  Context7SourceMetadata,
  Context7DiffResult,
  Context7ApiFunction,
  Context7CodeExample,
  Context7Pattern,
} from './types.js';

/**
 * Parse and validate context7 JSON data from a file
 */
export function parseContext7Data(jsonPath: string): Context7Data {
  if (!existsSync(jsonPath)) {
    throw new Error(`Context7 data file not found: ${jsonPath}`);
  }

  const rawContent = readFileSync(jsonPath, 'utf-8');
  let data: unknown;

  try {
    data = JSON.parse(rawContent);
  } catch {
    throw new Error(`Invalid JSON in context7 data file: ${jsonPath}`);
  }

  // Validate required fields
  if (!data || typeof data !== 'object') {
    throw new Error('Context7 data must be an object');
  }

  const obj = data as Record<string, unknown>;

  if (!obj.libraryName || typeof obj.libraryName !== 'string') {
    throw new Error('Context7 data missing required field: libraryName');
  }

  if (!obj.libraryId || typeof obj.libraryId !== 'string') {
    throw new Error('Context7 data missing required field: libraryId');
  }

  // Parse content - can be raw string or structured
  let content: Context7DocsContent;
  if (typeof obj.content === 'string') {
    content = {
      rawDocs: obj.content,
      apiFunctions: extractApiFunctions(obj.content),
      codeExamples: extractCodeExamples(obj.content),
      patterns: extractPatterns(obj.content),
    };
  } else if (obj.content && typeof obj.content === 'object') {
    const contentObj = obj.content as Record<string, unknown>;
    content = {
      rawDocs: typeof contentObj.rawDocs === 'string' ? contentObj.rawDocs : '',
      apiFunctions: Array.isArray(contentObj.apiFunctions) ? contentObj.apiFunctions : undefined,
      codeExamples: Array.isArray(contentObj.codeExamples) ? contentObj.codeExamples : undefined,
      patterns: Array.isArray(contentObj.patterns) ? contentObj.patterns : undefined,
      troubleshooting: Array.isArray(contentObj.troubleshooting) ? contentObj.troubleshooting : undefined,
    };
  } else {
    throw new Error('Context7 data missing required field: content');
  }

  return {
    libraryName: obj.libraryName,
    libraryId: obj.libraryId,
    fetchedAt: typeof obj.fetchedAt === 'string' ? obj.fetchedAt : new Date().toISOString(),
    version: typeof obj.version === 'string' ? obj.version : undefined,
    content,
  };
}

/**
 * Extract API functions from raw documentation text
 */
function extractApiFunctions(rawDocs: string): Context7ApiFunction[] {
  const functions: Context7ApiFunction[] = [];

  // Match TypeScript/JavaScript function signatures
  const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(<[^>]+>)?\s*\(([^)]*)\)\s*(?::\s*([^\n{]+))?/g;
  let match;

  while ((match = functionRegex.exec(rawDocs)) !== null) {
    const [, name, generics, params, returnType] = match;
    functions.push({
      name: name + (generics || ''),
      signature: match[0].trim(),
      description: extractDescriptionBefore(rawDocs, match.index),
      returnType: returnType?.trim(),
    });
  }

  // Match hook patterns (useXxx)
  const hookRegex = /(?:export\s+)?(?:const|function)\s+(use\w+)\s*[=:]/g;
  while ((match = hookRegex.exec(rawDocs)) !== null) {
    const [, name] = match;
    if (!functions.find(f => f.name === name)) {
      functions.push({
        name,
        description: extractDescriptionBefore(rawDocs, match.index),
      });
    }
  }

  return functions;
}

/**
 * Extract code examples from raw documentation
 */
function extractCodeExamples(rawDocs: string): Context7CodeExample[] {
  const examples: Context7CodeExample[] = [];

  // Match markdown code blocks
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  let exampleIndex = 0;

  while ((match = codeBlockRegex.exec(rawDocs)) !== null) {
    const [, language = 'typescript', code] = match;

    // Try to find a title from preceding text
    const precedingText = rawDocs.slice(Math.max(0, match.index - 200), match.index);
    const titleMatch = precedingText.match(/(?:###?\s+)?([^\n]+)$/);

    examples.push({
      title: titleMatch?.[1]?.trim() || `Example ${++exampleIndex}`,
      code: code.trim(),
      language: language || 'typescript',
      category: categorizeExample(code),
    });
  }

  return examples;
}

/**
 * Extract common patterns from documentation
 */
function extractPatterns(rawDocs: string): Context7Pattern[] {
  const patterns: Context7Pattern[] = [];

  // Look for pattern sections (## Pattern, ### Pattern, etc.)
  const patternRegex = /#{2,3}\s+(?:Pattern|Usage|Example):\s*([^\n]+)\n([\s\S]*?)(?=#{2,3}|$)/gi;
  let match;

  while ((match = patternRegex.exec(rawDocs)) !== null) {
    const [, name, content] = match;
    patterns.push({
      name: name.trim(),
      description: content.split('\n')[0]?.trim() || '',
      when: extractWhenToUse(content),
    });
  }

  return patterns;
}

/**
 * Extract description from text before a match
 */
function extractDescriptionBefore(text: string, index: number): string {
  const preceding = text.slice(Math.max(0, index - 500), index);
  const lines = preceding.split('\n').filter(l => l.trim());
  const lastLine = lines[lines.length - 1];

  // Skip if it looks like code
  if (lastLine?.match(/^[\s{}\[\]();]|^\s*\/\//)) {
    return '';
  }

  return lastLine?.replace(/^[/*\s]+/, '').trim() || '';
}

/**
 * Categorize a code example based on its content
 */
function categorizeExample(code: string): 'basic' | 'advanced' | 'edge-case' {
  const advancedPatterns = /async|await|Promise|useCallback|useMemo|useReducer|context|provider|middleware/i;
  const edgeCasePatterns = /error|catch|try|fallback|loading|suspense|boundary/i;

  if (edgeCasePatterns.test(code)) return 'edge-case';
  if (advancedPatterns.test(code)) return 'advanced';
  return 'basic';
}

/**
 * Extract "when to use" information from content
 */
function extractWhenToUse(content: string): string {
  const whenMatch = content.match(/(?:when|use this when|useful for)[:\s]+([^\n.]+)/i);
  return whenMatch?.[1]?.trim() || 'See pattern description';
}

/**
 * Generate hash for content comparison
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Generate references/api-reference.md content from context7 data
 */
export function generateApiReference(data: Context7Data): string {
  const { libraryName, content } = data;
  const functions = content.apiFunctions || [];

  let md = `# ${titleCase(libraryName)} API Reference\n\n`;
  md += `> Auto-generated from context7 documentation on ${data.fetchedAt.split('T')[0]}\n\n`;

  if (functions.length === 0) {
    md += `## API Functions\n\n`;
    md += `*No API functions were automatically extracted. Please add them manually.*\n\n`;
    return md;
  }

  md += `## Functions\n\n`;

  for (const func of functions) {
    md += `### \`${func.name}\`\n\n`;

    if (func.description) {
      md += `${func.description}\n\n`;
    }

    if (func.signature) {
      md += `**Signature:**\n\`\`\`typescript\n${func.signature}\n\`\`\`\n\n`;
    }

    if (func.parameters && func.parameters.length > 0) {
      md += `**Parameters:**\n\n`;
      md += `| Name | Type | Description |\n`;
      md += `|------|------|-------------|\n`;
      for (const param of func.parameters) {
        md += `| \`${param.name}\` | \`${param.type}\` | ${param.description} |\n`;
      }
      md += `\n`;
    }

    if (func.returnType) {
      md += `**Returns:** \`${func.returnType}\`\n\n`;
    }

    if (func.example) {
      md += `**Example:**\n\`\`\`typescript\n${func.example}\n\`\`\`\n\n`;
    }

    md += `---\n\n`;
  }

  return md;
}

/**
 * Generate references/patterns.md content from context7 data
 */
export function generatePatterns(data: Context7Data): string {
  const { libraryName, content } = data;
  const patterns = content.patterns || [];

  let md = `# ${titleCase(libraryName)} Patterns\n\n`;
  md += `> Common usage patterns and best practices\n\n`;

  if (patterns.length === 0) {
    md += `## Common Patterns\n\n`;
    md += `*No patterns were automatically extracted. Add common patterns here.*\n\n`;
    md += `### Pattern Template\n\n`;
    md += `**When to use:** [Describe scenario]\n\n`;
    md += `\`\`\`typescript\n// Pattern code here\n\`\`\`\n\n`;
    return md;
  }

  for (const pattern of patterns) {
    md += `## ${pattern.name}\n\n`;
    md += `${pattern.description}\n\n`;
    md += `**When to use:** ${pattern.when}\n\n`;

    if (pattern.code) {
      md += `\`\`\`typescript\n${pattern.code}\n\`\`\`\n\n`;
    }
  }

  return md;
}

/**
 * Generate examples/basic-usage.md content from context7 data
 */
export function generateExamples(data: Context7Data): string {
  const { libraryName, content } = data;
  const examples = content.codeExamples || [];

  let md = `# ${titleCase(libraryName)} Examples\n\n`;

  const basicExamples = examples.filter(e => e.category === 'basic');
  const advancedExamples = examples.filter(e => e.category === 'advanced');
  const edgeCaseExamples = examples.filter(e => e.category === 'edge-case');

  if (examples.length === 0) {
    md += `## Basic Usage\n\n`;
    md += `\`\`\`typescript\n// Add basic usage example here\n\`\`\`\n\n`;
    return md;
  }

  if (basicExamples.length > 0) {
    md += `## Basic Usage\n\n`;
    for (const ex of basicExamples) {
      md += `### ${ex.title}\n\n`;
      if (ex.description) md += `${ex.description}\n\n`;
      md += `\`\`\`${ex.language}\n${ex.code}\n\`\`\`\n\n`;
    }
  }

  if (advancedExamples.length > 0) {
    md += `## Advanced Usage\n\n`;
    for (const ex of advancedExamples) {
      md += `### ${ex.title}\n\n`;
      if (ex.description) md += `${ex.description}\n\n`;
      md += `\`\`\`${ex.language}\n${ex.code}\n\`\`\`\n\n`;
    }
  }

  if (edgeCaseExamples.length > 0) {
    md += `## Edge Cases & Error Handling\n\n`;
    for (const ex of edgeCaseExamples) {
      md += `### ${ex.title}\n\n`;
      if (ex.description) md += `${ex.description}\n\n`;
      md += `\`\`\`${ex.language}\n${ex.code}\n\`\`\`\n\n`;
    }
  }

  return md;
}

/**
 * Generate SKILL.md content for library/framework skills
 */
export function generateLibrarySkillTemplate(
  name: string,
  description: string,
  data: Context7Data
): string {
  const { libraryName, version, fetchedAt, content } = data;
  const functions = content.apiFunctions || [];
  const dateStr = fetchedAt.split('T')[0];

  // Build API quick reference table (top 5 functions)
  let apiTable = '';
  if (functions.length > 0) {
    apiTable = `| Function | Purpose | Example |\n`;
    apiTable += `|----------|---------|----------|\n`;
    for (const func of functions.slice(0, 5)) {
      const example = func.example ? `\`${func.example.split('\n')[0]?.slice(0, 30)}...\`` : '-';
      apiTable += `| \`${func.name}\` | ${func.description.slice(0, 50)} | ${example} |\n`;
    }
  } else {
    apiTable = `| Function | Purpose | Example |\n`;
    apiTable += `|----------|---------|----------|\n`;
    apiTable += `| *Add functions* | - | - |\n`;
  }

  return `---
name: ${name}
description: ${description}
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
skill-type: library
---

# ${titleCase(name)}

## Version & Dependencies

| Package | Version | Docs Source |
|---------|---------|-------------|
| ${libraryName} | ${version || 'latest'} | context7 (${dateStr}) |

## Overview

${content.rawDocs.split('\n').slice(0, 5).join('\n') || '[Library overview - auto-populated from context7]'}

## API Quick Reference

${apiTable}

See [references/api-reference.md](references/api-reference.md) for full API documentation.

## When to Use

Use this skill when:
- Working with ${libraryName}
- Implementing ${libraryName} patterns in Chariot
- Troubleshooting ${libraryName} issues

## Common Patterns

See [references/patterns.md](references/patterns.md) for detailed patterns.

${(content.patterns || []).slice(0, 2).map(p => `### ${p.name}\n${p.description}\n`).join('\n') || '### Pattern 1\n[Pattern description - add from patterns.md]\n'}

## Examples

See [examples/basic-usage.md](examples/basic-usage.md) for complete examples.

## Troubleshooting

${(content.troubleshooting || []).slice(0, 3).map(t => `**${t.issue}**\n${t.solution}\n`).join('\n') || '*Add common issues and solutions here*'}

## References

- [API Reference](references/api-reference.md)
- [Common Patterns](references/patterns.md)
- [Examples](examples/basic-usage.md)
`;
}

/**
 * Create context7 source metadata for storage
 */
export function createContext7SourceMetadata(data: Context7Data): Context7SourceMetadata {
  return {
    libraryName: data.libraryName,
    libraryId: data.libraryId,
    fetchedAt: data.fetchedAt,
    version: data.version,
    docsHash: hashContent(data.content.rawDocs),
  };
}

/**
 * Compare context7 data and generate diff summary
 */
export function compareContext7Data(
  oldMetadata: Context7SourceMetadata,
  newData: Context7Data
): Context7DiffResult {
  const newHash = hashContent(newData.content.rawDocs);
  const hasChanges = oldMetadata.docsHash !== newHash;

  if (!hasChanges) {
    return {
      hasChanges: false,
      newApis: [],
      deprecatedApis: [],
      changedSignatures: [],
      updatedExamples: 0,
      summary: 'No changes detected in documentation.',
    };
  }

  // For now, return a simple diff result
  // A more sophisticated implementation would parse and compare the actual content
  const newApis = newData.content.apiFunctions?.map(f => f.name) || [];

  return {
    hasChanges: true,
    newApis,
    deprecatedApis: [], // Would need old data to compare
    changedSignatures: [],
    updatedExamples: newData.content.codeExamples?.length || 0,
    summary: `Documentation has been updated. Found ${newApis.length} API functions and ${newData.content.codeExamples?.length || 0} examples.`,
  };
}

/**
 * Title case a string
 */
function titleCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate context7 instructions for suggest mode output
 */
export function generateContext7Instructions(
  skillName: string,
  libraryName: string,
  location: string,
  skillType: string
): { libraryName: string; steps: string[] } {
  return {
    libraryName,
    steps: [
      '1. Use context7 MCP resolve-library-id tool to find the library ID',
      '2. Use context7 MCP get-library-docs tool to fetch documentation',
      `3. Save results to a temp file (e.g., /tmp/context7-${skillName}.json)`,
      `4. Re-run create with: npm run create -- ${skillName} "<description>" --location ${location} --skill-type ${skillType} --context7-data /tmp/context7-${skillName}.json`,
    ],
  };
}
