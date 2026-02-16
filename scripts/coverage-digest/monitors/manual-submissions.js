import { readFile } from 'fs/promises';
import { config } from '../config.js';

/**
 * Read manual submissions from the JSON file.
 * Team members add entries here for coverage that automation can't catch
 * (e.g., podcast appearances, conference talks, private mentions).
 *
 * Expected format of manual-submissions.json:
 * [
 *   {
 *     "date": "2026-02-13",
 *     "source": "Black Hat USA 2025",
 *     "source_type": "event",
 *     "title": "CI/CD Attack Chain Training with CyberproAI",
 *     "url": "https://...",
 *     "tools_mentioned": ["Chariot"],
 *     "excerpt": "Training session on...",
 *     "submitted_by": "john@praetorian.com"
 *   }
 * ]
 *
 * @param {Date} since - Only return items submitted after this date
 * @returns {Promise<Array>} Array of coverage items
 */
export async function checkManualSubmissions(since) {
  console.log('Checking manual submissions...');

  try {
    const raw = await readFile(config.paths.manualSubmissions, 'utf-8');
    const submissions = JSON.parse(raw);

    if (!Array.isArray(submissions)) {
      console.warn('  Warning: manual-submissions.json is not an array');
      return [];
    }

    const items = submissions
      .filter(sub => {
        const subDate = new Date(sub.date);
        return !since || subDate >= since;
      })
      .map(sub => ({
        source: sub.source || 'Manual Submission',
        sourceType: sub.source_type || 'manual',
        icon: getIconForType(sub.source_type),
        title: sub.title || 'Untitled',
        url: sub.url || '',
        date: sub.date ? new Date(sub.date).toISOString() : new Date().toISOString(),
        excerpt: sub.excerpt || '',
        toolsMentioned: sub.tools_mentioned || [],
        matchedTerms: ['manual'],
        raw: {
          guid: `manual-${sub.date}-${sub.title}`,
          submittedBy: sub.submitted_by || 'unknown',
        },
      }));

    console.log(`  Found ${items.length} manual submission(s)`);
    return items;
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('  No manual-submissions.json found (this is fine)');
      return [];
    }
    console.warn(`  Warning: Error reading manual submissions: ${err.message}`);
    return [];
  }
}

function getIconForType(type) {
  const icons = {
    event: '🎤',
    podcast: '🎙️',
    social: '📱',
    media: '📰',
    manual: '✍️',
  };
  return icons[type] || '📌';
}
