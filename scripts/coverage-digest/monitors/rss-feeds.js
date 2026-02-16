import Parser from 'rss-parser';
import { config } from '../config.js';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'PraetorianCoverageDigest/1.0',
  },
});

/**
 * Check if an RSS item mentions Praetorian or any tracked tools.
 * Returns matched terms for tagging.
 */
function findMentions(item) {
  const searchText = [
    item.title || '',
    item.contentSnippet || '',
    item.content || '',
    item.summary || '',
  ].join(' ').toLowerCase();

  const matched = config.searchTerms.filter(term =>
    searchText.includes(term.toLowerCase())
  );

  return matched;
}

/**
 * Identify which Praetorian tools are mentioned in an item.
 */
function findToolMentions(item) {
  const searchText = [
    item.title || '',
    item.contentSnippet || '',
    item.content || '',
  ].join(' ').toLowerCase();

  return config.tools.filter(tool =>
    searchText.toLowerCase().includes(tool.toLowerCase())
  );
}

/**
 * Extract a clean excerpt from RSS item content.
 */
function extractExcerpt(item, maxLength = 200) {
  const text = item.contentSnippet || item.summary || item.content || '';
  const clean = text.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return clean.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

/**
 * Fetch and filter a single RSS feed for Praetorian mentions.
 */
async function checkFeed(feed, since) {
  try {
    const parsed = await parser.parseURL(feed.url);
    const items = [];

    for (const item of parsed.items || []) {
      const pubDate = item.pubDate ? new Date(item.pubDate) : null;

      // Skip items older than our lookback window
      if (pubDate && since && pubDate < since) continue;

      const mentions = findMentions(item);
      if (mentions.length === 0) continue;

      const tools = findToolMentions(item);

      items.push({
        source: feed.name,
        sourceType: 'rss',
        icon: feed.icon,
        title: item.title || 'Untitled',
        url: item.link || '',
        date: pubDate ? pubDate.toISOString() : new Date().toISOString(),
        excerpt: extractExcerpt(item),
        toolsMentioned: tools,
        matchedTerms: mentions,
        raw: {
          guid: item.guid || item.link || item.title,
        },
      });
    }

    return items;
  } catch (err) {
    console.warn(`  Warning: Failed to fetch ${feed.name} (${feed.url}): ${err.message}`);
    return [];
  }
}

/**
 * Check all configured RSS feeds for Praetorian mentions.
 * @param {Date} since - Only return items published after this date
 * @returns {Promise<Array>} Array of coverage items
 */
export async function checkRssFeeds(since) {
  console.log('Checking RSS feeds...');

  const allFeeds = [...config.rssFeeds, ...config.googleAlertsFeeds];
  const results = [];

  // Process feeds concurrently with a concurrency limit
  const batchSize = 3;
  for (let i = 0; i < allFeeds.length; i += batchSize) {
    const batch = allFeeds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(feed => checkFeed(feed, since))
    );
    for (const items of batchResults) {
      results.push(...items);
    }
  }

  console.log(`  Found ${results.length} Praetorian mention(s) across ${allFeeds.length} feeds`);
  return results;
}
