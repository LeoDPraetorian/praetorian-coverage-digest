import { google } from 'googleapis';
import { config } from '../config.js';

/** Working hours in Eastern Time (used for free-block calculation). */
const WORK_START_HOUR = 8;   // 8 AM ET
const WORK_END_HOUR = 18;    // 6 PM ET

/**
 * Format an ISO datetime string to a human-readable time like "2:00 PM".
 */
function formatTime(isoStr, timezone) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone || 'America/New_York',
    });
  } catch {
    return isoStr;
  }
}

/**
 * Extract a Google Meet link from event conference data or description.
 */
function extractMeetLink(event) {
  // Check conferenceData first (most reliable)
  const entryPoints = event.conferenceData?.entryPoints || [];
  for (const ep of entryPoints) {
    if (ep.entryPointType === 'video' && ep.uri) return ep.uri;
  }
  // Fallback: scan description for meet.google.com link
  const desc = event.description || '';
  const match = desc.match(/https:\/\/meet\.google\.com\/[a-z\-]+/);
  return match ? match[0] : null;
}

/**
 * Parse attendee list from a Google Calendar event.
 */
function parseAttendees(event) {
  return (event.attendees || []).map((a) => a.displayName || a.email || '').filter(Boolean);
}

/**
 * Calculate free time blocks between events within working hours (8 AM–6 PM ET).
 * Returns blocks as { start, end, duration } in ISO strings and minutes.
 */
function calculateFreeBlocks(events, dateStr, timezone) {
  // Build working-hours window for the given date in ET
  const workStart = new Date(`${dateStr}T0${WORK_START_HOUR}:00:00`);
  const workEnd = new Date(`${dateStr}T${WORK_END_HOUR}:00:00`);

  // Collect busy intervals, clamped to working hours
  const busyIntervals = [];
  for (const ev of events) {
    const start = ev.start?.dateTime ? new Date(ev.start.dateTime) : null;
    const end = ev.end?.dateTime ? new Date(ev.end.dateTime) : null;
    if (!start || !end) continue; // All-day events skipped

    const clampedStart = start < workStart ? workStart : start;
    const clampedEnd = end > workEnd ? workEnd : end;
    if (clampedStart >= clampedEnd) continue;

    busyIntervals.push({ start: clampedStart, end: clampedEnd });
  }

  // Merge overlapping/adjacent intervals
  busyIntervals.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const interval of busyIntervals) {
    if (merged.length === 0 || interval.start > merged[merged.length - 1].end) {
      merged.push({ ...interval });
    } else {
      merged[merged.length - 1].end = new Date(
        Math.max(merged[merged.length - 1].end, interval.end)
      );
    }
  }

  // Find gaps
  const freeBlocks = [];
  let cursor = workStart;
  for (const busy of merged) {
    if (cursor < busy.start) {
      const duration = Math.round((busy.start - cursor) / 60_000);
      freeBlocks.push({
        start: cursor.toISOString(),
        end: busy.start.toISOString(),
        duration,
      });
    }
    cursor = busy.end > cursor ? busy.end : cursor;
  }
  // Trailing free block
  if (cursor < workEnd) {
    const duration = Math.round((workEnd - cursor) / 60_000);
    freeBlocks.push({
      start: cursor.toISOString(),
      end: workEnd.toISOString(),
      duration,
    });
  }

  return freeBlocks;
}

/**
 * Fetch today's Google Calendar events and compute free/busy summary.
 *
 * Returns:
 * {
 *   events: [{ title, startTime, endTime, attendees, location, description, meetLink }],
 *   freeBlocks: [{ start, end, duration }],
 *   totalFreeMinutes: N,
 *   totalMeetingMinutes: N,
 * }
 */
export default async function collectCalendar() {
  const empty = {
    events: [],
    freeBlocks: [],
    totalFreeMinutes: 0,
    totalMeetingMinutes: 0,
  };

  const { googleClientId, googleClientSecret, googleRefreshToken, timezone } = config;

  if (!googleClientId || !googleClientSecret || !googleRefreshToken) {
    console.warn(
      '[calendar-collector] Google OAuth2 credentials not configured.\n' +
      '  Setup instructions:\n' +
      '  1. Create a project at https://console.cloud.google.com/\n' +
      '  2. Enable the Google Calendar API\n' +
      '  3. Create OAuth2 credentials (Desktop app)\n' +
      '  4. Run the OAuth2 flow to obtain a refresh token\n' +
      '  5. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN in your .env or credentials.json'
    );
    return empty;
  }

  try {
    // Build OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      googleClientId,
      googleClientSecret
    );
    oauth2Client.setCredentials({ refresh_token: googleRefreshToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Determine today's date range in the configured timezone
    const tz = timezone || 'America/New_York';
    const now = new Date();
    // Build a date string for "today" in the target timezone
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD

    const timeMin = new Date(`${todayStr}T00:00:00`).toISOString();
    const timeMax = new Date(`${todayStr}T23:59:59`).toISOString();

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    });

    const rawEvents = res.data.items || [];

    const events = rawEvents.map((ev) => {
      const startRaw = ev.start?.dateTime || ev.start?.date || null;
      const endRaw = ev.end?.dateTime || ev.end?.date || null;
      const durationMinutes = startRaw && endRaw
        ? Math.round((new Date(endRaw) - new Date(startRaw)) / 60_000)
        : null;

      return {
        title: ev.summary || '(no title)',
        startTime: formatTime(startRaw, tz),
        endTime: formatTime(endRaw, tz),
        startTimeRaw: startRaw,
        endTimeRaw: endRaw,
        durationMinutes,
        attendees: parseAttendees(ev),
        location: ev.location || null,
        description: ev.description || null,
        meetLink: extractMeetLink(ev),
      };
    });

    // Free/busy calculation
    const freeBlocks = calculateFreeBlocks(rawEvents, todayStr, tz);
    const totalFreeMinutes = freeBlocks.reduce((sum, b) => sum + b.duration, 0);

    // Total meeting minutes = sum of timed events within working hours
    let totalMeetingMinutes = 0;
    const workStartMs = new Date(`${todayStr}T0${WORK_START_HOUR}:00:00`).getTime();
    const workEndMs = new Date(`${todayStr}T${WORK_END_HOUR}:00:00`).getTime();
    for (const ev of rawEvents) {
      const start = ev.start?.dateTime ? new Date(ev.start.dateTime).getTime() : null;
      const end = ev.end?.dateTime ? new Date(ev.end.dateTime).getTime() : null;
      if (!start || !end) continue;
      const clampedStart = Math.max(start, workStartMs);
      const clampedEnd = Math.min(end, workEndMs);
      if (clampedEnd > clampedStart) {
        totalMeetingMinutes += Math.round((clampedEnd - clampedStart) / 60_000);
      }
    }

    return { events, freeBlocks, totalFreeMinutes, totalMeetingMinutes };
  } catch (err) {
    console.warn(`[calendar-collector] Google Calendar API error: ${err.message}`);
    return empty;
  }
}
