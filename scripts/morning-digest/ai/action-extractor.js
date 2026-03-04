import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';

const client = new Anthropic({ apiKey: config.anthropicApiKey });

/**
 * Source icons for each data source type.
 */
const SOURCE_ICONS = {
  slack: '💬',
  email: '📧',
  linear: '📋',
  calendar: '📅',
};

/**
 * Extract action items from all collected sources using Claude.
 *
 * @param {Object} collectedData - { slack, email, linear, calendar }
 * @returns {Promise<{
 *   actionItems: Array<{title: string, priority: string, source: string, sourceIcon: string, detail: string}>,
 *   meetingPrep: Array<{eventTitle: string, notes: string}>,
 *   daySummary: string
 * }>}
 */
export default async function extractActions(collectedData) {
  const { slack = {}, email = {}, linear = {}, calendar = [] } = collectedData;

  const prompt = buildPrompt(collectedData);

  let rawResponse = '';
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    rawResponse = message.content[0]?.text || '';
  } catch (err) {
    console.error('[action-extractor] Claude API error:', err.message);
    return buildEmptyResult();
  }

  return parseClaudeResponse(rawResponse, collectedData);
}

/**
 * Build the Claude prompt from collected data.
 * Carefully structured to extract signal from noise.
 */
function buildPrompt(data) {
  const { slack = {}, email = {}, linear = {}, calendar = {} } = data;

  const slackSection = formatSlackSection(slack);
  const emailSection = formatEmailSection(email);
  const linearSection = formatLinearSection(linear);
  const calendarSection = formatCalendarSection(calendar);

  return `You are an executive assistant AI for Leonardo Dinic, a senior operations leader at Praetorian (a cybersecurity company). Your job is to analyze all overnight communications and produce a focused, prioritized morning briefing.

Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
Leonardo's email: leonardo.dinic@praetorian.com

---

## SLACK MESSAGES (last 24 hours)
${slackSection}

---

## EMAILS (unread)
${emailSection}

---

## LINEAR TICKETS (active/assigned to Leonardo)
${linearSection}

---

## TODAY'S CALENDAR
${calendarSection}

---

## INSTRUCTIONS

Analyze ALL inputs and produce a JSON response with this exact structure:

{
  "actionItems": [
    {
      "title": "One concise sentence: what to do, active voice",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "source": "slack" | "email" | "linear" | "calendar",
      "detail": "Who asked, ticket ID, deadline, or why it matters"
    }
  ],
  "emailDigest": [
    {
      "from": "Sender name",
      "subject": "Email subject",
      "category": "action-required" | "needs-reply" | "fyi" | "newsletter" | "automated",
      "summary": "One sentence: what this email is about and what (if anything) Leonardo needs to do",
      "addressedDirectly": true | false
    }
  ],
  "meetingPrep": [
    {
      "eventTitle": "Meeting title from calendar",
      "notes": "2-3 practical bullet points: what to prepare, decisions needed, current status of relevant tickets"
    }
  ],
  "daySummary": "3-4 short sentences, each covering a DIFFERENT topic: (1) top priority for the day, (2) key meetings to prepare for, (3) urgent deadlines or blockers, (4) strategic focus. Each sentence should be self-contained so it can be displayed as a bullet point."
}

### Priority Rules (CRITICAL — follow exactly):
- HIGH:
  - Emails addressed DIRECTLY to Leonardo (To: field, not CC/BCC) that request action
  - Explicit requests from people ("can you", "please", "need you to", "when can we")
  - Deadlines today or tomorrow
  - Linear tickets marked "Urgent" or "High" priority that are "In Progress" or "Todo"
  - Anything blocking other people's work
  - DMs from leadership/executives
- MEDIUM:
  - Questions awaiting Leonardo's response
  - Linear tickets "In Progress" that need updates
  - Emails where Leonardo is CC'd but the topic is relevant to his work
  - Implied follow-ups from meetings
- LOW:
  - FYIs that need acknowledgment
  - Newsletters or automated notifications (summarize briefly, don't create action items)
  - Linear tickets that are "Todo" with no deadline
  - Mass emails not addressed to Leonardo directly

### Email Analysis Rules:
- Set "addressedDirectly" to true ONLY if the To: field contains Leonardo's email/name specifically (not a mailing list, not CC)
- Category "action-required": sender explicitly asks Leonardo to do something
- Category "needs-reply": sender asks a question or expects a response
- Category "fyi": informational, no action needed
- Category "newsletter": marketing, digest, or automated recurring content
- Category "automated": system notifications (Jira, GitHub, calendar, etc.)
- SKIP creating action items for newsletters and automated emails — just include them in emailDigest

### Meeting Prep Rules:
- Only generate prep for meetings with 2+ attendees
- Cross-reference attendee names with Linear tickets and recent emails
- Include: what decision is needed, what's the current status, what to prepare
- If a meeting relates to a Linear ticket, reference the ticket ID

### Quality Rules:
- Action item titles: exactly 1 sentence, active voice, specific, starts with a verb
- Maximum 12 action items (be selective — quality over quantity)
- Deduplicate across sources (same ask in Slack AND email = one item)
- Sort: HIGH first, then MEDIUM, then LOW
- For Linear tickets: only create action items for tickets that need attention TODAY (urgent, approaching deadline, or blocking others)
- Do NOT create action items for tickets that are just "in progress" with no urgency

Return ONLY valid JSON. No markdown fences, no explanation, no text outside the JSON.`;
}

