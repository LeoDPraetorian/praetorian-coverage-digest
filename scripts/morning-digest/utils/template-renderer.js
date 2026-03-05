import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from '../config.js';

/**
 * Render the morning digest HTML email from collected data and AI analysis.
 *
 * @param {Object} data - {
 *   date: Date,
 *   stats: { meetings: number, actions: number, emails: number, linear: number },
 *   calendar: Array<{ title, startTime, endTime, attendees, isFreeBlock, durationMinutes }>,
 *   actionItems: Array<{ title, priority, source, sourceIcon, detail }>,
 *   meetingPrep: Array<{ eventTitle, notes }>,
 *   daySummary: string,
 *   slack: { dms, groupChats, mentions },
 *   email: { messages },
 *   linear: { issues },
 * }
 * @returns {string} Rendered HTML string
 */
export function renderDigest(data) {
  const {
    date = new Date(),
    stats = {},
    calendar = [],
    actionItems = [],
    emailDigest = [],
    meetingPrep = [],
    daySummary = '',
    slack = {},
    email = {},
    linear = {},
  } = data;

  const templatePath = join(config.paths.templates, 'digest-template.html');
  let html = readFileSync(templatePath, 'utf-8');

  // ── Format date ─────────────────────────────────────────────────────────────
  const dateObj = date instanceof Date ? date : new Date(date);
  const dateFormatted = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ── Replace scalar placeholders ──────────────────────────────────────────────
  html = replaceAll(html, '{{DATE_FORMATTED}}', escapeHtml(dateFormatted));
  html = replaceAll(html, '{{LOGO_URL}}', config.logoUrl || '');
  html = replaceAll(html, '{{STAT_MEETINGS}}', String(stats.meetings || 0));
  html = replaceAll(html, '{{STAT_ACTIONS}}', String(actionItems.length || stats.actions || 0));
  html = replaceAll(html, '{{STAT_EMAILS}}', String(stats.emails || 0));
  html = replaceAll(html, '{{STAT_LINEAR}}', String(stats.linear || 0));
  html = replaceAll(html, '{{DASHBOARD_URL}}', config.dashboardUrl || 'https://leodpraetorian.github.io/praetorian-coverage-digest/dashboard.html');

  // ── Day summary (bulleted by topic) ─────────────────────────────────────────
  if (daySummary) {
    html = renderSection(html, 'IF_DAY_SUMMARY');
    html = replaceAll(html, '{{DAY_SUMMARY}}', formatDaySummaryBullets(daySummary));
  } else {
    html = removeSection(html, 'IF_DAY_SUMMARY');
  }

  // ── Calendar / Agenda ────────────────────────────────────────────────────────
  const calendarHtml = buildCalendarRows(calendar, meetingPrep);
  const deepWorkLabel = calculateDeepWorkLabel(calendar);

  html = replaceAll(html, '{{DEEP_WORK_LABEL}}', escapeHtml(deepWorkLabel));

  if (calendar.length > 0) {
    html = renderSection(html, 'IF_CALENDAR');
    html = removeSection(html, 'IF_NO_CALENDAR');
    html = replaceAll(html, '{{CALENDAR_ROWS}}', calendarHtml);
  } else {
    html = removeSection(html, 'IF_CALENDAR');
    html = renderSection(html, 'IF_NO_CALENDAR');
  }

  // ── Action Items ─────────────────────────────────────────────────────────────
  if (actionItems.length > 0) {
    const actionRows = buildActionRows(actionItems);
    html = renderSection(html, 'IF_ACTIONS');
    html = removeSection(html, 'IF_NO_ACTIONS');
    html = replaceAll(html, '{{ACTION_ROWS}}', actionRows);
  } else {
    html = removeSection(html, 'IF_ACTIONS');
    html = renderSection(html, 'IF_NO_ACTIONS');
  }

  // ── Slack Reference ──────────────────────────────────────────────────────────
  const slackMessages = [
    ...(slack.dms || []).map(m => ({ ...m, type: 'dm' })),
    ...(slack.mentions || []).map(m => ({ ...m, type: 'mention' })),
    ...(slack.groupChats || []).slice(0, 3).map(m => ({ ...m, type: 'group' })),
  ];

  if (slackMessages.length > 0) {
    html = renderSection(html, 'IF_SLACK');
    html = replaceAll(html, '{{SLACK_COUNT}}', String(slackMessages.length));
    html = replaceAll(html, '{{SLACK_ROWS}}', buildSlackRows(slackMessages));
  } else {
    html = removeSection(html, 'IF_SLACK');
  }

  // ── Email Reference (AI-analyzed digest) ────────────────────────────────────
  if (emailDigest.length > 0) {
    html = renderSection(html, 'IF_EMAIL');
    html = replaceAll(html, '{{EMAIL_COUNT}}', String(emailDigest.length));
    html = replaceAll(html, '{{EMAIL_ROWS}}', buildEmailDigestRows(emailDigest));
  } else if ((email.messages || []).length > 0) {
    // Fallback to raw list if AI didn't produce a digest
    html = renderSection(html, 'IF_EMAIL');
    html = replaceAll(html, '{{EMAIL_COUNT}}', String(email.messages.length));
    html = replaceAll(html, '{{EMAIL_ROWS}}', buildEmailRows(email.messages));
  } else {
    html = removeSection(html, 'IF_EMAIL');
  }

  // ── Linear Reference ─────────────────────────────────────────────────────────
  const linearIssues = linear.issues || [];
  if (linearIssues.length > 0) {
    html = renderSection(html, 'IF_LINEAR');
    html = replaceAll(html, '{{LINEAR_COUNT}}', String(linearIssues.length));
    html = replaceAll(html, '{{LINEAR_ROWS}}', buildLinearRows(linearIssues));
  } else {
    html = removeSection(html, 'IF_LINEAR');
  }

  return html;
}

