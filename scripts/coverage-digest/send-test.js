#!/usr/bin/env node

/**
 * Quick test: Generate digest from ALL tracked coverage and save as preview HTML.
 * Bypasses the 24h lookback window to show a full, populated email.
 *
 * Usage:
 *   node send-test.js              # Save preview.html
 *   node send-test.js --open       # Save and open in browser
 */

import { config } from './config.js';
import { renderDigest } from './utils/template-renderer.js';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

async function main() {
  console.log('=== Test Digest Email ===\n');

  // Load ALL items from the coverage tracker (ignore date filtering)
  const trackerPath = join(config.paths.root, '..', 'coverage-tracker', 'coverage-tracker.json');
  const raw = await readFile(trackerPath, 'utf-8');
  const allCoverage = JSON.parse(raw);

  // Convert tracker format to digest item format with proper categorization
  const items = allCoverage.map(item => {
    const source = item.source || '';
    const sourceType = item.source_type || 'media';

    // Determine sourceType for the renderer
    let mappedType;
    if (sourceType === 'event') {
      mappedType = 'event';
    } else if (source.toLowerCase().includes('praetorian blog')) {
      mappedType = 'blog';
    } else {
      mappedType = 'media';
    }

    return {
      source: source,
      sourceType: mappedType,
      title: item.title,
      url: item.url,
      date: new Date(item.date).toISOString(),
      excerpt: item.excerpt,
      toolsMentioned: item.tools_mentioned || [],
      matchedTerms: ['manual'],
      raw: { guid: item.id },
    };
  });

  // Sort newest first
  items.sort((a, b) => new Date(b.date) - new Date(a.date));

  console.log(`Loaded ${items.length} coverage items from tracker`);
  const media = items.filter(i => i.sourceType === 'media');
  const blog = items.filter(i => i.sourceType === 'blog');
  const events = items.filter(i => i.sourceType === 'event');
  console.log(`  Media: ${media.length}, Blog: ${blog.length}, Events: ${events.length}`);
  for (const item of items) {
    console.log(`  [${item.sourceType}] ${item.title} (${item.source})`);
  }

  // Render
  console.log('\nRendering email...');
  const html = await renderDigest(items);

  // Save preview
  const previewPath = join(config.paths.root, 'preview.html');
  await writeFile(previewPath, html);
  console.log(`\nPreview saved to: ${previewPath}`);

  // Open in browser if --open flag
  if (process.argv.includes('--open')) {
    try {
      execSync(`open "${previewPath}"`);
      console.log('Opened in browser.');
    } catch {
      console.log('Could not auto-open. Open the file manually.');
    }
  } else {
    console.log('Run with --open to open in browser, or open the file manually.');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