/**
 * Format Slack data into a readable section for the prompt.
 */
function formatSlackSection(slack) {
  const parts = [];

  if (slack.dms && slack.dms.length > 0) {
    parts.push('### Direct Messages:');
    for (const dm of slack.dms.slice(0, 15)) {
      parts.push(`- From ${dm.sender}: "${truncate(dm.text, 200)}"`);
    }
  }

  if (slack.mentions && slack.mentions.length > 0) {
    parts.push('\n### @Mentions:');
    for (const mention of slack.mentions.slice(0, 10)) {
      const channel = mention.channelName ? `#${mention.channelName}` : 'unknown channel';
      parts.push(`- ${mention.sender} mentioned you in ${channel}: "${truncate(mention.text, 200)}"`);
    }
  }

  if (slack.groupChats && slack.groupChats.length > 0) {
    parts.push('\n### Group Chat Messages (last 5):');
    for (const msg of slack.groupChats.slice(0, 5)) {
      const channel = msg.channelName ? `#${msg.channelName}` : 'group chat';
      parts.push(`- ${msg.sender} in ${channel}: "${truncate(msg.text, 150)}"`);
    }
  }

  return parts.length > 0 ? parts.join('\n') : 'No Slack messages collected.';
}

/**
 * Format email data into a readable section for the prompt.
 */
function formatEmailSection(email) {
  const messages = email.unreadEmails || email.messages || [];
  if (messages.length === 0) {
    return 'No unread emails.';
  }

  return messages.slice(0, 20).map(msg => {
    const snippet = msg.snippet || msg.body || '';
    const from = msg.from || 'Unknown sender';
    const subject = msg.subject || '(no subject)';
    const addressing = msg.isDirectlyAddressed
      ? '  ADDRESSED TO: Leonardo directly (To: field)'
      : msg.to ? `  To: ${msg.to}` : '';
    const cc = msg.cc ? `  CC: ${msg.cc}` : '';
    return `- From: ${from}\n  Subject: ${subject}${addressing ? '\n' + addressing : ''}${cc ? '\n' + cc : ''}\n  Preview: "${truncate(snippet, 200)}"`;
  }).join('\n\n');
}

/**
 * Format Linear ticket data into a readable section for the prompt.
 */
function formatLinearSection(linear) {
  const issues = linear.tickets || linear.issues || [];
  if (issues.length === 0) {
    return 'No Linear tickets found.';
  }

  return issues.slice(0, 20).map(issue => {
    const parts = [
      `- [${issue.identifier || issue.id}] ${issue.title}`,
      `  Status: ${issue.state || 'Unknown'}`,
    ];
    if (issue.priority) parts.push(`  Priority: ${issue.priority}`);
    if (issue.dueDate) parts.push(`  Due: ${issue.dueDate}`);
    if (issue.assignee) parts.push(`  Assignee: ${issue.assignee}`);
    if (issue.description) parts.push(`  Notes: ${truncate(issue.description, 150)}`);
    return parts.join('\n');
  }).join('\n\n');
}

