#!/usr/bin/env tsx
/**
 * Tool Discovery for Progressive Loading
 *
 * Allows agents to discover available tools without loading all definitions.
 * Returns summary of tools by category with usage examples.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ToolSummary {
  name: string;
  category: string;
  summary: string;
  importPath: string;
  estimatedTokens: number;
}

/**
 * Discover available tools by category
 *
 * @param category - Filter by category (praetorian-cli, linear, context7, currents, playwright)
 * @param search - Search term to filter tool names
 * @returns List of available tools with summaries
 */
export async function discoverTools(
  category?: string,
  search?: string
): Promise<ToolSummary[]> {
  const toolsDir = path.join(__dirname);
  const categories = category
    ? [category]
    : fs.readdirSync(toolsDir).filter(f => {
        const stat = fs.statSync(path.join(toolsDir, f));
        return stat.isDirectory() && !f.startsWith('.');
      });

  const tools: ToolSummary[] = [];

  for (const cat of categories) {
    const catDir = path.join(toolsDir, cat);
    if (!fs.existsSync(catDir)) continue;

    const files = fs.readdirSync(catDir)
      .filter(f => f.endsWith('.ts') && !f.includes('index') && !f.includes('test'));

    for (const file of files) {
      const toolName = file.replace('.ts', '');

      // Skip if search term doesn't match
      if (search && !toolName.includes(search)) continue;

      // Read first few lines for summary
      const content = fs.readFileSync(path.join(catDir, file), 'utf-8');
      const lines = content.split('\n').slice(0, 5);
      const summary = lines
        .filter(l => l.startsWith('//'))
        .map(l => l.replace(/^\/\/\s*/, ''))
        .join(' ')
        .slice(0, 100);

      tools.push({
        name: toolName,
        category: cat,
        summary: summary || `${cat} tool: ${toolName}`,
        importPath: `.claude/tools/${cat}/${file}`,
        estimatedTokens: 50 // Each tool def ~50 tokens
      });
    }
  }

  return tools;
}

/**
 * Get detailed usage for a specific tool
 *
 * @param category - Tool category
 * @param toolName - Tool name
 * @returns Import example and usage pattern
 */
export async function getToolUsage(category: string, toolName: string): Promise<string> {
  const toolPath = path.join(__dirname, category, `${toolName}.ts`);

  if (!fs.existsSync(toolPath)) {
    throw new Error(`Tool not found: ${category}/${toolName}`);
  }

  // Read the tool file to extract types and examples
  const content = fs.readFileSync(toolPath, 'utf-8');

  // Extract input/output types
  const inputMatch = content.match(/type (\w+Input) = z\.infer/);
  const outputMatch = content.match(/type (\w+Output) = z\.infer/);

  const inputType = inputMatch ? inputMatch[1] : 'any';
  const outputType = outputMatch ? outputMatch[1] : 'any';

  return `
# Usage for ${category}/${toolName}

\`\`\`typescript
import { ${toolName}, type ${inputType}, type ${outputType} } from '.claude/tools/${category}/${toolName}';

// Example usage
const result = await ${toolName}.execute({
  // Add parameters here based on ${inputType}
});

console.log(result); // Returns ${outputType}
\`\`\`

Import path: \`.claude/tools/${category}/${toolName}.ts\`
`;
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const category = process.argv[2];
  const search = process.argv[3];

  discoverTools(category, search).then(tools => {
    console.log(`Found ${tools.length} tools:\n`);

    for (const tool of tools) {
      console.log(`📦 ${tool.category}/${tool.name}`);
      console.log(`   ${tool.summary}`);
      console.log(`   Import: ${tool.importPath}`);
      console.log('');
    }
  });
}
