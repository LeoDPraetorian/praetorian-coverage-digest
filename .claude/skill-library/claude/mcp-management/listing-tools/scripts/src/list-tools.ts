#!/usr/bin/env tsx
/**
 * List MCP Tool Services
 *
 * Fast discovery of all tool services in .claude/tools/ with descriptions.
 * Replaces bash-based listing (~90s) with single invocation (~2-3s).
 *
 * Usage:
 *   npx tsx .claude/skill-library/claude/mcp-management/listing-tools/scripts/src/list-tools.ts          # Text output
 *   npx tsx .claude/skill-library/claude/mcp-management/listing-tools/scripts/src/list-tools.ts --json   # JSON output
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Types ---

const ToolServiceSchema = z.object({
  name: z.string(),
  description: z.string(),
  path: z.string(),
});

type ToolService = z.infer<typeof ToolServiceSchema>;

const ListToolsOutputSchema = z.object({
  services: z.array(ToolServiceSchema),
  total: z.number(),
  excludedDirs: z.array(z.string()),
});

type ListToolsOutput = z.infer<typeof ListToolsOutputSchema>;

// --- Configuration ---

const EXCLUDED_DIRS = ['internal', 'config'] as const;
const NAME_COLUMN_WIDTH = 20;

// --- Core Functions ---

/**
 * Discover all tool service directories
 */
function discoverToolServices(): ToolService[] {
  // Resolve tools directory: go up 7 levels from scripts/src to .claude directory
  // Path: src -> scripts -> listing-tools -> mcp-management -> claude -> skill-library -> .claude
  const toolsDir = path.resolve(__dirname, '../../../../../../tools');

  // Read directory entries
  const entries = fs.readdirSync(toolsDir, { withFileTypes: true });

  // Filter to directories, excluding hidden and internal dirs
  const serviceDirs = entries.filter(entry =>
    entry.isDirectory() &&
    !entry.name.startsWith('.') &&
    !EXCLUDED_DIRS.includes(entry.name as any)
  );

  // Map to ToolService objects
  return serviceDirs.map(dir => {
    const servicePath = path.join(toolsDir, dir.name);
    const packageJsonPath = path.join(servicePath, 'package.json');

    let description = 'No package.json';

    if (fs.existsSync(packageJsonPath)) {
      try {
        const content = fs.readFileSync(packageJsonPath, 'utf-8');
        const pkg = JSON.parse(content);
        description = pkg.description || 'No description';
      } catch {
        description = 'Invalid package.json';
      }
    }

    return {
      name: dir.name,
      description,
      path: `.claude/tools/${dir.name}`,
    };
  });
}

/**
 * Format output as aligned text table
 */
function formatTextOutput(services: ToolService[]): string {
  const lines: string[] = [];

  lines.push('=== MCP TOOLS ===');
  lines.push('');

  // Sort alphabetically by name
  const sorted = [...services].sort((a, b) => a.name.localeCompare(b.name));

  for (const service of sorted) {
    const paddedName = service.name.padEnd(NAME_COLUMN_WIDTH);
    lines.push(`${paddedName} - ${service.description}`);
  }

  lines.push('');
  lines.push(`TOTAL: ${services.length} tool services`);

  return lines.join('\n');
}

/**
 * Format output as JSON
 */
function formatJsonOutput(services: ToolService[]): string {
  const output: ListToolsOutput = {
    services: services.sort((a, b) => a.name.localeCompare(b.name)),
    total: services.length,
    excludedDirs: [...EXCLUDED_DIRS],
  };

  // Validate output schema
  const validated = ListToolsOutputSchema.parse(output);

  return JSON.stringify(validated, null, 2);
}

// --- CLI Entry Point ---

function main(): void {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');

  const services = discoverToolServices();

  if (jsonMode) {
    console.log(formatJsonOutput(services));
  } else {
    console.log(formatTextOutput(services));
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export for programmatic use
export { discoverToolServices, formatTextOutput, formatJsonOutput };
export type { ToolService, ListToolsOutput };
