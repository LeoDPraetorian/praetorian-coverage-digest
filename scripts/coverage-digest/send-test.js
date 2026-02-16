#!/usr/bin/env node

/**
 * Quick test: Generate digest from ALL tracked coverage and send via local sendmail.
 * Bypasses the 24h lookback window to show a full, populated email.
 */

import { config } from './config.js';
import { renderDigest } from './utils/template-renderer.js';
import { sendViaLocalMail } from './utils/local-sender.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

async function main() {
  console.log('=== Test Digest Email ===\n');

  // Load ALL items from the coverage tracker (ignore date filtering)
  const trackerPath = join(config.paths.root, '..', 'coverage-tracker', 'coverage-tracker.json');
  const raw = await readFile(trackerPath, 'utf-8');
  const allCoverage = JSON.parse(raw);

  // Convert tracker format to digest item format
  const items = allCoverage.map(item => ({
    source: item.source,
    sourceType: item.source_type === 'event' ? 'manual' : 'rss',
    icon: item.source_type === 'event' ? '🎤' : '📰',
    title: item.title,
    url: item.url,
    date: new Date(item.date).toISOString(),
    excerpt: item.excerpt,
    toolsMentioned: item.tools_mentioned || [],
    matchedTerms: ['manual'],
    raw: { guid: item.id },
  }));

  // Sort newest first
  items.sort((a, b) => new Date(b.date) - new Date(a.date));

  console.log(`Loaded ${items.length} coverage items from tracker`);
  for (const item of items) {
    console.log(`  - ${item.title} (${item.source})`);
  }

  // Render
  console.log('\nRendering email...');
  const html = await renderDigest(items);

  // Subject
  const tools = [...new Set(items.flatMap(i => i.toolsMentioned))];
  const subject = `[TEST] Praetorian Coverage Digest - ${items.length} items (${tools.slice(0, 4).join(', ')})`;

  // Send
  console.log(`\nSending to: ${config.email.to}`);
  console.log(`Subject: ${subject}`);
  await sendViaLocalMail(subject, html);

  console.log('\nDone! Check your inbox (and spam folder).');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
