#!/usr/bin/env node

/**
 * Praetorian Coverage Tracker CLI
 *
 * Usage:
 *   node cli.js add --source "Help Net Security" --url "https://..." --title "Article Title"
 *   node cli.js add --source "Black Hat" --type event --title "Talk Title" --tools "Chariot,Brutus"
 *   node cli.js list                          # List all items
 *   node cli.js list --status new             # Filter by status
 *   node cli.js list --tool Brutus            # Filter by tool
 *   node cli.js amplify <id> --linkedin       # Mark as amplified on LinkedIn
 *   node cli.js stats                         # Show summary statistics
 *   node cli.js export --format csv           # Export to CSV
 */

import { readFile, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TRACKER_FILE = join(__dirname, 'coverage-tracker.json');

// ── Helpers ──────────────────────────────────────────────

async function loadTracker() {
  try {
    const raw = await readFile(TRACKER_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function saveTracker(items) {
  await writeFile(TRACKER_FILE, JSON.stringify(items, null, 2));
}

function parseArgs(args) {
  const parsed = { _: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const next = args[i + 1];
      if (next && !next.startsWith('--')) {
        parsed[key] = next;
        i++;
      } else {
        parsed[key] = true;
      }
    } else {
      parsed._.push(args[i]);
    }
  }
  return parsed;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ── Commands ─────────────────────────────────────────────

async function cmdAdd(args) {
  if (!args.title) {
    console.error('Error: --title is required');
    process.exit(1);
  }

  const items = await loadTracker();
  const id = `cov-${String(items.length + 1).padStart(3, '0')}`;

  const item = {
    id,
    date: args.date || new Date().toISOString().split('T')[0],
    source: args.source || 'Unknown',
    source_type: args.type || 'media',
    title: args.title,
    url: args.url || '',
    tools_mentioned: args.tools ? args.tools.split(',').map(t => t.trim()) : [],
    excerpt: args.excerpt || '',
    status: 'new',
    amplification: {
      linkedin_post: null,
      slack_message: null,
      employee_shares: [],
      added_to_website: false,
    },
    discovered_by: 'manual',
    discovered_at: new Date().toISOString(),
  };

  items.push(item);
  await saveTracker(items);
  console.log(`Added: ${id} - "${item.title}" (${item.source})`);
}

async function cmdList(args) {
  const items = await loadTracker();

  let filtered = items;
  if (args.status) {
    filtered = filtered.filter(i => i.status === args.status);
  }
  if (args.tool) {
    const tool = args.tool.toLowerCase();
    filtered = filtered.filter(i =>
      (i.tools_mentioned || []).some(t => t.toLowerCase().includes(tool))
    );
  }
  if (args.source) {
    const src = args.source.toLowerCase();
    filtered = filtered.filter(i => i.source.toLowerCase().includes(src));
  }

  // Sort by date descending
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filtered.length === 0) {
    console.log('No items found.');
    return;
  }

  console.log(`\n${'ID'.padEnd(10)} ${'Date'.padEnd(14)} ${'Status'.padEnd(10)} ${'Source'.padEnd(22)} Title`);
  console.log('─'.repeat(100));

  for (const item of filtered) {
    const tools = (item.tools_mentioned || []).join(', ');
    const toolStr = tools ? ` [${tools}]` : '';
    console.log(
      `${item.id.padEnd(10)} ${formatDate(item.date).padEnd(14)} ${item.status.padEnd(10)} ${item.source.substring(0, 20).padEnd(22)} ${item.title.substring(0, 50)}${toolStr}`
    );
  }

  console.log(`\nTotal: ${filtered.length} item(s)`);
}

async function cmdAmplify(args) {
  const id = args._[1];
  if (!id) {
    console.error('Error: provide an item ID. Usage: node cli.js amplify cov-001 --linkedin');
    process.exit(1);
  }

  const items = await loadTracker();
  const item = items.find(i => i.id === id);
  if (!item) {
    console.error(`Error: item "${id}" not found`);
    process.exit(1);
  }

  let changed = false;
  if (args.linkedin) {
    item.amplification.linkedin_post = new Date().toISOString();
    changed = true;
    console.log(`  Marked LinkedIn amplified: ${id}`);
  }
  if (args.slack) {
    item.amplification.slack_message = new Date().toISOString();
    changed = true;
    console.log(`  Marked Slack amplified: ${id}`);
  }
  if (args.website) {
    item.amplification.added_to_website = true;
    changed = true;
    console.log(`  Marked website added: ${id}`);
  }

  if (changed) {
    // Auto-update status if all channels are amplified
    const amp = item.amplification;
    if (amp.linkedin_post && amp.slack_message && amp.added_to_website) {
      item.status = 'amplified';
    } else if (amp.linkedin_post || amp.slack_message || amp.added_to_website) {
      item.status = 'queued';
    }
    await saveTracker(items);
  } else {
    console.log('No amplification flags set. Use --linkedin, --slack, or --website');
  }
}

async function cmdStats() {
  const items = await loadTracker();

  const byStatus = {};
  const bySource = {};
  const byTool = {};
  const byMonth = {};

  for (const item of items) {
    byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    bySource[item.source] = (bySource[item.source] || 0) + 1;
    const month = item.date.substring(0, 7);
    byMonth[month] = (byMonth[month] || 0) + 1;
    for (const tool of item.tools_mentioned || []) {
      byTool[tool] = (byTool[tool] || 0) + 1;
    }
  }

  console.log('\n=== Coverage Tracker Stats ===\n');
  console.log(`Total items: ${items.length}\n`);

  console.log('By Status:');
  for (const [status, count] of Object.entries(byStatus)) {
    console.log(`  ${status.padEnd(12)} ${count}`);
  }

  console.log('\nBy Source:');
  for (const [source, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${source.padEnd(22)} ${count}`);
  }

  console.log('\nBy Tool:');
  for (const [tool, count] of Object.entries(byTool).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tool.padEnd(18)} ${count}`);
  }

  console.log('\nBy Month:');
  for (const [month, count] of Object.entries(byMonth).sort()) {
    console.log(`  ${month.padEnd(10)} ${'█'.repeat(count)} ${count}`);
  }
}

async function cmdExport(args) {
  const items = await loadTracker();
  const format = args.format || 'csv';

  if (format === 'csv') {
    const header = 'ID,Date,Source,Type,Title,URL,Tools,Status,LinkedIn,Slack,Website';
    const rows = items.map(item => {
      const tools = (item.tools_mentioned || []).join(';');
      const amp = item.amplification || {};
      return [
        item.id,
        item.date,
        `"${item.source}"`,
        item.source_type,
        `"${item.title.replace(/"/g, '""')}"`,
        item.url,
        `"${tools}"`,
        item.status,
        amp.linkedin_post ? 'Yes' : 'No',
        amp.slack_message ? 'Yes' : 'No',
        amp.added_to_website ? 'Yes' : 'No',
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    const outPath = join(__dirname, 'coverage-export.csv');
    await writeFile(outPath, csv);
    console.log(`Exported ${items.length} items to ${outPath}`);
  } else {
    console.error(`Unknown format: ${format}. Supported: csv`);
  }
}

function cmdHelp() {
  console.log(`
Praetorian Coverage Tracker CLI

Commands:
  add      Add a new coverage item
             --title "..." (required)
             --source "..." --url "..." --type media|event|podcast|social
             --tools "Brutus,Augustus" --excerpt "..." --date "2026-02-13"

  list     List coverage items
             --status new|queued|amplified|archived
             --tool Brutus --source "Help Net"

  amplify  Mark item as amplified on a channel
             node cli.js amplify cov-001 --linkedin --slack --website

  stats    Show summary statistics

  export   Export tracker data
             --format csv

  help     Show this help message
`);
}

// ── Main ─────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));
const command = args._[0];

switch (command) {
  case 'add': await cmdAdd(args); break;
  case 'list': await cmdList(args); break;
  case 'amplify': await cmdAmplify(args); break;
  case 'stats': await cmdStats(args); break;
  case 'export': await cmdExport(args); break;
  case 'help': default: cmdHelp(); break;
}
