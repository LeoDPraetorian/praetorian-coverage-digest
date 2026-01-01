#!/usr/bin/env -S npx tsx
/**
 * Currents CLI - Directory-independent access to Currents test reporting tools
 *
 * Usage:
 *   npx claude-currents projects
 *   npx claude-currents runs [--project ID] [--limit N]
 *   npx claude-currents run <runId>
 *   npx claude-currents tests <signature> [--status failed]
 *   npx claude-currents performance [--project ID]
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Resolve paths relative to this script, not cwd
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const toolsDir = resolve(__dirname, '../tools/currents');

// Default Chariot E2E project
const DEFAULT_PROJECT_ID = '1mwNCW';

interface CliResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

function showHelp(): void {
  console.log(`
Currents CLI - Test orchestration and reporting

USAGE:
  npx claude-currents <command> [options]

COMMANDS:
  projects                    List all Currents projects
  runs                        Get recent test runs
  run <runId>                 Get details for specific run
  tests <signature>           Get test results by signature
  performance                 Get test performance metrics
  spec-performance            Get spec file performance
  spec <instanceId>           Get spec instance details
  signatures                  Get test signatures for filtering

OPTIONS:
  --project ID       Project ID (default: ${DEFAULT_PROJECT_ID})
  --limit N          Number of results (default: 10)
  --status STATUS    Filter by status (failed, passed, pending)
  --json             Output raw JSON (default: formatted)
  --help             Show this help message

EXAMPLES:
  npx claude-currents projects
  npx claude-currents runs --limit 5
  npx claude-currents run abc123
  npx claude-currents tests "spec.ts:test name" --status failed
  npx claude-currents performance --project 1mwNCW
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
    } else if (arg === '--project' && args[i + 1]) {
      options.project = args[++i];
    } else if (arg === '--limit' && args[i + 1]) {
      options.limit = args[++i];
    } else if (arg === '--status' && args[i + 1]) {
      options.status = args[++i];
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

async function runProjects(): Promise<CliResult> {
  const { getProjects } = await import(`${toolsDir}/get-projects.ts`);
  const result = await getProjects.execute({});
  return { success: true, data: result };
}

async function runRuns(projectId: string, limit: number): Promise<CliResult> {
  const { getRuns } = await import(`${toolsDir}/get-runs.ts`);
  const result = await getRuns.execute({ projectId, limit });
  return { success: true, data: result };
}

async function runRunDetails(runId: string): Promise<CliResult> {
  const { getRunDetails } = await import(`${toolsDir}/get-run-details.ts`);
  const result = await getRunDetails.execute({ runId });
  return { success: true, data: result };
}

async function runTestResults(
  signature: string,
  status?: string,
  limit?: number
): Promise<CliResult> {
  const { getTestResults } = await import(`${toolsDir}/get-test-results.ts`);
  const params: Record<string, unknown> = { signature };
  if (status) params.status = status;
  if (limit) params.limit = limit;
  const result = await getTestResults.execute(params);
  return { success: true, data: result };
}

async function runTestsPerformance(projectId: string, limit: number): Promise<CliResult> {
  const { getTestsPerformance } = await import(`${toolsDir}/get-tests-performance.ts`);
  const result = await getTestsPerformance.execute({ projectId, limit });
  return { success: true, data: result };
}

async function runSpecPerformance(projectId: string): Promise<CliResult> {
  const { getSpecFilesPerformance } = await import(`${toolsDir}/get-spec-files-performance.ts`);
  const result = await getSpecFilesPerformance.execute({ projectId });
  return { success: true, data: result };
}

async function runSpecInstance(instanceId: string): Promise<CliResult> {
  const { getSpecInstance } = await import(`${toolsDir}/get-spec-instance.ts`);
  const result = await getSpecInstance.execute({ instanceId });
  return { success: true, data: result };
}

async function runSignatures(projectId: string): Promise<CliResult> {
  const { getTestsSignatures } = await import(`${toolsDir}/get-tests-signatures.ts`);
  const result = await getTestsSignatures.execute({ projectId });
  return { success: true, data: result };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, positional, options } = parseArgs(args);

  if (options.help || !command) {
    showHelp();
    process.exit(command ? 0 : 1);
  }

  const projectId = (options.project as string) || DEFAULT_PROJECT_ID;
  const limit = parseInt(options.limit as string) || 10;

  try {
    let result: CliResult;

    switch (command) {
      case 'projects':
        result = await runProjects();
        break;

      case 'runs':
        result = await runRuns(projectId, limit);
        break;

      case 'run':
        if (!positional[0]) {
          console.error('Error: run command requires a runId');
          console.error('Usage: npx claude-currents run <runId>');
          process.exit(1);
        }
        result = await runRunDetails(positional[0]);
        break;

      case 'tests':
        if (!positional[0]) {
          console.error('Error: tests command requires a signature');
          console.error('Usage: npx claude-currents tests <signature>');
          process.exit(1);
        }
        result = await runTestResults(positional[0], options.status as string, limit);
        break;

      case 'performance':
        result = await runTestsPerformance(projectId, limit);
        break;

      case 'spec-performance':
        result = await runSpecPerformance(projectId);
        break;

      case 'spec':
        if (!positional[0]) {
          console.error('Error: spec command requires an instanceId');
          console.error('Usage: npx claude-currents spec <instanceId>');
          process.exit(1);
        }
        result = await runSpecInstance(positional[0]);
        break;

      case 'signatures':
        result = await runSignatures(projectId);
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