// ─── Dashboard renderer ─────────────────────────────────────────────────────

/**
 * Render the interactive dashboard HTML from the same data as the email.
 */
export function renderDashboard(data) {
  const {
    date = new Date(),
    stats = {},
    calendar = [],
    actionItems = [],
    emailDigest = [],
    meetingPrep = [],
    daySummary = '',
    slack = {},
    email = {},
    linear = {},
  } = data;

  const templatePath = join(config.paths.templates, 'dashboard-template.html');
  let html = readFileSync(templatePath, 'utf-8');

  // Date formatting
  const dateStr = typeof date === 'string' ? date : new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const dateKey = new Date().toISOString().split('T')[0];

  html = replaceAll(html, '{{DATE_FORMATTED}}', escapeHtml(dateStr));
  html = replaceAll(html, '{{DATE_KEY}}', dateKey);

  // Day summary — convert to bulleted list by splitting on sentence boundaries
  if (daySummary) {
    html = renderSection(html, 'IF_DAY_SUMMARY');
    const bullets = splitIntoBullets(daySummary);
    html = replaceAll(html, '{{DAY_SUMMARY}}', bullets);
  } else {
    html = removeSection(html, 'IF_DAY_SUMMARY');
  }

  // Deep work label
  html = replaceAll(html, '{{DEEP_WORK_LABEL}}', escapeHtml(calculateDeepWorkLabel(calendar)));

  // Action items checklist
  html = replaceAll(html, '{{ACTION_CHECKLIST_ITEMS}}', buildDashboardActionItems(actionItems));

  // Calendar timeline
  html = replaceAll(html, '{{CALENDAR_TIMELINE_ITEMS}}', buildDashboardTimeline(calendar, meetingPrep));

  // Email digest
  if (emailDigest.length > 0) {
    html = renderSection(html, 'IF_EMAIL');
    html = replaceAll(html, '{{EMAIL_COUNT}}', String(emailDigest.length));
    html = replaceAll(html, '{{EMAIL_DIGEST_ITEMS}}', buildDashboardEmailDigest(emailDigest));
  } else {
    html = removeSection(html, 'IF_EMAIL');
  }

  // Linear tickets
  const linearIssues = linear.issues || [];
  if (linearIssues.length > 0) {
    html = renderSection(html, 'IF_LINEAR');
    html = replaceAll(html, '{{LINEAR_COUNT}}', String(linearIssues.length));
    html = replaceAll(html, '{{LINEAR_TICKET_ITEMS}}', buildDashboardLinear(linearIssues));
  } else {
    html = removeSection(html, 'IF_LINEAR');
  }

  return html;
}

function splitIntoBullets(text) {
  // Split on periods followed by space/capital, or on newlines
  const sentences = text
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length <= 1) return escapeHtml(text);

  return sentences.map(s =>
    `<div style="display:flex;gap:10px;margin-bottom:8px;"><span style="color:#E63948;font-size:16px;line-height:1.2;">&#8226;</span><span>${escapeHtml(s)}</span></div>`
  ).join('');
}

