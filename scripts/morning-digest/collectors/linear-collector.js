import { execSync } from 'child_process';
import { config } from '../config.js';

/**
 * Priority sort order: lower index = higher urgency.
 */
const PRIORITY_ORDER = ['Urgent', 'High', 'Medium', 'Low', 'No Priority', 'None', ''];

function prioritySortKey(priority) {
  const idx = PRIORITY_ORDER.indexOf(priority);
  return idx === -1 ? PRIORITY_ORDER.length : idx;
}

/**
 * Fetch Linear issues assigned to the current user via the Linear CLI tool.
 *
 * Returns:
 * {
 *   tickets: [{ id, title, status, priority, dueDate, teamKey, url }],
 *   count: N,
 * }
 */
export default async function collectLinear() {
  const empty = { tickets: [], count: 0 };

  const linearCli = config.paths?.linearCli;
  if (!linearCli) {
    console.warn('[linear-collector] linearCli path not configured — skipping Linear collection.');
    return empty;
  }

  let raw;
  try {
    raw = execSync(
      `npx tsx "${linearCli}" list-issues '{"assignee":"leonardo.dinic@praetorian.com","limit":50}' 2>/dev/null`,
      {
        encoding: 'utf-8',
        timeout: 30_000,
      }
    );
  } catch (err) {
    console.warn(`[linear-collector] Failed to execute Linear CLI: ${err.message}`);
    return empty;
  }

  let parsed;
  try {
    // The CLI may emit extra text before/after JSON — extract the first JSON array or object
    const jsonMatch = raw.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (!jsonMatch) {
      console.warn('[linear-collector] Could not find JSON in Linear CLI output.');
      return empty;
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.warn(`[linear-collector] Failed to parse Linear CLI output: ${err.message}`);
    return empty;
  }

  // Normalise: CLI may return array directly or wrapped in { issues: [...] }
  const rawTickets = Array.isArray(parsed) ? parsed : (parsed.issues || []);

  const tickets = rawTickets
    .map((t) => ({
      id: t.id || '',
      identifier: t.identifier || t.id || '',
      title: t.title || '',
      state: t.state?.name || t.status || '',
      status: t.state?.name || t.status || '',
      stateType: t.state?.type || '',
      priority: t.priorityLabel || t.priority || 'None',
      dueDate: t.dueDate || null,
      assignee: t.assignee || '',
      teamKey: t.team?.key || t.teamKey || '',
      url: t.url || '',
      description: t.description || '',
    }))
    // Filter out completed/cancelled tickets — only show active work
    .filter((t) => !['completed', 'canceled'].includes(t.stateType));

  // Sort by priority: Urgent → High → Medium → Low → None
  tickets.sort((a, b) => prioritySortKey(a.priority) - prioritySortKey(b.priority));

  return { tickets, count: tickets.length };
}
