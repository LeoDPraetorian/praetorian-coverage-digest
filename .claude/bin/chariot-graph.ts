#!/usr/bin/env -S npx tsx
/**
 * Chariot Graph CLI - Directory-independent access to Chariot graph database
 *
 * Usage:
 *   npx claude-chariot-graph query --labels Asset --filter "status=A"
 *   npx claude-chariot-graph assets [--status STATUS] [--class CLASS]
 *   npx claude-chariot-graph risks [--cvss-min N]
 *   npx claude-chariot-graph schema
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Resolve paths relative to this script, not cwd
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const toolsDir = resolve(__dirname, '../tools/chariot');

interface CliResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

interface Filter {
  field: string;
  operator: string;
  value: string | number | boolean;
}

function showHelp(): void {
  console.log(`
Chariot Graph CLI - Query Chariot graph database (Neo4j)

USAGE:
  npx claude-chariot-graph <command> [options]

COMMANDS:
  query                       Execute custom graph query
  assets                      Query assets (shortcut)
  risks                       Query risks (shortcut)
  schema                      Get graph schema

QUERY OPTIONS:
  --labels LABELS        Node labels (comma-separated: Asset,Risk)
  --filter FILTER        Filter expression (field=value, can repeat)
  --limit N              Result limit (default: 100)
  --page N               Page number (default: 0)
  --order-by FIELD       Sort by field
  --desc                 Sort descending

SHORTCUT OPTIONS:
  --status STATUS        Filter by status (A=active, F=frozen, etc.)
  --class CLASS          Filter by class (domain, ipv4, etc.)
  --cvss-min N           Minimum CVSS score (for risks)
  --tree                 Include relationship tree

GENERAL OPTIONS:
  --stack STACK          Stack name (default: from env)
  --username USER        Username (default: from env)
  --json                 Output raw JSON
  --help                 Show this help message

FILTER SYNTAX:
  field=value            Equality (status=A)
  field>value            Greater than (cvss>7)
  field<value            Less than (cvss<5)
  field>=value           Greater or equal
  field<=value           Less or equal

EXAMPLES:
  npx claude-chariot-graph assets --status A --class domain
  npx claude-chariot-graph risks --cvss-min 7 --limit 50
  npx claude-chariot-graph query --labels Asset --filter "status=A" --filter "class=ipv4"
  npx claude-chariot-graph schema

ENVIRONMENT:
  PRAETORIAN_CLI_USERNAME    Your Chariot username
  PRAETORIAN_CLI_PASSWORD    Your Chariot password
  CHARIOT_STACK              Stack name (optional)
`);
}

function parseArgs(args: string[]): {
  command: string;
  positional: string[];
  options: Record<string, string | boolean | string[]>;
} {
  const options: Record<string, string | boolean | string[]> = {};
  const positional: string[] = [];
  const filters: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--desc') {
      options.desc = true;
    } else if (arg === '--tree') {
      options.tree = true;
    } else if (arg === '--labels' && args[i + 1]) {
      options.labels = args[++i];
    } else if (arg === '--filter' && args[i + 1]) {
      filters.push(args[++i]);
    } else if (arg === '--limit' && args[i + 1]) {
      options.limit = args[++i];
    } else if (arg === '--page' && args[i + 1]) {
      options.page = args[++i];
    } else if (arg === '--order-by' && args[i + 1]) {
      options.orderBy = args[++i];
    } else if (arg === '--status' && args[i + 1]) {
      options.status = args[++i];
    } else if (arg === '--class' && args[i + 1]) {
      options.class = args[++i];
    } else if (arg === '--cvss-min' && args[i + 1]) {
      options.cvssMin = args[++i];
    } else if (arg === '--stack' && args[i + 1]) {
      options.stack = args[++i];
    } else if (arg === '--username' && args[i + 1]) {
      options.username = args[++i];
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  if (filters.length > 0) {
    options.filters = filters;
  }

  return {
    command: positional[0] || '',
    positional: positional.slice(1),
    options,
  };
}

function parseFilter(filterStr: string): Filter | null {
  // Match patterns like: field=value, field>value, field<value, etc.
  const match = filterStr.match(/^(\w+)(=|>|<|>=|<=)(.+)$/);
  if (!match) return null;

  const [, field, op, rawValue] = match;

  // Convert operator to graph query format
  const operatorMap: Record<string, string> = {
    '=': '=',
    '>': '>',
    '<': '<',
    '>=': '>=',
    '<=': '<=',
  };

  // Parse value type
  let value: string | number | boolean = rawValue;
  if (rawValue === 'true') value = true;
  else if (rawValue === 'false') value = false;
  else if (!isNaN(Number(rawValue))) value = Number(rawValue);

  return {
    field,
    operator: operatorMap[op] || '=',
    value,
  };
}

function buildQueryStructure(
  labels: string[],
  filters: Filter[],
  limit: number,
  page: number,
  orderBy?: string,
  descending?: boolean
): string {
  const query: Record<string, unknown> = {
    node: {
      labels,
      filters: filters.map(f => ({
        field: f.field,
        operator: f.operator,
        value: f.value,
      })),
    },
    limit,
    page,
  };

  if (orderBy) {
    query.orderBy = orderBy;
    query.descending = descending ?? false;
  }

  return JSON.stringify(query);
}

async function runQuery(
  queryJson: string,
  stack?: string,
  username?: string,
  tree = false
): Promise<CliResult> {
  const { query } = await import(`${toolsDir}/query.ts`);

  // Get credentials from environment if not provided
  const finalStack = stack || process.env.CHARIOT_STACK || 'chariot';
  const finalUsername = username || process.env.PRAETORIAN_CLI_USERNAME || '';

  if (!finalUsername) {
    throw new Error('Username required. Set PRAETORIAN_CLI_USERNAME or use --username');
  }

  const result = await query.execute({
    query: queryJson,
    stack: finalStack,
    username: finalUsername,
    tree,
  });

  return { success: true, data: result };
}

async function runSchema(): Promise<CliResult> {
  const { schema } = await import(`${toolsDir}/schema.ts`);
  const result = await schema.execute({});
  return { success: true, data: result };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, options } = parseArgs(args);

  if (options.help || !command) {
    showHelp();
    process.exit(command ? 0 : 1);
  }

  const limit = parseInt(options.limit as string) || 100;
  const page = parseInt(options.page as string) || 0;

  try {
    let result: CliResult;

    switch (command) {
      case 'query': {
        // Parse labels
        const labels = (options.labels as string)?.split(',') || ['Asset'];

        // Parse filters
        const filters: Filter[] = [];
        if (options.filters) {
          for (const f of options.filters as string[]) {
            const parsed = parseFilter(f);
            if (parsed) filters.push(parsed);
          }
        }

        const queryJson = buildQueryStructure(
          labels,
          filters,
          limit,
          page,
          options.orderBy as string,
          !!options.desc
        );

        result = await runQuery(
          queryJson,
          options.stack as string,
          options.username as string,
          !!options.tree
        );
        break;
      }

      case 'assets': {
        // Build asset-specific query
        const filters: Filter[] = [];
        if (options.status) {
          filters.push({ field: 'status', operator: '=', value: options.status as string });
        }
        if (options.class) {
          filters.push({ field: 'class', operator: '=', value: options.class as string });
        }

        const queryJson = buildQueryStructure(
          ['Asset'],
          filters,
          limit,
          page,
          options.orderBy as string,
          !!options.desc
        );

        result = await runQuery(
          queryJson,
          options.stack as string,
          options.username as string,
          !!options.tree
        );
        break;
      }

      case 'risks': {
        // Build risk-specific query
        const filters: Filter[] = [];
        if (options.cvssMin) {
          filters.push({ field: 'cvss', operator: '>=', value: parseFloat(options.cvssMin as string) });
        }
        if (options.status) {
          filters.push({ field: 'status', operator: '=', value: options.status as string });
        }

        const queryJson = buildQueryStructure(
          ['Risk'],
          filters,
          limit,
          page,
          options.orderBy as string || 'cvss',
          options.desc !== undefined ? !!options.desc : true // Default descending for risks
        );

        result = await runQuery(
          queryJson,
          options.stack as string,
          options.username as string,
          !!options.tree
        );
        break;
      }

      case 'schema':
        result = await runSchema();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.error('Run with --help for usage information');
        process.exit(1);
    }

    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