function buildDashboardActionItems(items) {
  if (!items || items.length === 0) return '<div style="color:#535B61;padding:12px;">No action items extracted.</div>';

  return items.map((item, i) => {
    const id = `action-${i}`;
    const priorityClass = `priority-${item.priority || 'MEDIUM'}`;
    const priorityBadge = `badge-${(item.priority || 'medium').toLowerCase()}`;

    return `<div class="checklist-item ${priorityClass}" data-id="${id}" onclick="toggleItem('${id}')">
      <div class="checkbox"></div>
      <div class="item-content">
        <div class="item-title">${escapeHtml(item.title)}</div>
        ${item.detail ? `<div class="item-detail">${escapeHtml(item.detail)}</div>` : ''}
        <div class="item-meta">
          <span class="badge ${priorityBadge}">${escapeHtml(item.priority || 'MEDIUM')}</span>
          <span class="badge badge-source">${item.sourceIcon || ''} ${escapeHtml(item.source || '')}</span>
        </div>
      </div>
    </div>`;
  }).join('\n');
}

function buildDashboardTimeline(calendar, meetingPrep = []) {
  if (!calendar || calendar.length === 0) return '<div style="color:#535B61;padding:12px;">No events today — full deep work day!</div>';

  const prepMap = new Map();
  for (const prep of meetingPrep) {
    prepMap.set(prep.eventTitle.toLowerCase().trim(), prep.notes);
  }

  return calendar.map(event => {
    if (event.isFreeBlock) {
      const dur = event.durationMinutes ? ` — ${formatDuration(event.durationMinutes)}` : '';
      return `<div class="timeline-item">
        <div class="timeline-time">${escapeHtml(event.startTime || '')}</div>
        <div class="timeline-body">
          <div class="timeline-free">░░ FREE${escapeHtml(dur)} ░░</div>
        </div>
      </div>`;
    }

    const attendeeCount = event.attendees ? event.attendees.length : 0;
    const attendeeText = attendeeCount > 0 ? `${attendeeCount} attendee${attendeeCount !== 1 ? 's' : ''}` : '';
    const prepNotes = prepMap.get((event.title || '').toLowerCase().trim()) || '';

    return `<div class="timeline-item">
      <div class="timeline-time">${escapeHtml(event.startTime || '')} – ${escapeHtml(event.endTime || '')}</div>
      <div class="timeline-body">
        <div class="timeline-title">${escapeHtml(event.title || 'Untitled')}</div>
        ${attendeeText ? `<div class="timeline-subtitle">${escapeHtml(attendeeText)}</div>` : ''}
        ${prepNotes ? `<div class="timeline-prep">
          <div class="timeline-prep-label">Meeting Prep</div>
          <div class="timeline-prep-text">${escapeHtml(prepNotes)}</div>
        </div>` : ''}
      </div>
    </div>`;
  }).join('\n');
}

function buildDashboardEmailDigest(emails) {
  const categoryOrder = ['action-required', 'needs-reply', 'fyi', 'newsletter', 'automated'];
  const sorted = [...emails].sort((a, b) => {
    if (a.addressedDirectly && !b.addressedDirectly) return -1;
    if (!a.addressedDirectly && b.addressedDirectly) return 1;
    return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
  });

  const catLabels = {
    'action-required': '⚠ ACTION',
    'needs-reply': '↩ REPLY',
    'fyi': 'ℹ FYI',
    'newsletter': '📰 NEWS',
    'automated': '⚙ AUTO',
  };

  return sorted.slice(0, 15).map(e => {
    const catClass = `cat-${e.category || 'fyi'}`;
    const directBadge = e.addressedDirectly ? '<span class="badge" style="color:#11C3DB;background:rgba(17,195,219,0.15);margin-left:6px;">TO YOU</span>' : '';

    return `<div class="email-item ${catClass}">
      <div>
        <span class="badge" style="color:#A0A4A8;background:rgba(0,0,0,0.3);">${catLabels[e.category] || 'FYI'}</span>
        ${directBadge}
        <span class="email-from" style="margin-left:8px;">${escapeHtml(e.from || '')}</span>
      </div>
      <div class="email-subject">${escapeHtml(e.subject)}</div>
      ${e.summary ? `<div class="email-summary">${escapeHtml(e.summary)}</div>` : ''}
    </div>`;
  }).join('\n');
}

