#!/usr/bin/env node
/**
 * CLI entry point for deterministic output formatting.
 *
 * Usage:
 *   npm run format -- --input findings.json
 *   echo '{"findings": [...]}' | npm run format
 *
 * Path resolution: Uses git rev-parse --show-toplevel for repo-relative paths.
 * See lib/utils.ts for findRepoRoot() implementation.
 */

import * as fs from 'fs';
import { findRepoRoot } from './lib/utils';
import { formatFindingsTable, countFindings, formatCompletionMessage, Finding } from './lib/table-formatter';
import { validateSemanticFindings, semanticFindingsToFindings } from './lib/schemas';

interface CLIOptions {
  input?: string;
  type: 'semantic' | 'agent' | 'raw';
  help: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    type: 'semantic',
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--input' || arg === '-i') {
      options.input = args[++i];
    } else if (arg === '--type' || arg === '-t') {
      options.type = args[++i] as CLIOptions['type'];
    }
  }

  return options;
}

function printHelp(): void {
  const repoRoot = findRepoRoot();
  console.log(`
formatting-skill-output - Deterministic table formatter

Repository: ${repoRoot}

Usage:
  npm run format -- [options]

Options:
  --input, -i <file>   Input JSON file (or use stdin)
  --type, -t <type>    Input type: semantic, agent, raw (default: semantic)
  --help, -h           Show this help message

Examples:
  npm run format -- --input semantic-findings.json
  echo '{"findings": [...]}' | npm run format
`);
}

async function readInput(inputPath?: string): Promise<string> {
  if (inputPath) {
    return fs.readFileSync(inputPath, 'utf-8');
  }

  // Read from stdin
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf-8');

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      resolve(data);
    });

    process.stdin.on('error', reject);

    // Timeout after 5 seconds if no input
    setTimeout(() => {
      if (data.length === 0) {
        reject(new Error('No input received (timeout after 5s). Use --input or pipe JSON to stdin.'));
      }
    }, 5000);
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  try {
    const inputJson = await readInput(options.input);
    const parsed = JSON.parse(inputJson);

    let findings: Finding[];

    switch (options.type) {
      case 'semantic': {
        const validated = validateSemanticFindings(parsed);
        findings = semanticFindingsToFindings(validated);
        break;
      }
      case 'raw': {
        // Assume input is already in Finding[] format
        findings = parsed.findings || parsed;
        break;
      }
      default:
        throw new Error(`Unknown type: ${options.type}`);
    }

    // Output the deterministic table
    console.log(formatFindingsTable(findings));

    // Output completion message
    const counts = countFindings(findings);
    console.log(formatCompletionMessage(counts));

    // Exit with appropriate code
    const hasCritical = counts.structural.critical + counts.semantic.critical > 0;
    process.exit(hasCritical ? 1 : 0);
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
