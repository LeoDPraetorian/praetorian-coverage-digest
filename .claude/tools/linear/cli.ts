#!/usr/bin/env npx tsx
/**
 * Linear CLI Runner
 *
 * Provides a file-based entry point for Linear operations,
 * avoiding tsx -e inline evaluation issues with module resolution.
 *
 * Usage:
 *   npx tsx .claude/tools/linear/cli.ts <operation> '<json-params>'
 *
 * Examples:
 *   npx tsx cli.ts create-issue '{"title":"Test","team":"Engineering"}'
 *   npx tsx cli.ts list-issues '{"limit":10}'
 *   npx tsx cli.ts get-issue '{"id":"ENG-123"}'
 */

import { z } from 'zod';

// Result type for operations
export type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

// Parsed CLI arguments
export interface ParsedArgs {
  operation: string;
  params: Record<string, unknown>;
}

// Operation registry type
export interface OperationRegistry {
  createIssue?: (params: unknown) => Promise<unknown>;
  createComment?: (params: unknown) => Promise<unknown>;
  listIssues?: (params: unknown) => Promise<unknown>;
  getIssue?: (params: unknown) => Promise<unknown>;
  updateIssue?: (params: unknown) => Promise<unknown>;
  findIssue?: (params: unknown) => Promise<unknown>;
  listTeams?: (params: unknown) => Promise<unknown>;
  listProjects?: (params: unknown) => Promise<unknown>;
  listProjectTemplates?: (params: unknown) => Promise<unknown>;
  getTemplate?: (params: unknown) => Promise<unknown>;
}

// Available operations (kebab-case to camelCase mapping)
const OPERATIONS: Record<string, keyof OperationRegistry> = {
  'create-issue': 'createIssue',
  'create-comment': 'createComment',
  'list-issues': 'listIssues',
  'get-issue': 'getIssue',
  'update-issue': 'updateIssue',
  'find-issue': 'findIssue',
  'list-teams': 'listTeams',
  'list-projects': 'listProjects',
  'list-project-templates': 'listProjectTemplates',
  'get-template': 'getTemplate',
};

/**
 * Parse CLI arguments into operation and params
 */
export function parseCliArgs(args: string[]): Result<ParsedArgs> {
  if (args.length < 1) {
    return {
      ok: false,
      error: `Usage: npx tsx cli.ts <operation> '<json-params>'

Available operations:
${Object.keys(OPERATIONS).map(op => `  - ${op}`).join('\n')}

Example:
  npx tsx cli.ts create-issue '{"title":"Test","team":"Engineering"}'`,
    };
  }

  const operation = args[0];
  const jsonParams = args[1] || '{}';

  // Validate operation
  if (!OPERATIONS[operation]) {
    return {
      ok: false,
      error: `Unknown operation: ${operation}

Available operations:
${Object.keys(OPERATIONS).map(op => `  - ${op}`).join('\n')}`,
    };
  }

  // Parse JSON params
  let params: Record<string, unknown>;
  try {
    params = JSON.parse(jsonParams);
  } catch (e) {
    return {
      ok: false,
      error: `Invalid JSON parameters: ${e instanceof Error ? e.message : String(e)}

Received: ${jsonParams}

Expected: Valid JSON object, e.g., '{"title":"Test","team":"Engineering"}'`,
    };
  }

  return {
    ok: true,
    value: { operation, params },
  };
}

/**
 * Route operation to appropriate wrapper
 */
export async function routeOperation(
  operation: string,
  params: Record<string, unknown>,
  registry?: Partial<OperationRegistry>
): Promise<Result<unknown>> {
  const camelCase = OPERATIONS[operation];

  if (!camelCase) {
    return {
      ok: false,
      error: `Unknown operation: ${operation}

Available operations:
${Object.keys(OPERATIONS).map(op => `  - ${op}`).join('\n')}`,
    };
  }

  try {
    // Use injected registry for testing, or dynamically import for production
    let executor: ((params: unknown) => Promise<unknown>) | undefined;

    if (registry && registry[camelCase]) {
      executor = registry[camelCase];
    } else {
      // Dynamic import of wrapper modules
      const wrapperMap: Record<string, string> = {
        createIssue: './create-issue.js',
        createComment: './create-comment.js',
        listIssues: './list-issues.js',
        getIssue: './get-issue.js',
        updateIssue: './update-issue.js',
        findIssue: './find-issue.js',
        listTeams: './list-teams.js',
        listProjects: './list-projects.js',
        listProjectTemplates: './list-project-templates.js',
        getTemplate: './get-template.js',
      };

      const modulePath = wrapperMap[camelCase];
      if (!modulePath) {
        throw new Error(`No module mapping for: ${camelCase}`);
      }

      const module = await import(modulePath);
      const wrapper = module[camelCase];

      if (!wrapper || typeof wrapper.execute !== 'function') {
        throw new Error(`Wrapper ${camelCase} not found or missing execute method`);
      }

      executor = (p) => wrapper.execute(p);
    }

    if (!executor) {
      throw new Error(`No executor found for: ${camelCase}`);
    }

    const result = await executor(params);
    return { ok: true, value: result };

  } catch (error) {
    // Extract helpful error message
    const message = error instanceof Error ? error.message : String(error);

    // Check for common error patterns and add context
    if (message.includes('not found')) {
      return {
        ok: false,
        error: `${message}\n\nTip: Check that the name matches exactly (case-sensitive).`,
      };
    }

    if (message.includes('GraphQL') || message.includes('validation')) {
      return {
        ok: false,
        error: `Linear API Error: ${message}\n\nCheck that all required fields are provided and valid.`,
      };
    }

    return { ok: false, error: message };
  }
}

/**
 * Main entry point
 */
async function main() {
  // Get args after 'cli.ts'
  const args = process.argv.slice(2);

  const parsed = parseCliArgs(args);
  if (!parsed.ok) {
    console.error(parsed.error);
    process.exit(1);
  }

  const result = await routeOperation(parsed.value.operation, parsed.value.params);

  if (!result.ok) {
    console.error(JSON.stringify({ error: result.error }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(result.value, null, 2));
}

// Only run main when executed directly (not when imported for testing)
if (process.argv[1]?.endsWith('cli.ts') || process.argv[1]?.endsWith('cli.js')) {
  main().catch((error) => {
    console.error(JSON.stringify({ error: error.message }, null, 2));
    process.exit(1);
  });
}