function buildDashboardLinear(issues) {
  return issues.slice(0, 15).map(issue => {
    const statusColor = getLinearStatusColor(issue.state);

    return `<div class="linear-item">
      <div class="linear-header">
        <span class="linear-id">${escapeHtml(issue.identifier || issue.id || '')}</span>
        <span class="linear-status" style="color:${statusColor};border-color:${statusColor};">${escapeHtml(issue.state || 'Unknown')}</span>
      </div>
      <div class="linear-title">${escapeHtml(issue.title || 'Untitled')}</div>
    </div>`;
  }).join('\n');
}

// ─── Section helpers ──────────────────────────────────────────────────────────

/**
 * Keep a conditional section (strip the markers, keep the content).
 */
function renderSection(html, sectionName) {
  html = replaceAll(html, `{{#${sectionName}}}`, '');
  html = replaceAll(html, `{{/${sectionName}}}`, '');
  return html;
}

/**
 * Remove a conditional section entirely (markers + content between them).
 */
function removeSection(html, sectionName) {
  const regex = new RegExp(`\\{\\{#${sectionName}\\}\\}[\\s\\S]*?\\{\\{/${sectionName}\\}\\}`, 'g');
  return html.replace(regex, '');
}

/**
 * Replace all occurrences of a placeholder string.
 */
function replaceAll(html, placeholder, value) {
  return html.split(placeholder).join(value);
}

// ─── Row builders ─────────────────────────────────────────────────────────────

/**
 * Build HTML rows for the agenda timeline view.
 * Includes meeting prep notes and free block markers.
 */
function buildCalendarRows(calendar, meetingPrep = []) {
  if (!calendar || calendar.length === 0) return '';

  const prepMap = new Map();
  for (const prep of meetingPrep) {
    prepMap.set(prep.eventTitle.toLowerCase().trim(), prep.notes);
  }

  return calendar.map(event => {
    if (event.isFreeBlock) {
      return buildFreeBlockRow(event);
    }
    const prepNotes = prepMap.get((event.title || '').toLowerCase().trim()) || '';
    return buildEventRow(event, prepNotes);
  }).join('\n');
}

