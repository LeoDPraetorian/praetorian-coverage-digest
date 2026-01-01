#!/usr/bin/env -S npx tsx
/**
 * Chariot API CLI - Directory-independent access to Chariot platform via Praetorian CLI
 *
 * Usage:
 *   npx claude-chariot-api assets [--prefix PREFIX] [--type TYPE]
 *   npx claude-chariot-api asset <key>
 *   npx claude-chariot-api risks [--pages N]
 *   npx claude-chariot-api risk <key>
 *   npx claude-chariot-api jobs [--pages N]
 *   npx claude-chariot-api job <key>
 *   npx claude-chariot-api search <query>
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Resolve paths relative to this script, not cwd
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const toolsDir = resolve(__dirname, '../tools/praetorian-cli');

interface CliResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

function showHelp(): void {
  console.log(`
Chariot API CLI - Access Chariot platform data via Praetorian CLI

USAGE:
  npx claude-chariot-api <command> [options]

COMMANDS:
  assets                      List all assets
  asset <key>                 Get specific asset by key
  risks                       List all risks
  risk <key>                  Get specific risk by key
  jobs                        List all jobs
  job <key>                   Get specific job by key
  seeds                       List discovery seeds
  integrations                List configured integrations
  capabilities                List available capabilities
  aegis                       List Aegis agents
  keys                        List API keys
  preseeds                    List preseeds
  attributes <key>            Get attributes for asset
  search <query>              Search by query

OPTIONS:
  --prefix PREFIX        Filter assets by key prefix
  --type TYPE            Filter assets by type (domain, ipv4, etc.)
  --pages N              Number of pages to fetch (default: 1)
  --limit N              Result limit for search (default: 20)
  --json                 Output raw JSON
  --help                 Show this help message

EXAMPLES:
  npx claude-chariot-api assets --prefix example.com --type domain
  npx claude-chariot-api asset example.com
  npx claude-chariot-api risks --pages 2
  npx claude-chariot-api search "status:active"
  npx claude-chariot-api jobs
  npx claude-chariot-api integrations
`);
}

function parseArgs(args: string[]): {
  command: string;
  positional: string[];
  options: Record<string, string | boolean>;
} {
  const options: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--prefix' && args[i + 1]) {
      options.prefix = args[++i];
    } else if (arg === '--type' && args[i + 1]) {
      options.type = args[++i];
    } else if (arg === '--pages' && args[i + 1]) {
      options.pages = args[++i];
    } else if (arg === '--limit' && args[i + 1]) {
      options.limit = args[++i];
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  return {
    command: positional[0] || '',
    positional: positional.slice(1),
    options,
  };
}

// Asset operations
async function runAssetsList(prefix?: string, type?: string, pages = 1): Promise<CliResult> {
  const { assetsList } = await import(`${toolsDir}/assets-list.ts`);
  const params: Record<string, unknown> = { pages };
  if (prefix) params.key_prefix = prefix;
  if (type) params.asset_type = type;
  const result = await assetsList.execute(params);
  return { success: true, data: result };
}

async function runAssetsGet(key: string): Promise<CliResult> {
  const { assetsGet } = await import(`${toolsDir}/assets-get.ts`);
  const result = await assetsGet.execute({ key });
  return { success: true, data: result };
}

// Risk operations
async function runRisksList(pages = 1): Promise<CliResult> {
  const { risksList } = await import(`${toolsDir}/risks-list.ts`);
  const result = await risksList.execute({ pages });
  return { success: true, data: result };
}

async function runRisksGet(key: string): Promise<CliResult> {
  const { risksGet } = await import(`${toolsDir}/risks-get.ts`);
  const result = await risksGet.execute({ key });
  return { success: true, data: result };
}

// Job operations
async function runJobsList(pages = 1): Promise<CliResult> {
  const { jobsList } = await import(`${toolsDir}/jobs-list.ts`);
  const result = await jobsList.execute({ pages });
  return { success: true, data: result };
}

async function runJobsGet(key: string): Promise<CliResult> {
  const { jobsGet } = await import(`${toolsDir}/jobs-get.ts`);
  const result = await jobsGet.execute({ key });
  return { success: true, data: result };
}

// Other list operations
async function runSeedsList(): Promise<CliResult> {
  const { seedsList } = await import(`${toolsDir}/seeds-list.ts`);
  const result = await seedsList.execute({});
  return { success: true, data: result };
}

async function runIntegrationsList(): Promise<CliResult> {
  const { integrationsList } = await import(`${toolsDir}/integrations-list.ts`);
  const result = await integrationsList.execute({});
  return { success: true, data: result };
}

async function runCapabilitiesList(): Promise<CliResult> {
  const { capabilitiesList } = await import(`${toolsDir}/capabilities-list.ts`);
  const result = await capabilitiesList.execute({});
  return { success: true, data: result };
}

async function runAegisList(): Promise<CliResult> {
  const { aegisList } = await import(`${toolsDir}/aegis-list.ts`);
  const result = await aegisList.execute({});
  return { success: true, data: result };
}

async function runKeysList(): Promise<CliResult> {
  const { keysList } = await import(`${toolsDir}/keys-list.ts`);
  const result = await keysList.execute({});
  return { success: true, data: result };
}

async function runPreseedsList(): Promise<CliResult> {
  const { preseedsList } = await import(`${toolsDir}/preseeds-list.ts`);
  const result = await preseedsList.execute({});
  return { success: true, data: result };
}

async function runAttributesList(key: string): Promise<CliResult> {
  const { attributesList } = await import(`${toolsDir}/attributes-list.ts`);
  const result = await attributesList.execute({ key });
  return { success: true, data: result };
}

// Search
async function runSearch(query: string, limit = 20): Promise<CliResult> {
  const { searchByQuery } = await import(`${toolsDir}/search-by-query.ts`);
  const result = await searchByQuery.execute({ query, limit });
  return { success: true, data: result };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, positional, options } = parseArgs(args);

  if (options.help || !command) {
    showHelp();
    process.exit(command ? 0 : 1);
  }

  const pages = parseInt(options.pages as string) || 1;
  const limit = parseInt(options.limit as string) || 20;

  try {
    let result: CliResult;

    switch (command) {
      // Asset operations
      case 'assets':
        result = await runAssetsList(
          options.prefix as string,
          options.type as string,
          pages
        );
        break;

      case 'asset':
        if (!positional[0]) {
          console.error('Error: asset command requires a key');
          console.error('Usage: npx claude-chariot-api asset <key>');
          process.exit(1);
        }
        result = await runAssetsGet(positional[0]);
        break;

      // Risk operations
      case 'risks':
        result = await runRisksList(pages);
        break;

      case 'risk':
        if (!positional[0]) {
          console.error('Error: risk command requires a key');
          console.error('Usage: npx claude-chariot-api risk <key>');
          process.exit(1);
        }
        result = await runRisksGet(positional[0]);
        break;

      // Job operations
      case 'jobs':
        result = await runJobsList(pages);
        break;

      case 'job':
        if (!positional[0]) {
          console.error('Error: job command requires a key');
          console.error('Usage: npx claude-chariot-api job <key>');
          process.exit(1);
        }
        result = await runJobsGet(positional[0]);
        break;

      // Other list operations
      case 'seeds':
        result = await runSeedsList();
        break;

      case 'integrations':
        result = await runIntegrationsList();
        break;

      case 'capabilities':
        result = await runCapabilitiesList();
        break;

      case 'aegis':
        result = await runAegisList();
        break;

      case 'keys':
        result = await runKeysList();
        break;

      case 'preseeds':
        result = await runPreseedsList();
        break;

      case 'attributes':
        if (!positional[0]) {
          console.error('Error: attributes command requires an asset key');
          console.error('Usage: npx claude-chariot-api attributes <key>');
          process.exit(1);
        }
        result = await runAttributesList(positional[0]);
        break;

      // Search
      case 'search':
        if (!positional[0]) {
          console.error('Error: search command requires a query');
          console.error('Usage: npx claude-chariot-api search <query>');
          process.exit(1);
        }
        result = await runSearch(positional.join(' '), limit);
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
