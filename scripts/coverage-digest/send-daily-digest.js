#!/usr/bin/env node

/**
 * Praetorian Coverage Digest - Daily Email
 *
 * Monitors configured sources for Praetorian mentions and sends
 * a branded daily digest email via SendGrid.
 *
 * Usage:
 *   node send-daily-digest.js              # Normal run
 *   node send-daily-digest.js --preview    # Render HTML to stdout (no email)
 *   DRY_RUN=true node send-daily-digest.js # Log what would be sent
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { config } from './config.js';
import { checkRssFeeds } from './monitors/rss-feeds.js';
import { checkManualSubmissions } from './monitors/manual-submissions.js';
import { getSinceDate, filterNewItems, recordRun } from './utils/state-manager.js';
import { renderDigest } from './utils/template-renderer.js';
import { sendDigestEmail } from './utils/email-sender.js';

const isPreview = process.argv.includes('--preview');

async function main() {
  console.log('========================================');
  console.log(' Praetorian Coverage Digest');
  console.log(`  ${new Date().toLocaleString()}`);
  console.log('========================================\n');

  // 1. Determine lookback window
  const since = await getSinceDate();
  console.log(`Looking for items since: ${since.toLocaleString()}\n`);

  // 2. Collect items from all monitors
  const [rssItems, manualItems] = await Promise.all([
    checkRssFeeds(since),
    checkManualSubmissions(since),
  ]);

  const allItems = [...rssItems, ...manualItems];
  console.log(`\nTotal items found: ${allItems.length}`);

  // 3. Deduplicate against previously sent items
  const newItems = await filterNewItems(allItems);
  console.log(`New items (not previously sent): ${newItems.length}`);

  // 4. Sort by date (newest first)
  newItems.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 5. Check if we should skip
  if (newItems.length === 0 && config.skipIfEmpty && !isPreview) {
    console.log('\nNo new items and SKIP_IF_EMPTY=true. Skipping email.');
    // Still record the run so next time we look from now
    await recordRun([]);
    return;
  }

  // 6. Render email
  console.log('\nRendering email template...');
  const html = await renderDigest(newItems);

  // 7. Preview mode: write HTML to file and stdout
  if (isPreview) {
    const previewPath = join(config.paths.root, 'preview.html');
    await writeFile(previewPath, html);
    console.log(`\nPreview saved to: ${previewPath}`);
    console.log('Open this file in a browser to see the rendered email.');
    return;
  }

  // 8. Generate subject line
  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const tools = [...new Set(newItems.flatMap(i => i.toolsMentioned || []))];
  let subject;
  if (newItems.length === 0) {
    subject = `Coverage Digest - ${today} - No new items`;
  } else if (tools.length > 0) {
    const toolStr = tools.slice(0, 3).join(', ');
    subject = `Coverage Digest - ${today} - ${newItems.length} new (${toolStr})`;
  } else {
    subject = `Coverage Digest - ${today} - ${newItems.length} new item${newItems.length > 1 ? 's' : ''}`;
  }

  // 9. Send email
  console.log(`\nSending: "${subject}"`);
  await sendDigestEmail(subject, html);

  // 10. Record successful run
  await recordRun(newItems);

  console.log('\nDone!');
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