function buildFreeBlockRow(event) {
  const duration = event.durationMinutes ? ` &mdash; ${formatDuration(event.durationMinutes)}` : '';
  return `<tr>
    <td style="padding:8px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="80" style="vertical-align:top;padding-right:16px;text-align:right;">
            <span style="font-size:11px;color:#535B61;">${escapeHtml(event.startTime || '')}</span>
          </td>
          <td style="vertical-align:top;border-left:2px dashed #2A3038;padding-left:16px;">
            <div style="font-size:12px;color:#34C759;font-family:monospace;letter-spacing:1px;">&#9617;&#9617; FREE${duration} &#9617;&#9617;</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function buildEventRow(event, prepNotes) {
  const attendeeCount = event.attendees ? event.attendees.length : 0;
  const attendeeText = attendeeCount > 0
    ? `${attendeeCount} attendee${attendeeCount !== 1 ? 's' : ''}`
    : '';
  const timeRange = event.endTime
    ? `${event.startTime} &ndash; ${event.endTime}`
    : event.startTime || '';

  return `<tr>
    <td style="padding:10px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="80" style="vertical-align:top;padding-right:16px;text-align:right;">
            <span style="font-size:11px;color:#A0A4A8;white-space:nowrap;">${escapeHtml(timeRange)}</span>
          </td>
          <td style="vertical-align:top;border-left:2px solid #11C3DB;padding-left:16px;">
            <div style="font-size:14px;font-weight:600;color:#FFFFFF;margin-bottom:3px;">${escapeHtml(event.title || 'Untitled')}</div>
            ${attendeeText ? `<div style="font-size:11px;color:#535B61;margin-bottom:4px;">${escapeHtml(attendeeText)}</div>` : ''}
            ${prepNotes ? `<div style="margin-top:8px;padding:10px 12px;background-color:#1F252A;border-radius:6px;border-left:3px solid #D4AF37;">
              <div style="font-size:10px;font-weight:700;color:#D4AF37;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">Meeting Prep</div>
              <div style="font-size:12px;color:#A0A4A8;line-height:1.6;">${escapeHtml(prepNotes)}</div>
            </div>` : ''}
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

/**
 * Build HTML rows for action items grouped by priority.
 */
function buildActionRows(actionItems) {
  const high = actionItems.filter(a => a.priority === 'HIGH');
  const medium = actionItems.filter(a => a.priority === 'MEDIUM');
  const low = actionItems.filter(a => a.priority === 'LOW');

  const rows = [];

  if (high.length > 0) {
    rows.push(buildPriorityGroupLabel('HIGH', '#E63948', high.length));
    rows.push(...high.map(item => buildActionRow(item)));
  }
  if (medium.length > 0) {
    rows.push(buildPriorityGroupLabel('MEDIUM', '#D4AF37', medium.length));
    rows.push(...medium.map(item => buildActionRow(item)));
  }
  if (low.length > 0) {
    rows.push(buildPriorityGroupLabel('LOW', '#34C759', low.length));
    rows.push(...low.map(item => buildActionRow(item)));
  }

  return rows.join('\n');
}

function buildPriorityGroupLabel(label, color, count) {
  const dot = label === 'HIGH' ? '&#128308;' : label === 'MEDIUM' ? '&#128993;' : '&#128994;';
  return `<tr>
    <td style="padding:12px 0 6px;">
      <span style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:2px;">${dot} ${label} &mdash; ${count} item${count !== 1 ? 's' : ''}</span>
    </td>
  </tr>`;
}

function buildActionRow(item) {
  const borderColor = item.priority === 'HIGH' ? '#E63948'
    : item.priority === 'MEDIUM' ? '#D4AF37'
    : '#34C759';

  return `<tr>
    <td style="padding:4px 0 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1F252A;border-radius:8px;border-left:4px solid ${borderColor};">
        <tr>
          <td style="padding:12px 16px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size:13px;font-weight:600;color:#FFFFFF;line-height:1.4;">${item.sourceIcon || '&#128204;'} ${escapeHtml(item.title)}</span>
                </td>
              </tr>
              ${item.detail ? `<tr>
                <td style="padding-top:5px;">
                  <span style="font-size:11px;color:#535B61;">${escapeHtml(item.detail)}</span>
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

/**
 * Build HTML rows for Slack message previews.
 */
function buildSlackRows(messages) {
  return messages.slice(0, 10).map(msg => {
    const channelLabel = msg.channelName ? `#${msg.channelName}` : msg.type === 'dm' ? 'DM' : 'Channel';
    const typeLabel = msg.type === 'dm' ? 'DM' : msg.type === 'mention' ? '@mention' : channelLabel;

    return `<tr>
      <td style="padding:6px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1F252A;border-radius:6px;">
          <tr>
            <td style="padding:10px 14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:12px;font-weight:600;color:#A0A4A8;">${escapeHtml(msg.sender || 'Unknown')}</span>
                    <span style="font-size:10px;color:#535B61;margin-left:8px;">${escapeHtml(typeLabel)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:4px;">
                    <span style="font-size:12px;color:#535B61;line-height:1.4;">${escapeHtml(truncate(msg.text || '', 160))}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join('\n');
}

/**
 * Build HTML rows for email subject lines.
 */
function buildEmailRows(messages) {
  return messages.slice(0, 10).map(msg => {
    const from = msg.from || 'Unknown sender';
    const subject = msg.subject || '(no subject)';

    return `<tr>
      <td style="padding:5px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1F252A;border-radius:6px;">
          <tr>
            <td style="padding:10px 14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:12px;font-weight:600;color:#A0A4A8;">${escapeHtml(truncate(from, 50))}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:3px;">
                    <span style="font-size:13px;color:#FFFFFF;">${escapeHtml(subject)}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join('\n');
}

/**
 * Build HTML rows for AI-analyzed email digest (categorized and prioritized).
 */
function buildEmailDigestRows(emails) {
  // Sort: action-required first, then needs-reply, then fyi, then rest
  const categoryOrder = ['action-required', 'needs-reply', 'fyi', 'newsletter', 'automated'];
  const sorted = [...emails].sort((a, b) => {
    // Direct emails first
    if (a.addressedDirectly && !b.addressedDirectly) return -1;
    if (!a.addressedDirectly && b.addressedDirectly) return 1;
    return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
  });

  return sorted.slice(0, 15).map(email => {
    const categoryConfig = {
      'action-required': { label: 'ACTION', color: '#E63948', icon: '&#9888;' },
      'needs-reply': { label: 'REPLY', color: '#D4AF37', icon: '&#8617;' },
      'fyi': { label: 'FYI', color: '#535B61', icon: '&#8505;' },
      'newsletter': { label: 'NEWS', color: '#2A3038', icon: '&#128240;' },
      'automated': { label: 'AUTO', color: '#2A3038', icon: '&#9881;' },
    };
    const cat = categoryConfig[email.category] || categoryConfig['fyi'];
    const directBadge = email.addressedDirectly
      ? `<span style="display:inline-block;font-size:9px;font-weight:700;color:#11C3DB;background:rgba(17,195,219,0.15);padding:2px 6px;border-radius:8px;margin-left:6px;">TO YOU</span>`
      : '';

    return `<tr>
      <td style="padding:5px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1F252A;border-radius:6px;border-left:3px solid ${cat.color};">
          <tr>
            <td style="padding:10px 14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;font-size:9px;font-weight:700;color:${cat.color};background:rgba(0,0,0,0.3);padding:2px 6px;border-radius:8px;letter-spacing:1px;">${cat.icon} ${cat.label}</span>
                    ${directBadge}
                    <span style="font-size:11px;color:#535B61;margin-left:8px;">${escapeHtml(truncate(email.from, 40))}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:4px;">
                    <span style="font-size:13px;color:#FFFFFF;font-weight:500;">${escapeHtml(email.subject)}</span>
                  </td>
                </tr>
                ${email.summary ? `<tr>
                  <td style="padding-top:3px;">
                    <span style="font-size:11px;color:#A0A4A8;line-height:1.4;">${escapeHtml(email.summary)}</span>
                  </td>
                </tr>` : ''}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join('\n');
}

/**
 * Build HTML ticket cards for Linear issues.
 */
function buildLinearRows(issues) {
  return issues.slice(0, 10).map(issue => {
    const statusColor = getLinearStatusColor(issue.state);
    const priorityDot = getLinearPriorityDot(issue.priority);

    return `<tr>
      <td style="padding:5px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1F252A;border-radius:6px;">
          <tr>
            <td style="padding:12px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <span style="font-size:11px;font-weight:700;color:#535B61;font-family:monospace;">${escapeHtml(issue.identifier || issue.id || '')}</span>
                    ${priorityDot ? `<span style="margin-left:8px;font-size:10px;">${priorityDot}</span>` : ''}
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <span style="display:inline-block;font-size:10px;font-weight:600;color:${statusColor};background-color:rgba(0,0,0,0.3);padding:3px 8px;border-radius:10px;border:1px solid ${statusColor};">${escapeHtml(issue.state || 'Unknown')}</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:5px;">
                    <span style="font-size:13px;color:#FFFFFF;font-weight:500;">${escapeHtml(issue.title || 'Untitled')}</span>
                  </td>
                </tr>
                ${issue.dueDate ? `<tr>
                  <td colspan="2" style="padding-top:4px;">
                    <span style="font-size:11px;color:#D4AF37;">Due: ${escapeHtml(issue.dueDate)}</span>
                  </td>
                </tr>` : ''}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join('\n');
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

/**
 * Format day summary as bulleted list (split by sentence boundaries).
 */
function formatDaySummaryBullets(text) {
  const sentences = text
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length <= 1) return escapeHtml(text);

  return sentences.map(s =>
    `<div style="display:flex;gap:10px;margin-bottom:6px;"><span style="color:#E63948;font-size:14px;">&#8226;</span><span>${escapeHtml(s)}</span></div>`
  ).join('');
}

function calculateDeepWorkLabel(calendar) {
  if (!calendar || calendar.length === 0) return 'Full deep work day';

  const freeMinutes = calendar
    .filter(e => e.isFreeBlock && e.durationMinutes)
    .reduce((sum, e) => sum + e.durationMinutes, 0);

  if (freeMinutes >= 180) return `${formatDuration(freeMinutes)} deep work`;
  if (freeMinutes >= 60) return `${formatDuration(freeMinutes)} focus time`;
  return 'Heavy meeting day';
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getLinearStatusColor(state) {
  const s = (state || '').toLowerCase();
  if (s === 'done' || s === 'completed') return '#34C759';
  if (s === 'in progress' || s === 'in_progress') return '#11C3DB';
  if (s === 'blocked' || s === 'cancelled') return '#E63948';
  if (s === 'in review' || s === 'review') return '#D4AF37';
  return '#535B61';
}

function getLinearPriorityDot(priority) {
  const p = (priority || '').toLowerCase();
  if (p === 'urgent' || p === '1') return '&#128308;';
  if (p === 'high' || p === '2') return '&#128992;';
  if (p === 'medium' || p === '3') return '&#128993;';
  if (p === 'low' || p === '4') return '&#128994;';
  return '';
}

function truncate(str, maxLength) {
  const s = String(str || '').trim();
  if (s.length <= maxLength) return s;
  return s.substring(0, maxLength - 3) + '...';
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
