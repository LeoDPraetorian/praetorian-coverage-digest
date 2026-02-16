#!/usr/bin/env node

/**
 * Praetorian Coverage Digest - Full Automated Pipeline
 *
 * This is the production script that GitHub Actions runs daily.
 * It handles the complete lifecycle:
 *
 *   1. Scan RSS feeds for new Praetorian mentions
 *   2. Check manual submissions
 *   3. Merge new discoveries into coverage-tracker.json (deduped)
 *   4. Mark previously-sent items as "sent" (lifecycle management)
 *   5. Render branded HTML digest from current "new" items
 *   6. Save preview.html for email delivery
 *   7. Save updated tracker for git commit
 *
 * Usage:
 *   node run-digest-pipeline.js              # Full pipeline
 *   node run-digest-pipeline.js --dry-run    # Scan + merge but skip email render
 */

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { config } from './config.js';
import { checkRssFeeds } from './monitors/rss-feeds.js';
import { checkManualSubmissions } from './monitors/manual-submissions.js';
import { renderDigest } from './utils/template-renderer.js';

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log('============================================');
  console.log(' Praetorian Coverage Digest - Pipeline');
  console.log(` ${new Date().toLocaleString()}`);
  console.log('============================================\n');

  // 1. Load existing tracker
  const trackerPath = config.paths.coverageTracker;
  let tracker = await loadTracker(trackerPath);
  console.log(`Loaded tracker: ${tracker.length} existing items`);
  const statusCounts = countByStatus(tracker);
  console.log(`  new: ${statusCounts.new || 0} | sent: ${statusCounts.sent || 0} | archived: ${statusCounts.archived || 0}\n`);

  // 2. Lifecycle: mark items that were previously "new" as "sent"
  //    (they were included in yesterday's digest)
  const markedSent = markPreviousNewAsSent(tracker);
  if (markedSent > 0) {
    console.log(`Lifecycle: marked ${markedSent} previously "new" items as "sent"\n`);
  }

  // 3. Auto-archive old "sent" items (>30 days since sent)
  const markedArchived = autoArchiveOldItems(tracker);
  if (markedArchived > 0) {
    console.log(`Lifecycle: auto-archived ${markedArchived} items older than 30 days\n`);
  }

  // 4. Scan RSS feeds for new mentions (look back 7 days to catch anything missed)
  const lookbackDays = 7;
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);
  console.log(`Scanning RSS feeds (lookback: ${lookbackDays} days)...`);

  const [rssItems, manualItems] = await Promise.all([
    checkRssFeeds(since),
    checkManualSubmissions(since),
  ]);

  const discovered = [...rssItems, ...manualItems];
  console.log(`\nDiscovered: ${rssItems.length} from RSS, ${manualItems.length} from manual submissions`);

  // 5. Merge new discoveries into tracker (dedup by URL)
  const newlyAdded = mergeIntoTracker(tracker, discovered);
  console.log(`Merged: ${newlyAdded} genuinely new items added to tracker\n`);

  // 6. Get all current "new" items for the digest
  const newItems = tracker.filter(item => item.status === 'new');
  console.log(`Digest will contain: ${newItems.length} items with status "new"`);

  if (newItems.length === 0) {
    console.log('No new items to send. Saving tracker and exiting.');
    await saveTracker(trackerPath, tracker);
    // Write empty preview so the workflow doesn't fail
    await writeFile(join(config.paths.root, 'preview.html'), '<html><body>No new items</body></html>');
    return;
  }

  // 7. Convert tracker items to digest format and render
  const digestItems = newItems.map(item => trackerToDigestFormat(item));
  digestItems.sort((a, b) => new Date(b.date) - new Date(a.date));

  for (const item of digestItems) {
    console.log(`  [${item.sourceType}] ${item.title} (${item.source})`);
  }

  if (!isDryRun) {
    console.log('\nRendering email...');
    const html = await renderDigest(digestItems);
    const previewPath = join(config.paths.root, 'preview.html');
    await writeFile(previewPath, html);
    console.log(`Preview saved to: ${previewPath}`);
  }

  // 8. Save updated tracker (with lifecycle changes + new discoveries)
  await saveTracker(trackerPath, tracker);
  console.log(`\nTracker saved with ${tracker.length} total items`);
  const finalCounts = countByStatus(tracker);
  console.log(`  new: ${finalCounts.new || 0} | sent: ${finalCounts.sent || 0} | archived: ${finalCounts.archived || 0}`);

  console.log('\nPipeline complete!');
}

