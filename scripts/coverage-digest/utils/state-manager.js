import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { config } from '../config.js';

const STATE_FILE = join(config.paths.state, 'digest-state.json');

/**
 * Load the current state (last run time, seen item IDs).
 */
async function loadState() {
  try {
    const raw = await readFile(STATE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {
        lastRun: null,
        seenIds: [],
        runHistory: [],
      };
    }
    throw err;
  }
}

/**
 * Save state to disk.
 */
async function saveState(state) {
  await mkdir(config.paths.state, { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * Get the date since which we should look for new items.
 * Returns the last successful run time, or 24 hours ago if first run.
 */
export async function getSinceDate() {
  const state = await loadState();
  if (state.lastRun) {
    return new Date(state.lastRun);
  }
  // Default: look back 24 hours on first run
  const yesterday = new Date();
  yesterday.setHours(yesterday.getHours() - 24);
  return yesterday;
}

/**
 * Filter out items we've already seen/sent.
 * Uses a combination of URL and title to deduplicate.
 */
export async function filterNewItems(items) {
  const state = await loadState();
  const seenSet = new Set(state.seenIds);

  return items.filter(item => {
    const id = itemId(item);
    return !seenSet.has(id);
  });
}

/**
 * Record that we've processed a set of items and sent a digest.
 */
export async function recordRun(items) {
  const state = await loadState();

  const newIds = items.map(item => itemId(item));
  state.seenIds = [...new Set([...state.seenIds, ...newIds])];

  // Keep only the last 1000 seen IDs to prevent unbounded growth
  if (state.seenIds.length > 1000) {
    state.seenIds = state.seenIds.slice(-1000);
  }

  state.lastRun = new Date().toISOString();
  state.runHistory.push({
    date: state.lastRun,
    itemCount: items.length,
    sources: [...new Set(items.map(i => i.source))],
  });

  // Keep only the last 90 days of run history
  if (state.runHistory.length > 90) {
    state.runHistory = state.runHistory.slice(-90);
  }

  await saveState(state);
}

/**
 * Generate a unique ID for a coverage item.
 */
function itemId(item) {
  const raw = item.raw?.guid || item.url || `${item.source}-${item.title}`;
  // Simple hash-like string
  return Buffer.from(raw).toString('base64').substring(0, 64);
}
