#!/usr/bin/env -S npx tsx
/**
 * Chrome DevTools CLI - Directory-independent access to Chrome debugging tools
 *
 * SETUP REQUIRED: Chrome must be running with remote debugging:
 *   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *     --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &
 *
 * Usage:
 *   npx claude-chrome pages
 *   npx claude-chrome navigate <url>
 *   npx claude-chrome screenshot [--full]
 *   npx claude-chrome network [--limit N]
 *   npx claude-chrome console [--limit N]
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Resolve paths relative to this script, not cwd
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const toolsDir = resolve(__dirname, '../tools/chrome-devtools');

interface CliResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

function showHelp(): void {
  console.log(`
Chrome DevTools CLI - Browser automation and debugging

SETUP REQUIRED:
  Start Chrome with remote debugging enabled:

  macOS:
    /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\
      --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &

  Linux:
    google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &

USAGE:
  npx claude-chrome <command> [options]

COMMANDS:
  pages                       List all open pages/tabs
  new <url>                   Open new page at URL
  navigate <url>              Navigate current page to URL
  close                       Close current page
  screenshot                  Take screenshot
  snapshot                    Take DOM snapshot
  network                     List network requests
  console                     List console messages
  click <uid>                 Click element by UID
  fill <uid> <value>          Fill input by UID
  evaluate <script>           Execute JavaScript on page

OPTIONS:
  --full                 Full page screenshot (default: viewport only)
  --limit N              Number of results (default: 30)
  --file PATH            Output file path for screenshot
  --json                 Output raw JSON
  --help                 Show this help message

EXAMPLES:
  npx claude-chrome pages
  npx claude-chrome new "https://example.com"
  npx claude-chrome screenshot --full --file /tmp/screenshot.png
  npx claude-chrome network --limit 50
  npx claude-chrome console
  npx claude-chrome evaluate "document.title"
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
    } else if (arg === '--full') {
      options.full = true;
    } else if (arg === '--limit' && args[i + 1]) {
      options.limit = args[++i];
    } else if (arg === '--file' && args[i + 1]) {
      options.file = args[++i];
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

async function runListPages(): Promise<CliResult> {
  const { listPages } = await import(`${toolsDir}/list-pages.ts`);
  const result = await listPages.execute({});
  return { success: true, data: result };
}

async function runNewPage(url: string): Promise<CliResult> {
  const { newPage } = await import(`${toolsDir}/new-page.ts`);
  const result = await newPage.execute({ url });
  return { success: true, data: result };
}

async function runNavigate(url: string): Promise<CliResult> {
  const { navigatePage } = await import(`${toolsDir}/navigate-page.ts`);
  const result = await navigatePage.execute({ url });
  return { success: true, data: result };
}

async function runClosePage(): Promise<CliResult> {
  const { closePage } = await import(`${toolsDir}/close-page.ts`);
  const result = await closePage.execute({});
  return { success: true, data: result };
}

async function runScreenshot(fullPage: boolean, filePath?: string): Promise<CliResult> {
  const { takeScreenshot } = await import(`${toolsDir}/take-screenshot.ts`);
  const params: Record<string, unknown> = { fullPage };
  if (filePath) params.filePath = filePath;
  const result = await takeScreenshot.execute(params);
  return { success: true, data: result };
}

async function runSnapshot(): Promise<CliResult> {
  const { takeSnapshot } = await import(`${toolsDir}/take-snapshot.ts`);
  const result = await takeSnapshot.execute({});
  return { success: true, data: result };
}

async function runNetwork(limit: number): Promise<CliResult> {
  const { listNetworkRequests } = await import(`${toolsDir}/list-network-requests.ts`);
  const result = await listNetworkRequests.execute({
    resourceTypes: ['fetch', 'xhr'],
    pageSize: limit,
  });
  return { success: true, data: result };
}

async function runConsole(limit: number): Promise<CliResult> {
  const { listConsoleMessages } = await import(`${toolsDir}/list-console-messages.ts`);
  const result = await listConsoleMessages.execute({ limit });
  return { success: true, data: result };
}

async function runClick(uid: string): Promise<CliResult> {
  const { click } = await import(`${toolsDir}/click.ts`);
  const result = await click.execute({ uid });
  return { success: true, data: result };
}

async function runFill(uid: string, value: string): Promise<CliResult> {
  const { fill } = await import(`${toolsDir}/fill.ts`);
  const result = await fill.execute({ uid, value });
  return { success: true, data: result };
}

async function runEvaluate(script: string): Promise<CliResult> {
  const { evaluateScript } = await import(`${toolsDir}/evaluate-script.ts`);
  const result = await evaluateScript.execute({ script });
  return { success: true, data: result };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const { command, positional, options } = parseArgs(args);

  if (options.help || !command) {
    showHelp();
    process.exit(command ? 0 : 1);
  }

  const limit = parseInt(options.limit as string) || 30;

  try {
    let result: CliResult;

    switch (command) {
      case 'pages':
        result = await runListPages();
        break;

      case 'new':
        if (!positional[0]) {
          console.error('Error: new command requires a URL');
          console.error('Usage: npx claude-chrome new <url>');
          process.exit(1);
        }
        result = await runNewPage(positional[0]);
        break;

      case 'navigate':
        if (!positional[0]) {
          console.error('Error: navigate command requires a URL');
          console.error('Usage: npx claude-chrome navigate <url>');
          process.exit(1);
        }
        result = await runNavigate(positional[0]);
        break;

      case 'close':
        result = await runClosePage();
        break;

      case 'screenshot':
        result = await runScreenshot(!!options.full, options.file as string);
        break;

      case 'snapshot':
        result = await runSnapshot();
        break;

      case 'network':
        result = await runNetwork(limit);
        break;

      case 'console':
        result = await runConsole(limit);
        break;

      case 'click':
        if (!positional[0]) {
          console.error('Error: click command requires a UID');
          console.error('Usage: npx claude-chrome click <uid>');
          process.exit(1);
        }
        result = await runClick(positional[0]);
        break;

      case 'fill':
        if (!positional[0] || !positional[1]) {
          console.error('Error: fill command requires UID and value');
          console.error('Usage: npx claude-chrome fill <uid> <value>');
          process.exit(1);
        }
        result = await runFill(positional[0], positional[1]);
        break;

      case 'evaluate':
        if (!positional[0]) {
          console.error('Error: evaluate command requires a script');
          console.error('Usage: npx claude-chrome evaluate <script>');
          process.exit(1);
        }
        result = await runEvaluate(positional.join(' '));
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.error('Run with --help for usage information');
        process.exit(1);
    }

    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('localhost:9222') || message.includes('ECONNREFUSED')) {
      console.error('Error: Chrome is not running with remote debugging enabled.');
      console.error('');
      console.error('Start Chrome with:');
      console.error('  /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\');
      console.error('    --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &');
    } else {
      console.error('Error:', message);
    }
    process.exit(1);
  }
}

main();