/**
 * Load coverage tracker from JSON file.
 */
async function loadTracker(path) {
  try {
    const raw = await readFile(path, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('No existing tracker found - starting fresh');
      return [];
    }
    throw err;
  }
}

/**
 * Save coverage tracker back to JSON file.
 */
async function saveTracker(path, tracker) {
  await writeFile(path, JSON.stringify(tracker, null, 2) + '\n');
}

/**
 * Mark items that are currently "new" as "sent".
 * Called at the START of each run - items that were "new" last time
 * have already been included in the previous digest email.
 *
 * On the very first run, this is a no-op (we want to send them first).
 * We use a "last_sent_at" field to know if an item has been emailed.
 */
function markPreviousNewAsSent(tracker) {
  let count = 0;
  for (const item of tracker) {
    if (item.status === 'new' && item.last_sent_at) {
      item.status = 'sent';
      count++;
    }
  }
  return count;
}

/**
 * Auto-archive "sent" items older than 30 days.
 */
function autoArchiveOldItems(tracker) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  let count = 0;
  for (const item of tracker) {
    if (item.status === 'sent' && new Date(item.date) < thirtyDaysAgo) {
      item.status = 'archived';
      count++;
    }
  }
  return count;
}

/**
 * Merge newly discovered items into the tracker (dedup by URL).
 * Returns count of genuinely new items added.
 */
function mergeIntoTracker(tracker, discovered) {
  const existingUrls = new Set(tracker.map(item => normalizeUrl(item.url)));
  const existingTitles = new Set(tracker.map(item => item.title.toLowerCase().trim()));
  let added = 0;

  for (const item of discovered) {
    const url = normalizeUrl(item.url);
    const title = item.title.toLowerCase().trim();

    // Skip if we already have this URL or exact title
    if (existingUrls.has(url) || existingTitles.has(title)) {
      continue;
    }

    // Generate a new tracker ID
    const nextId = tracker.length + 1;
    const paddedId = String(nextId).padStart(3, '0');

    tracker.push({
      id: `cov-${paddedId}`,
      date: item.date ? item.date.split('T')[0] : new Date().toISOString().split('T')[0],
      source: item.source,
      source_type: mapSourceType(item),
      title: item.title,
      url: item.url,
      tools_mentioned: item.toolsMentioned || [],
      excerpt: item.excerpt || '',
      status: 'new',
      amplification: {
        linkedin_post: null,
        slack_message: null,
        employee_shares: [],
        added_to_website: false,
      },
      discovered_by: item.sourceType === 'rss' ? 'rss-monitor' : 'manual',
      discovered_at: new Date().toISOString(),
    });

    existingUrls.add(url);
    existingTitles.add(title);
    added++;
  }

  return added;
}

/**
 * Normalize a URL for dedup comparison.
 */
function normalizeUrl(url) {
  if (!url) return '';
  return url.toLowerCase().replace(/\/+$/, '').replace(/^https?:\/\//, '');
}

/**
 * Map discovered item to tracker source_type.
 */
function mapSourceType(item) {
  const source = (item.source || '').toLowerCase();
  if (source.includes('praetorian blog') || source.includes('praetorian.com/blog')) return 'blog';
  if (item.sourceType === 'manual' || item.sourceType === 'event') return item.sourceType;
  return 'media';
}

/**
 * Convert a tracker-format item to digest-format for rendering.
 */
function trackerToDigestFormat(item) {
  const source = item.source || '';
  const sourceType = item.source_type || 'media';

  let mappedType;
  if (sourceType === 'event') {
    mappedType = 'event';
  } else if (sourceType === 'blog' || source.toLowerCase().includes('praetorian blog')) {
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
    excerpt: item.excerpt || '',
    toolsMentioned: item.tools_mentioned || [],
    matchedTerms: item.discovered_by === 'rss-monitor' ? ['rss'] : ['manual'],
    raw: { guid: item.id },
  };
}

/**
 * Count items by status.
 */
function countByStatus(tracker) {
  const counts = {};
  for (const item of tracker) {
    counts[item.status] = (counts[item.status] || 0) + 1;
  }
  return counts;
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
