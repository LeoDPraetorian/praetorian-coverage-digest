// intent-parser.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_PATTERNS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../source-patterns.json'), 'utf-8')
);
const SINK_PATTERNS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../sink-patterns.json'), 'utf-8')
);

export interface ParsedIntent {
  binaryPath: string;
  sources: string[];
  sinks: string[];
}

function detectSources(query: string): string[] {
  const lower = query.toLowerCase();
  const sources: Set<string> = new Set();

  // TCP/network detection
  if (/tcp|network|recv|socket/i.test(query)) {
    SOURCE_PATTERNS.network.functions.forEach((f: string) => sources.add(f));
  }

  // File input detection
  if (/file|fopen|fread/i.test(query)) {
    SOURCE_PATTERNS.file.functions.forEach((f: string) => sources.add(f));
  }

  // argv detection
  if (/argv|command.?line/i.test(query)) {
    SOURCE_PATTERNS.argv.functions.forEach((f: string) => sources.add(f));
  }

  // stdin detection
  if (/stdin|scanf/i.test(query)) {
    SOURCE_PATTERNS.stdin.functions.forEach((f: string) => sources.add(f));
  }

  // "all inputs" detection
  if (/all\s+input/i.test(query)) {
    Object.values(SOURCE_PATTERNS).forEach((category: any) => {
      category.functions.forEach((f: string) => sources.add(f));
    });
  }

  return Array.from(sources);
}

function detectSinks(query: string): string[] {
  const sinks: Set<string> = new Set();

  // Check for specific sink mentions (e.g., "to strcpy")
  // But exclude generic words like "functions"
  const toSinkMatch = query.match(/to\s+(\w+)(?:\s+in\s+)/i);
  if (toSinkMatch && !['functions', 'function', 'calls'].includes(toSinkMatch[1].toLowerCase())) {
    // User specified exact sink
    return [toSinkMatch[1]];
  }

  // Check for crypto keyword
  if (/crypto|encryption|openssl/i.test(query)) {
    SINK_PATTERNS.crypto_operations.functions.forEach((f: string) => sinks.add(f));
  }

  // Default sinks if nothing specified
  if (sinks.size === 0) {
    SINK_PATTERNS.memory_corruption.functions.forEach((f: string) => sinks.add(f));
    SINK_PATTERNS.command_injection.functions.forEach((f: string) => sinks.add(f));
    SINK_PATTERNS.format_string.functions.forEach((f: string) => sinks.add(f));
  }

  return Array.from(sinks);
}

export function parseIntent(query: string): ParsedIntent {
  // Updated regex to match paths with or without file extensions
  const pathMatch = query.match(/(?:in\s+)([\w\/.\\-]+\.(?:exe|elf|bin|out)|[\w\/.\\-]+)/i);

  if (!pathMatch) {
    throw new Error('No binary path found in query');
  }

  return {
    binaryPath: pathMatch[1],
    sources: detectSources(query),
    sinks: detectSinks(query)
  };
}