/**
 * Format calendar events into a readable section for the prompt.
 */
function formatCalendarSection(calendar) {
  const events = calendar.events || (Array.isArray(calendar) ? calendar : []);
  if (events.length === 0) {
    return 'No calendar events today.';
  }

  return events.map(event => {
    const parts = [
      `- ${event.title || event.summary || 'Untitled event'}`,
      `  Time: ${event.startTime || 'TBD'}${event.endTime ? ' - ' + event.endTime : ''}`,
    ];
    if (event.attendees && event.attendees.length > 0) {
      parts.push(`  Attendees: ${event.attendees.slice(0, 6).join(', ')}`);
    }
    if (event.description) {
      parts.push(`  Description: ${truncate(event.description, 150)}`);
    }
    if (event.location) {
      parts.push(`  Location: ${event.location}`);
    }
    return parts.join('\n');
  }).join('\n\n');
}

/**
 * Parse Claude's JSON response into structured output.
 * Falls back gracefully if JSON is malformed.
 */
function parseClaudeResponse(rawResponse, collectedData) {
  let parsed;

  try {
    // Claude sometimes wraps JSON in ```json ... ``` blocks despite instructions
    const jsonMatch = rawResponse.match(/```json\s*([\s\S]+?)\s*```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawResponse.trim();
    parsed = JSON.parse(jsonStr);
  } catch (err) {
    console.error('[action-extractor] Failed to parse Claude response:', err.message);
    console.error('[action-extractor] Raw response (first 500 chars):', rawResponse.substring(0, 500));
    return buildEmptyResult();
  }

  // Normalize and validate action items
  const actionItems = (parsed.actionItems || []).map(item => ({
    title: String(item.title || '').trim(),
    priority: validatePriority(item.priority),
    source: validateSource(item.source),
    sourceIcon: SOURCE_ICONS[validateSource(item.source)] || '📌',
    detail: String(item.detail || '').trim(),
  })).filter(item => item.title.length > 0);

  // Normalize email digest
  const emailDigest = (parsed.emailDigest || []).map(e => ({
    from: String(e.from || '').trim(),
    subject: String(e.subject || '').trim(),
    category: String(e.category || 'fyi').trim(),
    summary: String(e.summary || '').trim(),
    addressedDirectly: Boolean(e.addressedDirectly),
  })).filter(e => e.subject.length > 0);

  // Normalize meeting prep
  const meetingPrep = (parsed.meetingPrep || []).map(prep => ({
    eventTitle: String(prep.eventTitle || '').trim(),
    notes: String(prep.notes || '').trim(),
  })).filter(prep => prep.eventTitle.length > 0);

  const daySummary = String(parsed.daySummary || 'Focus on your highest-priority action items.').trim();

  return { actionItems, emailDigest, meetingPrep, daySummary };
}

/**
 * Validate and normalize priority value.
 */
function validatePriority(priority) {
  const normalized = String(priority || '').toUpperCase().trim();
  if (normalized === 'HIGH' || normalized === 'MEDIUM' || normalized === 'LOW') {
    return normalized;
  }
  return 'MEDIUM';
}

/**
 * Validate and normalize source value.
 */
function validateSource(source) {
  const normalized = String(source || '').toLowerCase().trim();
  if (['slack', 'email', 'linear', 'calendar'].includes(normalized)) {
    return normalized;
  }
  return 'slack';
}

/**
 * Build an empty result for error cases.
 */
function buildEmptyResult() {
  return {
    actionItems: [],
    emailDigest: [],
    meetingPrep: [],
    daySummary: 'Unable to extract action items. Check your API configuration.',
  };
}

/**
 * Truncate a string to a maximum length with ellipsis.
 */
function truncate(str, maxLength) {
  const s = String(str || '').trim();
  if (s.length <= maxLength) return s;
  return s.substring(0, maxLength - 3) + '...';
}
