#!/usr/bin/env node

/**
 * Praetorian Morning Command Center — Main Pipeline
 *
 * Orchestrates all 4 data collectors, runs AI action extraction,
 * renders the HTML email, and sends it.
 *
 * Usage:
 *   node run-digest.js              # Send email
 *   node run-digest.js --preview    # Open in browser
 *   node run-digest.js --dry-run    # Show summary in terminal
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import { config } from './config.js';
import collectSlack from './collectors/slack-collector.js';
import collectEmail from './collectors/email-collector.js';
import collectLinear from './collectors/linear-collector.js';
import collectCalendar from './collectors/calendar-collector.js';
import extractActions from './ai/action-extractor.js';
import { renderDigest, renderDashboard } from './utils/template-renderer.js';
import { sendDigestEmail } from './utils/send-email.js';

const isPreview = process.argv.includes('--preview');
const isDryRun = process.argv.includes('--dry-run');

function formatTimeET(isoStr) {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: config.timezone || 'America/New_York',
    });
  } catch {
    return isoStr;
  }
}

async function main() {
  const startTime = Date.now();
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: config.timezone,
  });

  console.log(`\n  Morning Command Center`);
  console.log(`  ${today}`);
  console.log(`  ${'─'.repeat(50)}\n`);

  // Phase 1: Collect data from all sources in parallel
  console.log('  Collecting data from all sources...\n');

  const results = await Promise.allSettled([
    collectSlack().then(r => { console.log(`    Slack:    ${r.dms?.length || 0} DMs, ${r.groupChats?.length || 0} group chats, ${r.mentions?.length || 0} mentions`); return r; }),
    collectEmail().then(r => { console.log(`    Email:    ${r.count || 0} unread`); return r; }),
    collectLinear().then(r => { console.log(`    Linear:   ${r.count || 0} tickets`); return r; }),
    collectCalendar().then(r => { console.log(`    Calendar: ${r.events?.length || 0} events, ${r.totalFreeMinutes || 0}m free`); return r; }),
  ]);

  const [slackResult, emailResult, linearResult, calendarResult] = results;

  const collectedData = {
    slack: slackResult.status === 'fulfilled' ? slackResult.value : { dms: [], groupChats: [], mentions: [], error: slackResult.reason?.message },
    email: emailResult.status === 'fulfilled' ? emailResult.value : { unreadEmails: [], count: 0, error: emailResult.reason?.message },
    linear: linearResult.status === 'fulfilled' ? linearResult.value : { tickets: [], count: 0, error: linearResult.reason?.message },
    calendar: calendarResult.status === 'fulfilled' ? calendarResult.value : { events: [], freeBlocks: [], totalFreeMinutes: 0, totalMeetingMinutes: 0, error: calendarResult.reason?.message },
  };

  // Report any errors
  const errors = results.filter(r => r.status === 'rejected');
  if (errors.length > 0) {
    console.log(`\n    ${errors.length} source(s) had errors (continuing with available data)`);
  }

  // Phase 2: AI-powered action extraction
  console.log('\n  Analyzing with Claude AI...');
  let aiResult;
  try {
    aiResult = await extractActions(collectedData);
    console.log(`    Extracted ${aiResult.actionItems?.length || 0} action items`);
    console.log(`    Generated ${aiResult.meetingPrep?.length || 0} meeting prep notes`);
  } catch (err) {
    console.log(`    AI extraction failed: ${err.message}`);
    aiResult = {
      actionItems: [],
      meetingPrep: [],
      daySummary: 'AI analysis unavailable — review sources manually.',
    };
  }

  // Phase 3: Render HTML
  console.log('\n  Rendering email...');

  const totalSlackMessages = (collectedData.slack.dms?.length || 0) +
    (collectedData.slack.groupChats?.length || 0) +
    (collectedData.slack.mentions?.length || 0);

  // Build merged calendar array: events + free blocks interleaved by time
  const calEvents = (collectedData.calendar.events || []).map(e => ({ ...e, isFreeBlock: false }));
  const calFree = (collectedData.calendar.freeBlocks || []).map(b => ({
    title: 'Free Block',
    startTime: formatTimeET(b.start),
    endTime: formatTimeET(b.end),
    startTimeRaw: b.start,
    endTimeRaw: b.end,
    durationMinutes: b.duration,
    isFreeBlock: true,
  }));
  const calendarTimeline = [...calEvents, ...calFree].sort((a, b) => {
    const ta = a.startTimeRaw || a.startTime || '';
    const tb = b.startTimeRaw || b.startTime || '';
    return ta.localeCompare(tb);
  });

  const renderData = {
    date: today,
    stats: {
      meetings: collectedData.calendar.events?.length || 0,
      actions: aiResult.actionItems?.length || 0,
      emails: collectedData.email.count || 0,
      linear: collectedData.linear.count || 0,
    },
    calendar: calendarTimeline,
    actionItems: aiResult.actionItems || [],
    emailDigest: aiResult.emailDigest || [],
    meetingPrep: aiResult.meetingPrep || [],
    daySummary: aiResult.daySummary || '',
    slack: collectedData.slack,
    email: { messages: collectedData.email.unreadEmails || [] },
    linear: { issues: collectedData.linear.tickets || [] },
    errors: results
      .map((r, i) => r.status === 'rejected' ? ['Slack', 'Email', 'Linear', 'Calendar'][i] : null)
      .filter(Boolean),
  };

  const html = renderDigest(renderData);

  // Generate interactive dashboard
  const dashboardHtml = renderDashboard(renderData);
  const dashboardPath = join(config.paths.root, 'dashboard.html');
  await writeFile(dashboardPath, dashboardHtml);

  // Save email preview
  const previewPath = join(config.paths.root, 'preview.html');
  await writeFile(previewPath, html);

  // Phase 4: Deliver
  const subject = `Morning Command Center — ${today}`;

  if (isDryRun) {
    console.log('\n  DRY RUN — Summary:');
    console.log(`    Meetings today:  ${renderData.stats.meetings}`);
    console.log(`    Action items:    ${renderData.stats.actions}`);
    console.log(`    Unread emails:   ${renderData.stats.emails}`);
    console.log(`    Linear tickets:  ${renderData.stats.linear}`);
    console.log(`    Slack messages:  ${totalSlackMessages}`);
    console.log(`    Free time:       ${Math.round((collectedData.calendar.totalFreeMinutes || 0) / 60 * 10) / 10}h`);
    console.log(`\n    Dashboard: ${dashboardPath}`);
    console.log(`    Email:     ${previewPath}`);
  } else if (isPreview) {
    console.log(`\n  Opening interactive dashboard...`);
    execSync(`open "${dashboardPath}"`);
  } else {
    console.log(`\n  Sending email to ${config.recipient}...`);
    await sendDigestEmail(html, subject);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  Done in ${elapsed}s\n`);
}

main().catch(err => {
  console.error('\n  FATAL:', err.message);
  process.exit(1);
});
