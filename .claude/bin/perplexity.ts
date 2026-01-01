#!/usr/bin/env -S npx tsx
/**
 * Perplexity CLI - Directory-independent access to Perplexity AI tools
 *
 * Usage:
 *   npx claude-perplexity search "query"
 *   npx claude-perplexity ask "question"
 *   npx claude-perplexity research "topic"
 *   npx claude-perplexity reason "problem"
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Resolve paths relative to this script, not cwd
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const toolsDir = resolve(__dirname, '../tools/perplexity');

interface CliResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

function showHelp(): void {
  console.log(`
Perplexity CLI - AI-powered search, research, and reasoning

USAGE:
  npx claude-perplexity <command> <query>

COMMANDS:
  search <query>     Web search for current information
  ask <question>     Conversational AI response
  research <topic>   Deep research with citations
  reason <problem>   Advanced reasoning and analysis

OPTIONS:
  --max-results N    Maximum search results (1-20, default: 10)
  --json             Output raw JSON (default: formatted)
  --help             Show this help message

EXAMPLES:
  npx claude-perplexity search "TypeScript best practices 2025"
  npx claude-perplexity ask "What is Model Context Protocol?"
  npx claude-perplexity research "large language model developments"
  npx claude-perplexity reason "tradeoffs between REST and GraphQL"
`);
}

function parseArgs(args: string[]): {
  command: string;
  query: string;
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
    } else if (arg === '--max-results' && args[i + 1]) {
      options.maxResults = args[++i];
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  return {
    command: positional[0] || '',
    query: positional.slice(1).join(' '),
    options,
  };
}

async function runSearch(query: string, maxResults = 10): Promise<CliResult> {
  const { perplexitySearch } = await import(`${toolsDir}/perplexity_search.ts`);
  const result = await perplexitySearch.execute({
    query,
    max_results: maxResults,
  });
  return { success: true, data: result };
}

async function runAsk(question: string): Promise<CliResult> {
  const { perplexityAsk } = await import(`${toolsDir}/perplexity_ask.ts`);
  const result = await perplexityAsk.execute({
    messages: [{ role: 'user', content: question }],
  });
  return { success: true, data: result };
}

async function runResearch(topic: string): Promise<CliResult> {
  const { perplexityResearch } = await import(`${toolsDir}/perplexity_research.ts`);
  const result = await perplexityResearch.execute({
    messages: [{ role: 'user', content: topic }],
    strip_thinking: true,
  });
  return { success: true, data: result };
}

async function runReason(problem: string): Promise<CliResult> {
  const { perplexityReason } = await import(`${toolsDir}/perplexity_reason.ts`);
  const result = await perplexityReason.execute({
    messages: [{ role: 'user', content: problem }],
  });
  return { success: true, data: result };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, query, options } = parseArgs(args);

  if (options.help || !command) {
    showHelp();
    process.exit(command ? 0 : 1);
  }

  if (!query) {
    console.error(`Error: ${command} requires a query argument`);
    console.error(`Usage: npx claude-perplexity ${command} "your query here"`);
    process.exit(1);
  }

  try {
    let result: CliResult;

    switch (command) {
      case 'search':
        result = await runSearch(query, parseInt(options.maxResults as string) || 10);
        break;
      case 'ask':
        result = await runAsk(query);
        break;
      case 'research':
        result = await runResearch(query);
        break;
      case 'reason':
        result = await runReason(query);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.error('Valid commands: search, ask, research, reason');
        process.exit(1);
    }

    if (options.json) {
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      // Format output nicely
      const data = result.data as Record<string, unknown>;
      if (data?.content) {
        console.log(data.content);
      } else {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
